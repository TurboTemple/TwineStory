/*
 * ============================================================================
 *  STORY: The Hypnotherapist (storyline id "hypnotherapist")
 * ============================================================================
 *
 * Central character: Dennis, 71, at Calm Waters Hypnotherapy (High Street).
 * How it unlocks (decided by the user): come home late (out past the 10pm
 * curfew, town-home.js) more than three times, and your parents send you
 * to hypnotherapy as a punishment, to make you behave better. That event
 * (part 2) plays when you next walk in the door, and unlocks the sessions.
 * The story starts with your first session. Every session, the first
 * included, adds 1 to the progression: hypnotherapist progression 5 =
 * five sessions.
 *
 * Text: src/story/mooresville/stories/story-hypnotherapist.twee
 *
 *   1. The character
 *   2. The storyline (stages; add more as you write), and the unlock
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

		// The unlock: more than three late nights (the "late_home" counter), and
		// your parents send you. Plays once, when you next get home.
		R.define("storylet", {
			id: "hypnotherapy_sent",
			kind: "story",
			passage: "Ev_hypnotherapy_sent",
			triggers: ["world:enter"],
			conditions: { at: "home", counter: { name: "late_home", min: 4 }, not: { flag: "hypnotherapy_unlocked" } },
			once: true,
			effects: [{ flag: "hypnotherapy_unlocked" }],
		});

		/* ---- 3. The repeatable task ------------------------------------------ */

		R.define("action", {
			id: "hypnotherapist_session",
			label: "Have a session with Dennis",
			at: "calm_waters_room",
			mins: 60,
			showIf: { flag: "hypnotherapy_unlocked" }, // once your parents have sent you (part 2)
			conditions: { npcHere: "dennis" },
			effects: [
				// The first session starts the story (and shows its start screen).
				{ if: { cond: { storyline: { id: "hypnotherapist", started: false } }, then: [{ storyline: { id: "hypnotherapist", to: "start" } }] } },
				{ progression: "hypnotherapist" }, // every session counts, the first too
			],
		});
	});
})();
