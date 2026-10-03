/*
 * scope, graphql executable documents and schema definitions
 * limitations, malformed literals retain their styling without validation
 * descriptions omit markdown highlighting and schema coordinates are unsupported
 * ordinary strings recover at newlines, unfinished block strings extend to eof
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
  type GrammarRule,
  type GrammarState,
} from "@twinkleplop/core";
import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

const START = ["_", LETTER];
const CONTINUE = ["_", ALNUM];
const IGNORED = [
  on([" ", "\t", "\r", "\n", "\uFEFF"]),
  match(",", TOKENS.punctuation),
  match("#", TOKENS.comment, enter("comment")),
];
const STRINGS = [
  match('"""', TOKENS.string, enter("block_string")),
  match('"', TOKENS.string, enter("string")),
];
const DIRECTIVE = match("@", TOKENS.decorator, enter("directive"));
const PROPERTY = match(START, TOKENS.property, enter("property"));
const IDENTIFIER = match(START, TOKENS.identifier, enter("identifier"));
const PARAMETER = match("$", TOKENS.parameter, enter("parameter_start"));
const TYPED_FIELDS = [
  ...IGNORED,
  ...STRINGS,
  DIRECTIVE,
  PARAMETER,
  PROPERTY,
  match(":", TOKENS.punctuation, enter("type_reference")),
  match("=", TOKENS.operator, enter("value")),
];

const name_body = (token: string, after: Partial<GrammarRule> = leave()): GrammarState => ({
  rules: [match(CONTINUE, token), fallback(after)],
});

const named = (state: string, token: string, after: string): Record<string, GrammarState> => ({
  [state]: {
    rules: [...IGNORED, match(START, token, goto(`${state}_body`)), fallback(leave())],
  },
  [`${state}_body`]: name_body(token, goto(after)),
});

const header = (body: string, extra: GrammarRule[] = []): GrammarState => ({
  rules: [
    ...IGNORED,
    DIRECTIVE,
    ...extra,
    match("{", TOKENS.punctuation, goto(body)),
    fallback(leave()),
  ],
});

// declarations without bodies end at the next definition
const name_list = (
  state: string,
  separator: string,
  token: string,
): Record<string, GrammarState> => ({
  [state]: {
    rules: [
      ...IGNORED,
      match(separator, TOKENS.operator),
      match(START, token, goto(`${state}_body`)),
      fallback(leave()),
    ],
  },
  [`${state}_body`]: name_body(token, goto(`${state}_after`)),
  [`${state}_after`]: {
    rules: [...IGNORED, match(separator, TOKENS.operator, goto(state)), fallback(leave())],
  },
});

const values = (nested: boolean): GrammarRule[] => {
  const transition = nested ? enter : goto;
  return [
    match('"""', TOKENS.string, transition("block_string")),
    match('"', TOKENS.string, transition("string")),
    match("[", TOKENS.punctuation, transition("list")),
    match("{", TOKENS.punctuation, transition("object")),
    match("$", TOKENS.variable, transition("variable_start")),
    keyword(["true", "false"], nested ? {} : leave(), TOKENS.boolean),
    keyword(["null"], nested ? {} : leave(), TOKENS.null),
    // graphql treats dollar as a name boundary unlike the shared keyword matcher
    on(["true", "false", "null"], transition(nested ? "list_literal_probe" : "literal_probe")),
    match(START, TOKENS.constant, transition("constant")),
    match("-", TOKENS.number, transition("negative_number")),
    match(DIGIT, TOKENS.number, transition("number")),
  ];
};

const literal_probe = (nested: boolean): GrammarState => {
  const transition = nested ? enter : goto;
  return {
    mode: "probe",
    fallback: "literal",
    rules: [on(CONTINUE, transition("constant")), fallback(transition("literal"))],
  };
};

export default define_grammar({
  name: "graphql",
  states: {
    main: {
      rules: [
        ...IGNORED,
        ...STRINGS,
        keyword(["query", "mutation", "subscription"], enter("operation_header")),
        keyword(["fragment"], enter("fragment_name")),
        keyword(["type", "interface", "input"], enter("definition_name")),
        keyword(["enum"], enter("enum_name")),
        keyword(["union"], enter("union_name")),
        keyword(["scalar"], enter("scalar_name")),
        keyword(["schema"], enter("schema_header")),
        keyword(["directive"], enter("directive_definition")),
        keyword(["extend"]),
        match("{", TOKENS.punctuation, enter("selection")),
        IDENTIFIER,
      ],
    },
    operation_header: {
      rules: [
        ...IGNORED,
        match(START, TOKENS.function, enter("operation_name")),
        DIRECTIVE,
        match("(", TOKENS.punctuation, enter("definitions")),
        match("{", TOKENS.punctuation, goto("selection")),
        fallback(leave()),
      ],
    },
    ...named("fragment_name", TOKENS.identifier, "fragment_header"),
    fragment_header: {
      rules: [
        ...IGNORED,
        keyword(["on"], enter("named_type")),
        DIRECTIVE,
        match("{", TOKENS.punctuation, goto("selection")),
        fallback(leave()),
      ],
    },
    selection: {
      rules: [
        ...IGNORED,
        PROPERTY,
        DIRECTIVE,
        match("...", TOKENS.operator, enter("spread")),
        match("(", TOKENS.punctuation, enter("arguments")),
        match("{", TOKENS.punctuation, enter("selection")),
        match("}", TOKENS.punctuation, leave()),
        match(":", TOKENS.punctuation),
      ],
    },
    spread: {
      rules: [
        ...IGNORED,
        keyword(["on"], goto("named_type")),
        match(START, TOKENS.identifier, goto("identifier")),
        fallback(leave()),
      ],
    },
    arguments: {
      rules: [
        ...IGNORED,
        PROPERTY,
        match(":", TOKENS.punctuation, enter("value")),
        match(")", TOKENS.punctuation, leave()),
        on("}", leave()),
      ],
    },
    object: {
      rules: [
        ...IGNORED,
        PROPERTY,
        match(":", TOKENS.punctuation, enter("value")),
        match("}", TOKENS.punctuation, leave()),
        on([")", "]"], leave()),
      ],
    },
    value: { rules: [...IGNORED, ...values(false), fallback(leave())] },
    list: {
      rules: [
        ...IGNORED,
        match("]", TOKENS.punctuation, leave()),
        on(["}", ")"], leave()),
        ...values(true),
      ],
    },
    definitions: {
      rules: [...TYPED_FIELDS, match(")", TOKENS.punctuation, leave()), on("}", leave())],
    },
    fields: {
      rules: [
        ...TYPED_FIELDS,
        match("(", TOKENS.punctuation, enter("definitions")),
        match("}", TOKENS.punctuation, leave()),
      ],
    },
    type_reference: {
      rules: [
        ...IGNORED,
        match("[", TOKENS.punctuation, goto("list_type")),
        match(START, TOKENS.type, goto("type_name")),
        fallback(leave()),
      ],
    },
    type_name: name_body(TOKENS.type, goto("type_suffix")),
    type_suffix: {
      rules: [...IGNORED, match("!", TOKENS.operator, leave()), fallback(leave())],
    },
    list_type: {
      rules: [
        ...IGNORED,
        match("]", TOKENS.punctuation, goto("type_suffix")),
        match("[", TOKENS.punctuation, enter("list_type")),
        match(START, TOKENS.type, enter("type_name")),
        fallback(leave()),
      ],
    },
    named_type: {
      rules: [...IGNORED, match(START, TOKENS.type, goto("type")), fallback(leave())],
    },
    ...named("definition_name", TOKENS.type, "type_header"),
    type_header: header("fields", [keyword(["implements"], enter("interfaces"))]),
    ...name_list("interfaces", "&", TOKENS.type),
    ...named("enum_name", TOKENS.type, "enum_header"),
    enum_header: header("enum_values"),
    enum_values: {
      rules: [
        ...IGNORED,
        ...STRINGS,
        DIRECTIVE,
        match(START, TOKENS.constant, enter("constant")),
        match("}", TOKENS.punctuation, leave()),
      ],
    },
    ...named("union_name", TOKENS.type, "union_header"),
    union_header: {
      rules: [
        ...IGNORED,
        DIRECTIVE,
        match("=", TOKENS.operator, goto("union_members")),
        fallback(leave()),
      ],
    },
    ...name_list("union_members", "|", TOKENS.type),
    ...named("scalar_name", TOKENS.type, "scalar_header"),
    scalar_header: { rules: [...IGNORED, DIRECTIVE, fallback(leave())] },
    schema_header: header("schema_fields"),
    schema_fields: {
      rules: [
        ...IGNORED,
        keyword(["query", "mutation", "subscription"]),
        match(":", TOKENS.punctuation, enter("named_type")),
        match("}", TOKENS.punctuation, leave()),
        PROPERTY,
      ],
    },
    directive_definition: {
      rules: [
        ...IGNORED,
        match("@", TOKENS.decorator, enter("directive_definition_name")),
        match("(", TOKENS.punctuation, enter("definitions")),
        keyword(["repeatable"]),
        keyword(["on"], goto("directive_locations")),
        fallback(leave()),
      ],
    },
    directive_definition_name: {
      rules: [...IGNORED, match(START, TOKENS.decorator, goto("decorator")), fallback(leave())],
    },
    ...name_list("directive_locations", "|", TOKENS.constant),
    ...named("directive", TOKENS.decorator, "directive_tail"),
    directive_tail: {
      rules: [...IGNORED, match("(", TOKENS.punctuation, goto("arguments")), fallback(leave())],
    },
    variable_start: {
      rules: [...IGNORED, match(START, TOKENS.variable, goto("variable")), fallback(leave())],
    },
    parameter_start: {
      rules: [...IGNORED, match(START, TOKENS.parameter, goto("parameter")), fallback(leave())],
    },
    operation_name: name_body(TOKENS.function),
    parameter: name_body(TOKENS.parameter),
    identifier: name_body(TOKENS.identifier),
    property: name_body(TOKENS.property),
    constant: name_body(TOKENS.constant),
    type: name_body(TOKENS.type),
    decorator: name_body(TOKENS.decorator),
    variable: name_body(TOKENS.variable),
    comment: {
      rules: [on(["\r", "\n"], leave()), fallback({ token: TOKENS.comment })],
    },
    string: {
      rules: [
        match('"', TOKENS.string, leave()),
        match("\\", TOKENS.string, enter("string_escape")),
        on(["\r", "\n"], leave()),
        fallback({ token: TOKENS.string }),
      ],
    },
    string_escape: {
      rules: [on(["\r", "\n"], leave()), fallback({ token: TOKENS.string, ...leave() })],
    },
    block_string: {
      rules: [
        match('\\"""', TOKENS.string),
        match('"""', TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },
    literal_probe: literal_probe(false),
    list_literal_probe: literal_probe(true),
    literal: {
      rules: [
        match(["true", "false"], TOKENS.boolean, leave()),
        match("null", TOKENS.null, leave()),
      ],
    },
    negative_number: {
      rules: [match(DIGIT, TOKENS.number, goto("number")), fallback(leave())],
    },
    number: {
      rules: [
        match(DIGIT, TOKENS.number),
        match(".", TOKENS.number, goto("fraction")),
        match(["e", "E"], TOKENS.number, goto("exponent_sign")),
        fallback(leave()),
      ],
    },
    fraction: {
      rules: [
        match(DIGIT, TOKENS.number),
        match(["e", "E"], TOKENS.number, goto("exponent_sign")),
        fallback(leave()),
      ],
    },
    exponent_sign: {
      rules: [
        match(["+", "-"], TOKENS.number, goto("exponent")),
        match(DIGIT, TOKENS.number, goto("exponent")),
        fallback(leave()),
      ],
    },
    exponent: { rules: [match(DIGIT, TOKENS.number), fallback(leave())] },
  },
});
