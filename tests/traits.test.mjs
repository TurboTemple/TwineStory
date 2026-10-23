// Traits (earned through habits) and the move to whole-pound money.
import assert from "node:assert/strict";
import { test } from "node:test";
import { bootTown } from "./helpers.mjs";

/** A coffee at home at 08:00 on a given day (then back to bed, so nothing else gets in the way). */
function coffeeOnDay(setup, day) {
	const { time } = setup;
	setup.world.moveTo("home_kitchen");
	time.advance(time.at(day, "08:00") - time.now());
	for (const [k, v] of Object.entries({ food: 70, drink: 70, bladder: 0, energy: 80, hygiene: 80 })) setup.stats.set(k, v);
	setup.actions.do("make_coffee");
}

test("five days of coffee in a row makes you Caffeine addicted", () => {
	const { setup } = bootTown();
	for (let d = 0; d < 4; d++) coffeeOnDay(setup, d);
	assert.equal(setup.traits.has("caffeine_addicted"), false, "four days isn't enough");
	coffeeOnDay(setup, 4);
	assert.equal(setup.traits.has("caffeine_addicted"), true);
	assert.match(setup.ui.takeNotices().join(" "), /New trait: Caffeine addicted/);
	assert.ok(setup.cond.test({ trait: "caffeine_addicted" }, {}));
});

test("a gap in the streak starts the count again", () => {
	const { setup } = bootTown();
	for (const d of [0, 1, 2, 4, 5, 6]) coffeeOnDay(setup, d);
	assert.equal(setup.traits.has("caffeine_addicted"), false, "day 3 was missed");
	coffeeOnDay(setup, 7);
	coffeeOnDay(setup, 8);
	assert.equal(setup.traits.has("caffeine_addicted"), true, "days 4–8");
});

test("addicted: a day without coffee means withdrawal, which coffee fixes", () => {
	const { setup } = bootTown();
	setup.traits.gain("caffeine_addicted");
	const { time } = setup;
	// No coffee on day 0 or day 1: withdrawal from midnight.
	time.advance(time.at(2, "08:00") - time.now());
	assert.equal(setup.status.has("caffeine_withdrawal"), true);
	assert.ok(setup.stats.modifiers("mood").some((m) => m.source === "caffeine_withdrawal"));
	coffeeOnDay(setup, 2);
	assert.equal(setup.status.has("caffeine_withdrawal"), false, "the coffee cleared it");
	// Had one yesterday: no withdrawal today.
	time.advance(time.at(3, "08:00") - time.now());
	assert.equal(setup.status.has("caffeine_withdrawal"), false);
});

test("a week off coffee and the habit fades", () => {
	const { setup } = bootTown();
	for (let d = 0; d < 5; d++) coffeeOnDay(setup, d);
	assert.equal(setup.traits.has("caffeine_addicted"), true);
	setup.time.advance(setup.time.at(11, "08:00") - setup.time.now());
	assert.equal(setup.traits.has("caffeine_addicted"), false);
});

test("Gym regular: exercise on 4 days out of 7, and it lifts your mood", () => {
	const { setup } = bootTown();
	for (const d of [0, 2, 4]) {
		setup.time.advance(setup.time.at(d, "07:00") - setup.time.now());
		setup.traits.record("exercise");
	}
	assert.equal(setup.traits.has("gym_regular"), false);
	setup.time.advance(setup.time.at(6, "07:00") - setup.time.now());
	setup.traits.record("exercise");
	assert.equal(setup.traits.has("gym_regular"), true);
	assert.ok(setup.stats.modifiers("mood").some((m) => m.source === "trait:gym_regular" && m.value === 3));
});

test("traits are kept apart from effects", () => {
	const { setup } = bootTown();
	setup.traits.gain("gym_regular");
	assert.equal(setup.status.has("gym_regular"), false);
	assert.ok(setup.traits.list().some((d) => d.id === "gym_regular"));
	assert.ok(!setup.status.list().some((s) => s.def.id === "gym_regular"));
});

test("old saves in pence become whole pounds", () => {
	const { setup } = bootTown();
	const old = {
		meta: { schema: { core: 1, money: 1, journal: 1 }, schemaVersion: 4, flags: {}, counters: {} },
		money: { balances: { cash: 3525, bank: 18049 }, log: [{ t: 0, amount: -180, account: "cash", reason: "Bus" }] },
		journal: { days: { 0: { earned: 6000, spent: 455 } } },
	};
	setup.save.migrate(old);
	assert.deepEqual({ ...old.money.balances }, { cash: 35, bank: 180 });
	assert.equal(old.money.log[0].amount, -2);
	assert.equal(old.journal.days[0].earned, 60);
	assert.equal(old.journal.days[0].spent, 5);
	assert.ok("traits" in old, "the new traits slice is added");
	setup.save.migrate(old);
	assert.equal(old.money.balances.cash, 35, "running it again changes nothing");
});

test("prices follow what things give you", () => {
	const { setup } = bootTown();
	const price = (id) => setup.registry.get("item", id).price;
	assert.equal(price("white_tshirt"), 10);
	assert.equal(price("grey_hoodie"), 20);
	assert.equal(price("blue_jeans"), 50);
	assert.equal(price("wool_coat"), 100);
	for (const it of setup.registry.all("item")) assert.ok(Number.isInteger(it.price), `${it.id}: whole pounds`);
	for (const a of setup.registry.all("action")) {
		for (const c of a.costs) if (c.money) assert.ok(Number.isInteger(c.money.amount), `${a.id}: whole pounds`);
	}
});
