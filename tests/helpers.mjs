// Shared helpers for the unit tests.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bootGame } from "../scripts/lib/load.mjs";

export const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

/** Objects from the vm sandbox have other prototypes; compare as plain JSON. */
export const plain = (x) => JSON.parse(JSON.stringify(x));

/**
 * Boot a fresh engine and new game on the _test fixture only (no real game
 * content), so framework tests don't change when the town does. With test
 * content on, it also gets two test accounts: £20 cash and £100 on a card.
 * @param {object} [opts] See bootGame.
 */
export function boot(opts = {}) {
	const before = opts.before;
	return bootGame(SRC, {
		includeTest: false,
		content: false,
		...opts,
		before(setup) {
			if (opts.includeTest) {
				(setup.__testContent ??= []).push((R) => {
					R.define("account", { id: "test_cash", label: "Cash", kind: "cash", start: 2000, order: 0 });
					R.define("account", { id: "test_bank", label: "Bank card", kind: "bank", start: 10000, order: 1 });
				});
			}
			before?.(setup);
		},
	});
}

/**
 * Boot a new game with the real Mooresville content (and no test fixture).
 * @param {object} [opts] See bootGame.
 */
export function bootTown(opts = {}) {
	return bootGame(SRC, { includeTest: false, content: true, ...opts });
}
