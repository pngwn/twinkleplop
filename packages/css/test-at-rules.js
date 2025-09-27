import { compile } from "@twinkleplop/core/compile";
import { tokenize } from "@twinkleplop/core";
import grammar from "./src/grammar.js";

const testCSS = `@media (min-width: 600px) {
    body { color: red; }
}

@import url("styles.css");

@keyframes slide {
    from { left: 0; }
    to { left: 100px; }
}

@supports (display: grid) {
    .grid { display: grid; }
}`;

console.log("Testing at-rule tokenization...\n");
console.log("Input CSS:");
console.log("----------");
console.log(testCSS);
console.log("\n");

// Compile and tokenize
const compiled = compile(grammar);
const result = tokenize(testCSS, compiled);

// Extract tokens
const tokens = [];
let lastEnd = 0;

for (let i = 0; i < result.tokens.length; i += 3) {
	const type = result.tokens[i];
	const start = result.tokens[i + 1];
	const end = result.tokens[i + 2];
	
	if (type !== 255 && end > lastEnd) {
		tokens.push({
			type: result.tokenTypes[type],
			text: testCSS.substring(start, end),
			start,
			end
		});
		lastEnd = end;
	}
}

// Display tokens for at-rules
console.log("At-rule tokens:");
console.log("---------------");
let inAtRule = false;
for (const token of tokens) {
	if (token.text.startsWith("@")) {
		inAtRule = true;
		console.log("\n" + token.text + ":");
	}
	if (inAtRule) {
		console.log(`  ${token.type.padEnd(12)} | "${token.text}"`);
	}
	if (token.text === "{" && inAtRule) {
		inAtRule = false;
	}
	if (token.text === ";" && inAtRule) {
		inAtRule = false;
	}
}

console.log("\n\nExpected for @media:");
console.log("--------------------");
console.log('  keyword      | "@media"');
console.log('  punctuation  | "("');
console.log('  keyword      | "min-width"');
console.log('  punctuation  | ":"');
console.log('  number       | "600"');
console.log('  unit         | "px"');
console.log('  punctuation  | ")"');
console.log('  punctuation  | "{"');