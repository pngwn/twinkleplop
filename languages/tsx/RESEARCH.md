# tsx lexical research

target: a tsx (typescript + jsx) syntax highlighter. tsx is the dialect used
in `.tsx` files, where jsx's `<tag>...</tag>` syntax coexists with typescript's
type system. lexically, tsx equals the full typescript grammar, minus the
angle-bracket type assertion form (which is disallowed in `.tsx` to eliminate
the jsx/cast ambiguity), plus the jsx grammar from the ecmascript jsx draft
proposal.

this research deliberately focuses on the jsx-specific additions and the
ambiguities that appear only in tsx. everything not mentioned is inherited
from the existing typescript grammar (itself building on javascript). the
author should start from the typescript package as the base and add only the
constructs catalogued in sections 2-5.

## sources consulted

primary (official):

- https://facebook.github.io/jsx/ — the jsx draft specification (the canonical grammar). latest revision dated 2022. all grammar productions used below are quoted from this spec.
- https://github.com/facebook/jsx — the jsx repository (readme notes jsx is "designed as an ecmascript feature and the similarity to xml is only for familiarity"). grammar linked from readme is the facebook.github.io/jsx page.
- https://www.typescriptlang.org/docs/handbook/jsx.html — typescript handbook chapter on jsx. authoritative for tsx-specific behavior. contains the "angle bracket type assertions are disallowed in .tsx" rule and the capitalization rule for intrinsic vs component elements.
- https://tc39.es/ecma262/ — ecmascript language specification (jsx extends ecmascript's `PrimaryExpression`, so the jsx spec refers to `AssignmentExpression`, `IdentifierStart`, `IdentifierPart`, `SourceCharacter` from ecma-262).
- https://www.typescriptlang.org/docs/handbook/2/everyday-types.html — typescript handbook on type assertions. establishes `value as T` as the only tsx-legal form.

cross-reference (existing highlighters):

- https://github.com/tree-sitter/tree-sitter-typescript — tree-sitter grammar. its `tsx` dialect re-enables `_jsx_element` in the expression union and removes `type_assertion`. precedence rule `[$.jsx_opening_element, $.type_parameter]` documents the known conflict. `common/define-grammar.js` shows the JSX productions (jsx_element, jsx_self_closing_element, jsx_fragment, jsx_opening_element, jsx_closing_element, jsx_attribute, jsx_namespace_name, jsx_text, jsx_expression).
- https://github.com/PrismJS/prism/blob/master/components/prism-tsx.js — prism tsx is `Prism.languages.extend('jsx', typescript)` then deletes `parameter` and `literal-property`, and patches the tag regex with a negative lookbehind `(?:^|[^\w$]|(?=</))` to avoid matching `<T>` as a jsx tag in generic positions. comment states "doesn't work with TS because TS is too complex."
- https://github.com/microsoft/TypeScript-TmLanguage — the textmate grammar used by vscode for `.tsx`. models jsx as its own `meta.jsx.ts` scope; treats text between tags as `meta.jsx.children.ts`.
- https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-jsx — babel's jsx parser. cross-referenced for entity handling and whitespace rules (babel implements the spec's html character reference table).
- https://github.com/microsoft/TypeScript/issues/15713 — design-issue tracking the generic-arrow vs jsx ambiguity. confirms the three community-established workarounds: `<T,>() => T`, `<T extends unknown>() => T`, and `<T, U>(...)` (multiple parameters, no disambiguation needed).

gaps and calls:

- the jsx spec explicitly punts on whitespace normalization in jsx children: implementations decide how to collapse runs of whitespace when emitting the tree. this is a transform concern, not a lexical one. the highlighter emits all jsx text as-is.
- the jsx spec's html character reference list is the 252 html4 entity names (amp, lt, gt, quot, apos, nbsp, etc.), NOT the full html5 set. the highlighter does not need to validate the entity name; it can treat any `&name;` shape that appears in jsx text/string as an escape-like token, and any `&#123;` / `&#xFF;` shape likewise. the reclassifier/theme can decide whether to distinguish "known" from "unknown" entities.
- jsx allows tags to span multiple lines (attributes separated by whitespace/newlines) and allows comments between attributes. the author needs to accept whitespace and js comments (`//` to eol, `/* ... */`) inside an opening tag, but NOT in tag-name position.
- the jsx spec does NOT define a case-sensitivity rule for element names. the spec-level grammar treats all names as `JSXIdentifier`. the lowercase-vs-uppercase distinction (intrinsic html elements vs react components) is a react/typescript convention applied AFTER lexing. the highlighter may emit a sub-token for this distinction (theme convention: lowercase → `tag`, uppercase → `selector_class` / `component`), but at the lex level they are the same `jsx.identifier`.
- tsx does not contain regex literals inside jsx expression containers any differently than typescript does. the regex/division disambiguation rules of the typescript grammar apply unchanged once we re-enter js expression mode.
- `void` elements (html-style self-closing like `<br>`, `<img>` without `/>`) are NOT part of the jsx grammar. every jsx element MUST either self-close with `/>` or have a matching closing tag. this is a common source of confusion for people coming from html; the highlighter can still be lenient and recover after an unterminated element if needed, but the spec rejects such input.
- html comments `<!-- ... -->` are NOT jsx comments. jsx comments live inside expression containers: `{/* ... */}`. a `<!--` in jsx source is a syntax error (interpreted as `<` + `!` + `-` + ...). a highlighter operating on partial/invalid input may want to swallow html comments for graceful degradation, but the spec says no.
- adjacent text rules: jsx text may contain `>` and `}` characters lexically? the spec says `JSXText :: SourceCharacter but not one of { or < or > or }`. so `>` and `}` are NOT allowed in jsx text and must be written as entities (`&gt;`, `&#125;`) or moved inside an expression container. the highlighter can accept the `>` / `}` as invalid-but-recover, or emit them as punctuation errors. in practice tree-sitter-jsx accepts them for recovery.

spec-wins policy: when prism/tree-sitter/highlight.js disagree with the jsx
draft spec, the spec wins. documented conflicts:

- prism's tag regex has the negative-lookbehind `(?:^|[^\w$]|(?=</))` which treats any `<` preceded by an identifier-tail character as NOT a jsx tag. this is a pragmatic regex hack that over-rejects valid jsx (e.g. immediately after a template literal `` `...` ``, a string, or a closing paren). the twinkleplop grammar should instead track state: jsx is only valid in expression position, so we decide "is the current position an expression start" and enter jsx mode accordingly. this is the same problem the js grammar already solves for regex-vs-division.
- highlight.js lexes jsx with a narrow tag-only regex and treats everything between as plain text, missing expression containers entirely. follow the spec: `{ ... }` inside jsx is a first-class construct.
- tree-sitter's `jsx_expression` permits `...` spread at the start; babel permits it for children (`{...items}` as a child) AND for attributes (`<Comp {...props} />`). the spec agrees. we include both forms.

---

## 1. primary sources

jsx extends ecmascript's `PrimaryExpression` production:

```
PrimaryExpression : JSXElement
PrimaryExpression : JSXFragment
```

so jsx can appear anywhere an expression is expected: inside a `return`, as
the rhs of `=`, inside `()` and `[]` and `{}`, inside template literal
interpolations, as an arrow body, and so on. the tokenizer needs to decide at
every `<` in expression position whether it opens a jsx element or is the
less-than operator / generic angle bracket / type assertion.

in `.tsx`, the type assertion form `<T>value` is disallowed by typescript
(see sources). this removes one source of ambiguity — but `<T>() => T` as a
generic arrow function still collides with `<T>()` as jsx open + children
(empty paren expression). typescript's workaround is documentary, not
lexical: users write `<T,>() => T` or `<T extends unknown>() => T`. the
tokenizer sees a jsx tag in both cases and depends on later context (the
comma, the `extends` keyword) to switch interpretation. for a highlighter
this does not need to be resolved — both interpretations produce reasonable
coloring:

- `<T,>` under jsx interpretation: `<` + `T` (tag name) + `,` (invalid but
  recoverable) + `>` — would likely fail recovery
- under generic interpretation: `<` + `T` + `,` + `>` — all punctuation

in practice a tsx tokenizer should refuse to enter jsx mode when the opener
looks like a generic parameter list. cheap heuristic: after consuming the
opening `<` and the tag-name characters, peek at the next non-whitespace
character.

- `,` → this is a generic type parameter list (bail out of jsx)
- `=` that is NOT part of `==` / `===` → ambiguous (could be attribute `=`
  or assignment); if preceded by identifier + whitespace it's likely a jsx
  attribute
- `extends` keyword → generic type parameter list
- `>` → could be either jsx-self-close-with-closing-tag OR generic with
  one parameter
- `/>`→ definitely jsx (self-closing element)
- letter / `{` / `"` / `'` → jsx attribute

this level of lookahead is the author's problem; for research purposes,
document that the ambiguity exists and the heuristics that resolve it.

the lexical units a tsx highlighter emits:

- everything the typescript grammar emits (keywords, identifiers, numbers,
  strings, template literals, operators, comments, regex, decorators, built-in
  type names, etc.)
- PLUS the jsx-specific token categories below (§2.2)

---

## 2. token inventory

### 2.1 inherited from typescript

skip; see the existing typescript grammar for the full list. notable points
that matter for tsx interaction:

- template literals `` `...${expr}...` `` — inside a template literal
  interpolation, an expression can be jsx. so jsx can nest inside template
  literal inside jsx attribute inside jsx expression, etc.
- decorators `@decorator` — tsx has decorators too. the `@` character before
  an identifier at statement-start position is a decorator, NOT a jsx thing.
- arrow functions `() => expr` — the body is an expression, which can be jsx.
  `() => <div />` is the canonical example.
- generics `Array<T>` / `foo<T>(x)` — angle brackets in type position are
  generics, NOT jsx. discriminator: generics appear after an identifier with
  no intervening whitespace (`foo<T>`), while jsx `<` follows an expression
  position token (`(`, `=`, `return`, `,`, etc.) or statement start.
- type assertion `value as T` — allowed in tsx. the alternate `<T>value` form
  is DISALLOWED in `.tsx` files (see §3.1).

### 2.2 jsx-specific tokens

the jsx grammar from facebook.github.io/jsx (quoted verbatim where useful):

**jsx element (umbrella production)**

```
JSXElement ::
    JSXSelfClosingElement
    JSXOpeningElement JSXChildren? JSXClosingElement
```

**jsx fragment**

```
JSXFragment ::
    < > JSXChildren? < / >
```

a fragment has the literal characters `<>` and `</>`, with optional children
between. `<>` is NOT a generic empty type parameter list — in tsx,
`<>` in expression position is a fragment.

**jsx self-closing element**

```
JSXSelfClosingElement ::
    < JSXElementName JSXAttributes? / >
```

**jsx opening element**

```
JSXOpeningElement ::
    < JSXElementName JSXAttributes? >
```

**jsx closing element**

```
JSXClosingElement ::
    < / JSXElementName >
```

early error: opening and closing element names must match exactly as source
text (the spec uses the phrase "match exactly", which means identical source
characters — not "semantically equivalent"; `<Foo.Bar>` must close with
`</Foo.Bar>`, not `</Foo .Bar>` or `</Foo . Bar >`).

**jsx element name (three forms)**

```
JSXElementName ::
    JSXIdentifier
    JSXNamespacedName
    JSXMemberExpression

JSXIdentifier ::
    IdentifierStart
    JSXIdentifier IdentifierPart
    JSXIdentifier - (no whitespace)
```

notable: `JSXIdentifier` permits `-` as an identifier-continuation character.
so `data-foo` is a valid jsx identifier (and attribute name). this is a
divergence from ecmascript identifiers, which do NOT allow `-`. in tag names
dashes are unusual but legal (`<my-element>` for custom elements).

```
JSXNamespacedName ::
    JSXIdentifier : JSXIdentifier
```

used for xml-namespaced elements and attributes: `<svg:path>` as an element
name, `xlink:href` as an attribute name. both sides must be `JSXIdentifier`
(no member access across the colon). whitespace is NOT allowed around the `:`.

```
JSXMemberExpression ::
    JSXIdentifier . JSXIdentifier
    JSXMemberExpression . JSXIdentifier
```

used for component access: `<React.Fragment>`, `<Lib.Thing.SubThing>`. left-
associative, dots with no whitespace around them.

note: `JSXNamespacedName` and `JSXMemberExpression` are mutually exclusive.
you cannot have `<foo:bar.baz>` or `<foo.bar:baz>`.

**jsx attributes**

```
JSXAttributes ::
    JSXSpreadAttribute JSXAttributes?
    JSXAttribute JSXAttributes?

JSXAttribute ::
    JSXAttributeName JSXAttributeInitializer?

JSXAttributeName ::
    JSXIdentifier
    JSXNamespacedName

JSXAttributeInitializer ::
    = JSXAttributeValue

JSXAttributeValue ::
    " JSXDoubleStringCharacters? "
    ' JSXSingleStringCharacters? '
    { AssignmentExpression }
    JSXElement
    JSXFragment

JSXSpreadAttribute ::
    { ... AssignmentExpression }
```

points:

- an attribute with no `=` is a boolean true: `<input disabled>`.
- the value can be a string, an expression container, or a nested element
  (no expression container needed for the nested form: `prop=<Foo />`).
- whitespace is required between successive attributes but not required
  around `=` (spec-grammar doesn't allow whitespace around `=`, but prettier-
  formatted code never emits it either; most tokenizers accept both).
  actually the spec: `JSXAttributeInitializer :: = JSXAttributeValue` with no
  allowance for whitespace. but every real parser accepts whitespace around
  `=`. highlighters follow the lenient convention.
- spread attribute `{...x}` can contain any `AssignmentExpression`, not just
  an identifier. `<Comp {...(cond ? a : b)} />` is legal.
- attribute strings do NOT process `\n` style escapes — they are JSX strings,
  which follow the html character reference model. `&amp;` is decoded,
  `\n` is NOT. this is the reverse of ecmascript string literals.

**jsx attribute string characters**

```
JSXDoubleStringCharacters ::
    JSXDoubleStringCharacter JSXDoubleStringCharacters?

JSXDoubleStringCharacter ::
    JSXStringCharacter
    HTMLCharacterReference

JSXStringCharacter :: SourceCharacter but not HTMLCharacterReference
                     (further restricted: not " in double-quoted, not ' in single-quoted)
```

so backslash is a plain character (not an escape initiator) and the only
"escapes" are html character references. newline is allowed in a jsx string
literal (spec does not forbid it), although most style guides discourage it.

**html character references (three forms)**

```
HTMLCharacterReference ::
    & HTMLNamedCharacterReferenceName ;
    & # DecimalDigits ;
    & # x HexDigits ;
```

named references are drawn from "HTML 4.0 character entity references" — the
252-name list (amp, lt, gt, quot, apos, nbsp, copy, reg, trade, mdash,
ndash, ldquo, rdquo, lsquo, rsquo, hellip, middot, laquo, raquo, iexcl,
iquest, ...). the jsx spec does NOT adopt the html5 expansion.

decimal and hex numeric references are bounded by `0x10FFFF` (the unicode
maximum). `&#0;` is allowed lexically but encodes U+0000.

**jsx children**

```
JSXChildren ::
    JSXChild JSXChildren?

JSXChild ::
    JSXText
    JSXElement
    JSXFragment
    { JSXChildExpression? }

JSXChildExpression ::
    AssignmentExpression
    ... AssignmentExpression

JSXText ::
    SourceCharacter but not one of { or < or > or }
```

children are a sequence of text runs, nested elements, fragments, and
expression containers. the expression container may be empty (`{}`), which
is pointless but legal. the expression container may contain a spread
(`{...items}`), which is invaluable for react lists.

notice the `>` and `}` exclusions from jsx text: these must be escaped as
`&gt;` / `&#125;` or moved inside expression containers. most real jsx code
contains bare `>` in text all the time (e.g. `a > b`) and parsers accept it
for ergonomic reasons; the spec is stricter than practice here.

**jsx text**: runs of source characters excluding `{`, `<`, `>`, `}`. this
includes whitespace, newlines, tabs. html character references inside jsx
text are recognized.

**whitespace significance**: the spec says nothing about whitespace
normalization. react's transformer strips leading/trailing whitespace-only
lines; preact does similarly. a highlighter does NOT normalize — it emits
the whitespace as text.

**jsx comment**: there is no jsx-level comment syntax. to put a comment in
a jsx tree, use an expression container with a js comment: `{/* this is a
comment */}`. since the expression is empty inside (no assignment
expression, just a comment + the inline comment's value is undefined
technically), most parsers accept an empty expression container that
contains only whitespace and comments as equivalent to `{}`.

### 2.3 token categories for highlighting

the twinkleplop token set should include (on top of the typescript tokens):

- `jsx.punctuation.tag.open` — `<` starting an opening/self-closing tag
- `jsx.punctuation.tag.close` — `>` ending an opening tag
- `jsx.punctuation.tag.self_close` — `/>` of a self-closing tag
- `jsx.punctuation.tag.end_open` — `</` of a closing tag
- `jsx.punctuation.fragment.open` — `<>` (or `<` + `>` in fragment context)
- `jsx.punctuation.fragment.close` — `</>` (or `</` + `>`)
- `jsx.tag` / `tag` — element name (lowercase intrinsic)
- `jsx.tag.component` / `selector_class` — element name (uppercase component)
- `jsx.tag.namespace` — the namespace portion of `svg:path`
- `jsx.tag.member` — the left side of `Lib.Component`
- `jsx.attribute.name` — attribute name
- `jsx.attribute.name.namespace` — namespace portion of attr name
- `jsx.attribute.punctuation.equals` — `=` between name and value
- `jsx.attribute.string` — the full `"..."` or `'...'` attribute value
- `jsx.attribute.string.punctuation.open` / `.close` — the quotes
- `jsx.attribute.entity` / `string.escape` — html character references
- `jsx.expression.punctuation.open` — `{` that opens an attribute or child
  expression container
- `jsx.expression.punctuation.close` — `}` that closes one
- `jsx.expression.punctuation.spread` — `...` inside `{...x}`
- `jsx.text` / `text` / `plain-text` — jsx text content
- `jsx.text.entity` — named or numeric html entity inside jsx text

most themes do not need all of these; the minimum viable set is the tag
punctuation, the tag name, the attribute name, the attribute string, and the
text. expression containers re-enter js mode and use js/ts token categories
inside.

---

## 3. edge case inventory

### 3.1 the tsx-vs-ts angle bracket rules

- in `.ts`: `<T>value` is a type assertion (identical to `value as T`).
- in `.tsx`: `<T>value` is a syntax error by typescript's rule. the lexer
  should STILL parse it as an attempted jsx element (opening `<T>` then
  whatever follows); the parser / linter surfaces the error.
- in BOTH: `value as T` is the recommended form.
- in BOTH: `value satisfies T` is another assertion-like form (no lexical
  interaction with jsx).
- in BOTH: `<T>(x: T) => T` function declaration body: the `<T>` is a
  generic parameter list, not jsx, because it appears in a function-
  declaration position (after `function` keyword, or in a method body
  signature). this is purely syntactic; lexically the `<` is still a token.

### 3.2 the generic-arrow-vs-jsx ambiguity

the canonical example: `const f = <T>(x: T): T => x;`

in a `.tsx` file, the tokenizer sees `<T>` in expression position and must
decide: jsx or generic arrow?

- community-established workarounds make the code UNAMBIGUOUS:
  - `<T,>(x: T) => x` — trailing comma in type param list (only one
    param, so the comma is the disambiguator). jsx element names cannot be
    followed by a comma inside the open tag, so this is unambiguously
    generic.
  - `<T extends unknown>(x: T) => x` — the `extends` keyword cannot appear
    inside a jsx opening tag.
  - `<T, U>(x: T, y: U) => ...` — multiple type parameters; the comma
    between them disambiguates.
- without a workaround, tsx interprets `<T>...` as jsx (opening tag `<T>`).

for the tokenizer, a sensible rule: enter jsx mode on a `<` in expression
position UNLESS the lookahead reveals a type-parameter-list shape. cheap
checks after consuming the tag-name:

- `,` then `>` or `,`-list — generic
- `extends` keyword — generic
- `=` followed by `>` or identifier — could be attribute `key=value`, so
  jsx; unless we've already committed to generic
- otherwise jsx

but: the simplest and most common approach (used by tree-sitter, prism) is
"try jsx, let the parser error if it's not". for a highlighter, emitting
both the jsx-open `<T>` and the following `(x: T) => x` tokens is visually
fine: the user sees the typo.

### 3.3 generic function calls `foo<T>(x)`

in `.ts`: `foo<T>(x)` is a generic function call; `<` `T` `>` are typescript
tokens.

in `.tsx`: same interpretation. the `<` is preceded by an identifier WITH
NO WHITESPACE, which is a clue that it is not a jsx tag (jsx tags appear in
expression position, where they are preceded by whitespace or a
punctuator). a tsx tokenizer should require the `<` to be preceded by
whitespace or `(`, `,`, `=`, `=>`, `? `, `:`, `return`, etc. (an expression-
start position) before entering jsx mode.

### 3.4 jsx inside template literals

```tsx
const html = `Hello ${(<b>name</b>)}`;
```

inside a template literal interpolation, the expression can be jsx. the
tokenizer: in template-literal state, on `${` push js-expression state; in
that state, on `<` in expression position, push jsx state. exits are
symmetric.

### 3.5 jsx inside jsx (nested elements)

```tsx
<div>
  <span>hello</span>
  <p>world</p>
</div>
```

inside a jsx element's children region, each `<` can open a nested element.
each nested element is tracked by the same grammar. the outer element's
closing `</div>` must match the outer element's opening name. a highlighter
does not need to validate name matching — it just lexes each side.

### 3.6 jsx expression containers in attribute position

```tsx
<Comp
  value={x + 1}
  style={{ color: "red" }}
  callback={async () => await fetch("/api")}
  children={<div />}
/>
```

inside an attribute value `{...}`, arbitrary js/ts expressions are allowed.
the contents may include:

- nested objects `{{...}}` — the outer `{` is the jsx container, the inner
  `{...}` is an object literal. bracket depth tracking is essential.
- nested jsx (a jsx element as an attribute value).
- nested template literals with further interpolations.
- arrow functions, async/await, type assertions (with `as`), generics.
- multiline expressions with newlines inside.

the jsx container closes on a `}` at bracket depth 0 (within the container).
this is structurally identical to f-string expression handling in python.

### 3.7 jsx expression containers as children

```tsx
<ul>
  {items.map((x) => (
    <li key={x.id}>{x.name}</li>
  ))}
  {count > 0 && <Badge count={count} />}
  {...items}
</ul>
```

between children, `{...}` is a child expression container. like the
attribute form, it contains an arbitrary js expression. additionally a
`... expr` spread form is allowed (`{...items}`) for spreading an iterable
of children.

### 3.8 empty jsx constructs

- `<></>` — empty fragment. lexically: `<` `>` (open frag) then `</` `>`
  (close frag).
- `<br />` — self-closing with a slash + `>` pair.
- `<br/>` — no whitespace before `/` is allowed. `<br / >` is ambiguous per
  spec: production is `< JSXElementName JSXAttributes? / >`, so whitespace
  between `/` and `>` is forbidden by the no-whitespace-before-`/` rule in
  the jsx grammar. in practice parsers accept `/ >` too.
- `<Comp />` — component self-close.
- `<></>` vs `< / >` — spec requires `<>` and `</>` to be contiguous; the
  spec's `JSXFragment :: < > JSXChildren? < / >` production shows the
  `<` and `>` and `</` and `>` as separate token occurrences, but in practice
  they must NOT have whitespace inside. `< >` (with space) is NOT a fragment
  opener; it's a less-than + greater-than (which is a syntax error in
  expression position).

### 3.9 jsx text whitespace and character references

```tsx
<p>
  Hello, {name}! You have {count} new messages.
  <br />
  &copy; 2026 &mdash; all rights reserved
</p>
```

jsx text contains literal newlines, spaces, html entities, and arbitrary
unicode. character references:

- `&copy;` — named (html4 list).
- `&mdash;` — named.
- `&#32;` — decimal (space).
- `&#x20;` — hex (space).

unrecognized named entities (`&foo;`) are a parse error per the spec, but
react/babel emit a warning and keep the text as-is. the highlighter may
emit unknown entities as text rather than rejecting.

the jsx spec forbids `{`, `<`, `>`, `}` in jsx text. real parsers accept
`>` and `}` in text for ergonomic reasons; our grammar should probably
follow the lenient convention and emit them as plain text.

### 3.10 jsx strings don't process `\n`

```tsx
<Comp msg="hello\nworld" />
```

that attribute value is the literal 12-character string `hello\nworld` —
the `\n` is a backslash followed by `n`, NOT a newline. jsx strings use
html-style escapes (`&#10;` for newline) and do NOT use ecmascript string
escapes.

highlighter implication: inside a jsx attribute string, do NOT emit
`\n`/`\t`/`\"` as `string.escape` tokens. DO recognize `&...;` sequences
as escapes.

multi-line jsx attribute strings are allowed:

```tsx
<Comp
  msg="line one
line two"
/>
```

is a two-line string containing a literal newline.

### 3.11 attribute name with dash

```tsx
<Comp data-testid="foo" aria-label="bar" />
```

`data-testid` and `aria-label` are single identifiers per `JSXIdentifier`
(which allows `-`). the tokenizer must accept `-` as part of the identifier
in jsx mode, but NOT in regular ecmascript mode (where `a-b` would be
`a` minus `b`).

### 3.12 namespace attribute

```tsx
<svg xmlns="..." xmlns:xlink="...">
  <use xlink:href="#icon" />
</svg>
```

`xmlns:xlink` and `xlink:href` are `JSXNamespacedName` attribute names.
the `:` is part of the name; it is NOT the object-literal colon or the
ternary colon.

### 3.13 member expression in tag name

```tsx
<Motion.div initial={{ opacity: 0 }} />
<React.Fragment>
  ...
</React.Fragment>
<Lib.UI.Button />
</Lib.UI.Button>
```

the tag name may be a chain of dotted identifiers. each `.` is part of the
name — not the property-access operator. closing tags must reproduce the
full chain exactly.

### 3.14 boolean attribute (no value)

```tsx
<input disabled readOnly required />
<MyComp ariaHidden />
```

an attribute with no `=` is implicitly `true`. the tokenizer emits the
attribute name with no initializer.

### 3.15 spread attribute

```tsx
<Comp {...props} />
<Comp first={a} {...rest} last={z} />
```

`{...expr}` as an attribute is a `JSXSpreadAttribute`. the `...` inside is
not a regular spread — it's the spread-attribute marker. the expression
after can be any assignment expression.

### 3.16 nested jsx in attribute value

```tsx
<Comp header={<h1>Title</h1>} />
<Comp header=<h1>Title</h1> />
```

the spec allows a jsx element directly as an attribute value (no surrounding
`{...}`), but most style guides forbid it and some parsers reject it.
tree-sitter-tsx accepts both. for a highlighter, support both.

### 3.17 expression container as attribute value containing an object literal

```tsx
<div style={{ color: "red", padding: 4 }} />
```

the outer `{` starts the jsx expression container; the inner `{` starts an
object literal. on `}` the parser pops the object literal; on the next `}`
it pops the container. bracket depth inside jsx expression containers is
identical to normal js bracket depth.

### 3.18 jsx vs less-than operator

an expression-position `<` is jsx. a binary-operator-position `<` is less-
than. the rules are the same as the regex-vs-division discrimination the
existing js grammar already solves:

- expression position: after `(`, `[`, `{`, `=`, `==`, `===`, `!=`, `!==`,
  `<`, `<=`, `>`, `>=`, `+`, `-`, `*`, `/`, `%`, `&`, `|`, `^`, `~`, `!`,
  `?`, `:`, `,`, `;`, `=>`, `return`, `throw`, `new`, `typeof`, `void`,
  `delete`, `await`, `yield`, `in`, `of`, `instanceof`, the start of the
  file, an opening template literal `` ` ``, a `${` template interpolation
  start, an opening jsx container `{` / jsx attribute equals `=`.
- binary/relational position: after an identifier, a number, a string, a
  closing paren/bracket, or the keywords `this` / `super`.

this is the same set the js grammar tracks. tsx reuses it and reroutes a
`<` in expression position into jsx mode instead of typescript generics (in
tsx, the generic-arrow disambiguation rules apply; elsewhere generics only
appear in type-only positions, which are post-`:` or post-`<` contexts).

### 3.19 capitalized vs lowercase tag names

per the typescript handbook: `<foo>` (lowercase first char) is an intrinsic
element; `<Foo>` (uppercase) is a value-based / component element. this is
NOT a lexical rule — it is a typescript/jsx semantic convention. the
tokenizer emits the tag name with the same category regardless; a
reclassifier or theme can use the first-character casing to emit different
colors (common convention: intrinsic → `tag`, component → `selector_class`).

### 3.20 fragment `<>` inside expression

```tsx
const list = <>{items}</>;
```

`<>` in expression position opens a fragment. `</>` closes it. no whitespace
is allowed between `<` and `>` nor between `</` and `>`. both must be
contiguous source text.

distinguish from: `<>` is not: a generic empty-list (does not exist in ts);
a right-shift operator `>>` (that would need two `>` in a row); `< >` is a
less-than followed by greater-than which is a parse error.

### 3.21 closing tag with dots / namespaces

```tsx
<Foo.Bar.Baz>x</Foo.Bar.Baz>
<svg:path>x</svg:path>
```

the full dotted / namespaced name must reappear in the closing tag,
character-identical to the opener. whitespace differences cause a spec-
level error but parsers are often lenient.

### 3.22 single-line comment INSIDE a jsx opening tag

```tsx
<Comp
  // leading note
  value={x}
  /* block note */
  other="foo"
/>
```

comments between attributes are permitted by every real parser. the spec
grammar does NOT explicitly mention comments inside tags, but ecmascript
comments are allowed anywhere whitespace is allowed in the wrapping js, and
jsx is part of js. follow the lenient convention: accept `//` to eol and
`/* ... */` between attributes and between tag-start and attributes.

### 3.23 jsx in top-level expression statement

```tsx
<App />
```

a jsx element as an expression statement is fine. the leading `<` is at
statement-start position, which counts as expression position. the trailing
`;` is the statement terminator.

### 3.24 jsx pragma / `@jsxImportSource` comments

```tsx
/** @jsx h */
/** @jsxRuntime classic */
/** @jsxImportSource preact */
```

these are plain js block comments; the jsx toolchain reads the content to
configure the runtime. lexically they are just comments. no lexer impact.

### 3.25 html comments in jsx (spec-forbidden)

```tsx
<div>
  <!-- this is html, NOT jsx -->
</div>
```

jsx does NOT recognize `<!-- -->`. the above is a parse error: `<` followed
by `!` which is not a valid jsx start. a highlighter MAY emit `<!-- ... -->`
as an `invalid` token sequence, or recover by treating as `<` `!` `...`
tokens.

### 3.26 `>` and `}` in jsx text

per spec, `>` and `}` are forbidden in jsx text. in practice:

```tsx
<p>a > b && c < d</p>
```

most parsers accept the `>` as text. the `<` opens a new element (and since
`d` is followed by `<` `/` `p`, the less-than-d parse fails). to be safe,
users write `&gt;` and `&lt;`. the highlighter should:

- recognize `>` in jsx text as text (lenient).
- recognize `<` as opening a child element (strict — this is unambiguous).
- recognize `}` in jsx text as text (lenient, or emit as invalid-but-
  recoverable).
- recognize `{` as opening a child expression container (strict).

### 3.27 regex-vs-division inside jsx expression containers

```tsx
<div>{/regex/.test(x)}</div>
<div>{a / b}</div>
```

the regex-vs-division discriminator is the same as in normal js. when we
enter a jsx expression container, we start in expression position, so the
first `/` after `{` is a regex starter. after an identifier / literal / `)`,
the `/` is division.

### 3.28 no automatic semicolon insertion concerns in jsx

jsx elements are expressions, not statements. asi rules apply at the
statement level (where the jsx expression is embedded). nothing jsx-
specific about it.

### 3.29 case sensitivity summary

- jsx tag name identifiers: case-sensitive. the lowercase-vs-uppercase
  distinction is semantic (intrinsic vs component), NOT lexical.
- jsx attribute name identifiers: case-sensitive. convention: `camelCase`
  for component props, `kebab-case` / `data-*` / `aria-*` for html attrs.
- html named character references: case-sensitive per html4 spec (`&AMP;`
  is NOT valid; only `&amp;`).
- jsx strings: literal characters, case preserved.

### 3.30 things that look like jsx but aren't

- `<Foo />` at the start of a line after a line with a pending infix
  operator: js asi may split the line such that `<Foo />` is an expression
  statement, OR the pending operator may be continued onto this line — in
  which case the `<` is a less-than. this is a style issue, not a tokenizer
  issue.
- `typeof x < y` — the `<` is less-than, not jsx.
- `return <Foo />` — the `<` is jsx (after `return`, expression position).
- `return\n<Foo />` — asi inserts a semicolon after `return`, then the next
  statement starts with `<Foo />`. so it's `return;` then a jsx statement.
  well-known react footgun. lexically the `<` is still in expression
  position and we still open jsx.

---

## 4. nesting and context constructs

all context constructs inherited from typescript apply: js string literals,
template literals, comments, regex, generics, type annotations, decorator
expressions, etc. only the NEW jsx-specific constructs are listed here.

```
jsx element (the outer construct)
  opens: `<` in expression position, followed immediately by IdentifierStart
         OR followed by `>` (fragment) OR followed by `/` (closing tag —
         only inside a jsx children region, matching the most recent opener)
  closes: depends on variant (see below)
  nests: jsx-attributes, jsx-children, jsx-expression-containers
```

```
jsx self-closing element
  opens: `<` JSXElementName JSXAttributes?
  closes: `/>` (no whitespace between `/` and `>` per spec; parsers lenient)
  nests: attributes and attribute expression containers only (no children)
```

```
jsx opening tag (start of paired element)
  opens: `<` JSXElementName JSXAttributes?
  closes: `>` (leaves tag, enters children mode)
  nests: attributes, attribute values (strings, expression containers, nested
         elements)
```

```
jsx closing tag
  opens: `</`
  closes: `>`
  nests: nothing — only the JSXElementName (member/namespace chain allowed)
  constraint: name must match the most recent unclosed opening tag at this
              nesting level character-for-character
```

```
jsx fragment opener
  opens: `<` immediately followed by `>` (no whitespace, no name)
  closes: `>`
  nests: enters fragment children mode
```

```
jsx fragment closer
  opens: `</` immediately followed by `>` (no whitespace, no name)
  closes: `>`
  nests: nothing
```

```
jsx element name (non-recursive; consumed in one pass)
  production: JSXIdentifier (. JSXIdentifier)* | JSXIdentifier : JSXIdentifier
  characters:
    - start: IdentifierStart (js identifier start)
    - continuation: IdentifierPart OR `-` (jsx extension)
    - separator: `.` (member, only at outermost) or `:` (namespace, exactly one)
  whitespace: none permitted between parts of the name
```

```
jsx attribute name
  production: JSXIdentifier (: JSXIdentifier)?  — may be namespaced
  same character rules as element name (dashes allowed)
```

```
jsx attribute value: double-quoted string
  opens: `"` (following `=`)
  closes: `"`
  nests: HTMLCharacterReference only
  escapes: none (backslash is literal). `&amp;`, `&lt;`, `&#NNN;`, `&#xHH;` recognized
  special: newlines allowed in content
```

```
jsx attribute value: single-quoted string
  opens: `'` (following `=`)
  closes: `'`
  nests: HTMLCharacterReference only
  escapes: none (backslash is literal). html entities recognized
  special: newlines allowed in content
```

```
jsx attribute value: expression container
  opens: `{` (following `=`)
  closes: `}` at bracket depth 0
  nests: arbitrary js/ts expression, which may include:
         - more jsx elements / fragments
         - object/array/function literals
         - template literals (with further interpolations)
         - type assertions via `as`
         - strings / regex / etc.
  special: bracket depth tracking (`(`, `[`, `{`) required to distinguish
           the closing `}` from object/function body closers
```

```
jsx spread attribute
  opens: `{` immediately followed by `...` (three literal dots)
  closes: `}` at bracket depth 0
  nests: assignment expression
  special: `...` consumed as a single spread marker; expression after follows
           the jsx-expression-container rules
```

```
jsx attribute value: nested element (direct, no braces)
  opens: `<` (following `=`) — rare, most style guides forbid
  closes: `>` of the nested element's closing tag, or `/>` for self-close
  nests: everything a jsx element nests
```

```
jsx children region
  opens: `>` of an opening tag
  closes: `<` of the matching closing tag, or any `<` opening a nested tag
          (recursive)
  nests:
    - jsx text (runs of characters excluding `<`, `{`, `>`, `}`)
    - jsx elements (recursive)
    - jsx fragments (recursive)
    - jsx child expression containers
  special: html character references recognized in jsx text
```

```
jsx child expression container
  opens: `{` in jsx children position
  closes: `}` at bracket depth 0
  nests: optional `... expression` or `expression` (assignment expression),
         which may recursively contain anything an attribute container can
  special: empty (`{}`) is allowed; whitespace/comments-only is allowed; spread
           `{...items}` is allowed only here and in spread-attribute position
```

```
html character reference (inside jsx strings and jsx text)
  opens: `&`
  closes: `;`
  content variants:
    - named: letters/digits matching one of the 252 html4 entity names
    - decimal: `#` followed by decimal digits
    - hex: `#x` or `#X` followed by hex digits
  special: unrecognized named entities are technically errors; lenient parsers
           treat them as literal text including the `&` and `;`
```

---

## 5. manual trace

traces use plain english. grammar-author re-maps "enter jsx", "push children
region", etc. to concrete state operations.

### trace 1: component with attributes, children, expression containers, spread

input:

```tsx
import { useState } from "react";

type Props = { items: string[]; onPick: (s: string) => void };

export function Picker({ items, onPick }: Props) {
  const [q, setQ] = useState<string>("");
  return (
    <div className="picker" data-testid="picker">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
      <ul>
        {items
          .filter((x) => x.includes(q))
          .map((x) => (
            <li key={x} onClick={() => onPick(x)}>
              {x} &mdash; click to pick
            </li>
          ))}
      </ul>
    </div>
  );
}
```

selected trace (condensed for repetition):

- `import { useState } from "react";` — all typescript tokens. NEWLINE.
- `type Props = { items: string[]; onPick: (s: string) => void };` —
  typescript type declaration. `type` keyword, `Props` name, `=`, object-
  type-literal, `;`.
- `export function Picker({ items, onPick }: Props) {` — typescript. the
  destructuring `{ items, onPick }` is an object destructuring pattern; the
  `: Props` after is a type annotation; the `{` after `)` opens function
  body.
- `  const [q, setQ] = useState<string>("");`
  - `const` keyword, ` ` ws, `[q, setQ]` destructuring array pattern,
    ` ` ws, `=` op, ` ` ws.
  - `useState` — identifier. `<` — here the `<` is preceded by an
    identifier with NO whitespace, so we are in typescript generic
    territory, NOT jsx. emit `<` as punctuation/operator (type parameter
    start).
  - `string` name (typescript built-in type).
  - `>` close of generic list.
  - `(""` — `(`, `""` empty string, `)` close.
  - `;` end statement. NEWLINE.
- `  return (` — `return` keyword, ` ` ws, `(` open paren (expression
  position continues inside).
- `    <div className="picker" data-testid="picker">` — this is the
  interesting line.
  - `<` is in expression position (after `(` and whitespace). push jsx
    opening-tag state.
  - `div` → JSXIdentifier, emit as `jsx.tag` (lowercase).
  - ` ` ws (allowed between tag name and attributes).
  - `className` → JSXIdentifier attribute name, emit as `jsx.attribute`.
  - `=` → attribute-initializer equals, emit as `jsx.punctuation.equals`.
  - `"picker"` → attribute value string. `"` opens jsx string. `picker` is
    content. `"` closes.
  - ` ` ws.
  - `data-testid` → JSXIdentifier — note the `-` is part of the name.
  - `=` → equals.
  - `"picker"` → string.
  - `>` → close of opening tag; exit opening-tag state, enter jsx children
    state for `div`. emit `jsx.punctuation.tag.close`.
- `\n      ` → jsx text (just whitespace).
- `<input` — `<` opens a nested jsx element. push opening-tag state.
  - `input` → JSXIdentifier, `jsx.tag`.
- `\n        value=` — ws then attribute name `value` then equals.
- `{q}` — `{` opens attribute expression container. push js-expression
  state (but remembering we are inside an attribute container of the `input`
  element so we can pop properly). `q` → js identifier. `}` at bracket
  depth 0 → close expression container; pop back to `input` opening-tag
  state.
- `\n        onChange=` — whitespace, `onChange`, `=`.
- `{(e) => setQ(e.target.value)}` — attribute expression container.
  - `{` open container. push js-expression.
  - `(` paren depth 1.
  - `e` name.
  - `)` paren depth 0.
  - ` ` ws. `=>` arrow.
  - ` ` ws. `setQ` name. `(` paren depth 1. `e` name. `.` dot. `target` name.
    `.` dot. `value` name. `)` paren depth 0.
  - `}` at paren depth 0, bracket depth 0 → close container; pop to
    `input` opening-tag.
- `\n        placeholder=` → ws + attribute.
- `"Search..."` → jsx string. (the `...` inside are just three dots; not
  spread — we are in a jsx string.)
- `\n      /` → ws + `/`. in opening-tag state, `/` expects `>` to
  complete a self-close.
- `>` → completes `/>`. emit `jsx.punctuation.tag.self_close`. pop back to
  the outer `div` children state (since `input` self-closed, no children
  to consume).
- `\n      ` → ws (jsx text in `div` children).
- `<ul>` — open a nested element. emit tag-open, tag-name, tag-close. push
  children state for `ul`.
- `\n        ` → ws.
- `{items...` — `{` opens a child expression container. push js-expression
  state.
  - `items` → name.
  - `\n          .filter((x) => x.includes(q))` — js: `.`, `filter`, `(`,
    `(`, `x`, `)`, ` `, `=>`, ` `, `x`, `.`, `includes`, `(`, `q`, `)`, `)`.
  - `\n          .map((x) => (\n            <li ...`
    - `.`, `map`, `(`, `(`, `x`, `)`, ` `, `=>`, ` `, `(` — paren depth 1 inside
      the jsx container.
    - `\n            ` — ws.
    - `<li` — `<` in expression position (after `(` and ws). push jsx open-
      tag state. `li` → tag name.
    - ` key=` — ws, attribute name, equals.
    - `{x}` — expression container: `{`, `x`, `}`.
    - ` onClick=` — ws, attribute, equals.
    - `{() => onPick(x)}` — expression container with arrow and call.
    - `>` — close opening tag; enter `li` children.
    - `\n              ` — jsx text (ws).
    - `{x}` — child expression container: `{`, `x`, `}`.
    - ` &mdash; click to pick` — jsx text. the `&mdash;` is an html named
      entity; emit as `jsx.text.entity` sub-token, the rest is plain text.
    - `\n            ` — jsx text (ws).
    - `</li>` — closing tag: `</`, `li`, `>`. pop `li` children, pop `li`
      element. back in `map`'s paren group inside the outer `ul` child
      expression container.
    - `\n          )` — ws + `)` closing the `(` of `map(...)` first arg
      group. paren depth drops to 0 inside container.
    - `)` → closes the `.map(...)` call. paren depth still 0.
    - `}` at bracket depth 0 — closes the outer `{items...}` child
      expression container. back in `ul` children.
  - ...
- `\n      </ul>` — ws, closing tag: `</`, `ul`, `>`. pop ul. back in div
  children.
- `\n    </div>` — ws, closing tag `</div>`. pop div. back in js paren
  group.
- `\n  );` — ws, `)`, `;` end statement.
- `\n}` — closes function body.

observations:

- `useState<string>("")` is a generic function call, NOT jsx, because the
  `<` is glued to an identifier.
- `<div ...>` is jsx, because the `<` is in expression position after
  whitespace following `(`.
- `data-testid` proves we must accept `-` as part of a jsx identifier.
- `placeholder="Search..."` proves jsx strings don't interpret `...` as
  spread; spread only appears inside `{}`.
- the nested `<li>` inside the `.map(x => ...)` inside the `{items...}`
  child container shows jsx→js→jsx nesting depth can be arbitrary.

### trace 2: fragments, generic arrow ambiguity, as-assertions, nested objects

input:

```tsx
const id = <T,>(x: T): T => x;
const cast = value as number;
const items = [1, 2, 3] as const;
const Panel = () => (
  <>
    <h1>hi</h1>
    {id<string>("ok")}
  </>
);
const style: React.CSSProperties = { color: "red", padding: 4 };
const el = <div style={{ ...style, margin: 2 }}>content</div>;
```

trace (interesting parts):

- `const id = <T,>(x: T): T => x;`
  - `const id =` → ts tokens.
  - ` ` ws. `<` in expression position. push jsx opening-tag state as a
    guess.
  - `T` — identifier. tag-name region.
  - `,` — **the comma here is NOT valid inside a jsx opening tag**. a
    strict jsx tokenizer would bail. a tsx tokenizer: on seeing `,` after
    a tag-name position, switch interpretation to typescript generic
    parameter list. this is the trailing-comma workaround. emit `<` `T` `,`
    `>` as ts generic punctuation.
  - `>` — close of generic list.
  - `(x: T): T => x;` — ts arrow fn body. `(`, `x`, `:`, ` `, `T`, `)`,
    `:`, ` `, `T`, ` `, `=>`, ` `, `x`, `;`.
- `const cast = value as number;`
  - `const`, `cast`, `=`, ` `, `value`, ` `, `as` keyword, ` `, `number`
    (typescript built-in type), `;`.
  - note: `value as number` works in BOTH `.ts` and `.tsx`. the
    alternative `<number>value` form is disallowed in tsx and would be
    a syntax error (or emitted as `<number>` jsx open + `value` identifier
    - `;`).
- `const items = [1, 2, 3] as const;` — `as const` is a "const assertion".
  tokens: `as`, ` `, `const` (keyword). this is unambiguous in tsx.
- `const Panel = () => <><h1>hi</h1>{id<string>("ok")}</>;`
  - `const Panel = () =>` — ts tokens up to ` ` after `=>`.
  - `<>` — fragment opener. `<` immediately followed by `>` (no whitespace,
    no name). emit as `jsx.punctuation.fragment.open`. push fragment
    children state.
  - `<h1>hi</h1>` — nested element: open tag, children (jsx text `hi`),
    close tag.
  - `{` — child expression container. push js-expression.
    - `id` — identifier.
    - `<` — preceded by identifier (no whitespace). TS generic call.
      push ts-generics (NOT jsx).
    - `string` — ts built-in type.
    - `>` — close generic.
    - `(` — paren. `"ok"` string. `)` paren.
    - `}` — close container. pop.
  - `</>` — fragment closer: `</` followed by `>`. pop fragment.
  - `;` — end statement.
- `const style: React.CSSProperties = { color: "red", padding: 4 };`
  - pure ts.
- `const el = <div style={{ ...style, margin: 2 }}>content</div>;`
  - `const el =` ts.
  - ` ` ws. `<` in expression position. push jsx opening-tag.
  - `div` tag name.
  - ` style=` attribute.
  - `{` open attribute expression container.
    - `{` — inner object literal opens (bracket depth 1 inside container).
    - ` ` ws. `...style` — spread in object literal (NOT a jsx spread
      attribute — the jsx spread-attribute form is `{...x}` with the `...`
      immediately after the opening `{` at jsx-tag-level; inside an
      expression container, `...` is the normal js spread operator, which
      is allowed in object literals).
    - `,` ` ` `margin: 2` ` ` — object literal entries.
    - `}` — close object literal (bracket depth back to 0 in container).
    - `}` — close attribute expression container. pop.
  - `>` — close opening tag. enter children.
  - `content` — jsx text.
  - `</div>` — close tag.
  - `;` — end statement.

observations:

- `<T,>` requires a look-ahead past the tag name for the `,` disambiguator;
  a pragmatic approach is to always enter jsx state on `<` and let the
  parser recover on the `,` (emit `,` and `>` as punctuation).
- `value as number` works in tsx; `<number>value` would be interpreted as
  an (invalid) jsx element.
- `<>` and `</>` must be recognized as a pair of two-character tokens, not
  as less-than + greater-than.
- inside a jsx expression container, `id<string>("ok")` is a ts generic
  call because `<` is glued to `id`. critical that we apply the same rule
  inside containers as outside.
- `{{ ... }}` is a jsx attribute container containing an object literal —
  both uses of `{` must be tracked with bracket depth.

### trace 3: namespaced elements, html entities, multiline text, conditional rendering

input:

```tsx
const svg = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <use xlink:href="#icon-home" />
    <title>Home &amp; Garden &mdash; &#9733; &#x2605;</title>
  </svg>
);

const Panel: React.FC<{ show: boolean; count?: number }> = ({ show, count = 0 }) => {
  return (
    <section aria-expanded={show ? "true" : "false"}>
      {show && count > 0 && (
        <p>
          You have {count} item{count !== 1 ? "s" : ""}.
        </p>
      )}
      {/* fallback block when nothing */}
      {!show && <em>hidden</em>}
    </section>
  );
};
```

trace:

- `const svg = (` → ts + `(` paren.
- ` ` ws. `<svg` — open jsx element. `svg` tag name (lowercase intrinsic).
- ` xmlns=` — attribute. `"http://www.w3.org/2000/svg"` — jsx string
  (the `:` and `//` inside are just characters; no escape processing).
- ` viewBox=` — attribute. `"0 0 24 24"` — jsx string.
- `>` — close opening. enter svg children.
- `\n    ` — jsx text (ws).
- `<use` — nested element.
- ` xlink:href=` — **namespaced attribute name**. `xlink` is JSXIdentifier,
  `:` is namespace separator, `href` is JSXIdentifier. emit as
  `jsx.attribute.name.namespace` + `:` + `jsx.attribute.name`. then `=`.
- `"#icon-home"` — jsx string.
- ` />` — self-close.
- `\n    ` — jsx text.
- `<title>` — open element with title tag name.
- `Home ` — jsx text.
- `&amp;` — html named entity. emit `jsx.text.entity`.
- `Garden` — text.
- `&mdash;` — named entity.
- ` ` text.
- `&#9733;` — decimal entity (☆). emit entity.
- ` ` text.
- `&#x2605;` — hex entity (★). emit entity.
- `</title>` — close.
- `\n  ` — text.
- `</svg>` — close svg.
- `\n)` `;` — close paren, end statement.
- ...
- `React.FC<{ show: boolean; count?: number }>` — ts type annotation. note
  the `{ ... }` inside `<...>` is a ts type literal, NOT a jsx thing.
- `= ({ show, count = 0, }) => { return (`
  - destructuring pattern, arrow, block body, `return (`.
- `<section aria-expanded={show ? "true" : "false"}>`
  - jsx open tag. `aria-expanded` has `-` (valid jsx identifier).
  - `=` `{` expr container. `show ? "true" : "false"` — ternary; two js
    strings inside. `}` close container.
  - `>` close opening. enter section children.
- `\n      ` ws.
- `{show && count > 0 && (`
  - `{` open child container. `show`, ` `, `&&`, ` `, `count`, ` `, `>`, ` `,
    `0`, ` `, `&&`, ` `, `(`. paren depth 1 inside container.
  - note: `count > 0` — the `>` is the greater-than operator inside js,
    NOT a jsx tag close. we are inside a js expression container; `>` is
    not special there.
- `\n        <p>` — `<` in expression position (after `(` and ws). push
  jsx. open `p`.
- `\n          You have ` — jsx text.
- `{count}` — child container.
- ` item` — jsx text.
- `{count !== 1 ? "s" : ""}` — child container.
- `.` — jsx text (a single `.` as text).
- `\n        ` ws jsx text.
- `</p>` — close p.
- `\n      )}` — `)` paren depth 0, `}` close outer container. pop to
  section children.
- `\n      ` ws.
- `{/* fallback block when nothing */}` — child container with a block
  comment. the `/*` starts a js block comment; content runs to `*/`. after
  the comment, `}` closes the container (with no expression — empty
  container-with-comment is allowed).
- `\n      ` ws.
- `{!show && <em>hidden</em>}` — child container. js: `!show && ` then
  `<em>hidden</em>` jsx. then `}` close.
- `\n    </section>` — close tag.
- `\n  )` `;` `\n}` `;`.

observations:

- namespaced attribute `xlink:href` lexes as a single JSXNamespacedName
  attribute name; the `:` is part of the name.
- inside jsx text, html entities are first-class; inside a jsx expression
  container (js mode), `&amp;` is two tokens (`&` `amp` `;`) — entities are
  ONLY recognized in jsx text and jsx strings, never in js code.
- `count > 0` inside a js expression container is not a jsx close; the
  container uses js tokenization.
- `{/* comment */}` is an empty-with-comment child expression container; the
  tokenizer allows this.
- `<p>` inside `(...)` inside `{...}` inside `<section>` exercises the full
  nesting chain: section-children → child-container (js) → paren-group →
  jsx-element → p-children → child-container → js → ....

---

## summary for grammar-author

starting from the existing typescript grammar, tsx needs:

1. a new "jsx" state machine that runs OFF the typescript grammar's
   expression-position hook. on `<` in expression position, the js
   tokenizer does NOT consume the `<` as less-than; instead it peeks and, if
   followed by IdentifierStart / `>` / `/`, enters jsx mode. otherwise it
   treats `<` as the less-than / generic-angle operator (typescript rules).
2. a jsx opening-tag state that recognizes: tag names (with `.`, `:`, and
   `-` allowed), attributes (with `=`-initialized values or no value),
   attribute string values (with html entity escape recognition, NO js
   escape recognition), attribute expression containers `{...}` (re-
   entering js mode with bracket-depth tracking), spread attributes
   `{...expr}`, and closes on `>` (enter children) or `/>` (pop).
3. a jsx children state that recognizes: jsx text (with html entities), the
   start of a nested element on `<`, the start of a child expression
   container on `{`, the start of a closing tag on `</`, and closes when
   matched against the outer element.
4. a jsx child / attribute expression container state that re-enters js/ts
   mode. tracks bracket depth. on `}` at depth 0, pops.
5. a jsx fragment pair: `<` `>` to open, `<` `/` `>` to close. the shape is
   identical to jsx element handling but with empty name fields.
6. html character reference recognition inside jsx text and jsx strings:
   named (`&name;` — 252-entry list, but can accept any sequence), decimal
   (`&#N;`), hex (`&#xH;`).
7. tag-name reclassification (optional): after the tokenizer emits the tag
   name, a reclassifier may promote to `selector_class` if the first character
   is uppercase (react component convention). this is NOT spec-required and
   can be an extension point.
8. the `<T>value` type-assertion form that regular typescript accepts must
   be REJECTED (or accepted as jsx which then fails parsing) in tsx. the
   author should disable the ts-cast rule in the tsx dialect.
9. the generic-arrow disambiguation (`<T,>` / `<T extends X>`) requires a
   lookahead inside the jsx opening-tag state: after consuming a simple tag
   name, if the next non-whitespace is `,` or `extends`, bail back to
   typescript-generic interpretation. alternative: always emit jsx tokens
   and let the downstream parser recover — acceptable for a highlighter.
10. no jsx-level comment syntax. inline js comments (`//`, `/* */`) are
    accepted inside opening tags (between attributes) and inside expression
    containers. they are NOT accepted inside jsx text or attribute strings.

next step: invoke the `grammar-author` skill, passing `tsx` as the language
name, to build `languages/tsx/src/grammar.ts` and tests.
