// ---- lib/core/src/frame_track.ts ----
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
  prev_rules: {
    type: string;
    texts: Set<string> | null;
    last_chars: number[] | null;
    kind_id: number;
  }[];
  default_kind: number;
  start_kind: number;
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
      texts: r.prev_texts !== undefined ? new Set(r.prev_texts) : null,
      last_chars,
      kind_id: intern(r.kind),
    };
  });

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
  prev_rules: {
    type_id: number;
    texts: Set<string> | null;
    last_chars: number[] | null;
    kind_id: number;
  }[];
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
  return {
    marker_lists,
    angle_type_id,
    prev_rules: compiled.prev_rules.map((r) => {
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
        kind_id: r.kind_id,
      };
    }),
  };
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

// prev-token classification for a `{` with no pending marker claim. module
// level (no captures) so the walk loop's depth counters stay in registers
// instead of a closure context. called once per opening brace.
function classify_by_prev(
  input: string,
  tokens: Uint32Array,
  kinds: CompiledBraceKinds,
  kind_tables: ResolvedKindTables,
  prev_significant: number,
): number {
  if (prev_significant < 0) return kinds.start_kind;
  const pbase = prev_significant * 3;
  const ptype = tokens[pbase];
  const ps = tokens[pbase + 1];
  const pe = tokens[pbase + 2];
  const rules = kind_tables.prev_rules;
  for (let r = 0; r < rules.length; r++) {
    const rule = rules[r];
    if (rule.type_id !== ptype) continue;
    if (rule.texts !== null) {
      if (rule.texts.has(input.slice(ps, pe))) return rule.kind_id;
      continue;
    }
    if (rule.last_chars !== null) {
      const last = input.charCodeAt(pe - 1);
      let hit = false;
      for (let c = 0; c < rule.last_chars.length; c++) {
        if (last === rule.last_chars[c]) {
          hit = true;
          break;
        }
      }
      if (hit) return rule.kind_id;
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
    // pending body-marker kind, -1 when none armed. last writer wins --
    // two markers cannot legitimately be pending at once in real code.
    let pending_kind = -1;

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
              } else {
                kind = classify_by_prev(input, tokens, kinds, kind_tables, prev_significant);
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
          } else if (at_start_enabled) {
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


// ---- lib/core/src/fidelity.ts ----
// shared fidelity reclassifiers.
//
// these are the post-tokenization building blocks that promote low-fidelity
// identifier tokens to higher-fidelity types (`function`, `class_name`,
// `builtin`, `boolean`, `type`, etc.) using simple text or case checks.
// before these existed each language re-implemented them inline; they are
// factored here so a language's reclassifier pipeline is just a few calls
// plus any language-specific stateful passes.
//
// every helper returns a claim-producing reclassifier: matches emit claims
// at the target type's table precedence, so consecutive promoters batch
// together (one flush, conflicts resolved by precedence) and never mutate
// the caller's tokens or shared token_types array.

import { debug_enabled, warn_once } from "./debug";
import {
  any_of,
  as_claim_producer,
  balanced_parens,
  precedence_for,
  rewrite_types,
  seq,
  type,
} from "./reclassifier";
import type {
  ClaimFn,
  ClaimingReclassifier,
  Reclassifier,
  RewriteOptions,
  TokenPatternSpec,
} from "./types";

// ---------------------------------------------------------------------------
// promote_by_text_set
// ---------------------------------------------------------------------------
//
// rewrites tokens of `source_type` whose source text appears in `text_set`
// to `target_type`. does not need a Set — iterables are fine — but a Set
// is what callers almost always have. allocates the target_type entry in
// the token_types array if it's not already present.
//
// common uses: Python builtin types (list, dict, …) → builtin; Rust
// PRIMITIVE_TYPES (i32, u64, …) → class_name; JS / Python / Rust boolean
// literals → boolean.

export function promote_by_text_set(
  source_type: string,
  target_type: string,
  text_set: Iterable<string>,
): ClaimingReclassifier {
  const set = text_set instanceof Set ? text_set : new Set(text_set);
  const claim_fn: ClaimFn = (input, tokens, token_types, sink) => {
    const source_id = token_types.indexOf(source_type);
    if (source_id < 0) {
      if (debug_enabled()) {
        warn_once(
          "fidelity",
          `source-type:${source_type}`,
          `source type "${source_type}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }
    let target_id = token_types.indexOf(target_type);
    if (target_id < 0) {
      target_id = token_types.length;
      token_types.push(target_type);
    }
    const prec = precedence_for(target_type);
    const n = tokens.length / 3;
    for (let i = 0; i < n; i++) {
      if (tokens[i * 3] !== source_id) continue;
      const s = tokens[i * 3 + 1];
      const e = tokens[i * 3 + 2];
      if (set.has(input.slice(s, e))) {
        sink.emit(i, target_id, prec);
      }
    }
  };
  return as_claim_producer(claim_fn);
}

// ---------------------------------------------------------------------------
// promote_pascal_case
// ---------------------------------------------------------------------------
//
// rewrites tokens of `source_type` whose first character is ASCII uppercase
// (A-Z) to `target_type`. this mirrors the grammar-time case dispatch that
// Python and Rust historically had: an identifier starting with an uppercase
// letter is almost certainly a type name (class / struct / enum / trait).
//
// the check is a single char-code compare per identifier token. for
// non-ASCII-aware classification the caller can post-process further.

const ASCII_UPPER_MIN = 0x41;
const ASCII_UPPER_MAX = 0x5a;

export function promote_pascal_case(
  source_type: string,
  target_type: string,
): ClaimingReclassifier {
  const claim_fn: ClaimFn = (input, tokens, token_types, sink) => {
    const source_id = token_types.indexOf(source_type);
    if (source_id < 0) {
      if (debug_enabled()) {
        warn_once(
          "fidelity",
          `source-type:${source_type}`,
          `source type "${source_type}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }
    let target_id = token_types.indexOf(target_type);
    if (target_id < 0) {
      target_id = token_types.length;
      token_types.push(target_type);
    }
    const prec = precedence_for(target_type);
    const n = tokens.length / 3;
    for (let i = 0; i < n; i++) {
      if (tokens[i * 3] !== source_id) continue;
      const s = tokens[i * 3 + 1];
      const e = tokens[i * 3 + 2];
      const first = input.charCodeAt(s);
      if (first < ASCII_UPPER_MIN || first > ASCII_UPPER_MAX) continue;
      // reject all-upper multi-char names (`MAX_SIZE`, `PI`). these are
      // UPPER_SNAKE constants by convention, not PascalCase types. the
      // constant promoter (promote_by_upper_snake_case) is the right
      // home for them. single-char uppercase (generic params `T`, `X`)
      // still promote so languages that treat them as types don't lose
      // coverage.
      if (e - s > 1) {
        let has_lower = false;
        for (let k = s; k < e; k++) {
          const c = input.charCodeAt(k);
          if (c >= 0x61 && c <= 0x7a) {
            has_lower = true;
            break;
          }
        }
        if (!has_lower) continue;
      }
      sink.emit(i, target_id, prec);
    }
  };
  return as_claim_producer(claim_fn);
}

// ---------------------------------------------------------------------------
// promote_by_upper_snake_case
// ---------------------------------------------------------------------------
//
// rewrites tokens of `source_type` whose source text is UPPER_SNAKE_CASE to
// `target_type`. the predicate is: first char in [A-Z], every char in
// [A-Z0-9_], length >= 2. single-char uppercase identifiers (like generic
// type parameters `T`) are left alone so the pascal_case pass can claim them
// as class_name.
//
// common use: promoting convention-declared constants — `MAX_VALUE`, `PI`,
// `HTTP_STATUS` — to `constant`. pair with pascal_case ordering so the two
// predicates don't overlap: this pass claims `MAX_VALUE`, pascal_case then
// claims `MaxValue`.

const ASCII_DIGIT_MIN = 0x30;
const ASCII_DIGIT_MAX = 0x39;
const ASCII_UNDERSCORE = 0x5f;

function is_upper_snake_char(code: number): boolean {
  return (
    (code >= ASCII_UPPER_MIN && code <= ASCII_UPPER_MAX) ||
    (code >= ASCII_DIGIT_MIN && code <= ASCII_DIGIT_MAX) ||
    code === ASCII_UNDERSCORE
  );
}

export function promote_by_upper_snake_case(
  source_type: string,
  target_type: string,
): ClaimingReclassifier {
  const claim_fn: ClaimFn = (input, tokens, token_types, sink) => {
    const source_id = token_types.indexOf(source_type);
    if (source_id < 0) {
      if (debug_enabled()) {
        warn_once(
          "fidelity",
          `source-type:${source_type}`,
          `source type "${source_type}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }
    let target_id = token_types.indexOf(target_type);
    if (target_id < 0) {
      target_id = token_types.length;
      token_types.push(target_type);
    }
    const prec = precedence_for(target_type);
    const n = tokens.length / 3;
    for (let i = 0; i < n; i++) {
      if (tokens[i * 3] !== source_id) continue;
      const s = tokens[i * 3 + 1];
      const e = tokens[i * 3 + 2];
      if (e - s < 2) continue;
      const first = input.charCodeAt(s);
      if (first < ASCII_UPPER_MIN || first > ASCII_UPPER_MAX) continue;
      let all_ok = true;
      for (let k = s + 1; k < e; k++) {
        if (!is_upper_snake_char(input.charCodeAt(k))) {
          all_ok = false;
          break;
        }
      }
      if (all_ok) sink.emit(i, target_id, prec);
    }
  };
  return as_claim_producer(claim_fn);
}

// ---------------------------------------------------------------------------
// promote_function_calls
// ---------------------------------------------------------------------------
//
// rewrites identifier tokens that appear in function-call position to
// `function`. the simplest variant — `foo()` — is a single rewrite_types
// rule; extras handle language-specific call shapes.
//
//   plain:       ident (…)              — javascript, python, css
//   macro:       ident !(…)             — rust
//   generic:     ident <…>(…)           — rust (generic fn call)
//   turbofish:   ident ::<…>(…)         — rust
//   css-simple:  ident(                 — css emits `(` as its own token
//                                         more often, so pattern is tighter
//
// callers opt into variants via `variants`. returning one reclassifier
// means the call-site rewrite is a single rewrite_types pass.

export interface FunctionCallVariants {
  plain?: boolean;
  macro?: boolean;
  generic_fn?: boolean;
  turbofish?: boolean;
}

export function promote_function_calls(
  source_type = "identifier",
  target_type = "function",
  variants: FunctionCallVariants = { plain: true },
  options?: RewriteOptions,
): Reclassifier {
  const when_branches: TokenPatternSpec[] = [];
  const paren_call = balanced_parens("(", ")");
  if (variants.plain) {
    when_branches.push(paren_call);
  }
  if (variants.macro) {
    when_branches.push(seq(type("builtin", ["!"]), paren_call));
  }
  if (variants.generic_fn) {
    when_branches.push(seq(balanced_parens("<", ">"), paren_call));
  }
  if (variants.turbofish) {
    when_branches.push(seq(type("punctuation", ["::"]), balanced_parens("<", ">"), paren_call));
  }
  if (when_branches.length === 0) {
    return (_input, result) => result;
  }
  return rewrite_types(
    [
      {
        anchor: source_type,
        when: when_branches.length === 1 ? when_branches[0] : any_of(...when_branches),
        rewrite: target_type,
      },
    ],
    options,
  );
}


// ---- lib/core/src/matched_bracket.ts ----
// matched_bracket — retag paired opener / matching closer tokens.
//
// data-driven primitive: walks the token stream looking for an opener that
// matches (type + text, optional sigil gate), then scans forward for the
// matching closer (type + text), then claims new types for both endpoints.
// ignores trivia in the scan. used by Svelte to retag block braces
// `{#if ...}{/if}` as `punctuation` while leaving ordinary interpolation
// braces alone.
//
// runs as a claim producer: endpoint retags are emitted as claims at the
// target type's table precedence instead of mutating the stream, so the
// pass batches with other claim producers and never touches the caller's
// tokens.

import { debug_enabled, warn_once } from "./debug";
import { as_claim_producer, precedence_for } from "./reclassifier";
import type { ClaimFn, ClaimingReclassifier, MatchedBracketConfig } from "./types";

export function matched_bracket(config: MatchedBracketConfig): ClaimingReclassifier {
  const post_open_set: Set<string> | null =
    config.post_open_required !== undefined ? new Set(config.post_open_required.text_in) : null;

  const claim_fn: ClaimFn = (input, tokens, token_types, sink) => {
    const n = tokens.length / 3;
    if (n === 0) return;

    const open_id = token_types.indexOf(config.open_type);
    const close_id = token_types.indexOf(config.close_type);
    if (open_id < 0 || close_id < 0) {
      if (debug_enabled()) {
        const missing = open_id < 0 ? config.open_type : config.close_type;
        warn_once(
          "matched_bracket",
          `endpoint-type:${missing}`,
          `endpoint type "${missing}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }

    const comment_id = token_types.indexOf("comment");
    const post_open_type_id =
      config.post_open_required !== undefined
        ? token_types.indexOf(config.post_open_required.type)
        : -1;
    if (config.post_open_required !== undefined && post_open_type_id < 0) {
      // configured but not present in this stream's vocabulary -- can't fire.
      if (debug_enabled()) {
        warn_once(
          "matched_bracket",
          `post-open-type:${config.post_open_required.type}`,
          `post_open_required type "${config.post_open_required.type}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }

    // retag targets must exist by name (added by an upstream pass if needed
    // or pre-listed in the grammar). silently skip if absent. identity
    // retags (target same as source) emit no claims.
    const retag_open_id =
      config.retag_open_to !== undefined ? token_types.indexOf(config.retag_open_to) : open_id;
    const retag_close_id =
      config.retag_close_to !== undefined ? token_types.indexOf(config.retag_close_to) : close_id;
    if (retag_open_id < 0 || retag_close_id < 0) {
      if (debug_enabled()) {
        const missing = retag_open_id < 0 ? config.retag_open_to : config.retag_close_to;
        warn_once(
          "matched_bracket",
          `retag-type:${missing}`,
          `retag target "${missing}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }
    const open_prec = precedence_for(config.retag_open_to ?? config.open_type);
    const close_prec = precedence_for(config.retag_close_to ?? config.close_type);

    const text = (i: number): string => input.slice(tokens[i * 3 + 1], tokens[i * 3 + 2]);

    const next_non_trivia = (from: number): number => {
      for (let i = from; i < n; i++) {
        if (tokens[i * 3] !== comment_id) return i;
      }
      return -1;
    };

    for (let i = 0; i < n; i++) {
      if (tokens[i * 3] !== open_id) continue;
      if (text(i) !== config.open_text) continue;
      if (post_open_set !== null) {
        const sigil_idx = next_non_trivia(i + 1);
        if (sigil_idx === -1) continue;
        if (tokens[sigil_idx * 3] !== post_open_type_id) continue;
        if (!post_open_set.has(text(sigil_idx))) continue;
      }
      for (let j = i + 1; j < n; j++) {
        if (tokens[j * 3] !== close_id) continue;
        if (text(j) !== config.close_text) continue;
        if (retag_open_id !== open_id) sink.emit(i, retag_open_id, open_prec);
        if (retag_close_id !== close_id) sink.emit(j, retag_close_id, close_prec);
        i = j;
        break;
      }
    }
  };

  return as_claim_producer(claim_fn);
}


// ---- lib/core/src/compound_compose.ts ----
// compound_compose — stack-driven multi-class type composition.
//
// data-driven primitive that maintains an open-style stack via open/close
// marker token types and emits a composed type per token (e.g. for
// markdown's bold/italic/code nesting). composed types are interned into
// token_types dynamically so the renderer can split on the separator.

import { debug_enabled, warn_once } from "./debug";
import type { CompoundComposeConfig, Reclassifier, TokenizeResult } from "./types";

interface OpenStyleMap {
  // resolved open type_id -> style name (a string label, NOT an id)
  by_open_id: Map<number, string>;
  // resolved close type_id -> style name
  by_close_id: Map<number, string>;
}

function resolve_style_map(token_types: string[], config: CompoundComposeConfig): OpenStyleMap {
  const by_open_id = new Map<number, string>();
  const by_close_id = new Map<number, string>();
  for (const s of config.styles) {
    const oid = token_types.indexOf(s.open_type);
    const cid = token_types.indexOf(s.close_type);
    if (oid >= 0) by_open_id.set(oid, s.style_name);
    if (cid >= 0) by_close_id.set(cid, s.style_name);
  }
  return { by_open_id, by_close_id };
}

export function compound_compose(config: CompoundComposeConfig): Reclassifier {
  return (input: string, result: TokenizeResult): TokenizeResult => {
    const { tokens, token_types } = result;
    const new_token_types = token_types.slice();
    const styles = resolve_style_map(new_token_types, config);

    // empty fast path: no styles resolved (this stream's vocabulary has
    // none of the configured open/close types) -- nothing to do.
    if (styles.by_open_id.size === 0 && styles.by_close_id.size === 0) {
      if (debug_enabled()) {
        warn_once(
          "compound_compose",
          "no-styles",
          "none of the configured open/close marker types are in the token vocabulary; pass disabled",
        );
      }
      return result;
    }

    const type_index = new Map<string, number>();
    for (let i = 0; i < new_token_types.length; i++) {
      type_index.set(new_token_types[i], i);
    }
    const intern = (name: string): number => {
      let id = type_index.get(name);
      if (id === undefined) {
        id = new_token_types.length;
        new_token_types.push(name);
        type_index.set(name, id);
      }
      return id;
    };

    const compose_with = (stack: string[], base: string): string => {
      if (stack.length === 0) return base;
      if (config.dedup_against_base && stack.indexOf(base) !== -1) {
        return stack.join(config.join_separator);
      }
      return stack.join(config.join_separator) + config.join_separator + base;
    };

    const new_tokens = new Uint32Array(tokens.length);
    const stack: string[] = [];
    let last_end = 0;

    for (let i = 0; i < tokens.length; i += 3) {
      const old_type_id = tokens[i];
      const old_type = new_token_types[old_type_id];
      const start = tokens[i + 1];
      const end = tokens[i + 2];

      if (config.auto_pop_on_newline && stack.length > 0) {
        const nl = input.indexOf("\n", last_end);
        if (nl !== -1 && nl < start) {
          stack.length = 0;
        }
      }

      let new_type: string;
      const open_style = styles.by_open_id.get(old_type_id);
      const close_style = styles.by_close_id.get(old_type_id);

      if (open_style !== undefined) {
        const existing_idx = stack.lastIndexOf(open_style);
        if (existing_idx !== -1) {
          // grammar leaked a frame -- treat this "open" as a close down
          // to the existing entry.
          new_type = stack.join(config.join_separator);
          stack.length = existing_idx;
        } else {
          stack.push(open_style);
          new_type = stack.join(config.join_separator);
        }
      } else if (close_style !== undefined) {
        new_type = stack.join(config.join_separator);
        const idx = stack.lastIndexOf(close_style);
        if (idx !== -1) stack.length = idx;
      } else {
        new_type = compose_with(stack, old_type);
      }

      new_tokens[i] = intern(new_type);
      new_tokens[i + 1] = start;
      new_tokens[i + 2] = end;
      last_end = end;
    }

    return {
      tokens: new_tokens,
      token_types: new_token_types,
      overlays: result.overlays,
      frames: result.frames,
    };
  };
}
