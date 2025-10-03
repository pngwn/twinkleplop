import { describe, it, expect } from "vitest";
import { TokenizerIntrospector } from "./introspector";
import { compile } from "./compiler";
import { createGrammarMapper } from "./grammar-mapper";
import { tokenize } from "./tokenizer";
import { Grammar } from "./types";

// Simplified clike grammar with probe states
const grammar: Grammar = {
	name: "test",
	states: {
		main: {
			rules: [
				// Identifiers - transition to probe state
				{
					range: [
						["a", "z"],
						["A", "Z"],
					],
					state: "identifier_probe",
				},
				// Opening paren
				{
					match: "(",
					token: "punctuation",
				},
				// Whitespace
				{
					match: " ",
				},
			],
		},

		// Probe state to check if identifier is a function
		identifier_probe: {
			mode: "probe",
			fallback: "identifier",
			rules: [
				// If followed by ( it's a function
				{
					match: "(",
					state: "function_name",
				},
				// Otherwise it's an identifier
				{
					match: " ",
					state: "identifier",
				},
			],
		},

		// Regular identifier
		identifier: {
			rules: [
				{
					range: [
						["a", "z"],
						["A", "Z"],
					],
					token: "identifier",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		// Function name
		function_name: {
			rules: [
				{
					range: [
						["a", "z"],
						["A", "Z"],
					],
					token: "function",
				},
				{
					match: "(",
					token: "punctuation",
					state: "function_body",
					exit: true,
				},
			],
		},

		// Function body
		function_body: {
			rules: [
				{
					match: ")",
					token: "punctuation",
					exit: true,
				},
			],
		},
	},
};

describe("Probe State Deduplication", () => {
	it("should record state transitions correctly", () => {
		const compiled = compile(grammar);
		const mapper = createGrammarMapper(grammar, compiled);
		const introspector = mapper.createEnhancedIntrospector(
			TokenizerIntrospector,
			{}
		);

		const input = "foo()";
		tokenize(input, compiled, introspector);

		// Verify introspector recorded events
		expect(introspector.history.length).toBeGreaterThan(0);
		expect(introspector.stateTransitions.length).toBeGreaterThan(0);
		expect(introspector.tokens.length).toBe(2); // 'foo' and '()'

		// Verify we have PUSHED_STATE events
		const pushedStates = introspector.history.filter(
			(e) => e.type === "PUSHED_STATE"
		);
		expect(pushedStates.length).toBeGreaterThan(0);

		// Verify probe events were recorded
		const probeEvents = introspector.history.filter(
			(e) => e.type === "ENTER_PROBE" || e.type === "EXIT_PROBE"
		);
		expect(probeEvents.length).toBeGreaterThan(0);
	});

	it("should deduplicate probe resolution pushes at the same position", () => {
		const compiled = compile(grammar);
		const mapper = createGrammarMapper(grammar, compiled);
		const introspector = mapper.createEnhancedIntrospector(
			TokenizerIntrospector,
			{}
		);

		const input = "foo()";
		tokenize(input, compiled, introspector);

		// Get the complete route at position 1 (where probe enters)
		const route = introspector.getCompleteRouteToPosition(1);

		// Find all PUSH steps at position 1
		const pushesAtPos1 = route.filter(
			(step) => step.position === 1 && step.type === "PUSH"
		);

		// We should have exactly one PUSH at position 1: main → identifier_probe
		expect(pushesAtPos1.length).toBe(1);
		expect(pushesAtPos1[0].fromName).toBe("main");
		expect(pushesAtPos1[0].toName).toBe("identifier_probe");
		expect(pushesAtPos1[0].isProbe).toBe(true);

		// There should NOT be a duplicate "main → function_name" at position 1
		const duplicatePush = pushesAtPos1.find(
			(step) => step.fromName === "main" && step.toName === "function_name"
		);
		expect(duplicatePush).toBeUndefined();
	});

	it("should correctly show probe resolution at position 4", () => {
		const compiled = compile(grammar);
		const mapper = createGrammarMapper(grammar, compiled);
		const introspector = mapper.createEnhancedIntrospector(
			TokenizerIntrospector,
			{}
		);

		const input = "foo()";
		tokenize(input, compiled, introspector);

		// Get route at position 4 (where '(' triggers probe resolution)
		const route = introspector.getCompleteRouteToPosition(4);

		// Find steps at position 4
		const stepsAtPos4 = route.filter((step) => step.position === 4);

		// Should have the probe resolution: identifier_probe → function_name
		const probeResolution = stepsAtPos4.find(
			(step) =>
				step.fromName === "identifier_probe" && step.toName === "function_name"
		);
		expect(probeResolution).toBeDefined();
		expect(probeResolution?.type).toBe("PUSH");

		// And then transition to function_body
		const transitionToBody = stepsAtPos4.find(
			(step) => step.toName === "function_body"
		);
		expect(transitionToBody).toBeDefined();
		expect(transitionToBody?.type).toBe("TRANSITION");
	});

	it("should not have duplicate consecutive states in the route", () => {
		const compiled = compile(grammar);
		const mapper = createGrammarMapper(grammar, compiled);
		const introspector = mapper.createEnhancedIntrospector(
			TokenizerIntrospector,
			{}
		);

		const input = "foo()";
		tokenize(input, compiled, introspector);

		// Check all positions
		for (let pos = 0; pos <= input.length; pos++) {
			const route = introspector.getCompleteRouteToPosition(pos);

			// Check for duplicate consecutive entries
			for (let i = 1; i < route.length; i++) {
				const prev = route[i - 1];
				const curr = route[i];

				// Should not have two consecutive PUSHes to the same state from the same source at the same position
				if (
					prev.position === curr.position &&
					prev.type === "PUSH" &&
					curr.type === "PUSH" &&
					prev.from === curr.from &&
					prev.to === curr.to
				) {
					throw new Error(
						`Duplicate PUSH found at position ${curr.position}: ` +
							`${curr.fromName} → ${curr.toName}`
					);
				}
			}
		}
	});

	it("should correctly track depth without jumps", () => {
		const compiled = compile(grammar);
		const mapper = createGrammarMapper(grammar, compiled);
		const introspector = mapper.createEnhancedIntrospector(
			TokenizerIntrospector,
			{}
		);

		const input = "foo()";
		tokenize(input, compiled, introspector);

		// Check depth tracking at each position
		for (let pos = 0; pos <= input.length; pos++) {
			const route = introspector.getCompleteRouteToPosition(pos);
			const depths = route.map((s) => s.depth);

			// Verify depths don't jump by more than 1
			for (let i = 1; i < depths.length; i++) {
				const depthDiff = depths[i] - depths[i - 1];
				// Depth can increase by 1 (push), decrease by any amount (pop), or stay same
				expect(depthDiff).toBeLessThanOrEqual(1);
			}
		}
	});

	it("should show the actual state transitions after probe resolution", () => {
		const compiled = compile(grammar);
		const mapper = createGrammarMapper(grammar, compiled);
		const introspector = mapper.createEnhancedIntrospector(
			TokenizerIntrospector,
			{}
		);

		const input = "foo()";
		tokenize(input, compiled, introspector);

		const fullRoute = introspector.getCompleteRouteToPosition(input.length);

		const functionNameSteps = fullRoute.filter(
			(step) =>
				step.toName === "function_name" || step.fromName === "function_name"
		);

		// We MUST have function_name in our route (it's where the function token is emitted)
		expect(functionNameSteps.length).toBeGreaterThan(0);
	});

	it("should maintain correct state path sequence", () => {
		const compiled = compile(grammar);
		const mapper = createGrammarMapper(grammar, compiled);
		const introspector = mapper.createEnhancedIntrospector(
			TokenizerIntrospector,
			{}
		);

		const input = "foo()";
		tokenize(input, compiled, introspector);

		// Get the full route
		const route = introspector.getCompleteRouteToPosition(input.length);

		// Extract state sequence
		const stateSequence: (string | undefined)[] = [];
		for (const step of route) {
			if (step.type === "START") {
				stateSequence.push(step.stateName);
			} else if (step.type === "PUSH") {
				stateSequence.push(step.toName);
			} else if (step.type === "TRANSITION") {
				stateSequence.push(step.toName);
			}
		}

		// Expected sequence for "foo()":
		// main → identifier_probe → function_name → function_body
		expect(stateSequence).toEqual([
			"main",
			"identifier_probe",
			"function_name",
			"function_body",
		]);
	});
});
