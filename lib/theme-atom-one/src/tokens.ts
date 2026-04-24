// @twinkleplop/theme-atom-one - One Dark Pro + Atom One Light.
//
// sources consulted:
//   dark:
//     - https://github.com/Binaryify/OneDark-Pro/blob/master/themes/OneDark-Pro.json
//     - raw file fetched from:
//       https://raw.githubusercontent.com/Binaryify/OneDark-Pro/master/themes/OneDark-Pro.json
//     - background_color from colors["editor.background"]: "#282c34"
//   light:
//     - https://github.com/akamud/vscode-theme-onelight/blob/master/themes/OneLight.json
//     - raw file fetched from:
//       https://raw.githubusercontent.com/akamud/vscode-theme-onelight/master/themes/OneLight.json
//     - background_color from colors["editor.background"]: "#FAFAFA"
//   Atom upstream ancestry checked against:
//     - https://github.com/atom/one-dark-syntax/blob/master/styles/colors.less
//     - https://github.com/atom/one-dark-syntax/blob/master/styles/syntax-variables.less
//     - https://github.com/atom/one-light-syntax/blob/master/styles/colors.less
//     - https://github.com/atom/one-light-syntax/blob/master/styles/syntax-variables.less
//
// comments record the VS Code TextMate scope, upstream color role, or fallback
// sibling used for each token. The requested dark variant is Binaryify's One
// Dark Pro, so its VS Code theme JSON wins where it differs from Atom's
// original less variables (notably comments).

import type { theme_palette } from "@twinkleplop/core/types";

export const light: theme_palette = {
	background_color: "#FAFAFA", // colors.editor.background

	// universal primitives
	boolean: "#0184BC", // constant.language.json
	comment: "#A0A1A7", // comment
	identifier: "#383A42", // variable.other.readwrite.js / foreground for common identifiers
	keyword: "#A626A4", // keyword
	number: "#986801", // constant.numeric
	operator: "#0184BC", // source.js keyword.operator / keyword.operator in common JS use
	punctuation: "#383A42", // punctuation.definition.* / foreground
	regex: "#0184BC", // string.regexp
	string: "#50A14F", // string
	template: "#50A14F", // string.template punctuation fallback to string

	// named entities
	attribute: "#986801", // entity.other.attribute-name
	builtin: "#0184BC", // support.function / support.type
	class_name: "#C18401", // entity.name.class
	constant: "#986801", // constant.variable / constant.numeric family
	decorator: "#986801", // meta.attribute.rust fallback to attribute
	lifetime: "#986801", // entity.name.lifetime.rust
	namespace: "#C18401", // fallback to entity.name.type; no explicit namespace scope
	parameter: "#E45649", // variable parameter fallback to variable for JS/Rust-style params
	property: "#383A42", // support.type.property-name
	type: "#C18401", // entity.name.type
	variable: "#E45649", // variable
	variant: "#0184BC", // fallback to constant.language; no enum member scope
	function: "#4078F2", // entity.name.function

	// markup (html, svelte, tsx)
	attr_name: "#986801", // entity.other.attribute-name
	doctype: "#A0A1A7", // fallback to comment; no explicit doctype scope
	entity: "#0184BC", // constant.character.escape / entity-like constants
	tag_name: "#E45649", // entity.name.tag

	// css selectors + units
	css_variable: "#E45649", // support.variable.property.* fallback to variable
	selector: "#E45649", // entity.name.tag fallback
	selector_class: "#986801", // entity.other.attribute-name fallback
	selector_id: "#4078F2", // entity.other.attribute-name.id
	selector_pseudo: "#986801", // CSS pseudo selector as rendered by one-light
	unit: "#986801", // keyword.other.unit

	// diff
	changed: "#A626A4", // markup.changed
	changed_marker: "#A626A4", // fallback to changed
	deleted: "#E45649", // markup.deleted
	deleted_marker: "#E45649", // fallback to deleted
	hash: "#A0A1A7", // fallback to comment; no explicit meta.diff.index
	heading: "#E45649", // markup.heading / entity.name.section.markdown
	inserted: "#50A14F", // markup.inserted
	inserted_marker: "#50A14F", // fallback to inserted
	label: "#A0A1A7", // fallback to comment/muted

	// markdown content
	autolink: "#E45649", // string.other.link
	bold: "#986801", // markup.bold
	code: "#383A42", // markup.raw.block.markdown wins for Markdown raw spans in this port
	code_block: "#383A42", // markup.raw.block.markdown
	code_language: "#4078F2", // fallback to entity.name.section / fence info
	italic: "#A626A4", // markup.italic
	link_text: "#4078F2", // source.gfm link entity / visible link text
	strike: "#383A42", // fallback to foreground; no explicit strikethrough scope
	url: "#A626A4", // punctuation.definition.metadata.markdown / link destination
	url_link: "#A626A4", // punctuation.definition.metadata.markdown
	url_title: "#383A42", // string.other.link.title.markdown token includes quotes in twinkleplop

	// markdown open/close markers
	autolink_open: "#E45649", // fallback to autolink
	autolink_close: "#E45649", // fallback to autolink
	bold_open: "#986801", // fallback to bold
	bold_close: "#986801", // fallback to bold
	code_open: "#383A42", // fallback to code
	code_close: "#383A42", // fallback to code
	italic_open: "#A626A4", // fallback to italic
	italic_close: "#A626A4", // fallback to italic
	link_text_open: "#986801", // link text bracket punctuation
	link_text_close: "#986801", // link text bracket punctuation
	strike_open: "#383A42", // fallback to strike
	strike_close: "#383A42", // fallback to strike

	// markdown block markers
	blockquote_marker: "#A0A1A7", // markup.quote.markdown
	code_fence: "#383A42", // markup.raw.block.markdown
	front_matter_marker: "#A0A1A7", // fallback to comment/muted
	heading_marker: "#E45649", // punctuation.definition.heading.markdown
	hr: "#383A42", // meta.separator
	list_marker: "#383A42", // rendered markdown list marker in one-light
	task_marker: "#986801", // rendered task checkbox marker in one-light

	// markdown character-level
	escape: "#0184BC", // constant.character.escape
	hard_break: "#A0A1A7", // fallback to comment/muted

	// svelte
	expression: "#CA1243", // punctuation.section.embedded
	svelte_block: "#A626A4", // fallback to keyword
	svelte_directive: "#986801", // fallback to attribute

	// whitespace
	carriage_return: "inherit",
	newline: "inherit",
	space: "inherit",
	tab: "inherit",

	// raw containers (reclassifier placeholders)
	raw_code_block: "#383A42", // fallback to foreground
	raw_front_matter: "#383A42", // fallback to foreground
	raw_script: "#383A42", // fallback to foreground
	raw_style: "#383A42", // fallback to foreground
	raw_svelte_expression: "#383A42", // fallback to foreground

	// language-unique
	string_escape: "#0184BC", // constant.character.escape
	format: "#986801", // constant.character.format.placeholder.other.python storage
	attr_sigil: "#986801", // meta.attribute.rust
	bit: "#986801", // fallback to constant.numeric
	array_table_header: "#E45649", // support.type.property-name.toml fallback
	datetime: "#986801", // fallback to constant.numeric
	block_scalar_header: "#A0A1A7", // fallback to comment/muted
	directive: "#A626A4", // fallback to keyword
	doc_marker: "#A0A1A7", // fallback to comment/muted
	plain_scalar: "#383A42", // foreground
	tag: "#A626A4", // fallback to keyword for yaml !tag
	null: "#0184BC", // constant.language.json
};

export const dark: theme_palette = {
	background_color: "#282c34", // colors.editor.background

	// universal primitives
	boolean: "#56b6c2", // constant.language.json
	comment: "#7f848e", // comment
	identifier: "#e06c75", // variable.other.readwrite / variable
	keyword: "#c678dd", // keyword
	number: "#d19a66", // constant.numeric
	operator: "#56b6c2", // keyword.operator.logical / keyword.operator.css
	punctuation: "#abb2bf", // punctuation.separator.delimiter
	regex: "#e06c75", // string.regexp final rule
	string: "#98c379", // string
	template: "#98c379", // fallback to string; no generic string.template rule

	// named entities
	attribute: "#d19a66", // entity.other.attribute-name
	builtin: "#56b6c2", // support.function
	class_name: "#e5c07b", // entity.name.class
	constant: "#d19a66", // constant
	decorator: "#56b6c2", // support.token.decorator.python / meta.function.decorator.identifier.python
	lifetime: "#e5c07b", // entity.name.lifetime.rust
	namespace: "#e5c07b", // entity.name.namespace
	parameter: "#e06c75", // variable.parameter.function.js / Rust parameter fallback
	property: "#abb2bf", // support.type.property-name
	type: "#e5c07b", // entity.name.type / support.class
	variable: "#e06c75", // variable
	variant: "#56b6c2", // fallback to constant.language; no enum member scope
	function: "#61afef", // entity.name.function

	// markup (html, svelte, tsx)
	attr_name: "#d19a66", // entity.other.attribute-name
	doctype: "#7f848e", // fallback to comment; no explicit doctype scope
	entity: "#e06c75", // constant.character.entity
	tag_name: "#e06c75", // entity.name.tag

	// css selectors + units
	css_variable: "#e06c75", // support.type.property-name.json / variable property fallback
	selector: "#e06c75", // entity.name.tag
	selector_class: "#d19a66", // entity.other.attribute-name.class.css
	selector_id: "#61afef", // entity.other.attribute-name.id
	selector_pseudo: "#56b6c2", // entity.other.attribute-name.pseudo-class
	unit: "#e06c75", // keyword.other.unit

	// diff
	changed: "#e5c07b", // markup.changed.diff
	changed_marker: "#e5c07b", // fallback to changed
	deleted: "#e06c75", // markup.deleted
	deleted_marker: "#e06c75", // fallback to deleted
	hash: "#7f848e", // fallback to comment/muted
	heading: "#e06c75", // markup.heading / entity.name.section.markdown
	inserted: "#98c379", // markup.inserted
	inserted_marker: "#98c379", // fallback to inserted
	label: "#7f848e", // fallback to comment/muted

	// markdown content
	autolink: "#61afef", // string.other.link.title/description fallback
	bold: "#d19a66", // markup.bold
	code: "#98c379", // markup.inline.raw.markdown
	code_block: "#98c379", // markup.raw fallback
	code_language: "#61afef", // fallback to entity.name.section / fence info
	italic: "#c678dd", // markup.italic
	link_text: "#61afef", // visible link text as rendered by one-dark-pro
	strike: "#abb2bf", // fallback to foreground; no explicit strikethrough scope
	url: "#c678dd", // markup.underline.link.markdown / link destination
	url_link: "#e06c75", // punctuation.definition.metadata.markdown
	url_title: "#e06c75", // title token includes quote punctuation in twinkleplop

	// markdown open/close markers
	autolink_open: "#61afef", // fallback to autolink
	autolink_close: "#61afef", // fallback to autolink
	bold_open: "#d19a66", // fallback to bold
	bold_close: "#d19a66", // fallback to bold
	code_open: "#e5c07b", // punctuation.definition.raw.markdown
	code_close: "#e5c07b", // punctuation.definition.raw.markdown
	italic_open: "#c678dd", // fallback to italic
	italic_close: "#c678dd", // fallback to italic
	link_text_open: "#abb2bf", // link text bracket punctuation
	link_text_close: "#abb2bf", // link text bracket punctuation
	strike_open: "#abb2bf", // fallback to strike
	strike_close: "#abb2bf", // fallback to strike

	// markdown block markers
	blockquote_marker: "#5c6370", // markup.quote.markdown
	code_fence: "#e5c07b", // punctuation.definition.raw.markdown
	front_matter_marker: "#7f848e", // fallback to comment/muted
	heading_marker: "#e06c75", // punctuation.definition.heading.markdown
	hr: "#7f848e", // fallback to comment/muted
	list_marker: "#e5c07b", // punctuation.definition.list.markdown
	task_marker: "#abb2bf", // rendered task checkbox marker in one-dark-pro

	// markdown character-level
	escape: "#56b6c2", // constant.character.escape
	hard_break: "#7f848e", // fallback to comment/muted

	// svelte
	expression: "#e06c75", // punctuation.section.embedded
	svelte_block: "#c678dd", // fallback to keyword
	svelte_directive: "#d19a66", // fallback to attribute

	// whitespace
	carriage_return: "inherit",
	newline: "inherit",
	space: "inherit",
	tab: "inherit",

	// raw containers (reclassifier placeholders)
	raw_code_block: "#abb2bf", // foreground
	raw_front_matter: "#abb2bf", // foreground
	raw_script: "#abb2bf", // foreground
	raw_style: "#abb2bf", // foreground
	raw_svelte_expression: "#abb2bf", // foreground

	// language-unique
	string_escape: "#56b6c2", // constant.character.escape
	format: "#d19a66", // constant.character.format.placeholder.other.python
	attr_sigil: "#abb2bf", // rust attribute sigil punctuation fallback
	bit: "#d19a66", // fallback to constant.numeric
	array_table_header: "#e06c75", // support.type.property-name.toml
	datetime: "#d19a66", // fallback to constant.numeric
	block_scalar_header: "#7f848e", // fallback to comment/muted
	directive: "#c678dd", // fallback to keyword
	doc_marker: "#7f848e", // fallback to comment/muted
	plain_scalar: "#abb2bf", // foreground
	tag: "#c678dd", // fallback to keyword for yaml !tag
	null: "#56b6c2", // constant.language.json
};
