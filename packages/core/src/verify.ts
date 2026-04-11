import type { Grammar } from "./types";
import { resolveIncludes, normalizeGrammar } from "./compiler";

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
			ruleIndex?: number;
			from: "rule" | "fallback";
			message: string;
	  };

// Walk a grammar and report structural issues that would render it unreachable
// or unusable at runtime. Currently checks:
//   - transitions (rule.state / probe fallback) that point at undefined states
//   - states that are defined but never referenced from anywhere
//
// The grammar is passed through the same resolveIncludes + normalizeGrammar
// pipeline that `compile` uses so that states introduced via `include`,
// `extend`, or rule-sets are analysed alongside user-authored states.
export function verify(grammar: Grammar): VerifyIssue[] {
	const resolved = resolveIncludes(grammar);
	const normalized = normalizeGrammar(resolved);

	const issues: VerifyIssue[] = [];
	const stateNames = Object.keys(normalized.states);
	const definedStates = new Set(stateNames);

	// The first state in definition order is the tokenizer's entry point,
	// so it is implicitly reachable even without an explicit reference.
	const referenced = new Set<string>();
	if (stateNames.length > 0) {
		referenced.add(stateNames[0]);
	}

	for (const stateName of stateNames) {
		const state = normalized.states[stateName];

		if (state.fallback !== undefined) {
			if (!definedStates.has(state.fallback)) {
				issues.push({
					type: "invalid-transition",
					state: stateName,
					target: state.fallback,
					from: "fallback",
					message: `state "${stateName}" fallback references unknown state "${state.fallback}"`,
				});
			} else {
				referenced.add(state.fallback);
			}
		}

		const rules = state.rules ?? [];
		rules.forEach((rule, ruleIndex) => {
			if (rule.state === undefined) return;
			if (!definedStates.has(rule.state)) {
				issues.push({
					type: "invalid-transition",
					state: stateName,
					ruleIndex,
					target: rule.state,
					from: "rule",
					message: `state "${stateName}" rule ${ruleIndex} references unknown state "${rule.state}"`,
				});
			} else {
				referenced.add(rule.state);
			}
		});
	}

	for (const stateName of stateNames) {
		if (referenced.has(stateName)) continue;
		issues.push({
			type: "unused-state",
			state: stateName,
			message: `state "${stateName}" is defined but never referenced`,
		});
	}

	return issues;
}
