# inventory

Items, and the places they're kept.

## Data
- `item` — `{ id, name, desc, price, tags[], modifiers[], use, size, stackable }`. Each item is self-contained:
  - `tags`: everything that sorts it, as plain labels. By convention the **first** tag is what it is (`"food"`, `"drink"`, `"groceries"`, `"clothing"`): shops list items under it, and storage accepts items by tag. A shop's id as a tag puts it on sale there (see `shops`). Quality tags (`"warm"`, `"waterproof"`, `"smart"`…) are read by other systems.
  - `modifiers`: stat modifiers while the item is in use (worn, for clothing).
  - `stackable`: whether identical items share one entry with a quantity. Leave it out and the unique rules decide: clothing is unique, everything else stacks. Modules add rules with `setup.inventory.addUniqueRule((def) => boolean)`.
  - `size`: how much room it takes.
  - `use`: `{ label, mins, conditions, effects, consume }`, e.g. "Eat" a sandwich. `consume: false` keeps it.
- `storage` — `{ id, label, at, carried, capacity, accepts, hidden, start[], order }`
  - `carried`: always with you (the bag). Otherwise it's only reachable `at` its location (the wardrobe, the kitchen cupboards).
  - `capacity`: total `size` it holds (`null` = unlimited).
  - `accepts`: tags it takes; an item goes in if it has any of them (the wardrobe takes `"clothing"`).
  - `start`: what's in it at the start of a new game.

## State
`$inv = { seq, places: { [storageId]: [{ uid, item, qty }] } }`

## API (`setup.inventory`)
`accessible()`, `stackable(def)`, `addUniqueRule(fn)`, `entries(place)`, `count(item, places?)`, `add(item, qty, place, { force })`, `remove(item, qty, places?)`, `move(uid, to, qty?)`, `use(uid)`, `find(uid)`, `space(place)`, `refuses(place, item, qty)`

## Conditions and effects
- `{ has: "item" }` / `{ has: { item, qty, place? } }` — within reach
- `{ item: { id, qty, place? } }` — positive adds (to the bag), negative uses up (bag first, then storage here)

## UI
**Bag** in the sidebar → `Inventory_Bag`: everything you can reach, with Use / Wear / Put in… buttons.

## Open decisions
- Food going off, item condition, dropping things.
