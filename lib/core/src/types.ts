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
  // use object map for faster non-ascii lookups per state
  non_ascii_chars: Map<number, Record<number, number>>;
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
}

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
  // dense list of all frames ever opened, frames[0] is the implicit TOP
  // frame (kind=FRAME_KIND_TOP, never popped).
  frames: FrameRecord[];
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
export type ClaimFn = (
  input: string,
  tokens: Uint32Array,
  token_types: string[],
  sink: ClaimSink,
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
  line_numbers?: boolean;
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

// Walk tokens counting paren depth inside punctuation tokens until depth
// returns to zero. Used for arrow-function parameter lists.
export interface BalancedPatternSpec {
  __kind: "balanced";
  open: string;
  close: string;
  max_tokens?: number;
}

export type TokenPatternSpec =
  | TypePatternSpec
  | SeqPatternSpec
  | AnyOfPatternSpec
  | OptionalPatternSpec
  | CapturePatternSpec
  | BalancedPatternSpec;

// A rewrite rule says: starting at a token matching `anchor` (a bare type
// name, or `type(name, value)` to also constrain source text), if the
// token stream after the anchor matches `when` (and optionally the token
// stream before the anchor matches `before`), apply `rewrite`:
//   - `string`   → rewrite the anchor token's type to this name (Phase 1).
//   - object map → for each `{ capture_name: type_name }` entry, find the
//                  capture() with that name in `when` and rewrite every
//                  token inside the captured range to the target type
//                  (Phase 3). Missing captures silently skip.
export interface RewriteRule {
  // The anchor identifies the token to rewrite. A bare type name is
  // sugar for `type(name)` with no value constraint; `type(name, value)`
  // also filters on the anchor token's source text.
  anchor: string | TypePatternSpec;
  before?: TokenPatternSpec;
  // when is optional: a rule with only `before` (and optionally an
  // anchor value constraint) runs a no-op forward scan that always
  // succeeds, so the anchor is rewritten whenever the preceding window
  // matches.
  when?: TokenPatternSpec;
  rewrite: string | Record<string, string>;
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
