/*
 * ============================================================================
 *  STORY: The Gym Teacher (storyline id "gym_teacher")
 * ============================================================================
 *
 * Central character: Mark Grant, 52, the Academy's PE teacher ("Mr Grant"
 * to the students), in the Sports Hall on weekdays.
 * Starts when you sign up for his volleyball class (decided by the user).
 * Every class you go to adds 1 to the progression.
 *
 * Text: src/story/mooresville/stories/story-gym-teacher.twee
 *
 *   1. The character
 *   2. The storyline (stages; add more as you write)
 *   3. Signing up, and the class (the repeatable task)
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const { DAYS } = setup.town;

		/* ---- 1. The character ---------------------------------------------- */

		R.define("npc", {
			id: "mark",
			name: "Mark Grant", // <<first "mark">> gives "Mark"; students call him Mr Grant
			age: 52,
			pronouns: "he/him",
			role: "PE teacher (Mr Grant)",
			tags: ["story", "staff"],
			desc: "The Academy's PE teacher. [Describe Mark here]",
			schedule: [
				{ at: "academy_canteen", from: "12:00", to: "13:00", days: DAYS.WEEKDAYS }, // lunch in the canteen
				{ at: "academy_sports_hall", from: "08:30", to: "16:30", days: DAYS.WEEKDAYS },
			],
		});

		/* ---- 2. The storyline ------------------------------------------------ */

		R.define("storyline", {
			id: "gym_teacher",
			label: "The Gym Teacher",
			stages: [
				{
					id: "start",
					label: "Volleyball",
					enter: "gym_teacher_start",
					hint: "Go to Mr Grant's volleyball class in the Sports Hall (Tuesdays and Thursdays after school).",
				},
			],
		});

		R.define("storylet", { id: "gym_teacher_start", kind: "manual", passage: "Ev_gym_teacher_start" });

		/* ---- 3. Signing up, and the class ------------------------------------ */

		// Signing up starts the story (and shows its start screen).
		R.define("action", {
			id: "volleyball_sign_up",
			label: "Sign up for Mr Grant's volleyball class",
			at: "academy_sports_hall",
			mins: 5,
			showIf: { storyline: { id: "gym_teacher", started: false } }, // until you've signed up
			conditions: { npcHere: "mark" },
			effects: [{ storyline: { id: "gym_teacher", to: "start" } }],
		});

		// Something you can do with Mr Grant himself: it shows on his screen when
		// you tap him (with: "mark"), not in the Sports Hall's list.
		R.define("action", {
			id: "ask_mark_volleyball",
			label: "Ask about the volleyball team",
			with: "mark",
			mins: 5,
			showIf: { storyline: { id: "gym_teacher" } }, // once you've signed up
			effects: [{ rel: { friendship: 2 } }],
		});

		// The class itself. DESIGN: when it runs (Tuesdays and Thursdays after school for now).
		R.define("action", {
			id: "volleyball_class",
			label: "Go to volleyball class",
			at: "academy_sports_hall",
			mins: 60,
			showIf: { storyline: { id: "gym_teacher" } }, // once you've signed up
			conditions: { npcHere: "mark", weekday: [2, 4], time: { from: "15:15", to: "16:15" } },
			effects: [{ progression: "gym_teacher" }],
		});
	});
})();
