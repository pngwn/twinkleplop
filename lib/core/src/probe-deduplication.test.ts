import { describe, it, expect } from "vitest";
import { TokenizerIntrospector } from "./introspector";
import { compile } from "./compiler";
import { create_grammar_mapper } from "./grammar-mapper";
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
    const mapper = create_grammar_mapper(grammar, compiled);
    const introspector = mapper.create_enhanced_introspector(TokenizerIntrospector, {});

    const input = "foo()";
    tokenize(input, compiled, introspector);

    // Verify introspector recorded events
    expect(introspector.history.length).toBeGreaterThan(0);
    expect(introspector.state_transitions.length).toBeGreaterThan(0);
    expect(introspector.tokens.length).toBe(2); // 'foo' and '()'

    // Verify we have PUSHED_STATE events
    const pushed_states = introspector.history.filter((e) => e.type === "PUSHED_STATE");
    expect(pushed_states.length).toBeGreaterThan(0);

    // Verify probe events were recorded
    const probe_events = introspector.history.filter(
      (e) => e.type === "ENTER_PROBE" || e.type === "EXIT_PROBE",
    );
    expect(probe_events.length).toBeGreaterThan(0);
  });

  it("should deduplicate probe resolution pushes at the same position", () => {
    const compiled = compile(grammar);
    const mapper = create_grammar_mapper(grammar, compiled);
    const introspector = mapper.create_enhanced_introspector(TokenizerIntrospector, {});

    const input = "foo()";
    tokenize(input, compiled, introspector);

    // Get the complete route at position 1 (where probe enters)
    const route = introspector.get_complete_route_to_position(1);

    // Find all PUSH steps at position 1
    const pushes_at_pos_1 = route.filter((step) => step.position === 1 && step.type === "PUSH");

    // We should have exactly one PUSH at position 1: main → identifier_probe
    expect(pushes_at_pos_1.length).toBe(1);
    expect(pushes_at_pos_1[0].from_name).toBe("main");
    expect(pushes_at_pos_1[0].to_name).toBe("identifier_probe");
    expect(pushes_at_pos_1[0].is_probe).toBe(true);

    // There should NOT be a duplicate "main → function_name" at position 1
    const duplicate_push = pushes_at_pos_1.find(
      (step) => step.from_name === "main" && step.to_name === "function_name",
    );
    expect(duplicate_push).toBeUndefined();
  });

  it("should correctly show probe resolution at position 4", () => {
    const compiled = compile(grammar);
    const mapper = create_grammar_mapper(grammar, compiled);
    const introspector = mapper.create_enhanced_introspector(TokenizerIntrospector, {});

    const input = "foo()";
    tokenize(input, compiled, introspector);

    // Get route at position 4 (where '(' triggers probe resolution)
    const route = introspector.get_complete_route_to_position(4);

    // Find steps at position 4
    const steps_at_pos_4 = route.filter((step) => step.position === 4);

    // Should have the probe resolution: identifier_probe → function_name
    const probe_resolution = steps_at_pos_4.find(
      (step) => step.from_name === "identifier_probe" && step.to_name === "function_name",
    );
    expect(probe_resolution).toBeDefined();
    expect(probe_resolution?.type).toBe("PUSH");

    // And then transition to function_body
    const transition_to_body = steps_at_pos_4.find((step) => step.to_name === "function_body");
    expect(transition_to_body).toBeDefined();
    expect(transition_to_body?.type).toBe("TRANSITION");
  });

  it("should not have duplicate consecutive states in the route", () => {
    const compiled = compile(grammar);
    const mapper = create_grammar_mapper(grammar, compiled);
    const introspector = mapper.create_enhanced_introspector(TokenizerIntrospector, {});

    const input = "foo()";
    tokenize(input, compiled, introspector);

    // Check all positions
    for (let pos = 0; pos <= input.length; pos++) {
      const route = introspector.get_complete_route_to_position(pos);

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
              `${curr.from_name} → ${curr.to_name}`,
          );
        }
      }
    }
  });

  it("should correctly track depth without jumps", () => {
    const compiled = compile(grammar);
    const mapper = create_grammar_mapper(grammar, compiled);
    const introspector = mapper.create_enhanced_introspector(TokenizerIntrospector, {});

    const input = "foo()";
    tokenize(input, compiled, introspector);

    // Check depth tracking at each position
    for (let pos = 0; pos <= input.length; pos++) {
      const route = introspector.get_complete_route_to_position(pos);
      const depths = route.map((s) => s.depth);

      // Verify depths don't jump by more than 1
      for (let i = 1; i < depths.length; i++) {
        const depth_diff = depths[i] - depths[i - 1];
        // Depth can increase by 1 (push), decrease by any amount (pop), or stay same
        expect(depth_diff).toBeLessThanOrEqual(1);
      }
    }
  });

  it("should show the actual state transitions after probe resolution", () => {
    const compiled = compile(grammar);
    const mapper = create_grammar_mapper(grammar, compiled);
    const introspector = mapper.create_enhanced_introspector(TokenizerIntrospector, {});

    const input = "foo()";
    tokenize(input, compiled, introspector);

    const full_route = introspector.get_complete_route_to_position(input.length);

    const function_name_steps = full_route.filter(
      (step) => step.to_name === "function_name" || step.from_name === "function_name",
    );

    // We MUST have function_name in our route (it's where the function token is emitted)
    expect(function_name_steps.length).toBeGreaterThan(0);
  });

  it("should maintain correct state path sequence", () => {
    const compiled = compile(grammar);
    const mapper = create_grammar_mapper(grammar, compiled);
    const introspector = mapper.create_enhanced_introspector(TokenizerIntrospector, {});

    const input = "foo()";
    tokenize(input, compiled, introspector);

    // Get the full route
    const route = introspector.get_complete_route_to_position(input.length);

    // Extract state sequence
    const state_sequence: (string | undefined)[] = [];
    for (const step of route) {
      if (step.type === "START") {
        state_sequence.push(step.state_name);
      } else if (step.type === "PUSH") {
        state_sequence.push(step.to_name);
      } else if (step.type === "TRANSITION") {
        state_sequence.push(step.to_name);
      }
    }

    // Expected sequence for "foo()":
    // main → identifier_probe → function_name → function_body
    expect(state_sequence).toEqual(["main", "identifier_probe", "function_name", "function_body"]);
  });
});
