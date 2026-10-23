# npcs

NPC character sheets, schedules and who is where.

## Data — the character sheet
`npc` — `{ id, name, age, pronouns, role, tags[], desc, home, schedule[], portrait, passage }`
- **`age` is required** and must be a whole number.
- **Classmates and students** (`role` or a tag of `student` / `classmate`) must be **exactly 18**. The validator enforces this.
- `pronouns`: `"she/her"`, `"he/him"`, `"they/them"` or a custom `"x/y"`
- `schedule`: `[{ days?: [0–6], from: "HH:MM", to: "HH:MM", at: locId }]` — first match wins, otherwise `home` (or nowhere)
- `passage`: optional extra text shown on the sheet
- `ageKnown: false`: the sheet says "Unknown" (the `age` field is still required, for the age rules)
- `online: true`: someone you only know online; their sheet says "Online" instead of a place, and they need no schedule

## State
`$npcs[id] = { met, metAt?, override? }` — created lazily, only when needed.

## API (`setup.npcs`)
`get(id)`, `whereIs(id, t?)`, `peopleAt(loc, t?)`, `setOverride(id, at, until?)`, `meet(id)`, `hasMet(id)`, `openSheet(id)`

## Conditions
- `{ npcHere: "id" }` — that NPC is at the PC's location now
- `{ npcMet: "id" }`
- `{ withNpc: "id" }` — the NPC in the event's context (e.g. the one just met)
- Effect `{ meet: "id" }` — count as having met someone (e.g. an online friend)
- `{ ageAtLeast: 18 }` — the PC and every NPC in the context (`ctx.npc` / `ctx.npcs`) are at least that age. **Required on anything tagged `romance`.**

## Meeting
Decided by the user: **the first encounter counts as meeting.** An NPC is met when the PC arrives where they are, or when they're there as time passes. This emits `npc:met`, which storylets can use for first-meeting scenes.

Other modules add to the character sheet with `setup.npcs.addSheetSection(name, order, (box, npcId) => …)` (relationships adds "You and them" and Talk).

## Events
`npc:met { npc }`

## UI
"People here" on Here; each name opens the `Npcs_Sheet` character sheet.

## Open decisions
- The cast and their schedules.

