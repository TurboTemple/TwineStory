// Home life: bills (pocket money, rent), renting a flat and moving your
// things, eviction, furniture delivered home, chores and the curfew.
import assert from "node:assert/strict";
import { test } from "node:test";
import { bootTown, plain } from "./helpers.mjs";

function town() {
	const g = bootTown();
	const s = g.setup;
	for (const id of ["white_tshirt", "blue_jeans", "trainers", "socks"]) {
		const e = s.inventory.entries("wardrobe").find((x) => x.item === id);
		s.clothing.wear(e.uid, { force: true });
	}
	return g;
}

/** Advance to the next given weekday at a time (waiting at home). */
function skipTo(setup, weekday, hm) {
	const { time } = setup;
	let t = time.nextAt(time.now() + 1, hm);
	while (time.weekday(t) !== weekday) t += time.MIN_PER_DAY;
	time.advance(t - time.now());
}

test("you start at the family home, with pocket money every Saturday", () => {
	const { setup } = town();
	assert.equal(setup.housing.current().id, "family_home");
	assert.ok(setup.housing.isHome("home_kitchen"));
	const cash = setup.money.balance("cash");
	skipTo(setup, 6, "09:00");
	assert.equal(setup.money.balance("cash") - cash, 20);
	const today = setup.time.day(setup.time.now());
	assert.equal(setup.bills.nextDue("pocket_money", today + 1), today + 7);
});

test("renting the flat: needs a job and the money; your things move with you", () => {
	const { setup } = town();
	const H = setup.housing;
	assert.match(H.rentBlocks("riverside_flat").join(" "), /A job/);
	setup.storylines.moveTo("barista_job", "trainee", { quiet: true });
	setup.money.earn(500, { to: "bank" });
	assert.deepEqual(plain(H.rentBlocks("riverside_flat")), []);
	const clothes = setup.inventory.entries("wardrobe").length;
	const before = setup.money.balance();
	const r = H.rent("riverside_flat");
	assert.ok(r.ok);
	assert.equal(before - setup.money.balance(), 160 + 80, "deposit and first rent");
	assert.equal(H.current().id, "riverside_flat");
	assert.equal(setup.inventory.entries("wardrobe").length, 0);
	assert.equal(setup.inventory.entries("flat_wardrobe").length, clothes);
	assert.ok(setup.cond.test({ renting: "riverside_flat" }, {}));
	assert.ok(!setup.bills.active("pocket_money"), "no pocket money once you've moved out");

	// The first Monday is covered by the rent paid up front; the next one charges.
	const bank = setup.money.balance();
	skipTo(setup, 1, "09:00");
	assert.equal(setup.money.balance(), bank, "paid up front");
	skipTo(setup, 1, "09:00");
	assert.equal(bank - setup.money.balance(), 80);

	// Leaving properly: the deposit comes back and you move home.
	const left = setup.money.balance();
	H.leave();
	assert.equal(setup.money.balance() - left, 160);
	assert.equal(H.current().id, "family_home");
	assert.equal(setup.inventory.entries("wardrobe").length, clothes);
});

test("two missed rent payments in a row and you're evicted", () => {
	const { setup } = town();
	setup.storylines.moveTo("barista_job", "trainee", { quiet: true });
	setup.money.earn(240, { to: "bank" });
	assert.ok(setup.housing.rent("riverside_flat").ok);
	// Spend the rest so the rent bounces.
	setup.money.pay(setup.money.balance("cash"), { from: ["cash"] });
	setup.money.pay(setup.money.balance("bank"), { from: ["bank"] });
	skipTo(setup, 1, "09:00"); // paid up front
	skipTo(setup, 1, "09:00");
	assert.equal(setup.bills.missed("rent_riverside_flat"), 1);
	assert.ok(setup.phone.thread("dawn_fletcher").length >= 1, "the agent texts you");
	assert.equal(setup.housing.current().id, "riverside_flat");
	skipTo(setup, 1, "09:00");
	assert.equal(setup.housing.current().id, "family_home", "evicted");
	assert.equal(setup.money.balance(), 0, "no deposit back");
});

test("furniture is delivered home and unlocks things", () => {
	const { setup } = town();
	setup.storylines.moveTo("barista_job", "trainee", { quiet: true });
	setup.money.earn(1000, { to: "bank" });
	setup.housing.rent("riverside_flat");
	skipTo(setup, 2, "10:00");
	setup.world.moveTo("arcade_freshway");
	const r = setup.shops.buy("freshway", "tv_set");
	assert.ok(r.ok, plain(r.changes).map((c) => c.text).join(" "));
	assert.match(plain(r.changes).map((c) => c.text).join(" "), /Delivered to your home/);
	assert.equal(setup.inventory.count("tv_set", ["flat_furniture"]), 1);
	setup.world.moveTo("flat_living");
	assert.ok(setup.actions.available().some((a) => a.def.id === "flat_watch_tv" && a.ok));
});

test("chores make your parents happier, once every 12 hours", () => {
	const { setup } = town();
	setup.world.moveTo("home_kitchen");
	const mum = setup.rel.get("mum", "friendship");
	setup.actions.do("chore_washing_up");
	assert.ok(setup.rel.get("mum", "friendship") > mum);
	assert.ok(!setup.actions.available().some((a) => a.def.id === "chore_washing_up"), "gone until the chores reset");
});

test("the curfew: out after 10pm while living at home, Mum texts", () => {
	const { setup } = town();
	setup.world.moveTo("high_street");
	setup.time.advance(setup.time.nextAt(setup.time.now() + 1, "23:30") - setup.time.now());
	assert.equal(setup.events.seen("curfew"), 1);
	assert.match(plain(setup.phone.thread("mum")).at(-1).text, /Where are you/);
});

test("city events: the Saturday market brings its stalls, and the calendar lists it", () => {
	const { setup } = town();
	skipTo(setup, 6, "10:00");
	setup.world.moveTo("high_street");
	assert.ok(setup.cond.test({ happening: "saturday_market" }, {}));
	assert.deepEqual(plain(setup.cityEvents.at().map((e) => e.id)), ["saturday_market"]);
	assert.ok(setup.actions.available().some((a) => a.def.id === "market_browse" && a.ok));
	assert.equal(setup.world.crowd().level, "busy");
	assert.match(setup.world.crowd().text, /market/);
	skipTo(setup, 6, "15:00");
	assert.ok(!setup.actions.available().some((a) => a.def.id === "market_browse"), "packed up by 3pm");
	const day = setup.time.day(setup.time.now());
	const cal = setup.phone.calendar(setup.time.at(day + 1, "00:00"), setup.time.at(day + 8, "00:00"));
	assert.ok(cal.some((e) => /Saturday market/.test(e.text)));
	// A one-off date.
	assert.ok(setup.cityEvents.onDay("fireworks_night", setup.time.dayOf("2026-11-05")));
	assert.ok(!setup.cityEvents.onDay("fireworks_night", setup.time.dayOf("2026-11-06")));
});

test("crowds change through the day", () => {
	const { setup } = town();
	setup.world.moveTo("high_street");
	skipTo(setup, 2, "23:30");
	setup.world.moveTo("high_street");
	assert.equal(setup.world.crowd().level, "quiet");
	assert.ok(setup.cond.test({ crowd: "quiet" }, {}));
});
