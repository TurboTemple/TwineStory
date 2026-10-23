// Relationships, the Talk menu, the phone, and stat consequences.
import assert from "node:assert/strict";
import { test } from "node:test";
import { bootTown, plain } from "./helpers.mjs";

function dress(setup) {
	for (const id of ["white_tshirt", "blue_jeans", "trainers", "socks"]) {
		const e = setup.inventory.entries("wardrobe").find((x) => x.item === id);
		setup.clothing.wear(e.uid, { force: true });
	}
}

/** Saturday 08:00 at the café counter, with Jess there. */
function atCafe() {
	const g = bootTown();
	dress(g.setup);
	const { time } = g.setup;
	g.setup.time.advance(time.at(4, "08:00") - time.now());
	g.setup.world.moveTo("grind_counter");
	for (const [k, v] of Object.entries({ hygiene: 90, energy: 80, food: 70, drink: 70, bladder: 10, stress: 30 })) g.setup.stats.set(k, v);
	return g;
}

test("talking: interactions, cooldowns, tiers and requirements", () => {
	const { setup } = atCafe();
	const R = setup.rel;
	const ids = () => R.interactions("jess_marlow").map((x) => `${x.def.id}:${x.ok}`);
	assert.deepEqual(plain(ids()), ["chat:true", "ask_day:false", "compliment:true", "swap_numbers:false", "flirt:false", "talk_coffee:false"]);
	const r = R.interact("jess_marlow", "chat");
	assert.equal(R.get("jess_marlow", "friendship"), 3);
	assert.match(plain(r.changes).map((c) => c.text).join(" "), /Jess Marlow: Friendship \+3/);
	assert.match(R.interactions("jess_marlow").find((x) => x.def.id === "chat").reasons[0], /Not again for/);

	R.set("jess_marlow", "friendship", 9);
	R.add("jess_marlow", "friendship", 2);
	assert.equal(R.tier("jess_marlow", "friendship").label, "Acquaintance");
	assert.match(setup.ui.takeNotices().join(" "), /Jess Marlow: Acquaintance/);

	R.set("jess_marlow", "friendship", 30);
	R.interact("jess_marlow", "swap_numbers");
	assert.ok(setup.phone.hasContact("jess_marlow"));
	assert.ok(!R.interactions("jess_marlow").some((x) => x.def.id === "swap_numbers"), "once only");
	R.interact("jess_marlow", "flirt");
	assert.equal(R.get("jess_marlow", "romance"), 4);
});

test("being unwashed halves friendship gains", () => {
	const { setup } = atCafe();
	setup.stats.set("hygiene", 10);
	assert.ok(setup.status.has("unwashed"));
	setup.rel.add("jess_marlow", "friendship", 4);
	assert.equal(setup.rel.get("jess_marlow", "friendship"), 2);
});

test("being exhausted makes fixed-length actions take longer", () => {
	const { setup } = atCafe();
	setup.stats.set("energy", 5);
	const r = setup.actions.do("cafe_croissant");
	assert.equal(r.elapsed, 6, "5 minutes × 1.25");
});

test("homework needs you not to be too stressed", () => {
	const { setup } = bootTown();
	setup.stats.set("stress", 90);
	assert.ok(!setup.actions.available().find((a) => a.def.id === "homework").ok);
});

test("phone: messages, unread badge, alarm wakes you", () => {
	const { setup } = atCafe();
	setup.actions.do("ask_about_work");
	assert.ok(setup.phone.hasContact("jess_marlow"), "Jess texts you after the interview");
	assert.equal(setup.phone.unread(), 1);
	assert.equal(setup.phone.badgeTotal(), 1);
	setup.phone.markRead("jess_marlow");
	assert.equal(setup.phone.unread(), 0);

	const g = bootTown();
	const s = g.setup;
	s.phone.setAlarm("06:30");
	s.time.advance(s.time.at(0, "23:00") - s.time.now());
	s.world.moveTo("home_bedroom");
	s.stats.set("bladder", 0);
	const r = s.actions.do("sleep", { mins: 480 });
	assert.equal(s.fmt.time(s.time.now()), "06:30");
	assert.equal(r.interrupted, "alarm");
});
