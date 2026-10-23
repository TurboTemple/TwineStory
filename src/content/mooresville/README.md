# Mooresville

The real game town. Everything here is content: all of it can be changed without touching the engine.

Each file starts with a guide: what's in it, how to add something, and what every field means. A good place to start is **`EDITING.md`** at the top of the repository.

| File | What's in it |
|---|---|
| `town-kit.js` | Shorthand the other files use: `pounds(3.20)`, day lists (`DAYS.WEEKDAYS`), opening hours, stat modifiers (`mod.add("mood", 2)`) |
| `town-map.js` | Districts, places and their rooms, atmosphere lines, opening hours, walking routes, the Route 7 bus, taxis, money accounts |
| `town-needs.js` | Stats (Health, Energy, Food, Drink, Bladder, Hygiene, Mood, Stress) and effects (Hungry, Tipsy, Caffeinated…) |
| `town-people.js` | Every person's character sheet, looks and weekly schedule |
| `town-actions.js` | Everything under "Things to do", with prices and stat changes |
| `town-items.js` | Storage (bag, wardrobe, kitchen cupboards), what's in them at the start, food and drink, groceries |
| `town-clothing.js` | Clothing slots, about 35 clothes, the starting outfit, effects clothes switch on |
| `town-shops.js` | What each shop sells, and any shop-specific prices |
| `town-body.js` | Body parts: height, weight, bust, skin tone, eye colour, hair colour and length |
| `town-work.js` | Skills, and the barista job: its career stages, shifts, pay and events |
| `town-school.js` | Subjects, the timetable, term dates, and your tutor's word about skipping |
| `town-social.js` | Friendship and Romance, and the Talk menu |
| `town-events.js` | Events around town (therapy interruption, waking up bursting, bus traffic, closing time) |
| `town-weather.js` | Weather kinds, the climate month by month, Cold and Getting wet |
| `town-phone.js` | The apps on your phone |
| `src/story/mooresville/*.twee` | The text: one passage per place (`Loc_<id>`) and per event (`Ev_<id>`) |

## Places (walking minutes)

```
Your House —1— Elm Road —3— Patel's Corner Shop
                 |  \—6— Elm Park Green (Duck Pond)
                 18   \—25— High Street
                 |               |
          Mooresville Academy —15—'
                                 |— 1 The Daily Grind      — 2 The Red Lion
                                 |— 2 Threadline           — 4 Wellbeing Centre
                                 |— 3 Snips Hair Salon
                                 |— 6 PulseFit Gym         —10 The Arcade —15— Riverside Park
                                 '—12 Riverside Park
Bus (Route 7, £1.80): Elm Road – Academy – High Street – Arcade
Taxi (£3.20 + 35p a minute, for trips over a 10-minute walk): to Elm Road, High Street or the Arcade
```
