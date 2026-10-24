// rules.mjs — pure validation rules (§11). Each function returns a list of
// error strings; an empty list means the check passed.

export const ID_RE = /^[a-z][a-z0-9_]*$/;
export const SUGARCUBE_VERSION = "2.37.3";
// The IFID must never change once generated (§15).
export const IFID = "FC145B33-A829-4D04-9BDF-7639A05F2455";
// Roles/tags that mark an NPC as a classmate or school student (§1).
export const STUDENT_MARKERS = ["student", "classmate"];
// Leaf condition operator that guarantees every participant is at least N.
// The operator itself is registered by the npcs/relationships modules.
export const AGE_CONDITION_OP = "ageAtLeast";
export const ADULT_AGE = 18;

const SPECIAL_PASSAGES = new Set([
	"StoryData", "StoryTitle", "StoryInit", "StoryInterface", "StoryCaption",
	"StoryBanner", "StoryMenu", "StoryAuthor", "StorySubtitle", "StoryShare",
	"PassageReady", "PassageDone", "PassageHeader", "PassageFooter",
]);

const where = (p) => `${p.file}:${p.line} (${p.name})`;

/**
 * Story-level checks: duplicate passages, StoryData, start passage, links.
 * @param {{ name: string, tags: string[], text: string, file: string, line: number }[]} passages
 */
export function checkPassages(passages) {
	const errors = [];
	const byName = new Map();
	for (const p of passages) {
		if (byName.has(p.name)) {
			errors.push(`Duplicate passage "${p.name}": ${where(byName.get(p.name))} and ${where(p)}`);
		}
		else byName.set(p.name, p);
	}

	const data = byName.get("StoryData");
	let start = "Start";
	if (!data) errors.push("Missing StoryData passage");
	else {
		try {
			const json = JSON.parse(data.text);
			if (json.ifid !== IFID) errors.push(`StoryData ifid changed (expected ${IFID}); the IFID must never change`);
			if (json.format !== "SugarCube") errors.push(`StoryData format must be "SugarCube"`);
			if (json["format-version"] !== SUGARCUBE_VERSION) errors.push(`StoryData format-version must be ${SUGARCUBE_VERSION}`);
			if (json.start) start = json.start;
		}
		catch (ex) {
			errors.push(`StoryData is not valid JSON: ${ex.message}`);
		}
	}
	if (!byName.has(start)) errors.push(`Start passage "${start}" does not exist`);
	if (!byName.has("StoryTitle")) errors.push("Missing StoryTitle passage");

	for (const p of passages) {
		const isWidget = p.tags.includes("widget");
		if (/<<widget\b/.test(p.text) && !isWidget) {
			errors.push(`${where(p)}: <<widget>> defined outside a widget-tagged passage`);
		}
		if (isWidget && (SPECIAL_PASSAGES.has(p.name) || p.tags.includes("init"))) {
			errors.push(`${where(p)}: widget tag on a special/init passage`);
		}
	}
	return errors;
}

/**
 * Every literal link/goto/include target must exist.
 * @param {{ name: string, file: string, line: number }[]} passages
 * @param {(text: string) => string[]} findRefs
 */
export function checkLinks(passages, findRefs) {
	const names = new Set(passages.map((p) => p.name));
	const errors = [];
	for (const p of passages) {
		if (p.name === "StoryData") continue;
		for (const ref of findRefs(p.text)) {
			if (!names.has(ref)) errors.push(`${where(p)}: links to missing passage "${ref}"`);
		}
	}
	return errors;
}

const BANNED = [
	{ re: /\bMath\.random\s*\(/, msg: "uses Math.random(); use setup.rng (§4.5)" },
	{ re: /\bConfig\.saves\.on(Load|Save)\b/, msg: "uses deprecated Config.saves.onLoad/onSave; use Save.onLoad/onSave" },
	{ re: /\bJSON\.reviveWrapper\b/, msg: "uses deprecated JSON.reviveWrapper; use Serial.createReviver" },
	{ re: /\bDialog\.setup\b/, msg: "uses deprecated Dialog.setup; use Dialog.create" },
	{ re: /\bUIBar\.update\b/, msg: "uses deprecated UIBar.update; use UI.update" },
	{ re: /\$args\b/, msg: "uses deprecated $args; use _args" },
	// (<<choice>> is the game's own story macro now: src/modules/writing.)
	{ re: /<<actions\b/, msg: "uses the deprecated <<actions>> macro" },
	{ re: /\beval\s*\(|\bnew\s+Function\s*\(/, msg: "uses eval/new Function (§9)" },
];

/**
 * Source-level bans (§15). `Engine.play` is only allowed in the adapter.
 * @param {{ file: string, text: string }[]} sources
 */
export function checkSources(sources) {
	const errors = [];
	for (const { file, text } of sources) {
		// Strip line and block comments from JS so docs can mention banned names.
		const code = file.endsWith(".js")
			? text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
			: text;
		for (const { re, msg } of BANNED) {
			if (re.test(code)) errors.push(`${file}: ${msg}`);
		}
		if (/\bEngine\.play\s*\(/.test(code) && !file.endsWith("sc-adapter.js")) {
			errors.push(`${file}: calls Engine.play directly; use setup.flow (§5.3)`);
		}
	}
	return errors;
}

/** True if `cond` guarantees every participant is at least ADULT_AGE. */
export function guaranteesAdult(cond) {
	if (cond == null || typeof cond !== "object") return false;
	if (Array.isArray(cond)) return cond.some(guaranteesAdult);
	if (Array.isArray(cond.all)) return cond.all.some(guaranteesAdult);
	if (Array.isArray(cond.any)) return cond.any.length > 0 && cond.any.every(guaranteesAdult);
	if (AGE_CONDITION_OP in cond) {
		const spec = cond[AGE_CONDITION_OP];
		const n = typeof spec === "number" ? spec : spec?.age;
		return Number.isFinite(n) && n >= ADULT_AGE;
	}
	return false;
}

const hasMarker = (def) =>
	STUDENT_MARKERS.includes(def.role) ||
	(Array.isArray(def.tags) && def.tags.some((t) => STUDENT_MARKERS.includes(t)));

/**
 * Content checks: ids, duplicates, and the age rules (§1).
 * @param {{ type: string, def: object }[]} defs
 */
export function checkDefs(defs) {
	const errors = [];
	const seen = new Set();
	for (const { type, def } of defs) {
		const label = `${type} "${def?.id}"`;
		if (!def || typeof def.id !== "string" || !ID_RE.test(def.id)) {
			errors.push(`${label}: id must match ${ID_RE}`);
			continue;
		}
		const key = `${type}:${def.id}`;
		if (seen.has(key)) errors.push(`${label}: duplicate id`);
		seen.add(key);

		if (type === "npc") {
			if (!Number.isInteger(def.age)) errors.push(`${label}: every NPC needs an explicit integer age`);
			else if (hasMarker(def) && def.age !== ADULT_AGE) {
				errors.push(`${label}: classmates and students must be exactly ${ADULT_AGE} (got ${def.age})`);
			}
			else if (def.age < ADULT_AGE && Array.isArray(def.tags) && def.tags.includes("romance")) {
				errors.push(`${label}: romance-tagged NPC must be ${ADULT_AGE}+`);
			}
		}

		if (Array.isArray(def.tags) && def.tags.includes("romance") && type !== "npc") {
			if (!guaranteesAdult(def.conditions)) {
				errors.push(`${label}: romance-tagged content needs a { ${AGE_CONDITION_OP}: ${ADULT_AGE} } condition (not under any/not)`);
			}
		}
	}
	return errors;
}

/**
 * Tweego turns every .js/.css file into a passage named after its file name,
 * so two files with the same name (in different folders) clash.
 * @param {string[]} files  Paths of .js and .css files under src/.
 */
export function checkFileNames(files) {
	const seen = new Map();
	const errors = [];
	for (const f of files) {
		const base = f.split(/[\\/]/).pop();
		if (seen.has(base)) errors.push(`Two files are both called "${base}" (${seen.get(base)} and ${f}); Tweego needs unique file names`);
		else seen.set(base, f);
	}
	return errors;
}

/** The story macros (src/modules/writing) whose arguments the checker reads. */
const PRONOUNS = ["they", "them", "their", "theirs", "themself"];
const PERSON_MACROS = new Set(["name", "first", ...PRONOUNS, ...PRONOUNS.map((p) => p[0].toUpperCase() + p.slice(1))]);
const CHOICE_OPTIONS = new Set(["effects", "conditions", "hidden", "npc"]);

/**
 * Check the story macros in every passage: <<when>>/<<orwhen>> conditions,
 * <<choice>> labels, passages, options, conditions and effects, and the
 * people named in <<name>>, <<they>>… Uses the booted engine's registered
 * condition and effect names, so a typo fails the build.
 * @param {{ name: string, text: string, file: string }[]} passages
 * @param {object} setup  A booted engine.
 * @param {(name: string) => boolean} hasPassage
 * @returns {string[]}
 */
export function checkStoryMacros(passages, setup, hasPassage) {
	const errors = [];
	const macroRe = /<<([A-Za-z]+)((?:[^>]|>(?!>))*)>>/g;
	for (const p of passages) {
		const where = `${p.file}: passage "${p.name}"`;
		const badConds = (c, what) => {
			for (const op of setup.cond.ops(c)) if (!setup.cond.has(op)) errors.push(`${where}: ${what} uses unknown condition "${op}"`);
		};
		const npc = (id, what) => {
			if (id != null && !setup.registry.has("npc", id)) errors.push(`${where}: ${what} names unknown person "${id}"`);
		};
		for (const m of p.text.matchAll(macroRe)) {
			const [, name, raw] = m;
			const what = `<<${name}>>`;
			if (!["when", "orwhen", "choice"].includes(name) && !PERSON_MACROS.has(name)) continue;
			let args;
			try {
				args = setup.util.parseData(raw);
			}
			catch (err) {
				errors.push(`${where}: ${what}: ${err.message}`);
				continue;
			}
			if (name === "when" || name === "orwhen") {
				if (args.length !== 1) errors.push(`${where}: ${what} needs exactly one condition`);
				else badConds(args[0], what);
			}
			else if (name === "choice") {
				const [label, ...rest] = args;
				if (typeof label !== "string") {
					errors.push(`${where}: ${what} needs a label in quotes first`);
					continue;
				}
				const target = typeof rest[0] === "string" ? rest.shift() : null;
				if (target && !hasPassage(target)) errors.push(`${where}: ${what} "${label}" goes to missing passage "${target}"`);
				const opts = rest[0] ?? {};
				if (rest.length > 1 || typeof opts !== "object" || Array.isArray(opts) || opts === null) {
					errors.push(`${where}: ${what} "${label}": expected { effects, conditions, hidden, npc } after the passage`);
					continue;
				}
				for (const k of Object.keys(opts)) if (!CHOICE_OPTIONS.has(k)) errors.push(`${where}: ${what} "${label}": unknown option "${k}"`);
				if (opts.conditions != null) badConds(opts.conditions, what);
				for (const op of setup.effects.ops(opts.effects ?? [])) if (!setup.effects.has(op)) errors.push(`${where}: ${what} uses unknown effect "${op}"`);
				for (const c of setup.effects.conds(opts.effects ?? [])) badConds(c, what);
				// Skill and stat checks must name a real skill or stat.
				const checksIn = (list) => setup.util.toArray(list).flatMap((it) => (it && typeof it === "object" ? [it.check, ...Object.values(it).flatMap((v) => (v && typeof v === "object" ? checksIn(Array.isArray(v) ? v : [v]) : []))] : [])).filter(Boolean);
				for (const c of checksIn(opts.effects ?? [])) {
					if ((c.resolver === "skill" || c.resolver === "stat") && !setup.registry.has(c.resolver, c[c.resolver])) errors.push(`${where}: ${what} checks unknown ${c.resolver} "${c[c.resolver]}"`);
				}
				npc(opts.npc, what);
			}
			else {
				if (args.length > 1) errors.push(`${where}: ${what} takes one person's id`);
				npc(args[0], what);
			}
		}
	}
	return errors;
}

/** What gives the player a way on from a story screen. */
const WAY_ON = [/<<view\s+["']event-end["']\s*>>/, /<<choice\b/, /<<button\b/, /<<link\b/, /\[\[/, /<<goto\b/];

/**
 * Every event passage (a storylet's, or one a <<choice>> leads to) needs a
 * way on: <<view "event-end">> (Continue), a <<choice>>, a button or a link.
 * Otherwise the player is stuck on that screen with nothing to tap.
 * @param {{ name: string, text: string, file: string }[]} passages
 * @param {object} setup  A booted engine.
 * @returns {string[]}
 */
export function checkWaysOn(passages, setup) {
	const errors = [];
	const byName = new Map(passages.map((p) => [p.name, p]));
	const needWay = new Set(setup.registry.all("storylet").map((s) => s.passage));
	for (const p of passages) {
		for (const m of p.text.matchAll(/<<choice\s+(?:"[^"]*"|'[^']*')\s+["']([^"']+)["']/g)) needWay.add(m[1]);
	}
	for (const name of needWay) {
		const p = byName.get(name);
		if (p && !WAY_ON.some((re) => re.test(p.text))) {
			errors.push(`${p.file}: passage "${name}" has no way on: end it with <<view "event-end">> (a Continue button) or add a <<choice>>`);
		}
	}
	return errors;
}
