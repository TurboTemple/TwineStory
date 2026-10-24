// media-manifest.mjs — write src/01-engine/media-manifest.js listing every
// file under assets/media, so the game can find media by name, and every
// passage still saying "[… edit here]" (for the debug Writing checklist). Run before
// Tweego (GitHub Actions does this). The output is gitignored.
//
//   node scripts/media-manifest.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildManifest, findPlaceholders, manifestScript } from "./lib/media.mjs";
import { parseTwee } from "./lib/twee.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = buildManifest(root);
const out = path.join(root, "src/01-engine/media-manifest.js");
const placeholders = findPlaceholders(root, parseTwee);
fs.writeFileSync(out, manifestScript(manifest, placeholders));
console.log(`Media manifest: ${Object.keys(manifest).length} file(s); ${Object.keys(placeholders).length} passage(s) still to write.`);
