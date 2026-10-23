# How the code fits together

A tour of `src/` for anyone reading or changing the engine. To change the *game* (prices, places, people, text), see `EDITING.md` instead. The full technical spec is `CLAUDE.md`.

## The folders

| Folder | What's in it |
|---|---|
| `00-story/` | SugarCube's special passages: the story's data, start screen, `StoryInit`, and `Sys_Boot` (which starts the engine) |
| `01-engine/` | The engine: general machinery with no game rules (clock, data catalogue, conditions, effects, saves, screens) |
| `02-ui/` | The sidebar, top bar, colours and layout |
| `modules/` | One folder per game system (stats, clothing, jobs, weather…). Each has a `README.md` listing its data fields, conditions, effects and events |
| `content/mooresville/` | The town: every place, person, item, action and event, as data |
| `story/mooresville/` | The words: one passage per place and event |

Tweego (the build tool) combines all of this into one `index.html`. Every `.js` file is joined into the "Story JavaScript"; every `.twee` file becomes passages.

## Three kinds of data

| Kind | Where it lives | Saved? | Example |
|---|---|---|---|
| **Definitions**: things that don't change during play | `setup.registry`, from `src/content` | No, rebuilt on every page load | the apple costs 45p |
| **State**: things that change | story variables (`setup.vars()`): `$pc`, `$stats`, `$inv`… | Yes | you have 2 apples |
| **Preferences** | SugarCube's `Setting` API | In the browser | dark theme |

Because definitions aren't saved, editing content changes old saves too. Each module owns one slice of state (its `state` field); modules never write each other's slices, they call each other's functions (`setup.money.pay(…)`).

## Starting up

1. The page loads and every `.js` file runs. None of them does real work: each only adds itself to a queue (`setup.__modules` for systems, `setup.__content` for data). That way the order the files load in doesn't matter.
2. `Sys_Boot` calls `setup.boot()` (`01-engine/boot.js`):
   - it creates the engine services;
   - installs each module, after the modules it depends on;
   - runs the content (every `R.define(…)`);
   - freezes the data, and in `?debug` mode checks it and shows problems as banners.
3. On a new game, `StoryInit` calls `setup.newGame()`, which fills each module's slice with its starting values. Loading a save skips this and upgrades the save instead (`01-engine/save.js`).
4. The **Here** passage shows where you are.

## What happens when you tap a button

Take "Order a flat white" at The Daily Grind:

1. The button was made by `ui.action(…)`, so it runs `setup.actions.do("cafe_flat_white")` inside `flow.perform(…)` (`01-engine/flow.js`).
2. `actions.do` (`modules/actions/actions.js`):
   1. checks the action's **conditions** (`01-engine/cond.js`);
   2. pays its **costs** (the `money` effect, handled by `modules/money`);
   3. moves the **clock** with `time.advance(5)` (`01-engine/time.js`);
   4. runs its **effects** (`01-engine/effects.js`): `stat` (modules/stats) and `status` (modules/status).
3. As the clock moves, the event bus (`01-engine/bus.js`) tells everyone. For example:
   - stats tick;
   - effects wear off;
   - people come and go;
   - the events module checks whether a storylet should fire.
4. When everything has finished, `flow.perform` shows the next screen: an event passage if one asked to be shown, otherwise Here, with a summary of what happened at the top.

## How modules talk to each other

- **Function calls** for questions and commands: `setup.money.pay(…)`, `setup.world.loc()`. A module only uses another one it lists in `deps`, or checks `setup.modules.has("phone")` first.
- **The event bus** for "this happened": `bus.emit("job:shiftEnd", …)`, `bus.on("time:day", …)`. Each module's README lists what it emits.
- **Conditions and effects**: each module registers the words for its own data (`stat`, `wearing`, `npcHere`…), and content uses them.
- **Screens**: modules add sections to shared screens instead of owning them:
  - `world.addHereSection` adds to the Here screen;
  - `character.addMeSection` adds to the Me page and Profile tab;
  - `npcs.addSheetSection` adds to a person's sheet;
  - `shell.addSection` adds to the sidebar.

  The Here screen's order is listed in `modules/world/world.js` (`addHereSection`).

## Rules for engine code

- Every file is wrapped in `(function () { "use strict"; … })();` and only exposes things on `setup`.
- Only `01-engine/sc-adapter.js` (and `config.js`) touch SugarCube directly.
- Saved state is plain data only: no functions, classes, `Date`, `Map` or `Set`. Time is whole minutes; money is whole pence.
- No `Math.random()`: use `setup.rng` (`01-engine/rng.js`).
- Nothing changes the screen directly: ask with `flow.request(passage, priority)`.
- Game rules and numbers belong in content or config, not in module code. Where a rule isn't decided yet, a module offers a named hook with a neutral default.

## Checking changes

| Check | What it does | Runs |
|---|---|---|
| `scripts/validate.mjs` | Boots the real game in Node and checks every definition, passage and age rule | GitHub Actions, on every push |
| `tests/*.test.mjs` | Unit tests of the engine and modules, plus the town | GitHub Actions, on every push |
| Tweego build | Builds `index.html`; any warning fails it | GitHub Actions, on every push |
| `scripts/smoke.mjs` | Plays the built game in a headless browser | Claude's sandbox |

Merging to `main` publishes the game to GitHub Pages.
