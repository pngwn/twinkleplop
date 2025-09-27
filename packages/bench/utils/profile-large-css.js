import { performance } from "node:perf_hooks";
import { tokenize, toHtml } from "@twinkleplop/core";
import { css } from "@twinkleplop/css";
import { veryLargeCSS } from "./src/library/css-samples.js";

console.log("CSS File Stats:");
console.log("- Size:", (veryLargeCSS.length / 1024 / 1024).toFixed(2), "MB");
console.log("- Lines:", veryLargeCSS.split("\n").length);
console.log("- Characters:", veryLargeCSS.length.toLocaleString());
console.log();

// Warm up the JIT
console.log("Warming up JIT...");
for (let i = 0; i < 3; i++) {
	tokenize(veryLargeCSS, css);
}

// Profile tokenization
console.log("Profiling tokenization phase:");
const tokenRuns = 10;
const tokenTimes = [];
let tokenResult;

for (let i = 0; i < tokenRuns; i++) {
	const start = performance.now();
	tokenResult = tokenize(veryLargeCSS, css);
	const end = performance.now();
	const time = end - start;
	tokenTimes.push(time);
	console.log(`  Run ${i + 1}: ${time.toFixed(2)}ms - ${tokenResult.tokens.length / 3} tokens`);
}

const avgTokenTime = tokenTimes.reduce((a, b) => a + b) / tokenTimes.length;
const minTokenTime = Math.min(...tokenTimes);
const maxTokenTime = Math.max(...tokenTimes);

console.log("\nTokenization Stats:");
console.log(`  Average: ${avgTokenTime.toFixed(2)}ms`);
console.log(`  Min: ${minTokenTime.toFixed(2)}ms`);
console.log(`  Max: ${maxTokenTime.toFixed(2)}ms`);

// Get tokens for HTML generation
const tokens = tokenResult.tokens;
const tokenCount = tokens.length / 3;
console.log(`  Tokens generated: ${tokenCount.toLocaleString()}`);
console.log(`  Characters per token: ${(veryLargeCSS.length / tokenCount).toFixed(2)}`);
console.log(`  Throughput: ${(veryLargeCSS.length / 1024 / 1024 / (avgTokenTime / 1000)).toFixed(2)} MB/s`);

// Profile HTML generation
console.log("\nProfiling HTML generation phase:");
const htmlRuns = 10;
const htmlTimes = [];

for (let i = 0; i < htmlRuns; i++) {
	const start = performance.now();
	const html = toHtml(veryLargeCSS, tokenResult);
	const end = performance.now();
	const time = end - start;
	htmlTimes.push(time);
	console.log(`  Run ${i + 1}: ${time.toFixed(2)}ms - ${html.length.toLocaleString()} chars output`);
}

const avgHtmlTime = htmlTimes.reduce((a, b) => a + b) / htmlTimes.length;
const minHtmlTime = Math.min(...htmlTimes);
const maxHtmlTime = Math.max(...htmlTimes);

console.log("\nHTML Generation Stats:");
console.log(`  Average: ${avgHtmlTime.toFixed(2)}ms`);
console.log(`  Min: ${minHtmlTime.toFixed(2)}ms`);
console.log(`  Max: ${maxHtmlTime.toFixed(2)}ms`);
console.log(`  Throughput: ${(veryLargeCSS.length / 1024 / 1024 / (avgHtmlTime / 1000)).toFixed(2)} MB/s`);

// Combined stats
const totalTime = avgTokenTime + avgHtmlTime;
console.log("\nCombined Performance:");
console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
console.log(`  Tokenization: ${avgTokenTime.toFixed(2)}ms (${((avgTokenTime / totalTime) * 100).toFixed(1)}%)`);
console.log(`  HTML generation: ${avgHtmlTime.toFixed(2)}ms (${((avgHtmlTime / totalTime) * 100).toFixed(1)}%)`);
console.log(`  Overall throughput: ${(veryLargeCSS.length / 1024 / 1024 / (totalTime / 1000)).toFixed(2)} MB/s`);

// Memory usage
console.log("\nMemory Usage:");
const used = process.memoryUsage();
for (let key in used) {
	console.log(`  ${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
}

// Efficiency calculation
console.log("\nEfficiency Analysis:");
const charsPerMs = veryLargeCSS.length / totalTime;
console.log(`  Characters per millisecond: ${charsPerMs.toFixed(0)}`);
console.log(`  Lines per millisecond: ${(veryLargeCSS.split("\n").length / totalTime).toFixed(2)}`);

// Token distribution analysis
console.log("\nToken Distribution:");
const tokenTypeMap = {};
for (let i = 0; i < tokens.length; i += 3) {
	const type = tokens[i];
	tokenTypeMap[type] = (tokenTypeMap[type] || 0) + 1;
}
const sortedTypes = Object.entries(tokenTypeMap).sort((a, b) => b[1] - a[1]);
console.log("  Top 10 token types:");
for (let i = 0; i < Math.min(10, sortedTypes.length); i++) {
	const [type, count] = sortedTypes[i];
	const typeName = tokenResult.tokenTypes ? tokenResult.tokenTypes[type] : `Type_${type}`;
	console.log(`    ${typeName}: ${count.toLocaleString()} (${((count / tokenCount) * 100).toFixed(1)}%)`);
}