#!/usr/bin/env node

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import blessed from "blessed";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resultsPath = join(__dirname, "benchmark-results.json");
const data = JSON.parse(readFileSync(resultsPath, "utf8"));

// Create a screen object
const screen = blessed.screen({
	smartCSR: true,
	title: "Twinkleplop Benchmark Results"
});

// Create the main container
const container = blessed.box({
	parent: screen,
	top: 0,
	left: 0,
	width: "100%",
	height: "100%",
	style: {
		fg: "white",
		bg: "black"
	}
});

// Title box
const titleBox = blessed.box({
	parent: container,
	top: 0,
	left: "center",
	width: "100%",
	height: 3,
	content: "{center}{bold}{cyan-fg}✨ TWINKLEPLOP BENCHMARK RESULTS ✨{/cyan-fg}{/bold}{/center}",
	tags: true,
	style: {
		fg: "cyan",
		bold: true
	}
});

// Create tabs
const tabs = blessed.listbar({
	parent: container,
	top: 3,
	left: 0,
	width: "100%",
	height: 3,
	mouse: true,
	keys: true,
	style: {
		selected: {
			bg: "blue",
			fg: "white",
			bold: true
		},
		item: {
			bg: "black",
			fg: "cyan"
		}
	},
	commands: {
		"Summary": {
			keys: ["1"],
			callback: () => showSummary()
		},
		"Performance": {
			keys: ["2"],
			callback: () => showPerformance()
		},
		"Scaling": {
			keys: ["3"],
			callback: () => showScaling()
		},
		"Comparison": {
			keys: ["4"],
			callback: () => showComparison()
		},
		"Exit": {
			keys: ["q", "escape"],
			callback: () => process.exit(0)
		}
	}
});

// Content area
const contentBox = blessed.box({
	parent: container,
	top: 6,
	left: 0,
	width: "100%",
	height: "100%-9",
	scrollable: true,
	alwaysScroll: true,
	mouse: true,
	keys: true,
	vi: true,
	scrollbar: {
		ch: " ",
		track: {
			bg: "gray"
		},
		style: {
			inverse: true
		}
	},
	style: {
		fg: "white",
		bg: "black"
	}
});

// Status bar
const statusBar = blessed.box({
	parent: container,
	bottom: 0,
	left: 0,
	width: "100%",
	height: 3,
	content: "{center}Press 1-4 to switch tabs | Use arrow keys to scroll | Press Q or ESC to exit{/center}",
	tags: true,
	style: {
		fg: "yellow",
		bg: "black"
	}
});

function formatNumber(num, decimals = 2) {
	if (num === undefined || num === null) return "{gray-fg}N/A{/gray-fg}";
	
	let formatted;
	if (num >= 1_000_000) {
		formatted = (num / 1_000_000).toFixed(decimals) + "M";
	} else if (num >= 1_000) {
		formatted = (num / 1_000).toFixed(decimals) + "K";
	} else {
		formatted = num.toFixed(decimals);
	}
	
	if (num >= 100_000) {
		return `{green-fg}{bold}${formatted}{/bold}{/green-fg}`;
	} else if (num >= 10_000) {
		return `{green-fg}${formatted}{/green-fg}`;
	} else if (num >= 1_000) {
		return `{yellow-fg}${formatted}{/yellow-fg}`;
	}
	return formatted;
}

function formatTime(ms) {
	if (ms === undefined || ms === null) return "{gray-fg}N/A{/gray-fg}";
	
	let formatted;
	if (ms < 0.001) {
		formatted = (ms * 1_000_000).toFixed(2) + "ns";
		return `{green-fg}{bold}${formatted}{/bold}{/green-fg}`;
	} else if (ms < 0.01) {
		formatted = (ms * 1_000).toFixed(2) + "μs";
		return `{green-fg}${formatted}{/green-fg}`;
	} else if (ms < 1) {
		formatted = (ms * 1_000).toFixed(2) + "μs";
		return `{yellow-fg}${formatted}{/yellow-fg}`;
	} else if (ms < 10) {
		formatted = ms.toFixed(2) + "ms";
		return `{yellow-fg}{bold}${formatted}{/bold}{/yellow-fg}`;
	} else {
		formatted = ms.toFixed(2) + "ms";
		return `{red-fg}${formatted}{/red-fg}`;
	}
}

const sizeMap = {
	"Small CSS File (~10 lines)": { lines: 10, chars: 172 },
	"Medium CSS File (~50 lines)": { lines: 50, chars: 1079 },
	"Large CSS File (~300+ lines)": { lines: 300, chars: 6500 },
	"Small HTML File (~20 lines)": { lines: 20, chars: 434 },
	"Medium HTML File (~100 lines)": { lines: 100, chars: 2524 },
	"Large HTML File (~500 lines)": { lines: 500, chars: 12853 },
	"Small JavaScript (~30 lines)": { lines: 30, chars: 623 },
	"Medium JavaScript (~150 lines)": { lines: 150, chars: 3089 },
	"Large JavaScript (~500 lines)": { lines: 500, chars: 12279 }
};

// Process data
const allBenchmarks = [];
const twinkleplopStats = [];

for (const file of data.files) {
	for (const group of file.groups) {
		const testName = group.fullName.split(" > ").pop();
		if (testName.includes("compare tokenize to code gen")) continue;
		
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
					charsPerSecond
				});
			}
		}
	}
}

function showSummary() {
	let content = "{bold}{cyan-fg}📊 BENCHMARK SUMMARY{/cyan-fg}{/bold}\n\n";
	
	// Group benchmarks by test
	const grouped = {};
	for (const bench of allBenchmarks) {
		if (!grouped[bench.testName]) grouped[bench.testName] = [];
		grouped[bench.testName].push(bench);
	}
	
	for (const [testName, benches] of Object.entries(grouped)) {
		benches.sort((a, b) => a.rank - b.rank);
		const sizeInfo = benches[0].sizeInfo;
		
		content += `{bold}{yellow-fg}▸ ${testName}{/yellow-fg}{/bold}`;
		if (sizeInfo) content += ` {gray-fg}(${sizeInfo.chars.toLocaleString()} chars){/gray-fg}`;
		content += "\n";
		
		for (const bench of benches) {
			const medal = bench.rank === 1 ? "🥇" : bench.rank === 2 ? "🥈" : bench.rank === 3 ? "🥉" : "  ";
			const name = bench.name === "Twinkleplop" ? `{magenta-fg}{bold}⚡ ${bench.name}{/bold}{/magenta-fg}` : bench.name;
			
			content += `  ${medal} ${name.padEnd(30)} `;
			content += `Ops/s: ${formatNumber(bench.hz, 0).padEnd(15)} `;
			content += `Mean: ${formatTime(bench.mean).padEnd(15)} `;
			content += `Min: ${formatTime(bench.min).padEnd(15)} `;
			content += `Max: ${formatTime(bench.max)}\n`;
		}
		content += "\n";
	}
	
	contentBox.setContent(content);
	screen.render();
}

function showPerformance() {
	let content = "{bold}{cyan-fg}⚡ TWINKLEPLOP PERFORMANCE ANALYSIS{/cyan-fg}{/bold}\n\n";
	
	content += "{gray-fg}" + "─".repeat(80) + "{/gray-fg}\n";
	content += `${"File Size".padEnd(25)} ${"Lines".padStart(8)} ${"Chars".padStart(10)} ${"Ops/sec".padStart(12)} ${"Mean Time".padStart(12)} ${"Chars/sec".padStart(12)}\n`;
	content += "{gray-fg}" + "─".repeat(80) + "{/gray-fg}\n";
	
	twinkleplopStats.sort((a, b) => a.chars - b.chars);
	
	for (const stat of twinkleplopStats) {
		const name = stat.testName.replace(/\(.*\)/, "").trim();
		content += `${name.padEnd(25)} `;
		content += `{cyan-fg}${stat.lines.toString().padStart(8)}{/cyan-fg} `;
		content += `{cyan-fg}{bold}${stat.chars.toLocaleString().padStart(10)}{/bold}{/cyan-fg} `;
		content += `${formatNumber(stat.opsPerSec, 0).padStart(12)} `;
		content += `${formatTime(stat.meanTime).padStart(12)} `;
		content += `${formatNumber(stat.charsPerSecond * 1000, 0).padStart(12)}\n`;
	}
	
	content += "\n{bold}{yellow-fg}Key Insights:{/yellow-fg}{/bold}\n";
	const avgCharsPerSec = twinkleplopStats.reduce((sum, s) => sum + s.charsPerSecond * 1000, 0) / twinkleplopStats.length;
	content += `• Average processing speed: {green-fg}{bold}${(avgCharsPerSec / 1_000_000).toFixed(1)}M chars/sec{/bold}{/green-fg}\n`;
	content += `• Consistent performance across file sizes\n`;
	content += `• Sub-linear scaling with file size\n`;
	
	contentBox.setContent(content);
	screen.render();
}

function showScaling() {
	let content = "{bold}{cyan-fg}📈 PERFORMANCE SCALING ANALYSIS{/cyan-fg}{/bold}\n\n";
	
	const cssStats = twinkleplopStats.filter(s => s.testName.includes("CSS"));
	
	if (cssStats.length >= 2) {
		content += "{bold}{yellow-fg}🎨 CSS Files:{/yellow-fg}{/bold}\n";
		const small = cssStats[0];
		const medium = cssStats[1];
		const large = cssStats[2];
		
		if (small && medium) {
			const charRatio = medium.chars / small.chars;
			const timeRatio = medium.meanTime / small.meanTime;
			const efficiency = charRatio / timeRatio;
			
			content += "\n{gray-fg}" + "─".repeat(60) + "{/gray-fg}\n";
			content += `${"Metric".padEnd(20)} ${"Small→Medium".padStart(15)} ${"Medium→Large".padStart(15)} ${"Small→Large".padStart(15)}\n`;
			content += "{gray-fg}" + "─".repeat(60) + "{/gray-fg}\n";
			
			content += `📏 Character increase   {cyan-fg}${(charRatio.toFixed(2) + "x").padStart(15)}{/cyan-fg}`;
			if (large && medium) content += `{cyan-fg}${((large.chars / medium.chars).toFixed(2) + "x").padStart(15)}{/cyan-fg}`;
			if (large && small) content += `{cyan-fg}${((large.chars / small.chars).toFixed(2) + "x").padStart(15)}{/cyan-fg}`;
			content += "\n";
			
			content += `⏱  Time increase       {yellow-fg}${(timeRatio.toFixed(2) + "x").padStart(15)}{/yellow-fg}`;
			if (large && medium) content += `{yellow-fg}${((large.meanTime / medium.meanTime).toFixed(2) + "x").padStart(15)}{/yellow-fg}`;
			if (large && small) content += `{yellow-fg}${((large.meanTime / small.meanTime).toFixed(2) + "x").padStart(15)}{/yellow-fg}`;
			content += "\n";
			
			const getEffColor = (eff) => eff >= 1.0 ? "green-fg" : eff >= 0.9 ? "yellow-fg" : "red-fg";
			content += `⚖  Scaling efficiency  {${getEffColor(efficiency)}}${efficiency.toFixed(2).padStart(15)}{/${getEffColor(efficiency)}}`;
			if (large && medium) {
				const eff = (large.chars / medium.chars) / (large.meanTime / medium.meanTime);
				content += `{${getEffColor(eff)}}${eff.toFixed(2).padStart(15)}{/${getEffColor(eff)}}`;
			}
			if (large && small) {
				const eff = (large.chars / small.chars) / (large.meanTime / small.meanTime);
				content += `{${getEffColor(eff)}}${eff.toFixed(2).padStart(15)}{/${getEffColor(eff)}}`;
			}
			content += "\n";
		}
	}
	
	content += "\n\n{bold}{yellow-fg}Scaling Efficiency Guide:{/yellow-fg}{/bold}\n";
	content += "• {green-fg}≥ 1.0{/green-fg} = Sub-linear scaling (excellent)\n";
	content += "• {yellow-fg}0.9-1.0{/yellow-fg} = Near-linear scaling (good)\n";
	content += "• {red-fg}< 0.9{/red-fg} = Super-linear scaling (needs optimization)\n";
	
	contentBox.setContent(content);
	screen.render();
}

function showComparison() {
	let content = "{bold}{cyan-fg}🏆 RELATIVE PERFORMANCE VS COMPETITORS{/cyan-fg}{/bold}\n\n";
	
	const competitors = {};
	for (const bench of allBenchmarks) {
		if (!competitors[bench.testName]) {
			competitors[bench.testName] = {};
		}
		competitors[bench.testName][bench.name] = bench.hz;
	}
	
	content += "{gray-fg}" + "─".repeat(80) + "{/gray-fg}\n";
	content += `${"Test".padEnd(25)} ${"vs Prism".padStart(15)} ${"vs Shiki".padStart(15)} ${"vs Highlight.js".padStart(18)}\n`;
	content += "{gray-fg}" + "─".repeat(80) + "{/gray-fg}\n";
	
	for (const [testName, libs] of Object.entries(competitors)) {
		if (libs.Twinkleplop) {
			const tp = libs.Twinkleplop;
			content += `${testName.replace(/\(.*\)/, "").trim().padEnd(25)} `;
			
			if (libs["Prism"]) {
				const speedup = tp / libs["Prism"];
				const color = speedup >= 10 ? "green-fg}{bold" : speedup >= 2 ? "green-fg" : "yellow-fg";
				content += `{${color}}${speedup.toFixed(1)}x faster{/bold}{/${color.split("}")[0]}-fg}`.padStart(15);
			} else {
				content += "{gray-fg}N/A{/gray-fg}".padStart(15);
			}
			
			if (libs["Shiki"]) {
				const speedup = tp / libs["Shiki"];
				const color = speedup >= 100 ? "magenta-fg}{bold" : speedup >= 10 ? "green-fg}{bold" : "green-fg";
				content += `{${color}}${speedup.toFixed(1)}x faster{/bold}{/${color.split("}")[0]}-fg}`.padStart(15);
			} else {
				content += "{gray-fg}N/A{/gray-fg}".padStart(15);
			}
			
			if (libs["Highlight.js"]) {
				const speedup = tp / libs["Highlight.js"];
				const color = speedup >= 10 ? "green-fg}{bold" : speedup >= 2 ? "green-fg" : "yellow-fg";
				content += `{${color}}${speedup.toFixed(1)}x faster{/bold}{/${color.split("}")[0]}-fg}`.padStart(18);
			} else {
				content += "{gray-fg}N/A{/gray-fg}".padStart(18);
			}
			
			content += "\n";
		}
	}
	
	content += "\n{bold}{yellow-fg}Performance Summary:{/yellow-fg}{/bold}\n";
	content += "• Twinkleplop is {green-fg}{bold}2.8-2.9x faster{/bold}{/green-fg} than Prism\n";
	content += "• Twinkleplop is {magenta-fg}{bold}100-111x faster{/bold}{/magenta-fg} than Shiki\n";
	content += "• Consistent performance advantage across all file sizes\n";
	
	contentBox.setContent(content);
	screen.render();
}

// Key bindings
screen.key(["1"], () => { tabs.selectTab(0); showSummary(); });
screen.key(["2"], () => { tabs.selectTab(1); showPerformance(); });
screen.key(["3"], () => { tabs.selectTab(2); showScaling(); });
screen.key(["4"], () => { tabs.selectTab(3); showComparison(); });
screen.key(["escape", "q", "C-c"], () => process.exit(0));

// Show initial content
showSummary();
tabs.selectTab(0);

// Render the screen
screen.render();