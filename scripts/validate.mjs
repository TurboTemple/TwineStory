// validate.mjs — the content checker (§11). Exits non-zero on any error,
// which stops GitHub Actions from publishing a broken game.
//
//   node scripts/validate.mjs
//
// 1. Parses every src/**/*.twee file; checks passages, links and banned APIs.
// 2. Loads every src/**/*.js into a sandbox with stubbed SugarCube globals
//    and boots the real engine with the real town content.
// 3. Runs registry validation (refs, passages, condition/effect operators,
//    per-type checks, module checks) and the age rules.
// 4. Reads the story macros in passages (<<when>>, <<choice>>, <<name>>…)
//    and checks their conditions, effects, passages and people.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bootGame, listFiles } from "./lib/load.mjs";
import { checkDefs, checkFileNames, checkLinks, checkPassages, checkSources, checkStoryMacros } from "./lib/rules.mjs";
import { findPassageRefs, parseTwee } from "./lib/twee.mjs";
import { buildManifest } from "./lib/media.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const rel = (f) => path.relative(root, f);

/** Run every check and return the list of errors. */
export function validate() {
	const errors = [];

	const tweeFiles = listFiles(src, ".twee").concat(listFiles(src, ".tw"));
	const jsFiles = listFiles(src, ".js");
	const sources = [...tweeFiles, ...jsFiles].map((f) => ({ file: rel(f), text: fs.readFileSync(f, "utf8") }));

	const passages = tweeFiles.flatMap((f) => parseTwee(fs.readFileSync(f, "utf8"), rel(f)));
	errors.push(...checkPassages(passages));
	errors.push(...checkLinks(passages, findPassageRefs));
	errors.push(...checkSources(sources));
	errors.push(...checkFileNames([...jsFiles, ...listFiles(src, ".css")].map(rel)));

	// Boot the real engine with the town content and check every definition.
	try {
		const names = new Set(passages.map((p) => p.name));
		const { setup } = bootGame(src, { includeTest: true, passages: names });
		errors.push(...setup.validate({ hasPassage: (n) => names.has(n) }));
		errors.push(...checkDefs(setup.registry.entries()));
		errors.push(...checkStoryMacros(passages, setup, (n) => names.has(n)));
		// A `media` path set on a definition must exist (web addresses are trusted).
		const manifest = Object.values(buildManifest(root));
		for (const { type, def } of setup.registry.entries()) {
			const src = typeof def.media === "string" ? def.media : def.media?.src;
			if (src && !/^https?:/.test(src) && !manifest.includes(src) && !fs.existsSync(path.join(root, src))) {
				errors.push(`${type} "${def.id}": media file "${src}" not found`);
			}
		}
	}
	catch (ex) {
		errors.push(`Engine failed to boot: ${ex.stack ?? ex}`);
	}
	return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const errors = validate();
	if (errors.length) {
		console.error(`Validation failed with ${errors.length} error(s):`);
		for (const e of errors) console.error(`  - ${e}`);
		process.exit(1);
	}
	console.log("Validation passed.");
}
