// The debug Tuning page: every number in one place, with the file to edit.
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { contentSources } from "../scripts/lib/load.mjs";
import { SRC, bootTown } from "./helpers.mjs";

const ROOT = path.resolve(SRC, "..");

/** The page as { "Section": { "Row name": { file, lines } } }. */
function page(setup) {
	const out = {};
	for (const s of setup.tuning.sections()) out[s.title] = Object.fromEntries(s.rows.map((r) => [r.name, r]));
	return out;
}

test("the tuning page lists pay, fares, stat rates, chances and game-wide settings", () => {
	const { setup } = bootTown();
	setup.__sources = contentSources(SRC, ROOT);
	const p = page(setup);

	const job = p.Jobs["Barista at The Daily Grind"];
	assert.ok(job.lines.includes("Shift: 2 hours"));
	assert.ok(job.lines.includes("Pay as Barista: £11 an hour (£22 a shift)"));
	assert.equal(job.file, "src/content/mooresville/town-work.js");

	assert.ok(p.Travel.Taxi.lines.includes("£3 to start, plus £0.50 a minute (rounded to whole pounds)"));
	assert.ok(p.Stats.Energy.lines.includes("Changes by −4 an hour"));
	assert.ok(p.Events.cosplay_invite_john.lines.includes("Chance: 10% each time"));
	assert.ok(p["Items and prices"]["Makeup kit"].lines.includes("Lasts 10 uses"));
	assert.ok(p["Bills and income"]["Pocket money from Mum and Dad"].lines[0].startsWith("Income: £20 every week"));
	assert.ok(p["Storyline gates"]["The Daily Grind"].lines.some((l) => l.startsWith("Trainee barista → Barista when")));

	const checks = p["Game-wide settings"]["Skill and stat checks"];
	assert.equal(checks.file, "src/01-engine/config.js");
	assert.ok(checks.lines.includes("Odds: 50% at the difficulty, +3% for each point above it"));
	assert.ok(p["Game-wide settings"]["Random events"].lines.includes("At most 4 a day"));
});

test("every piece of content is traced to the file that defines it", () => {
	const { setup } = bootTown();
	const keys = new Set(Object.values(contentSources(SRC, ROOT)).flat());
	const R = setup.registry;
	// `worn` is a storage place the clothing module itself defines.
	const missing = Object.keys(R.counts()).flatMap((t) => R.all(t).map((d) => `${t}:${d.id}`)).filter((k) => !keys.has(k) && k !== "storage:worn");
	assert.deepEqual(missing, []);
});

test("without the build's file list the page still works (no 'Edit in')", () => {
	const { setup } = bootTown();
	delete setup.__sources;
	const p = page(setup);
	assert.equal(p.Jobs["Barista at The Daily Grind"].file, null);
	assert.ok(p.Jobs["Barista at The Daily Grind"].lines.length > 3);
	assert.equal(p["Game-wide settings"]["Random events"].file, "src/01-engine/config.js");
});

test("every effect in the game says what it does in plain English", () => {
	const { setup } = bootTown();
	const bare = new Set();
	const walk = (list) => {
		for (const it of setup.util.toArray(list)) {
			if (!it || typeof it !== "object") continue;
			for (const [name, spec] of Object.entries(it)) {
				if (setup.effects.describe([{ [name]: spec }])[0] === name) bare.add(name);
				if (name === "if" || name === "check") [spec.then, spec.else].forEach(walk);
				if (name === "random") (Array.isArray(spec) ? spec : spec.branches).forEach((b) => walk(b.then));
			}
		}
	};
	for (const { def } of setup.registry.entries()) {
		for (const k of ["effects", "costs", "perHour", "always", "onExpire", "onPaid", "onMissed", "gained", "lost"]) walk(def[k]);
		walk(def.use?.effects);
		walk(def.needs?.missed);
		walk(def.needs?.done);
		for (const st of def.stages ?? []) walk(st.onEnter);
	}
	assert.deepEqual([...bare], []);
});
