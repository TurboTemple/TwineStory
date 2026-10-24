/*
 * actions — things the PC can do that take time.
 *
 * do(id): conditions → costs → advance time (split at checkpoints, with
 * per-hour effects) → effects → Result → events.
 *
 * The action screen: after an action (and after a lesson, a shift or a
 * chat, which use the same screen), the player sees its picture
 * (assets/media/<type>/<id>.<ext>), its flavour text (the passage
 * "Act_<id>", or the action's `passage`), what happened, and Continue. It
 * only shows if nothing more important (an event, a story moment, the
 * daily summary) wants the screen. actions.illustrate() asks for one.
 *
 * Cooldowns: an action with `cooldown: 240` can't be done again until 4
 * hours after the last time (it shows greyed out with "Not again for …").
 * When each action was last done is saved in $acts.last.
 *
 * Events:
 *   action:start      { action, ctx }
 *   action:checkpoint { action, elapsed, ctx, result, interrupt(reason) }
 *   action:end        { action, elapsed, interrupted, result, ctx }
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-actions.js (most actions; jobs, school and talk add their own)
 *   src/content/mooresville/stories/story-*.js (each story's repeatable task)
 *   src/story/mooresville/actions.twee (each action screen's flavour text: Act_<id>)
 * Every field, condition, effect and event is listed in src/modules/actions/README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "actions",
		version: 2, // 2: cooldowns ($acts)
		deps: ["world"],
		// Saved state ($acts): last: { actionId: time it was last done }
		state: "acts",
		defaultState: () => ({ last: {} }),

		install({ registry, cond, effects, time, bus, ui, flow, fmt }) {
			registry.defineType("action", {
				required: ["label"],
				defaults: {
					at: [], atTag: null, whenClosed: false, desc: "", tags: [], mins: 0, durations: null, checkpoints: [], conditions: null,
					costs: [], effects: [], perHour: [], always: [], interruptible: true, passage: null,
					// Minutes before it can be done again (0 = any time).
					cooldown: 0,
					// Decided by the user: a locked action shows what it is, greyed out,
					// with what's needed. `hidden: true` hides it completely instead.
					// `showIf`: only listed at all while this is true (e.g. once a
					// storyline has started); `conditions` then grey it out.
					hidden: false,
					showIf: null,
					// People-specific: offered on the screen you get when you tap
					// someone, instead of the place's list. `with`: person id(s);
					// `withTag`: anyone with this tag or role. `at` (if set) still
					// limits where.
					with: null,
					withTag: null,
				},
				refs: { at: "location", with: "npc" },
				passages: ["passage"],
				conditions: ["conditions", "showIf"],
				effects: ["costs", "effects", "perHour", "always"],
				check(def) {
					const errs = [];
					const ok = (n) => Number.isInteger(n) && n >= 0;
					if (!ok(def.mins)) errs.push("mins must be a whole number ≥ 0");
					const hm = (d) => typeof d === "string" && /^\d{1,2}:\d{2}$/.test(d);
					if (def.durations && !def.durations.every((d) => (ok(d) && d > 0) || hm(d))) errs.push('durations must be whole minutes > 0 or "HH:MM" (until that time)');
					if (!setup.util.toArray(def.at).length && !def.atTag && !def.with && !def.withTag) errs.push("needs `at` (location ids), `atTag`, `with` or `withTag`");
					if (!def.checkpoints.every((c) => ok(c) && c > 0)) errs.push("checkpoints must be whole numbers > 0");
					if (!ok(def.cooldown)) errs.push("cooldown must be whole minutes ≥ 0");
					return errs;
				},
			});

			let running = null;

			// Per-hour effects of the running action.
			bus.on("time:hour", () => {
				if (running && running.def.perHour.length) effects.run(running.def.perHour, running.ctx, running.result);
			});

			const ctxFor = (def, npc = null) => ({ action: def.id, loc: setup.world.loc(), t: time.now(), reason: `action:${def.id}`, ...(npc ? { npc } : {}) });

			/** A people-specific action (`with` / `withTag`)? */
			const personal = (def) => def.with != null || def.withTag != null;
			/** Is it for this person? */
			const forNpc = (def, npc) => {
				const n = registry.tryGet("npc", npc);
				if (!n) return false;
				if (def.with != null && setup.util.toArray(def.with).includes(npc)) return true;
				return def.withTag != null && (n.tags.includes(def.withTag) || n.role === def.withTag);
			};

			/** Total pounds an action's costs take (negative `money` effects). */
			const priceOf = (def) => def.costs.reduce((sum, c) => sum + (c.money && c.money.amount < 0 ? -c.money.amount : 0), 0);
			const moneyOn = () => setup.modules.has("money") && setup.money.enabled();

			/** Is the action offered where the PC is? */
			const atHere = (def) => {
				const here = setup.world.here();
				return Boolean(here) && (setup.util.toArray(def.at).includes(here.id) || (def.atTag != null && here.tags.includes(def.atTag)));
			};
			/** Offered in the place's list? (People-specific ones are on the person's screen instead.) */
			const offeredHere = (def) => !personal(def) && atHere(def);
			/** Offered with this person, here? */
			const offeredWith = (def, npc) => personal(def) && forNpc(def, npc) && (!setup.util.toArray(def.at).length && def.atTag == null ? true : atHere(def));

			/** @returns {number|null} Minutes until an action's cooldown is over (null if it's ready). */
			const cooldownLeft = (def) => {
				const last = setup.vars().acts?.last[def.id];
				if (!def.cooldown || last == null) return null;
				const left = last + def.cooldown - time.now();
				return left > 0 ? left : null;
			};

			/**
			 * Every reason an action can't be done now: not open (unless the
			 * action has `whenClosed: true`), its cooldown, conditions, then price.
			 */
			const blockers = (def, ctx) => {
				const reasons = [];
				if (!def.whenClosed && ctx.loc && !setup.world.isOpen(ctx.loc)) reasons.push("It's open");
				const left = cooldownLeft(def);
				if (left != null) reasons.push(`Not again for ${fmt.duration(left)}`);
				if (!cond.test(def.conditions, ctx)) reasons.push(...cond.explain(def.conditions, ctx).filter((e) => !e.ok).map((e) => e.text));
				const price = priceOf(def);
				if (price && moneyOn() && setup.money.balance() < price) reasons.push(`${fmt.money(price)} to pay`);
				return [...new Set(reasons)];
			};

			/**
			 * Minutes for a duration option: a number, or "HH:MM" meaning until
			 * that time (the next one, at least a minute away).
			 */
			const minsFor = (d) => {
				if (typeof d !== "string") return d;
				const now = time.now();
				const until = time.nextAt(now, d);
				return until > now ? until - now : until + time.MIN_PER_DAY - now;
			};

			const actions = {
				/**
				 * Actions offered at the current location, with whether each is
				 * possible now and why not.
				 * @returns {{def: object, ok: boolean, reasons: string[]}[]}
				 */
				available() {
					if (!setup.world.here()) return [];
					return registry.all("action")
						.filter(offeredHere)
						.filter((def) => def.showIf == null || cond.test(def.showIf, ctxFor(def)))
						.map((def) => {
							const reasons = blockers(def, ctxFor(def));
							return { def, ok: !reasons.length, reasons, price: priceOf(def) };
						})
						.filter((a) => a.ok || !a.def.hidden);
				},

				/**
				 * People-specific actions for someone who's here (shown on the
				 * screen you get when you tap them).
				 * @param {string} npc
				 * @returns {{def: object, ok: boolean, reasons: string[]}[]}
				 */
				withNpc(npc) {
					if (!setup.world.here()) return [];
					return registry.all("action")
						.filter((def) => offeredWith(def, npc))
						.filter((def) => def.showIf == null || cond.test(def.showIf, ctxFor(def, npc)))
						.map((def) => {
							const reasons = blockers(def, ctxFor(def, npc));
							return { def, ok: !reasons.length, reasons, price: priceOf(def) };
						})
						.filter((a) => a.ok || !a.def.hidden);
				},

				/** @returns {boolean} Whether an action is running. */
				isRunning: () => running !== null,

				/**
				 * Do an action.
				 * @param {string} id
				 * @param {{mins?: number|string, npc?: string}} [opts]  mins picks one of `durations`
				 *   (a number of minutes, or "HH:MM" for "until then"); npc: who a
				 *   people-specific action is with.
				 * @returns {object} Result, plus { ok, action, elapsed }.
				 */
				do(id, opts = {}) {
					if (running) throw new setup.GameError(`Can't start "${id}" while "${running.def.id}" is running`);
					const def = registry.get("action", id);
					if (def.durations && opts.mins != null && !def.durations.includes(opts.mins)) throw new setup.GameError(`"${id}" can't last ${opts.mins} minutes`);
					// Fixed-length actions go slower or faster with status factors
					// (e.g. exhausted: actionTime 1.25). Chosen durations stay as chosen.
					const factor = !def.durations && setup.modules.has("status") ? setup.status.factor("actionTime") : 1;
					const mins = Math.round(minsFor(opts.mins ?? def.mins) * factor);
					const ctx = ctxFor(def, opts.npc);
					const result = Object.assign(effects.newResult(), { ok: false, action: id, elapsed: 0 });

					if (personal(def) ? !(opts.npc && offeredWith(def, opts.npc) && setup.npcs?.whereIs(opts.npc) === setup.world.loc()) : !offeredHere(def)) {
						throw new setup.GameError(`"${id}" isn't offered ${opts.npc ? `with ${opts.npc} ` : ""}at ${setup.world.loc()}`);
					}
					const why = blockers(def, ctx);
					if (why.length) {
						result.changes.push({ kind: "blocked", text: `${def.label}: not possible right now (${why.join("; ")}).` });
						return result;
					}

					let interrupted = null;
					ctx.interrupt = (reason) => {
						interrupted ??= reason || "interrupted";
						time.interrupt(interrupted);
					};
					running = { def, ctx, result };
					if (def.cooldown) setup.vars().acts.last[id] = time.now();
					try {
						effects.run(def.costs, ctx, result);
						bus.emit("action:start", { action: id, ctx });
						const points = [...new Set(def.checkpoints.filter((c) => c < mins))].sort((a, b) => a - b).concat(mins);
						let elapsed = 0;
						for (const p of points) {
							const adv = time.advance(p - elapsed, { reason: ctx.reason, interruptible: def.interruptible });
							elapsed += adv.elapsed;
							if (adv.interrupted) interrupted ??= adv.interrupted.reason;
							if (interrupted) break;
							if (p < mins) {
								ctx.t = time.now();
								bus.emit("action:checkpoint", { action: id, elapsed, ctx: { ...ctx, elapsed }, result, interrupt: ctx.interrupt });
								if (interrupted) break;
							}
						}
						result.elapsed = elapsed;
						if (!interrupted) {
							const queued = result.mins;
							effects.run(def.effects, ctx, result);
							const extra = result.mins - queued;
							if (extra > 0) result.elapsed += time.advance(extra, { reason: ctx.reason }).elapsed;
						}
						// `always` runs whether or not the action was interrupted.
						effects.run(def.always, ctx, result);
						result.ok = true;
						result.interrupted = interrupted || false;
						result.changes.unshift({
							kind: "action",
							text: interrupted
								? `${def.label} ended early after ${fmt.duration(result.elapsed)}.`
								: `${def.label} took ${fmt.duration(result.elapsed)}.`,
						});
					}
					finally {
						running = null;
					}
					bus.emit("action:end", { action: id, elapsed: result.elapsed, interrupted: result.interrupted, result, ctx });
					actions.illustrate({ title: def.label, media: { type: "action", id }, passage: def.passage ?? `Act_${id}` });
					// With someone: back to them afterwards.
					if (opts.npc) flow.request("Npcs_Meet");
					return result;
				},

				/**
				 * Ask for the action screen once the current tap is done: a picture,
				 * flavour text, what happened, and Continue. Used by actions, lessons,
				 * shifts and chats; anything else that's "doing something" can too.
				 * @param {{title: string, media?: {type: string, id: string, sub?: string}, passage?: string|string[]}} spec
				 *   media: the picture's folder and name (assets/media/<type>/<id>[/<sub>].webp|.gif|.mp4);
				 *   passage: the flavour text, or a list (the first that exists); if
				 *   none exists, "[<title> edit here]" shows.
				 */
				illustrate(spec) {
					flow.illustrate(spec);
				},
			};
			setup.actions = actions;

			/* ---- The action screen -------------------------------------------- */

			// { picture: "busy" } — the action screen shows a different picture for
			// this outcome: assets/media/<type>/<id>/busy.* (e.g. action/shower/cold),
			// falling back to the usual one. Use it in a `random` branch or an `if`.
			effects.register("picture", {
				apply(spec, ctx, result) {
					result.picture = String(spec);
				},
				describe: (spec) => `Shows the "${spec}" picture`,
			});

			flow.illustrationPassage = "Actions_Scene";
			ui.view("action-scene", (box) => {
				box.classList.add("m-actions", "action-scene");
				const s = flow.illustration();
				if (s) {
					box.append(ui.el("h1", { text: s.title }));
					// An outcome's own picture ({ picture: "…" } in the effects) first, then the usual one.
					const outcome = flow.lastResult()?.picture;
					const subs = s.media ? [...(outcome ? [[s.media.sub, outcome].filter(Boolean).join("/")] : []), s.media.sub] : [];
					const pic = subs.map((sub) => setup.media.render(s.media.type, s.media.id, { sub, class: "media-wide", alt: s.title })).find(Boolean);
					if (pic) box.append(pic);
					// No picture yet: an empty frame (debug mode says which file to upload).
					else if (s.media) box.append(setup.media.slot([s.media.type, s.media.id, subs[0]].filter(Boolean).join("/")));
					const text = ui.el("div", { class: "scene-text" });
					// `passage` can be a list: the first one that exists is used.
					const names = setup.util.toArray(s.passage);
					const found = names.find((p) => setup.sc.hasPassage(p));
					if (found) ui.wiki(text, found);
					else text.append(ui.el("p", { text: `[${s.title} edit here]` }), ...(setup.config.debug && names.length ? [ui.el("p", { class: "note", text: `Write this in a passage called ${names.at(-1)}.` })] : []));
					box.append(text);
				}
				const r = ui.result(flow.lastResult());
				if (r) box.append(r);
				const notes = ui.takeNotices();
				if (notes.length) box.append(ui.el("div", { class: "result notices", attrs: { role: "status" } }, ui.el("ul", {}, ...notes.map((n) => ui.el("li", { text: n })))));
				box.append(ui.button("Continue", () => {
					flow.clearResult();
					flow.continue();
				}, { class: "btn-primary" }));
			});

			// { action: "id" } or { action: [ids] } — the action in context.
			cond.register("action", {
				test: (spec, ctx) => setup.util.toArray(spec).includes(ctx.action),
				describe: (spec) => `During ${setup.util.toArray(spec).join(" or ")}`,
			});

			// { actionElapsed: { min?, max? } } — minutes into the action in context.
			cond.register("actionElapsed", {
				test: (spec, ctx) => ctx.elapsed != null && (spec.min == null || ctx.elapsed >= spec.min) && (spec.max == null || ctx.elapsed <= spec.max),
				describe: (spec) => `Between ${spec.min ?? 0} and ${spec.max ?? "∞"} minutes in`,
			});

			/* ---- UI --------------------------------------------------------- */

			/** The "Things to do" list (the place's, or someone's with `npc`). */
			const renderList = (box, list, npc = null) => {
				if (!list.length) return;
				box.append(ui.el("h2", { text: "Things to do" }));
				const ul = ui.el("ul", { class: "m-actions" });
				// The page already says when the place is closed, so don't repeat
				// "It's open" under every button.
				const closed = !setup.world.isOpen(setup.world.loc());
				for (const { def, ok, reasons } of list) {
					const li = ui.el("li");
					if (!ok) {
						// Locked: greyed out, with what's needed (decided by the user).
						const needs = closed ? reasons.filter((r) => r !== "It's open") : reasons;
						li.append(ui.button(def.label, () => {}, { disabled: true, class: "btn-locked" }));
						if (needs.length) li.append(ui.el("p", { class: "locked", text: `Needs: ${needs.join("; ")}` }));
						ul.append(li);
						continue;
					}
					const price = priceOf(def);
					const len = (d) => (typeof d === "string" ? `until ${d}` : d ? fmt.short(d) : null);
					if (def.durations) {
						// A choice of how long (sleep, waiting): the name once, then short chips.
						li.classList.add("choose-length");
						li.append(ui.el("span", { class: "action-name", text: `${def.label}${price ? ` (${fmt.money(price)})` : ""}:` }));
						for (const d of def.durations) li.append(ui.action(len(d), () => actions.do(def.id, { mins: d, npc }), { class: "btn-chip" }));
					}
					else {
						const meta = [len(def.mins), price ? fmt.money(price) : null].filter(Boolean).join(", ");
						li.append(ui.action(meta ? `${def.label} · ${meta}` : def.label, () => actions.do(def.id, { npc })));
					}
					if (def.desc) li.append(ui.el("p", { class: "note", text: def.desc }));
					ul.append(li);
				}
				box.append(ul);
			};

			setup.world.addHereSection("actions", 30, (box) => renderList(box, actions.available()));
			actions.renderList = renderList;
		},

		ready() {
			// People-specific actions on the screen you get when you tap someone (after Talk).
			if (setup.modules.has("npcs")) setup.npcs.addMeetSection("actions", 30, (box, npc) => setup.actions.renderList(box, setup.actions.withNpc(npc), npc));
		},
	});
})();
