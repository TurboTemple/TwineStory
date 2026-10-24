/*
 * body — the PC's body, one data-defined part at a time (height, weight,
 * eye colour, hair…).
 *
 * Each part is a number (with a unit and range) or a choice from a list.
 * A number part can have `bands` ("skinny", "slim", …): it's shown and
 * chosen by band, but still changes gradually underneath.
 * Parts can change over time through a named daily hook (hair grows) or
 * through effects (a workout takes off a little weight).
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-body.js (body parts)
 *   src/content/mooresville/town-people.js (each NPC's looks)
 * Every field, condition, effect and event is listed in src/modules/body/README.md.
 */
(function () {
	"use strict";

	const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

	(setup.__modules ??= []).push({
		id: "body",
		version: 1,
		deps: ["character"],
		state: "body",
		defaultState: () => ({ parts: {} }),

		install({ registry, cond, effects, bus, ui }) {
			registry.defineType("bodyPart", {
				required: ["label", "kind"],
				defaults: { desc: "", unit: "", min: 0, max: 100, step: 1, decimals: 0, start: null, options: null, bands: null, change: "none", perDay: 0, creation: false, order: 0, group: "Body" },
				check(def) {
					const errs = [];
					if (!["number", "choice"].includes(def.kind)) errs.push('kind must be "number" or "choice"');
					if (def.kind === "choice" && !(Array.isArray(def.options) && def.options.includes(def.start))) errs.push("a choice part needs options that include start");
					if (def.kind === "number" && !(def.start >= def.min && def.start <= def.max)) errs.push("start must be between min and max");
					if (def.bands && !def.bands.every((b, i) => b.label && (i === def.bands.length - 1 || b.below > (def.bands[i - 1]?.below ?? def.min)))) {
						errs.push("bands need a label each and rising `below` values (the last band needs no `below`)");
					}
					return errs;
				},
			});

			const B = () => setup.vars().body.parts;
			const changeHooks = new Map();
			const round = (def, v) => Number(v.toFixed(Math.max(def.decimals, 3)));

			const body = {
				/** @returns {object[]} Part definitions in display order. */
				defs: () => registry.all("bodyPart").sort((a, b) => a.order - b.order),

				/** @returns {number|string} A part's current value. */
				get(id) {
					const def = registry.get("bodyPart", id);
					return B()[id] ?? def.start;
				},

				/** Set a part (numbers are clamped; choices must be valid). */
				set(id, value) {
					const def = registry.get("bodyPart", id);
					const from = body.get(id);
					let to = value;
					if (def.kind === "number") to = round(def, clamp(Number(value), def.min, def.max));
					else if (!def.options.includes(value)) throw new setup.GameError(`${def.label} can't be "${value}"`);
					const bandBefore = def.bands ? body.band(id) : null;
					B()[id] = to;
					if (to !== from) bus.emit("body:changed", { id, from, to });
					// Moving into a new band is worth telling the player about.
					if (def.bands && body.band(id) !== bandBefore) {
						bus.emit("body:band", { id, from: bandBefore, to: body.band(id) });
						ui.notify(`${def.label}: ${bandBefore} → ${body.band(id)}.`);
					}
				},

				/** Add to a number part. */
				add(id, delta) {
					body.set(id, body.get(id) + delta);
				},

				/**
				 * The band a number part is in (e.g. "slim"), or null if it has no bands.
				 * Bands: [{ label, below }, …, { label }] — the last band has no `below`.
				 */
				band(id) {
					const def = registry.get("bodyPart", id);
					if (!def.bands) return null;
					const v = body.get(id);
					return (def.bands.find((b) => b.below == null || v < b.below) ?? def.bands.at(-1)).label;
				},

				/** A typical value for a band (its middle), used when picking a band. */
				bandValue(id, label) {
					const def = registry.get("bodyPart", id);
					const i = def.bands.findIndex((b) => b.label === label);
					if (i < 0) throw new setup.GameError(`${def.label} has no band "${label}"`);
					const lo = i === 0 ? def.min : def.bands[i - 1].below;
					const hi = def.bands[i].below ?? def.max;
					return def.bands[i].value ?? (lo + hi) / 2;
				},

				/** @returns {string} How a part reads: a band ("slim"), a choice ("blue"), or a number ("168 cm"). */
				display(id) {
					const def = registry.get("bodyPart", id);
					const v = body.get(id);
					if (def.kind === "choice") return String(v);
					if (def.bands) return body.band(id);
					return `${Number(v).toFixed(def.decimals)}${def.unit ? ` ${def.unit}` : ""}`;
				},

				/** The media key suffix for a part's current look, e.g. "weight/slim". */
				mediaKey: (id) => `${id}/${String(body.display(id)).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,

				/**
				 * Register how a part changes each day: (def, value, days) => new value.
				 * @param {string} name @param {Function} fn
				 */
				registerChangeHook: (name, fn) => changeHooks.set(name, fn),

				/** @returns {boolean} */
				hasChangeHook: (name) => changeHooks.has(name),
			};
			setup.body = body;

			// "none": doesn't change by itself. "grow": changes by perDay each day.
			body.registerChangeHook("none", (def, v) => v);
			body.registerChangeHook("grow", (def, v, days) => v + def.perDay * days);

			bus.on("time:day", () => {
				for (const def of body.defs()) {
					if (def.kind !== "number" || def.change === "none") continue;
					body.set(def.id, changeHooks.get(def.change)(def, body.get(def.id), 1));
				}
			});

			// { body: { id, min?, max?, is? } }
			cond.register("body", {
				test(spec) {
					const v = body.get(spec.id);
					if (spec.is != null) return setup.util.toArray(spec.is).some((x) => x === v || x === body.band(spec.id));
					return (spec.min == null || v >= spec.min) && (spec.max == null || v <= spec.max);
				},
				describe(spec) {
					const label = registry.tryGet("bodyPart", spec.id)?.label ?? spec.id;
					if (spec.is != null) return `${label}: ${setup.util.toArray(spec.is).join(" or ")}`;
					return spec.min != null ? `${label} at least ${spec.min}` : `${label} at most ${spec.max}`;
				},
			});

			// { body: { weight: -0.05 } } — add to number parts.
			effects.register("body", {
				apply(spec) {
					for (const [id, d] of Object.entries(spec)) body.add(id, d);
				},
			});

			// { bodySet: { hair_length: 5, hair_colour: "blonde" } }
			effects.register("bodySet", {
				apply(spec, ctx, result) {
					for (const [id, v] of Object.entries(spec)) {
						body.set(id, v);
						if (!ctx.quiet) result.changes.push({ kind: "body", text: `${registry.get("bodyPart", id).label}: ${body.display(id)}` });
					}
				},
			});

			/* ---- UI ------------------------------------------------------------ */

			/**
			 * Inputs for every part marked `creation: true`, for the new game
			 * screen. Returns the elements and a function that saves the choices.
			 */
			body.creationFields = () => {
				const fields = body.defs().filter((d) => d.creation).map((def) => {
					const id = `body-${def.id}`;
					const label = ui.el("label", { attrs: { for: id }, text: def.unit ? `${def.label} (${def.unit})` : def.label });
					const choices = def.kind === "choice" ? def.options : def.bands?.map((b) => b.label);
					const current = def.kind === "choice" ? body.get(def.id) : body.band(def.id);
					const input = choices
						? ui.el("select", { attrs: { id } }, ...choices.map((o) => ui.el("option", { text: o, attrs: { value: o, selected: o === current } })))
						: ui.el("input", { attrs: { id, type: "number", min: def.min, max: def.max, step: def.step, value: body.get(def.id), inputmode: "decimal" } });
					return { def, label: def.bands ? ui.el("label", { attrs: { for: id }, text: def.label }) : label, input };
				});
				return {
					elements: fields.flatMap((f) => [f.label, f.input]),
					save() {
						for (const f of fields) {
							if (f.def.bands) {
								if (f.input.value !== body.band(f.def.id)) body.set(f.def.id, body.bandValue(f.def.id, f.input.value));
								continue;
							}
							const v = f.def.kind === "number" ? Number(f.input.value) : f.input.value;
							if (f.def.kind === "number" && !Number.isFinite(v)) continue;
							body.set(f.def.id, v);
						}
					},
				};
			};

			// The body section of the Profile tab.
			setup.character.addMeSection("body", 20, (box) => {
				const groups = new Map();
				for (const def of body.defs()) groups.set(def.group, [...(groups.get(def.group) ?? []), def]);
				for (const [group, defs] of groups) {
					box.append(ui.el("h2", { text: group }));
					const ul = ui.el("ul", { class: "parts" });
					for (const d of defs) {
						// Picture: assets/media/bodyPart/<part>/<look>.* (e.g. weight/slim), else bodyPart/<part>.*
						const m = setup.media.byKey(`bodyPart/${body.mediaKey(d.id)}`, `bodyPart/${d.id}`);
						const pic = m ? setup.media.element(m, { class: "thumb", alt: `${d.label}: ${body.display(d.id)}` }) : ui.el("span", { class: "thumb thumb-empty", text: d.label.charAt(0), attrs: { "aria-hidden": "true" } });
						ul.append(ui.el("li", { class: "inv-row", attrs: { title: d.desc || null } }, pic,
							ui.el("span", { class: "inv-slot", text: `${d.label}: ` }), ui.el("span", { text: body.display(d.id) })));
					}
					box.append(ul);
				}
			});
		},

		newGame() {
			const parts = setup.vars().body.parts;
			for (const def of setup.registry.all("bodyPart")) parts[def.id] = def.start;
		},

		validate() {
			return setup.registry.all("bodyPart")
				.filter((d) => !setup.body.hasChangeHook(d.change))
				.map((d) => `bodyPart "${d.id}": unknown change hook "${d.change}"`);
		},
	});
})();
