# Token vocabulary

Every token emitted by any grammar in this directory, sorted by how many
languages use it. Intermediate / implementation-detail tokens are excluded:

- markdown's `*_open` / `*_close` pairs (consumed by the markdown reclassifier
  to compose space-separated class names — never surface as final tokens)
- `raw_*` containers (`raw_script`, `raw_style`, `raw_svelte_expression`,
  `raw_code_block`, `raw_front_matter`) — placeholders handed to sub-grammars
  for re-tokenization, never the final token type on emitted output

`clike` has no implementation and is not counted.

Recent merges:
- `tag_boundary` → `punctuation` (html, svelte, tsx)
- `svelte_element` → `keyword` (svelte)
- `variable_special` → `variable` (bash)
- `macro` → `builtin` (rust; bash already had `builtin`)
- `alias`, `anchor` → `variable` (yaml)
- `url_reference` → `property` (markdown)
- `context`, `meta` dropped from diff (unhighlighted — no token emitted)

---

## 17 languages

- **comment** — bash, css, diff, diff-basic, go, html, javascript, json, markdown, python, rust, sql, svelte, toml, tsx, typescript, yaml

## 16 languages

- **punctuation** — bash, css, diff, diff-basic, go, html, javascript, json, python, rust, sql, svelte, toml, tsx, typescript, yaml

## 15 languages

- **string** — bash, css, diff, go, html, javascript, json, python, rust, sql, svelte, toml, tsx, typescript, yaml

## 14 languages

- **number** — bash, css, diff, diff-basic, go, javascript, json, python, rust, sql, toml, tsx, typescript, yaml

## 13 languages

- **keyword** — bash, css, diff, go, javascript, json, python, rust, sql, svelte, toml, tsx, typescript

## 12 languages

- **operator** — bash, css, go, html, javascript, python, rust, sql, svelte, toml, tsx, typescript

## 10 languages

- **boolean** — bash, go, javascript, json, python, rust, toml, tsx, typescript, yaml

## 8 languages

- **identifier** — bash, go, javascript, python, rust, sql, tsx, typescript

## 5 languages

- **function** — go, javascript, rust, tsx, typescript

## 4 languages

- **property** — css, markdown, toml, yaml
- **regex** — bash, javascript, tsx, typescript

## 12 languages

- **string_escape** — bash, css, go, javascript, json, python, rust, sql, toml, tsx, typescript, yaml

## 3 languages

- **attr_name** — html, svelte, tsx
- **tag_name** — html, svelte, tsx
- **template** — javascript, tsx, typescript
- **variable** — bash, sql, yaml

## 2 languages

- **builtin** — bash, rust
- **changed** — diff, diff-basic
- **changed_marker** — diff, diff-basic
- **class_name** — python, rust
- **decorator** — tsx, typescript

## 5 languages (reclassifier-only)

- **constant** — go, javascript, python, rust, typescript (all via `promote_by_upper_snake_case`; tag-gated, downgrades to identifier under low fidelity)
- **deleted** — diff, diff-basic
- **deleted_marker** — diff, diff-basic
- **doctype** — html, svelte
- **entity** — markdown, tsx
- **heading** — diff, markdown
- **inserted** — diff, diff-basic
- **inserted_marker** — diff, diff-basic
- **label** — diff, diff-basic
- **type** — tsx, typescript

## 1 language

- **array_table_header** — toml
- **attr_sigil** — rust
- **attribute** — rust
- **autolink** — markdown
- **bit** — sql
- **block_scalar_header** — yaml
- **blockquote_marker** — markdown
- **bold** — markdown
- **carriage_return** — whitespace
- **code** — markdown
- **code_block** — markdown
- **code_fence** — markdown
- **code_language** — markdown
- **css_variable** — css
- **datetime** — toml
- **directive** — yaml
- **doc_marker** — yaml
- **escape** — markdown
- **expression** — svelte
- **format** — python
- **front_matter_marker** — markdown
- **hard_break** — markdown
- **hash** — diff
- **heading_marker** — markdown
- **hr** — markdown
- **italic** — markdown
- **lifetime** — rust
- **link_text** — markdown
- **list_marker** — markdown
- **newline** — whitespace
- **null** — yaml
- **plain_scalar** — yaml
- **selector** — css
- **selector_class** — css
- **selector_id** — css
- **selector_pseudo** — css
- **space** — whitespace
- **strike** — markdown
- **svelte_block** — svelte
- **svelte_directive** — svelte
- **tab** — whitespace
- **tag** — yaml
- **task_marker** — markdown
- **unit** — css
- **url** — markdown
- **url_link** — markdown
- **url_title** — markdown
