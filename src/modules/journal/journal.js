/*
 * journal — a log of each day, and the summary you see when you wake up.
 *
 * Bus listeners add up each day (money in and out, lessons, shifts, people
 * met, level-ups, …) in $journal.days (the last week only). When a sleep
 * (an action tagged "sleep") ends on a later day than it began, the summary
 * of the day you went to sleep on is shown, and the game autosaves (the
 * autosave rule allows autosaves on that passage only).
 *
 * Hooks: what the summary says is a named function in config.journal.summary
 * (default "default"): (entry, day) => string[].
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   nothing yet: what the summary says is the "default" hook below
 * Every field, condition, effect and event is listed in src/modules/journal/README.md.
 */
(function () {
	"use strict";

	const KEEP_DAYS = 7;
	/** How many recent things the phone's Recent app remembers. */
	const KEEP_RECENT = 20;
	const fresh = () => ({ earned: 0, spent: 0, lessons: 0, skipped: 0, shifts: 0, workMins: 0, met: [], levels: [], tiers: [], stages: [], traits: [], messages: 0 });

	(setup.__modules ??= []).push({
		id: "journal",
		version: 3,
		deps: [],
		state: "journal",
		defaultState: () => ({ days: {}, recent: [] }),
		migrations: {
			// Version 3: the Recent list.
			3: (slice) => ({ recent: [], ...slice }),
			// Version 2: money changed from pence to whole pounds.
			2: (slice) => {
				for (const e of Object.values(slice.days ?? {})) {
					e.earned = Math.round((e.earned ?? 0) / 100);
					e.spent = Math.round((e.spent ?? 0) / 100);
				}
				return slice;
			},
		},

		install({ registry, time, bus, ui, flow, fmt, config }) {
			const J = () => setup.vars().journal;
			const summaries = new Map();

			// Recent: every tap that changed something (an action screen's title and
			// what happened), newest last, for the phone's Recent app.
			bus.on("flow:done", ({ result, illustration }) => {
				const lines = [...(result?.changes ?? []).map((c) => c.text), ...(result?.toasts ?? [])].filter(Boolean);
				if (!lines.length || result?.ok === false) return;
				const list = (J().recent ??= []);
				list.push({ t: time.now(), title: illustration?.title ?? null, lines: lines.slice(0, 6) });
				if (list.length > KEEP_RECENT) list.splice(0, list.length - KEEP_RECENT);
			});

			ui.view("app-recent", (box) => {
				const list = [...(J().recent ?? [])].reverse();
				if (!list.length) {
					box.append(ui.el("p", { class: "note", text: "Nothing yet." }));
					return;
				}
				const ul = ui.el("ul", { class: "recent" });
				for (const r of list) {
					ul.append(ui.el("li", {},
						ui.el("p", { class: "note", text: `${fmt.date(r.t)} ${fmt.time(r.t)}` }),
						r.title ? ui.el("strong", { text: r.title }) : null,
						ui.el("ul", { class: "mods" }, ...r.lines.map((l) => ui.el("li", { text: l })))));
				}
				box.append(ul);
			});

			const journal = {
				/** @returns {object} The log for a day (created if needed). */
				entry(day = time.day(time.now())) {
					const days = J().days;
					if (!days[day]) {
						days[day] = fresh();
						for (const k of Object.keys(days)) if (Number(k) < day - KEEP_DAYS) delete days[k];
					}
					return days[day];
				},

				/** @returns {object|null} The log for a day, if any. */
				get: (day) => J().days[day] ?? null,

				/** The day the next summary is about (not saved). */
				summaryDay: null,

				/** @returns {string[]} The summary lines for a day. */
				summary(day) {
					const e = journal.get(day) ?? fresh();
					const fn = summaries.get(config.journal?.summary ?? "default") ?? summaries.get("default");
					return fn(e, day);
				},

				/** Register a summary hook: (entry, day) => string[]. */
				registerSummary: (name, fn) => summaries.set(name, fn),

			};
			setup.journal = journal;

			// Decided by the user: autosave when you wake up to the daily summary.
			setup.save.setAutosaveRule(() => setup.sc.passage() === "Journal_Summary");

			const add = (key, n = 1) => {
				journal.entry()[key] += n;
			};
			const push = (key, v) => {
				const list = (journal.entry()[key] ??= []);
				if (!list.includes(v)) list.push(v);
			};

			bus.on("money:earned", ({ amount }) => add("earned", amount));
			bus.on("money:paid", ({ amount }) => add("spent", amount));
			bus.on("school:lesson", () => add("lessons"));
			bus.on("school:missed", ({ day, lessons }) => {
				const e = J().days[day];
				if (e) e.skipped += lessons;
			});
			bus.on("job:shiftEnd", ({ mins }) => {
				add("shifts");
				add("workMins", mins);
			});
			bus.on("npc:met", ({ npc }) => push("met", npc));
			bus.on("skill:levelup", ({ id, level }) => push("levels", `${registry.tryGet("skill", id)?.label ?? id} ${level}`));
			bus.on("rel:tier", ({ npc, tier, up }) => {
				if (up) push("tiers", `${setup.npcs.get(npc).name}: ${tier}`);
			});
			bus.on("storyline:stage", ({ id, to }) => {
				const d = registry.tryGet("storyline", id);
				const st = d?.stages.find((s) => s.id === to);
				if (d && !d.hidden && st) push("stages", `${d.label}: ${st.label}`);
			});
			bus.on("phone:message", () => add("messages"));
			bus.on("trait:gained", ({ id }) => push("traits", `New trait: ${registry.get("trait", id).label}`));
			bus.on("trait:lost", ({ id }) => push("traits", `Lost the trait: ${registry.get("trait", id).label}`));

			// Waking up on a new day: show the summary of the day you slept on.
			bus.on("action:end", ({ action, ctx }) => {
				const def = registry.tryGet("action", action);
				if (!def?.tags.includes("sleep")) return;
				const from = time.day(ctx.t);
				if (time.day(time.now()) <= from) return;
				journal.summaryDay = from;
				flow.request("Journal_Summary", flow.PRIORITY.event);
			});

			journal.registerSummary("default", (e) => {
				const lines = [];
				const names = (ids) => ids.map((id) => setup.npcs.get(id).name).join(", ");
				if (e.lessons || e.skipped) lines.push(`School: ${e.lessons} lesson${e.lessons === 1 ? "" : "s"} attended${e.skipped ? `, ${e.skipped} skipped` : ""}.`);
				if (e.shifts) lines.push(`Work: ${e.shifts} shift${e.shifts === 1 ? "" : "s"}, ${fmt.duration(e.workMins)}.`);
				if (e.earned || e.spent) lines.push(`Money: ${e.earned ? `+${fmt.money(e.earned)}` : ""}${e.earned && e.spent ? ", " : ""}${e.spent ? `−${fmt.money(e.spent)}` : ""}.`);
				if (e.met.length) lines.push(`Met: ${names(e.met)}.`);
				for (const t of e.tiers) lines.push(t);
				for (const l of e.levels) lines.push(`Skill up: ${l}.`);
				for (const s of e.stages) lines.push(s);
				for (const t of e.traits ?? []) lines.push(`${t}.`);
				if (e.messages) lines.push(`${e.messages} new message${e.messages === 1 ? "" : "s"}.`);
				if (!lines.length) lines.push("A quiet day.");
				return lines;
			});

			ui.view("journal-summary", (box) => {
				box.classList.add("m-journal");
				const day = journal.summaryDay ?? time.day(time.now()) - 1;
				box.append(ui.el("h1", { text: `Your day: ${fmt.date(time.at(day, "12:00"))}` }));
				box.append(ui.el("ul", { class: "summary" }, ...journal.summary(day).map((l) => ui.el("li", { text: l }))));
				box.append(ui.el("p", { class: "note", text: `It's ${fmt.time(time.now())} on ${fmt.date(time.now())}. The game has been saved (autosave).` }));
				box.append(ui.button("Get up", () => flow.continue(), { class: "btn-primary" }));
			});
		},
	});
})();
