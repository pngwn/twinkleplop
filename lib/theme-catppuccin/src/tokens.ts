// palette from catppuccin/palette v1.8.0
// https://github.com/catppuccin/palette/blob/07d02aa110ef9eb7e7427afca5c73ba9cf7f8ebd/palette.json
// token mapping from the catppuccin vs code theme, which shiki bundles as catppuccin-latte and catppuccin-mocha
// https://github.com/catppuccin/vscode/tree/befc9e6fc41980f4241408f7049755d47c06ff45/packages/catppuccin-vsc/src/theme/tokens
// https://github.com/catppuccin/vscode/blob/befc9e6fc41980f4241408f7049755d47c06ff45/packages/catppuccin-vsc/src/theme/ui/workbench.ts

import type { theme_palette } from "@twinkleplop/core/types";

const latte = {
  base: "#eff1f5",
  text: "#4c4f69",
  subtext0: "#6c6f85",
  overlay2: "#7c7f93",
  red: "#d20f39",
  maroon: "#e64553",
  peach: "#fe640b",
  yellow: "#df8e1d",
  green: "#40a02b",
  teal: "#179299",
  sky: "#04a5e5",
  blue: "#1e66f5",
  lavender: "#7287fd",
  mauve: "#8839ef",
  pink: "#ea76cb",
};

const mocha: typeof latte = {
  base: "#1e1e2e",
  text: "#cdd6f4",
  subtext0: "#a6adc8",
  overlay2: "#9399b2",
  red: "#f38ba8",
  maroon: "#eba0ac",
  peach: "#fab387",
  yellow: "#f9e2af",
  green: "#a6e3a1",
  teal: "#94e2d5",
  sky: "#89dceb",
  blue: "#89b4fa",
  lavender: "#b4befe",
  mauve: "#cba6f7",
  pink: "#f5c2e7",
};

const palette = (c: typeof latte): theme_palette => ({
  background_color: c.base, // colors.editor.background

  // universal primitives
  boolean: c.peach, // constant.language.boolean
  comment: c.overlay2,
  identifier: c.text, // variable.other.readwrite
  keyword: c.mauve, // keyword and storage.type
  number: c.peach, // constant.numeric
  operator: c.teal, // keyword.operator
  punctuation: c.overlay2, // punctuation, tag brackets and accessors render teal
  regex: c.green, // string.regexp via string, delimiters and classes render pink
  string: c.green,
  template: c.green, // string.template via string

  // named entities
  attribute: c.yellow, // meta.attribute.rust
  builtin: c.red, // support.function.builtin
  class_name: c.yellow, // entity.name.class
  constant: c.text, // js and ts variable.other.constant, rust and tsx constants render peach
  decorator: c.blue, // punctuation.decorator.ts, decorator names render as function calls
  lifetime: c.blue, // storage.modifier.lifetime.rust, the absorbed type renders yellow
  namespace: c.yellow, // entity.name.namespace
  parameter: c.maroon, // variable.parameter
  property: c.blue, // support.type.property-name, js and toml keys render text
  type: c.mauve, // support.type.primitive, user types are yellow entity.name.type
  variable: c.text, // variable.other.readwrite, yaml anchors render yellow
  variant: c.teal, // variable.other.enummember
  function: c.blue, // entity.name.function

  // markup in html, svelte and tsx
  attr_name: c.yellow, // entity.other.attribute-name
  doctype: c.mauve, // keyword.other.doctype
  entity: c.red, // text.html constant.character.entity
  tag_name: c.blue, // entity.name.tag

  // css selectors and units
  css_variable: c.blue, // source.css meta.property-list variable, var arguments render maroon
  selector: c.blue, // entity.name.tag.css via entity.name.tag
  selector_class: c.yellow, // source.css entity.other.attribute-name.class.css
  selector_id: c.yellow, // entity.other.attribute-name.id.css via entity.other.attribute-name
  selector_pseudo: c.teal, // source.css entity.other.attribute-name.pseudo-class
  unit: c.mauve, // keyword.other.unit via keyword, percentages render peach

  // diff
  changed: c.peach, // markup.changed.diff
  changed_marker: c.overlay2, // marker punctuation via punctuation
  deleted: c.red, // markup.deleted.diff
  deleted_marker: c.overlay2, // marker punctuation via punctuation
  hash: c.text, // no rule
  heading: c.red, // heading.1.markdown, deeper levels step through peach yellow green sapphire lavender
  inserted: c.green, // markup.inserted.diff
  inserted_marker: c.overlay2, // marker punctuation via punctuation
  label: c.overlay2, // punctuation.definition.range.diff via punctuation

  // markdown content
  autolink: c.blue, // markup.underline.link
  bold: c.red, // markup.bold
  code: c.green, // markup.inline.raw.string.markdown
  code_block: c.text, // fenced code without an embedded grammar has no rule, indented code renders green
  code_language: c.sky, // fenced_code.block.language
  italic: c.red, // markup.italic
  link_text: c.lavender, // string.other.link.title.markdown
  strike: c.subtext0, // markup.strikethrough
  url: c.blue, // markup.underline.link, http request urls render text
  url_link: c.overlay2, // punctuation.definition.metadata.markdown via punctuation
  url_title: c.green, // string.other.link.description.title.markdown via string

  // markdown open and close markers
  autolink_open: c.blue, // punctuation.definition.link
  autolink_close: c.blue, // punctuation.definition.link
  bold_open: c.overlay2, // punctuation.definition.bold via punctuation
  bold_close: c.overlay2, // punctuation.definition.bold via punctuation
  code_open: c.green, // punctuation.definition.raw.markdown
  code_close: c.green, // punctuation.definition.raw.markdown
  italic_open: c.overlay2, // punctuation.definition.italic via punctuation
  italic_close: c.overlay2, // punctuation.definition.italic via punctuation
  link_text_open: c.lavender, // text.html.markdown punctuation.definition.link.title
  link_text_close: c.lavender, // text.html.markdown punctuation.definition.link.title
  strike_open: c.overlay2, // punctuation.definition.strikethrough via punctuation
  strike_close: c.overlay2, // punctuation.definition.strikethrough via punctuation

  // markdown block markers
  blockquote_marker: c.pink, // punctuation.definition.quote.begin
  code_fence: c.overlay2, // markup.fenced_code.block punctuation.definition
  front_matter_marker: c.overlay2, // punctuation.definition.begin.frontmatter via punctuation
  heading_marker: c.red, // fallback to heading, each level takes its heading colour
  hr: c.teal, // meta.separator.markdown
  list_marker: c.teal, // punctuation.definition.list.begin.markdown
  task_marker: c.lavender, // the checkbox parses as a link reference

  // markdown character level
  escape: c.pink, // constant.character.escape
  hard_break: c.text, // no hard break rule

  // svelte
  expression: c.overlay2, // punctuation.section.embedded via punctuation
  svelte_block: c.mauve, // keyword.control.svelte via keyword
  svelte_directive: c.mauve, // keyword.control.svelte via keyword, the directive name renders yellow

  // whitespace
  carriage_return: "inherit",
  newline: "inherit",
  space: "inherit",
  tab: "inherit",

  // reclassifier placeholders
  raw_code_block: c.text,
  raw_front_matter: c.text,
  raw_json: c.text,
  raw_markup: c.text,
  raw_script: c.text,
  raw_shell: c.text,
  raw_style: c.text,
  raw_svelte_expression: c.text,

  // language unique
  string_escape: c.pink, // constant.character.escape
  format: c.mauve, // storage.type.format.python via storage.type
  attr_sigil: c.yellow, // meta.attribute.rust
  output: c.text, // meta.output.shell-session has no rule
  prompt: c.overlay2, // punctuation.separator.prompt.shell-session via punctuation
  prompt_prefix: c.text, // entity.other.prompt-prefix.shell-session has no rule
  bit: c.green, // sql bit literals render as string
  array_table_header: c.overlay2, // punctuation.definition.section.begin.toml via punctuation
  datetime: c.pink, // constant.other.time.datetime.offset.toml, the shiki toml grammar leaves dates text
  block_scalar_header: c.mauve, // keyword.control.flow.block-scalar.yaml via keyword
  directive: c.mauve, // keyword.other.directive.yaml via keyword
  doc_marker: c.pink, // entity.other.document.begin.yaml
  plain_scalar: c.green, // string.unquoted.plain.yaml via string
  tag: c.mauve, // storage.type.tag-handle.yaml via storage.type
  null: c.red, // constant.language, json null renders peach
});

export const light: theme_palette = palette(latte);

export const dark: theme_palette = palette(mocha);
