// param_list — data-driven parameter-tagging primitive.
//
// replaces hand-written reclassifiers like the old promote_js_parameters
// with a config-described detector list + walk. takes a single config
// object describing the language's param-list openers (function keyword,
// member methods, arrow functions, single-ident arrows) and the tagging
// behaviour inside paren bodies. portable: a host runtime executes the
// same primitive across JS / TS / TSX / future ports.
//
// self-contained: tracks its own brace classification + at_start, since
// the brace classifier needs language-specific state (expecting_class_body
// for member_method detection) that the generic frame_track does not model.

import type {
  ArrowParenDetector,
  KeywordParamListDetector,
  MemberMethodDetector,
  ParamListConfig,
  ParamListDetector,
  Reclassifier,
  TokenizeResult,
} from "./types";

// pre-resolved view of one detector against the current token_types
// vocabulary. resolved per-call (cheap; cached against token_types).
interface CompiledDetector {
  kind: ParamListDetector["kind"];
  spec: ParamListDetector;
}

interface CompiledConfig {
  detectors: CompiledDetector[];
  default_introducer: string;
  transparent_operators: Set<string>;
  result_type: string;
  classifier: BraceClassifierConfig;
  member_transparent_keywords: Set<string>;
  member_brace_kinds: Set<string>;
  // pre-bucketed detectors by trigger token-type, so the main loop only
  // visits detectors that COULD match the current token. each token type
  // takes a small dispatch (typically 1-2 detectors) instead of the full
  // detector list (4+). large-token-count files (the common case) see
  // most of their work skip the detector loop entirely.
  detectors_for_keyword: CompiledDetector[];
  detectors_for_identifier: CompiledDetector[];
  detectors_for_punctuation: CompiledDetector[];
}

// brace classification rules, shared across all JS-family languages. only
// the keyword sets are exposed because the prev-token shape logic is
// universal across JS/TS/TSX/Flow.
interface BraceClassifierConfig {
  // keywords that, when they precede a `{`, force a block classification
  // (e.g. do/try/else/finally).
  block_leading_keywords: Set<string>;
  // keywords that set expecting_class_body (the next top-level `{` outside
  // generics becomes a class body).
  class_body_keyword: string;
  // keywords that set expecting_interface_body (TS only -- omit for plain JS).
  interface_body_keyword?: string;
}

function compile_config(config: ParamListConfig, classifier: BraceClassifierConfig): CompiledConfig {
  // collect the union of method_leading_keywords + member brace_kinds across
  // every member_method detector. used by the state machine to keep at_start
  // alive when one of these keywords appears at member-start in a member
  // brace -- otherwise `set p(v) {}` consumes at_start at `set` and `p`
  // never gets seen as the method name.
  const member_transparent_keywords = new Set<string>();
  const member_brace_kinds = new Set<string>();
  for (const d of config.detectors) {
    if (d.kind !== "member_method") continue;
    const m = d as MemberMethodDetector;
    if (m.method_leading_keywords) {
      for (const k of m.method_leading_keywords) member_transparent_keywords.add(k);
    }
    for (const k of m.in_brace_kinds) member_brace_kinds.add(k);
  }
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
    classifier,
    member_transparent_keywords,
    member_brace_kinds,
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

type BraceClass = "class" | "interface" | "object" | "type_literal" | "block" | "paren" | "bracket";

interface ScopeEntry {
  kind: BraceClass;
  at_start: boolean;
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
    tokens[j * 3] === ids.operator &&
    input.slice(tokens[j * 3 + 1], tokens[j * 3 + 2]) === "=>"
  );
}

// classify a `{` brace using prev-token shape. matches the JS classify_open_brace
// logic but generalised: only the BLOCK_LEADING_KEYWORDS set is configurable.
// expecting_class_body / expecting_interface_body are passed in to handle the
// pending-marker form for `class` / `interface` headers.
function classify_brace(
  tokens: Uint32Array,
  input: string,
  open_idx: number,
  ids: ResolvedIds,
  cfg: CompiledConfig,
  angle_depth: number,
  expecting_class_body: boolean,
  expecting_interface_body: boolean,
  paren_depth: number,
  bracket_depth: number,
): { kind: BraceClass; consumed_class: boolean; consumed_interface: boolean } {
  const nested_angles = angle_depth > 0;
  const nested_structural = paren_depth > 0 || bracket_depth > 0;
  if (expecting_class_body && !nested_angles && !nested_structural) {
    return { kind: "class", consumed_class: true, consumed_interface: false };
  }
  if (expecting_interface_body && !nested_angles && !nested_structural) {
    return { kind: "interface", consumed_class: false, consumed_interface: true };
  }
  if ((expecting_class_body || expecting_interface_body) && nested_angles) {
    return { kind: "type_literal", consumed_class: false, consumed_interface: false };
  }
  const prev = prev_non_trivia(tokens, open_idx - 1, ids.comment);
  if (prev < 0) {
    return { kind: "block", consumed_class: false, consumed_interface: false };
  }
  const pk = tokens[prev * 3];
  const pt = input.slice(tokens[prev * 3 + 1], tokens[prev * 3 + 2]);
  if (pk === ids.operator && pt === "=>") {
    return { kind: "block", consumed_class: false, consumed_interface: false };
  }
  if (pk === ids.punctuation && pt === ":") {
    return { kind: "type_literal", consumed_class: false, consumed_interface: false };
  }
  if (pk === ids.keyword && cfg.classifier.block_leading_keywords.has(pt)) {
    return { kind: "block", consumed_class: false, consumed_interface: false };
  }
  if (pk === ids.punctuation && pt.length > 0 && pt[pt.length - 1] === ")") {
    return { kind: "block", consumed_class: false, consumed_interface: false };
  }
  return { kind: "object", consumed_class: false, consumed_interface: false };
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
  scope_stack: ScopeEntry[],
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
      const top = scope_stack[scope_stack.length - 1];
      if (top === undefined || !top.at_start) return null;
      let in_kind = false;
      for (const k of s.in_brace_kinds) {
        if (top.kind === k) {
          in_kind = true;
          break;
        }
      }
      if (!in_kind) return null;
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
            const top = scope_stack[scope_stack.length - 1];
            const in_object = top !== undefined && top.kind === "object";
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

// default brace classifier config for the JS family. exposed so callers
// can pass a different config to override block-leading keywords.
export const DEFAULT_JS_BRACE_CLASSIFIER: BraceClassifierConfig = {
  block_leading_keywords: new Set(["do", "try", "else", "finally"]),
  class_body_keyword: "class",
  interface_body_keyword: "interface",
};

export function param_list(
  config: ParamListConfig,
  classifier: BraceClassifierConfig = DEFAULT_JS_BRACE_CLASSIFIER,
): Reclassifier {
  const compiled = compile_config(config, classifier);

  return (input: string, result: TokenizeResult): TokenizeResult => {
    const { tokens, token_types } = result;
    const ids = resolve_ids(token_types, compiled.result_type);
    if (
      ids.identifier < 0 ||
      ids.keyword < 0 ||
      ids.punctuation < 0 ||
      ids.operator < 0
    ) {
      return result;
    }

    // scope stack + state machine for brace classification.
    const scope_stack: ScopeEntry[] = [];
    let expecting_class_body = false;
    let expecting_interface_body = false;
    let angle_depth = 0;
    let paren_depth = 0;
    let brace_depth = 0;
    let bracket_depth = 0;

    const consume_at_start = (): void => {
      const top = scope_stack[scope_stack.length - 1];
      if (top !== undefined) top.at_start = false;
    };

    const n = tokens.length / 3;
    for (let i = 0; i < n; i++) {
      const base = i * 3;
      const kt = tokens[base];
      if (kt === ids.comment) continue;

      // run detectors BEFORE processing the token's state effects, so
      // the at_start/scope state reflects the state AT this token. only
      // visit detectors registered for the current token type -- typically
      // 0-2 instead of the full detector list.
      let bucket: CompiledDetector[] | null = null;
      if (kt === ids.keyword) bucket = compiled.detectors_for_keyword;
      else if (kt === ids.identifier || (ids.function_id >= 0 && kt === ids.function_id))
        bucket = compiled.detectors_for_identifier;
      else if (kt === ids.punctuation) bucket = compiled.detectors_for_punctuation;
      if (bucket !== null) {
        for (const detector of bucket) {
          const r = run_detector(detector, tokens, input, i, ids, scope_stack);
          if (r === null) continue;
          if (r.kind === "tag_identifier") {
            tokens[r.idx * 3] = ids.result_id;
          } else {
            walk_params(tokens, input, r.open_idx, r.open_off, ids, compiled);
          }
          break;
        }
      }

      // update state machine for subsequent tokens.
      if (kt === ids.keyword) {
        const text = input.slice(tokens[base + 1], tokens[base + 2]);
        if (text === compiled.classifier.class_body_keyword) {
          expecting_class_body = true;
          // `class` keyword itself does NOT consume at_start so a
          // class-named-`class` in member position still classifies.
          continue;
        }
        if (
          compiled.classifier.interface_body_keyword !== undefined &&
          text === compiled.classifier.interface_body_keyword
        ) {
          expecting_interface_body = true;
          continue;
        }
        // method-leading keywords (`get`/`set`/`async`/`static`/...) at
        // member-start in a member brace kind stay transparent so the
        // method name that follows still sees at_start = true.
        const top = scope_stack[scope_stack.length - 1];
        if (
          top !== undefined &&
          top.at_start &&
          compiled.member_brace_kinds.has(top.kind) &&
          compiled.member_transparent_keywords.has(text)
        ) {
          continue;
        }
        consume_at_start();
        continue;
      }

      if (kt === ids.operator) {
        const text = input.slice(tokens[base + 1], tokens[base + 2]);
        if (text === "<") {
          angle_depth++;
        } else if (text === ">") {
          if (angle_depth > 0) angle_depth--;
        } else if (text === ">>") {
          angle_depth = Math.max(0, angle_depth - 2);
        } else if (text === ">>>") {
          angle_depth = Math.max(0, angle_depth - 3);
        } else if (text === "*") {
          // generator marker inside a class/object/interface body stays
          // transparent so the next identifier is recognised as a method.
          const top = scope_stack[scope_stack.length - 1];
          if (
            top !== undefined &&
            top.at_start &&
            (top.kind === "class" || top.kind === "object" || top.kind === "interface")
          ) {
            continue;
          }
        }
        consume_at_start();
        continue;
      }

      if (kt === ids.punctuation) {
        const s = tokens[base + 1];
        const e = tokens[base + 2];
        for (let p = s; p < e; p++) {
          const ch = input.charCodeAt(p);
          if (ch === 0x7b) {
            // {
            const cls = classify_brace(
              tokens,
              input,
              i,
              ids,
              compiled,
              angle_depth,
              expecting_class_body,
              expecting_interface_body,
              paren_depth,
              bracket_depth,
            );
            if (cls.consumed_class) expecting_class_body = false;
            if (cls.consumed_interface) expecting_interface_body = false;
            scope_stack.push({ kind: cls.kind, at_start: true });
            brace_depth++;
          } else if (ch === 0x7d) {
            // }
            const popped = scope_stack.pop();
            if (brace_depth > 0) brace_depth--;
            const top = scope_stack[scope_stack.length - 1];
            if (top !== undefined) {
              if (popped !== undefined && (top.kind === "class" || top.kind === "interface")) {
                // re-arm parent so next member sees at_start=true.
                top.at_start = true;
              } else {
                top.at_start = false;
              }
            }
          } else if (ch === 0x28) {
            // (
            scope_stack.push({ kind: "paren", at_start: false });
            paren_depth++;
          } else if (ch === 0x29) {
            // )
            scope_stack.pop();
            if (paren_depth > 0) paren_depth--;
            consume_at_start();
          } else if (ch === 0x5b) {
            // [
            scope_stack.push({ kind: "bracket", at_start: false });
            bracket_depth++;
          } else if (ch === 0x5d) {
            // ]
            scope_stack.pop();
            if (bracket_depth > 0) bracket_depth--;
            consume_at_start();
          } else if (ch === 0x2c || ch === 0x3b) {
            // , ;  -- re-arm at_start on top frame
            const top = scope_stack[scope_stack.length - 1];
            if (top !== undefined) top.at_start = true;
          } else {
            consume_at_start();
          }
        }
        continue;
      }

      // identifier / other -- consume at_start
      consume_at_start();
    }

    return { tokens, token_types, overlays: result.overlays, frames: result.frames };
  };
}
