# world

Districts, locations (with **rooms inside them**), opening hours and the **`Here`** main-loop passage.

## Places and rooms
A location with a `parent` is a room (sub-location): a pub's bar and toilets, a shop's fitting rooms. Rooms can nest. The top-level location is the **site**.
- Travel goes between sites. Leaving from a room first walks you out (`exitMins`).
- Walking between rooms of a site takes the target room's `innerMins` (default 1). By default a room connects to its parent and the rooms inside it. Give a place or room `links: ["other_room", …]` to say exactly which rooms it opens onto instead (links work both ways), e.g. bedroom → living room → hallway. `world.neighbours(id)` lists them. `links: []` means no doors (you get in and out some other way, e.g. the school day).
- `roomsLabel` (e.g. `"Shops"`) is the heading over a place's rooms (default "Around here"). Rooms locked for the same reason share one note under the buttons.
- A room merged into another keeps old saves working with `R.alias("location", old, new)`: `world.loc()` moves a saved location onto the new id.
- A room without its own `hours` follows its parent's.
- **At closing time** anyone in a closed room is shown out to the site (`world:closed`).

## Data
- `district` — `{ id, name }`
- `location` — `{ id, name, district, parent, innerMins, tags[], desc, passage, hours, entry, outdoor }`
  - `passage`: description passage (prefix `Loc_`), shown on Here; falls back to `desc`
  - `hours`: `null` = always open, or `[{ days?: [0–6, 0 = Sunday], from: "HH:MM", to: "HH:MM" }]`
  - `entry`: a condition for walking into this room (e.g. only while you live there)
  - `dressCode`: `{ when: CONDITION, text }` — you can only go in (or travel there) dressed like this; `text` says why not
  - `crowd`: `[{ when: CONDITION, level: "busy", text }]` — how busy it is: the first entry that's true shows its text on Here; `{ crowd: "busy" }` tests the level. Rooms use their place's list unless they have their own
  - tag `start`: the new-game start location

## Atmosphere
`ambient: [text | { text, when }]` on a location: one line is shown under its description and stays for the hour. Lines whose `when` passes (weather, time, a status) take priority while they apply. `setup.world.ambientLine(id)`.

The phone's Map app view (`app-map`) lists every place by district with today's hours and whether it's open now.

## State
`$world = { visited: { [locId]: count } }`. The current location is `$pc.loc` (owned by `character`).

## API (`setup.world`)
`loc()`, `here()`, `parent(id)`, `children(id)`, `chain(id)`, `site(id)`, `within(a, b)`, `exitMins(id)`, `isOpen(id, t?)`, `hoursOf(id)`, `nearby()`, `walkTo(id)`, `moveTo(id)`, `crowd(id?)`, `dressCodeBlocks(id)`, `addHereSection(name, order, fn)`

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
