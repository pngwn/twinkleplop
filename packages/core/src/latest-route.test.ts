import { describe, it, expect } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import { TokenizerIntrospector } from "./introspector";
import { GrammarMapper } from "./grammar-mapper";
import type { Grammar } from "./types";

describe("Latest Route Tracking", () => {
	describe("probe state disambiguation", () => {
		it("should show final state after probe disambiguation, not probe state", () => {
			const grammar: Grammar = {
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
			
			// Check the route at position 3 (after "foo", before "(")
			const routeAtPosition3 = introspector.getLatestRouteToPosition(3);
			const lastStep = routeAtPosition3[routeAtPosition3.length - 1];
			
			// Should show function_name, not identifier_probe
			expect(lastStep.toName).toBe("function_name");
			expect(lastStep.toName).not.toBe("identifier_probe");
			
			// Enhanced route should also show the correct state
			const enhancedRoute = introspector.getEnhancedRoute(3);
			const lastEnhancedStep = enhancedRoute[enhancedRoute.length - 1];
			expect(lastEnhancedStep.toName).toBe("function_name");
		});

		it("should show fallback state when probe fails", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [
							{ match: "if", state: "if_probe" },
							{ match: "x", token: "char" },
						],
					},
					if_probe: {
						mode: "probe",
						fallback: "identifier",
						rules: [
							{ match: " ", token: "space" },
							{ match: "(", state: "if_statement", exit: true },
						],
					},
					if_statement: {
						rules: [
							{ match: "if", token: "keyword.if" },
						],
					},
					identifier: {
						rules: [
							{ match: "if", token: "identifier" },
						],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);
			const introspector = new TokenizerIntrospector({ grammarMapper: mapper });
			
			// "if" without parenthesis - should fallback to identifier
			tokenize("if", compiled, introspector);
			
			// Check route at position 2 (after "if")
			const route = introspector.getLatestRouteToPosition(2);
			const lastStep = route[route.length - 1];
			
			// Should show identifier (fallback), not if_probe
			expect(lastStep.toName).toBe("identifier");
			expect(lastStep.toName).not.toBe("if_probe");
		});

		it("should handle multiple probe passes at same position", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [
							{ match: "test", state: "test_probe" },
							{ match: "x", token: "char" },
						],
					},
					test_probe: {
						mode: "probe",
						fallback: "word_state",
						rules: [
							{ match: "123", state: "test_number", exit: true },
						],
					},
					test_number: {
						rules: [
							{ match: "test", token: "test.keyword" },
							{ match: "123", token: "number" },
						],
					},
					word_state: {
						rules: [
							{ match: "test", token: "word" },
						],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);
			const introspector = new TokenizerIntrospector({ grammarMapper: mapper });
			
			tokenize("test123", compiled, introspector);
			// Position 4 is after "test", should be in test_number not test_probe
			const route = introspector.getLatestRouteToPosition(4);
			const relevantStep = route.find(step => step.position === 4);

			expect(relevantStep).toBeDefined();
			expect(relevantStep!.toName).toBe("test_number");
			
			// Check that we don't have duplicate steps at position 4
			const stepsAtPos4 = route.filter(step => step.position === 4);
			expect(stepsAtPos4.length).toBe(1);
		});

		it("should show correct states at each position in complex probe scenario", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [
							{ match: "foo", state: "word_probe" },
							{ match: "arr", state: "word_probe" },
							{ match: "word", state: "word_probe" },
							{ match: " ", token: "space" },
						],
					},
					word_probe: {
						mode: "probe",
						fallback: "regular_word",
						rules: [
							{ match: "(", state: "function", exit: true },
							{ match: "[", state: "array", exit: true },
						],
					},
					function: {
						rules: [
							{ match: "foo", token: "function.name" },
							{ match: "(", token: "paren.open" },
							{ match: ")", token: "paren.close" },
						],
					},
					array: {
						rules: [
							{ match: "arr", token: "array.name" },
							{ match: "[", token: "bracket.open" },
							{ match: "]", token: "bracket.close" },
						],
					},
					regular_word: {
						rules: [
							{ match: "word", token: "word" },
							{ match: "foo", token: "word" },
							{ match: "arr", token: "word" },
						],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);
			const introspector = new TokenizerIntrospector({ grammarMapper: mapper });
			
			const testCases = [
				{ input: "foo()", expectedStateAfterWord: "function", position: 3 },
				{ input: "arr[", expectedStateAfterWord: "array", position: 3 },
				{ input: "word ", expectedStateAfterWord: "regular_word", position: 4 },
			];
			
			for (const testCase of testCases) {
				const freshIntrospector = new TokenizerIntrospector({ grammarMapper: mapper });
				tokenize(testCase.input, compiled, freshIntrospector);
				
				const route = freshIntrospector.getLatestRouteToPosition(testCase.position);
				const lastStep = route[route.length - 1];
				
				expect(lastStep.toName).toBe(testCase.expectedStateAfterWord);
				expect(lastStep.toName).not.toContain("probe");
			}
		});
	});

	describe("state session tracking with latest route", () => {
		it("should use latest state session when multiple exist at same position", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [
							{ match: "x", state: "x_probe" },
						],
					},
					x_probe: {
						mode: "probe",
						fallback: "x_fallback",
						rules: [
							{ match: "y", state: "xy_state", exit: true },
						],
					},
					xy_state: {
						rules: [
							{ match: "x", token: "x.special" },
							{ match: "y", token: "y" },
						],
					},
					x_fallback: {
						rules: [
							{ match: "x", token: "x" },
						],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);
			const introspector = new TokenizerIntrospector({ grammarMapper: mapper });
			
			tokenize("xy", compiled, introspector);
			
			// Get enhanced route at position 1 (after "x")
			const enhancedRoute = introspector.getEnhancedRoute(1);
			const stepAtPos1 = enhancedRoute.find(step => step.position === 1);
			
			expect(stepAtPos1).toBeDefined();
			expect(stepAtPos1!.toName).toBe("xy_state");
			
			// Check that probe flag is correctly set
			if (stepAtPos1!.isProbe !== undefined) {
				expect(stepAtPos1!.isProbe).toBe(false); // xy_state is not a probe
			}
		});
	});
});
