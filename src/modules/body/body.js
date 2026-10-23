/*
 * body — the PC's body, one data-defined part at a time (height, weight,
 * eye colour, hair…). See README.md.
 *
 * Each part is a number (with a unit and range) or a choice from a list.
 * Parts can change over time through a named daily hook (hair grows) or
 * through effects (a workout takes off a little weight).
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
				defaults: { desc: "", unit: "", min: 0, max: 100, step: 1, decimals: 0, start: null, options: null, change: "none", perDay: 0, creation: false, order: 0, group: "Body" },
				check(def) {
					const errs = [];
					if (!["number", "choice"].includes(def.kind)) errs.push('kind must be "number" or "choice"');
					if (def.kind === "choice" && !(Array.isArray(def.options) && def.options.includes(def.start))) errs.push("a choice part needs options that include start");
					if (def.kind === "number" && !(def.start >= def.min && def.start <= def.max)) errs.push("start must be between min and max");
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
					B()[id] = to;
					if (to !== from) bus.emit("body:changed", { id, from, to });
				},

				/** Add to a number part. */
				add(id, delta) {
					body.set(id, body.get(id) + delta);
				},

				/** @returns {string} A part for display, e.g. "168 cm" or "blue". */
				display(id) {
					const def = registry.get("bodyPart", id);
					const v = body.get(id);
					if (def.kind === "choice") return String(v);
					return `${Number(v).toFixed(def.decimals)}${def.unit ? ` ${def.unit}` : ""}`;
				},

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
					if (spec.is != null) return setup.util.toArray(spec.is).includes(v);
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
					const input = def.kind === "choice"
						? ui.el("select", { attrs: { id } }, ...def.options.map((o) => ui.el("option", { text: o, attrs: { value: o, selected: o === body.get(def.id) } })))
						: ui.el("input", { attrs: { id, type: "number", min: def.min, max: def.max, step: def.step, value: body.get(def.id), inputmode: "decimal" } });
					return { def, label, input };
				});
				return {
					elements: fields.flatMap((f) => [f.label, f.input]),
					save() {
						for (const f of fields) {
							const v = f.def.kind === "number" ? Number(f.input.value) : f.input.value;
							if (f.def.kind === "number" && !Number.isFinite(v)) continue;
							body.set(f.def.id, v);
						}
					},
				};
			};

			// The body section of the "Me" screen.
			setup.character.addMeSection("body", 20, (box) => {
				const groups = new Map();
				for (const def of body.defs()) groups.set(def.group, [...(groups.get(def.group) ?? []), def]);
				for (const [group, defs] of groups) {
					box.append(ui.el("h2", { text: group }));
					box.append(ui.el("dl", { class: "sheet" }, ...defs.flatMap((d) => [ui.el("dt", { text: d.label }), ui.el("dd", { text: body.display(d.id) })])));
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
