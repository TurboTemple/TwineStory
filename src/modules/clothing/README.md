# clothing

What you wear, the wardrobe and outfits.

## Data
- `clothingSlot` — `{ id, label, order }` (coat, top, bottoms, bra, underwear, socks, shoes, accessory)
- An item is clothing when its `kind` is `"clothing"` and it has `slots` (where it's worn; a dress uses `["top", "bottom"]`). Its `stats` apply while it's worn. Validation fails for a clothing item without slots. Clothing is always unique (one entry per piece).
- What clothes are like is told by simple yes/no **attributes** on the item (decided by the user): `warm` (keeps the cold off), `waterproof`, `smart`, `cosy`, `sportswear`, `evening`, `sleepwear`. The shop and wardrobe show them.
- Effects from what you wear are statuses with `whileCond`, e.g. "Cosy" while wearing anything `cosy`, "Smartly dressed" while wearing two or more `smart` things. Events can check these with `{ status: "smartly_dressed" }` or `{ wearing: { attribute: "evening" } }`.
- `outfit` — `{ id, label, items[], start }`. The `start` outfit is put on at a new game (pyjamas).

## Rules
- You can only change in rooms tagged `changing` (your bedroom and bathroom, fitting rooms, gym changing rooms).
- Each item takes a minute to put on or take off.
- **Dressed to go out** (`setup.config.clothing.dressed`): something on top, on the bottom and on your feet, and no `sleepwear`. Walking, the bus and taxis all need it.
- **Time to change** (`setup.config.clothing`): `minsPerItem` for each thing put on or taken off, `outfitMins` to change into a saved outfit.
- Worn clothes are kept in a hidden `worn` storage place. What you take off goes back where the new item came from, or to the wardrobe if you're at home, otherwise your bag.

## Getting changed
The wardrobe lists what you're wearing and what you could put on, each with a tick box (the whole row is tappable). Tick everything, tap **Change**, and you go back to where you were with the new clothes on. `setup.clothing.change({ wear: [uids], remove: [uids] })` takes off, then puts on, 1 minute per item.

## State
`$wear = { slots: { [slotId]: uid }, outfits: [{ name, uids[] }] }`

## API (`setup.clothing`)
`wear(uid)`, `takeOff(uid, to?)`, `worn()`, `wornItems()`, `isWearable(def)`, `dressed()`, `canChangeHere()`, `saveOutfit(name)`, `wearOutfit(name)`, `deleteOutfit(name)`

## Conditions
`{ wearing: "item" }` / `{ wearing: { attribute, min? } }` (at least `min` things with the attribute, default 1), `{ dressed: true }`

## UI
"Get changed" on Here (where you can change) and in the sidebar's Profile tab → `Clothing_Wardrobe`.

## Open decisions
- The price tiers and their mood boosts (£10 none, £20 +1, £50 +2, £100 +4), and which items are warm or smart.
- Dirty clothes and laundry.
