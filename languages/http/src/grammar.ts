// http grammar, raw HTTP/1.1 messages and the request files of the rest client and jetbrains http client
//
// design
//   the stack only holds variable references, every line state moves with goto
//   a single char on goto does not consume, so each line hands its newline to the next line start
//   json and markup bodies become raw_json and raw_markup for embedding
//   variables and comment lines inside a body stay host tokens and become holes
//
// known limitations
//   the body kind comes from its first char, Content-Type is not read
//   header values, reason phrases, request targets and file variable values are single tokens
//   a # or // line in a body is a comment, so a markdown or shell body loses those lines
//   markup bodies only take column 0 comments
//   a > line in a markup body is a response handler, curl -v transcripts misread the same way
//   multipart boundaries match by shape, not against the boundary parameter
//   a request line inside a body is text, only a status line starts a message without ###
//
// differences from the rfcs
//   a method is any token followed by whitespace, in any case
//   HTTP/2 and HTTP/3 are versions, as curl prints them
//   a whitespace only line ends the header section
//   a space before a header colon is part of the name, as in jetbrains
//   a first line shaped like a header starts the header section, so headers only snippets work
//   a <, >, { or [ line under the headers starts the body without a blank line, as in jetbrains examples

import { ALNUM, DIGIT, enter, fallback, goto, keyword, leave, match, on } from "@twinkleplop/core";
import type { GrammarRule, GrammarState } from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

const WS = [" ", "\t"];
// adds the cr of a crlf line ending
const WS_CR = [" ", "\t", "\r"];

// rfc 9110 tchar, the characters of a method or field name
const TCHAR = [ALNUM, "!", "#", "$", "%", "&", "'", "*", "+", "-", ".", "^", "_", "`", "|", "~"];

// a leading token that ends here is a request target, a colon may still mean a header
const TARGET_TERMINATORS = [
  "/",
  "{",
  "}",
  "?",
  "[",
  "]",
  "(",
  ")",
  "<",
  ">",
  "@",
  ",",
  ";",
  "=",
  '"',
  "\\",
  "\n",
  "\r",
];

// a single char on goto does not consume, so a blank line reaches a line start as two newlines
const BLANK_LINE = ["\n\n", "\n\r\n"];

// an unterminated variable leaves without consuming the newline so the parent sees it
const VARIABLE = match("{{", TOKENS.punctuation, enter("var"));

const BOUNDARY = on("--", goto("mp_probe"));

// comment lines return to cmt, the rest return to the plain line start since nothing embeddable follows them
const line_constructs = (cmt: string, rest: string, line: string): GrammarRule[] => [
  match("###", TOKENS.comment, goto("sep_rest")),
  match(["#", "//"], TOKENS.comment, goto(`cmt__${cmt}`)),
  ...file_constructs(rest),
  match("===", TOKENS.label, goto(`wsmsg__${rest}`)),
  on("HTTP/", goto(`status_probe__${line}`)),
];

// also valid right under the headers, where no body line state exists yet
const file_constructs = (rest: string): GrammarRule[] => [
  match(["<> ", "<>\t"], TOKENS.operator, goto(`path__${rest}`)),
  match("<@", TOKENS.operator, goto(`fileenc__${rest}`)),
  match(["< ", "<\t"], TOKENS.operator, goto(`path__${rest}`)),
  match([">>!", ">>"], TOKENS.operator, goto(`path__${rest}`)),
  match(["> ", ">\t"], TOKENS.operator, goto(`handler__${rest}`)),
];

const comment_line = (target: string): Record<string, GrammarState> => ({
  [`cmt__${target}`]: {
    rules: [on("\n", goto(target)), fallback({ token: TOKENS.comment })],
  },
});

const line_tails = (target: string): Record<string, GrammarState> => ({
  [`path__${target}`]: {
    rules: [on(WS), on("\n", goto(target)), fallback(goto(`path_body__${target}`))],
  },
  [`path_body__${target}`]: {
    rules: [VARIABLE, on("\n", goto(target)), fallback({ token: TOKENS.string })],
  },
  [`fileenc__${target}`]: {
    rules: [
      on(WS, goto(`path__${target}`)),
      on("\n", goto(target)),
      fallback({ token: TOKENS.operator }),
    ],
  },
  [`handler__${target}`]: {
    rules: [
      on(WS),
      match("{%", TOKENS.punctuation, goto(`script__${target}`)),
      on("\n", goto(target)),
      fallback(goto(`path_body__${target}`)),
    ],
  },
  [`script__${target}`]: {
    rules: [match("%}", TOKENS.punctuation, goto(target)), fallback({ token: TOKENS.raw_script })],
  },
  [`wsmsg__${target}`]: {
    rules: [on("\n", goto(target)), fallback({ token: TOKENS.label })],
  },
});

// a multi char on consumes its match, this probe picks the state and rewinds to where the prefix began
const redispatch = (target: string): Record<string, GrammarState> => ({
  [`to__${target}`]: {
    mode: "probe",
    fallback: target,
    rules: [fallback(goto(target))],
  },
});

// HTTP/ opens a status line only when a digit follows, the probe rewinds to the H
const status_probe = (line: string): Record<string, GrammarState> => ({
  [`status_probe__${line}`]: {
    mode: "probe",
    fallback: line,
    rules: [on(DIGIT, goto("status_version")), fallback(goto(line))],
  },
});

// prefix names the body that takes over when body text starts with no blank line
const header_section = (
  ls: string,
  blank: string,
  prefix: string,
  extra: GrammarRule[] = [],
): Record<string, GrammarState> => ({
  [ls]: {
    rules: [
      on(BLANK_LINE, goto(blank)),
      on(["\n", "\r"]),
      ...extra,
      match("###", TOKENS.comment, goto("sep_rest")),
      match(["#", "//"], TOKENS.comment, goto(`cmt__${ls}`)),
      ...file_constructs(`${prefix}_plain_ls`),
      // a variable here starts a header name, not a json body
      on("{{", goto(`to__${ls}_name`)),
      match("<", TOKENS.raw_markup, goto(`${prefix}_markup_line`)),
      match(["{", "["], TOKENS.raw_json, goto(`${prefix}_json_line`)),
      on(WS, goto(`${ls}_cont`)),
      // an http2 pseudo header keeps its leading colon in the name
      match(":", TOKENS.property, goto(`${ls}_name`)),
      fallback(goto(`${ls}_name`)),
    ],
  },
  [`${ls}_name`]: {
    rules: [
      VARIABLE,
      // sealed so the }} of a variable name does not absorb it
      { ...match(":", TOKENS.punctuation, goto(`${ls}_value_ws`)), seal: true },
      on("\n", goto(ls)),
      fallback({ token: TOKENS.property }),
    ],
  },
  [`${ls}_value_ws`]: {
    rules: [on(WS_CR), on("\n", goto(ls)), fallback(goto(`${ls}_value`))],
  },
  [`${ls}_value`]: {
    rules: [VARIABLE, on("\n", goto(ls)), fallback({ token: TOKENS.string })],
  },
  // a continuation line of only whitespace counts as the blank line
  [`${ls}_cont`]: {
    rules: [
      on(WS_CR),
      on("\n", goto(blank)),
      match(["#", "//"], TOKENS.comment, goto(`cmt__${ls}`)),
      fallback(goto(`${ls}_value`)),
    ],
  },
  ...comment_line(ls),
  ...redispatch(`${ls}_name`),
});

// blank and comment lines keep sniffing, the first content char picks the body kind
const body_start = (
  start: string,
  prefix: string,
  boundary: GrammarRule[],
): Record<string, GrammarState> => {
  const sniff: GrammarRule[] = [
    // the variable returns here and the rest of the line is sniffed again
    VARIABLE,
    match(["{", "["], TOKENS.raw_json, goto(`${prefix}_json_line`)),
    match("<", TOKENS.raw_markup, goto(`${prefix}_markup_line`)),
  ];
  return {
    [start]: {
      rules: [
        on(["\n", "\r"]),
        ...line_constructs(start, `${prefix}_plain_ls`, `${prefix}_plain_line`),
        on(WS, goto(`${start}_ws`)),
        ...sniff,
        // dashes and a space are text such as an sql comment or a signature
        on(["-- ", "--\t"], goto(`${prefix}_plain_line`)),
        ...boundary,
        fallback(goto(`${prefix}_plain_line`)),
      ],
    },
    [`${start}_ws`]: {
      rules: [
        on(WS),
        on(["\n", "\r"], goto(start)),
        match(["#", "//"], TOKENS.comment, goto(`cmt__${start}`)),
        ...sniff,
        fallback(goto(`${prefix}_plain_line`)),
      ],
    },
    ...comment_line(start),
  };
};

type BodyKind = "json" | "markup" | "plain";

const body_kind = (
  prefix: string,
  kind: BodyKind,
  boundary: GrammarRule[],
): Record<string, GrammarState> => {
  const ls = `${prefix}_${kind}_ls`;
  const ws = `${prefix}_${kind}_ws`;
  const line = `${prefix}_${kind}_line`;
  const rest = `${prefix}_plain_ls`;
  const raw = kind === "json" ? TOKENS.raw_json : kind === "markup" ? TOKENS.raw_markup : null;
  const content = raw === null ? fallback({}) : fallback({ token: raw });
  const indent = raw === null ? on(WS) : match(WS, raw);
  // indented css ids and script comments are more common in markup than request file comments
  const indented_comment: GrammarRule[] =
    kind === "markup" ? [] : [match(["#", "//"], TOKENS.comment, goto(`cmt__${ls}`))];
  return {
    [ls]: {
      rules: [
        on(["\n", "\r"]),
        ...line_constructs(ls, rest, line),
        ...boundary,
        raw === null ? on(WS, goto(ws)) : match(WS, raw, goto(ws)),
        fallback(goto(line)),
      ],
    },
    [ws]: {
      rules: [indent, ...indented_comment, on("\n", goto(ls)), fallback(goto(line))],
    },
    [line]: {
      rules: [VARIABLE, on("\n", goto(ls)), content],
    },
    ...comment_line(ls),
    ...status_probe(line),
  };
};

// a multipart body treats every -- line as a boundary, a message body only its first line
const body = (
  start: string,
  prefix: string,
  lines: GrammarRule[],
): Record<string, GrammarState> => ({
  ...body_start(start, prefix, [BOUNDARY]),
  ...body_kind(prefix, "json", lines),
  ...body_kind(prefix, "markup", lines),
  ...body_kind(prefix, "plain", lines),
  ...line_tails(`${prefix}_plain_ls`),
});

export default define_grammar({
  name: "http",
  states: {
    // the line start before a start line, at the top and after each ### separator
    preamble: {
      rules: [
        match("###", TOKENS.comment, goto("sep_rest")),
        match(["#", "//"], TOKENS.comment, goto("pre_comment")),
        match("@", TOKENS.keyword, goto("fv_name")),
        match("<", TOKENS.operator, goto("pre_lt")),
        match(["curl ", "curl\t"], TOKENS.raw_shell, goto("curl_line")),
        on("HTTP/", goto("status_probe__req_target")),
        match(":", TOKENS.property, goto("hdr_ls_name")),
        on([" ", "\t", "\n", "\r"]),
        // a method if whitespace follows, a header name if a colon does, otherwise a bare target
        on(TCHAR, goto("reqline_probe")),
        fallback(goto("req_target")),
      ],
    },

    reqline_probe: {
      mode: "probe",
      fallback: "req_target",
      rules: [
        on(WS, goto("req_method")),
        on(":", goto("reqline_colon_probe")),
        on(TARGET_TERMINATORS, goto("req_target")),
      ],
    },

    // https:// and host:8080 are targets, anything else starts a header line
    // the goto here left the colon unconsumed so the first rule steps over it
    reqline_colon_probe: {
      mode: "probe",
      fallback: "hdr_ls_name",
      rules: [on(":"), on(["/", DIGIT], goto("req_target")), fallback(goto("hdr_ls_name"))],
    },

    sep_rest: {
      rules: [on("\n", goto("preamble")), fallback({ token: TOKENS.comment })],
    },

    pre_comment: {
      rules: [
        match(["#", "/", " ", "\t"], TOKENS.comment),
        match("@", TOKENS.decorator, goto("pre_meta_key_start")),
        on("\n", goto("preamble")),
        fallback(goto("cmt__preamble")),
      ],
    },

    // name and prompt define a variable, a separate state so the keyword only matches the whole key
    pre_meta_key_start: {
      rules: [
        keyword(["name", "prompt"], goto("pre_meta_var_ws"), TOKENS.decorator),
        fallback(goto("pre_meta_key")),
      ],
    },

    pre_meta_key: {
      rules: [
        match(WS, TOKENS.comment, goto("cmt__preamble")),
        on("\n", goto("preamble")),
        fallback({ token: TOKENS.decorator }),
      ],
    },

    pre_meta_var_ws: {
      rules: [
        // jetbrains also accepts an equals sign after the key
        match([" ", "\t", "="], TOKENS.comment),
        on("\n", goto("preamble")),
        fallback(goto("pre_meta_var")),
      ],
    },

    pre_meta_var: {
      rules: [
        match(WS, TOKENS.comment, goto("cmt__preamble")),
        on("\n", goto("preamble")),
        fallback({ token: TOKENS.variable }),
      ],
    },

    ...comment_line("preamble"),

    fv_name: {
      rules: [
        match("=", TOKENS.operator, goto("fv_value_ws")),
        on(WS, goto("fv_eq")),
        on("\n", goto("preamble")),
        fallback({ token: TOKENS.variable }),
      ],
    },

    fv_eq: {
      rules: [
        on(WS),
        match("=", TOKENS.operator, goto("fv_value_ws")),
        on("\n", goto("preamble")),
        fallback(goto("fv_junk")),
      ],
    },

    // not a definition, as in @ name = x
    fv_junk: {
      rules: [on("\n", goto("preamble")), fallback({})],
    },

    fv_value_ws: {
      rules: [on(WS), on("\n", goto("preamble")), fallback(goto("fv_value"))],
    },

    fv_value: {
      rules: [VARIABLE, on("\n", goto("preamble")), fallback({ token: TOKENS.string })],
    },

    pre_lt: {
      rules: [
        on(WS),
        match("{%", TOKENS.punctuation, goto("script__preamble")),
        on("\n", goto("preamble")),
        fallback(goto("path_body__preamble")),
      ],
    },

    script__preamble: {
      rules: [
        match("%}", TOKENS.punctuation, goto("preamble")),
        fallback({ token: TOKENS.raw_script }),
      ],
    },

    path_body__preamble: {
      rules: [VARIABLE, on("\n", goto("preamble")), fallback({ token: TOKENS.string })],
    },

    // the newlines stay in the raw token so backslash continuations reach bash as one command
    curl_line: {
      rules: [
        match("\n", TOKENS.raw_shell, goto("curl_ls")),
        fallback({ token: TOKENS.raw_shell }),
      ],
    },

    curl_ls: {
      rules: [
        on("\n", goto("preamble")),
        match("###", TOKENS.comment, goto("sep_rest")),
        fallback(goto("curl_line")),
      ],
    },

    ...status_probe("req_target"),

    status_version: {
      rules: [
        match("HTTP", TOKENS.keyword),
        match("/", TOKENS.punctuation),
        match([DIGIT, "."], TOKENS.number),
        on(WS, goto("status_code_ws")),
        on("\n", goto("hdr_ls")),
        fallback({}),
      ],
    },

    status_code_ws: {
      rules: [
        on(WS_CR),
        on("\n", goto("hdr_ls")),
        match(DIGIT, TOKENS.number, goto("status_code")),
        fallback(goto("status_reason")),
      ],
    },

    status_code: {
      rules: [
        match(DIGIT, TOKENS.number),
        on(WS_CR, goto("status_reason_ws")),
        on("\n", goto("hdr_ls")),
        fallback(goto("status_reason")),
      ],
    },

    status_reason_ws: {
      rules: [on(WS_CR), on("\n", goto("hdr_ls")), fallback(goto("status_reason"))],
    },

    status_reason: {
      rules: [on("\n", goto("hdr_ls")), fallback({ token: TOKENS.string })],
    },

    req_method: {
      rules: [
        on(WS, goto("req_ws")),
        on("\n", goto("req_after")),
        fallback({ token: TOKENS.keyword }),
      ],
    },

    req_ws: {
      rules: [on(WS_CR), on("\n", goto("req_after")), fallback(goto("req_target"))],
    },

    req_target: {
      rules: [
        VARIABLE,
        on(WS_CR, goto("req_target_ws")),
        on("\n", goto("req_after")),
        fallback({ token: TOKENS.url }),
      ],
    },

    // rest client keeps spaces in the url and only strips a trailing HTTP version
    req_target_ws: {
      rules: [
        on(WS_CR),
        on("\n", goto("req_after")),
        on("HTTP/", goto("version_probe")),
        fallback(goto("req_target")),
      ],
    },

    version_probe: {
      mode: "probe",
      fallback: "req_target",
      rules: [on(DIGIT, goto("req_version")), fallback(goto("req_target"))],
    },

    req_version: {
      rules: [
        match("HTTP", TOKENS.keyword),
        match("/", TOKENS.punctuation),
        match([DIGIT, "."], TOKENS.number),
        on("\n", goto("req_after")),
        fallback({}),
      ],
    },

    // an indented line or a ? or & line continues the target
    req_after: {
      rules: [
        on(BLANK_LINE, goto("body_start")),
        on(["\n", "\r"]),
        on(WS, goto("req_cont_ws")),
        match(["?", "&"], TOKENS.url, goto("req_target")),
        fallback(goto("hdr_ls")),
      ],
    },

    req_cont_ws: {
      rules: [
        on(WS_CR),
        on("\n", goto("body_start")),
        match(["#", "//"], TOKENS.comment, goto("cmt__hdr_ls")),
        fallback(goto("req_target")),
      ],
    },

    ...header_section("hdr_ls", "body_start", "body"),
    ...body("body_start", "body", []),

    // reads to the end of the line to tell an opening boundary from the closing one
    mp_probe: {
      mode: "probe",
      fallback: "mp_close",
      rules: [on(["--\n", "--\r\n"], goto("mp_close")), on("\n", goto("mp_open"))],
    },

    mp_open: {
      rules: [on("\n", goto("mp_hdr_ls")), fallback({ token: TOKENS.label })],
    },

    // the rest of the body after the closing boundary is an epilogue
    mp_close: {
      rules: [on("\n", goto("body_plain_ls")), fallback({ token: TOKENS.label })],
    },

    ...header_section("mp_hdr_ls", "mp_body_start", "mp", [BOUNDARY]),
    ...body("mp_body_start", "mp", [BOUNDARY]),

    // every exit from the variable states is a leave so the stack stays flat
    var: {
      rules: [
        on(WS),
        match("}}", TOKENS.punctuation, leave()),
        on("\n", leave()),
        match("$", TOKENS.builtin, goto("var_system")),
        match("%", TOKENS.operator),
        fallback(goto("var_name")),
      ],
    },

    var_name: {
      rules: [
        match("}}", TOKENS.punctuation, leave()),
        on("\n", leave()),
        on(WS, goto("var_args")),
        match("(", TOKENS.string, goto("var_args")),
        fallback({ token: TOKENS.variable }),
      ],
    },

    var_system: {
      rules: [
        match("}}", TOKENS.punctuation, leave()),
        on("\n", leave()),
        on(WS, goto("var_args")),
        match("(", TOKENS.string, goto("var_args")),
        fallback({ token: TOKENS.builtin }),
      ],
    },

    var_args: {
      rules: [
        match("}}", TOKENS.punctuation, leave()),
        on("\n", leave()),
        on(WS),
        fallback({ token: TOKENS.string }),
      ],
    },
  },
});
