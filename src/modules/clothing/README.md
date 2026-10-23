# clothing

What you wear, the wardrobe and outfits.

## Data
- `clothingSlot` — `{ id, label, order }` (coat, top, bottoms, bra, underwear, socks, shoes, accessory)
- the `clothing` block on an item — `{ slots[], warmth, formality, … }`. A dress uses two slots (top + bottoms). Any number attributes are added up by `outfitStats()`.
- `outfit` — `{ id, label, items[], start }`. The `start` outfit is put on at a new game (pyjamas).

## Rules
- You can only change in rooms tagged `changing` (your bedroom and bathroom, fitting rooms, gym changing rooms).
- Each item takes a minute to put on or take off.
- **Dressed to go out** (`setup.config.clothing.dressed`): something on top, on the bottom and on your feet, and no `sleepwear`. Walking, the bus and taxis all need it.
- Worn clothes are kept in a hidden `worn` storage place. What you take off goes back where the new item came from, or to the wardrobe if you're at home, otherwise your bag.

## State
`$wear = { slots: { [slotId]: uid }, outfits: [{ name, uids[] }] }`

## API (`setup.clothing`)
`wear(uid)`, `takeOff(uid, to?)`, `worn()`, `wornItems()`, `dressed()`, `canChangeHere()`, `outfitStats()`, `saveOutfit(name)`, `wearOutfit(name)`, `deleteOutfit(name)`

## Conditions
`{ wearing: "item" }` / `{ wearing: { tag } }`, `{ dressed: true }`

## UI
"Get changed" on Here (where you can change) and on the Me page → `Clothing_Wardrobe`.

## Open decisions
- What warmth and formality affect (weather, dress codes).
- Dirty clothes and laundry.
