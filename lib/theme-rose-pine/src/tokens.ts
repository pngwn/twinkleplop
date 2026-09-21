// palette from rose-pine/palette at 92af52b, main is rose pine and dawn is rose pine dawn
// https://github.com/rose-pine/palette/blob/92af52b465ab6e47437aca223c9b8d3009a2023b/dist/index.js
// https://github.com/rose-pine/palette/blob/92af52b465ab6e47437aca223c9b8d3009a2023b/dist/css/rose-pine.css
// token mapping from rose-pine/vscode at d8f5ebe, which shiki bundles as rose-pine and rose-pine-dawn
// https://github.com/rose-pine/vscode/blob/d8f5ebe8e096fa833e997c07eb7685ee1677a4ba/themes/rose-pine-color-theme.json
// https://github.com/rose-pine/vscode/blob/d8f5ebe8e096fa833e997c07eb7685ee1677a4ba/themes/rose-pine-dawn-color-theme.json

import type { theme_palette } from "@twinkleplop/core/types";

interface roles {
  base: string;
  muted: string;
  subtle: string;
  text: string;
  love: string;
  gold: string;
  rose: string;
  pine: string;
  foam: string;
  iris: string;
}

const main: roles = {
  base: "#191724",
  muted: "#6e6a86",
  subtle: "#908caa",
  text: "#e0def4",
  love: "#eb6f92",
  gold: "#f6c177",
  rose: "#ebbcba",
  pine: "#31748f",
  foam: "#9ccfd8",
  iris: "#c4a7e7",
};

const dawn: roles = {
  base: "#faf4ed",
  muted: "#9893a5",
  subtle: "#797593",
  text: "#575279", // dist/json/rose-pine-hex.json has #464261, index.js, the css and vs code agree on this
  love: "#b4637a",
  gold: "#ea9d34",
  rose: "#d7827e",
  pine: "#286983",
  foam: "#56949f",
  iris: "#907aa9",
};

const palette = ({
  base,
  muted,
  subtle,
  text,
  love,
  gold,
  rose,
  pine,
  foam,
  iris,
}: roles): theme_palette => ({
  background_color: base, // colors.editor.background

  // universal primitives
  boolean: rose, // constant.language
  comment: muted,
  identifier: text, // variable.other.readwrite, css values render gold as support.constant
  keyword: pine, // keyword and storage.type
  number: rose, // constant.numeric, css hex colours render pine as constant.other
  operator: pine, // keyword.operator via keyword, toml and yaml separators render subtle
  punctuation: subtle, // punctuation, tag brackets render muted and braces text
  regex: gold, // string.regexp via string, character classes render pine
  string: gold,
  template: gold, // string.template via string

  // named entities
  attribute: text, // meta.attribute.rust has no rule
  builtin: love, // support.function, python builtin types render foam as support
  class_name: foam, // entity.name.type
  constant: text, // variable.other.constant via variable.other, python caps constants render pine
  decorator: rose, // entity.name.function via entity.name
  lifetime: foam, // entity.name.type.lifetime.rust via entity.name.type
  namespace: foam, // entity.name.namespace, js import aliases render text
  parameter: iris, // variable.parameter
  property: foam, // support.type.property-name and yaml keys, js keys render text and ts fields rose
  type: foam, // support.type and entity.name.type
  variable: text, // variable.other
  variant: foam, // entity.name.type on rust enum variants
  function: rose, // entity.name.function via entity.name

  // markup in html, svelte and tsx
  attr_name: iris, // entity.other.attribute-name
  doctype: foam, // entity.name.tag.html on the doctype keyword
  entity: pine, // constant.character.entity via constant
  tag_name: foam, // entity.name.tag

  // css selectors and units
  css_variable: rose, // variable.css via variable, var function arguments render text
  selector: foam, // entity.name.tag.css
  selector_class: iris, // entity.other.attribute-name.class.css
  selector_id: iris, // entity.other.attribute-name.id.css
  selector_pseudo: iris, // entity.other.attribute-name.pseudo-class.css
  unit: pine, // keyword.other.unit via keyword

  // diff
  changed: text, // markup.changed has no rule
  changed_marker: subtle, // punctuation.definition.changed via punctuation
  deleted: love, // markup.deleted.diff
  deleted_marker: subtle, // punctuation.definition.deleted via punctuation
  hash: text, // meta.diff.index has no rule
  heading: foam, // entity.name.section on markdown headings
  inserted: foam, // markup.inserted.diff
  inserted_marker: subtle, // punctuation.definition.inserted via punctuation
  label: subtle, // punctuation.definition.range via punctuation

  // markdown content
  autolink: text, // markup.underline.link has no rule
  bold: text, // markup.bold sets font style only
  code: text, // markup.inline.raw has no rule
  code_block: text, // fenced code without an embedded grammar has no rule
  code_language: text, // fenced_code.block.language has no rule
  italic: text, // markup.italic sets font style only
  link_text: gold, // string.other.link.title via string
  strike: text, // markup.strikethrough has no rule
  url: text, // markup.underline.link has no rule
  url_link: subtle, // punctuation.definition.metadata via punctuation
  url_title: gold, // string.other.link.description.title via string

  // markdown open and close markers
  autolink_open: subtle, // punctuation.definition.link via punctuation
  autolink_close: subtle, // punctuation.definition.link via punctuation
  bold_open: subtle, // punctuation.definition.bold via punctuation
  bold_close: subtle, // punctuation.definition.bold via punctuation
  code_open: subtle, // punctuation.definition.raw via punctuation
  code_close: subtle, // punctuation.definition.raw via punctuation
  italic_open: subtle, // punctuation.definition.italic via punctuation
  italic_close: subtle, // punctuation.definition.italic via punctuation
  link_text_open: subtle, // punctuation.definition.link.title via punctuation
  link_text_close: subtle, // punctuation.definition.link.title via punctuation
  strike_open: subtle, // punctuation.definition.strikethrough via punctuation
  strike_close: subtle, // punctuation.definition.strikethrough via punctuation

  // markdown block markers
  blockquote_marker: subtle, // punctuation.definition.quote via punctuation
  code_fence: subtle, // fence punctuation via punctuation
  front_matter_marker: subtle, // punctuation.definition.frontmatter via punctuation
  heading_marker: subtle, // punctuation.definition.heading via punctuation
  hr: text, // meta.separator has no rule
  list_marker: subtle, // punctuation.definition.list via punctuation
  task_marker: subtle, // shiki reads the checkbox as a link reference, brackets via punctuation

  // markdown character level
  escape: pine, // constant.character.escape via constant
  hard_break: text, // no hard break rule

  // svelte
  expression: subtle, // punctuation.section.embedded via punctuation, python format braces render pine
  svelte_block: pine, // keyword.control.svelte via keyword
  svelte_directive: pine, // keyword.control.svelte via keyword, class and style directives render iris

  // whitespace
  carriage_return: "inherit",
  newline: "inherit",
  space: "inherit",
  tab: "inherit",

  // reclassifier placeholders
  raw_code_block: text,
  raw_front_matter: text,
  raw_json: text,
  raw_markup: text,
  raw_script: text,
  raw_shell: text,
  raw_style: text,
  raw_svelte_expression: text,

  // language unique
  string_escape: pine, // constant.character.escape via constant
  format: pine, // storage.type.format.python via storage.type
  attr_sigil: subtle, // punctuation.definition.attribute.rust via punctuation
  output: text, // meta.output.shell-session has no rule
  prompt: subtle, // punctuation.separator.prompt.shell-session via punctuation
  prompt_prefix: text, // entity.other.prompt-prefix.shell-session has no rule
  bit: gold, // sql bit literals render as string
  array_table_header: subtle, // punctuation.definition.section.toml via punctuation
  datetime: pine, // constant.other.date.toml via constant
  block_scalar_header: pine, // keyword.control.flow.block-scalar.yaml via keyword
  directive: pine, // keyword.other.directive.yaml via keyword
  doc_marker: text, // entity.other.document.begin.yaml has no rule
  plain_scalar: gold, // string.unquoted.plain.yaml via string
  tag: pine, // storage.type.tag-handle.yaml via storage.type
  null: rose, // constant.language
});

export const light: theme_palette = palette(dawn);

export const dark: theme_palette = palette(main);
