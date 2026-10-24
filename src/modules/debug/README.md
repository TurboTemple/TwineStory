# debug

Tools for testing the real game on a phone. Only available with `?debug` in the address. Open them from **Debug** in the sidebar → **Debug tools**.

- **Go anywhere:** jump to any place or room instantly.
- **Time:** skip forward, or to the next 07:00 / 10:00 / 13:00 / 19:00.
- **Money:** add £5, £20 or £100.
- **Stats:** set any stat to 0, 50 or 100.
- **Events:** force an event (it fires whenever its conditions are met, ignoring chance and limits), block it, or put it back to normal. This isn't saved.
- **Game data:** counts of everything defined, and the save size.
- **Writing checklist** (`Debug_Checklist`, from the Test index): every passage still saying `[… edit here]`, grouped by file (the build lists them: `scripts/media-manifest.mjs` → `setup.__placeholders`), and every picture not yet added, grouped by folder (`debugTools.pictureSpots()`).
- **Tuning** (`Debug_Tuning`, from the Test index; `tuning.js`): every number worth tuning, read straight from the definitions, in collapsible groups (game-wide settings from `config.js`, stats, effects, traits, skills, actions, jobs, items and prices, talking, relationship tracks, storyline gates, events, travel, journey times, accounts, bills, homes, body, school, things on in town, weather). Each thing says the file that defines it: the build records that (`scripts/media-manifest.mjs` → `contentSources()` → `setup.__sources`, file → `["type:id"]`). Effects and conditions are shown through their `describe` text, so every effect operator needs a `describe` (a unit test checks the game's content). Read-only.

API: `setup.debugTools.teleport(id)`, `skip(mins)`, `skipTo("HH:MM")`; `setup.tuning.sections()` → `[{ title, rows: [{ name, file, lines }] }]` (what the Tuning page shows).
