// palette from https://github.com/altercation/solarized/blob/master/README.md
// token mapping from the vs code solarized themes, which shiki bundles as solarized-dark and solarized-light
// https://github.com/microsoft/vscode/blob/main/extensions/theme-solarized-dark/themes/solarized-dark-color-theme.json
// https://github.com/microsoft/vscode/blob/main/extensions/theme-solarized-light/themes/solarized-light-color-theme.json

import type { theme_palette, theme_styles } from "@twinkleplop/core/types";

const base03 = "#002b36";
const base01 = "#586e75";
const base00 = "#657b83";
const base0 = "#839496";
const base1 = "#93a1a1";
const base3 = "#fdf6e3";
const yellow = "#b58900";
const orange = "#cb4b16";
const red = "#dc322f";
const magenta = "#d33682";
const blue = "#268bd2";
const cyan = "#2aa198";
const green = "#859900";

const palette = (
  background_color: string,
  fg: string,
  comment: string,
  storage: string,
): theme_palette => ({
  background_color, // colors.editor.background

  // universal primitives
  boolean: yellow, // constant.language
  comment,
  identifier: blue, // variable.other.readwrite, css values and python names render fg
  keyword: green, // keyword, vs code gives storage.type the storage colour but twinkleplop has one keyword type
  number: magenta, // constant.numeric
  operator: green, // keyword.operator
  punctuation: fg, // no punctuation rule
  regex: red, // string.regexp
  string: cyan,
  template: cyan, // string.template via string

  // named entities
  attribute: fg, // meta.attribute.rust has no rule
  builtin: blue, // support.function, python builtin classes render green as support.class
  class_name: orange, // entity.name.class and entity.name.type
  constant: blue, // variable.other.constant, rust and python constant.other render orange
  decorator: blue, // entity.name.function.decorator via entity.name.function
  lifetime: orange, // entity.name.type.lifetime.rust via entity.name.type
  namespace: orange, // entity.name.namespace
  parameter: fg, // variable.parameter sets no colour
  property: green, // support.type.property-name in css and json, yaml and toml keys render blue, js members fg
  type: green, // support.type primitives, user types are class_name
  variable: blue, // variable.other, sql variables render fg
  variant: orange, // entity.name.type on rust enum variants
  function: blue, // entity.name.function

  // markup in html, svelte and tsx
  attr_name: base1, // entity.other.attribute-name, base1 in both themes
  doctype: blue, // entity.name.tag.html on the DOCTYPE keyword
  entity: orange, // constant.character.entity via constant.character
  tag_name: blue, // entity.name.tag

  // css selectors and units
  css_variable: fg, // variable.css has no rule
  selector: blue, // entity.name.tag.css
  selector_class: base1, // entity.other.attribute-name.class.css
  selector_id: base1, // entity.other.attribute-name.id.css
  selector_pseudo: base1, // entity.other.attribute-name.pseudo-class.css
  unit: green, // keyword.other.unit via keyword

  // diff
  changed: orange, // markup.changed
  changed_marker: orange, // fallback to changed
  deleted: red, // markup.deleted
  deleted_marker: red, // fallback to deleted
  hash: blue, // meta.diff.header
  heading: blue, // markup.heading and meta.diff.header
  inserted: green, // markup.inserted
  inserted_marker: green, // fallback to inserted
  label: blue, // meta.diff.header

  // markdown content
  autolink: fg, // markup.underline.link has no rule
  bold: magenta, // markup.bold
  code: cyan, // markup.inline.raw
  code_block: fg, // fenced code without an embedded grammar has no rule
  code_language: fg, // fenced_code.block.language has no rule
  italic: magenta, // markup.italic
  link_text: cyan, // string.other.link.title
  strike: fg, // markup.strikethrough sets font style only
  url: fg, // markup.underline.link has no rule
  url_link: fg, // punctuation.definition.metadata has no rule
  url_title: cyan, // string.other.link.description.title via string

  // markdown open and close markers
  autolink_open: fg, // fallback to autolink
  autolink_close: fg, // fallback to autolink
  bold_open: magenta, // punctuation.definition.bold inside markup.bold
  bold_close: magenta, // punctuation.definition.bold inside markup.bold
  code_open: cyan, // punctuation.definition.raw inside markup.inline.raw
  code_close: cyan, // punctuation.definition.raw inside markup.inline.raw
  italic_open: magenta, // punctuation.definition.italic inside markup.italic
  italic_close: magenta, // punctuation.definition.italic inside markup.italic
  link_text_open: fg, // punctuation.definition.link.title has no rule
  link_text_close: fg, // punctuation.definition.link.title has no rule
  strike_open: fg, // fallback to strike
  strike_close: fg, // fallback to strike

  // markdown block markers
  blockquote_marker: green, // markup.quote
  code_fence: fg, // fence punctuation has no rule
  front_matter_marker: fg, // no front matter rule
  heading_marker: blue, // punctuation.definition.heading inside markup.heading
  hr: fg, // meta.separator has no rule
  list_marker: yellow, // punctuation.definition.list_item via markup.list
  task_marker: yellow, // task checkbox inside markup.list

  // markdown character level
  escape: orange, // constant.character.escape via constant.character
  hard_break: fg, // no hard break rule

  // svelte
  expression: red, // punctuation.section.embedded.begin and end
  svelte_block: green, // keyword.control.svelte via keyword
  svelte_directive: green, // keyword.control.svelte via keyword, the directive name renders base1

  // whitespace
  carriage_return: "inherit",
  newline: "inherit",
  space: "inherit",
  tab: "inherit",

  // reclassifier placeholders
  raw_code_block: fg,
  raw_front_matter: fg,
  raw_json: fg,
  raw_markup: fg,
  raw_script: fg,
  raw_shell: fg,
  raw_style: fg,
  raw_svelte_expression: fg,

  // language unique
  string_escape: orange, // constant.character.escape via constant.character
  format: storage, // storage.type.format.python via storage
  attr_sigil: fg, // meta.attribute.rust has no rule
  output: fg, // meta.output.shell-session has no rule
  prompt: fg, // punctuation.separator.prompt.shell-session has no rule
  prompt_prefix: fg, // entity.other.prompt-prefix.shell-session has no rule
  bit: cyan, // sql bit literals render as string
  array_table_header: fg, // toml array table headers have no rule
  datetime: orange, // constant.other.datetime via constant.other
  block_scalar_header: green, // keyword.control.flow.block-scalar.yaml via keyword
  directive: green, // keyword.other.directive.yaml via keyword
  doc_marker: fg, // entity.other.document.begin.yaml has no rule
  plain_scalar: cyan, // string.unquoted.plain.yaml via string
  tag: storage, // storage.type.tag-handle.yaml via storage
  null: yellow, // constant.language
});

export const light: theme_palette = palette(base3, base00, base1, base01);

export const dark: theme_palette = palette(base03, base0, base01, base1);

// keyword has no entry, upstream bolds storage keywords like const but not if
const styles: theme_styles = {
  bold: ["bold"], // markup.bold
  comment: ["italic"], // comment
  format: ["bold"], // storage.type.format.python via storage
  hash: ["italic"], // meta.diff.index via meta.diff
  heading: ["bold"], // markup.heading, diff file headers are italic upstream
  heading_marker: ["bold"], // markup.heading
  italic: ["italic"], // markup.italic
  strike: ["strikethrough"], // markup.strikethrough
};

export const light_styles: theme_styles = styles;

export const dark_styles: theme_styles = styles;
