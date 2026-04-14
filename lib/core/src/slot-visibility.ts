// pushdown-reachability visibility analysis for slots.
//
// goal: for every rule that reads or writes a slot S, verify that S's owning
// state is on the stack on every path from the grammar root that reaches the
// rule's state. slot_set on a rule that pushes a target state X is checked
// in the post-push owners set (X is on the stack when the slot_set runs).
//
// algorithm: worklist over (state_id, owners_set) nodes where owners_set is
// the set of slot-declaring states currently on the stack (including the
// current top). edges:
//
//   - push X:        next = (X, owners ∪ {X if X declares slots})
//   - sideways → X:  next = (X, owners \ {current if current declares slots}
//                                    ∪ {X if X declares slots})
//   - no-op + state-change → X: same as sideways
//   - pure pop:      skipped. sound because the post-pop state is always
//                    reachable via a direct push from elsewhere with the
//                    same owners as the pre-push call (popping never adds
//                    to owners, only removes).
//
// nodes are deduplicated by (state_id, sorted_owners_csv). worst case
// 2^|slot-declaring states|, but in practice owner sets are small.
//
// limitations carried into v1:
//   - the analysis over-approximates by ignoring exact pop targets. for
//     normal grammars this is exact (post-pop owners = pre-push owners).
//     pathological grammars that rely on pop edges to reach distinct
//     contexts may go un-checked, but no real grammar has been seen to.
//   - non-determinism via probe / failed-probe paths is not modeled.
//     probes don't introduce new (state, owners) configurations because
//     the snapshot/restore in stage 6 keeps slot_values consistent.

import type { GrammarRule, GrammarState } from "./types";

interface ValidateArgs {
	grammar_label: string;
	state_names: string[];
	states: Record<string, GrammarState>;
	state_map: Map<string, number>;
	slot_id_of_name: Map<string, number>;
	slot_owner_of_id: Uint16Array;
	slot_name_of_id: string[];
}

// extract slot ids referenced by a rule's slot_when and slot_set blocks.
// names may be qualified ("owner.slot") or bare ("slot"); both resolve to
// the same global slot id.
function rule_slot_refs(
	rule: GrammarRule,
	slot_id_of_name: Map<string, number>,
): number[] {
	const refs: number[] = [];
	const collect = (key: string): void => {
		const slot_name = key.includes(".")
			? key.slice(key.indexOf(".") + 1)
			: key;
		const id = slot_id_of_name.get(slot_name);
		if (id !== undefined && !refs.includes(id)) refs.push(id);
	};
	if (rule.slot_when) {
		for (const k of Object.keys(rule.slot_when)) collect(k);
	}
	if (rule.slot_set) {
		for (const k of Object.keys(rule.slot_set)) collect(k);
	}
	return refs;
}

interface Classification {
	kind: "push" | "pop" | "sideways" | "noop";
	target?: number;
}

function classify_rule(
	rule: GrammarRule,
	state_map: Map<string, number>,
): Classification {
	if (rule.state && rule.exit) {
		return { kind: "sideways", target: state_map.get(rule.state) };
	}
	if (rule.state) {
		return { kind: "push", target: state_map.get(rule.state) };
	}
	if (rule.exit) return { kind: "pop" };
	return { kind: "noop" };
}

interface Node {
	state: number;
	owners: Set<number>;
}

function node_key(state: number, owners: Set<number>): string {
	const sorted = Array.from(owners).sort((a, b) => a - b);
	return `${state}|${sorted.join(",")}`;
}

export function validate_slot_visibility(args: ValidateArgs): void {
	const {
		grammar_label,
		state_names,
		states,
		state_map,
		slot_id_of_name,
		slot_owner_of_id,
		slot_name_of_id,
	} = args;

	if (slot_owner_of_id.length === 0) return;

	// states that declare at least one slot — needed to update owners on
	// push / sideways transitions.
	const states_with_slots = new Set<number>();
	for (let i = 0; i < slot_owner_of_id.length; i++) {
		states_with_slots.add(slot_owner_of_id[i]);
	}

	// initial node: root state with itself in owners if it declares slots.
	const root_id = 0;
	const root_owners = new Set<number>();
	if (states_with_slots.has(root_id)) root_owners.add(root_id);

	const visited = new Set<string>();
	const queue: Node[] = [];
	const enqueue = (state: number, owners: Set<number>): void => {
		const key = node_key(state, owners);
		if (visited.has(key)) return;
		visited.add(key);
		queue.push({ state, owners });
	};
	enqueue(root_id, root_owners);

	while (queue.length > 0) {
		const node = queue.shift()!;
		const state_name = state_names[node.state];
		const state_def = states[state_name];
		if (!state_def?.rules) continue;

		for (let rule_idx = 0; rule_idx < state_def.rules.length; rule_idx++) {
			const rule = state_def.rules[rule_idx];
			const refs = rule_slot_refs(rule, slot_id_of_name);
			const cls = classify_rule(rule, state_map);

			// when a rule is a push that targets a slot-declaring state X,
			// the slot_set runs after X is pushed, so X is in scope. for
			// `slot_set: { "X.kind": "..." }` to be valid, the visibility
			// check uses owners ∪ {X if declares slots}.
			let check_owners = node.owners;
			if (
				cls.kind === "push" &&
				cls.target !== undefined &&
				states_with_slots.has(cls.target) &&
				!check_owners.has(cls.target)
			) {
				check_owners = new Set(check_owners);
				check_owners.add(cls.target);
			}

			for (const slot_id of refs) {
				const owner = slot_owner_of_id[slot_id];
				if (!check_owners.has(owner)) {
					const slot_label = slot_name_of_id[slot_id];
					const owner_label = state_names[owner];
					throw new Error(
						`Grammar "${grammar_label}": rule ${rule_idx} in state "${state_name}" references slot "${slot_label}" but its owning state "${owner_label}" is not on the stack on every path that reaches "${state_name}". Either restructure the grammar so "${owner_label}" is always pushed before "${state_name}" is reachable, or move the slot to an enclosing state.`,
					);
				}
			}

			// expand to next node based on the rule's transition.
			if (cls.kind === "push" && cls.target !== undefined) {
				const next_owners = new Set(node.owners);
				if (states_with_slots.has(cls.target)) next_owners.add(cls.target);
				enqueue(cls.target, next_owners);
			} else if (cls.kind === "sideways" && cls.target !== undefined) {
				const next_owners = new Set(node.owners);
				if (states_with_slots.has(node.state)) {
					next_owners.delete(node.state);
				}
				if (states_with_slots.has(cls.target)) next_owners.add(cls.target);
				enqueue(cls.target, next_owners);
			} else if (cls.kind === "noop" && rule.state !== undefined) {
				// stack_op === 0 with a transition target — equivalent to
				// changing current_state without altering the stack.
				const target = state_map.get(rule.state);
				if (target !== undefined) {
					const next_owners = new Set(node.owners);
					if (states_with_slots.has(node.state)) {
						next_owners.delete(node.state);
					}
					if (states_with_slots.has(target)) next_owners.add(target);
					enqueue(target, next_owners);
				}
			}
			// pure pops: skipped. see file header for the soundness argument.
		}
	}
}
