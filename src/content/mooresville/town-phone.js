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
 *                 "app-alarm"     set a daily alarm that wakes you up
 *                 "app-email"     emails ({ message: { from, text, via: "email" } })
 *                 "app-diary"     every storyline you've started and its
 *                                 `hint` (what to do next)
 *   icon        an emoji (or any short text)
 *   badge       "unread" (texts) or "unread_email" shows how many are unread on the icon
 *   conditions  only show the app when this is true
 *
 * To remove an app, delete its line. Opening the phone never uses up time.
 */
(function () {
	"use strict";

	(setup.__content ??= []).push((R) => {
		const app = (def) => R.define("app", def);

		app({ id: "messages", label: "Messages", icon: "💬", order: 0, view: "app-messages", badge: "unread" });
		app({ id: "calendar", label: "Calendar", icon: "📅", order: 1, view: "app-calendar" });
		app({ id: "bank", label: "Bank", icon: "🏦", order: 2, view: "app-bank" });
		app({ id: "map", label: "Map", icon: "🗺️", order: 3, view: "app-map" });
		app({ id: "taxi", label: "Taxi", icon: "🚕", order: 3, view: "app-taxi" });
		app({ id: "alarm", label: "Alarm", icon: "⏰", order: 4, view: "app-alarm" });
		app({ id: "email", label: "Email", icon: "✉️", order: 1, view: "app-email", badge: "unread_email" });
		app({ id: "diary", label: "Diary", icon: "📔", order: 5, view: "app-diary" });
		app({ id: "timetable", label: "Timetable", icon: "📚", order: 5, view: "app-timetable" }); // the school week
		app({ id: "people", label: "People", icon: "👥", order: 1, view: "app-people" });      // everyone you've met: their character sheets
	});
})();
