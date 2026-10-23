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

/** Play the test therapy storyline through the real UI. */
async function playTherapy(page) {
	await page.evaluate(() => window.SugarCube.Engine.play("Start"));
	await click(page, "Start the test storyline");
	await expectPassage(page, "Here", /07:00 · Test Home/, "therapy start");
	await click(page, "Go somewhere else");
	await expectPassage(page, "Travel_Pick", /Walk to Test Clinic \(15 minutes\)/, "travel list");
	await click(page, "Walk to Test Clinic");
	await expectPassage(page, "Here", /07:15 · Test Clinic[\s\S]*Walk to Test Clinic: 15 minutes[\s\S]*closed right now/, "arrive closed");
	await page.evaluate(() => window.SugarCube.Engine.play("Test_Therapy"));
	await click(page, "Go to Test Clinic, next 10:00");
	await expectPassage(page, "Here", /10:00 · Test Clinic[\s\S]*People here/, "clinic open");
	await click(page, "Test Therapist");
	await expectPassage(page, "Npcs_Sheet", /Age\s*45/, "therapist sheet");
	await click(page, "Back");
	await page.evaluate(() => window.SugarCube.Engine.play("Test_Therapy"));
	await click(page, "WON'T interrupt");
	await click(page, "Therapy session");
	await expectPassage(page, "Here", /12:00 · Test Clinic[\s\S]*Therapy session took 2 hours/, "full session");
	await page.evaluate(() => window.SugarCube.Engine.play("Test_Therapy"));
	await click(page, "WILL interrupt");
	await click(page, "Therapy session");
	await expectPassage(page, "Ev_test_secretary_interrupts", /knock at the door/, "interruption event");
	await click(page, "Continue");
	await expectPassage(page, "Here", /13:00 · Test Clinic[\s\S]*ended early after 1 hour/, "after interruption");
}

// Release mode.
{
	const { page, errors } = await openPage(base);
	const text = await page.textContent("#passages");
	if (!text.includes("placeholder")) failures.push("release: Start passage did not render");
	if (await page.evaluate(() => "GAME" in window)) failures.push("release: window.GAME leaked");
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
