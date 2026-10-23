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
	// In pyjamas you can't go out.
	await click(page, "Go somewhere else");
	await expectPassage(page, "Travel_Pick", /You need to get dressed/, `${label}: not dressed`);
	await click(page, "Stay here");
	await click(page, "Your Bedroom");
	await click(page, "Get changed");
	await expectPassage(page, "Clothing_Wardrobe", /not dressed to go out[\s\S]*In your wardrobe/, `${label}: wardrobe`);
	for (const item of ["Black T-shirt", "Blue jeans", "Pair of socks", "White trainers"]) {
		await page.locator("#passages li", { hasText: item }).locator("button", { hasText: "Wear" }).first().click();
		await page.waitForSelector('[data-passage="Here"], [data-passage="Clothing_Wardrobe"]');
		await page.evaluate(() => window.SugarCube.Engine.play("Clothing_Wardrobe"));
	}
	await expectPassage(page, "Clothing_Wardrobe", /You're dressed to go out/, `${label}: dressed`);
	await click(page, "Back");
	// The Me page shows your body and clothes.
	await page.evaluate(() => window.SugarCube.Engine.play("Character_Me"));
	await expectPassage(page, "Character_Me", /Height\s*168 cm[\s\S]*Hair length[\s\S]*Wearing[\s\S]*black t-shirt/, `${label}: me page`);
	await click(page, "Back");
	await click(page, "Go somewhere else");
	await expectPassage(page, "Travel_Pick", /Leaving Your House \(1 minute to get outside\)/, `${label}: travel from a room`);
	await click(page, "Elm Road (1 minute)");
	// Shopping and eating from your bag.
	await click(page, "Go somewhere else");
	await click(page, "Patel's Corner Shop (3 minutes)");
	await click(page, "Browse Patel's Corner Shop");
	await page.locator("#passages li", { hasText: "Chocolate bar" }).locator("button", { hasText: "Buy" }).click();
	await expectPassage(page, "Shops_Shop", /Bought Chocolate bar for £0\.95/, `${label}: buy`);
	await click(page, "Done");
	await page.evaluate(() => window.SugarCube.Engine.play("Inventory_Bag"));
	await page.locator("#passages li", { hasText: "Chocolate bar" }).locator("button", { hasText: "Eat" }).click();
	await expectPassage(page, "Here", /Eat: Chocolate bar/, `${label}: eat`);
	await click(page, "Go somewhere else");
	await click(page, "Elm Road (3 minutes)");
	await click(page, "Go somewhere else");
	await click(page, "Mooresville High Street (13 minutes, £1.80)");
	await expectPassage(page, "Here", /Bus \(Route 7\) to Mooresville High Street \(£1\.80\): 13 minutes[\s\S]*heart of town/, `${label}: bus`);
	if (!(await sidebar(page)).includes("£32.25")) failures.push(`${label}: cash should be £32.25 after the chocolate and the fare`);
}

/** Use the Debug tools page: pick `value` in the row whose button is `button`. */
async function debugRow(page, button, value) {
	await page.evaluate(() => window.SugarCube.Engine.play("Debug_Tools"));
	await page.waitForSelector('[data-passage="Debug_Tools"]');
	const row = page.locator(".debug-row", { has: page.locator("button", { hasText: button }) }).first();
	if (value != null) await row.locator("select").selectOption(value);
	await row.locator("button", { hasText: button }).click();
}

/** Debug mode: therapy with and without the interruption, via the debug tools. */
async function playTherapy(page) {
	await page.evaluate(() => window.SugarCube.Engine.play("Debug_Tools"));
	await click(page, "Next 10:00");
	await debugRow(page, "Go", "wellbeing_therapy");
	await expectPassage(page, "Here", /Therapy Room[\s\S]*People here[\s\S]*Dr Maya Okafor/, "therapy room");
	await click(page, "Dr Maya Okafor");
	await expectPassage(page, "Npcs_Sheet", /Age\s*46[\s\S]*Met you\s*Yes/, "therapist sheet");
	await click(page, "Back");
	await debugRow(page, "Block", "therapy_interrupted");
	await click(page, "Therapy session");
	await expectPassage(page, "Here", /Therapy session took 2 hours/, "full session");
	await debugRow(page, "Force", "therapy_interrupted");
	await click(page, "Therapy session");
	await expectPassage(page, "Ev_therapy_interrupted", /knock/, "interruption event");
	await click(page, "Continue");
	await expectPassage(page, "Here", /ended early after 1 hour/, "after interruption");
	// Stats: set Bladder to 100 and the sidebar shows the effect.
	await page.evaluate(() => window.SugarCube.Engine.play("Debug_Tools"));
	const row = page.locator(".debug-row", { hasText: "Set to 100" });
	await row.locator("select").selectOption("bladder");
	await row.locator("button").click();
	await expectPassage(page, "Here", null, "after setting bladder");
	if (!(await sidebar(page)).includes("Bursting")) failures.push("debug: Bursting effect not shown after bladder set to 100");
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
