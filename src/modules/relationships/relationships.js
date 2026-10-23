/*
 * relationships — how the PC gets on with each NPC, and the Talk menu.
 * See README.md.
 *
 * A relationship track (friendship, romance…) is a number per NPC with named
 * tiers. Interactions (chat, compliment…) are offered on an NPC's sheet when
 * they're with you; they take time, have a cooldown per NPC, and change
 * tracks through effects. Values live in $npcs[id].rel (created on first use).
 *
 * Romance (§1): a track or interaction tagged "romance" needs an
 * { ageAtLeast: 18 } condition; the validator enforces this.
 *
 * Events: rel:changed { npc, track, from, to }, rel:tier { npc, track, tier, up },
 *         rel:interact { npc, interaction }
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "relationships",
		version: 1,
		deps: ["npcs", "character"],

		install({ registry, cond, effects, time, bus, ui, flow, fmt }) {
			registry.defineType("relTrack", {
				required: ["label"],
				defaults: { desc: "", min: 0, max: 100, start: 0, tiers: [], tags: [], conditions: null, gain: "relGain", hidden: false, order: 0 },
				conditions: ["conditions"],
				check(def) {
					const errs = [];
					const ats = def.tiers.map((t) => t.at);
					if (ats.some((a, i) => i && a <= ats[i - 1])) errs.push("tiers must go up in order of `at`");
					return errs;
				},
			});
			registry.defineType("interaction", {
				required: ["label"],
				defaults: { desc: "", mins: 5, cooldown: 0, once: false, conditions: null, effects: [], npcs: null, npcTags: null, tags: [], hidden: false, order: 0 },
				refs: { npcs: "npc" },
				conditions: ["conditions"],
				effects: ["effects"],
				check(def) {
					return Number.isInteger(def.cooldown) && def.cooldown >= 0 ? [] : ["cooldown must be whole minutes ≥ 0"];
				},
			});

			const S = (id) => setup.npcs.state(id);
			const track = (id) => registry.get("relTrack", id);
			const tierOf = (t, v) => [...t.tiers].reverse().find((x) => v >= x.at) ?? null;

			const rel = {
				/** @returns {object[]} Tracks in order. */
				tracks: () => registry.all("relTrack").sort((a, b) => a.order - b.order),

				/** @returns {boolean} Whether a track applies to this NPC (its conditions, e.g. 18+). */
				applies: (npc, t) => cond.test(track(t).conditions, { npc }),

				/** @returns {number} */
				get: (npc, t) => S(npc).rel?.[t] ?? track(t).start,

				/** @returns {{at: number, label: string}|null} The current tier. */
				tier: (npc, t) => tierOf(track(t), rel.get(npc, t)),

				/**
				 * Change a track. Gains go through status factors (`relGain`), so
				 * e.g. being unwashed can make people warm to you more slowly.
				 * @returns {number} The actual change.
				 */
				add(npc, t, amount) {
					const def = track(t);
					if (!rel.applies(npc, t)) return 0;
					const before = rel.get(npc, t);
					const delta = amount > 0 && setup.modules.has("status") ? amount * setup.status.factor(def.gain) : amount;
					const after = Math.min(def.max, Math.max(def.min, Math.round((before + delta) * 100) / 100));
					(S(npc).rel ??= {})[t] = after;
					bus.emit("rel:changed", { npc, track: t, from: before, to: after });
					const a = tierOf(def, before);
					const b = tierOf(def, after);
					if (a !== b && b) {
						bus.emit("rel:tier", { npc, track: t, tier: b.label, up: after > before });
						if (after > before) ui.notify(`${setup.npcs.get(npc).name}: ${b.label}.`);
					}
					return after - before;
				},

				/** Set a track (debug). */
				set(npc, t, v) {
					(S(npc).rel ??= {})[t] = Math.min(track(t).max, Math.max(track(t).min, v));
					bus.emit("rel:changed", { npc, track: t, to: v });
				},

				/** @returns {boolean} Whether this interaction is offered with this NPC at all. */
				offers(i, npc) {
					const n = setup.npcs.get(npc);
					if (i.npcs && !i.npcs.includes(npc)) return false;
					if (i.npcTags && !i.npcTags.some((tag) => n.tags.includes(tag) || n.role === tag)) return false;
					return true;
				},

				/** @returns {number|null} Minutes until an interaction can be used again with this NPC. */
				cooldownLeft(npc, iid) {
					const i = registry.get("interaction", iid);
					const last = S(npc).cool?.[iid];
					if (last == null) return null;
					if (i.once) return Infinity;
					const left = last + i.cooldown - time.now();
					return left > 0 ? left : null;
				},

				/**
				 * Interactions with an NPC, with whether each is possible now and why not.
				 * @returns {{def: object, ok: boolean, reasons: string[]}[]}
				 */
				interactions(npc) {
					const ctx = { npc, t: time.now() };
					return registry.all("interaction")
						.filter((i) => rel.offers(i, npc))
						.sort((a, b) => a.order - b.order)
						.map((def) => {
							const reasons = [];
							const left = rel.cooldownLeft(npc, def.id);
							if (left === Infinity) return null;
							if (left != null) reasons.push(`Not again for ${fmt.duration(left)}`);
							if (!cond.test(def.conditions, ctx)) reasons.push(...cond.explain(def.conditions, ctx).filter((e) => !e.ok).map((e) => e.text));
							return { def, ok: !reasons.length, reasons };
						})
						.filter((x) => x && (x.ok || !x.def.hidden));
				},

				/**
				 * Do an interaction with an NPC who is here.
				 * @returns {object} Result
				 */
				interact(npc, iid) {
					const def = registry.get("interaction", iid);
					const result = effects.newResult();
					const entry = rel.interactions(npc).find((x) => x.def.id === iid);
					if (!entry || !entry.ok) {
						result.changes.push({ kind: "blocked", text: `${def.label}: not possible right now.` });
						return result;
					}
					const ctx = { npc, t: time.now(), interaction: iid };
					(S(npc).cool ??= {})[iid] = time.now();
					if (def.mins) time.advance(def.mins, { reason: `talk:${iid}` });
					effects.run(def.effects, ctx, result);
					if (result.mins) {
						time.advance(result.mins, { reason: `talk:${iid}` });
						result.mins = 0;
					}
					result.changes.unshift({ kind: "talk", text: `${def.label} (${fmt.duration(def.mins)}).` });
					bus.emit("rel:interact", { npc, interaction: iid });
					flow.request("Npcs_Sheet");
					return result;
				},
			};
			setup.rel = rel;

			// { rel: { npc?, track, min?, max? } } — npc defaults to the one in context.
			cond.register("rel", {
				test(spec, ctx) {
					const v = rel.get(spec.npc ?? ctx.npc, spec.track);
					return (spec.min == null || v >= spec.min) && (spec.max == null || v <= spec.max);
				},
				describe(spec, ctx) {
					const who = setup.npcs.get(spec.npc ?? ctx.npc)?.name ?? "They";
					const t = registry.tryGet("relTrack", spec.track);
					const tier = t?.tiers.find((x) => x.at === spec.min);
					return spec.min != null ? `${who}: ${t?.label ?? spec.track} ${tier ? tier.label : `${spec.min}+`}` : `${who}: ${t?.label ?? spec.track} up to ${spec.max}`;
				},
			});

			// { rel: { npc?, friendship: 3, romance: 1 } }
			effects.register("rel", {
				apply(spec, ctx, result) {
					const npc = spec.npc ?? ctx.npc;
					for (const [t, amount] of Object.entries(spec)) {
						if (t === "npc") continue;
						const got = rel.add(npc, t, amount);
						if (got && !ctx.quiet) result.changes.push({ kind: "rel", text: `${setup.npcs.get(npc).name}: ${track(t).label} ${got > 0 ? "+" : "−"}${Math.abs(Math.round(got * 10) / 10)}` });
					}
				},
				describe: (spec) => `Changes how ${spec.npc ? setup.npcs.get(spec.npc).name : "they"} feel about you`,
			});

			/* ---- UI --------------------------------------------------------- */

			const bars = (npc) => {
				const ul = ui.el("ul", { class: "stats" });
				for (const t of rel.tracks()) {
					if (t.hidden || !rel.applies(npc, t.id)) continue;
					const v = rel.get(npc, t.id);
					const tier = rel.tier(npc, t.id);
					ul.append(ui.el("li", {},
						ui.el("div", { class: "stat-row" }, ui.el("span", { text: t.label }), ui.el("span", { class: "stat-val", text: tier?.label ?? String(Math.round(v)) })),
						ui.el("div", { class: "bar" }, ui.el("div", { class: "bar-fill", attrs: { style: `width:${Math.round(((v - t.min) / (t.max - t.min)) * 100)}%` } }))));
				}
				return ul;
			};

			setup.npcs.addSheetSection("relationship", 10, (box, npc) => {
				if (!setup.npcs.hasMet(npc)) return;
				box.append(ui.el("h2", { text: "You and them" }), bars(npc));
			});

			setup.npcs.addSheetSection("talk", 20, (box, npc) => {
				if (setup.npcs.whereIs(npc) !== setup.world.loc()) return;
				const list = rel.interactions(npc);
				if (!list.length) return;
				box.append(ui.el("h2", { text: "Talk" }));
				const ul = ui.el("ul", { class: "m-actions" });
				for (const { def, ok, reasons } of list) {
					const li = ui.el("li", {}, ui.action(def.mins ? `${def.label} (${fmt.duration(def.mins)})` : def.label, () => rel.interact(npc, def.id), { disabled: !ok }));
					if (!ok) li.append(ui.el("p", { class: "locked", text: reasons.join("; ") }));
					else if (def.desc) li.append(ui.el("p", { class: "note", text: def.desc }));
					ul.append(li);
				}
				box.append(ul);
			});

			setup.character.addMeSection("people", 39, (box) => {
				const met = registry.all("npc").filter((n) => setup.npcs.hasMet(n.id));
				if (!met.length) return;
				box.append(ui.el("h2", { text: "People you know" }));
				const ul = ui.el("ul", { class: "people" });
				for (const n of met) {
					const tiers = rel.tracks().filter((t) => !t.hidden && rel.applies(n.id, t.id) && rel.get(n.id, t.id) > t.start).map((t) => rel.tier(n.id, t.id)?.label).filter(Boolean);
					ul.append(ui.el("li", {}, ui.button(`${n.name}${tiers.length ? ` (${tiers.join(", ")})` : ""}`, () => setup.npcs.openSheet(n.id))));
				}
				box.append(ul);
			});
		},
	});
})();
