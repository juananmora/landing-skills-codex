import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const dataDir = dirname(currentFile);
const catalogPath = resolve(dataDir, "skills.catalog.json");

export const loadSkillsCatalog = async () => {
  const raw = await readFile(catalogPath, "utf8");
  return JSON.parse(raw);
};
