/*
 * skills — things the PC gets better at (Barista, Cooking, Fitness…).
 *
 * A skill is a number from 0 to its `max`; the whole number is its level.
 * Gains go through a named hook, so learning can slow down as you improve.
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-work.js → part 1 (skills)
 * Every field, condition, effect and event is listed in src/modules/skills/README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "skills",
		version: 1,
		deps: ["character"],
		state: "skills",
		defaultState: () => ({ values: {} }),

		install({ registry, cond, effects, bus, ui }) {
			registry.defineType("skill", {
				required: ["label"],
				defaults: { desc: "", max: 100, start: 0, gain: "flat", order: 0, hidden: false },
			});

			const V = () => setup.vars().skills.values;
			const gainHooks = new Map();

			const skills = {
				/** @returns {object[]} Skill definitions in order. */
				defs: () => registry.all("skill").sort((a, b) => a.order - b.order),

				/** @returns {number} The exact value (may have decimals). */
				value: (id) => V()[id] ?? registry.get("skill", id).start,

				/** @returns {number} The level: the whole-number part. */
				level: (id) => Math.floor(skills.value(id)),

				/**
				 * Improve a skill. The amount goes through the skill's gain hook.
				 * Emits skill:levelup for each new level.
				 * @param {string} id @param {number} amount
				 * @returns {number} How much it actually went up.
				 */
				add(id, amount) {
					const def = registry.get("skill", id);
					const before = skills.value(id);
					const delta = amount > 0 ? gainHooks.get(def.gain)(def, before, amount) : amount;
					const after = Math.min(def.max, Math.max(0, Math.round((before + delta) * 1000) / 1000));
					V()[id] = after;
					if (Math.floor(after) > Math.floor(before)) {
						bus.emit("skill:levelup", { id, level: Math.floor(after), from: Math.floor(before) });
						ui.notify(`${def.label} skill is now ${Math.floor(after)}.`);
					}
					bus.emit("skill:changed", { id, from: before, to: after });
					return after - before;
				},

				/** Set a skill (debug). */
				set(id, v) {
					const def = registry.get("skill", id);
					V()[id] = Math.min(def.max, Math.max(0, v));
					bus.emit("skill:changed", { id, to: V()[id] });
				},

				/**
				 * Register a learning rule: (def, current, amount) => actual gain.
				 * @param {string} name @param {Function} fn
				 */
				registerGainHook: (name, fn) => gainHooks.set(name, fn),

				/** @returns {boolean} */
				hasGainHook: (name) => gainHooks.has(name),
			};
			setup.skills = skills;

			// "flat": every point counts the same.
			skills.registerGainHook("flat", (def, v, amount) => amount);
			// "slowing": harder the better you are (half speed at max).
			skills.registerGainHook("slowing", (def, v, amount) => amount * (1 - 0.5 * (v / def.max)));

			// { skill: { id, min?, max? } } — the level is in range.
			cond.register("skill", {
				test(spec) {
					const lv = skills.level(spec.id);
					return (spec.min == null || lv >= spec.min) && (spec.max == null || lv <= spec.max);
				},
				describe(spec) {
					const label = registry.tryGet("skill", spec.id)?.label ?? spec.id;
					return spec.min != null ? `${label} skill ${spec.min}+` : `${label} skill up to ${spec.max}`;
				},
			});

			// { skill: { barista: 0.5 } } — improve skills.
			effects.register("skill", {
				apply(spec, ctx, result) {
					for (const [id, amount] of Object.entries(spec)) {
						const got = skills.add(id, amount);
						if (got && !ctx.quiet) result.changes.push({ kind: "skill", text: `${registry.get("skill", id).label} skill +${Math.round(got * 10) / 10}` });
					}
				},
				describe: (spec) => Object.keys(spec).map((id) => `Improves ${registry.tryGet("skill", id)?.label ?? id}`).join(", "),
			});

			setup.character.addMeSection("skills", 35, (box) => {
				const defs = skills.defs().filter((d) => !d.hidden);
				if (!defs.length) return;
				box.append(ui.el("h2", { text: "Skills" }));
				const ul = ui.el("ul", { class: "stats" });
				for (const d of defs) {
					const v = skills.value(d.id);
					ul.append(ui.el("li", { attrs: { title: d.desc || null } },
						ui.el("div", { class: "stat-row" }, ui.el("span", { text: d.label }), ui.el("span", { class: "stat-val", text: `${Math.floor(v)} / ${d.max}` })),
						ui.el("div", { class: "bar" }, ui.el("div", { class: "bar-fill", attrs: { style: `width:${Math.round((v / d.max) * 100)}%` } }))));
				}
				box.append(ul);
			});
		},

		validate() {
			return setup.registry.all("skill")
				.filter((d) => !setup.skills.hasGainHook(d.gain))
				.map((d) => `skill "${d.id}": unknown gain hook "${d.gain}"`);
		},
	});
})();
