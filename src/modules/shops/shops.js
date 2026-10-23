/*
 * shops — buying items. See README.md.
 *
 * A shop is data: where it is and what it sells. Prices come from a hook
 * (default: the item's own price, or a price set in the stock list).
 * Bought items go in your bag.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "shops",
		version: 1,
		deps: ["inventory", "money", "world"],

		install({ registry, cond, effects, time, bus, ui, flow, fmt }) {
			registry.defineType("shop", {
				required: ["name", "at", "stock"],
				defaults: { desc: "", conditions: null, price: "default", payWith: null, mins: 2 },
				refs: { at: "location", "stock[].item": "item", payWith: "account" },
				conditions: ["conditions"],
			});

			const priceHooks = new Map();

			const shops = {
				/**
				 * Register a pricing rule: (shop, stockEntry, item) => pence.
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

				/** @returns {number} What an item costs in a shop. */
				price(shop, entry) {
					const def = typeof shop === "string" ? registry.get("shop", shop) : shop;
					return priceHooks.get(def.price)(def, entry, registry.get("item", entry.item));
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
					const entry = def.stock.find((s) => s.item === itemId);
					if (!entry) throw new setup.GameError(`${def.name} doesn't sell ${itemId}`);
					const item = registry.get("item", itemId);
					const result = Object.assign(effects.newResult(), { ok: false });
					const fail = (text) => {
						result.changes.push({ kind: "blocked", text });
						return result;
					};
					const closed = shops.closedReason(shopId);
					if (closed) return fail(closed);
					const room = setup.inventory.refuses("bag", itemId, 1);
					if (room) return fail(room);
					const cost = shops.price(def, entry);
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

			// "default": the stock entry's price if set, else the item's price.
			shops.registerPriceHook("default", (shop, entry, item) => entry.price ?? item.price);

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
				const groups = new Map();
				for (const entry of def.stock) {
					const cat = registry.get("item", entry.item).category;
					groups.set(cat, [...(groups.get(cat) ?? []), entry]);
				}
				for (const [cat, entries] of groups) {
					box.append(ui.el("h2", { text: cat.charAt(0).toUpperCase() + cat.slice(1) }));
					const ul = ui.el("ul", { class: "inv" });
					for (const entry of entries) {
						const item = registry.get("item", entry.item);
						const cost = shops.price(def, entry);
						const owned = setup.inventory.count(item.id, Object.keys(setup.vars().inv.places));
						const li = ui.el("li", { class: "inv-row" },
							setup.media.thumb("item", item.id, item.name),
							ui.el("span", { class: "inv-name", text: item.name }),
							ui.el("span", { class: "inv-price", text: ` ${fmt.money(cost)}` }),
							ui.action("Buy", () => {
								flow.request("Shops_Shop");
								return shops.buy(id, item.id);
							}, { disabled: Boolean(closed) || setup.money.balance() < cost }));
						if (owned) li.append(ui.el("span", { class: "note", text: ` (you have ${owned})` }));
						if (item.desc) li.append(ui.el("p", { class: "note", text: item.desc }));
						ul.append(li);
					}
					box.append(ul);
				}
				box.append(ui.button("Done", () => flow.go(flow.home)));
			});
		},

		validate() {
			return setup.registry.all("shop")
				.filter((s) => !setup.shops.hasPriceHook(s.price))
				.map((s) => `shop "${s.id}": unknown price hook "${s.price}"`);
		},
	});
})();
