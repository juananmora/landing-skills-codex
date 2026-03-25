import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverSkillsOnDisk } from "../data/discover-skills.mjs";

const currentFile = fileURLToPath(import.meta.url);
const rootDir = dirname(dirname(currentFile));
const catalogPath = resolve(rootDir, "data", "skills.catalog.json");

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
      if (skill.securityStatus === "Passed") acc.securityPassed += 1;
      if (skill.validationStatus === "Verified") acc.validationPassed += 1;
      if (skill.validationStatus !== "Verified" || skill.securityStatus !== "Passed") acc.attentionRequired += 1;
      if (dateDiffInDays(skill.lastReviewed) > 10) acc.reviewStale += 1;
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

const existingCatalog = JSON.parse(await readFile(catalogPath, "utf8"));
const discovered = await discoverSkillsOnDisk(existingCatalog.skills || []);
const nextCatalog = {
  skills: discovered.skills,
  summary: buildSummary(discovered.skills),
  inventory: discovered.inventory
};

await writeFile(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`, "utf8");

console.log(`Discovered ${discovered.inventory.uniqueSkills} unique skills from ${discovered.inventory.totalSkillFiles} SKILL.md files.`);
