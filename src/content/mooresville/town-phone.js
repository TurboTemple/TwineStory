/*
 * ============================================================================
 *  Mooresville — the apps on your phone
 * ============================================================================
 *
 * Open the phone from the sidebar menu (Menu → Phone). Each app below is an
 * icon on the home screen, in `order`.
 *
 *   view        what the app shows. These are built into the game:
 *                 "app-messages"  texts from your contacts
 *                 "app-calendar"  lessons, homework and term dates for 7 days
 *                 "app-bank"      balances and recent spending
 *                 "app-map"       every place, and whether it's open now
 *                 "app-taxi"      book a taxi (travel modes with viaPhone: true)
 *                 "app-timetable" the school week (lessons and lunch, town-school.js)
 *                 "app-people"    everyone you've met; tap one for their character sheet
 *                 "app-recent"    the last things that happened (action screens, events)
 *                 "app-alarm"     set a daily alarm that wakes you up
 *                 "app-email"     emails ({ message: { from, text, via: "email" } })
 *                 "app-diary"     every storyline you've started and its
 *                                 `hint` (what to do next)
 *   icon        an emoji (or any short text)
 *   group       the heading it sits under on the home screen ("People", "Plans"…);
 *               groups come in the order of their first app (by `order`)
 *   badge       "unread" (texts) or "unread_email" shows how many are unread on the icon
 *   conditions  only show the app when this is true
 *
 * To remove an app, delete its line. Opening the phone never uses up time.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const app = (def) => R.define("app", def);

		// People
		app({ id: "messages", label: "Messages", icon: "💬", group: "People", order: 0, view: "app-messages", badge: "unread" });
		app({ id: "email", label: "Email", icon: "✉️", group: "People", order: 1, view: "app-email", badge: "unread_email" });
		app({ id: "people", label: "People", icon: "👥", group: "People", order: 2, view: "app-people" }); // everyone you've met: their character sheets

		// Plans
		app({ id: "diary", label: "Diary", icon: "📔", group: "Plans", order: 10, view: "app-diary" });
		app({ id: "calendar", label: "Calendar", icon: "📅", group: "Plans", order: 11, view: "app-calendar" });
		app({ id: "timetable", label: "Timetable", icon: "📚", group: "Plans", order: 12, view: "app-timetable" }); // the school week
		app({ id: "alarm", label: "Alarm", icon: "⏰", group: "Plans", order: 13, view: "app-alarm" });

		// Out and about
		app({ id: "map", label: "Map", icon: "🗺️", group: "Out and about", order: 20, view: "app-map" });
		app({ id: "taxi", label: "Taxi", icon: "🚕", group: "Out and about", order: 21, view: "app-taxi" });

		// Money and history
		app({ id: "bank", label: "Bank", icon: "🏦", group: "Money and history", order: 30, view: "app-bank" });
		app({ id: "recent", label: "Recent", icon: "🕘", group: "Money and history", order: 31, view: "app-recent" }); // what's happened lately
	});
})();
