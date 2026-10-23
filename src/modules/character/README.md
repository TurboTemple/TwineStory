# character

The player character's identity and position.

- **State:** `$pc = { name, pronouns, portrait, loc }`. Version 2 added `pronouns` and `portrait`; old saves are upgraded.
- **API (`setup.character`):** `name()`, `pronouns()`, `setIdentity({ name, pronouns })`, `age()`, `portrait()`, `loc()`, `setLoc(id)` (prefer `setup.world.moveTo`)
- **New game screen:** `<<view "new-game">>` on the Start passage asks for a name and pronouns.
- **Portrait:** `$pc.portrait` can be an image path under `assets/` (e.g. `assets/portraits/pc.webp`). Without one, a neutral silhouette is shown.
- **Age:** 18 at the start (§1). It's fixed for now; ageing comes with a date of birth.

## Open decisions
- More character creation steps (appearance, background, starting traits).
- Portrait artwork.
