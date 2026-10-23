/*
 * ============================================================================
 *  STORY: The Hypnotherapist (storyline id "hypnotherapist")
 * ============================================================================
 *
 * Central character: Dennis, 71, at Calm Waters Hypnotherapy (High Street).
 * Starts with your first hypnotherapy session (decided by the user). What
 * unlocks the sessions isn't decided yet: for now they're open whenever
 * Dennis is in (DESIGN: put the unlock in the session's `showIf` or
 * `conditions`). Every session, the first included, adds 1 to the
 * progression: hypnotherapist progression 5 = five sessions.
 *
 * Text: src/story/mooresville/stories/story-hypnotherapist.twee
 *
 *   1. The character
 *   2. The storyline (stages; add more as you write)
 *   3. The repeatable task (a session)
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const { DAYS } = setup.town;

		/* ---- 1. The character ---------------------------------------------- */

		R.define("npc", {
			id: "dennis",
			name: "Dennis",
			age: 71,
			pronouns: "he/him",
			role: "hypnotherapist",
			tags: ["story"],
			desc: "The hypnotherapist at Calm Waters. [Describe Dennis here]",
			schedule: [{ at: "calm_waters_room", from: "10:00", to: "18:00", days: DAYS.WEEKDAYS }],
		});

		/* ---- 2. The storyline ------------------------------------------------ */

		R.define("storyline", {
			id: "hypnotherapist",
			label: "The Hypnotherapist",
			stages: [
				{
					id: "start",
					label: "Meeting Dennis",
					enter: "hypnotherapist_start", // the start screen (the .twee file)
					hint: "Book a session with Dennis at Calm Waters Hypnotherapy.",
					// gates: [{ to: "next_stage", when: { progression: { id: "hypnotherapist", min: 5 } } }],
				},
			],
		});

		R.define("storylet", { id: "hypnotherapist_start", kind: "manual", passage: "Ev_hypnotherapist_start" });

		/* ---- 3. The repeatable task ------------------------------------------ */

		R.define("action", {
			id: "hypnotherapist_session",
			label: "Have a session with Dennis",
			at: "calm_waters_room",
			mins: 60,
			// DESIGN: what unlocks the sessions (e.g. showIf: { flag: "heard_about_dennis" }).
			conditions: { npcHere: "dennis" },
			effects: [
				// The first session starts the story (and shows its start screen).
				{ if: { cond: { storyline: { id: "hypnotherapist", started: false } }, then: [{ storyline: { id: "hypnotherapist", to: "start" } }] } },
				{ progression: "hypnotherapist" }, // every session counts, the first too
			],
		});
	});
})();
