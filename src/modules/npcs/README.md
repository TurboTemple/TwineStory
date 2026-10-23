# npcs

NPC character sheets, schedules and who is where.

## Data — the character sheet
`npc` — `{ id, name, age, pronouns, role, tags[], desc, home, schedule[], portrait, passage }`
- **`age` is required** and must be a whole number.
- **Classmates and students** (`role` or a tag of `student` / `classmate`) must be **exactly 18**. The validator enforces this.
- `pronouns`: `"she/her"`, `"he/him"`, `"they/them"` or a custom `"x/y"`
- `schedule`: `[{ days?: [0–6], from: "HH:MM", to: "HH:MM", at: locId }]` — first match wins, otherwise `home` (or nowhere)
- `passage`: optional extra text shown on the sheet

## State
`$npcs[id] = { met, metAt?, override? }` — created lazily, only when needed.

## API (`setup.npcs`)
`get(id)`, `whereIs(id, t?)`, `peopleAt(loc, t?)`, `setOverride(id, at, until?)`, `meet(id)`, `hasMet(id)`, `openSheet(id)`

## Conditions
- `{ npcHere: "id" }` — that NPC is at the PC's location now
- `{ npcMet: "id" }`
- `{ ageAtLeast: 18 }` — the PC and every NPC in the context (`ctx.npc` / `ctx.npcs`) are at least that age. **Required on anything tagged `romance`.**

## Events
`npc:met { npc }`

## UI
"People here" on Here; each name opens the `Npcs_Sheet` character sheet.

## Open decisions
- The cast and their schedules.
- When the PC counts as having "met" someone (nothing calls `meet()` yet).
