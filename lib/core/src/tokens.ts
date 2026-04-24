// Canonical catalogue of every token type any grammar in this repo emits.
//
// Themes should validate their CSS class selectors against this file; if a
// theme styles a class name that does not appear here, it is a stale entry.
// Grammars should import from `@twinkleplop/core/tokens` so that renames and
// additions remain a single-file edit.
//
// Usage:
//
//   import * as TOKENS from "@twinkleplop/core/tokens";
//   match("if", TOKENS.keyword)
//
// Reserved-word exports (`function`, `null`) go through the string-literal
// export syntax so `TOKENS.function` / `TOKENS["null"]` both work.
//
// See /languages/TOKENS.md for how these are distributed across grammars.

// ---------------------------------------------------------------------------
// universal primitives — appear in most languages
// ---------------------------------------------------------------------------

export const boolean = "boolean";
export const comment = "comment";
export const identifier = "identifier";
export const keyword = "keyword";
export const number = "number";
export const operator = "operator";
export const punctuation = "punctuation";
export const regex = "regex";
export const string = "string";
export const template = "template";

// ---------------------------------------------------------------------------
// named entities — callable/typed references across languages
// ---------------------------------------------------------------------------

export const attribute = "attribute";
export const builtin = "builtin";
export const class_name = "class_name";
export const constant = "constant";
export const decorator = "decorator";
export const lifetime = "lifetime";
export const namespace = "namespace";
export const parameter = "parameter";
export const property = "property";
export const type = "type";
export const variable = "variable";
export const variant = "variant";

const fn = "function";
export { fn as "function" };

// ---------------------------------------------------------------------------
// markup (html, svelte, tsx)
// ---------------------------------------------------------------------------

export const attr_name = "attr_name";
export const doctype = "doctype";
export const entity = "entity";
export const tag_name = "tag_name";

// ---------------------------------------------------------------------------
// css selectors + units
// ---------------------------------------------------------------------------

export const css_variable = "css_variable";
export const selector = "selector";
export const selector_class = "selector_class";
export const selector_id = "selector_id";
export const selector_pseudo = "selector_pseudo";
export const unit = "unit";

// ---------------------------------------------------------------------------
// diff
// ---------------------------------------------------------------------------

export const changed = "changed";
export const changed_marker = "changed_marker";
export const deleted = "deleted";
export const deleted_marker = "deleted_marker";
export const hash = "hash";
export const heading = "heading";
export const inserted = "inserted";
export const inserted_marker = "inserted_marker";
export const label = "label";

// ---------------------------------------------------------------------------
// markdown
// ---------------------------------------------------------------------------

// content types
export const autolink = "autolink";
export const bold = "bold";
export const code = "code";
export const code_block = "code_block";
export const code_language = "code_language";
export const italic = "italic";
export const link_text = "link_text";
export const strike = "strike";
export const url = "url";
export const url_link = "url_link";
export const url_title = "url_title";

// composition markers (open/close pairs consumed by the markdown reclassifier)
export const autolink_close = "autolink_close";
export const autolink_open = "autolink_open";
export const bold_close = "bold_close";
export const bold_open = "bold_open";
export const code_close = "code_close";
export const code_open = "code_open";
export const italic_close = "italic_close";
export const italic_open = "italic_open";
export const link_text_close = "link_text_close";
export const link_text_open = "link_text_open";
export const strike_close = "strike_close";
export const strike_open = "strike_open";

// block markers
export const blockquote_marker = "blockquote_marker";
export const code_fence = "code_fence";
export const front_matter_marker = "front_matter_marker";
export const heading_marker = "heading_marker";
export const hr = "hr";
export const list_marker = "list_marker";
export const task_marker = "task_marker";

// character-level
export const escape = "escape";
export const hard_break = "hard_break";

// ---------------------------------------------------------------------------
// svelte
// ---------------------------------------------------------------------------

export const expression = "expression";
export const svelte_block = "svelte_block";
export const svelte_directive = "svelte_directive";

// ---------------------------------------------------------------------------
// whitespace
// ---------------------------------------------------------------------------

export const carriage_return = "carriage_return";
export const newline = "newline";
export const space = "space";
export const tab = "tab";

// ---------------------------------------------------------------------------
// raw containers — sub-grammar placeholders, rewritten by reclassifiers.
// listed here so themes can at least see them for completeness; a theme that
// styles them will only see their output if the reclassifier is disabled.
// ---------------------------------------------------------------------------

export const raw_code_block = "raw_code_block";
export const raw_front_matter = "raw_front_matter";
export const raw_script = "raw_script";
export const raw_style = "raw_style";
export const raw_svelte_expression = "raw_svelte_expression";

// ---------------------------------------------------------------------------
// language-unique
// ---------------------------------------------------------------------------

// bash
export const string_escape = "string_escape";

// python
export const format = "format";

// rust
export const attr_sigil = "attr_sigil";

// sql
export const bit = "bit";

// toml
export const array_table_header = "array_table_header";
export const datetime = "datetime";

// yaml
export const block_scalar_header = "block_scalar_header";
export const directive = "directive";
export const doc_marker = "doc_marker";
export const plain_scalar = "plain_scalar";
export const tag = "tag";

const null_ = "null";
export { null_ as "null" };
