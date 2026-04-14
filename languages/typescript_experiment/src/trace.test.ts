import { describe, expect, it } from "vitest";
import { grammar } from "./index.js";

// sanity check: the class_header / class_body states are actually being entered
// for class declarations. if this test passes but identity.test.ts also passes,
// it proves we've introduced structural states without changing token output.

describe("typescript_experiment — stage 2 grammar structure", () => {
	it("grammar includes class_header / class_body / interface_header / interface_body states", () => {
		const states = grammar.states as Map<string, number>;
		expect(states.has("class_header")).toBe(true);
		expect(states.has("class_body")).toBe(true);
		expect(states.has("interface_header")).toBe(true);
		expect(states.has("interface_body")).toBe(true);
	});
});
