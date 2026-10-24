# Editing the game

This guide is for changing the game itself: prices, places, people, actions, events and text. No programming knowledge needed. For how the code works underneath, see `src/README.md`.

## How to make a change from your phone

1. In Safari, open the repository on github.com and go to the file (the table below says which one).
2. Tap the **pencil** (Edit) icon. If you can't see it, use "Request Desktop Website".
3. Make your change, then tap **Commit changes…**.
4. Choose **Create a new branch and start a pull request**, then create the pull request.
5. Wait for the checks. A **green tick** means the game still builds. A **red cross** means something's wrong: open the failed check, and the message says which file and which definition.
6. Merge the pull request. About a minute later the change is live at https://turbotemple.github.io/TwineStory/.

You can always ask Claude to make a change instead ("make the flat white £4").

## Where things are

All the game's content is in `src/content/mooresville/`. Each file starts with a guide to what's in it and how to add to it.

| To change… | Edit this file |
|---|---|
| Places, rooms, opening hours, walking times, the bus, taxis, starting money | `town-map.js` (which rooms open onto which: `links`; taxis only on the phone: `viaPhone`) |
| A place's description | `src/story/mooresville/locations.twee` (passage `Loc_<id>`) |
| Atmosphere lines under a place ("Rain taps against the window.") | `town-map.js`, part 2 |
| Stats (Energy, Hunger…), how fast they change, and effects (Hungry, Tipsy…) | `town-needs.js` |
| Traits (Caffeine addicted, Gym regular) and the habits that earn them | `town-traits.js` |
| Things to do, their prices and what they do | `town-actions.js` |
| Food, drink, groceries, the bag, wardrobe and cupboards | `town-items.js` |
| Clothes, and effects clothes switch on | `town-clothing.js` |
| The shops (what they sell comes from each item's `shops`) | `town-shops.js` |
| People: who they are, their looks, where they are each day | `town-people.js` |
| Things to say in the Talk menu, Friendship and Romance | `town-social.js` |
| The barista job: stages, shifts, pay, shift events | `town-work.js` |
| Getting fit: a second storyline (the gym) | `town-fitness.js` |
| **The key story characters and their storylines** (Dennis, the cosplay club, Mark, Lenny, xXWolfHowlXx, the mystery donator) | `src/content/mooresville/stories/` (one file per story; see its README) |
| **Their story text** (each starts with a `[… edit here]` start screen) | `src/story/mooresville/stories/` |
| Home and family: where you live, the flat to rent, rent and pocket money, furniture, chores, the curfew | `town-home.js` |
| Things on in town on set days (the Saturday market, fireworks night) | `town-events.js`, part 2 |
| How busy a place is at different times, and dress codes | `town-map.js`: each place's `crowd` and `dressCode` |
| Your parents and the letting agent | `town-people.js` |
| Event text for the job | `src/story/mooresville/work.twee` |
| School subjects, timetable, lunch, term dates | `town-school.js` |
| Flavour text for everything you do (action screens) | `src/story/mooresville/actions.twee` |
| Events around town | `town-events.js` |
| Event text | `src/story/mooresville/events.twee` |
| Weather and the climate | `town-weather.js` |
| Apps on the phone | `town-phone.js` |
| Body parts (height, weight, hair…) | `town-body.js` |
| Game-wide settings: title, start date, random-event limits, the "dressed to go out" rule, time to get changed, alarm times | `src/01-engine/config.js` |
| A new storyline from scratch | copy `templates/storyline.js` and `templates/storyline.twee` (see "Writing a storyline from scratch") |
| Pictures, GIFs and videos | `assets/media/` (see `assets/media/README.md`) |

## Quick changes

| Change | Where |
|---|---|
| Starting cash and bank balance | `town-map.js`, part 7: `start: 35` |
| Food and drink prices | `town-items.js`: `price: 3` (the price tiers are at the top of the file) |
| Clothing prices and mood boosts | `town-clothing.js`: each item's `price` and `stats` (price guide in part 2) |
| Which clothes are warm, waterproof or smart | `town-clothing.js`: each item's `attributes` |
| Which shops sell an item | the item's `shops`: add or remove the shop's id, e.g. `"patels"` |
| The price of a café drink, pub meal, haircut… | `town-actions.js`: `price: 3` (tiers at the top of the file) |
| How cold a "cold day" is | `town-weather.js`: `coldAt` (5°C or below) |
| How a trait is earned, what it needs, when it fades | `town-traits.js` |
| Bus and taxi fares | `town-map.js`, part 6: `fare` |
| Barista pay, shift length, skill per shift, random shift outcomes | `town-work.js`, part 3b |
| Promotion points (Barista 20 / 50) | `town-work.js`, part 3a: `gates` |
| How often shift events happen (15% each) | `town-work.js`, part 3d: `EVENT_CHANCE` |
| What makeup does, and for how long | `town-needs.js`, part 3: `made_up` |
| What Beauty is made of | `town-needs.js`, part 1: Beauty's `derive` list |
| How many goes the makeup kit has | `town-items.js`: `uses` |
| Rent, deposit, pocket money, what missing rent does | `town-home.js`, parts 2 and 3 |
| How likely skill checks are to succeed | `src/01-engine/config.js`: `checks` |
| How fast hunger, thirst and the rest change | `town-needs.js`, part 1: `perHour` |
| When a place opens | `town-map.js`: `hours` |
| Where a person is | `town-people.js`: `schedule` |
| Term dates, the timetable, when homework is due | `town-school.js` |
| Random events per day, gap between them | `src/01-engine/config.js`: `events` |
| When homework is due, how early or late you can go into a lesson | `town-school.js`: `homeworkDue`, `earlyMins`, `lateMins`, `lastEntryMins` |
| How long getting changed takes | `src/01-engine/config.js`: `clothing.minsPerItem`, `outfitMins` |
| The alarm times on the phone, and what the alarm wakes you from | `src/01-engine/config.js`: `phone` |

## The basics

Content is written as JavaScript objects, but you only need a few rules:

- **Text goes in quotes:** `name: "Apple"`. If the text contains a `"`, use `\"` or write it with `'` quotes instead.
- **Every line in a list or object ends with a comma.** A missing comma is the most common mistake: the check will fail and point to the line.
- **Ids** are lowercase with underscores (`chocolate_bar`). They connect things together (a shop lists `"chocolate_bar"`), so **never rename an id** once it's in the game: old saves use it. Change the `name` or `label` instead, which is what players see.
- **Money:** whole pounds only, no pennies: `price: 20` is £20. Things that do the same should cost the same (decided by the user): see the tiers at the top of `town-items.js`, `town-actions.js` and `town-clothing.js`.
- **Time:** durations are in **minutes** (`mins: 30`, `cooldown: 1440` = a day). Times of day are 24-hour text: `"07:30"`.
- **Days:** `0` = Sunday, `1` = Monday … `6` = Saturday, or the shorthand `DAYS.WEEKDAYS`, `DAYS.SAT`, `DAYS.WEEKEND`…
- **Stats** run from 0 to 100.
- **Comments:** anything after `//`, or between `/*` and `*/`, is a note for people and is ignored by the game.

Shorthand from `town-kit.js`:

```js
DAYS.WEEKDAYS                        // Monday to Friday
hours.daily("07:00", "22:00")        // open every day
hours.on(DAYS.SAT, "09:00", "17:00") // open on Saturdays
mod.add("mood", -6)                  // Mood 6 lower while the effect is on
mod.perHour("energy", -3)            // Energy drops 3 more each hour
mod.speed("food", 0.5)               // Food changes half as fast
```

## Items

Every item (food, drink, clothing…) is one block with labelled sections, so everything about it is in one place:

```js
item({
	id: "puffer_jacket",
	name: "Puffer jacket",
	price: 100,

	kind: "clothing",                  // WHAT IT IS (the wardrobe takes clothing)
	shops: ["urban_thread"],           // WHERE IT'S SOLD (shop ids from town-shops.js)
	attributes: ["warm", "waterproof"],// WHAT IT'S LIKE
	stats: [mod.add("mood", 4)],       // WHAT IT DOES FOR YOU (while worn)

	slots: ["outer"],                  // WHERE IT'S WORN (clothing only)
	size: 2,
});
```

Only things you wear can have `stats` (decided by the user); a carried item never changes your stats. Something like the makeup kit works by unlocking an action instead (`conditions: { has: "makeup_kit" }`).

Food and drink use `use: { label: "Eat", mins: 2, effects: [ … ] }` for what eating it does. To sell an item somewhere new, add the shop to its `shops`; to stop selling it, take the shop out.

## Conditions: when something is allowed

Used in `conditions`, `when`, `whileCond` and `showIf`. Put several in one `{ }` and they must **all** be true.

```js
conditions: { time: { from: "12:00", to: "21:00" }, stat: { id: "energy", min: 20 } }
```

Combine with `{ all: [ … ] }`, `{ any: [ … ] }` (at least one) and `{ not: … }`.

When an action's or a choice's conditions aren't met, it's still shown, greyed out, with what's needed underneath ("Needs: Energy at least 20"), so you can see what the character has in mind (decided by the user). Add `hidden: true` to hide it completely instead.

| Condition | True when… |
|---|---|
| `{ time: { from: "12:00", to: "21:00" } }` | the clock is in that range (can run past midnight) |
| `{ weekday: [1, 2, 3] }` | it's one of those days |
| `{ stat: { id: "energy", min: 20, max: 80 } }` | a stat is in range |
| `{ status: "tipsy" }` | an effect is on |
| `{ skill: { id: "barista", min: 20 } }` | a skill is at least that level |
| `{ money: { min: 10 } }` | you have at least £10 |
| `{ has: "groceries" }` or `{ has: { item: "groceries", qty: 2 } }` | you have it with you (bag, or storage where you are) |
| `{ wearing: "rain_jacket" }` or `{ wearing: { attribute: "cosy" } }` | you're wearing it, or something with that attribute |
| `{ wearing: { attribute: "smart", min: 2 } }` | at least 2 things you're wearing have that attribute |
| `{ trait: "caffeine_addicted" }` | you have that trait |
| `{ habit: { id: "coffee", days: 3, within: 7 } }` | you did that habit on 3 of the last 7 days |
| `{ dressed: true }` | you're dressed to go out |
| `{ at: "high_street" }` | you're there (or in one of its rooms) |
| `{ open: true }` | where you are is open |
| `{ outdoors: true }` | you're outside |
| `{ weather: { kind: "rain" } }`, `{ weather: { wet: true, tempMax: 6 } }` | the weather matches |
| `{ tooCold: true }` | outdoors and not dressed warmly enough |
| `{ body: { id: "hair_length", min: 4 } }`, `{ body: { id: "weight", is: "slim" } }` | a body part matches |
| `{ npcHere: "jess_marlow" }` | that person is where you are |
| `{ npcAt: { npc: "tom_reeves", at: "wellbeing" } }` | that person is at that place |
| `{ npcMet: "jess_marlow" }` | you've met them |
| `{ rel: { track: "friendship", min: 30 } }` | the person you're talking to likes you at least this much |
| `{ hasContact: true }` | you have their number |
| `{ ageAtLeast: 18 }` | you and the person involved are 18+ (**required on anything romantic**) |
| `{ storyline: { id: "barista_job", stage: "trainee" } }` | a storyline is at that stage (`started: false` = not begun) |
| `{ storylineCount: { id: "barista_job", key: "shifts", min: 3 } }` | a storyline counter is in range |
| `{ progression: { id: "hypnotherapist", min: 5 } }` | a storyline's progression is in range (e.g. 5+ sessions) |
| `{ employed: "grind_barista" }`, `{ employed: true }` | you have that job, or any job |
| `{ livesAt: "family_home" }`, `{ atHome: true }` | you live there; you're at home now |
| `{ renting: true }`, `{ renting: "riverside_flat" }` | you rent somewhere (or that place) |
| `{ furniture: "tv_set" }` | there's one at the home you live in |
| `{ billMissed: { id: "rent_riverside_flat", min: 2 } }` | that many payments missed in a row |
| `{ happening: "saturday_market" }` | that city event is on now |
| `{ crowd: "busy" }` | where you are is that busy (its `crowd` list) |
| `{ schoolDay: true }`, `{ homeworkDue: true }`, `{ schoolTrouble: { min: 1 } }` | school checks |
| `{ flag: "met_the_mayor" }`, `{ counter: { name: "x", min: 3 } }` | your own story flags and counters |
| `{ action: "therapy_session" }`, `{ actionElapsed: { min: 60 } }` | (in events) during that action, this far in |
| `{ travel: { mode: "bus7" } }` | (in events) during a journey |
| `{ shiftOf: "grind_barista" }` | (in events) during a shift of that job |

## Effects: what something does

Used in `effects`, `costs`, `onEnter`. They run in order.

| Effect | Does |
|---|---|
| `{ stat: { mood: 3, stress: -2 } }` | change stats |
| `{ statSet: { bladder: 0 } }` | set stats |
| `{ status: "caffeinated" }` / `{ statusRemove: "caffeinated" }` | switch an effect on / off |
| `{ status: { id: "calm", mins: 60 } }` | switch it on for a set time |
| `{ money: { amount: 5 } }` | earn £5 (negative = pay); add `account: "cash"` to choose |
| `{ habit: "coffee" }` | count today towards a habit (traits are earned from habits) |
| `{ trait: "gym_regular" }` / `{ traitRemove: "gym_regular" }` | give / take away a trait |
| `{ item: { id: "apple", qty: 1 } }` | get an item (negative = use one up) |
| `{ useUp: "makeup_kit" }` | take one go from an item with `uses` |
| `{ moveIn: "riverside_flat" }`, `{ leaveHome: true }`, `{ evict: true }` | move home; end your tenancy (deposit back); be evicted (no deposit) |
| `{ check: { resolver: "skill", skill: "barista", difficulty: 25, label: "Latte art", then: [ … ], else: [ … ] } }` | a skill check (or `resolver: "stat", stat: "beauty"`): `then` on success, `else` on failure |
| `{ skill: { barista: 0.5 } }` | improve a skill |
| `{ body: { weight: -0.2 } }` / `{ bodySet: { hair_colour: "pink" } }` | change / set a body part |
| `{ rel: { friendship: 3 } }` | change how the person you're talking to feels |
| `{ contact: "jess_marlow" }` | add someone's number to your phone |
| `{ message: { from: "jess_marlow", text: "Hi!" } }` | a text arrives (add `via: "email", subject: "…"` for an email) |
| `{ storyline: { id: "barista_job", to: "barista" } }` | move a storyline to a stage |
| `{ homework: true }` | finish the homework due soonest |
| `{ moveTo: "home_bedroom" }` | put the player somewhere |
| `{ time: 10 }` | 10 more minutes pass |
| `{ note: "Text" }` | a line in the summary box |
| `{ goto: "Ev_my_scene" }` | show that passage next (e.g. a Talk option that opens a scene) |
| `{ interrupt: "reason" }` | stop what you're doing (sleep, an action, a journey) |
| `{ flag: "met_the_mayor" }`, `{ counter: { name: "x", add: 1 } }` | set your own flags and counters |
| `{ if: { cond: { … }, then: [ … ], else: [ … ] } }` | do one thing or another |
| `{ random: [{ weight: 2, then: [ … ] }, { weight: 1, then: [ … ] }] }` | pick one at random (by weight); `weightIf: [{ when: { … }, add: 2 }]` on a branch changes its weight while the condition is true |
| `{ storylineCount: { id: "fitness", key: "workouts" } }` | add 1 to a storyline counter (`add: -1` takes one away) |
| `{ progression: "hypnotherapist" }` | add 1 to a storyline's progression (`{ progression: { id, add: -1 } }` takes one away) |
| `{ meet: "wolfhowl" }` | count as having met someone (online friends) |

## The story loop

The game's core loop (decided by the user): **a story event → a task you repeat while a counter goes up → at a set point, the next story event → a new task.** Storylines are built for exactly this. `town-work.js` (the café) and `town-fitness.js` (the gym) are examples; a new storyline needs only data and text, no code.

1. **A stage** has an `enter` event (the story moment) and `gates` that say when it moves on.
2. **The repeatable task** is an action or a job shift. Its effects raise a counter: a skill (`{ skill: { barista: 1 } }`) or a storyline counter (`{ storylineCount: { key: "sessions" } }`).
3. **The gate** moves to the next stage at a set point: `gates: [{ to: "next", when: { skill: { id: "barista", min: 20 } } }]`. The numbers are never shown (decided by the user): when the next stage comes is a surprise.
4. **The Diary** on the phone lists every storyline you've started, with its stage's `label`, `desc` and `hint` (what to do next: `hint: "Keep working at the café."`).
5. **Random outcomes** make each go different: `{ random: [{ weight: 6, then: [] }, { weight: 1, then: [{ note: "A rough shift." }, { skill: { barista: -0.5 } }] }] }`. Negative amounts take away from the counter.
6. **Stats change the odds:** give a branch `weightIf: [{ when: CONDITION, add: 2 }]` to make it likelier while the condition is true (or `add: -1` for less likely). The café's rough shifts are likelier when you're tired or stressed, and big tips when your Beauty is 50+.
7. **Occasional events** during the task: list them in the stage's `events`, with `kind: "pool"` and a `chance` (0.15 = 15% each time).
8. **Rewards:** a stage can unlock things. Give an action, interaction or anything with `conditions` the condition `{ storyline: { id: "barista_job", stage: ["barista", "supervisor"] } }` (and `hidden: true` to keep it secret until then). The café's staff coffee is the example. `onEnter` effects can also give things straight away (money, an item, a text).
9. **Crossovers:** anything can depend on another storyline's progress: a skill, a stat, a stage. See "Talk about coffee" (needs Barista skill) and "Suggest hanging out" (needs Beauty) in `town-social.js`.

## Life around town

- **Stats worked out from others.** Beauty has a `derive` list instead of a saved value: `{ add: 10 }`, `{ stat: "hygiene", times: 0.2 }`, `{ when: { status: "smartly_dressed" }, add: 10 }`. The Profile tab shows what's counting. Makeup still adds on top. Any stat can work this way.
- **Things that run out.** Give an item `uses: 10`, and an action the effect `{ useUp: "item_id" }`. The bag shows how many goes are left.
- **Dress codes.** On a place: `dressCode: { when: { wearing: { attribute: "sportswear", min: 2 } }, text: "Gym kit only…" }`. On a job, the same field covers working a shift.
- **How busy it is.** On a place: `crowd: [{ when: { time: { from: "08:00", to: "18:00" } }, level: "busy", text: "Shoppers crowd the pavements." }]`. The first true line shows on the place, and `{ crowd: "busy" }` can be tested.
- **Things on in town.** A `cityEvent` (`town-events.js`, part 2) says where and when. Its activities are actions with `conditions: { happening: "id" }` and `hidden: true`.
- **Home.** `town-home.js`: residences, rent and pocket money (bills), furniture (kind `"furniture"`, delivered home), chores and the curfew.
- **Skill checks.** Use them in actions, events and choices: `<<choice "Talk him down (Barista)" { effects: [{ check: { resolver: "skill", skill: "barista", difficulty: 25, then: [{ goto: "Ev_win" }], else: [{ goto: "Ev_lose" }] } }] }>>`. How likely success is lives in `config.js` → `checks`.

## Action screens (pictures and flavour text for what you do)

Everything you do (an action like a shower or waiting, a lesson, a work shift, talking to someone, eating or using something from your bag, getting changed, a journey across town, the bus or a taxi) ends on an **action screen**: a picture, GIF or video, your flavour text, what changed, and a **Continue** button. If something else happens instead (a random event, a story moment, the daily summary), that shows instead.

- **The text:** `src/story/mooresville/actions.twee` has one passage per thing, each saying `[<name> edit here]`. Replace that line with your text. The names: `Act_<action id>` (e.g. `Act_shower`), `Act_lesson_<subject>`, `Act_shift_<job>`, `Act_talk_<id>` (or `Act_talk_<id>_<person id>` for one person only, e.g. `Act_talk_chat_priya_shah`), `Act_use_<item id>`, `Act_get_changed`, `Act_travel_<mode>` (`walk`, `bus7`, `taxi`; or `Act_travel_<mode>_<place id>` for one destination).
- **Which journeys:** each travel mode's `screen` in `town-map.js`: `"always"` (bus, taxi), `"otherDistrict"` (walking: only from one district to another, e.g. Elm Road to the High Street, not round the shops) or `"never"`. Walking between rooms and shopping never get one.
- **The picture:** upload it to `assets/media/` (see the README there): `action/shower.gif`, `subject/maths.webp`, `job/grind_barista.mp4`, `interaction/chat.gif`, `item/chocolate_bar/use.gif`, `travelMode/bus7.mp4`, `action/get_changed.gif`. In debug mode the screen shows the exact file name it's looking for.
- **A new action** gets its screen automatically. Add an `Act_<id>` passage for its text (until then it says `[<name> edit here]`).
- The text can change with `<<when>>` like any other passage, e.g. different lines when you're tired.

## Writing text (`.twee` files)

Each passage starts with `:: Name` on its own line, and everything below it (up to the next `::`) is its text.

```
:: Ev_lost_cat
<<view "event-media">>
<h1>A lost cat</h1>

A small grey cat is crying on the wall.

<<view "event-end">>
```

- Places are `Loc_<place id>`; events are `Ev_<event id>`.
- Event passages start with `<<view "event-media">>` (the event's picture) and end with `<<view "event-end">>` (the Continue button), or with choices instead.
- A blank line starts a new paragraph. `<h1>…</h1>` is a heading. `//text//` is italic and `''text''` is bold (two single quotes each side).
- British English, second person ("You…"), present tense.

### Story tools: choices, text that changes, names

These use the same conditions and effects as the content files (the tables above), written into the passage. The checker reads them too.

**Text that depends on the situation:**

```
<<when { stat: { id: "mood", min: 60 } }>>You feel great.
<<orwhen { status: "tipsy" }>>The room is spinning a little.
<<otherwise>>You feel fine.
<</when>>
```

The first part whose condition is true is shown. `<<orwhen>>` and `<<otherwise>>` are optional. Any condition works: `{ weekday: [0, 6] }` (the weekend), `{ wearing: { attribute: "smart" } }`, `{ storyline: { id: "barista_job", stage: "barista" } }`, `{ flag: "helped_the_cat" }`…

**Choices:**

```
<<choice "Help her" "Ev_lost_cat_help" { effects: [{ stat: { mood: 5 } }, { flag: "helped_the_cat" }] }>>
<<choice "Charm her (needs Beauty)" "Ev_lost_cat_charm" { conditions: { stat: { id: "beauty", min: 40 } } }>>
<<choice "Walk on">>
```

- The label comes first, then the passage it leads to. Leave the passage out to carry on (back to where you were).
- `effects`: what choosing it does. Set a `{ flag: "…" }` to remember the choice, and test it later with `{ flag: "…" }`.
- `conditions`: when it can be chosen. Otherwise the button is greyed out and says what's needed; add `hidden: true` to hide it instead.
- `npc: "jess_marlow"`: who `{ rel: … }` effects are about. Usually not needed: it's whoever the event or conversation is with.
- What a choice did ("Mood +5") appears at the top of the next passage.

See `Ev_grind_barista_rude` in `work.twee` for a real example.

**Names and pronouns** (never type a name or pronoun that the player can change):

| Write | Shows |
|---|---|
| `<<name>>` | the player's name |
| `<<name "jess_marlow">>`, `<<first "jess_marlow">>` | "Jess Marlow", "Jess" |
| `<<they "jess_marlow">>`, `<<them …>>`, `<<their …>>`, `<<theirs …>>`, `<<themself …>>` | her pronouns ("she", "her"…) |
| `<<they>>`, `<<their>>`… (no name) | the player's pronouns |
| `<<They "jess_marlow">>` | the same with a capital letter ("She") |

## The key story characters

Each key character has a storyline in `src/content/mooresville/stories/story-<name>.js`, which holds the character, the storyline and the task you repeat. Each also has a passage file in `src/story/mooresville/stories/`. The README in the stories folder lists who, where and when.

- **How each starts** (decided by the user):
  - Dennis: your first hypnotherapy session. Sessions unlock when your parents send you, after more than three nights out past the 10pm curfew (the `late_home` counter; the event is `Ev_hypnotherapy_sent`).
  - The cosplay club: you go to the club after one of them invites you at school lunch (a random event).
  - Mark: you sign up for his volleyball class.
  - Lenny: you get the job at The Daily Grind.
  - The MMO clan: you first play online.
  - The mystery donator: a random email while you stream.

  The stories folder's README has the details. A story can also start by itself with `begin: { on: ["npc:met"], when: { withNpc: "…" } }`.
- **The start screen:** `Ev_<story>_start` in the passage file. It contains only `[<story title> edit here]` and the Continue button, so you can find it and replace the line with your text.
- **Progression:** each session, meeting or stream adds 1 (`{ progression: "hypnotherapist" }`). Gates, events, choices and `<<when>>` can test it: `{ progression: { id: "hypnotherapist", min: 5 } }`.
- **The task** shows once it's unlocked (`showIf`). It's greyed out while its character isn't there.
- **Emails:** `{ message: { from: "mystery_donator", via: "email", subject: "…", text: "…" } }` goes to the phone's Email app, not Messages.

## Writing a storyline from scratch

`templates/storyline.js` and `templates/storyline.twee` are a complete, working storyline to copy: someone on the High Street asks for help (an event with two choices); saying yes starts the storyline; "Help out" is the task you repeat, with random outcomes; after 3 goes the next stage starts with its own event and unlocks a reward.

1. **Copy the two files** into the game: `templates/storyline.js` → `src/content/mooresville/town-<story>.js`, and `templates/storyline.twee` → `src/story/mooresville/<story>.twee`.
2. **Rename** every `my_story` to your own id (lowercase_with_underscores), and change `high_street` to where your story happens.
3. **The stages** (part 1): give each a `label`, `desc` and `hint` (the Diary shows them), and `gates` for when it moves on. Gates can test a counter, a skill, a stat, a friendship, another storyline… anything in the conditions table.
4. **How it starts** (part 2): an event with `kind: "story"` and a trigger (`"world:enter"` when you arrive somewhere, `"time:hour"`, `"npc:met"`, `"school:break"` at school lunch, `"school:dayStart"`…), or `start: "first_stage"` on the storyline to begin with a new game, or a Talk option (below).
5. **The task** (part 3): an action whose effects add to the counter, with a `random` outcome. Several tasks can feed the same counter.
6. **Rewards** (part 4): anything with `conditions: { storyline: { id: "my_story", stage: "done" } }` and `hidden: true` appears only from that stage.
7. **Write the text** in the `.twee` file: one `Ev_` passage per event, with choices and `<<when>>` where you want them.
8. **Test** it at the game's address with `?debug`. Debug → Debug tools lets you jump the storyline to any stage, set stats and skip time. The checker will have caught typos before the game was published.

**A conversation that opens a scene:** give a Talk option (in `town-social.js`) the effect `{ goto: "Ev_my_scene" }`, and optionally `npcs: ["jess_marlow"]` so only she has it. The scene's choices then know who you're talking to.

## Rules the checker enforces

The build fails (red cross, nothing is published) if:

- an id is used twice, or something points at an id that doesn't exist (a typo like `at: "hgih_street"`);
- a passage is missing (e.g. an event without its `Ev_` passage);
- a condition or effect name is misspelt (in a content file or in a passage's `<<when>>`/`<<choice>>`);
- a `<<choice>>` goes to a passage that doesn't exist, or `<<name>>`/`<<they>>` names someone who doesn't exist;
- an item that isn't worn (no `slots`) has `stats`;
- **a person has no `age`; a classmate or student isn't exactly 18; or anything tagged `romance` lacks `{ ageAtLeast: 18 }`.**

## Testing a change

Open the game with `?debug` on the end: https://turbotemple.github.io/TwineStory/?debug

- Red banners at the top list any problems.
- **Menu → Debug → Debug tools** lets you jump anywhere, skip time, add money, set stats, skills and relationships, give or take away traits, jump a storyline to a stage, force or block events, and see the week's weather.
- If something looks wrong, take a screenshot and send it to Claude.
