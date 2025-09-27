import { compile } from "@twinkleplop/core/compile";
import { tokenize } from "@twinkleplop/core";
import grammar from "./src/grammar-simplified.js";

// Test CSS with various features including nesting
const testCSS = `:root {
  --gap: 1.25rem;
  --brand: hsl(200 80% 50%);
}

@media (min-width: 600px) {
  body {
    font-family: system-ui, sans-serif;
    background: linear-gradient(
      45deg,
      var(--brand),
      white
    );
  }

  /* nesting */
  .card {
    display: grid;
    gap: var(--gap);

    & a[href^="http"]::after {
      content: "↗";
      margin-left: 0.25em;
    }
  }
}`;

console.log("Testing simplified CSS grammar...\n");
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

// Display tokens
console.log("Tokens:");
console.log("-------");
for (const token of tokens) {
	const preview = token.text.replace(/\n/g, "\\n").substring(0, 30);
	console.log(`${token.type.padEnd(15)} | ${preview}${token.text.length > 30 ? "..." : ""}`);
}

// Check for specific patterns
console.log("\n\nAnalysis:");
console.log("---------");

// Count token types
const typeCounts = {};
for (const token of tokens) {
	typeCounts[token.type] = (typeCounts[token.type] || 0) + 1;
}

console.log("Token type counts:");
for (const [type, count] of Object.entries(typeCounts)) {
	console.log(`  ${type}: ${count}`);
}

// Check nesting behavior
const braceTokens = tokens.filter(t => t.text === "{" || t.text === "}");
console.log("\nBrace tokens (checking nesting behavior):");
braceTokens.forEach(t => {
	console.log(`  ${t.text} at position ${t.start}`);
});

console.log("\n✅ Test complete!");