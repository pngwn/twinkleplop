/**
 * grammar mapper for introspection: maps compiled indices back to grammar names
 */

import type {
  Grammar,
  GrammarRule,
  CompiledGrammar,
  IGrammarMapper,
  RuleDetails,
  TokenDescription,
  Analysis,
  PositionAnalysis,
  RouteStep,
  IntrospectorOptions,
  TokenizerIntrospector,
} from "./types";

export class GrammarMapper {
  original_grammar: Grammar;
  compiled_grammar: CompiledGrammar;
  state_names: Record<number, string>;
  state_rules: Record<number, Record<number, string>>;
  rule_descriptions: Record<number, Record<number, RuleDetails>>;
  token_names: Record<number, string>;

  constructor(original_grammar: Grammar, compiled_grammar: CompiledGrammar) {
    this.original_grammar = original_grammar;
    this.compiled_grammar = compiled_grammar;

    this.state_names = {};
    this.state_rules = {};
    this.rule_descriptions = {};
    this.token_names = {};

    this._build_mappings();
  }

  private _build_mappings(): void {
    const names = Object.keys(this.original_grammar.states);
    names.forEach((name, idx) => {
      this.state_names[idx] = name;

      const state_rules = this.original_grammar.states[name];
      const rules = state_rules.rules || (state_rules as any);

      if (Array.isArray(rules)) {
        this.state_rules[idx] = {};
        rules.forEach((rule, rule_idx) => {
          const desc = this._describe_rule(rule);
          this.state_rules[idx][rule_idx] = desc;

          if (!this.rule_descriptions[idx]) {
            this.rule_descriptions[idx] = {};
          }
          this.rule_descriptions[idx][rule_idx] = {
            pattern: this._get_pattern(rule),
            token: rule.token,
            action: this._get_action(rule),
            description: desc,
            original: rule,
          };
        });
      }
    });

    if (this.compiled_grammar.token_types) {
      this.compiled_grammar.token_types.forEach((name, idx) => {
        this.token_names[idx] = name;
      });
    }
  }

  private _get_pattern(rule: GrammarRule): string {
    if (rule.match) {
      if (rule.match instanceof RegExp) {
        return rule.match.toString();
      } else if (Array.isArray(rule.match)) {
        return JSON.stringify(rule.match);
      } else {
        return JSON.stringify(rule.match);
      }
    } else if (rule.range) {
      if (Array.isArray(rule.range[0])) {
        return (rule.range as Array<[string | number, string | number]>)
          .map((r) => `[${r[0]}-${r[1]}]`)
          .join(", ");
      } else {
        const r = rule.range as [string | number, string | number];
        return `[${r[0]}-${r[1]}]`;
      }
    }
    return "unknown";
  }

  private _get_action(rule: GrammarRule): string | null {
    if (rule.state) {
      return `push(${rule.state})`;
    } else if (rule.exit) {
      return "pop()";
    }
    return null;
  }

  private _describe_rule(rule: GrammarRule): string {
    const parts: string[] = [];

    if (rule.match) {
      if (rule.match instanceof RegExp) {
        parts.push(rule.match.toString());
      } else if (typeof rule.match === "string") {
        parts.push(`"${rule.match}"`);
      } else if (Array.isArray(rule.match)) {
        parts.push(`[${rule.match.map((m) => `"${m}"`).join(", ")}]`);
      }
    } else if (rule.range) {
      if (Array.isArray(rule.range[0])) {
        parts.push(
          (rule.range as Array<[string | number, string | number]>)
            .map((r) => `[${r[0]}-${r[1]}]`)
            .join(", "),
        );
      } else {
        const r = rule.range as [string | number, string | number];
        parts.push(`[${r[0]}-${r[1]}]`);
      }
    }

    if (rule.token) {
      parts.push(`→ ${rule.token}`);
    }

    if (rule.state) {
      parts.push(`↓ ${rule.state}`);
    } else if (rule.exit) {
      parts.push("↑ exit");
    }

    return parts.join(" ");
  }

  get_state_path(state_indices: number[]): string {
    if (!Array.isArray(state_indices)) return "";
    return state_indices.map((idx) => this.get_state_name(idx)).join(" → ");
  }

  get_state_name(state_index: number): string {
    if (this.state_names[state_index]) {
      return this.state_names[state_index];
    }
    return `state_${state_index}`;
  }

  get_rule_name(state_index: number, rule_index: number): string {
    if (this.state_rules[state_index] && this.state_rules[state_index][rule_index]) {
      return this.state_rules[state_index][rule_index];
    }
    return `rule_${rule_index}`;
  }

  get_rule_details(state_index: number, rule_index: number): RuleDetails | null {
    if (this.rule_descriptions[state_index]) {
      return this.rule_descriptions[state_index][rule_index] || null;
    }
    return null;
  }

  get_token_name(token_type: number): string {
    return this.token_names[token_type] || `token_${token_type}`;
  }

  describe_transition(from_state: number, to_state: number, stack_op: number): string {
    const from = this.get_state_name(from_state);
    const to = this.get_state_name(to_state);

    if (stack_op === 1) {
      return `Push: ${from} → ${to} (stack depth increases)`;
    } else if (stack_op === 2) {
      return `Pop: ${from} ← ${to} (returned from ${from})`;
    } else {
      return `Goto: ${from} → ${to}`;
    }
  }

  describe_token(token_type: number, start: number, end: number, text?: string): TokenDescription {
    const name = this.get_token_name(token_type);
    return {
      name,
      position: `[${start}:${end}]`,
      text: text ? (text.length > 20 ? text.substring(0, 20) + "..." : text) : "",
      length: end - start,
    };
  }

  create_enhanced_introspector<T extends TokenizerIntrospector>(
    IntrospectorClass: new (options: IntrospectorOptions) => T,
    options: IntrospectorOptions = {},
  ): T {
    const mapper = this;

    return new IntrospectorClass({
      ...options,
      grammar_mapper: mapper as any,
      state_names: this.state_names,
      rule_names: this.state_rules,
      log:
        options.log ||
        (options.enhanced_logging
          ? (type: string, data: any) => {
              this._enhanced_log(type, data, mapper);
            }
          : null),
    });
  }

  private _enhanced_log(type: string, data: any, mapper: GrammarMapper): void {
    const indent = "  ";

    switch (type) {
      case "[BEFORE_CHAR]":
        if (data.full_state_path && data.full_state_path.length > 0) {
          const path = data.full_state_path.join(" → ");
          console.log(`${indent}[${data.pos}] '${data.char_str}' in: ${path}`);
        } else {
          console.log(`${indent}[${data.pos}] '${data.char_str}' in state: ${data.current_state}`);
        }
        break;

      case "[MATCHED_RULE]": {
        const rule = mapper.get_rule_details(data.current_state, data.rule_index);
        if (rule) {
          console.log(`${indent}✓ Matched: ${rule.description}`);
        }
        break;
      }

      case "[EMITTED_TOKEN]": {
        const token = mapper.describe_token(data.token_type, data.start, data.end, data.text);
        console.log(`${indent}📝 Token: ${token.name} ${token.position} "${token.text}"`);
        break;
      }

      case "[PUSHED_STATE]":
        console.log(
          `${indent}↓ Push: ${data.from_state} → ${data.to_state} (depth: ${data.stack_depth})`,
        );
        break;

      case "[POPPED_STATE]":
        console.log(
          `${indent}↑ Pop: ${mapper.get_state_name(data.from_state)} ← ${mapper.get_state_name(data.to_state)}`,
        );
        break;

      case "[TRANSITIONED_STATE]":
        console.log(
          `${indent}→ Goto: ${mapper.get_state_name(data.from_state)} → ${mapper.get_state_name(data.to_state)}`,
        );
        break;
    }
  }

  analyze_tokenization(introspector: TokenizerIntrospector): Analysis {
    const analysis: Analysis = {
      summary: {
        total_tokens: introspector.tokens.length,
        unique_token_types: new Set(introspector.tokens.map((t) => t.token_type)).size,
        states_visited: new Set(introspector.state_transitions.map((t) => (t as any).from_state))
          .size,
        max_stack_depth: Math.max(
          ...introspector.state_transitions.map((t) => (t as any).stack_depth || 0),
        ),
      },
      tokens_by_type: {},
      state_visits: {},
      rule_usage: {},
    };

    for (const token of introspector.tokens) {
      const name = this.get_token_name(token.token_type);
      if (!analysis.tokens_by_type[name]) {
        analysis.tokens_by_type[name] = {
          count: 0,
          examples: [],
          total_length: 0,
        };
      }
      analysis.tokens_by_type[name].count++;
      analysis.tokens_by_type[name].total_length += token.end - token.start;
      if (analysis.tokens_by_type[name].examples.length < 3 && introspector.input) {
        const text = introspector.input.substring(token.start, token.end);
        analysis.tokens_by_type[name].examples.push(text);
      }
    }

    for (const transition of introspector.state_transitions) {
      let to_state_name = (transition as any).to_state;
      if (typeof to_state_name === "string" && to_state_name.startsWith("state_")) {
        const idx = parseInt(to_state_name.replace("state_", ""));
        if (!isNaN(idx)) {
          to_state_name = this.get_state_name(idx);
        }
      }
      analysis.state_visits[to_state_name] = (analysis.state_visits[to_state_name] || 0) + 1;
    }

    for (const match of introspector.rule_matches) {
      const current_state =
        typeof (match as any).current_state === "number"
          ? (match as any).current_state
          : (match as any).current_state_index || 0;
      const rule_index = (match as any).rule_index || 0;
      const rule_name = this.get_rule_name(current_state, rule_index);
      if (!analysis.rule_usage[rule_name]) {
        analysis.rule_usage[rule_name] = {
          count: 0,
          state: this.get_state_name(current_state),
          details: this.get_rule_details(current_state, rule_index),
        };
      }
      analysis.rule_usage[rule_name].count++;
    }

    return analysis;
  }

  generate_report(introspector: TokenizerIntrospector): string {
    const analysis = this.analyze_tokenization(introspector);
    const lines: string[] = [];

    lines.push("=== TOKENIZATION REPORT ===");
    lines.push("");
    lines.push("Summary:");
    lines.push(`  Total tokens: ${analysis.summary.total_tokens}`);
    lines.push(`  Token types: ${analysis.summary.unique_token_types}`);
    lines.push(`  States visited: ${analysis.summary.states_visited}`);
    lines.push(`  Max stack depth: ${analysis.summary.max_stack_depth}`);
    lines.push("");

    lines.push("Tokens by Type:");
    for (const [type, info] of Object.entries(analysis.tokens_by_type)) {
      lines.push(`  ${type}: ${info.count} occurrences`);
      lines.push(`    Average length: ${(info.total_length / info.count).toFixed(1)} chars`);
      lines.push(`    Examples: ${info.examples.map((e) => `"${e}"`).join(", ")}`);
    }
    lines.push("");

    lines.push("State Visits:");
    for (const [state, count] of Object.entries(analysis.state_visits)) {
      lines.push(`  ${state}: ${count} times`);
    }
    lines.push("");

    lines.push("Most Used Rules:");
    const sorted_rules = Object.entries(analysis.rule_usage)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
    for (const [rule, info] of sorted_rules) {
      lines.push(`  ${info.count}x: ${rule}`);
      if (info.details) {
        lines.push(`      Pattern: ${info.details.pattern}`);
        if (info.details.token) {
          lines.push(`      Token: ${info.details.token}`);
        }
      }
    }

    return lines.join("\n");
  }

  analyze_position(introspector: TokenizerIntrospector, pos: number): PositionAnalysis {
    const complete_state = introspector.get_complete_state_at_position(pos);

    const analysis: PositionAnalysis = {
      position: pos,
      character: complete_state.char || "",
      input_context: complete_state.context.display,
      state_path: this.get_state_path(complete_state.state.full_path),
      state_stack: complete_state.state.stack.map((idx) => this.get_state_name(idx)),
      current_state: this.get_state_name(complete_state.state.current),
      depth: complete_state.state.depth,
      current_token: complete_state.current_token
        ? {
            ...complete_state.current_token,
            type_name: this.get_token_name(complete_state.current_token.token_type),
          }
        : null,
      matched_rules: complete_state.rules_matched.map((r) => ({
        rule: this.get_rule_name(
          typeof (r as any).current_state === "number"
            ? (r as any).current_state
            : (r as any).current_state_index || 0,
          (r as any).rule_index || 0,
        ),
        details: this.get_rule_details(
          typeof (r as any).current_state === "number"
            ? (r as any).current_state
            : (r as any).current_state_index || 0,
          (r as any).rule_index || 0,
        ),
      })),
      recent_events: complete_state.recent_history.map((e) => this._describe_event(e)),
    };

    return analysis;
  }

  private _describe_event(event: any): string {
    switch (event.type) {
      case "BEFORE_CHAR":
        return `[${event.pos}] Processing '${event.char_str}'`;
      case "MATCHED_RULE": {
        const current_state =
          typeof event.current_state === "number"
            ? event.current_state
            : event.current_state_index || 0;
        return `Matched: ${this.get_rule_name(current_state, event.rule_index)}`;
      }
      case "EMITTED_TOKEN":
        return `Token: ${this.get_token_name(event.token_type)} [${event.start}:${event.end}]`;
      case "PUSHED_STATE":
        return `Push → ${this.get_state_name(event.to_state_index || event.to_state)}`;
      case "POPPED_STATE":
        return `Pop ← ${this.get_state_name(event.to_state_index || event.to_state)}`;
      default:
        return event.type;
    }
  }

  get_enhanced_route(introspector: TokenizerIntrospector, pos: number): RouteStep[] {
    const enhanced_route = introspector.get_enhanced_route(pos);

    return enhanced_route.map((step) => {
      const mapped = { ...step };

      if (mapped.state_name && mapped.state_name.startsWith("state_")) {
        const idx = parseInt(mapped.state_name.replace("state_", ""));
        if (!isNaN(idx)) {
          mapped.state_name = this.get_state_name(idx);
        }
      }
      if (mapped.from_name && mapped.from_name.startsWith("state_")) {
        const idx = parseInt(mapped.from_name.replace("state_", ""));
        if (!isNaN(idx)) {
          mapped.from_name = this.get_state_name(idx);
        }
      }
      if (mapped.to_name && mapped.to_name.startsWith("state_")) {
        const idx = parseInt(mapped.to_name.replace("state_", ""));
        if (!isNaN(idx)) {
          mapped.to_name = this.get_state_name(idx);
        }
      }

      return mapped;
    });
  }

  get_complete_route(introspector: TokenizerIntrospector, pos: number): RouteStep[] {
    const route = introspector.get_complete_route_to_position(pos);

    return route.map((step) => {
      const mapped = { ...step };

      if (mapped.state_name && mapped.state_name.startsWith("state_")) {
        const idx = parseInt(mapped.state_name.replace("state_", ""));
        if (!isNaN(idx)) {
          mapped.state_name = this.get_state_name(idx);
        }
      }
      if (mapped.from_name && mapped.from_name.startsWith("state_")) {
        const idx = parseInt(mapped.from_name.replace("state_", ""));
        if (!isNaN(idx)) {
          mapped.from_name = this.get_state_name(idx);
        }
      }
      if (mapped.to_name && mapped.to_name.startsWith("state_")) {
        const idx = parseInt(mapped.to_name.replace("state_", ""));
        if (!isNaN(idx)) {
          mapped.to_name = this.get_state_name(idx);
        }
      }

      return mapped;
    });
  }

  get_full_route(introspector: TokenizerIntrospector, pos: number): RouteStep[] {
    const route = introspector.get_full_route_to_position(pos);

    return route.map((step) => {
      const mapped = { ...step };

      if (mapped.state_name && mapped.state_name.startsWith("state_")) {
        const idx = parseInt(mapped.state_name.replace("state_", ""));
        if (!isNaN(idx)) {
          mapped.state_name = this.get_state_name(idx);
        }
      }
      if (mapped.from_name && mapped.from_name.startsWith("state_")) {
        const idx = parseInt(mapped.from_name.replace("state_", ""));
        if (!isNaN(idx)) {
          mapped.from_name = this.get_state_name(idx);
        }
      }
      if (mapped.to_name && mapped.to_name.startsWith("state_")) {
        const idx = parseInt(mapped.to_name.replace("state_", ""));
        if (!isNaN(idx)) {
          mapped.to_name = this.get_state_name(idx);
        }
      }

      return mapped;
    });
  }

  format_route(introspector: TokenizerIntrospector, pos: number): string {
    const route = this.get_full_route(introspector, pos);
    const parts: string[] = [];

    for (const step of route) {
      switch (step.type) {
        case "START":
          parts.push(step.state_name || "");
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
}

export function create_grammar_mapper(
  original_grammar: Grammar,
  compiled_grammar: CompiledGrammar,
): GrammarMapper {
  return new GrammarMapper(original_grammar, compiled_grammar);
}
