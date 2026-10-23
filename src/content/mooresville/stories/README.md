# Key story characters

One file per storyline. Each file holds everything for that story: its character(s), the storyline (its stages, how it starts) and the task you repeat to move it on. The text is in `src/story/mooresville/stories/` (a `.twee` file with the same name).

| File | Storyline (`id`) | Character(s) | Where | Starts when | Progression counts |
|---|---|---|---|---|---|
| `story-hypnotherapist.js` | The Hypnotherapist (`hypnotherapist`) | Dennis, 71 | Calm Waters Hypnotherapy, High Street (weekdays 10:00–18:00) | you first meet Dennis | sessions with Dennis |
| `story-cosplay-club.js` | The Cosplay Club (`cosplay_club`) | John 21, Arvel 22, Micheal 23 | Northfield Community Centre, Main Hall (Tue & Thu 18:30–21:00, Sat 12:00–17:00) | you first meet any of them | club meetings |
| `story-gym-teacher.js` | The Gym Teacher (`gym_teacher`) | Mark, 52 (PE teacher) | Mooresville Academy, Sports Hall (weekdays 08:30–16:30) | you first meet Mark | training sessions |
| `story-coffee-shop.js` | The Coffee Shop Owner (`coffee_shop`) | Lenny, 63 | Lenny's Café, by Elm Park Green (Mon–Sat 07:00–15:00) | you first meet Lenny | coffees with Lenny |
| `story-mmo-clan.js` | The MMO Clan (`mmo_clan`) | xXWolfHowlXx, 22 | online: the computer in your bedroom | you first play online | evenings playing with the clan |
| `story-mystery-donator.js` | The Mystery Donator (`mystery_donator`) | ??? (age unknown) | online: the computer in your bedroom | you first go live | streams |

## The progression counter
Every storyline has one main counter, its **progression** (e.g. "hypnotherapist progression 5" = five sessions with Dennis).
- Add one: `{ progression: "hypnotherapist" }` (or `{ progression: { id: "hypnotherapist", add: -1 } }` to take one away)
- Test it: `{ progression: { id: "hypnotherapist", min: 5 } }`, in gates, events, choices or `<<when>>`
- Debug tools: see each storyline's progression, and add or take one away.

## Writing a story
1. Open the story's `.twee` file. Its first passage, `Ev_<id>_start`, is the start screen. Replace the `[… edit here]` line with your text.
2. Add stages to the storyline in the `.js` file. Give each a `gates` entry (e.g. progression 5), an `enter` event and its passage. Copy the pattern from `templates/storyline.js`.
3. The repeatable task is part 3 of each file. Add `random` outcomes, checks or costs as you like (see EDITING.md).
