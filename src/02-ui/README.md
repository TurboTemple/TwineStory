# UI shell

`StoryInterface` (shell.twee) replaces SugarCube's default sidebar with:

| Region | Passage | What it shows |
|---|---|---|
| `#topbar` | `Sys_Topbar` | Phones only: a **Menu** button, the time and your money |
| `#sidebar` | `Sys_Sidebar` | Portrait, name, age and pronouns, time, date and location, money per account, stat bars, active effects, and Saves / Settings / Restart (plus Tests in debug mode) |
| `#passages` | — | The game |

SugarCube redraws `data-passage` regions after every passage and on `UI.update()`, so the sidebar is always current.

- **Wide screens (≥ 900px):** the sidebar is a fixed column on the left.
- **Phones:** the sidebar slides out from the left when you tap **Menu**. Tapping outside it, tapping Close, or moving on closes it.
- **Adding to the sidebar:** `setup.shell.addSection(name, order, fn)`.
- **Settings** (theme Auto/Light/Dark, text size, 12/24-hour clock) are registered in `config.js`, because SugarCube loads saved settings straight after Story JavaScript runs.
- **Styles:** `tokens.css` (colours and sizes, light and dark), `shell.css` (layout), `base.css` (buttons, results, notes). Neutral placeholder look.
