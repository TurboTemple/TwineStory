# Mooresville

The real game town. Everything here is content: all of it can be changed without touching the engine.

Each file starts with a guide: what's in it, how to add something, and what every field means. A good place to start is **`EDITING.md`** at the top of the repository.

| File | What's in it |
|---|---|
| `town-kit.js` | Shorthand the other files use: day lists (`DAYS.WEEKDAYS`), opening hours, stat modifiers (`mod.add("mood", 2)`) |
| `town-map.js` | Districts, places and their rooms, atmosphere lines, opening hours, walking routes, the Route 7 and Route 3 buses, taxis, money accounts |
| `town-needs.js` | Stats (Health, Energy, Food, Drink, Bladder, Hygiene, Mood, Stress) and effects (Hungry, Tipsy, Caffeinated…) |
| `town-traits.js` | Traits earned through habits (Caffeine addicted, Gym regular) |
| `town-people.js` | Every person's character sheet, looks and weekly schedule |
| `town-actions.js` | Everything under "Things to do", with prices and stat changes |
| `town-items.js` | Storage (bag, wardrobe, kitchen cupboards), what's in them at the start, food and drink, groceries (each item says which shops sell it) |
| `town-clothing.js` | Clothing slots, about 35 clothes (each with its price, shops, modifiers and qualities), the starting outfit, effects clothes switch on |
| `town-shops.js` | The shops (what they sell comes from the items' tags) |
| `town-body.js` | Body parts: height, weight, bust, skin tone, eye colour, hair colour and length |
| `town-work.js` | Skills, and the barista job: its career stages, shifts, pay and events |
| `town-fitness.js` | Getting fit: a second storyline, driven by working out at the gym |
| `town-home.js` | Home and family: residences, the flat to rent, rent and pocket money, furniture, chores, the curfew |
| `town-school.js` | Subjects, the timetable, term dates, and your tutor's word about skipping |
| `town-social.js` | Friendship and Romance, and the Talk menu |
| `town-events.js` | Events around town (therapy interruption, waking up bursting, bus traffic, closing time, footsteps at night), and part 2: things on in town on set days (the Saturday market, fireworks night) |
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
                                 |—12 Riverside Park (River Path, Boathouse Kiosk, Public Toilets) —4— Riverside Court
                                 |         |8
                                 '—10 Business District (Sovereign Square)
                                           |— 1 Northern Crown Bank   — 2 Keys & Co Estate Agents
                                           |— 4 Grumman Productions Film Studio (Casting Office; Sound Stage and Dressing Rooms: studio pass)
                                           '—12 South Town
                                                 |— 2 Club Neon (Dance Floor, Bar, VIP Booth, Smoking Area, Toilets)
                                                 |— 2 Scarlet's Adult Store (over-18s; Changing Cubicle)
                                                 |— 1 Golden Grill Kebabs
                                                 '—10 Mooresville Beach (The Sand, The Sea, Changing Area, The Pier, The Surf Shack)
Bus (Route 7, £2): Elm Road – Academy – High Street – Arcade
Bus (Route 3, £2): High Street – Riverside Park – Business District – South Town – Beach
Taxi (£3 + 50p a minute, rounded to whole pounds, for trips over a 10-minute walk): to any hub (Elm Road, High Street, the Arcade, Riverside Park, the Business District, South Town, the beach)
```
