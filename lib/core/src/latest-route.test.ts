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
			const introspector = new TokenizerIntrospector({ grammar_mapper: mapper });
			const input = "foo()";
			
			tokenize(input, compiled, introspector);
			
			// Check the route at position 3 (after "foo", before "(")
			const route_at_position_3 = introspector.get_latest_route_to_position(3);
			const last_step = route_at_position_3[route_at_position_3.length - 1];
			
			// Should show function_name, not identifier_probe
			expect(last_step.to_name).toBe("function_name");
			expect(last_step.to_name).not.toBe("identifier_probe");
			
			// Enhanced route should also show the correct state
			const enhanced_route = introspector.get_enhanced_route(3);
			const last_enhanced_step = enhanced_route[enhanced_route.length - 1];
			expect(last_enhanced_step.to_name).toBe("function_name");
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
			const introspector = new TokenizerIntrospector({ grammar_mapper: mapper });
			
			// "if" without parenthesis - should fallback to identifier
			tokenize("if", compiled, introspector);
			
			// Check route at position 2 (after "if")
			const route = introspector.get_latest_route_to_position(2);
			const last_step = route[route.length - 1];
			
			// Should show identifier (fallback), not if_probe
			expect(last_step.to_name).toBe("identifier");
			expect(last_step.to_name).not.toBe("if_probe");
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
			const introspector = new TokenizerIntrospector({ grammar_mapper: mapper });
			
			tokenize("test123", compiled, introspector);
			// Position 4 is after "test", should be in test_number not test_probe
			const route = introspector.get_latest_route_to_position(4);
			const relevant_step = route.find(step => step.position === 4);

			expect(relevant_step).toBeDefined();
			expect(relevant_step!.to_name).toBe("test_number");
			
			// Check that we don't have duplicate steps at position 4
			const steps_at_pos_4 = route.filter(step => step.position === 4);
			expect(steps_at_pos_4.length).toBe(1);
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
			const introspector = new TokenizerIntrospector({ grammar_mapper: mapper });
			
			const test_cases = [
				{ input: "foo()", expected_state_after_word: "function", position: 3 },
				{ input: "arr[", expected_state_after_word: "array", position: 3 },
				{ input: "word ", expected_state_after_word: "regular_word", position: 4 },
			];
			
			for (const test_case of test_cases) {
				const fresh_introspector = new TokenizerIntrospector({ grammar_mapper: mapper });
				tokenize(test_case.input, compiled, fresh_introspector);
				
				const route = fresh_introspector.get_latest_route_to_position(test_case.position);
				const last_step = route[route.length - 1];
				
				expect(last_step.to_name).toBe(test_case.expected_state_after_word);
				expect(last_step.to_name).not.toContain("probe");
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
			const introspector = new TokenizerIntrospector({ grammar_mapper: mapper });
			
			tokenize("xy", compiled, introspector);
			
			// Get enhanced route at position 1 (after "x")
			const enhanced_route = introspector.get_enhanced_route(1);
			const step_at_pos_1 = enhanced_route.find(step => step.position === 1);
			
			expect(step_at_pos_1).toBeDefined();
			expect(step_at_pos_1!.to_name).toBe("xy_state");
			
			// Check that probe flag is correctly set
			if (step_at_pos_1!.is_probe !== undefined) {
				expect(step_at_pos_1!.is_probe).toBe(false); // xy_state is not a probe
			}
		});
	});
});
