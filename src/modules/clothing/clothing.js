/*
 * clothing — what you wear, the wardrobe and outfits.
 *
 * Clothes are items with a `clothing` block. Worn clothes live in the hidden
 * "worn" storage place; $wear maps each body slot to the item worn there.
 * You can change only where it makes sense (rooms tagged "changing").
 * Clothes can carry stat modifiers (`clothing.modifiers`), which apply while
 * they're worn; statuses can switch on from what you wear (`whileCond`).
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-clothing.js (slots, clothes, outfit effects)
 *   src/01-engine/config.js → clothing (the "dressed to go out" rule)
 * Every field, condition, effect and event is listed in src/modules/clothing/README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "clothing",
		version: 1,
		deps: ["inventory", "character"],
		state: "wear",
		defaultState: () => ({ slots: {}, outfits: [] }),

		install({ registry, cond, effects, time, bus, ui, flow, config }) {
			registry.defineType("clothingSlot", { required: ["label"], defaults: { order: 0 } });
			registry.defineType("outfit", { required: ["label", "items"], defaults: { start: false }, refs: { items: "item" } });
			registry.extendType("item", {
				refs: { "clothing.slots": "clothingSlot" },
				check: (def) => (def.clothing && !(Array.isArray(def.clothing.slots) && def.clothing.slots.length) ? ["clothing needs at least one slot"] : []),
			});
			// Where worn clothes are kept: always with you, never listed in the bag.
			registry.define("storage", { id: "worn", label: "Worn", carried: true, hidden: true, order: 99 });

			const W = () => setup.vars().wear;
			const itemOf = (uid) => {
				const f = setup.inventory.find(uid);
				return f ? registry.get("item", f.entry.item) : null;
			};
			const MINS_PER_CHANGE = 1;

			const clothing = {
				/** @returns {object[]} Slot definitions in order. */
				slots: () => registry.all("clothingSlot").sort((a, b) => a.order - b.order),

				/** @returns {{slot: object, uid: string|null, item: object|null}[]} One row per slot. */
				worn: () => clothing.slots().map((slot) => {
					const uid = W().slots[slot.id] ?? null;
					return { slot, uid, item: uid ? itemOf(uid) : null };
				}),

				/** @returns {object[]} Distinct items being worn. */
				wornItems() {
					const uids = [...new Set(Object.values(W().slots))];
					return uids.map((uid) => ({ uid, item: itemOf(uid) })).filter((x) => x.item);
				},

				/** @returns {boolean} Is a slot covered? */
				covers: (slot) => Boolean(W().slots[slot]),

				/** @returns {boolean} Can you change clothes here? */
				canChangeHere() {
					const here = setup.world.here();
					return Boolean(here) && here.tags.includes("changing");
				},

				/**
				 * Are you decently dressed? Uses setup.config.clothing.dressed:
				 * every group in `cover` needs one of its slots covered, and nothing
				 * worn may have a tag in `notOutside`.
				 */
				dressed() {
					const rule = config.clothing?.dressed;
					if (!rule) return true;
					const coverOk = (rule.cover ?? []).every((group) => group.some((s) => clothing.covers(s)));
					const tagsOk = clothing.wornItems().every((w) => !w.item.tags.some((t) => (rule.notOutside ?? []).includes(t)));
					return coverOk && tagsOk;
				},

				/**
				 * Sum any number attributes in the items' `clothing` blocks over what
				 * you're wearing (none are used at the moment: warmth and smartness
				 * are tags, decided by the user).
				 * @returns {Object<string, number>}
				 */
				outfitStats() {
					const out = {};
					for (const { item } of clothing.wornItems()) {
						for (const [k, v] of Object.entries(item.clothing)) if (typeof v === "number") out[k] = (out[k] ?? 0) + v;
					}
					return out;
				},

				/**
				 * Put something on. Anything in the way goes back where the new
				 * item came from (or your bag).
				 * @returns {{ok: boolean, reason?: string}}
				 */
				wear(uid, opts = {}) {
					const f = setup.inventory.find(uid);
					if (!f) return { ok: false, reason: "It isn't there any more" };
					const def = registry.get("item", f.entry.item);
					if (!def.clothing) return { ok: false, reason: `${def.name} isn't something you wear` };
					if (!opts.force && !clothing.canChangeHere()) return { ok: false, reason: "You can't get changed here" };
					const back = f.place === "worn" ? "bag" : f.place;
					for (const s of def.clothing.slots) {
						const old = W().slots[s];
						if (old && old !== uid) clothing.takeOff(old, back, { force: true });
					}
					const moved = setup.inventory.move(uid, "worn");
					if (!moved.ok) return moved;
					for (const s of def.clothing.slots) W().slots[s] = moved.uid;
					if (!opts.force) time.advance(MINS_PER_CHANGE, { reason: "dress" });
					bus.emit("clothing:changed", {});
					return { ok: true };
				},

				/**
				 * Take something off and put it somewhere (default: your bag, or the
				 * wardrobe if there is one here).
				 */
				takeOff(uid, to, opts = {}) {
					if (!opts.force && !clothing.canChangeHere()) return { ok: false, reason: "You can't get changed here" };
					const dest = to ?? clothing.homeFor(uid);
					const moved = setup.inventory.move(uid, dest);
					if (!moved.ok) return moved;
					for (const [s, u] of Object.entries(W().slots)) if (u === uid) delete W().slots[s];
					if (!opts.force) time.advance(MINS_PER_CHANGE, { reason: "undress" });
					bus.emit("clothing:changed", {});
					return { ok: true };
				},

				/**
				 * Change several things at once (decided by the user): take off
				 * `remove`, put on `wear`, then spend a minute per item.
				 * @param {{wear?: string[], remove?: string[]}} sel  item uids
				 * @returns {object} Result
				 */
				change(sel) {
					const result = effects.newResult();
					if (!clothing.canChangeHere()) {
						result.changes.push({ kind: "blocked", text: "You can't get changed here." });
						return result;
					}
					const name = (uid) => itemOf(uid)?.name ?? "?";
					// takeOff/wear are called with force: true so they don't each
					// spend a minute; the total time is charged once, below.
					const off = [];
					const on = [];
					for (const uid of sel.remove ?? []) {
						const n = name(uid);
						if (clothing.takeOff(uid, undefined, { force: true }).ok) off.push(n);
					}
					for (const uid of sel.wear ?? []) {
						const before = new Set(clothing.wornItems().map((w) => w.uid));
						const n = name(uid);
						if (!clothing.wear(uid, { force: true }).ok) continue;
						on.push(n);
						// Anything this replaced counts as taken off.
						for (const u of before) if (!clothing.wornItems().some((w) => w.uid === u)) off.push(name(u));
					}
					const mins = (on.length + off.length) * MINS_PER_CHANGE;
					if (mins) time.advance(mins, { reason: "dress" });
					if (on.length) result.changes.push({ kind: "dress", text: `Put on: ${setup.text.list(on)}.` });
					if (off.length) result.changes.push({ kind: "dress", text: `Took off: ${setup.text.list([...new Set(off)])}.` });
					result.changes.push({ kind: "dress", text: mins ? `Getting changed took ${setup.fmt.duration(mins)}.${clothing.dressed() ? "" : " You're not dressed to go out."}` : "You didn't change anything." });
					bus.emit("clothing:changed", {});
					return result;
				},

				/** Best place for clothes you take off: a reachable store that takes them, else the bag. */
				homeFor(uid) {
					const item = itemOf(uid);
					const stores = setup.inventory.accessible().filter((p) => p !== "worn" && p !== "bag");
					return stores.find((p) => !setup.inventory.refuses(p, item.id, 1)) ?? "bag";
				},

				/** Save what you're wearing as a named outfit. */
				saveOutfit(name) {
					const uids = clothing.wornItems().map((w) => w.uid);
					const list = W().outfits.filter((o) => o.name !== name);
					list.push({ name, uids });
					W().outfits = list;
				},

				/** Forget a saved outfit. */
				deleteOutfit(name) {
					W().outfits = W().outfits.filter((o) => o.name !== name);
				},

				/**
				 * Change into a saved outfit, using whatever of it is within reach.
				 * @returns {{ok: boolean, missing: number}}
				 */
				wearOutfit(name) {
					const o = W().outfits.find((x) => x.name === name);
					if (!o) return { ok: false, missing: 0 };
					const reach = setup.inventory.accessible();
					let missing = 0;
					for (const w of clothing.wornItems()) if (!o.uids.includes(w.uid)) clothing.takeOff(w.uid, undefined, { force: true });
					for (const uid of o.uids) {
						const f = setup.inventory.find(uid);
						if (!f || !reach.includes(f.place)) missing++;
						else if (f.place !== "worn") clothing.wear(uid, { force: true });
					}
					time.advance(MINS_PER_CHANGE * 3, { reason: "dress" });
					bus.emit("clothing:changed", {});
					return { ok: true, missing };
				},
			};
			setup.clothing = clothing;

			// { wearing: "item_id" } — you have it on.
			// { wearing: { tag: "smart", min: 2 } } — at least `min` (default 1)
			// things you're wearing have that tag.
			cond.register("wearing", {
				test(spec) {
					const worn = clothing.wornItems();
					if (typeof spec === "string") return worn.some((w) => w.item.id === spec);
					return worn.filter((w) => w.item.tags.includes(spec.tag)).length >= (spec.min ?? 1);
				},
				describe: (spec) => (typeof spec === "string"
					? `Wearing ${registry.tryGet("item", spec)?.name ?? spec}`
					: `Wearing ${spec.min > 1 ? `${spec.min} things` : "something"} ${spec.tag}`),
			});

			// { outfit: { <attribute>: { min, max } } } — totals of number attributes in range.
			cond.register("outfit", {
				test(spec) {
					const totals = clothing.outfitStats();
					return Object.entries(spec).every(([k, r]) => (r.min == null || (totals[k] ?? 0) >= r.min) && (r.max == null || (totals[k] ?? 0) <= r.max));
				},
				describe: (spec) => Object.entries(spec).map(([k, r]) => `Outfit ${k}${r.min != null ? ` at least ${r.min}` : ""}${r.max != null ? ` at most ${r.max}` : ""}`).join(", "),
			});

			// { dressed: true } — decently dressed (see clothing.dressed()).
			cond.register("dressed", {
				test: (spec) => clothing.dressed() === (spec !== false),
				describe: (spec) => (spec === false ? "Not dressed" : "You need to get dressed"),
			});

			/* ---- UI ------------------------------------------------------------ */

			// Clothes in the bag point you to the wardrobe screen to change.
			setup.inventory.rowButtons.push((e, place, def) => {
				if (!def.clothing || place === "worn" || !clothing.canChangeHere()) return [];
				return [ui.button("Get changed", () => flow.go("Clothing_Wardrobe"))];
			});

			ui.view("wardrobe", (box) => {
				box.classList.add("m-clothing");
				const canChange = clothing.canChangeHere();
				if (!canChange) box.append(ui.el("p", { class: "note", text: "You can't get changed here. Find a bedroom, fitting room or changing room." }));
				box.append(ui.el("p", { class: clothing.dressed() ? "note" : "locked", text: clothing.dressed() ? "You're dressed to go out." : "You're not dressed to go out." }));
				if (canChange) box.append(ui.el("p", { class: "note", text: "Tick what to take off and what to put on, then tap Change." }));

				const picks = { wear: [], remove: [] };
				const tick = (list, uid, label) => {
					const cb = ui.el("input", { attrs: { type: "checkbox", "aria-label": label, disabled: !canChange }, on: { change: (ev) => {
						const arr = picks[list];
						if (ev.target.checked) arr.push(uid);
						else arr.splice(arr.indexOf(uid), 1);
					} } });
					return cb;
				};
				const slotsOf = (def) => def.clothing.slots.map((s) => registry.get("clothingSlot", s).label).join(" + ");

				box.append(ui.el("h2", { text: "Wearing (tick to take off)" }));
				const worn = ui.el("ul", { class: "inv change-list" });
				const shown = new Set();
				for (const { slot, uid, item } of clothing.worn()) {
					if (uid && shown.has(uid)) continue;
					if (uid) shown.add(uid);
					const label = item ? slotsOf(item) : slot.label;
					// The whole row is a <label>, so tapping anywhere on it ticks the box.
					worn.append(ui.el("li", {}, ui.el(item && canChange ? "label" : "div", { class: "inv-row" },
						item ? tick("remove", uid, `Take off ${item.name}`) : ui.el("span", { class: "tick-none" }),
						item ? setup.media.thumb("item", item.id, item.name) : ui.el("span", { class: "thumb thumb-none" }),
						ui.el("span", { class: "inv-slot", text: `${label}: ` }),
						ui.el("span", { class: "inv-name", text: item ? item.name : "—" }))));
				}
				box.append(worn);

				if (canChange) {
					for (const place of setup.inventory.accessible().filter((p) => p !== "worn")) {
						const clothes = setup.inventory.entries(place).filter((e) => registry.get("item", e.item).clothing);
						if (!clothes.length) continue;
						box.append(ui.el("h2", { text: `In your ${registry.get("storage", place).label.toLowerCase()} (tick to put on)` }));
						const list = ui.el("ul", { class: "inv change-list" });
						for (const e of clothes) {
							const def = registry.get("item", e.item);
							list.append(ui.el("li", {}, ui.el("label", { class: "inv-row" },
								tick("wear", e.uid, `Put on ${def.name}`),
								setup.media.thumb("item", def.id, def.name),
								ui.el("span", { class: "inv-name", text: def.name }),
								ui.el("span", { class: "inv-slot", text: ` (${slotsOf(def)})` }))));
						}
						box.append(list);
					}
					box.append(ui.action("Change", () => clothing.change(picks), { class: "btn-primary" }));

					box.append(ui.el("h2", { text: "Outfits" }));
					const outfits = ui.el("ul", { class: "inv" });
					for (const o of W().outfits) {
						outfits.append(ui.el("li", { class: "inv-row" },
							ui.el("span", { class: "inv-name", text: o.name }),
							ui.action("Wear", () => clothing.wearOutfit(o.name)),
							ui.button("Delete", () => {
								clothing.deleteOutfit(o.name);
								flow.go("Clothing_Wardrobe");
							})));
					}
					box.append(outfits);
					const name = ui.el("input", { attrs: { type: "text", maxlength: 24, placeholder: "Outfit name", "aria-label": "Outfit name" } });
					box.append(ui.el("div", { class: "debug-row" }, name, ui.button("Save what I'm wearing", () => {
						if (name.value.trim()) clothing.saveOutfit(name.value.trim());
						flow.go("Clothing_Wardrobe");
					})));
				}
				box.append(ui.button("Back", () => flow.go(flow.home)));
			});

			// What you're wearing, on the Me screen.
			setup.character.addMeSection("clothes", 30, (box) => {
				box.append(ui.el("h2", { text: "Wearing" }));
				const items = clothing.wornItems();
				if (!items.length) box.append(ui.el("p", { text: "Nothing at all." }));
				const ul = ui.el("ul", { class: "parts" });
				for (const w of items) {
					const slots = w.item.clothing.slots.map((s) => registry.get("clothingSlot", s).label).join(" + ");
					ul.append(ui.el("li", { class: "inv-row", attrs: { title: w.item.desc || null } },
						setup.media.thumb("item", w.item.id, w.item.name),
						ui.el("span", { class: "inv-slot", text: `${slots}: ` }), ui.el("span", { text: w.item.name })));
				}
				if (items.length) box.append(ul);
				// What your outfit adds up to: its tags (warm, smart, waterproof…).
				const tags = [...new Set(items.flatMap((w) => w.item.tags))];
				if (tags.length) box.append(ui.el("p", { class: "note", text: `Your outfit: ${tags.join(", ")}.` }));
				if (!clothing.dressed()) box.append(ui.el("p", { class: "locked", text: "You're not dressed to go out." }));
				if (clothing.canChangeHere()) box.append(ui.button("Get changed", () => flow.go("Clothing_Wardrobe")));
			});

			// A "Get changed" button on the Here screen where you can change.
			setup.world.addHereSection("wardrobe", 32, (box) => {
				if (clothing.canChangeHere()) box.append(ui.button("Get changed", () => flow.go("Clothing_Wardrobe")));
			});
		},

		ready() {
			// Clothes' own stat modifiers apply while they're worn.
			if (setup.modules.has("stats")) {
				setup.stats.addModifierSource(() => setup.clothing.wornItems().flatMap((w) => (w.item.clothing.modifiers ?? []).map((m) => ({ ...m, source: `item:${w.item.id}` }))));
			}
		},

		newGame() {
			// Put on the starting outfit (taken from wherever it was put at the start).
			for (const o of setup.registry.all("outfit").filter((x) => x.start)) {
				for (const id of o.items) {
					for (const place of Object.keys(setup.vars().inv.places)) {
						const e = setup.inventory.entries(place).find((x) => x.item === id);
						if (e) {
							setup.clothing.wear(e.uid, { force: true });
							break;
						}
					}
				}
			}
		},
	});
})();
