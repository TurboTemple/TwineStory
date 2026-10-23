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
	});
})();
