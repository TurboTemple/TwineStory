/*
 * cityevents — things happening around town on set days: a market every
 * Saturday, a fireworks night, a fair.
 *
 * A city event is data:
 *   { id, label, at, desc, days, dates, from, to, hours, conditions, order }
 *   at        the place it's at (and its rooms)
 *   days      weekdays it happens (0 = Sunday), e.g. [6] for Saturdays
 *   dates     particular dates instead: ["2026-11-05"]
 *   from, to  or every day between two dates ("2026-12-01" to "2026-12-24")
 *   hours     { from: "09:00", to: "14:00" } (leave out for all day)
 *   conditions extra rules (the weather, a storyline…)
 * While it's on, the place shows "On now: …", the phone's calendar lists
 * it, and anything can check { happening: "id" }. What there is to do is
 * ordinary actions with that condition (and hidden: true), so an event's
 * activities are data like everything else.
 *
 * WHERE TO EDIT THE GAME CONTENT FOR THIS:
 *   src/content/mooresville/town-events.js (part 2: around town)
 * Every field, condition, effect and event is listed in src/modules/cityevents/README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "cityevents",
		version: 1,
		deps: ["world"],

		install({ registry, cond, time, ui }) {
			registry.defineType("cityEvent", {
				required: ["label", "at"],
				defaults: { desc: "", days: null, dates: null, from: null, to: null, hours: null, conditions: null, order: 0 },
				refs: { at: "location" },
				conditions: ["conditions"],
				check(def) {
					const errs = [];
					if (!def.days && !def.dates && !def.from) errs.push("say when it happens: days, dates, or from/to");
					try {
						for (const d of def.dates ?? []) time.dayOf(d);
						if (def.from) time.dayOf(def.from);
						if (def.to) time.dayOf(def.to);
						if (def.hours) {
							time.parseHM(def.hours.from);
							time.parseHM(def.hours.to);
						}
					}
					catch (ex) {
						errs.push(ex.message);
					}
					return errs;
				},
			});

			const E = (id) => registry.get("cityEvent", id);

			const city = {
				/** @returns {object[]} City event definitions in order. */
				defs: () => registry.all("cityEvent").sort((a, b) => a.order - b.order),

				/** @returns {boolean} Whether the event happens at all on a day. */
				onDay(id, day) {
					const e = E(id);
					if (e.days && !e.days.includes(time.weekday(time.at(day, "12:00")))) return false;
					if (e.dates && !e.dates.some((d) => time.dayOf(d) === day)) return false;
					if (e.from && day < time.dayOf(e.from)) return false;
					if (e.to && day > time.dayOf(e.to)) return false;
					return true;
				},

				/** @returns {boolean} Whether it's on right now. */
				active(id, t = time.now()) {
					const e = E(id);
					if (!city.onDay(id, time.day(t))) return false;
					if (e.hours && !time.isBetween(t, e.hours.from, e.hours.to)) return false;
					return cond.test(e.conditions, { t });
				},

				/** @returns {object[]} Events on now at (or above) a location. */
				at(loc = setup.world.loc(), t = time.now()) {
					return city.defs().filter((e) => setup.world.within(loc, e.at) && city.active(e.id, t));
				},
			};
			setup.cityEvents = city;

			// { happening: "id" } — that event is on right now.
			cond.register("happening", {
				test: (spec, ctx) => setup.util.toArray(spec).some((id) => city.active(id, ctx.t ?? time.now())),
				describe: (spec) => `While ${setup.util.toArray(spec).map((id) => registry.tryGet("cityEvent", id)?.label ?? id).join(" or ")} is on`,
			});

			setup.world.addHereSection("cityevents", 12, (box, here) => {
				for (const e of city.at(here.id)) {
					box.append(ui.el("p", { class: "m-cityevents on-now" },
						ui.el("strong", { text: `On now: ${e.label}` }),
						e.desc ? ui.el("span", { text: ` ${e.desc}` }) : null));
				}
			});
		},

		ready() {
			// City events in the phone's calendar.
			if (!setup.modules.has("phone")) return;
			setup.phone.addCalendarSource((from, to) => setup.cityEvents.defs().flatMap((e) => {
				const out = [];
				for (let d = setup.time.day(from); d <= setup.time.day(to - 1); d++) {
					if (!setup.cityEvents.onDay(e.id, d)) continue;
					const start = setup.time.at(d, e.hours?.from ?? "00:00");
					out.push({ t: start, text: `${e.label} (${setup.registry.get("location", e.at).name}${e.hours ? `, ${e.hours.from}–${e.hours.to}` : ""})` });
				}
				return out;
			}));
		},
	});
})();
