// The event rules: story vs random, chance, weight, cooldowns, limits.
import assert from "node:assert/strict";
import { test } from "node:test";
import { boot, plain } from "./helpers.mjs";

/**
 * Boot with extra storylets added as test content (and the passages they need).
 * Fires on a made-up "test:poke" trigger.
 */
function withStorylets(defs, opts = {}) {
	return boot({
		...opts,
		before(setup) {
			(setup.__testContent ??= []).push((R) => {
				for (const d of defs) R.define("storylet", { passage: "Here", triggers: ["test:poke"], ...d });
			});
		},
		includeTest: true,
	});
}

const pokes = (setup, n, mins = 0) => Array.from({ length: n }, () => {
	const fired = setup.events.handle("test:poke", {});
	if (mins) setup.time.advance(mins);
	return fired?.id ?? null;
});

test("random storylets without a chance never fire; with the 'none' selector nothing random fires", () => {
	const { setup } = withStorylets([{ id: "r_nochance" }, { id: "r_sure", chance: 1 }]);
	assert.deepEqual(pokes(setup, 1), ["r_sure"]);
	setup.config.events.selector = "none";
	setup.config.events.minGapMins = 0;
	assert.deepEqual(pokes(setup, 3), [null, null, null]);
});

test("story storylets fire whenever eligible and beat random ones", () => {
	const { setup } = withStorylets([
		{ id: "r_sure", chance: 1, priority: 99 },
		{ id: "s_low", kind: "story", priority: 1 },
		{ id: "s_high", kind: "story", priority: 5, once: true },
	]);
	assert.deepEqual(pokes(setup, 3), ["s_high", "s_low", "s_low"]);
});

test("game-wide limits: minimum gap and daily maximum for random events", () => {
	const { setup } = withStorylets([{ id: "r_sure", chance: 1 }]);
	// Default rules: 60 minutes apart, 4 a day.
	// Fires at 07:00 and 08:00; 07:30 and 08:30 are too soon after.
	assert.deepEqual(pokes(setup, 4, 30), ["r_sure", null, "r_sure", null]);
	// 09:00 and 10:00 make four today; after that the daily limit blocks it.
	assert.deepEqual(pokes(setup, 4, 60), ["r_sure", "r_sure", null, null], "4 per day");
	setup.time.advance(setup.time.nextAt(setup.time.now(), "00:00") - setup.time.now() + 1);
	assert.deepEqual(pokes(setup, 1), ["r_sure"], "new day resets the count");
});

test("per-storylet cooldown, group cooldown and maxPerDay", () => {
	const { setup } = withStorylets([
		{ id: "a", kind: "story", cooldown: 120, group: "g", priority: 2 },
		{ id: "b", kind: "story", cooldown: 120, group: "g", priority: 1 },
		{ id: "c", kind: "story", maxPerDay: 2 },
	]);
	// a fires; then the group "g" cools down for 120 minutes, so c fires instead.
	assert.deepEqual(pokes(setup, 5, 30), ["a", "c", "c", null, "a"]);
	assert.equal(setup.events.blockedBy(setup.registry.get("storylet", "c")), "daily limit");
});

test("weight decides between storylets that both succeed their chance", () => {
	const { setup } = withStorylets([{ id: "heavy", chance: 1, weight: 9 }, { id: "light", chance: 1, weight: 1 }], { seed: 3 });
	setup.config.events.minGapMins = 0;
	setup.config.events.maxRandomPerDay = null;
	const out = pokes(setup, 200);
	const heavy = out.filter((x) => x === "heavy").length;
	assert.ok(heavy > 150 && heavy < 195, `heavy fired ${heavy}/200`);
});

test("force overrides chance and limits; suppression blocks it", () => {
	const { setup } = withStorylets([{ id: "never", chance: 0 }]);
	assert.deepEqual(pokes(setup, 1), [null]);
	setup.events.force("never", true);
	assert.deepEqual(pokes(setup, 2), ["never", "never"]);
	setup.events.force("never", false);
	assert.deepEqual(pokes(setup, 1), [null]);
});

test("old saves gain the new event bookkeeping (migration 1 → 2)", () => {
	const { setup } = boot();
	const old = { meta: { schemaVersion: 1, schema: { core: 1, events: 1 } }, time: { t: 0 }, sched: { jobs: [], seq: 0 }, story: { seen: { x: 2 } } };
	setup.save.migrate(old);
	assert.deepEqual(plain(old.story), { seen: { x: 2 }, lastAt: {}, lastRandomAt: null, today: { day: 0, random: 0, counts: {} } });
	assert.equal(old.meta.schema.events, 2);
});
