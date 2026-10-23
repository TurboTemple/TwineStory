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

	// First shift: the first-day event, then trainee. One tap = one 2-hour shift.
	assert.ok(setup.jobs.canWork("grind_barista").ok);
	const bank = setup.money.balance("bank");
	const before = setup.time.now();
	const r = setup.jobs.work("grind_barista");
	assert.equal(setup.time.now() - before, 120);
	assert.equal(setup.events.seen("grind_first_day"), 1);
	assert.equal(L.stage("barista_job"), "trainee");
	assert.equal(setup.money.balance("bank") - bank, 20, "2 hours at £10");
	assert.match(plain(r.changes).map((c) => c.text).join(" "), /worked a shift: 2 hours/);
	assert.equal(L.count("barista_job", "shifts"), 1);

	// No rota: work again straight away, as often as you like.
	assert.ok(setup.jobs.canWork("grind_barista").ok, "another shift right away");
	const seenTrainee = () => setup.registry.all("storylet").filter((s) => s.id.startsWith("grind_trainee_")).reduce((n, s) => n + setup.events.seen(s.id), 0);
	let n = 0;
	while (setup.jobs.canWork("grind_barista").ok) {
		setup.jobs.work("grind_barista");
		n++;
	}
	const closing = setup.time.at(setup.time.day(setup.time.now()), "18:00");
	assert.ok(setup.time.now() <= closing && setup.time.now() + 120 > closing, "stops at the last shift that fits before 18:00 closing");
	assert.match(setup.jobs.canWork("grind_barista").reason, /before closing/);
	assert.ok(n >= 4);
	// Shift events are occasional (a chance each); work until one shows up.
	for (let i = 0; i < 40 && !seenTrainee(); i++) {
		skipTo(setup, 6, "08:00");
		setup.world.moveTo("grind_counter");
		setup.jobs.work("grind_barista");
	}
	assert.ok(seenTrainee() >= 1, "a trainee event happens sometimes");

	// Skill 20 → promotion; the barista events take over.
	setup.skills.set("barista", 20);
	assert.equal(L.stage("barista_job"), "barista");
	assert.equal(setup.events.seen("grind_promotion"), 1);
	assert.equal(setup.jobs.rate("grind_barista"), 11);
	assert.ok(setup.actions.available().some((a) => a.def.id === "grind_staff_coffee" && a.ok), "the staff perk unlocks");
	const trainee = seenTrainee();
	const seenBarista = () => setup.registry.all("storylet").filter((s) => s.id.startsWith("grind_barista_")).reduce((n, s) => n + setup.events.seen(s.id), 0);
	for (let i = 0; i < 40 && !seenBarista(); i++) {
		skipTo(setup, 6, "08:00");
		setup.world.moveTo("grind_counter");
		setup.jobs.work("grind_barista");
	}
	assert.equal(seenTrainee(), trainee, "no more trainee events");
	assert.ok(seenBarista() >= 1);

	setup.skills.set("barista", 50);
	assert.equal(L.stage("barista_job"), "supervisor");
});

test("shifts: closed or not enough time, random outcomes move the skill both ways; quitting works", () => {
	const { setup } = town();
	setup.storylines.moveTo("barista_job", "trainee", { quiet: true });
	skipTo(setup, 0, "06:00"); // Sunday, before opening (09:00)
	setup.world.moveTo("daily_grind");
	assert.equal(setup.jobs.canWork("grind_barista").reason, "It's closed.");
	skipTo(setup, 0, "14:30"); // closes 16:00: not enough time
	setup.world.moveTo("daily_grind");
	assert.match(setup.jobs.canWork("grind_barista").reason, /before closing/);
	setup.world.moveTo("home_bedroom");
	assert.equal(setup.jobs.canWork("grind_barista").reason, "You need to be at work.");

	// Over many shifts, some end better than usual and some worse.
	const notes = new Set();
	for (let i = 0; i < 40; i++) {
		skipTo(setup, 1, "09:00");
		setup.world.moveTo("grind_counter");
		setup.skills.set("barista", 5);
		const r = setup.jobs.work("grind_barista");
		for (const c of plain(r.changes)) if (c.kind === "note") notes.add(c.text);
	}
	assert.ok([...notes].some((t) => /good shift/.test(t)));
	assert.ok([...notes].some((t) => /rough shift/.test(t)));

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

test("school: term days, skipping lessons, late homework, your tutor's word", () => {
	const { setup } = town();
	const E = setup.education;
	assert.ok(!E.schoolDay("academy", 0), "Tue 1 Sept is before term");
	assert.ok(E.schoolDay("academy", 2), "Thu 3 Sept is the first day");
	assert.ok(!E.schoolDay("academy", 4), "not on Saturdays");
	assert.equal(E.lessonsOn("academy", 2).length, 5);
	// Stay home on Thursday: five lessons skipped.
	setup.time.advance(setup.time.at(3, "07:00") - setup.time.now());
	assert.equal(E.trouble().lessons, 5);
	// Homework that goes past its due time is late.
	E.setHomework("maths");
	setup.time.advance(setup.time.at(6, "07:00") - setup.time.now());
	assert.equal(E.trouble().homework, 1);
	assert.equal(E.homework().length, 0);
	// Monday: Mr Hale has a word when you walk into the form room.
	setup.world.moveTo("academy");
	setup.time.advance(setup.time.at(6, "08:45") - setup.time.now());
	setup.world.walkTo("academy_form_room");
	assert.equal(setup.events.seen("tutor_word"), 1);
	assert.equal(E.trouble().lessons, 0);
	assert.equal(E.lastTrouble.homework, 1);
	// Homework is finished by the homework action.
	E.setHomework("english");
	setup.world.moveTo("home_bedroom");
	setup.actions.do("homework");
	assert.equal(E.homework().length, 0);
	assert.equal(E.totals().homeworkDone, 1);
});

test("old saves drop the shift rota record (jobs migration 1 → 2)", () => {
	const { setup } = town();
	const old = { meta: { schemaVersion: 5, schema: { core: 1, jobs: 1 } }, time: { t: 0 }, sched: { jobs: [], seq: 0 }, job: { worked: { grind_barista: [3, 4] } } };
	setup.save.migrate(old);
	assert.deepEqual(plain(old.job), {});
	assert.equal(old.meta.schema.jobs, 2);
});

test("makeup: needs a kit, done in a bathroom, raises Beauty until a shower", () => {
	const { setup } = town();
	setup.world.moveTo("home_bathroom");
	const makeup = () => setup.actions.available().find((a) => a.def.id === "do_makeup");
	assert.ok(!makeup().ok, "no kit yet");
	setup.inventory.add("makeup_kit");
	assert.ok(makeup().ok);
	const before = setup.stats.get("beauty");
	setup.actions.do("do_makeup");
	assert.equal(setup.stats.get("beauty"), before + 20);
	assert.equal(setup.inventory.count("makeup_kit"), 1, "the kit isn't used up");
	setup.actions.do("shower");
	assert.equal(setup.stats.get("beauty"), before, "a shower takes it off");
});

test("only things you wear can carry stats", () => {
	const { setup } = boot({
		before(s) {
			(s.__testContent ??= []).push((R) => {
				R.define("item", { id: "t_lucky_coin", name: "Lucky coin", stats: [{ stat: "mood", op: "add", value: 5 }] });
			});
		},
		includeTest: true,
	});
	assert.ok(setup.registry.validate().some((e) => /t_lucky_coin.*only things you wear/.test(e)));
});

test("a second storyline from data only: getting fit at the gym", () => {
	const { setup } = town();
	const L = setup.storylines;
	assert.equal(L.stage("fitness"), "beginner", "in the Diary from the start");
	assert.match(L.stageDef("fitness").hint, /work out/);
	skipTo(setup, 1, "07:00");
	setup.world.moveTo("pulsefit_floor");
	let n = 0;
	while (L.stage("fitness") === "beginner" && n < 30) {
		setup.status.add("gym_pass");
		setup.stats.set("energy", 100);
		setup.actions.do("gym_workout");
		n++;
	}
	assert.equal(L.stage("fitness"), "regular");
	assert.equal(setup.events.seen("fitness_regular"), 1);
	assert.ok(L.count("fitness", "workouts") >= 5);
});

test("crossovers: Barista skill and Beauty open up new things to say", () => {
	const { setup } = town();
	const R = setup.rel;
	const has = (npc, id) => R.interactions(npc).find((x) => x.def.id === id);
	assert.ok(!has("jess_marlow", "talk_coffee").ok);
	setup.skills.set("barista", 10);
	assert.ok(has("jess_marlow", "talk_coffee").ok);
	assert.ok(!has("jess_marlow", "hang_out"), "only with students");
	assert.ok(!has("priya_shah", "hang_out").ok);
	setup.stats.set("beauty", 40);
	R.add("priya_shah", "friendship", 20);
	assert.ok(has("priya_shah", "hang_out").ok);
});
