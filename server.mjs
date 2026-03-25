import { createReadStream, existsSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverSkillsOnDisk } from "./data/discover-skills.mjs";
import { packageSkill, packageSkills } from "./scripts/package-skills.mjs";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const catalogPath = resolve(rootDir, "data", "skills.catalog.json");
const host = "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".zip": "application/zip"
};

const dateDiffInDays = (dateString) => {
  const reviewedAt = new Date(dateString);
  if (Number.isNaN(reviewedAt.getTime())) {
    return 999;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  reviewedAt.setHours(0, 0, 0, 0);

  return Math.round((today.getTime() - reviewedAt.getTime()) / 86400000);
};

const buildSummary = (skills) =>
  skills.reduce(
    (acc, skill) => {
      acc.totalDownloads += Number(skill.downloads || 0);
      acc.totalDetailViews += Number(skill.detailViews || 0);
      if (skill.securityStatus === "Passed") {
        acc.securityPassed += 1;
      }
      if (skill.validationStatus === "Verified") {
        acc.validationPassed += 1;
      }
      if (skill.validationStatus !== "Verified" || skill.securityStatus !== "Passed") {
        acc.attentionRequired += 1;
      }
      if (dateDiffInDays(skill.lastReviewed) > 10) {
        acc.reviewStale += 1;
      }
      return acc;
    },
    {
      totalSkills: skills.length,
      totalDownloads: 0,
      totalDetailViews: 0,
      securityPassed: 0,
      validationPassed: 0,
      attentionRequired: 0,
      reviewStale: 0
    }
  );

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `skill-${Date.now()}`;

const deriveTags = (skill) => {
  const tags = new Set(skill.tags || []);
  [skill.category, skill.securityStatus, skill.validationStatus, skill.sourceFamily, skill.sourceType, skill.sourceLabel]
    .filter(Boolean)
    .forEach((tag) => tags.add(tag));

  const pathLower = String(skill.path || "").toLowerCase();
  const combined = `${skill.name} ${skill.description} ${skill.category}`.toLowerCase();

  if (pathLower.includes("openai") || combined.includes("openai") || combined.includes("codex")) {
    tags.add("OpenAI");
  }
  if (pathLower.includes("azure") || combined.includes("azure")) {
    tags.add("Azure");
  }
  if (pathLower.includes("frontend") || combined.includes("frontend")) {
    tags.add("Frontend");
  }
  if (pathLower.includes(".system")) {
    tags.add("System");
  }

  return [...tags];
};

const normalizeSkill = (skill) => {
  const id = skill.id || slugify(skill.name);
  return {
    ...skill,
    id,
    name: skill.name || id,
    description: skill.description || "No description available.",
    category: skill.category || "General",
    path: skill.path || "",
    variant: skill.variant || "",
    maintainer: skill.maintainer || "Platform Engineering",
    downloads: Number(skill.downloads || 0),
    detailViews: Number(skill.detailViews || 0),
    score: Number(skill.score || 0),
    lastReviewed: skill.lastReviewed || new Date().toISOString().slice(0, 10),
    securityStatus: skill.securityStatus || "Unknown",
    validationStatus: skill.validationStatus || "Unknown",
    downloadPath: `/api/download/${id}`,
    tags: deriveTags(skill),
    sourceFamily: skill.sourceFamily || "",
    sourceType: skill.sourceType || "",
    sourceLabel: skill.sourceLabel || "",
    markdownPath: skill.markdownPath || "",
    locations: Array.isArray(skill.locations)
      ? skill.locations.map((location) => ({
          path: location.path || "",
          markdownPath: location.markdownPath || "",
          sourceFamily: location.sourceFamily || "",
          sourceType: location.sourceType || "",
          sourceLabel: location.sourceLabel || "",
          lastReviewed: location.lastReviewed || ""
        }))
      : [],
    locationCount: Number(skill.locationCount || skill.locations?.length || 0)
  };
};

const withZipAvailability = (skill) => ({
  ...skill,
  zipAvailable: existsSync(normalize(join(rootDir, "downloads", `${skill.id}.zip`)))
});

const serveFile = async (res, relativePath) => {
  const assetRelativePath = relativePath.startsWith("/assets/") ? relativePath.replace(/^\//, "") : relativePath;
  const resolvedRelativePath = relativePath.startsWith("/assets/") ? join("public", assetRelativePath) : relativePath;
  const normalizedPath = normalize(join(rootDir, resolvedRelativePath));

  if (!normalizedPath.startsWith(rootDir) || !existsSync(normalizedPath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const fileInfo = await stat(normalizedPath);
  const extension = extname(normalizedPath);

  res.writeHead(200, {
    "Content-Length": fileInfo.size,
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Cache-Control": extension === ".zip" ? "public, max-age=3600" : "no-cache"
  });

  createReadStream(normalizedPath).pipe(res);
};

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
};

const readJsonBody = async (req) => {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const readCatalog = async () => {
  const rawCatalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const skills = (rawCatalog.skills || []).map(normalizeSkill).map(withZipAvailability);
  return {
    skills,
    summary: buildSummary(skills),
    inventory: rawCatalog.inventory || null
  };
};

const writeCatalog = async (skills) => {
  let inventory = null;
  if (existsSync(catalogPath)) {
    const previousCatalog = JSON.parse(await readFile(catalogPath, "utf8"));
    inventory = previousCatalog.inventory || null;
  }

  const normalizedSkills = skills.map(normalizeSkill);
  const catalog = { skills: normalizedSkills, summary: buildSummary(normalizedSkills), inventory };
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return {
    ...catalog,
    skills: normalizedSkills.map(withZipAvailability)
  };
};

const writeFullCatalog = async (catalog) => {
  const normalizedSkills = (catalog.skills || []).map(normalizeSkill);
  const nextCatalog = {
    skills: normalizedSkills,
    summary: buildSummary(normalizedSkills),
    inventory: catalog.inventory || null
  };
  await writeFile(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`, "utf8");
  return {
    ...nextCatalog,
    skills: normalizedSkills.map(withZipAvailability)
  };
};

const readSkillMarkdown = async (skill) => {
  const candidates = [
    skill.markdownPath ? resolve(skill.markdownPath) : null,
    resolve(skill.path, "SKILL.md"),
    resolve(skill.path, "skill.md")
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFile(candidate, "utf8");
    }
  }

  return "";
};

const extractMarkdownInsights = (markdown, fallbackDescription) => {
  const withoutFrontmatter = markdown.replace(/^---[\s\S]*?---\s*/, "");
  const lines = withoutFrontmatter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headings = lines
    .filter((line) => /^#{1,6}\s/.test(line))
    .map((line) => line.replace(/^#{1,6}\s*/, ""))
    .slice(0, 5);

  const bullets = lines
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, ""))
    .slice(0, 6);

  const paragraphs = lines
    .filter((line) => !/^#{1,6}\s/.test(line) && !/^[-*]\s+/.test(line) && !/^[A-Za-z0-9_-]+:\s/.test(line))
    .filter((line) => line.length > 30);

  return {
    overview: paragraphs[0] || fallbackDescription || "No summary available.",
    usage: lines.find((line) => /^(when|use for|trigger|do not use)/i.test(line)) || "",
    headings,
    bullets
  };
};

const buildSkillDetail = async (skill) => {
  const markdown = await readSkillMarkdown(skill);
  const parsed = extractMarkdownInsights(markdown, skill.description);
  const catalog = await readCatalog();
  const relatedSkills = catalog.skills
    .filter((entry) => entry.id !== skill.id && entry.name === skill.name)
    .sort((left, right) => String(right.lastReviewed || "").localeCompare(String(left.lastReviewed || "")))
    .slice(0, 8)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      category: entry.category,
      sourceLabel: entry.sourceLabel,
      locationCount: entry.locationCount || 1,
      lastReviewed: entry.lastReviewed
    }));

  return {
    id: skill.id,
    markdownAvailable: Boolean(markdown),
    overview: parsed.overview,
    usageHint: parsed.usage,
    headings: parsed.headings,
    highlights: parsed.bullets,
    markdownPreview: markdown ? markdown.slice(0, 6000) : "",
    locations: skill.locations || [],
    locationCount: Number(skill.locationCount || skill.locations?.length || 0),
    relatedSkills
  };
};

const withSkill = async (skillId, handler, res) => {
  const catalog = await readCatalog();
  const skill = catalog.skills.find((entry) => entry.id === skillId);

  if (!skill) {
    sendJson(res, 404, { error: `Skill ${skillId} not found` });
    return;
  }

  await handler(catalog, skill);
};

const server = createServer(async (req, res) => {
  const requestPath = req.url === "/" ? "/index.html" : req.url;
  const safePath = requestPath.split("?")[0];

  try {
    if (req.method === "GET" && safePath === "/api/catalog") {
      sendJson(res, 200, await readCatalog());
      return;
    }

    if (req.method === "PUT" && safePath === "/api/catalog") {
      const body = await readJsonBody(req);
      const incomingSkills = Array.isArray(body.skills) ? body.skills : [];
      sendJson(res, 200, await writeCatalog(incomingSkills));
      return;
    }

    if (req.method === "POST" && safePath === "/api/catalog/skills") {
      const body = await readJsonBody(req);
      const catalog = await readCatalog();
      const nextSkill = normalizeSkill(body.skill || {});

      if (catalog.skills.some((skill) => skill.id === nextSkill.id)) {
        sendJson(res, 409, { error: `Skill with id ${nextSkill.id} already exists` });
        return;
      }

      sendJson(res, 201, await writeCatalog([...catalog.skills, nextSkill]));
      return;
    }

    if (req.method === "POST" && safePath === "/api/catalog/discover") {
      const catalog = await readCatalog();
      const discovered = await discoverSkillsOnDisk(catalog.skills);
      sendJson(
        res,
        200,
        await writeFullCatalog({
          skills: discovered.skills,
          inventory: discovered.inventory
        })
      );
      return;
    }

    if (req.method === "DELETE" && safePath.startsWith("/api/catalog/skills/")) {
      const skillId = decodeURIComponent(safePath.replace("/api/catalog/skills/", ""));
      const catalog = await readCatalog();
      const nextSkills = catalog.skills.filter((skill) => skill.id !== skillId);

      if (nextSkills.length === catalog.skills.length) {
        sendJson(res, 404, { error: `Skill ${skillId} not found` });
        return;
      }

      sendJson(res, 200, await writeCatalog(nextSkills));
      return;
    }

    if (req.method === "POST" && safePath === "/api/catalog/regenerate-zips") {
      const catalog = await readCatalog();
      const results = await packageSkills(catalog.skills);
      sendJson(res, 200, { status: "ok", results });
      return;
    }

    if (req.method === "GET" && safePath.startsWith("/api/skills/") && safePath.endsWith("/detail")) {
      const skillId = decodeURIComponent(safePath.replace("/api/skills/", "").replace("/detail", ""));

      await withSkill(
        skillId,
        async (catalog, skill) => {
          const nextSkills = catalog.skills.map((entry) =>
            entry.id === skill.id
              ? {
                  ...entry,
                  detailViews: Number(entry.detailViews || 0) + 1
                }
              : entry
          );

          const nextCatalog = await writeCatalog(nextSkills);
          const nextSkill = nextCatalog.skills.find((entry) => entry.id === skill.id);
          const detail = await buildSkillDetail(nextSkill);
          sendJson(res, 200, { skill: nextSkill, detail });
        },
        res
      );
      return;
    }

    if (req.method === "GET" && safePath.startsWith("/api/download/")) {
      const skillId = decodeURIComponent(safePath.replace("/api/download/", ""));

      await withSkill(
        skillId,
        async (catalog, skill) => {
          let zipPath = normalize(join(rootDir, "downloads", `${skill.id}.zip`));

          if (!zipPath.startsWith(rootDir)) {
            sendJson(res, 404, { error: `ZIP for ${skill.id} not found` });
            return;
          }

          if (!existsSync(zipPath)) {
            const packageResult = packageSkill(skill);
            if (packageResult.status !== "packaged") {
              sendJson(res, 404, {
                error: `ZIP for ${skill.id} not found`,
                reason: packageResult.reason || "package generation failed"
              });
              return;
            }
            zipPath = normalize(join(rootDir, "downloads", `${skill.id}.zip`));
          }

          const nextSkills = catalog.skills.map((entry) =>
            entry.id === skill.id
              ? {
                  ...entry,
                  downloads: Number(entry.downloads || 0) + 1
                }
              : entry
          );

          await writeCatalog(nextSkills);

          const fileInfo = await stat(zipPath);
          res.writeHead(200, {
            "Content-Length": fileInfo.size,
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${skill.id}.zip"`,
            "Cache-Control": "no-cache"
          });

          createReadStream(zipPath).pipe(res);
        },
        res
      );
      return;
    }

    await serveFile(res, safePath);
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "unknown"
    });
  }
});

server.on("error", (error) => {
  console.error(`Server failed to start: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Landing Skills Codex running at http://${host}:${port}`);
});
