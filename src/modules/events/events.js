/*
 * events — the storylet (event) framework. See README.md.
 *
 * A storylet subscribes to bus events (`triggers`). When one fires:
 *   1. Eligibility: conditions pass, and it isn't blocked by `once`, its
 *      cooldown, its group's cooldown or its daily limit.
 *   2. Story storylets (kind "story") fire first: the highest-priority
 *      eligible one fires, every time it's eligible.
 *   3. Otherwise random storylets (kind "random") go to the selection hook,
 *      unless the game-wide random limits say "not now".
 * At most one storylet fires per trigger. A storylet applies its effects
 * and its passage is shown through the flow controller.
 */
(function () {
	"use strict";

	const freshToday = (day) => ({ day, random: 0, counts: {} });

	(setup.__modules ??= []).push({
		id: "events",
		version: 2,
		deps: [],
		state: "story",
		defaultState: () => ({ seen: {}, lastAt: {}, lastRandomAt: null, today: freshToday(0) }),
		migrations: {
			2: (slice) => ({ seen: slice.seen ?? {}, lastAt: {}, lastRandomAt: null, today: freshToday(0) }),
		},

		install({ registry, cond, effects, time, bus, rng, ui, flow, config }) {
			registry.defineType("storylet", {
				required: ["passage", "triggers"],
				defaults: {
					kind: "random", conditions: null, chance: null, weight: 1, priority: 0,
					cooldown: 0, maxPerDay: null, group: null, once: false, effects: [], tags: [],
				},
				passages: ["passage"],
				conditions: ["conditions"],
				effects: ["effects"],
				check(def) {
					const errs = [];
					if (!Array.isArray(def.triggers) || !def.triggers.length) errs.push("triggers must be a non-empty list of bus event names");
					if (!["random", "story"].includes(def.kind)) errs.push('kind must be "random" or "story"');
					if (def.chance != null && !(def.chance >= 0 && def.chance <= 1)) errs.push("chance must be between 0 and 1");
					if (!(def.weight > 0)) errs.push("weight must be > 0");
					if (!Number.isInteger(def.cooldown) || def.cooldown < 0) errs.push("cooldown must be whole minutes ≥ 0");
					return errs;
				},
			});

			const selectors = new Map();
			/** @type {Map<string, boolean>} Debug overrides: true = force, false = suppress. */
			const forced = new Map();
			let byTrigger = new Map();

			const S = () => setup.vars().story;
			/** Today's counters, reset when the day changes. */
			const today = () => {
				const s = S();
				const day = time.day(time.now());
				if (s.today.day !== day) s.today = freshToday(day);
				return s.today;
			};
			const rules = () => ({ maxRandomPerDay: null, minGapMins: 0, ...(config.events ?? {}) });
			const cooledDown = (key, mins) => {
				const last = S().lastAt[key];
				return !mins || last == null || time.now() - last >= mins;
			};

			const events = {
				/**
				 * Register a selection hook: (eligible random storylets, ctx) => chosen storylets.
				 * Only the first chosen one fires.
				 * @param {string} name @param {Function} fn
				 */
				registerSelector: (name, fn) => selectors.set(name, fn),

				/** @returns {boolean} */
				hasSelector: (name) => selectors.has(name),

				/** @returns {string} The active selection hook's name. */
				selector: () => config.events?.selector ?? "none",

				/** @returns {number} Times a storylet has fired. */
				seen: (id) => S().seen[id] ?? 0,

				/**
				 * Debug/test: force a storylet to fire whenever its conditions
				 * pass, ignoring chance and limits (true); never fire (false);
				 * or back to normal (null).
				 */
				force(id, value) {
					registry.get("storylet", id);
					if (value === null) forced.delete(id);
					else forced.set(id, value);
				},

				/**
				 * Why a storylet can't fire right now, ignoring its conditions.
				 * @returns {string|null} null when nothing blocks it.
				 */
				blockedBy(s) {
					if (forced.get(s.id) === true) return null;
					if (forced.get(s.id) === false) return "suppressed";
					if (s.once && events.seen(s.id)) return "once";
					if (!cooledDown(s.id, s.cooldown)) return "cooldown";
					if (s.group && !cooledDown(`group:${s.group}`, s.cooldown)) return "group cooldown";
					if (s.maxPerDay != null && (today().counts[s.id] ?? 0) >= s.maxPerDay) return "daily limit";
					return null;
				},

				/**
				 * Storylets for a trigger that may fire now.
				 * @param {string} trigger @param {object} ctx
				 * @returns {object[]}
				 */
				eligible(trigger, ctx) {
					return (byTrigger.get(trigger) ?? []).filter((s) => !events.blockedBy(s) && cond.test(s.conditions, ctx));
				},

				/** @returns {string|null} Why no random event may fire now (game-wide limits). */
				randomBlockedBy() {
					const r = rules();
					if (r.maxRandomPerDay != null && today().random >= r.maxRandomPerDay) return "daily random limit";
					const last = S().lastRandomAt;
					if (r.minGapMins && last != null && time.now() - last < r.minGapMins) return "too soon after the last random event";
					return null;
				},

				/**
				 * Run the event pipeline for a bus event. Called by the trigger
				 * subscriptions; exposed for tests and the debug panel.
				 * @param {string} trigger @param {object} [payload]
				 * @returns {object|null} The storylet that fired, if any.
				 */
				handle(trigger, payload = {}) {
					const ctx = { ...(payload.ctx ?? {}), ...payload, trigger, t: time.now() };
					const eligible = events.eligible(trigger, ctx);
					const byPriority = (a, b) => b.priority - a.priority;
					const pick =
						eligible.filter((s) => forced.get(s.id) === true).sort(byPriority)[0] ??
						eligible.filter((s) => s.kind === "story").sort(byPriority)[0] ??
						(events.randomBlockedBy() ? undefined : (selectors.get(events.selector()) ?? (() => []))(eligible.filter((s) => s.kind === "random"), ctx)[0]);
					if (!pick) return null;
					events.fire(pick.id, ctx, payload.result);
					return pick;
				},

				/**
				 * Fire a storylet: record it, apply its effects, show its passage.
				 * @param {string} id @param {object} [ctx] @param {object} [result] Result to add to.
				 * @returns {object} Result
				 */
				fire(id, ctx = {}, result = effects.newResult()) {
					const s = registry.get("storylet", id);
					const st = S();
					const now = time.now();
					const day = today();
					st.seen[id] = (st.seen[id] ?? 0) + 1;
					st.lastAt[id] = now;
					if (s.group) st.lastAt[`group:${s.group}`] = now;
					day.counts[id] = (day.counts[id] ?? 0) + 1;
					if (s.kind === "random") {
						day.random += 1;
						st.lastRandomAt = now;
					}
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

				/** Index storylets by trigger and subscribe to each trigger. Called once from ready(). */
				index() {
					byTrigger = new Map();
					for (const s of registry.all("storylet")) {
						for (const trig of s.triggers) byTrigger.set(trig, [...(byTrigger.get(trig) ?? []), s]);
					}
					for (const trig of byTrigger.keys()) bus.on(trig, (payload) => events.handle(trig, payload));
				},
			};
			setup.events = events;

			// "none": no random events.
			events.registerSelector("none", () => []);

			// "chance": go through priority tiers, highest first. In a tier, every
			// storylet rolls its own `chance` (no chance = never); if any succeed,
			// one is picked by `weight`.
			events.registerSelector("chance", (eligible) => {
				const tiers = [...new Set(eligible.map((s) => s.priority))].sort((a, b) => b - a);
				for (const p of tiers) {
					const hits = eligible.filter((s) => s.priority === p && s.chance != null && rng.chance(s.chance));
					if (hits.length) return [rng.weighted(hits)];
				}
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
