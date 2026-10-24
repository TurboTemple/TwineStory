# education

School: terms, the timetable, lessons, homework, and what happens when you skip.

## Data
- `subject` — `{ id, label, teacher, homeworkDays, desc }`. `homeworkDays: null` sets no homework.
- `school` — `{ id, label, room, periods: [{ from, to }], breaks: [{ id, label, from, to, at }], days, terms: [{ from, to }], keyDates: [{ date, label }], timetable ("weekly"), week: { 1: [subject per period], … }, status, earlyMins, lateMins, lastEntryMins, homeworkDue ("08:40") }`. Dates are `"YYYY-MM-DD"`. `room` is where lessons happen; its place is the school's entrance. A break's `at` is the room you spend it in.

Other timetables: `setup.education.registerTimetable(name, (school, day, period) => subjectId)`.

## How it works
- **The school day.** At the entrance, **Attend school** takes you to the lesson room (`school:dayStart`). Each lesson is one tap, one after another; you can join until `lastEntryMins` before it ends, and more than `lateMins` late is noted. When a break comes next, the bell takes you to its room (`school:break`, the trigger for lunchtime events); **Back to class** goes straight into the next lesson. After the last lesson you're back at the entrance (`school:dayEnd`). **Leave school** goes early; the lessons left count as skipped.
- The rooms of the school day (the lesson room, each break's room and the rooms off it) don't need doors to the entrance: use `links: []` on the lesson room.
- A lesson sets homework (if the subject sets it and none is open), due at 08:40 that many days later. Homework actions (`{ homework: true }`) finish the one due soonest.
- Each new day: yesterday's lessons you didn't go to are skipped; homework past due is late. Both add to "trouble" until something clears it (Mr Hale's word in the form room).

## State
`$school = { attended, homework: [{ id, subject, set, due }], trouble: { lessons, homework }, totals, nextHw, today: { school, day, breaks } | null }` (version 2: `today` added; homework in removed subjects dropped)

## API (`setup.education`)
`schools()`, `inTerm`, `schoolDay`, `lessonsOn(id, day)`, `breaksOn(id, day)`, `lessonNow(id)`, `nextLesson(id)`, `nextJoinable(id)`, `attend(id)`, the school day: `startBlockers(id)`, `startDay(id)`, `today()`, `nextStep(id)`, `takeBreak(id, breakId)`, `backToClass(id)`, `endDay(id)`, `entrance(id)`, `insideRooms(id)`, `timetableAt(school, day, period)`; `setHomework(subject)`, `homework()`, `doHomework()`, `trouble()`, `clearTrouble()`, `totals()`

## Conditions and effects
`{ schoolTrouble: { min } }`, `{ schoolDay: true }`, `{ homeworkDue: true }`; effects `{ homework: true }`, `{ schoolClearTrouble: true }`

## Events
`school:dayStart`, `school:break`, `school:dayEnd`, `school:lesson`, `school:missed`, `school:homeworkSet`, `school:homeworkLate`

## UI
- The Here screen: "Attend school" at the entrance; today's lessons (ticked off) and the next one in the lesson room; "Back to class" on a break.
- View `app-timetable`: the phone's Timetable app (the week, with breaks).

## Open decisions
- Grades, exams, what skipping really costs, what happens after school ends, and teachers as NPCs.
