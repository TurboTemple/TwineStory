/*
 * ============================================================================
 *  boot.js — starting the game engine (CLAUDE.md §5.2, §6.1)
 * ============================================================================
 *
 * THE BIG PICTURE
 * Tweego bundles every .js file under src/ into one "Story JavaScript", and
 * SugarCube runs it all at page load, in an order we don't control. So no
 * file does real work when it loads. Each one only adds itself to a queue:
 *
 *   setup.__modules       game systems (stats, clothing, jobs…): see modules.js
 *   setup.__content       the town's data: functions (R) => { R.define(…) }
 *   setup.__testContent   throwaway data for unit tests and debug mode only
 *
 * Once everything is loaded, the "Sys_Boot" passage (tagged `init`, see
 * src/00-story/) calls setup.boot(), which does the real work in a fixed
 * order:
 *
 *   1. create the engine services (registry, event bus, clock…)
 *   2. sort the modules so each one comes after the modules it needs
 *   3. install each module (it defines its data types, buttons, rules…)
 *   4. run every content function (the town is defined here)
 *   5. freeze the data, then let modules index it (`ready`)
 *   6. in debug mode, check everything and show any problems as banners
 *
 * Then SugarCube runs "StoryInit", which calls setup.newGame() to create the
 * saved state for a brand-new game. (Loading a save skips newGame.)
 */
(function () {
	"use strict";

	let booted = false;

	/**
	 * The toolbox handed to every module's install/ready/newGame/validate.
	 * Modules use these instead of reaching into `setup` directly, so it's
	 * clear what each one depends on.
	 */
	const api = () => ({
		registry: setup.registry, bus: setup.bus, cond: setup.cond, effects: setup.effects,
		time: setup.time, sched: setup.sched, rng: setup.rng, flow: setup.flow, fmt: setup.fmt,
		text: setup.text, ui: setup.ui, config: setup.config, balance: setup.balance,
		save: setup.save, modules: setup.modules, media: setup.media,
	});

	/**
	 * Start the engine: create services, install modules in dependency order,
	 * load content, freeze the registry and (in debug) validate.
	 * @param {{ includeTest?: boolean }} [opts]  includeTest also loads setup.__testContent (unit tests).
	 */
	setup.boot = function boot(opts = {}) {
		if (booted) return;
		booted = true;
		const debug = setup.config.debug;

		// 1. Engine services. Each create*() lives in its own file in this
		//    folder (registry.js, bus.js, …) and has no game rules in it.
		setup.registry = setup.createRegistry();
		setup.bus = setup.createBus();
		setup.cond = setup.createCond();
		setup.effects = setup.createEffects();
		setup.rng = setup.createRng();
		setup.time = setup.createTime();
		setup.sched = setup.createSched();
		setup.flow = setup.createFlow();
		setup.fmt = setup.createFmt();
		setup.text = setup.createText();
		setup.ui = setup.createUi();
		setup.media = setup.createMedia();
		setup.save = setup.createSave();
		setup.modules = setup.createModules();
		setup.coreOps.install();

		// 2–3. Sort and install modules. Installing only sets things up
		//      (types, conditions, effects, screens); no game state exists yet.
		const order = setup.sortModules(setup.__modules ?? []);
		setup.modules.setInstalled(order);
		for (const m of order) m.install?.(api());

		// 4. Content: every R.define(…) in src/content runs here. Test content
		//    only runs for unit tests or in debug mode (the game ships none).
		for (const fn of setup.__content ?? []) fn(setup.registry);
		if (debug || opts.includeTest) for (const fn of setup.__testContent ?? []) fn(setup.registry);

		// 5. Freeze the data (nothing can be defined or changed from now on),
		//    then let modules build look-up tables from the finished content.
		setup.registry.freeze();
		for (const m of order) m.ready?.(api());

		// Hook saving/loading into SugarCube, and register the <<view>> macro.
		setup.save.install();
		setup.ui.install();

		// 6. Validation banner and devtools in debug mode.
		if (debug) {
			for (const err of setup.validate()) setup.sc.banner(err, "error");
			setup.devtools.init();
		}
	};

	/**
	 * Every validation error: registry refs/passages/operators plus each
	 * module's own validate().
	 * @param {{ hasPassage?: (name: string) => boolean }} [opts]
	 * @returns {string[]}
	 */
	setup.validate = function validate(opts = {}) {
		const errors = setup.registry.validate({ hasPassage: opts.hasPassage ?? ((n) => setup.sc.hasPassage(n)) });
		for (const m of setup.modules.list()) {
			if (m.validate) errors.push(...m.validate(api()).map((e) => `${m.id}: ${e}`));
		}
		return errors;
	};

	/**
	 * Create the saved state for a brand-new game. Called only from StoryInit.
	 *
	 * Everything that changes during play lives in SugarCube's story
	 * variables (setup.vars()), one top-level "slice" per module: $pc, $stats,
	 * $inv… Engine slices are made here; each module then gets its slice
	 * from its defaultState(), and finally each module's newGame() runs
	 * (to put the player in their bedroom, fill the wardrobe, etc.).
	 */
	setup.newGame = function newGame() {
		const V = setup.vars();
		const start = setup.config.start;
		// $meta: bookkeeping. `schema` records each module's data version so
		// old saves can be upgraded (save.js); `seed` drives repeatable
		// randomness (weather, daily rolls); flags/counters are free-form.
		V.meta = {
			schemaVersion: setup.SCHEMA_VERSION,
			schema: { core: setup.save.CORE_VERSION },
			seed: Math.floor(setup.sc.random() * 4294967296),
			flags: {},
			counters: {},
			returnTo: null,
		};
		V.time = { t: setup.time.at(start.day, start.time) };
		V.sched = { jobs: [], seq: 0 };
		for (const m of setup.modules.list()) {
			if (!m.state) continue;
			V[m.state] = m.defaultState ? m.defaultState() : {};
			V.meta.schema[m.id] = m.version;
		}
		for (const m of setup.modules.list()) m.newGame?.(api());
		setup.bus.emit("game:new", {});
	};
})();
