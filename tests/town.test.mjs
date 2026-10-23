// The real Mooresville content: sanity checks and a day in the life.
import assert from "node:assert/strict";
import { test } from "node:test";
import { bootTown, plain } from "./helpers.mjs";

test("a new game starts in your bedroom at 07:00 with £215", () => {
	const { setup } = bootTown();
	assert.equal(setup.world.loc(), "home_bedroom");
	assert.equal(setup.fmt.time(setup.time.now()), "07:00");
	assert.equal(setup.fmt.money(setup.money.balance()), "£215.00");
	assert.equal(setup.character.age(), 18);
});

test("every place can be reached on foot from home", () => {
	const { setup } = bootTown();
	const sites = setup.registry.query("location", (l) => !l.parent).map((l) => l.id);
	const seen = new Set(["home"]);
	const queue = ["home"];
	while (queue.length) {
		const cur = queue.shift();
		for (const r of setup.registry.query("route", (x) => x.network === "walk" && (x.from === cur || x.to === cur))) {
			const next = r.from === cur ? r.to : r.from;
			if (!seen.has(next)) {
				seen.add(next);
				queue.push(next);
			}
		}
	}
	assert.deepEqual(plain(sites.filter((s) => !seen.has(s))), []);
});

test("every place and room has something to do or somewhere to go", () => {
	const { setup } = bootTown();
	const actions = setup.registry.all("action");
	for (const loc of setup.registry.all("location")) {
		const hasAction = actions.some((a) => setup.util.toArray(a.at).includes(loc.id) || (a.atTag && loc.tags.includes(a.atTag)));
		const hasRooms = setup.world.children(loc.id).length > 0;
		const hasRoutes = setup.registry.query("route", (r) => r.from === loc.id || r.to === loc.id).length > 0;
		assert.ok(hasAction || hasRooms || hasRoutes, `${loc.id} is a dead end`);
	}
});

test("every action's effects run without errors", () => {
	for (const def of bootTown().setup.registry.all("action")) {
		const { setup } = bootTown();
		const ctx = { action: def.id, interrupt() {} };
		const r = setup.effects.newResult();
		setup.effects.run([...def.costs, ...def.effects, ...def.perHour, ...def.always], ctx, r);
	}
});

test("all students in form 12B are 18; every NPC appears somewhere", () => {
	const { setup } = bootTown();
	const students = setup.registry.byTag("npc", "student");
	assert.ok(students.length >= 5);
	for (const s of students) assert.equal(s.age, 18, s.id);
	for (const n of setup.registry.all("npc")) assert.ok(n.schedule.length > 0, `${n.id} has no schedule`);
});

test("a school day: wee, shower, breakfast, bus to school, a lesson", () => {
	const { setup } = bootTown();
	const S = setup;
	const go = (id) => S.world.walkTo(id);
	go("home");
	go("home_bathroom");
	S.actions.do("use_toilet");
	S.actions.do("shower");
	assert.ok(S.stats.get("bladder") < 3);
	assert.equal(S.status.has("refreshed"), true);
	go("home_kitchen");
	S.actions.do("make_breakfast");
	assert.ok(S.stats.get("food") > 85);
	S.travel.go("elm_road", "walk");
	const bus = S.travel.go("academy", "bus7");
	assert.equal(bus.ok, true);
	assert.equal(S.money.balance("cash"), 3500 - 180);
	go("academy_form_room");
	assert.equal(S.fmt.time(S.time.now()), "07:41", "school isn't open until 07:45");
	assert.equal(S.world.loc(), "academy");
	S.actions.do("wait_around", { mins: 60 });
	go("academy_form_room");
	assert.equal(S.world.loc(), "academy_form_room");
	assert.ok(S.npcs.peopleAt("academy_form_room").includes("mr_hale"));
	const lesson = S.actions.do("attend_lesson");
	assert.equal(lesson.ok, true);
	assert.equal(S.vars().meta.counters.lessons_attended, 1);
	assert.equal(S.npcs.hasMet("priya_shah"), true, "met classmates on the way in");
});

test("a night at the pub: drinks get you tipsy and fill your bladder", () => {
	const { setup } = bootTown();
	const S = setup;
	S.world.moveTo("red_lion");
	S.time.advance(S.time.at(0, "19:00") - S.time.now());
	S.world.walkTo("lion_bar");
	S.actions.do("pub_pint");
	S.actions.do("pub_pint");
	assert.equal(S.status.label("tipsy"), "Merry");
	assert.ok(S.stats.get("bladder") > 50);
	S.world.walkTo("lion_toilets");
	S.actions.do("use_toilet");
	assert.ok(S.stats.get("bladder") < 3);
});

test("therapy: two hours, or one if the receptionist interrupts", () => {
	const run = (interrupt) => {
		const { setup, played } = bootTown();
		setup.time.advance(setup.time.at(0, "10:00") - setup.time.now());
		setup.world.moveTo("wellbeing_therapy");
		setup.events.force("therapy_interrupted", interrupt);
		const t0 = setup.time.now();
		const r = setup.flow.perform(() => setup.actions.do("therapy_session"));
		return { mins: setup.time.now() - t0, r, last: played.at(-1) };
	};
	assert.equal(run(false).mins, 120);
	const cut = run(true);
	assert.equal(cut.mins, 60);
	assert.equal(cut.last, "Ev_therapy_interrupted");
});

test("sleeping through the night wakes you if you're bursting", () => {
	const { setup, played } = bootTown();
	setup.stats.set("bladder", 80);
	const r = setup.flow.perform(() => setup.actions.do("sleep", { mins: 480 }));
	assert.equal(r.interrupted, "bladder");
	assert.ok(r.elapsed < 480);
	assert.equal(played.at(-1), "Ev_woken_by_bladder");
	assert.equal(setup.status.has("asleep"), false, "the asleep effect is cleared even when woken");
});
