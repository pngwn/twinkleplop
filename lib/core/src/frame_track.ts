// frame_track — shared scope-stack pre-pass for reclassifiers
//
// walks the token stream once, maintaining a bracket-aware scope stack, and
// emits per-token side tables (`active_frame`, `depths`, `at_start`) that
// downstream reclassifiers query in O(1). this consolidates the bracket
// tracking that hand-written reclassifiers each used to maintain themselves
// (claim_property_scope, promote_js_parameters, type_position_promoter).
//
// brace-kind classification is declarative: the FrameSpec's `brace_kinds`
// rules (pending body markers, angle-depth awareness, prev-token shapes)
// are evaluated during the walk so every consumer reads one shared
// classification instead of re-deriving its own.

import { debug_enabled, warn_once } from "./debug";
import type {
  BraceKindScan,
  BraceKindSpec,
  FrameRecord,
  FrameSpec,
  FrameTable,
  Reclassifier,
  TokenizeResult,
} from "./types";
import {
  FRAME_BRACKET_BRACE,
  FRAME_BRACKET_BRACKET,
  FRAME_BRACKET_PAREN,
  FRAME_KIND_BRACKET,
  FRAME_KIND_PAREN,
  FRAME_KIND_TOP,
  SIGNAL_TERNARY_COLON,
} from "./types";

// shared sentinel for the disabled-at_start fast path: a single zero-length
// Uint8Array reused across calls so we don't pay per-call allocation when
// the consumer doesn't need at_start.
const EMPTY_U8 = new Uint8Array(0);

// shared empty table so a spec without reset chars allocates nothing.
const EMPTY_CODES: number[] = [];

// built-in kind names occupying ids 0..2. language-defined kinds from
// BraceKindSpec are interned after these.
const BUILTIN_KIND_NAMES = ["top", "paren", "bracket"];

// stmt flags occupy signals bits 1..7; bit 0 is the ternary colon.
const MAX_STMT_FLAGS = 7;

// per-type flag bits combined into one Uint8Array so the walk loop does a
// single table load per token.
const FLAG_TRIVIA = 1;
const FLAG_TRANSPARENT = 2;
const FLAG_TRANSPARENT_TEXTS = 4;
const FLAG_MARKER = 8;
const FLAG_ANGLE = 16;
const FLAG_QMARK = 32;
const FLAG_STMT = 64;

// a text candidate compiled to char codes for slice-free comparison in
// the walk loop.
interface CompiledText {
  codes: number[];
}

function compile_text(text: string): CompiledText {
  const codes: number[] = [];
  for (let i = 0; i < text.length; i++) codes.push(text.charCodeAt(i));
  return { codes };
}

function text_matches(input: string, s: number, e: number, t: CompiledText): boolean {
  const codes = t.codes;
  if (e - s !== codes.length) return false;
  for (let i = 0; i < codes.length; i++) {
    if (input.charCodeAt(s + i) !== codes[i]) return false;
  }
  return true;
}

// default bound on a scan_back walk. a rule's `over` set normally stops
// the walk long before this; the cap only matters when the set happens to
// cover a long literal run.
const DEFAULT_SCAN_MAX = 16;

// compiled, token_types-independent form of a BraceKindScan step / landing
// shape. type names resolve per token_types like the rest of the spec.
interface CompiledScanStep {
  type: string;
  texts: CompiledText[] | null;
  chars: number[] | null;
}

interface CompiledScan {
  over: CompiledScanStep[];
  to_type: string;
  to_texts: CompiledText[] | null;
  to_last_chars: number[] | null;
  to_prev_chars: number[] | null;
  max: number;
}

function compile_scan(scan: BraceKindScan): CompiledScan {
  return {
    over: scan.over.map((o) => ({
      type: o.type,
      texts: o.texts !== undefined ? o.texts.map(compile_text) : null,
      chars: o.chars !== undefined ? char_codes(o.chars) : null,
    })),
    to_type: scan.to.type,
    to_texts: scan.to.texts !== undefined ? scan.to.texts.map(compile_text) : null,
    to_last_chars: scan.to.last_char_in !== undefined ? char_codes(scan.to.last_char_in) : null,
    to_prev_chars:
      scan.to.preceded_by_char_in !== undefined ? char_codes(scan.to.preceded_by_char_in) : null,
    max: scan.max !== undefined ? scan.max : DEFAULT_SCAN_MAX,
  };
}

// compiled, token_types-independent form of BraceKindSpec. type names stay
// as strings here; resolution to ids happens per token_types array and is
// cached against its reference (see ResolvedKindTables).
interface CompiledBraceKinds {
  kind_names: string[];
  markers: { type: string; text: CompiledText; kind_id: number }[];
  pending_in_angles_kind: number;
  angle_type: string | null;
  angle_open: CompiledText | null;
  angle_closes: { text: CompiledText; pops: number }[];
  angle_reset_chars: number[];
  marker_reset_chars: number[];
  prev_rules: {
    type: string;
    texts: CompiledText[] | null;
    last_chars: number[] | null;
    in_kind_ids: Set<number> | null;
    scan: CompiledScan | null;
    kind_id: number;
  }[];
  default_kind: number;
  start_kind: number;
}

function char_codes(text: string | undefined): number[] {
  if (text === undefined) return [];
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i));
  return out;
}

function compile_brace_kinds(spec: BraceKindSpec): CompiledBraceKinds {
  const kind_names = BUILTIN_KIND_NAMES.slice();
  const intern = (name: string): number => {
    const existing = kind_names.indexOf(name);
    if (existing >= 0) return existing;
    kind_names.push(name);
    return kind_names.length - 1;
  };

  const markers = (spec.body_markers ?? []).map((m) => ({
    type: m.type,
    text: compile_text(m.text),
    kind_id: intern(m.kind),
  }));
  const prev_rules = (spec.prev_rules ?? []).map((r) => {
    const last_chars: number[] | null = r.prev_last_char_in !== undefined ? [] : null;
    if (last_chars !== null && r.prev_last_char_in !== undefined) {
      for (let i = 0; i < r.prev_last_char_in.length; i++) {
        last_chars.push(r.prev_last_char_in.charCodeAt(i));
      }
    }
    return {
      type: r.prev_type,
      // char-code candidates rather than a Set of strings: matching a
      // prev rule is once per brace and every text list here is a
      // handful of entries, so a linear compare beats hashing -- and it
      // keeps the slice allocation out of the walk.
      texts: r.prev_texts !== undefined ? r.prev_texts.map(compile_text) : null,
      last_chars,
      // resolved below, once every rule has had its own kind interned --
      // an in_kinds name is usually a kind some OTHER rule declares.
      in_kind_names: r.in_kinds ?? null,
      in_kind_ids: null as Set<number> | null,
      scan: r.scan_back !== undefined ? compile_scan(r.scan_back) : null,
      kind_id: intern(r.kind),
    };
  });
  for (const rule of prev_rules) {
    if (rule.in_kind_names === null) continue;
    const ids = new Set<number>();
    for (const name of rule.in_kind_names) {
      const id = kind_names.indexOf(name);
      if (id >= 0) ids.add(id);
      else {
        warn_once(
          "frame_track",
          `in-kind:${name}`,
          `prev rule in_kinds kind "${name}" is not declared by the brace_kinds spec; the rule can never match`,
        );
      }
    }
    rule.in_kind_ids = ids;
  }

  return {
    kind_names,
    markers,
    pending_in_angles_kind:
      spec.pending_in_angles_kind !== undefined ? intern(spec.pending_in_angles_kind) : -1,
    angle_type: spec.angles?.type ?? null,
    angle_open: spec.angles !== undefined ? compile_text(spec.angles.open) : null,
    angle_closes: (spec.angles?.closes ?? []).map((c) => ({
      text: compile_text(c.text),
      pops: c.pops,
    })),
    angle_reset_chars: char_codes(spec.angles?.reset_chars),
    marker_reset_chars: char_codes(spec.marker_reset_chars),
    prev_rules,
    default_kind: intern(spec.default_kind),
    start_kind: spec.start_kind !== undefined ? intern(spec.start_kind) : intern(spec.default_kind),
  };
}

// per-token_types resolution of the compiled spec's type names. cached by
// token_types reference, so the indexOf scans run once per vocabulary.
interface ResolvedKindTables {
  // marker candidates as a dense array indexed by type id -- the per-token
  // dispatch is one array load + null check, no hashing.
  marker_lists: ({ text: CompiledText; kind_id: number }[] | null)[];
  angle_type_id: number;
  prev_rules: ResolvedPrevRule[];
  // the same rules bucketed by the prev token's type id, in spec order.
  // a brace whose prev token is an operator should not walk the
  // punctuation rules to find that out, and the rule list grows with
  // every shape a language describes.
  prev_rule_lists: (ResolvedPrevRule[] | null)[];
}

interface ResolvedPrevRule {
  type_id: number;
  texts: CompiledText[] | null;
  last_chars: number[] | null;
  in_kind_ids: Set<number> | null;
  scan: ResolvedScan | null;
  kind_id: number;
}

// per-token_types form of a CompiledScan. `over` is dense by type id so a
// step is one array load; a null slot ends the walk.
interface ResolvedScanStep {
  // true when the type is stepped over regardless of its text.
  any: boolean;
  texts: CompiledText[] | null;
  chars: number[] | null;
}

interface ResolvedScan {
  over: (ResolvedScanStep | null)[];
  to_type_id: number;
  to_texts: CompiledText[] | null;
  to_last_chars: number[] | null;
  to_prev_chars: number[] | null;
  max: number;
}

function resolve_scan(scan: CompiledScan, token_types: string[]): ResolvedScan {
  const over: (ResolvedScanStep | null)[] = new Array(token_types.length).fill(null);
  for (const step of scan.over) {
    const id = token_types.indexOf(step.type);
    if (id < 0) {
      warn_once(
        "frame_track",
        `scan-over-type:${step.type}`,
        `scan_back over type "${step.type}" is not in the token vocabulary; the walk stops at it`,
      );
      continue;
    }
    const any = step.texts === null && step.chars === null;
    const existing = over[id];
    if (existing === null) {
      over[id] = { any, texts: step.texts, chars: step.chars };
      continue;
    }
    // two entries for one type widen each other rather than shadowing.
    existing.any = existing.any || any;
    if (step.texts !== null) {
      existing.texts = existing.texts === null ? step.texts : existing.texts.concat(step.texts);
    }
    if (step.chars !== null) {
      existing.chars = existing.chars === null ? step.chars : existing.chars.concat(step.chars);
    }
  }
  const to_type_id = token_types.indexOf(scan.to_type);
  if (to_type_id < 0) {
    warn_once(
      "frame_track",
      `scan-to-type:${scan.to_type}`,
      `scan_back landing type "${scan.to_type}" is not in the token vocabulary; the rule can never match`,
    );
  }
  return {
    over,
    to_type_id,
    to_texts: scan.to_texts,
    to_last_chars: scan.to_last_chars,
    to_prev_chars: scan.to_prev_chars,
    max: scan.max,
  };
}

function resolve_kind_tables(
  compiled: CompiledBraceKinds,
  token_types: string[],
): ResolvedKindTables {
  const marker_lists: ({ text: CompiledText; kind_id: number }[] | null)[] = new Array(
    token_types.length,
  ).fill(null);
  for (const m of compiled.markers) {
    const id = token_types.indexOf(m.type);
    if (id < 0) {
      warn_once(
        "frame_track",
        `marker-type:${m.type}`,
        `body marker type "${m.type}" is not in the token vocabulary; the marker can never arm`,
      );
      continue;
    }
    let list = marker_lists[id];
    if (list === null) {
      list = [];
      marker_lists[id] = list;
    }
    list.push({ text: m.text, kind_id: m.kind_id });
  }
  const angle_type_id =
    compiled.angle_type !== null ? token_types.indexOf(compiled.angle_type) : -1;
  if (compiled.angle_type !== null && angle_type_id < 0) {
    warn_once(
      "frame_track",
      `angle-type:${compiled.angle_type}`,
      `angle type "${compiled.angle_type}" is not in the token vocabulary; angle depth is never tracked`,
    );
  }
  const prev_rules = compiled.prev_rules.map((r) => {
    const type_id = token_types.indexOf(r.type);
    if (type_id < 0) {
      warn_once(
        "frame_track",
        `prev-rule-type:${r.type}`,
        `prev rule type "${r.type}" is not in the token vocabulary; the rule can never match`,
      );
    }
    return {
      type_id,
      texts: r.texts,
      last_chars: r.last_chars,
      in_kind_ids: r.in_kind_ids,
      scan: r.scan !== null ? resolve_scan(r.scan, token_types) : null,
      kind_id: r.kind_id,
    };
  });
  const prev_rule_lists: (ResolvedPrevRule[] | null)[] = new Array(token_types.length).fill(null);
  for (const rule of prev_rules) {
    if (rule.type_id < 0) continue;
    let list = prev_rule_lists[rule.type_id];
    if (list === null) {
      list = [];
      prev_rule_lists[rule.type_id] = list;
    }
    list.push(rule);
  }
  return { marker_lists, angle_type_id, prev_rules, prev_rule_lists };
}

// per-token_types resolution of ternary / stmt-flag trigger types. cached
// by token_types reference like the kind tables.
interface ResolvedSignalTables {
  qmark_type_id: number;
  // dense by type id, then by the candidate text's FIRST char code; null
  // means no stmt trigger on that type / leading char. trigger lists can
  // run to a couple dozen keywords (statement starters), so the per-token
  // dispatch buckets by leading char to keep the walk at 1-3 candidates.
  stmt_lists: ((CompiledStmtRule[] | null)[] | null)[];
}

// ascii-only first-char bucket table size.
const STMT_BUCKETS = 128;

function resolve_signal_tables(
  compiled: CompiledFrameSpec,
  token_types: string[],
): ResolvedSignalTables {
  let qmark_type_id = -1;
  if (compiled.ternary_qmark_type !== null) {
    qmark_type_id = token_types.indexOf(compiled.ternary_qmark_type);
    if (qmark_type_id < 0) {
      warn_once(
        "frame_track",
        `qmark-type:${compiled.ternary_qmark_type}`,
        `ternary qmark type "${compiled.ternary_qmark_type}" is not in the token vocabulary; ternary colons are never marked`,
      );
    }
  }
  const stmt_lists: ((CompiledStmtRule[] | null)[] | null)[] = new Array(token_types.length).fill(
    null,
  );
  for (const rule of compiled.stmt_rules) {
    const id = token_types.indexOf(rule.type);
    if (id < 0) {
      warn_once(
        "frame_track",
        `stmt-type:${rule.type}`,
        `stmt flag trigger type "${rule.type}" is not in the token vocabulary; the trigger can never fire`,
      );
      continue;
    }
    const first = rule.text.codes.length > 0 ? rule.text.codes[0] : 0;
    if (first >= STMT_BUCKETS) {
      warn_once(
        "frame_track",
        `stmt-text:${rule.type}`,
        `stmt flag trigger text starting with a non-ascii char cannot be bucketed; the trigger can never fire`,
      );
      continue;
    }
    let by_char = stmt_lists[id];
    if (by_char === null) {
      by_char = new Array(STMT_BUCKETS).fill(null);
      stmt_lists[id] = by_char;
    }
    let list = by_char[first];
    if (list === null) {
      list = [];
      by_char[first] = list;
    }
    list.push(rule);
  }
  return { qmark_type_id, stmt_lists };
}

function code_in(codes: number[], code: number): boolean {
  for (let c = 0; c < codes.length; c++) {
    if (code === codes[c]) return true;
  }
  return false;
}

// previous non-trivia token at or before `from`, -1 when there is none.
function prev_non_trivia(tokens: Uint32Array, type_flags: Uint8Array, from: number): number {
  let j = from;
  while (j >= 0 && (type_flags[tokens[j * 3]] & FLAG_TRIVIA) !== 0) j--;
  return j;
}

// does the token at `j` match a scan's landing shape? `last_char_in` and
// `preceded_by_char_in` read source characters rather than whole texts so
// a coalesced `():` satisfies "ends in `:`, preceded by `)`" the same way
// a separate `)` and `:` pair does.
function scan_lands(
  input: string,
  tokens: Uint32Array,
  type_flags: Uint8Array,
  scan: ResolvedScan,
  j: number,
): boolean {
  const base = j * 3;
  const s = tokens[base + 1];
  const e = tokens[base + 2];
  if (scan.to_texts !== null) {
    let hit = false;
    for (let t = 0; t < scan.to_texts.length; t++) {
      if (text_matches(input, s, e, scan.to_texts[t])) {
        hit = true;
        break;
      }
    }
    if (!hit) return false;
  }
  if (scan.to_last_chars !== null && !code_in(scan.to_last_chars, input.charCodeAt(e - 1))) {
    return false;
  }
  if (scan.to_prev_chars !== null) {
    let code: number;
    if (e - 2 >= s) code = input.charCodeAt(e - 2);
    else {
      const k = prev_non_trivia(tokens, type_flags, j - 1);
      if (k < 0) return false;
      code = input.charCodeAt(tokens[k * 3 + 2] - 1);
    }
    if (!code_in(scan.to_prev_chars, code)) return false;
  }
  return true;
}

// bounded backward walk: step over tokens the rule declares skippable
// until one matches the landing shape. the `over` set is what actually
// bounds the walk in practice -- `max` only catches a set that happens to
// cover a long literal run.
function scan_back_matches(
  input: string,
  tokens: Uint32Array,
  type_flags: Uint8Array,
  scan: ResolvedScan,
  from: number,
): boolean {
  const over = scan.over;
  let j = from;
  for (let steps = 0; steps < scan.max; steps++) {
    j = prev_non_trivia(tokens, type_flags, j);
    if (j < 0) return false;
    const base = j * 3;
    const ttype = tokens[base];
    if (ttype === scan.to_type_id && scan_lands(input, tokens, type_flags, scan, j)) return true;
    const step = over[ttype] ?? null;
    if (step === null) return false;
    if (!step.any) {
      const s = tokens[base + 1];
      const e = tokens[base + 2];
      let hit = false;
      if (step.texts !== null) {
        for (let t = 0; t < step.texts.length; t++) {
          if (text_matches(input, s, e, step.texts[t])) {
            hit = true;
            break;
          }
        }
      }
      if (!hit && step.chars !== null) {
        hit = true;
        for (let c = s; c < e; c++) {
          if (!code_in(step.chars, input.charCodeAt(c))) {
            hit = false;
            break;
          }
        }
      }
      if (!hit) return false;
    }
    j--;
  }
  return false;
}

// prev-token classification for a `{` with no pending marker claim. module
// level (no captures) so the walk loop's depth counters stay in registers
// instead of a closure context. called once per opening brace.
//
// `frames` / `parent_idx` are only read by rules carrying an `in_kinds`
// gate, and the backward walk only runs for rules carrying a `scan_back`,
// so a spec using neither pays one extra argument and nothing else.
function classify_by_prev(
  input: string,
  tokens: Uint32Array,
  type_flags: Uint8Array,
  kinds: CompiledBraceKinds,
  kind_tables: ResolvedKindTables,
  prev_significant: number,
  frames: FrameRecord[],
  parent_idx: number,
  punct_id: number,
  prev_char: number,
): number {
  // a brace that is not the first character of its own token: grammars
  // coalesce adjacent punctuation, so `) {` is two tokens and `){` is
  // one. the character before it stands in for the previous token.
  if (prev_char >= 0) {
    const rules = kind_tables.prev_rule_lists[punct_id] ?? null;
    if (rules === null) return kinds.default_kind;
    for (let r = 0; r < rules.length; r++) {
      const rule = rules[r];
      if (rule.texts !== null) {
        // the stand-in is one character, so only single-char candidates
        // can match it.
        let hit = false;
        for (let t = 0; t < rule.texts.length; t++) {
          const codes = rule.texts[t].codes;
          if (codes.length === 1 && codes[0] === prev_char) {
            hit = true;
            break;
          }
        }
        if (!hit) continue;
      } else if (rule.last_chars !== null) {
        if (!code_in(rule.last_chars, prev_char)) continue;
      }
      if (rule.in_kind_ids !== null && !rule.in_kind_ids.has(frames[parent_idx].kind)) continue;
      // the separator is inside the brace's OWN token here, so the
      // previous token is still part of the shape the walk steps over --
      // the walk starts at it rather than one before it.
      if (
        rule.scan !== null &&
        !scan_back_matches(input, tokens, type_flags, rule.scan, prev_significant)
      ) {
        continue;
      }
      return rule.kind_id;
    }
    return kinds.default_kind;
  }
  if (prev_significant < 0) return kinds.start_kind;
  const pbase = prev_significant * 3;
  const ptype = tokens[pbase];
  // `?? null` rather than a bare null check: the bucket table is dense by
  // type id, so a vocabulary that grew after the table was cached reads
  // past its end rather than returning the empty slot.
  const rules = kind_tables.prev_rule_lists[ptype] ?? null;
  if (rules === null) return kinds.default_kind;
  const ps = tokens[pbase + 1];
  const pe = tokens[pbase + 2];
  for (let r = 0; r < rules.length; r++) {
    const rule = rules[r];
    if (rule.texts !== null) {
      const texts = rule.texts;
      let hit = false;
      for (let t = 0; t < texts.length; t++) {
        if (text_matches(input, ps, pe, texts[t])) {
          hit = true;
          break;
        }
      }
      if (!hit) continue;
    } else if (rule.last_chars !== null) {
      if (!code_in(rule.last_chars, input.charCodeAt(pe - 1))) continue;
    }
    if (rule.in_kind_ids !== null && !rule.in_kind_ids.has(frames[parent_idx].kind)) continue;
    if (
      rule.scan !== null &&
      !scan_back_matches(input, tokens, type_flags, rule.scan, prev_significant - 1)
    ) {
      continue;
    }
    return rule.kind_id;
  }
  return kinds.default_kind;
}

// a (type, text) stmt-flag trigger with its combined arm / clear masks.
// arm and clear entries sharing a trigger merge into one so the walk does
// a single text compare per candidate.
interface CompiledStmtRule {
  type: string;
  text: CompiledText;
  arm_mask: number;
  clear_mask: number;
}

// bracket character codes resolved from the spec, plus pre-computed
// per-bracket constants. -1 means "this bracket is not configured for
// this language" -- the corresponding char never matches.
interface CompiledFrameSpec {
  punct_type: string;
  paren_open: number;
  paren_close: number;
  brace_open: number;
  brace_close: number;
  bracket_open: number;
  bracket_close: number;
  // at_start config. reset_chars is a small char-code lookup; the empty
  // string disables at_start tracking entirely.
  at_start_reset_chars: number[];
  at_start_transparent: string[];
  // text-specific transparency, one entry per type that has transparent
  // texts. resolved against token_types lazily (the type id may not be
  // known when the spec is compiled).
  // candidate texts compiled to char codes -- the per-token membership
  // check is a length-prefiltered char compare, no slicing.
  at_start_transparent_texts: { type: string; texts: CompiledText[] }[];
  at_start_enabled: boolean;
  // kind ids (from brace_kinds interning) whose member close re-arms
  // at_start on the parent frame. null when not configured.
  rearm_kind_ids: Set<number> | null;
  brace_kinds: CompiledBraceKinds | null;
  // ternary counting. -1 colon code / null qmark when not configured.
  ternary_qmark_type: string | null;
  ternary_qmark_text: CompiledText | null;
  ternary_colon_code: number;
  // stmt flag tracking. flag i occupies mask bit i (signals bit i + 1).
  stmt_flag_names: string[];
  stmt_rules: CompiledStmtRule[];
  stmt_clear_char_codes: number[];
  stmt_clear_char_masks: number[];
  stmt_brace_close_clear_mask: number;
  // true when ternary or stmt_flags is configured -- gates the signals
  // array allocation and all per-frame counter work.
  signals_enabled: boolean;
}

function compile_frame_spec(spec: FrameSpec): CompiledFrameSpec {
  const single = (s: string | undefined): number =>
    s !== undefined && s.length > 0 ? s.charCodeAt(0) : -1;
  const at_start_chars: number[] = [];
  if (spec.at_start !== undefined) {
    for (let i = 0; i < spec.at_start.reset_chars.length; i++) {
      at_start_chars.push(spec.at_start.reset_chars.charCodeAt(i));
    }
  }
  const transparent_texts = (spec.at_start?.transparent_texts_for_type ?? []).map((e) => ({
    type: e.type,
    texts: e.texts.map(compile_text),
  }));
  const brace_kinds = spec.brace_kinds !== undefined ? compile_brace_kinds(spec.brace_kinds) : null;
  // rearm kinds resolve against the spec's own interned names. unknown
  // names (or a missing brace_kinds spec) resolve to nothing -- fail closed.
  let rearm_kind_ids: Set<number> | null = null;
  const rearm_names = spec.at_start?.rearm_after_close_kinds;
  if (rearm_names !== undefined && brace_kinds !== null) {
    rearm_kind_ids = new Set();
    for (const name of rearm_names) {
      const id = brace_kinds.kind_names.indexOf(name);
      if (id >= 0) rearm_kind_ids.add(id);
      else {
        warn_once(
          "frame_track",
          `rearm-kind:${name}`,
          `rearm_after_close_kinds kind "${name}" is not declared by the brace_kinds spec; it can never re-arm`,
        );
      }
    }
  } else if (rearm_names !== undefined && brace_kinds === null) {
    warn_once(
      "frame_track",
      "rearm-without-kinds",
      "rearm_after_close_kinds is set but brace_kinds is not configured; re-arm never happens",
    );
  }

  const stmt_specs = spec.stmt_flags ?? [];
  if (stmt_specs.length > MAX_STMT_FLAGS) {
    warn_once(
      "frame_track",
      "stmt-flags-overflow",
      `stmt_flags declares ${stmt_specs.length} flags but only ${MAX_STMT_FLAGS} signal bits exist; extras are ignored`,
    );
  }
  const stmt_flag_names: string[] = [];
  const stmt_rule_map = new Map<string, CompiledStmtRule>();
  const stmt_clear_char_codes: number[] = [];
  const stmt_clear_char_masks: number[] = [];
  let stmt_brace_close_clear_mask = 0;
  const stmt_rule = (type: string, text: string): CompiledStmtRule => {
    const key = `${type} ${text}`;
    let rule = stmt_rule_map.get(key);
    if (rule === undefined) {
      rule = { type, text: compile_text(text), arm_mask: 0, clear_mask: 0 };
      stmt_rule_map.set(key, rule);
    }
    return rule;
  };
  for (let f = 0; f < stmt_specs.length && f < MAX_STMT_FLAGS; f++) {
    const flag = stmt_specs[f];
    const mask = 1 << f;
    stmt_flag_names.push(flag.name);
    for (const text of flag.arm.texts) {
      stmt_rule(flag.arm.type, text).arm_mask |= mask;
    }
    if (flag.clear !== undefined) {
      for (const text of flag.clear.texts) {
        stmt_rule(flag.clear.type, text).clear_mask |= mask;
      }
    }
    if (flag.clear_chars !== undefined) {
      for (let c = 0; c < flag.clear_chars.length; c++) {
        const code = flag.clear_chars.charCodeAt(c);
        const existing = stmt_clear_char_codes.indexOf(code);
        if (existing >= 0) stmt_clear_char_masks[existing] |= mask;
        else {
          stmt_clear_char_codes.push(code);
          stmt_clear_char_masks.push(mask);
        }
      }
    }
    if (flag.clear_on_brace_close === true) stmt_brace_close_clear_mask |= mask;
  }

  return {
    punct_type: spec.punct_type,
    paren_open: single(spec.brackets.paren?.open),
    paren_close: single(spec.brackets.paren?.close),
    brace_open: single(spec.brackets.brace?.open),
    brace_close: single(spec.brackets.brace?.close),
    bracket_open: single(spec.brackets.bracket?.open),
    bracket_close: single(spec.brackets.bracket?.close),
    at_start_reset_chars: at_start_chars,
    at_start_transparent: spec.at_start?.transparent_types ?? [],
    at_start_transparent_texts: transparent_texts,
    at_start_enabled: spec.at_start !== undefined,
    rearm_kind_ids,
    brace_kinds,
    ternary_qmark_type: spec.ternary?.qmark.type ?? null,
    ternary_qmark_text: spec.ternary !== undefined ? compile_text(spec.ternary.qmark.text) : null,
    ternary_colon_code:
      spec.ternary !== undefined && spec.ternary.colon_char.length > 0
        ? spec.ternary.colon_char.charCodeAt(0)
        : -1,
    stmt_flag_names,
    stmt_rules: Array.from(stmt_rule_map.values()),
    stmt_clear_char_codes,
    stmt_clear_char_masks,
    stmt_brace_close_clear_mask,
    signals_enabled: spec.ternary !== undefined || stmt_flag_names.length > 0,
  };
}

// dedicated signals pass: per-frame ternary counters and stmt flag masks,
// walked over the same bracket structure as the main loop but in its own
// tight function. kept OUT of the main walk on purpose -- signal branches
// woven into that loop degraded its jit code for every frame_track
// instance in the process once a signals-enabled tracker had run. module
// level so the loop closes over nothing.
function compute_signals(
  input: string,
  tokens: Uint32Array,
  n: number,
  compiled: CompiledFrameSpec,
  tables: ResolvedSignalTables,
  type_flags: Uint8Array,
  punct_id: number,
  signals: Uint8Array,
): void {
  const qmark_text = compiled.ternary_qmark_text;
  const colon_code = compiled.ternary_colon_code;
  const stmt_lists = tables.stmt_lists;
  const clear_codes = compiled.stmt_clear_char_codes;
  const clear_masks = compiled.stmt_clear_char_masks;
  const clear_count = clear_codes.length;
  const brace_close_clear_mask = compiled.stmt_brace_close_clear_mask;
  const paren_open = compiled.paren_open;
  const paren_close = compiled.paren_close;
  const brace_open = compiled.brace_open;
  const brace_close = compiled.brace_close;
  const bracket_open = compiled.bracket_open;
  const bracket_close = compiled.bracket_close;

  // parallel per-frame stacks, mirroring the main walk's push / pop
  // conditions exactly so frame identity lines up between the passes.
  const stack_qmark: number[] = [0];
  const stack_flags: number[] = [0];

  for (let i = 0; i < n; i++) {
    const base = i * 3;
    const ttype = tokens[base];
    const flags = type_flags[ttype];
    let signal = 0;

    if ((flags & (FLAG_QMARK | FLAG_STMT)) !== 0) {
      if ((flags & FLAG_QMARK) !== 0 && qmark_text !== null) {
        const s = tokens[base + 1];
        const e = tokens[base + 2];
        if (text_matches(input, s, e, qmark_text)) {
          stack_qmark[stack_qmark.length - 1]++;
        }
      }
      if ((flags & FLAG_STMT) !== 0) {
        const by_char = stmt_lists[ttype];
        if (by_char !== null) {
          const s = tokens[base + 1];
          const e = tokens[base + 2];
          const first = input.charCodeAt(s);
          const candidates = first < STMT_BUCKETS ? by_char[first] : null;
          if (candidates !== null) {
            for (let m = 0; m < candidates.length; m++) {
              if (text_matches(input, s, e, candidates[m].text)) {
                const top = stack_flags.length - 1;
                stack_flags[top] =
                  (stack_flags[top] | candidates[m].arm_mask) & ~candidates[m].clear_mask;
                break;
              }
            }
          }
        }
      }
    }

    if (ttype === punct_id) {
      const s = tokens[base + 1];
      const e = tokens[base + 2];
      for (let p = s; p < e; p++) {
        const c = input.charCodeAt(p);
        if (c === paren_open || c === brace_open || c === bracket_open) {
          stack_qmark.push(0);
          stack_flags.push(0);
        } else if (c === paren_close || c === bracket_close) {
          if (stack_qmark.length > 1) {
            stack_qmark.pop();
            stack_flags.pop();
          }
        } else if (c === brace_close) {
          if (stack_qmark.length > 1) {
            stack_qmark.pop();
            stack_flags.pop();
            // a closing brace ends the statement that armed any
            // close-cleared flag on the parent frame.
            stack_flags[stack_flags.length - 1] &= ~brace_close_clear_mask;
          }
        } else if (c === colon_code && stack_qmark[stack_qmark.length - 1] > 0) {
          stack_qmark[stack_qmark.length - 1]--;
          signal |= SIGNAL_TERNARY_COLON;
        } else if (clear_count > 0) {
          for (let m = 0; m < clear_count; m++) {
            if (c === clear_codes[m]) {
              stack_flags[stack_flags.length - 1] &= ~clear_masks[m];
              break;
            }
          }
        }
      }
    }

    signals[i] = signal | (stack_flags[stack_flags.length - 1] << 1);
  }
}

// pre-compile spec once. closures over the compiled spec capture the
// punct_type id lookup at first call, memoised against the token_types
// array reference (the same trick the JS scanner uses for tag_name lookups).
export function frame_track(spec: FrameSpec): Reclassifier {
  const compiled = compile_frame_spec(spec);
  const kind_names =
    compiled.brace_kinds !== null ? compiled.brace_kinds.kind_names : BUILTIN_KIND_NAMES;
  const punct_cache = new WeakMap<string[], number>();
  const flags_cache = new WeakMap<string[], Uint8Array>();
  const kind_table_cache = new WeakMap<string[], ResolvedKindTables>();
  const transparent_texts_cache = new WeakMap<string[], (CompiledText[] | null)[]>();
  const signal_table_cache = new WeakMap<string[], ResolvedSignalTables>();

  return (input: string, result: TokenizeResult): TokenizeResult => {
    let punct_id = punct_cache.get(result.token_types);
    if (punct_id === undefined) {
      punct_id = result.token_types.indexOf(compiled.punct_type);
      punct_cache.set(result.token_types, punct_id);
      if (punct_id < 0 && debug_enabled()) {
        warn_once(
          "frame_track",
          `punct-type:${compiled.punct_type}`,
          `punct_type "${compiled.punct_type}" is not in the token vocabulary; no frames will be tracked`,
        );
      }
    }

    const kinds = compiled.brace_kinds;
    let kind_tables: ResolvedKindTables | null = null;
    if (kinds !== null) {
      kind_tables = kind_table_cache.get(result.token_types) ?? null;
      if (kind_tables === null) {
        kind_tables = resolve_kind_tables(kinds, result.token_types);
        kind_table_cache.set(result.token_types, kind_tables);
      }
    }

    const signals_enabled = compiled.signals_enabled;
    let signal_tables: ResolvedSignalTables | null = null;
    if (signals_enabled) {
      signal_tables = signal_table_cache.get(result.token_types) ?? null;
      if (signal_tables === null) {
        signal_tables = resolve_signal_tables(compiled, result.token_types);
        signal_table_cache.set(result.token_types, signal_tables);
      }
    }

    // single per-type flags byte combining every per-token table lookup
    // (trivia, transparency, marker / angle membership) -- the hot loop
    // reads one Uint8Array slot per token and branches off bits. the
    // heavier candidate lists are only touched when their bit is set.
    // computing the tables eagerly added noticeable cost on the disabled
    // path (~30% slower on plain_js), so flags stays null when neither
    // at_start nor brace_kinds is configured.
    let type_flags: Uint8Array | null = null;
    let transparent_texts: (CompiledText[] | null)[] | null = null;
    if (compiled.at_start_enabled || kinds !== null || signals_enabled) {
      type_flags = flags_cache.get(result.token_types) ?? null;
      if (type_flags === null) {
        const types = result.token_types;
        type_flags = new Uint8Array(types.length);
        const comment_id = types.indexOf("comment");
        if (comment_id >= 0) type_flags[comment_id] |= FLAG_TRIVIA;
        for (let i = 0; i < compiled.at_start_transparent.length; i++) {
          const id = types.indexOf(compiled.at_start_transparent[i]);
          if (id >= 0) type_flags[id] |= FLAG_TRANSPARENT;
        }
        for (const entry of compiled.at_start_transparent_texts) {
          const id = types.indexOf(entry.type);
          if (id >= 0) type_flags[id] |= FLAG_TRANSPARENT_TEXTS;
        }
        if (kind_tables !== null) {
          for (let id = 0; id < kind_tables.marker_lists.length; id++) {
            if (kind_tables.marker_lists[id] !== null) type_flags[id] |= FLAG_MARKER;
          }
          if (kind_tables.angle_type_id >= 0) {
            type_flags[kind_tables.angle_type_id] |= FLAG_ANGLE;
          }
        }
        if (signal_tables !== null) {
          if (signal_tables.qmark_type_id >= 0) {
            type_flags[signal_tables.qmark_type_id] |= FLAG_QMARK;
          }
          for (let id = 0; id < signal_tables.stmt_lists.length; id++) {
            if (signal_tables.stmt_lists[id] !== null) type_flags[id] |= FLAG_STMT;
          }
        }
        flags_cache.set(result.token_types, type_flags);
      }
      if (compiled.at_start_transparent_texts.length > 0) {
        transparent_texts = transparent_texts_cache.get(result.token_types) ?? null;
        if (transparent_texts === null) {
          transparent_texts = new Array(result.token_types.length).fill(null);
          for (const entry of compiled.at_start_transparent_texts) {
            const id = result.token_types.indexOf(entry.type);
            if (id >= 0) transparent_texts[id] = entry.texts;
          }
          transparent_texts_cache.set(result.token_types, transparent_texts);
        }
      }
    }

    // hoist hot-path config reads to locals so V8 does not re-read object
    // properties on every iteration.
    const at_start_enabled = compiled.at_start_enabled;
    const paren_open = compiled.paren_open;
    const paren_close = compiled.paren_close;
    const brace_open = compiled.brace_open;
    const brace_close = compiled.brace_close;
    const bracket_open = compiled.bracket_open;
    const bracket_close = compiled.bracket_close;
    const reset_chars = compiled.at_start_reset_chars;
    const reset_chars_len = reset_chars.length;
    const rearm_kind_ids = compiled.rearm_kind_ids;
    const marker_lists = kind_tables !== null ? kind_tables.marker_lists : null;

    const { tokens, token_types } = result;
    const n = tokens.length / 3;
    const active_frame = new Uint32Array(n);
    const depths = new Uint8Array(n * 3);
    // skip allocating the at_start array when tracking is disabled. consumers
    // gate their use on whether the spec configured at_start to begin with.
    const at_start = at_start_enabled ? new Uint8Array(n) : EMPTY_U8;
    const signals = signals_enabled ? new Uint8Array(n) : EMPTY_U8;
    const frames: FrameRecord[] = [
      { bracket: -1, kind: FRAME_KIND_TOP, enter_idx: -1, parent: -1 },
    ];
    const stack: number[] = [0];
    // parallel stack of `at_start` flags per frame entry. always allocated
    // (it is small) so the inner loop can write to it unconditionally when
    // tracking is enabled. when disabled, the conditional writes are skipped
    // by the at_start_enabled guard and the array stays at length 1.
    const stack_at_start: number[] = [1];

    let paren_depth = 0;
    let brace_depth = 0;
    let bracket_depth = 0;
    let angle_depth = 0;
    // see `angles.reset_chars`: `i < 3` leaks a level that never closes,
    // and a type-argument list never crosses a separator or a closing
    // brace at its own nesting level, so both resynchronise.
    const angle_reset = kinds !== null ? kinds.angle_reset_chars : EMPTY_CODES;
    const angle_reset_len = angle_reset.length;
    // pending body-marker kind, -1 when none armed. last writer wins --
    // two markers cannot legitimately be pending at once in real code.
    let pending_kind = -1;
    // depth the pending marker was armed at, so a separator at that same
    // depth can discard it -- see `marker_reset_chars`.
    let pending_depth = -1;
    const marker_reset = kinds !== null ? kinds.marker_reset_chars : EMPTY_CODES;
    const marker_reset_len = marker_reset.length;

    // previous non-trivia token index for prev-rule classification.
    // maintained incrementally so classification never re-scans.
    let prev_significant = -1;

    // a punctuation token may contain multiple bracket characters
    // (e.g. `({` coalesces into one token). walk every character and update
    // the stack incrementally; the per-token snapshot is the state AFTER
    // the last character.
    for (let i = 0; i < n; i++) {
      const base = i * 3;
      const ttype = tokens[base];

      const flags = type_flags !== null ? type_flags[ttype] : 0;
      const is_trivia = (flags & FLAG_TRIVIA) !== 0;
      let is_transparent = false;
      if (at_start_enabled) {
        is_transparent = (flags & FLAG_TRANSPARENT) !== 0;
        if (
          !is_transparent &&
          (flags & FLAG_TRANSPARENT_TEXTS) !== 0 &&
          transparent_texts !== null
        ) {
          const text_candidates = transparent_texts[ttype];
          if (text_candidates !== null) {
            const s = tokens[base + 1];
            const e = tokens[base + 2];
            for (let t = 0; t < text_candidates.length; t++) {
              if (text_matches(input, s, e, text_candidates[t])) {
                is_transparent = true;
                break;
              }
            }
          }
        }
        at_start[i] = stack_at_start[stack_at_start.length - 1];
      }

      // brace-kind bookkeeping: body markers arm the pending kind, angle
      // tokens track generic nesting. both are exact-text matches against
      // the configured type, compiled to char codes (no slicing). marker
      // and angle types are rare, so most tokens skip on the flags test.
      if ((flags & (FLAG_MARKER | FLAG_ANGLE)) !== 0 && marker_lists !== null) {
        if ((flags & FLAG_MARKER) !== 0) {
          const candidates = marker_lists[ttype];
          if (candidates !== null) {
            const s = tokens[base + 1];
            const e = tokens[base + 2];
            for (let m = 0; m < candidates.length; m++) {
              if (text_matches(input, s, e, candidates[m].text)) {
                pending_kind = candidates[m].kind_id;
                pending_depth = brace_depth;
                break;
              }
            }
          }
        }
        if ((flags & FLAG_ANGLE) !== 0 && kinds !== null) {
          const s = tokens[base + 1];
          const e = tokens[base + 2];
          if (kinds.angle_open !== null && text_matches(input, s, e, kinds.angle_open)) {
            angle_depth++;
          } else {
            const closes = kinds.angle_closes;
            for (let c = 0; c < closes.length; c++) {
              if (text_matches(input, s, e, closes[c].text)) {
                angle_depth = Math.max(0, angle_depth - closes[c].pops);
                break;
              }
            }
          }
        }
      }

      if (punct_id >= 0 && ttype === punct_id) {
        const s = tokens[base + 1];
        const e = tokens[base + 2];
        for (let p = s; p < e; p++) {
          const c = input.charCodeAt(p);
          if (c === paren_open) {
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
            const idx = frames.length;
            frames.push({
              bracket: FRAME_BRACKET_PAREN,
              kind: FRAME_KIND_PAREN,
              enter_idx: i,
              parent: stack[stack.length - 1],
            });
            stack.push(idx);
            stack_at_start.push(0);
            paren_depth++;
          } else if (c === paren_close) {
            if (stack.length > 1) {
              stack.pop();
              stack_at_start.pop();
            }
            if (paren_depth > 0) paren_depth--;
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
          } else if (c === brace_open) {
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
            // declarative kind resolution: a pending body marker claims a
            // top-level brace (and is consumed); a marker under angle
            // nesting yields the constraint-literal kind without consuming;
            // everything else classifies by the previous token's shape.
            let kind = FRAME_KIND_TOP;
            if (kinds !== null && kind_tables !== null) {
              if (
                pending_kind >= 0 &&
                angle_depth === 0 &&
                paren_depth === 0 &&
                bracket_depth === 0
              ) {
                kind = pending_kind;
                pending_kind = -1;
              } else if (pending_kind >= 0 && angle_depth > 0) {
                kind =
                  kinds.pending_in_angles_kind >= 0
                    ? kinds.pending_in_angles_kind
                    : kinds.default_kind;
              } else if (type_flags !== null) {
                kind = classify_by_prev(
                  input,
                  tokens,
                  type_flags,
                  kinds,
                  kind_tables,
                  prev_significant,
                  frames,
                  stack[stack.length - 1],
                  punct_id,
                  p > s ? input.charCodeAt(p - 1) : -1,
                );
              }
            }
            const idx = frames.length;
            frames.push({
              bracket: FRAME_BRACKET_BRACE,
              kind,
              enter_idx: i,
              parent: stack[stack.length - 1],
            });
            stack.push(idx);
            stack_at_start.push(1);
            brace_depth++;
          } else if (c === brace_close) {
            angle_depth = 0;
            let popped = false;
            if (stack.length > 1) {
              stack.pop();
              stack_at_start.pop();
              popped = true;
            }
            if (brace_depth > 0) brace_depth--;
            if (at_start_enabled) {
              // class / interface bodies have no separator between a
              // member's closing `}` and the next member name, so the
              // pop re-arms at_start when the parent is such a body.
              let rearm = 0;
              if (popped && rearm_kind_ids !== null) {
                const parent_frame = frames[stack[stack.length - 1]];
                if (rearm_kind_ids.has(parent_frame.kind)) rearm = 1;
              }
              stack_at_start[stack_at_start.length - 1] = rearm;
            }
          } else if (c === bracket_open) {
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
            const idx = frames.length;
            frames.push({
              bracket: FRAME_BRACKET_BRACKET,
              kind: FRAME_KIND_BRACKET,
              enter_idx: i,
              parent: stack[stack.length - 1],
            });
            stack.push(idx);
            stack_at_start.push(0);
            bracket_depth++;
          } else if (c === bracket_close) {
            if (stack.length > 1) {
              stack.pop();
              stack_at_start.pop();
            }
            if (bracket_depth > 0) bracket_depth--;
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
          } else {
            for (let r = 0; r < angle_reset_len; r++) {
              if (c === angle_reset[r]) {
                angle_depth = 0;
                break;
              }
            }
            if (pending_kind >= 0 && brace_depth === pending_depth) {
              for (let r = 0; r < marker_reset_len; r++) {
                if (c === marker_reset[r]) {
                  pending_kind = -1;
                  pending_depth = -1;
                  break;
                }
              }
            }
            if (at_start_enabled) {
              let is_reset = false;
              for (let r = 0; r < reset_chars_len; r++) {
                if (c === reset_chars[r]) {
                  is_reset = true;
                  break;
                }
              }
              stack_at_start[stack_at_start.length - 1] = is_reset ? 1 : 0;
            }
          }
        }
      } else if (at_start_enabled && !is_trivia && !is_transparent) {
        stack_at_start[stack_at_start.length - 1] = 0;
      }

      if (!is_trivia) prev_significant = i;

      active_frame[i] = stack[stack.length - 1];
      depths[base] = paren_depth;
      depths[base + 1] = brace_depth;
      depths[base + 2] = bracket_depth;
    }

    // signals run as a second, self-contained pass so the main walk's code
    // is untouched for the (vastly more common) configs that don't track
    // them. weaving the signal branches into the loop above measurably
    // degraded the jit code shared by ALL frame_track instances once one
    // signals-enabled tracker had run (~14% on signal-free pipelines);
    // the dedicated pass keeps that cost on the opted-in pipeline only.
    if (signals_enabled && type_flags !== null && signal_tables !== null) {
      compute_signals(input, tokens, n, compiled, signal_tables, type_flags, punct_id, signals);
    }

    const table: FrameTable = {
      active_frame,
      depths,
      at_start,
      frames,
      kind_names,
      signals,
      flag_names: compiled.stmt_flag_names,
    };
    // attach to result -- callers must clone result.tokens before mutating
    // anyway (per the reclassifier contract), and frames is computed off
    // tokens so a later splice-changing reclassifier invalidates it. by
    // convention, splice-changing reclassifiers strip `frames` from their
    // output; pure type-claim reclassifiers preserve it.
    return {
      tokens: result.tokens,
      token_types: result.token_types,
      overlays: result.overlays,
      frames: table,
    };
  };
}
