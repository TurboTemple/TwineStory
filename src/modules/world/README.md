# world

Districts, locations (with **rooms inside them**), opening hours and the **`Here`** main-loop passage.

## Places and rooms
A location with a `parent` is a room (sub-location): a pub's bar and toilets, a shop's fitting rooms. Rooms can nest. The top-level location is the **site**.
- Travel goes between sites. Leaving from a room first walks you out (`exitMins`).
- Walking between rooms of a site takes the target room's `innerMins` (default 1). You can go to the parent, a room inside, or a sibling room.
- A room without its own `hours` follows its parent's.
- **At closing time** anyone in a closed room is shown out to the site (`world:closed`).

## Data
- `district` — `{ id, name }`
- `location` — `{ id, name, district, parent, innerMins, tags[], desc, passage, hours, entry, outdoor }`
  - `passage`: description passage (prefix `Loc_`), shown on Here; falls back to `desc`
  - `hours`: `null` = always open, or `[{ days?: [0–6, 0 = Sunday], from: "HH:MM", to: "HH:MM" }]`
  - `entry`: entry condition (stored; enforced once travel rules for it are designed)
  - tag `start`: the new-game start location

## Atmosphere
`ambient: [text | { text, when }]` on a location: one line is shown under its description and stays for the hour. Lines whose `when` passes (weather, time, a status) take priority while they apply. `setup.world.ambientLine(id)`.

The phone's Map app view (`app-map`) lists every place by district with today's hours and whether it's open now.

## State
`$world = { visited: { [locId]: count } }`. The current location is `$pc.loc` (owned by `character`).

## API (`setup.world`)
`loc()`, `here()`, `parent(id)`, `children(id)`, `chain(id)`, `site(id)`, `within(a, b)`, `exitMins(id)`, `isOpen(id, t?)`, `hoursOf(id)`, `nearby()`, `walkTo(id)`, `moveTo(id)`, `addHereSection(name, order, fn)`

## Conditions
- `{ at: "loc" }` / `{ at: ["a", "b"] }` — the PC is there, or in a room inside it
- `{ open: true }` — the current location is open; `{ open: "loc" }` — that one is

## Effects
- `{ moveTo: "loc" }` — put the PC somewhere

## Events
`world:leave { loc, to }`, `world:enter { loc, from }`, `world:closed { loc, site }`

## UI
`Here` passage → `<<view "here">>`, built from sections other modules add:
last result (5) · description (10) · people (20, npcs) · around here (25: rooms) · actions (30) · travel (40). Time, money and stats are in the sidebar.

## Open decisions
- What an `entry` condition blocks, and what happens on failing it.
