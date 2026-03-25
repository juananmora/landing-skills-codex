import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkillsCatalog } from "../data/load-skills.mjs";

const currentFile = fileURLToPath(import.meta.url);
const rootDir = dirname(dirname(currentFile));
const downloadsDir = resolve(rootDir, "downloads");
const tempRootDir = resolve(downloadsDir, ".tmp");
const ALLOWED_TOP_LEVEL_NAMES = new Set([
  "skill.md",
  "readme.md",
  "assets",
  "references",
  "scripts",
  "examples",
  "templates",
  "agents"
]);
const ALLOWED_TOP_LEVEL_EXTENSIONS = new Set([".md", ".json", ".yaml", ".yml", ".txt", ".png", ".jpg", ".jpeg", ".svg", ".webp"]);

const sanitizeSegment = (value) =>
  String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "location";

const collectLocations = (skill) => {
  const locations = Array.isArray(skill.locations) && skill.locations.length ? skill.locations : [{ path: skill.path }];
  const seen = new Set();

  return locations.filter((location) => {
    const locationPath = String(location?.path || "").replace(/\//g, "\\");
    if (!locationPath || seen.has(locationPath)) {
      return false;
    }
    seen.add(locationPath);
    return true;
  });
};

const shouldIncludeEntry = (entryName, sourcePath) => {
  const normalizedName = entryName.toLowerCase();
  if (ALLOWED_TOP_LEVEL_NAMES.has(normalizedName)) {
    return true;
  }

  const entryPath = resolve(sourcePath, entryName);
  try {
    const stats = statSync(entryPath);
    if (!stats.isFile()) {
      return false;
    }
  } catch {
    return false;
  }

  const extension = normalizedName.includes(".") ? `.${normalizedName.split(".").pop()}` : "";
  return ALLOWED_TOP_LEVEL_EXTENSIONS.has(extension);
};

const copySkillContents = (sourcePath, targetDir) => {
  const entries = readdirSync(sourcePath, { withFileTypes: true });

  for (const entry of entries) {
    if (!shouldIncludeEntry(entry.name, sourcePath)) {
      continue;
    }

    const sourceEntryPath = resolve(sourcePath, entry.name);
    const targetEntryPath = resolve(targetDir, entry.name);

    if (entry.isDirectory()) {
      cpSync(sourceEntryPath, targetEntryPath, { recursive: true });
      continue;
    }

    cpSync(sourceEntryPath, targetEntryPath);
  }
};

const cleanupStagingDir = (stagingDir, logger) => {
  try {
    rmSync(stagingDir, { recursive: true, force: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    logger.warn?.(`Cleanup skipped for ${stagingDir} (${reason}).`);
  }
};

const stageSkillPackage = (skill, logger) => {
  const stagingDir = resolve(tempRootDir, `${skill.id}-${Date.now()}`);
  const bundleDir = resolve(stagingDir, skill.id);
  const locations = collectLocations(skill);
  const packagedLocations = [];

  cleanupStagingDir(stagingDir, logger);
  mkdirSync(bundleDir, { recursive: true });

  for (const [index, location] of locations.entries()) {
    const sourcePath = String(location.path || "").replace(/\//g, "\\");

    if (!existsSync(sourcePath)) {
      logger.warn?.(`Skipped location for ${skill.id}: source path not found (${sourcePath}).`);
      continue;
    }

    const locationName = sanitizeSegment(basename(sourcePath));
    const targetDir = resolve(bundleDir, "locations", `${String(index + 1).padStart(2, "0")}-${locationName}`);

    mkdirSync(dirname(targetDir), { recursive: true });
    mkdirSync(targetDir, { recursive: true });
    copySkillContents(sourcePath, targetDir);

    packagedLocations.push({
      path: sourcePath,
      packagedAs: `locations/${String(index + 1).padStart(2, "0")}-${locationName}`,
      sourceFamily: location.sourceFamily || "",
      sourceType: location.sourceType || "",
      sourceLabel: location.sourceLabel || ""
    });
  }

  if (!packagedLocations.length) {
    cleanupStagingDir(stagingDir, logger);
    return null;
  }

  writeFileSync(
    resolve(bundleDir, "manifest.json"),
    `${JSON.stringify(
      {
        id: skill.id,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        generatedAt: new Date().toISOString(),
        locationCount: packagedLocations.length,
        locations: packagedLocations
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  return { stagingDir, bundleDir, packagedLocations };
};

export const packageSkill = (skill, options = {}) => {
  const logger = options.logger || console;
  const targetZip = resolve(downloadsDir, `${skill.id}.zip`);
  const staged = stageSkillPackage(skill, logger);

  if (!staged) {
    const message = `Skipped ${skill.id}: source path not found.`;
    logger.warn?.(message);
    return { id: skill.id, status: "skipped", reason: "source path not found" };
  }

    if (existsSync(targetZip)) {
      try {
        rmSync(targetZip, { force: true });
      } catch (error) {
      cleanupStagingDir(staged.stagingDir, logger);
      const reason = error instanceof Error ? error.message : "unknown error";
      logger.warn?.(`Skipped ${skill.id}: could not replace existing zip (${reason}).`);
      return { id: skill.id, status: "skipped", reason };
    }
  }

  try {
    execFileSync("tar", ["-a", "-c", "-f", targetZip, "-C", staged.stagingDir, skill.id], { stdio: "inherit" });
  } finally {
    cleanupStagingDir(staged.stagingDir, logger);
  }

  logger.log?.(`Packaged ${skill.id}`);
  return {
    id: skill.id,
    status: "packaged",
    file: targetZip,
    locationCount: staged.packagedLocations.length
  };
};

export const packageSkills = async (skills, options = {}) => {
  const logger = options.logger || console;
  const results = [];

  mkdirSync(downloadsDir, { recursive: true });
  mkdirSync(tempRootDir, { recursive: true });

  for (const skill of skills) {
    results.push(packageSkill(skill, { logger }));
  }

  return results;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { skills } = await loadSkillsCatalog();
  await packageSkills(skills);
}
