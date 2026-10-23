// The key story characters: each storyline starts when you meet its
// character (or first go online), shows its start screen, and its
// repeatable task adds to the storyline's progression counter.
import assert from "node:assert/strict";
import { test } from "node:test";
import { bootTown, boot, plain } from "./helpers.mjs";

function town() {
	const g = bootTown();
	const s = g.setup;
	for (const id of ["white_tshirt", "blue_jeans", "trainers", "socks"]) {
		const e = s.inventory.entries("wardrobe").find((x) => x.item === id);
		s.clothing.wear(e.uid, { force: true });
	}
	return g;
}

/** Advance to the next given weekday at a time. */
function skipTo(setup, weekday, hm) {
	const { time } = setup;
	setup.world.moveTo("home_bedroom");
	let t = time.nextAt(time.now() + 1, hm);
	while (time.weekday(t) !== weekday) t += time.MIN_PER_DAY;
	time.advance(t - time.now());
}

test("Dennis: the first session starts The Hypnotherapist and counts; meeting him doesn't", () => {
	const { setup, played } = town();
	setup.effects.apply([{ flag: "hypnotherapy_unlocked" }]);
	skipTo(setup, 1, "11:00");
	setup.flow.perform(() => setup.world.moveTo("calm_waters_room"));
	assert.ok(!setup.storylines.started("hypnotherapist"), "meeting Dennis doesn't start it");
	setup.flow.perform(() => setup.actions.do("hypnotherapist_session"));
	assert.equal(setup.storylines.stage("hypnotherapist"), "start");
	assert.ok(played.includes("Ev_hypnotherapist_start"), "the start screen shows");
	assert.equal(setup.storylines.progression("hypnotherapist"), 1, "the first session counts");
	setup.actions.do("hypnotherapist_session");
	assert.equal(setup.storylines.progression("hypnotherapist"), 2);
	assert.ok(setup.cond.test({ progression: { id: "hypnotherapist", min: 2 } }, {}));
});

test("hypnotherapy unlocks after more than three late nights: your parents send you", () => {
	const { setup, played } = town();
	const session = () => setup.actions.available().find((a) => a.def.id === "hypnotherapist_session");
	skipTo(setup, 1, "11:00");
	setup.world.moveTo("calm_waters_room");
	assert.ok(!session(), "not offered yet");
	// Stay out past 10pm four nights running, going home each time.
	for (let night = 0; night < 4; night++) {
		setup.world.moveTo("high_street");
		setup.time.advance(setup.time.nextAt(setup.time.now() + 1, "22:30") - setup.time.now());
		setup.flow.perform(() => setup.world.moveTo("home"));
		if (night < 3) assert.ok(!setup.cond.test({ flag: "hypnotherapy_unlocked" }, {}), `not after ${night + 1}`);
		setup.time.advance(setup.time.nextAt(setup.time.now() + 1, "09:00") - setup.time.now());
	}
	assert.equal(setup.vars().meta.counters.late_home, 4);
	assert.ok(played.includes("Ev_hypnotherapy_sent"));
	assert.equal(setup.events.seen("hypnotherapy_sent"), 1);
	skipTo(setup, 1, "11:00");
	setup.world.moveTo("calm_waters_room");
	assert.ok(session()?.ok, "sessions are unlocked");
});

test("the cosplay club: invited at school by a random event, starts when you go", () => {
	const { setup, played } = town();
	const club = () => setup.actions.available().find((a) => a.def.id === "cosplay_club_meeting");
	skipTo(setup, 2, "19:00");
	setup.world.moveTo("community_hall");
	assert.ok(!club(), "not offered before you're invited");
	assert.ok(!setup.storylines.started("cosplay_club"), "meeting them doesn't start it");
	// Force one invitation (it's random) and arrive at school.
	setup.events.force("cosplay_invite_arvel", true);
	skipTo(setup, 3, "09:00");
	setup.flow.perform(() => setup.world.moveTo("academy"));
	assert.equal(played.at(-1), "Ev_cosplay_invite_arvel");
	assert.ok(setup.npcs.hasMet("arvel"));
	setup.events.force("cosplay_invite_arvel", null);
	skipTo(setup, 4, "19:00");
	setup.world.moveTo("community_hall");
	assert.ok(club().ok);
	setup.flow.perform(() => setup.actions.do("cosplay_club_meeting"));
	assert.equal(setup.storylines.stage("cosplay_club"), "start");
	assert.ok(played.includes("Ev_cosplay_club_start"));
	assert.equal(setup.storylines.progression("cosplay_club"), 1);
});

test("the invitation happens once, whichever member asks", () => {
	const { setup } = town();
	for (let i = 0; i < 60; i++) {
		skipTo(setup, 1 + (i % 5), "09:00");
		setup.flow.perform(() => setup.world.moveTo("academy"));
	}
	const seen = ["john", "arvel", "micheal"].reduce((n, w) => n + setup.events.seen(`cosplay_invite_${w}`), 0);
	assert.equal(seen, 1);
});

test("Mark Grant: signing up for volleyball starts The Gym Teacher; classes count", () => {
	const { setup, played } = town();
	skipTo(setup, 2, "15:20");
	setup.flow.perform(() => setup.world.moveTo("academy_sports_hall"));
	assert.ok(!setup.storylines.started("gym_teacher"), "meeting him doesn't start it");
	setup.flow.perform(() => setup.actions.do("volleyball_sign_up"));
	assert.equal(setup.storylines.stage("gym_teacher"), "start");
	assert.ok(played.includes("Ev_gym_teacher_start"));
	assert.ok(!setup.actions.available().some((a) => a.def.id === "volleyball_sign_up"), "only once");
	setup.actions.do("volleyball_class");
	assert.equal(setup.storylines.progression("gym_teacher"), 1);
	assert.equal(setup.npcs.get("mark").name, "Mark Grant");
	assert.equal(setup.registry.get("subject", "pe").teacher, "Mr Grant");
});

test("Lenny owns The Daily Grind: getting the job starts his story; shifts count", () => {
	const { setup } = town();
	assert.ok(!setup.registry.has("location", "lennys"), "only one coffee shop");
	assert.equal(setup.npcs.get("lenny").schedule[0].at, "grind_seating");
	skipTo(setup, 6, "08:30");
	setup.flow.perform(() => setup.world.moveTo("grind_counter"));
	assert.ok(!setup.storylines.started("coffee_shop"));
	setup.flow.perform(() => setup.actions.do("ask_about_work"));
	assert.equal(setup.storylines.stage("coffee_shop"), "start");
	assert.equal(setup.events.seen("coffee_shop_start"), 1);
	setup.jobs.work("grind_barista");
	assert.equal(setup.storylines.progression("coffee_shop"), 1);
});

test("the MMO clan starts the first time you play online", () => {
	const { setup, played } = town();
	setup.flow.perform(() => setup.world.moveTo("home_bedroom"));
	setup.flow.perform(() => setup.actions.do("mmo_clan_play"));
	assert.equal(setup.storylines.stage("mmo_clan"), "start");
	assert.equal(played.at(-1), "Ev_mmo_clan_start");
	assert.ok(setup.npcs.hasMet("wolfhowl"));
	setup.actions.do("mmo_clan_play");
	assert.equal(setup.storylines.progression("mmo_clan"), 1);
	assert.equal(setup.npcs.get("wolfhowl").pronouns, "he/him");
});

test("the mystery donator: a random email while streaming starts it", () => {
	const { setup } = town();
	setup.world.moveTo("home_bedroom");
	let n = 0;
	while (!setup.storylines.started("mystery_donator") && n < 60) {
		setup.stats.set("energy", 100);
		setup.actions.do("go_live");
		n++;
	}
	assert.ok(n > 0 && n < 60);
	assert.equal(setup.storylines.stage("mystery_donator"), "start");
	assert.equal(plain(setup.phone.emails())[0].from, "mystery_donator");
	assert.equal(setup.phone.unreadEmail(), 1);
	assert.equal(setup.phone.unread(), 0, "an email isn't a text");
	assert.ok(!setup.phone.hasContact("mystery_donator"), "not in your contacts");
	setup.actions.do("go_live");
	assert.equal(setup.storylines.progression("mystery_donator"), 1);
});

test("storyline begin and progression on throwaway data", () => {
	const { setup } = boot({
		before(s) {
			(s.__testContent ??= []).push((R) => {
				R.define("storylet", { id: "t_start", kind: "manual", passage: "Here" });
				R.define("storyline", { id: "t_story", label: "T", begin: { on: ["t:ping"], when: { flag: "ready" } }, stages: [{ id: "a", enter: "t_start" }] });
			});
		},
		includeTest: true,
	});
	setup.bus.emit("t:ping", {});
	assert.ok(!setup.storylines.started("t_story"), "its condition isn't true yet");
	setup.effects.apply([{ flag: "ready" }]);
	setup.bus.emit("t:ping", {});
	assert.equal(setup.storylines.stage("t_story"), "a");
	assert.equal(setup.events.seen("t_start"), 1);
	setup.effects.apply([{ progression: "t_story" }, { progression: "t_story" }, { progression: { id: "t_story", add: -1 } }]);
	assert.equal(setup.storylines.progression("t_story"), 1);
});
