// TypeScript grammar — extends JavaScript with type annotations, decorators,
// access modifiers, and TypeScript-specific keywords.
//
// Scope:
//   - Everything JavaScript supports (inherited via shared building blocks)
//   - TypeScript keywords: type, interface, enum, namespace, declare, abstract,
//     public, private, protected, readonly, override, accessor, etc.
//   - Type assertion operators: as, satisfies
//   - Type-level operators: keyof, infer, is
//   - Built-in type names: number, string, boolean, any, never, void, unknown, etc.
//   - Decorators: @expression syntax
//
// Known limitations:
//   - Type annotations after `:` are not tracked as a separate context. The `:`
//     is always tokenized as an operator. Built-in type names are highlighted
//     correctly but custom type names (e.g. User, Promise) appear as identifiers.
//   - Generic type parameters `<T>` are not distinguished from comparison
//     operators. The contents still highlight correctly (keywords/identifiers).
//   - No JSX/TSX support. A separate tsx grammar would be needed.
//   - Contextual keywords (type, interface, etc.) are always highlighted as
//     keywords, even in the rare cases where they are used as variable names.
//   - Generic function calls like `foo<T>()` highlight foo as identifier, not
//     function, because the probe does not scan past `<...>` to see `(`.
//   - Mapped type modifiers (-readonly, +readonly, -?, +?) are not specially
//     handled.

import {
  ALNUM,
  LETTER,
  enter,
  fallback,
  goto,
  keyword,
  leave,
  match,
  on,
  to,
} from "@twinkleplop/core";

import { define_grammar } from "@twinkleplop/core/compile";
import * as TOKENS from "@twinkleplop/core/tokens";

import {
  BOOLEAN_LITERALS,
  KEYWORDS,
  OP_ALL,
  REGEX_PRECEDING_KEYWORDS,
  SPECIAL_VALUES,
  js_common,
  raw_grammar as js_grammar,
  js_tmpl_common,
} from "@twinkleplop/javascript";

// ---------------------------------------------------------------------------
// custom token types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// TypeScript keyword sets
// ---------------------------------------------------------------------------

const TS_KEYWORDS = [
  // declarations
  "type",
  "interface",
  "enum",
  "namespace",
  "module",
  // modifiers
  "declare",
  "abstract",
  "readonly",
  "public",
  "private",
  "protected",
  "override",
  "accessor",
  // type operators (contextual)
  "as",
  "satisfies",
  "keyof",
  "infer",
  "is",
  // resource management
  "using",
  // class
  "implements",
];

// all TS keywords route to division (none precede regex).
const ALL_KEYWORDS = [...KEYWORDS, ...TS_KEYWORDS];
const ALL_DIVISION_KEYWORDS = ALL_KEYWORDS.filter((k) => !REGEX_PRECEDING_KEYWORDS.includes(k));

// built-in type names highlighted with the TOKENS.type token.
// void, undefined, null are already handled by JS keywords/special values.
// exported so the reclassifier can promote them to `type` post-hoc. used to
// be routed through keyword() at grammar time; stripped out so the grammar
// emits them as plain `identifier` and consumers can opt in to the type
// annotation by including promote_builtin_types in their pipeline.
export const BUILTIN_TYPES = [
  "number",
  "string",
  "boolean",
  "any",
  "never",
  "unknown",
  "object",
  "symbol",
  "bigint",
];

// ---------------------------------------------------------------------------
// parameterized rule factories (extended for TypeScript)
// ---------------------------------------------------------------------------

const ts_operators = (after: string | null) => match(OP_ALL, TOKENS.operator, to(after));

const ts_keywords_literals = (regex_dest: string | null, div_dest: string | null) => [
  keyword(REGEX_PRECEDING_KEYWORDS, to(regex_dest)),
  keyword(ALL_DIVISION_KEYWORDS, to(div_dest)),
  keyword(SPECIAL_VALUES, to(div_dest)),
  // grammar-native booleans (matches JS).
  keyword(BOOLEAN_LITERALS, to(div_dest), "boolean"),
];

// ---------------------------------------------------------------------------
// grammar
// ---------------------------------------------------------------------------

export default define_grammar({
  name: "typescript",

  states: {
    // inherit all JS states unchanged
    ...js_grammar.states,

    // ---------------------------------------------------------------------
    // decorator — continuation after `@`. consumes identifier chars and
    // `.` so `@foo.bar.Baz` stays one decorator span. exits on any other
    // char (whitespace, `(`, etc.) and resumes at the outer state. each
    // rule emits a single-char decorator token; the tokenizer merges
    // same-type adjacent emissions into one span.
    // ---------------------------------------------------------------------
    decorator: {
      rules: [match(["_", "$", ".", ALNUM], TOKENS.decorator), fallback(leave())],
    },

    // ---------------------------------------------------------------------
    // regex_allow — initial state; `/` starts a regex here
    // override: TS keywords + built-in types + decorator
    // ---------------------------------------------------------------------
    regex_allow: {
      rules: [
        ...js_common,
        ts_operators(null),
        ...ts_keywords_literals(null, "division"),

        // decorator: `@` sigil enters a dedicated state that extends the
        // decorator span across the identifier chain (`@foo`, `@foo.bar`,
        // `@foo.bar.Baz`). single-char emissions coalesce into one span.
        match("@", TOKENS.decorator, enter("decorator")),

        // regex
        match("/", TOKENS.regex, enter("regex_pattern")),

        // punctuation. `:` is a separator (type annotation, ternary,
        // property key, label) — emitted as punctuation, not operator.
        match(["(", "{", "["], TOKENS.punctuation),
        match([")", "}", "]"], TOKENS.punctuation, goto("division")),
        match([";", ",", ".", ":"], TOKENS.punctuation),

        // identifiers
        on(["_", "$", LETTER], goto("identifier_probe")),
      ],
    },

    // ---------------------------------------------------------------------
    // division — after values or closing brackets; `/` is division
    // override: TS keywords + built-in types + decorator
    // ---------------------------------------------------------------------
    division: {
      rules: [
        ...js_common,
        ts_operators("regex_allow"),
        ...ts_keywords_literals("regex_allow", null),

        // decorator: `@` sigil enters a dedicated state that extends the
        // decorator span across the identifier chain (`@foo`, `@foo.bar`,
        // `@foo.bar.Baz`). single-char emissions coalesce into one span.
        match("@", TOKENS.decorator, enter("decorator")),

        // opening brackets — after these, `/` is regex
        match(["(", "{", "["], TOKENS.punctuation, goto("regex_allow")),
        // `/` is division
        match("/", TOKENS.operator, goto("regex_allow")),

        // punctuation. `:` separates a key/label/ternary alternate from
        // its value or a name from its type annotation.
        match([")", "}", "]"], TOKENS.punctuation),
        match([";", ",", ":"], TOKENS.punctuation, goto("regex_allow")),
        match(".", TOKENS.punctuation),

        // identifiers
        on(["_", "$", LETTER], goto("identifier_probe")),
      ],
    },

    // ---------------------------------------------------------------------
    // tmpl_regex_allow — inside `${...}`, expression expected
    // override: TS keywords + built-in types + decorator
    // ---------------------------------------------------------------------
    tmpl_regex_allow: {
      rules: [
        ...js_tmpl_common,
        ts_operators(null),
        ...ts_keywords_literals(null, "tmpl_division"),

        // decorator: `@` sigil enters a dedicated state that extends the
        // decorator span across the identifier chain (`@foo`, `@foo.bar`,
        // `@foo.bar.Baz`). single-char emissions coalesce into one span.
        match("@", TOKENS.decorator, enter("decorator")),

        match("}", TOKENS.punctuation, leave()),
        match("/", TOKENS.regex, enter("regex_pattern")),
        // `{` pushes tmpl_regex_allow recursively to track brace depth.
        match("{", TOKENS.punctuation, enter("tmpl_regex_allow")),
        match(["(", "["], TOKENS.punctuation),
        match([")", "]"], TOKENS.punctuation, goto("tmpl_division")),
        match([";", ",", ".", ":"], TOKENS.punctuation),

        on(["_", "$", LETTER], goto("identifier_probe_tmpl")),
      ],
    },

    // ---------------------------------------------------------------------
    // tmpl_division — after a value inside `${...}`; `/` is division
    // override: TS keywords + built-in types + decorator
    // ---------------------------------------------------------------------
    tmpl_division: {
      rules: [
        ...js_tmpl_common,
        ts_operators("tmpl_regex_allow"),
        ...ts_keywords_literals("tmpl_regex_allow", null),

        // decorator: `@` sigil enters a dedicated state that extends the
        // decorator span across the identifier chain (`@foo`, `@foo.bar`,
        // `@foo.bar.Baz`). single-char emissions coalesce into one span.
        match("@", TOKENS.decorator, enter("decorator")),

        match("}", TOKENS.punctuation, leave()),
        // `{` pushes tmpl_regex_allow to track brace depth.
        match("{", TOKENS.punctuation, enter("tmpl_regex_allow")),
        match(["(", "["], TOKENS.punctuation, goto("tmpl_regex_allow")),
        match("/", TOKENS.operator, goto("tmpl_regex_allow")),
        match([")", "]"], TOKENS.punctuation),
        match([";", ",", ":"], TOKENS.punctuation, goto("tmpl_regex_allow")),
        match(".", TOKENS.punctuation),

        on(["_", "$", LETTER], goto("identifier_probe_tmpl")),
      ],
    },
  },
});
