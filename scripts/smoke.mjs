// smoke.mjs — sandbox-only browser smoke test for a built dist/index.html.
//
// Not part of CI. Claude runs it in its sandbox (which has Playwright and
// Chromium) to catch runtime errors before pushing:
//
//   NODE_PATH=$(npm root -g) node scripts/smoke.mjs [path/to/index.html]
//
// If the sandbox can't reach the CDN, set ERUDA_FILE to a local copy of the
// pinned eruda.js (e.g. from `npm pack eruda@<version>`) and the request is
// answered from that file instead.
//
// It opens the game normally and with ?debug, fails on any page error or
// console error, and checks every row on the Test_* pages listed below.
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const file = path.resolve(process.argv[2] ?? "dist/index.html");
const base = pathToFileURL(file).href;
const TEST_PASSAGES = ["Test_Phase0"];

const failures = [];
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch({
	executablePath: process.env.CHROMIUM_PATH || undefined,
	proxy: proxy ? { server: proxy } : undefined,
});

async function openPage(url) {
	const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
	if (process.env.ERUDA_FILE) {
		await page.route(/\/npm\/eruda@/, (route) => route.fulfill({ path: process.env.ERUDA_FILE, contentType: "text/javascript" }));
	}
	const errors = [];
	page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
	page.on("console", (msg) => {
		if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
	});
	await page.goto(url);
	await page.waitForSelector("#passages .passage", { timeout: 15000 });
	return { page, errors };
}

/** Click a button by its exact label inside #passages. */
async function click(page, label) {
	await page.locator("#passages button", { hasText: label }).first().click();
}

/** Expect the current passage to be `name` and contain `text`. */
async function expectPassage(page, name, text, label) {
	try {
		await page.waitForSelector(`[data-passage="${name}"]`, { timeout: 5000 });
		const body = await page.textContent("#passages");
		if (text && !text.test(body)) failures.push(`${label}: expected ${text} in ${name}, got: ${body.slice(0, 300)}`);
	}
	catch {
		failures.push(`${label}: expected passage ${name}, got ${await page.getAttribute(".passage", "data-passage")}`);
	}
}

/** Text of the sidebar region. */
const sidebar = (page) => page.textContent("#sidebar");

/** Start a new game from the Start screen. */
async function begin(page, name) {
	await page.waitForSelector("#pc-name");
	await page.fill("#pc-name", name);
	await page.selectOption("#pc-pronouns", "she/her");
	await click(page, "Begin");
}

/** Play the start of a day in the real town. */
async function playTown(page, label) {
	await begin(page, "Sam");
	await expectPassage(page, "Here", /Your Bedroom[\s\S]*Around here[\s\S]*Sleep \(1 hour\)/, `${label}: bedroom`);
	const side = await sidebar(page);
	for (const bit of ["Sam", "18 · she/her", "07:00", "£35.00", "£180.00", "Energy", "Bladder", "Saves", "Settings"]) {
		if (!side.includes(bit)) failures.push(`${label}: sidebar is missing "${bit}"`);
	}
	await click(page, "Bathroom");
	await click(page, "Go for a wee");
	await click(page, "Have a shower");
	await expectPassage(page, "Here", /Hygiene \+\d+[\s\S]*Now: Refreshed[\s\S]*Bathroom/, `${label}: shower`);
	if (!(await sidebar(page)).includes("Refreshed")) failures.push(`${label}: Refreshed effect not in sidebar`);
	await click(page, "Go somewhere else");
	await expectPassage(page, "Travel_Pick", /Leaving Your House \(1 minute to get outside\)/, `${label}: travel from a room`);
	await click(page, "Elm Road (1 minute)");
	await click(page, "Go somewhere else");
	await click(page, "Mooresville High Street (13 minutes, £1.80)");
	await expectPassage(page, "Here", /Bus \(Route 7\) to Mooresville High Street \(£1\.80\): 13 minutes[\s\S]*heart of town/, `${label}: bus`);
	if (!(await sidebar(page)).includes("£33.20")) failures.push(`${label}: fare not taken from cash`);
}

/** Play the test fixture's storyline (debug only) through the real UI. */
async function playTherapy(page) {
	const shortcut = async (label) => {
		await page.evaluate(() => window.SugarCube.Engine.play("Test_Therapy"));
		await click(page, label);
	};
	await shortcut("Go to Test Clinic, next 10:00");
	await expectPassage(page, "Ev_test_meet_therapist", /first time you've met the therapist/, "first meeting event");
	await click(page, "Continue");
	await expectPassage(page, "Here", /Test Clinic[\s\S]*People here/, "clinic open");
	await click(page, "Test Therapist");
	await expectPassage(page, "Npcs_Sheet", /Age\s*45[\s\S]*Met you\s*Yes/, "therapist sheet");
	await click(page, "Back");
	await shortcut("WON'T interrupt");
	await click(page, "Therapy session");
	await expectPassage(page, "Here", /Therapy session took 2 hours/, "full session");
	await shortcut("WILL interrupt");
	await click(page, "Therapy session");
	await expectPassage(page, "Ev_test_secretary_interrupts", /knock at the door/, "interruption event");
	await click(page, "Continue");
	await expectPassage(page, "Here", /ended early after 1 hour/, "after interruption");
	await click(page, "Go somewhere else");
	await click(page, "Test High Street (5 minutes)");
	await shortcut("Bus trips: break down at City Centre");
	await click(page, "Go somewhere else");
	await click(page, "Test Park (25 minutes, £2.00)");
	await expectPassage(page, "Ev_test_bus_breakdown", /stops for good/, "bus breakdown");
	await click(page, "Continue");
	await expectPassage(page, "Here", /stopped at Test City Centre after 15 minutes[\s\S]*placeholder city centre/, "after breakdown");
	await click(page, "Go somewhere else");
	await click(page, "Test High Street (10 minutes, £6.00)");
	await expectPassage(page, "Here", /Taxi to Test High Street \(£6\.00\): 10 minutes/, "taxi");
}

// Release mode.
{
	const { page, errors } = await openPage(base);
	if (await page.evaluate(() => "GAME" in window)) failures.push("release: window.GAME leaked");
	await playTown(page, "release");
	failures.push(...errors.map((e) => `release: ${e}`));
	await page.close();
}

// Debug mode.
{
	const { page, errors } = await openPage(`${base}?debug`);
	try {
		await page.waitForFunction(() => window.eruda && document.querySelector("#eruda"), null, { timeout: 15000 });
	}
	catch {
		failures.push("debug: Eruda console did not load");
	}
	for (const name of TEST_PASSAGES) {
		await page.evaluate((n) => window.SugarCube.Engine.play(n), name);
		await page.waitForSelector(`[data-passage="${name}"]`);
		const rows = await page.$$eval(".sys-checks li", (lis) => lis.map((li) => li.textContent.trim()));
		if (rows.length === 0) failures.push(`${name}: no check rows`);
		for (const row of rows) {
			if (!row.startsWith("PASS")) failures.push(`${name}: ${row}`);
		}
	}
	await playTherapy(page);
	failures.push(...errors.map((e) => `debug: ${e}`));
	await page.close();
}

await browser.close();

if (failures.length) {
	console.error(`Smoke test FAILED:\n  ${failures.join("\n  ")}`);
	process.exit(1);
}
console.log("Smoke test passed.");
