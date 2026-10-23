/*
 * character — the player character's identity and position ($pc).
 * Phase 3 adds the creation wizard and backgrounds; this is the minimum other
 * modules need now. See README.md.
 */
(function () {
	"use strict";

	(setup.__modules ??= []).push({
		id: "character",
		version: 1,
		deps: [],
		state: "pc",
		defaultState: () => ({ name: "", loc: null }),

		install() {
			const pc = () => setup.vars().pc;

			setup.character = {
				/** @returns {string|null} Current location id. */
				loc: () => pc().loc,

				/**
				 * Set the current location. Use setup.world.moveTo() instead, which
				 * also fires the enter/leave events.
				 * @param {string|null} id
				 */
				setLoc(id) {
					pc().loc = id;
				},

				/** @returns {string} */
				name: () => pc().name,

				/**
				 * The PC's age. The PC is 18 at game start (§1). Ageing over time
				 * arrives with the date of birth in Phase 3.
				 * @returns {number}
				 */
				age: () => setup.config.pc.startAge,
			};
		},
	});
})();
