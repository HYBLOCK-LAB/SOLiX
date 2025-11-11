import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");

const importRegex = /(from\s+['"])(\.{1,2}\/[^'"?\n]*?)(['"])/g;
const exportRegex = /(export\s+\*?\s*from\s+['"])(\.{1,2}\/[^'"?\n]*?)(['"])/g;
const dynamicRegex = /(import\(\s*['"])(\.{1,2}\/[^'"?\n]*?)(['"]\s*\))/g;

function needsExtension(specifier) {
  return !specifier.endsWith(".js") && !specifier.endsWith(".mjs") && !specifier.endsWith(".cjs");
}

function patchContents(source) {
  let updated = source.replace(importRegex, (match, start, spec, end) => {
    return needsExtension(spec) ? `${start}${spec}.js${end}` : match;
  });

  updated = updated.replace(exportRegex, (match, start, spec, end) => {
    return needsExtension(spec) ? `${start}${spec}.js${end}` : match;
  });

  updated = updated.replace(dynamicRegex, (match, start, spec, end) => {
    return needsExtension(spec) ? `${start}${spec}.js${end}` : match;
  });

  return updated;
}

async function processFile(file) {
  const content = await fs.readFile(file, "utf8");
  const patched = patchContents(content);
  if (patched !== content) {
    await fs.writeFile(file, patched, "utf8");
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        await processFile(fullPath);
      }
    })
  );
}

await walk(distDir);
