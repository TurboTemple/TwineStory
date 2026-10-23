# world

Districts, locations, opening hours and the **`Here`** main-loop passage.

## Data
- `district` — `{ id, name }`
- `location` — `{ id, name, district, tags[], desc, passage, hours, entry }`
  - `passage`: description passage (prefix `Loc_`), shown on Here; falls back to `desc`
  - `hours`: `null` = always open, or `[{ days?: [0–6, 0 = Sunday], from: "HH:MM", to: "HH:MM" }]`
  - `entry`: entry condition (stored; enforced once travel rules for it are designed)
  - tag `start`: the new-game start location

## State
`$world = { visited: { [locId]: count } }`. The current location is `$pc.loc` (owned by `character`).

## API (`setup.world`)
`loc()`, `here()`, `isOpen(id, t?)`, `moveTo(id)`, `addHereSection(name, order, fn)`

## Conditions
- `{ at: "loc" }` / `{ at: ["a", "b"] }` — the PC is there
- `{ open: true }` — the current location is open; `{ open: "loc" }` — that one is

## Effects
- `{ moveTo: "loc" }` — put the PC somewhere

## Events
`world:leave { loc, to }`, `world:enter { loc, from }`

## UI
`Here` passage → `<<view "here">>`, built from sections other modules add:
status (0) · last result (5) · description (10) · people (20, npcs) · actions (30) · travel (40).

## Open decisions
- How the start location is chosen (now: first location tagged `start`).
- What an `entry` condition blocks, and what happens on failing it.
