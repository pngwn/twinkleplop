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
  return (
    text.length > 1 &&
    text[0] >= "A" &&
    text[0] <= "Z" &&
    [...text].every((c) => (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c === "_")
  );
}

function type_name(text: string): boolean {
  return text.endsWith("_t") || (text[0] >= "A" && text[0] <= "Z" && !upper_constant(text));
}

// flat (token index, priority) pairs per category, in walk order
type Claims = Record<Category, number[]>;

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
  const items: { text: string; kind: string; index: number }[] = [];
  for (let i = 0; i < tokens.length; i += 3) {
    const kind = token_types[tokens[i]];
    if (kind === "comment") continue;
    items.push({
      text: input.slice(tokens[i + 1], tokens[i + 2]),
      kind,
      index: i / 3,
    });
  }
  const text = (i: number) => items[i]?.text ?? "";
  const ident = (i: number) => items[i]?.kind === "identifier";
  const keyword = (i: number) => items[i]?.kind === "keyword";
  const emit = (i: number, kind: Category, priority = PRIORITY[kind]) => {
    if (ident(i)) claims[kind].push(items[i].index, priority);
  };
  const pairs = new Map<number, number>();
  const stack: number[] = [];
  for (let i = 0; i < items.length; i++) {
    if (["(", "[", "{"].includes(text(i))) stack.push(i);
    else if ([")", "]", "}"].includes(text(i))) {
      const open = stack[stack.length - 1];
      if (open !== undefined && "([{".indexOf(text(open)) === ")]}".indexOf(text(i))) {
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
    for (let i = 0; i < items.length; i++) {
      const t = text(i);
      if (t === "<") pending.push(i);
      else if (t === ">" || t === ">>") {
        if (pending.length < t.length) {
          pending.length = 0;
          continue;
        }
        for (let count = 0; count < t.length; count++) {
          const start = pending.pop()!;
          angles.set(start, i);
          angle_starts.set(i, start);
        }
      } else if ([";", "{", "}", "=", "&&", "||"].includes(t)) pending.length = 0;
    }
  }
  const template_end = (start: number) => angles.get(start) ?? -1;
  const call_open = (i: number): number => {
    if (text(i + 1) === "(") return i + 1;
    if (cpp && text(i + 1) === "<") {
      const close = template_end(i + 1);
      if (close >= 0 && angle_starts.get(close) === i + 1 && text(close + 1) === "(")
        return close + 1;
    }
    return -1;
  };
  const known_types = new Set<string>();
  const namespaces = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    if (cpp && text(i) === "namespace") {
      for (let j = i + 1; ident(j); j += 2) {
        namespaces.add(text(j));
        if (text(j + 1) !== "::") break;
      }
    }
    if (TAG_WORDS.has(text(i)) && items[i].kind === "keyword") {
      let name = i + 1;
      if (text(i) === "enum" && ["class", "struct"].includes(text(name))) name++;
      if (ident(name)) {
        if (cpp) known_types.add(text(name));
        emit(name, "class_name", 75);
      }
      const body = ident(name) ? name + 1 : name;
      if (text(i) === "enum") {
        let open = body;
        while (open < items.length && !["{", ";", "}"].includes(text(open))) open++;
        const close = pairs.get(open);
        if (text(open) === "{" && close !== undefined) {
          let entry = true;
          for (let j = open + 1; j < close; j++) {
            if (entry && ident(j)) {
              emit(j, "constant", 75);
              entry = false;
            }
            if (pairs.has(j)) j = pairs.get(j)!;
            else if (text(j) === ",") entry = true;
          }
        }
      }
    }
    if (text(i) === "typedef") {
      let last = -1;
      for (let j = i + 1; j < items.length; j++) {
        if (text(j) === ";" || text(j) === ",") {
          if (last >= 0) {
            known_types.add(text(last));
            emit(last, "class_name", 75);
          }
          last = -1;
          if (text(j) === ";") break;
        } else if (text(j) === "(" && text(j + 1) === "*" && ident(j + 2)) {
          last = j + 2;
          j = pairs.get(j) ?? j;
        } else if (pairs.has(j)) j = pairs.get(j)!;
        else if (ident(j)) last = j;
      }
    }
    if (cpp && text(i) === "using" && ident(i + 1) && text(i + 2) === "=") {
      known_types.add(text(i + 1));
      emit(i + 1, "class_name", 75);
    }
  }
  const is_type = (i: number) =>
    (keyword(i) && TYPE_WORDS.has(text(i))) ||
    known_types.has(text(i)) ||
    (ident(i) && type_name(text(i)));
  const parameter = (start: number, end: number) => {
    let has_type = false;
    let candidate = -1;
    for (let j = start; j < end; j++) {
      const t = text(j);
      if (t === "=") break;
      if (t === "(" && text(j + 1) === "*" && ident(j + 2)) {
        if (has_type) emit(j + 2, "parameter");
        return;
      }
      if (pairs.has(j)) {
        j = pairs.get(j)!;
        continue;
      }
      if (cpp && t === "<") {
        const close = template_end(j);
        if (close < 0) return;
        j = close;
        continue;
      }
      if ((keyword(j) && QUALIFIERS.has(t)) || ["*", "&", "&&", "..."].includes(t)) continue;
      if (keyword(j) && (TAG_WORDS.has(t) || TYPE_WORDS.has(t))) {
        has_type = true;
        continue;
      }
      if (ident(j)) {
        if (text(j + 1) === "::") continue;
        if (keyword(j - 1) && TAG_WORDS.has(text(j - 1))) {
          has_type = true;
          continue;
        }
        if (!has_type) {
          has_type = true;
          emit(j, "class_name");
          continue;
        }
        candidate = j;
      } else if (t !== "::") return;
    }
    if (candidate >= 0) emit(candidate, "parameter");
  };
  const parameters = (open: number, close: number) => {
    let start = open + 1;
    for (let j = start; j <= close; j++) {
      if (j === close || text(j) === ",") {
        parameter(start, j);
        start = j + 1;
      } else if (pairs.has(j)) j = pairs.get(j)!;
      else if (cpp && text(j) === "<") {
        const end = template_end(j);
        if (end >= 0) j = end;
      }
    }
  };
  if (cpp) {
    for (const [capture, end] of pairs) {
      if (text(capture) !== "[" || text(capture - 1) === "[" || text(end + 1) !== "(") continue;
      const close = pairs.get(end + 1);
      if (
        close !== undefined &&
        ["{", "mutable", "noexcept", "->", "constexpr", "consteval"].includes(text(close + 1))
      )
        parameters(end + 1, close);
    }
  }
  for (let i = 0; i < items.length; i++) {
    if (!ident(i)) continue;
    const prev = text(i - 1);
    const next = text(i + 1);
    const open = call_open(i);
    const member = prev === "." || prev === "->";
    if (upper_constant(text(i))) emit(i, "constant");
    if (prev === "define" && items[i - 1].kind === "keyword") emit(i, "constant", 80);
    if (!member && (known_types.has(text(i)) || type_name(text(i)))) emit(i, "class_name");
    if (member && open < 0) emit(i, "property");
    if (
      cpp &&
      (namespaces.has(text(i)) ||
        (next === "::" && !known_types.has(text(i)) && !type_name(text(i))))
    )
      emit(i, "namespace");
    if (cpp && next === "<" && open < 0 && template_end(i + 1) >= 0) emit(i, "class_name");
    if (open < 0) continue;
    emit(i, "function");
    const close = pairs.get(open);
    if (close === undefined || member) continue;
    let before = i - 1;
    while (cpp && text(before) === "::" && ident(before - 1)) before -= 2;
    while (
      ["*", "&", "&&"].includes(text(before)) ||
      (keyword(before) && QUALIFIERS.has(text(before)))
    )
      before--;
    if (cpp && angle_starts.has(before)) before = angle_starts.get(before)! - 1;
    // typed prefixes distinguish declarations from calls and control expressions
    const declaration =
      is_type(before) ||
      (ident(before) && text(before - 1) !== "return") ||
      (cpp &&
        known_types.has(text(i)) &&
        ["{", ";", ":", "}", "public", "private", "protected"].includes(prev));
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
