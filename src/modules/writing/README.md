# writing

Tools for writing story passages without code. They use the same conditions and effects as the content files (EDITING.md lists them all), written straight into a passage. The checker reads them too, so a typo fails the build.

## Macros

| Macro | What it does |
|---|---|
| `<<when { CONDITION }>>…<<orwhen { CONDITION }>>…<<otherwise>>…<</when>>` | Shows the first part whose condition is true. `<<orwhen>>` and `<<otherwise>>` are optional. |
| `<<choice "Label" "Ev_next" { effects, conditions, hidden, npc }>>` | A choice button. Tapping it runs `effects`, then shows the passage. Leave the passage out to carry on (to Here, or the next waiting event). With `conditions`, the button is locked and says what's needed (`hidden: true` hides it instead). `npc` is who `{ rel: … }` effects are about; it defaults to the person from the event or conversation. |
| `<<oneof>>…<<or>>…<<or>>…<</oneof>>` | Shows one of the parts, picked at random each time (so the tenth shower can read differently from the first). Showing the same screen again at the same moment keeps the same pick. |
| `<<name "id">>`, `<<first "id">>` | A person's full or first name; with no id, the player's name. |
| `<<they "id">>`, `<<them>>`, `<<their>>`, `<<theirs>>`, `<<themself>>` | Pronouns for a person, or the player with no id. `<<They "id">>` etc. start with a capital. |

`<<choice>>` replaces SugarCube's deprecated built-in macro of the same name.

The summary of a choice ("Mood +4") is shown at the top of the passage it leads to (through `<<view "event-media">>`) and added to the summary back at Here. Events still waiting their turn are kept: a choice with no passage goes on to the next one.

## State
`$scene = { npc }` — who the current event (`event:fired` ctx) or conversation (`rel:interact`) is with.

## API (`setup.writing`)
`args(raw, macro)`, `ctx(npc?)`, `pick(conds)`, `check(opts)`, `choose(passage, opts)`, `name(id?, firstOnly?)`, `pronoun(form, id?)`

The data in macros is read by `setup.util.parseData` (strings, numbers, true/false/null, lists and objects with bare keys); no code is ever run.

## Checker
`scripts/lib/rules.mjs` → `checkStoryMacros`: unknown conditions and effects, missing passages, unknown choice options and unknown people.

## Template
`templates/storyline.js` and `templates/storyline.twee` are a complete storyline to copy. `tests/writing.test.mjs` proves the template is valid and plays through.
