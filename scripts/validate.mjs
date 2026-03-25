import { readFile } from "node:fs/promises";

const filesToVerify = [
  "server.mjs",
  "app.js",
  "data/skills.catalog.json",
  "data/load-skills.mjs",
  "index.html",
  "styles.css"
];

for (const file of filesToVerify) {
  await readFile(new URL(`../${file}`, import.meta.url), "utf8");
}

console.log(`Validated ${filesToVerify.length} project files.`);
