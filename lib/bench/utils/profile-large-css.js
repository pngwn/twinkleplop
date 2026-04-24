import { performance } from "node:perf_hooks";
import { tokenize, to_html } from "@twinkleplop/core";
import { css } from "@twinkleplop/css";
import { very_large_css } from "./src/library/css-samples.js";

console.log("CSS File Stats:");
console.log("- Size:", (very_large_css.length / 1024 / 1024).toFixed(2), "MB");
console.log("- Lines:", very_large_css.split("\n").length);
console.log("- Characters:", very_large_css.length.toLocaleString());
console.log();

// Warm up the JIT
console.log("Warming up JIT...");
for (let i = 0; i < 3; i++) {
  tokenize(very_large_css, css);
}

// Profile tokenization
console.log("Profiling tokenization phase:");
const token_runs = 10;
const token_times = [];
let token_result;

for (let i = 0; i < token_runs; i++) {
  const start = performance.now();
  token_result = tokenize(very_large_css, css);
  const end = performance.now();
  const time = end - start;
  token_times.push(time);
  console.log(`  Run ${i + 1}: ${time.toFixed(2)}ms - ${token_result.tokens.length / 3} tokens`);
}

const avg_token_time = token_times.reduce((a, b) => a + b) / token_times.length;
const min_token_time = Math.min(...token_times);
const max_token_time = Math.max(...token_times);

console.log("\nTokenization Stats:");
console.log(`  Average: ${avg_token_time.toFixed(2)}ms`);
console.log(`  Min: ${min_token_time.toFixed(2)}ms`);
console.log(`  Max: ${max_token_time.toFixed(2)}ms`);

// Get tokens for HTML generation
const tokens = token_result.tokens;
const token_count = tokens.length / 3;
console.log(`  Tokens generated: ${token_count.toLocaleString()}`);
console.log(`  Characters per token: ${(very_large_css.length / token_count).toFixed(2)}`);
console.log(
  `  Throughput: ${(very_large_css.length / 1024 / 1024 / (avg_token_time / 1000)).toFixed(2)} MB/s`,
);

// Profile HTML generation
console.log("\nProfiling HTML generation phase:");
const html_runs = 10;
const html_times = [];

for (let i = 0; i < html_runs; i++) {
  const start = performance.now();
  const html = to_html(very_large_css, token_result);
  const end = performance.now();
  const time = end - start;
  html_times.push(time);
  console.log(
    `  Run ${i + 1}: ${time.toFixed(2)}ms - ${html.length.toLocaleString()} chars output`,
  );
}

const avg_html_time = html_times.reduce((a, b) => a + b) / html_times.length;
const min_html_time = Math.min(...html_times);
const max_html_time = Math.max(...html_times);

console.log("\nHTML Generation Stats:");
console.log(`  Average: ${avg_html_time.toFixed(2)}ms`);
console.log(`  Min: ${min_html_time.toFixed(2)}ms`);
console.log(`  Max: ${max_html_time.toFixed(2)}ms`);
console.log(
  `  Throughput: ${(very_large_css.length / 1024 / 1024 / (avg_html_time / 1000)).toFixed(2)} MB/s`,
);

// Combined stats
const total_time = avg_token_time + avg_html_time;
console.log("\nCombined Performance:");
console.log(`  Total time: ${total_time.toFixed(2)}ms`);
console.log(
  `  Tokenization: ${avg_token_time.toFixed(2)}ms (${((avg_token_time / total_time) * 100).toFixed(1)}%)`,
);
console.log(
  `  HTML generation: ${avg_html_time.toFixed(2)}ms (${((avg_html_time / total_time) * 100).toFixed(1)}%)`,
);
console.log(
  `  Overall throughput: ${(very_large_css.length / 1024 / 1024 / (total_time / 1000)).toFixed(2)} MB/s`,
);

// Memory usage
console.log("\nMemory Usage:");
const used = process.memoryUsage();
for (let key in used) {
  console.log(`  ${key}: ${Math.round((used[key] / 1024 / 1024) * 100) / 100} MB`);
}

// Efficiency calculation
console.log("\nEfficiency Analysis:");
const chars_per_ms = very_large_css.length / total_time;
console.log(`  Characters per millisecond: ${chars_per_ms.toFixed(0)}`);
console.log(
  `  Lines per millisecond: ${(very_large_css.split("\n").length / total_time).toFixed(2)}`,
);

// Token distribution analysis
console.log("\nToken Distribution:");
const token_type_map = {};
for (let i = 0; i < tokens.length; i += 3) {
  const type = tokens[i];
  token_type_map[type] = (token_type_map[type] || 0) + 1;
}
const sorted_types = Object.entries(token_type_map).sort((a, b) => b[1] - a[1]);
console.log("  Top 10 token types:");
for (let i = 0; i < Math.min(10, sorted_types.length); i++) {
  const [type, count] = sorted_types[i];
  const type_name = token_result.token_types ? token_result.token_types[type] : `Type_${type}`;
  console.log(
    `    ${type_name}: ${count.toLocaleString()} (${((count / token_count) * 100).toFixed(1)}%)`,
  );
}
