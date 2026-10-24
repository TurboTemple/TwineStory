/*
 * ============================================================================
 *  Mooresville — getting fit (a second storyline, as an example)
 * ============================================================================
 *
 * The same loop as the barista job, built only from data: a task you repeat
 * (Work out at PulseFit Gym, in town-actions.js) adds to a counter
 * ("workouts"), a random outcome can add to it or take from it, and at set
 * points the next stage starts with its event.
 *
 *   "beginner" ─(5 workouts)─► "regular": event Ev_fitness_regular
 *              ─(15 workouts)─► "fit":   event Ev_fitness_fit
 *
 * The numbers are never shown in the game (decided by the user); the phone's
 * Diary shows each stage's `hint`. The text is in src/story/mooresville/fitness.twee.
 *
 * Stage fields are explained in town-work.js, part 3a.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		R.define("storyline", {
			id: "fitness",
			label: "Getting fit",
			order: 1,
			start: "beginner", // in the Diary from the start of the game
			stages: [
				{
					id: "beginner",
					label: "Out of shape",
					desc: "You keep meaning to get fitter.",
					hint: "Buy a day pass at PulseFit Gym and work out.",
					gates: [{ to: "regular", when: { storylineCount: { key: "workouts", min: 5 } } }],
				},
				{
					id: "regular",
					label: "Finding your feet",
					desc: "The gym doesn't feel so scary any more.",
					hint: "Keep working out.",
					enter: "fitness_regular",
					gates: [{ to: "fit", when: { storylineCount: { key: "workouts", min: 15 } } }],
				},
				{
					id: "fit",
					label: "In good shape",
					desc: "You're fitter than you've ever been.",
					enter: "fitness_fit",
					onEnter: [{ stat: { mood: 10 } }],
				},
			],
		});

		// The stage events (kind "manual": they play when you reach the stage).
		R.define("storylet", { id: "fitness_regular", kind: "manual", passage: "Ev_fitness_regular" });
		R.define("storylet", { id: "fitness_fit", kind: "manual", passage: "Ev_fitness_fit" });

		/* ======================================================================
		 *  Training with Kyle (personal training at PulseFit)
		 * ======================================================================
		 *
		 * Starts at your first "Personal training with Kyle" (town-actions.js);
		 * each session adds 1 to its progression. Each stage has an entry
		 * event and a few events that can happen during a session (PT_EVENT_CHANCE
		 * each). All the text is placeholders in fitness.twee for you to write.
		 *
		 *   "start" ─(5 sessions)─► "regular" ─(15 sessions)─► "star"
		 */

		R.define("storyline", {
			id: "personal_training",
			label: "Training with Kyle",
			order: 2,
			stages: [
				{
					id: "start",
					label: "New client",
					desc: "Kyle has you on his books.",
					hint: "Book sessions with Kyle at PulseFit.",
					enter: "pt_start",
					events: ["pt_start_struggle", "pt_start_tips"],
					gates: [{ to: "regular", when: { progression: { id: "personal_training", min: 5 } } }],
				},
				{
					id: "regular",
					label: "Regular client",
					desc: "Kyle knows your weak spots, and your excuses.",
					hint: "Keep training with Kyle.",
					enter: "pt_regular",
					events: ["pt_regular_push", "pt_regular_chat"],
					gates: [{ to: "star", when: { progression: { id: "personal_training", min: 15 } } }],
				},
				{
					id: "star",
					label: "Kyle's star client",
					desc: "Kyle tells the other trainers about you.",
					hint: "Keep it up.",
					enter: "pt_star",
				},
			],
		});
		R.define("storylet", { id: "pt_start", kind: "manual", passage: "Ev_pt_start" });
		R.define("storylet", { id: "pt_regular", kind: "manual", passage: "Ev_pt_regular" });
		R.define("storylet", { id: "pt_star", kind: "manual", passage: "Ev_pt_star" });

		/** How likely each session event is, per session (0.2 = 20%). */
		const PT_EVENT_CHANCE = 0.2;
		const sessionEvent = (id, effects) =>
			R.define("storylet", {
				id,
				kind: "pool", // only during its stage (the stage's `events` above)
				chance: PT_EVENT_CHANCE,
				passage: `Ev_${id}`,
				triggers: ["action:end"],
				// Not on the first session, which has its own event (pt_start).
				conditions: { action: "personal_training", progression: { id: "personal_training", min: 2 } },
				effects,
			});
		sessionEvent("pt_start_struggle", [{ stat: { mood: -2, energy: -5 } }]);
		sessionEvent("pt_start_tips", [{ stat: { mood: 2 } }]);
		sessionEvent("pt_regular_push", [{ body: { arms: 0.5, legs: 0.5 } }, { stat: { energy: -5 } }]);
		sessionEvent("pt_regular_chat", [{ rel: { npc: "kyle_dunn", friendship: 3 } }]);
	});
})();
