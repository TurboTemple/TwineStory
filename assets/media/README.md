# Media: pictures, GIFs and videos

Put a file in the right folder with the right name and the game uses it automatically. You don't need to change any code.

**From your iPhone:** in the GitHub app or on github.com, open this folder → **Add file → Upload files**. Pick the file, check it has the right name, and commit. Once the green tick appears, it's in the game.

## Where things go

| What | Folder and file name | Example |
|---|---|---|
| A place or room | `location/<id>` | `location/red_lion.webp` |
| An action (shown after you do it) | `action/<id>` | `action/make_tea.gif` |
| An event | `storylet/<id>` | `storylet/therapy_interrupted.mp4` |
| An item (food, clothes…) | `item/<id>` | `item/white_tshirt.webp` |
| An NPC's profile picture | `npc/<id>` | `npc/dr_okafor.jpg` |
| A part of an NPC | `npc/<id>/<part>` | `npc/dr_okafor/hair_colour.webp` |
| A part of your body, for a look | `bodyPart/<part>/<look>` | `bodyPart/weight/slim.webp`, `bodyPart/hair_colour/dark_brown.webp` |
| A part of your body, any look | `bodyPart/<part>` | `bodyPart/bust.webp` |
| An effect | `statusEffect/<id>` | `statusEffect/tipsy.gif` |
| Your portrait | `pc/portrait` | `pc/portrait.webp` |

- **Ids** are the names used in the game files: e.g. `red_lion` in `src/content/mooresville/town-map.js`. On the Debug tools page, the place list shows every place.
- **Looks** are written in lower case with `_` for spaces: `dark_brown`, `shoulder_length`, `very_long`.
- A **room** with no picture of its own uses its place's picture (the pub's toilets show the pub).
- Anything without a picture still works: places and actions just show text, and items and people show a letter tile.

## Formats

- **Pictures:** `.webp` is best (small and sharp); `.jpg`, `.png`, `.avif` and `.svg` also work.
- **Animations:** `.gif` works. A short `.mp4` is usually much smaller than a GIF.
- **Video:** `.mp4` or `.webm`. Videos play silently and on a loop.
- If one name has several files, the game prefers video, then GIF, then pictures.

## Sizes (to keep the game fast on phones)

- Places, actions and events: about 1200 × 700 pixels, under 300 KB (videos under 2 MB).
- Items, people and body parts: square, about 400 × 400, under 100 KB.
