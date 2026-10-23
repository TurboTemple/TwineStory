# stats

The PC's stats. Only **base values** are saved (`$stats.base`). The **effective value** is the base adjusted by modifiers that other modules supply (active effects now; traits, clothing and furniture later). Modifiers are never stored.

## Data
`stat` — `{ id, label, desc, min, max, start, hud, order, good, change, perHour, target }`
- `hud`: show in the sidebar. `order`: sidebar order.
- `good`: `"high"` or `"low"` (bladder, stress). Used to colour the bars.
- `change`: how it moves over time (a hook name):
  - `"none"`
  - `"drift"`: `perHour` each hour
  - `"toward"`: pulled back to `target` by `perHour` each hour; rate modifiers push on top of that

## Modifiers
`{ stat, op, value }` where `op` is:
- `"add"` — effective + value
- `"mul"` — effective × value
- `"rateAdd"` — adds to the per-hour change (e.g. sleeping restores energy)
- `"rateMul"` — scales the per-hour change (e.g. sleeping halves hunger)

Register a source with `setup.stats.addModifierSource(() => modifiers[])`.

## API (`setup.stats`)
`get(id)` (effective), `base(id)`, `set(id, v)`, `add(id, d)`, `rate(id)`, `defs()`, `display(id)`, `modifiers(id)`, `registerChangeHook(name, fn)`

## Conditions and effects
- `{ stat: { id, min?, max? } }` — effective value in range
- `{ stat: { energy: 20, mood: -5 } }` — add to base
- `{ statSet: { bladder: 0 } }` — set base

## Events
`stat:changed { id, from, to }`, `stats:ticked { from, to }`

## Open decisions
- Derived stats (e.g. mood calculated from the others) — currently mood is its own stat.
