import { existsSync } from "node:fs";
import { opendir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const homeDir = homedir();

const DISCOVERY_ROOTS = [
  { path: join(homeDir, ".agents", "skills"), sourceFamily: "Agents", sourceType: "local" },
  { path: join(homeDir, ".codex", "skills"), sourceFamily: "Codex", sourceType: "local" },
  { path: join(homeDir, ".codex", "vendor_imports", "skills", "skills", ".curated"), sourceFamily: "Codex", sourceType: "vendor" },
  { path: join(homeDir, ".copilot", "skills"), sourceFamily: "Copilot", sourceType: "local" },
  { path: join(homeDir, ".copilot", "installed-plugins"), sourceFamily: "Copilot", sourceType: "plugin" },
  { path: join(homeDir, ".claude", "skills"), sourceFamily: "Claude", sourceType: "local" },
  { path: join(homeDir, ".claude", "plugins", "marketplaces"), sourceFamily: "Claude", sourceType: "marketplace" },
  { path: resolve("C:/02 - Accenture/03 - Repositorios"), sourceFamily: "Projects", sourceType: "repo" }
];

const SOURCE_PRIORITY = {
  local: 1,
  vendor: 2,
  repo: 3,
  plugin: 4,
  marketplace: 5,
  extension: 5,
  cache: 6
};

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `skill-${Date.now()}`;

const normalizePath = (value) => String(value || "").replace(/\\/g, "/").toLowerCase();
const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const parseFrontmatter = (raw) => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  return match[1].split(/\r?\n/).reduce((acc, line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      return acc;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const extractBodyDescription = (raw) => {
  const withoutFrontmatter = raw.replace(/^---[\s\S]*?---\s*/, "");
  const lines = withoutFrontmatter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.find((line) => !line.startsWith("#") && !line.startsWith("-") && line.length > 32) || "";
};

const inferCategory = ({ sourceFamily, sourceType, name, description, path }) => {
  const haystack = `${name} ${description} ${path}`.toLowerCase();

  if (haystack.includes("frontend") || haystack.includes("design") || haystack.includes("ui") || haystack.includes("css")) return "Frontend";
  if (haystack.includes("playwright") || haystack.includes("test") || haystack.includes("debug")) return "Testing";
  if (haystack.includes("openai") || haystack.includes("codex") || haystack.includes("chatgpt") || haystack.includes("image")) return "OpenAI";
  if (haystack.includes("azure") || haystack.includes("entra")) return "Azure";
  if (haystack.includes("pptx") || haystack.includes("docx") || haystack.includes("pdf") || haystack.includes("xlsx")) return "Productivity";
  if (haystack.includes("security")) return "Security";
  if (haystack.includes("mcp")) return "Developer Tools";
  if (sourceType === "cache") return "Cache";
  return sourceFamily;
};

const inferMaintainer = ({ sourceFamily, sourceType }) => {
  if (sourceType === "marketplace") return `${sourceFamily} Marketplace`;
  if (sourceType === "cache") return `${sourceFamily} Cache`;
  if (sourceType === "vendor") return `${sourceFamily} Vendor Imports`;
  if (sourceType === "repo") return "Project Repository";
  if (sourceType === "plugin") return `${sourceFamily} Plugins`;
  if (sourceType === "extension") return "VS Code Extensions";
  return `${sourceFamily} Local`;
};

const inferScore = ({ sourceType }) => {
  if (sourceType === "local") return 84;
  if (sourceType === "vendor") return 80;
  if (sourceType === "repo") return 79;
  if (sourceType === "plugin") return 78;
  if (sourceType === "marketplace") return 74;
  if (sourceType === "extension") return 72;
  return 68;
};

const getLocationPriority = (location) => SOURCE_PRIORITY[location.sourceType] || 99;

const walkForSkillFiles = async (rootPath, collector) => {
  if (!existsSync(rootPath)) {
    return;
  }

  const directory = await opendir(rootPath);
  for await (const entry of directory) {
    const fullPath = join(rootPath, entry.name);

    if (entry.isDirectory()) {
      if (["node_modules", ".git"].includes(entry.name.toLowerCase())) {
        continue;
      }
      await walkForSkillFiles(fullPath, collector);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase() === "skill.md") {
      collector.push(fullPath);
    }
  }
};

const buildDiscoveredSkill = async (skillFilePath, rootConfig, existingByPath) => {
  const skillDir = dirname(skillFilePath);
  const raw = await readFile(skillFilePath, "utf8");
  const fileStats = await stat(skillFilePath);
  const frontmatter = parseFrontmatter(raw);
  const normalizedPath = normalizePath(skillDir);
  const existing = existingByPath.get(normalizedPath);
  const relativeBase = skillDir.startsWith(rootConfig.path) ? rootConfig.path : homeDir;
  const relativeFromBase = relative(relativeBase, skillDir).split(sep).join("/");
  const pathId = slugify(relativeFromBase);
  const name = frontmatter.name || basename(skillDir);
  const description = frontmatter.description || extractBodyDescription(raw) || "Skill descubierta automaticamente desde disco.";
  const sourcePath = skillDir.split(sep).join("/");
  const sourceLabel = `${rootConfig.sourceFamily} / ${rootConfig.sourceType}`;

  return {
    id: existing?.id || `${slugify(rootConfig.sourceFamily)}-${pathId}`,
    name,
    variant: existing?.variant || "",
    category: existing?.category || inferCategory({ sourceFamily: rootConfig.sourceFamily, sourceType: rootConfig.sourceType, name, description, path: sourcePath }),
    path: sourcePath,
    description: existing?.description || description,
    downloads: Number(existing?.downloads || 0),
    detailViews: Number(existing?.detailViews || 0),
    securityStatus: existing?.securityStatus || "Unknown",
    validationStatus: existing?.validationStatus || "Unknown",
    score: Number(existing?.score || inferScore(rootConfig)),
    lastReviewed: existing?.lastReviewed || fileStats.mtime.toISOString().slice(0, 10),
    maintainer: existing?.maintainer || inferMaintainer(rootConfig),
    tags: [...new Set([...(existing?.tags || []), rootConfig.sourceFamily, rootConfig.sourceType, sourceLabel].filter(Boolean))],
    downloadPath: existing?.downloadPath || `/api/download/${existing?.id || `${slugify(rootConfig.sourceFamily)}-${pathId}`}`,
    sourceFamily: rootConfig.sourceFamily,
    sourceType: rootConfig.sourceType,
    sourceLabel,
    markdownPath: skillFilePath.split(sep).join("/"),
    locations: existing?.locations || [
      {
        path: sourcePath,
        markdownPath: skillFilePath.split(sep).join("/"),
        sourceFamily: rootConfig.sourceFamily,
        sourceType: rootConfig.sourceType,
        sourceLabel,
        lastReviewed: existing?.lastReviewed || fileStats.mtime.toISOString().slice(0, 10)
      }
    ]
  };
};

const groupKeyForSkill = (skill) => `${slugify(skill.name)}--${slugify(normalizeText(skill.description))}`;

const choosePrimarySkill = (skills) =>
  [...skills].sort((left, right) => {
    const priorityDiff = getLocationPriority(left) - getLocationPriority(right);
    if (priorityDiff !== 0) return priorityDiff;
    return String(right.lastReviewed || "").localeCompare(String(left.lastReviewed || ""));
  })[0];

const mergeGroupedSkills = (groupName, skillsInGroup, existingSkills) => {
  const existingGroup = existingSkills.find((skill) => groupKeyForSkill(skill) === groupName);
  const primarySkill = choosePrimarySkill(skillsInGroup);
  const uniqueLocations = [];
  const seenPaths = new Set();

  for (const skill of skillsInGroup) {
    for (const location of skill.locations || []) {
      const normalizedLocationPath = normalizePath(location.path);
      if (seenPaths.has(normalizedLocationPath)) {
        continue;
      }

      seenPaths.add(normalizedLocationPath);
      uniqueLocations.push(location);
    }
  }

  uniqueLocations.sort((left, right) => {
    const priorityDiff = getLocationPriority(left) - getLocationPriority(right);
    if (priorityDiff !== 0) return priorityDiff;
    return String(right.lastReviewed || "").localeCompare(String(left.lastReviewed || ""));
  });

  const lastReviewed = uniqueLocations.reduce(
    (latest, location) => (!latest || String(location.lastReviewed || "") > latest ? String(location.lastReviewed || "") : latest),
    primarySkill.lastReviewed
  );

  const tags = [
    ...new Set(
      skillsInGroup.flatMap((skill) => [
        ...(skill.tags || []),
        skill.sourceFamily,
        skill.sourceType,
        skill.sourceLabel
      ])
    )
  ].filter(Boolean);

  return {
    ...primarySkill,
    id: existingGroup?.id || existingSkills.find((skill) => normalizePath(skill.path) === normalizePath(primarySkill.path))?.id || `group-${groupName}`,
    downloads: Number(existingGroup?.downloads || primarySkill.downloads || 0),
    detailViews: Number(existingGroup?.detailViews || primarySkill.detailViews || 0),
    securityStatus: existingGroup?.securityStatus || primarySkill.securityStatus,
    validationStatus: existingGroup?.validationStatus || primarySkill.validationStatus,
    score: Number(existingGroup?.score || primarySkill.score || 0),
    maintainer: existingGroup?.maintainer || primarySkill.maintainer,
    category: existingGroup?.category || primarySkill.category,
    description: existingGroup?.description || primarySkill.description,
    lastReviewed,
    path: uniqueLocations[0]?.path || primarySkill.path,
    markdownPath: uniqueLocations[0]?.markdownPath || primarySkill.markdownPath,
    downloadPath: `/api/download/${existingGroup?.id || `group-${groupName}`}`,
    tags,
    locations: uniqueLocations,
    locationCount: uniqueLocations.length,
    sourceFamily: uniqueLocations[0]?.sourceFamily || primarySkill.sourceFamily,
    sourceType: uniqueLocations[0]?.sourceType || primarySkill.sourceType,
    sourceLabel: uniqueLocations[0]?.sourceLabel || primarySkill.sourceLabel
  };
};

export const discoverSkillsOnDisk = async (existingSkills = []) => {
  const existingByPath = new Map(existingSkills.map((skill) => [normalizePath(skill.path), skill]));
  const discoveredByPath = new Map();
  const inventory = [];

  for (const rootConfig of DISCOVERY_ROOTS) {
    const skillFiles = [];
    await walkForSkillFiles(rootConfig.path, skillFiles);

    for (const skillFilePath of skillFiles) {
      const skill = await buildDiscoveredSkill(skillFilePath, rootConfig, existingByPath);
      discoveredByPath.set(normalizePath(skill.path), skill);
      inventory.push({ path: skill.path, sourceFamily: rootConfig.sourceFamily, sourceType: rootConfig.sourceType });
    }
  }

  const groupedByName = [...discoveredByPath.values()].reduce((acc, skill) => {
    const key = groupKeyForSkill(skill);
    if (!acc.has(key)) {
      acc.set(key, []);
    }
    acc.get(key).push(skill);
    return acc;
  }, new Map());

  const discoveredSkills = [...groupedByName.entries()]
    .map(([groupName, skillsInGroup]) => mergeGroupedSkills(groupName, skillsInGroup, existingSkills))
    .sort((left, right) => left.name.localeCompare(right.name));

  const inventoryBySource = inventory.reduce((acc, item) => {
    const key = `${item.sourceFamily} / ${item.sourceType}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const duplicateGroups = discoveredSkills
    .filter((skill) => Number(skill.locationCount || 0) > 1)
    .map((skill) => ({ name: skill.name, count: skill.locationCount }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));

  return {
    skills: discoveredSkills,
    inventory: {
      totalSkillFiles: inventory.length,
      uniqueSkills: discoveredSkills.length,
      groupedAway: inventory.length - discoveredSkills.length,
      duplicateGroups,
      sources: Object.entries(inventoryBySource)
        .map(([label, count]) => ({ label, count }))
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    }
  };
};
