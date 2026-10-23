# phone

Contacts, messages, an alarm, and the apps on the phone. Opening apps doesn't move time.

## Data
`app` — `{ id, label, icon, view, order, conditions, badge }`. `view` is a named view; `badge` names a badge hook (`setup.phone.registerBadge(name, () => n)`, built in: `"unread"`).

Views provided: `app-messages`, `app-email` (emails: `{ message: { from, text, via: "email", subject } }`; badge `unread_email`), `app-calendar`, `app-alarm` (here), `app-bank` (money), `app-map` (world), `app-diary` (storylines).

## State
`$phone = { contacts: [npcId], messages: [{ from, text, t, read, mine }], alarm: "HH:MM" | null }` (last 60 messages)

Alarm settings are in `setup.config.phone`: `alarmTimes` (the choices offered) and `alarmWakesIf` (a condition; the alarm wakes you while it's true, by default `{ status: "asleep" }`).

## API (`setup.phone`)
`contacts()`, `hasContact(npc)`, `addContact(npc)`, `message(from, text)`, `thread(npc)`, `unread(npc?)`, `markRead(npc)`, `apps()`, `open(appId)`, `addCalendarSource(fn)`, `calendar(from, to)`, `alarm()`, `setAlarm(hm | null)`

Calendar entries come from modules: jobs (shifts) and education (lessons, homework, key dates).

The alarm is a daily scheduler job; it wakes you if you're asleep.

## Conditions and effects
- `{ hasContact: id | true }` (true = the NPC in context)
- `{ contact: id | true }`, `{ message: { from, text } }`

## Events
`phone:message { from, text }`, `phone:alarm { t }`

## Open decisions
- Battery, contract and damage (none yet), which apps exist, and who texts you when.
