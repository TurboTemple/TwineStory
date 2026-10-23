/*
 * flow.js — the flow controller (setup.flow, §6.12).
 *
 * Modules never navigate. They call request(passage, priority); the highest
 * priority request wins and is shown once the current operation finishes.
 * All in-game links run through perform().
 */
(function () {
	"use strict";

	/** Suggested priorities. */
	const PRIORITY = { normal: 0, result: 10, event: 50, urgent: 100 };

	function createFlow() {
		let pending = null;
		let depth = 0;
		let last = null;

		const flow = {
			PRIORITY,

			/** The main-loop passage shown when nothing else is requested. */
			home: "Here",

			/**
			 * Ask to show a passage when the current operation ends.
			 * @param {string} passage
			 * @param {number} [priority]
			 */
			request(passage, priority = PRIORITY.normal) {
				if (!pending || priority > pending.priority) pending = { passage, priority };
			},

			/** @returns {{passage: string, priority: number} | null} */
			pending: () => pending,

			/**
			 * Run an operation, then navigate to the requested passage (or home).
			 * Nested calls just run `fn`. The operation's return value is kept
			 * as the last Result for the next passage to show.
			 * @param {() => unknown} fn
			 * @returns {unknown} Whatever fn returned.
			 */
			perform(fn) {
				if (depth > 0) return fn();
				depth++;
				pending = null;
				let out = null;
				try {
					out = fn();
				}
				catch (err) {
					setup.reportError(err, "flow");
				}
				finally {
					depth--;
				}
				last = out ?? null;
				const target = pending ? pending.passage : flow.home;
				if (target !== flow.home) setup.vars().meta.returnTo = flow.home;
				pending = null;
				setup.sc.play(target);
				return out;
			},

			/** Navigate to a passage through the controller. */
			go(passage) {
				return flow.perform(() => flow.request(passage));
			},

			/** "Continue" after an interruption: back to where play left off. */
			continue() {
				const meta = setup.vars().meta;
				const target = meta.returnTo || flow.home;
				meta.returnTo = null;
				setup.sc.play(target);
			},

			/** @returns {unknown} The value returned by the last perform() (not saved). */
			lastResult: () => last,

			/** Forget the last result. */
			clearResult() {
				last = null;
			},
		};
		return flow;
	}

	setup.createFlow = createFlow;
})();
