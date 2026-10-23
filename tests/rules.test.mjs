import assert from "node:assert/strict";
import { test } from "node:test";
import { checkDefs, checkLinks, checkPassages, checkSources, guaranteesAdult, IFID } from "../scripts/lib/rules.mjs";
import { findPassageRefs } from "../scripts/lib/twee.mjs";

const p = (name, text = "", tags = []) => ({ name, text, tags, file: "t.twee", line: 1 });
const storyData = (over = {}) =>
	p("StoryData", JSON.stringify({ ifid: IFID, format: "SugarCube", "format-version": "2.37.3", start: "Start", ...over }));
const base = () => [storyData(), p("StoryTitle", "T"), p("Start")];

test("a minimal valid story passes", () => {
	assert.deepEqual(checkPassages(base()), []);
});

test("duplicate passages, wrong IFID, wrong version and missing start fail", () => {
	assert.match(checkPassages([...base(), p("Start")]).join(), /Duplicate passage "Start"/);
	assert.match(checkPassages([storyData({ ifid: "X" }), p("StoryTitle"), p("Start")]).join(), /ifid changed/);
	assert.match(checkPassages([storyData({ "format-version": "2.36.1" }), p("StoryTitle"), p("Start")]).join(), /format-version/);
	assert.match(checkPassages([storyData({ start: "Nope" }), p("StoryTitle")]).join(), /Start passage "Nope"/);
});

test("widgets must live in widget-tagged passages", () => {
	assert.match(checkPassages([...base(), p("W", "<<widget \"x\">><</widget>>")]).join(), /outside a widget-tagged/);
	assert.deepEqual(checkPassages([...base(), p("W", "<<widget \"x\">><</widget>>", ["widget"])]), []);
});

test("links to missing passages fail", () => {
	const errs = checkLinks([p("A", "[[B]] [[Go|C]]"), p("B")], findPassageRefs);
	assert.equal(errs.length, 1);
	assert.match(errs[0], /missing passage "C"/);
});

test("banned APIs are caught, but not inside JS comments", () => {
	const errs = checkSources([
		{ file: "a.js", text: "const x = Math.random();" },
		{ file: "b.js", text: "// never use Math.random() here\n/* Dialog.setup */" },
		{ file: "c.js", text: "Engine.play('X');" },
		{ file: "src/01-engine/sc-adapter.js", text: "Engine.play(name);" },
		{ file: "d.twee", text: "<<print $args[0]>>" },
		{ file: "e.js", text: "const u = 'https://example.com';" },
	]);
	assert.equal(errs.length, 3);
	assert.match(errs.join("\n"), /a\.js: uses Math\.random/);
	assert.match(errs.join("\n"), /c\.js: calls Engine\.play/);
	assert.match(errs.join("\n"), /d\.twee: uses deprecated \$args/);
});

test("ids must be valid and unique per type", () => {
	assert.match(checkDefs([{ type: "item", def: { id: "Bad-Id" } }]).join(), /id must match/);
	assert.match(checkDefs([{ type: "item", def: { id: "a" } }, { type: "item", def: { id: "a" } }]).join(), /duplicate id/);
	assert.deepEqual(checkDefs([{ type: "item", def: { id: "a" } }, { type: "shop", def: { id: "a" } }]), []);
});

test("NPC age rules (§1)", () => {
	assert.match(checkDefs([{ type: "npc", def: { id: "n" } }]).join(), /explicit integer age/);
	assert.match(checkDefs([{ type: "npc", def: { id: "n", age: 19, role: "classmate" } }]).join(), /exactly 18/);
	assert.match(checkDefs([{ type: "npc", def: { id: "n", age: 17, tags: ["student"] } }]).join(), /exactly 18/);
	assert.deepEqual(checkDefs([{ type: "npc", def: { id: "n", age: 18, role: "student" } }]), []);
	assert.deepEqual(checkDefs([{ type: "npc", def: { id: "n", age: 45, role: "teacher" } }]), []);
});

test("romance content needs a guaranteed 18+ condition", () => {
	const def = (conditions) => [{ type: "interaction", def: { id: "x", tags: ["romance"], conditions } }];
	assert.match(checkDefs(def(undefined)).join(), /ageAtLeast/);
	assert.match(checkDefs(def({ any: [{ ageAtLeast: 18 }, { flag: "f" }] })).join(), /ageAtLeast/);
	assert.match(checkDefs(def({ ageAtLeast: 16 })).join(), /ageAtLeast/);
	assert.deepEqual(checkDefs(def({ all: [{ flag: "f" }, { ageAtLeast: 18 }] })), []);
	assert.deepEqual(checkDefs(def([{ ageAtLeast: { age: 21 } }])), []);
});

test("guaranteesAdult only trusts conditions that always apply", () => {
	assert.equal(guaranteesAdult({ not: { ageAtLeast: 18 } }), false);
	assert.equal(guaranteesAdult({ any: [{ ageAtLeast: 18 }, { ageAtLeast: 20 }] }), true);
	assert.equal(guaranteesAdult({ any: [] }), false);
	assert.equal(guaranteesAdult(true), false);
});
