/*
 * events — the storylet (event) framework. See README.md.
 *
 * A storylet subscribes to bus events (`triggers`). When one fires, the
 * storylets that pass their conditions are handed to the active selection
 * hook, which picks which (if any) happen. A chosen storylet applies its
 * effects and its passage is shown through the flow controller.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "events",
		version: 1,
		deps: [],
		state: "story",
		defaultState: () => ({ seen: {} }),

		install({ registry, cond, effects, time, bus, rng, ui, flow, config }) {
			registry.defineType("storylet", {
				required: ["passage", "triggers"],
				defaults: { conditions: null, chance: null, priority: 0, effects: [], once: false, tags: [] },
				passages: ["passage"],
				conditions: ["conditions"],
				effects: ["effects"],
				check(def) {
					const errs = [];
					if (!Array.isArray(def.triggers) || !def.triggers.length) errs.push("triggers must be a non-empty list of bus event names");
					if (def.chance != null && !(def.chance >= 0 && def.chance <= 1)) errs.push("chance must be between 0 and 1");
					return errs;
				},
			});

			const selectors = new Map();
			/** @type {Map<string, boolean>} Debug overrides: true = force, false = suppress. */
			const forced = new Map();
			let byTrigger = new Map();

			const events = {
				/**
				 * Register a selection hook: (eligible storylets, ctx) => chosen storylets.
				 * @param {string} name @param {Function} fn
				 */
				registerSelector: (name, fn) => selectors.set(name, fn),

				/** @returns {boolean} */
				hasSelector: (name) => selectors.has(name),

				/** @returns {string} The active selection hook's name. */
				selector: () => config.events?.selector ?? "none",

				/** @returns {number} Times a storylet has fired. */
				seen: (id) => setup.vars().story.seen[id] ?? 0,

				/**
				 * Debug/test: force a storylet to fire whenever it's eligible
				 * (true), never fire (false), or go back to normal (null).
				 */
				force(id, value) {
					registry.get("storylet", id);
					if (value === null) forced.delete(id);
					else forced.set(id, value);
				},

				/**
				 * Storylets for a trigger that pass their conditions now.
				 * @param {string} trigger @param {object} ctx
				 * @returns {object[]}
				 */
				eligible(trigger, ctx) {
					return (byTrigger.get(trigger) ?? []).filter((s) =>
						forced.get(s.id) !== false && !(s.once && events.seen(s.id)) && cond.test(s.conditions, ctx));
				},

				/**
				 * Run the event pipeline for a bus event. Called by the trigger
				 * subscriptions; exposed for tests and the debug panel.
				 * @param {string} trigger @param {object} [payload]
				 * @returns {object[]} The storylets that fired.
				 */
				handle(trigger, payload = {}) {
					const ctx = { ...(payload.ctx ?? {}), ...payload, trigger, t: time.now() };
					const eligible = events.eligible(trigger, ctx);
					const forcedNow = eligible.filter((s) => forced.get(s.id) === true);
					const chosen = forcedNow.length ? forcedNow : (selectors.get(events.selector()) ?? (() => []))(eligible, ctx);
					for (const s of chosen) events.fire(s.id, ctx, payload.result);
					return chosen;
				},

				/**
				 * Fire a storylet: record it, apply its effects, show its passage.
				 * @param {string} id @param {object} [ctx] @param {object} [result] Result to add to.
				 * @returns {object} Result
				 */
				fire(id, ctx = {}, result = effects.newResult()) {
					const s = registry.get("storylet", id);
					const seen = setup.vars().story.seen;
					seen[id] = (seen[id] ?? 0) + 1;
					const before = result.mins;
					effects.run(s.effects, ctx, result);
					const extra = result.mins - before;
					if (extra > 0) {
						result.mins = before;
						if (time.isAdvancing()) setup.reportError(new setup.GameError(`Storylet "${id}" can't move time while time is already moving`), "events");
						else time.advance(extra, { reason: `event:${id}` });
					}
					flow.request(s.passage, flow.PRIORITY.event);
					bus.emit("event:fired", { id });
					return result;
				},
			};
			/** Index storylets by trigger and subscribe to each trigger. Called once from ready(). */
			events.index = () => {
				byTrigger = new Map();
				for (const s of registry.all("storylet")) {
					for (const trig of s.triggers) byTrigger.set(trig, [...(byTrigger.get(trig) ?? []), s]);
				}
				for (const trig of byTrigger.keys()) bus.on(trig, (payload) => events.handle(trig, payload));
			};
			setup.events = events;

			// "none": no random events (the framework default).
			events.registerSelector("none", () => []);

			// "chance": highest priority first; each storylet with a `chance`
			// rolls it, and the first success fires. Storylets without a
			// `chance` never fire through this selector.
			events.registerSelector("chance", (eligible) => {
				const sorted = [...eligible].sort((a, b) => b.priority - a.priority);
				for (const s of sorted) if (s.chance != null && rng.chance(s.chance)) return [s];
				return [];
			});

			ui.view("event-end", (box) => {
				box.append(ui.button("Continue", () => flow.continue()));
			});
		},

		ready() {
			setup.events.index();
		},

		validate() {
			const name = setup.events.selector();
			return setup.events.hasSelector(name) ? [] : [`unknown selection hook "${name}"`];
		},
	});
})();
