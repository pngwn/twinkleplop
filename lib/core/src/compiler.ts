import type {
	Grammar,
	CompiledGrammar,
	PatternInfo,
	GrammarState,
	GrammarRule,
	Ruleset,
	IncludeEntry,
	ParamBinding,
} from "./types";
import {
	ASCII,
	DIGIT,
	LETTER,
	LOWER,
	UPPER,
	ALNUM,
	SPACE,
	WORD,
	HEX,
	PRINT,
	PUNCT,
	CONTROL,
} from "./constants";

// packed high bit in the stack_op slot of the transitions table. the slot
// originally stored values 0/1/2; the top bit is free. when set, it means
// "this emission seals a lexeme boundary", and the runtime coalescer will
// not fuse the emitted token with the previous one even if their types
// match. the mask recovers the raw 0/1/2 stack op.
export const SEAL_BIT = 1 << 7;
export const STACK_OP_MASK = SEAL_BIT - 1;

function clone_rules(rules: GrammarRule[] = []): GrammarRule[] {
	return rules.map((rule) => ({ ...rule }));
}

function to_array(value?: string | string[]): string[] {
	if (!value) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
}

// normalize an IncludeEntry | IncludeEntry[] | string | string[] to IncludeEntry[]
function to_include_array(value?: IncludeEntry | IncludeEntry[]): IncludeEntry[] {
	if (!value) return [];
	if (Array.isArray(value)) return value as IncludeEntry[];
	return [value as IncludeEntry];
}

// apply param bindings to a set of rules, substituting $param references.
// returns cloned rules with substitutions applied.
function substitute_params(
	rules: GrammarRule[],
	bindings: Record<string, ParamBinding>,
): GrammarRule[] {
	return rules.map((rule) => {
		const cloned: GrammarRule = { ...rule };

		// handle state param substitution
		if (typeof cloned.state === "string" && cloned.state.startsWith("$")) {
			const param_name = cloned.state.slice(1);
			const binding = bindings[param_name];
			if (binding === null) {
				// null binding: remove both state and exit from clone
				delete cloned.state;
				delete cloned.exit;
			} else if (typeof binding === "string") {
				cloned.state = binding;
			}
		}

		// handle token param substitution
		if (typeof cloned.token === "string" && cloned.token.startsWith("$")) {
			const param_name = cloned.token.slice(1);
			const binding = bindings[param_name];
			if (binding === null) {
				delete cloned.token;
			} else if (typeof binding === "string") {
				cloned.token = binding;
			}
		}

		return cloned;
	});
}

// instantiate a parameterized ruleset with given bindings.
// returns the flat rule list for this instantiation.
function instantiate_ruleset(
	name: string,
	bindings: Record<string, ParamBinding>,
	rulesets: Record<string, Ruleset>,
	flat_rulesets: Map<string, GrammarRule[]>,
): GrammarRule[] {
	const ruleset = rulesets[name];
	if (!ruleset || !ruleset.params) {
		throw new Error(
			`rule set "${name}" is not parameterized; remove the "with" binding`,
		);
	}

	const params = ruleset.params;

	// validate bindings: check for missing required params and unknown keys
	for (const [param_name, param_type] of Object.entries(params)) {
		const is_optional = (param_type as string).endsWith("?");
		if (!is_optional && !(param_name in bindings)) {
			throw new Error(
				`missing required param "${param_name}" when including rule set "${name}"`,
			);
		}
	}
	for (const key of Object.keys(bindings)) {
		if (!(key in params)) {
			throw new Error(
				`unknown param "${key}" when including rule set "${name}"`,
			);
		}
	}

	// resolve sub-includes from flat_rulesets (plain strings only for now)
	const sub_rules: GrammarRule[] = [];
	for (const entry of to_include_array(ruleset.include)) {
		if (typeof entry !== "string") {
			throw new Error(
				`rule set "${name}" has a parameterized sub-include, which is not supported`,
			);
		}
		const flat = flat_rulesets.get(entry);
		if (!flat) {
			throw new Error(`unknown rule set "${entry}" in rule set "${name}"`);
		}
		sub_rules.push(...flat);
	}

	const substituted = substitute_params(ruleset.rules, bindings);
	return [...sub_rules, ...substituted];
}

// flatten a ruleset's include chain into a single ordered rule list (DFS, cycle safe).
// parameterized rulesets (those with `params`) are skipped, they can only be instantiated
// via { set, with } entries in state or ruleset includes.
function flatten_rulesets(
	rulesets: Record<string, Ruleset>,
	state_names: Set<string>,
): Map<string, GrammarRule[]> {
	const result = new Map<string, GrammarRule[]>();
	const resolving: string[] = []; // ordered path for cycle reporting

	// identify all parameterized (template) rulesets
	const templates = new Set<string>(
		Object.entries(rulesets)
			.filter(([, rs]) => rs.params)
			.map(([n]) => n),
	);

	const resolve_ruleset = (name: string): GrammarRule[] => {
		const cached = result.get(name);
		if (cached) return cached;

		if (resolving.includes(name)) {
			const cycle_start = resolving.indexOf(name);
			const cycle_path = [...resolving.slice(cycle_start), name].join(" → ");
			throw new Error(`rule sets form a cycle: ${cycle_path}`);
		}

		const ruleset = rulesets[name];
		if (!ruleset) {
			throw new Error(`unknown rule set "${name}"`);
		}

		resolving.push(name);
		const flat: GrammarRule[] = [];

		for (const entry of to_include_array(ruleset.include)) {
			if (typeof entry !== "string") {
				throw new Error(
					`parameterized include ({ set, with }) is not allowed within a concrete rule set definition (in rule set "${name}")`,
				);
			}
			const include_name = entry;
			if (state_names.has(include_name)) {
				throw new Error(
					`"${include_name}" refers to a tokeniser state; include accepts rule-set names only`,
				);
			}
			if (!rulesets[include_name]) {
				throw new Error(
					`unknown rule set "${include_name}" in rule set "${name}"`,
				);
			}
			if (templates.has(include_name)) {
				throw new Error(
					`rule set "${include_name}" is parameterized; use { set: "${include_name}", with: { ... } } to provide bindings`,
				);
			}
			flat.push(...resolve_ruleset(include_name));
		}

		flat.push(...ruleset.rules);
		resolving.pop();
		result.set(name, flat);
		return flat;
	};

	for (const name of Object.keys(rulesets)) {
		// skip parameterized rulesets, they are instantiated on demand
		if (templates.has(name)) continue;
		resolve_ruleset(name);
	}

	return result;
}

// resolve `include` fields on states and rule sets into flat rule lists.
// must be called before normalize_grammar.
export function resolve_includes(grammar: Grammar): Grammar {
	const has_rulesets =
		grammar.rulesets && Object.keys(grammar.rulesets).length > 0;
	const has_state_includes = Object.values(grammar.states).some(
		(s) => s.include,
	);
	if (!has_rulesets && !has_state_includes) return grammar;

	const state_names = new Set(Object.keys(grammar.states));
	const rulesets = grammar.rulesets ?? {};
	const flat_rulesets = flatten_rulesets(rulesets, state_names);

	// identify all parameterized (template) rulesets
	const templates = new Set<string>(
		Object.entries(rulesets)
			.filter(([, rs]) => rs.params)
			.map(([n]) => n),
	);

	// track which ruleset names are actually referenced (for unused ruleset warning)
	const referenced_rulesets = new Set<string>();

	// record references within ruleset includes (plain strings only in concrete rulesets)
	for (const rs of Object.values(rulesets)) {
		for (const entry of to_include_array(rs.include)) {
			if (typeof entry === "string") {
				referenced_rulesets.add(entry);
			}
		}
	}

	const resolved_states: Record<string, GrammarState> = {};

	for (const [state_name, state] of Object.entries(grammar.states)) {
		const include_entries = to_include_array(state.include);
		if (include_entries.length === 0) {
			resolved_states[state_name] = state;
			continue;
		}

		const seen = new Set<string>();
		const effective_rules: GrammarRule[] = [];
		// track all included rules (including parameterized instantiations) for dead rule detection
		const all_included_rules: GrammarRule[] = [];
		// track include entry names for dead rule warning messages
		const include_names: string[] = [];

		for (const entry of include_entries) {
			if (typeof entry === "string") {
				// plain string include
				const include_name = entry;
				if (state_names.has(include_name)) {
					throw new Error(
						`"${include_name}" refers to a tokeniser state; include accepts rule-set names only`,
					);
				}
				if (!flat_rulesets.has(include_name)) {
					if (templates.has(include_name)) {
						throw new Error(
							`rule set "${include_name}" is parameterized; use { set: "${include_name}", with: { ... } } to provide bindings`,
						);
					}
					throw new Error(
						`unknown rule set "${include_name}" in include of state "${state_name}"`,
					);
				}
				if (seen.has(include_name)) {
					throw new Error(
						`duplicate include "${include_name}" in state "${state_name}"`,
					);
				}
				seen.add(include_name);
				referenced_rulesets.add(include_name);
				const flat = flat_rulesets.get(include_name) as GrammarRule[];
				effective_rules.push(...flat);
				all_included_rules.push(...flat);
				include_names.push(include_name);
			} else {
				// parameterized include: { set, with }
				const { set: set_name, with: with_bindings } = entry;
				if (!with_bindings) {
					// { set: "name" } without `with`, treat as error for parameterized, pass through for non param
					if (templates.has(set_name)) {
						throw new Error(
							`rule set "${set_name}" is parameterized; use { set: "${set_name}", with: { ... } } to provide bindings`,
						);
					}
					// non parameterized with no bindings, error (must include with `with` only for parameterized)
					throw new Error(
						`rule set "${set_name}" is not parameterized; use a plain string include instead of { set, with }`,
					);
				}
				if (!templates.has(set_name)) {
					// providing `with` bindings for a non parameterized ruleset
					if (!rulesets[set_name]) {
						throw new Error(
							`unknown rule set "${set_name}" in include of state "${state_name}"`,
						);
					}
					throw new Error(
						`rule set "${set_name}" is not parameterized; remove the "with" binding`,
					);
				}
				// duplicate detection: key on ruleset name only
				if (seen.has(set_name)) {
					throw new Error(
						`duplicate include "${set_name}" in state "${state_name}"`,
					);
				}
				seen.add(set_name);
				referenced_rulesets.add(set_name);
				const instantiated = instantiate_ruleset(set_name, with_bindings, rulesets, flat_rulesets);
				effective_rules.push(...instantiated);
				all_included_rules.push(...instantiated);
				include_names.push(set_name);
			}
		}

		const own_rules = state.rules ?? [];

		// dead rule detection: warn when a local rule's match pattern is already
		// claimed by an earlier included rule (simplified string equality check).
		for (const own_rule of own_rules) {
			if (own_rule.match === undefined) continue;
			const own_match = JSON.stringify(own_rule.match);
			for (let i = 0; i < all_included_rules.length; i++) {
				const inc_rule = all_included_rules[i];
				if (
					inc_rule.match !== undefined &&
					JSON.stringify(inc_rule.match) === own_match
				) {
					// find which include name this belongs to (best effort: use first include name)
					const warning_include_name = include_names[0] ?? "unknown";
					console.warn(
						`Grammar warning: rule in state "${state_name}" is shadowed by an earlier rule from included set "${warning_include_name}"`,
					);
					break;
				}
			}
		}

		effective_rules.push(...own_rules);

		if (effective_rules.length === 0) {
			throw new Error(
				`state "${state_name}" has no rules and no non-empty includes`,
			);
		}

		const { include, ...rest } = state;
		resolved_states[state_name] = { ...rest, rules: effective_rules };
	}

	// warn about rulesets defined but never referenced
	for (const name of Object.keys(rulesets)) {
		if (!referenced_rulesets.has(name)) {
			console.warn(`Grammar warning: rule set "${name}" is defined but never used`);
		}
	}

	const { rulesets: _rulesets, ...grammar_rest } = grammar;
	return { ...grammar_rest, states: resolved_states };
}

// expand group references and extend chains into concrete state definitions
export function normalize_grammar(grammar: Grammar): Grammar {
	const has_groups = Boolean(grammar.groups && Object.keys(grammar.groups).length);
	const has_extends = Object.values(grammar.states).some((state) => state.extend);
	if (!has_groups && !has_extends) {
		return grammar;
	}

	const group_cache = new Map<string, GrammarState>();
	const resolving = new Set<string>();

	const resolve_group = (group_name: string): GrammarState => {
		const cached = group_cache.get(group_name);
		if (cached) {
			return { ...cached, rules: clone_rules(cached.rules) };
		}

		const groups = grammar.groups || {};
		const group = groups[group_name];
		if (!group) {
			throw new Error(`Unknown grammar group "${group_name}"`);
		}

		if (resolving.has(group_name)) {
			throw new Error(`Circular grammar group dependency detected for "${group_name}"`);
		}
		resolving.add(group_name);

		let inherited_mode: GrammarState["mode"] | undefined;
		let inherited_fallback: string | undefined;
		const inherited_rules: GrammarRule[] = [];

		try {
			for (const parent_name of to_array(group.extend)) {
				const parent = resolve_group(parent_name);
				inherited_rules.push(...parent.rules!);
				if (inherited_mode === undefined && parent.mode !== undefined) {
					inherited_mode = parent.mode;
				}
				if (inherited_fallback === undefined && parent.fallback !== undefined) {
					inherited_fallback = parent.fallback;
				}
			}
		} finally {
			resolving.delete(group_name);
		}

		const group_rules = clone_rules(group.rules);
		const resolved: GrammarState = {
			rules: [...inherited_rules, ...group_rules],
			mode: group.mode ?? inherited_mode,
			fallback: group.fallback ?? inherited_fallback,
		};

		group_cache.set(group_name, {
			rules: clone_rules(resolved.rules),
			mode: resolved.mode,
			fallback: resolved.fallback,
		});

		return {
			rules: clone_rules(resolved.rules),
			mode: resolved.mode,
			fallback: resolved.fallback,
		};
	};

	const normalized_states: Record<string, GrammarState> = {};

	for (const [state_name, original_state] of Object.entries(grammar.states)) {
		const extends_list = to_array(original_state.extend);
		const inherited_rules: GrammarRule[] = [];
		let inherited_mode: GrammarState["mode"] | undefined;
		let inherited_fallback: string | undefined;

		for (const group_name of extends_list) {
			const group_state = resolve_group(group_name);
			inherited_rules.push(...group_state.rules!);
			if (inherited_mode === undefined && group_state.mode !== undefined) {
				inherited_mode = group_state.mode;
			}
			if (inherited_fallback === undefined && group_state.fallback !== undefined) {
				inherited_fallback = group_state.fallback;
			}
		}

		const { extend, include, rules = [], ...rest } = original_state;
		const normalized: GrammarState = {
			...rest,
			rules: [...inherited_rules, ...clone_rules(rules)],
		};

		if (normalized.mode === undefined && inherited_mode !== undefined) {
			normalized.mode = inherited_mode;
		}
		if (normalized.fallback === undefined && inherited_fallback !== undefined) {
			normalized.fallback = inherited_fallback;
		}

		normalized_states[state_name] = normalized;
	}

	return {
		name: grammar.name,
		states: normalized_states,
		groups: grammar.groups,
	};
}

// helper function to set character mapping
function set_char_mapping(
	char_maps: Uint16Array,
	state_id: number,
	char_code: number,
	rule_idx: number
): void {
	const index = state_id * 128 + char_code;
	// always use the first rule that matches a character
	// this gives us predictable precedence
	if (char_maps[index] === 65535) {
		char_maps[index] = rule_idx;
	}
}

// preprocess grammar to expand match_within rules into states
function preprocess_grammar(grammar: Grammar): Grammar {
	const processed_grammar: Grammar = {
		name: grammar.name,
		states: { ...grammar.states },
		groups: grammar.groups,
	};

	// track generated states
	const generated_states: Record<string, GrammarState> = {};
	let state_counter = 0;

	// process each state
	for (const [state_name, state] of Object.entries(processed_grammar.states)) {
		const processed_rules: GrammarRule[] = [];

		for (const rule of state.rules ?? []) {
			if (rule.match_within) {
				if ((rule.match_within as any).begin !== undefined) {
					throw new Error(
						`Grammar error in state "${state_name}" rule ${processed_rules.length}: ` +
						`match_within uses "start" not "begin". ` +
						`Change { begin: "..." } to { start: "..." }.`
					);
				}
				// generate a unique state name for the content matcher
				const content_state_name = `__match_within_${state_name}_${state_counter++}`;

				// replace match_within rule with a rule that enters the generated state
				processed_rules.push({
					match: rule.match_within.start,
					token: rule.token,
					state: content_state_name
				});

				// create the content state
				const content_rules: GrammarRule[] = [];

				// add escape handling if specified
				if (rule.match_within.escape) {
					content_rules.push({
						match: rule.match_within.escape,
						token: rule.token,
						state: `${content_state_name}_escape`
					});

					// create escape state that consumes one character and returns
					generated_states[`${content_state_name}_escape`] = {
						rules: [
							{
								range: [0, 127],
								token: rule.token,
								exit: true
							}
						]
					};
				}

				// add end delimiter rule
				content_rules.push({
					match: rule.match_within.end,
					token: rule.token,
					exit: true
				});

				// add default rule to consume any other character
				// when multiline is false, exclude \n (charCode 10) so strings don't span lines
				const content_range: [number, number] | [number, number][] =
					rule.match_within.multiline === false
						? [[0, 9], [11, 127]]
						: [0, 127];
				content_rules.push({
					range: content_range,
					token: rule.token
				});

				generated_states[content_state_name] = {
					rules: content_rules
				};
			} else {
				// keep non match_within rules as is
				processed_rules.push(rule);
			}
		}

		processed_grammar.states[state_name] = {
			...state,
			rules: processed_rules
		};
	}

	// add generated states to the grammar
	Object.assign(processed_grammar.states, generated_states);

	return processed_grammar;
}
export function define_grammar(grammar: Grammar): Grammar {
  return grammar;
}

export function compile(grammar: Grammar): CompiledGrammar {
	const resolved_grammar = resolve_includes(grammar);
	const normalized_grammar = normalize_grammar(resolved_grammar);
	// preprocess grammar to expand match_within rules
	const processed_grammar = preprocess_grammar(normalized_grammar);
	const state_names = Object.keys(processed_grammar.states);
	const state_map = new Map<string, number>();
	state_names.forEach((name, idx) => state_map.set(name, idx));

	// map token names to sequential IDs
	const token_type_set = new Set<string>();
	for (const name of state_names) {
		const state = processed_grammar.states[name];
		(state.rules ?? []).forEach((rule) => {
			if (rule.token) {
				token_type_set.add(rule.token);
			}
		});
	}
	const token_types = Array.from(token_type_set);
	const token_type_map = new Map<string, number>();
	token_types.forEach((type, idx) => token_type_map.set(type, idx));

	if (state_names.length > 65534) {
		throw new Error(
			`Grammar exceeds state limit: ${state_names.length} states (max 65534, including states generated by match_within).`
		);
	}

	const grammar_label = grammar.name ?? "unnamed";

	// warn about exit:true in the root state, there is no parent to return to
	const root_state_name = state_names[0];
	const root_state = processed_grammar.states[root_state_name];
	(root_state.rules ?? []).forEach((rule, rule_idx) => {
		if (rule.exit && !rule.state) {
			console.warn(
				`Grammar warning: rule ${rule_idx} in root state "${root_state_name}" ` +
				`has exit:true but there is no parent state to return to. ` +
				`This exit will be a no-op.`
			);
		}
	});

	// pre-allocate transitions and character maps
	const max_rules = 256;
	const transitions = new Uint16Array(state_names.length * max_rules * 3);
	transitions.fill(65535);

	// initialize char_maps with 65535 (no rule)
	const char_maps = new Uint16Array(state_names.length * 128);
	char_maps.fill(65535);

	const fallback_transitions = new Uint16Array(state_names.length * 3);
	fallback_transitions.fill(65535);

	const keywords = new Map();
	const patterns = new Map(); // state -> char -> Array<{codes, length, rule_idx}>
	const non_ascii_chars = new Map<number, Record<number, number>>(); // state -> object map: charCode -> rule_idx
	const boundary_rules = new Set<number>(); // track rules that require boundary checking
	// track which states are probe states based on state.mode property
	const probe_states = new Set<number>();
	// track fallback states for probe states
	const probe_fallbacks = new Map<number, number>();

	state_names.forEach((name) => {
		const state = processed_grammar.states[name];
		const state_id = state_map.get(name);
		if (state_id === undefined) {
			throw new Error(`State ${name} not found in state_map`);
		}

		// check if this state has mode: "probe"
		if (state.mode === "probe") {
			probe_states.add(state_id);
			// if probe state has a fallback, store it
			if (state.fallback) {
				const fallback_state_id = state_map.get(state.fallback);
				if (fallback_state_id === undefined) {
					throw new Error(
						`Grammar "${grammar.name ?? "unnamed"}": probe state "${name}" fallback references unknown state "${state.fallback}"`,
					);
				}
				probe_fallbacks.set(state_id, fallback_state_id);
			}
		}

		// build per state buckets for multi char patterns
		const state_buckets: (PatternInfo[] | null)[] = Array(128);
		for (let i = 0; i < 128; i++) state_buckets[i] = null;

		state.rules!.forEach((rule, rule_idx) => {
			let next_state = 65535;
			let stack_op = 0;

			// handle state transitions and exits
			if (rule.state && rule.exit) {
				// sideways transition: exit current state and enter new state
				const sid = state_map.get(rule.state);
				if (sid === undefined) {
					throw new Error(
						`Grammar "${grammar.name ?? "unnamed"}": state "${name}" rule ${rule_idx} references unknown state "${rule.state}"`,
					);
				}
				next_state = sid;
				stack_op = 2; // use exit operation, but with a target state
			} else if (rule.state) {
				// regular push transition
				const sid = state_map.get(rule.state);
				if (sid === undefined) {
					throw new Error(
						`Grammar "${grammar.name ?? "unnamed"}": state "${name}" rule ${rule_idx} references unknown state "${rule.state}"`,
					);
				}
				next_state = sid;
				stack_op = 1;
			} else if (rule.exit) {
				// regular pop/exit
				stack_op = 2;
			}

			let token_type = 65535;
			if (rule.token) {
				const mapped_type = token_type_map.get(rule.token);
				if (mapped_type !== undefined) {
					token_type = mapped_type;
				}
			}

			// a rule seals (forces a lexeme boundary on emission) when it is
			// boundary-checked or the author opted in explicitly. structural
			// transitions (push/pop/sideways) do NOT automatically seal: most
			// grammars use single-char push rules whose emission is meant to
			// coalesce with a following body (e.g. `E` prefix + `LSE`
			// continuation, opening quote + string body). grammars that need
			// a push/pop to seal opt in with `seal: true`.
			//
			// multi-char "lexeme atom" sealing is enforced at runtime by the
			// tokenizer — it checks whether the emission came from a
			// multi-char bucket match. that means a rule like
			// `match: [...OP_4CHAR, "?"]` seals only when one of the longer
			// alternatives actually fires, not when the bare `?` matches.
			//
			// the seal flag rides in the high bit of the stack_op slot so the
			// runtime can gate coalescing without widening the transitions
			// array.
			const seal = rule.seal === true || rule.boundary === true;
			const stack_op_packed = seal ? stack_op | SEAL_BIT : stack_op;

			const t_base = ((state_id << 8) + rule_idx) * 3; // optimize multiplication
			transitions[t_base] = next_state;
			transitions[t_base + 1] = token_type;
			transitions[t_base + 2] = stack_op_packed;

			// handle patterns with smart validation
			if (rule.match) {
				const matches = Array.isArray(rule.match) ? rule.match : [rule.match];
				for (const match of matches) {
					// handle symbol constants
					if (match === ASCII) {
						// all ASCII characters (0-127)
						for (let i = 0; i < 128; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
					} else if (match === DIGIT) {
						// digits 0-9
						for (let i = 48; i <= 57; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
					} else if (match === LETTER) {
						// letters a-z, A-Z
						for (let i = 65; i <= 90; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
						for (let i = 97; i <= 122; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
					} else if (match === LOWER) {
						// lowercase letters a-z
						for (let i = 97; i <= 122; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
					} else if (match === UPPER) {
						// uppercase letters A-Z
						for (let i = 65; i <= 90; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
					} else if (match === ALNUM) {
						// alphanumeric: a-z, A-Z, 0-9
						for (let i = 48; i <= 57; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
						for (let i = 65; i <= 90; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
						for (let i = 97; i <= 122; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
					} else if (match === SPACE) {
						// whitespace: space, tab, newline, carriage return
						const spaces = [32, 9, 10, 13];
						for (const i of spaces) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
					} else if (match === WORD) {
						// word characters: a-z, A-Z, 0-9, _
						for (let i = 48; i <= 57; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
						for (let i = 65; i <= 90; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
						for (let i = 97; i <= 122; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
						// underscore
						set_char_mapping(char_maps, state_id, 95, rule_idx);
					} else if (match === HEX) {
						// hex digits: 0-9, a-f, A-F
						for (let i = 48; i <= 57; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
						for (let i = 65; i <= 70; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
						for (let i = 97; i <= 102; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
					} else if (match === PRINT) {
						// printable ASCII: 32-126
						for (let i = 32; i <= 126; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
					} else if (match === PUNCT) {
						// ASCII punctuation
						const punct_ranges = [
							[33, 47], // ! " # $ % & ' ( ) * + , - . /
							[58, 64], // : ; < = > ? @
							[91, 96], // [ \ ] ^ _ `
							[123, 126], // { | } ~
						];
						for (const [start, end] of punct_ranges) {
							for (let i = start; i <= end; i++) {
								set_char_mapping(char_maps, state_id, i, rule_idx);
							}
						}
					} else if (match === CONTROL) {
						// control characters: 0-31, 127
						for (let i = 0; i <= 31; i++) {
							set_char_mapping(char_maps, state_id, i, rule_idx);
						}
						set_char_mapping(char_maps, state_id, 127, rule_idx);
					} else if (typeof match === "string") {
						if (match.length === 1) {
							// single character
							const code = match.charCodeAt(0);
							if (code < 128) {
								set_char_mapping(char_maps, state_id, code, rule_idx);
								// track if this rule requires boundary checking
								if (rule.boundary) {
									boundary_rules.add(state_id * 256 + rule_idx);
								}
							} else {
								// non ASCII character
								if (!non_ascii_chars.has(state_id)) {
									non_ascii_chars.set(state_id, Object.create(null));
								}
								const state_non_ascii = non_ascii_chars.get(state_id)!;
								if (state_non_ascii[code] !== undefined) {
									throw new Error(
										`Grammar validation error in state "${name}": ` +
											`Multiple rules match non-ASCII character '${match}' (code: ${code}). ` +
											`Rule ${state_non_ascii[code]} and rule ${rule_idx} both match this character.`
									);
								}
								state_non_ascii[code] = rule_idx;
								// track if this rule requires boundary checking
								if (rule.boundary) {
									boundary_rules.add(state_id * 256 + rule_idx);
								}
							}
						} else if (match.length > 1) {
							// multi character pattern
							const first_char = match.charCodeAt(0);
							if (first_char < 128) {
								// store pattern
								const codes = new Uint16Array(match.length);
								for (let i = 0; i < match.length; i++) {
									codes[i] = match.charCodeAt(i);
								}

								const info: PatternInfo = {
									codes,
									length: match.length,
									rule_idx,
									boundary: rule.boundary,
								};

								// add to the appropriate bucket
								if (!state_buckets[first_char]) {
									state_buckets[first_char] = [];
								}
								state_buckets[first_char]!.push(info);

								// for multi char patterns, we don't set char_map
								// they are only matched through the pattern bucket mechanism
								// the char_map should only be set for single character matches
							}
						}
					}
				}
			}

			// handle ranges
			if (rule.range) {
				const ranges = Array.isArray(rule.range[0]) ? rule.range : [rule.range];

				for (const range of ranges as Array<
					[string | number, string | number]
				>) {
					const start =
						typeof range[0] === "string" ? range[0].charCodeAt(0) : range[0];
					const end =
						typeof range[1] === "string" ? range[1].charCodeAt(0) : range[1];

					for (let code = start; code <= end; code++) {
						if (code < 128) {
							set_char_mapping(char_maps, state_id, code, rule_idx);
						} else {
							if (!non_ascii_chars.has(state_id)) {
								non_ascii_chars.set(state_id, Object.create(null));
							}
							const state_non_ascii = non_ascii_chars.get(state_id)!;
							if (state_non_ascii[code] !== undefined) {
								throw new Error(
									`Grammar validation error in state "${name}": ` +
										`Multiple rules match character with code ${code} in range. ` +
										`Rule ${state_non_ascii[code]} and rule ${rule_idx} both match this character.`
								);
							}
							state_non_ascii[code] = rule_idx;
						}
					}
				}
			}

			// handle 'any' for matching any character (fallback)
			if (rule.any) {
				// mark all unmapped characters
				for (let c = 0; c < 128; c++) {
					if (char_maps[state_id * 128 + c] === 65535) {
						char_maps[state_id * 128 + c] = rule_idx;
					}
				}
				const idx = state_id * 3;
				fallback_transitions[idx] = next_state;
				fallback_transitions[idx + 1] = token_type;
				fallback_transitions[idx + 2] = stack_op_packed;
			}
		});

		// sort each bucket by descending length to enable first fit longest match
		let has_any = false;
		for (let i = 0; i < 128; i++) {
			if (state_buckets[i] && state_buckets[i]!.length > 0) {
				state_buckets[i]!.sort((a, b) => b.length - a.length);
				has_any = true;
			}
		}
		if (has_any) patterns.set(state_id, state_buckets);
	});


	// build a compact probe mask for hot path lookup
	const probe_mask = new Uint8Array(state_names.length);
	probe_states.forEach((id) => {
		probe_mask[id] = 1;
	});


	return {
		states: state_map,
		transitions,
		char_maps,
		keywords,
		token_types,
		patterns: patterns,
		fallback_transitions,
		non_ascii_chars: non_ascii_chars,
		probe_states: probe_states,
		probe_mask,
		probe_fallbacks: probe_fallbacks,
		boundary_rules: boundary_rules.size > 0 ? boundary_rules : undefined,
	};
}
