import { compile } from "@twinkleplop/core/compile";
import { tokenize } from "@twinkleplop/core";
import grammar from "./src/grammar.js";

const testCSS = `.mixed {
    .nested {
        color: red;
    }

    background: white;
}`;

console.log("Testing nested CSS bug...\n");
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

// Display tokens with focus on the background property
console.log("Tokens around 'background: white':");
console.log("-----------------------------------");
let foundBackground = false;
for (let i = 0; i < tokens.length; i++) {
	const token = tokens[i];
	if (token.text.includes("background") || foundBackground) {
		console.log(`${token.type.padEnd(15)} | "${token.text}"`);
		foundBackground = true;
		if (token.text === ";") {
			break;
		}
	}
}

console.log("\nExpected:");
console.log("---------");
console.log('property        | "background"');
console.log('punctuation     | ":"');
console.log('keyword         | "white"');
console.log('punctuation     | ";"');