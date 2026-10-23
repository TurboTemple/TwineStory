/*
 * money — accounts, paying and earning. See README.md.
 *
 * All amounts are integer minor units (pence). Accounts are data (cash, bank
 * card, …); balances live in $money.
 */
(function () {
	"use strict";

	/** Most recent transactions kept in $money.log. */
	const LOG_CAP = 50;

	(setup.__modules ??= []).push({
		id: "money",
		version: 1,
		deps: [],
		state: "money",
		defaultState: () => ({ balances: {}, log: [] }),

		install({ registry, cond, effects, time, fmt, bus, ui }) {
			registry.defineType("account", {
				required: ["label"],
				defaults: { kind: "cash", start: 0, order: 0 },
				check: (def) => (Number.isInteger(def.start) ? [] : ["start must be whole pence"]),
			});

			const M = () => setup.vars().money;
			const accounts = () => registry.all("account").sort((a, b) => a.order - b.order);

			const record = (amount, account, reason) => {
				const log = M().log;
				log.push({ t: time.now(), amount, account, reason: reason ?? "" });
				if (log.length > LOG_CAP) log.splice(0, log.length - LOG_CAP);
			};

			const money = {
				/** @returns {boolean} Whether any accounts exist (money is in play). */
				enabled: () => registry.all("account").length > 0,

				/**
				 * Balance of one account, or the total of all accounts.
				 * @param {string} [id]
				 * @returns {number} pence
				 */
				balance(id) {
					const b = M().balances;
					if (id) return b[id] ?? 0;
					return accounts().reduce((sum, a) => sum + (b[a.id] ?? 0), 0);
				},

				/**
				 * Pay an amount from one account. Tries `from` accounts in order
				 * (default: every account in display order) and uses the first
				 * that can cover the whole amount.
				 * DESIGN: user to decide — splitting payments, overdrafts, card limits.
				 * @param {number} amount  pence > 0
				 * @param {{from?: string[], reason?: string}} [opts]
				 * @returns {{ok: true, account: string} | {ok: false, reason: string}}
				 */
				pay(amount, opts = {}) {
					if (!Number.isInteger(amount) || amount < 0) throw new setup.GameError(`Bad amount ${amount}`);
					const ids = opts.from ?? accounts().map((a) => a.id);
					const b = M().balances;
					const account = ids.find((id) => (b[id] ?? 0) >= amount);
					if (!account) return { ok: false, reason: `Not enough money (${fmt.money(amount)} needed)` };
					b[account] -= amount;
					record(-amount, account, opts.reason);
					bus.emit("money:paid", { amount, account, reason: opts.reason });
					return { ok: true, account };
				},

				/**
				 * Add money to an account (default: the first account).
				 * @param {number} amount  pence > 0
				 * @param {{to?: string, reason?: string}} [opts]
				 */
				earn(amount, opts = {}) {
					if (!Number.isInteger(amount) || amount < 0) throw new setup.GameError(`Bad amount ${amount}`);
					const account = opts.to ?? accounts()[0]?.id;
					if (!account) throw new setup.GameError("No accounts to pay into");
					registry.get("account", account);
					M().balances[account] = (M().balances[account] ?? 0) + amount;
					record(amount, account, opts.reason);
					bus.emit("money:earned", { amount, account, reason: opts.reason });
				},

				/** @returns {object[]} Recent transactions, oldest first. */
				log: () => M().log,
			};
			setup.money = money;

			// { money: { min?, max?, account? } } — total (or one account) in range.
			cond.register("money", {
				test: (spec) => {
					const v = money.balance(spec.account);
					return (spec.min == null || v >= spec.min) && (spec.max == null || v <= spec.max);
				},
				describe: (spec) => (spec.min != null ? `At least ${fmt.money(spec.min)}` : `At most ${fmt.money(spec.max)}`),
			});

			// { money: { amount, account?, reason? } } — positive earns, negative pays.
			effects.register("money", {
				apply(spec, ctx, result) {
					if (spec.amount >= 0) {
						money.earn(spec.amount, { to: spec.account, reason: spec.reason });
						result.changes.push({ kind: "money", text: `+${fmt.money(spec.amount)}` });
						return;
					}
					const paid = money.pay(-spec.amount, { from: spec.account ? [spec.account] : undefined, reason: spec.reason });
					result.changes.push({ kind: "money", text: paid.ok ? `−${fmt.money(-spec.amount)}` : paid.reason });
				},
				describe: (spec) => (spec.amount >= 0 ? `Gain ${fmt.money(spec.amount)}` : `Costs ${fmt.money(-spec.amount)}`),
			});

			// Banking app (for the phone): balances and recent transactions.
			ui.view("app-bank", (box) => {
				const accounts = registry.all("account").sort((a, b) => a.order - b.order);
				box.append(ui.el("dl", { class: "sheet" }, ...accounts.flatMap((a) => [ui.el("dt", { text: a.label }), ui.el("dd", { text: fmt.money(money.balance(a.id)) })])));
				const log = money.log().slice(-15).reverse();
				box.append(ui.el("h2", { text: "Recent" }));
				if (!log.length) box.append(ui.el("p", { class: "note", text: "Nothing yet." }));
				else box.append(ui.el("ul", { class: "ledger" }, ...log.map((e) => ui.el("li", {},
					ui.el("span", { text: `${fmt.date(e.t)} ${fmt.time(e.t)} · ${e.reason || "—"}` }), " ",
					ui.el("strong", { text: `${e.amount >= 0 ? "+" : "−"}${fmt.money(Math.abs(e.amount))}` })))));
			});
		},

		newGame() {
			const b = setup.vars().money.balances;
			for (const a of setup.registry.all("account")) b[a.id] = a.start;
		},
	});
})();
