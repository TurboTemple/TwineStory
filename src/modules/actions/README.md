# actions

Things the PC can do that take time.

## Data
`action` — `{ id, label, desc, at, atTag, whenClosed, mins, durations, cooldown, checkpoints[], conditions, costs[], effects[], perHour[], always[], interruptible, passage, hidden, showIf, tags[] }`
- `at`: location id(s) where it's offered. `atTag`: offered in every location with that tag (e.g. every `toilet`).
- `whenClosed`: allowed while the place is closed (e.g. waiting outside). Otherwise a closed place locks its actions.
- `mins`: how long it takes. `durations: [30, 60, "07:00"]` offers a choice instead; a `"HH:MM"` entry means "until then".
- `checkpoints: [60]`: minutes at which `action:checkpoint` fires, so events can react (or interrupt) part-way through
- `costs` run first. `effects` run only if the action finishes uninterrupted. `perHour` runs on each hour boundary while it runs. `always` runs at the end either way.
- A negative `money` effect in `costs` is the price. It's shown on the button, and the action is locked if you can't afford it.
- Tip: add a status in `costs` and remove it in `always` to change how stats move **while** the action runs (sleeping, relaxing, exercising).
- `cooldown: 240`: minutes before it can be done again. While it's cooling down it shows greyed out with "Not again for …". The time each was last done is saved in `$acts.last` (version 2 of this module).
- **Locked actions** (decided by the user) show what they are, greyed out, with their requirements underneath ("Needs: …"). `hidden: true` hides one completely.
- **People-specific actions:** `with: "mark"` (or a list), or `withTag: "student"` (a tag or role). They show on the screen you get when you tap that person, not in the place's list; their effects are about that person (`ctx.npc`, e.g. `{ rel: … }`), and afterwards you're back with them. `at` is optional for these (set it to limit where). `setup.actions.withNpc(npc)` lists them; `do(id, { npc })` does one.
- `showIf`: a condition for the action to be listed at all (e.g. once its storyline has started). When it's listed, `conditions` grey it out as usual.

## The action screen
After doing something, the player sees an **action screen**: a picture, GIF or video, the flavour text, what happened (the Result) and **Continue**. It only shows when nothing more important wants the screen: an event, a story moment or the daily summary (anything requested at `result` priority or above) shows instead. Continue goes where the game would have gone anyway (Here, or the person you were talking to).

| Done by | Picture | Flavour text passage |
|---|---|---|
| An action | `assets/media/action/<id>` | `Act_<id>` (or the action's `passage`) |
| A lesson | `assets/media/subject/<subject>` | `Act_lesson_<subject>` (or the subject's `passage`) |
| A work shift | `assets/media/job/<job>` | `Act_shift_<job>` (or the job's `passage`) |
| Talking | `assets/media/interaction/<id>` | `Act_talk_<id>_<person>`, else `Act_talk_<id>` (or the interaction's `passage`) |
| Using an item from your bag | `assets/media/item/<id>/use` | `Act_use_<id>` (or the item's `use.passage`) |
| A journey (see the mode's `screen`) | `assets/media/travelMode/<mode>` | `Act_travel_<mode>_<place>`, else `Act_travel_<mode>` (or the mode's `passage`) |
| Getting changed | `assets/media/action/get_changed` | `Act_get_changed` |

Not shown (decided by the user): walking between rooms, walking round one area (the same district), and shopping.

**Outcome pictures:** the effect `{ picture: "rough" }` (e.g. in one `random` branch) makes the action screen show `assets/media/<type>/<id>/rough.*` instead, if that file exists (the café's rough shift: `job/grind_barista/rough`).

A missing passage shows `[<title> edit here]`; in debug mode the screen also says where the picture and passage go. Every current one has a placeholder passage in `src/story/mooresville/actions.twee`. The passages are ordinary story passages: `<<when>>`, `<<name>>` and the pronoun macros all work.

API: `setup.actions.illustrate({ title, media: { type, id, sub? }, passage })` asks for one (built on `setup.flow.illustrate`); `setup.flow.illustration()` is the one on screen. Passage `Actions_Scene`, view `action-scene`.

## How `do(id)` runs
conditions → costs → `action:start` → advance time in pieces up to each checkpoint → `action:checkpoint` (an event may interrupt) → effects (if not interrupted) → Result → `action:end`.
An interrupted action stops the clock where it was interrupted.

Fixed-length actions are multiplied by the `actionTime` status factor. Actions you pick a duration for (sleep, waiting) aren't.

## API (`setup.actions`)
`available()`, `do(id, { mins? })`, `isRunning()`

## Conditions
- `{ action: "id" }` — the action in context (for storylets)
- `{ actionElapsed: { min?, max? } }` — minutes into it

## Events
`action:start`, `action:checkpoint { action, elapsed, ctx, result, interrupt(reason) }`, `action:end { action, elapsed, interrupted, result }`

## Open decisions
- Every real activity.
