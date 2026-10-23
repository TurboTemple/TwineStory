import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { bootGame, loadStoryJs } from "../scripts/lib/load.mjs";
import { validate } from "../scripts/validate.mjs";

// Objects from the vm sandbox have different prototypes; compare as plain JSON.
const plain = (x) => JSON.parse(JSON.stringify(x));
const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

test("the repository passes validation", () => {
	assert.deepEqual(validate(), []);
});

test("Story JavaScript loads and applies the required SugarCube config (§4)", () => {
	const { setup, config } = loadStoryJs(src);
	assert.equal(typeof setup.boot, "function");
	assert.equal(typeof setup.newGame, "function");
	assert.equal(typeof setup.GameError, "function");
	assert.equal(config["Config.history.maxStates"], 1);
	assert.equal(config["Config.history.controls"], false);
	assert.equal(config["Config.cleanupWikifierOutput"], true);
	assert.equal(config["Config.saves.version"], setup.SCHEMA_VERSION);
	assert.equal(setup.config.debug, false);
	assert.deepEqual(plain(setup.balance), {});
});

test("?debug turns on debug config", () => {
	const { setup, config } = loadStoryJs(src, { search: "?debug" });
	assert.equal(setup.config.debug, true);
	assert.equal(config["Config.debug"], true);
	assert.equal(config["Config.enableOptionalDebugging"], true);
});

test("file load order does not matter (§5.2)", () => {
	const a = loadStoryJs(src).setup;
	const b = loadStoryJs(src, { order: (files) => [...files].reverse() }).setup;
	assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
});

test("newGame creates the engine slices and every module slice", () => {
	const { setup, vars } = bootGame(src, { includeTest: false });
	assert.equal(vars.meta.schemaVersion, setup.SCHEMA_VERSION);
	assert.equal(vars.time.t, 7 * 60);
	assert.deepEqual(plain(vars.sched), { jobs: [], seq: 0 });
	for (const m of setup.modules.list()) {
		if (m.state) assert.ok(m.state in vars, `missing $${m.state}`);
	}
});

test("GameError carries data", () => {
	const { setup } = loadStoryJs(src);
	const err = new setup.GameError("boom", { id: "x" });
	assert.equal(err.name, "GameError");
	assert.deepEqual(plain(err.data), { id: "x" });
});
