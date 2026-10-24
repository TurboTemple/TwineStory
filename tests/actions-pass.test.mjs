// The action pass: cooldowns, walking costs, workouts that build body
// parts, personal training, and the gates and tweaks on everyday actions.
import assert from "node:assert/strict";
import { test } from "node:test";
import { bootTown } from "./helpers.mjs";

const KIT = ["sports_top", "leggings", "trainers", "socks"];
const CLOTHES = ["white_tshirt", "blue_jeans", "trainers", "socks"];

/** A town game at `loc`, at `hm` on `day` (day 0 is Tuesday), wearing `wear`. */
function at(loc, { day = 0, hm = "12:00", wear = CLOTHES } = {}) {
	const { setup: s } = bootTown();
	for (const id of wear) {
		let e = s.inventory.entries("wardrobe").find((x) => x.item === id);
		if (!e) {
			s.inventory.add(id);
			e = s.inventory.entries("bag").find((x) => x.item === id);
		}
		s.clothing.wear(e.uid, { force: true });
	}
	const t = s.time.at(day, hm);
	if (t > s.time.now()) s.time.advance(t - s.time.now());
	s.world.moveTo(loc);
	return s;
}
const action = (s, id) => s.actions.available().find((a) => a.def.id === id);

test("trying clothes on has a cooldown: once every 4 hours", () => {
	const s = at("threadline_fitting");
	assert.ok(action(s, "threadline_try_on").ok);
	s.actions.do("threadline_try_on");
	const again = action(s, "threadline_try_on");
	assert.equal(again.ok, false);
	assert.match(again.reasons[0], /^Not again for/);
	s.time.advance(240);
	assert.ok(action(s, "threadline_try_on").ok);
});

test("walking somewhere costs energy and drink; the bus doesn't", () => {
	const walker = at("elm_road");
	const rider = at("elm_road");
	const e0 = walker.stats.base("energy");
	walker.travel.go("high_street", "walk");
	assert.equal(walker.status.has("on_foot"), false, "the effect ends when you arrive");
	rider.time.advance(25); // the same time, standing still
	assert.ok(walker.stats.base("energy") < rider.stats.base("energy"));
	assert.ok(walker.stats.base("drink") < rider.stats.base("drink"));
	assert.ok(walker.stats.base("energy") < e0);
});

test("focused workouts build the part they work; a training plan multiplies the gains", () => {
	const s = at("pulsefit_floor", { day: 0, hm: "16:00", wear: KIT });
	s.effects.apply([{ status: "gym_pass" }]);
	const arms = s.body.get("arms");
	s.actions.do("gym_curls");
	assert.equal(s.body.get("arms"), arms + 1.5);
	const bum = s.body.get("bum");
	s.stats.set("energy", 80);
	s.actions.do("gym_squats");
	assert.equal(s.body.get("bum"), bum + 1.5);

	s.effects.apply([{ status: "on_training_plan" }]);
	const stomach = s.body.get("stomach");
	s.stats.set("energy", 80);
	s.actions.do("gym_core");
	assert.equal(s.body.get("stomach"), stomach + 2.25, "×1.5 on Kyle's plan");
});

test("every workout needs gym kit (or swimwear at sea) and energy", () => {
	const s = at("elm_road", { hm: "09:00" });
	assert.equal(action(s, "go_jogging").ok, false, "jeans aren't gym kit");
	const k = at("elm_road", { hm: "09:00", wear: KIT });
	assert.ok(action(k, "go_jogging").ok);
	k.stats.set("energy", 10);
	assert.equal(action(k, "go_jogging").ok, false);
});

test("personal training with Kyle: £20, starts his storyline and puts you on his plan", () => {
	const s = at("pulsefit_floor", { day: 0, hm: "16:00", wear: KIT });
	assert.ok(action(s, "personal_training").ok, "Kyle works weekday evenings");
	const cash = s.money.balance();
	s.actions.do("personal_training");
	assert.equal(s.money.balance(), cash - 20);
	assert.ok(s.status.has("on_training_plan"));
	assert.equal(s.storylines.stage("personal_training"), "start");
	assert.equal(s.storylines.progression("personal_training"), 1);
	const m = at("pulsefit_floor", { day: 0, hm: "10:00", wear: KIT });
	assert.equal(action(m, "personal_training").ok, false, "Kyle isn't in on weekday mornings");
});

test("Kai won't let you swim very drunk", () => {
	const s = at("beach_sea", { hm: "11:00", wear: ["black_swimsuit"] });
	assert.ok(action(s, "swim").ok);
	s.effects.apply([{ status: "tipsy" }, { status: "tipsy" }, { status: "tipsy" }, { status: "tipsy" }]);
	assert.equal(s.status.stacks("tipsy"), 4);
	assert.equal(action(s, "swim").ok, false);
});

test("the status condition can test a level: Very drunk or worse", () => {
	const s = at("elm_road");
	const veryDrunk = { status: { id: "tipsy", min: 4 } };
	assert.equal(s.cond.test(veryDrunk, {}), false);
	s.effects.apply([{ status: "tipsy" }, { status: "tipsy" }, { status: "tipsy" }]);
	assert.equal(s.cond.test(veryDrunk, {}), false, "Drunk isn't Very drunk");
	s.effects.apply([{ status: "tipsy" }]);
	assert.ok(s.cond.test(veryDrunk, {}));
	assert.equal(s.cond.explain(veryDrunk, {})[0].text, "Very drunk or worse");
});

test("dressed up, the bouncer waves you past the queue", () => {
	const plain = at("club_neon", { day: 3, hm: "23:00" });
	plain.stats.set("energy", 80); // not Exhausted (which slows everything down)
	const t0 = plain.time.now();
	plain.actions.do("neon_entry");
	assert.equal(plain.time.now() - t0, 25, "5 minutes plus 20 in the queue");
	const smart = at("club_neon", { day: 3, hm: "23:00", wear: ["black_dress", "boots"] });
	smart.stats.set("energy", 80);
	const t1 = smart.time.now();
	smart.actions.do("neon_entry");
	assert.equal(smart.time.now() - t1, 5);
});

test("the gates: a coat on the beach, Beauty at the studio", () => {
	const s = at("beach_sand", { hm: "11:00", wear: [...CLOTHES, "puffer_jacket"] });
	s.weather.onDay = () => ({ kind: "sunny", label: "Sunny", icon: "", wet: false, temp: 24 });
	assert.ok(action(s, "sunbathe").reasons.includes("Take your coat off"));

	const g = at("grumman_casting", { day: 1, hm: "10:00" });
	assert.equal(action(g, "grumman_leave_details").ok, false, "Beauty 50+");
	g.effects.apply([{ status: "made_up" }, { statSet: { hygiene: 100 } }]);
	assert.ok(action(g, "grumman_leave_details").ok);
});

test("paying in at the bank moves all your cash", () => {
	const s = at("crown_bank", { day: 1, hm: "10:00" });
	const total = s.money.balance();
	s.actions.do("bank_pay_in");
	assert.equal(s.money.balance("cash"), 0);
	assert.equal(s.money.balance(), total);
});

test("tea and coffee are free at your parents' house, and use groceries anywhere else", () => {
	const s = at("home_kitchen");
	assert.ok(action(s, "make_tea").ok);
	s.world.moveTo("flat_kitchen");
	assert.equal(action(s, "make_tea").ok, false, "no groceries in the flat");
	s.inventory.add("groceries");
	s.actions.do("make_tea");
	assert.equal(s.inventory.count("groceries"), 0);
});

test("a bath, a blow-dry, and the community centre's clubs", () => {
	const s = at("home_bathroom");
	assert.ok(action(s, "bath"));
	const h = at("snips", { day: 1, hm: "10:00" });
	const beauty = h.stats.get("beauty");
	h.actions.do("blow_dry");
	assert.ok(h.stats.get("beauty") >= beauty + 9, "+10 (less a little hygiene lost in 30 minutes)");
	// Day 6 is Monday 7 September: yoga at 18:00, art at 19:15.
	const c = at("community_hall", { day: 6, hm: "18:10", wear: KIT });
	assert.ok(action(c, "club_yoga_class").ok);
	assert.equal(action(c, "club_art_class"), undefined, "not on yet (hidden)");
});

test("an old save gets the new action cooldown slice", () => {
	const { setup } = bootTown();
	const old = JSON.parse(JSON.stringify(setup.vars()));
	delete old.acts;
	old.meta.schema.actions = 1;
	setup.save.migrate(old);
	assert.deepEqual(JSON.parse(JSON.stringify(old.acts)), { last: {} });
	assert.equal(old.meta.schema.actions, 2);
});
