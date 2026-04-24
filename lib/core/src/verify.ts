import type { Grammar } from "./types";

export type VerifyIssue =
  | {
      type: "unused-state";
      state: string;
      message: string;
    }
  | {
      type: "invalid-transition";
      state: string;
      target: string;
      rule_index?: number;
      from: "rule" | "fallback";
      message: string;
    };

// walk a grammar and report structural issues that would render it unreachable
// or unusable at runtime. currently checks:
//   - transitions (rule.state / probe fallback) that point at undefined states
//   - states that are defined but never referenced from anywhere
export function verify(grammar: Grammar): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  const state_names = Object.keys(grammar.states);
  const defined_states = new Set(state_names);

  // the first state in definition order is the tokenizer's entry point,
  // so it is implicitly reachable even without an explicit reference.
  const referenced = new Set<string>();
  if (state_names.length > 0) {
    referenced.add(state_names[0]);
  }

  for (const state_name of state_names) {
    const state = grammar.states[state_name];

    if (state.fallback !== undefined) {
      if (!defined_states.has(state.fallback)) {
        issues.push({
          type: "invalid-transition",
          state: state_name,
          target: state.fallback,
          from: "fallback",
          message: `state "${state_name}" fallback references unknown state "${state.fallback}"`,
        });
      } else {
        referenced.add(state.fallback);
      }
    }

    const rules = state.rules ?? [];
    rules.forEach((rule, rule_index) => {
      if (rule.state === undefined) return;
      if (!defined_states.has(rule.state)) {
        issues.push({
          type: "invalid-transition",
          state: state_name,
          rule_index,
          target: rule.state,
          from: "rule",
          message: `state "${state_name}" rule ${rule_index} references unknown state "${rule.state}"`,
        });
      } else {
        referenced.add(rule.state);
      }
    });
  }

  for (const state_name of state_names) {
    if (referenced.has(state_name)) continue;
    issues.push({
      type: "unused-state",
      state: state_name,
      message: `state "${state_name}" is defined but never referenced`,
    });
  }

  return issues;
}
