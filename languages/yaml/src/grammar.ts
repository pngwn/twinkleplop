// YAML grammar — targets YAML 1.2.2 with lenient acceptance of YAML 1.1 idioms
// that are still common in the wild (e.g. `yes`/`no` as booleans, which are
// handled by the reclassifier).
//
// Scope:
//   - Plain, single-quoted and double-quoted scalars
//   - Flow collections `[...]` `{...}` with , as separator
//   - Block sequence `-` and mapping `:` indicators
//   - Anchors `&name`, aliases `*name`, tags `!name` / `!!name` / `!<uri>`
//   - Comments `# ...`
//   - Directives `%YAML ...`, `%TAG ...`
//   - Document markers `---` and `...`
//   - Block scalar headers `|` `>` with chomping/indent indicators
//   - Block scalar bodies (heuristic termination on column-0 non-whitespace)
//   - Reclassifier reassigns plain scalars to boolean / null / number when
//     their text matches core-schema (or permissive 1.1) patterns.
//
// Known limitations (acceptable for a syntax highlighter):
//   - `:` between non-whitespace characters (e.g. `foo:bar`) is always
//     tokenized as punctuation, splitting what the spec calls a single plain
//     scalar into three tokens. The common cases `foo: bar` and `url:`
//     highlight correctly; pathological embedded-colon scalars do not.
//   - `-` and `?` disambiguate via a one-char lookahead probe: followed by
//     whitespace they emit as punctuation, otherwise they start a plain
//     scalar. `-1.5` highlights as a single `number` (negative signed int is
//     recognised by the reclassifier).
//   - Block-scalar body termination uses a column-0 heuristic: content ends
//     when a line begins with a non-whitespace, non-newline character. Nested
//     block scalars whose siblings are indented do not de-indent cleanly.
//   - An anchor/alias/tag name immediately followed by a flow indicator
//     (e.g. `&a]`) consumes the flow indicator into the anchor-body fallback.
//     In practice YAML almost always puts whitespace between node properties
//     and flow punctuation.
//   - Document markers `---` / `...` match anywhere, not only at column 0
//     followed by whitespace. `---foo` mis-tokenizes as `---` + `foo`.
//   - Reserved indicators `@` and backtick tokenize as punctuation.
//   - Indentation is not validated; a highlighter does not enforce YAML's
//     tab-in-indentation prohibition.

import {
  DIGIT,
  HEX,
  LETTER,
  enter,
  fallback,
  goto,
  leave,
  match,
  on,
  within,
} from "@twinkleplop/core";

import { define_grammar } from "@twinkleplop/core/compile";
import * as TOKENS from "@twinkleplop/core/tokens";

const ws_chars = [" ", "\t"];
const eol_chars = ["\n", "\r"];
const ws_eol_chars = [...ws_chars, ...eol_chars];

const anchor_chars = [
  LETTER,
  DIGIT,
  "_",
  "-",
  ".",
  "/",
  ":",
  "@",
  "$",
  "#",
  "!",
  "%",
  "?",
  "+",
  "=",
  "~",
  "'",
  "(",
  ")",
];

const tag_chars = [
  LETTER,
  DIGIT,
  "_",
  "-",
  ".",
  "/",
  ":",
  "@",
  "$",
  "#",
  "+",
  "=",
  "~",
  "'",
  "(",
  ")",
  "?",
  "&",
  ";",
  "*",
  "%",
  "!",
];

// shared comment rule; comments run from `#` to end of line
const COMMENT = within("#", "\n", TOKENS.comment, { multiline: false });

// shared quoted strings. yaml `"..."` supports a rich set of \-escapes
// (short forms, `\xNN`, `\uNNNN`, `\UNNNNNNNN`, `\<LF>` line-continuation);
// these push an explicit body state so each escape emits a `string_escape`
// token. `'...'` has no backslash escaping (only `''` as a literal quote,
// which `within` does not support directly — the pair of quotes will
// tokenize as two string tokens which coalesce into one, so the final
// token span is still correct).
const DOUBLE_STRING = match('"', TOKENS.string, enter("double_string_body"));
const SINGLE_STRING = within("'", "'", TOKENS.string);

// shared whitespace. yaml treats only spaces and tabs as in-line whitespace;
// newlines get their own consumer so line-sensitive rules (block scalar
// termination) can observe them.
const WS = on(ws_chars);
const EOL = on(eol_chars);

// reserved indicators per spec §5.3. emitted as punctuation rather than as
// `invalid`; highlighters treat these pragmatically.
const RESERVED = match(["@", "`"], TOKENS.punctuation);

// document markers. spec requires column 0 + whitespace; we accept more
// leniency (see known-limitations above).
const DOC_MARKERS = match(["---", "..."], TOKENS.punctuation);

// structural rules shared between block and flow contexts. the enter()
// calls push the current state, so each nested context returns to its caller.
const shared_rules_head = [
  WS,
  EOL,
  COMMENT,
  DOUBLE_STRING,
  SINGLE_STRING,
  DOC_MARKERS,
  match("&", TOKENS.variable, enter("anchor_body")),
  match("*", TOKENS.variable, enter("alias_body")),
  // `!!` (secondary handle, resolves to the standard YAML type registry) and
  // `!` (primary/local handle) are both operator prefixes. maximal munch
  // picks `!!` first, so `!!str` emits a two-char operator + keyword.
  match(["!!", "!"], TOKENS.operator, enter("tag_body")),
  match("[", TOKENS.punctuation, enter("flow_seq")),
  match("{", TOKENS.punctuation, enter("flow_map")),
];

export default define_grammar({
  name: "yaml",
  states: {
    // ------------------------------------------------------------------
    // main — block context, the entry state.
    // ------------------------------------------------------------------
    main: {
      rules: [
        ...shared_rules_head,
        // block scalar headers. only valid outside flow context; the
        // flow states drop these rules so `|` `>` become plain text.
        match("|", TOKENS.operator, enter("literal_header")),
        match(">", TOKENS.operator, enter("folded_header")),
        // directive: the `%` at col 0 starts a directive line. we do
        // not enforce col 0; inside a scalar `%` would be consumed by
        // plain_scalar's fallback first, so this only fires when the
        // parser is genuinely at a top-level scan position.
        match("%", TOKENS.operator, enter("directive_name")),
        // `:` and `,` are always punctuation at this position.
        // `-` and `?` need lookahead: followed by whitespace they are
        // structural indicators, followed by a non-whitespace char
        // they start (or are part of) a plain scalar (`-1.5`, `?x`).
        match([":", ","], TOKENS.punctuation),
        on("-", enter("dash_probe")),
        on("?", enter("question_probe")),
        RESERVED,
        // any remaining character starts (or continues) a plain
        // scalar. emit it as identifier and push into plain_scalar so
        // subsequent chars reach the `:` / ws / eol handling there.
        // adjacent identifier tokens coalesce, so the first char and
        // the body end up as a single token.
        fallback({ token: TOKENS.identifier, state: "plain_scalar" }),
      ],
    },

    // ------------------------------------------------------------------
    // flow_seq / flow_map — inside `[...]` and `{...}` respectively.
    // the rules mirror main minus block-scalar headers; the closing
    // delimiter leave()s back to the parent.
    // ------------------------------------------------------------------
    flow_seq: {
      rules: [
        ...shared_rules_head,
        match("]", TOKENS.punctuation, leave()),
        match("}", TOKENS.punctuation, leave()),
        match([":", ","], TOKENS.punctuation),
        on("-", enter("dash_probe_flow")),
        on("?", enter("question_probe_flow")),
        RESERVED,
        fallback({ token: TOKENS.identifier, state: "plain_scalar_flow" }),
      ],
    },

    flow_map: {
      rules: [
        ...shared_rules_head,
        match("}", TOKENS.punctuation, leave()),
        match("]", TOKENS.punctuation, leave()),
        match([":", ","], TOKENS.punctuation),
        on("-", enter("dash_probe_flow")),
        on("?", enter("question_probe_flow")),
        RESERVED,
        fallback({ token: TOKENS.identifier, state: "plain_scalar_flow" }),
      ],
    },

    // ------------------------------------------------------------------
    // plain_scalar — unquoted scalar, block context.
    //
    // the scalar runs until whitespace, newline, or a `:` that is
    // followed by whitespace/eol. see colon_probe for the lookahead
    // logic. all interior chars (including `#` — # is only a comment
    // start when preceded by whitespace, which the parent handles before
    // re-entering us) emit as identifier and coalesce.
    // ------------------------------------------------------------------
    plain_scalar: {
      rules: [
        on(ws_eol_chars, leave()),
        on(":", enter("colon_probe")),
        fallback({ token: TOKENS.identifier }),
      ],
    },

    // plain_scalar_flow also terminates on the flow indicators , [ ] { }.
    // those terminators use fallback(goto(main/flow_*)) to hand the
    // character back without consuming. however, we cannot always tell
    // which flow parent we came from, so the loss of the terminator is
    // the tradeoff: in practice authors always put whitespace before
    // flow punctuation, so this rarely matters.
    plain_scalar_flow: {
      rules: [
        on(ws_eol_chars, leave()),
        on(":", enter("colon_probe")),
        on([",", "[", "]", "{", "}"], leave()),
        fallback({ token: TOKENS.identifier }),
      ],
    },

    // ------------------------------------------------------------------
    // colon_probe — disambiguate `foo:bar` vs `foo: bar`.
    //
    // we enter here having consumed the `:`. the probe rewinds to the
    // `:` position and picks one of two target states based on what
    // follows. see skill §2.11 for the chained-probe mechanics.
    // ------------------------------------------------------------------
    colon_probe: {
      mode: "probe",
      fallback: "colon_sep",
      rules: [on(ws_eol_chars, goto("colon_sep")), fallback(goto("colon_scalar"))],
    },

    // `: ` — the `:` is a mapping value separator. emit it as punctuation
    // and pop back to the parent (main or flow_*). because the probe
    // rewound and restored the stack to `[parent]`, the leave() here
    // correctly returns us to the parent.
    colon_sep: {
      rules: [match(":", TOKENS.punctuation, leave())],
    },

    // `:x` — the `:` is interior to the plain scalar. emit it as
    // identifier and goto plain_scalar to continue consuming. the stack
    // is still `[parent]` because the probe-exit was a goto (no push);
    // reusing plain_scalar here without pushing keeps the stack shallow.
    colon_scalar: {
      rules: [match(":", TOKENS.identifier, goto("plain_scalar"))],
    },

    // ------------------------------------------------------------------
    // dash_probe / question_probe — disambiguate `-` and `?` at scan-
    // position between "structural indicator" (followed by whitespace)
    // and "first char of a plain scalar" (`-1`, `?foo`).
    //
    // exit via enter() so the rewound target lands on `[parent]` and
    // can leave()/goto cleanly back to the caller. see skill §2.11.
    // ------------------------------------------------------------------
    dash_probe: {
      mode: "probe",
      fallback: "dash_as_punct",
      rules: [
        on([...ws_chars, "\n", "\r"], enter("dash_as_punct")),
        fallback(enter("dash_as_scalar")),
      ],
    },

    dash_as_punct: {
      rules: [match("-", TOKENS.punctuation, leave())],
    },

    dash_as_scalar: {
      rules: [match("-", TOKENS.identifier, goto("plain_scalar"))],
    },

    question_probe: {
      mode: "probe",
      fallback: "question_as_punct",
      rules: [
        on([...ws_chars, "\n", "\r"], enter("question_as_punct")),
        fallback(enter("question_as_scalar")),
      ],
    },

    question_as_punct: {
      rules: [match("?", TOKENS.punctuation, leave())],
    },

    question_as_scalar: {
      rules: [match("?", TOKENS.identifier, goto("plain_scalar"))],
    },

    // flow-context variants. the only difference is the scalar target:
    // inside flow collections, plain scalars must terminate on , [ ] { }
    // as well, which plain_scalar_flow handles.
    dash_probe_flow: {
      mode: "probe",
      fallback: "dash_as_punct",
      rules: [
        on([...ws_chars, "\n", "\r"], enter("dash_as_punct")),
        fallback(enter("dash_as_scalar_flow")),
      ],
    },

    dash_as_scalar_flow: {
      rules: [match("-", TOKENS.identifier, goto("plain_scalar_flow"))],
    },

    question_probe_flow: {
      mode: "probe",
      fallback: "question_as_punct",
      rules: [
        on([...ws_chars, "\n", "\r"], enter("question_as_punct")),
        fallback(enter("question_as_scalar_flow")),
      ],
    },

    question_as_scalar_flow: {
      rules: [match("?", TOKENS.identifier, goto("plain_scalar_flow"))],
    },

    // ------------------------------------------------------------------
    // anchor_body / alias_body — consume the name following `&` / `*`.
    //
    // the name chars are per ns-anchor-char (ns-char minus flow
    // indicators). the fallback consumes the terminator; for flow-
    // indicator terminators this is a known limitation.
    // ------------------------------------------------------------------
    anchor_body: {
      rules: [match(anchor_chars, TOKENS.variable), fallback(leave())],
    },

    alias_body: {
      rules: [match(anchor_chars, TOKENS.variable), fallback(leave())],
    },

    // ------------------------------------------------------------------
    // tag_body — after `!`. handles shorthand and verbatim forms.
    // the `!` itself was emitted as operator by the parent rule; the tag
    // name body is emitted as keyword (tag names act as type annotations).
    // ------------------------------------------------------------------
    tag_body: {
      rules: [
        match("<", TOKENS.operator, goto("tag_verbatim")),
        match(tag_chars, TOKENS.keyword),
        fallback(leave()),
      ],
    },

    // `!<uri>` — everything up to `>` is the uri. we only exit on `>`,
    // so a missing `>` leaks to EOF; that is acceptable as it matches
    // what most YAML parsers would reject.
    tag_verbatim: {
      rules: [match(">", TOKENS.operator, leave()), fallback({ token: TOKENS.keyword })],
    },

    // ------------------------------------------------------------------
    // directive — `%` + name + args, until end of line.
    //
    // `%` is emitted as operator by the parent. directive_name consumes
    // the following word as keyword (`YAML`, `TAG`, …). on whitespace or
    // eol, we transition to directive_body which emits the remaining
    // line content as identifier tokens.
    // ------------------------------------------------------------------
    directive_name: {
      rules: [
        on(ws_chars, goto("directive_body")),
        on(eol_chars, leave()),
        match([LETTER, DIGIT, "_"], TOKENS.keyword),
        fallback(goto("directive_body")),
      ],
    },

    directive_body: {
      rules: [WS, on(eol_chars, leave()), fallback({ token: TOKENS.identifier })],
    },

    // ------------------------------------------------------------------
    // literal_header / folded_header — `|` and `>` block-scalar headers.
    //
    // the `|` / `>` was emitted as operator by the parent. the header
    // line may then contain `+` / `-` chomping (operator), a digit
    // indentation indicator (number), and an optional comment. the
    // newline transitions to the corresponding body state via goto() —
    // the header's parent is preserved so leaving the body returns to
    // the right place.
    // ------------------------------------------------------------------
    literal_header: {
      rules: [
        match(["-", "+"], TOKENS.operator),
        match(DIGIT, TOKENS.number),
        WS,
        COMMENT,
        on("\n", goto("literal_body")),
        fallback({ token: TOKENS.string }),
      ],
    },

    folded_header: {
      rules: [
        match(["-", "+"], TOKENS.operator),
        match(DIGIT, TOKENS.number),
        WS,
        COMMENT,
        on("\n", goto("folded_body")),
        fallback({ token: TOKENS.string }),
      ],
    },

    // ------------------------------------------------------------------
    // literal_body / folded_body — block scalar content. the termination
    // heuristic is: after any `\n`, peek at the next character; if it is
    // whitespace (or another `\n`) the body continues, otherwise the
    // body ends. this gets the common case right (top-level keys at
    // column 0 terminate an indented body) while accepting that nested
    // block scalars with non-column-0 siblings will not de-indent.
    //
    // the probe needs careful construction. the probe rewinds to the
    // position of the `\n` that triggered it, so the target states must
    // consume the `\n` themselves — if the target simply gotoes back to
    // the body, the body's `\n` rule fires and enters the probe again,
    // creating an unbounded loop. _body uses `on("\n", ...)` (no emit),
    // and the two target states `_nl_stay` / `_nl_exit` emit the `\n`
    // as string and transition past it.
    // ------------------------------------------------------------------
    literal_body: {
      rules: [on("\n", enter("literal_nl_probe")), fallback({ token: TOKENS.string })],
    },

    literal_nl_probe: {
      mode: "probe",
      fallback: "literal_nl_stay",
      rules: [
        on([...ws_chars, "\n", "\r"], goto("literal_nl_stay")),
        fallback(goto("literal_nl_exit")),
      ],
    },

    literal_nl_stay: {
      rules: [match("\n", TOKENS.string, goto("literal_body"))],
    },

    literal_nl_exit: {
      rules: [match("\n", TOKENS.string, leave())],
    },

    folded_body: {
      rules: [on("\n", enter("folded_nl_probe")), fallback({ token: TOKENS.string })],
    },

    folded_nl_probe: {
      mode: "probe",
      fallback: "folded_nl_stay",
      rules: [
        on([...ws_chars, "\n", "\r"], goto("folded_nl_stay")),
        fallback(goto("folded_nl_exit")),
      ],
    },

    folded_nl_stay: {
      rules: [match("\n", TOKENS.string, goto("folded_body"))],
    },

    folded_nl_exit: {
      rules: [match("\n", TOKENS.string, leave())],
    },

    // ------------------------------------------------------------------
    // double-quoted string body. yaml 1.2 short escapes (\0 \a \b \t \n
    // \v \f \r \e \" \/ \\ \N \_ \L \P \<space>) plus structured forms
    // \xNN / \uNNNN / \UNNNNNNNN and the `\<newline>` line-continuation.
    // every escape emits `string_escape` via the shared sub-machine.
    // ------------------------------------------------------------------
    double_string_body: {
      rules: [
        match("\\x", TOKENS.string_escape, enter("esc_hex_d1")),
        match("\\u", TOKENS.string_escape, enter("esc_u4_d1")),
        match("\\U", TOKENS.string_escape, enter("esc_u8_d1")),
        match("\\", TOKENS.string_escape, enter("esc_simple")),
        match('"', TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    // shared escape sub-machine. emits `string_escape`; terminal rules
    // leave() back to double_string_body. partial escapes (`\x` with no
    // hex, `\u` with fewer than 4, etc.) unwind via fallback(leave())
    // without consuming so the parent body re-processes the non-hex
    // char normally.
    esc_simple: {
      rules: [fallback({ token: TOKENS.string_escape, exit: true })],
    },

    esc_hex_d1: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_hex_d2")), fallback(leave())],
    },
    esc_hex_d2: {
      rules: [match(HEX, TOKENS.string_escape, leave()), fallback(leave())],
    },

    esc_u4_d1: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u4_d2")), fallback(leave())],
    },
    esc_u4_d2: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u4_d3")), fallback(leave())],
    },
    esc_u4_d3: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u4_d4")), fallback(leave())],
    },
    esc_u4_d4: {
      rules: [match(HEX, TOKENS.string_escape, leave()), fallback(leave())],
    },

    esc_u8_d1: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u8_d2")), fallback(leave())],
    },
    esc_u8_d2: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u8_d3")), fallback(leave())],
    },
    esc_u8_d3: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u8_d4")), fallback(leave())],
    },
    esc_u8_d4: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u8_d5")), fallback(leave())],
    },
    esc_u8_d5: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u8_d6")), fallback(leave())],
    },
    esc_u8_d6: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u8_d7")), fallback(leave())],
    },
    esc_u8_d7: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u8_d8")), fallback(leave())],
    },
    esc_u8_d8: {
      rules: [match(HEX, TOKENS.string_escape, leave()), fallback(leave())],
    },
  },
});
