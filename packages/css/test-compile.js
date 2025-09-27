import { compile } from "@twinkleplop/core";
import grammar from "./src/grammar.js";

try {
	const compiled = compile(grammar);
	console.log("Grammar compiled successfully!");
	console.log("Number of states:", Object.keys(grammar.states).length);
	
	// Check for the new state we added
	if (grammar.states.negative_number_in_function) {
		console.log("✓ negative_number_in_function state exists");
	}
	
	// Check function_args state
	const funcArgs = grammar.states.function_args;
	console.log("\nfunction_args rules:");
	for (let i = 0; i < funcArgs.rules.length; i++) {
		const rule = funcArgs.rules[i];
		if (rule.match) {
			console.log(`  Rule ${i}: match="${rule.match}" → ${rule.token || rule.state || 'exit'}`);
		}
	}
} catch (e) {
	console.error("Compilation failed:", e);
	console.error(e.stack);
}