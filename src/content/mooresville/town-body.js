/*
 * Mooresville — the PC's body. Each part is its own definition, so parts
 * can be added, removed or changed freely. `creation: true` parts are
 * chosen on the new game screen.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const part = (def) => R.define("bodyPart", { creation: true, ...def });

		part({ id: "height", label: "Height", kind: "number", unit: "cm", min: 145, max: 205, step: 1, start: 168, order: 0 });
		part({
			id: "weight", label: "Weight", kind: "number", unit: "kg", min: 40, max: 160, step: 0.5, decimals: 1, start: 62, order: 1,
			desc: "Changes slowly with what you eat and how active you are.",
		});
		part({ id: "build", label: "Build", kind: "choice", options: ["slim", "average", "athletic", "curvy", "stocky"], start: "average", order: 2 });
		part({ id: "bust", label: "Bust", kind: "choice", options: ["flat", "small", "medium", "large", "very large"], start: "medium", order: 3 });
		part({ id: "skin_tone", label: "Skin tone", kind: "choice", options: ["very fair", "fair", "light", "olive", "light brown", "brown", "dark brown"], start: "light", order: 4, group: "Looks" });
		part({ id: "eye_colour", label: "Eye colour", kind: "choice", options: ["brown", "hazel", "green", "blue", "grey"], start: "brown", order: 5, group: "Looks" });
		part({ id: "hair_colour", label: "Hair colour", kind: "choice", options: ["black", "dark brown", "light brown", "auburn", "ginger", "blonde", "platinum", "pink", "blue"], start: "dark brown", order: 6, group: "Looks" });
		part({
			id: "hair_length", label: "Hair length", kind: "number", unit: "cm", min: 0, max: 100, step: 1, start: 20, order: 7, group: "Looks",
			// Hair grows about 1.2 cm a month.
			change: "grow", perDay: 0.04,
			desc: "Grows about a centimetre a month. Snips on the High Street can cut it.",
		});
	});
})();
