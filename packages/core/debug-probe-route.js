import { compile } from "./dist/twinkleplop.compiler.js";
import { tokenize } from "./dist/twinkleplop.debug.js";
import { TokenizerIntrospector } from "./dist/twinkleplop.introspector.js";
import { GrammarMapper } from "./dist/twinkleplop.grammar-mapper.js";

const grammar = {
	name: "test",
	states: {
		main: {
			rules: [
				{ match: "foo", state: "identifier_probe" },
				{ match: " ", token: "space" },
				{ match: "(", token: "paren.open" },
			],
		},
		identifier_probe: {
			mode: "probe",
			fallback: "identifier",
			rules: [
				{ match: "(", state: "function_name", exit: true },
				{ match: " ", token: "space" },
			],
		},
		function_name: {
			rules: [
				{ match: "foo", token: "function.name" },
				{ match: "(", token: "paren.open", state: "parameters" },
			],
		},
		identifier: {
			rules: [
				{ match: "foo", token: "identifier" },
			],
		},
		parameters: {
			rules: [
				{ match: ")", token: "paren.close", exit: true },
			],
		},
	},
};

const compiled = compile(grammar);
const mapper = new GrammarMapper(grammar, compiled);
const introspector = new TokenizerIntrospector({ grammarMapper: mapper });
const input = "foo()";

tokenize(input, compiled, introspector);

console.log("\n=== Input: '" + input + "' ===\n");

// Check position 3 (after "foo")
console.log("=== Route at position 3 (after 'foo') ===");
const route = introspector.getLatestRouteToPosition(3);
console.log("Route steps:");
for (const step of route) {
	console.log(`  Pos ${step.position}: ${step.type} -> ${step.toName || step.stateName}`);
}

console.log("\n=== State transitions ===");
const transitions = introspector.stateTransitions;
for (const trans of transitions) {
	console.log(`  Pos ${trans.pos}: ${trans.fromState} -> ${trans.toState}`);
}

console.log("\n=== State sessions ===");
for (const session of introspector.stateSessions) {
	console.log(`  ${session.stateName}: entry=${session.entryPosition}, chars=${session.charactersProcessed}, probe=${session.isProbe}`);
}

console.log("\n=== All history events ===");
const history = introspector.getHistory();
for (const event of history) {
	if (event.type === "PUSHED_STATE" || event.type === "TRANSITIONED_STATE" || event.type === "POPPED_STATE") {
		console.log(`  ${event.type} at pos ${event.pos}: ${event.fromState} -> ${event.toState}`);
	}
}