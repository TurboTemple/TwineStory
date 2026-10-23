// load.mjs — load the game's Story JavaScript into a Node `vm` sandbox with
// stubbed SugarCube globals, so the validator and tests can inspect `setup`.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

/** Recursively list files under `dir` with the given extension, sorted. */
export function listFiles(dir, ext) {
	const out = [];
	const walk = (d) => {
		for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
			const p = path.join(d, entry.name);
			if (entry.isDirectory()) walk(p);
			else if (entry.name.endsWith(ext)) out.push(p);
		}
	};
	walk(dir);
	return out.sort();
}

/**
 * A permissive stand-in for a SugarCube global: any property read returns
 * another stub, any call returns a stub, any assignment is recorded.
 */
function makeStub(label, record) {
	const target = function () {};
	return new Proxy(target, {
		get(t, prop) {
			if (prop === Symbol.toPrimitive) return () => `[stub ${label}]`;
			if (prop in t && prop !== "prototype") return t[prop];
			return (t[prop] = makeStub(`${label}.${String(prop)}`, record));
		},
		set(t, prop, value) {
			record[`${label}.${String(prop)}`] = value;
			t[prop] = value;
			return true;
		},
		apply() {
			return makeStub(`${label}()`, record);
		},
	});
}

/**
 * Evaluate every `.js` file under `srcDir` in one sandbox, in the order
 * given (callers can shuffle it to prove load-order independence).
 * @param {string} srcDir
 * @param {{ search?: string, order?: (files: string[]) => string[] }} [opts]
 * @returns {{ setup: object, config: Record<string, unknown>, context: object, files: string[] }}
 */
export function loadStoryJs(srcDir, opts = {}) {
	const config = {};
	const setup = {};
	const context = {
		setup,
		console,
		URLSearchParams,
		window: { location: { search: opts.search ?? "" } },
		document: { documentElement: { dataset: {} } },
		settings: {},
		Config: makeStub("Config", config),
		State: makeStub("State", config),
		Story: makeStub("Story", config),
		Engine: makeStub("Engine", config),
		UI: makeStub("UI", config),
		Dialog: makeStub("Dialog", config),
		Save: makeStub("Save", config),
		Setting: makeStub("Setting", config),
		Serial: makeStub("Serial", config),
		Macro: makeStub("Macro", config),
		jQuery: makeStub("jQuery", config),
		$: makeStub("$", config),
	};
	vm.createContext(context);
	let files = listFiles(srcDir, ".js");
	if (opts.order) files = opts.order(files);
	for (const file of files) {
		const code = fs.readFileSync(file, "utf8");
		vm.runInContext(code, context, { filename: file });
	}
	return { setup, config, context, files };
}

/**
 * Load the Story JavaScript, swap SugarCube-dependent adapter calls for
 * Node-friendly fakes, boot the engine and start a new game.
 * @param {string} srcDir
 * @param {{ debug?: boolean, includeTest?: boolean, content?: boolean, passages?: Iterable<string>, seed?: number, order?: (files: string[]) => string[], before?: (setup: object) => void }} [opts]
 *   `before` runs just before boot (e.g. to queue extra test content).
 * @returns {{ setup: object, vars: object, played: string[], config: object }}
 */
export function bootGame(srcDir, opts = {}) {
	const { setup, config } = loadStoryJs(srcDir, { search: opts.debug ? "?debug" : "", order: opts.order });
	const vars = {};
	const played = [];
	const passages = opts.passages ? new Set(opts.passages) : null;
	const random = setup.mulberry32(opts.seed ?? 12345);
	Object.assign(setup.sc, {
		vars: () => vars,
		random,
		play: (name) => played.push(name),
		hasPassage: (name) => (passages ? passages.has(name) : true),
		banner() {},
		wikiPassage() {},
		loadScript: () => Promise.resolve(),
		on() {},
	});
	setup.vars = () => vars;
	// content: false leaves out the real game content (unit tests of the
	// framework add their own throwaway data instead).
	if (opts.content === false) setup.__content = [];
	opts.before?.(setup);
	setup.boot({ includeTest: opts.includeTest ?? true });
	setup.newGame();
	return { setup, vars, played, config };
}
