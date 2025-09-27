#!/usr/bin/env node

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import chalk from "charsm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resultsPath = join(__dirname, "benchmark-results.json");
const data = JSON.parse(readFileSync(resultsPath, "utf8"));

function formatNumber(num, decimals = 2) {
	if (num === undefined || num === null) {
		return chalk.gray("N/A");
	}
	let formatted;
	if (num >= 1_000_000) {
		formatted = (num / 1_000_000).toFixed(decimals) + "M";
	} else if (num >= 1_000) {
		formatted = (num / 1_000).toFixed(decimals) + "K";
	} else {
		formatted = num.toFixed(decimals);
	}
	
	// Color based on magnitude
	if (num >= 100_000) {
		return chalk.greenBright(formatted);
	} else if (num >= 10_000) {
		return chalk.green(formatted);
	} else if (num >= 1_000) {
		return chalk.yellow(formatted);
	}
	return formatted;
}

function formatTime(ms) {
	if (ms === undefined || ms === null) {
		return chalk.gray("N/A");
	}
	
	let formatted;
	
	if (ms < 0.001) {
		formatted = (ms * 1_000_000).toFixed(2) + "ns";
		return chalk.greenBright(formatted);
	} else if (ms < 0.01) {
		formatted = (ms * 1_000).toFixed(2) + "μs";
		return chalk.green(formatted);
	} else if (ms < 1) {
		formatted = (ms * 1_000).toFixed(2) + "μs";
		return chalk.yellow(formatted);
	} else if (ms < 10) {
		formatted = ms.toFixed(2) + "ms";
		return chalk.yellowBright(formatted);
	} else {
		formatted = ms.toFixed(2) + "ms";
		return chalk.red(formatted);
	}
}

function formatSpeedup(speedup) {
	if (!speedup) return chalk.gray("N/A");
	
	const formatted = speedup.toFixed(1) + "x";
	if (speedup >= 100) {
		return chalk.magentaBright.bold(formatted);
	} else if (speedup >= 10) {
		return chalk.greenBright(formatted);
	} else if (speedup >= 2) {
		return chalk.green(formatted);
	}
	return chalk.yellow(formatted);
}

const sizeMap = {
	"Small CSS File (~10 lines)": { lines: 10, chars: 172 },
	"Medium CSS File (~50 lines)": { lines: 50, chars: 1079 },
	"Large CSS File (~200 lines)": { lines: 200, chars: 4536 },
	"Large CSS File (~300+ lines)": { lines: 300, chars: 6500 },
	"Small HTML File (~20 lines)": { lines: 20, chars: 434 },
	"Medium HTML File (~100 lines)": { lines: 100, chars: 2524 },
	"Large HTML File (~500 lines)": { lines: 500, chars: 12853 },
	"Small JavaScript (~30 lines)": { lines: 30, chars: 623 },
	"Medium JavaScript (~150 lines)": { lines: 150, chars: 3089 },
	"Large JavaScript (~500 lines)": { lines: 500, chars: 12279 },
	"compare tokenize to code gen: small": { lines: 30, chars: 623 },
	"compare tokenize to code gen: medium": { lines: 150, chars: 3089 },
	"compare tokenize to code gen: large": { lines: 500, chars: 12279 }
};

// Beautiful header with gradient effect
console.log("\n" + chalk.cyanBright("═".repeat(120)));
console.log(
	chalk.cyanBright("║") +
	" ".repeat(40) +
	chalk.blueBright.bold("✨ BENCHMARK RESULTS REPORT ✨") +
	" ".repeat(44) +
	chalk.cyanBright("║")
);
console.log(chalk.cyanBright("═".repeat(120)));

const allBenchmarks = [];
const twinkleplopStats = [];

for (const file of data.files) {
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
				groupName: group.fullName.split(" > ").slice(1, -1).join(" > ")
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
					timePerLine: (benchmark.mean * 1000) / sizeInfo.lines
				});
			}
		}
	}
}

console.log("\n" + chalk.blueBright("─".repeat(120)));
console.log(chalk.cyan.bold("📊 STANDARD BENCHMARK RESULTS") + chalk.dim(" (Ranked by Performance)"));
console.log(chalk.blueBright("─".repeat(120)));

allBenchmarks.sort((a, b) => {
	if (a.testName !== b.testName) {
		return a.testName.localeCompare(b.testName);
	}
	return a.rank - b.rank;
});

// Compact header
console.log("\n  " + chalk.dim(
	"Library".padEnd(40) +
	"Rank".padStart(5) +
	"Ops/sec".padStart(14) +
	"Mean".padStart(14) +
	"Min".padStart(14) +
	"Max".padStart(14) +
	"  RME %"
));
console.log(chalk.gray("  " + "─".repeat(116)));

let lastTestName = "";
for (const bench of allBenchmarks) {
	if (bench.testName !== lastTestName) {
		if (lastTestName) console.log("");
		console.log(
			chalk.yellowBright("▸ ") +
			chalk.bold(bench.testName) +
			(bench.sizeInfo ? chalk.dim(` (${bench.sizeInfo.chars.toLocaleString()} chars)`) : "")
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
	const libraryName = isTP 
		? chalk.magentaBright.bold("⚡ " + bench.name)
		: "   " + bench.name;
	
	// Build the row
	const row = [
		"  " + libraryName.padEnd(isTP ? 52 : 40),
		rankDisplay.padStart(5),
		formatNumber(bench.hz, 0).padStart(18),
		formatTime(bench.mean).padStart(28),
		formatTime(bench.min).padStart(18),
		formatTime(bench.max).padStart(18),
		"  " + (bench.rme < 1 ? chalk.green(bench.rme.toFixed(2)) : 
			bench.rme < 2 ? chalk.yellow(bench.rme.toFixed(2)) : 
			chalk.red(bench.rme.toFixed(2))).padStart(8)
	];
	console.log(row.join(""));
}

console.log("\n" + chalk.blueBright("─".repeat(120)));
console.log(chalk.cyan.bold("⚡ TWINKLEPLOP PERFORMANCE ANALYSIS"));
console.log(chalk.blueBright("─".repeat(120)));

twinkleplopStats.sort((a, b) => a.chars - b.chars);

console.log("\n  " + chalk.dim(
	"File Size".padEnd(28) +
	"Lines".padStart(8) +
	"Chars".padStart(10) +
	"Ops/sec".padStart(12) +
	"Mean Time".padStart(12) +
	"Time/Char".padStart(12) +
	"Chars/sec".padStart(12)
));
console.log(chalk.gray("  " + "─".repeat(100)));

for (const stat of twinkleplopStats) {
	const row = [
		"  " + chalk.white(stat.testName.replace(/\(.*\)/, "").trim()).padEnd(28),
		chalk.cyan(stat.lines.toString()).padStart(8),
		chalk.cyanBright(stat.chars.toLocaleString()).padStart(10),
		formatNumber(stat.opsPerSec, 0).padStart(12),
		formatTime(stat.meanTime).padStart(12),
		formatTime(stat.timePerChar / 1000).padStart(12),
		formatNumber(stat.charsPerSecond * 1000, 0).padStart(12)
	];
	console.log(row.join(""));
}

console.log("\n" + chalk.blueBright("─".repeat(120)));
console.log(chalk.cyan.bold("📈 PERFORMANCE SCALING ANALYSIS"));
console.log(chalk.blueBright("─".repeat(120)));

const cssStats = twinkleplopStats.filter(s => s.testName.includes("CSS"));
const htmlStats = twinkleplopStats.filter(s => s.testName.includes("HTML"));
const jsStats = twinkleplopStats.filter(s => s.testName.includes("JavaScript"));

function analyzeScaling(stats, language, icon) {
	if (stats.length < 2) return;
	
	console.log(`\n${icon} ${chalk.yellowBright.bold(language)}:`);
	console.log("  " + chalk.dim(
		"Metric".padEnd(20) +
		"Small→Medium".padStart(15) +
		"Medium→Large".padStart(15) +
		"Small→Large".padStart(15)
	));
	console.log("  " + chalk.gray("─".repeat(65)));
	
	const small = stats[0];
	const medium = stats[1];
	const large = stats[2];
	
	if (small && medium) {
		const charRatio = medium.chars / small.chars;
		const timeRatio = medium.meanTime / small.meanTime;
		const efficiency = charRatio / timeRatio;
		
		// Character increase row
		console.log(
			"  " + chalk.blue("📏 Character increase").padEnd(22) +
			chalk.cyan((charRatio.toFixed(2) + "x").padStart(15)) +
			(large && medium ? 
				chalk.cyan(`${(large.chars / medium.chars).toFixed(2)}x`.padStart(15)) : 
				chalk.gray("N/A".padStart(15))) +
			(large && small ? 
				chalk.cyan(`${(large.chars / small.chars).toFixed(2)}x`.padStart(15)) : 
				chalk.gray("N/A".padStart(15)))
		);
		
		// Time increase row
		console.log(
			"  " + chalk.yellow("⏱  Time increase").padEnd(22) +
			chalk.yellowBright((timeRatio.toFixed(2) + "x").padStart(15)) +
			(large && medium ? 
				chalk.yellowBright(`${(large.meanTime / medium.meanTime).toFixed(2)}x`.padStart(15)) : 
				chalk.gray("N/A".padStart(15))) +
			(large && small ? 
				chalk.yellowBright(`${(large.meanTime / small.meanTime).toFixed(2)}x`.padStart(15)) : 
				chalk.gray("N/A".padStart(15)))
		);
		
		// Efficiency row with color coding
		const getEfficiencyColor = (eff) => {
			if (eff >= 1.0) return chalk.greenBright;
			if (eff >= 0.9) return chalk.green;
			if (eff >= 0.8) return chalk.yellow;
			return chalk.red;
		};
		
		console.log(
			"  " + chalk.magenta("⚖  Scaling efficiency").padEnd(22) +
			getEfficiencyColor(efficiency)(efficiency.toFixed(2).padStart(15)) +
			(large && medium ? 
				getEfficiencyColor((large.chars / medium.chars) / (large.meanTime / medium.meanTime))(
					`${((large.chars / medium.chars) / (large.meanTime / medium.meanTime)).toFixed(2)}`.padStart(15)
				) : 
				chalk.gray("N/A".padStart(15))) +
			(large && small ? 
				getEfficiencyColor((large.chars / small.chars) / (large.meanTime / small.meanTime))(
					`${((large.chars / small.chars) / (large.meanTime / small.meanTime)).toFixed(2)}`.padStart(15)
				) : 
				chalk.gray("N/A".padStart(15)))
		);
	}
}

analyzeScaling(cssStats, "CSS", "🎨");
analyzeScaling(htmlStats, "HTML", "🌐");
analyzeScaling(jsStats, "JavaScript", "📜");

console.log("\n" + chalk.blueBright("─".repeat(120)));
console.log(chalk.cyan.bold("🏆 RELATIVE PERFORMANCE VS COMPETITORS"));
console.log(chalk.blueBright("─".repeat(120)));

const competitors = {};
for (const bench of allBenchmarks) {
	if (!competitors[bench.testName]) {
		competitors[bench.testName] = {};
	}
	competitors[bench.testName][bench.name] = bench.hz;
}

console.log("\n  " + chalk.dim(
	"Test".padEnd(28) +
	"vs Highlight.js".padStart(16) +
	"vs Prism".padStart(12) +
	"vs Shiki".padStart(12) +
	"vs Starry Night".padStart(16)
));
console.log(chalk.gray("  " + "─".repeat(82)));

for (const [testName, libs] of Object.entries(competitors)) {
	if (libs.Twinkleplop) {
		const twinkleplopOps = libs.Twinkleplop;
		const speedups = {
			"Highlight.js": libs["Highlight.js"] ? twinkleplopOps / libs["Highlight.js"] : null,
			"Prism": libs["Prism"] ? twinkleplopOps / libs["Prism"] : null,
			"Shiki": libs["Shiki"] ? twinkleplopOps / libs["Shiki"] : null,
			"Starry Night": libs["Starry Night"] ? twinkleplopOps / libs["Starry Night"] : null
		};
		
		const row = [
			"  " + chalk.white(testName.replace(/\(.*\)/, "").trim()).padEnd(28),
			(speedups["Highlight.js"] ? formatSpeedup(speedups["Highlight.js"]) + " faster" : chalk.gray("N/A")).padStart(16),
			(speedups["Prism"] ? formatSpeedup(speedups["Prism"]) + " faster" : chalk.gray("N/A")).padStart(12),
			(speedups["Shiki"] ? formatSpeedup(speedups["Shiki"]) + " faster" : chalk.gray("N/A")).padStart(12),
			(speedups["Starry Night"] ? formatSpeedup(speedups["Starry Night"]) + " faster" : chalk.gray("N/A")).padStart(16)
		];
		console.log(row.join(""));
	}
}

// Footer with legend
console.log("\n" + chalk.cyanBright("═".repeat(120)));
console.log("\n" + chalk.blue.bold("📖 Legend:"));
console.log(chalk.dim("  • Ops/sec: Operations per second (higher is better)"));
console.log(chalk.dim("  • Mean: Average time per operation"));
console.log(chalk.dim("  • RME: Relative margin of error (lower is better)"));
console.log(chalk.dim("  • Scaling efficiency: Ratio of size increase to time increase (>1 means sub-linear scaling)"));

console.log("\n" + chalk.blue.bold("🎨 Performance Indicators:"));
console.log(
	"  " + chalk.greenBright("■") + " Excellent  " +
	chalk.green("■") + " Good  " +
	chalk.yellow("■") + " Average  " +
	chalk.red("■") + " Needs improvement"
);

console.log("\n" + chalk.blue.bold("🏅 Rankings:"));
console.log("  🥇 1st place  🥈 2nd place  🥉 3rd place");

console.log("\n" + chalk.cyanBright("═".repeat(120)) + "\n");