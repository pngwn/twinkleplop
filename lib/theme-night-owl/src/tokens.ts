// dark is night owl, the italic version
// https://github.com/sdras/night-owl-vscode-theme/blob/main/themes/Night%20Owl-color-theme.json
// light is light owl, the italic version
// https://github.com/sdras/night-owl-vscode-theme/blob/main/themes/Night%20Owl-Light-color-theme.json
// read at commit cc291eb, shiki bundles the same files as night-owl and night-owl-light

import type { theme_palette, theme_styles } from "@twinkleplop/core/types";

// one colour per upstream rule, named by the scope it targets
interface owl {
  background: string; // colors.editor.background
  foreground: string; // colors.editor.foreground
  comment: string;
  string: string;
  string_quoted: string; // string.quoted
  number: string; // constant.numeric
  escape: string; // constant.character.escape
  constant: string; // constant.language, constant.character, constant.other
  regex: string; // string.regexp
  variable: string;
  keyword: string;
  storage: string; // storage.type
  operator: string; // keyword.operator.assignment, arithmetic, relational, logical
  class_name: string; // entity.name.class
  function: string; // entity.name.function
  tag: string; // entity.name.tag
  attribute: string; // entity.other.attribute-name
  support: string; // support.type, support.function
  boolean: string; // constant.language.boolean, constant.language.null
  parameter: string; // variable.parameter
  property: string; // support.type.property-name
  css_tag: string; // entity.name.tag.css
  css_id: string; // entity.other.attribute-name.id
  unit: string; // keyword.other.unit
  embedded: string; // punctuation.section.embedded
  heading: string; // markup.heading
  bold: string; // markup.bold
  italic: string; // markup.italic
  quote: string; // markup.quote
  raw: string; // markup.inline.raw.string.markdown
  link: string; // markup.underline.link
  metadata: string; // punctuation.definition.metadata.markdown
  list: string; // punctuation.definition.list
  inserted: string; // markup.inserted.diff
  deleted: string; // markup.deleted.diff
  changed: string; // markup.changed
}

const night_owl: owl = {
  background: "#011627",
  foreground: "#d6deeb",
  comment: "#637777",
  string: "#ecc48d",
  string_quoted: "#ecc48d",
  number: "#F78C6C",
  escape: "#F78C6C",
  constant: "#82AAFF",
  regex: "#5ca7e4",
  variable: "#c5e478",
  keyword: "#c792ea",
  storage: "#c792ea",
  operator: "#c792ea",
  class_name: "#ffcb8b",
  function: "#82AAFF",
  tag: "#caece6",
  attribute: "#c5e478",
  support: "#c5e478",
  boolean: "#ff5874",
  parameter: "#d7dbe0",
  property: "#80CBC4",
  css_tag: "#ff6363",
  css_id: "#FAD430",
  unit: "#FFEB95",
  embedded: "#d3423e",
  heading: "#82b1ff",
  bold: "#c5e478",
  italic: "#c792ea",
  quote: "#697098",
  raw: "#c5e478",
  link: "#ff869a",
  metadata: "#7fdbca",
  list: "#d9f5dd",
  inserted: "#c5e478ff",
  deleted: "#EF535090",
  changed: "#a2bffc",
};

const light_owl: owl = {
  background: "#FBFBFB",
  foreground: "#403f53",
  comment: "#989fb1",
  string: "#4876d6",
  string_quoted: "#c96765",
  number: "#aa0982",
  escape: "#aa0982",
  constant: "#4876d6",
  regex: "#5ca7e4",
  variable: "#4876d6",
  keyword: "#994cc3",
  storage: "#994cc3",
  operator: "#994cc3",
  class_name: "#111111",
  function: "#4876d6",
  tag: "#994cc3",
  attribute: "#4876d6",
  support: "#4876d6",
  boolean: "#bc5454",
  parameter: "#403f53",
  property: "#0c969b",
  css_tag: "#c96765",
  css_id: "#aa0982",
  unit: "#aa0982",
  embedded: "#d3423e",
  heading: "#4876d6",
  bold: "#4876d6",
  italic: "#994cc3",
  quote: "#697098",
  raw: "#4876d6",
  link: "#ff869a",
  metadata: "#0c969b",
  list: "#111111",
  inserted: "#4876d6ff",
  deleted: "#EF535090",
  changed: "#a2bffc",
};

const palette = (c: owl): theme_palette => ({
  background_color: c.background, // colors.editor.background

  // universal primitives
  boolean: c.boolean, // constant.language.boolean
  comment: c.comment, // comment, light owl gives double slash comments their own grey
  identifier: c.foreground, // variable.other.readwrite.ts, go bash and rust variables render the variable colour
  keyword: c.keyword, // keyword and storage.type
  number: c.number, // constant.numeric
  operator: c.operator, // keyword.operator.assignment and arithmetic, the base keyword.operator rule is teal
  punctuation: c.foreground, // no punctuation rule, tag brackets render teal
  regex: c.regex, // string.regexp
  string: c.string_quoted, // string.quoted
  template: c.string, // string.template via string

  // named entities
  attribute: c.foreground, // meta.attribute.rust has no rule
  builtin: c.support, // support.function
  class_name: c.class_name, // entity.name.class, rust types and ts interfaces have no rule
  constant: c.constant, // variable.other.constant
  decorator: c.function, // entity.name.function inside meta.decorator
  lifetime: c.foreground, // entity.name.type.lifetime.rust has no rule
  namespace: c.foreground, // entity.name.namespace has no rule
  parameter: c.parameter, // variable.parameter
  property: c.property, // support.type.property-name in css, js members render fg
  type: c.support, // support.type primitives, user types are class_name
  variable: c.variable, // variable, sql variables render fg
  variant: c.foreground, // entity.name.type.rust has no rule
  function: c.function, // entity.name.function

  // markup in html, svelte and tsx
  attr_name: c.attribute, // entity.other.attribute-name
  doctype: c.tag, // entity.name.tag.html on the DOCTYPE keyword
  entity: c.constant, // constant.character.entity via constant.character
  tag_name: c.tag, // entity.name.tag

  // css selectors and units
  css_variable: c.variable, // variable.css via variable
  selector: c.css_tag, // entity.name.tag.css
  selector_class: c.attribute, // entity.other.attribute-name.class.css
  selector_id: c.css_id, // entity.other.attribute-name.id.css
  selector_pseudo: c.attribute, // entity.other.attribute-name.pseudo-class.css
  unit: c.unit, // keyword.other.unit

  // diff
  changed: c.changed, // markup.changed
  changed_marker: c.changed, // fallback to changed
  deleted: c.deleted, // markup.deleted.diff
  deleted_marker: c.deleted, // fallback to deleted
  hash: c.foreground, // meta.diff.index has no rule
  heading: c.heading, // markup.heading, diff file headers render the changed blue
  inserted: c.inserted, // markup.inserted.diff
  inserted_marker: c.inserted, // fallback to inserted
  label: c.foreground, // meta.diff.range has no rule

  // markdown content
  autolink: c.link, // markup.underline.link
  bold: c.bold, // markup.bold
  code: c.raw, // markup.inline.raw.string.markdown
  code_block: c.foreground, // markup.raw.block has no rule
  code_language: c.foreground, // fenced_code.block.language has no rule
  italic: c.italic, // markup.italic
  link_text: c.foreground, // string.other.link.title.markdown
  strike: c.foreground, // markup.strikethrough has no rule
  url: c.link, // markup.underline.link
  url_link: c.metadata, // punctuation.definition.metadata.markdown
  url_title: c.string, // string.other.link.description.title via string

  // markdown open and close markers
  autolink_open: c.foreground, // punctuation.definition.link has no rule
  autolink_close: c.foreground, // punctuation.definition.link has no rule
  bold_open: c.bold, // punctuation.definition.bold inside markup.bold
  bold_close: c.bold, // punctuation.definition.bold inside markup.bold
  code_open: c.raw, // punctuation.definition.raw inside markup.inline.raw.string
  code_close: c.raw, // punctuation.definition.raw inside markup.inline.raw.string
  italic_open: c.italic, // punctuation.definition.italic inside markup.italic
  italic_close: c.italic, // punctuation.definition.italic inside markup.italic
  link_text_open: c.foreground, // punctuation.definition.link.title has no rule
  link_text_close: c.foreground, // punctuation.definition.link.title has no rule
  strike_open: c.foreground, // fallback to strike
  strike_close: c.foreground, // fallback to strike

  // markdown block markers
  blockquote_marker: c.quote, // markup.quote
  code_fence: c.foreground, // fence punctuation has no rule
  front_matter_marker: c.foreground, // no front matter rule
  heading_marker: c.heading, // punctuation.definition.heading inside markup.heading
  hr: c.foreground, // meta.separator has no rule
  list_marker: c.list, // punctuation.definition.list.begin.markdown
  task_marker: c.foreground, // task checkbox has no rule

  // markdown character level
  escape: c.escape, // constant.character.escape
  hard_break: c.foreground, // no hard break rule

  // svelte
  expression: c.embedded, // punctuation.section.embedded
  svelte_block: c.keyword, // keyword.control.svelte via keyword.control
  svelte_directive: c.keyword, // keyword.other.animation.svelte via keyword

  // shell sessions
  output: c.foreground, // meta.output has no rule
  prompt: c.foreground, // punctuation.separator.prompt has no rule
  prompt_prefix: c.foreground, // entity.other.prompt-prefix has no rule

  // whitespace
  carriage_return: "inherit",
  newline: "inherit",
  space: "inherit",
  tab: "inherit",

  // reclassifier placeholders
  raw_code_block: c.foreground,
  raw_front_matter: c.foreground,
  raw_json: c.foreground,
  raw_markup: c.foreground,
  raw_script: c.foreground,
  raw_shell: c.foreground,
  raw_style: c.foreground,
  raw_svelte_expression: c.foreground,

  // language unique
  string_escape: c.escape, // constant.character.escape
  format: c.storage, // storage.type.format.python via storage.type
  attr_sigil: c.foreground, // meta.attribute.rust has no rule
  bit: c.string_quoted, // string.quoted.single.sql
  array_table_header: c.foreground, // toml section punctuation has no rule
  datetime: c.constant, // constant.other.date.toml via constant.other
  block_scalar_header: c.keyword, // keyword.control.flow.block-scalar.yaml via keyword.control
  directive: c.keyword, // keyword.other.directive.yaml via keyword
  doc_marker: c.foreground, // entity.other.document.begin.yaml has no rule
  plain_scalar: c.string, // string.unquoted.plain.out.yaml via string
  tag: c.storage, // storage.type.tag-handle.yaml via storage.type
  null: c.boolean, // constant.language.null
});

export const light: theme_palette = palette(light_owl);

export const dark: theme_palette = palette(night_owl);

// shared by both themes
const styles: theme_styles = {
  attr_name: ["italic"], // entity.other.attribute-name
  block_scalar_header: ["italic"], // keyword.control.flow.block-scalar.yaml via keyword.control
  bold: ["bold"], // markup.bold
  builtin: ["italic"], // shell builtins via entity.name.function, python builtins are upright
  changed: ["italic"], // markup.changed
  comment: ["italic"], // comment
  constant: ["italic"], // meta.var.expr, constants outside a declaration are upright
  decorator: ["italic"], // entity.name.function inside meta.decorator
  deleted: ["italic"], // markup.deleted.diff
  function: ["italic"], // entity.name.function
  inserted: ["italic"], // markup.inserted.diff
  italic: ["italic"], // markup.italic
  keyword: ["italic"], // keyword.control and storage.modifier, declaration keywords like const are upright
  selector_class: ["italic"], // entity.other.attribute-name.class.css via entity.other.attribute-name
  selector_id: ["italic"], // entity.other.attribute-name.id.css via entity.other.attribute-name
  selector_pseudo: ["italic"], // entity.other.attribute-name.pseudo-class.css via entity.other.attribute-name
  svelte_block: ["italic"], // keyword.control.svelte via keyword.control
  svelte_directive: ["italic"], // entity.other.attribute-name.svelte on on, bind, class, use and style
};

export const light_styles: theme_styles = styles;

export const dark_styles: theme_styles = {
  ...styles,
  autolink: ["underline"], // markup.underline, light owl has no underline rule
  url: ["underline"], // markup.underline, http urls have no rule
};
