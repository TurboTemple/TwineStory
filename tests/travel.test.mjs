// Travel: walking step by step, buses along their line, taxis to hubs, fares.
import assert from "node:assert/strict";
import { test } from "node:test";
import { boot, plain } from "./helpers.mjs";

const game = (opts) => boot({ includeTest: true, ...opts });
const opts = (setup, mode) => plain(setup.travel.options().filter((o) => o.mode.id === mode).map((o) => [o.to, o.mins, o.cost]));

test("walking only reaches neighbouring places", () => {
	const { setup } = game();
	assert.deepEqual(opts(setup, "test_walk"), [["test_neighbour", 5, 0], ["test_high_street", 10, 0]]);
});

test("the bus is only available at stops, and rides through stops to any stop on the line", () => {
	const { setup } = game();
	assert.deepEqual(opts(setup, "test_bus"), [], "no bus from home");
	setup.travel.go("test_high_street", "test_walk");
	assert.deepEqual(opts(setup, "test_bus"), [["test_city_centre", 15, 200], ["test_park", 25, 200]]);
	const park = setup.travel.options().find((o) => o.mode.id === "test_bus" && o.to === "test_park");
	assert.deepEqual(plain(park.legs.map((l) => l.to)), ["test_city_centre", "test_park"]);
});

test("a taxi goes from anywhere to a hub, in a quarter of the walking time, on the meter", () => {
	const { setup } = game();
	// Walking home → city centre is 10 + 40 = 50 minutes; a taxi takes ceil(12.5) = 13.
	assert.deepEqual(opts(setup, "test_taxi"), [["test_high_street", 3, 390], ["test_city_centre", 13, 690]]);
});

test("travelling pays the fare, takes the time and arrives", () => {
	const { setup } = game();
	setup.travel.go("test_high_street", "test_walk");
	const t0 = setup.time.now();
	const cash = setup.money.balance("test_cash");
	const r = setup.travel.go("test_park", "test_bus");
	assert.equal(r.ok, true);
	assert.equal(r.arrived, true);
	assert.equal(setup.time.now() - t0, 25);
	assert.equal(setup.world.loc(), "test_park");
	assert.equal(setup.money.balance("test_cash"), cash - 200);
	assert.match(r.changes[0].text, /Bus to Test Park \(£2\.00\): 25 minutes/);
});

test("you can't travel if you can't pay; no time passes", () => {
	const { setup, vars } = game();
	vars.money.balances = { test_cash: 100, test_bank: 0 };
	const o = setup.travel.options().find((x) => x.mode.id === "test_taxi" && x.to === "test_city_centre");
	assert.equal(o.ok, false);
	assert.match(o.reasons[0], /Not enough money \(£6\.90 needed\)/);
	const t0 = setup.time.now();
	const r = setup.travel.go("test_city_centre", "test_taxi");
	assert.equal(r.ok, false);
	assert.equal(setup.time.now(), t0);
	assert.equal(setup.world.loc(), "test_home");
});

test("a journey interrupted part-way leaves you at the last stop reached", () => {
	const { setup, played } = game();
	setup.travel.go("test_high_street", "test_walk");
	setup.events.force("test_bus_breakdown", true);
	const t0 = setup.time.now();
	const r = setup.flow.perform(() => setup.travel.go("test_park", "test_bus"));
	assert.equal(r.arrived, false);
	assert.equal(r.interrupted, "breakdown");
	assert.equal(setup.world.loc(), "test_city_centre");
	assert.equal(setup.time.now() - t0, 15);
	assert.equal(played.at(-1), "Ev_test_bus_breakdown");
	assert.match(r.changes[0].text, /stopped at Test City Centre after 15 minutes/);
});

test("an interrupting event can move you somewhere else instead", () => {
	const { setup } = game();
	setup.travel.go("test_high_street", "test_walk");
	setup.bus.on("travel:checkpoint", (p) => {
		setup.effects.run([{ moveTo: "test_home" }, { interrupt: "detour" }], p.ctx, p.result);
	});
	const r = setup.travel.go("test_park", "test_bus");
	assert.equal(r.interrupted, "detour");
	assert.equal(setup.world.loc(), "test_home");
});

test("money: pay uses the first account that can cover it; earn and log", () => {
	const { setup, vars } = game();
	assert.equal(setup.money.balance(), 12000);
	assert.deepEqual(plain(setup.money.pay(2500)), { ok: true, account: "test_bank" }, "cash (£20) can't cover £25");
	assert.equal(setup.money.pay(999999).ok, false);
	setup.money.earn(500, { reason: "test" });
	assert.equal(setup.money.balance("test_cash"), 2500);
	assert.equal(vars.money.log.length, 2);
	assert.equal(setup.cond.test({ money: { min: 9999 } }), true);
	const r = setup.effects.apply([{ money: { amount: -100 } }, { money: { amount: 50 } }]);
	assert.deepEqual(plain(r.changes.map((c) => c.text)), ["−£1.00", "+£0.50"]);
});

test("you don't meet people at the place you left while you're on the way", () => {
	const { setup } = game();
	setup.world.moveTo("test_clinic");
	setup.time.advance(setup.time.at(0, "08:55") - setup.time.now()); // nobody in until 09:00
	assert.equal(setup.npcs.hasMet("test_therapist"), false);
	setup.travel.go("test_city_centre", "test_taxi"); // 12 minutes: you've left before they arrive
	assert.equal(setup.fmt.time(setup.time.now()), "09:07");
	assert.equal(setup.npcs.hasMet("test_therapist"), false);
});
