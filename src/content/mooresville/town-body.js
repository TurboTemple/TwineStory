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
 *   id, label, desc   the part, its name, and a note shown on the Me page
 *   start             the default on the new game screen
 *   creation: true    the player picks it on the new game screen (all parts here)
 *   order, group      position, and the heading it's listed under ("Looks")
 *   min, max, unit    for numbers
 *   change, perDay    how it changes by itself: "grow" adds perDay each day
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
	});
})();
