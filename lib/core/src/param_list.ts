// param_list — data-driven parameter-tagging primitive.
//
// replaces hand-written reclassifiers like the old promote_js_parameters
// with a config-described detector list + walk. takes a single config
// object describing the language's param-list openers (function keyword,
// member methods, arrow functions, single-ident arrows) and the tagging
// behaviour inside paren bodies. portable: a host runtime executes the
// same primitive across JS / TS / TSX / future ports.
//
// requires an upstream frame_track stage configured with `brace_kinds` and
// `at_start`: member_method detection reads the active frame's kind and the
// per-token at_start flag from the shared frame table instead of walking
// its own scope stack. without frames the primitive is a silent no-op.

import type {
  ArrowParenDetector,
  FrameTable,
  KeywordParamListDetector,
  MemberMethodDetector,
  ParamListConfig,
  ParamListDetector,
  Reclassifier,
  TokenizeResult,
} from "./types";
import { FRAME_BRACKET_BRACE } from "./types";

// pre-resolved view of one detector. member_kind_ids is the detector's
// in_brace_kinds resolved against the current frame table's kind names --
// re-resolved per call because the same primitive instance may run behind
// frame_track stages with different brace_kind specs.
interface CompiledDetector {
  kind: ParamListDetector["kind"];
  spec: ParamListDetector;
  member_kind_ids?: Set<number>;
}

interface CompiledConfig {
  detectors: CompiledDetector[];
  default_introducer: string;
  transparent_operators: Set<string>;
  result_type: string;
  // pre-bucketed detectors by trigger token-type, so the main loop only
  // visits detectors that COULD match the current token. each token type
  // takes a small dispatch (typically 1-2 detectors) instead of the full
  // detector list (4+). large-token-count files (the common case) see
  // most of their work skip the detector loop entirely.
  detectors_for_keyword: CompiledDetector[];
  detectors_for_identifier: CompiledDetector[];
  detectors_for_punctuation: CompiledDetector[];
}

function compile_config(config: ParamListConfig): CompiledConfig {
  const all_detectors = config.detectors.map((d) => ({ kind: d.kind, spec: d }));
  const for_keyword: CompiledDetector[] = [];
  const for_identifier: CompiledDetector[] = [];
  const for_punctuation: CompiledDetector[] = [];
  for (const d of all_detectors) {
    switch (d.kind) {
      case "after_keyword":
        for_keyword.push(d);
        break;
      case "member_method":
        // member_method fires on identifier OR a method_leading keyword.
        for_identifier.push(d);
        for_keyword.push(d);
        break;
      case "arrow_paren":
        for_punctuation.push(d);
        break;
      case "single_ident_arrow":
        for_identifier.push(d);
        break;
    }
  }
  return {
    detectors: all_detectors,
    default_introducer: config.default_introducer ?? "",
    transparent_operators: new Set(config.transparent_operators ?? []),
    result_type: config.result_type,
    detectors_for_keyword: for_keyword,
    detectors_for_identifier: for_identifier,
    detectors_for_punctuation: for_punctuation,
  };
}

interface ResolvedIds {
  identifier: number;
  keyword: number;
  punctuation: number;
  operator: number;
  function_id: number;
  result_id: number;
  comment: number;
}

function resolve_ids(token_types: string[], result_type: string): ResolvedIds {
  const ident = token_types.indexOf("identifier");
  const kw = token_types.indexOf("keyword");
  const punct = token_types.indexOf("punctuation");
  const op = token_types.indexOf("operator");
  const fn = token_types.indexOf("function");
  let res = token_types.indexOf(result_type);
  if (res < 0) {
    res = token_types.length;
    token_types.push(result_type);
  }
  return {
    identifier: ident,
    keyword: kw,
    punctuation: punct,
    operator: op,
    function_id: fn,
    result_id: res,
    comment: token_types.indexOf("comment"),
  };
}

// walk identifiers at param-list depth and tag them. starts at the
// opening `(` (open_off is the character offset of `(` within token
// open_idx). walks to the matching `)`, tagging identifiers at depth 1.
// transparent operators (e.g. `...`) pass through. seeing default_introducer
// at depth 1 suspends tagging until the next `,` at depth 1.
function walk_params(
  tokens: Uint32Array,
  input: string,
  open_idx: number,
  open_off: number,
  ids: ResolvedIds,
  cfg: CompiledConfig,
): void {
  const n = tokens.length / 3;
  let depth = 1;
  let expect_param = true;
  let saw_default = false;

  const open_s = tokens[open_idx * 3 + 1];
  const open_e = tokens[open_idx * 3 + 2];
  for (let p = open_s + open_off + 1; p < open_e; p++) {
    const ch = input.charCodeAt(p);
    if (ch === 0x28 || ch === 0x5b || ch === 0x7b) depth++;
    else if (ch === 0x29 || ch === 0x5d || ch === 0x7d) {
      depth--;
      if (depth === 0) return;
    } else if (ch === 0x2c && depth === 1) {
      expect_param = true;
      saw_default = false;
    }
  }

  let k = open_idx + 1;
  while (k < n && depth > 0) {
    const base = k * 3;
    const kt = tokens[base];
    if (kt === ids.comment) {
      k++;
      continue;
    }
    if (kt === ids.punctuation) {
      const s = tokens[base + 1];
      const e = tokens[base + 2];
      for (let p = s; p < e; p++) {
        const ch = input.charCodeAt(p);
        if (ch === 0x28 || ch === 0x5b || ch === 0x7b) depth++;
        else if (ch === 0x29 || ch === 0x5d || ch === 0x7d) {
          depth--;
          if (depth === 0) break;
        } else if (ch === 0x2c && depth === 1) {
          expect_param = true;
          saw_default = false;
        }
      }
      k++;
      continue;
    }
    if (depth === 1 && expect_param && !saw_default) {
      if (kt === ids.operator) {
        const text = input.slice(tokens[base + 1], tokens[base + 2]);
        if (text === cfg.default_introducer) {
          expect_param = false;
          saw_default = true;
          k++;
          continue;
        }
        if (cfg.transparent_operators.has(text)) {
          k++;
          continue;
        }
        expect_param = false;
        k++;
        continue;
      }
      if (kt === ids.identifier) {
        tokens[base] = ids.result_id;
        expect_param = false;
        k++;
        continue;
      }
      expect_param = false;
    }
    k++;
  }
}

function find_matching_close(
  tokens: Uint32Array,
  input: string,
  open_idx: number,
  open_off: number,
  punct_id: number,
): { token: number; off: number } | null {
  const n = tokens.length / 3;
  let depth = 1;
  const open_s = tokens[open_idx * 3 + 1];
  const open_e = tokens[open_idx * 3 + 2];
  for (let p = open_s + open_off + 1; p < open_e; p++) {
    const ch = input.charCodeAt(p);
    if (ch === 0x28 || ch === 0x5b || ch === 0x7b) depth++;
    else if (ch === 0x29 || ch === 0x5d || ch === 0x7d) {
      depth--;
      if (depth === 0) return { token: open_idx, off: p - open_s };
    }
  }
  for (let k = open_idx + 1; k < n; k++) {
    const base = k * 3;
    if (tokens[base] !== punct_id) continue;
    const s = tokens[base + 1];
    const e = tokens[base + 2];
    for (let p = s; p < e; p++) {
      const ch = input.charCodeAt(p);
      if (ch === 0x28 || ch === 0x5b || ch === 0x7b) depth++;
      else if (ch === 0x29 || ch === 0x5d || ch === 0x7d) {
        depth--;
        if (depth === 0) return { token: k, off: p - s };
      }
    }
  }
  return null;
}

function next_non_trivia(tokens: Uint32Array, from: number, comment: number): number {
  const n = tokens.length / 3;
  for (let i = from; i < n; i++) {
    if (tokens[i * 3] !== comment) return i;
  }
  return -1;
}

function prev_non_trivia(tokens: Uint32Array, from: number, comment: number): number {
  for (let i = from; i >= 0; i--) {
    if (tokens[i * 3] !== comment) return i;
  }
  return -1;
}

// arrow_paren detector: detect `(...) =>` from the given `(` position.
function detect_arrow_paren(
  tokens: Uint32Array,
  input: string,
  open_idx: number,
  open_off: number,
  ids: ResolvedIds,
  skip_ts_return_type: boolean,
): boolean {
  const close = find_matching_close(tokens, input, open_idx, open_off, ids.punctuation);
  if (close === null) return false;
  const close_s = tokens[close.token * 3 + 1];
  const close_e = tokens[close.token * 3 + 2];
  if (close.off + 1 < close_e - close_s) return false;
  let j = next_non_trivia(tokens, close.token + 1, ids.comment);
  if (j < 0) return false;
  if (
    skip_ts_return_type &&
    tokens[j * 3] === ids.punctuation &&
    input.slice(tokens[j * 3 + 1], tokens[j * 3 + 2]) === ":"
  ) {
    let td = 0;
    let m = j + 1;
    const n = tokens.length / 3;
    while (m < n) {
      const base = m * 3;
      const mt = tokens[base];
      if (mt === ids.comment) {
        m++;
        continue;
      }
      if (mt === ids.punctuation) {
        const s = tokens[base + 1];
        const e = tokens[base + 2];
        let exit_false = false;
        for (let p = s; p < e; p++) {
          const ch = input.charCodeAt(p);
          if (ch === 0x28 || ch === 0x5b || ch === 0x7b) td++;
          else if (ch === 0x29 || ch === 0x5d || ch === 0x7d) {
            if (td === 0) {
              exit_false = true;
              break;
            }
            td--;
          } else if ((ch === 0x2c || ch === 0x3b) && td === 0) {
            exit_false = true;
            break;
          }
        }
        if (exit_false) return false;
      } else if (
        mt === ids.operator &&
        input.slice(tokens[base + 1], tokens[base + 2]) === "=>" &&
        td === 0
      ) {
        return true;
      }
      m++;
    }
    return false;
  }
  return (
    tokens[j * 3] === ids.operator && input.slice(tokens[j * 3 + 1], tokens[j * 3 + 2]) === "=>"
  );
}

type DetectResult =
  | { kind: "walk_paren"; open_idx: number; open_off: number }
  | { kind: "tag_identifier"; idx: number }
  | null;

function run_detector(
  detector: CompiledDetector,
  tokens: Uint32Array,
  input: string,
  i: number,
  ids: ResolvedIds,
  frames: FrameTable,
  object_kind: number,
): DetectResult {
  const base = i * 3;
  const kt = tokens[base];
  const spec = detector.spec;
  switch (detector.kind) {
    case "after_keyword": {
      const s = spec as KeywordParamListDetector;
      if (kt !== ids.keyword) return null;
      if (input.slice(tokens[base + 1], tokens[base + 2]) !== s.keyword) return null;
      let j = next_non_trivia(tokens, i + 1, ids.comment);
      if (j < 0) return null;
      if (s.skip_generator_star) {
        if (
          tokens[j * 3] === ids.operator &&
          input.slice(tokens[j * 3 + 1], tokens[j * 3 + 2]) === "*"
        ) {
          j = next_non_trivia(tokens, j + 1, ids.comment);
          if (j < 0) return null;
        }
      }
      if (s.skip_optional_name) {
        if (
          tokens[j * 3] === ids.identifier ||
          (ids.function_id >= 0 && tokens[j * 3] === ids.function_id)
        ) {
          j = next_non_trivia(tokens, j + 1, ids.comment);
          if (j < 0) return null;
        }
      }
      if (s.skip_optional_generics) {
        if (
          tokens[j * 3] === ids.operator &&
          input.slice(tokens[j * 3 + 1], tokens[j * 3 + 2]) === "<"
        ) {
          let d = 1;
          let m = j + 1;
          const n = tokens.length / 3;
          while (m < n && d > 0) {
            if (tokens[m * 3] === ids.comment) {
              m++;
              continue;
            }
            if (tokens[m * 3] === ids.operator) {
              const tt = input.slice(tokens[m * 3 + 1], tokens[m * 3 + 2]);
              if (tt === "<") d++;
              else if (tt === ">") d--;
              else if (tt === ">>") d = Math.max(0, d - 2);
              else if (tt === ">>>") d = Math.max(0, d - 3);
            }
            m++;
          }
          j = next_non_trivia(tokens, m, ids.comment);
          if (j < 0) return null;
        }
      }
      if (tokens[j * 3] !== ids.punctuation) return null;
      const text = input.slice(tokens[j * 3 + 1], tokens[j * 3 + 2]);
      if (!text.startsWith("(")) return null;
      return { kind: "walk_paren", open_idx: j, open_off: 0 };
    }
    case "member_method": {
      const s = spec as MemberMethodDetector;
      // member position: the token sits at member start of a brace frame
      // whose kind is in the detector's allowlist. both facts come from
      // the upstream frame_track stage.
      if (frames.at_start[i] !== 1) return null;
      const fr = frames.frames[frames.active_frame[i]];
      if (fr.bracket !== FRAME_BRACKET_BRACE) return null;
      if (detector.member_kind_ids === undefined || !detector.member_kind_ids.has(fr.kind)) {
        return null;
      }
      let is_subject = false;
      if (kt === ids.identifier || (ids.function_id >= 0 && kt === ids.function_id)) {
        is_subject = true;
      } else if (
        kt === ids.keyword &&
        s.method_leading_keywords !== undefined &&
        s.method_leading_keywords.includes(input.slice(tokens[base + 1], tokens[base + 2]))
      ) {
        is_subject = true;
      }
      if (!is_subject) return null;
      const nxt = next_non_trivia(tokens, i + 1, ids.comment);
      if (nxt < 0) return null;
      if (tokens[nxt * 3] !== ids.punctuation) return null;
      if (!input.slice(tokens[nxt * 3 + 1], tokens[nxt * 3 + 2]).startsWith("(")) return null;
      return { kind: "walk_paren", open_idx: nxt, open_off: 0 };
    }
    case "arrow_paren": {
      const s = spec as ArrowParenDetector;
      if (kt !== ids.punctuation) return null;
      const text = input.slice(tokens[base + 1], tokens[base + 2]);
      for (let off = 0; off < text.length; off++) {
        if (text[off] !== "(") continue;
        if (s.skip_in_type_position && off === 0) {
          const prev = prev_non_trivia(tokens, i - 1, ids.comment);
          if (prev >= 0 && tokens[prev * 3] === ids.punctuation) {
            const pt = input.slice(tokens[prev * 3 + 1], tokens[prev * 3 + 2]);
            // the scope enclosing this token is the active frame AFTER the
            // previous token -- this token's own `(` has not pushed yet.
            const enclosing = frames.frames[i > 0 ? frames.active_frame[i - 1] : 0];
            const in_object =
              enclosing.bracket === FRAME_BRACKET_BRACE && enclosing.kind === object_kind;
            if (!in_object && pt.length > 0 && pt[pt.length - 1] === ":") {
              continue;
            }
          }
        }
        if (detect_arrow_paren(tokens, input, i, off, ids, s.skip_ts_return_type ?? false)) {
          return { kind: "walk_paren", open_idx: i, open_off: off };
        }
      }
      return null;
    }
    case "single_ident_arrow": {
      if (kt !== ids.identifier && !(ids.function_id >= 0 && kt === ids.function_id)) return null;
      const nxt = next_non_trivia(tokens, i + 1, ids.comment);
      if (nxt < 0) return null;
      if (tokens[nxt * 3] !== ids.operator) return null;
      if (input.slice(tokens[nxt * 3 + 1], tokens[nxt * 3 + 2]) !== "=>") return null;
      return { kind: "tag_identifier", idx: i };
    }
  }
}

export function param_list(config: ParamListConfig): Reclassifier {
  const compiled = compile_config(config);

  return (input: string, result: TokenizeResult): TokenizeResult => {
    const { tokens, token_types } = result;
    const frames = result.frames;
    // no upstream frame_track stage (or one without at_start): fail closed.
    // member detection cannot run safely without shared scope data.
    if (frames === undefined || frames.at_start.length === 0) return result;

    const ids = resolve_ids(token_types, compiled.result_type);
    if (ids.identifier < 0 || ids.keyword < 0 || ids.punctuation < 0 || ids.operator < 0) {
      return result;
    }

    // resolve member_method brace-kind names against this frame table's
    // vocabulary. unknown names resolve to nothing and the detector never
    // fires -- fail closed, consistent with the rest of the pipeline.
    for (const d of compiled.detectors) {
      if (d.kind !== "member_method") continue;
      const kind_ids = new Set<number>();
      for (const name of (d.spec as MemberMethodDetector).in_brace_kinds) {
        const id = frames.kind_names.indexOf(name);
        if (id >= 0) kind_ids.add(id);
      }
      d.member_kind_ids = kind_ids;
    }
    const object_kind = frames.kind_names.indexOf("object");

    const n = tokens.length / 3;
    for (let i = 0; i < n; i++) {
      const kt = tokens[i * 3];
      // visit only detectors registered for the current token type --
      // typically 0-2 instead of the full detector list. scope state is
      // read from the frame table, so non-trigger tokens cost one load.
      let bucket: CompiledDetector[] | null = null;
      if (kt === ids.keyword) bucket = compiled.detectors_for_keyword;
      else if (kt === ids.identifier || (ids.function_id >= 0 && kt === ids.function_id))
        bucket = compiled.detectors_for_identifier;
      else if (kt === ids.punctuation) bucket = compiled.detectors_for_punctuation;
      if (bucket === null) continue;
      for (const detector of bucket) {
        const r = run_detector(detector, tokens, input, i, ids, frames, object_kind);
        if (r === null) continue;
        if (r.kind === "tag_identifier") {
          tokens[r.idx * 3] = ids.result_id;
        } else {
          walk_params(tokens, input, r.open_idx, r.open_off, ids, compiled);
        }
        break;
      }
    }

    return { tokens, token_types, overlays: result.overlays, frames: result.frames };
  };
}
