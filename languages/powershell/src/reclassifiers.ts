import { compile_word_table, tag, word_table_get } from "@twinkleplop/core";
import type { LanguagePipeline, Reclassifier } from "@twinkleplop/core";
import * as TOKENS from "@twinkleplop/core/tokens";

// case folding avoids enumerating every casing of long keywords
const KEYWORDS = compile_word_table(
  [
    [
      "elseif",
      "if",
      "else",
      "switch",
      "foreach",
      "from",
      "in",
      "for",
      "while",
      "until",
      "do",
      "try",
      "catch",
      "finally",
      "trap",
      "data",
      "return",
      "continue",
      "break",
      "exit",
      "throw",
      "begin",
      "process",
      "end",
      "dynamicparam",
      "function",
      "filter",
      "param",
      "class",
      "define",
      "var",
      "using",
      "workflow",
      "parallel",
      "sequence",
      "inlinescript",
      "configuration",
      "public",
      "private",
      "static",
      "interface",
      "enum",
      "namespace",
      "module",
      "type",
      "assembly",
      "command",
      "hidden",
      "base",
      "default",
      "clean",
    ],
  ],
  { fold: true },
);
const OPERATORS = compile_word_table(
  [
    [
      "bnot",
      "not",
      "eq",
      "ieq",
      "ceq",
      "ne",
      "ine",
      "cne",
      "ge",
      "ige",
      "cge",
      "gt",
      "igt",
      "cgt",
      "lt",
      "ilt",
      "clt",
      "le",
      "ile",
      "cle",
      "like",
      "ilike",
      "clike",
      "notlike",
      "inotlike",
      "cnotlike",
      "match",
      "imatch",
      "cmatch",
      "notmatch",
      "inotmatch",
      "cnotmatch",
      "replace",
      "ireplace",
      "creplace",
      "contains",
      "icontains",
      "ccontains",
      "notcontains",
      "inotcontains",
      "cnotcontains",
      "in",
      "iin",
      "cin",
      "notin",
      "inotin",
      "cnotin",
      "split",
      "isplit",
      "csplit",
      "isnot",
      "is",
      "as",
      "f",
      "and",
      "band",
      "or",
      "bor",
      "xor",
      "bxor",
      "join",
      "shl",
      "shr",
    ],
  ],
  { fold: true },
);
const VALUES = compile_word_table([["$true", "$false"], ["$null"]], { fold: true });

const classify_words: Reclassifier = (input, result) => {
  const tokens = result.tokens.slice();
  const token_types = result.token_types.slice();
  const id = (name: string) => {
    const found = token_types.indexOf(name);
    if (found !== -1) return found;
    token_types.push(name);
    return token_types.length - 1;
  };
  const keyword_id = id(TOKENS.keyword);
  const boolean_id = id(TOKENS.boolean);
  const operator_id = id(TOKENS.operator);
  const function_id = id(TOKENS.function);
  let declaration = false;
  for (let i = 0; i < tokens.length; i += 3) {
    const type = token_types[tokens[i]];
    const start = tokens[i + 1];
    const end = tokens[i + 2];
    if (type === TOKENS.comment) continue;
    if (type === TOKENS.identifier) {
      if (declaration) {
        tokens[i] = function_id;
      } else if (word_table_get(KEYWORDS, input, start, end)) {
        tokens[i] = keyword_id;
        const word = input.slice(start, end).toLowerCase();
        declaration = word === "function" || word === "filter";
        continue;
      }
    } else if (type === TOKENS.parameter && word_table_get(OPERATORS, input, start + 1, end)) {
      tokens[i] = operator_id;
    } else if (type === TOKENS.variable) {
      const value = word_table_get(VALUES, input, start, end);
      if (value) tokens[i] = value === 1 ? boolean_id : keyword_id;
    }
    declaration = false;
  }
  return { ...result, tokens, token_types };
};

export const reclassifiers: LanguagePipeline = [
  tag(classify_words, [TOKENS.keyword, TOKENS.boolean, TOKENS.operator, TOKENS.function]),
];
