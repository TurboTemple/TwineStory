/*
 * ============================================================================
 *  bus.js — the event bus: "something happened" messages (setup.bus, §6.4)
 * ============================================================================
 *
 * Modules don't call each other directly for everything. Instead, one module
 * announces that something happened, and any module that cares listens:
 *
 *   bus.emit("job:shiftEnd", { job: "grind_barista", mins: 360 });   // jobs
 *   bus.on("job:shiftEnd", (p) => { … });                              // journal, storylines…
 *
 * Names are "area:what-happened". The clock sends time:advanced, time:hour,
 * time:day and time:week; each module's README lists the ones it sends.
 *
 * Rules:
 *   - listeners are added once, while modules install (never saved);
 *   - everything runs immediately, in priority order (higher first);
 *   - one listener crashing doesn't stop the others (the error is reported);
 *   - listeners never change the screen themselves: they ask the flow
 *     controller (flow.js) to show a passage when the current action ends.
 */
(function () {
	"use strict";

	function createBus() {
		/** @type {Map<string, {fn: Function, priority: number, once: boolean, seq: number}[]>} */
		const handlers = new Map();
		let seq = 0;

		return {
			/**
			 * Subscribe to an event. Higher priority runs first; ties run in
			 * registration order.
			 * @param {string} event  "domain:verb"
			 * @param {(payload: object, event: string) => void} fn
			 * @param {{priority?: number, once?: boolean}} [opts]
			 */
			on(event, fn, opts = {}) {
				const list = handlers.get(event) ?? [];
				list.push({ fn, priority: opts.priority ?? 0, once: Boolean(opts.once), seq: seq++ });
				list.sort((a, b) => b.priority - a.priority || a.seq - b.seq);
				handlers.set(event, list);
			},

			/** Unsubscribe a handler. */
			off(event, fn) {
				const list = handlers.get(event);
				if (list) handlers.set(event, list.filter((h) => h.fn !== fn));
			},

			/**
			 * Emit an event. Each handler's errors are reported and isolated.
			 * @param {string} event
			 * @param {object} [payload]
			 */
			emit(event, payload = {}) {
				const list = handlers.get(event);
				if (!list) return;
				for (const h of [...list]) {
					if (h.once) this.off(event, h.fn);
					try {
						h.fn(payload, event);
					}
					catch (err) {
						setup.reportError(err, `bus ${event}`);
					}
				}
			},

			/** @returns {number} Number of handlers for an event. */
			count: (event) => (handlers.get(event) ?? []).length,
		};
	}

	setup.createBus = createBus;
})();
