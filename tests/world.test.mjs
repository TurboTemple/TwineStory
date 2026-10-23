// Sub-locations, opening hours, and actions tied to rooms and tags.
import assert from "node:assert/strict";
import { test } from "node:test";
import { boot, plain } from "./helpers.mjs";

/** The test fixture plus a pub with rooms on the test map. */
function game() {
	return boot({
		includeTest: true,
		before(setup) {
			(setup.__testContent ??= []).push((R) => {
				R.define("location", { id: "t_pub", name: "Test Pub", hours: [{ from: "11:00", to: "23:00" }] });
				R.define("location", { id: "t_pub_bar", name: "Bar", parent: "t_pub", innerMins: 2 });
				R.define("location", { id: "t_pub_toilets", name: "Toilets", parent: "t_pub", tags: ["toilet"] });
				R.define("location", { id: "t_pub_cubicle", name: "Cubicle", parent: "t_pub_toilets" });
				R.define("route", { id: "t_walk_pub", network: "test_walk", from: "test_high_street", to: "t_pub", mins: 3 });
				R.define("action", { id: "t_pint", label: "Pint", at: "t_pub_bar", mins: 5, costs: [{ money: { amount: -500 } }] });
				R.define("action", { id: "t_wee", label: "Wee", atTag: "toilet", mins: 2 });
				R.define("action", { id: "t_nap", label: "Nap", at: "test_home", durations: [30, "08:00"] });
			});
		},
	});
}

const noon = (setup) => setup.time.advance(setup.time.at(0, "12:00") - setup.time.now());

test("chain, site and exit time", () => {
	const { setup } = game();
	assert.deepEqual(plain(setup.world.chain("t_pub_cubicle")), ["t_pub_cubicle", "t_pub_toilets", "t_pub"]);
	assert.equal(setup.world.site("t_pub_cubicle"), "t_pub");
	assert.equal(setup.world.exitMins("t_pub_cubicle"), 2);
	assert.equal(setup.world.within("t_pub_cubicle", "t_pub"), true);
	assert.equal(setup.world.within("t_pub", "t_pub_bar"), false);
});

test("rooms follow their parent's opening hours", () => {
	const { setup } = game();
	assert.equal(setup.world.isOpen("t_pub_bar"), false, "07:00");
	noon(setup);
	assert.equal(setup.world.isOpen("t_pub_bar"), true);
});

test("walking between rooms takes their time; closed rooms are locked", () => {
	const { setup } = game();
	setup.world.moveTo("t_pub");
	const near = setup.world.nearby();
	assert.deepEqual(plain(near.map((n) => [n.def.id, n.ok])), [["t_pub_bar", false], ["t_pub_toilets", false]]);
	const r = setup.world.walkTo("t_pub_bar");
	assert.match(r.changes[0].text, /closed/);
	noon(setup);
	setup.world.walkTo("t_pub_bar");
	assert.equal(setup.world.loc(), "t_pub_bar");
	assert.equal(setup.fmt.time(setup.time.now()), "12:02");
	assert.deepEqual(plain(setup.world.nearby().map((n) => [n.def.id, n.kind])), [["t_pub", "out"], ["t_pub_toilets", "side"]]);
});

test("at closing time you're shown out to the street-level place", () => {
	const { setup } = game();
	setup.world.moveTo("t_pub_bar");
	setup.time.advance(1);
	assert.equal(setup.world.loc(), "t_pub", "shut until 11:00, so you're moved out as soon as time passes");
	noon(setup);
	setup.world.walkTo("t_pub_bar");
	setup.time.advance(setup.time.at(0, "22:59") - setup.time.now());
	assert.equal(setup.world.loc(), "t_pub_bar");
	setup.time.advance(1);
	assert.equal(setup.world.loc(), "t_pub");
});

test("travelling from a room walks you out first", () => {
	const { setup } = game();
	noon(setup);
	setup.world.moveTo("t_pub_cubicle");
	assert.ok(setup.travel.options().some((o) => o.to === "test_high_street"));
	const t0 = setup.time.now();
	setup.travel.go("test_high_street", "test_walk");
	assert.equal(setup.time.now() - t0, 2 + 3);
	assert.equal(setup.world.loc(), "test_high_street");
});

test("actions: only offered where they belong, by place or by tag", () => {
	const { setup } = game();
	noon(setup);
	setup.world.moveTo("t_pub_toilets");
	assert.deepEqual(plain(setup.actions.available().map((a) => a.def.id)), ["t_wee"]);
	assert.throws(() => setup.actions.do("t_pint"), /isn't offered/);
});

test("actions: locked when closed, or when you can't afford them", () => {
	const { setup, vars } = game();
	setup.world.moveTo("t_pub_bar");
	assert.deepEqual(plain(setup.actions.available()[0].reasons), ["It's open"]);
	noon(setup);
	setup.world.moveTo("t_pub_bar");
	vars.money.balances = { test_cash: 100, test_bank: 0 };
	const a = setup.actions.available()[0];
	assert.equal(a.ok, false);
	assert.deepEqual(plain(a.reasons), ["£5.00 to pay"]);
	vars.money.balances.test_bank = 1000;
	const r = setup.actions.do("t_pint");
	assert.equal(r.ok, true);
	assert.equal(setup.money.balance(), 600);
});

test("durations can be 'until a time'", () => {
	const { setup } = game();
	setup.actions.do("t_nap", { mins: "08:00" });
	assert.equal(setup.fmt.time(setup.time.now()), "08:00");
	setup.actions.do("t_nap", { mins: "08:00" });
	assert.equal(setup.time.now(), setup.time.at(1, "08:00"), "next day when it's already 08:00");
});
