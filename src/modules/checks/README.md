# checks

Skill and stat checks, using the engine's `check` effect with two resolvers:

```js
{ check: { resolver: "skill", skill: "barista", difficulty: 25, label: "Latte art", then: [ … ], else: [ … ] } }
{ check: { resolver: "stat", stat: "beauty", difficulty: 40, then: [ … ], else: [ … ] } }
```

`then` runs on success, `else` on failure. Put `{ goto: "Ev_…" }` in either to show a different passage. With a `label`, the summary says "Latte art: success" or "failed".

## How likely success is (`setup.config.checks`, DESIGN: user to decide)
- `mode: "chance"` (default): odds = `base + (value − difficulty) × perPoint`, kept between `min` and `max`. Placeholders: 50% at the difficulty, ±3% a point, 5–95%.
- `mode: "threshold"`: pass if value ≥ difficulty.
- A check can set its own `mode`.

## API (`setup.checks`)
`value(spec)`, `chance(spec)` (0–1, e.g. to show the odds), `roll(spec)`

The validator checks that every check names a real skill or stat and has a difficulty, in content files and in `<<choice>>` effects.
