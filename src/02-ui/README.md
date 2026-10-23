# UI shell

`StoryInterface` (shell.twee) replaces SugarCube's default sidebar with:

| Region | Passage | What it shows |
|---|---|---|
| `#topbar` | `Sys_Topbar` | Phones only: a **Menu** button, the time and your money |
| `#sidebar` | `Sys_Sidebar` | Two tabs. **Overview:** portrait, name, time, place, money, stat bars, effects. **Profile:** the full profile (body with pictures, clothes with pictures, stats in detail with every modifier and where it comes from, money with recent spending, and each effect with what it does). Both tabs end with Me / Bag / Saves / Settings / Restart (plus Debug in debug mode) |
| `#passages` | — | The game |

SugarCube redraws `data-passage` regions after every passage and on `UI.update()`, so the sidebar is always current.

- **Wide screens (≥ 900px):** the sidebar is a fixed column on the left.
- **Phones:** the sidebar slides out from the left when you tap **Menu**. Tapping outside it, tapping Close, or moving on closes it.
- **Adding to the sidebar:** `setup.shell.addSection(name, order, fn)`.
- **Settings** (theme Auto/Light/Dark, text size, 12/24-hour clock) are registered in `config.js`, because SugarCube loads saved settings straight after Story JavaScript runs.
- **Styles:** `tokens.css` (colours and sizes, light and dark), `shell.css` (layout), `base.css` (buttons, results, notes). Neutral placeholder look.
