#!/usr/bin/env node

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import kleur from "kleur";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const results_path = join(__dirname, "..", "benchmark-results.json");
const data = JSON.parse(readFileSync(results_path, "utf8"));

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

	bright_red: (text) => `\x1b[91m${text}\x1b[0m`,
	bright_green: (text) => `\x1b[92m${text}\x1b[0m`,
	bright_yellow: (text) => `\x1b[93m${text}\x1b[0m`,
	bright_blue: (text) => `\x1b[94m${text}\x1b[0m`,
	bright_magenta: (text) => `\x1b[95m${text}\x1b[0m`,
	bright_cyan: (text) => `\x1b[96m${text}\x1b[0m`,

	bold: (text) => `\x1b[1m${text}\x1b[0m`,
	underline: (text) => `\x1b[4m${text}\x1b[0m`,
};

// Helper to pad strings that contain ANSI codes
function pad_right(str, width) {
	// Remove ANSI codes to get visible length
	const visible = str.replace(/\x1b\[[0-9;]*m/g, "");
	const padding = Math.max(0, width - visible.length);
	return str + " ".repeat(padding);
}

function pad_left(str, width) {
	// Remove ANSI codes to get visible length
	const visible = str.replace(/\x1b\[[0-9;]*m/g, "");
	const padding = Math.max(0, width - visible.length);
	return " ".repeat(padding) + str;
}

function format_number(num, decimals = 2) {
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

function format_time(ms) {
	if (ms === undefined || ms === null) {
		return color.gray("N/A");
	}

	let formatted;
	if (ms < 0.001) {
		formatted = (ms * 1_000_000).toFixed(2) + "ns";
		return color.bright_green(formatted);
	} else if (ms < 0.01) {
		formatted = (ms * 1_000).toFixed(2) + "μs";
		return color.green(formatted);
	} else if (ms < 1) {
		formatted = (ms * 1_000).toFixed(2) + "μs";
		return color.yellow(formatted);
	} else if (ms < 10) {
		formatted = ms.toFixed(2) + "ms";
		return color.bright_yellow(formatted);
	} else {
		formatted = ms.toFixed(2) + "ms";
		return color.red(formatted);
	}
}

function format_speedup(speedup) {
	if (!speedup) return color.gray("N/A");

	const formatted = speedup.toFixed(1) + "x";
	if (speedup >= 100) {
		return color.bold(color.bright_magenta(formatted));
	} else if (speedup >= 10) {
		return color.bold(color.bright_green(formatted));
	} else if (speedup >= 2) {
		return color.bold(color.green(formatted));
	}
	return color.bold(color.yellow(formatted));
}

const size_map = {
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

const all_benchmarks = [];
const twinkleplop_stats = [];

for (const file of data.files) {
	console.log(file.fullName);
	for (const group of file.groups) {
		const test_name = group.fullName.split(" > ").pop();
		// Skip internal benchmarks
		if (test_name.includes("compare tokenize to code gen")) {
			continue;
		}
		const size_info = size_map[test_name];

		for (const benchmark of group.benchmarks) {
			all_benchmarks.push({
				...benchmark,
				test_name,
				size_info,
				group_name: group.fullName.split(" > ").slice(1, -1).join(" > "),
			});

			if (benchmark.name === "Twinkleplop" && size_info) {
				const time_per_char = (benchmark.mean * 1000) / size_info.chars;
				const chars_per_second = 1000 / time_per_char;

				twinkleplop_stats.push({
					test_name,
					lines: size_info.lines,
					chars: size_info.chars,
					ops_per_sec: benchmark.hz,
					mean_time: benchmark.mean,
					time_per_char,
					chars_per_second,
					time_per_line: (benchmark.mean * 1000) / size_info.lines,
				});
			}
		}
	}
}

// console.log("\n" + color.bright_blue("─".repeat(120)));
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

all_benchmarks.sort((a, b) => {
	if (a.test_name !== b.test_name) {
		return a.test_name.localeCompare(b.test_name);
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

let last_test_name = "";
for (const bench of all_benchmarks) {
	if (bench.test_name !== last_test_name) {
		if (last_test_name)
			console.log(
				TABLE_CHARS.RIGHT + TABLE_CHARS.HORIZONTAL.repeat(78) + TABLE_CHARS.LEFT
			);
		console.log(
			TABLE_CHARS.VERTICAL +
				"    " +
				kleur.bold(bench.test_name.padEnd(74)) +
				TABLE_CHARS.VERTICAL
		);
		last_test_name = bench.test_name;
	}

	// Rank with medals
	let rank_display;
	if (bench.rank === 1) {
		rank_display = "🥇 1";
	} else if (bench.rank === 2) {
		rank_display = "🥈 2";
	} else if (bench.rank === 3) {
		rank_display = "🥉 3";
	} else {
		rank_display = "   " + bench.rank;
	}

	// Highlight Twinkleplop
	const is_tp = bench.name === "Twinkleplop";
	const library_name = bench.name;

	// Build the row with proper alignment
	const hz = format_number(bench.hz, 0).trim();
	const mean = format_time(bench.mean);
	const rme = format_time(bench.rme);
	const row = [
		TABLE_CHARS.VERTICAL + " " + bench.rank + "  ",
		is_tp
			? pad_right(kleur.bold(kleur.green(library_name)), 30)
			: pad_right(library_name, 30),
		pad_right(pad_left(hz, 6 - hz.length * -1), 10),
		pad_right(pad_left(mean, 0 - mean.length * -1), 17),
		pad_right(pad_left(rme, -4 - rme.length * -1), 17),
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

twinkleplop_stats.sort((a, b) => a.chars - b.chars);

// Table with box drawing
console.log(
	TABLE_CHARS.LEFT_TOP +
		TABLE_CHARS.HORIZONTAL.repeat(62) +
		TABLE_CHARS.RIGHT_TOP
);

console.log(
	TABLE_CHARS.VERTICAL +
		" " +
		pad_right("File Size", 18) +
		pad_right("Lines", 8) +
		pad_right("Chars", 10) +
		pad_right("Time/Char", 14) +
		pad_right("Chars/sec", 10) +
		" " +
		TABLE_CHARS.VERTICAL
);

console.log(
	TABLE_CHARS.RIGHT + TABLE_CHARS.HORIZONTAL.repeat(62) + TABLE_CHARS.LEFT
);

for (const stat of twinkleplop_stats) {
	const row = [
		TABLE_CHARS.VERTICAL + " ",
		pad_right(stat.test_name.replace(/CSS File \(.*\)/, "").trim(), 18),
		pad_right(stat.lines.toString(), 8),
		pad_right(stat.chars.toLocaleString(), 10),

		pad_right(format_time(stat.time_per_char / 1000), 14),
		pad_right(format_number(stat.chars_per_second * 1000, 0), 10),
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

const css_stats = twinkleplop_stats.filter((s) => s.test_name.includes("CSS"));
const html_stats = twinkleplop_stats.filter((s) => s.test_name.includes("HTML"));
const js_stats = twinkleplop_stats.filter((s) =>
	s.test_name.includes("JavaScript")
);

function analyze_scaling(stats, language, icon) {
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
			pad_right("Metric", 24) +
			pad_right("sm → md", 12) +
			pad_right("md → lg", 12) +
			pad_right("lg → xl", 12) +
			pad_right("sm → xl", 10) +
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
		const char_ratio = medium.chars / small.chars;
		const time_ratio = medium.mean_time / small.mean_time;
		const efficiency = char_ratio / time_ratio;

		// Character increase row
		const char_row = [
			TABLE_CHARS.VERTICAL + " ",
			pad_right("📏 Character increase", 24),
			pad_right(char_ratio.toFixed(2) + "x", 12),
			pad_right(
				large && medium ? `${(large.chars / medium.chars).toFixed(2)}x` : "N/A",
				12
			),
			pad_right(
				large && small ? `${(large.chars / small.chars).toFixed(2)}x` : "N/A",
				10
			),
			pad_right(
				large && xl ? `${(xl.chars / small.chars).toFixed(2)}x` : "N/A",
				12
			),
			" " + TABLE_CHARS.VERTICAL,
		];
		console.log(char_row.join(""));

		// Time increase row
		const time_row = [
			TABLE_CHARS.VERTICAL + " ",
			pad_right("⏱  Time increase", 24),
			pad_right(time_ratio.toFixed(2) + "x", 12),
			pad_right(
				large && medium
					? `${(large.mean_time / medium.mean_time).toFixed(2)}x`
					: "N/A",
				12
			),
			pad_right(
				large && small
					? `${(large.mean_time / small.mean_time).toFixed(2)}x`
					: "N/A",
				10
			),
			pad_right(
				large && xl ? `${(xl.mean_time / small.mean_time).toFixed(2)}x` : "N/A",
				12
			),
			" " + TABLE_CHARS.VERTICAL,
		];
		console.log(time_row.join(""));

		// Efficiency row with color coding
		const get_efficiency_color = (eff) => {
			if (eff >= 1.0) return color.bright_green;
			if (eff >= 0.9) return color.green;
			if (eff >= 0.8) return color.yellow;
			return color.red;
		};

		const eff_row = [
			TABLE_CHARS.VERTICAL + " ",
			pad_right("⚖  Scaling efficiency", 24),
			pad_right(get_efficiency_color(efficiency)(efficiency.toFixed(2)), 12),
			pad_right(
				large && medium
					? get_efficiency_color(
							large.chars / medium.chars / (large.mean_time / medium.mean_time)
						)(
							`${(large.chars / medium.chars / (large.mean_time / medium.mean_time)).toFixed(2)}`
						)
					: color.gray("N/A"),
				12
			),
			pad_right(
				large && small
					? get_efficiency_color(
							large.chars / small.chars / (large.mean_time / small.mean_time)
						)(
							`${(large.chars / small.chars / (large.mean_time / small.mean_time)).toFixed(2)}`
						)
					: color.gray("N/A"),
				10
			),
			pad_right(
				large && xl
					? get_efficiency_color(
							xl.chars / small.chars / (xl.mean_time / small.mean_time)
						)(
							`${(xl.chars / small.chars / (xl.mean_time / small.mean_time)).toFixed(2)}`
						)
					: color.gray("N/A"),
				12
			),
			" " + TABLE_CHARS.VERTICAL,
		];
		console.log(eff_row.join(""));

		// Close the table
		console.log(
			TABLE_CHARS.LEFT_BOTTOM +
				TABLE_CHARS.HORIZONTAL.repeat(72) +
				TABLE_CHARS.RIGHT_BOTTOM
		);
	}
}

analyze_scaling(css_stats, "CSS", "🎨");
analyze_scaling(html_stats, "HTML", "🌐");
analyze_scaling(js_stats, "JavaScript", "📜");

console.log(
	"\n" + color.bold(color.cyan("🏆 RELATIVE PERFORMANCE VS COMPETITORS"))
);

const competitors = {};
for (const bench of all_benchmarks) {
	if (!competitors[bench.test_name]) {
		competitors[bench.test_name] = {};
	}
	competitors[bench.test_name][bench.name] = bench.hz;
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
		pad_right("Test", 22) +
		pad_right("vs hljs", 14) +
		pad_right("vs Prism", 14) +
		pad_right("vs Shiki", 14) +
		pad_right("vs Starry Night", 16) +
		" " +
		TABLE_CHARS.VERTICAL
);

console.log(
	TABLE_CHARS.RIGHT + TABLE_CHARS.HORIZONTAL.repeat(82) + TABLE_CHARS.LEFT
);

for (const [test_name, libs] of Object.entries(competitors)) {
	if (libs.Twinkleplop) {
		const twinkleplop_ops = libs.Twinkleplop;
		const speedups = {
			"Highlight.js": libs["highlight.js"]
				? twinkleplop_ops / libs["highlight.js"]
				: null,
			Prism: libs["Prism"] ? twinkleplop_ops / libs["Prism"] : null,
			Shiki: libs["Shiki"] ? twinkleplop_ops / libs["Shiki"] : null,
			"Starry Night": libs["starry-night"]
				? twinkleplop_ops / libs["starry-night"]
				: null,
		};

		const row = [
			TABLE_CHARS.VERTICAL + " ",
			pad_right(test_name.replace(/\(.*\)/, "").trim(), 22),
			pad_right(
				speedups["Highlight.js"]
					? format_speedup(speedups["Highlight.js"])
					: color.gray("N/A"),
				14
			),
			pad_right(
				speedups["Prism"]
					? format_speedup(speedups["Prism"])
					: color.gray("N/A"),
				14
			),
			pad_right(
				speedups["Shiki"]
					? format_speedup(speedups["Shiki"])
					: color.gray("N/A"),
				14
			),
			pad_right(
				speedups["Starry Night"]
					? format_speedup(speedups["Starry Night"])
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
// console.log("\n" + color.bright_cyan("═".repeat(120)));
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
// 		color.bright_green("■") +
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

// console.log("\n" + color.bright_cyan("═".repeat(120)) + "\n");
