/*
 * scope, dockerfile instructions and arguments with parser directives and continuations
 * known limitations, heredoc bodies use ordinary dockerfile tokens because delimiters
 * require runtime captures, nested shell expressions and shell selection are not tracked
 * invalid options and duplicate directives are not validated
 * edge cases, uncontinued newlines end unfinished quotes and replacements
 * command arrays keep dollars literal, builder path arrays allow replacement
 */

import {
  ALNUM,
  DIGIT,
  LETTER,
  enter,
  fallback,
  goto,
  keyword,
  leave,
  match,
  on,
} from "@twinkleplop/core";
import type { GrammarState } from "@twinkleplop/core";
import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

const WS = [" ", "\t"];
const EOL = ["\r\n", "\n", "\r"];
const OPERATORS = [
  "<<-",
  "<<",
  ">>",
  "&&",
  "||",
  ">&",
  "<&",
  "|&",
  ";;&",
  ";;",
  ";&",
  "&",
  "|",
  ";",
  "<",
  ">",
  "(",
  ")",
];

// the grammar api has no case folding flag
const cases = (word: string): string[] => {
  let words = [""];
  for (const char of word)
    words = words.flatMap((prefix) => [prefix + char, prefix + char.toUpperCase()]);
  return words;
};

const INSTRUCTIONS: Record<string, string[]> = {
  from: cases("from"),
  command: ["run", "cmd", "entrypoint", "shell"].flatMap(cases),
  path: ["add", "copy", "volume"].flatMap(cases),
  assignment: ["env", "arg", "label"].flatMap(cases),
  numeric: ["expose", "stopsignal"].flatMap(cases),
  health: cases("healthcheck"),
  onbuild: cases("onbuild"),
  arguments: ["maintainer", "user", "workdir"].flatMap(cases),
};
const AS = cases("as");
const CMD = cases("cmd");
const NONE = cases("none");
const DIRECTIVES = ["syntax", "check"].flatMap(cases);
const ESCAPE = cases("escape");

// the escape setting persists across instructions without keeping stack frames
const mode = (prefix: string, escape: string): Record<string, GrammarState> => {
  const s = (name: string) => `${prefix}_${name}`;
  const end = on(EOL, goto(s("line")));
  const pop_line = on(EOL, leave());
  const continuation = on(escape, enter(s("escape_probe")));
  const literal_continuation = on(escape, enter(s("literal_escape_probe")));
  const variables = [
    match("${", TOKENS.variable, enter(s("braced_variable"))),
    match("$", TOKENS.variable, enter(s("variable_start"))),
  ];
  const quotes = [
    match('"', TOKENS.string, enter(s("double"))),
    match("'", TOKENS.string, enter(s("single"))),
  ];
  const values = [continuation, ...quotes, ...variables];
  const option = match("--", TOKENS.property, enter(s("option_name")));
  const head = [on(WS), end, continuation];
  const dispatch = Object.entries(INSTRUCTIONS).map(([kind, words]) =>
    on(words, goto(s(`probe_${kind}`))),
  );
  const states: Record<string, GrammarState> = {
    [s("preamble")]: {
      rules: [
        on(["\ufeff", ...WS]),
        match("#", TOKENS.comment, goto(s("directive"))),
        fallback(goto(s("line"))),
      ],
    },
    [s("directive")]: {
      rules: [
        match(WS, TOKENS.comment),
        keyword(ESCAPE, goto(s("escape_equals")), TOKENS.directive),
        keyword(DIRECTIVES, goto(s("directive_equals")), TOKENS.directive),
        fallback(goto(s("ordinary_comment"))),
      ],
    },
    [s("directive_equals")]: {
      rules: [
        match(WS, TOKENS.comment),
        match("=", TOKENS.operator, goto(s("directive_value"))),
        fallback(goto(s("ordinary_comment"))),
      ],
    },
    [s("directive_value")]: {
      rules: [match(EOL, TOKENS.comment, goto(s("preamble"))), fallback({ token: TOKENS.comment })],
    },
    [s("escape_equals")]: {
      rules: [
        match(WS, TOKENS.comment),
        match("=", TOKENS.operator, goto(s("escape_value"))),
        fallback(goto(s("ordinary_comment"))),
      ],
    },
    [s("escape_value")]: {
      rules: [
        match(WS, TOKENS.comment),
        match("`", TOKENS.comment, goto("tick_directive_value")),
        match("\\", TOKENS.comment, goto("slash_directive_value")),
        fallback(goto(s("ordinary_comment"))),
      ],
    },
    [s("ordinary_comment")]: {
      rules: [end, fallback({ token: TOKENS.comment })],
    },
    [s("line")]: {
      rules: [
        on([...WS, ...EOL]),
        match("#", TOKENS.comment, enter(s("comment"))),
        ...dispatch,
        fallback(goto(s("arguments"))),
      ],
    },
    [s("comment")]: {
      rules: [pop_line, fallback({ token: TOKENS.comment })],
    },
    [s("onbuild")]: { rules: [...head, ...dispatch, fallback(goto(s("arguments")))] },
    [s("from")]: {
      rules: [...head, option, fallback(goto(s("image")))],
    },
    [s("image")]: {
      rules: [
        end,
        continuation,
        on(WS, goto(s("from_as"))),
        ...quotes,
        ...variables,
        fallback({ token: TOKENS.string }),
      ],
    },
    [s("from_as")]: {
      rules: [...head, on(AS, goto(s("probe_as"))), fallback(goto(s("arguments")))],
    },
    [s("health")]: {
      rules: [
        ...head,
        option,
        on(CMD, goto(s("probe_cmd"))),
        on(NONE, goto(s("probe_none"))),
        fallback(goto(s("arguments"))),
      ],
    },
    [s("option_name")]: {
      rules: [
        pop_line,
        continuation,
        on(WS, leave()),
        match("=", TOKENS.operator, goto(s("option_value"))),
        match(["-", "_", ALNUM], TOKENS.property),
        fallback(leave()),
      ],
    },
    [s("option_value")]: {
      rules: [pop_line, on(WS, leave()), ...values, fallback({ token: TOKENS.string })],
    },
    [s("assignment")]: {
      rules: [...head, fallback(goto(s("assignment_key")))],
    },
    [s("assignment_key")]: {
      rules: [
        end,
        continuation,
        match('"', TOKENS.property, enter(s("double_key"))),
        match("'", TOKENS.property, enter(s("single_key"))),
        match("=", TOKENS.operator, goto(s("assignment_value"))),
        on(WS, goto(s("arguments"))),
        fallback({ token: TOKENS.property }),
      ],
    },
    [s("assignment_value")]: {
      rules: [end, on(WS, goto(s("assignment"))), ...values, fallback({ token: TOKENS.string })],
    },
    [s("arguments")]: {
      rules: [
        ...head,
        ...quotes,
        ...variables,
        match(["<<-", "<<"], TOKENS.operator),
        fallback({ token: TOKENS.string }),
      ],
    },
    [s("shell")]: {
      rules: [
        ...head,
        ...quotes,
        ...variables,
        match(OPERATORS, TOKENS.operator),
        fallback({ token: TOKENS.string }),
      ],
    },
    [s("numeric")]: {
      rules: [
        ...head,
        ...quotes,
        ...variables,
        match(DIGIT, TOKENS.number),
        match(["/", "-"], TOKENS.punctuation),
        fallback({ token: TOKENS.string }),
      ],
    },
    [s("double")]: {
      rules: [
        pop_line,
        continuation,
        match('"', TOKENS.string, leave()),
        ...variables,
        fallback({ token: TOKENS.string }),
      ],
    },
    [s("single")]: {
      rules: [
        pop_line,
        literal_continuation,
        match("'", TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },
    [s("variable_start")]: {
      rules: [
        match(["_", LETTER], TOKENS.variable, goto(s("variable_name"))),
        match([DIGIT, "?", "#", "$", "!", "@", "*", "-"], TOKENS.variable, leave()),
        fallback(leave()),
      ],
    },
    [s("variable_name")]: {
      rules: [match(["_", ALNUM], TOKENS.variable), fallback(leave())],
    },
    [s("braced_variable")]: {
      rules: [
        pop_line,
        continuation,
        match("}", TOKENS.variable, leave()),
        ...quotes,
        ...variables,
        fallback({ token: TOKENS.variable }),
      ],
    },
    [s("escape_probe")]: {
      mode: "probe",
      fallback: s("escape_emit"),
      rules: [on(WS), on(EOL, enter(s("continuation_emit"))), fallback(enter(s("escape_emit")))],
    },
    [s("literal_escape_probe")]: {
      mode: "probe",
      fallback: s("literal_escape"),
      rules: [on(WS), on(EOL, enter(s("continuation_emit"))), fallback(enter(s("literal_escape")))],
    },
    [s("literal_escape")]: {
      rules: [match([escape + escape, escape], TOKENS.string, leave())],
    },
    [s("escape_emit")]: { rules: [match(escape, TOKENS.string, goto(s("escape_char")))] },
    [s("escape_char")]: { rules: [pop_line, fallback({ token: TOKENS.string, ...leave() })] },
    [s("continuation_emit")]: {
      rules: [match(escape, TOKENS.operator, goto(s("continuation_tail")))],
    },
    [s("continuation_tail")]: {
      rules: [on(WS), match(EOL, TOKENS.operator, goto(s("continuation_line"))), fallback(leave())],
    },
    [s("continuation_line")]: {
      rules: [
        on([...WS, ...EOL]),
        match("#", TOKENS.comment, enter(s("comment"))),
        fallback(leave()),
      ],
    },
  };

  // docker instructions require whitespace or eof, ordinary keyword boundaries allow punctuation
  const words = (name: string, spellings: string[], target: string) => {
    states[s(`probe_${name}`)] = {
      mode: "probe",
      fallback: s(`emit_${name}`),
      rules: [on([...WS, ...EOL], goto(s(`emit_${name}`))), fallback(goto(s("arguments")))],
    };
    states[s(`emit_${name}`)] = { rules: [keyword(spellings, goto(s(target)))] };
  };
  for (const [kind, spellings] of Object.entries(INSTRUCTIONS)) words(kind, spellings, kind);
  words("as", AS, "arguments");
  words("cmd", CMD, "command");
  words("none", NONE, "arguments");

  for (const [kind, quote] of [
    ["single", "'"],
    ["double", '"'],
  ]) {
    states[s(`${kind}_key`)] = {
      rules: [
        pop_line,
        kind === "single" ? literal_continuation : continuation,
        match(quote, TOKENS.property, leave()),
        fallback({ token: TOKENS.property }),
      ],
    };
  }

  for (const kind of ["command", "path"]) {
    states[s(kind)] = {
      rules: [
        ...head,
        option,
        match("[", TOKENS.punctuation, goto(s(`${kind}_array`))),
        fallback(goto(s(kind === "command" ? "shell" : "arguments"))),
      ],
    };
    states[s(`${kind}_array`)] = {
      rules: [
        ...head,
        match("]", TOKENS.punctuation, goto(s("arguments"))),
        match(",", TOKENS.punctuation),
        match('"', TOKENS.string, enter(s(`${kind}_json_string`))),
        fallback({ token: TOKENS.string }),
      ],
    };
    states[s(`${kind}_json_string`)] = {
      rules: [
        pop_line,
        escape === "\\" ? continuation : literal_continuation,
        match('"', TOKENS.string, leave()),
        // json uses backslash regardless of the dockerfile escape directive
        match("\\", TOKENS.string, enter(s("escape_char"))),
        ...(kind === "path" ? variables : []),
        fallback({ token: TOKENS.string }),
      ],
    };
  }
  return states;
};

export default define_grammar({
  name: "dockerfile",
  states: { ...mode("slash", "\\"), ...mode("tick", "`") },
});
