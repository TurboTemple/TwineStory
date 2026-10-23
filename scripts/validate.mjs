// validate.mjs — content and source validator (§11). Exits non-zero on any error.
//
//   node scripts/validate.mjs
//
// 1. Loads every src/**/*.js into a sandbox with stubbed SugarCube globals.
// 2. Runs the queued content functions (including _test content).
// 3. Parses every src/**/*.twee file.
// 4. Checks passages, links, banned APIs, ids and the age rules.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectContent, listFiles, loadStoryJs } from "./lib/load.mjs";
import { checkDefs, checkLinks, checkPassages, checkSources } from "./lib/rules.mjs";
import { findPassageRefs, parseTwee } from "./lib/twee.mjs";

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

	let setup;
	try {
		({ setup } = loadStoryJs(src, { search: "?debug" }));
	}
	catch (ex) {
		errors.push(`Story JavaScript failed to load: ${ex.stack ?? ex}`);
		return errors;
	}
	try {
		const { defs } = collectContent(setup);
		errors.push(...checkDefs(defs));
	}
	catch (ex) {
		errors.push(`Content failed to load: ${ex.stack ?? ex}`);
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
