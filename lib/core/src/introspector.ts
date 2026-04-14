// introspector class for debugging tokenization

import type {
	CompiledGrammar,
	IntrospectorOptions,
	IntrospectorEvent,
	TokenInfo,
	InputContext,
	StateInfo,
	RouteStep,
	CompleteState,
	TokenHistory,
	Report,
	GrammarMapper,
	StateSession,
} from "./types";

export class TokenizerIntrospector {
	options: IntrospectorOptions;
	history: IntrospectorEvent[] = [];
	tokens: TokenInfo[] = [];
	state_transitions: IntrospectorEvent[] = [];
	rule_matches: IntrospectorEvent[] = [];
	probe_history: IntrospectorEvent[] = [];
	input: string = "";
	compiled_grammar: CompiledGrammar | null = null;

	initial_state: number = 0;
	private state_name_lookup: Map<string, number> | null = null;

	// state session tracking
	state_sessions: StateSession[] = [];
	current_state_session: StateSession | null = null;
	state_session_stack: StateSession[] = [];

	constructor(options: IntrospectorOptions = {}) {
		this.options = {
			log: null,
			collect_history: true,
			max_history_size: 10000,
			...options,
		};

		this.reset();
	}

	reset(): void {
		this.history = [];
		this.tokens = [];
		this.state_transitions = [];
		this.rule_matches = [];
		this.probe_history = [];
		this.input = "";
		this.compiled_grammar = null;
		this.state_sessions = [];
		this.current_state_session = null;
		this.state_session_stack = [];
		this.state_name_lookup = null;
	}

	init({
		input,
		compiled_grammar,
		initial_state,
	}: {
		input: string;
		compiled_grammar: CompiledGrammar;
		initial_state: number;
	}): void {
		this.input = input;
		this.compiled_grammar = compiled_grammar;
		this.initial_state = initial_state;
		this.state_name_lookup = null;

		// initialize first state session
		this.current_state_session = {
			state_name: this._get_state_name(initial_state),
			state_index: initial_state,
			entry_position: 0,
			characters_processed: 0,
			rules_applied: new Map(),
			is_probe: false,
			depth: 0,
		};
		this.state_sessions.push(this.current_state_session);

		this._log("INIT", {
			input_length: input.length,
			initial_state: this._get_state_name(initial_state),
		});
	}

	before_char({
		pos,
		char,
		char_str,
		current_state,
		stack_ptr,
		state_stack,
		probe_mode,
	}: {
		pos: number;
		char: number;
		char_str: string;
		current_state: number;
		stack_ptr: number;
		state_stack: Uint16Array | number[];
		probe_mode?: boolean;
	}): void {
		// track character processing in current state session
		// don't count EOF (NaN from charCodeAt beyond string length)
		if (this.current_state_session && !isNaN(char)) {
			this.current_state_session.characters_processed++;
		}

		// build the full state path (stack + current)
		const full_state_stack = [];
		for (let i = 0; i < stack_ptr; i++) {
			full_state_stack.push(state_stack[i]);
		}
		full_state_stack.push(current_state);

		const event: IntrospectorEvent = {
			type: "BEFORE_CHAR",
			pos,
			char,
			char_str,
			current_state: this._get_state_name(current_state),
			current_state_index: current_state,
			stack_depth: stack_ptr,
			state_stack: Array.from(state_stack.slice(0, stack_ptr)).map((s) =>
				this._get_state_name(s)
			),
			state_stack_indices: Array.from(state_stack.slice(0, stack_ptr)),
			full_state_path: full_state_stack.map((s) => this._get_state_name(s)),
			full_state_indices: full_state_stack,
			probe_mode,
			input_context: this._get_input_context(pos),
		};

		this._add_to_history(event);
		this._log("BEFORE_CHAR", event);
	}

	matched_rule({
		char_class,
		matched_length,
		transition,
		token_type,
		stack_op,
		current_state,
		pos,
		probe_mode,
	}: {
		char_class: number;
		matched_length: number;
		transition: number;
		token_type: number;
		stack_op: number;
		current_state: number;
		pos: number;
		probe_mode?: boolean;
	}): void {
		const rule_name = this._get_rule_name(current_state, char_class);

		// track rule usage in state session
		// for probe states, only track the rule that causes the transition
		if (this.current_state_session) {
			if (this.current_state_session.is_probe) {
				// for probe states, only track if this rule causes a state change
				if (transition !== 65535 && transition !== current_state) {
					this.current_state_session.rules_applied.set(rule_name, 1);
				}
			} else if (!probe_mode) {
				// for normal states, track all rules that keep us in the same state
				if (transition === 65535 || transition === current_state) {
					const count = this.current_state_session.rules_applied.get(rule_name) || 0;
					this.current_state_session.rules_applied.set(rule_name, count + 1);
				}
			}
		}

		const event: IntrospectorEvent = {
			type: "MATCHED_RULE",
			rule_index: char_class,
			rule_name: rule_name,
			matched_length,
			transition: transition !== 65535 ? this._get_state_name(transition) : null,
			token_type: token_type !== 65535 ? this._get_token_name(token_type) : null,
			stack_op: this._get_stack_op_name(stack_op),
			current_state: this._get_state_name(current_state),
			pos,
			probe_mode,
		};

		this._add_to_history(event);
		this._log("MATCHED_RULE", event);
		this.rule_matches.push(event);
	}

	emitted_token({
		token_type,
		token_name,
		start,
		end,
		text,
		token_index,
		is_fallback,
		is_non_ascii,
	}: {
		token_type: number;
		token_name: string;
		start: number;
		end: number;
		text?: string;
		token_index: number;
		is_fallback?: boolean;
		is_non_ascii?: boolean;
	}): void {
		const token: TokenInfo = {
			type: "EMITTED_TOKEN",
			token_type,
			token_name,
			start,
			end,
			value: text || this.input.substring(start, end),
			token_index,
			is_fallback: is_fallback || false,
			is_non_ascii: is_non_ascii || false,
		};

		this._add_to_history(token);
		this._log("EMITTED_TOKEN", token);
		this.tokens.push(token);
	}

	extended_token({
		token_type,
		old_end,
		new_end,
		token_index,
	}: {
		token_type: number;
		old_end: number;
		new_end: number;
		token_index: number;
	}): void {
		const event: IntrospectorEvent = {
			type: "EXTENDED_TOKEN",
			token_type: this._get_token_name(token_type),
			old_end,
			new_end,
			token_index,
		};

		this._add_to_history(event);
		this._log("EXTENDED_TOKEN", event);

		// update the token in our tokens array
		if (this.tokens[token_index]) {
			this.tokens[token_index].end = new_end;
			// update the value to include the extended text
			this.tokens[token_index].value = this.input.substring(
				this.tokens[token_index].start,
				new_end
			);
		}
	}

	pushed_state({
		from_state,
		to_state,
		stack_ptr,
		pos,
		slot_snapshot,
	}: {
		from_state: number;
		to_state: number;
		stack_ptr: number;
		pos?: number;
		slot_snapshot?: Uint8Array;
	}): void {
		const transition: IntrospectorEvent = {
			type: "PUSHED_STATE",
			from_state: this._get_state_name(from_state),
			from_state_index: from_state,
			to_state: this._get_state_name(to_state),
			to_state_index: to_state,
			stack_depth: stack_ptr,
			pos: pos,
			slot_snapshot: this._capture_slots(slot_snapshot),
		};

		this._add_to_history(transition);
		this._log("PUSHED_STATE", transition);
		this.state_transitions.push(transition);

		// start new state session
		if (this.current_state_session) {
			this.state_session_stack.push(this.current_state_session);
		}

		// check if the destination state is a probe state
		const is_probe_state = this._is_probe_state(to_state);

		this.current_state_session = {
			state_name: this._get_state_name(to_state),
			state_index: to_state,
			entry_position: pos || 0,
			characters_processed: 0,
			rules_applied: new Map(),
			is_probe: is_probe_state,
			depth: stack_ptr,
		};
		this.state_sessions.push(this.current_state_session);
	}

	popped_state({
		from_state,
		to_state,
		stack_ptr,
		pos,
		slot_snapshot,
	}: {
		from_state: number;
		to_state: number;
		stack_ptr: number;
		pos?: number;
		slot_snapshot?: Uint8Array;
	}): void {
		// end current state session
		if (this.current_state_session) {
			this.current_state_session.exit_position = pos;
			this.current_state_session = this.state_session_stack.pop() || null;
		}

		const transition: IntrospectorEvent = {
			type: "POPPED_STATE",
			from_state: this._get_state_name(from_state),
			from_state_index: from_state,
			to_state: this._get_state_name(to_state),
			to_state_index: to_state,
			stack_depth: stack_ptr,
			pos: pos,
			slot_snapshot: this._capture_slots(slot_snapshot),
		};

		this._add_to_history(transition);
		this._log("POPPED_STATE", transition);
		this.state_transitions.push(transition);
	}

	// stage 8: emitted when a rule's slot_set updates fire. captures the
	// post-update slot values so debug traces can show how each slot
	// evolves rule-by-rule.
	slot_write({
		state,
		rule_idx,
		pos,
		slot_snapshot,
	}: {
		state: number;
		rule_idx: number;
		pos?: number;
		slot_snapshot?: Uint8Array;
	}): void {
		const event: IntrospectorEvent = {
			type: "SLOT_WRITE",
			current_state: this._get_state_name(state),
			current_state_index: state,
			rule_index: rule_idx,
			rule_name: this._get_rule_name(state, rule_idx),
			pos: pos,
			slot_snapshot: this._capture_slots(slot_snapshot),
		};
		this._add_to_history(event);
		this._log("SLOT_WRITE", event);
	}

	// decode raw slot_values into a name-keyed snapshot the user can read.
	// returns undefined when the grammar declares no slots or the caller
	// didn't supply a buffer (slot-free grammar pays no introspection cost).
	private _capture_slots(
		slot_values: Uint8Array | undefined,
	): Record<string, boolean | number | string> | undefined {
		if (!slot_values || !this.compiled_grammar) return undefined;
		const slot_count = this.compiled_grammar.slot_count;
		if (slot_count === 0) return undefined;
		const mapper = this.options.grammar_mapper;
		const result: Record<string, boolean | number | string> = {};
		for (let i = 0; i < slot_count; i++) {
			const value = slot_values[i];
			const name =
				mapper?.slot_name(i) ??
				this.compiled_grammar.slot_name_of_id?.[i] ??
				`slot_${i}`;
			if (mapper) {
				result[name] = mapper.decode_slot_value(i, value);
			} else {
				// fall back to raw decoding when no mapper is attached.
				const enum_values =
					this.compiled_grammar.slot_enum_values?.[i];
				const type = this.compiled_grammar.slot_type_of_id?.[i] ?? 1;
				if (enum_values) {
					result[name] = enum_values[value] ?? value;
				} else if (type === 0) {
					result[name] = value !== 0;
				} else {
					result[name] = value;
				}
			}
		}
		return result;
	}

	transitioned_state({
		from_state,
		to_state,
		rule_name,
		token_emitted,
		pos,
	}: {
		from_state: number;
		to_state: number;
		rule_name?: string | null;
		token_emitted?: boolean;
		pos?: number;
	}): void {
		// handle state session for direct transitions (no push/pop)
		if (from_state !== to_state) {
			// end current session and start new one
			if (this.current_state_session) {
				this.current_state_session.exit_position = pos;
			}
			this.current_state_session = {
				state_name: this._get_state_name(to_state),
				state_index: to_state,
				entry_position: pos || 0,
				characters_processed: 0,
				rules_applied: new Map(),
				is_probe: false,
				depth: this.state_session_stack.length,
			};
			this.state_sessions.push(this.current_state_session);
		}

		const transition: IntrospectorEvent = {
			type: "TRANSITIONED_STATE",
			from_state: this._get_state_name(from_state),
			from_state_index: from_state,
			to_state: this._get_state_name(to_state),
			to_state_index: to_state,
			rule_name: rule_name || undefined,
			token_emitted: token_emitted || false,
			pos: pos,
		};

		this._add_to_history(transition);
		this._log("TRANSITIONED_STATE", transition);
		this.state_transitions.push(transition);
	}

	enter_probe_mode({
		char_class,
		pos,
		current_state,
		stack_ptr,
	}: {
		char_class: number;
		pos: number;
		current_state: number;
		stack_ptr: number;
	}): void {
		// mark current state session as probe/ephemeral
		if (this.current_state_session) {
			this.current_state_session.is_probe = true;
		}

		const event: IntrospectorEvent = {
			type: "ENTER_PROBE",
			rule_index: char_class,
			pos,
			current_state: this._get_state_name(current_state),
			stack_depth: stack_ptr,
		};

		this._add_to_history(event);
		this._log("ENTER_PROBE", event);
		this.probe_history.push(event);
	}

	exit_probe_mode({
		success,
		reset_pos,
		current_state,
		reset_state,
		reason,
		pos,
	}: {
		success: boolean;
		reset_pos: number;
		current_state?: number;
		reset_state?: number;
		reason?: string;
		pos?: number;
	}): void {
		const event: IntrospectorEvent = {
			type: "EXIT_PROBE",
			success,
			reset_pos,
			current_state:
				current_state !== undefined
					? this._get_state_name(current_state)
					: undefined,
			reset_state:
				reset_state !== undefined && reset_state !== null
					? this._get_state_name(reset_state)
					: undefined,
			reason,
			pos,
		};

		this._add_to_history(event);
		this._log("EXIT_PROBE", event);
		this.probe_history.push(event);
	}

	fallback_match({
		token_type,
		pos,
		current_state,
	}: {
		token_type: number;
		pos: number;
		current_state: number;
	}): void {
		const event: IntrospectorEvent = {
			type: "FALLBACK_MATCH",
			token_type: this._get_token_name(token_type),
			pos,
			current_state: this._get_state_name(current_state),
		};

		this._add_to_history(event);
		this._log("FALLBACK_MATCH", event);
	}

	non_ascii_match({
		char,
		token_type,
		pos,
		current_state,
	}: {
		char: number;
		token_type: number;
		pos: number;
		current_state: number;
	}): void {
		const event: IntrospectorEvent = {
			type: "NON_ASCII_MATCH",
			char,
			char_str: String.fromCharCode(char),
			token_type: this._get_token_name(token_type),
			pos,
			current_state: this._get_state_name(current_state),
		};

		this._add_to_history(event);
		this._log("NON_ASCII_MATCH", event);
	}

	complete({
		token_count,
		final_state,
		final_stack_ptr,
	}: {
		token_count: number;
		final_state: number;
		final_stack_ptr: number;
	}): void {
		const event: IntrospectorEvent = {
			type: "COMPLETE",
			token_count,
			final_state: this._get_state_name(final_state),
			final_stack_depth: final_stack_ptr,
		};

		this._add_to_history(event);
		this._log("COMPLETE", event);
	}

	// additional optional methods for extended debugging
	resolved_token(params: any): void {
		const event: IntrospectorEvent = {
			type: "RESOLVED_TOKEN",
			...params,
		};
		this._add_to_history(event);
		this._log("RESOLVED_TOKEN", event);
	}

	probe_failed(params: any): void {
		const event: IntrospectorEvent = {
			type: "PROBE_FAILED",
			...params,
		};
		this._add_to_history(event);
		this._log("PROBE_FAILED", event);
	}

	no_match(params: any): void {
		const event: IntrospectorEvent = {
			type: "NO_MATCH",
			...params,
		};
		this._add_to_history(event);
		this._log("NO_MATCH", event);
	}

	skipped_failed_probe(params: any): void {
		const event: IntrospectorEvent = {
			type: "SKIPPED_FAILED_PROBE",
			...params,
		};
		this._add_to_history(event);
		this._log("SKIPPED_FAILED_PROBE", event);
	}

	using_alternative_rule(params: any): void {
		const event: IntrospectorEvent = {
			type: "USING_ALTERNATIVE_RULE",
			...params,
		};
		this._add_to_history(event);
		this._log("USING_ALTERNATIVE_RULE", event);
	}

	// get complete tokenizer state at a specific position
	get_complete_state_at_position(pos: number): CompleteState {
		const state = this.get_state_at_position(pos);
		const token = this.get_token_at_position(pos);
		const rules_applied = this.get_rules_applied_at(pos);
		const state_transitions = this.get_state_transitions_at_position(pos);
		const all_events_at_pos = this.get_all_events_at_position(pos);

		// get all events up to and including this position
		const events_up_to_pos = this.history.filter((e) => !e.pos || e.pos <= pos);

		// get the last few events for context
		const recent_events = events_up_to_pos.slice(-10);

		return {
			position: pos,
			char: pos < this.input.length ? this.input[pos] : null,
			context: this._get_input_context(pos),
			state: {
				current: state.current_state,
				stack: state.state_stack,
				full_path: state.full_path,
				depth: state.state_stack.length,
			},
			current_token: token || null,
			rules_matched: rules_applied,
			state_transitions_at_position: state_transitions,
			all_events_at_position: all_events_at_pos,
			recent_history: recent_events,
			total_events_processed: events_up_to_pos.length,
		};
	}

	// get the state path as a string (e.g., "main -> string -> escape")
	get_state_path_at_position(pos: number): string {
		const state = this.get_state_at_position(pos);
		if ((this.options as any).grammar_mapper) {
			return (this.options as any).grammar_mapper.get_state_path(state.full_path);
		}
		return state.full_path.map((s) => this._get_state_name(s)).join(" → ");
	}

	// get the latest route taken to reach a position (handles probe re-processing)
	get_latest_route_to_position(pos: number): RouteStep[] {
		// map to track the latest route step at each position
		const latest_steps_at_position = new Map<number, RouteStep>();
		let current_state = this.initial_state;
		let state_stack: number[] = [];
		let stack_ptr = 0;
		let last_state = current_state;
		let last_matched_rule: string | number | null = null;
		let last_token_emitted = false;

		// track initial state
		latest_steps_at_position.set(0, {
			type: "START",
			state: current_state,
			state_name: this._get_state_name(current_state),
			position: 0,
			depth: 0,
		});

		for (const event of this.history) {
			const event_pos = event.pos !== undefined && event.pos !== null ? event.pos : 0;

			// skip events that are beyond our target position
			if (event_pos > pos) continue;

			// track the last matched rule and token emission
			if (event.type === "MATCHED_RULE") {
				last_matched_rule = event.rule_name || event.rule_index || null;
				last_token_emitted = !!event.token_type;
			} else if (event.type === "EMITTED_TOKEN") {
				last_token_emitted = true;
			}

			if (event.type === "PUSHED_STATE") {
				// get the actual from state from the event, or use last_state as fallback
				const from_state = this._resolve_state(
					event.from_state_index,
					event.from_state,
					last_state
				);

				// push current state to stack and move to new state
				state_stack[stack_ptr] = from_state;
				stack_ptr++;
				const to_state = this._resolve_state(
					event.to_state_index,
					event.to_state,
					current_state
				);
				current_state = to_state;

				// replace any existing step at this position
				const step = {
					type: "PUSH" as const,
					from: from_state,
					from_name: this._get_state_name(from_state),
					to: to_state,
					to_name: this._get_state_name(to_state),
					position: event_pos,
					depth: stack_ptr,
					rule: last_matched_rule,
					token_emitted: last_token_emitted,
				};

				latest_steps_at_position.set(event_pos, step);
				last_state = current_state;
				last_matched_rule = null;
				last_token_emitted = false;
			} else if (event.type === "POPPED_STATE") {
				// pop state from stack
				if (stack_ptr > 0) {
					stack_ptr--;
					const popped_from = current_state;
					const fallback_candidate = state_stack[Math.max(0, stack_ptr - 1)];
					current_state = this._resolve_state(
						event.to_state_index,
						event.to_state,
						fallback_candidate !== undefined ? fallback_candidate : current_state
					);

					// only add route step if the state actually changed
					if (popped_from !== current_state) {
						latest_steps_at_position.set(event_pos, {
							type: "POP",
							from: popped_from,
							from_name: this._get_state_name(popped_from),
							to: current_state,
							to_name: this._get_state_name(current_state),
							position: event_pos,
							depth: stack_ptr,
							rule: last_matched_rule,
							token_emitted: last_token_emitted,
						});
						last_state = current_state;
						last_matched_rule = null;
						last_token_emitted = false;
					}
				}
			} else if (event.type === "TRANSITIONED_STATE") {
				// direct state transition (no push/pop)
				const to_state = this._resolve_state(
					event.to_state_index,
					event.to_state,
					current_state
				);

				// only add if state actually changed
				if (current_state !== to_state) {
					latest_steps_at_position.set(event_pos, {
						type: "TRANSITION",
						from: last_state,
						from_name: this._get_state_name(last_state),
						to: to_state,
						to_name: this._get_state_name(to_state),
						position: event_pos,
						depth: stack_ptr,
						rule: event.rule_name || last_matched_rule,
						token_emitted:
							event.token_emitted !== undefined
								? event.token_emitted
								: last_token_emitted,
					});
					current_state = to_state;
					last_state = to_state;
					last_matched_rule = null;
					last_token_emitted = false;
				}
			}
		}

		// build final route from the latest steps at each position
		const route: RouteStep[] = [];
		const sorted_positions = Array.from(latest_steps_at_position.keys()).sort((a, b) => a - b);
		for (const position of sorted_positions) {
			if (position <= pos) {
				const step = latest_steps_at_position.get(position);
				if (step) route.push(step);
			}
		}

		return route;
	}

	// get the complete route including probe states and resolutions
	get_complete_route_to_position(pos: number): RouteStep[] {
		const route: RouteStep[] = [];
		const steps_at_position = new Map<number, RouteStep[]>();

		let current_state = this.initial_state;
		let state_stack: number[] = [];
		let stack_ptr = 0;
		let last_state = current_state;
		let last_matched_rule: string | number | null = null;
		let last_token_emitted = false;

		// add initial state
		const start_step = {
			type: "START" as const,
			state: current_state,
			state_name: this._get_state_name(current_state),
			position: 0,
			depth: 0,
		};
		steps_at_position.set(0, [start_step]);

		// process ALL events, not just those before pos
		// this ensures we capture probe resolutions that are recorded later
		for (const event of this.history) {
			const event_pos = event.pos !== undefined && event.pos !== null ? event.pos : 0;

			// skip events beyond our target position
			if (event_pos > pos) continue;

			// track the last matched rule and token emission
			if (event.type === "MATCHED_RULE") {
				last_matched_rule = event.rule_name || event.rule_index || null;
				last_token_emitted = !!event.token_type;
			} else if (event.type === "EMITTED_TOKEN") {
				last_token_emitted = true;
			}

			if (event.type === "PUSHED_STATE") {
				const from_state = this._resolve_state(
					event.from_state_index,
					event.from_state,
					last_state
				);

				const to_state = this._resolve_state(
					event.to_state_index,
					event.to_state,
					current_state
				);

				// use the actual depth from the event if available
				const actual_depth = event.stack_depth !== undefined ? event.stack_depth : stack_ptr + 1;

				// update our tracking
				current_state = to_state;
				stack_ptr = actual_depth;

				const step = {
					type: "PUSH" as const,
					from: from_state,
					from_name: this._get_state_name(from_state),
					to: to_state,
					to_name: this._get_state_name(to_state),
					position: event_pos,
					depth: actual_depth,
					rule: last_matched_rule,
					token_emitted: last_token_emitted,
					// mark if this is a probe state
					is_probe: this._is_probe_state(to_state),
				};

				// add to the list of steps at this position
				if (!steps_at_position.has(event_pos)) {
					steps_at_position.set(event_pos, []);
				}
				steps_at_position.get(event_pos)!.push(step);

				last_state = current_state;
				last_matched_rule = null;
				last_token_emitted = false;
			} else if (event.type === "POPPED_STATE") {
				// pop from stack
				const popped_from = current_state;
				const to_state = this._resolve_state(
					event.to_state_index,
					event.to_state,
					current_state
				);

				// use the actual depth from the event if available
				const actual_depth = event.stack_depth !== undefined ? event.stack_depth : Math.max(0, stack_ptr - 1);

				current_state = to_state;
				stack_ptr = actual_depth;

				const step = {
					type: "POP" as const,
					from: popped_from,
					from_name: this._get_state_name(popped_from),
					to: current_state,
					to_name: this._get_state_name(current_state),
					position: event_pos,
					depth: actual_depth,
					rule: last_matched_rule,
					token_emitted: last_token_emitted,
				};

				if (!steps_at_position.has(event_pos)) {
					steps_at_position.set(event_pos, []);
				}
				steps_at_position.get(event_pos)!.push(step);

				last_state = current_state;
				last_matched_rule = null;
				last_token_emitted = false;
			} else if (event.type === "TRANSITIONED_STATE") {
				const to_state = this._resolve_state(
					event.to_state_index,
					event.to_state,
					current_state
				);

				// transitions don't change depth, use current stack_ptr
				const step = {
					type: "TRANSITION" as const,
					from: last_state,
					from_name: this._get_state_name(last_state),
					to: to_state,
					to_name: this._get_state_name(to_state),
					position: event_pos,
					depth: stack_ptr,
					rule: event.rule_name || last_matched_rule,
					token_emitted:
						event.token_emitted !== undefined
							? event.token_emitted
							: last_token_emitted,
				};

				if (!steps_at_position.has(event_pos)) {
					steps_at_position.set(event_pos, []);
				}
				steps_at_position.get(event_pos)!.push(step);

				current_state = to_state;
				last_state = to_state;
				last_matched_rule = null;
				last_token_emitted = false;
			}
		}

		// build final route from all steps at each position
		const sorted_positions = Array.from(steps_at_position.keys()).sort((a, b) => a - b);

		for (const position of sorted_positions) {
			if (position <= pos) {
				const steps = steps_at_position.get(position);
				if (steps) {
					for (const step of steps) {
						route.push(step);
					}
				}
			}
		}

		return route;
	}

	// helper to check if a state is a probe state
	private _is_probe_state(state_index: number): boolean {
		const grammar_mapper = (this.options as any).grammar_mapper;
		if (grammar_mapper && grammar_mapper.original_grammar) {
			const state_name = this._get_state_name(state_index);
			const state_config = grammar_mapper.original_grammar.states[state_name];
			return state_config && state_config.mode === "probe";
		}
		return false;
	}

	// get the full route taken to reach a position, including all sideways transitions
	get_full_route_to_position(pos: number): RouteStep[] {
		const route: RouteStep[] = [];
		let current_state = this.initial_state;
		let state_stack: number[] = [];
		let stack_ptr = 0;
		let last_state = current_state;
		let last_matched_rule: string | number | null = null;
		let last_token_emitted = false;

		// add initial state
		route.push({
			type: "START",
			state: current_state,
			state_name: this._get_state_name(current_state),
			position: 0,
			depth: 0,
		});

		for (const event of this.history) {
			if (event.pos !== undefined && event.pos > pos) break;

			// track the last matched rule and token emission
			if (event.type === "MATCHED_RULE") {
				last_matched_rule = event.rule_name || event.rule_index || null;
				last_token_emitted = !!event.token_type;
			} else if (event.type === "EMITTED_TOKEN") {
				last_token_emitted = true;
			}

			if (event.type === "PUSHED_STATE") {
				// push current state to stack and move to new state
				const from_state = this._resolve_state(
					event.from_state_index,
					event.from_state,
					last_state
				);
				state_stack[stack_ptr] = from_state;
				stack_ptr++;
				const to_state = this._resolve_state(
					event.to_state_index,
					event.to_state,
					current_state
				);
				current_state = to_state;

				route.push({
					type: "PUSH",
					from: from_state,
					from_name: this._get_state_name(from_state),
					to: to_state,
					to_name: this._get_state_name(to_state),
					position:
						event.pos !== undefined && event.pos !== null ? event.pos : 0,
					depth: stack_ptr,
					rule: last_matched_rule,
					token_emitted: last_token_emitted,
				});
				last_state = current_state;
				last_matched_rule = null;
				last_token_emitted = false;
			} else if (event.type === "POPPED_STATE") {
				// pop from stack
				if (stack_ptr > 0) {
					const popped_from = current_state;
					stack_ptr--;
					// use the to_state from the event
					const fallback_state = state_stack[stack_ptr];
					current_state = this._resolve_state(
						event.to_state_index,
						event.to_state,
						fallback_state !== undefined ? fallback_state : current_state
					);
					route.push({
						type: "POP",
						from: popped_from,
						from_name: this._get_state_name(popped_from),
						to: current_state,
						to_name: this._get_state_name(current_state),
						position:
							event.pos !== undefined && event.pos !== null ? event.pos : 0,
						depth: stack_ptr,
						rule: last_matched_rule,
						token_emitted: last_token_emitted,
					});
					last_state = current_state;
					last_matched_rule = null;
					last_token_emitted = false;
				}
			} else if (event.type === "TRANSITIONED_STATE") {
				const to_state = this._resolve_state(
					event.to_state_index,
					event.to_state,
					current_state
				);

				route.push({
					type: "TRANSITION",
					from: last_state,
					from_name: this._get_state_name(last_state),
					to: to_state,
					to_name: this._get_state_name(to_state),
					position:
						event.pos !== undefined && event.pos !== null ? event.pos : 0,
					depth: stack_ptr,
					rule: event.rule_name || last_matched_rule,
					token_emitted:
						event.token_emitted !== undefined
							? event.token_emitted
							: last_token_emitted,
				});
				current_state = to_state;
				last_state = to_state;
				last_matched_rule = null;
				last_token_emitted = false;
			}
		}

		return route;
	}

	// get enhanced route with state session information
	get_enhanced_route(pos: number): RouteStep[] {
		// use latest route to handle probe re-processing
		const basic_route = this.get_latest_route_to_position(pos);
		const enhanced_route: RouteStep[] = [];

		// map state sessions by their entry position
		// use the latest session at each position
		const sessions_by_entry = new Map<number, StateSession>();
		for (const session of this.state_sessions) {
			// if there are multiple sessions at the same position, keep the latest
			const existing = sessions_by_entry.get(session.entry_position);
			if (!existing || this.state_sessions.indexOf(session) > this.state_sessions.indexOf(existing)) {
				sessions_by_entry.set(session.entry_position, session);
			}
		}

		// enhance each route step with session data
		for (const step of basic_route) {
			const enhanced_step = { ...step };

			// find the state session for this step
			const session = sessions_by_entry.get(step.position);
			if (session) {
				enhanced_step.entry_position = session.entry_position;
				enhanced_step.characters_processed = session.characters_processed;
				enhanced_step.rules_applied = Array.from(session.rules_applied.entries()).map(
					([rule, count]) => ({ rule, count })
				);
				enhanced_step.is_probe = session.is_probe;
			}

			enhanced_route.push(enhanced_step);
		}

		return enhanced_route;
	}

	format_full_route(pos: number): string {
		const route = this.get_full_route_to_position(pos);
		const parts = [];

		for (const step of route) {
			switch (step.type) {
				case "START":
					parts.push(step.state_name);
					break;
				case "PUSH":
					parts.push(`↓${step.to_name}`);
					break;
				case "POP":
					parts.push(`↑${step.to_name}`);
					break;
				case "TRANSITION":
					parts.push(`→${step.to_name}`);
					break;
			}
		}

		return parts.join(" ");
	}

	// query methods for introspection
	get_token_at_position(pos: number): TokenInfo | undefined {
		return this.tokens.find((t) => t.start <= pos && pos < t.end);
	}

	get_token_history(token_index: number): TokenHistory | null {
		const token = this.tokens[token_index];
		if (!token) return null;

		const relevant_history = this.history.filter((event) => {
			if (event.type === "EMITTED_TOKEN" && event.token_index === token_index) {
				return true;
			}
			if (event.type === "EXTENDED_TOKEN" && event.token_index === token_index) {
				return true;
			}
			if (event.pos && event.pos >= token.start && event.pos < token.end) {
				return true;
			}
			return false;
		});

		return {
			token,
			history: relevant_history,
		};
	}

	get_state_at_position(pos: number): StateInfo {
		// find the last state before this position, including the full stack
		let current_state = this.initial_state;
		const state_stack: number[] = [];
		let stack_ptr = 0;
		for (const event of this.history) {
			if (event.pos !== undefined && event.pos > pos) break;

			if (event.type === "PUSHED_STATE") {
				// push the from_state to stack (the state we're leaving)
				const state_to_push = this._resolve_state(
					event.from_state_index,
					event.from_state,
					current_state
				);
				state_stack[stack_ptr++] = state_to_push;
				// move to the new state
				current_state = this._resolve_state(
					event.to_state_index,
					event.to_state,
					current_state
				);
			} else if (event.type === "POPPED_STATE") {
				// pop from stack and use the to_state from the event
				if (stack_ptr > 0) {
					stack_ptr--;
				}
				// use the to_state from the event, not from the stack
				const fallback_state = stack_ptr >= 0 ? state_stack[stack_ptr] : undefined;
				current_state = this._resolve_state(
					event.to_state_index,
					event.to_state,
					fallback_state !== undefined ? fallback_state : current_state
				);
			} else if (event.type === "TRANSITIONED_STATE") {
				const prev_state = current_state;
				current_state = this._resolve_state(
					event.to_state_index,
					event.to_state,
					prev_state
				);
			}
		}
		return {
			current_state,
			state_stack: state_stack.slice(0, stack_ptr),
			full_path: [...state_stack.slice(0, stack_ptr), current_state],
		};
	}

	get_rules_applied_at(pos: number): IntrospectorEvent[] {
		return this.rule_matches.filter((rule) => rule.pos === pos);
	}

	get_probe_events(): IntrospectorEvent[] {
		return this.probe_history;
	}

	// get all state transitions that occur at a specific position
	get_state_transitions_at_position(pos: number): IntrospectorEvent[] {
		return this.history.filter((event) => {
			// include all state transition events at this position
			if (event.pos !== pos) return false;
			return (
				event.type === "PUSHED_STATE" ||
				event.type === "POPPED_STATE" ||
				event.type === "TRANSITIONED_STATE" ||
				event.type === "ENTER_PROBE" ||
				event.type === "EXIT_PROBE"
			);
		});
	}

	// get all events (including probe) that occur at a specific position
	get_all_events_at_position(pos: number): IntrospectorEvent[] {
		return this.history.filter((event) => event.pos === pos);
	}

	// visualization helpers
	generate_report(): Report {
		const report: Report = {
			summary: {
				input_length: this.input.length,
				token_count: this.tokens.length,
				state_transitions: this.state_transitions.length,
				rule_matches: this.rule_matches.length,
				probe_events: this.probe_history.length,
			},
			tokens: this.tokens,
			state_transitions: this.state_transitions,
			top_rules: this._get_top_rules(),
			probe_history: this.probe_history,
		};

		return report;
	}

	generate_token_trace(token_index: number): string | null {
		const token_history = this.get_token_history(token_index);
		if (!token_history) return null;

		// derive text from input if needed
		const text = this.input.substring(
			token_history.token.start,
			token_history.token.end
		);
		const trace = [
			`Token #${token_index}: ${token_history.token.token_name}`,
			`  Text: "${text}"`,
			`  Position: ${token_history.token.start}-${token_history.token.end}`,
			"",
			"Trace:",
		];

		for (const event of token_history.history) {
			trace.push(`  ${this._format_event(event)}`);
		}

		return trace.join("\n");
	}

	// private helper methods
	private _add_to_history(event: IntrospectorEvent): void {
		if (this.options.collect_history) {
			if (
				this.options?.max_history_size &&
				this.history.length >= this.options.max_history_size
			) {
				// remove oldest 10% when we hit the limit
				const remove_count = Math.floor(this.options.max_history_size * 0.1);
				this.history.splice(0, remove_count);
			}
			this.history.push({ ...event, timestamp: Date.now() });
		}
	}

	private _log(type: string, data: any): void {
		if (this.options.log) {
			this.options.log(`[${type}]`, data);
		}
	}

	private _resolve_state(
		index: number | undefined,
		value: string | number | undefined,
		fallback: number
	): number {
		if (typeof index === "number") {
			return index;
		}
		if (typeof value === "number") {
			return value;
		}
		if (typeof value === "string") {
			const mapped = this._get_state_index_from_name(value);
			if (mapped !== undefined) {
				return mapped;
			}
		}
		return fallback;
	}

	private _get_state_index_from_name(name: string): number | undefined {
		const compiled = this.compiled_grammar?.states;
		if (compiled && compiled.has(name)) {
			return compiled.get(name);
		}
		if (this.options.state_names) {
			const lookup = this._ensure_state_name_lookup();
			const mapped = lookup.get(name);
			if (mapped !== undefined) {
				return mapped;
			}
		}
		return undefined;
	}

	private _ensure_state_name_lookup(): Map<string, number> {
		if (!this.state_name_lookup) {
			const lookup = new Map<string, number>();
			const state_names = this.options.state_names;
			if (state_names) {
				for (const [index, state_name] of Object.entries(state_names)) {
					lookup.set(state_name, Number(index));
				}
			}
			this.state_name_lookup = lookup;
		}
		return this.state_name_lookup;
	}

	private _get_state_name(state_index: number): string {
		// check if we have a grammar mapper
		const mapper = (this.options as any).grammar_mapper as
			| GrammarMapper
			| undefined;
		if (mapper) {
			return mapper.get_state_name(state_index);
		}

		const state_names = this.options.state_names;
		if (state_names && state_names[state_index] !== undefined) {
			return state_names[state_index];
		}
		if (this.compiled_grammar?.states) {
			for (const [name, index] of this.compiled_grammar.states.entries()) {
				if (index === state_index) {
					return name;
				}
			}
		}

		return `state_${state_index}`;
	}

	private _get_rule_name(state_index: number, rule_index: number): string {
		// check if we have a grammar mapper
		const mapper = (this.options as any).grammar_mapper as
			| GrammarMapper
			| undefined;
		if (mapper) {
			return mapper.get_rule_name(state_index, rule_index);
		}

		return `rule_${rule_index}`;
	}

	private _get_token_name(token_type: number): string {
		// check if we have a grammar mapper
		const mapper = (this.options as any).grammar_mapper as
			| GrammarMapper
			| undefined;
		if (mapper) {
			return mapper.get_token_name(token_type);
		}
		if (this.compiled_grammar && this.compiled_grammar.token_types) {
			return `${this.compiled_grammar.token_types[token_type]} (${token_type})`;
		}
		return `token_${token_type}`;
	}

	private _get_stack_op_name(stack_op: number): string {
		switch (stack_op) {
			case 0:
				return "none";
			case 1:
				return "push";
			case 2:
				return "pop";
			default:
				return `unknown(${stack_op})`;
		}
	}

	private _get_input_context(
		pos: number,
		context_size: number = 20
	): InputContext {
		const start = Math.max(0, pos - context_size);
		const end = Math.min(this.input.length, pos + context_size);
		const before = this.input.substring(start, pos);
		const char = pos < this.input.length ? this.input[pos] : "";
		const after = this.input.substring(pos + 1, end);

		return {
			before,
			char,
			after,
			display: `...${before}[${char}]${after}...`,
		};
	}

	private _get_top_rules(
		limit: number = 10
	): Array<{ rule: string | number; count: number }> {
		const rule_counts: Record<string | number, number> = {};
		for (const match of this.rule_matches) {
			const key = (match.rule_name || match.rule_index)!;
			rule_counts[key] = (rule_counts[key] || 0) + 1;
		}

		return Object.entries(rule_counts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, limit)
			.map(([rule, count]) => ({ rule, count }));
	}

	private _format_event(event: IntrospectorEvent): string {
		switch (event.type) {
			case "BEFORE_CHAR":
				return `[${event.pos}] '${event.char_str}' in ${event.current_state}`;
			case "MATCHED_RULE":
				return `[${event.pos}] Matched ${event.rule_name} → ${event.token_type || "no token"}`;
			case "EMITTED_TOKEN":
				return `[${event.start}-${event.end}] Emitted ${event.token_name}`;
			case "PUSHED_STATE":
				return `Pushed state: ${event.from_state} → ${event.to_state}`;
			case "POPPED_STATE":
				return `Popped state: ${event.from_state} → ${event.to_state}`;
			default:
				return `${event.type}`;
		}
	}
}
