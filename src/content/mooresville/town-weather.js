/*
 * ============================================================================
 *  Mooresville — the weather
 * ============================================================================
 *
 * A mild, damp English climate. Each day's weather is worked out from this
 * table (and the game's random seed), so it's the same every time you look.
 *
 * What's in this file:
 *   1. Kinds of weather (sunny, rain…)
 *   2. The climate: for each month, the temperature range and how likely
 *      each kind of weather is
 *   3. Effects of being out in it: Cold and Getting wet
 *
 * ---------------------------------------------------------------------------
 *  HOW THE NUMBERS WORK
 * ---------------------------------------------------------------------------
 *   temp: [min, max]     the day's temperature in °C is somewhere in this range
 *                        (sunny days lean warmer, wet days cooler)
 *   kinds: { rain: 3, sunny: 1 }
 *                        weights: here rain is 3 times as likely as sun.
 *                        They don't need to add up to anything.
 *
 *   How warmly you need to dress outdoors:
 *     warmth needed = (comfortTemp − temperature) × warmthPerDegree, rounded
 *   e.g. at 8°C: (18 − 8) × 0.5 = 5. Everyday clothes are about 5 warmth;
 *   a warm coat adds 5 (see town-clothing.js). Indoors it doesn't matter.
 *
 *  Numbers are first proposals.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const { mod } = setup.town;

		/* ======================================================================
		 *  1. Kinds of weather
		 * ======================================================================
		 *
		 *   wet: true      counts as wet (Getting wet; rainy ambient lines)
		 *   tags: ["warm"] nudges the temperature up
		 *   icon           shown in the sidebar
		 */

		const kind = (def) => R.define("weatherKind", def);

		kind({ id: "sunny", label: "Sunny", icon: "☀️", tags: ["warm"], order: 0 });
		kind({ id: "cloudy", label: "Cloudy", icon: "☁️", order: 1 });
		kind({ id: "drizzle", label: "Drizzle", icon: "🌦️", wet: true, order: 2 });
		kind({ id: "rain", label: "Rain", icon: "🌧️", wet: true, order: 3 });
		kind({ id: "windy", label: "Windy", icon: "💨", order: 4 });
		kind({ id: "fog", label: "Foggy", icon: "🌫️", order: 5 });
		kind({ id: "snow", label: "Snow", icon: "🌨️", wet: true, order: 6 });

		/* ======================================================================
		 *  2. The climate, month by month
		 * ====================================================================== */

		R.define("climate", {
			id: "mooresville",
			comfortTemp: 18,      // °C at which you need no warm clothes at all
			warmthPerDegree: 0.5, // extra warmth needed per degree colder
			months: {
				1: { temp: [0, 7], kinds: { cloudy: 4, rain: 3, drizzle: 2, fog: 1, snow: 1, sunny: 1 } },             // January
				2: { temp: [1, 8], kinds: { cloudy: 4, rain: 3, drizzle: 2, windy: 1, snow: 1, sunny: 1 } },           // February
				3: { temp: [3, 11], kinds: { cloudy: 4, drizzle: 2, rain: 2, windy: 2, sunny: 2 } },                   // March
				4: { temp: [5, 14], kinds: { cloudy: 3, sunny: 3, drizzle: 2, rain: 2 } },                             // April
				5: { temp: [8, 17], kinds: { sunny: 4, cloudy: 3, drizzle: 1, rain: 1 } },                             // May
				6: { temp: [11, 21], kinds: { sunny: 5, cloudy: 3, rain: 1 } },                                        // June
				7: { temp: [13, 23], kinds: { sunny: 5, cloudy: 3, rain: 1 } },                                        // July
				8: { temp: [13, 22], kinds: { sunny: 4, cloudy: 3, rain: 2 } },                                        // August
				9: { temp: [10, 19], kinds: { sunny: 3, cloudy: 4, drizzle: 2, rain: 1 } },                            // September
				10: { temp: [7, 15], kinds: { cloudy: 4, rain: 3, drizzle: 2, windy: 2, fog: 1, sunny: 1 } },          // October
				11: { temp: [4, 11], kinds: { cloudy: 4, rain: 3, drizzle: 2, windy: 2, fog: 2 } },                    // November
				12: { temp: [1, 8], kinds: { cloudy: 4, rain: 3, drizzle: 2, fog: 2, snow: 1 } },                      // December
			},
		});

		/* ======================================================================
		 *  3. Out in it without the right clothes
		 * ====================================================================== */

		R.define("statusEffect", {
			id: "cold",
			label: "Cold",
			good: false,
			desc: "You're not dressed warmly enough for the weather. Put on something warmer, or go inside.",
			whileCond: { tooCold: true }, // outdoors, and outfit warmth below what's needed
			modifiers: [mod.add("mood", -6), mod.perHour("energy", -3)],
		});

		R.define("statusEffect", {
			id: "wet",
			label: "Getting wet",
			good: false,
			desc: "It's wet out and you've no waterproof. A rain jacket or puffer would help.",
			whileCond: { all: [{ outdoors: true }, { weather: { wet: true } }, { not: { wearing: { tag: "waterproof" } } }] },
			modifiers: [mod.add("mood", -4), mod.perHour("hygiene", -3)],
		});
	});
})();
