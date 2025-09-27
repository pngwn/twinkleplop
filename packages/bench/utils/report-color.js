#!/usr/bin/env node

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import kleur from "kleur";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resultsPath = join(__dirname, "..", "benchmark-results.json");
const data = JSON.parse(readFileSync(resultsPath, "utf8"));

// Simple color functions using ANSI codes
const color = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",

	dim: (text) => `\x1b[2m${text}\x1b[0m`,
	red: (text) => `\x1b[31m${text}\x1b[0m`,
	green: (text) => `\x1b[32m${text}\x1b[0m`,
	yellow: (text) => `\x1b[33m${text}\x1b[0m`,
	blue: (text) => `\x1b[34m${text}\x1b[0m`,
	magenta: (text) => `\x1b[35m${text}\x1b[0m`,
	cyan: (text) => `\x1b[36m${text}\x1b[0m`,
	white: (text) => `\x1b[37m${text}\x1b[0m`,
	gray: (text) => `\x1b[90m${text}\x1b[0m`,

	brightRed: (text) => `\x1b[91m${text}\x1b[0m`,
	brightGreen: (text) => `\x1b[92m${text}\x1b[0m`,
	brightYellow: (text) => `\x1b[93m${text}\x1b[0m`,
	brightBlue: (text) => `\x1b[94m${text}\x1b[0m`,
	brightMagenta: (text) => `\x1b[95m${text}\x1b[0m`,
	brightCyan: (text) => `\x1b[96m${text}\x1b[0m`,

	bold: (text) => `\x1b[1m${text}\x1b[0m`,
	underline: (text) => `\x1b[4m${text}\x1b[0m`,
};

// Helper to pad strings that contain ANSI codes
function padRight(str, width) {
	// Remove ANSI codes to get visible length
	const visible = str.replace(/\x1b\[[0-9;]*m/g, "");
	const padding = Math.max(0, width - visible.length);
	return str + " ".repeat(padding);
}

function padLeft(str, width) {
	// Remove ANSI codes to get visible length
	const visible = str.replace(/\x1b\[[0-9;]*m/g, "");
	const padding = Math.max(0, width - visible.length);
	return " ".repeat(padding) + str;
}

function formatNumber(num, decimals = 2) {
	if (num === undefined || num === null) {
		return color.gray("N/A");
	}
	let formatted;
	if (num >= 1_000_000) {
		formatted = (num / 1_000_000).toFixed(decimals) + "M";
	} else if (num >= 1_000) {
		formatted = (num / 1_000).toFixed(decimals) + "K";
	} else {
		formatted = num.toFixed(decimals);
	}

	if (num >= 100_000) {
		return formatted;
	} else if (num >= 10_000) {
		return formatted;
	} else if (num >= 1_000) {
		return formatted;
	}
	return formatted;
}

function formatTime(ms) {
	if (ms === undefined || ms === null) {
		return color.gray("N/A");
	}

	let formatted;
	if (ms < 0.001) {
		formatted = (ms * 1_000_000).toFixed(2) + "ns";
		return color.brightGreen(formatted);
	} else if (ms < 0.01) {
		formatted = (ms * 1_000).toFixed(2) + "μs";
		return color.green(formatted);
	} else if (ms < 1) {
		formatted = (ms * 1_000).toFixed(2) + "μs";
		return color.yellow(formatted);
	} else if (ms < 10) {
		formatted = ms.toFixed(2) + "ms";
		return color.brightYellow(formatted);
	} else {
		formatted = ms.toFixed(2) + "ms";
		return color.red(formatted);
	}
}

function formatSpeedup(speedup) {
	if (!speedup) return color.gray("N/A");

	const formatted = speedup.toFixed(1) + "x";
	if (speedup >= 100) {
		return color.bold(color.brightMagenta(formatted));
	} else if (speedup >= 10) {
		return color.bold(color.brightGreen(formatted));
	} else if (speedup >= 2) {
		return color.bold(color.green(formatted));
	}
	return color.bold(color.yellow(formatted));
}

const sizeMap = {
	"Small CSS File (~10 lines)": { lines: 10, chars: 172 },
	"Medium CSS File (~50 lines)": { lines: 50, chars: 1079 },
	"Large CSS File (~200 lines)": { lines: 200, chars: 4536 },
	"Large CSS File (~400+ lines)": { lines: 300, chars: 6500 },
	"Very Large CSS File (~2MB)": { lines: 118857, chars: 2247330 },
	"Small HTML File (~20 lines)": { lines: 20, chars: 434 },
	"Medium HTML File (~100 lines)": { lines: 100, chars: 2524 },
	"Large HTML File (~500 lines)": { lines: 500, chars: 12853 },
	"Small JavaScript (~30 lines)": { lines: 30, chars: 623 },
	"Medium JavaScript (~150 lines)": { lines: 150, chars: 3089 },
	"Large JavaScript (~500 lines)": { lines: 500, chars: 12279 },
	"compare tokenize to code gen: small": { lines: 30, chars: 623 },
	"compare tokenize to code gen: medium": { lines: 150, chars: 3089 },
	"compare tokenize to code gen: large": { lines: 500, chars: 12279 },
};

const allBenchmarks = [];
const twinkleplopStats = [];

for (const file of data.files) {
	console.log(file.fullName);
	for (const group of file.groups) {
		const testName = group.fullName.split(" > ").pop();
		// Skip internal benchmarks
		if (testName.includes("compare tokenize to code gen")) {
			continue;
		}
		const sizeInfo = sizeMap[testName];

		for (const benchmark of group.benchmarks) {
			allBenchmarks.push({
				...benchmark,
				testName,
				sizeInfo,
				groupName: group.fullName.split(" > ").slice(1, -1).join(" > "),
			});

			if (benchmark.name === "Twinkleplop" && sizeInfo) {
				const timePerChar = (benchmark.mean * 1000) / sizeInfo.chars;
				const charsPerSecond = 1000 / timePerChar;

				twinkleplopStats.push({
					testName,
					lines: sizeInfo.lines,
					chars: sizeInfo.chars,
					opsPerSec: benchmark.hz,
					meanTime: benchmark.mean,
					timePerChar,
					charsPerSecond,
					timePerLine: (benchmark.mean * 1000) / sizeInfo.lines,
				});
			}
		}
	}
}

// console.log("\n" + color.brightBlue("─".repeat(120)));
console.log(
	color.bold(color.cyan("📊 STANDARD BENCHMARK RESULTS")) +
		color.dim(" (Ranked by Performance)")
);

const TABLE_CHARS = {
	LEFT_TOP: "┌",
	RIGHT_TOP: "┐",
	LEFT_BOTTOM: "└",
	RIGHT_BOTTOM: "┘",
	LEFT: "┤",
	RIGHT: "├",
	TOP: "┴",
	BOTTOM: "┬",
	VERTICAL: "│",
	HORIZONTAL: "─",
};

allBenchmarks.sort((a, b) => {
	if (a.testName !== b.testName) {
		return a.testName.localeCompare(b.testName);
	}
	return a.rank - b.rank;
});

console.log(
	TABLE_CHARS.LEFT_TOP +
		TABLE_CHARS.HORIZONTAL.repeat(78) +
		TABLE_CHARS.RIGHT_TOP
);
// Compact header
console.log(
	TABLE_CHARS.VERTICAL +
		"    " +
		color.dim(
			kleur.bold("Library".padEnd(30)) +
				kleur.bold("Ops/sec".padStart(12)) +
				kleur.bold("Mean".padStart(11)) +
				kleur.bold("RME %".padStart(15).padEnd(21))
		) +
		TABLE_CHARS.VERTICAL
);
console.log(
	color.gray(
		TABLE_CHARS.RIGHT + TABLE_CHARS.HORIZONTAL.repeat(78) + TABLE_CHARS.LEFT
	)
);

let lastTestName = "";
for (const bench of allBenchmarks) {
	if (bench.testName !== lastTestName) {
		if (lastTestName)
			console.log(
				TABLE_CHARS.RIGHT + TABLE_CHARS.HORIZONTAL.repeat(78) + TABLE_CHARS.LEFT
			);
		console.log(
			TABLE_CHARS.VERTICAL +
				"    " +
				kleur.bold(bench.testName.padEnd(74)) +
				TABLE_CHARS.VERTICAL
		);
		lastTestName = bench.testName;
	}

	// Rank with medals
	let rankDisplay;
	if (bench.rank === 1) {
		rankDisplay = "🥇 1";
	} else if (bench.rank === 2) {
		rankDisplay = "🥈 2";
	} else if (bench.rank === 3) {
		rankDisplay = "🥉 3";
	} else {
		rankDisplay = "   " + bench.rank;
	}

	// Highlight Twinkleplop
	const isTP = bench.name === "Twinkleplop";
	const libraryName = bench.name;

	// Build the row with proper alignment
	const hz = formatNumber(bench.hz, 0).trim();
	const mean = formatTime(bench.mean);
	const rme = formatTime(bench.rme);
	const row = [
		TABLE_CHARS.VERTICAL + " " + bench.rank + "  ",
		isTP
			? padRight(kleur.bold(kleur.green(libraryName)), 30)
			: padRight(libraryName, 30),
		padRight(padLeft(hz, 6 - hz.length * -1), 10),
		padRight(padLeft(mean, 0 - mean.length * -1), 17),
		padRight(padLeft(rme, -4 - rme.length * -1), 17),
		TABLE_CHARS.VERTICAL,
	];
	console.log(row.join(""));
}
console.log(
	TABLE_CHARS.LEFT_BOTTOM +
		TABLE_CHARS.HORIZONTAL.repeat(78) +
		TABLE_CHARS.RIGHT_BOTTOM
);

console.log(
	"\n" + color.bold(color.cyan("⚡ TWINKLEPLOP PERFORMANCE ANALYSIS"))
);

twinkleplopStats.sort((a, b) => a.chars - b.chars);

// Table with box drawing
console.log(
	TABLE_CHARS.LEFT_TOP +
		TABLE_CHARS.HORIZONTAL.repeat(62) +
		TABLE_CHARS.RIGHT_TOP
);

console.log(
	TABLE_CHARS.VERTICAL +
		" " +
		padRight("File Size", 18) +
		padRight("Lines", 8) +
		padRight("Chars", 10) +
		padRight("Time/Char", 14) +
		padRight("Chars/sec", 10) +
		" " +
		TABLE_CHARS.VERTICAL
);

console.log(
	TABLE_CHARS.RIGHT + TABLE_CHARS.HORIZONTAL.repeat(62) + TABLE_CHARS.LEFT
);

for (const stat of twinkleplopStats) {
	const row = [
		TABLE_CHARS.VERTICAL + " ",
		padRight(stat.testName.replace(/CSS File \(.*\)/, "").trim(), 18),
		padRight(stat.lines.toString(), 8),
		padRight(stat.chars.toLocaleString(), 10),

		padRight(formatTime(stat.timePerChar / 1000), 14),
		padRight(formatNumber(stat.charsPerSecond * 1000, 0), 10),
		" " + TABLE_CHARS.VERTICAL,
	];
	console.log(row.join(""));
}

console.log(
	TABLE_CHARS.LEFT_BOTTOM +
		TABLE_CHARS.HORIZONTAL.repeat(62) +
		TABLE_CHARS.RIGHT_BOTTOM
);

console.log("\n" + color.bold(color.cyan("📈 PERFORMANCE SCALING ANALYSIS")));

const cssStats = twinkleplopStats.filter((s) => s.testName.includes("CSS"));
const htmlStats = twinkleplopStats.filter((s) => s.testName.includes("HTML"));
const jsStats = twinkleplopStats.filter((s) =>
	s.testName.includes("JavaScript")
);

function analyzeScaling(stats, language, icon) {
	if (stats.length < 2) return;

	// console.log(color.bold(language));

	// Table with box drawing
	console.log(
		TABLE_CHARS.LEFT_TOP +
			TABLE_CHARS.HORIZONTAL.repeat(72) +
			TABLE_CHARS.RIGHT_TOP
	);

	console.log(
		TABLE_CHARS.VERTICAL +
			" " +
			padRight("Metric", 24) +
			padRight("sm → md", 12) +
			padRight("md → lg", 12) +
			padRight("lg → xl", 12) +
			padRight("sm → xl", 10) +
			" " +
			TABLE_CHARS.VERTICAL
	);

	console.log(
		TABLE_CHARS.RIGHT + TABLE_CHARS.HORIZONTAL.repeat(72) + TABLE_CHARS.LEFT
	);

	// console.log(stats);

	const small = stats[0];
	const medium = stats[1];
	const large = stats[2];
	const xl = stats[3];

	if (small && medium) {
		const charRatio = medium.chars / small.chars;
		const timeRatio = medium.meanTime / small.meanTime;
		const efficiency = charRatio / timeRatio;

		// Character increase row
		const charRow = [
			TABLE_CHARS.VERTICAL + " ",
			padRight("📏 Character increase", 24),
			padRight(charRatio.toFixed(2) + "x", 12),
			padRight(
				large && medium ? `${(large.chars / medium.chars).toFixed(2)}x` : "N/A",
				12
			),
			padRight(
				large && small ? `${(large.chars / small.chars).toFixed(2)}x` : "N/A",
				10
			),
			padRight(
				large && xl ? `${(xl.chars / small.chars).toFixed(2)}x` : "N/A",
				12
			),
			" " + TABLE_CHARS.VERTICAL,
		];
		console.log(charRow.join(""));

		// Time increase row
		const timeRow = [
			TABLE_CHARS.VERTICAL + " ",
			padRight("⏱  Time increase", 24),
			padRight(timeRatio.toFixed(2) + "x", 12),
			padRight(
				large && medium
					? `${(large.meanTime / medium.meanTime).toFixed(2)}x`
					: "N/A",
				12
			),
			padRight(
				large && small
					? `${(large.meanTime / small.meanTime).toFixed(2)}x`
					: "N/A",
				10
			),
			padRight(
				large && xl ? `${(xl.meanTime / small.meanTime).toFixed(2)}x` : "N/A",
				12
			),
			" " + TABLE_CHARS.VERTICAL,
		];
		console.log(timeRow.join(""));

		// Efficiency row with color coding
		const getEfficiencyColor = (eff) => {
			if (eff >= 1.0) return color.brightGreen;
			if (eff >= 0.9) return color.green;
			if (eff >= 0.8) return color.yellow;
			return color.red;
		};

		const effRow = [
			TABLE_CHARS.VERTICAL + " ",
			padRight("⚖  Scaling efficiency", 24),
			padRight(getEfficiencyColor(efficiency)(efficiency.toFixed(2)), 12),
			padRight(
				large && medium
					? getEfficiencyColor(
							large.chars / medium.chars / (large.meanTime / medium.meanTime)
						)(
							`${(large.chars / medium.chars / (large.meanTime / medium.meanTime)).toFixed(2)}`
						)
					: color.gray("N/A"),
				12
			),
			padRight(
				large && small
					? getEfficiencyColor(
							large.chars / small.chars / (large.meanTime / small.meanTime)
						)(
							`${(large.chars / small.chars / (large.meanTime / small.meanTime)).toFixed(2)}`
						)
					: color.gray("N/A"),
				10
			),
			padRight(
				large && xl
					? getEfficiencyColor(
							xl.chars / small.chars / (xl.meanTime / small.meanTime)
						)(
							`${(xl.chars / small.chars / (xl.meanTime / small.meanTime)).toFixed(2)}`
						)
					: color.gray("N/A"),
				12
			),
			" " + TABLE_CHARS.VERTICAL,
		];
		console.log(effRow.join(""));

		// Close the table
		console.log(
			TABLE_CHARS.LEFT_BOTTOM +
				TABLE_CHARS.HORIZONTAL.repeat(72) +
				TABLE_CHARS.RIGHT_BOTTOM
		);
	}
}

analyzeScaling(cssStats, "CSS", "🎨");
analyzeScaling(htmlStats, "HTML", "🌐");
analyzeScaling(jsStats, "JavaScript", "📜");

console.log(
	"\n" + color.bold(color.cyan("🏆 RELATIVE PERFORMANCE VS COMPETITORS"))
);

const competitors = {};
for (const bench of allBenchmarks) {
	if (!competitors[bench.testName]) {
		competitors[bench.testName] = {};
	}
	competitors[bench.testName][bench.name] = bench.hz;
}

// Table with box drawing
console.log(
	TABLE_CHARS.LEFT_TOP +
		TABLE_CHARS.HORIZONTAL.repeat(82) +
		TABLE_CHARS.RIGHT_TOP
);

console.log(
	TABLE_CHARS.VERTICAL +
		" " +
		padRight("Test", 22) +
		padRight("vs hljs", 14) +
		padRight("vs Prism", 14) +
		padRight("vs Shiki", 14) +
		padRight("vs Starry Night", 16) +
		" " +
		TABLE_CHARS.VERTICAL
);

console.log(
	TABLE_CHARS.RIGHT + TABLE_CHARS.HORIZONTAL.repeat(82) + TABLE_CHARS.LEFT
);

for (const [testName, libs] of Object.entries(competitors)) {
	if (libs.Twinkleplop) {
		const twinkleplopOps = libs.Twinkleplop;
		const speedups = {
			"Highlight.js": libs["highlight.js"]
				? twinkleplopOps / libs["highlight.js"]
				: null,
			Prism: libs["Prism"] ? twinkleplopOps / libs["Prism"] : null,
			Shiki: libs["Shiki"] ? twinkleplopOps / libs["Shiki"] : null,
			"Starry Night": libs["starry-night"]
				? twinkleplopOps / libs["starry-night"]
				: null,
		};

		const row = [
			TABLE_CHARS.VERTICAL + " ",
			padRight(testName.replace(/\(.*\)/, "").trim(), 22),
			padRight(
				speedups["Highlight.js"]
					? formatSpeedup(speedups["Highlight.js"])
					: color.gray("N/A"),
				14
			),
			padRight(
				speedups["Prism"]
					? formatSpeedup(speedups["Prism"])
					: color.gray("N/A"),
				14
			),
			padRight(
				speedups["Shiki"]
					? formatSpeedup(speedups["Shiki"])
					: color.gray("N/A"),
				14
			),
			padRight(
				speedups["Starry Night"]
					? formatSpeedup(speedups["Starry Night"])
					: color.gray("N/A"),
				16
			),
			" " + TABLE_CHARS.VERTICAL,
		];
		console.log(row.join(""));
	}
}

console.log(
	TABLE_CHARS.LEFT_BOTTOM +
		TABLE_CHARS.HORIZONTAL.repeat(82) +
		TABLE_CHARS.RIGHT_BOTTOM
);

// // Footer with legend
// console.log("\n" + color.brightCyan("═".repeat(120)));
// console.log("\n" + color.bold(color.blue("📖 Legend:")));
// console.log(color.dim("  • Ops/sec: Operations per second (higher is better)"));
// console.log(color.dim("  • Mean: Average time per operation"));
// console.log(color.dim("  • RME: Relative margin of error (lower is better)"));
// console.log(
// 	color.dim(
// 		"  • Scaling efficiency: Ratio of size increase to time increase (>1 means sub-linear scaling)"
// 	)
// );

// console.log("\n" + color.bold(color.blue("🎨 Performance Indicators:")));
// console.log(
// 	"  " +
// 		color.brightGreen("■") +
// 		" Excellent  " +
// 		color.green("■") +
// 		" Good  " +
// 		color.yellow("■") +
// 		" Average  " +
// 		color.red("■") +
// 		" Needs improvement"
// );

// console.log("\n" + color.bold(color.blue("🏅 Rankings:")));
// console.log("  🥇 1st place  🥈 2nd place  🥉 3rd place");

// console.log("\n" + color.brightCyan("═".repeat(120)) + "\n");
