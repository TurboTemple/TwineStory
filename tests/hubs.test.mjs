// The bus hubs added for the beach, South Town, the Business District and
// the park: what's there, and the rules each place has.
import assert from "node:assert/strict";
import { test } from "node:test";
import { bootTown } from "./helpers.mjs";

/** A town game, dressed to go out, standing at `loc` at the given day and time. */
function at(loc, { day = 0, hm = "12:00", wear = ["white_tshirt", "blue_jeans", "trainers", "socks"] } = {}) {
	const g = bootTown();
	const s = g.setup;
	for (const id of wear) s.clothing.wear(s.inventory.entries("wardrobe").find((x) => x.item === id).uid, { force: true });
	const t = s.time.at(day, hm);
	if (t > s.time.now()) s.time.advance(t - s.time.now());
	s.world.moveTo(loc);
	return s;
}

const action = (s, id) => s.actions.available().find((a) => a.def.id === id);
const door = (s, id) => s.world.nearby().find((n) => n.def.id === id);
/** Give the PC an item and wear it. */
function put(s, id) {
	s.inventory.add(id);
	s.clothing.wear(s.inventory.entries("bag").find((x) => x.item === id).uid, { force: true });
}
/** Fix the weather for the whole test. */
const weather = (s, w) => (s.weather.onDay = () => ({ label: w.kind, icon: "", wet: false, ...w }));

test("every new hub is a bus stop that taxis can reach", () => {
	const s = at("high_street");
	for (const id of ["beach", "south_town", "business_district", "riverside_park"]) {
		const loc = s.registry.get("location", id);
		assert.ok(loc.tags.includes("hub") && loc.tags.includes("bus_stop"), id);
		assert.ok(s.registry.query("route", (r) => r.network === "bus3" && (r.from === id || r.to === id)).length, `${id} is on Route 3`);
	}
});

test("the park: a walk, exercise in gym kit, and people-watching", () => {
	const s = at("riverside_park");
	assert.ok(action(s, "park_walk").ok);
	assert.ok(action(s, "park_watch_people").ok);
	assert.equal(action(s, "park_exercise").ok, false, "jeans aren't gym kit");
	put(s, "sports_top");
	assert.ok(action(s, "park_exercise").ok, "sports top and trainers");
	const before = s.storylines.count("fitness", "workouts");
	s.actions.do("park_exercise");
	assert.equal(s.storylines.count("fitness", "workouts"), before + 0.75, "counts towards Getting fit (45 minutes)");
});

test("the cash machine moves money from your bank card to cash", () => {
	const s = at("business_district");
	const cash = s.money.balance("cash");
	const bank = s.money.balance("bank");
	s.actions.do("cash_machine_20");
	assert.equal(s.money.balance("cash"), cash + 20);
	assert.equal(s.money.balance("bank"), bank - 20);
});

test("the film studio's sound stage is for cast and crew", () => {
	const s = at("grumman_studios", { day: 1, hm: "10:00" });
	assert.equal(door(s, "grumman_stage").ok, false);
	assert.ok(door(s, "grumman_casting").ok);
	s.effects.apply([{ flag: "grumman_pass" }]);
	assert.ok(door(s, "grumman_stage").ok);
});

test("Club Neon: open late Thursday to Saturday; pay at the door, no sportswear inside", () => {
	// Day 0 is Tuesday 1 September 2026, so day 3 is Friday.
	const s = at("south_town", { day: 3, hm: "23:00" });
	assert.ok(s.world.isOpen("club_neon"));
	assert.ok(s.world.isOpen("club_neon", s.time.at(4, "02:00")), "Saturday 2am is still Friday night");
	assert.equal(s.world.isOpen("club_neon", s.time.at(5, "02:00")), true, "Sunday 2am is Saturday night");
	assert.equal(s.world.isOpen("club_neon", s.time.at(6, "02:00")), false, "Sunday night is closed");
	s.world.moveTo("club_neon");
	assert.equal(door(s, "neon_dance_floor").ok, false, "not stamped yet");
	s.actions.do("neon_entry");
	assert.ok(s.status.has("neon_stamp"));
	assert.equal(door(s, "neon_dance_floor").ok, false, "still in trainers");
	put(s, "boots");
	assert.ok(door(s, "neon_dance_floor").ok);
	assert.ok(s.npcs.peopleAt("club_neon").includes("marcus_doyle"), "the bouncer is on the door");
});

test("the sea needs swimwear; you can buy it at the Surf Shack", () => {
	const s = at("beach_sand", { hm: "11:00" });
	assert.equal(door(s, "beach_sea").ok, false);
	assert.ok(s.registry.query("item", (i) => i.shops.includes("surf_shack") && i.attributes.includes("swimwear")).length >= 2);
	put(s, "black_swimsuit");
	assert.ok(door(s, "beach_sea").ok);
});

test("sunbathing needs sun, and burns you without sun cream", () => {
	const s = at("beach_sand", { hm: "11:00" });
	weather(s, { kind: "cloudy", temp: 16 });
	assert.equal(action(s, "sunbathe").ok, false);
	weather(s, { kind: "sunny", temp: 24 });
	s.actions.do("sunbathe");
	assert.ok(s.status.has("sun_kissed"));
	assert.ok(s.status.has("sunburnt"), "no sun cream");

	const t = at("beach_sand", { hm: "11:00" });
	weather(t, { kind: "sunny", temp: 24 });
	t.inventory.add("sun_cream");
	t.inventory.use(t.inventory.entries("bag").find((x) => x.item === "sun_cream").uid);
	t.actions.do("sunbathe");
	assert.equal(t.status.has("sunburnt"), false);
});

test("Scarlet's is over-18s only, and the club and shop staff are all adults", () => {
	const s = at("south_town");
	assert.deepEqual({ ...s.registry.get("location", "scarlets").entry }, { ageAtLeast: 18, text: "Over-18s only" });
	for (const id of ["marcus_doyle", "kira_novak", "leon_hart", "roxy_vale", "mehmet_arslan", "kai_mendes", "bev_tolley", "tessa_wade", "nina_cross", "victor_grumman", "martin_ellery", "gavin_marsh", "edna_pike"]) {
		assert.ok(s.npcs.get(id).age >= 18, id);
	}
});

test("Keys & Co moved to the Business District and still lists the flat", () => {
	const s = at("keys_lettings", { day: 1, hm: "10:00" });
	assert.equal(s.registry.get("location", "keys_lettings").district, "business");
	assert.ok(s.npcs.peopleAt("keys_lettings").includes("dawn_fletcher"));
});
