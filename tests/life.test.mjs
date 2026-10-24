// Weather, the daily summary, and ambient lines.
import assert from "node:assert/strict";
import { test } from "node:test";
import { bootTown, plain } from "./helpers.mjs";

function dress(setup, ids = ["white_tshirt", "blue_jeans", "trainers", "socks"]) {
	for (const id of ids) {
		const e = setup.inventory.entries("wardrobe").find((x) => x.item === id);
		setup.clothing.wear(e.uid, { force: true });
	}
}

test("weather is the same every time you ask, and changes day to day", () => {
	const { setup } = bootTown();
	const w = setup.weather;
	const a = w.onDay(3);
	assert.deepEqual({ ...w.onDay(3) }, { ...a });
	const kinds = new Set();
	for (let d = 0; d < 60; d++) {
		const x = w.onDay(d);
		kinds.add(x.kind);
		assert.ok(Number.isInteger(x.temp));
	}
	assert.ok(kinds.size >= 3, "a mix of weather over two months");
	// Another seed, another sky.
	const b = bootTown({ seed: 999 }).setup.weather;
	const differs = Array.from({ length: 20 }, (_, d) => d).some((d) => b.onDay(d).kind !== w.onDay(d).kind);
	assert.ok(differs);
});

test("too cold outside without anything warm; wet without a waterproof", () => {
	const { setup } = bootTown();
	dress(setup);
	const W = setup.weather;
	// Find a cold, wet day, and go there.
	let day = 0;
	while (!(W.onDay(day).wet && W.isCold(setup.time.at(day, "12:00")))) day++;
	setup.time.advance(setup.time.at(day, "12:00") - setup.time.now());
	setup.world.moveTo("elm_road");
	assert.ok(setup.status.has("cold"), `cold at ${W.onDay(day).temp}°C`);
	assert.ok(setup.status.has("wet"));
	setup.inventory.add("puffer_jacket", 1, "wardrobe");
	dress(setup, ["puffer_jacket"]);
	assert.ok(!setup.status.has("wet"), "the puffer is waterproof");
	assert.ok(!setup.status.has("cold"), "and warm: one warm thing is enough");
	setup.world.moveTo("home_living_room");
	assert.ok(!setup.status.has("cold"), "fine indoors");
});

test("sleeping past midnight shows the day's summary", () => {
	const { setup, played } = bootTown();
	setup.time.advance(setup.time.at(0, "22:00") - setup.time.now());
	setup.money.earn(10, { reason: "test" });
	setup.world.moveTo("home_bedroom");
	setup.stats.set("bladder", 0);
	setup.flow.perform(() => setup.actions.do("sleep", { mins: "07:00" }));
	assert.equal(played.at(-1), "Journal_Summary");
	assert.equal(setup.journal.summaryDay, 0);
	assert.match(setup.journal.summary(0).join(" "), /Money: \+£10\./);
	// A nap that doesn't cross midnight doesn't: it gets the action screen.
	setup.flow.perform(() => setup.actions.do("sleep", { mins: 60 }));
	assert.equal(played.at(-1), "Actions_Scene");
});

test("the action screen: shown after an action, a lesson, a shift or a chat, unless an event takes over", () => {
	const { setup, played } = bootTown();
	setup.world.moveTo("home_bathroom");
	setup.flow.perform(() => setup.actions.do("shower"));
	assert.equal(played.at(-1), "Actions_Scene");
	const s = setup.flow.illustration();
	assert.equal(s.title, "Have a shower");
	assert.deepEqual(plain(s.media), { type: "action", id: "shower" });
	assert.equal(s.passage, "Act_shower");
	// Continue goes back to where you were.
	setup.flow.continue();
	assert.equal(played.at(-1), "Here");
	// Something more important (an event) wins, and there's no action screen.
	setup.flow.perform(() => {
		setup.actions.do("shower");
		setup.flow.request("Ev_test", setup.flow.PRIORITY.event);
	});
	assert.equal(played.at(-1), "Ev_test");
	assert.equal(setup.flow.illustration(), null);
	// A chat: the screen first, then back to the person.
	setup.time.advance(setup.time.at(2, "12:10") - setup.time.now());
	setup.world.moveTo("academy_canteen");
	setup.flow.perform(() => setup.rel.interact("priya_shah", "chat"));
	assert.equal(played.at(-1), "Actions_Scene");
	assert.deepEqual(plain(setup.flow.illustration().passage), ["Act_talk_chat_priya_shah", "Act_talk_chat"]);
	setup.flow.continue();
	assert.equal(played.at(-1), "Npcs_Sheet");
	// A lesson (Friday starts with Maths).
	setup.world.moveTo("home_bedroom");
	setup.time.advance(setup.time.at(3, "08:40") - setup.time.now());
	assert.equal(setup.fmt.time(setup.time.now()), "08:40");
	setup.world.moveTo("academy");
	setup.education.startDay("academy");
	setup.flow.perform(() => setup.education.attend("academy"));
	assert.equal(played.at(-1), "Actions_Scene");
	assert.equal(setup.flow.illustration().passage, "Act_lesson_maths");
});

test("ambient lines react to the weather and time, and stay put for the hour", () => {
	const { setup } = bootTown();
	const line = setup.world.ambientLine("elm_road");
	assert.equal(setup.world.ambientLine("elm_road"), line);
	let day = 0;
	while (!setup.weather.onDay(day).wet) day++;
	assert.match(setup.world.ambientLine("home_bedroom", setup.time.at(day, "12:00")), /Rain/);
	assert.equal(setup.world.ambientLine("corner_shop"), null, "no lines, no ambience");
});
