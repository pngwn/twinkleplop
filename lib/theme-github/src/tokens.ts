// @twinkleplop/theme-github — github default light + dark.
//
// sources consulted:
//   - https://github.com/primer/github-vscode-theme/blob/main/src/theme.js
//   - https://github.com/primer/github-vscode-theme/blob/main/src/colors.js
//   - @primer/primitives@7.11.12
//       dist/json/colors/light.json   (scale values for "light")
//       dist/json/colors/dark.json    (scale values for "dark")
//   - fg.default overrides applied per theme.js:
//       light: "#1f2328"  dark: "#e6edf3"
//   - editor background from primitives canvas.default:
//       light: "#ffffff"  dark: "#0d1117"
//
// every non-ws color below was copied verbatim from a scale entry; inline
// comments record the scope / scale index used so reviewers can trace back.
// where the primer theme has no explicit rule for a twinkleplop token the
// comment marks it as a fallback and names the sibling it was matched to.

// `theme_palette` intentionally duplicated here to avoid cross-package
// import resolution in tools (svelte-check, vitest) that skip the
// "source" export condition. the shape is: Record<canonical_token, hex>
// plus a required `background_color` — enforced by tokens.test.ts.
type theme_palette = Record<string, string> & { background_color: string };

export const light: theme_palette = {
  // backgrounds + default foreground
  background_color: "#ffffff", // canvas.default

  // universal primitives
  boolean: "#0550ae", // scale.blue[6] — constant.language
  comment: "#6e7781", // scale.gray[5] — comment
  identifier: "#1f2328", // fg.default — variable.other
  keyword: "#cf222e", // scale.red[5] — keyword
  number: "#0550ae", // scale.blue[6] — constant.numeric → constant
  operator: "#cf222e", // scale.red[5] — keyword.operator fallback to keyword
  punctuation: "#1f2328", // fg.default — no explicit scope, inherits
  regex: "#0a3069", // scale.blue[8] — string.regexp → string
  string: "#0a3069", // scale.blue[8] — string
  template: "#0a3069", // scale.blue[8] — string.template → string

  // named entities
  attribute: "#0550ae", // scale.blue[6] — support / meta.property-name
  builtin: "#0550ae", // scale.blue[6] — support
  class_name: "#953800", // scale.orange[6] — entity.name
  constant: "#0550ae", // scale.blue[6] — constant.other / variable.other.constant
  decorator: "#8250df", // scale.purple[5] — entity.name.function fallback
  lifetime: "#cf222e", // scale.red[5] — storage.modifier.lifetime fallback to keyword
  namespace: "#953800", // scale.orange[6] — entity.name.namespace → entity.name
  parameter: "#953800", // scale.orange[6] — variable.parameter → variable family accent
  property: "#0550ae", // scale.blue[6] — meta.property-name / support
  type: "#0550ae", // scale.blue[6] — entity.name.type / support.type
  variable: "#1f2328", // fg.default — variable.other
  variant: "#0550ae", // scale.blue[6] — constant.other.enum.member → constant family
  function: "#8250df", // scale.purple[5] — entity.name.function

  // markup (html, svelte)
  attr_name: "#0550ae", // scale.blue[6] — entity.other.attribute-name → support
  doctype: "#6e7781", // scale.gray[5] — fallback to comment
  entity: "#0550ae", // scale.blue[6] — constant.character.entity → constant
  tag_name: "#116329", // scale.green[6] — entity.name.tag

  // css
  css_variable: "#953800", // scale.orange[6] — variable.css → variable
  selector: "#116329", // scale.green[6] — entity.name.tag.css
  selector_class: "#0550ae", // scale.blue[6] — entity.other.attribute-name.class.css → entity
  selector_id: "#0550ae", // scale.blue[6] — entity.other.attribute-name.id.css → entity
  selector_pseudo: "#0550ae", // scale.blue[6] — entity.other.attribute-name.pseudo-*.css → entity
  unit: "#cf222e", // scale.red[5] — keyword.other.unit.css → keyword

  // diff
  changed: "#953800", // scale.orange[6] — markup.changed
  changed_marker: "#953800", // orange[6] — matches changed
  deleted: "#82071e", // scale.red[7] — markup.deleted
  deleted_marker: "#82071e",
  hash: "#6e7781", // scale.gray[5] — meta.diff.index fallback
  heading: "#0550ae", // scale.blue[6] — meta.diff.header / markup.heading
  inserted: "#116329", // scale.green[6] — markup.inserted
  inserted_marker: "#116329",
  label: "#6e7781", // scale.gray[5] — muted

  // markdown content
  autolink: "#0a3069", // scale.blue[8] — string.other.link
  bold: "#1f2328", // fg.default — markup.bold (weight carries emphasis)
  code: "#0550ae", // scale.blue[6] — markup.inline.raw
  code_block: "#0550ae", // blue[6] — markup.fenced_code fallback to inline.raw
  code_language: "#0550ae", // blue[6] — fence info string
  italic: "#1f2328", // fg.default — markup.italic
  link_text: "#0a3069", // blue[8] — string.other.link
  strike: "#1f2328", // fg.default — markup.strikethrough
  url: "#0a3069", // blue[8] — url fragment of link
  url_link: "#0a3069",
  url_title: "#0a3069",

  // markdown open/close markers — match the content they wrap
  autolink_open: "#0a3069",
  autolink_close: "#0a3069",
  bold_open: "#1f2328",
  bold_close: "#1f2328",
  code_open: "#0550ae",
  code_close: "#0550ae",
  italic_open: "#1f2328",
  italic_close: "#1f2328",
  link_text_open: "#0a3069",
  link_text_close: "#0a3069",
  strike_open: "#1f2328",
  strike_close: "#1f2328",

  // markdown block markers
  blockquote_marker: "#6e7781", // gray[5] — punctuation.definition.quote.markdown
  code_fence: "#6e7781", // gray[5] — punctuation.definition.code
  front_matter_marker: "#6e7781", // gray[5]
  heading_marker: "#0550ae", // blue[6] — matches heading
  hr: "#6e7781", // gray[5] — meta.separator fallback
  list_marker: "#953800", // scale.orange[6] — punctuation.definition.list.begin.markdown
  task_marker: "#1a7f37", // scale.green[5] — checkbox-style accent, green family

  // markdown character-level
  escape: "#116329", // scale.green[6] — constant.character.escape
  hard_break: "#6e7781", // gray[5] — invisible mark, muted

  // svelte
  expression: "#cf222e", // scale.red[5] — punctuation.section.embedded
  svelte_block: "#cf222e", // red[5] — keyword-like block tag
  svelte_directive: "#0550ae", // blue[6] — support-like

  // whitespace — never colored
  carriage_return: "inherit",
  newline: "inherit",
  space: "inherit",
  tab: "inherit",

  // raw containers (reclassifier placeholders) — fall back to default text
  raw_code_block: "#1f2328",
  raw_front_matter: "#1f2328",
  raw_script: "#1f2328",
  raw_style: "#1f2328",
  raw_svelte_expression: "#1f2328",

  // language-unique
  string_escape: "#116329", // scale.green[6] — bold constant.character.escape in regex per theme.js
  format: "#cf222e", // scale.red[5] — constant.other.placeholder (python %s, {})
  attr_sigil: "#cf222e", // scale.red[5] — punctuation.section.embedded (rust #)
  bit: "#0550ae", // scale.blue[6] — constant.numeric sibling
  array_table_header: "#116329", // scale.green[6] — entity.name.section fallback
  datetime: "#0550ae", // scale.blue[6] — constant.numeric sibling
  block_scalar_header: "#6e7781", // gray[5] — yaml scalar header, punctuation-ish
  directive: "#cf222e", // scale.red[5] — yaml directive sigil, keyword-like
  doc_marker: "#6e7781", // gray[5] — yaml doc start/end marker
  plain_scalar: "#1f2328", // fg.default — unquoted yaml scalar
  tag: "#cf222e", // scale.red[5] — yaml !tag
  null: "#0550ae", // scale.blue[6] — constant.language
};

export const dark: theme_palette = {
  // backgrounds + default foreground
  background_color: "#0d1117", // canvas.default

  // universal primitives
  boolean: "#79c0ff", // scale.blue[2] — constant.language
  comment: "#8b949e", // scale.gray[3] — comment
  identifier: "#e6edf3", // fg.default — variable.other
  keyword: "#ff7b72", // scale.red[3] — keyword
  number: "#79c0ff", // scale.blue[2] — constant.numeric
  operator: "#ff7b72", // scale.red[3] — keyword.operator fallback
  punctuation: "#e6edf3", // fg.default
  regex: "#a5d6ff", // scale.blue[1] — string.regexp
  string: "#a5d6ff", // scale.blue[1] — string
  template: "#a5d6ff", // scale.blue[1] — string.template

  // named entities
  attribute: "#79c0ff", // scale.blue[2] — support / meta.property-name
  builtin: "#79c0ff",
  class_name: "#ffa657", // scale.orange[2] — entity.name
  constant: "#79c0ff", // scale.blue[2] — constant.other / variable.other.constant
  decorator: "#d2a8ff", // scale.purple[2] — entity.name.function fallback
  lifetime: "#ff7b72", // scale.red[3] — storage.modifier.lifetime fallback
  namespace: "#ffa657", // scale.orange[2] — entity.name.namespace → entity.name
  parameter: "#ffa657", // scale.orange[2] — variable.parameter → variable family accent
  property: "#79c0ff", // scale.blue[2] — meta.property-name
  type: "#79c0ff", // scale.blue[2] — entity.name.type / support.type
  variable: "#e6edf3", // fg.default — variable.other
  variant: "#79c0ff", // scale.blue[2] — constant.other.enum.member → constant family
  function: "#d2a8ff", // scale.purple[2] — entity.name.function

  // markup (html, svelte)
  attr_name: "#79c0ff", // scale.blue[2] — entity.other.attribute-name
  doctype: "#8b949e", // gray[3] — fallback to comment
  entity: "#79c0ff", // blue[2] — constant.character.entity
  tag_name: "#7ee787", // scale.green[1] — entity.name.tag

  // css
  css_variable: "#ffa657", // scale.orange[2] — variable.css → variable
  selector: "#7ee787", // scale.green[1] — entity.name.tag.css
  selector_class: "#79c0ff", // scale.blue[2] — entity.other.attribute-name.class.css → entity
  selector_id: "#79c0ff", // scale.blue[2] — entity.other.attribute-name.id.css → entity
  selector_pseudo: "#79c0ff", // scale.blue[2] — entity.other.attribute-name.pseudo-*.css → entity
  unit: "#ff7b72", // scale.red[3] — keyword.other.unit.css → keyword

  // diff
  changed: "#ffa657", // orange[2] — markup.changed
  changed_marker: "#ffa657",
  deleted: "#ffa198", // scale.red[2] — markup.deleted
  deleted_marker: "#ffa198",
  hash: "#8b949e", // gray[3] — muted
  heading: "#79c0ff", // blue[2] — meta.diff.header / markup.heading
  inserted: "#7ee787", // green[1] — markup.inserted
  inserted_marker: "#7ee787",
  label: "#8b949e", // gray[3]

  // markdown content
  autolink: "#a5d6ff", // blue[1] — string.other.link
  bold: "#e6edf3", // fg.default
  code: "#79c0ff", // blue[2] — markup.inline.raw
  code_block: "#79c0ff",
  code_language: "#79c0ff",
  italic: "#e6edf3",
  link_text: "#a5d6ff",
  strike: "#e6edf3",
  url: "#a5d6ff",
  url_link: "#a5d6ff",
  url_title: "#a5d6ff",

  autolink_open: "#a5d6ff",
  autolink_close: "#a5d6ff",
  bold_open: "#e6edf3",
  bold_close: "#e6edf3",
  code_open: "#79c0ff",
  code_close: "#79c0ff",
  italic_open: "#e6edf3",
  italic_close: "#e6edf3",
  link_text_open: "#a5d6ff",
  link_text_close: "#a5d6ff",
  strike_open: "#e6edf3",
  strike_close: "#e6edf3",

  blockquote_marker: "#8b949e",
  code_fence: "#8b949e",
  front_matter_marker: "#8b949e",
  heading_marker: "#79c0ff",
  hr: "#8b949e",
  list_marker: "#ffa657", // orange[2] — punctuation.definition.list.begin.markdown
  task_marker: "#3fb950", // scale.green[3] — checkbox-style accent

  escape: "#7ee787", // green[1] — constant.character.escape
  hard_break: "#8b949e",

  // svelte
  expression: "#ff7b72",
  svelte_block: "#ff7b72",
  svelte_directive: "#79c0ff",

  // whitespace
  carriage_return: "inherit",
  newline: "inherit",
  space: "inherit",
  tab: "inherit",

  // raw containers
  raw_code_block: "#e6edf3",
  raw_front_matter: "#e6edf3",
  raw_script: "#e6edf3",
  raw_style: "#e6edf3",
  raw_svelte_expression: "#e6edf3",

  // language-unique
  string_escape: "#7ee787", // green[1] — constant.character.escape
  format: "#ff7b72", // red[3] — constant.other.placeholder
  attr_sigil: "#ff7b72", // red[3] — punctuation.section.embedded
  bit: "#79c0ff",
  array_table_header: "#7ee787",
  datetime: "#79c0ff",
  block_scalar_header: "#8b949e",
  directive: "#ff7b72",
  doc_marker: "#8b949e",
  plain_scalar: "#e6edf3",
  tag: "#ff7b72",
  null: "#79c0ff",
};
