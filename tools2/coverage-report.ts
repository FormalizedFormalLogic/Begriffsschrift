#!/usr/bin/env bun
/**
 * Reports how well the built Begriffsschrift font covers
 * the characters listed in sample-text/all.csv.
 *
 * Usage:
 *   bun tools2/coverage-report.ts [--font <ttf-path>] [--out <csv-path>]
 *
 * Defaults:
 *   --font  dist/Begriffsschrift/TTF/Begriffsschrift-Regular.ttf
 *   --out   (none — prints report to stdout only)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as fontkit from "fontkit";

const DEFAULT_FONT = "dist/Begriffsschrift/TTF/Begriffsschrift-Regular.ttf";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
function getArg(flag: string, fallback: string): string {
	const i = args.indexOf(flag);
	return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const fontPath = getArg("--font", DEFAULT_FONT);
const outPath = getArg("--out", "");

// ---------------------------------------------------------------------------
// Load font
// ---------------------------------------------------------------------------

if (!fs.existsSync(fontPath)) {
	console.error(
		`Font not found: ${fontPath}\n` +
			`Build it first with:\n  npm run build -- ttf-unhinted::Begriffsschrift --jCmd=1`,
	);
	process.exit(1);
}

const font = fontkit.openSync(fontPath) as fontkit.Font;
console.log(`Font: ${font.familyName} ${font.subfamilyName} (${path.basename(fontPath)})`);

// ---------------------------------------------------------------------------
// Parse CSV
// ---------------------------------------------------------------------------

interface Row {
	char: string;
	codepoint: number;
	name: string;
	count: number;
}

const csvPath = "sample-text/all.csv";
const csvText = await Bun.file(csvPath).text();
const rows: Row[] = [];

for (const line of csvText.split("\n").slice(1)) {
	if (!line.trim()) continue;
	// Format: char,U+XXXX,NAME,count
	// The char field may itself contain commas; split from the right
	const lastComma = line.lastIndexOf(",");
	const count = Number(line.slice(lastComma + 1));
	const rest = line.slice(0, lastComma);

	const secondLastComma = rest.lastIndexOf(",");
	const name = rest.slice(secondLastComma + 1);
	const rest2 = rest.slice(0, secondLastComma);

	// rest2 = "char,U+XXXX"
	const cpIdx = rest2.lastIndexOf(",");
	const cpStr = rest2.slice(cpIdx + 1); // "U+XXXX"
	const codepoint = Number.parseInt(cpStr.slice(2), 16);

	rows.push({ char: String.fromCodePoint(codepoint), codepoint, name, count });
}

// ---------------------------------------------------------------------------
// Check coverage
// ---------------------------------------------------------------------------

interface Result extends Row {
	supported: boolean;
}

const results: Result[] = rows.map(row => ({
	...row,
	supported: font.hasGlyphForCodePoint(row.codepoint),
}));

const supported = results.filter(r => r.supported);
const unsupported = results.filter(r => !r.supported);

const totalChars = results.length;
const totalCount = results.reduce((s, r) => s + r.count, 0);
const supportedCount = supported.reduce((s, r) => s + r.count, 0);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const pct = (n: number, d: number) =>
	d === 0 ? "N/A" : `${((n / d) * 100).toFixed(1)}%`;

console.log("");
console.log("=== Coverage Report ===");
console.log(
	`Codepoints : ${supported.length} / ${totalChars} supported (${pct(supported.length, totalChars)})`,
);
console.log(
	`By usage   : ${supportedCount.toLocaleString()} / ${totalCount.toLocaleString()} occurrences (${pct(supportedCount, totalCount)})`,
);
console.log("");

// Unsupported characters sorted by frequency desc
const unsupportedSorted = [...unsupported].sort((a, b) => b.count - a.count);

if (unsupportedSorted.length === 0) {
	console.log("All characters are supported!");
} else {
	console.log(`--- Unsupported characters (${unsupportedSorted.length}, sorted by usage) ---`);
	console.log("Codepoint  | Count     | Name");
	console.log("-----------|-----------|--------------------------------------------------");
	for (const r of unsupportedSorted) {
		const cp = `U+${r.codepoint.toString(16).toUpperCase().padStart(4, "0")}`;
		const countStr = r.count.toLocaleString().padStart(9);
		console.log(`${cp.padEnd(11)}| ${countStr} | ${r.name}`);
	}
}

// ---------------------------------------------------------------------------
// Optional CSV output
// ---------------------------------------------------------------------------

if (outPath) {
	const header = "codepoint,name,count,supported";
	const lines = results.map(r => {
		const cp = `U+${r.codepoint.toString(16).toUpperCase().padStart(4, "0")}`;
		return `${cp},${r.name},${r.count},${r.supported}`;
	});
	await Bun.write(outPath, [header, ...lines].join("\n") + "\n");
	console.log(`\nDetailed results written to ${outPath}`);
}
