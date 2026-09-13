import type { TokenizerIntrospector } from "./introspector";

// shape every theme package ships: one entry per canonical token name
// exported from `./tokens`, plus the extra `background_color` key that
// themes declare but the generated stylesheets do not bind.
export type theme_palette = Record<string, string> & {
  background_color: string;
};

// Character class symbol types
export type CharacterClassSymbol = symbol;

// Grammar types
export interface GrammarRule {
  match?: string | string[] | CharacterClassSymbol;
  range?: [string, string] | [number, number] | [string, string][] | [number, number][];
  match_within?: {
    start: string;
    end: string;
    escape?: string;
    multiline?: boolean;
  };
  any?: boolean;
  boundary?: boolean;
  token?: string;
  state?: string;
  exit?: boolean;
  // force a lexeme boundary after this rule even if the emitted token type
  // matches the previous one. the compiler also sets this implicitly for
  // multi-char matches, structural transitions (push/pop/sideways), and
  // boundary-checked rules, so authors only need `seal: true` for
  // lexeme-atom single-char matches that would otherwise coalesce.
  seal?: boolean;
}

export interface GrammarState {
  rules?: GrammarRule[];
  mode?: "probe" | "tokenise";
  fallback?: string;
}

export interface Grammar {
  name?: string;
  states: Record<string, GrammarState>;
}

// Compiled grammar types
export interface PatternInfo {
  // Using typed array for faster indexed access in hot loop
  codes: Uint16Array;
  length: number;
  rule_idx: number;
  boundary?: boolean;
}

export interface CompiledGrammar {
  states: Map<string, number>;
  transitions: Uint16Array;
  char_maps: Uint16Array;
  keywords: Map<string, number>;
  token_types: string[];
  patterns: Map<number, (PatternInfo[] | null)[]>;
  fallback_transitions: Uint16Array;
  // per state, flat [start, end, rule_idx] triples over codepoints >= 128.
  // ranges rather than one entry per codepoint: a grammar that accepts any
  // unicode identifier character covers 65408 of them, and materialising that
  // per codepoint dominated compile time for the grammars that do it.
  non_ascii_ranges: Map<number, Int32Array>;
  // retain set for external tooling, but also include fast mask for hot path
  probe_states: Set<number>;
  probe_mask?: Uint8Array;
  probe_fallbacks?: Map<number, number>;
  // track which rules require boundary checking (state * 256 + rule_idx)
  boundary_rules?: Set<number>;
  // true when any rule sets seal: true or boundary: true. lets the
  // tokenizer skip the per-emission seal lookup on grammars that don't
  // opt in — most grammars don't.
  has_seals: boolean;
  // parallel Uint8Array to transitions, indexed by (state * 256 + rule_idx).
  // 1 means the emission at that rule seals a lexeme boundary. undefined on
  // grammars without any seal rules so the tokenizer can skip the lookup.
  seal_flags?: Uint8Array;
  fallback_seal_flags?: Uint8Array;
}

// Tokenizer types
export interface TokenizeResult {
  tokens: Uint32Array;
  token_types: string[];
  // populated only when annotation extraction ran during this call (i.e. the
  // language factory was given an `annotation` config). undefined otherwise so
  // the renderer's no-overlay fast path is reachable via a single check.
  overlays?: OverlayResult;
  // populated by the `frame_track` reclassifier when present. downstream
  // reclassifiers query the table instead of reconstructing their own
  // scope stack. undefined when no frame_track stage ran.
  frames?: FrameTable;
}

// Frame tracker types
//
// A FrameTable is the output of a `frame_track` reclassifier stage: per-token
// scope-stack metadata pre-computed in one walk so multiple downstream
// reclassifiers can read it instead of each maintaining their own stack.
//
// The schema is intentionally a superset across the JS/TS/Python/Rust
// reclassifiers we plan to migrate. Languages that don't use frame tracking
// simply don't run the stage and `frames` stays undefined.

// integer encodings for Frame.bracket. matches the order in FrameSpec.brackets.
export const FRAME_BRACKET_PAREN = 0;
export const FRAME_BRACKET_BRACE = 1;
export const FRAME_BRACKET_BRACKET = 2;

// integer encodings for Frame.kind. the top-of-stack sentinel is 0 so a
// freshly-allocated Uint8Array fills with TOP frames naturally. specific
// brace kinds are language-supplied via FrameSpec.brace_kinds and resolved
// to small ints at compile time.
export const FRAME_KIND_TOP = 0;
export const FRAME_KIND_PAREN = 1;
export const FRAME_KIND_BRACKET = 2;
// 3..255 reserved for language-defined brace kinds (class, interface, ...)

export interface FrameRecord {
  bracket: number; // FRAME_BRACKET_* constant
  kind: number; // FRAME_KIND_* or language-defined
  enter_idx: number; // token index of the opening bracket
  // index into FrameTable.frames of the enclosing frame, -1 for TOP.
  // consumers walk this chain to find e.g. the nearest brace frame when
  // the active frame is a paren or bracket.
  parent: number;
}

// bit 0 of FrameTable.signals: a colon character in this token consumed a
// pending ternary qmark on the active frame. stmt flags occupy bits 1..7
// (stmt_flags[i] maps to bit i + 1).
export const SIGNAL_TERNARY_COLON = 1;

export interface FrameTable {
  // active_frame[i] = index into `frames` for the frame on top after
  // token i has been processed. tokens that are themselves closers point
  // at the frame they CLOSED so their lookup is consistent with "frame
  // active during this token's lifetime."
  active_frame: Uint32Array;
  // for each token i: paren_depth, brace_depth, bracket_depth interleaved
  // as a flat Uint8Array (length = 3 * tokens.length). depths reflect the
  // state AFTER processing token i.
  depths: Uint8Array;
  // per-token at_start flag, 1 byte per token. true means: this token
  // is the first significant content after the active frame opened
  // (or after a member separator like `,` / `;`). consumed by reclassifiers
  // that distinguish "key position" from "value position" inside object
  // and interface bodies. populated only when FrameSpec.at_start is set.
  at_start: Uint8Array;
  // dense list of all frames ever opened, frames[0] is the implicit TOP
  // frame (kind=FRAME_KIND_TOP, never popped).
  frames: FrameRecord[];
  // kind id -> name. indices 0..2 are the built-in "top" / "paren" /
  // "bracket"; language-defined brace kinds from BraceKindSpec follow.
  // consumers resolve their kind names against this once per call and
  // compare integer ids in the loop.
  kind_names: string[];
  // per-token signal bits. bit 0 (SIGNAL_TERNARY_COLON) marks tokens whose
  // colon char consumed a pending ternary qmark; bits 1..7 snapshot the
  // active frame's stmt flags AFTER the token was processed. empty when
  // neither FrameSpec.ternary nor FrameSpec.stmt_flags is configured --
  // gates over signals fail closed against the empty array.
  signals: Uint8Array;
  // stmt flag bit positions by name: flag_names[i] occupies signals bit
  // i + 1. empty when stmt_flags is not configured.
  flag_names: string[];
}

export interface FrameSpec {
  // type name of the token carrying bracket characters in this language's
  // grammar. nearly always "punctuation" but exposed so grammars that
  // emit different types (e.g. operator for `<`/`>`) can still be tracked.
  punct_type: string;
  // character codes for each bracket pair. each must be a single code unit.
  // omit a bracket pair if the language doesn't use it (e.g. languages with
  // no square-bracket scope).
  brackets: {
    paren?: { open: string; close: string };
    brace?: { open: string; close: string };
    bracket?: { open: string; close: string };
  };
  // optional at_start tracking. when set, the frame table's at_start
  // array is populated per token. otherwise the array is zeroed and
  // downstream reclassifiers either don't consume it or compute their own.
  at_start?: AtStartSpec;
  // optional declarative brace-kind classification. when set, every `{`
  // frame gets a language-defined kind resolved during the walk and the
  // table's kind_names array maps kind ids back to spec names. when
  // omitted, brace frames keep the FRAME_KIND_TOP placeholder.
  brace_kinds?: BraceKindSpec;
  // optional per-frame ternary counting. when set, the table's signals
  // array marks colons that consumed a pending ternary qmark so colon
  // anchor rules can tell `cond ? a : b` from annotation colons.
  ternary?: TernarySpec;
  // optional named statement-context flags surfaced per token in the
  // signals array. at most 7 flags (signals bits 1..7).
  stmt_flags?: StmtFlagSpec[];
}

// per-frame ternary tracking. a token matching `qmark` increments the
// active frame's counter; a `colon_char` inside a punct_type token with a
// positive counter decrements it and sets SIGNAL_TERNARY_COLON on that
// token instead of leaving the colon to read as an annotation. counters
// live on the frame that saw the qmark, so a ternary inside parens never
// marks a colon outside them. counting is mode-blind: type-level `? :`
// pairs (conditional types) are balanced, so the net effect at any later
// colon matches a type-aware walker.
export interface TernarySpec {
  // token type + exact source text that increments the counter. exact
  // matching keeps `?.` `??` `?:` from counting.
  qmark: { type: string; text: string };
  // single colon character consumed against pending qmarks during the
  // punct_type char walk.
  colon_char: string;
}

// a named statement-context flag. armed by exact-text tokens, cleared by
// other exact-text tokens, separator chars, or a brace-frame close. the
// flag lives on the frame that armed it: nested frames open with the flag
// clear and a pop discards it. canonical case: TS var-decl annotations,
// where a colon rule needs "a let/const/var appeared earlier in this
// statement at this nesting level".
export interface StmtFlagSpec {
  name: string;
  arm: { type: string; texts: string[] };
  clear?: { type: string; texts: string[] };
  // single chars (inside punct_type tokens) that clear the flag on the
  // active frame. typically ";".
  clear_chars?: string;
  // also clear the flag on the parent frame when a brace frame pops --
  // a closing `}` ends the statement that armed the flag.
  clear_on_brace_close?: boolean;
}

// declarative brace-kind classification. the language describes how to
// decide what kind of scope a `{` opens and frame_track evaluates the
// rules during its single walk, so downstream reclassifiers share one
// classification instead of each maintaining their own.
//
// evaluation order at each opening brace:
//   1. a pending body marker (armed earlier by a body_markers entry) is
//      consumed when the brace opens outside all angle / paren / bracket
//      nesting -- the frame takes the marker's kind.
//   2. a pending marker with angle nesting yields pending_in_angles_kind
//      without consuming the marker (generic constraints like
//      `class C<T extends { x: V }>` -- the constraint's `{` is a type
//      literal, the real body brace still claims the marker).
//   3. otherwise the previous non-trivia token is tested against
//      prev_rules in order; the first matching rule's kind wins.
//   4. no rule matches: default_kind (or start_kind when the brace has
//      no previous token).
export interface BraceKindRule {
  // token type name of the previous non-trivia token.
  prev_type: string;
  // exact source texts to match. omit to match any text of prev_type.
  prev_texts?: string[];
  // match when the previous token's LAST character is in this set. used
  // for shapes like "punctuation ending in `)`" where the grammar may
  // coalesce `)` with adjacent punctuation chars.
  prev_last_char_in?: string;
  kind: string;
}

export interface BraceKindSpec {
  // pending markers: a token of `type` with source text `text` arms the
  // marker; the next top-level `{` takes `kind` and consumes it.
  body_markers?: { type: string; text: string; kind: string }[];
  // kind assigned when a marker is pending but the `{` opens inside
  // angle brackets. the marker stays armed for the real body brace.
  pending_in_angles_kind?: string;
  // angle-bracket depth tracking feeding the pending-marker rules.
  // exact-text matching against tokens of `type`; coalesced closers
  // (`>>`, `>>>`) pop multiple levels.
  angles?: {
    type: string;
    open: string;
    closes: { text: string; pops: number }[];
  };
  prev_rules?: BraceKindRule[];
  // fallback kind when no rule matches.
  default_kind: string;
  // kind when the brace has no previous token. defaults to default_kind.
  start_kind?: string;
}

// compound_compose primitive — stack-driven multi-class type composition.
// canonical case: markdown inline styling where bold/italic/code can nest
// and each token inside the nested region gets a composed class like
// "bold italic code". walks tokens once, maintains an open-style stack
// via open / close marker pairs, and emits a composed type per token via
// dynamic interning into the token_types array.

export interface CompoundComposeConfig {
  // each entry maps a (open marker type, close marker type) pair to a
  // style name. when an open token appears, the style name is pushed
  // onto the stack; when the matching close appears, popped.
  styles: { open_type: string; close_type: string; style_name: string }[];
  // when true, finding a `\n` in the source gap between two tokens flushes
  // the entire style stack -- handles grammars that drop back to a block
  // state on newlines without emitting close markers.
  auto_pop_on_newline: boolean;
  // string used to join style names into a composed type (e.g. " " for
  // HTML class lists).
  join_separator: string;
  // when true and the composed token's base type already equals one of
  // the active style names, don't repeat it in the composed string.
  dedup_against_base: boolean;
}

// matched_bracket primitive — retag a pair of opener / matching closer
// tokens as a different type. canonical case: Svelte's `{#if ... }` block
// braces are emitted by the grammar as `expression` tokens (so the inner
// JS body parses) but render better as `punctuation`. this primitive walks
// the stream, finds each open token whose follow-on token matches the
// optional sigil predicate, scans forward for the matching close, and
// retags both endpoints.

export interface MatchedBracketConfig {
  // type + text of the opening token (must match exactly).
  open_type: string;
  open_text: string;
  // type + text of the closing token (must match exactly).
  close_type: string;
  close_text: string;
  // optional gate: the next non-trivia token immediately after the open
  // must have this type AND its source text must be in this set. used to
  // distinguish block braces (followed by `#` / `:` / `/` / `@`) from
  // ordinary interpolation braces.
  post_open_required?: { type: string; text_in: string[] };
  // type to retag the opener to. defaults to open_type (no retag).
  retag_open_to?: string;
  // type to retag the closer to. defaults to close_type (no retag).
  retag_close_to?: string;
}

// merge_adjacent primitive — splice anchor + immediately-following token
// into one. output token count shrinks per merge. portable: a host runtime
// executes the same spec for every language that needs adjacent-token
// merging (Rust lifetime+type fusion is the canonical case).

export interface MergeAdjacentConfig {
  // anchor token type that triggers a merge attempt.
  anchor_type: string;
  // type names of the token immediately after the anchor that can be
  // consumed into the merged token.
  consume_next_types: string[];
  // refuse the merge when the token at (anchor + offset) is of the given
  // type AND its source text starts with any of the listed characters.
  // typically used for the Rust case: refuse to merge `'a Fn` because
  // `Fn(` is a function-call generic, not a type to fuse into the lifetime.
  refuse_if?: {
    offset: number; // 1-based: 2 means "two tokens after the anchor"
    type_must_be: string; // token type required for the guard to apply
    first_char_in: string; // single-char codes that disqualify the merge
  };
  // resulting type of the merged token. defaults to anchor's type.
  result_type?: string;
}

// per-token at_start computation. a frame's "at_start" is true immediately
// after the frame opens or after a separator token at that frame's depth
// fires. it is set to false the moment a non-trivia, non-transparent token
// appears.
//
// transparent_types: token types that pass through without changing at_start.
//   the entire type is transparent (e.g. all comments).
// transparent_texts_for_type: a map of token type -> set of source texts
//   that, for that specific type, are transparent. lets a language treat
//   modifier keywords like `async` `static` `public` as transparent without
//   also marking every other keyword that way. matched against the token's
//   raw source via input.slice(start, end) -- exact equality, no regex.
// reset_chars: single-character punctuation that re-arms at_start = true on
//   the top frame. typically `,` `;` and the language's open-brace char.
export interface AtStartSpec {
  transparent_types?: string[];
  transparent_texts_for_type?: { type: string; texts: string[] }[];
  reset_chars: string;
  // brace kinds (names from BraceKindSpec) whose member close re-arms
  // at_start: when a `}` pops a frame and the PARENT frame's kind is in
  // this list, at_start re-arms on the parent. class and interface
  // bodies need this because consecutive members have no separator
  // between a method's closing `}` and the next member name. all other
  // closers consume at_start. requires brace_kinds to be configured.
  rearm_after_close_kinds?: string[];
}

// Reclassifier types
//
// A Reclassifier is a pure function over a TokenizeResult that may rewrite
// token types, splice new tokens in, or both. Multiple reclassifiers are
// composed into a pipeline by `reclassify(...)`.
//
// Claim-producing reclassifiers (step 2 of the refactor) additionally carry
// a `__claim` method that returns claims for a frozen input rather than
// mutating. The pipeline runner batches adjacent claim-producers: each sees
// the same base stream, their claims merge by precedence, and the winning
// claims apply once. Passes without `__claim` still mutate in place and
// break the batch.

export type Reclassifier = (input: string, result: TokenizeResult) => TokenizeResult;

export type ReclassifierPipeline = Reclassifier[];

// A claim asserts that a given token should have a given type, at the given
// precedence. Higher precedence wins during merge; when two claims tie on
// precedence, the earlier-emitted claim wins (stable insertion order).
//
// The Claim object form is retained for diagnostic APIs (test_util's
// collect_claims_per_pass). Hot paths emit into a ClaimSink instead, which
// writes directly into parallel typed arrays to avoid per-match allocation.
export interface Claim {
  token_idx: number;
  type_id: number;
  precedence: number;
}

// Allocation-free claim emitter. Claim producers call `sink.emit(...)` for
// each claim; the sink stores the tuple in parallel typed arrays. The batch
// runner reuses a single sink across all producers in a batch and applies
// winners in one pass.
export interface ClaimSink {
  emit(token_idx: number, type_id: number, precedence: number): void;
}

// Claim-mode entry. A claim-producing reclassifier may append new names to
// `token_types` (for types it wants to rewrite to) but MUST NOT mutate any
// slot of `tokens`. Emitted type_ids must be valid for the (possibly
// extended) `token_types` array at call time.
//
// `frames` is the FrameTable produced by an upstream `frame_track` stage,
// undefined when no such stage ran. ClaimFns that need scope-stack data
// read from this side table instead of maintaining their own.
export type ClaimFn = (
  input: string,
  tokens: Uint32Array,
  token_types: string[],
  sink: ClaimSink,
  frames?: FrameTable,
) => void;

// A Reclassifier with a `__claim` property is claim-producing: callable in
// apply mode (as a normal Reclassifier) and also usable in batch mode via
// `.__claim`. The apply-mode path applies the claims itself; the batch path
// defers application so multiple passes can merge claims by precedence.
export type ClaimingReclassifier = Reclassifier & {
  __claim: ClaimFn;
};

// reclassifier layers. a reclassifier belongs to exactly one layer, which
// reflects what kind of transform it performs — and, post-refactor, which
// execution tier it will run in once claims-based composition lands.
//
//   shape       — modifies the token STREAM (merges adjacent tokens, splits
//                 tokens, otherwise changes token count / positions). must
//                 run sequentially and before type_claim passes because
//                 downstream passes' token indices depend on the final stream
//                 shape. examples: bash/extend_variables, bash/merge_numbers,
//                 rust/extend_lifetime_over_type.
//   type_claim  — rewrites only token TYPES (no shape changes). the vast
//                 majority of passes. in the current architecture these still
//                 run sequentially; in the planned claims-based architecture
//                 they will run against the base stream and merge by precedence.
//   embed       — splices SUB-LANGUAGE tokens into the host stream. always
//                 runs after all type_claim passes so sub-tokenization sees
//                 the fully classified host tokens around it.
//
// the layer is metadata today (step 1 of the reclassifier refactor). later
// steps drive the pipeline runner from these labels.
export type ReclassifierLayer = "shape" | "type_claim" | "embed";

// a tagged reclassifier advertises which token types it may produce and which
// execution layer it belongs to. the language factory uses `produces` to decide
// whether the pass runs under a given fidelity setting; an empty `produces`
// array marks the pass as always-on (correctness / normalisation / embed
// passes), equivalent to leaving the reclassifier untagged in earlier versions.
export interface TaggedReclassifier {
  reclassifier: Reclassifier;
  produces: string[];
  layer: ReclassifierLayer;
}

export type ReclassifierEntry = Reclassifier | TaggedReclassifier;
export type LanguagePipeline = ReclassifierEntry[];

// coarse fidelity tiers plus a fine-grained allowlist by output token type.
//   'high'        — run every reclassifier (all produces). the default.
//   'low'         — run only always-on entries; skip every tagged pass. the
//                   output stream contains bare grammar-level tokens.
//   string[]      — run always-on entries plus any tagged entry whose
//                   `produces` intersects the list. unknown names are
//                   silently ignored.
export type FidelityLevel = "high" | "low";
export type FidelitySpec = FidelityLevel | readonly string[];

export interface LanguageOptions {
  fidelity?: FidelitySpec;
  // when present, the language factory installs an annotation extractor in
  // the returned LanguageFn. when absent the factory closure is identical to
  // today's, preserving the zero-cost-when-disabled invariant.
  annotation?: AnnotationConfig;
}

// ---------------------------------------------------------------------------
// annotation transformer system
// ---------------------------------------------------------------------------
//
// in-source directives `[!verb[#id][ args]]` written inside source-language
// comments are extracted post-tokenize and produce overlays — additional
// CSS classes that the renderer applies to token spans (token-mode) or line
// spans (line-mode). overlays do NOT affect token types; they live in a
// parallel structure on TokenizeResult.

export interface AnnotationConfig {
  // plugins claim verbs and produce overlay contributions. order is preserved
  // for stable error reporting on collisions.
  plugins: AnnotationPlugin[];
  // optional sink for extraction errors. when omitted the framework throws.
  on_error?: (issue: AnnotationIssue) => void;
}

export interface AnnotationPlugin {
  // verbs claimed by this plugin. registration-time collision is an error.
  verbs: string[];
  // 'shared' (default) means the framework parses the marker args and passes
  // a ParsedArgs to the plugin. 'raw' passes the raw string and the plugin
  // parses it itself. phase 1 supports only 'shared'.
  parse?: "shared" | "raw";
  handle(input: AnnotationInput): AnnotationOutput;
}

export interface AnnotationInput {
  verb: string;
  id?: string;
  args: ParsedArgs | string;
  // resolved source range the marker targets (already includes pair resolution
  // and anchor lookup, so plugins receive a fully-resolved span).
  range: SourceRange;
  marker: SourcePosition;
}

export interface AnnotationOutput {
  overlays?: OverlayContribution[];
}

export interface OverlayContribution {
  start: number;
  end: number;
  // CSS class name (e.g. "emphasis", "highlight", "diff-add").
  classification: string;
  // line-mode overlays attach to the <span class="l"> wrapping each line in
  // the range; token-mode overlays attach to each <span class="tok"> whose
  // bytes intersect the range. defaults to false (token-mode).
  line_mode?: boolean;
}

// argument forms the framework parses for plugins with parse: 'shared'.
//
// `inclusive*` (on lineRef and range) follows the spec's "more dots more
// content" rule:
//   `..`  -> inclusive: false (endpoint excluded)
//   `...` -> inclusive: true  (endpoint included)
// for single-line `lineRef` with no `to`, `inclusive` is ignored.
//
// `range` carries independent inclusivity per endpoint so that paired
// half-open markers (`<a>...` paired with `..<b>`) can preserve each
// half's chosen inclusivity. closed forms set both flags from the same
// dot count (`<a>..<b>` -> both false, `<a>...<b>` -> both true).
export type ParsedArgs =
  | { kind: "bare" }
  | { kind: "lineCount"; count: number }
  | { kind: "lineRef"; from: number; to?: number; inclusive?: boolean }
  | {
      kind: "range";
      from: Anchor | null;
      to: Anchor | null;
      inclusive_start: boolean;
      inclusive_end: boolean;
    }
  | { kind: "set"; anchor: Anchor }
  // `***` shorthand: every byte on the marker's own line, token-mode. the
  // cleaner equivalent of `*..*` (which the parser rejects as malformed
  // because it has no anchor reference). use bare `[!em]` for line-mode
  // styling instead.
  | { kind: "wholeLine" };

export type Anchor =
  | { kind: "word"; value: string }
  | { kind: "literal"; value: string }
  | { kind: "wildcard" };

export interface SourcePosition {
  // byte offsets into the original input string.
  start: number;
  end: number;
  // 1-indexed line number containing the marker.
  line: number;
}

export interface SourceRange {
  // byte offsets into the original input.
  start: number;
  end: number;
  // 1-indexed line numbers covering the resolved range.
  start_line: number;
  end_line: number;
}

export type AnnotationIssueKind =
  | "verb_collision"
  | "anchor_not_found"
  | "unmatched_pair"
  | "marker_spans_newline"
  | "set_with_pairing"
  | "malformed"
  | "unsupported";

export interface AnnotationIssue {
  kind: AnnotationIssueKind;
  message: string;
  position: SourcePosition;
}

// the result attached to TokenizeResult.overlays. flat typed arrays so the
// renderer's overlay sweep is integer-only.
export interface OverlayResult {
  // sorted by start. Uint32Array of 4-tuples [start, end, class_id, flags].
  // flags bit 0 = line-mode. other bits reserved (focus-sibling etc.).
  ranges: Uint32Array;
  // class_id -> CSS class name.
  classifications: string[];
  // sorted Uint32Array pairs [start, end] of marker bytes the renderer
  // substitutes with whitespace (or omits, depending on phase 1 choice).
  skip_ranges: Uint32Array;
  // 1-indexed line numbers (sparse) the renderer should drop entirely:
  // lines that contained only marker bytes plus whitespace. stored as a
  // dense Uint8Array indexed by line number; bit 0 of byte n marks line n.
  elided_lines: Uint8Array;
}

// a compiled language: call the factory with options to get the tokenize
// function for that configuration. `language()` (no args) is the default,
// full-fidelity pipeline.
export type LanguageFactory = (options?: LanguageOptions) => LanguageFn;

// per-call options for rendering tokens to HTML. passed to the function
// returned by a language package's `language()` factory, and consumed
// directly by `to_html`.
export interface RenderOptions {
  class_name?: string;
  // numbering counts visible lines, so a line elided by an annotation never
  // leaves a gap.
  line_numbers?: boolean | { start?: number };
  // emitted on <pre> after class, in the order given. true is a bare name,
  // false emits nothing. `class` and `style` are reserved.
  attributes?: Record<string, string | number | boolean>;
  // `has-<classification>` on <pre> for every overlay the snippet carries.
  // default true.
  has_classes?: boolean;
}

// Pattern language for `rewrite_types` — tag-discriminated union so authors
// build patterns with the exported combinator helpers (`type`, `seq`,
// `any_of`, `optional`, `capture`, `balanced_parens`).

// Named character-class predicates over a token's source text. Used as a
// declarative alternative to writing a hand-rolled Reclassifier just to
// check casing conventions. Adding a new predicate name requires a matching
// runtime implementation in reclassifier.ts.
export type CharPredName = "upper_snake_case" | "pascal_case";

export interface TypePatternSpec {
  __kind: "type";
  type_name: string;
  value?: string | string[];
  // Filter the matched token by a character-class predicate on its source
  // text. Combinable with `value`: both must pass. Currently only used on
  // anchor patterns; when used inside `when` it falls back to the runtime
  // predicate but does not yet skip the type/value bytecode work.
  text_pred?: CharPredName;
}

export interface SeqPatternSpec {
  __kind: "seq";
  children: TokenPatternSpec[];
}

export interface AnyOfPatternSpec {
  __kind: "anyOf";
  branches: TokenPatternSpec[];
}

export interface OptionalPatternSpec {
  __kind: "optional";
  inner: TokenPatternSpec;
}

export interface CapturePatternSpec {
  __kind: "capture";
  name: string;
  inner: TokenPatternSpec;
}

// Walk tokens counting paren depth inside bracket-carrying tokens until
// depth returns to zero. Used for arrow-function parameter lists.
export interface BalancedPatternSpec {
  __kind: "balanced";
  open: string;
  close: string;
  max_tokens?: number;
  // token type carrying the bracket characters. defaults to "punctuation";
  // grammars that emit brackets under a different type name set this.
  punct_type?: string;
}

// Match the inner pattern zero or more times, optionally separated. The
// repetition is POSSESSIVE: once an iteration matches, the matcher never
// backtracks into fewer iterations -- design patterns so the token after
// the repetition cannot also start an iteration. An iteration that
// consumes no tokens terminates the loop (no infinite repeats). Captures
// inside the body record one span per iteration.
export interface RepeatPatternSpec {
  __kind: "repeat";
  inner: TokenPatternSpec;
  separator?: TokenPatternSpec;
}

// Zero-width negative lookahead over a single token: succeeds when the
// next non-trivia token does NOT match the inner spec (or the stream has
// ended), without consuming anything. An inner spec naming an unknown
// type or predicate fails CLOSED -- the assertion (and so the rule)
// never matches, consistent with the rest of the pattern language.
export interface NotPatternSpec {
  __kind: "not";
  inner: TypePatternSpec;
}

// Char-aware parameter-list walker: locate an opening "(" from the current
// position, walk its separator-split chunks, and record each tagged name
// token as one capture span under `into` (claimed by a `{ into: type }`
// rewrite map like any capture). The construct exists because grammars
// coalesce adjacent punctuation ("((", "({"), so paren walking needs
// character offsets the token-granular combinators cannot express:
// detection composes from ordinary anchors, gates, and combinators; the
// walk runs as one opcode.
export interface ParamsPatternSpec {
  __kind: "params";
  // capture name receiving one single-token span per tagged parameter.
  into: string;
  // how to locate the opening paren:
  //  "starts_with" — the next non-trivia token must be punctuation whose
  //                  text begins with "(" (function / method shapes).
  //  "scan"        — scan forward through punctuation counting [] and {}
  //                  depth to the first "(" at top depth (rides over
  //                  go-style [T any] generics). the first non-trivia
  //                  token must be punctuation; an unbalanced close or
  //                  the scan bound fails the branch.
  //  "arrow"       — the ANCHOR token carries the "(": try each "("
  //                  offset and accept the first whose matching close
  //                  ends its token and is followed by "=>". must be the
  //                  first element of `when`.
  find_open: "starts_with" | "scan" | "arrow";
  // chunk strategies:
  //  "first_ident"   — tag the first identifier at depth 1 of each chunk;
  //                    `default_introducer` suspends tagging until the
  //                    next chunk; `transparent_operators` pass through.
  //  "carry_pending" — bare single-name chunks pend; a chunk with a type
  //                    after its first name promotes itself and all
  //                    pending names (go's `x, y int`).
  strategy: "first_ident" | "carry_pending";
  // single-char chunk separator at top depth. usually ",".
  separator: string;
  default_introducer?: string;
  transparent_operators?: string[];
  // skip a leading generics group before locating the paren: token-text
  // angle counting over operator tokens (`<` `>` `>>` `>>>`).
  skip_generics: boolean;
  // arrow mode: allow `(...): T =>` by scanning a return type annotation
  // between the close and the arrow.
  skip_ts_return_type: boolean;
  // arrow mode: reject a candidate whose preceding token ends with ":"
  // unless directly inside an object-kind brace frame (a `: (x) => y`
  // type signature vs an object-literal function value). requires an
  // upstream frame_track stage; fails closed without one.
  skip_in_type_position: boolean;
  // scan mode bound on tokens examined while locating the paren.
  scan_max_tokens: number;
}

// Type-expression span walker: from the current position, consume tokens
// in "type mode" until a terminator, recording each identifier that reads
// as a type reference as one capture span under `into` (claimed by a
// `{ into: type }` rewrite map like any capture). The construct exists
// because type-expression extent is stream-continuous: where a type ends
// depends on bracket / angle depth relative to entry and on terminator
// classes (value operators, statement keywords), which the token-granular
// combinators cannot express. Entry detection composes from ordinary
// anchors and gates; the span walk runs as one opcode.
//
// Exits (always relative to the depths at entry):
//   - a `)` `}` `]` that drops below entry depth
//   - `;` at entry depth
//   - `,` at entry depth (exit_on_comma; off for extends / implements /
//     generics lists, whose commas separate more types)
//   - `=` at entry depth (exit_on_eq; off for generics, where `=`
//     introduces a default type)
//   - `=>` at entry depth, unless the previous token ends with `)` (a
//     function type's result arrow)
//   - `?` at entry depth (exit_on_qmark; on for as / satisfies spans,
//     which end at a ternary, off elsewhere where `?` is type level)
//   - any operator in value_op_terminators / keyword in
//     stmt_keyword_terminators at entry depth
//   - the unmatched `>` when enter_angle is set (the span IS an angle
//     group, e.g. generic type arguments)
//   - a `{` at entry depth whose previous token reads as the end of a
//     type expression (brace_exit_on_closer; return-type and heritage
//     spans end at the body brace)
//
// Inside the span, identifiers are recorded EXCEPT key positions: at
// nested paren / brace depth, an identifier directly followed by `:` or
// `?:` is a parameter name or property key, not a type reference.
export interface TypeSpanPatternSpec {
  __kind: "type_span";
  // capture name receiving one single-token span per type identifier.
  into: string;
  exit_on_comma: boolean;
  exit_on_eq: boolean;
  exit_on_qmark: boolean;
  // start the walk one angle level deep: the anchor consumed the opening
  // `<`, so the matching unmatched `>` ends the span.
  enter_angle: boolean;
  brace_exit_on_closer: boolean;
  // operator source texts that end the span at entry depth (binary /
  // assignment / increment operators that cannot appear in a type).
  value_op_terminators?: string[];
  // keyword source texts that end the span at entry depth (statement
  // starters that mean the type expression is over).
  stmt_keyword_terminators?: string[];
  // keywords that can legitimately END a type expression; used by the
  // brace_exit_on_closer check so `(): void {` exits at the body brace.
  type_terminal_keywords?: string[];
  // with enter_angle: before walking, verify the span LOOKS like a
  // generic type-argument list -- a balanced single-char `>` close exists
  // (riding `{...}` groups, bailing on `;` or a stray `}`), and the token
  // after the close is consistent with type arguments finishing (bracket
  // / separator punctuation, `=` `=>` `?:` `|` `&` `>` `?` `!` operators,
  // or `extends` / `implements`). when the check fails the BRANCH fails,
  // so `a < b` comparisons never start a span.
  verify_generic_args: boolean;
}

export type TokenPatternSpec =
  | TypePatternSpec
  | SeqPatternSpec
  | AnyOfPatternSpec
  | OptionalPatternSpec
  | CapturePatternSpec
  | BalancedPatternSpec
  | RepeatPatternSpec
  | NotPatternSpec
  | ParamsPatternSpec
  | TypeSpanPatternSpec;

// A rewrite rule says: starting at a token matching `anchor` (a bare type
// name, or `type(name, value)` to also constrain source text), if the
// token stream after the anchor matches `when` (and optionally the token
// stream before the anchor matches `before`), apply `rewrite`:
//   - `string`   → rewrite the anchor token's type to this name (Phase 1).
//   - object map → for each `{ capture_name: type_name }` entry, find the
//                  capture() with that name in `when` and rewrite every
//                  token inside every span that capture recorded -- one
//                  span per occurrence, so captures inside repeat bodies
//                  retag each iteration. Missing captures silently skip.
// anchor form of a rewrite rule. extends the single-token filters with
// optional gates over the shared frame table produced by an upstream
// frame_track stage:
//
//   at_start     — the token must sit at member start (frames.at_start).
//   frame_kinds  — the kind of the nearest enclosing BRACE frame must be
//                  one of these names (paren / bracket frames are walked
//                  through via parent links; "top" matches tokens no
//                  brace encloses).
//   frame_direct — with frame_kinds, match the token's INNERMOST frame
//                  instead of walking to the nearest brace. a token
//                  inside parens then only matches the built-in "paren"
//                  kind, so member-position rules can require the brace
//                  body itself rather than any nesting depth within it.
//   ternary_colon — require (true) or forbid (false) that a colon char in
//                  the anchor consumed a pending ternary qmark. needs
//                  FrameSpec.ternary configured upstream.
//   stmt_flags_all / stmt_flags_none — every named stmt flag must be
//                  armed / no named flag may be armed on the anchor's
//                  frame. needs FrameSpec.stmt_flags configured upstream.
//
// either gate failing — or the pipeline having no frame_track stage at
// all — means the rule never fires (fail closed). `type(...)` helper
// output is assignable here for gate-free anchors.
export interface AnchorSpec {
  type_name: string;
  value?: string | string[];
  // match when the anchor's source text ENDS with one of these strings.
  // grammars coalesce adjacent punctuation (`):`, `]:`, `}))`), so exact
  // value sets cannot anchor on "a token whose last char is `:`" without
  // enumerating every bundle; this is the suffix form. combinable with
  // `value`: both must pass.
  value_ends_with?: string | string[];
  text_pred?: CharPredName;
  at_start?: boolean;
  frame_kinds?: string[];
  frame_direct?: boolean;
  ternary_colon?: boolean;
  stmt_flags_all?: string[];
  stmt_flags_none?: string[];
}

export interface RewriteRule {
  // The anchor identifies the token to rewrite. A bare type name is
  // sugar for `type(name)` with no value constraint; the object form
  // also filters on source text, character class, and frame gates.
  anchor: string | AnchorSpec;
  before?: TokenPatternSpec;
  // when is optional: a rule with only `before` (and optionally an
  // anchor value constraint) runs a no-op forward scan that always
  // succeeds, so the anchor is rewritten whenever the preceding window
  // matches.
  when?: TokenPatternSpec;
  rewrite: string | Record<string, string>;
  // claim precedence for this rule's targets (anchor and captures).
  // defaults to the target type's shared-table precedence. languages
  // whose pipeline priority deviates from the table (e.g. structural
  // position beating a casing convention) state the deviation here
  // instead of dropping to a hand-written ClaimFn.
  precedence?: number;
}

export interface RewriteOptions {
  // token type names treated as trivia and skipped between pattern elements.
  // for JavaScript this is typically ["comment"].
  trivia?: string[];
}

// A "language function" — the common-case entry point every language package
// exports via `create_language`. Takes source text, returns the full enriched
// TokenizeResult. This is what `embed_grammars` calls to sub-tokenize a span.
export type LanguageFn = (input: string) => TokenizeResult;

// Detailed embed entry for cases that need slicing / delimiter wrapping.
// - `trim_start`/`trim_end` skip that many chars at the respective end of the
//   host token before passing the content to the sub-language.
// - `wrap_token` (optional) names a host token type. If set, the trimmed
//   delimiter chars are re-emitted as tokens of this type so they stay
//   styled — useful for tagged-template backticks which would otherwise
//   become untokenized gaps in the output.
export interface EmbedEntry {
  language: LanguageFn;
  trim_start?: number;
  trim_end?: number;
  wrap_token?: string;
}

// Mapping from host token type names to the sub-language (or detailed
// EmbedEntry) to apply when the host emits a token of that type. When
// `embed_grammars` encounters such a token, it calls the language on the
// token's source slice, merges the sub-result's token types into the host's,
// remaps sub type IDs, and splices the remapped tokens in place of the
// original host token.
export interface EmbedMapping {
  [host_type_name: string]: LanguageFn | EmbedEntry;
}

// ---------------------------------------------------------------------------
// embed_interleaved — generic discontinuous embedding
// ---------------------------------------------------------------------------
//
// Some host-language constructs produce a "group" of tokens where content
// for a sub-language is interleaved with host-language "holes" that must be
// preserved verbatim. Tagged template literals are the exemplar case —
// `html`<p class="${cls}">hi</p>`` has HTML content broken up by a JS
// interpolation that needs to stay highlighted as JS.
//
// `embed_interleaved` handles this generically: the user provides a scanner
// callback that finds a group in the token stream and describes its regions
// (content chunks, hole chunks, synthetic delimiter wrappers). The transform
// then builds a single virtual source string, tokenizes it with the
// sub-language in one call (giving the sub-tokenizer full state continuity
// across holes), and splices the result back into the host stream with
// positions remapped to the real source.

/**
 * Region kinds describing how each part of a group contributes to the output.
 */
export type Region = ContentRegion | HoleRegion | SyntheticRegion;

/**
 * Content region — its source bytes are copied into the virtual source and
 * handed to the sub-language. Sub-tokens covering this range are emitted in
 * the output at their remapped real positions.
 */
export interface ContentRegion {
  kind: "content";
  /** Start of the range in the real host input (inclusive). */
  source_start: number;
  /** End of the range in the real host input (exclusive). */
  source_end: number;
}

/**
 * Hole region — its source bytes become placeholder-filled in the virtual
 * source so the sub-language's state machine flows across them. In the output,
 * the original host tokens in `[token_start, token_end)` are emitted verbatim
 * in place of the hole.
 */
export interface HoleRegion {
  kind: "hole";
  /** Start of the range in the real host input (inclusive). */
  source_start: number;
  /** End of the range in the real host input (exclusive). */
  source_end: number;
  /** First host token index to emit verbatim. */
  token_start: number;
  /** One past the last host token index to emit verbatim. */
  token_end: number;
}

/**
 * Synthetic region — does not contribute to the virtual source and has no
 * corresponding host token. A NEW token is synthesized at the region's
 * position with the given type name. Used for delimiter characters that
 * are part of a larger host token but need to appear as separate tokens in
 * the output (e.g. the backticks of a JS tagged template).
 */
export interface SyntheticRegion {
  kind: "synthetic";
  /** Start of the range covered by the synthetic token (inclusive). */
  source_start: number;
  /** End of the range covered by the synthetic token (exclusive). */
  source_end: number;
  /** Token type name — merged into token_types if not already present. */
  type_name: string;
}

/**
 * A group descriptor returned by a scan callback. Describes everything the
 * core primitive needs to process a discontinuous embedded group.
 */
export interface GroupDescriptor {
  /** Host token index where the group begins (inclusive). */
  token_start: number;
  /** Host token index where the group ends (exclusive). */
  token_end: number;
  /**
   * The group's regions in source order. The scanner is responsible for
   * ensuring regions are non-overlapping and cover the group meaningfully.
   */
  regions: Region[];
  /**
   * Optional per-group sub-language override. If set, this language is
   * used instead of the config's default — lets one scanner route
   * different groups to different sub-languages (e.g. `html` vs `css`
   * tagged templates in one pass).
   */
  language?: LanguageFn;
}

/**
 * Scanner callback — called at each host token position. Returns a
 * GroupDescriptor if a group starts at `start_idx`, or null if not. The
 * scanner is the only host-specific code; the core transform is entirely
 * language-agnostic.
 */
export type GroupScanFn = (
  tokens: Uint32Array,
  input: string,
  start_idx: number,
  token_types: string[],
) => GroupDescriptor | null;

export interface EmbedInterleavedConfig {
  /** Scanner that finds groups in the host token stream. */
  scan: GroupScanFn;
  /**
   * Default sub-language used when a descriptor omits `language`. May be
   * omitted if every descriptor supplies its own.
   */
  language?: LanguageFn;
  /**
   * Character used to fill hole spans in the virtual source. Must be
   * "neutral" for the sub-language's tokenizer. Default: " ".
   */
  hole_char?: string;
}

// Introspector types
export interface IntrospectorOptions {
  log?: ((type: string, data: any) => void) | null;
  collect_history?: boolean;
  max_history_size?: number;
  grammar_mapper?: GrammarMapper;
  state_names?: Record<number, string>;
  rule_names?: Record<number, Record<number, string>>;
  enhanced_logging?: boolean;
}

export interface IntrospectorEvent {
  type: string;
  pos?: number;
  char?: number;
  char_str?: string;
  current_state?: string | number;
  current_state_index?: number;
  stack_depth?: number;
  state_stack?: string[] | number[] | Uint16Array;
  state_stack_indices?: number[];
  full_state_path?: string[] | number[];
  full_state_indices?: number[];
  probe_mode?: boolean;
  probe_entry?: any;
  failed_probes?: string[];
  input_context?: InputContext;
  rule_index?: number;
  rule_name?: string;
  matched_length?: number;
  transition?: string | number | null;
  token_type?: string | number | null;
  stack_op?: string | number;
  target_state?: string | number;
  is_target_probe_state?: boolean;
  is_in_probe_state?: boolean;
  from_state?: string | number;
  from_state_index?: number;
  to_state?: string;
  to_state_index?: number;
  start?: number;
  end?: number;
  token_index?: number;
  token_name?: string;
  is_fallback?: boolean;
  is_non_ascii?: boolean;
  old_end?: number;
  new_end?: number;
  success?: boolean;
  reset_pos?: number;
  reset_state?: string | number | null;
  reason?: string;
  final_stack_depth?: number;
  token_count?: number;
  final_state?: string | number;
  timestamp?: number;
  token_emitted?: boolean;
  text?: string;
}

export interface InputContext {
  before: string;
  char: string;
  after: string;
  display: string;
}

export interface StateInfo {
  current_state: number;
  state_stack: number[];
  full_path: number[];
}

export interface TokenInfo {
  type: string;
  token_type: number;
  token_name: string;
  start: number;
  end: number;
  value?: string;
  token_index: number;
  is_fallback?: boolean;
  is_non_ascii?: boolean;
}

export interface RouteStep {
  type: "START" | "PUSH" | "POP" | "TRANSITION";
  state?: number;
  state_name?: string;
  from?: number;
  from_name?: string;
  to?: string | number;
  to_name?: string;
  position: number;
  depth: number;
  rule?: string | number | null;
  token_emitted?: boolean;
  entry_position?: number;
  characters_processed?: number;
  rules_applied?: Array<{ rule: string; count: number }>;
  is_probe?: boolean;
}

export interface StateSession {
  state_name: string;
  state_index: number;
  entry_position: number;
  exit_position?: number;
  characters_processed: number;
  rules_applied: Map<string, number>;
  is_probe: boolean;
  depth: number;
  entry_rule?: string;
  exit_rule?: string;
}

export interface CompleteState {
  position: number;
  char: string | null;
  context: InputContext;
  state: {
    current: number;
    stack: number[];
    full_path: number[];
    depth: number;
  };
  current_token: TokenInfo | null;
  rules_matched: IntrospectorEvent[];
  state_transitions_at_position?: IntrospectorEvent[];
  all_events_at_position?: IntrospectorEvent[];
  recent_history: IntrospectorEvent[];
  total_events_processed: number;
  current_state_session?: StateSession;
}

export interface TokenHistory {
  token: TokenInfo;
  history: IntrospectorEvent[];
}

export interface Report {
  summary: {
    input_length: number;
    token_count: number;
    state_transitions: number;
    rule_matches: number;
    probe_events: number;
  };
  tokens: TokenInfo[];
  state_transitions: IntrospectorEvent[];
  top_rules: Array<{ rule: string | number; count: number }>;
  probe_history: IntrospectorEvent[];
}

// Grammar Mapper types
export interface RuleDetails {
  pattern: string;
  token?: string;
  action: string | null;
  description: string;
  original: GrammarRule;
}

export interface TokenDescription {
  name: string;
  position: string;
  text: string;
  length: number;
}

export interface Analysis {
  summary: {
    total_tokens: number;
    unique_token_types: number;
    states_visited: number;
    max_stack_depth: number;
  };
  tokens_by_type: Record<
    string,
    {
      count: number;
      examples: string[];
      total_length: number;
    }
  >;
  state_visits: Record<string, number>;
  rule_usage: Record<
    string,
    {
      count: number;
      state: string;
      details: RuleDetails | null;
    }
  >;
}

export interface PositionAnalysis {
  position: number;
  character: string;
  input_context: string;
  state_path: string;
  state_stack: string[];
  current_state: string;
  depth: number;
  current_token: (TokenInfo & { type_name: string }) | null;
  matched_rules: Array<{
    rule: string;
    details: RuleDetails | null;
  }>;
  recent_events: string[];
}

// Grammar Mapper class interface
export interface IGrammarMapper {
  original_grammar: Grammar;
  compiled_grammar: CompiledGrammar;
  state_names: Record<number, string>;
  state_rules: Record<number, Record<number, string>>;
  rule_descriptions: Record<number, Record<number, RuleDetails>>;
  token_names: Record<number, string>;

  get_state_path(state_indices: number[]): string;
  get_state_name(state_index: number): string;
  get_rule_name(state_index: number, rule_index: number): string;
  get_rule_details(state_index: number, rule_index: number): RuleDetails | null;
  get_token_name(token_type: number): string;
  describe_transition(from_state: number, to_state: number, stack_op: number): string;
  describe_token(token_type: number, start: number, end: number, text?: string): TokenDescription;
  create_enhanced_introspector<T extends TokenizerIntrospector>(
    IntrospectorClass: new (options: IntrospectorOptions) => T,
    options?: IntrospectorOptions,
  ): T;
  analyze_tokenization(introspector: TokenizerIntrospector): Analysis;
  generate_report(introspector: TokenizerIntrospector): string;
  analyze_position(introspector: TokenizerIntrospector, pos: number): PositionAnalysis;
  get_full_route(introspector: TokenizerIntrospector, pos: number): RouteStep[];
  format_route(introspector: TokenizerIntrospector, pos: number): string;
}

// Type guard for GrammarMapper in options
export interface GrammarMapper extends IGrammarMapper {}
export type { TokenizerIntrospector };
