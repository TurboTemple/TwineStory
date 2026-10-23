# education

School: terms, the timetable, lessons, homework, and what happens when you skip.

## Data
- `subject` — `{ id, label, teacher, homeworkDays, desc }`. `homeworkDays: null` sets no homework.
- `school` — `{ id, label, room, periods: [{ from, to }], days, terms: [{ from, to }], keyDates: [{ date, label }], timetable ("weekly"), week: { 1: [subject per period], … }, status, earlyMins, lateMins, lastEntryMins, homeworkDue ("08:40") }`. Dates are `"YYYY-MM-DD"`.

Other timetables: `setup.education.registerTimetable(name, (school, day, period) => subjectId)`.

## How it works
- In a lesson's time, in the lesson room, tap **Go to <subject>**. You can join from 5 minutes before until 15 minutes before the end; more than 5 minutes late is noted.
- A lesson sets homework (if the subject sets it and none is open), due at 08:40 that many days later. Homework actions (`{ homework: true }`) finish the one due soonest.
- Each new day: yesterday's lessons you didn't go to are skipped; homework past due is late. Both add to "trouble" until something clears it (Mr Hale's word in the form room).

## State
`$school = { attended, homework: [{ id, subject, set, due }], trouble: { lessons, homework }, totals, nextHw }`

## API (`setup.education`)
`schools()`, `inTerm`, `schoolDay`, `lessonsOn(id, day)`, `lessonNow(id)`, `nextLesson(id)`, `attend(id)`, `setHomework(subject)`, `homework()`, `doHomework()`, `trouble()`, `clearTrouble()`, `totals()`

## Conditions and effects
`{ schoolTrouble: { min } }`, `{ schoolDay: true }`, `{ homeworkDue: true }`; effects `{ homework: true }`, `{ schoolClearTrouble: true }`

## Events
`school:lesson`, `school:missed`, `school:homeworkSet`, `school:homeworkLate`

## Open decisions
- Grades, exams, what skipping really costs, what happens after school ends, and teachers as NPCs.
