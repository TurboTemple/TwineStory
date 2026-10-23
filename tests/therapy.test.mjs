// The test therapy storyline, end to end: travel time, opening hours,
// the 2-hour session, and the secretary event that cuts it to 1 hour.
import assert from "node:assert/strict";
import { test } from "node:test";
import { boot, plain } from "./helpers.mjs";

const HOUR = 60;
const at = (setup, day, hm) => setup.time.at(day, hm);

/** Boot with test content and stand at the clinic at 10:00 on day 0 (a Tuesday). */
function atClinic(opts) {
	const g = boot({ includeTest: true, ...opts });
	g.setup.time.advance(at(g.setup, 0, "10:00") - g.setup.time.now());
	g.setup.world.moveTo("test_clinic");
	return g;
}

test("a new game starts at Test Home at 07:00", () => {
	const { setup } = boot({ includeTest: true });
	assert.equal(setup.world.loc(), "test_home");
	assert.equal(setup.fmt.time(setup.time.now()), "07:00");
});

test("travel takes the route's time and moves the PC", () => {
	const { setup } = boot({ includeTest: true });
	const dests = setup.travel.destinations().map((d) => [d.to, d.options.map((o) => o.mins)]);
	assert.deepEqual(plain(dests), [["test_high_street", [10]], ["test_clinic", [15]]]);
	const t0 = setup.time.now();
	const r = setup.travel.go("test_clinic", "test_walk");
	assert.equal(r.ok, true);
	assert.equal(setup.time.now(), t0 + 15);
	assert.equal(setup.world.loc(), "test_clinic");
	setup.travel.go("test_high_street", "test_walk");
	assert.equal(setup.time.now(), t0 + 20);
	assert.equal(setup.world.loc(), "test_high_street");
});

test("the session is locked while the clinic is closed", () => {
	const { setup } = boot({ includeTest: true });
	setup.travel.go("test_clinic", "test_walk"); // arrives 07:15, before opening
	const a = setup.actions.available().find((x) => x.def.id === "test_therapy_session");
	assert.equal(a.ok, false);
	assert.ok(a.reasons.some((r) => /open/.test(r)));
	const r = setup.actions.do("test_therapy_session");
	assert.equal(r.ok, false);
	assert.equal(setup.fmt.time(setup.time.now()), "07:15", "no time passes when blocked");
});

test("both NPCs are at the clinic during opening hours, with character sheets", () => {
	const { setup } = atClinic();
	assert.deepEqual(plain(setup.npcs.peopleAt("test_clinic")), ["test_therapist", "test_secretary"]);
	assert.equal(setup.npcs.get("test_therapist").age, 45);
	assert.equal(setup.npcs.whereIs("test_therapist", at(setup, 0, "18:00")), null);
	assert.equal(setup.npcs.whereIs("test_therapist", at(setup, 4, "10:00")), null, "Saturday: not working");
});

test("an uninterrupted session takes 2 hours", () => {
	const { setup, played } = atClinic();
	setup.events.force("test_secretary_interrupts", false);
	const t0 = setup.time.now();
	const r = setup.flow.perform(() => setup.actions.do("test_therapy_session"));
	assert.equal(r.ok, true);
	assert.equal(r.interrupted, false);
	assert.equal(setup.time.now() - t0, 2 * HOUR);
	assert.equal(played.at(-1), "Here");
	assert.match(r.changes.map((c) => c.text).join(" "), /took 2 hours.*full length/);
	assert.equal(setup.events.seen("test_secretary_interrupts"), 0);
});

test("when the secretary interrupts, the session ends after 1 hour", () => {
	const { setup, vars, played } = atClinic();
	setup.events.force("test_secretary_interrupts", true);
	const t0 = setup.time.now();
	const r = setup.flow.perform(() => setup.actions.do("test_therapy_session"));
	assert.equal(r.interrupted, "secretary");
	assert.equal(setup.time.now() - t0, HOUR);
	assert.equal(played.at(-1), "Ev_test_secretary_interrupts");
	assert.equal(vars.meta.returnTo, "Here");
	const text = r.changes.map((c) => c.text).join(" ");
	assert.match(text, /ended early after 1 hour/);
	assert.match(text, /secretary interrupted/);
	assert.doesNotMatch(text, /full length/);
	assert.equal(setup.events.seen("test_secretary_interrupts"), 1);
	setup.flow.continue();
	assert.equal(played.at(-1), "Here");
});

test("the interruption is random (about half of sessions) and reproducible per seed", () => {
	const outcomes = (seed) =>
		Array.from({ length: 40 }, (_, i) => {
			const { setup } = atClinic({ seed: seed + i });
			return setup.actions.do("test_therapy_session").interrupted ? 1 : 0;
		});
	const a = outcomes(1000);
	assert.deepEqual(a, outcomes(1000));
	const n = a.reduce((s, x) => s + x, 0);
	assert.ok(n > 5 && n < 35, `interrupted ${n}/40`);
});

test("the event doesn't fire if the secretary isn't there", () => {
	const { setup } = atClinic();
	setup.events.force("test_secretary_interrupts", true);
	setup.npcs.setOverride("test_secretary", "test_home");
	const r = setup.actions.do("test_therapy_session");
	assert.equal(r.interrupted, false);
	assert.equal(r.elapsed, 2 * HOUR);
});

test("with the 'none' selector no random events fire", () => {
	const { setup } = atClinic();
	setup.config.events.selector = "none";
	for (let i = 0; i < 10; i++) {
		setup.world.moveTo("test_clinic");
		assert.equal(setup.actions.do("test_therapy_session").interrupted, false);
	}
});

test("wait offers several durations", () => {
	const { setup } = boot({ includeTest: true });
	const t0 = setup.time.now();
	setup.actions.do("test_wait", { mins: 60 });
	assert.equal(setup.time.now(), t0 + 60);
	assert.throws(() => setup.actions.do("test_wait", { mins: 45 }), /can't last/);
});
