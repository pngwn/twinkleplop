// mdsvex grammar, penguin flavoured markdown as mdsvex@next reads it
// markdown blocks and inlines with svelte tags, blocks and expressions anywhere
//
// inline styles compose as in the markdown grammar and tags reuse the svelte grammar states
// a rejected probe ends in a literal state that cannot see its parent
// so paragraphs and headings each get a copy of the probe states
//
// known limitations
//   link text, subscript and superscript stop at a line end
//   emphasis over a line end stops at a block quote marker and at an indented block start
//   a delimiter opens after anything that is not an ascii letter or digit
//   a delimiter other than `:` rejected inside emphasis, link text or a label has no token
//   subscript and superscript read as italic
//   a table needs a leading `|`, its header row and merge markers are not told apart
//   text after the label or arguments of a block directive does not make it a paragraph
//   reference links are not checked against definitions
//   `pre` and `textarea` content is read as markdown
//   a fence in a block quote keeps the `>` markers in its code
//   an unclosed `{` or tag runs on where pfm makes it text

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
  within,
} from "@twinkleplop/core";
import type { GrammarRule, GrammarState } from "@twinkleplop/core";
import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";
import { raw_grammar as svelte } from "@twinkleplop/svelte";

const SVELTE_STATES = [
  "brace_start",
  "block_keyword",
  "at_directive_keyword",
  "lt_tag",
  "tag_start",
  "tag_svelte_ns",
  "tag_open",
  "tag_attrs",
  "close_tag",
  "script_attrs",
  "script_content",
  "script_close_probe",
  "script_close_fail",
  "script_close_emit",
  "script_close_name",
  "script_close_gt",
  "style_attrs",
  "style_content",
  "style_close_probe",
  "style_close_fail",
  "style_close_emit",
  "style_close_name",
  "style_close_gt",
  "attr_string_double",
  "attr_string_single",
  "expression_body",
  "expression_brace",
];

const svelte_states: Record<string, GrammarState> = {};
for (const name of SVELTE_STATES) {
  const state = (svelte.states as Record<string, GrammarState>)[name];
  if (state === undefined) throw new Error(`@twinkleplop/svelte has no state ${name}`);
  svelte_states[name] = state;
}

const WS = [" ", "\t"];
const WS_EOL = [" ", "\t", "\n", "\r"];
const NAME_CHARS = [ALNUM, "_", "-"];

const WORD_CHARS = [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"];

// the tokenizer cannot look behind, so a word run gets a state where a delimiter is text
const before_word = (delimiter: string) => WORD_CHARS.map((char) => delimiter + char);

function word_state(
  back: string,
  token: string | undefined,
  delimiters: string[],
  own?: string,
): GrammarState {
  if (token === undefined) {
    return { rules: [on(ALNUM), on(delimiters), fallback(goto(back))] };
  }
  const rules = [match(ALNUM, token), match(delimiters, token)];
  if (own !== undefined) rules.push(match(before_word(own), token));
  return { rules: [...rules, fallback(goto(back))] };
}

const ESCAPE_RULE = match(
  [..."!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"].map((char) => `\\${char}`),
  TOKENS.escape,
);

const HARD_BREAK = match("\\\n", TOKENS.hard_break, goto("block_start"));
// a nested body pops without consuming so the line state emits the break
const HARD_BREAK_UNWIND = on("\\\n", leave());

// emphasis runs over a line end until the paragraph ends, at a blank line or
// a line that starts another block. a block quote marker ends it too, since a
// body cannot tell a quoted paragraph that goes on from a new quote
const PARAGRAPH_ENDS = [
  "\n\n",
  "\n\r",
  "\n#",
  "\n>",
  "\n```",
  "\n- ",
  "\n* ",
  "\n+ ",
  "\n::",
  "\n|",
  "\n---",
  "\n***",
  "\n___",
  "\n{#",
  "\n{:",
  "\n{/",
];

const COMMENT = within("<!--", "-->", TOKENS.comment);
const CLOSE_TAG = match("</", TOKENS.punctuation, enter("close_tag"));
const EXPRESSION = match("{", TOKENS.expression, enter("brace_start"));

const lookahead_openers = (context: string): GrammarRule[] => [
  match("$`", TOKENS.code_open, enter("math_body")),
  on("``", enter(`${context}code_probe_2`)),
  on("`", enter(`${context}code_probe_1`)),
  on("~~", enter(`${context}strike_probe`)),
];

const IMAGE = match("![", TOKENS.link_text_open, enter("link_text"));
const FOOTNOTE_REFERENCE = match("[^", TOKENS.link_text_open, enter("footnote_label"));

const INTRAWORD = [
  match("|_", TOKENS.italic_open, enter("under_body")),
  match("|*", TOKENS.bold_open, enter("star_body")),
  match("|~~", TOKENS.strike_open, enter("strike_body")),
];

function line_openers(context: string, word: string): GrammarRule[] {
  return [
    on(ALNUM, goto(word)),
    COMMENT,
    CLOSE_TAG,
    on("<", enter(`${context}lt_probe`)),
    EXPRESSION,
    ...lookahead_openers(context),
    IMAGE,
    FOOTNOTE_REFERENCE,
    on("[", enter(`${context}bracket_probe`)),
    on("&", enter(`${context}amp_probe`)),
    on(":", enter(`${context}colon_probe`)),
    on("_", enter(`${context}under_probe`)),
    on("*", enter(`${context}star_probe`)),
    on("~", enter(`${context}sub_probe`)),
    on("^", enter(`${context}sup_probe`)),
  ];
}

// a tokenless literal skips the whole run of its character
function literal(char: string, token: string | undefined): GrammarState {
  if (token !== undefined) return { rules: [match(char, token, leave())] };
  return { rules: [on(char), fallback(leave())] };
}

// `:name[` is an inline directive, a styled body gets its own copy so a text `:` keeps the style
function colon_states(context: string, token: string | undefined): Record<string, GrammarState> {
  const name = (state: string) => `${context}${state}`;
  return {
    [name("colon_probe")]: {
      mode: "probe",
      fallback: name("colon_literal"),
      rules: [on(LETTER, enter(name("colon_name"))), fallback(enter(name("colon_literal")))],
    },
    [name("colon_name")]: {
      mode: "probe",
      fallback: name("colon_literal"),
      rules: [
        on(NAME_CHARS),
        on("[", enter(name("colon_label"))),
        fallback(enter(name("colon_literal"))),
      ],
    },
    [name("colon_label")]: {
      mode: "probe",
      fallback: name("colon_literal"),
      rules: [on("]", enter("directive_inline")), on("\n", enter(name("colon_literal")))],
    },
    [name("colon_literal")]: literal(":", token),
  };
}

function line_states(context: string, token: string | undefined): Record<string, GrammarState> {
  const states: Record<string, GrammarState> = {};
  const name = (state: string) => `${context}${state}`;
  // a heading is one line
  const line_ends = token === undefined ? PARAGRAPH_ENDS : ["\n"];

  for (const [kind, char] of [
    ["under", "_"],
    ["star", "*"],
  ]) {
    states[name(`${kind}_probe`)] = {
      mode: "probe",
      fallback: name(`${kind}_literal`),
      rules: [on(WS_EOL, enter(name(`${kind}_literal`))), fallback(enter(name(`${kind}_scan`)))],
    };
    states[name(`${kind}_scan`)] = {
      mode: "probe",
      fallback: name(`${kind}_literal`),
      rules: [
        on(line_ends, enter(name(`${kind}_literal`))),
        on([` ${char}`, `\t${char}`, ...(token === undefined ? [`\n${char}`] : [])]),
        { ...on(char, enter(`${kind}_open`)), boundary: true },
        // the boundary check counts `_` as a word character
        ...(kind === "star" ? [on("*_", enter("star_open"))] : []),
      ],
    };
    states[name(`${kind}_literal`)] = literal(char, token);
  }

  for (const [kind, char] of [
    ["sub", "~"],
    ["sup", "^"],
  ]) {
    states[name(`${kind}_probe`)] = {
      mode: "probe",
      fallback: name(`${kind}_literal`),
      rules: [
        on([char, ...WS_EOL], enter(name(`${kind}_literal`))),
        fallback(enter(name(`${kind}_scan`))),
      ],
    };
    states[name(`${kind}_scan`)] = {
      mode: "probe",
      fallback: name(`${kind}_literal`),
      rules: [on(char, enter(`${kind}_open`)), on(WS_EOL, enter(name(`${kind}_literal`)))],
    };
    states[name(`${kind}_literal`)] = literal(char, token);
  }

  // a code span may run over lines in a paragraph, a longer run of backticks does not close it
  const paragraph_end = token === undefined ? "\n\n" : "\n";
  for (const count of [1, 2]) {
    const ticks = "`".repeat(count);
    states[name(`code_probe_${count}`)] = {
      mode: "probe",
      fallback: name(`code_literal_${count}`),
      rules: [
        on(LONGER_TICKS[count]),
        on(ticks, enter(`code_open_${count}`)),
        on(paragraph_end, enter(name(`code_literal_${count}`))),
      ],
    };
    states[name(`code_literal_${count}`)] = literal(ticks, token);
  }

  states[name("strike_probe")] = {
    mode: "probe",
    fallback: name("strike_literal"),
    rules: [
      on(["~", ...WS_EOL], enter(name("strike_literal"))),
      fallback(enter(name("strike_scan"))),
    ],
  };
  states[name("strike_scan")] = {
    mode: "probe",
    fallback: name("strike_literal"),
    rules: [on("~~", enter("strike_open")), on(line_ends, enter(name("strike_literal")))],
  };
  states[name("strike_literal")] = literal("~~", token);

  states[name("bracket_probe")] = {
    mode: "probe",
    fallback: name("bracket_literal"),
    rules: [
      on(["\\]", "\\["]),
      on(["](", "]["], enter("bracket_open")),
      on(["]", "\n"], enter(name("bracket_literal"))),
    ],
  };
  states[name("bracket_literal")] = literal("[", token);

  states[name("amp_probe")] = {
    mode: "probe",
    fallback: name("amp_literal"),
    rules: [on(";", enter("entity_open")), on([ALNUM, "#"]), fallback(enter(name("amp_literal")))],
  };
  states[name("amp_literal")] = literal("&", token);

  Object.assign(states, colon_states(context, token));

  states[name("lt_probe")] = {
    mode: "probe",
    fallback: name("lt_literal"),
    rules: [
      // `<svelte:head>` has the shape of an autolink
      on("svelte:", enter("lt_tag")),
      on(LETTER, enter(name("lt_name"))),
      fallback(enter(name("lt_literal"))),
    ],
  };
  states[name("lt_name")] = {
    mode: "probe",
    fallback: "lt_tag",
    rules: [on([ALNUM, "+", ".", "-"]), on(":", enter("lt_autolink")), fallback(enter("lt_tag"))],
  };
  states[name("lt_literal")] = literal("<", token);

  return states;
}

// a delimiter inside its own body opens a nested one only when two closers follow,
// one for each body, otherwise the outer body would never close
function nested_states(kind: string, char: string, token: string): Record<string, GrammarState> {
  const scan = (found: string): GrammarState => ({
    mode: "probe",
    fallback: `${kind}_nested_literal`,
    rules: [
      on(PARAGRAPH_ENDS, enter(`${kind}_nested_literal`)),
      on([` ${char}`, `\t${char}`, `\n${char}`]),
      { ...on(char, enter(found)), boundary: true },
      // the boundary check counts `_` as a word character, two of them close both bodies
      ...(kind === "star" ? [on("*_", enter(found))] : [on("__", enter(`${kind}_open`))]),
    ],
  });
  return {
    [`${kind}_nested`]: scan(`${kind}_nested_second`),
    [`${kind}_nested_second`]: scan(`${kind}_open`),
    [`${kind}_nested_literal`]: { rules: [match(char, token, leave())] },
  };
}

interface BodyOptions {
  own?: "_" | "*" | "~~";
  links?: boolean;
  images?: boolean;
  word: string;
  colon: string;
  multiline?: boolean;
}

// bodies borrow the paragraph probes, so a delimiter they reject has no token there
function body_rules(token: string, options: BodyOptions): GrammarRule[] {
  const rules: GrammarRule[] = [
    on(ALNUM, goto(options.word)),
    ...(options.multiline
      ? [
          on([...PARAGRAPH_ENDS, "\\\n\n"], leave()),
          match("\\\n", TOKENS.hard_break),
          // the line end is a token so style composition does not reset at it
          match("\n", token),
        ]
      : [on("\n", leave()), HARD_BREAK_UNWIND]),
    ESCAPE_RULE,
    COMMENT,
    CLOSE_TAG,
    on("<", enter("p_lt_probe")),
    EXPRESSION,
    ...lookahead_openers("p_").filter((rule) => options.own !== "~~" || rule.match !== "~~"),
  ];
  if (options.images !== false) rules.push(IMAGE);
  if (options.links !== false) {
    rules.push(FOOTNOTE_REFERENCE, on("[", enter("p_bracket_probe")));
  }
  rules.push(on("&", enter("p_amp_probe")), on(":", enter(`${options.colon}colon_probe`)));
  if (options.own !== "_") {
    rules.push(on("_", enter("p_under_probe")));
  }
  if (options.own !== "*") {
    rules.push(on("*", enter("p_star_probe")));
  }
  rules.push(on("~", enter("p_sub_probe")), on("^", enter("p_sup_probe")), fallback({ token }));
  return rules;
}

// a fence closes on at least as many backticks, so each length gets its own body
function fence_states(count: number): Record<string, GrammarState> {
  return {
    [`fence_info_${count}`]: {
      rules: [on("\n", goto(`fence_body_${count}`)), fallback({ token: TOKENS.code_language })],
    },
    [`fence_body_${count}`]: {
      rules: [
        match("\n", TOKENS.raw_code_block, goto(`fence_line_${count}`)),
        fallback({ token: TOKENS.raw_code_block }),
      ],
    },
    [`fence_line_${count}`]: {
      rules: [
        match([" ", "\t", ">"], TOKENS.raw_code_block),
        on("`".repeat(count), enter(`fence_probe_${count}`)),
        fallback(goto(`fence_body_${count}`)),
      ],
    },
    [`fence_probe_${count}`]: {
      mode: "probe",
      fallback: "fence_close",
      rules: [
        on(["`", " ", "\t", "\r"]),
        on("\n", goto("fence_close")),
        fallback(goto(`fence_body_${count}`)),
      ],
    },
  };
}

function code_states(count: number): Record<string, GrammarState> {
  const ticks = "`".repeat(count);
  return {
    [`code_open_${count}`]: {
      rules: [match(ticks, TOKENS.code_open, goto(`code_start_${count}`))],
    },
    [`code_start_${count}`]: {
      rules: [
        match("#!", TOKENS.code_language, goto(`code_language_${count}`)),
        fallback(goto(`code_body_${count}`)),
      ],
    },
    [`code_language_${count}`]: {
      rules: [
        match([ALNUM, "-", "_", "+", "#", "."], TOKENS.code_language),
        fallback(goto(`code_body_${count}`)),
      ],
    },
    [`code_body_${count}`]: {
      rules: [
        match(LONGER_TICKS[count], TOKENS.code),
        match(ticks, TOKENS.code_close, leave()),
        fallback({ token: TOKENS.code }),
      ],
    },
  };
}

const FENCE_COUNTS = [6, 5, 4, 3];
const LONGER_TICKS: Record<number, string[]> = { 1: ["```", "``"], 2: ["```"] };
const COLONS = [8, 7, 6, 5, 4, 3, 2].map((count) => ":".repeat(count));
const HASHES = [6, 5, 4, 3, 2, 1].map((count) => "#".repeat(count));

export default define_grammar({
  name: "mdsvex",
  states: {
    main: {
      rules: [
        match("---\n---\n", TOKENS.front_matter_marker, goto("top")),
        match("---\n", TOKENS.front_matter_marker, goto("front_matter_body")),
        fallback(goto("top")),
      ],
    },

    front_matter_body: {
      rules: [
        match("\n---\n", TOKENS.front_matter_marker, goto("top")),
        match("\n---", TOKENS.front_matter_marker, goto("top")),
        fallback({ token: TOKENS.raw_front_matter }),
      ],
    },

    top: {
      rules: [
        on(["\n", "\r"]),
        keyword(["import"], goto("import_statement"), TOKENS.raw_script),
        fallback(goto("block_start")),
      ],
    },

    import_statement: {
      rules: [
        match('"', TOKENS.raw_script, goto("import_string_double")),
        match("'", TOKENS.raw_script, goto("import_string_single")),
        on("\n\n", goto("top")),
        fallback({ token: TOKENS.raw_script }),
      ],
    },

    import_string_double: {
      rules: [
        match('"', TOKENS.raw_script, goto("import_tail")),
        on("\n", goto("import_tail")),
        fallback({ token: TOKENS.raw_script }),
      ],
    },

    import_string_single: {
      rules: [
        match("'", TOKENS.raw_script, goto("import_tail")),
        on("\n", goto("import_tail")),
        fallback({ token: TOKENS.raw_script }),
      ],
    },

    import_tail: {
      rules: [
        match(";", TOKENS.raw_script),
        match("\n", TOKENS.raw_script, goto("top")),
        fallback(goto("block_start")),
      ],
    },

    // a quote or list marker stays here so the rest of the line may start any block
    block_start: {
      rules: [
        on(["\n", "\r"]),
        ...FENCE_COUNTS.map((count) =>
          match("`".repeat(count), TOKENS.code_fence, goto(`fence_info_${count}`)),
        ),
        match(
          HASHES.flatMap((hashes) => [`${hashes} `, `${hashes}\t`]),
          TOKENS.heading_marker,
          goto("heading_body"),
        ),
        match(
          HASHES.map((hashes) => `${hashes}\n`),
          TOKENS.heading_marker,
        ),
        on(["---", "***", "___"], enter("thematic_break_probe")),
        match(">", TOKENS.blockquote_marker),
        match(["- ", "* ", "+ "], TOKENS.list_marker, goto("list_item_start")),
        on(DIGIT, enter("ordered_probe")),
        on(COLONS, enter("directive_line_probe")),
        on("|", enter("table_probe")),
        on("[", enter("definition_probe")),
        on(WS),
        fallback(goto("inline_content")),
      ],
    },

    heading_body: {
      rules: [
        on("\n", goto("block_start")),
        HARD_BREAK,
        ESCAPE_RULE,
        ...INTRAWORD,
        ...line_openers("h_", "heading_word"),
        fallback({ token: TOKENS.heading }),
      ],
    },

    inline_content: {
      rules: [
        on("\n", goto("block_start")),
        HARD_BREAK,
        ESCAPE_RULE,
        ...INTRAWORD,
        ...line_openers("p_", "inline_word"),
        fallback({}),
      ],
    },

    inline_word: word_state("inline_content", undefined, ["_", "*"]),
    heading_word: word_state("heading_body", TOKENS.heading, ["_", "*"]),
    table_word: word_state("table_row", undefined, ["_", "*"]),
    under_word: word_state("under_body", TOKENS.italic, ["*"], "_"),
    star_word: word_state("star_body", TOKENS.bold, ["_"], "*"),
    strike_word: word_state("strike_body", TOKENS.strike, ["_", "*"]),
    link_word: word_state("link_text", TOKENS.link_text, ["_", "*"]),
    label_word: word_state("directive_label", TOKENS.link_text, ["_", "*"]),

    ...line_states("p_", undefined),
    ...colon_states("i_", TOKENS.italic),
    ...colon_states("b_", TOKENS.bold),
    ...colon_states("s_", TOKENS.strike),
    ...colon_states("l_", TOKENS.link_text),
    ...line_states("h_", TOKENS.heading),

    ordered_probe: {
      mode: "probe",
      fallback: "inline_content",
      rules: [
        on(DIGIT),
        on([". ", ") ", ".\t", ")\t"], goto("ordered_marker")),
        fallback(goto("inline_content")),
      ],
    },

    ordered_marker: {
      rules: [
        match(DIGIT, TOKENS.list_marker),
        match([". ", ") ", ".\t", ")\t"], TOKENS.list_marker, goto("list_item_start")),
      ],
    },

    // the rest of a task line never opens a block
    list_item_start: {
      rules: [
        match(
          ["[ ] ", "[x] ", "[X] ", "[ ]\t", "[x]\t", "[X]\t"],
          TOKENS.task_marker,
          goto("inline_content"),
        ),
        fallback(goto("block_start")),
      ],
    },

    // `***strong***` starts like a thematic break
    thematic_break_probe: {
      mode: "probe",
      fallback: "thematic_break_tail",
      rules: [
        on(["-", "*", "_", " ", "\t", "\r"]),
        on("\n", goto("thematic_break_tail")),
        fallback(goto("inline_content")),
      ],
    },

    thematic_break_tail: {
      rules: [
        match("\n", TOKENS.hr, goto("block_start")),
        match(["-", "*", "_", " ", "\t"], TOKENS.hr),
        fallback(goto("inline_content")),
      ],
    },

    table_probe: {
      mode: "probe",
      fallback: "table_delimiter",
      rules: [
        on(["-", ":", "|", " ", "\t", "\r"]),
        on("\n", goto("table_delimiter")),
        fallback(goto("table_row")),
      ],
    },

    table_delimiter: {
      rules: [
        on("\n", goto("block_start")),
        match(["-", ":", "|"], TOKENS.punctuation),
        on([" ", "\t", "\r"]),
        fallback(goto("inline_content")),
      ],
    },

    table_row: {
      rules: [
        on("\n", goto("block_start")),
        HARD_BREAK,
        ESCAPE_RULE,
        match("|", TOKENS.punctuation),
        ...line_openers("p_", "table_word"),
        fallback({}),
      ],
    },

    definition_probe: {
      mode: "probe",
      fallback: "inline_content",
      rules: [
        on(["\\]", "\\["]),
        on("]:", goto("definition_open")),
        on(["]", "\n"], goto("inline_content")),
      ],
    },

    definition_open: {
      rules: [
        match("[^", TOKENS.link_text_open, goto("footnote_definition_label")),
        match("[", TOKENS.link_text_open, goto("link_definition_label")),
      ],
    },

    footnote_definition_label: {
      rules: [
        match("]", TOKENS.link_text_close, goto("footnote_definition_colon")),
        fallback({ token: TOKENS.link_text }),
      ],
    },

    footnote_definition_colon: {
      rules: [match(":", TOKENS.punctuation, goto("block_start")), fallback(goto("block_start"))],
    },

    link_definition_label: {
      rules: [
        match("]", TOKENS.link_text_close, goto("link_definition_colon")),
        ESCAPE_RULE,
        fallback({ token: TOKENS.link_text }),
      ],
    },

    link_definition_colon: {
      rules: [
        match(":", TOKENS.punctuation, goto("link_definition_destination")),
        fallback(goto("inline_content")),
      ],
    },

    link_definition_destination: {
      rules: [
        on("\n", goto("block_start")),
        on(WS),
        ESCAPE_RULE,
        EXPRESSION,
        within('"', '"', TOKENS.url_title, { escape: "\\", multiline: false }),
        within("'", "'", TOKENS.url_title, { escape: "\\", multiline: false }),
        fallback({ token: TOKENS.url }),
      ],
    },

    under_open: {
      rules: [match("_", TOKENS.italic_open, goto("under_body"))],
    },

    under_body: {
      rules: [
        match("_|", TOKENS.italic_close, leave()),
        on([...before_word("_"), ...before_word("__")], enter("under_nested")),
        match("_", TOKENS.italic_close, leave()),
        ...body_rules(TOKENS.italic, {
          own: "_",
          word: "under_word",
          colon: "i_",
          multiline: true,
        }),
      ],
    },

    ...nested_states("under", "_", TOKENS.italic),

    star_open: {
      rules: [match("*", TOKENS.bold_open, goto("star_body"))],
    },

    star_body: {
      rules: [
        match("*|", TOKENS.bold_close, leave()),
        on("*_", enter("star_before_under")),
        on([...before_word("*"), ...before_word("**")], enter("star_nested")),
        match("*", TOKENS.bold_close, leave()),
        ...body_rules(TOKENS.bold, { own: "*", word: "star_word", colon: "b_", multiline: true }),
      ],
    },

    ...nested_states("star", "*", TOKENS.bold),

    star_before_under: {
      mode: "probe",
      fallback: "star_close",
      rules: [fallback(goto("star_close"))],
    },

    star_close: {
      rules: [match("*", TOKENS.bold_close, leave())],
    },

    strike_open: {
      rules: [match("~~", TOKENS.strike_open, goto("strike_body"))],
    },

    strike_body: {
      rules: [
        match(["~~|", "~~"], TOKENS.strike_close, leave()),
        ...body_rules(TOKENS.strike, {
          own: "~~",
          word: "strike_word",
          colon: "s_",
          multiline: true,
        }),
      ],
    },

    sub_open: {
      rules: [match("~", TOKENS.italic_open, goto("sub_body"))],
    },

    sub_body: {
      rules: [
        match("~", TOKENS.italic_close, leave()),
        on("\n", leave()),
        ESCAPE_RULE,
        fallback({ token: TOKENS.italic }),
      ],
    },

    sup_open: {
      rules: [match("^", TOKENS.italic_open, goto("sup_body"))],
    },

    sup_body: {
      rules: [
        match("^", TOKENS.italic_close, leave()),
        on("\n", leave()),
        ESCAPE_RULE,
        fallback({ token: TOKENS.italic }),
      ],
    },

    ...code_states(1),
    ...code_states(2),

    math_body: {
      rules: [
        match(["`$", "`"], TOKENS.code_close, leave()),
        on("\n", leave()),
        fallback({ token: TOKENS.code }),
      ],
    },

    bracket_open: {
      rules: [match("[", TOKENS.link_text_open, goto("link_text"))],
    },

    link_text: {
      rules: [
        match("]", TOKENS.link_text_close, goto("link_after_close")),
        ...body_rules(TOKENS.link_text, { links: false, word: "link_word", colon: "l_" }),
      ],
    },

    link_after_close: {
      rules: [
        match("(", TOKENS.url_link, goto("link_destination")),
        match("[", TOKENS.url_link, goto("link_reference_label")),
        fallback(leave()),
      ],
    },

    link_destination: {
      rules: [
        match(")", TOKENS.url_link, leave()),
        on("\n", leave()),
        ESCAPE_RULE,
        EXPRESSION,
        within('"', '"', TOKENS.url_title, { escape: "\\", multiline: false }),
        within("'", "'", TOKENS.url_title, { escape: "\\", multiline: false }),
        fallback({ token: TOKENS.url }),
      ],
    },

    link_reference_label: {
      rules: [
        match("]", TOKENS.url_link, leave()),
        on("\n", leave()),
        fallback({ token: TOKENS.property }),
      ],
    },

    footnote_label: {
      rules: [
        match("]", TOKENS.link_text_close, leave()),
        on("\n", leave()),
        fallback({ token: TOKENS.link_text }),
      ],
    },

    lt_autolink: {
      rules: [match("<", TOKENS.autolink_open, goto("autolink_body"))],
    },

    autolink_body: {
      rules: [
        match(">", TOKENS.autolink_close, leave()),
        on("\n", leave()),
        fallback({ token: TOKENS.autolink }),
      ],
    },

    entity_open: {
      rules: [match("&", TOKENS.entity, goto("entity_body"))],
    },

    entity_body: {
      rules: [match(";", TOKENS.entity, leave()), fallback({ token: TOKENS.entity })],
    },

    directive_inline: {
      rules: [match(":", TOKENS.punctuation, goto("directive_name"))],
    },

    directive_name: {
      rules: [
        match(NAME_CHARS, TOKENS.function),
        match("[", TOKENS.link_text_open, goto("directive_label")),
        fallback(leave()),
      ],
    },

    // a block directive is alone on its line, `::name some text` is a paragraph
    directive_line_probe: {
      mode: "probe",
      fallback: "directive_line",
      rules: [
        on(LETTER, enter("directive_line_probe_name")),
        on("\n", goto("directive_line")),
        on(WS, enter("directive_line_probe_tail")),
        fallback(goto("inline_content")),
      ],
    },

    directive_line_probe_name: {
      mode: "probe",
      fallback: "directive_line",
      rules: [
        on(NAME_CHARS),
        on(["[", "\n"], goto("directive_line")),
        on("(", enter("directive_line_probe_arguments")),
        on(WS, enter("directive_line_probe_tail")),
        fallback(goto("inline_content")),
      ],
    },

    directive_line_probe_arguments: {
      mode: "probe",
      fallback: "inline_content",
      rules: [on(")", enter("directive_line_probe_tail")), on("\n", goto("inline_content"))],
    },

    directive_line_probe_tail: {
      mode: "probe",
      fallback: "directive_line",
      rules: [
        on([" ", "\t", "\r"]),
        on("\n", goto("directive_line")),
        fallback(goto("inline_content")),
      ],
    },

    directive_line: {
      rules: [match(COLONS, TOKENS.punctuation, goto("directive_line_name"))],
    },

    directive_line_name: {
      rules: [match(NAME_CHARS, TOKENS.function), fallback(goto("directive_line_rest"))],
    },

    directive_line_rest: {
      rules: [
        on("\n", goto("block_start")),
        on([" ", "\t", "\r"]),
        match("[", TOKENS.link_text_open, enter("directive_label")),
        match("(", TOKENS.punctuation, enter("directive_arguments")),
        fallback(goto("inline_content")),
      ],
    },

    directive_label: {
      rules: [
        match("]", TOKENS.link_text_close, goto("directive_after_label")),
        match("[", TOKENS.link_text, enter("directive_label_bracket")),
        ...body_rules(TOKENS.link_text, {
          links: false,
          images: false,
          word: "label_word",
          colon: "l_",
        }),
      ],
    },

    directive_label_bracket: {
      rules: [
        match("]", TOKENS.link_text, leave()),
        on("\n", leave()),
        match("[", TOKENS.link_text, enter("directive_label_bracket")),
        fallback({ token: TOKENS.link_text }),
      ],
    },

    directive_after_label: {
      rules: [match("(", TOKENS.punctuation, goto("directive_arguments")), fallback(leave())],
    },

    directive_arguments: {
      rules: [
        match(")", TOKENS.punctuation, leave()),
        on("\n", leave()),
        on(WS),
        match(",", TOKENS.punctuation),
        match("=", TOKENS.operator, goto("directive_value")),
        match(NAME_CHARS, TOKENS.parameter),
        fallback(leave()),
      ],
    },

    directive_value: {
      rules: [
        match(")", TOKENS.punctuation, leave()),
        on("\n", leave()),
        on(WS),
        match(",", TOKENS.punctuation, goto("directive_arguments")),
        within('"', '"', TOKENS.string, { escape: "\\", multiline: false }),
        within("'", "'", TOKENS.string, { escape: "\\", multiline: false }),
        fallback({ token: TOKENS.string }),
      ],
    },

    ...Object.assign({}, ...FENCE_COUNTS.map(fence_states)),

    fence_close: {
      rules: [
        match("\n", TOKENS.code_fence, goto("block_start")),
        fallback({ token: TOKENS.code_fence }),
      ],
    },

    ...svelte_states,
  },
});
