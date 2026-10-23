// Shared helpers for the unit tests.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bootGame } from "../scripts/lib/load.mjs";

export const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

/** Objects from the vm sandbox have other prototypes; compare as plain JSON. */
export const plain = (x) => JSON.parse(JSON.stringify(x));

/**
 * Boot a fresh engine and new game.
 * @param {object} [opts] See bootGame. Test content is off unless asked for.
 */
export function boot(opts = {}) {
	return bootGame(SRC, { includeTest: false, ...opts });
}
