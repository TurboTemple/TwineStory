/*
 * storylines — progression through stages (a job, a friendship, therapy…).
 *
 * A storyline is a list of stages. Each stage can have:
 *   label, desc  shown in the phone's Diary app
 *   hint     what to do to move on, shown in the Diary ("Keep working at
 *            the café"). The gates themselves are never shown.
 *   enter    a storylet shown once when you reach the stage (the interview,
 *            the first day, a promotion)
 *   onEnter  effects applied when you reach it
 *   events   storylets that can only happen while you're in this stage
 *            (e.g. the stage's shift events, usually kind "pool")
 *   gates    [{ to, when }] — move to stage `to` as soon as `when` is true
 * Gates are checked after anything that might change them (actions, shifts,
 * skills, relationships, a new day…). Storylines also keep counters
 * (shifts done, workouts…) that gates and events can test.
 *
 * Every storyline has a main counter, its progression (e.g. how many
 * sessions you've had with the hypnotherapist):
 *   { progression: "hypnotherapist" }                     effect: +1
 *   { progression: { id: "hypnotherapist", add: -1 } }    effect: take one away
 *   { progression: { id: "hypnotherapist", min: 5 } }     condition: 5 or more
 *
 * A storyline can start by itself: begin: { on: ["npc:met"], when: CONDITION }
 * starts it (at `stage`, default the first) the first time that bus event
 * happens with the condition true, e.g. when you first meet its character.
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-work.js → part 3a (the barista career)
 * Every field, condition, effect and event is listed in src/modules/storylines/README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "storylines",
		version: 1,
		deps: ["events", "character"],
		state: "arcs",
		defaultState: () => ({}),

		install({ registry, cond, effects, time, bus, ui }) {
			registry.defineType("storyline", {
				required: ["label", "stages"],
				defaults: { desc: "", start: null, begin: null, hidden: false, order: 0 },
				refs: { "stages[].enter": "storylet", "stages[].events": "storylet" },
				effects: ["stages[].onEnter"],
				conditions: ["stages[].gates[].when", "begin.when"],
				check(def) {
					const errs = [];
					const ids = new Set(def.stages.map((s) => s.id));
					if (ids.size !== def.stages.length) errs.push("stage ids must be unique");
					for (const st of def.stages) {
						if (!st.id) errs.push("every stage needs an id");
						for (const g of st.gates ?? []) if (!ids.has(g.to)) errs.push(`stage "${st.id}": gate goes to unknown stage "${g.to}"`);
					}
					if (def.start && !ids.has(def.start)) errs.push(`start stage "${def.start}" doesn't exist`);
					if (def.begin) {
						if (!Array.isArray(def.begin.on) || !def.begin.on.length) errs.push('begin needs on: ["some:event"]');
						if (def.begin.stage && !ids.has(def.begin.stage)) errs.push(`begin stage "${def.begin.stage}" doesn't exist`);
					}
					return errs;
				},
			});

			const A = () => setup.vars().arcs;
			const def = (id) => registry.get("storyline", id);
			const stageDef = (id, stage) => def(id).stages.find((s) => s.id === stage);
			let checking = false;
			/** storylet id → [{ arc, stage }] for stage event pools. */
			let poolIndex = new Map();

			const storylines = {
				/** @returns {string|null} Current stage, or null if not started. */
				stage: (id) => A()[id]?.stage ?? null,

				/** @returns {object|null} The current stage's definition. */
				stageDef: (id) => (A()[id] ? stageDef(id, A()[id].stage) : null),

				/** @returns {boolean} */
				started: (id) => Boolean(A()[id]),

				/** @returns {number} The storyline's main counter (see `progression` above). */
				progression: (id) => storylines.count(id, "progression"),

				/** @returns {number} A storyline counter (0 if unset). */
				count: (id, key) => A()[id]?.counts[key] ?? 0,

				/** Add to a storyline counter (starts the storyline record if needed). */
				addCount(id, key, n = 1) {
					def(id);
					const a = (A()[id] ??= { stage: def(id).start, since: time.now(), counts: {}, history: [] });
					a.counts[key] = (a.counts[key] ?? 0) + n;
					bus.emit("storyline:count", { id, key, value: a.counts[key] });
				},

				/**
				 * Move a storyline to a stage (starting it if needed): applies the
				 * stage's onEnter effects and shows its entry event.
				 * @param {string} id @param {string} stage
				 * @param {{quiet?: boolean}} [opts] quiet: don't show the entry event (debug)
				 * @returns {object} Result
				 */
				moveTo(id, stage, opts = {}) {
					const st = stageDef(id, stage);
					if (!st) throw new setup.GameError(`Storyline "${id}" has no stage "${stage}"`);
					const a = (A()[id] ??= { stage: null, since: time.now(), counts: {}, history: [] });
					const from = a.stage;
					a.stage = stage;
					a.since = time.now();
					a.history.push([stage, time.now()]);
					if (a.history.length > 20) a.history.shift();
					const result = effects.newResult();
					effects.run(st.onEnter ?? [], { storyline: id, stage }, result);
					if (st.enter && !opts.quiet) setup.events.fire(st.enter, { storyline: id, stage }, result);
					bus.emit("storyline:stage", { id, from, to: stage });
					return result;
				},

				/**
				 * Check a storyline's gates; moves through at most one gate.
				 * @returns {boolean} Whether it moved.
				 */
				check(id) {
					const st = storylines.stageDef(id);
					if (!st) return false;
					const ctx = { storyline: id, stage: st.id, t: time.now() };
					const gate = (st.gates ?? []).find((g) => cond.test(g.when, ctx));
					if (!gate) return false;
					storylines.moveTo(id, gate.to);
					return true;
				},

				/** Check every storyline that has started. */
				checkAll() {
					if (checking) return;
					checking = true;
					try {
						for (const id of Object.keys(A())) if (registry.has("storyline", id)) storylines.check(id);
					}
					finally {
						checking = false;
					}
				},

				/** @returns {object[]} Storylines that have started, for display. */
				active: () => registry.all("storyline").filter((d) => A()[d.id] && !d.hidden).sort((a, b) => a.order - b.order),
			};
			setup.storylines = storylines;

			// Stage events can only happen in their stage.
			setup.events.addFilter((s) => {
				const homes = poolIndex.get(s.id);
				return !homes || homes.some((h) => storylines.stage(h.arc) === h.stage);
			});
			storylines.reindex = () => {
				poolIndex = new Map();
				for (const d of registry.all("storyline")) {
					for (const st of d.stages) {
						for (const ev of st.events ?? []) poolIndex.set(ev, [...(poolIndex.get(ev) ?? []), { arc: d.id, stage: st.id }]);
					}
				}
			};

			// Re-check gates whenever something they might depend on changes.
			for (const ev of ["action:end", "job:shiftEnd", "skill:changed", "rel:changed", "time:day", "storyline:count", "school:lesson", "travel:arrived", "world:enter"]) {
				bus.on(ev, () => storylines.checkAll(), { priority: -10 });
			}

			// { storyline: { id, stage?, started? } } — stage can be one id or a list.
			cond.register("storyline", {
				test(spec, ctx) {
					const id = spec.id ?? ctx.storyline;
					const cur = storylines.stage(id);
					if (spec.started === false) return !storylines.started(id);
					if (spec.stage != null) return setup.util.toArray(spec.stage).includes(cur);
					return storylines.started(id);
				},
				describe(spec) {
					const d = registry.tryGet("storyline", spec.id);
					if (spec.started === false) return `Not started: ${d?.label ?? spec.id}`;
					if (spec.stage != null) {
						const names = setup.util.toArray(spec.stage).map((s) => d?.stages.find((x) => x.id === s)?.label ?? s);
						return `${d?.label ?? spec.id}: ${names.join(" or ")}`;
					}
					return `${d?.label ?? spec.id} started`;
				},
			});

			// { storylineCount: { id, key, min?, max? } }
			cond.register("storylineCount", {
				test(spec, ctx) {
					const v = storylines.count(spec.id ?? ctx.storyline, spec.key);
					return (spec.min == null || v >= spec.min) && (spec.max == null || v <= spec.max);
				},
				describe: (spec) => `${spec.key} ${spec.min != null ? `at least ${spec.min}` : `at most ${spec.max}`}`,
			});

			// { storyline: { id, to } } — start a storyline or move it on.
			effects.register("storyline", {
				apply(spec, ctx, result) {
					effects.merge(result, storylines.moveTo(spec.id ?? ctx.storyline, spec.to));
				},
			});

			// { progression: { id, min?, max? } } — the storyline's main counter in range.
			cond.register("progression", {
				test(spec) {
					const v = storylines.progression(spec.id);
					return (spec.min == null || v >= spec.min) && (spec.max == null || v <= spec.max);
				},
				describe: (spec) => `${registry.tryGet("storyline", spec.id)?.label ?? spec.id}: ${spec.min != null ? `at least ${spec.min}` : `at most ${spec.max}`}`,
			});

			// { progression: "id" } (+1) or { progression: { id, add } }
			effects.register("progression", {
				apply(spec, ctx) {
					const { id, add = 1 } = typeof spec === "string" ? { id: spec } : spec;
					storylines.addCount(id ?? ctx.storyline, "progression", add);
				},
				describe: (spec) => `Moves on ${registry.tryGet("storyline", typeof spec === "string" ? spec : spec.id)?.label ?? ""}`,
			});

			// { storylineCount: { id, key, add } }
			effects.register("storylineCount", {
				apply(spec, ctx) {
					storylines.addCount(spec.id ?? ctx.storyline, spec.key, spec.add ?? 1);
				},
			});

			// The phone's Diary app (an `app` with view "app-diary"): every
			// storyline you've started, where it's at, and what to do next (the
			// stage's `hint`). Gates and counters are never shown: when the next
			// stage comes is a surprise (decided by the user).
			ui.view("app-diary", (box) => {
				const list = storylines.active();
				if (!list.length) {
					box.append(ui.el("p", { class: "note", text: "Nothing written yet." }));
					return;
				}
				const ul = ui.el("ul", { class: "effects" });
				for (const d of list) {
					const st = storylines.stageDef(d.id);
					ul.append(ui.el("li", { class: "effect" },
						ui.el("strong", { text: `${d.label}: ${st?.label ?? "—"}` }),
						st?.desc ? ui.el("p", { text: st.desc }) : null,
						st?.hint ? ui.el("p", { class: "note", text: `Next: ${st.hint}` }) : null));
				}
				box.append(ul);
			});
		},

		ready() {
			setup.storylines.reindex();
			// Storylines that start by themselves (`begin`).
			for (const d of setup.registry.all("storyline").filter((x) => x.begin)) {
				for (const ev of d.begin.on) {
					setup.bus.on(ev, (payload = {}) => {
						if (setup.storylines.started(d.id)) return;
						const ctx = { ...(payload.ctx ?? {}), ...payload, t: setup.time.now() };
						if (!setup.cond.test(d.begin.when, ctx)) return;
						setup.storylines.moveTo(d.id, d.begin.stage ?? d.stages[0].id);
					});
				}
			}
		},

		newGame() {
			for (const d of setup.registry.all("storyline")) if (d.start) setup.storylines.moveTo(d.id, d.start, { quiet: true });
		},
	});
})();
