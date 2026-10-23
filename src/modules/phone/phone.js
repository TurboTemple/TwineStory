/*
 * phone — the PC's phone: contacts, messages, an alarm, and apps.
 * See README.md.
 *
 * Apps are data (`app`: label, icon, view, order, conditions, badge). An app
 * shows a named view; modules register the views (messages, bank, map,
 * calendar, alarm) and content decides which apps exist. Opening apps
 * doesn't move time.
 *
 * Calendar: modules add entries with phone.addCalendarSource(fn), where
 * fn(fromT, toT) returns [{ t, end?, text }].
 *
 * Events: phone:message { from, text }, phone:alarm { t }
 */
(function () {
	"use strict";

	const MESSAGE_CAP = 60;

	(setup.__modules ??= []).push({
		id: "phone",
		version: 1,
		deps: ["npcs", "shell"],
		state: "phone",
		defaultState: () => ({ contacts: [], messages: [], alarm: null }),

		install({ registry, cond, effects, time, bus, ui, flow, fmt, sched }) {
			registry.defineType("app", {
				required: ["label", "view"],
				defaults: { icon: "•", order: 0, conditions: null, badge: null, desc: "" },
				conditions: ["conditions"],
				check: (def) => (ui.hasView(def.view) ? [] : [`unknown view "${def.view}"`]),
			});

			const P = () => setup.vars().phone;
			const badges = new Map();
			const calendarSources = [];

			const phone = {
				/** The open app (not saved). null = home screen. */
				app: null,

				/** @returns {string[]} NPC ids in your contacts. */
				contacts: () => P().contacts,

				/** @returns {boolean} */
				hasContact: (npc) => P().contacts.includes(npc),

				/** Add an NPC to your contacts. */
				addContact(npc) {
					setup.npcs.get(npc);
					if (!phone.hasContact(npc)) P().contacts.push(npc);
				},

				/**
				 * Receive a message (or send one: `mine: true`).
				 * @param {string} from NPC id @param {string} text @param {{mine?: boolean}} [opts]
				 */
				message(from, text, opts = {}) {
					phone.addContact(from);
					const list = P().messages;
					list.push({ from, text, t: time.now(), read: Boolean(opts.mine), mine: Boolean(opts.mine) });
					if (list.length > MESSAGE_CAP) list.splice(0, list.length - MESSAGE_CAP);
					if (!opts.mine) {
						ui.notify(`New message from ${setup.npcs.get(from).name}.`);
						bus.emit("phone:message", { from, text });
					}
				},

				/** @returns {object[]} Messages with one contact, oldest first. */
				thread: (npc) => P().messages.filter((m) => m.from === npc),

				/** @returns {number} Unread messages (from one contact, or all). */
				unread: (npc) => P().messages.filter((m) => !m.read && (!npc || m.from === npc)).length,

				/** Mark a contact's messages read. */
				markRead(npc) {
					for (const m of P().messages) if (m.from === npc) m.read = true;
				},

				/** @returns {number} Total badge count across apps (for the menu button). */
				badgeTotal: () => phone.apps().reduce((n, a) => n + phone.badge(a), 0),

				/** @returns {number} An app's badge (0 if none). */
				badge: (app) => (app.badge && badges.has(app.badge) ? badges.get(app.badge)() : 0),

				/** Register a badge hook: () => number. */
				registerBadge: (name, fn) => badges.set(name, fn),

				/** @returns {object[]} Apps you can use now, in order. */
				apps: () => registry.all("app").filter((a) => cond.test(a.conditions, {})).sort((a, b) => a.order - b.order),

				/** Open an app (or the home screen with null) and show the phone. */
				open(appId = null) {
					phone.app = appId;
					flow.go("Phone_Home");
				},

				/** Add calendar entries: fn(fromT, toT) => [{ t, end?, text }]. */
				addCalendarSource: (fn) => calendarSources.push(fn),

				/** @returns {{t: number, end?: number, text: string}[]} Calendar entries in a time range, soonest first. */
				calendar(fromT, toT) {
					return calendarSources.flatMap((fn) => fn(fromT, toT) ?? []).filter((e) => e.t < toT && (e.end ?? e.t) >= fromT).sort((a, b) => a.t - b.t);
				},

				/** @returns {string|null} The alarm time ("07:00") or null. */
				alarm: () => P().alarm,

				/** Set the alarm ("HH:MM") or turn it off (null). */
				setAlarm(hm) {
					sched.cancel("phone_alarm");
					P().alarm = hm;
					if (hm) sched.add({ id: "phone_alarm", at: time.nextAt(time.now() + 1, hm), type: "phone:alarm", repeat: time.MIN_PER_DAY });
				},
			};
			setup.phone = phone;

			// The alarm wakes you if you're asleep.
			sched.handle("phone:alarm", () => {
				bus.emit("phone:alarm", { t: time.now() });
				if (setup.modules.has("status") && setup.status.has("asleep")) {
					ui.notify("Your alarm went off.");
					time.interrupt("alarm");
				}
			});

			phone.registerBadge("unread", () => phone.unread());

			// { hasContact: "id" } — the NPC is in your contacts (default: the one in context).
			cond.register("hasContact", {
				test: (spec, ctx) => phone.hasContact(spec === true ? ctx.npc : spec),
				describe: (spec, ctx) => `You have ${setup.npcs.get(spec === true ? ctx.npc : spec)?.name ?? "their"}'s number`,
			});

			// { contact: true } (the NPC in context) or { contact: "id" }.
			effects.register("contact", {
				apply(spec, ctx, result) {
					const npc = spec === true ? ctx.npc : spec;
					if (phone.hasContact(npc)) return;
					phone.addContact(npc);
					if (!ctx.quiet) result.changes.push({ kind: "phone", text: `${setup.npcs.get(npc).name} is in your contacts now.` });
				},
			});

			// { message: { from, text } } — a text arrives.
			effects.register("message", {
				apply(spec) {
					phone.message(spec.from, spec.text);
				},
				describe: (spec) => `A message from ${setup.npcs.get(spec.from)?.name ?? spec.from}`,
			});

			setup.shell.addMenuButton("phone", 5, () => {
				if (!registry.all("app").length) return null;
				const n = phone.badgeTotal();
				return { label: n ? `Phone (${n})` : "Phone", passage: "Phone_Home" };
			});

			/* ---- Views ------------------------------------------------------ */

			/** The open conversation in Messages (not saved). */
			let threadWith = null;

			ui.view("phone", (box) => {
				box.classList.add("m-phone");
				const app = phone.app ? registry.tryGet("app", phone.app) : null;
				if (!app) {
					box.append(ui.el("p", { class: "phone-clock", text: `${fmt.time(time.now())} · ${fmt.date(time.now())}` }));
					const grid = ui.el("div", { class: "app-grid" });
					for (const a of phone.apps()) {
						const n = phone.badge(a);
						grid.append(ui.el("button", {
							class: "app-icon",
							attrs: { type: "button", "aria-label": n ? `${a.label}, ${n} new` : a.label },
							on: { click: () => phone.open(a.id) },
						}, ui.el("span", { class: "app-glyph", text: a.icon, attrs: { "aria-hidden": "true" } }), ui.el("span", { class: "app-label", text: a.label }), n ? ui.el("span", { class: "app-badge", text: String(n) }) : null));
					}
					box.append(grid);
					box.append(ui.button("Put the phone away", () => flow.go(flow.home)));
					return;
				}
				box.append(ui.el("h1", { text: app.label }));
				const body = ui.el("div", { class: `app app-${app.id}` });
				ui.render(app.view, body);
				box.append(body, ui.button("Home screen", () => {
					threadWith = null;
					phone.open(null);
				}));
			});

			ui.view("app-messages", (box) => {
				if (threadWith) {
					const n = setup.npcs.get(threadWith);
					phone.markRead(threadWith);
					box.append(ui.el("h2", { text: n.name }));
					const ul = ui.el("ul", { class: "thread" });
					for (const m of phone.thread(threadWith)) {
						ul.append(ui.el("li", { class: m.mine ? "msg msg-mine" : "msg" }, ui.el("p", { text: m.text }), ui.el("p", { class: "note", text: `${fmt.date(m.t)} ${fmt.time(m.t)}` })));
					}
					if (!ul.childNodes.length) ul.append(ui.el("li", { class: "note", text: "No messages yet." }));
					box.append(ul, ui.button("All messages", () => {
						threadWith = null;
						phone.open("messages");
					}));
					return;
				}
				const contacts = phone.contacts();
				if (!contacts.length) {
					box.append(ui.el("p", { class: "note", text: "No contacts yet. Swap numbers with people you get to know." }));
					return;
				}
				const ul = ui.el("ul", { class: "people" });
				for (const id of contacts) {
					const last = phone.thread(id).at(-1);
					const n = phone.unread(id);
					ul.append(ui.el("li", {},
						ui.button(`${setup.npcs.get(id).name}${n ? ` (${n} new)` : ""}`, () => {
							threadWith = id;
							phone.open("messages");
						}),
						last ? ui.el("p", { class: "note", text: last.text.length > 60 ? `${last.text.slice(0, 57)}…` : last.text }) : null));
				}
				box.append(ul);
			});

			ui.view("app-calendar", (box) => {
				const today = time.day(time.now());
				let any = false;
				for (let d = today; d < today + 7; d++) {
					const from = time.at(d, "00:00");
					const list = phone.calendar(from, from + time.MIN_PER_DAY);
					box.append(ui.el("h2", { text: d === today ? `Today, ${fmt.date(from)}` : fmt.date(from) }));
					if (!list.length) {
						box.append(ui.el("p", { class: "note", text: "Nothing on." }));
						continue;
					}
					any = true;
					box.append(ui.el("ul", { class: "calendar" }, ...list.map((e) => ui.el("li", {},
						ui.el("span", { class: "cal-time", text: e.end ? `${fmt.time(e.t)}–${fmt.time(e.end)}` : fmt.time(e.t) }), " ", ui.el("span", { text: e.text })))));
				}
				if (!any) box.prepend(ui.el("p", { class: "note", text: "Your week is clear." }));
			});

			ui.view("app-alarm", (box) => {
				const cur = phone.alarm();
				box.append(ui.el("p", { text: cur ? `Your alarm is set for ${cur} every day. It wakes you if you're asleep.` : "No alarm set." }));
				const times = ["05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "10:00"];
				const sel = ui.el("select", { attrs: { "aria-label": "Alarm time" } }, ...times.map((hm) => ui.el("option", { text: hm, attrs: { value: hm, selected: hm === (cur ?? "07:00") } })));
				box.append(ui.el("div", { class: "debug-row" }, sel, ui.button("Set alarm", () => {
					phone.setAlarm(sel.value);
					phone.open("alarm");
				})));
				if (cur) box.append(ui.button("Turn it off", () => {
					phone.setAlarm(null);
					phone.open("alarm");
				}));
			});
		},
	});
})();
