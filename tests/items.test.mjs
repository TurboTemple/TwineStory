// Inventory, shops, clothing and the body, in the real town.
import assert from "node:assert/strict";
import { test } from "node:test";
import { bootTown, plain } from "./helpers.mjs";

const at = (setup, day, hm) => setup.time.advance(setup.time.at(day, hm) - setup.time.now());
const uidOf = (setup, place, item) => setup.inventory.entries(place).find((e) => e.item === item)?.uid;

/* ---- Clothing ------------------------------------------------------------ */

test("you wake up in pyjamas and need to get dressed to go out", () => {
	const { setup } = bootTown();
	assert.deepEqual(plain(setup.clothing.wornItems().map((w) => w.item.id).sort()), ["briefs", "pyjamas"]);
	assert.equal(setup.clothing.dressed(), false);
	const walk = setup.travel.options().find((o) => o.mode.id === "walk");
	assert.equal(walk.ok, false);
	assert.deepEqual(plain(walk.reasons), ["You need to get dressed"]);
});

test("getting dressed from the wardrobe; pyjamas go back in it", () => {
	const { setup } = bootTown();
	const t0 = setup.time.now();
	for (const id of ["white_tshirt", "blue_jeans", "socks", "trainers"]) {
		assert.equal(setup.clothing.wear(uidOf(setup, "wardrobe", id)).ok, true, id);
	}
	assert.equal(setup.time.now() - t0, 4, "a minute per item");
	assert.equal(setup.clothing.dressed(), true);
	assert.ok(uidOf(setup, "wardrobe", "pyjamas"), "pyjamas were swapped back into the wardrobe");
	assert.equal(setup.cond.test({ wearing: "blue_jeans" }), true);
	assert.equal(setup.cond.test({ wearing: { tag: "warm" } }), false, "a T-shirt and jeans aren't warm");
});

test("a dress covers top and bottom; you can only change in the right places", () => {
	const { setup } = bootTown();
	setup.inventory.add("summer_dress", 1, "wardrobe");
	setup.clothing.wear(uidOf(setup, "wardrobe", "white_tshirt"));
	setup.clothing.wear(uidOf(setup, "wardrobe", "blue_jeans"));
	setup.clothing.wear(uidOf(setup, "wardrobe", "summer_dress"));
	const worn = plain(setup.clothing.worn().filter((w) => w.item).map((w) => [w.slot.id, w.item.id]));
	assert.deepEqual(worn.filter(([s]) => s === "top" || s === "bottom"), [["top", "summer_dress"], ["bottom", "summer_dress"]]);
	assert.ok(uidOf(setup, "wardrobe", "white_tshirt") && uidOf(setup, "wardrobe", "blue_jeans"));
	setup.world.walkTo("home");
	assert.equal(setup.clothing.canChangeHere(), false);
	assert.equal(setup.clothing.takeOff(setup.clothing.wornItems()[0].uid).ok, false);
});

test("you start with pyjamas and one outfit for going out", () => {
	const { setup } = bootTown();
	assert.deepEqual(plain(setup.inventory.entries("wardrobe").map((e) => e.item).sort()), ["blue_jeans", "socks", "trainers", "white_tshirt"]);
});

test("outfits: save what you're wearing and change back into it", () => {
	const { setup } = bootTown();
	setup.inventory.add("grey_hoodie", 1, "wardrobe");
	setup.inventory.add("joggers", 1, "wardrobe");
	for (const id of ["grey_hoodie", "joggers", "trainers"]) setup.clothing.wear(uidOf(setup, "wardrobe", id));
	setup.clothing.saveOutfit("Lazy day");
	setup.clothing.wear(uidOf(setup, "wardrobe", "pyjamas"));
	assert.equal(setup.clothing.dressed(), false);
	const r = setup.clothing.wearOutfit("Lazy day");
	assert.equal(r.missing, 0);
	assert.equal(setup.cond.test({ wearing: "grey_hoodie" }), true);
	assert.equal(setup.cond.test({ wearing: "pyjamas" }), false);
});

test("clothes switch effects on: cosy, smartly dressed; and items carry their own modifiers", () => {
	const { setup } = bootTown();
	assert.equal(setup.status.has("cosy"), true, "pyjamas are cosy");
	for (const id of ["oxford_shirt", "chinos", "smart_shoes"]) setup.inventory.add(id, 1, "wardrobe");
	for (const id of ["oxford_shirt", "chinos", "smart_shoes"]) setup.clothing.wear(uidOf(setup, "wardrobe", id));
	assert.equal(setup.status.has("cosy"), false);
	assert.equal(setup.status.has("smartly_dressed"), true, "three smart things (two are enough)");
	assert.ok(setup.stats.modifiers("energy").some((m) => m.source === "item:smart_shoes"));
	const r0 = setup.stats.rate("energy");
	setup.clothing.wear(uidOf(setup, "wardrobe", "trainers"));
	assert.equal(setup.stats.rate("energy"), r0 + 0.5, "trainers instead of smart shoes");
	assert.equal(setup.status.has("smartly_dressed"), true, "the shirt and chinos are still two smart things");
	setup.clothing.wear(uidOf(setup, "wardrobe", "blue_jeans"));
	assert.equal(setup.status.has("smartly_dressed"), false, "only one smart thing now");
	// Better clothes lift your mood more (the tier).
	assert.ok(setup.stats.modifiers("mood").some((m) => m.source === "item:oxford_shirt" && m.value === 2), "a good item: Mood +2");
});

/* ---- Shops and the bag ----------------------------------------------------- */

function atShop() {
	const g = bootTown();
	const S = g.setup;
	for (const id of ["white_tshirt", "blue_jeans", "trainers"]) S.clothing.wear(uidOf(S, "wardrobe", id));
	S.world.moveTo("corner_shop");
	return g;
}

test("buying puts the item in your bag and takes the money", () => {
	const { setup } = atShop();
	const r = setup.shops.buy("patels", "chocolate_bar");
	assert.equal(r.ok, true);
	assert.equal(setup.inventory.count("chocolate_bar", ["bag"]), 1);
	assert.equal(setup.money.balance("cash"), 35 - 1);
	setup.shops.buy("patels", "chocolate_bar");
	assert.equal(setup.inventory.entries("bag").length, 1, "stackable items share one entry");
	assert.equal(setup.inventory.count("chocolate_bar", ["bag"]), 2);
});

test("eating from your bag uses it up and changes your stats", () => {
	const { setup } = atShop();
	setup.shops.buy("patels", "sandwich");
	const food = setup.stats.get("food");
	const r = setup.inventory.use(uidOf(setup, "bag", "sandwich"));
	assert.match(r.changes.map((c) => c.text).join(" "), /Eat: Sandwich/);
	assert.ok(setup.stats.get("food") > food + 20);
	assert.equal(setup.inventory.count("sandwich"), 0);
});

test("shops: closed, too expensive, or your bag is full", () => {
	const { setup, vars } = atShop();
	at(setup, 0, "22:30");
	assert.match(setup.shops.buy("patels", "cola").changes[0].text, /closed/);
	at(setup, 1, "08:00");
	vars.money.balances = { cash: 0, bank: 0 };
	assert.match(setup.shops.buy("patels", "cola").changes[0].text, /Not enough money/);
	vars.money.balances.bank = 1000;
	for (let i = 0; i < 8; i++) setup.shops.buy("patels", "groceries"); // 8 × size 2 = 16
	assert.match(setup.shops.buy("patels", "cola").changes[0].text, /Not enough room in your bag/);
});

test("groceries: cooking needs them; put them in the cupboards", () => {
	const { setup } = bootTown();
	setup.world.moveTo("home_kitchen");
	setup.inventory.remove("groceries", 6);
	const a = setup.actions.available().find((x) => x.def.id === "make_sandwich");
	assert.equal(a.ok, false);
	assert.deepEqual(plain(a.reasons), ["Groceries"]);
	setup.inventory.add("groceries", 2, "bag");
	assert.equal(setup.inventory.move(uidOf(setup, "bag", "groceries"), "cupboards").ok, true);
	assert.equal(setup.inventory.count("groceries", ["cupboards"]), 2);
	assert.equal(setup.inventory.move(setup.inventory.add("chocolate_bar", 1).uids[0], "wardrobe").ok, false, "the wardrobe only takes clothes");
	assert.equal(setup.actions.do("make_sandwich").ok, true);
	assert.equal(setup.inventory.count("groceries"), 1);
});

test("buying clothes and changing in the fitting room", () => {
	const { setup } = bootTown();
	for (const id of ["white_tshirt", "blue_jeans", "trainers"]) setup.clothing.wear(uidOf(setup, "wardrobe", id));
	at(setup, 0, "10:00");
	setup.world.moveTo("arcade_urban_thread");
	assert.equal(setup.shops.buy("urban_thread", "denim_shorts").ok, true);
	assert.equal(setup.money.balance(), 215 - 20);
	setup.world.walkTo("urban_thread_fitting");
	assert.equal(setup.clothing.wear(uidOf(setup, "bag", "denim_shorts")).ok, true);
	assert.ok(uidOf(setup, "bag", "blue_jeans"), "jeans went into your bag");
});

/* ---- Body ------------------------------------------------------------------ */

test("body parts read as words: bands for numbers, choices for the rest", () => {
	const { setup } = bootTown();
	assert.equal(setup.body.display("height"), "average");
	assert.equal(setup.body.display("weight"), "average");
	assert.equal(setup.body.display("bust"), "B");
	assert.equal(setup.body.display("hair_length"), "shoulder-length");
	setup.body.set("weight", 300);
	assert.equal(setup.body.get("weight"), 100, "clamped");
	assert.equal(setup.body.display("weight"), "fat");
	setup.body.set("weight", setup.body.bandValue("weight", "slim"));
	assert.equal(setup.body.get("weight"), 25);
	assert.equal(setup.cond.test({ body: { id: "weight", is: "slim" } }), true);
	assert.equal(setup.body.mediaKey("hair_length"), "hair_length/shoulder_length");
	assert.throws(() => setup.body.set("eye_colour", "purple"), /can't be "purple"/);
	assert.throws(() => setup.body.bandValue("weight", "huge"), /no band "huge"/);
});

test("hair grows over time, and Snips can cut and dye it", () => {
	const { setup } = bootTown();
	at(setup, 50, "07:00");
	assert.equal(setup.body.get("hair_length"), 22, "+0.04 cm a day for 50 days");
	for (const id of ["white_tshirt", "blue_jeans", "trainers"]) setup.clothing.wear(uidOf(setup, "wardrobe", id), { force: true });
	at(setup, 50, "10:00");
	setup.world.moveTo("snips");
	assert.equal(setup.actions.do("haircut_short").ok, true);
	assert.equal(setup.body.get("hair_length"), 6);
	setup.actions.do("dye_pink");
	assert.equal(setup.body.get("hair_colour"), "pink");
	assert.equal(setup.actions.available().find((a) => a.def.id === "dye_pink").ok, false, "already pink");
});

test("exercise and big meals nudge your weight", () => {
	const { setup } = bootTown();
	setup.effects.apply([{ body: { weight: -0.4 } }, { body: { weight: 0.3 } }]);
	assert.equal(setup.body.get("weight"), 49.9);
	setup.body.set("weight", 34.9);
	assert.equal(setup.body.display("weight"), "slim");
	setup.effects.apply([{ body: { weight: 0.3 } }]);
	assert.equal(setup.body.display("weight"), "average", "crossed into the next band");
});
