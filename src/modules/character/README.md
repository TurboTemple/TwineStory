# character

The player character's identity and position. **Minimal for now** — the
creation wizard, backgrounds and date of birth arrive in Phase 3.

- **State:** `$pc = { name, loc }`
- **API (`setup.character`):** `loc()`, `setLoc(id)` (prefer `setup.world.moveTo`), `name()`, `age()`
- **Age:** `age()` returns `setup.config.pc.startAge` (18, per §1). Ageing over time comes with the date of birth.

## Open decisions
- Character creation steps, backgrounds and starting kit (Phase 3).
