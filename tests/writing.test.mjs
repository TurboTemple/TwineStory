// The story-writing tools (src/modules/writing): the data reader, <<when>>,
// <<choice>>, names and pronouns, the checker for story macros, and the
// storyline template in templates/.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { SRC, bootTown, plain } from "./helpers.mjs";
import { checkStoryMacros } from "../scripts/lib/rules.mjs";
import { parseTwee } from "../scripts/lib/twee.mjs";
import { listFiles } from "../scripts/lib/load.mjs";

const ROOT = path.resolve(SRC, "..");
const passagesIn = (dir) => listFiles(dir, ".twee").flatMap((f) => parseTwee(fs.readFileSync(f, "utf8"), f));

test("parseData reads content-style data without running code", () => {
	const { setup } = bootTown();
	const p = setup.util.parseData;
	assert.deepEqual(plain(p(`"Help her" 'Ev_x' { effects: [{ stat: { mood: 5, stress: -2.5 } }], hidden: true, npc: null }`)),
		["Help her", "Ev_x", { effects: [{ stat: { mood: 5, stress: -2.5 } }], hidden: true, npc: null }]);
	assert.deepEqual(plain(p(`"it's \\"quoted\\""`)), [`it's "quoted"`]);
	assert.throws(() => p(`{ stat: mood }`), /text needs quotes/);
	assert.throws(() => p(`{ a: 1`), /Missing }/);
	assert.throws(() => p(`"open`), /Unclosed quote/);
	assert.throws(() => p(`alert(1)`), /Unexpected "alert"/);
});

test("<<when>> picks the first true part; <<otherwise>> catches the rest", () => {
	const { setup } = bootTown();
	setup.stats.set("mood", 70);
	const W = setup.writing;
	assert.equal(W.pick([{ stat: { id: "mood", min: 60 } }, null]), 0);
	setup.stats.set("mood", 20);
	assert.equal(W.pick([{ stat: { id: "mood", min: 60 } }, null]), 1);
	assert.equal(W.pick([{ stat: { id: "mood", min: 60 } }]), -1, "nothing shows");
});

test("<<choice>>: locked with reasons, effects run, then the passage", () => {
	const { setup, played } = bootTown();
	const W = setup.writing;
	const opts = { conditions: { stat: { id: "beauty", min: 40 } }, effects: [{ stat: { mood: 4 } }] };
	setup.stats.set("hygiene", 0); // Beauty 10
	const locked = W.check(opts);
	assert.equal(locked.ok, false);
	assert.match(locked.reasons.join(" "), /Beauty/);
	setup.stats.set("hygiene", 100);
	setup.status.add("made_up"); // Beauty 50
	assert.ok(W.check(opts).ok);
	setup.stats.set("mood", 50);
	const mood = setup.stats.get("mood");
	W.choose("Ev_grind_barista_rude_charm", opts);
	assert.equal(setup.stats.get("mood"), mood + 4);
	assert.equal(played.at(-1), "Ev_grind_barista_rude_charm");
	assert.match(plain(W.lastChoice.changes).map((c) => c.text).join(" "), /Mood \+4/);
	// No passage: carry on (back to Here).
	W.choose(null, { effects: [] });
	assert.equal(played.at(-1), "Here");
});

test("a choice keeps events that are still waiting their turn", () => {
	const { setup, played } = bootTown();
	setup.flow.perform(() => {
		setup.flow.request("Ev_grind_promotion", setup.flow.PRIORITY.event);
		setup.flow.request("Ev_grind_supervisor", setup.flow.PRIORITY.event);
	});
	assert.equal(played.at(-1), "Ev_grind_promotion");
	setup.writing.choose(null, {});
	assert.equal(played.at(-1), "Ev_grind_supervisor", "the waiting event comes next");
});

test("choices about a person use the person from the event or conversation", () => {
	const { setup } = bootTown();
	setup.vars().scene.npc = "jess_marlow";
	const before = setup.rel.get("jess_marlow", "friendship");
	setup.writing.choose(null, { effects: [{ rel: { friendship: 2 } }] });
	assert.ok(setup.rel.get("jess_marlow", "friendship") > before);
});

test("names and pronouns for people and the player", () => {
	const { setup } = bootTown();
	const W = setup.writing;
	assert.equal(W.name("jess_marlow"), setup.npcs.get("jess_marlow").name);
	assert.equal(W.name("jess_marlow", true), setup.npcs.get("jess_marlow").name.split(" ")[0]);
	setup.vars().pc.name = "Alex";
	setup.vars().pc.pronouns = "she/her";
	assert.equal(W.name(), "Alex");
	assert.equal(W.pronoun("their"), "her");
	assert.equal(W.pronoun("they", "jess_marlow"), setup.text.pronouns(setup.npcs.get("jess_marlow").pronouns).they);
});

test("the checker catches mistakes in story macros", () => {
	const { setup } = bootTown();
	const has = (n) => n === "Ev_real";
	const errs = checkStoryMacros([{ name: "Ev_test", file: "test.twee", text: [
		`<<when { stta: 1 }>>x<</when>>`,
		`<<choice "Go" "Ev_missing">>`,
		`<<choice "Go" "Ev_real" { effects: [{ sttat: 1 }], conditon: true }>>`,
		`<<choice "Go" { npc: "nobody" }>>`,
		`<<choice Go>>`,
		`<<they "nobody">>`,
		`<<choice "Fine" "Ev_real" { effects: [{ stat: { mood: 1 } }], conditions: { stat: { id: "mood", min: 1 } } }>>`,
	].join("\n") }], setup, has);
	const all = errs.join("\n");
	assert.match(all, /unknown condition "stta"/);
	assert.match(all, /missing passage "Ev_missing"/);
	assert.match(all, /unknown effect "sttat"/);
	assert.match(all, /unknown option "conditon"/);
	assert.match(all, /unknown person "nobody"/);
	assert.match(all, /Unexpected "Go"/);
	assert.equal(errs.length, 7, all);
});

test("the storyline template is valid and plays through", () => {
	const extra = listFiles(path.join(ROOT, "templates"), ".js");
	const passages = [...passagesIn(SRC), ...passagesIn(path.join(ROOT, "templates"))];
	const names = new Set(passages.map((p) => p.name));
	const { setup } = bootTown({ extra, passages: names });
	assert.deepEqual(plain(setup.validate({ hasPassage: (n) => names.has(n) })), []);
	assert.deepEqual(checkStoryMacros(passages, setup, (n) => names.has(n)), []);

	// Meet her on the High Street and say yes.
	setup.world.moveTo("high_street");
	assert.equal(setup.events.seen("my_story_meet"), 1);
	setup.writing.choose("Ev_my_story_yes", { effects: [{ storyline: { id: "my_story", to: "helping" } }] });
	assert.equal(setup.storylines.stage("my_story"), "helping");
	// Help out until the next stage.
	for (let i = 0; i < 20 && setup.storylines.stage("my_story") === "helping"; i++) {
		setup.stats.set("energy", 100);
		setup.actions.do("my_story_help");
	}
	assert.equal(setup.storylines.stage("my_story"), "done");
	assert.equal(setup.events.seen("my_story_done"), 1);
	assert.ok(setup.actions.available().some((a) => a.def.id === "my_story_reward" && a.ok), "the reward unlocks");
});

test("a Talk option can open a scene, and its choices know who it's with", () => {
	const { setup, played } = bootTown({
		before(s) {
			(s.__testContent ??= []).push((R) => {
				R.define("interaction", { id: "t_scene", label: "Ask about her day off", npcs: ["jess_marlow"], effects: [{ goto: "Ev_t_scene" }] });
			});
		},
		includeTest: true,
	});
	setup.time.advance(setup.time.at(4, "08:00") - setup.time.now()); // Jess is at the counter
	setup.world.moveTo("grind_counter");
	setup.flow.perform(() => setup.rel.interact("jess_marlow", "t_scene"));
	assert.equal(played.at(-1), "Ev_t_scene");
	assert.equal(setup.vars().scene.npc, "jess_marlow");
});

test("skill and stat checks: odds from config, threshold mode, labels and branches", () => {
	const { setup, played } = bootTown();
	const C = setup.checks;
	setup.skills.set("barista", 25);
	assert.equal(C.chance({ resolver: "skill", skill: "barista", difficulty: 25 }), 0.5, "at the difficulty: 50%");
	assert.ok(Math.abs(C.chance({ resolver: "skill", skill: "barista", difficulty: 15 }) - 0.8) < 1e-9, "10 above: +30%");
	assert.equal(C.chance({ resolver: "skill", skill: "barista", difficulty: 90 }), 0.05, "never below 5%");
	assert.equal(C.chance({ resolver: "skill", skill: "barista", difficulty: 25, mode: "threshold" }), 1);
	assert.equal(C.chance({ resolver: "skill", skill: "barista", difficulty: 26, mode: "threshold" }), 0);

	// Over many rolls at 50% both branches happen; labels say how it went.
	const seen = new Set();
	for (let i = 0; i < 40; i++) {
		const r = setup.effects.apply([{ check: { resolver: "skill", skill: "barista", difficulty: 25, label: "Latte art", then: [{ flag: "won" }], else: [{ flag: "lost" }] } }]);
		seen.add(plain(r.changes)[0].text);
	}
	assert.deepEqual([...seen].sort(), ["Latte art: failed", "Latte art: success"]);

	// A choice can branch to different passages through a check.
	setup.writing.choose(null, { effects: [{ check: { resolver: "stat", stat: "hygiene", difficulty: 0, mode: "threshold", then: [{ goto: "Ev_grind_barista_rude_pro" }], else: [{ goto: "Ev_grind_barista_rude_fumble" }] } }] });
	assert.equal(played.at(-1), "Ev_grind_barista_rude_pro");
});

test("the checker catches checks on unknown skills", () => {
	const { setup } = bootTown();
	const errs = checkStoryMacros([{ name: "Ev_t", file: "t.twee", text: `<<choice "Try" { effects: [{ check: { resolver: "skill", skill: "juggling", difficulty: 10, then: [], else: [] } }] }>>` }], setup, () => true);
	assert.match(errs.join(" "), /unknown skill "juggling"/);
});
