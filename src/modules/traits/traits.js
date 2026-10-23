/*
 * traits — lasting things about the player, earned through habits
 * (Caffeine addicted, Gym regular…).
 *
 * Traits are kept apart from effects (the status module), as decided by the
 * user:
 *   effects   come and go with the moment: Cold, Hungry, Tipsy, Caffeinated
 *   traits    are earned over days and stay until you lose them
 *
 * HOW A TRAIT WORKS
 *   Habits: actions and items record a habit with the effect
 *   { habit: "coffee" }. The game remembers which days you did each habit.
 *
 *   earn   { habit, days, within }: you gain the trait when you've done the
 *          habit on at least `days` of the last `within` days (within
 *          defaults to days, i.e. that many days in a row).
 *   needs  { habit, missed, done }: while you have the trait, each day you
 *          don't do the habit, `missed` effects run the next morning
 *          (e.g. caffeine withdrawal). `done` effects run whenever you do it
 *          (e.g. the withdrawal clears).
 *   lose   { habit, daysWithout }: you lose the trait after that many days
 *          in a row without the habit.
 *   modifiers  stat changes while you have the trait (like an effect's).
 *
 * Events: trait:gained { id }, trait:lost { id }, habit:done { habit }
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-traits.js (the traits and their habits)
 *   town-actions.js and town-items.js (which actions record a habit)
 * Every field, condition, effect and event is listed in src/modules/traits/README.md.
 */
(function () {
	"use strict";

	/** Days of habit history kept per habit. */
	const KEEP_DAYS = 30;

	(setup.__modules ??= []).push({
		id: "traits",
		version: 1,
		deps: ["stats", "status", "character", "shell"],
		state: "traits",
		defaultState: () => ({ has: {}, habits: {} }),

		install({ registry, cond, effects, time, bus, ui }) {
			registry.defineType("trait", {
				required: ["label"],
				defaults: {
					desc: "", modifiers: [], good: null, hidden: false, order: 0, tags: [], conflicts: [],
					earn: null, needs: null, lose: null, gained: [], lost: [],
				},
				refs: { "modifiers[].stat": "stat", conflicts: "trait" },
				effects: ["gained", "lost", "needs.missed", "needs.done"],
				check(def) {
					const errs = [];
					const whole = (n) => Number.isInteger(n) && n > 0;
					if (def.earn && !(def.earn.habit && whole(def.earn.days) && (def.earn.within == null || (whole(def.earn.within) && def.earn.within >= def.earn.days)))) {
						errs.push("earn needs { habit, days } (and `within` ≥ days, if given)");
					}
					if (def.needs && !def.needs.habit) errs.push("needs needs a habit");
					if (def.lose && !(def.lose.habit && whole(def.lose.daysWithout))) errs.push("lose needs { habit, daysWithout }");
					return errs;
				},
			});

			// Saved state ($traits):
			//   has:    { traitId: { since: time } }    the traits you have
			//   habits: { habitName: [day, day, …] }    days you did each habit (last 30)
			const T = () => setup.vars().traits;
			const today = () => time.day(time.now());

			const traits = {
				/** @returns {object[]} Trait definitions in order. */
				defs: () => registry.all("trait").sort((a, b) => a.order - b.order),

				/** @returns {boolean} */
				has: (id) => id in T().has,

				/** @returns {object[]} Traits you have, as definitions, in order. */
				list: () => traits.defs().filter((d) => traits.has(d.id)),

				/**
				 * Gain a trait (if you don't have it, and nothing you have conflicts).
				 * @returns {boolean} Whether it was gained.
				 */
				gain(id) {
					const def = registry.get("trait", id);
					if (traits.has(id)) return false;
					if (def.conflicts.some((c) => traits.has(c))) return false;
					T().has[id] = { since: time.now() };
					if (def.gained.length) effects.run(def.gained, { trait: id, quiet: true }, effects.newResult());
					if (!def.hidden) ui.notify(`New trait: ${def.label}.`);
					bus.emit("trait:gained", { id });
					return true;
				},

				/** Lose a trait. @returns {boolean} Whether you had it. */
				lose(id) {
					const def = registry.get("trait", id);
					if (!traits.has(id)) return false;
					delete T().has[id];
					if (def.lost.length) effects.run(def.lost, { trait: id, quiet: true }, effects.newResult());
					if (!def.hidden) ui.notify(`You've lost a trait: ${def.label}.`);
					bus.emit("trait:lost", { id });
					return true;
				},

				/** @returns {number[]} Days you did a habit (oldest first). */
				habitDays: (habit) => T().habits[habit] ?? [],

				/** @returns {boolean} Whether you did a habit on a day. */
				didOn: (habit, day) => traits.habitDays(habit).includes(day),

				/** @returns {number} On how many of the last `within` days (up to `day`) you did a habit. */
				count(habit, within, day = today()) {
					return traits.habitDays(habit).filter((d) => d <= day && d > day - within).length;
				},

				/**
				 * Record that you did a habit today, then check traits: you may
				 * earn one, and traits that need this habit run their `done` effects.
				 * @param {string} habit
				 * @param {object} [result] A Result to add notes to.
				 */
				record(habit, result) {
					const days = (T().habits[habit] ??= []);
					const d = today();
					if (!days.includes(d)) {
						days.push(d);
						if (days.length > KEEP_DAYS) days.splice(0, days.length - KEEP_DAYS);
					}
					bus.emit("habit:done", { habit });
					for (const def of traits.defs()) {
						if (traits.has(def.id) && def.needs?.habit === habit && def.needs.done?.length) {
							effects.run(def.needs.done, { trait: def.id }, result ?? effects.newResult());
						}
						const e = def.earn;
						if (e && e.habit === habit && !traits.has(def.id) && traits.count(habit, e.within ?? e.days) >= e.days) traits.gain(def.id);
					}
				},
			};
			setup.traits = traits;

			// Traits feed their modifiers into the stats pipeline, like effects do.
			setup.stats.addModifierSource(() => traits.list().flatMap((d) => d.modifiers.map((m) => ({ ...m, source: `trait:${d.id}` }))));

			// Each new day: traits that need a habit check yesterday, and traits
			// you've stopped feeding fade away.
			bus.on("time:day", ({ day }) => {
				const yesterday = day - 1;
				for (const def of traits.list()) {
					const sinceDay = time.day(T().has[def.id].since);
					const n = def.needs;
					if (n && sinceDay <= yesterday && !traits.didOn(n.habit, yesterday) && n.missed?.length) {
						effects.run(n.missed, { trait: def.id, quiet: true }, effects.newResult());
					}
					const l = def.lose;
					if (l) {
						const last = Math.max(sinceDay, ...traits.habitDays(l.habit));
						if (day - last >= l.daysWithout) traits.lose(def.id);
					}
				}
			});

			// { trait: "id" } — you have that trait.
			cond.register("trait", {
				test: (spec) => setup.util.toArray(spec).some((id) => traits.has(id)),
				describe: (spec) => setup.util.toArray(spec).map((id) => registry.tryGet("trait", id)?.label ?? id).join(" or "),
			});

			// { habit: { id, days?, within? } } — you did a habit on at least
			// `days` (default 1) of the last `within` (default 1, i.e. today) days.
			cond.register("habit", {
				test: (spec) => traits.count(spec.id, spec.within ?? 1) >= (spec.days ?? 1),
				describe: (spec) => `Habit: ${spec.id}`,
			});

			// { habit: "coffee" } — record that you did a habit today.
			effects.register("habit", {
				apply(spec, ctx, result) {
					traits.record(spec, result);
				},
				describe: () => "",
			});

			// { trait: "id" } — gain a trait;  { traitRemove: "id" } — lose it.
			effects.register("trait", {
				apply(spec, ctx, result) {
					if (traits.gain(spec) && !ctx.quiet) result.changes.push({ kind: "trait", text: `New trait: ${registry.get("trait", spec).label}` });
				},
				describe: (spec) => `Gain the trait ${registry.tryGet("trait", spec)?.label ?? spec}`,
			});
			effects.register("traitRemove", {
				apply(spec) {
					for (const id of setup.util.toArray(spec)) traits.lose(id);
				},
			});

			/* ---- UI --------------------------------------------------------- */

			const tone = (d) => (d.good === true ? "good" : d.good === false ? "bad" : "neutral");

			// Sidebar: a chip per trait, under Effects.
			setup.shell.addSection("traits", 45, (box) => {
				if (!setup.vars().traits) return;
				const list = traits.list().filter((d) => !d.hidden);
				if (!list.length) return;
				box.append(ui.el("h2", { text: "Traits" }));
				box.append(ui.el("ul", { class: "chips" }, ...list.map((d) => ui.el("li", { class: `chip chip-${tone(d)}`, text: d.label, attrs: { title: d.desc || null } }))));
			});

			// Profile tab and Me page: each trait, what it does, what it needs.
			setup.character.addMeSection("traits", 62, (box) => {
				const list = traits.list().filter((d) => !d.hidden);
				box.append(ui.el("h2", { text: "Traits" }));
				if (!list.length) {
					box.append(ui.el("p", { class: "note", text: "None yet. Traits come from your habits." }));
					return;
				}
				const ul = ui.el("ul", { class: "effects" });
				for (const d of list) {
					const does = d.modifiers.map((m) => setup.stats.describeModifier(m));
					const lines = [];
					if (does.length) lines.push(`What it does: ${does.join("; ")}.`);
					if (d.needs) lines.push(`Needs: ${d.needs.habit} every day, or you'll feel it.`);
					if (d.lose) lines.push(`Fades after ${d.lose.daysWithout} days without ${d.lose.habit}.`);
					const icon = setup.media.render("trait", d.id, { class: "thumb", alt: d.label });
					ul.append(ui.el("li", { class: `effect effect-${tone(d)}` },
						ui.el("div", { class: "inv-row" }, icon, ui.el("strong", { text: d.label })),
						d.desc ? ui.el("p", { text: d.desc }) : null,
						...lines.map((l) => ui.el("p", { class: "note", text: l }))));
				}
				box.append(ul);
			});
		},
	});
})();
