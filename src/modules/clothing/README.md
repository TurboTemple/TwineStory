# clothing

What you wear, the wardrobe and outfits.

## Data
- `clothingSlot` — `{ id, label, order }` (coat, top, bottoms, bra, underwear, socks, shoes, accessory)
- the `clothing` block on an item — `{ slots[], warmth, formality, modifiers[], … }`. A dress uses two slots (top + bottoms). Number attributes are added up by `outfitStats()`. `modifiers` are stat modifiers that apply while the item is worn (smart shoes tire you a little).
- Effects from what you wear are statuses with `whileCond`, e.g. "Cosy" while wearing anything tagged `cosy`, "Smartly dressed" while outfit formality ≥ 9. Events can check these with `{ status: "smartly_dressed" }` or `{ wearing: { tag: "evening" } }`.
- `outfit` — `{ id, label, items[], start }`. The `start` outfit is put on at a new game (pyjamas).

## Rules
- You can only change in rooms tagged `changing` (your bedroom and bathroom, fitting rooms, gym changing rooms).
- Each item takes a minute to put on or take off.
- **Dressed to go out** (`setup.config.clothing.dressed`): something on top, on the bottom and on your feet, and no `sleepwear`. Walking, the bus and taxis all need it.
- Worn clothes are kept in a hidden `worn` storage place. What you take off goes back where the new item came from, or to the wardrobe if you're at home, otherwise your bag.

## Getting changed
The wardrobe lists what you're wearing and what you could put on, each with a tick box (the whole row is tappable). Tick everything, tap **Change**, and you go back to where you were with the new clothes on. `setup.clothing.change({ wear: [uids], remove: [uids] })` takes off, then puts on, 1 minute per item.

## State
`$wear = { slots: { [slotId]: uid }, outfits: [{ name, uids[] }] }`

## API (`setup.clothing`)
`wear(uid)`, `takeOff(uid, to?)`, `worn()`, `wornItems()`, `dressed()`, `canChangeHere()`, `outfitStats()`, `saveOutfit(name)`, `wearOutfit(name)`, `deleteOutfit(name)`

## Conditions
`{ wearing: "item" }` / `{ wearing: { tag } }`, `{ dressed: true }`, `{ outfit: { formality: { min: 9 } } }`

## UI
"Get changed" on Here (where you can change) and on the Me page → `Clothing_Wardrobe`.

## Open decisions
- Weather, so that warmth matters.
- Dirty clothes and laundry.
