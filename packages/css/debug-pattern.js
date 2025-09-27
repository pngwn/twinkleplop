import { compile } from "@twinkleplop/core/compile";
import grammar from "./src/grammar.js";

const compiled = compile(grammar);

// Find patterns for function_args state
const stateId = compiled.states.get("function_args");
console.log("function_args state ID:", stateId);

if (compiled.patterns) {
	const patternsForState = compiled.patterns.get(stateId);
	if (patternsForState) {
		// Check bucket for '-' (ASCII 45)
		const dashBucket = patternsForState[45];
		if (dashBucket) {
			console.log("\nPatterns in bucket for '-' (ASCII 45):");
			for (const pat of dashBucket) {
				const chars = Array.from(pat.codes).map(c => 
					`'${String.fromCharCode(c)}' (${c})`
				).join(", ");
				console.log(`  Pattern: [${chars}], length: ${pat.length}, ruleIdx: ${pat.ruleIdx}`);
			}
		}
	}
}

// Also check the actual match rules in the grammar
console.log("\nRules in function_args that match dash:");
const funcArgsState = grammar.states.function_args;
funcArgsState.rules.forEach((rule, idx) => {
	if (rule.match) {
		if (rule.match === "--" || rule.match === "-") {
			console.log(`  Rule ${idx}: match="${rule.match}" -> ${rule.token || rule.state}`);
		} else if (Array.isArray(rule.match) && (rule.match.includes("--") || rule.match.includes("-"))) {
			console.log(`  Rule ${idx}: match=${JSON.stringify(rule.match)} -> ${rule.token || rule.state}`);
		}
	}
});