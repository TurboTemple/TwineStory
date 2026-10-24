/*
 * ============================================================================
 *  Mooresville — the player's body
 * ============================================================================
 *
 * Each body part is its own definition, so parts can be added, removed or
 * changed freely. Decided by the user: parts are described in words. Weight
 * is skinny → fat, bust is a cup size, height is short / average / tall.
 *
 * NPCs list their own looks on their character sheets (town-people.js),
 * using these same parts and words.
 *
 * ---------------------------------------------------------------------------
 *  TWO KINDS OF PART
 * ---------------------------------------------------------------------------
 *   kind: "choice"   one of a list of `options` (eye colour, bust, height)
 *
 *   kind: "number"   a number underneath that changes gradually (weight,
 *                    hair length), shown as a word from its `bands`:
 *                      bands: [
 *                          { label: "slim", below: 35 },   // under 35 → "slim"
 *                          …,
 *                          { label: "fat" },               // the last one has no `below`
 *                      ]
 *                    The player sees a notice when it moves into a new band.
 *
 * ---------------------------------------------------------------------------
 *  FIELDS
 * ---------------------------------------------------------------------------
 *   id, label, desc   the part, its name, and a note shown in the sidebar's Profile tab
 *   start             the default on the new game screen
 *   creation: true    the player picks it on the new game screen
 *                     (the fitness parts aren't picked: everyone starts the same)
 *   order, group      position, and the heading it's listed under ("Looks")
 *   min, max, unit    for numbers
 *   change, perDay    how it changes by itself: "grow" adds perDay each day
 *
 *  Workouts build the fitness parts (arms, legs, stomach, bum): see the
 *  workout() helper in town-actions.js, e.g. squats → { bum: 1.5, legs: 0.5 }.
 *  They don't fade by themselves (change: "none").
 *
 *  Actions change parts with { body: { weight: -0.2 } } (add) or
 *  { bodySet: { hair_colour: "pink" } } (set).
 *  Pictures: assets/media/bodyPart/<part>/<word>.webp, e.g. weight/slim.webp.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const part = (def) => R.define("bodyPart", { creation: true, ...def });

		part({
			id: "height",
			label: "Height",
			kind: "choice",
			options: ["short", "average", "tall"],
			start: "average",
			order: 0,
		});

		part({
			id: "weight",
			label: "Weight",
			kind: "number",
			// An internal 0–100 scale; the band is what you see.
			min: 0,
			max: 100,
			start: 50,
			order: 1,
			bands: [
				{ label: "skinny", below: 15 },
				{ label: "slim", below: 35 },
				{ label: "average", below: 65 },
				{ label: "chubby", below: 85 },
				{ label: "fat" },
			],
			desc: "Changes slowly with what you eat and how active you are.",
		});

		part({
			id: "bust",
			label: "Bust (cup size)",
			kind: "choice",
			options: ["AA", "A", "B", "C", "D", "DD", "E", "F", "G"],
			start: "B",
			order: 2,
		});

		part({
			id: "skin_tone",
			label: "Skin tone",
			kind: "choice",
			options: ["very fair", "fair", "light", "olive", "light brown", "brown", "dark brown"],
			start: "light",
			order: 3,
			group: "Looks",
		});

		part({
			id: "eye_colour",
			label: "Eye colour",
			kind: "choice",
			options: ["brown", "hazel", "green", "blue", "grey"],
			start: "brown",
			order: 4,
			group: "Looks",
		});

		part({
			id: "hair_colour",
			label: "Hair colour",
			kind: "choice",
			options: ["black", "dark brown", "light brown", "auburn", "ginger", "blonde", "platinum", "pink", "blue"],
			start: "dark brown",
			order: 5,
			group: "Looks",
		});

		part({
			id: "hair_length",
			label: "Hair",
			kind: "number",
			unit: "cm",
			min: 0,
			max: 100,
			start: 20,
			order: 6,
			group: "Looks",
			bands: [
				{ label: "buzzed", below: 2 },
				{ label: "short", below: 8 },
				{ label: "chin-length", below: 20 },
				{ label: "shoulder-length", below: 35 },
				{ label: "long", below: 60 },
				{ label: "very long" },
			],
			// Grows about 1.2 cm a month.
			change: "grow",
			perDay: 0.04,
			desc: "Grows about a centimetre a month. Snips on the High Street can cut it.",
		});

		/* ---- Fitness: built up by working out (town-actions.js) -------------- */
		// Each is a 0–100 scale. A focused half-hour workout adds 1.5 to the
		// part it works, a full workout 0.5 to each.

		part({
			id: "arms",
			label: "Arms",
			kind: "number",
			min: 0,
			max: 100,
			start: 20,
			order: 10,
			group: "Fitness",
			creation: false,
			bands: [
				{ label: "soft", below: 30 },
				{ label: "toned", below: 55 },
				{ label: "strong", below: 80 },
				{ label: "muscular" },
			],
			desc: "Gets stronger with weights: arm curls at PulseFit, swimming, press-ups.",
		});
		part({
			id: "legs",
			label: "Legs",
			kind: "number",
			min: 0,
			max: 100,
			start: 25,
			order: 11,
			group: "Fitness",
			creation: false,
			bands: [
				{ label: "soft", below: 30 },
				{ label: "toned", below: 55 },
				{ label: "athletic", below: 80 },
				{ label: "powerful" },
			],
			desc: "Running, squats and the treadmill build them up.",
		});
		part({
			id: "stomach",
			label: "Stomach",
			kind: "number",
			min: 0,
			max: 100,
			start: 25,
			order: 12,
			group: "Fitness",
			creation: false,
			bands: [
				{ label: "soft", below: 30 },
				{ label: "flat", below: 55 },
				{ label: "toned", below: 80 },
				{ label: "six-pack" },
			],
			desc: "Core workouts, swimming and yoga tone it.",
		});
		part({
			id: "bum",
			label: "Bum",
			kind: "number",
			min: 0,
			max: 100,
			start: 40,
			order: 13,
			group: "Fitness",
			creation: false,
			bands: [
				{ label: "flat", below: 15 },
				{ label: "small", below: 35 },
				{ label: "average", below: 55 },
				{ label: "round", below: 75 },
				{ label: "big" },
			],
			desc: "Squats make it bigger and rounder.",
		});
	});
})();
