/*
 * tuning — the debug Tuning page: every number you might want to tune
 * (stat rates, effect lengths, pay, prices, fares, bills, event chances,
 * journey times, check odds…) on one page, each with the file to edit.
 * Shown on the Debug_Tuning passage (Test index → Tuning).
 *
 * It only reads the game data; it never changes anything. The numbers come
 * straight from the definitions, so the page is always up to date.
 * "Edit in" comes from the build: scripts/media-manifest.mjs records which
 * file defines each thing (setup.__sources).
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   nothing: this is a tool. The page says where each number lives.
 * See src/modules/debug/README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "tuning",
		version: 1,
		deps: ["debug", "stats"],

		install({ ui, registry, cond, effects, fmt, time, config, balance }) {
			const CONFIG_FILE = "src/01-engine/config.js";

			/* ---- Plain-English helpers --------------------------------------- */

			const each = (type) => (registry.hasType(type) ? registry.all(type) : []);
			const label = (type, id) => {
				const d = registry.tryGet(type, id);
				return d?.label ?? d?.name ?? id;
			};
			const pct = (p) => `${Math.round(p * 1000) / 10}%`;
			/** Money that may have pence in it (a taxi's rate a minute): "£0.50". */
			const rate = (n) => (Number.isInteger(n) ? fmt.money(n) : `${config.locale?.currencySymbol ?? ""}${n.toFixed(2)}`);
			const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
			const KINDS = { random: "Random event", story: "Story event", pool: "Stage event (pool)", manual: "Shown by the story" };
			const signed = (n) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
			const days = (list) => list.map((d) => time.WEEKDAYS[d]).join(", ");
			/** "Mood +2; Stress −3" for a list of effects ("" if none). */
			const fx = (list) => (list?.length ? effects.describe(list).filter(Boolean).join("; ") : "");
			/** "Energy at least 20 and At work" for a condition ("" if none). */
			const when = (c) => {
				if (c == null || c === true) return "";
				try {
					return cond.explain(c, {}).map((e) => e.text).join(" and ");
				}
				catch {
					return JSON.stringify(c);
				}
			};
			const mods = (list) => (list ?? []).map((m) => setup.stats.describeModifier(m)).join(", ");
			const places = (at) => setup.util.toArray(at).map((id) => label("location", id)).join(", ");
			/** A line only if its value is there: line("Does", fx(…)). */
			const line = (title, value) => (value ? `${title}: ${value}` : null);

			// Which file defines each thing, from the build (missing in unit tests).
			let fileOf = null;
			const file = (type, id) => {
				if (!fileOf) {
					fileOf = new Map();
					for (const [f, keys] of Object.entries(setup.__sources ?? {})) for (const k of keys) fileOf.set(k, f);
				}
				return fileOf.get(`${type}:${id}`) ?? null;
			};

			/* ---- What each section shows -------------------------------------- */

			/**
			 * One section per kind of thing. `lines(def)` lists its numbers in
			 * plain English; `show(def)` (optional) leaves out things with
			 * nothing to tune.
			 */
			const SECTIONS = [
				{
					title: "Stats", type: "stat",
					lines: (d) => [
						d.derive ? null : `Starts at ${d.start} (range ${d.min}–${d.max})`,
						d.derive ? `Worked out from: ${d.derive.map((p) => ("stat" in p ? `${label("stat", p.stat)} × ${p.times ?? 1}` : "when" in p ? `${signed(p.add ?? 0)} while ${p.label ?? when(p.when)}` : `${p.label ?? "Base"} ${p.add ?? 0}`)).join("; ")}` : null,
						d.derive ? null
						: d.change === "toward" ? `Moves back towards ${d.target ?? d.start} by ${Math.abs(d.perHour)} an hour`
						: d.change === "drift" && d.perHour ? `Changes by ${signed(d.perHour)} an hour`
						: d.change === "drift" || d.change === "none" ? "Doesn't change by itself"
						: `Changes with the "${d.change}" hook`,
					],
				},
				{
					title: "Effects", type: "statusEffect",
					lines: (d) => [
						d.mins != null ? `Lasts ${fmt.duration(d.mins)}` : null,
						d.while ? `On while ${when({ stat: { id: d.while.stat, min: d.while.min, max: d.while.max } })}` : null,
						line("On while", when(d.whileCond)),
						line("Does", mods(d.modifiers)),
						Object.keys(d.factors ?? {}).length ? `Factors: ${Object.entries(d.factors).map(([k, v]) => `${k} ×${v}`).join(", ")}` : null,
						d.stacking === "stack" ? `Stacks up to ${d.maxStacks}` : null,
						line("When it ends", fx(d.onExpire)),
					],
				},
				{
					title: "Traits", type: "trait",
					lines: (d) => [
						d.earn ? `Earned: "${d.earn.habit}" on ${d.earn.within && d.earn.within !== d.earn.days ? `${d.earn.days} of ${d.earn.within} days` : `${d.earn.days} days in a row`}` : null,
						d.needs ? `Needs "${d.needs.habit}" every day${fx(d.needs.missed) ? `; a day without: ${fx(d.needs.missed)}` : ""}${fx(d.needs.done) ? `; doing it: ${fx(d.needs.done)}` : ""}` : null,
						d.lose ? `Lost after ${d.lose.daysWithout} days without "${d.lose.habit}"` : null,
						line("Does", mods(d.modifiers)),
					],
				},
				{
					title: "Skills", type: "skill",
					lines: (d) => [`Starts at ${d.start}, up to ${d.max}; gain curve "${d.gain}"`],
				},
				{
					title: "Actions", type: "action",
					lines: (d) => [
						line("Where", d.atTag ? `anywhere tagged "${d.atTag}"` : places(d.at)),
						d.with || d.withTag ? `With: ${d.with ? label("npc", d.with) : `anyone tagged "${d.withTag}"`}` : null,
						d.durations?.length ? `You choose: ${d.durations.map((m) => (typeof m === "string" ? `until ${m}` : fmt.short(m))).join(", ")}` : d.mins ? `Takes ${fmt.duration(d.mins)}` : null,
						line("At the start", fx(d.costs)),
						line("Does", fx(d.effects)),
						line("Each hour", fx(d.perHour)),
						line("Needs", when(d.conditions)),
					],
				},
				{
					title: "Jobs", type: "job",
					lines: (d) => {
						const stage = (s) => registry.tryGet("storyline", d.storyline)?.stages.find((x) => x.id === s)?.label ?? s;
						return [
							`Shift: ${fmt.duration(d.shiftMins)}`,
							...Object.entries(d.pay).map(([s, p]) => `Pay as ${stage(s)}: ${fmt.money(p)} an hour (${fmt.money(Math.round((p * d.shiftMins) / 60))} a shift)`),
							d.skill && d.skillPerShift ? `${label("skill", d.skill)} skill ${signed(d.skillPerShift)} a shift` : null,
							line("Each shift", fx(d.effects)),
							line("Where", places(d.at)),
						];
					},
				},
				{
					title: "Items and prices", type: "item",
					lines: (d) => [
						`Price: ${fmt.money(d.price)}`,
						line("Worn", mods(d.stats)),
						d.attributes?.length ? `Is: ${d.attributes.join(", ")}` : null,
						d.use ? `${d.use.label ?? "Use"}${d.use.mins ? ` (${fmt.duration(d.use.mins)})` : ""}: ${fx(d.use.effects) || "nothing"}` : null,
						d.use?.conditions ? line("Needs", when(d.use.conditions)) : null,
						d.uses ? `Lasts ${d.uses} uses` : null,
					],
				},
				{
					title: "Talking", type: "interaction",
					lines: (d) => [
						`Takes ${fmt.duration(d.mins)}${d.once ? "; only once" : d.cooldown ? `; again after ${fmt.duration(d.cooldown)}` : ""}`,
						line("Does", fx(d.effects)),
						line("Needs", when(d.conditions)),
					],
				},
				{
					title: "Relationship tracks", type: "relTrack",
					lines: (d) => [
						`Starts at ${d.start} (range ${d.min}–${d.max})`,
						`Tiers: ${d.tiers.map((t) => `${t.label} ${t.at}`).join(", ")}`,
					],
				},
				{
					title: "Storyline gates", type: "storyline",
					show: (d) => d.stages.some((st) => st.gates?.length || st.onEnter?.length),
					lines: (d) => d.stages.flatMap((st) => [
						...(st.gates ?? []).map((g) => `${st.label ?? st.id} → ${d.stages.find((x) => x.id === g.to)?.label ?? g.to} when ${when(g.when) || "always"}`),
						fx(st.onEnter) ? `On reaching ${st.label ?? st.id}: ${fx(st.onEnter)}` : null,
					]),
				},
				{
					title: "Events", type: "storylet",
					show: (d) => d.kind !== "manual" || d.effects.length,
					lines: (d) => [
						`${KINDS[d.kind] ?? d.kind}${d.triggers.length ? `, on ${d.triggers.join(", ")}` : ""}`,
						d.chance != null ? `Chance: ${pct(d.chance)} each time` : null,
						d.weight !== 1 ? `Weight: ${d.weight}` : null,
						d.cooldown ? `Not again for ${fmt.duration(d.cooldown)}` : null,
						d.maxPerDay != null ? `At most ${d.maxPerDay} a day` : null,
						d.once ? "Only once" : null,
						d.group ? `Group: ${d.group}` : null,
						line("Does", fx(d.effects)),
						line("Needs", when(d.conditions)),
					],
				},
				{
					title: "Travel", type: "travelMode",
					lines: (d) => [
						d.cost === "none" ? "Free" : d.cost === "flat" ? `${fmt.money(d.fare.flat ?? 0)} a trip` : d.cost === "meter" ? `${fmt.money(d.fare.base ?? 0)} to start, plus ${rate(d.fare.perMin ?? 0)} a minute (rounded to whole pounds)` : `Cost from the "${d.cost}" hook`,
						d.timeFactor !== 1 ? `Journey time × ${d.timeFactor}` : null,
						d.minDistance ? `Only for journeys of ${fmt.duration(d.minDistance)} or more` : null,
					],
				},
				{
					title: "Journey times", type: "route",
					name: (d) => `${label("location", d.from)} ↔ ${label("location", d.to)}`,
					lines: (d) => [`${fmt.duration(d.mins)} (${label("travelMode", d.network)})`],
				},
				{
					title: "Money: accounts", type: "account",
					lines: (d) => [`Starts with ${fmt.money(d.start)}`],
				},
				{
					title: "Bills and income", type: "bill",
					lines: (d) => [
						`${d.kind === "income" ? "Income" : "Charge"}: ${fmt.money(d.amount)} every ${d.every}${d.every === "week" ? ` (${time.WEEKDAYS[d.weekday]})` : d.every === "month" ? ` (on day ${d.date})` : ""}`,
						line("While", when(d.activeIf)),
						line("If missed", fx(d.onMissed)),
					],
				},
				{
					title: "Homes", type: "residence",
					lines: (d) => [
						d.deposit ? `Deposit: ${fmt.money(d.deposit)}` : null,
						d.rentBill ? `Rent: ${fmt.money(registry.tryGet("bill", d.rentBill)?.amount ?? 0)} a ${registry.tryGet("bill", d.rentBill)?.every ?? "?"} (see Bills and income)` : null,
						line("Needs", when(d.conditions)),
					],
				},
				{
					title: "Body", type: "bodyPart",
					lines: (d) => [
						`Starts at ${d.start}${d.kind === "number" ? ` (range ${d.min}–${d.max})` : ""}`,
						d.perDay ? `Changes by ${signed(d.perDay)} a day ("${d.change}")` : null,
						d.bands ? `Bands: ${d.bands.map((b) => (b.below != null ? `${b.label} below ${b.below}` : b.label)).join(", ")}` : null,
					],
				},
				{
					title: "School", type: "school",
					lines: (d) => [
						d.earlyMins != null ? `Lessons open ${d.earlyMins} min early` : null,
						d.lateMins != null ? `Late after ${d.lateMins} min` : null,
						d.lastEntryMins != null ? `No going in during the last ${d.lastEntryMins} min` : null,
						d.homeworkDue ? `Homework due at ${d.homeworkDue}` : null,
					],
				},
				{
					title: "School subjects", type: "subject",
					lines: (d) => [d.homeworkDays ? `Homework due ${d.homeworkDays} days later` : "No homework"],
				},
				{
					title: "Things on in town", type: "cityEvent",
					lines: (d) => [
						d.days ? `On: ${days(d.days)}` : null,
						d.dates ? `Dates: ${d.dates.join(", ")}` : null,
						d.from || d.to ? `Season: ${d.from ?? "…"} to ${d.to ?? "…"}` : null,
						d.hours ? `Hours: ${d.hours.from}–${d.hours.to}` : null,
					],
				},
				{
					title: "Weather", type: "climate",
					lines: (d) => [
						d.coldAt != null ? `Cold at ${d.coldAt}°C or below` : null,
						...Object.entries(d.months ?? {}).map(([m, x]) => `${MONTHS[m - 1] ?? m}: ${x.temp?.join("–")}°C; ${Object.entries(x.kinds ?? {}).map(([k, w]) => `${label("weatherKind", k)} ${w}`).join(", ")}`),
					],
				},
			];

			/** Game-wide settings from config.js (not definitions). */
			const gameWide = () => {
				const rows = [];
				const add = (name, lines) => rows.push({ name, file: CONFIG_FILE, lines: lines.filter(Boolean) });
				const c = config.checks;
				if (c) add("Skill and stat checks", [c.mode === "threshold" ? "Pass if you're at or above the difficulty" : `Odds: ${pct(c.base ?? 0.5)} at the difficulty, ${signed(Math.round((c.perPoint ?? 0) * 1000) / 10)}% for each point above it`, `Never below ${pct(c.min ?? 0)} or above ${pct(c.max ?? 1)}`]);
				const e = config.events;
				if (e) add("Random events", [`Choosing: "${e.selector}"`, e.maxRandomPerDay != null ? `At most ${e.maxRandomPerDay} a day` : null, e.minGapMins ? `At least ${fmt.duration(e.minGapMins)} apart` : null]);
				const w = config.clothing;
				if (w) add("Getting changed", [`${fmt.duration(w.minsPerItem)} an item`, `${fmt.duration(w.outfitMins)} for a saved outfit`]);
				const p = config.phone;
				if (p?.alarmTimes) add("Phone alarm", [`Times: ${p.alarmTimes.join(", ")}`]);
				if (config.start) add("New game", [`Starts on day ${config.start.day} at ${config.start.time}`, config.pc ? `You're ${config.pc.startAge}` : null]);
				const keys = Object.entries(balance ?? {});
				if (keys.length) add("Balance", keys.map(([k, v]) => `${k}: ${JSON.stringify(v)}`));
				return rows;
			};

			const tuning = {
				/**
				 * Everything on the page, as data:
				 * [{ title, rows: [{ name, file, lines: string[] }] }].
				 */
				sections() {
					const out = [{ title: "Game-wide settings", rows: gameWide() }];
					for (const s of SECTIONS) {
						const rows = each(s.type).filter((d) => !s.show || s.show(d)).map((d) => ({
							name: s.name ? s.name(d) : d.label ?? d.name ?? d.id,
							file: file(s.type, d.id),
							lines: s.lines(d).filter(Boolean),
						}));
						if (rows.length) out.push({ title: s.title, rows });
					}
					return out;
				},
			};
			setup.tuning = tuning;

			/* ---- The page ------------------------------------------------------ */

			ui.view("debug-tuning", (box) => {
				box.classList.add("m-debug");
				if (!config.debug) {
					box.append(ui.el("p", { text: "The tuning page needs ?debug in the address." }));
					return;
				}
				box.append(ui.el("p", { class: "note", text: "Every number you might want to tune, read straight from the game. Open a group, find the number, then edit it in the file named under it (on GitHub, open the file and search for the name)." }));
				for (const s of tuning.sections()) {
					box.append(ui.el("details", { class: "checklist tuning" },
						ui.el("summary", { text: `${s.title} (${s.rows.length})` }),
						...s.rows.map((r) => ui.el("div", { class: "tune-row" },
							ui.el("strong", { text: r.name }),
							r.lines.length ? ui.el("ul", { class: "mods" }, ...r.lines.map((l) => ui.el("li", { text: l }))) : ui.el("p", { class: "note", text: "Nothing to tune." }),
							r.file ? ui.el("p", { class: "note", text: `Edit in ${r.file}` }) : null))));
				}
			});
		},
	});
})();
