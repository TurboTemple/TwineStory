// The real Mooresville content: sanity checks and a day in the life.
import assert from "node:assert/strict";
import { test } from "node:test";
import { bootTown as bootRaw, plain } from "./helpers.mjs";

/** Wear everyday clothes from the wardrobe (instantly). */
function dress(setup) {
	for (const id of ["white_tshirt", "blue_jeans", "trainers", "socks"]) {
		const e = setup.inventory.entries("wardrobe").find((x) => x.item === id);
		setup.clothing.wear(e.uid, { force: true });
	}
}

/** A new game in the town, already dressed (most tests are about other things). */
function bootTown(opts) {
	const g = bootRaw(opts);
	dress(g.setup);
	return g;
}

test("a new game starts in your bedroom at 07:00 with £215 (whole pounds)", () => {
	const { setup } = bootTown();
	assert.equal(setup.world.loc(), "home_bedroom");
	assert.equal(setup.fmt.time(setup.time.now()), "07:00");
	assert.equal(setup.fmt.money(setup.money.balance()), "£215");
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

test("every place and room has something to do, a shop, or somewhere to go", () => {
	const { setup } = bootTown();
	const actions = setup.registry.all("action");
	for (const loc of setup.registry.all("location")) {
		const hasAction = actions.some((a) => setup.util.toArray(a.at).includes(loc.id) || (a.atTag && loc.tags.includes(a.atTag)));
		const hasRooms = setup.world.children(loc.id).length > 0 || setup.registry.query("shop", (sh) => setup.util.toArray(sh.at).includes(loc.id)).length > 0;
		const hasRoutes = setup.registry.query("route", (r) => r.from === loc.id || r.to === loc.id).length > 0;
		const hasLessons = setup.registry.query("school", (sc) => sc.room === loc.id).length > 0;
		assert.ok(hasAction || hasRooms || hasRoutes || hasLessons, `${loc.id} is a dead end`);
	}
});

test("every action's effects run without errors", () => {
	for (const def of bootTown().setup.registry.all("action")) {
		const { setup } = bootTown();
		// People-specific actions run with their person (ctx.npc).
		const npc = [def.with].flat()[0] ?? setup.registry.all("npc").find((n) => def.withTag && (n.tags.includes(def.withTag) || n.role === def.withTag))?.id;
		const ctx = { action: def.id, interrupt() {}, ...(npc ? { npc } : {}) };
		const r = setup.effects.newResult();
		setup.effects.run([...def.costs, ...def.effects, ...def.perHour, ...def.always], ctx, r);
	}
});

test("all students in form 12B are 18; every NPC appears somewhere", () => {
	const { setup } = bootTown();
	const students = setup.registry.byTag("npc", "student");
	assert.ok(students.length >= 5);
	for (const s of students) assert.equal(s.age, 18, s.id);
	// Online people aren't anywhere in town.
	for (const n of setup.registry.all("npc").filter((x) => !x.online)) assert.ok(n.schedule.length > 0, `${n.id} has no schedule`);
});

test("a school day: wee, shower, breakfast, bus to school, five lessons and lunch", () => {
	const { setup } = bootTown();
	const S = setup;
	// Thursday 3 September, the first day of term.
	S.time.advance(S.time.at(2, "07:00") - S.time.now());
	for (const [k, v] of Object.entries({ bladder: 20, food: 60, drink: 60, energy: 80, hygiene: 60 })) S.stats.set(k, v);
	const go = (id) => S.world.walkTo(id);
	go("home_bathroom");
	S.actions.do("use_toilet");
	S.actions.do("shower");
	assert.ok(S.stats.get("bladder") < 3);
	assert.equal(S.status.has("refreshed"), true);
	go("home_bedroom");
	go("home_living_room");
	go("home_kitchen");
	S.actions.do("make_breakfast");
	assert.ok(S.stats.get("food") > 85);
	assert.equal(S.inventory.count("groceries"), 5, "breakfast used one lot of groceries");
	go("home_living_room");
	go("home");
	S.travel.go("elm_road", "walk");
	const bus = S.travel.go("academy", "bus7");
	assert.equal(bus.ok, true);
	assert.equal(S.money.balance("cash"), 35 - 2);
	const E = S.education;
	assert.equal(S.fmt.time(S.time.now()), "07:43");
	assert.deepEqual(plain(E.startBlockers("academy")), ["The school is shut"], "it opens at 07:45");
	assert.deepEqual(plain(S.world.nearby().map((n) => n.ok)), [false, false, false], "the library, sports hall and field are for after school");
	S.actions.do("wait_around", { mins: 60 });
	// Attend school: registration in the form room, then the lessons one by one.
	E.startDay("academy");
	assert.equal(S.world.loc(), "academy_form_room");
	assert.deepEqual(plain(S.world.nearby()), [], "no wandering off mid-lesson");
	assert.ok(S.npcs.peopleAt("academy_form_room").includes("mr_hale"));
	assert.equal(E.nextStep("academy").lesson.subject, "ict", "Thursday starts with ICT");
	E.attend("academy");
	assert.equal(S.fmt.time(S.time.now()), "10:00");
	assert.equal(E.homework()[0].subject, "ict", "ICT sets homework");
	assert.equal(S.npcs.hasMet("priya_shah"), true, "met classmates in the form room");
	E.attend("academy");
	E.attend("academy");
	// The bell: lunch in the canteen, with students and teachers.
	assert.equal(S.fmt.time(S.time.now()), "12:00");
	assert.equal(S.world.loc(), "academy_canteen");
	const people = plain(S.npcs.peopleAt("academy_canteen"));
	assert.ok(people.includes("priya_shah") && people.includes("mr_hale") && people.includes("mark"));
	assert.deepEqual(plain(S.world.nearby().map((n) => n.def.id)), ["academy_boys_toilets", "academy_girls_toilets"]);
	go("academy_girls_toilets");
	go("academy_canteen");
	// Back to class: straight into the next lesson.
	E.backToClass("academy");
	assert.equal(S.fmt.time(S.time.now()), "14:00");
	assert.equal(S.world.loc(), "academy_form_room");
	const out = E.attend("academy");
	assert.match(out.changes.at(-1).text, /School's out/);
	assert.equal(S.world.loc(), "academy", "back out at the entrance");
	assert.equal(E.totals().attended, 5);
	assert.equal(E.today(), null);
	assert.deepEqual(plain(E.startBlockers("academy")), ["School's finished for today"]);
});

test("leaving school early skips the lessons left; you can't start on a Saturday", () => {
	const { setup } = bootTown();
	const E = setup.education;
	setup.time.advance(setup.time.at(2, "08:30") - setup.time.now());
	setup.world.moveTo("academy");
	E.startDay("academy");
	E.attend("academy");
	const r = E.endDay("academy");
	assert.match(r.changes[0].text, /leave school early/);
	assert.equal(setup.world.loc(), "academy");
	setup.time.advance(setup.time.at(3, "07:00") - setup.time.now());
	assert.equal(E.trouble().lessons, 4, "four lessons skipped on Thursday");
	setup.time.advance(setup.time.at(4, "09:00") - setup.time.now());
	assert.ok(E.startBlockers("academy").length, "no school on Saturday");
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

/* ---- Travel ------------------------------------------------------------ */

const opts = (setup, mode) => plain(setup.travel.options().filter((o) => o.mode.id === mode).map((o) => [o.to, o.mins, o.cost]));

test("walking only reaches neighbouring places", () => {
	const { setup } = bootTown();
	setup.world.moveTo("elm_road");
	assert.deepEqual(opts(setup, "walk"), [["home", 1, 0], ["corner_shop", 3, 0], ["elm_park_green", 6, 0], ["academy", 18, 0], ["high_street", 25, 0]]);
});

test("Route 3 runs from the High Street through the park, the Business District and South Town to the beach", () => {
	const { setup } = bootTown();
	setup.world.moveTo("high_street");
	assert.deepEqual(opts(setup, "bus3"), [["riverside_park", 4, 2], ["business_district", 8, 2], ["south_town", 14, 2], ["beach", 19, 2]]);
});

test("Route 7 only runs from its stops, through each stop on the way", () => {
	const { setup } = bootTown();
	setup.world.moveTo("corner_shop");
	assert.deepEqual(opts(setup, "bus7"), []);
	setup.world.moveTo("elm_road");
	assert.deepEqual(opts(setup, "bus7"), [["academy", 6, 2], ["high_street", 13, 2], ["arcade", 17, 2]]);
	const arcade = setup.travel.options().find((o) => o.mode.id === "bus7" && o.to === "arcade");
	assert.deepEqual(plain(arcade.legs.map((l) => l.to)), ["academy", "high_street", "arcade"]);
});

test("taxis go to hubs, only for trips longer than a 10-minute walk", () => {
	const { setup } = bootTown();
	setup.world.moveTo("elm_road");
	// High Street: 25 min walk → 8 min taxi, £3 + 8 × 50p = £7. Arcade: 35 → 11 min, £8.50 → £9.
	// The new hubs: Riverside Park (37-min walk), the Business District (35), South Town (47), the beach (57).
	assert.deepEqual(opts(setup, "taxi"), [["high_street", 8, 7], ["arcade", 11, 9], ["riverside_park", 12, 9], ["business_district", 11, 9], ["south_town", 15, 11], ["beach", 18, 12]]);
	setup.world.moveTo("corner_shop");
	assert.ok(!opts(setup, "taxi").some(([to]) => to === "elm_road"), "Elm Road is only a 3-minute walk");
});

test("travelling pays the fare from cash first, takes the time and arrives", () => {
	const { setup } = bootTown();
	setup.world.moveTo("elm_road");
	const t0 = setup.time.now();
	const r = setup.travel.go("arcade", "bus7");
	assert.equal(r.arrived, true);
	assert.equal(setup.time.now() - t0, 17);
	assert.equal(setup.world.loc(), "arcade");
	assert.equal(setup.money.balance("cash"), 35 - 2);
});

test("you can't travel if you can't pay; no time passes", () => {
	const { setup, vars } = bootTown();
	setup.world.moveTo("elm_road");
	vars.money.balances = { cash: 1, bank: 0 };
	const o = setup.travel.options().find((x) => x.mode.id === "bus7" && x.to === "academy");
	assert.equal(o.ok, false);
	assert.match(o.reasons[0], /Not enough money \(£2 needed\)/);
	const t0 = setup.time.now();
	assert.equal(setup.travel.go("academy", "bus7").ok, false);
	assert.equal(setup.time.now(), t0);
});

test("an interrupted journey leaves you at the last stop, unless the event moves you", () => {
	const a = bootTown().setup;
	a.world.moveTo("elm_road");
	a.events.force("bus_traffic", false);
	a.bus.on("travel:checkpoint", (p) => p.at === "academy" && p.interrupt("breakdown"));
	const r = a.travel.go("arcade", "bus7");
	assert.equal(r.arrived, false);
	assert.equal(a.world.loc(), "academy");
	assert.match(r.changes[0].text, /stopped at Mooresville Academy after 6 minutes/);

	const b = bootTown().setup;
	b.world.moveTo("elm_road");
	b.events.force("bus_traffic", false);
	b.bus.on("travel:checkpoint", (p) => b.effects.run([{ moveTo: "home" }, { interrupt: "detour" }], p.ctx, p.result));
	b.travel.go("arcade", "bus7");
	assert.equal(b.world.loc(), "home");
});

test("bus traffic can hold you up between stops", () => {
	const { setup, played } = bootTown();
	setup.world.moveTo("elm_road");
	setup.events.force("bus_traffic", true);
	const t0 = setup.time.now();
	setup.flow.perform(() => setup.travel.go("high_street", "bus7"));
	assert.equal(setup.time.now() - t0, 13 + 10);
	assert.equal(played.at(-1), "Ev_bus_traffic");
});

/* ---- People ------------------------------------------------------------ */

test("NPCs are met on first encounter, but not from a passing taxi", () => {
	const { setup } = bootTown();
	setup.world.moveTo("elm_road");
	setup.time.advance(setup.time.at(0, "09:25") - setup.time.now());
	setup.travel.go("high_street", "taxi"); // Margaret arrives at 09:30; you've gone
	assert.equal(setup.npcs.hasMet("margaret_holt"), false);
	setup.world.moveTo("elm_road");
	assert.equal(setup.npcs.hasMet("margaret_holt"), true);
	assert.ok(setup.npcs.peopleAt("elm_road").includes("margaret_holt"));
});

test("character sheets: age and whereabouts", () => {
	const { setup } = bootTown();
	assert.equal(setup.npcs.get("dr_okafor").age, 46);
	assert.equal(setup.npcs.whereIs("dr_okafor", setup.time.at(0, "10:00")), "wellbeing_therapy");
	assert.equal(setup.npcs.whereIs("dr_okafor", setup.time.at(4, "10:00")), null, "Saturday off");
	assert.equal(setup.npcs.whereIs("priya_shah", setup.time.at(0, "12:30")), "academy_canteen", "lunch beats lessons");
});

/* ---- Actions ----------------------------------------------------------- */

test("a locked action lists what it needs", () => {
	const { setup } = bootTown();
	setup.time.advance(setup.time.at(4, "10:00") - setup.time.now()); // Saturday: no therapist
	setup.world.moveTo("wellbeing");
	assert.equal(setup.world.nearby().every((n) => !n.ok), true, "closed at the weekend");
	setup.time.advance(setup.time.at(6, "10:00") - setup.time.now()); // Monday
	setup.world.moveTo("wellbeing_therapy");
	setup.npcs.setOverride("dr_okafor", "wellbeing");
	const a = setup.actions.available().find((x) => x.def.id === "therapy_session");
	assert.equal(a.ok, false);
	assert.deepEqual(plain(a.reasons), ["Dr Maya Okafor is here"]);
});

test("the therapy interruption is random (about half) and reproducible per seed", () => {
	const outcomes = (seed) => Array.from({ length: 40 }, (_, i) => {
		const { setup } = bootTown({ seed: seed + i });
		setup.time.advance(setup.time.at(0, "10:00") - setup.time.now());
		setup.world.moveTo("wellbeing_therapy");
		return setup.actions.do("therapy_session").interrupted ? 1 : 0;
	});
	const a = outcomes(1000);
	assert.deepEqual(a, outcomes(1000));
	const n = a.reduce((x, y) => x + y, 0);
	assert.ok(n > 5 && n < 35, `interrupted ${n}/40`);
});
