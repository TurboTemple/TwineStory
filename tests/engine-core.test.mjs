import assert from "node:assert/strict";
import { test } from "node:test";
import { boot, plain } from "./helpers.mjs";

/* ---- time ------------------------------------------------------------- */

test("time helpers: day, hour, weekday, date, parseHM", () => {
	const { setup } = boot();
	const T = setup.time;
	assert.equal(T.parseHM("07:30"), 450);
	assert.throws(() => T.parseHM("7.30"));
	assert.equal(T.day(1439), 0);
	assert.equal(T.day(1440), 1);
	assert.equal(T.minuteOfDay(1440 + 75), 75);
	assert.equal(T.hour(1440 + 75), 1);
	// Epoch 2026-09-01 is a Tuesday.
	assert.equal(T.weekday(0), 2);
	assert.equal(T.weekday(6 * 1440), 1);
	assert.deepEqual(plain(T.date(30 * 1440)), { year: 2026, month: 10, day: 1, weekday: 4 });
});

test("isBetween handles normal and overnight ranges", () => {
	const { setup } = boot();
	const T = setup.time;
	assert.equal(T.isBetween(T.parseHM("09:00"), "09:00", "17:00"), true);
	assert.equal(T.isBetween(T.parseHM("17:00"), "09:00", "17:00"), false);
	assert.equal(T.isBetween(T.parseHM("23:30"), "22:00", "06:00"), true);
	assert.equal(T.isBetween(T.parseHM("05:59"), "22:00", "06:00"), true);
	assert.equal(T.isBetween(T.parseHM("12:00"), "22:00", "06:00"), false);
});

test("nextAt finds the next matching clock time", () => {
	const { setup } = boot();
	const T = setup.time;
	assert.equal(T.nextAt(T.parseHM("07:00"), "10:00"), T.parseHM("10:00"));
	assert.equal(T.nextAt(T.parseHM("11:00"), "10:00"), 1440 + T.parseHM("10:00"));
	assert.equal(T.nextAt(T.parseHM("10:00"), "10:00"), T.parseHM("10:00"));
});

test("advance splits at hour and day boundaries and emits in order", () => {
	const { setup, vars } = boot();
	const log = [];
	setup.bus.on("time:advanced", (p) => log.push(`adv ${p.from}-${p.to}`));
	setup.bus.on("time:hour", (p) => log.push(`hour ${p.hour}`));
	setup.bus.on("time:day", (p) => log.push(`day ${p.day}`));
	vars.time.t = 23 * 60 + 30;
	const r = setup.time.advance(90);
	assert.deepEqual(plain(r), { from: 1410, to: 1500, elapsed: 90, interrupted: null });
	assert.deepEqual(log, ["adv 1410-1440", "hour 0", "day 1", "adv 1440-1500", "hour 1"]);
});

test("time:week fires at the start of Monday", () => {
	const { setup, vars } = boot();
	const weeks = [];
	setup.bus.on("time:week", (p) => weeks.push(p.day));
	vars.time.t = 5 * 1440;
	setup.time.advance(2 * 1440);
	assert.deepEqual(weeks, [6]);
});

test("advance can be interrupted, but not when uninterruptible", () => {
	const { setup } = boot();
	const start = setup.time.now();
	const stop = () => setup.time.interrupt("test", { x: 1 });
	setup.bus.on("time:hour", stop);
	const r = setup.time.advance(180);
	assert.equal(r.elapsed, 60);
	assert.deepEqual(plain(r.interrupted), { reason: "test", data: { x: 1 } });
	assert.equal(setup.time.now(), start + 60);
	const r2 = setup.time.advance(120, { interruptible: false });
	assert.equal(r2.elapsed, 120);
	assert.equal(r2.interrupted, null);
});

test("advance rejects bad input and re-entry", () => {
	const { setup } = boot();
	assert.throws(() => setup.time.advance(1.5));
	assert.throws(() => setup.time.advance(-1));
	let inner = null;
	setup.bus.on("time:hour", () => {
		try {
			setup.time.advance(1);
		}
		catch (err) {
			inner = err.message;
		}
	}, { once: true });
	setup.time.advance(60);
	assert.match(inner, /already advancing/);
});

/* ---- scheduler -------------------------------------------------------- */

test("scheduler runs due jobs at their exact time, in order, and repeats", () => {
	const { setup, vars } = boot();
	const ran = [];
	setup.sched.handle("ping", (data) => ran.push(`${data}@${setup.time.now()}`));
	const t0 = setup.time.now();
	setup.sched.add({ type: "ping", at: t0 + 25, data: "b" });
	setup.sched.add({ type: "ping", at: t0 + 10, data: "a" });
	setup.sched.add({ id: "rep", type: "ping", at: t0 + 30, data: "r", repeat: 30 });
	setup.time.advance(70);
	assert.deepEqual(ran, [`a@${t0 + 10}`, `b@${t0 + 25}`, `r@${t0 + 30}`, `r@${t0 + 60}`]);
	assert.deepEqual(plain(vars.sched.jobs.map((j) => [j.id, j.at])), [["rep", t0 + 90]]);
	assert.equal(setup.sched.cancel("rep"), true);
	setup.sched.add({ type: "ping", at: t0 + 500, data: "x" });
	setup.sched.add({ type: "ping", at: t0 + 600, data: "y" });
	assert.equal(setup.sched.cancelWhere((j) => j.data === "x"), 1);
	assert.equal(setup.sched.due(t0 + 600).length, 1);
});

/* ---- conditions ------------------------------------------------------- */

test("conditions: combinators, leaves and explain", () => {
	const { setup, vars } = boot();
	const C = setup.cond;
	vars.meta.flags.door = true;
	vars.meta.counters.visits = 3;
	assert.equal(C.test(undefined), true);
	assert.equal(C.test(false), false);
	assert.equal(C.test({ flag: "door" }), true);
	assert.equal(C.test({ flag: "window" }), false);
	assert.equal(C.test({ flag: { name: "door", is: true } }), true);
	assert.equal(C.test({ counter: { name: "visits", min: 3, max: 5 } }), true);
	assert.equal(C.test({ counter: { name: "visits", min: 4 } }), false);
	assert.equal(C.test({ all: [{ flag: "door" }, { counter: { name: "visits", min: 1 } }] }), true);
	assert.equal(C.test({ any: [{ flag: "window" }, { flag: "door" }] }), true);
	assert.equal(C.test({ not: { flag: "door" } }), false);
	assert.equal(C.test([{ flag: "door" }, { flag: "window" }]), false);
	assert.equal(C.test({ time: { from: "06:00", to: "08:00" } }), true);
	assert.equal(C.test({ weekday: [2] }), true);
	assert.throws(() => C.test({ nope: 1 }), /Unknown condition/);

	const ex = C.explain({ flag: "door", counter: { name: "visits", min: 9 } });
	assert.deepEqual(plain(ex.map((e) => e.ok)), [true, false]);
	assert.match(ex[1].text, /visits/);
	assert.deepEqual(plain(C.ops({ all: [{ flag: "a" }, { not: { counter: {} } }], any: [{ time: {} }] }).sort()), ["counter", "flag", "time"]);
});

/* ---- effects ---------------------------------------------------------- */

test("effects: flag, counter, toast, note, goto, if and queued time", () => {
	const { setup, vars } = boot();
	const t0 = setup.time.now();
	const r = setup.effects.apply([
		{ flag: "met" },
		{ counter: { name: "n", add: 2 } },
		{ counter: { name: "n", add: 1 } },
		{ time: 30 },
		{ if: { cond: { flag: "met" }, then: [{ toast: "yes" }], else: [{ toast: "no" }] } },
		{ note: "noted" },
		{ time: 15 },
		{ goto: "Somewhere" },
	]);
	assert.equal(vars.meta.flags.met, true);
	assert.equal(vars.meta.counters.n, 3);
	assert.deepEqual(plain(r.toasts), ["yes"]);
	assert.deepEqual(plain(r.changes), [{ kind: "note", text: "noted" }]);
	assert.equal(r.goto, "Somewhere");
	assert.equal(r.mins, 45);
	assert.equal(setup.time.now(), t0 + 45, "time advanced once at the end");
	assert.equal(setup.flow.pending().passage, "Somewhere");
	setup.effects.apply([{ flag: { name: "met", value: null } }]);
	assert.equal("met" in vars.meta.flags, false);
});

test("effects: interrupt stops the rest of the list and calls ctx.interrupt", () => {
	const { setup } = boot();
	let called = null;
	const r = setup.effects.apply([{ toast: "a" }, { interrupt: "why" }, { toast: "b" }], { interrupt: (x) => (called = x) });
	assert.deepEqual(plain(r.toasts), ["a"]);
	assert.equal(r.interrupted, "why");
	assert.equal(called, "why");
});

test("effects: random picks weighted branches deterministically", () => {
	const run = () => {
		const { setup } = boot({ seed: 7 });
		return Array.from({ length: 20 }, () => setup.effects.apply([{ random: [{ weight: 1, then: [{ toast: "a" }] }, { weight: 3, then: [{ toast: "b" }] }, { weight: 0, then: [{ toast: "never" }] }] }]).toasts[0]);
	};
	const a = run();
	assert.deepEqual(a, run());
	assert.ok(!a.includes("never"));
	assert.ok(a.includes("a") && a.includes("b"));
});

test("effects: check calls a registered resolver (the engine ships none)", () => {
	const { setup } = boot();
	assert.throws(() => setup.effects.apply([{ check: { resolver: "_test_always", then: [] } }]), /No check resolver/);
	setup.effects.registerResolver("_test_always", (spec) => spec.pass);
	const r = setup.effects.apply([{ check: { resolver: "_test_always", pass: true, then: [{ toast: "pass" }], else: [{ toast: "fail" }] } }]);
	assert.deepEqual(plain(r.toasts), ["pass"]);
	assert.deepEqual(plain(setup.effects.ops([{ check: { then: [{ toast: 1 }], else: [{ random: [{ then: [{ flag: "x" }] }] }] } }])), ["check", "toast", "random", "flag"]);
	assert.throws(() => setup.effects.apply([{ bogus: 1 }]), /Unknown effect/);
});

/* ---- registry --------------------------------------------------------- */

test("registry: define, defaults, ids, duplicates, alias, freeze", () => {
	const { setup } = boot();
	const R = setup.createRegistry();
	R.defineType("thing", { required: ["name"], defaults: { tags: [], size: 1 } });
	const a = R.define("thing", { id: "a", name: "A", tags: ["x"] });
	assert.equal(a.size, 1);
	assert.throws(() => R.define("thing", { id: "a", name: "again" }), /Duplicate/);
	assert.throws(() => R.define("thing", { id: "Bad", name: "x" }), /must match/);
	assert.throws(() => R.define("thing", { id: "b" }), /missing name/);
	assert.throws(() => R.define("nope", { id: "c" }), /Unknown registry type/);
	R.define("thing", { id: "b", name: "B" });
	R.alias("thing", "old_b", "b");
	assert.equal(R.get("thing", "old_b").name, "B");
	assert.deepEqual(plain(R.byTag("thing", "x").map((d) => d.id)), ["a"]);
	assert.throws(() => R.get("thing", "zzz"), /Unknown thing/);
	R.freeze();
	assert.ok(Object.isFrozen(R.get("thing", "a").tags));
	assert.throws(() => R.define("thing", { id: "c", name: "C" }), /frozen/);
});

test("registry: validate catches bad refs, passages and operators", () => {
	const { setup } = boot();
	const R = setup.createRegistry();
	R.defineType("place", {});
	R.defineType("thing", { refs: { home: "place", "visits[].at": "place" }, passages: ["passage"], conditions: ["req"], effects: ["fx"] });
	R.define("place", { id: "p" });
	R.define("thing", { id: "ok", home: "p", visits: [{ at: "p" }], passage: "Yes", req: { flag: "x" }, fx: [{ toast: "hi" }] });
	R.define("thing", { id: "bad", home: "q", visits: [{ at: "r" }], passage: "No", req: { madeUp: 1 }, fx: [{ if: { then: [{ alsoMadeUp: 1 }] } }] });
	const errs = R.validate({ hasPassage: (n) => n === "Yes" });
	assert.equal(errs.length, 5, errs.join("\n"));
	assert.ok(errs.every((e) => e.startsWith('thing "bad"')));
});

/* ---- modules ---------------------------------------------------------- */

test("modules sort by dependency, independent of input order", () => {
	const { setup } = boot();
	const mods = [{ id: "c", deps: ["b"] }, { id: "a", deps: ["registry"] }, { id: "b", deps: ["a"] }];
	assert.deepEqual(plain(setup.sortModules(mods).map((m) => m.id)), ["a", "b", "c"]);
	assert.deepEqual(plain(setup.sortModules([...mods].reverse()).map((m) => m.id)), ["a", "b", "c"]);
	assert.throws(() => setup.sortModules([{ id: "a", deps: ["b"] }, { id: "b", deps: ["a"] }]), /cycle/);
	assert.throws(() => setup.sortModules([{ id: "a", deps: ["ghost"] }]), /missing module "ghost"/);
	assert.throws(() => setup.sortModules([{ id: "a" }, { id: "a" }]), /Duplicate module/);
});

test("installed modules include every module folder", () => {
	const { setup } = boot();
	const ids = setup.modules.list().map((m) => m.id);
	for (const id of ["character", "world", "npcs", "actions", "travel", "events"]) assert.ok(ids.includes(id), id);
	assert.ok(ids.indexOf("world") < ids.indexOf("actions"));
});

/* ---- rng -------------------------------------------------------------- */

test("rng is deterministic for a seed, and seeded(key) is stable", () => {
	const a = boot({ seed: 99 });
	const b = boot({ seed: 99 });
	const roll = (s) => [s.rng.float(), s.rng.int(1, 6), s.rng.pick(["x", "y", "z"]), s.rng.shuffle([1, 2, 3, 4]), s.rng.chance(0.5)];
	assert.deepEqual(plain(roll(a.setup)), plain(roll(b.setup)));
	const s1 = a.setup.rng.seeded("day:3").float();
	const s2 = a.setup.rng.seeded("day:3").float();
	assert.equal(s1, s2);
	assert.notEqual(a.setup.rng.seeded("day:4").float(), s1);
	for (let i = 0; i < 200; i++) {
		const n = a.setup.rng.int(2, 4);
		assert.ok(n >= 2 && n <= 4 && Number.isInteger(n));
	}
	assert.equal(a.setup.rng.weighted([{ weight: 0 }]), undefined);
});

/* ---- saves & migrations ----------------------------------------------- */

test("migrate upgrades an old save fixture and is idempotent", () => {
	const { setup } = boot();
	// Pretend `world` is now at version 3 with two migrations.
	const world = setup.modules.get("world");
	Object.assign(world, {
		version: 3,
		migrations: {
			2: (slice) => ({ ...slice, renamed: slice.old ?? null }),
			3: (slice) => {
				delete slice.old;
				slice.v3 = true;
			},
		},
	});
	const fixture = {
		meta: { schemaVersion: 0, schema: { core: 1, world: 1 }, seed: 1 },
		time: { t: 0 },
		sched: { jobs: [], seq: 0 },
		world: { visited: {}, old: "x" },
	};
	assert.equal(setup.save.needsMigration(fixture), true);
	setup.save.migrate(fixture);
	assert.deepEqual(plain(fixture.world), { visited: {}, renamed: "x", v3: true });
	assert.equal(fixture.meta.schema.world, 3);
	assert.ok("npcs" in fixture && "story" in fixture && "pc" in fixture, "new slices added");
	assert.deepEqual(plain(fixture.meta.flags), {});
	assert.equal(setup.save.needsMigration(fixture), false);
	const snapshot = JSON.stringify(fixture);
	setup.save.migrate(fixture);
	assert.equal(JSON.stringify(fixture), snapshot);
});

/* ---- flow ------------------------------------------------------------- */

test("flow keeps the highest-priority request and defaults to Here", () => {
	const { setup, vars, played } = boot();
	setup.flow.perform(() => "nothing requested");
	assert.equal(played.at(-1), "Here");
	assert.equal(setup.flow.lastResult(), "nothing requested");
	setup.flow.perform(() => {
		setup.flow.request("Low", 1);
		setup.flow.request("High", 50);
		setup.flow.request("Mid", 10);
	});
	assert.equal(played.at(-1), "High");
	assert.equal(vars.meta.returnTo, "Here");
	setup.flow.continue();
	assert.equal(played.at(-1), "Here");
	assert.equal(vars.meta.returnTo, null);
});

/* ---- text ------------------------------------------------------------- */

test("fmt and text helpers", () => {
	const { setup } = boot();
	assert.equal(setup.fmt.money(1250), "£12.50");
	assert.equal(setup.fmt.time(7 * 60 + 5), "07:05");
	assert.equal(setup.fmt.duration(120), "2 hours");
	assert.equal(setup.fmt.duration(90), "1 hour 30 minutes");
	assert.equal(setup.fmt.duration(1), "1 minute");
	assert.equal(setup.fmt.duration(0), "0 minutes");
	assert.match(setup.fmt.date(0), /Tue/);
	assert.equal(setup.text.list(["a", "b", "c"]), "a, b and c");
	assert.equal(setup.text.pronouns("she/her").their, "her");
	assert.equal(setup.text.vary("k", ["x", "y", "z"]), setup.text.vary("k", ["x", "y", "z"]));
});
