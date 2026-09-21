// material-theme/vsc-material-theme now redirects to vira-soft/vira-assets, which has no theme files
// palettes from the archived antfu fork, which keeps the upstream history up to 34.4.0
// https://github.com/antfu/vsc-material-theme/blob/2727b73ef0b927bf8193cad0535da277c265ed83/scripts/generator/settings/specific/lighter.ts
// https://github.com/antfu/vsc-material-theme/blob/2727b73ef0b927bf8193cad0535da277c265ed83/scripts/generator/settings/specific/default.ts
// token mapping from the same fork and from the themes in the last marketplace release, 34.7.16
// shiki bundles the same token colours as material-theme-lighter and material-theme
// https://github.com/antfu/vsc-material-theme/blob/2727b73ef0b927bf8193cad0535da277c265ed83/scripts/generator/color-set.ts
// https://equinusocio.vscode-unpkg.net/equinusocio/vsc-material-theme/34.7.16/extension/build/themes/Material-Theme-Lighter.json
// https://equinusocio.vscode-unpkg.net/equinusocio/vsc-material-theme/34.7.16/extension/build/themes/Material-Theme-Default.json

import type { theme_palette } from "@twinkleplop/core/types";

type scheme = {
  background: string;
  foreground: string;
  comments: string;
  red: string;
  orange: string;
  yellow: string;
  green: string;
  cyan: string;
  blue: string;
  paleblue: string;
  purple: string;
  pink: string;
};

// lighter.ts
const lighter: scheme = {
  background: "#FAFAFA",
  foreground: "#90A4AE",
  comments: "#90A4AE",
  red: "#E53935",
  orange: "#F76D47",
  yellow: "#E2931D",
  green: "#91B859",
  cyan: "#39ADB5",
  blue: "#6182B8",
  paleblue: "#8796B0",
  purple: "#9C3EDA",
  pink: "#FF5370",
};

// default.ts
const material: scheme = {
  background: "#263238",
  foreground: "#EEFFFF",
  comments: "#546E7A",
  red: "#f07178",
  orange: "#F78C6C",
  yellow: "#FFCB6B",
  green: "#C3E88D",
  cyan: "#89DDFF",
  blue: "#82AAFF",
  paleblue: "#B2CCD6",
  purple: "#C792EA",
  pink: "#ff9cac",
};

const palette = ({
  background,
  foreground: fg,
  comments,
  red,
  orange,
  yellow,
  green,
  cyan,
  blue,
  paleblue,
  purple,
  pink,
}: scheme): theme_palette => ({
  background_color: background, // colors.editor.background

  // universal primitives
  boolean: pink, // constant.language.boolean
  comment: comments,
  identifier: fg, // variable, yaml plain scalars render green
  keyword: purple, // storage.type on const and function, control keywords render cyan and sql keywords orange
  number: orange, // constant.numeric
  operator: cyan, // keyword.operator via keyword
  punctuation: cyan, // punctuation
  regex: green, // string.regexp via string, delimiters and operators render cyan
  string: green, // string, quotes render cyan
  template: green, // string.template via string

  // named entities
  attribute: fg, // meta.attribute.rust has no rule
  builtin: blue, // support.function, python builtin classes render yellow as support.type
  class_name: yellow, // entity.name.type.class
  constant: fg, // variable.other.constant via variable
  decorator: blue, // entity.name.function on the decorator name
  lifetime: yellow, // entity.name.type.lifetime.rust via entity.name.type
  namespace: yellow, // entity.name.namespace via entity.name, js and python imports render fg
  parameter: fg, // variable.parameter sets italic only
  property: paleblue, // support.type.property-name.css, js and yaml keys render red, json keys purple
  type: yellow, // support.type and entity.name.type
  variable: fg, // variable
  variant: yellow, // entity.name.type on rust enum variants
  function: blue, // entity.name.function, method definitions render red

  // markup in html, svelte and tsx
  attr_name: purple, // entity.other.attribute-name
  doctype: red, // entity.name.tag.html on the DOCTYPE keyword
  entity: fg, // constant.character.entity via the string escape rule
  tag_name: red, // entity.name.tag

  // css selectors and units
  css_variable: fg, // variable.css via variable
  selector: yellow, // source.css entity.name.tag
  selector_class: yellow, // entity.other.attribute-name.class
  selector_id: orange, // entity.other.attribute-name.id
  selector_pseudo: purple, // entity.other.attribute-name.pseudo-class via entity.other.attribute-name
  unit: orange, // keyword.other.unit via keyword.other

  // diff
  changed: fg, // markup.changed has no rule
  changed_marker: cyan, // punctuation.definition.changed via punctuation
  deleted: red, // markup.deleted
  deleted_marker: cyan, // punctuation.definition.deleted via punctuation
  hash: fg, // meta.diff.index has no rule
  heading: yellow, // entity.name.section.markdown via entity.name, diff file headers render cyan
  inserted: green, // markup.inserted
  inserted_marker: cyan, // punctuation.definition.inserted via punctuation
  label: fg, // http labels have no scope, diff ranges render cyan as punctuation

  // markdown content
  autolink: fg, // markup.underline.link sets underline only
  bold: red, // markup.bold
  code: green, // markup.inline.raw.string.markdown
  code_block: fg, // markup.raw.block has no rule
  code_language: `${fg}90`, // markup.fenced_code.block, upstream appends 90 to the foreground
  italic: red, // markup.italic
  link_text: green, // string.other.link.title via string
  strike: fg, // markup.strikethrough has no rule
  url: fg, // markup.underline.link sets underline only, markdown inline links render red
  url_link: cyan, // punctuation.definition.metadata via punctuation
  url_title: green, // string.other.link.description.title via string

  // markdown open and close markers
  autolink_open: cyan, // punctuation.definition.link via punctuation
  autolink_close: cyan, // punctuation.definition.link via punctuation
  bold_open: cyan, // punctuation.definition.bold via punctuation
  bold_close: cyan, // punctuation.definition.bold via punctuation
  code_open: cyan, // punctuation.definition.raw via punctuation
  code_close: cyan, // punctuation.definition.raw via punctuation
  italic_open: cyan, // punctuation.definition.italic via punctuation
  italic_close: cyan, // punctuation.definition.italic via punctuation
  link_text_open: cyan, // punctuation.definition.link.title via punctuation
  link_text_close: cyan, // punctuation.definition.link.title via punctuation
  strike_open: cyan, // punctuation.definition.strikethrough via punctuation
  strike_close: cyan, // punctuation.definition.strikethrough via punctuation

  // markdown block markers
  blockquote_marker: pink, // punctuation.definition.quote
  code_fence: green, // markup.fenced_code.block.markdown punctuation.definition.markdown
  front_matter_marker: cyan, // punctuation.definition.begin.frontmatter via punctuation
  heading_marker: cyan, // punctuation.definition.heading via punctuation
  hr: fg, // meta.separator has no rule
  list_marker: cyan, // punctuation.definition.list via punctuation
  task_marker: fg, // task checkbox has no scope

  // markdown character level
  escape: fg, // constant.character.escape via the string escape rule
  hard_break: fg, // no hard break rule

  // svelte
  expression: cyan, // punctuation.section.embedded via punctuation, python fstring braces render orange
  svelte_block: cyan, // keyword.control.svelte via keyword
  svelte_directive: cyan, // keyword.control.svelte on on and bind, class renders purple and transition orange

  // shell sessions
  output: fg, // meta.output has no rule
  prompt: cyan, // punctuation.separator.prompt via punctuation
  prompt_prefix: yellow, // entity.other.prompt-prefix via entity.other

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
  string_escape: fg, // constant.character.escape via the string escape rule
  format: purple, // storage.type.format.python via storage
  attr_sigil: cyan, // punctuation.definition.attribute.rust via punctuation
  bit: green, // sql bit literals render as string
  array_table_header: cyan, // punctuation.definition.section.begin.toml via punctuation
  datetime: fg, // constant.other.date.toml has no rule
  block_scalar_header: cyan, // keyword.control.flow.block-scalar.yaml via keyword.control
  directive: orange, // keyword.other.directive.yaml via keyword.other
  doc_marker: yellow, // entity.other.document.begin.yaml via entity.other
  plain_scalar: green, // string.unquoted.plain.out.yaml via string
  tag: purple, // storage.type.tag-handle.yaml via storage
  null: cyan, // constant.language via keyword
});

export const light: theme_palette = palette(lighter);

export const dark: theme_palette = palette(material);
