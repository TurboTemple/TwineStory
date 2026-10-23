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

/** Meet a character where they are, then do their story's task once. */
function meetAndDo(setup, played, { weekday, hm, at, story, task }) {
	skipTo(setup, weekday, hm);
	assert.ok(!setup.storylines.started(story), `${story} not started yet`);
	setup.flow.perform(() => setup.world.moveTo(at));
	assert.equal(setup.storylines.stage(story), "start", `${story} starts on meeting`);
	assert.equal(played.at(-1), `Ev_${story}_start`, "the start screen shows");
	assert.equal(setup.storylines.progression(story), 0);
	const r = setup.actions.do(task);
	assert.ok(r.ok, plain(r.changes).map((c) => c.text).join(" "));
	assert.equal(setup.storylines.progression(story), 1);
}

test("Dennis: meeting him starts The Hypnotherapist; each session adds progression", () => {
	const { setup, played } = town();
	meetAndDo(setup, played, { weekday: 1, hm: "11:00", at: "calm_waters_room", story: "hypnotherapist", task: "hypnotherapist_session" });
	setup.actions.do("hypnotherapist_session");
	assert.equal(setup.storylines.progression("hypnotherapist"), 2);
	assert.ok(setup.cond.test({ progression: { id: "hypnotherapist", min: 2 } }, {}));
});

test("the cosplay club, Mark and Lenny start when you meet them", () => {
	const { setup, played } = town();
	meetAndDo(setup, played, { weekday: 2, hm: "19:00", at: "community_hall", story: "cosplay_club", task: "cosplay_club_meeting" });
	meetAndDo(setup, played, { weekday: 3, hm: "10:00", at: "academy_sports_hall", story: "gym_teacher", task: "gym_teacher_training" });
	meetAndDo(setup, played, { weekday: 4, hm: "09:00", at: "lennys_counter", story: "coffee_shop", task: "coffee_shop_chat" });
});

test("online stories start the first time you play or stream", () => {
	const { setup, played } = town();
	setup.flow.perform(() => setup.world.moveTo("home_bedroom"));
	setup.flow.perform(() => setup.actions.do("mmo_clan_play"));
	assert.equal(setup.storylines.stage("mmo_clan"), "start");
	assert.equal(played.at(-1), "Ev_mmo_clan_start");
	assert.ok(setup.npcs.hasMet("wolfhowl"));
	assert.equal(setup.storylines.progression("mmo_clan"), 0, "the first go starts it");
	setup.actions.do("mmo_clan_play");
	assert.equal(setup.storylines.progression("mmo_clan"), 1);

	setup.flow.perform(() => setup.actions.do("mystery_donator_stream"));
	assert.equal(setup.storylines.stage("mystery_donator"), "start");
	setup.actions.do("mystery_donator_stream");
	assert.equal(setup.storylines.progression("mystery_donator"), 1);
	assert.equal(setup.npcs.get("mystery_donator").ageKnown, false);
});

test("a story's task is hidden until it starts, then greyed out when its character is away", () => {
	const { setup } = town();
	skipTo(setup, 1, "11:00");
	setup.world.moveTo("calm_waters_waiting");
	const find = () => setup.actions.available().find((a) => a.def.id === "hypnotherapist_session");
	setup.world.moveTo("calm_waters_room");
	assert.ok(find()?.ok, "Dennis is here");
	skipTo(setup, 6, "11:00"); // Saturday: Dennis isn't in
	setup.world.moveTo("calm_waters_room");
	const a = find();
	assert.ok(a && !a.ok, "listed but locked");
	assert.match(a.reasons.join(" "), /Dennis is here/);
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
