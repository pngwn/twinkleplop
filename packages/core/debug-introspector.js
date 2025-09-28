import { tokenize } from "./dist/twinkleplop.debug.js";
import { compile } from "./dist/twinkleplop.compiler.js";
import { TokenizerIntrospector } from "./dist/twinkleplop.introspector.js";

const grammar = {
	name: "nested-sideways",
	states: {
		root: {
			rules: [{ match: "(", token: "paren", state: "level1" }],
		},
		level1: {
			rules: [
				{ match: "[", token: "bracket", state: "level2a" },
				{ match: "{", token: "brace", state: "level2b" },
				{ match: ")", token: "paren", exit: true },
			],
		},
		level2a: {
			rules: [
				{ match: "]", token: "bracket", exit: true },
				{ match: ">", token: "arrow", state: "level2b", exit: true }, // Sideways to sibling
				{ match: "a", token: "a" },
			],
		},
		level2b: {
			rules: [
				{ match: "}", token: "brace", exit: true },
				{ match: "<", token: "arrow", state: "level2a", exit: true }, // Sideways to sibling
				{ match: "b", token: "b" },
			],
		},
	},
};

const compiled = compile(grammar);
const input = "([a>b<a])";

console.log("Input:", input);
console.log("Testing nested sideways transitions\n");

// Run with introspector
const introspector = new TokenizerIntrospector();
const result = tokenize(input, compiled, introspector);

// Get state transitions
const stateTransitions = introspector.stateTransitions || [];
const history = introspector.history || [];

// Extract tokens
const tokens = [];
for (let i = 0; i < result.tokens.length / 3; i++) {
	const type = result.tokenTypes[result.tokens[i * 3]];
	const start = result.tokens[i * 3 + 1];
	const end = result.tokens[i * 3 + 2];
	tokens.push({
		type,
		value: input.substring(start, end),
		start,
		end
	});
}

console.log("Tokens found:", tokens.length);
tokens.forEach(t => console.log(`  ${t.type}: "${t.value}" [${t.start}-${t.end}]`));

console.log("\nState transitions:");
stateTransitions.forEach(st => {
	console.log(`  [pos ${st.pos}] ${st.type}: ${st.fromState || st.fromStateIndex} → ${st.toState || st.toStateIndex}`);
});

// Show the last few history events to see where it stops
console.log("\nLast 20 history events:");
const lastEvents = history.slice(-20);
lastEvents.forEach(event => {
	if (event.type === 'BEFORE_CHAR') {
		console.log(`  [${event.pos}] BEFORE_CHAR '${event.charStr}' in ${event.currentState}, stack depth: ${event.stackDepth}`);
	} else if (event.type === 'MATCHED_RULE') {
		console.log(`  [${event.pos}] MATCHED ${event.ruleName} → ${event.tokenType || 'no token'}, stackOp: ${event.stackOp}`);
	} else if (event.type === 'PUSHED_STATE' || event.type === 'POPPED_STATE' || event.type === 'TRANSITIONED_STATE') {
		console.log(`  [${event.pos}] ${event.type}: ${event.fromState} → ${event.toState}`);
	} else if (event.type === 'EMITTED_TOKEN') {
		console.log(`  [${event.start}-${event.end}] EMITTED ${event.tokenName}`);
	}
});

console.log("\nFinal position reached:", tokens[tokens.length - 1]?.end || 0);
console.log("Input length:", input.length);
console.log("Missing characters:", input.substring(tokens[tokens.length - 1]?.end || 0));