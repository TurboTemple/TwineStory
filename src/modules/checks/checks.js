/*
 * checks — skill and stat checks: "Persuade him (Charm 30)".
 *
 * A check is the `check` effect with one of these resolvers:
 *   { check: { resolver: "skill", skill: "barista", difficulty: 30, label: "Latte art", then: [...], else: [...] } }
 *   { check: { resolver: "stat",  stat: "beauty",   difficulty: 40, then: [...], else: [...] } }
 * `then` runs on success, `else` on failure. Any effect works in either,
 * including { goto: "Ev_…" } to show a different passage.
 *
 * How likely success is comes from setup.config.checks (DESIGN: user to
 * decide): "chance" (odds rise with how far you are above the difficulty)
 * or "threshold" (pass if you're at least at the difficulty). A check can
 * pick its own with mode: "threshold". setup.checks.chance(spec) gives the
 * odds, e.g. to show them in a choice.
 *
 * WHERE TO USE IT: actions, events and <<choice>> effects (EDITING.md).
 * WHERE TO EDIT THE ODDS: src/01-engine/config.js → checks.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "checks",
		version: 1,
		deps: ["skills", "stats"],

		install({ effects, rng, config }) {
			const C = () => config.checks ?? {};

			const checks = {
				/** @returns {number} The value a check tests (skill level or effective stat). */
				value: (spec) => (spec.resolver === "skill" ? setup.skills.level(spec.skill) : setup.stats.get(spec.stat)),

				/**
				 * The odds of passing, 0–1.
				 * @param {{resolver: string, skill?: string, stat?: string, difficulty: number, mode?: string}} spec
				 */
				chance(spec) {
					const c = C();
					const v = checks.value(spec);
					if ((spec.mode ?? c.mode) === "threshold") return v >= spec.difficulty ? 1 : 0;
					const p = (c.base ?? 0.5) + (v - spec.difficulty) * (c.perPoint ?? 0.03);
					return Math.min(c.max ?? 0.95, Math.max(c.min ?? 0.05, p));
				},

				/** Roll a check. @returns {boolean} */
				roll(spec) {
					const p = checks.chance(spec);
					return p >= 1 ? true : p <= 0 ? false : rng.chance(p);
				},
			};
			setup.checks = checks;

			effects.registerResolver("skill", (spec) => checks.roll(spec));
			effects.registerResolver("stat", (spec) => checks.roll(spec));
		},

		validate() {
			// Every check names a real skill or stat and has a difficulty.
			const errs = [];
			const walk = (list, where) => {
				for (const item of setup.util.toArray(list)) {
					if (!item || typeof item !== "object") continue;
					const c = item.check;
					if (c && (c.resolver === "skill" || c.resolver === "stat")) {
						const type = c.resolver;
						const id = c[type];
						if (!setup.registry.has(type, id)) errs.push(`${where}: check names unknown ${type} "${id}"`);
						if (typeof c.difficulty !== "number") errs.push(`${where}: check needs a difficulty`);
					}
					for (const v of Object.values(item)) if (v && typeof v === "object") walk(Array.isArray(v) ? v : [v], where);
				}
			};
			for (const { type, def } of setup.registry.entries()) walk([def], `${type} "${def.id}"`);
			return errs;
		},
	});
})();
