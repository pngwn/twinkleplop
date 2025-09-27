import { compile } from "@twinkleplop/core/compile";  
import grammar from "./src/grammar.js";

const compiled = compile(grammar);

// Find function_args state
const funcArgsId = compiled.states.get("function_args");
console.log("function_args state ID:", funcArgsId);

// Check the charMap for '-' in function_args
const dashCharCode = 45;
const charMapIndex = funcArgsId * 128 + dashCharCode;
const dashRule = compiled.charMaps[charMapIndex];

console.log(`\nCharMap for '-' in function_args:`);
console.log(`  Rule index: ${dashRule}`);

if (dashRule !== 255) {
	// Check what this rule does
	const transBase = funcArgsId * 256 * 3 + dashRule * 3;
	const transition = compiled.transitions[transBase];
	const tokenType = compiled.transitions[transBase + 1];
	const stackOp = compiled.transitions[transBase + 2];
	
	console.log(`  Transition: ${transition}`);
	console.log(`  Token type: ${tokenType} (${compiled.tokenTypes[tokenType]})`);
	console.log(`  Stack op: ${stackOp}`);
	
	if (transition !== 255) {
		// Find state name
		for (const [name, id] of compiled.states.entries()) {
			if (id === transition) {
				console.log(`  Transitions to state: "${name}" (ID ${id})`);
				break;
			}
		}
	}
}

// Also check rule 6 (the -- pattern)
console.log("\nRule 6 (-- pattern):");
const rule6Base = funcArgsId * 256 * 3 + 6 * 3;
console.log(`  Transition: ${compiled.transitions[rule6Base]}`);
console.log(`  Token type: ${compiled.transitions[rule6Base + 1]} (${compiled.tokenTypes[compiled.transitions[rule6Base + 1]]})`);
console.log(`  Stack op: ${compiled.transitions[rule6Base + 2]}`);

if (compiled.transitions[rule6Base] !== 255) {
	for (const [name, id] of compiled.states.entries()) {
		if (id === compiled.transitions[rule6Base]) {
			console.log(`  Transitions to state: "${name}" (ID ${id})`);
			break;
		}
	}
}