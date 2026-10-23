# Mooresville

The real game town. Everything here is content: all of it can be changed without touching the engine.

| File | What's in it |
|---|---|
| `town-map.js` | Districts, places and their rooms, opening hours, walking routes, the Route 7 bus, taxis, money accounts |
| `town-needs.js` | Stats (Health, Energy, Food, Drink, Bladder, Hygiene, Mood, Stress) and effects (Tipsy, Caffeinated, Needs the toilet…) |
| `town-people.js` | Every NPC's character sheet and weekly schedule |
| `town-actions.js` | Everything you can do, with prices and stat changes |
| `town-events.js` | Events (therapy interruption, waking up bursting, bus traffic, closing time) |
| `src/story/mooresville/*.twee` | The text for each place and event |

## Places (walking minutes)

```
Your House —1— Elm Road —3— Patel's Corner Shop
                 |  \—6— Elm Park Green (Duck Pond)
                 18   \—25— High Street
                 |               |
          Mooresville Academy —15—'
                                 |— 1 The Daily Grind      — 2 The Red Lion
                                 |— 2 Threadline           — 4 Wellbeing Centre
                                 |— 6 PulseFit Gym         —10 The Arcade —15— Riverside Park
                                 '—12 Riverside Park
Bus (Route 7, £1.80): Elm Road – Academy – High Street – Arcade
Taxi (£3.20 + 35p/min, trips over a 10-minute walk): to Elm Road, High Street or the Arcade
```
