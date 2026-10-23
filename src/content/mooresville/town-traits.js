/*
 * ============================================================================
 *  Mooresville — traits
 * ============================================================================
 *
 * Traits are lasting things about you, earned through habits. Effects
 * (town-needs.js) are different: they come and go with the moment (Cold,
 * Hungry, Caffeinated). Decided by the user: the two are kept apart.
 *
 * HABITS
 *   An action or item records a habit with the effect { habit: "coffee" }.
 *   Doing it several times in one day still counts as one day. Habits now:
 *     "coffee"    Make a coffee (kitchen), Order a flat white (The Daily
 *                 Grind), an energy drink
 *     "exercise"  Go for a jog, Work out (gym), Shoot some hoops (school)
 *
 * ---------------------------------------------------------------------------
 *  HOW TO ADD A TRAIT
 * ---------------------------------------------------------------------------
 *   trait({
 *       id: "early_bird",
 *       label: "Early bird",
 *       desc: "You're up with the sun, and you like it.",
 *       good: true,                                  // green in the sidebar (false = red)
 *       earn: { habit: "early_start", days: 5 },     // 5 days in a row
 *       lose: { habit: "early_start", daysWithout: 7 },
 *       modifiers: [mod.add("mood", 2)],             // while you have it
 *   });
 *   …and add { habit: "early_start" } to the effects of whatever counts.
 *
 * ---------------------------------------------------------------------------
 *  FIELDS
 * ---------------------------------------------------------------------------
 *   earn       { habit, days }            that many days in a row
 *              { habit, days, within }    on `days` of the last `within` days
 *   needs      { habit, missed, done }    while you have it: a day without the
 *              habit runs `missed` effects the next morning; doing the habit
 *              runs `done` effects
 *   lose       { habit, daysWithout }     gone after that many days without it
 *   modifiers  stat changes while you have it (see `mod` in town-kit.js)
 *   conflicts  traits you can't have at the same time
 *   gained, lost   effects when you gain or lose it
 *   good       true / false / null: green, red or grey in the sidebar
 *
 *  Conditions: { trait: "caffeine_addicted" }. Effects: { trait: "id" } gives
 *  it, { traitRemove: "id" } takes it away.
 *  Pictures: assets/media/trait/<id>.webp.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const { mod } = setup.town;
		const trait = (def) => R.define("trait", def);

		/* ---- Caffeine addicted ---------------------------------------------- */

		// Coffee five days in a row and you're hooked. After that, every day
		// without one leaves you with a withdrawal headache the next morning,
		// until your first coffee. A week off coffee and you're free of it.
		trait({
			id: "caffeine_addicted",
			label: "Caffeine addicted",
			desc: "You can't really start the day without a coffee any more.",
			good: false,
			order: 0,
			earn: { habit: "coffee", days: 5 },
			needs: {
				habit: "coffee",
				missed: [{ status: "caffeine_withdrawal" }],
				done: [{ statusRemove: "caffeine_withdrawal" }],
			},
			lose: { habit: "coffee", daysWithout: 7 },
		});

		// The effect of missing your coffee (lasts until noon, or your next coffee).
		R.define("statusEffect", {
			id: "caffeine_withdrawal",
			label: "Caffeine withdrawal",
			desc: "A dull headache that only a coffee will fix.",
			mins: 720,
			good: false,
			modifiers: [mod.add("mood", -5)],
		});

		/* ---- Gym regular ---------------------------------------------------- */

		// Exercise on 4 days out of any 7 and it becomes part of who you are.
		// A week without any and it fades.
		trait({
			id: "gym_regular",
			label: "Gym regular",
			desc: "Exercise is part of your week now, and you feel better for it.",
			good: true,
			order: 1,
			earn: { habit: "exercise", days: 4, within: 7 },
			lose: { habit: "exercise", daysWithout: 7 },
			modifiers: [mod.add("mood", 3)],
		});
	});
})();
