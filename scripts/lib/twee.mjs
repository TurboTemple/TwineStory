// twee.mjs — a small Twee 3 parser and link extractor for the validator.

const HEADER = /^::\s*(.*)$/;

/**
 * Split a Twee 3 header line (without the leading `::`) into name, tags and
 * metadata. Handles backslash-escaped `[ ] { } \` in the name.
 * @param {string} raw
 * @returns {{ name: string, tags: string[], meta: string | null }}
 */
export function parseHeader(raw) {
	let name = "";
	let i = 0;
	for (; i < raw.length; i++) {
		const ch = raw[i];
		if (ch === "\\" && i + 1 < raw.length) {
			name += raw[++i];
			continue;
		}
		if (ch === "[" || ch === "{") break;
		name += ch;
	}
	let tags = [];
	let meta = null;
	let rest = raw.slice(i).trim();
	if (rest.startsWith("[")) {
		const end = rest.indexOf("]");
		tags = rest.slice(1, end === -1 ? undefined : end).split(/\s+/).filter(Boolean);
		rest = end === -1 ? "" : rest.slice(end + 1).trim();
	}
	if (rest.startsWith("{")) meta = rest;
	return { name: name.trim(), tags, meta };
}

/**
 * Parse a Twee 3 source file into passages.
 * @param {string} text
 * @param {string} file  Path used in error messages.
 * @returns {{ name: string, tags: string[], meta: string|null, text: string, file: string, line: number }[]}
 */
export function parseTwee(text, file = "<twee>") {
	const passages = [];
	const lines = text.replace(/\r\n?/g, "\n").split("\n");
	let current = null;
	const body = [];
	const flush = () => {
		if (current) {
			current.text = body.join("\n").replace(/\s+$/, "");
			passages.push(current);
		}
		body.length = 0;
	};
	lines.forEach((line, idx) => {
		const m = HEADER.exec(line);
		if (m) {
			flush();
			current = { ...parseHeader(m[1]), text: "", file, line: idx + 1 };
		}
		else if (current) {
			body.push(line);
		}
	});
	flush();
	return passages;
}

/** True if a link target is computed at runtime rather than a literal name. */
function isDynamic(target) {
	return /^[$_]/.test(target) || /\bsetup\.|\(|`/.test(target);
}

/**
 * Find literal passage references in passage markup: `[[…]]` links and the
 * string-literal forms of <<goto>>, <<include>>, <<link>>/<<button>> targets.
 * Runtime-computed targets are skipped.
 * @param {string} text
 * @returns {string[]}
 */
export function findPassageRefs(text) {
	const refs = [];
	const linkRe = /\[\[(.+?)\]\]/g;
	let m;
	while ((m = linkRe.exec(text))) {
		let inner = m[1];
		// Drop a trailing setter: [[Text|Target][$x to 1]]
		inner = inner.replace(/\]\[.*$/, "");
		let target;
		if (inner.includes("|")) target = inner.slice(inner.lastIndexOf("|") + 1);
		else if (inner.includes("->")) target = inner.slice(inner.lastIndexOf("->") + 2);
		else if (inner.includes("<-")) target = inner.slice(0, inner.indexOf("<-"));
		else target = inner;
		target = target.trim();
		if (target && !isDynamic(target)) refs.push(target);
	}
	const macroRe = /<<(goto|include)\s+(["'])(.+?)\2/g;
	while ((m = macroRe.exec(text))) refs.push(m[3]);
	const linkMacroRe = /<<(link|button)\s+(["'])(?:.+?)\2\s+(["'])(.+?)\3/g;
	while ((m = linkMacroRe.exec(text))) refs.push(m[4]);
	return refs;
}
