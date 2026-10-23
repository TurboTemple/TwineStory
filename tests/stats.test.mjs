// Stats and active effects: drift, modifiers, stacking, stat-driven effects.
import assert from "node:assert/strict";
import { test } from "node:test";
import { boot, plain } from "./helpers.mjs";

/** A game with a few fixture stats and statuses. */
function game(extra) {
	return boot({
		before(setup) {
			(setup.__testContent ??= []).push((R) => {
				R.define("stat", { id: "t_energy", label: "Energy", start: 50, perHour: -10 });
				R.define("stat", { id: "t_mood", label: "Mood", start: 50, change: "toward", target: 50, perHour: 5 });
				R.define("stat", { id: "t_bladder", label: "Bladder", start: 0, perHour: 10, good: "low" });
				R.define("statusEffect", { id: "t_buzz", label: "Buzz", mins: 60, modifiers: [{ stat: "t_energy", op: "add", value: 20 }] });
				R.define("statusEffect", {
					id: "t_tipsy", label: "Tipsy", mins: 30, stacking: "stack", maxStacks: 3, expire: "one",
					stackLabels: ["Tipsy", "Merry", "Drunk"], modifiers: [{ stat: "t_mood", op: "add", value: 5 }],
				});
				R.define("statusEffect", { id: "t_asleep", label: "Asleep", modifiers: [{ stat: "t_energy", op: "rateAdd", value: 30 }, { stat: "t_bladder", op: "rateMul", value: 0.5 }] });
				R.define("statusEffect", { id: "t_relax", label: "Relaxing", modifiers: [{ stat: "t_mood", op: "rateAdd", value: 10 }] });
				R.define("statusEffect", { id: "t_needs", label: "Needs the toilet", while: { stat: "t_bladder", min: 70 }, modifiers: [{ stat: "t_mood", op: "add", value: -10 }] });
				extra?.(R);
			});
		},
		includeTest: true,
	});
}

test("stats drift over time and clamp to their range", () => {
	const { setup } = game();
	setup.time.advance(120);
	assert.equal(setup.stats.get("t_energy"), 30);
	assert.equal(setup.stats.get("t_bladder"), 20);
	setup.time.advance(10 * 60);
	assert.equal(setup.stats.get("t_energy"), 0);
	assert.equal(setup.stats.get("t_bladder"), 100);
});

test("'toward' stats are pulled back to their target; rate modifiers push them", () => {
	const { setup } = game();
	setup.stats.set("t_mood", 80);
	setup.time.advance(120);
	assert.equal(setup.stats.base("t_mood"), 70);
	setup.status.add("t_relax");
	setup.time.advance(60); // pulled down 5, pushed up 10
	assert.equal(setup.stats.base("t_mood"), 75);
});

test("modifiers change the effective value but not the saved base", () => {
	const { setup, vars } = game();
	setup.status.add("t_buzz");
	assert.equal(setup.stats.get("t_energy"), 70);
	assert.equal(vars.stats.base.t_energy, 50);
	setup.time.advance(60); // buzz expires at the end of the hour; energy drifted to 40
	assert.equal(setup.status.has("t_buzz"), false);
	assert.equal(setup.stats.get("t_energy"), 40);
});

test("stacking statuses: labels, scaled modifiers, losing one stack at a time", () => {
	const { setup } = game();
	for (let i = 0; i < 4; i++) setup.status.add("t_tipsy");
	assert.equal(setup.status.stacks("t_tipsy"), 3, "capped at maxStacks");
	assert.equal(setup.status.label("t_tipsy"), "Drunk");
	assert.equal(setup.stats.get("t_mood"), 65);
	setup.time.advance(30);
	assert.equal(setup.status.stacks("t_tipsy"), 2);
	setup.time.advance(60);
	assert.equal(setup.status.has("t_tipsy"), false);
});

test("rate modifiers (sleep) and stat-driven statuses", () => {
	const { setup } = game();
	setup.status.add("t_asleep");
	setup.time.advance(60);
	assert.equal(setup.stats.get("t_energy"), 70, "-10 + 30 per hour");
	assert.equal(setup.stats.get("t_bladder"), 5, "half rate while asleep");
	setup.status.remove("t_asleep");
	setup.stats.set("t_bladder", 75);
	assert.equal(setup.status.has("t_needs"), true);
	assert.equal(setup.stats.get("t_mood"), 40);
	setup.effects.apply([{ statSet: { t_bladder: 0 } }]);
	assert.equal(setup.status.has("t_needs"), false);
});

test("stat condition and effects, with readable changes", () => {
	const { setup } = game();
	assert.equal(setup.cond.test({ stat: { id: "t_energy", min: 40 } }), true);
	assert.equal(setup.cond.test({ stat: { id: "t_energy", max: 40 } }), false);
	assert.deepEqual(plain(setup.cond.explain({ stat: { id: "t_energy", min: 80 } })), [{ ok: false, text: "Energy at least 80" }]);
	const r = setup.effects.apply([{ stat: { t_energy: 15, t_mood: -5 } }, { status: "t_buzz" }]);
	assert.deepEqual(plain(r.changes.map((c) => c.text)), ["Energy +15", "Mood -5", "Now: Buzz"]);
	assert.equal(setup.cond.test({ status: "t_buzz" }), true);
});
