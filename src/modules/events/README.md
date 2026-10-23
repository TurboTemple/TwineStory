# events

The storylet (event) framework and the rules for when events happen.

## Data
`storylet` —
`{ id, passage, triggers[], kind, conditions, chance, weight, priority, cooldown, maxPerDay, group, once, effects[], tags[] }`

| Field | Meaning |
|---|---|
| `triggers` | bus events that make it a candidate, e.g. `"action:checkpoint"`, `"travel:checkpoint"`, `"npc:met"` |
| `kind` | `"random"` (default) or `"story"` |
| `conditions` | checked against the trigger's context |
| `chance` | 0–1, rolled each time a random storylet is a candidate. No chance means it never fires randomly |
| `weight` | when several random storylets succeed in the same tier, the pick is weighted by this (default 1) |
| `priority` | higher goes first |
| `cooldown` | minutes before it can fire again |
| `group` | storylets in a group share the cooldown: after one fires, none of the group fires until the cooldown ends |
| `maxPerDay` | per-storylet daily limit |
| `once` | fires at most once per game |
| `effects` | run when it fires; `{ interrupt: "reason" }` ends the activity or journey in progress |
| `passage` | shown through the flow controller (prefix `Ev_`); end it with `<<view "event-end">>` |

## Kinds
- `story`: fires every time it's eligible, highest priority first.
- `pool`: each pool storylet with a `chance` (0–1) rolls it; then one of those left is picked by `weight`, with no game-wide limits. Leave `chance` out to always be in the running. Used for a storyline stage's events (e.g. a 15% chance of each event during a shift).
- `random`: goes through the selection hook and the game-wide limits below.
- `manual`: no triggers; something fires it directly (a storyline stage's entry event).

Other modules can add eligibility rules with `setup.events.addFilter((storylet, ctx) => boolean)` (storylines uses this so a stage's events only fire in that stage).

When two events want to show at once (a shift event, then a promotion), the second waits and appears when you tap Continue.

## The rules (proposed by Claude, adjustable)
Each time a trigger happens:
1. **Eligible** = conditions pass, and the storylet isn't blocked by `once`, its `cooldown`, its `group` cooldown or its `maxPerDay`.
2. **Story events first.** If any eligible storylet has `kind: "story"`, the highest-priority one fires. Story events ignore chance and the game-wide random limits.
3. **Otherwise, random events.** If the game-wide limits allow it, the selection hook picks one.
   - `setup.config.events.maxRandomPerDay`: 4
   - `setup.config.events.minGapMins`: 60
4. **At most one event per trigger.**

**Selection hook `"chance"`** (decided by the user): go through priority tiers from highest to lowest. In a tier, every storylet rolls its own `chance`. If any succeed, one is picked by `weight`. `"none"` turns random events off. Add more with `setup.events.registerSelector(name, fn)`.

## State
`$story = { seen, lastAt, lastRandomAt, today: { day, random, counts } }`

## API (`setup.events`)
`handle(trigger, payload)`, `eligible(trigger, ctx)`, `blockedBy(storylet)`, `randomBlockedBy()`, `fire(id, ctx?)`, `seen(id)`, `force(id, true | false | null)` (debug/tests)

## Events
`event:fired { id }`

## Open decisions
- All real event content.
- The limit numbers above.
