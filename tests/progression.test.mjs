// Skills, storylines and jobs: the barista job at The Daily Grind from
// asking about work to supervisor, plus the framework on throwaway data.
import assert from "node:assert/strict";
import { test } from "node:test";
import { boot, bootTown, plain } from "./helpers.mjs";

/** Wear everyday clothes from the wardrobe (instantly). */
function dress(setup) {
	for (const id of ["white_tshirt", "blue_jeans", "trainers", "socks"]) {
		const e = setup.inventory.entries("wardrobe").find((x) => x.item === id);
		setup.clothing.wear(e.uid, { force: true });
	}
}

/** Advance the clock to the next given weekday and time. */
function skipTo(setup, weekday, hm) {
	const { time } = setup;
	// Wait at home, so closing time doesn't stop the clock.
	setup.world.moveTo("home_bedroom");
	let t = time.nextAt(time.now() + 1, hm);
	while (time.weekday(t) !== weekday) t += time.MIN_PER_DAY;
	time.advance(t - time.now());
}

function town() {
	const g = bootTown();
	dress(g.setup);
	return g;
}

test("skills: levels, gain hooks, conditions and level-up notices", () => {
	const { setup } = town();
	assert.equal(setup.skills.level("barista"), 0);
	setup.skills.add("barista", 5);
	assert.equal(setup.skills.value("barista"), 5);
	setup.skills.add("barista", 5);
	assert.ok(setup.skills.value("barista") < 10, "slowing gain: a little less than asked as you improve");
	assert.ok(setup.cond.test({ skill: { id: "barista", min: 9 } }, {}));
	assert.ok(!setup.cond.test({ skill: { id: "barista", min: 10 } }, {}));
	assert.match(setup.ui.takeNotices().join(" "), /Barista skill is now 9/);
});

test("storylines: gates, entry events, stage-only events", () => {
	const { setup, played } = boot({
		before(s) {
			(s.__testContent ??= []).push((R) => {
				R.define("storylet", { id: "t_enter_b", kind: "manual", passage: "Here" });
				R.define("storylet", { id: "t_pool_a", kind: "pool", passage: "Here", triggers: ["t:ping"] });
				R.define("storyline", {
					id: "t_line", label: "Test", start: "a",
					stages: [
						{ id: "a", label: "A", events: ["t_pool_a"], gates: [{ to: "b", when: { storylineCount: { key: "n", min: 2 } } }] },
						{ id: "b", label: "B", enter: "t_enter_b", onEnter: [{ flag: "reached_b" }] },
					],
				});
			});
		},
		includeTest: true,
	});
	const L = setup.storylines;
	assert.equal(L.stage("t_line"), "a", "starts at its start stage");
	assert.equal(setup.events.handle("t:ping").id, "t_pool_a", "stage event fires in its stage");
	L.addCount("t_line", "n");
	assert.equal(L.stage("t_line"), "a");
	L.addCount("t_line", "n");
	assert.equal(L.stage("t_line"), "b", "gate passes as soon as the counter reaches 2");
	assert.equal(setup.vars().meta.flags.reached_b, true);
	assert.equal(setup.events.seen("t_enter_b"), 1, "entry event fired");
	assert.equal(setup.events.handle("t:ping"), null, "stage event no longer fires");
	assert.ok(setup.cond.test({ storyline: { id: "t_line", stage: ["b", "c"] } }, {}));
	void played;
});

test("the barista job: interview, first day, trainee, promotion, supervisor", () => {
	const { setup } = town();
	const L = setup.storylines;
	// Saturday morning at the counter, with Jess there.
	skipTo(setup, 6, "07:40");
	setup.world.moveTo("grind_counter");
	assert.ok(setup.actions.available().some((a) => a.def.id === "ask_about_work" && a.ok));
	setup.actions.do("ask_about_work");
	assert.equal(L.stage("barista_job"), "hired");
	assert.equal(setup.events.seen("grind_interview"), 1);
	assert.ok(setup.jobs.employed("grind_barista"));
	assert.ok(!setup.actions.available().some((a) => a.def.id === "ask_about_work"), "can't ask twice");

	// First shift: the first-day event, then trainee.
	const shift = setup.jobs.shiftNow("grind_barista");
	assert.ok(shift, "Saturday's shift can start now (a little early)");
	const bank = setup.money.balance("bank");
	const r = setup.jobs.work("grind_barista");
	assert.equal(setup.fmt.time(setup.time.now()), "14:00");
	assert.equal(setup.events.seen("grind_first_day"), 1);
	assert.equal(L.stage("barista_job"), "trainee");
	assert.equal(setup.money.balance("bank") - bank, 6000, "6 hours at the placeholder £10");
	assert.match(plain(r.changes).map((c) => c.text).join(" "), /worked your shift: 6 hours/);
	assert.equal(setup.jobs.shiftNow("grind_barista"), null, "one shift a day");

	// Sunday: a trainee event fires (one per shift).
	skipTo(setup, 0, "09:50");
	setup.world.moveTo("grind_counter");
	const seenTrainee = () => setup.registry.all("storylet").filter((s) => s.id.startsWith("grind_trainee_")).reduce((n, s) => n + setup.events.seen(s.id), 0);
	setup.jobs.work("grind_barista");
	assert.equal(seenTrainee(), 1);

	// Skill 20 → promotion; the barista events take over.
	setup.skills.set("barista", 20);
	assert.equal(L.stage("barista_job"), "barista");
	assert.equal(setup.events.seen("grind_promotion"), 1);
	assert.equal(setup.jobs.rate("grind_barista"), 1100);
	skipTo(setup, 6, "08:00");
	setup.world.moveTo("grind_counter");
	setup.jobs.work("grind_barista");
	assert.equal(seenTrainee(), 1, "no more trainee events");
	assert.equal(setup.registry.all("storylet").filter((s) => s.id.startsWith("grind_barista_")).reduce((n, s) => n + setup.events.seen(s.id), 0), 1);

	setup.skills.set("barista", 50);
	assert.equal(L.stage("barista_job"), "supervisor");
});

test("missing three shifts gets you let go; quitting works", () => {
	const { setup } = town();
	setup.storylines.moveTo("barista_job", "trainee", { quiet: true });
	// Sleep through three weekend shifts.
	setup.time.advance(setup.time.MIN_PER_DAY * 12);
	assert.equal(setup.storylines.count("barista_job", "missed"), 3);
	assert.equal(setup.storylines.stage("barista_job"), "fired");
	assert.equal(setup.events.seen("grind_fired"), 1);
	assert.ok(!setup.jobs.employed("grind_barista"));

	const g = town();
	g.setup.storylines.moveTo("barista_job", "barista", { quiet: true });
	g.setup.jobs.quit("grind_barista");
	assert.equal(g.setup.storylines.stage("barista_job"), "quit");
});

test("two events at once: the second waits for Continue", () => {
	const { setup, played } = town();
	setup.flow.perform(() => {
		setup.flow.request("Ev_grind_promotion", setup.flow.PRIORITY.event);
		setup.flow.request("Ev_grind_first_day", setup.flow.PRIORITY.event);
	});
	assert.equal(played.at(-1), "Ev_grind_promotion");
	setup.flow.continue();
	assert.equal(played.at(-1), "Ev_grind_first_day");
	setup.flow.continue();
	assert.equal(played.at(-1), "Here");
});
