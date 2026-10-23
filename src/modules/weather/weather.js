/*
 * weather — the day's weather, worked out from the climate data and the
 * game's seed, so it's the same every time you look and needs no save data.
 *
 * Climate (data): for each month, how likely each kind of weather is and the
 * temperature range. The "seasonal" generation hook picks one kind and a
 * temperature per day with rng.seeded("weather:<day>").
 *
 * Warmth is simple (decided by the user): a day is "cold" when it's at or
 * below the climate's `coldAt` temperature (5°C in the town), and an item of clothing is either
 * warm (attribute "warm") or not. Outdoors on a cold day without anything warm
 * on, you're too cold.
 *
 * Content uses the conditions `weather`, `outdoors` and `tooCold` for
 * effects like Cold and Getting wet.
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-weather.js (weather kinds and the climate)
 * Every field, condition, effect and event is listed in src/modules/weather/README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "weather",
		version: 1,
		deps: ["world", "shell"],

		install({ registry, cond, time, rng, ui }) {
			registry.defineType("weatherKind", {
				required: ["label"],
				defaults: { icon: "", wet: false, tags: [], order: 0 },
			});
			registry.defineType("climate", {
				required: ["months"],
				defaults: { generate: "seasonal", coldAt: 5, warmAttribute: "warm" },
				check(def) {
					const errs = [];
					for (let m = 1; m <= 12; m++) {
						const mo = def.months[m];
						if (!mo) {
							errs.push(`months.${m} is missing`);
							continue;
						}
						if (!Array.isArray(mo.temp) || mo.temp.length !== 2 || mo.temp[0] > mo.temp[1]) errs.push(`months.${m}.temp must be [min, max]`);
						for (const k of Object.keys(mo.kinds ?? {})) if (!registry.has("weatherKind", k)) errs.push(`months.${m}: unknown weather "${k}"`);
					}
					return errs;
				},
			});

			const generators = new Map();
			const cache = new Map();
			const climate = () => registry.all("climate")[0] ?? null;

			const weather = {
				/**
				 * The weather on a day: { kind, label, icon, wet, temp }.
				 * @param {number} day @returns {object|null} null without climate data.
				 */
				onDay(day) {
					const c = climate();
					if (!c) return null;
					// Keyed by seed too, so a new game or another save gets its own weather.
					const key = `${setup.vars().meta.seed}:${day}`;
					if (!cache.has(key)) cache.set(key, generators.get(c.generate)(c, day));
					return cache.get(key);
				},

				/** @returns {object|null} The weather at time t. */
				at: (t = time.now()) => weather.onDay(time.day(t)),

				/** @returns {boolean} Is it a cold day (at or below the climate's `coldAt` °C)? */
				isCold(t = time.now()) {
					const w = weather.at(t);
					return Boolean(w) && w.temp <= climate().coldAt;
				},

				/** @returns {boolean} Is the PC wearing anything warm (attribute "warm")? */
				dressedWarm() {
					if (!setup.modules.has("clothing")) return true;
					return setup.clothing.wornItems().some((x) => x.item.attributes.includes(climate()?.warmAttribute ?? "warm"));
				},

				/** @returns {boolean} Whether the PC is outside right now. */
				outdoors: () => Boolean(setup.world.here()?.outdoor),

				/** Register a generation hook: (climate, day) => { kind, temp }. */
				registerGenerator: (name, fn) => generators.set(name, (c, day) => {
					const out = fn(c, day);
					const k = registry.get("weatherKind", out.kind);
					return { kind: out.kind, label: k.label, icon: k.icon, wet: k.wet, temp: out.temp };
				}),

				/** @returns {boolean} */
				hasGenerator: (name) => generators.has(name),

			};
			setup.weather = weather;

			// "seasonal": a kind by the month's weights, and a temperature in the
			// month's range (a little warmer when it's sunny, cooler when wet).
			weather.registerGenerator("seasonal", (c, day) => {
				const r = rng.seeded(`weather:${day}`);
				const mo = c.months[time.month(time.at(day, "12:00"))];
				const kinds = Object.entries(mo.kinds).map(([kind, weight]) => ({ kind, weight }));
				const kind = r.weighted(kinds).kind;
				const [lo, hi] = mo.temp;
				const k = registry.get("weatherKind", kind);
				const bias = k.tags.includes("warm") ? 0.25 : k.wet ? -0.2 : 0;
				const temp = Math.round(lo + Math.min(1, Math.max(0, r.float() + bias)) * (hi - lo));
				return { kind, temp };
			});

			// { weather: { kind?: id|[ids], wet?: bool, tempMin?, tempMax? } }
			cond.register("weather", {
				test(spec, ctx) {
					const w = weather.at(ctx.t ?? time.now());
					if (!w) return false;
					if (spec.kind != null && !setup.util.toArray(spec.kind).includes(w.kind)) return false;
					if (spec.wet != null && w.wet !== spec.wet) return false;
					if (spec.tempMin != null && w.temp < spec.tempMin) return false;
					if (spec.tempMax != null && w.temp > spec.tempMax) return false;
					return true;
				},
				describe: (spec) => (spec.kind ? `Weather: ${setup.util.toArray(spec.kind).map((k) => registry.tryGet("weatherKind", k)?.label ?? k).join(" or ")}` : spec.wet ? "Wet weather" : "The right weather"),
			});

			// { outdoors: true } — the PC is somewhere outside.
			cond.register("outdoors", {
				test: (spec) => weather.outdoors() === (spec !== false),
				describe: (spec) => (spec === false ? "Indoors" : "Outdoors"),
			});

			// { tooCold: true } — outside on a cold day, wearing nothing warm.
			cond.register("tooCold", {
				test(spec) {
					const cold = weather.outdoors() && weather.isCold() && !weather.dressedWarm();
					return cold === (spec !== false);
				},
				describe: () => "Not dressed warmly enough",
			});

			// Today's weather in the sidebar.
			setup.shell.addSection("weather", 15, (box) => {
				const w = setup.vars().time ? weather.at() : null;
				if (!w) return;
				box.append(ui.el("p", { class: "clock-weather", text: `${w.icon ? `${w.icon} ` : ""}${w.label}, ${w.temp}°C` }));
				if (weather.isCold()) box.append(ui.el("p", { class: "note", text: weather.dressedWarm() ? "Cold out, but you're dressed for it." : "Cold out: wear something warm to go outside." }));
			});
		},

		validate() {
			const c = setup.registry.all("climate");
			return c.filter((x) => !setup.weather.hasGenerator(x.generate)).map((x) => `climate "${x.id}": unknown generation hook "${x.generate}"`);
		},
	});
})();
