// shell session grammar, prompt lines interleaved with output lines
//
// a line is a prompt when a prompt symbol followed by whitespace ends a valid
// prefix, the command becomes a raw_shell token that the pipeline tokenizes as bash
//
// design
//   a probe from col 0 decides prompt or output but cannot say where the symbol
//   is, so the prefix_ copy of the same node table rereads the line to find it
//   line states only goto so the stack is flat at every line start, probes
//   consume single chars with enter and those pushes vanish when the probe resolves
//   fallback goto consumes a non ascii char and never resolves a probe, so every
//   other move also gets an explicit range, the complement of what the state claims
//
// known limitations
//   output cannot be told from a prompt, so a pasted comment or a diff line reads as one
//   the zsh default prompt and path only prompts are output, a bare word prefix misfires
//   oh my zsh puts prompt text after the symbol, it becomes part of the command
//   right prompts are part of the command
//   heredoc bodies are tokenized as bash commands
//   a virtualenv glued to the next word is not recognized
//   indented prompts are output
//
// differences from the shiki grammar
//   the prompt ends at the first symbol after a valid prefix
//   a bare virtualenv and the bash default prompt are prompts
//   shell name prefixes are limited to known shells

import { DIGIT, LETTER, enter, fallback, goto, leave, match, on, range } from "@twinkleplop/core";
import type { GrammarRule, GrammarState, RangeTag } from "@twinkleplop/core";
import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

type Pattern = string | RangeTag;

// a formatter would rewrite the escape as an invisible literal
const NBSP = String.fromCharCode(0xa0);

// powerline themes put a no break space after the symbol
const WS: Pattern[] = [" ", "\t", NBSP];
const EOL: Pattern[] = ["\n", "\r"];
const WS_EOL: Pattern[] = [...WS, ...EOL];

// the greek script in the bmp, the shiki grammar accepts any greek letter as a symbol
const GREEK = range([
  [0x0370, 0x0373],
  [0x0375, 0x0377],
  [0x037a, 0x037d],
  [0x037f, 0x037f],
  [0x0384, 0x0384],
  [0x0386, 0x0386],
  [0x0388, 0x038a],
  [0x038c, 0x038c],
  [0x038e, 0x03a1],
  [0x03a3, 0x03e1],
  [0x03f0, 0x03ff],
  [0x1d26, 0x1d2a],
  [0x1d5d, 0x1d61],
  [0x1d66, 0x1d6a],
  [0x1dbf, 0x1dbf],
  [0x1f00, 0x1f15],
  [0x1f18, 0x1f1d],
  [0x1f20, 0x1f45],
  [0x1f48, 0x1f4d],
  [0x1f50, 0x1f57],
  [0x1f59, 0x1f59],
  [0x1f5b, 0x1f5b],
  [0x1f5d, 0x1f5d],
  [0x1f5f, 0x1f7d],
  [0x1f80, 0x1fb4],
  [0x1fb6, 0x1fc4],
  [0x1fc6, 0x1fd3],
  [0x1fd6, 0x1fdb],
  [0x1fdd, 0x1fef],
  [0x1ff2, 0x1ff4],
  [0x1ff6, 0x1ffe],
  [0x2126, 0x2126],
  [0xab65, 0xab65],
]);

// the two after the ascii symbols are the starship and oh my zsh ones
const SYMBOLS: Pattern[] = ["$", "#", "%", ">", "❯", "➜", GREEK];

const SEP: Pattern[] = ["@", ":"];

// the oniguruma word class the shiki grammar uses
const WORD_START: Pattern[] = [LETTER, DIGIT, "_"];

// shells whose name appears in their default prompt
const SHELL_NAMES = ["sh", "bash", "zsh", "ksh", "mksh", "dash", "ash", "fish", "csh", "tcsh"];

// the words zsh prints in PS2 for each open construct
export const ZSH_PS2_WORDS = [
  "for",
  "while",
  "repeat",
  "select",
  "until",
  "if",
  "then",
  "else",
  "elif",
  "math",
  "cond",
  "cmdor",
  "cmdand",
  "pipe",
  "errpipe",
  "foreach",
  "case",
  "function",
  "subsh",
  "cursh",
  "array",
  "quote",
  "dquote",
  "bquote",
  "cmdsubst",
  "mathsubst",
  "elif-then",
  "heredoc",
  "heredocd",
  "brace",
  "braceparam",
  "always",
];

type Pair = [number, number];

function non_ascii_pairs(patterns: Pattern[]): Pair[] {
  const out: Pair[] = [];
  for (const p of patterns) {
    if (typeof p === "string") {
      if (p.length === 1 && p.charCodeAt(0) >= 0x80) out.push([p.charCodeAt(0), p.charCodeAt(0)]);
    } else {
      for (const [a, b] of p.pairs) {
        const lo = typeof a === "string" ? a.charCodeAt(0) : a;
        const hi = typeof b === "string" ? b.charCodeAt(0) : b;
        if (hi >= 0x80) out.push([Math.max(lo, 0x80), hi]);
      }
    }
  }
  return out;
}

function non_ascii_except(claimed: Pair[]): RangeTag {
  const sorted = [...claimed].sort((x, y) => x[0] - y[0]);
  const out: Pair[] = [];
  let next = 0x80;
  for (const [lo, hi] of sorted) {
    if (lo > next) out.push([next, lo - 1]);
    next = Math.max(next, hi + 1);
  }
  if (next <= 0xffff) out.push([next, 0xffff]);
  return range(out);
}

const PROMPT = TOKENS.prompt;
const PROMPT_PREFIX = TOKENS.prompt_prefix;
const OUTPUT = TOKENS.output;
const RAW_SHELL = TOKENS.raw_shell;

const STAY = 0;
const REJECT = 1;
type Target = string | typeof STAY | typeof REJECT;

interface PrefixNode {
  /** symbols that end the prefix here when whitespace or a line end follows */
  accepts?: Pattern[];
  /** an accepted symbol followed by anything else rejects the line */
  strict?: boolean;
  /** multi char words, tried before the edges */
  words?: [string[], string][];
  /** tried in order, a line end always rejects */
  edges: [Pattern[], Target][];
  /** every char no edge names */
  other: Target;
}

const PREFIX_NODES: Record<string, PrefixNode> = {
  // strict so a doubled symbol or one glued to text is output
  start: {
    accepts: SYMBOLS,
    strict: true,
    words: [
      [SHELL_NAMES, "shell_name"],
      [ZSH_PS2_WORDS, "zsh_word"],
    ],
    edges: [
      [["("], "venv_open"],
      [["["], "bracket_open"],
      [WORD_START, "user_first"],
    ],
    other: REJECT,
  },

  venv_open: { edges: [[WS, REJECT]], other: "venv_body" },
  venv_body: {
    edges: [
      [[")"], "venv_closed"],
      [WS, REJECT],
    ],
    other: STAY,
  },
  venv_closed: {
    accepts: SYMBOLS,
    edges: [
      [[")"], STAY],
      [WS, "venv_ws"],
    ],
    other: "venv_body",
  },
  venv_ws: {
    accepts: SYMBOLS,
    strict: true,
    words: [[SHELL_NAMES, "shell_name"]],
    edges: [
      [WS, STAY],
      [["["], "bracket_open"],
      [WORD_START, "user_first"],
    ],
    other: REJECT,
  },

  shell_name: {
    accepts: SYMBOLS,
    edges: [
      [["-"], "shell_version"],
      [WS, "word1_ws_solo"],
      [SEP, "user_sep"],
    ],
    other: "user_body",
  },
  shell_version: { accepts: SYMBOLS, edges: [[WS, "word1_ws_solo"]], other: STAY },

  zsh_word: {
    accepts: [">"],
    edges: [
      [WS, "zsh_ws"],
      [SEP, "user_sep"],
    ],
    other: "user_body",
  },
  zsh_ws: { words: [[ZSH_PS2_WORDS, "zsh_word"]], edges: [[WS, STAY]], other: REJECT },

  // a word char, one more char, a separator and one more char, as in the shiki grammar
  user_first: { edges: [[WS, REJECT]], other: "user_body" },
  user_body: {
    edges: [
      [SEP, "user_sep"],
      [WS, REJECT],
    ],
    other: STAY,
  },
  user_sep: { edges: [[WS, REJECT]], other: "user_host" },
  user_host: { accepts: SYMBOLS, edges: [[WS, "word1_ws"]], other: STAY },

  // one extra word, where macos zsh and fish print the directory
  word1_ws: { accepts: SYMBOLS, edges: [[WS, STAY]], other: "word2" },
  word2: { accepts: SYMBOLS, edges: [[WS, "word2_ws"]], other: STAY },
  word2_ws: { accepts: SYMBOLS, strict: true, edges: [[WS, STAY]], other: REJECT },
  word1_ws_solo: { accepts: SYMBOLS, strict: true, edges: [[WS, STAY]], other: REJECT },

  bracket_open: { edges: [[WS, REJECT]], other: "bracket_head" },
  bracket_head: {
    edges: [
      [SEP, "bracket_sep"],
      [WS, REJECT],
    ],
    other: STAY,
  },
  bracket_sep: { edges: [], other: "bracket_body" },
  bracket_body: { edges: [[["]"], "bracket_closed"]], other: STAY },
  bracket_closed: { accepts: SYMBOLS, edges: [], other: STAY },
};

type Copy = "probe" | "prefix";
const state_name = (copy: Copy, node: string) => `${copy}_${node}`;

function probe_move(target: Target): Partial<GrammarRule> {
  if (target === STAY) return {};
  if (target === REJECT) return goto("output_line");
  return enter(state_name("probe", target));
}

/** the probe copy, decides prompt or output without emitting */
function probe_state(node: PrefixNode): GrammarState {
  const rules: GrammarRule[] = [];
  const claimed: Pair[] = [];
  const add = (patterns: Pattern[], transition: Partial<GrammarRule>) => {
    rules.push(on(patterns, transition));
    claimed.push(...non_ascii_pairs(patterns));
  };
  if (node.accepts) {
    add(node.accepts, enter(node.strict ? "probe_symbol_check_strict" : "probe_symbol_check"));
  }
  add(EOL, goto("output_line"));
  // a multi char match consumes on goto, so it needs no push
  for (const [words, target] of node.words ?? []) {
    rules.push(on(words, goto(state_name("probe", target))));
  }
  for (const [patterns, target] of node.edges) add(patterns, probe_move(target));
  // a probe skips an unmatched char, which is already STAY
  if (node.other !== STAY) {
    const move = probe_move(node.other);
    rules.push(on(non_ascii_except(claimed), move), fallback(move));
  }
  return { mode: "probe", fallback: "output_line", rules };
}

/** the tokenizing copy, rereads an accepted line and emits prompt_prefix up to the symbol */
function prefix_state(node: PrefixNode): GrammarState {
  const rules: GrammarRule[] = [];
  const claimed: Pair[] = [];
  const add = (rule: GrammarRule, patterns: Pattern[]) => {
    rules.push(rule);
    claimed.push(...non_ascii_pairs(patterns));
  };
  const edge = (patterns: Pattern[], target: Target): GrammarRule => {
    if (target === STAY) return match(patterns, PROMPT_PREFIX);
    if (target === REJECT) return on(patterns, goto("output_line"));
    return match(patterns, PROMPT_PREFIX, goto(state_name("prefix", target)));
  };
  if (node.accepts) add(on(node.accepts, enter("prefix_symbol_check")), node.accepts);
  add(on(EOL, goto("output_line")), EOL);
  for (const [words, target] of node.words ?? []) {
    rules.push(match(words, PROMPT_PREFIX, goto(state_name("prefix", target))));
  }
  for (const [patterns, target] of node.edges) add(edge(patterns, target), patterns);
  const rest = non_ascii_except(claimed);
  if (node.other === STAY) {
    rules.push(match([rest], PROMPT_PREFIX), fallback({ token: PROMPT_PREFIX }));
  } else if (node.other === REJECT) {
    rules.push(on(rest, goto("output_line")), fallback(goto("output_line")));
  } else {
    const move = goto(state_name("prefix", node.other));
    rules.push(match([rest], PROMPT_PREFIX, move), fallback({ token: PROMPT_PREFIX, ...move }));
  }
  return { rules };
}

function generate(copy: Copy): Record<string, GrammarState> {
  const states: Record<string, GrammarState> = {};
  for (const [name, node] of Object.entries(PREFIX_NODES)) {
    states[state_name(copy, name)] = copy === "probe" ? probe_state(node) : prefix_state(node);
  }
  return states;
}

const NOT_WS_EOL = non_ascii_except(non_ascii_pairs(WS_EOL));

export default define_grammar({
  name: "shellsession",
  states: {
    // opens the line probe without consuming, so it reads from col 0
    line_start: {
      rules: [
        on(EOL),
        on(non_ascii_except([]), goto("probe_start")),
        fallback(goto("probe_start")),
      ],
    },

    output_line: {
      rules: [on("\n", goto("line_start")), on("\r"), fallback({ token: OUTPUT })],
    },

    ...generate("probe"),

    // any other char returns to the node without consuming it
    probe_symbol_check: {
      mode: "probe",
      fallback: "prefix_start",
      rules: [on(WS_EOL, goto("prefix_start")), on(NOT_WS_EOL, leave()), fallback(leave())],
    },
    probe_symbol_check_strict: {
      mode: "probe",
      fallback: "prefix_start",
      rules: [
        on(WS_EOL, goto("prefix_start")),
        on(NOT_WS_EOL, goto("output_line")),
        fallback(goto("output_line")),
      ],
    },

    ...generate("prefix"),

    // both exits rewind to the symbol, enter keeps the node so prompt_text_symbol can return
    prefix_symbol_check: {
      mode: "probe",
      fallback: "prompt_symbol",
      rules: [
        on(WS_EOL, goto("prompt_symbol")),
        on(NOT_WS_EOL, enter("prompt_text_symbol")),
        fallback(enter("prompt_text_symbol")),
      ],
    },
    prompt_symbol: {
      rules: [match(SYMBOLS, PROMPT, goto("gap")), fallback(goto("gap"))],
    },
    prompt_text_symbol: {
      rules: [match(SYMBOLS, PROMPT_PREFIX, leave()), fallback(leave())],
    },

    gap: {
      rules: [
        on([...WS, "\r"]),
        on("\n", goto("line_start")),
        on(NOT_WS_EOL, goto("command")),
        fallback(goto("command")),
      ],
    },

    command: {
      rules: [on("\n", goto("line_start")), on("\r"), fallback({ token: RAW_SHELL })],
    },
  },
});
