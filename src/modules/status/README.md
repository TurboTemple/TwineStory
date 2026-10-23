# status

Active effects on the PC, shown in the sidebar's **Effects** list. They feed modifiers into the stats.

## Data
`statusEffect` — `{ id, label, desc, mins, stacking, maxStacks, stackLabels, expire, modifiers[], while, onExpire[], hidden, good }`
- `mins`: how long it lasts (`null` = until removed)
- `while: { stat, min?, max? }`: active whenever that stat is in range ("Needs the toilet" while bladder ≥ 70)
- `whileCond`: active whenever any condition holds (e.g. `{ wearing: { tag: "cosy" } }` → "Cosy"). Re-checked when clothes, body, inventory, location or stats change.
- `stacking`:
  - `"refresh"`: restart the timer (the default)
  - `"extend"`: add time
  - `"stack"`: count up to `maxStacks`; modifiers are multiplied by the stacks
  - `"ignore"`
- `stackLabels`: a label per stack count, e.g. Tipsy → Merry → Drunk
- `expire`: `"all"`, or `"one"` (lose one stack each time the timer runs out)
- `hidden`: not shown in the sidebar (used for "what you're doing right now", like Asleep)
- `good`: `true`, `false` or `null`. Used to colour the chip.

## State
`$status.active = { [id]: { stacks, since, until } }`

## API (`setup.status`)
`add(id, { mins? })`, `remove(id)`, `has(id)`, `stacks(id)`, `label(id)`, `list()`, `sync()`, `expire()`

## Conditions and effects
- `{ status: "id" }` — it's active
- `{ status: "id" }` / `{ status: { id, mins } }` — add it
- `{ statusRemove: "id" }`

## Events
`status:added`, `status:changed`, `status:removed`, `status:expired`
