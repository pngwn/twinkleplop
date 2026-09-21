// one reading for php.ini, configparser, git config, systemd, desktop entries
// and editorconfig, where they disagree it favours the fewest broken real files
//
// the indent of the latest key line is the only state that crosses a line
// ending, it lives in the base state every line starts in, root or
// after_key_K, and the stack is always empty at line start
//
// known limitations
// key indents above MAX_INDENT are stored as MAX_INDENT
// a trailing backslash is only marked, the next line continues by indent alone,
// so a windows path ending in a backslash cannot swallow the next key
// a ; starts a comment anywhere outside quotes, as git and php read it, so a
// desktop list like Keywords=a;b keeps only its first item unless written a\;b
// a # mid line needs whitespace before it, so url fragments stay values but
// color = #fff is a comment
// a single quote opens a string only at a value start or after whitespace, so
// format:'%h %s' stays text
// quoted strings end at the line ending, php lets them span lines
// a header closes at its balancing bracket, so [a]b] ends at the first bracket
// and text after a header other than a comment is unclassified
// no typed values or interpolation, each is specific to one dialect

import { enter, fallback, goto, leave, match, on, range } from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";
import type { GrammarRule, GrammarState } from "@twinkleplop/core";

// a section namespaces its keys, the delimiter token matches toml
const SECTION = TOKENS.namespace;
const KEY = TOKENS.property;
const DELIMITER = TOKENS.operator;
const VALUE = TOKENS.plain_scalar;

const MAX_INDENT = 8;

const WS = [" ", "\t", "\f", "\v"];
const EOL = ["\n", "\r"];
const COMMENT_START = [";", "#"];
const BOM = range([[0xfeff, 0xfeff]]);

const base = (indent_rule: GrammarRule): GrammarState => ({
  rules: [
    on(EOL),
    match(COMMENT_START, TOKENS.comment, enter("comment")),
    match("[", TOKENS.punctuation, goto("section")),
    indent_rule,
    fallback(goto("key_line_0")),
  ],
});

// outcomes that keep the stored indent enter the value states over the base,
// outcomes that replace it goto with an empty stack
const indent_probe = (j: number, next_blank: GrammarRule): GrammarState => ({
  mode: "probe",
  fallback: "value_ws",
  rules: [
    next_blank,
    on([...COMMENT_START, ...EOL], enter("value_ws")),
    on("[", goto("header_lead")),
    fallback(goto(`key_line_${j}`)),
  ],
});

const states: Record<string, GrammarState> = {};

// root must stay first, it is the entry state
states.root = base(on(WS, enter("root_indent_1")));
states.root.rules!.unshift(on(BOM));

for (let k = 0; k <= MAX_INDENT; k++) {
  states[`after_key_${k}`] = base(
    k === 0 ? on(WS, enter("value_ws")) : on(WS, enter(`indent_${k}_1`)),
  );
}

for (let j = 1; j <= MAX_INDENT; j++) {
  states[`root_indent_${j}`] = indent_probe(
    j,
    j < MAX_INDENT ? on(WS, enter(`root_indent_${j + 1}`)) : on(WS),
  );
}

for (let k = 1; k <= MAX_INDENT; k++) {
  for (let j = 1; j <= k; j++) {
    // the blank past k proves a continuation
    states[`indent_${k}_${j}`] = indent_probe(
      j,
      on(WS, enter(j < k ? `indent_${k}_${j + 1}` : "value_ws")),
    );
  }
}

for (let j = 0; j <= MAX_INDENT; j++) {
  states[`key_line_${j}`] = {
    rules: [
      on(WS),
      on(EOL, goto(`after_key_${j}`)),
      match("=", DELIMITER, enter("value_lead")),
      fallback({ token: KEY, ...enter("key") }),
    ],
  };
}

export default define_grammar({
  name: "ini",
  states: {
    ...states,

    // entered by enter or goto, either way the frame below owns the line ending
    comment: {
      rules: [on(EOL, leave()), fallback({ token: TOKENS.comment })],
    },

    // section sits on an empty stack and resets to root at the line ending,
    // closed or not
    header_lead: {
      rules: [on(WS), match("[", TOKENS.punctuation, goto("section"))],
    },

    section: {
      rules: [
        on(EOL, goto("root")),
        match("]", TOKENS.punctuation, goto("after_section")),
        match("[", SECTION, enter("section_nested")),
        match('"', TOKENS.string, enter("section_quoted")),
        match("\\", SECTION, enter("section_escape")),
        fallback({ token: SECTION }),
      ],
    },

    section_nested: {
      rules: [
        on(EOL, leave()),
        match("]", SECTION, leave()),
        match("[", SECTION, enter("section_nested")),
        match('"', TOKENS.string, enter("section_quoted")),
        match("\\", SECTION, enter("section_escape")),
        fallback({ token: SECTION }),
      ],
    },

    section_escape: {
      rules: [on(EOL, leave()), fallback({ token: SECTION, ...leave() })],
    },

    section_quoted: {
      rules: [
        on(EOL, leave()),
        match('"', TOKENS.string, leave()),
        match("\\", TOKENS.string_escape, { ...goto("section_quoted_escape"), seal: true }),
        fallback({ token: TOKENS.string }),
      ],
    },

    section_quoted_escape: {
      rules: [
        on(EOL, leave()),
        fallback({ token: TOKENS.string_escape, ...goto("section_quoted") }),
      ],
    },

    after_section: {
      rules: [
        on(WS),
        on(EOL, goto("root")),
        match(COMMENT_START, TOKENS.comment, enter("comment")),
        fallback(),
      ],
    },

    // blanks go through key_ws unconsumed so no key token holds a blank
    key: {
      rules: [
        on(EOL, leave()),
        on(WS, goto("key_ws")),
        match("=", DELIMITER, goto("value_lead")),
        on(":", enter("colon_probe")),
        match(";", TOKENS.comment, goto("comment")),
        match(["[", "]"], TOKENS.punctuation),
        fallback({ token: KEY }),
      ],
    },

    key_ws: {
      rules: [
        on(WS),
        on(EOL, leave()),
        match("=", DELIMITER, goto("value_lead")),
        on(":", enter("colon_probe")),
        match(COMMENT_START, TOKENS.comment, goto("comment")),
        fallback(goto("key")),
      ],
    },

    // a colon delimits only before whitespace, so php keys like INI:WITH:COLON survive
    colon_probe: {
      mode: "probe",
      fallback: "colon_delimiter",
      rules: [on([...WS, ...EOL], goto("colon_delimiter")), fallback(goto("colon_key"))],
    },

    colon_delimiter: {
      rules: [match(":", DELIMITER, goto("value_lead"))],
    },

    colon_key: {
      rules: [match(":", KEY, goto("key"))],
    },

    // a # counts only after a blank and a single quote opens only at a value
    // start or after a blank, hence three value states
    value_lead: {
      rules: [
        on(EOL, leave()),
        on(WS, goto("value_ws")),
        match("'", TOKENS.string, goto("sq_string")),
        fallback(goto("value")),
      ],
    },

    value_ws: {
      rules: [
        on(WS),
        on(EOL, leave()),
        match(COMMENT_START, TOKENS.comment, goto("comment")),
        match("'", TOKENS.string, goto("sq_string")),
        fallback(goto("value")),
      ],
    },

    value: {
      rules: [
        on(EOL, leave()),
        on(WS, goto("value_ws")),
        match('"', TOKENS.string, goto("dq_string")),
        match(";", TOKENS.comment, goto("comment")),
        on("\\", enter("backslash_probe")),
        fallback({ token: VALUE }),
      ],
    },

    // strings exit sideways so the closing quote lands in value whatever opened them
    dq_string: {
      rules: [
        match('"', TOKENS.string, goto("value")),
        match("\\", TOKENS.string_escape, { ...goto("dq_escape"), seal: true }),
        on(EOL, goto("value")),
        fallback({ token: TOKENS.string }),
      ],
    },

    dq_escape: {
      rules: [
        on(EOL, goto("value")),
        fallback({ token: TOKENS.string_escape, ...goto("dq_string") }),
      ],
    },

    sq_string: {
      rules: [
        match("'", TOKENS.string, goto("value")),
        on(EOL, goto("value")),
        fallback({ token: TOKENS.string }),
      ],
    },

    backslash_probe: {
      mode: "probe",
      fallback: "backslash_text",
      rules: [on(EOL, enter("backslash_continuation")), fallback(enter("backslash_text"))],
    },

    backslash_continuation: {
      rules: [match("\\", TOKENS.punctuation, leave())],
    },

    // a backslash escapes another backslash or a comment marker
    backslash_text: {
      rules: [match("\\", VALUE, goto("backslash_pair"))],
    },

    backslash_pair: {
      rules: [match(["\\", ";", "#"], VALUE, leave()), fallback(leave())],
    },
  },
});
