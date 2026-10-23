/*
 * bills — money that comes and goes on a schedule: rent, a phone contract,
 * pocket money, a weekly allowance.
 *
 * A bill is data:
 *   { id, label, amount, kind: "charge" | "income", every: "day" | "week" | "month",
 *     weekday (for "week", 0 = Sunday), date (for "month", 1–28),
 *     account, activeIf, onPaid, onMissed }
 * Each morning (at midnight) every active bill that falls due that day is
 * paid (a charge, from `account` or any account) or paid in (income, to
 * `account`). A charge you can't afford counts as missed: its `onMissed`
 * effects run and its missed count goes up (it resets when a payment
 * goes through). Conditions can test that count, so what missing a bill
 * means is data too (see the rent in town-home.js).
 *
 * Events: bill:paid { bill, amount }, bill:missed { bill, missed }
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-home.js (rent, pocket money)
 * Every field, condition, effect and event is listed in src/modules/bills/README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "bills",
		version: 1,
		deps: ["money", "character"],
		state: "bills",
		defaultState: () => ({ missed: {}, last: {} }),

		install({ registry, cond, effects, time, bus, ui, fmt }) {
			registry.defineType("bill", {
				required: ["label", "amount", "every"],
				defaults: { kind: "charge", weekday: 1, date: 1, account: null, activeIf: null, onPaid: [], onMissed: [], desc: "", order: 0 },
				refs: { account: "account" },
				conditions: ["activeIf"],
				effects: ["onPaid", "onMissed"],
				check(def) {
					const errs = [];
					if (!Number.isInteger(def.amount) || def.amount < 0) errs.push("amount must be whole pounds ≥ 0");
					if (!["charge", "income"].includes(def.kind)) errs.push('kind must be "charge" or "income"');
					if (!["day", "week", "month"].includes(def.every)) errs.push('every must be "day", "week" or "month"');
					if (!(def.weekday >= 0 && def.weekday <= 6)) errs.push("weekday must be 0 (Sunday) to 6 (Saturday)");
					if (!(Number.isInteger(def.date) && def.date >= 1 && def.date <= 28)) errs.push("date must be 1–28");
					return errs;
				},
			});

			const S = () => setup.vars().bills;
			const startOf = (day) => time.at(day, "00:00");

			const bills = {
				/** @returns {object[]} Bill definitions in order. */
				defs: () => registry.all("bill").sort((a, b) => a.order - b.order),

				/** @returns {boolean} Whether a bill applies right now (its `activeIf`). */
				active: (id) => cond.test(registry.get("bill", id).activeIf, { t: time.now() }),

				/** @returns {boolean} Whether a bill falls due on a day. */
				dueOn(id, day) {
					const b = registry.get("bill", id);
					const t = startOf(day);
					if (b.every === "day") return true;
					if (b.every === "week") return time.weekday(t) === b.weekday;
					return time.date(t).day === b.date;
				},

				/** @returns {number|null} The next day (from today) the bill falls due. */
				nextDue(id, from = time.day(time.now())) {
					for (let d = from; d < from + 32; d++) if (bills.dueOn(id, d)) return d;
					return null;
				},

				/** @returns {number} Payments missed in a row (0 once one goes through). */
				missed: (id) => S().missed[id] ?? 0,

				/**
				 * Count the next payment as already made (rent paid up front): the
				 * next due day isn't charged.
				 */
				markPaid(id) {
					const today = time.day(time.now());
					S().last[id] = bills.nextDue(id, today + 1) ?? today;
					delete S().missed[id];
				},

				/**
				 * Pay (or receive) a bill now.
				 * @returns {{ok: boolean, reason?: string}}
				 */
				settle(id) {
					const b = registry.get("bill", id);
					const result = effects.newResult();
					if (b.kind === "income") {
						setup.money.earn(b.amount, { to: b.account ?? undefined, reason: b.label });
						ui.notify(`${b.label}: +${fmt.money(b.amount)}.`);
					}
					else {
						const paid = setup.money.pay(b.amount, { from: b.account ? [b.account] : undefined, reason: b.label });
						if (!paid.ok) {
							S().missed[id] = bills.missed(id) + 1;
							ui.notify(`${b.label}: couldn't pay ${fmt.money(b.amount)}.`);
							effects.run(b.onMissed, { bill: id, t: time.now() }, result);
							bus.emit("bill:missed", { bill: id, missed: S().missed[id] });
							return { ok: false, reason: paid.reason };
						}
						ui.notify(`${b.label}: −${fmt.money(b.amount)}.`);
					}
					delete S().missed[id];
					S().last[id] = time.day(time.now());
					effects.run(b.onPaid, { bill: id, t: time.now() }, result);
					bus.emit("bill:paid", { bill: id, amount: b.amount });
					return { ok: true };
				},
			};
			setup.bills = bills;

			// Each new day: settle every active bill due today (once per day).
			bus.on("time:day", ({ day }) => {
				for (const b of bills.defs()) {
					if (S().last[b.id] === day || !bills.dueOn(b.id, day) || !bills.active(b.id)) continue;
					S().last[b.id] = day;
					bills.settle(b.id);
				}
			});

			// { billMissed: { id, min } } — missed this many payments in a row.
			cond.register("billMissed", {
				test: (spec) => bills.missed(spec.id) >= (spec.min ?? 1),
				describe: (spec) => `${spec.min ?? 1}+ missed payments: ${registry.tryGet("bill", spec.id)?.label ?? spec.id}`,
			});

			const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
			const ordinal = (n) => `${n}${[11, 12, 13].includes(n) ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
			/** "every Monday", "on the 1st of each month". */
			const when = (b) => (b.every === "day" ? "every day" : b.every === "week" ? `every ${DAY_NAMES[b.weekday]}` : `on the ${ordinal(b.date)} of each month`);
			bills.describeWhen = when;

			setup.character.addMeSection("bills", 52, (box) => {
				const list = bills.defs().filter((b) => bills.active(b.id));
				if (!list.length) return;
				box.append(ui.el("h2", { text: "Regular money" }));
				const rows = list.flatMap((b) => {
					const next = bills.nextDue(b.id);
					const missed = bills.missed(b.id);
					return [
						ui.el("dt", { text: b.label }),
						ui.el("dd", { text: `${b.kind === "income" ? "+" : "−"}${fmt.money(b.amount)} ${when(b)}${next != null ? ` (next ${fmt.date(startOf(next))})` : ""}${missed ? ` · ${missed} missed` : ""}` }),
					];
				});
				box.append(ui.el("dl", { class: "sheet" }, ...rows));
			});
		},

		ready() {
			// Bills in the phone's calendar.
			if (!setup.modules.has("phone")) return;
			setup.phone.addCalendarSource((from, to) => setup.bills.defs().filter((b) => setup.bills.active(b.id)).flatMap((b) => {
				const out = [];
				for (let d = setup.time.day(from); d <= setup.time.day(to - 1); d++) {
					if (setup.bills.dueOn(b.id, d)) out.push({ t: setup.time.at(d, "00:00"), text: `${b.label}: ${b.kind === "income" ? "+" : "−"}${setup.fmt.money(b.amount)}` });
				}
				return out;
			}));
		},
	});
})();
