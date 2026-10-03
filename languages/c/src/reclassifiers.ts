import { as_claim_producer, tag } from "@twinkleplop/core";
import type { ClaimFn, LanguagePipeline } from "@twinkleplop/core";

type Category = "class_name" | "constant" | "function" | "parameter" | "property" | "namespace";
const PRIORITY: Record<Category, number> = {
  constant: 40,
  class_name: 50,
  function: 55,
  property: 60,
  parameter: 65,
  namespace: 70,
};
const TYPE_WORDS = new Set([
  "void",
  "char",
  "short",
  "int",
  "long",
  "float",
  "double",
  "signed",
  "unsigned",
  "bool",
  "_Bool",
  "_Complex",
  "_Decimal32",
  "_Decimal64",
  "_Decimal128",
  "_BitInt",
  "auto",
  "wchar_t",
  "char8_t",
  "char16_t",
  "char32_t",
]);
const QUALIFIERS = new Set([
  "const",
  "volatile",
  "restrict",
  "static",
  "extern",
  "register",
  "constexpr",
  "inline",
  "typename",
]);
const TAG_WORDS = new Set(["struct", "union", "enum", "class"]);

function upper_constant(text: string): boolean {
  if (text.length < 2) return false;
  let c = text.charCodeAt(0);
  if (c < 65 || c > 90) return false;
  for (let i = 1; i < text.length; i++) {
    c = text.charCodeAt(i);
    if (!((c >= 65 && c <= 90) || (c >= 48 && c <= 57) || c === 95)) return false;
  }
  return true;
}

function type_name(text: string): boolean {
  return text.endsWith("_t") || (text[0] >= "A" && text[0] <= "Z" && !upper_constant(text));
}

// token index and priority pairs per category in walk order
type Claims = Record<Category, number[]>;

// codes for compared punctuation and words, each closer is its opener plus one
const LPAREN = 1;
const RPAREN = 2;
const LBRACKET = 3;
const RBRACKET = 4;
const LBRACE = 5;
const RBRACE = 6;
const LT = 7;
const GT = 8;
const SHR = 9;
const SEMI = 10;
const EQ = 11;
const AND = 12;
const OR = 13;
const COMMA = 14;
const STAR = 15;
const AMP = 16;
const ELLIPSIS = 17;
const SCOPE = 18;
const DOT = 19;
const ARROW = 20;
const COLON = 21;
const NAMESPACE = 22;
const ENUM = 23;
const CLASS = 24;
const STRUCT = 25;
const UNION = 26;
const TYPEDEF = 27;
const USING = 28;
const DEFINE = 29;
const RETURN = 30;
const MUTABLE = 31;
const NOEXCEPT = 32;
const CONSTEXPR = 33;
const CONSTEVAL = 34;
const PUBLIC = 35;
const PRIVATE = 36;
const PROTECTED = 37;

// punctuation is at most three ascii chars, keyed by length and char codes
const PUNCT = new Map<number, number>();
for (const [text, code] of [
  ["(", LPAREN],
  [")", RPAREN],
  ["[", LBRACKET],
  ["]", RBRACKET],
  ["{", LBRACE],
  ["}", RBRACE],
  ["<", LT],
  [">", GT],
  [">>", SHR],
  [";", SEMI],
  ["=", EQ],
  ["&&", AND],
  ["||", OR],
  [",", COMMA],
  ["*", STAR],
  ["&", AMP],
  ["...", ELLIPSIS],
  ["::", SCOPE],
  [".", DOT],
  ["->", ARROW],
  [":", COLON],
] as const) {
  let key = text.length;
  for (let i = 0; i < text.length; i++) key |= text.charCodeAt(i) << (2 + 7 * i);
  PUNCT.set(key, code);
}
const WORDS = new Map<string, number>([
  ["namespace", NAMESPACE],
  ["enum", ENUM],
  ["class", CLASS],
  ["struct", STRUCT],
  ["union", UNION],
  ["typedef", TYPEDEF],
  ["using", USING],
  ["define", DEFINE],
  ["return", RETURN],
  ["mutable", MUTABLE],
  ["noexcept", NOEXCEPT],
  ["constexpr", CONSTEXPR],
  ["consteval", CONSTEVAL],
  ["public", PUBLIC],
  ["private", PRIVATE],
  ["protected", PROTECTED],
]);

const OTHER = 0;
const IDENT = 1;
const KEYWORD = 2;
const COMMENT = 3;

// only tokens starting like an identifier can share text with one
function word_start(c: number): boolean {
  return (
    (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 95 || c === 36 || c === 92 || c >= 128
  );
}

function punct_code(input: string, start: number, end: number): number {
  const length = end - start;
  if (length < 1 || length > 3) return 0;
  let key = length;
  for (let i = 0; i < length; i++) {
    const c = input.charCodeAt(start + i);
    if (c >= 128) return 0;
    key |= c << (2 + 7 * i);
  }
  return PUNCT.get(key) ?? 0;
}

function tag_word(code: number): boolean {
  return code === STRUCT || code === UNION || code === ENUM || code === CLASS;
}

// declarations are lexical heuristics, dependent types and shadowed names need a parser
function analyse(input: string, tokens: Uint32Array, token_types: string[], cpp: boolean): Claims {
  const claims: Claims = {
    class_name: [],
    constant: [],
    function: [],
    parameter: [],
    property: [],
    namespace: [],
  };
  const kind_of = new Uint8Array(token_types.length);
  for (let t = 0; t < token_types.length; t++) {
    const name = token_types[t];
    kind_of[t] =
      name === "identifier"
        ? IDENT
        : name === "keyword"
          ? KEYWORD
          : name === "comment"
            ? COMMENT
            : OTHER;
  }
  // non-comment tokens as parallel arrays, text only where a name lookup can match
  const max = tokens.length / 3;
  const index = new Int32Array(max);
  const kinds = new Uint8Array(max);
  const codes = new Uint8Array(max);
  const texts: string[] = [];
  let n = 0;
  for (let t = 0; t < max; t++) {
    const kind = kind_of[tokens[t * 3]];
    if (kind === COMMENT) continue;
    const start = tokens[t * 3 + 1];
    const end = tokens[t * 3 + 2];
    index[n] = t;
    kinds[n] = kind;
    const word = end > start && word_start(input.charCodeAt(start));
    const text = word || kind !== OTHER ? input.slice(start, end) : "";
    texts.push(text);
    codes[n] = word ? (WORDS.get(text) ?? 0) : punct_code(input, start, end);
    n++;
  }
  const code = (i: number) => (i >= 0 && i < n ? codes[i] : 0);
  const text = (i: number) => (i >= 0 && i < n ? texts[i] : "");
  const ident = (i: number) => i >= 0 && i < n && kinds[i] === IDENT;
  const keyword = (i: number) => i >= 0 && i < n && kinds[i] === KEYWORD;
  const emit = (i: number, kind: Category, priority = PRIORITY[kind]) => {
    if (ident(i)) claims[kind].push(index[i], priority);
  };
  const pairs = new Map<number, number>();
  const stack: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = codes[i];
    if (c === LPAREN || c === LBRACKET || c === LBRACE) stack.push(i);
    else if (c === RPAREN || c === RBRACKET || c === RBRACE) {
      const open = stack[stack.length - 1];
      if (open !== undefined && codes[open] + 1 === c) {
        stack.pop();
        pairs.set(open, i);
      }
    }
  }
  // template angles and comparisons are ambiguous without parsing
  const angles = new Map<number, number>();
  const angle_starts = new Map<number, number>();
  if (cpp) {
    const pending: number[] = [];
    for (let i = 0; i < n; i++) {
      const c = codes[i];
      if (c === LT) pending.push(i);
      else if (c === GT || c === SHR) {
        const count = c === GT ? 1 : 2;
        if (pending.length < count) {
          pending.length = 0;
          continue;
        }
        for (let k = 0; k < count; k++) {
          const start = pending.pop()!;
          angles.set(start, i);
          angle_starts.set(i, start);
        }
      } else if (c === SEMI || c === LBRACE || c === RBRACE || c === EQ || c === AND || c === OR)
        pending.length = 0;
    }
  }
  const template_end = (start: number) => angles.get(start) ?? -1;
  const call_open = (i: number): number => {
    if (code(i + 1) === LPAREN) return i + 1;
    if (cpp && code(i + 1) === LT) {
      const close = template_end(i + 1);
      if (close >= 0 && angle_starts.get(close) === i + 1 && code(close + 1) === LPAREN)
        return close + 1;
    }
    return -1;
  };
  const known_types = new Set<string>();
  const namespaces = new Set<string>();
  for (let i = 0; i < n; i++) {
    const c = codes[i];
    if (cpp && c === NAMESPACE) {
      for (let j = i + 1; ident(j); j += 2) {
        namespaces.add(texts[j]);
        if (code(j + 1) !== SCOPE) break;
      }
    }
    if (tag_word(c) && kinds[i] === KEYWORD) {
      let name = i + 1;
      if (c === ENUM && (code(name) === CLASS || code(name) === STRUCT)) name++;
      if (ident(name)) {
        if (cpp) known_types.add(texts[name]);
        emit(name, "class_name", 75);
      }
      const body = ident(name) ? name + 1 : name;
      if (c === ENUM) {
        let open = body;
        while (open < n && codes[open] !== LBRACE && codes[open] !== SEMI && codes[open] !== RBRACE)
          open++;
        const close = pairs.get(open);
        if (code(open) === LBRACE && close !== undefined) {
          let entry = true;
          for (let j = open + 1; j < close; j++) {
            if (entry && ident(j)) {
              emit(j, "constant", 75);
              entry = false;
            }
            if (pairs.has(j)) j = pairs.get(j)!;
            else if (codes[j] === COMMA) entry = true;
          }
        }
      }
    }
    if (c === TYPEDEF) {
      let last = -1;
      for (let j = i + 1; j < n; j++) {
        const cj = codes[j];
        if (cj === SEMI || cj === COMMA) {
          if (last >= 0) {
            known_types.add(texts[last]);
            emit(last, "class_name", 75);
          }
          last = -1;
          if (cj === SEMI) break;
        } else if (cj === LPAREN && code(j + 1) === STAR && ident(j + 2)) {
          last = j + 2;
          j = pairs.get(j) ?? j;
        } else if (pairs.has(j)) j = pairs.get(j)!;
        else if (kinds[j] === IDENT) last = j;
      }
    }
    if (cpp && c === USING && ident(i + 1) && code(i + 2) === EQ) {
      known_types.add(texts[i + 1]);
      emit(i + 1, "class_name", 75);
    }
  }
  const is_type = (i: number) =>
    (keyword(i) && TYPE_WORDS.has(texts[i])) ||
    known_types.has(text(i)) ||
    (ident(i) && type_name(texts[i]));
  const parameter = (start: number, end: number) => {
    let has_type = false;
    let candidate = -1;
    for (let j = start; j < end; j++) {
      const c = codes[j];
      if (c === EQ) break;
      if (c === LPAREN && code(j + 1) === STAR && ident(j + 2)) {
        if (has_type) emit(j + 2, "parameter");
        return;
      }
      if (pairs.has(j)) {
        j = pairs.get(j)!;
        continue;
      }
      if (cpp && c === LT) {
        const close = template_end(j);
        if (close < 0) return;
        j = close;
        continue;
      }
      const kind = kinds[j];
      if (
        (kind === KEYWORD && QUALIFIERS.has(texts[j])) ||
        c === STAR ||
        c === AMP ||
        c === AND ||
        c === ELLIPSIS
      )
        continue;
      if (kind === KEYWORD && (tag_word(c) || TYPE_WORDS.has(texts[j]))) {
        has_type = true;
        continue;
      }
      if (kind === IDENT) {
        if (code(j + 1) === SCOPE) continue;
        if (keyword(j - 1) && tag_word(codes[j - 1])) {
          has_type = true;
          continue;
        }
        if (!has_type) {
          has_type = true;
          emit(j, "class_name");
          continue;
        }
        candidate = j;
      } else if (c !== SCOPE) return;
    }
    if (candidate >= 0) emit(candidate, "parameter");
  };
  const parameters = (open: number, close: number) => {
    let start = open + 1;
    for (let j = start; j <= close; j++) {
      if (j === close || codes[j] === COMMA) {
        parameter(start, j);
        start = j + 1;
      } else if (pairs.has(j)) j = pairs.get(j)!;
      else if (cpp && codes[j] === LT) {
        const end = template_end(j);
        if (end >= 0) j = end;
      }
    }
  };
  if (cpp) {
    for (const [capture, end] of pairs) {
      if (codes[capture] !== LBRACKET || code(capture - 1) === LBRACKET || code(end + 1) !== LPAREN)
        continue;
      const close = pairs.get(end + 1);
      if (close === undefined) continue;
      const after = code(close + 1);
      if (
        after === LBRACE ||
        after === MUTABLE ||
        after === NOEXCEPT ||
        after === ARROW ||
        after === CONSTEXPR ||
        after === CONSTEVAL
      )
        parameters(end + 1, close);
    }
  }
  for (let i = 0; i < n; i++) {
    if (kinds[i] !== IDENT) continue;
    const name = texts[i];
    const prev = code(i - 1);
    const next = code(i + 1);
    const open = call_open(i);
    const member = prev === DOT || prev === ARROW;
    if (upper_constant(name)) emit(i, "constant");
    if (prev === DEFINE && kinds[i - 1] === KEYWORD) emit(i, "constant", 80);
    if (!member && (known_types.has(name) || type_name(name))) emit(i, "class_name");
    if (member && open < 0) emit(i, "property");
    if (
      cpp &&
      (namespaces.has(name) || (next === SCOPE && !known_types.has(name) && !type_name(name)))
    )
      emit(i, "namespace");
    if (cpp && next === LT && open < 0 && template_end(i + 1) >= 0) emit(i, "class_name");
    if (open < 0) continue;
    emit(i, "function");
    const close = pairs.get(open);
    if (close === undefined || member) continue;
    let before = i - 1;
    while (cpp && code(before) === SCOPE && ident(before - 1)) before -= 2;
    for (;;) {
      const c = code(before);
      if (
        c === STAR ||
        c === AMP ||
        c === AND ||
        (keyword(before) && QUALIFIERS.has(texts[before]))
      )
        before--;
      else break;
    }
    if (cpp && angle_starts.has(before)) before = angle_starts.get(before)! - 1;
    // typed prefixes distinguish declarations from calls and control expressions
    const declaration =
      is_type(before) ||
      (ident(before) && code(before - 1) !== RETURN) ||
      (cpp &&
        known_types.has(name) &&
        (prev === LBRACE ||
          prev === SEMI ||
          prev === COLON ||
          prev === RBRACE ||
          prev === PUBLIC ||
          prev === PRIVATE ||
          prev === PROTECTED));
    if (!declaration) continue;
    emit(before, "class_name");
    parameters(open, close);
  }
  return claims;
}

interface Analysis {
  input: string;
  token_types: string[];
  claims: Claims;
}

// fidelity gates whole passes, so passes in one batch share an analysis keyed by tokens
function producer(
  category: Category,
  cpp: boolean,
  cache: WeakMap<Uint32Array, Analysis>,
): ClaimFn {
  return (input, tokens, token_types, sink) => {
    const identifier = token_types.indexOf("identifier");
    if (identifier < 0) return;
    let target = token_types.indexOf(category);
    if (target < 0) target = token_types.push(category) - 1;
    let analysis = cache.get(tokens);
    if (
      analysis === undefined ||
      analysis.input !== input ||
      analysis.token_types !== token_types
    ) {
      analysis = { input, token_types, claims: analyse(input, tokens, token_types, cpp) };
      cache.set(tokens, analysis);
    }
    const claims = analysis.claims[category];
    for (let i = 0; i < claims.length; i += 2) sink.emit(claims[i], target, claims[i + 1]);
  };
}

export function create_c_reclassifiers(cpp = false): LanguagePipeline {
  const categories: Category[] = ["class_name", "constant", "function", "parameter", "property"];
  if (cpp) categories.push("namespace");
  const cache = new WeakMap<Uint32Array, Analysis>();
  return categories.map((category) =>
    tag(as_claim_producer(producer(category, cpp, cache)), [category]),
  );
}

export const reclassifiers = create_c_reclassifiers();
