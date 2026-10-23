/*
 * inventory — items and where they're kept.
 *
 * Every item describes itself in one definition, in labelled sections:
 *   kind        what it is: "food", "drink", "groceries", "clothing"…
 *               (storage places accept items by kind; shops group by it)
 *   shops       where it's sold: shop ids, e.g. ["patels", "freshway"]
 *   attributes  its qualities, which other systems check: ["warm", "smart"]
 *   stats       stat modifiers it gives while worn (only things with slots:
 *               carried items never change stats, decided by the user)
 *   use         what using it does (eat, drink…)
 *   price, size, desc, and `tags` for anything else you want to label
 *
 * Storage places are data: your bag (carried everywhere), a wardrobe or
 * kitchen cupboard at home (only reachable when you're there). Stackable
 * items share one entry with a quantity; unique ones (clothes) are separate
 * instances with their own uid.
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-items.js (storage places and items)
 * Every field, condition, effect and event is listed in src/modules/inventory/README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "inventory",
		version: 1,
		deps: ["world"],
		state: "inv",
		defaultState: () => ({ seq: 0, places: {} }),

		install({ registry, cond, effects, time, bus, ui, flow, fmt }) {
			registry.defineType("item", {
				required: ["name"],
				// stackable: null = decided by the unique rules (clothing makes
				// wearable things unique); true/false to say so yourself.
				defaults: {
					desc: "", kind: "misc", shops: [], attributes: [], stats: [], tags: [],
					price: 0, stackable: null, size: 1, use: null,
				},
				refs: { "stats[].stat": "stat", shops: "shop" },
				conditions: ["use.conditions"],
				effects: ["use.effects"],
				check(def) {
					const errs = [];
					if (!Number.isInteger(def.price) || def.price < 0) errs.push("price must be whole pounds ≥ 0");
					if (!(def.size >= 0)) errs.push("size must be ≥ 0");
					// Only worn things change stats (decided by the user).
					if (def.stats.length && !def.slots?.length) errs.push("only things you wear (with slots) can have stats");
					return errs;
				},
			});
			registry.defineType("storage", {
				required: ["label"],
				defaults: { at: [], carried: false, capacity: null, accepts: null, hidden: false, start: [], order: 0 },
				refs: { at: "location", "start[].item": "item" },
			});

			// Saved state ($inv):
			//   places: { bag: [{ uid, item, qty }, …], wardrobe: […], … }
			//   seq:    counter for making unique ids ("i1", "i2"…)
			// A stackable item (snacks) has one entry per place with a qty; an
			// unstackable one (each piece of clothing) has its own entry and uid,
			// so the game can tell your two pairs of socks apart.
			/** Rules that make an item unique (one entry per thing): (def) => boolean. */
			const uniqueRules = [];
			/** @returns {boolean} Whether copies of an item share one entry with a qty. */
			const stackable = (def) => def.stackable ?? !uniqueRules.some((fn) => fn(def));

			const I = () => setup.vars().inv;
			const P = (place) => (I().places[place] ??= []);
			const item = (id) => registry.get("item", id);

			const inventory = {
				/**
				 * Make some items unique, e.g. clothing: (def) => boolean.
				 * @param {Function} fn
				 */
				addUniqueRule: (fn) => uniqueRules.push(fn),

				/** @returns {boolean} Whether an item stacks (see addUniqueRule). */
				stackable,

				/** @returns {object[]} Storage definitions in display order. */
				storages: () => registry.all("storage").sort((a, b) => a.order - b.order),

				/** @returns {string[]} Places you can reach right now: carried ones plus any here. */
				accessible() {
					const loc = setup.world.loc();
					return inventory.storages()
						.filter((s) => s.carried || (loc && setup.util.toArray(s.at).includes(loc)))
						.map((s) => s.id);
				},

				/** @returns {object[]} Entries in a place: { uid, item, qty }. */
				entries: (place) => P(place),

				/** @returns {number} Space used in a place (item size × quantity). */
				used: (place) => P(place).reduce((sum, e) => sum + item(e.item).size * e.qty, 0),

				/** @returns {number|null} Space left (null = unlimited). */
				space(place) {
					const cap = registry.get("storage", place).capacity;
					return cap == null ? null : cap - inventory.used(place);
				},

				/** Why an item can't go in a place, or null if it can. */
				refuses(place, itemId, qty = 1) {
					const s = registry.get("storage", place);
					const def = item(itemId);
					// `accepts` lists kinds of item ("clothing", "food"…).
					if (s.accepts && !s.accepts.includes(def.kind)) return `${def.name} doesn't go in the ${s.label.toLowerCase()}`;
					const space = inventory.space(place);
					if (space != null && def.size * qty > space) return `Not enough room in your ${s.label.toLowerCase()}`;
					return null;
				},

				/**
				 * Count an item across places (default: everywhere you can reach).
				 * @param {string} itemId @param {string[]} [places]
				 */
				count(itemId, places = inventory.accessible()) {
					return places.reduce((sum, p) => sum + P(p).filter((e) => e.item === itemId).reduce((s, e) => s + e.qty, 0), 0);
				},

				/** @returns {{place: string, entry: object}|null} Where an item instance is. */
				find(uid) {
					for (const [place, list] of Object.entries(I().places)) {
						const entry = list.find((e) => e.uid === uid);
						if (entry) return { place, entry };
					}
					return null;
				},

				/**
				 * Add items to a place.
				 * @param {string} itemId @param {number} [qty] @param {string} [place]
				 * @param {{force?: boolean}} [opts] force: ignore capacity (e.g. starting kit)
				 * @returns {{ok: true, uids: string[]} | {ok: false, reason: string}}
				 */
				add(itemId, qty = 1, place = "bag", opts = {}) {
					const def = item(itemId);
					const why = opts.force ? null : inventory.refuses(place, itemId, qty);
					if (why) return { ok: false, reason: why };
					const list = P(place);
					const uids = [];
					if (stackable(def)) {
						let e = list.find((x) => x.item === itemId);
						if (!e) {
							e = { uid: `i${++I().seq}`, item: itemId, qty: 0 };
							list.push(e);
						}
						e.qty += qty;
						uids.push(e.uid);
					}
					else {
						for (let i = 0; i < qty; i++) {
							const e = { uid: `i${++I().seq}`, item: itemId, qty: 1 };
							list.push(e);
							uids.push(e.uid);
						}
					}
					bus.emit("inventory:added", { item: itemId, qty, place });
					return { ok: true, uids };
				},

				/**
				 * Remove items, from the given places in order (default: your bag
				 * first, then storage here).
				 * @returns {{ok: boolean, reason?: string}}
				 */
				remove(itemId, qty = 1, places = inventory.accessible().filter((p) => p !== "worn")) {
					if (inventory.count(itemId, places) < qty) return { ok: false, reason: `You don't have ${qty > 1 ? `${qty} × ` : ""}${item(itemId).name}` };
					let left = qty;
					for (const p of places) {
						const list = P(p);
						for (const e of [...list]) {
							if (e.item !== itemId || left <= 0) continue;
							const take = Math.min(e.qty, left);
							e.qty -= take;
							left -= take;
							if (e.qty <= 0) list.splice(list.indexOf(e), 1);
						}
					}
					bus.emit("inventory:removed", { item: itemId, qty });
					return { ok: true };
				},

				/** Remove one instance (or a whole stack) by uid. */
				removeUid(uid) {
					const f = inventory.find(uid);
					if (f) P(f.place).splice(P(f.place).indexOf(f.entry), 1);
				},

				/**
				 * Move an instance (or some of a stack) to another place.
				 * @returns {{ok: boolean, reason?: string, uid?: string}}
				 */
				move(uid, to, qty) {
					const f = inventory.find(uid);
					if (!f) return { ok: false, reason: "It isn't there any more" };
					const n = qty ?? f.entry.qty;
					const why = inventory.refuses(to, f.entry.item, n);
					if (why) return { ok: false, reason: why };
					const def = item(f.entry.item);
					if (!stackable(def) || n >= f.entry.qty) {
						P(f.place).splice(P(f.place).indexOf(f.entry), 1);
						if (stackable(def)) {
							const into = P(to).find((e) => e.item === f.entry.item);
							if (into) {
								into.qty += f.entry.qty;
								return { ok: true, uid: into.uid };
							}
						}
						P(to).push(f.entry);
						return { ok: true, uid };
					}
					f.entry.qty -= n;
					const added = inventory.add(f.entry.item, n, to, { force: true });
					return { ok: true, uid: added.uids[0] };
				},

				/**
				 * Use an item (eat, drink…): takes its time, applies its effects and
				 * uses one up unless `use.consume` is false.
				 * @param {string} uid
				 * @returns {object} Result
				 */
				use(uid) {
					const f = inventory.find(uid);
					const result = effects.newResult();
					if (!f) throw new setup.GameError(`No item ${uid}`);
					const def = item(f.entry.item);
					if (!def.use) throw new setup.GameError(`${def.name} can't be used`);
					if (!inventory.accessible().includes(f.place)) throw new setup.GameError(`${def.name} isn't within reach`);
					const ctx = { item: def.id, t: time.now() };
					if (!cond.test(def.use.conditions, ctx)) {
						const why = cond.explain(def.use.conditions, ctx).filter((e) => !e.ok).map((e) => e.text);
						result.changes.push({ kind: "blocked", text: `Can't: ${why.join("; ")}` });
						return result;
					}
					if (def.use.mins) time.advance(def.use.mins, { reason: `use:${def.id}` });
					if (def.use.consume !== false) {
						f.entry.qty -= 1;
						if (f.entry.qty <= 0) P(f.place).splice(P(f.place).indexOf(f.entry), 1);
					}
					result.changes.push({ kind: "use", text: `${def.use.label ?? "Used"}: ${def.name}.` });
					effects.run(def.use.effects ?? [], ctx, result);
					bus.emit("inventory:used", { item: def.id });
					return result;
				},
			};
			setup.inventory = inventory;

			// { has: "item" } or { has: { item, qty?, place? } } — you have it within reach.
			cond.register("has", {
				test(spec) {
					const { item: id, qty = 1, place } = typeof spec === "string" ? { item: spec } : spec;
					return inventory.count(id, place ? [place] : undefined) >= qty;
				},
				describe(spec) {
					const { item: id, qty = 1 } = typeof spec === "string" ? { item: spec } : spec;
					return `${qty > 1 ? `${qty} × ` : ""}${registry.tryGet("item", id)?.name ?? id}`;
				},
			});

			// { item: { id, qty, place? } } — positive adds (to the bag by default), negative uses up.
			effects.register("item", {
				apply(spec, ctx, result) {
					const qty = spec.qty ?? 1;
					const name = item(spec.id).name;
					if (qty >= 0) {
						const r = inventory.add(spec.id, qty, spec.place ?? "bag");
						result.changes.push({ kind: "item", text: r.ok ? `+${qty} ${name}` : r.reason });
					}
					else {
						const r = inventory.remove(spec.id, -qty, spec.place ? [spec.place] : undefined);
						if (!r.ok) result.changes.push({ kind: "item", text: r.reason });
					}
				},
				describe: (spec) => `${(spec.qty ?? 1) >= 0 ? "Get" : "Uses"} ${registry.tryGet("item", spec.id)?.name ?? spec.id}`,
			});

			/* ---- UI: the Bag ------------------------------------------------- */

			/** One row per entry with buttons for what you can do with it. */
			const row = (e, place, buttons) => {
				const def = item(e.item);
				const li = ui.el("li", { class: "inv-row" },
					setup.media.thumb("item", def.id, def.name),
					ui.el("span", { class: "inv-name", text: e.qty > 1 ? `${def.name} × ${e.qty}` : def.name }));
				const extra = (inventory.rowButtons ?? []).flatMap((fn) => fn(e, place, def) ?? []);
				for (const b of [...buttons, ...extra]) li.append(b);
				if (def.desc) li.append(ui.el("p", { class: "note", text: def.desc }));
				return li;
			};

			/** Extra per-row buttons other modules add (e.g. clothing's "Wear"). */
			inventory.rowButtons = [];

			ui.view("bag", (box) => {
				box.classList.add("m-inventory");
				const here = inventory.accessible().filter((p) => !registry.get("storage", p).hidden);
				for (const place of here) {
					const s = registry.get("storage", place);
					const space = inventory.space(place);
					box.append(ui.el("h2", { text: `${s.label}${space != null ? ` (${inventory.used(place)}/${s.capacity})` : ""}` }));
					const list = P(place);
					if (!list.length) {
						box.append(ui.el("p", { class: "note", text: "Empty." }));
						continue;
					}
					const ul = ui.el("ul", { class: "inv" });
					for (const e of list) {
						const def = item(e.item);
						const buttons = [];
						if (def.use) buttons.push(ui.action(`${def.use.label ?? "Use"}${def.use.mins ? ` (${fmt.duration(def.use.mins)})` : ""}`, () => inventory.use(e.uid)));
						for (const other of here) {
							if (other === place || other === "worn") continue;
							const o = registry.get("storage", other);
							if (!inventory.refuses(other, e.item, 1)) buttons.push(ui.action(`Put in ${o.label.toLowerCase()}`, () => inventory.move(e.uid, other)));
						}
						ul.append(row(e, place, buttons));
					}
					box.append(ul);
				}
				box.append(ui.button("Back", () => flow.go(flow.home)));
			});
		},

		newGame() {
			for (const s of setup.inventory.storages()) {
				for (const { item, qty = 1 } of s.start) setup.inventory.add(item, qty, s.id, { force: true });
			}
		},
	});
})();
