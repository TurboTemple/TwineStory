# inventory

Items, and the places they're kept.

## Data
- `item` — `{ id, name, desc, price, kind, shops[], attributes[], stats[], use, size, stackable, tags[] }`. Each item is self-contained, in labelled sections:
  - `kind`: what it is (`"food"`, `"drink"`, `"groceries"`, `"clothing"`…). Shops list items under it, and storage accepts items by it.
  - `shops`: the shops that sell it (shop ids; checked by the validator).
  - `attributes`: what it's like, as yes/no words (`"warm"`, `"waterproof"`, `"smart"`…), read by other systems.
  - `stats`: stat modifiers while the item is worn. Only items with `slots` can have them (decided by the user); the checker rejects stats on anything else.
  - `tags`: free labels for anything else.
  - `stackable`: whether identical items share one entry with a quantity. Leave it out and the unique rules decide: clothing is unique, everything else stacks. Modules add rules with `setup.inventory.addUniqueRule((def) => boolean)`.
  - `size`: how much room it takes.
  - `use`: `{ label, mins, conditions, effects, consume }`, e.g. "Eat" a sandwich. `consume: false` keeps it.
  - `uses`: how many goes it has before it runs out (a makeup kit: 10). `{ useUp: "makeup_kit" }` takes one go; the bag shows "7 goes left"; at 0 the item is gone. The count is kept on the entry (`usesLeft`).
- `storage` — `{ id, label, at, carried, capacity, accepts, hidden, start[], order }`
  - `carried`: always with you (the bag). Otherwise it's only reachable `at` its location (the wardrobe, the kitchen cupboards).
  - `capacity`: total `size` it holds (`null` = unlimited).
  - `accepts`: the kinds of item it takes (the wardrobe takes `"clothing"`).
  - `start`: what's in it at the start of a new game.

## State
`$inv = { seq, places: { [storageId]: [{ uid, item, qty, usesLeft? }] } }`

## API (`setup.inventory`)
`accessible()`, `allPlaces()` (every place holding anything, reachable or not; other modules use this instead of reading `$inv`), `stackable(def)`, `addUniqueRule(fn)`, `entries(place)`, `count(item, places?)`, `add(item, qty, place, { force })`, `remove(item, qty, places?)`, `move(uid, to, qty?)`, `moveAll(uid, to)` (ignores room; used when moving house), `use(uid)`, `useUp(item)`, `usesLeft(entry)`, `find(uid)`, `space(place)`, `refuses(place, item, qty)`

## Conditions and effects
- `{ has: "item" }` / `{ has: { item, qty, place? } }` — within reach
- `{ item: { id, qty, place? } }` — positive adds (to the bag), negative uses up (bag first, then storage here)
- `{ useUp: "item" }` — take one go from an item with `uses`

## UI
**Bag** in the sidebar → `Inventory_Bag`: everything you can reach, with Use / Wear / Put in… buttons.

## Open decisions
- Food going off, item condition, dropping things.
