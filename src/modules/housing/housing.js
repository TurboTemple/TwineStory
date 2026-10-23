/*
 * housing — where you live: your family home, and places you can rent.
 *
 * A residence is data:
 *   { id, label, at, desc, start, storage: { role: storageId }, rentBill,
 *     deposit, conditions, listed, order }
 *   at         the place (site) it is; its rooms count as home
 *   start      true for where you live on a new game (the family home)
 *   storage    your storage places there, by role: { wardrobe: "wardrobe",
 *              cupboards: "cupboards", furniture: "home_furniture" }.
 *              Moving moves everything from each role to the same role at
 *              the new place.
 *   rentBill   the bill (bills module) that charges the rent while you rent it
 *   deposit    paid when you move in, given back when you leave properly
 *   conditions who can rent it (e.g. you need a job)
 *   listed     shown at letting agents (places tagged "letting_agent")
 *
 * Renting: pay the deposit and the first rent, then you move in. The rent
 * bill charges you after that; what missing rent leads to is data on the
 * bill (`onMissed`, e.g. { evict: true } after two missed payments).
 *
 * Furniture: items of kind "furniture" you buy are delivered to your home's
 * "furniture" storage. Conditions can test for them ({ furniture: "tv_set" }),
 * so furniture can unlock actions at home.
 *
 * Events: home:moved { from, to }, home:rented { id }, home:left { id, evicted }
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-home.js (homes, rent, family)
 * Every field, condition, effect and event is listed in src/modules/housing/README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "housing",
		version: 1,
		deps: ["world", "inventory", "money", "bills", "shops", "character"],
		state: "home",
		defaultState: () => ({ current: null, renting: null, deposit: 0 }),

		install({ registry, cond, effects, time, bus, ui, fmt }) {
			registry.defineType("residence", {
				required: ["label", "at"],
				defaults: { desc: "", start: false, storage: {}, rentBill: null, deposit: 0, conditions: null, listed: false, order: 0 },
				refs: { at: "location", rentBill: "bill", "storage.wardrobe": "storage", "storage.cupboards": "storage", "storage.furniture": "storage" },
				conditions: ["conditions"],
				check(def) {
					const errs = [];
					if (!Number.isInteger(def.deposit) || def.deposit < 0) errs.push("deposit must be whole pounds ≥ 0");
					if (def.listed && !def.rentBill) errs.push("a listed residence needs a rentBill");
					return errs;
				},
			});

			const H = () => setup.vars().home;
			const R = (id) => registry.get("residence", id);
			const startHome = () => registry.all("residence").find((r) => r.start) ?? null;

			const housing = {
				/** @returns {object|null} Where you live now. */
				current: () => (H().current ? R(H().current) : null),

				/** @returns {boolean} Whether a location is (inside) your home. */
				isHome: (loc = setup.world.loc()) => Boolean(H().current && loc && setup.world.within(loc, R(H().current).at)),

				/** @returns {object|null} The residence you're renting. */
				renting: () => (H().renting ? R(H().renting) : null),

				/** @returns {number} The rent per payment for a residence (from its bill). */
				rentOf: (id) => (R(id).rentBill ? registry.get("bill", R(id).rentBill).amount : 0),

				/**
				 * Why you can't rent a residence right now (empty = you can).
				 * @returns {string[]}
				 */
				rentBlocks(id) {
					const r = R(id);
					const out = [];
					if (H().current === id) return ["You live here"];
					if (H().renting) out.push("You're already renting somewhere");
					if (!cond.test(r.conditions, {})) out.push(...cond.explain(r.conditions, {}).filter((e) => !e.ok).map((e) => e.text));
					// One payment, from a single account (like any other payment).
					const cost = r.deposit + housing.rentOf(id);
					const best = Math.max(0, ...registry.all("account").map((a) => setup.money.balance(a.id)));
					if (best < cost) out.push(`${fmt.money(cost)} in one account to pay now`);
					return out;
				},

				/**
				 * Move home: everything in each storage role moves to the same role there.
				 * @param {string} id
				 * @returns {object} Result
				 */
				moveIn(id) {
					const result = effects.newResult();
					const from = housing.current();
					const to = R(id);
					if (from && from.id !== id) {
						for (const [role, src] of Object.entries(from.storage)) {
							const dest = to.storage[role];
							if (!dest) continue;
							for (const e of [...setup.inventory.entries(src)]) setup.inventory.moveAll(e.uid, dest);
						}
					}
					H().current = id;
					result.changes.push({ kind: "home", text: `You now live at ${to.label}. Your things have come with you.` });
					bus.emit("home:moved", { from: from?.id ?? null, to: id });
					return result;
				},

				/**
				 * Rent a residence: pay the deposit and first rent, then move in.
				 * @returns {object} Result plus { ok }
				 */
				rent(id) {
					const r = R(id);
					const result = Object.assign(effects.newResult(), { ok: false });
					const blocks = housing.rentBlocks(id);
					if (blocks.length) {
						result.changes.push({ kind: "blocked", text: `Can't rent ${r.label}: ${blocks.join("; ")}.` });
						return result;
					}
					const rent = housing.rentOf(id);
					const paid = setup.money.pay(r.deposit + rent, { reason: `Deposit and first rent: ${r.label}` });
					if (!paid.ok) {
						result.changes.push({ kind: "blocked", text: paid.reason });
						return result;
					}
					H().renting = id;
					H().deposit = r.deposit;
					if (r.rentBill) setup.bills.markPaid(r.rentBill);
					result.changes.push({ kind: "money", text: `Paid ${fmt.money(r.deposit)} deposit and ${fmt.money(rent)} rent.` });
					effects.merge(result, housing.moveIn(id));
					result.ok = true;
					bus.emit("home:rented", { id });
					return result;
				},

				/**
				 * Stop renting and move back to the family home. The deposit comes
				 * back, unless you were evicted.
				 * @param {{evicted?: boolean}} [opts]
				 * @returns {object} Result
				 */
				leave(opts = {}) {
					const result = effects.newResult();
					const r = housing.renting();
					if (!r) return result;
					if (!opts.evicted && H().deposit) {
						setup.money.earn(H().deposit, { reason: `Deposit back: ${r.label}` });
						result.changes.push({ kind: "money", text: `Your ${fmt.money(H().deposit)} deposit came back.` });
					}
					else if (opts.evicted) result.changes.push({ kind: "home", text: `You've been evicted from ${r.label}. You lost your deposit.` });
					H().renting = null;
					H().deposit = 0;
					const back = startHome();
					if (back) effects.merge(result, housing.moveIn(back.id));
					bus.emit("home:left", { id: r.id, evicted: Boolean(opts.evicted) });
					return result;
				},

				/** @returns {number} How many of a furniture item are at your home. */
				furniture(itemId) {
					const store = housing.current()?.storage.furniture;
					return store ? setup.inventory.count(itemId, [store]) : 0;
				},
			};
			setup.housing = housing;

			// Furniture you buy is delivered to your home.
			setup.shops.addDestination((item) => {
				const store = housing.current()?.storage.furniture;
				return item.kind === "furniture" && store ? { place: store, note: "Delivered to your home." } : null;
			});

			// { livesAt: "residence_id" }, { atHome: true }, { renting: true | "id" }, { furniture: "item_id" }
			cond.register("livesAt", {
				test: (spec) => H().current === spec,
				describe: (spec) => `Living at ${registry.tryGet("residence", spec)?.label ?? spec}`,
			});
			cond.register("atHome", {
				test: (spec) => housing.isHome() === (spec !== false),
				describe: (spec) => (spec === false ? "Away from home" : "At home"),
			});
			cond.register("renting", {
				test: (spec) => (spec === true ? Boolean(H().renting) : spec === false ? !H().renting : H().renting === spec),
				describe: (spec) => (spec === false ? "Not renting" : spec === true ? "Renting a place" : `Renting ${registry.tryGet("residence", spec)?.label ?? spec}`),
			});
			cond.register("furniture", {
				test: (spec) => housing.furniture(spec) > 0,
				describe: (spec) => `${registry.tryGet("item", spec)?.name ?? spec} at home`,
			});

			// { moveIn: "id" }, { leaveHome: true }, { evict: true }
			effects.register("moveIn", { apply: (spec, ctx, result) => effects.merge(result, housing.moveIn(spec)) });
			effects.register("leaveHome", { apply: (spec, ctx, result) => effects.merge(result, housing.leave()) });
			effects.register("evict", {
				apply(spec, ctx, result) {
					effects.merge(result, housing.leave({ evicted: true }));
					ui.notify("You've been evicted.");
				},
			});

			/* ---- UI --------------------------------------------------------- */

			// A letting agent: places to rent, and ending your tenancy.
			setup.world.addHereSection("lettings", 29, (box, here) => {
				if (!setup.world.chain(here.id).some((id) => registry.get("location", id).tags.includes("letting_agent"))) return;
				box.append(ui.el("h2", { text: "Places to rent" }));
				const renting = housing.renting();
				if (renting) {
					box.append(ui.el("p", { text: `You rent ${renting.label}. Leaving gives you your ${fmt.money(H().deposit)} deposit back and you move home.` }),
						ui.action("End your tenancy", () => housing.leave()));
				}
				const ul = ui.el("ul", { class: "m-housing" });
				for (const r of registry.all("residence").filter((x) => x.listed).sort((a, b) => a.order - b.order)) {
					const bill = registry.get("bill", r.rentBill);
					const blocks = housing.rentBlocks(r.id);
					ul.append(ui.el("li", {},
						ui.el("strong", { text: r.label }),
						r.desc ? ui.el("p", { text: r.desc }) : null,
						ui.el("p", { class: "note", text: `Rent ${fmt.money(bill.amount)} ${setup.bills.describeWhen(bill)} · Deposit ${fmt.money(r.deposit)}` }),
						ui.action(`Rent it (pay ${fmt.money(r.deposit + bill.amount)} now)`, () => housing.rent(r.id), { disabled: blocks.length > 0 }),
						blocks.length ? ui.el("p", { class: "locked", text: `Needs: ${blocks.join("; ")}` }) : null));
				}
				box.append(ul);
			});

			setup.character.addMeSection("home", 51, (box) => {
				const r = housing.current();
				if (!r) return;
				box.append(ui.el("h2", { text: "Home" }));
				const rows = [["Home", r.label]];
				if (housing.renting()) rows.push(["Rent", `${fmt.money(housing.rentOf(r.id))} ${setup.bills.describeWhen(registry.get("bill", r.rentBill))}`], ["Deposit", fmt.money(H().deposit)]);
				box.append(ui.el("dl", { class: "sheet" }, ...rows.flatMap(([k, v]) => [ui.el("dt", { text: k }), ui.el("dd", { text: v })])));
			});
		},

		newGame() {
			const start = setup.registry.all("residence").find((r) => r.start);
			if (start) setup.vars().home.current = start.id;
		},

		validate() {
			const starts = setup.registry.all("residence").filter((r) => r.start);
			return setup.registry.all("residence").length && starts.length !== 1 ? [`exactly one residence needs start: true (found ${starts.length})`] : [];
		},
	});
})();
