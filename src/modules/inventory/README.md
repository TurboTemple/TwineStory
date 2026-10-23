# inventory

Items, and the places they're kept.

## Data
- `item` — `{ id, name, desc, category, tags[], price, stackable, size, use }`
  - `stackable`: identical items share one entry with a quantity (food). `false` makes each one separate (clothes).
  - `size`: how much room it takes.
  - `use`: `{ label, mins, conditions, effects, consume }`, e.g. "Eat" a sandwich. `consume: false` keeps it.
- `storage` — `{ id, label, at, carried, capacity, accepts, hidden, start[], order }`
  - `carried`: always with you (the bag). Otherwise it's only reachable `at` its location (the wardrobe, the kitchen cupboards).
  - `capacity`: total `size` it holds (`null` = unlimited).
  - `accepts`: item categories it takes (the wardrobe only takes clothes).
  - `start`: what's in it at the start of a new game.

## State
`$inv = { seq, places: { [storageId]: [{ uid, item, qty }] } }`

## API (`setup.inventory`)
`accessible()`, `entries(place)`, `count(item, places?)`, `add(item, qty, place, { force })`, `remove(item, qty, places?)`, `move(uid, to, qty?)`, `use(uid)`, `find(uid)`, `space(place)`, `refuses(place, item, qty)`

## Conditions and effects
- `{ has: "item" }` / `{ has: { item, qty, place? } }` — within reach
- `{ item: { id, qty, place? } }` — positive adds (to the bag), negative uses up (bag first, then storage here)

## UI
**Bag** in the sidebar → `Inventory_Bag`: everything you can reach, with Use / Wear / Put in… buttons.

## Open decisions
- Food going off, item condition, dropping things.
