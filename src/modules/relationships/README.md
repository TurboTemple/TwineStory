# relationships

How the PC gets on with each NPC, and the **Talk** menu on an NPC's sheet.

## Data
- `relTrack` — `{ id, label, min, max, start, tiers: [{ at, label }], conditions, gain ("relGain"), tags, hidden, order }`. `conditions` decides which NPCs it applies to (romance: `{ ageAtLeast: 18 }`).
- `interaction` — `{ id, label, desc, mins, cooldown, once, conditions, showIf, effects, npcs, npcTags, tags, hidden, order }`. `conditions` failing shows it locked with the reason; `showIf` failing hides it.

Romance (§1): anything tagged `romance` needs `{ ageAtLeast: 18 }`; the validator checks this.

## State
Inside each NPC's record: `$npcs[id].rel = { [track]: value }`, `$npcs[id].cool = { [interaction]: lastTime }`.

## API (`setup.rel`)
`tracks()`, `applies(npc, track)`, `get`, `tier`, `add(npc, track, n)`, `set`, `interactions(npc)`, `interact(npc, id)`, `cooldownLeft(npc, id)`

Gains are multiplied by the active statuses' `factors.relGain` (being unwashed halves them).

## Conditions and effects
- `{ rel: { npc?, track, min?, max? } }` (npc defaults to the one you're talking to)
- `{ rel: { npc?, friendship: 3, romance: 1 } }`

## Events
`rel:changed`, `rel:tier { npc, track, tier, up }`, `rel:interact`

## Open decisions
- Tracks, tiers, interactions, how fast relationships grow, and whether they fade over time (they don't yet).
