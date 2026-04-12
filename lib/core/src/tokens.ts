// Standard token names. Import as a namespace:
//
//   import * as TOKENS from "@twinkleplop/core/tokens";
//   match("if", TOKENS.keyword)
//
// Custom tokens can still be passed as plain strings to any helper that accepts a token.

export const boolean = "boolean";
export const comment = "comment";
export const identifier = "identifier";
export const keyword = "keyword";
export const number = "number";
export const operator = "operator";
export const property = "property";
export const punctuation = "punctuation";
export const regex = "regex";
export const selector = "selector";
export const string = "string";
export const template = "template";

// CSS-ish extras
export const attribute = "attribute";
export const class_name = "class_name";
export const css_var = "css_var";
export const id = "id";
export const pseudo = "pseudo";
export const unit = "unit";

// `function` is a reserved word, so it can't be a bare export name — but
// dot-access and string-keyed imports both accept it via the literal-name
// export syntax. `TOKENS.function` and `TOKENS["function"]` both resolve here.
const fn = "function";
export { fn as "function" };
