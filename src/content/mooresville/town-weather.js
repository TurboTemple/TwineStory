/*
 * Mooresville — the weather: a mild, damp English climate. Numbers are
 * first proposals: how likely each kind of weather is each month, and the
 * daytime temperature range in °C.
 *
 * Outfit warmth needed = (18 − temperature) × 0.5, rounded. Everyday clothes
 * are about 5 (fine down to about 8°C); a warm coat adds 5.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const kind = (id, label, icon, extra = {}) => R.define("weatherKind", { id, label, icon, ...extra });
		kind("sunny", "Sunny", "☀️", { tags: ["warm"], order: 0 });
		kind("cloudy", "Cloudy", "☁️", { order: 1 });
		kind("drizzle", "Drizzle", "🌦️", { wet: true, order: 2 });
		kind("rain", "Rain", "🌧️", { wet: true, order: 3 });
		kind("windy", "Windy", "💨", { order: 4 });
		kind("fog", "Foggy", "🌫️", { order: 5 });
		kind("snow", "Snow", "🌨️", { wet: true, order: 6 });

		const m = (temp, kinds) => ({ temp, kinds });
		R.define("climate", {
			id: "mooresville",
			comfortTemp: 18,
			warmthPerDegree: 0.5,
			months: {
				1: m([0, 7], { cloudy: 4, rain: 3, drizzle: 2, fog: 1, snow: 1, sunny: 1 }),
				2: m([1, 8], { cloudy: 4, rain: 3, drizzle: 2, windy: 1, snow: 1, sunny: 1 }),
				3: m([3, 11], { cloudy: 4, drizzle: 2, rain: 2, windy: 2, sunny: 2 }),
				4: m([5, 14], { cloudy: 3, sunny: 3, drizzle: 2, rain: 2 }),
				5: m([8, 17], { sunny: 4, cloudy: 3, drizzle: 1, rain: 1 }),
				6: m([11, 21], { sunny: 5, cloudy: 3, rain: 1 }),
				7: m([13, 23], { sunny: 5, cloudy: 3, rain: 1 }),
				8: m([13, 22], { sunny: 4, cloudy: 3, rain: 2 }),
				9: m([10, 19], { sunny: 3, cloudy: 4, drizzle: 2, rain: 1 }),
				10: m([7, 15], { cloudy: 4, rain: 3, drizzle: 2, windy: 2, fog: 1, sunny: 1 }),
				11: m([4, 11], { cloudy: 4, rain: 3, drizzle: 2, windy: 2, fog: 2 }),
				12: m([1, 8], { cloudy: 4, rain: 3, drizzle: 2, fog: 2, snow: 1 }),
			},
		});

		// Out in it without the right clothes.
		R.define("statusEffect", {
			id: "cold", label: "Cold", good: false,
			desc: "You're not dressed warmly enough for the weather. Put on something warmer, or go inside.",
			whileCond: { tooCold: true },
			modifiers: [{ stat: "mood", op: "add", value: -6 }, { stat: "energy", op: "rateAdd", value: -3 }],
		});
		R.define("statusEffect", {
			id: "wet", label: "Getting wet", good: false,
			desc: "It's wet out and you've no waterproof. A rain jacket or puffer would help.",
			whileCond: { all: [{ outdoors: true }, { weather: { wet: true } }, { not: { wearing: { tag: "waterproof" } } }] },
			modifiers: [{ stat: "mood", op: "add", value: -4 }, { stat: "hygiene", op: "rateAdd", value: -3 }],
		});
	});
})();
