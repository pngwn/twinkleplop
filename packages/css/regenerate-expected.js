import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";
import fs from 'fs';

const testCode = fs.readFileSync('./test/nested_selectors.css', 'utf-8');

const result = tokenize(testCode, grammar);
const tokens = [];

for (let i = 0; i < result.tokens.length / 3; i++) {
	const type = result.tokenTypes[result.tokens[i * 3]];
	const start = result.tokens[i * 3 + 1];
	const end = result.tokens[i * 3 + 2];
	tokens.push({ type, start, end });
}

// Generate the expected output in the same format
const output = `export default ${JSON.stringify(tokens, null, '\t')};
`;

fs.writeFileSync('./test/nested_selectors.output.js', output);
console.log('Updated nested_selectors.output.js');
console.log(`Total tokens: ${tokens.length}`);