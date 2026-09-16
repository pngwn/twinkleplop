// token-stream scanning helpers shared across reclassifier passes.
//
// every stateful reclassifier walks a TokenizeResult and needs some subset
// of: per-index text extraction, trivia-aware neighbor lookups, bracket
// scope tracking. factoring these here means one tested implementation
// instead of ~4 near-duplicates (claim_property_scope, type_position_promoter,
// class_name_promoter, rust/reclassify_generics) and makes the passes
// themselves smaller and easier to reason about.

// ---------------------------------------------------------------------------
// TokenView
// ---------------------------------------------------------------------------
//
// thin read-only wrapper around (input, tokens, token_types). exposes the
// common operations every pass needs: type_id lookup, source text, trivia
// check, and forward/backward non-trivia neighbor scans.
//
// trivia defaults to the single `comment` type, which matches every current
// language. callers can pass a list for languages that classify additional
// types as trivia.
//
// a class rather than a bundle of closures, on purpose. a view is built per
// pass invocation and dropped, and V8 keeps a closure's optimised code alive
// only through the closure itself (the feedback vector's reference is weak),
// so a full GC landing between two calls discarded the methods' code and the
// next call re-tiered every one of them from the interpreter. prototype
// methods stay reachable from the class for as long as the module is loaded.

export class TokenView {
  readonly input: string;
  readonly tokens: Uint32Array;
  readonly token_types: string[];
  readonly count: number;
  /**
   * the first resolved trivia type_id, or -1. exposed so callers that
   * want a tight `tokens[i*3] === comment_id` inline check (as opposed to
   * calling is_trivia()) can still do it in a single comparison when only
   * one trivia name is configured.
   */
  readonly comment_id: number;
  /**
   * null unless more than one trivia type resolved. every current language
   * configures exactly one, and the null case is a single comparison against
   * comment_id instead of a Set.has() on the hot path.
   */
  readonly trivia_set: Set<number> | null;

  constructor(
    input: string,
    tokens: Uint32Array,
    token_types: string[],
    trivia_names: readonly string[] = ["comment"],
  ) {
    this.input = input;
    this.tokens = tokens;
    this.token_types = token_types;
    this.count = tokens.length / 3;
    let comment_id = -1;
    const trivia_set = new Set<number>();
    for (const name of trivia_names) {
      const id = token_types.indexOf(name);
      if (id < 0) continue;
      trivia_set.add(id);
      if (comment_id < 0) comment_id = id;
    }
    this.comment_id = comment_id;
    this.trivia_set = trivia_set.size <= 1 ? null : trivia_set;
  }

  kind_of(i: number): number {
    return this.tokens[i * 3];
  }

  text_of(i: number): string {
    const tokens = this.tokens;
    return this.input.slice(tokens[i * 3 + 1], tokens[i * 3 + 2]);
  }

  is_trivia(i: number): boolean {
    const kind = this.tokens[i * 3];
    return this.trivia_set === null ? kind === this.comment_id : this.trivia_set.has(kind);
  }

  /** returns the smallest index >= `from` that isn't trivia, or -1. */
  next_non_trivia(from: number): number {
    const tokens = this.tokens;
    const count = this.count;
    const trivia_set = this.trivia_set;
    if (trivia_set === null) {
      const comment_id = this.comment_id;
      for (let i = from; i < count; i++) {
        if (tokens[i * 3] !== comment_id) return i;
      }
      return -1;
    }
    for (let i = from; i < count; i++) {
      if (!trivia_set.has(tokens[i * 3])) return i;
    }
    return -1;
  }

  /** returns the largest index <= `from` that isn't trivia, or -1. */
  prev_non_trivia(from: number): number {
    const tokens = this.tokens;
    const trivia_set = this.trivia_set;
    if (trivia_set === null) {
      const comment_id = this.comment_id;
      for (let i = from; i >= 0; i--) {
        if (tokens[i * 3] !== comment_id) return i;
      }
      return -1;
    }
    for (let i = from; i >= 0; i--) {
      if (!trivia_set.has(tokens[i * 3])) return i;
    }
    return -1;
  }
}

export function make_token_view(
  input: string,
  tokens: Uint32Array,
  token_types: string[],
  trivia_names: readonly string[] = ["comment"],
): TokenView {
  return new TokenView(input, tokens, token_types, trivia_names);
}

// ---------------------------------------------------------------------------
// ScopeStack
// ---------------------------------------------------------------------------
//
// generic bracket stack. each entry remembers its bracket kind plus a
// caller-defined `data` value for any per-scope state the pass wants to
// track (at_start flag, brace context, qmark counter, ...). depths are
// exposed as plain number properties, updated on each push/pop.
//
// the tokenizer coalesces runs of same-kind punctuation into a single
// token (e.g. `});` lands as ONE punctuation token); callers iterate char
// by char and call push/pop per character so depths stay in sync.

export type Bracket = "{" | "(" | "[";

export interface Scope<T> {
  bracket: Bracket;
  data: T;
}

export interface ScopeStack<T> {
  readonly entries: Scope<T>[];
  paren_depth: number;
  brace_depth: number;
  bracket_depth: number;
  length(): number;
  top(): Scope<T> | undefined;
  push(bracket: Bracket, data: T): void;
  pop(): Scope<T> | undefined;
}

export function make_scope_stack<T>(): ScopeStack<T> {
  const entries: Scope<T>[] = [];
  const stack: ScopeStack<T> = {
    entries,
    paren_depth: 0,
    brace_depth: 0,
    bracket_depth: 0,
    length(): number {
      return entries.length;
    },
    top(): Scope<T> | undefined {
      return entries[entries.length - 1];
    },
    push(bracket: Bracket, data: T): void {
      entries.push({ bracket, data });
      if (bracket === "(") stack.paren_depth++;
      else if (bracket === "[") stack.bracket_depth++;
      else stack.brace_depth++;
    },
    pop(): Scope<T> | undefined {
      const e = entries.pop();
      if (e === undefined) return undefined;
      if (e.bracket === "(") stack.paren_depth--;
      else if (e.bracket === "[") stack.bracket_depth--;
      else stack.brace_depth--;
      return e;
    },
  };
  return stack;
}
