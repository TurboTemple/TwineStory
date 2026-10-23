/*
 * shops — buying items.
 *
 * A shop is data: where it is, and what it is. It doesn't list its stock:
 * every item whose `shops` list includes the shop's id (or whose kind is in
 * the shop's `sells`) is for sale there, so putting an item on sale is just
 * adding the shop to the item. Prices come from a hook (default: the item's
 * own price). Bought items go in your bag.
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-shops.js (the shops)
 *   town-items.js, town-clothing.js (each item's `shops` say where it's sold)
 * Every field, condition, effect and event is listed in src/modules/shops/README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "shops",
		version: 1,
		deps: ["inventory", "money", "world"],

		install({ registry, cond, effects, time, bus, ui, flow, fmt }) {
			registry.defineType("shop", {
				required: ["name", "at"],
				// sells: kinds of item this shop sells all of, on top of items
				// that list the shop in their `shops` (e.g. sells: ["food"]).
				defaults: { desc: "", sells: [], conditions: null, price: "default", payWith: null, mins: 2 },
				refs: { at: "location", payWith: "account" },
				conditions: ["conditions"],
			});

			const priceHooks = new Map();

			const shops = {
				/**
				 * Register a pricing rule: (shop, item) => whole pounds.
				 * @param {string} name @param {Function} fn
				 */
				registerPriceHook: (name, fn) => priceHooks.set(name, fn),

				/** @returns {boolean} */
				hasPriceHook: (name) => priceHooks.has(name),

				/** @returns {object[]} Shops at the current location. */
				here() {
					const loc = setup.world.loc();
					return registry.query("shop", (s) => setup.util.toArray(s.at).includes(loc));
				},

				/**
				 * Everything a shop sells: items that list it in `shops`, or whose
				 * kind is in its `sells`, in the order the items are defined.
				 * @returns {object[]} item definitions
				 */
				stock(shop) {
					const def = typeof shop === "string" ? registry.get("shop", shop) : shop;
					return registry.all("item").filter((it) => it.shops.includes(def.id) || def.sells.includes(it.kind));
				},

				/** @returns {number} What an item costs in a shop. */
				price(shop, item) {
					const def = typeof shop === "string" ? registry.get("shop", shop) : shop;
					const it = typeof item === "string" ? registry.get("item", item) : item;
					return priceHooks.get(def.price)(def, it);
				},

				/** Why you can't shop here now, or null. */
				closedReason(shop) {
					const def = registry.get("shop", shop);
					const loc = setup.world.loc();
					if (!setup.util.toArray(def.at).includes(loc)) return "You're not in the shop";
					if (!setup.world.isOpen(loc)) return "It's closed";
					if (!cond.test(def.conditions, { shop: def.id })) return cond.explain(def.conditions, { shop: def.id }).filter((e) => !e.ok).map((e) => e.text).join("; ");
					return null;
				},

				/**
				 * Buy one of an item: checks the shop's open and your bag has room,
				 * then pays and puts it in your bag.
				 * @returns {object} Result plus { ok }
				 */
				buy(shopId, itemId) {
					const def = registry.get("shop", shopId);
					const item = shops.stock(def).find((it) => it.id === itemId);
					if (!item) throw new setup.GameError(`${def.name} doesn't sell ${itemId}`);
					const result = Object.assign(effects.newResult(), { ok: false });
					const fail = (text) => {
						result.changes.push({ kind: "blocked", text });
						return result;
					};
					const closed = shops.closedReason(shopId);
					if (closed) return fail(closed);
					const room = setup.inventory.refuses("bag", itemId, 1);
					if (room) return fail(room);
					const cost = shops.price(def, item);
					const paid = setup.money.pay(cost, { from: def.payWith ?? undefined, reason: `${item.name} at ${def.name}` });
					if (!paid.ok) return fail(paid.reason);
					setup.inventory.add(itemId, 1, "bag");
					if (def.mins) time.advance(def.mins, { reason: "shopping" });
					result.ok = true;
					result.changes.push({ kind: "buy", text: `Bought ${item.name} for ${fmt.money(cost)}.` });
					bus.emit("shop:bought", { shop: shopId, item: itemId, price: cost });
					return result;
				},

				/** The shop whose page is open (not saved). */
				viewing: null,

				/** Open a shop's page. */
				open(id) {
					shops.viewing = id;
					flow.go("Shops_Shop");
				},
			};
			setup.shops = shops;

			// "default": the item's own price.
			shops.registerPriceHook("default", (shop, item) => item.price);

			/* ---- UI ------------------------------------------------------------ */

			setup.world.addHereSection("shops", 28, (box) => {
				const list = shops.here();
				if (!list.length) return;
				box.append(ui.el("h2", { text: "Shopping" }));
				for (const s of list) {
					const why = shops.closedReason(s.id);
					box.append(ui.button(`Browse ${s.name}`, () => shops.open(s.id), { disabled: Boolean(why) }));
					if (why) box.append(ui.el("p", { class: "locked", text: why }));
				}
			});

			ui.view("shop", (box) => {
				box.classList.add("m-shops");
				const id = shops.viewing;
				if (!id || !registry.has("shop", id)) {
					box.append(ui.el("p", { text: "No shop open." }), ui.button("Back", () => flow.go(flow.home)));
					return;
				}
				const def = registry.get("shop", id);
				box.append(ui.el("h1", { text: def.name }));
				if (def.desc) box.append(ui.el("p", { text: def.desc }));
				const r = ui.result(flow.lastResult());
				if (r) box.append(r);
				const space = setup.inventory.space("bag");
				box.append(ui.el("p", { class: "note", text: `You have ${fmt.money(setup.money.balance())}.${space != null ? ` Bag space: ${space}.` : ""}` }));
				const closed = shops.closedReason(id);
				if (closed) box.append(ui.el("p", { class: "locked", text: closed }));
				// Grouped under headings by kind ("food", "clothing"…).
				const groups = new Map();
				for (const item of shops.stock(def)) {
					const kind = item.kind;
					groups.set(kind, [...(groups.get(kind) ?? []), item]);
				}
				for (const [kind, items] of groups) {
					box.append(ui.el("h2", { text: kind.charAt(0).toUpperCase() + kind.slice(1) }));
					const ul = ui.el("ul", { class: "inv" });
					for (const item of items) {
						const cost = shops.price(def, item);
						const owned = setup.inventory.count(item.id, Object.keys(setup.vars().inv.places));
						const li = ui.el("li", { class: "inv-row" },
							setup.media.thumb("item", item.id, item.name),
							ui.el("span", { class: "inv-name", text: item.name }),
							ui.el("span", { class: "inv-price", text: fmt.money(cost) }),
							ui.action("Buy", () => {
								flow.request("Shops_Shop");
								return shops.buy(id, item.id);
							}, { disabled: Boolean(closed) || setup.money.balance() < cost }));
						// One note line: its attributes ("warm, waterproof" on a coat),
						// its description, and how many you already have.
						const note = [item.attributes.join(", "), item.desc, owned ? `you have ${owned}` : ""].filter(Boolean).join(" · ");
						if (note) li.append(ui.el("p", { class: "note", text: note }));
						ul.append(li);
					}
					box.append(ul);
				}
				box.append(ui.button("Done", () => flow.go(flow.home)));
			});
		},

		validate() {
			const errs = [];
			for (const s of setup.registry.all("shop")) {
				if (!setup.shops.hasPriceHook(s.price)) errs.push(`shop "${s.id}": unknown price hook "${s.price}"`);
				if (!setup.shops.stock(s).length) errs.push(`shop "${s.id}" sells nothing: add "${s.id}" to some items' shops`);
			}
			return errs;
		},
	});
})();
