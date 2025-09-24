import { compile } from "@twinkleplop/core/compile";
import cssGrammar from "./src/grammar.js";

const testCode = `div {
	transform: translate(10px, 20px);
	transform: scaleX(2);
}`;

// Compile the grammar to see internal structure
const compiled = compile(cssGrammar);

// Check the states
console.log("Available states:");
Object.keys(cssGrammar.states).forEach(state => {
	console.log(`  - ${state}`);
});

console.log("\nBlock state rules:");
cssGrammar.states.block.rules.forEach((rule, i) => {
	if (rule.match) {
		console.log(`  ${i}: match ${JSON.stringify(rule.match)} → ${rule.state || '(token)'} ${rule.token || ''}`);
	} else if (rule.range) {
		console.log(`  ${i}: range ${JSON.stringify(rule.range)} → ${rule.state || '(token)'} ${rule.token || ''}`);
	}
});

console.log("\nProbe_identifier state:");
console.log("  fallback:", cssGrammar.states.probe_identifier.fallback);
console.log("  mode:", cssGrammar.states.probe_identifier.mode);
console.log("  rules:");
cssGrammar.states.probe_identifier.rules.forEach((rule, i) => {
	console.log(`    ${i}: match ${JSON.stringify(rule.match)} → ${rule.state}`);
});