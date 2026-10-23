/*
 * ============================================================================
 *  STORY: The Gym Teacher (storyline id "gym_teacher")
 * ============================================================================
 *
 * Central character: Mark, 52, the Academy's PE teacher, in the Sports Hall
 * on weekdays. Starts the first time you meet Mark. Each training session
 * with him adds 1 to the progression.
 *
 * Text: src/story/mooresville/stories/story-gym-teacher.twee
 *
 *   1. The character
 *   2. The storyline (stages; add more as you write)
 *   3. The repeatable task (training)
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const { DAYS } = setup.town;

		/* ---- 1. The character ---------------------------------------------- */

		R.define("npc", {
			id: "mark",
			name: "Mark",
			age: 52,
			pronouns: "he/him",
			role: "PE teacher",
			tags: ["story", "staff"],
			desc: "The Academy's PE teacher. [Describe Mark here]",
			schedule: [{ at: "academy_sports_hall", from: "08:30", to: "16:30", days: DAYS.WEEKDAYS }],
		});

		/* ---- 2. The storyline ------------------------------------------------ */

		R.define("storyline", {
			id: "gym_teacher",
			label: "The Gym Teacher",
			begin: { on: ["npc:met"], when: { withNpc: "mark" } },
			stages: [
				{
					id: "start",
					label: "Meeting Mark",
					enter: "gym_teacher_start",
					hint: "Find Mark in the Academy's Sports Hall on a weekday.",
				},
			],
		});

		R.define("storylet", { id: "gym_teacher_start", kind: "manual", passage: "Ev_gym_teacher_start" });

		/* ---- 3. The repeatable task ------------------------------------------ */

		R.define("action", {
			id: "gym_teacher_training",
			label: "Train with Mark",
			at: "academy_sports_hall",
			mins: 60,
			showIf: { storyline: { id: "gym_teacher" } },
			conditions: { npcHere: "mark" },
			effects: [{ progression: "gym_teacher" }],
		});
	});
})();
