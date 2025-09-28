import { compile } from "./dist/twinkleplop.compiler.js";
import { tokenize } from "./dist/twinkleplop.debug.js";
import { TokenizerIntrospector } from "./dist/twinkleplop.introspector.js";

const grammar = {
	name: "test",
	states: {
		main: {
			rules: [
				{ match: "foo", state: "identifier_probe" },
			],
		},
		identifier_probe: {
			mode: "probe", 
			fallback: "identifier",
			rules: [
				{ match: "(", state: "function_name", exit: true },
			],
		},
		function_name: {
			rules: [
				{ match: "foo", token: "function.name" },
			],
		},
		identifier: {
			rules: [
				{ match: "foo", token: "identifier" },
			],
		},
	},
};

const compiled = compile(grammar);
const introspector = new TokenizerIntrospector();
tokenize("foo()", compiled, introspector);

// Get the latest route
const route = introspector.getLatestRouteToPosition(3);
console.log("\nRoute at position 3:");
for (const step of route) {
	console.log(`  Pos ${step.position}: ${step.type} -> ${step.toName || step.stateName || step.to}`);
}

// Check what's in the history
const history = introspector.history || [];
console.log("\nState transitions in history:");
for (const event of history) {
	if (event.type === "PUSHED_STATE" || event.type === "TRANSITIONED_STATE") {
		console.log(`  Pos ${event.pos}: ${event.type} ${event.fromStateIndex}->${event.toStateIndex}`);
	}
}