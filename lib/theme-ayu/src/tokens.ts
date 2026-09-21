// palette from ayu-colors master, published as npm ayu 9.1.0-beta.0, the 9.0.0 latest tag is older
// https://github.com/ayu-theme/ayu-colors/blob/e3f44fdf2a1c83e3f183d4e8acd40c6a452dcb1c/themes/light.yaml
// https://github.com/ayu-theme/ayu-colors/blob/e3f44fdf2a1c83e3f183d4e8acd40c6a452dcb1c/themes/dark.yaml
// token mapping from vscode-ayu 1.1.12, which shiki 4 bundles unchanged as ayu-light and ayu-dark
// https://github.com/ayu-theme/vscode-ayu/blob/444ef92911cb75c3933c8003e3a7c79b6b6c914f/ayu-light.json
// https://github.com/ayu-theme/vscode-ayu/blob/444ef92911cb75c3933c8003e3a7c79b6b6c914f/ayu-dark.json
// the diff header colour is hardcoded in the vscode-ayu template, not in ayu-colors
// https://github.com/ayu-theme/vscode-ayu/blob/444ef92911cb75c3933c8003e3a7c79b6b6c914f/src/template.ts

import type { theme_palette, theme_styles } from "@twinkleplop/core/types";

const light_colours = {
  bg: "#fcfcfc",
  fg: "#5c6166",
  tag: "#55b4d4",
  func: "#eba400", // npm ayu 9.0.0 has f2a300
  entity: "#22a4e6", // npm ayu 9.0.0 has 399ee6
  string: "#86b300",
  regexp: "#4cbf99",
  markup: "#f07171",
  keyword: "#fa8532", // npm ayu 9.0.0 has ff7e33
  special: "#e59645", // npm ayu 9.0.0 has d9b077
  comment: "#adaeb1", // npm ayu 9.0.0 has 787b80 at 60 percent alpha
  constant: "#a37acc",
  operator: "#f2a191", // npm ayu 9.0.0 has ed9366
  added: "#6cbf43",
  modified: "#478acc",
  removed: "#ff7383",
  diff_header: "#c594c5",
};

const dark_colours: typeof light_colours = {
  bg: "#10141c", // shiki 3 bundles an older vscode-ayu with 0b0e14
  fg: "#bfbdb6",
  tag: "#39bae6",
  func: "#ffb454",
  entity: "#59c2ff",
  string: "#aad94c",
  regexp: "#95e6cb",
  markup: "#f07178",
  keyword: "#ff8f40",
  special: "#e6c08a", // shiki 3 has e6b673
  comment: "#5a6673", // npm ayu 9.0.0 has 99adbf at 55 percent alpha, shiki 3 has acb6bf8c
  constant: "#d2a6ff",
  operator: "#f29668",
  added: "#70bf56", // shiki 3 has 7fd962
  modified: "#73b8ff",
  removed: "#f26d78",
  diff_header: "#c594c5",
};

const palette = (c: typeof light_colours): theme_palette => ({
  background_color: c.bg, // colors.editor.background

  // universal primitives
  boolean: c.constant, // constant.language
  comment: c.comment,
  identifier: c.fg, // variable, css values render operator as support.constant
  keyword: c.keyword, // keyword and storage
  number: c.constant, // constant.numeric
  operator: c.operator, // keyword.operator
  punctuation: c.fg, // punctuation.section, vs code dims separators and tag brackets with alpha
  regex: c.regexp, // string.regexp
  string: c.string,
  template: c.string, // string.template via string

  // named entities
  attribute: c.fg, // meta.attribute.rust has no rule
  builtin: c.markup, // support.function, python builtin classes render tag as support.type
  class_name: c.entity, // entity.name.type and entity.name.class via entity.name
  constant: c.fg, // variable.other.constant via variable, rust and python constant.other render regexp
  decorator: c.special, // meta.decorator, decorator calls render func as entity.name.function
  lifetime: c.entity, // entity.name.type.lifetime.rust via entity.name
  namespace: c.entity, // entity.name.namespace via entity.name
  parameter: c.constant, // variable.parameter
  property: c.tag, // support.type.property-name, js members and toml keys render fg
  type: c.tag, // support.type primitives, user types render entity
  variable: c.fg, // variable
  variant: c.entity, // entity.name.type on rust enum variants, tuple variant calls render func
  function: c.func, // entity.name.function

  // markup in html, svelte and tsx
  attr_name: c.func, // entity.other.attribute-name
  doctype: c.tag, // entity.name.tag.html on the DOCTYPE keyword
  entity: c.regexp, // constant.character.entity via constant.character
  tag_name: c.tag, // entity.name.tag

  // css selectors and units
  css_variable: c.fg, // variable.css via variable
  selector: c.entity, // source.css entity.name.tag
  selector_class: c.func, // entity.other.attribute-name.class.css via entity.other.attribute-name
  selector_id: c.func, // entity.other.attribute-name.id.css via entity.other.attribute-name
  selector_pseudo: c.regexp, // entity.other.attribute-name.pseudo-class
  unit: c.keyword, // keyword.other.unit via keyword

  // diff
  changed: c.modified, // markup.changed
  changed_marker: c.modified, // fallback to changed
  deleted: c.removed, // markup.deleted
  deleted_marker: c.removed, // fallback to deleted
  hash: c.diff_header, // meta.diff.header
  heading: c.string, // markup.heading, diff headers render diff_header
  inserted: c.added, // markup.inserted
  inserted_marker: c.added, // fallback to inserted
  label: c.diff_header, // meta.diff.header

  // markdown content
  autolink: c.tag, // markup.underline.link
  bold: c.markup, // markup.bold
  code: c.operator, // text.html.markdown markup.inline.raw
  code_block: c.fg, // fenced code without an embedded grammar has no rule
  code_language: c.fg, // fenced_code.block.language has no rule
  italic: c.markup, // markup.italic
  link_text: c.tag, // string.other.link
  strike: c.fg, // markup.strikethrough has no rule, the markup.strike rule never matches
  url: c.tag, // markup.underline.link
  url_link: c.fg, // punctuation.definition.metadata has no rule
  url_title: c.tag, // string.other.link.description.title via string.other.link

  // markdown open and close markers
  autolink_open: c.fg, // punctuation.definition.link has no rule
  autolink_close: c.fg, // punctuation.definition.link has no rule
  bold_open: c.markup, // punctuation.definition.bold inside markup.bold
  bold_close: c.markup, // punctuation.definition.bold inside markup.bold
  code_open: c.operator, // punctuation.definition.raw inside markup.inline.raw
  code_close: c.operator, // punctuation.definition.raw inside markup.inline.raw
  italic_open: c.markup, // punctuation.definition.italic inside markup.italic
  italic_close: c.markup, // punctuation.definition.italic inside markup.italic
  link_text_open: c.fg, // punctuation.definition.link.title has no rule
  link_text_close: c.fg, // punctuation.definition.link.title has no rule
  strike_open: c.fg, // punctuation.definition.strikethrough has no rule
  strike_close: c.fg, // punctuation.definition.strikethrough has no rule

  // markdown block markers
  blockquote_marker: c.regexp, // markup.quote
  code_fence: c.comment, // punctuation.definition.markdown
  front_matter_marker: c.fg, // no front matter rule
  heading_marker: c.string, // punctuation.definition.heading inside markup.heading
  hr: c.comment, // meta.separator
  list_marker: c.func, // markup.list punctuation.definition.list.begin
  task_marker: c.fg, // task checkbox has no rule

  // markdown character level
  escape: c.regexp, // constant.character.escape via constant.character
  hard_break: c.fg, // meta.dummy.line-break never matches

  // svelte
  expression: c.keyword, // punctuation.section.embedded
  svelte_block: c.keyword, // keyword.control.svelte via keyword
  svelte_directive: c.keyword, // keyword.control.svelte via keyword, class directives render func

  // shell sessions
  output: c.fg, // meta.output has no rule
  prompt: c.fg, // punctuation.separator.prompt, vs code dims separators with alpha
  prompt_prefix: c.fg, // entity.other.prompt-prefix has no rule

  // whitespace
  carriage_return: "inherit",
  newline: "inherit",
  space: "inherit",
  tab: "inherit",

  // reclassifier placeholders
  raw_code_block: c.fg,
  raw_front_matter: c.fg,
  raw_json: c.fg,
  raw_markup: c.fg,
  raw_script: c.fg,
  raw_shell: c.fg,
  raw_style: c.fg,
  raw_svelte_expression: c.fg,

  // language unique
  string_escape: c.regexp, // constant.character.escape via constant.character
  format: c.keyword, // storage.type.format.python via storage
  attr_sigil: c.fg, // meta.attribute.rust has no rule
  bit: c.string, // sql bit literals render as string
  array_table_header: c.fg, // toml array table headers have no rule
  datetime: c.regexp, // constant.other.datetime via constant.other
  block_scalar_header: c.keyword, // keyword.control.flow.block-scalar.yaml via keyword
  directive: c.keyword, // keyword.other.directive.yaml via keyword
  doc_marker: c.fg, // entity.other.document.begin.yaml has no rule
  plain_scalar: c.string, // string.unquoted.plain.yaml via string
  tag: c.keyword, // storage.type.tag-handle.yaml via storage
  null: c.constant, // constant.language
});

export const light: theme_palette = palette(light_colours);

export const dark: theme_palette = palette(dark_colours);

// both variants share the vscode-ayu template, so their font styles match
const styles: theme_styles = {
  autolink: ["underline"], // markup.underline.link
  blockquote_marker: ["italic"], // markup.quote
  bold: ["bold"], // markup.bold
  bold_open: ["bold"], // punctuation.definition.bold inside markup.bold
  bold_close: ["bold"], // punctuation.definition.bold inside markup.bold
  comment: ["italic"], // comment
  heading: ["bold"], // markup.heading, diff headers are upright
  heading_marker: ["bold"], // punctuation.definition.heading inside markup.heading
  hr: ["bold"], // meta.separator
  italic: ["italic"], // markup.italic
  italic_open: ["italic"], // punctuation.definition.italic inside markup.italic
  italic_close: ["italic"], // punctuation.definition.italic inside markup.italic
  url: ["underline"], // markup.underline.link, http urls have no rule
};

export const light_styles: theme_styles = styles;

export const dark_styles: theme_styles = styles;
