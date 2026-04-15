// Markdown samples of varying complexity for benchmarking.
// All samples mix inline and block constructs so the tokenizer's hot paths
// (emphasis, code spans, links, list dispatch) are exercised along with the
// block-start state machine. Sizes roughly parallel the other language samples.

export const tiny_md = `# Hello **world**`;

export const small_md = `# Title

A short paragraph with **bold**, *italic*, and \`inline code\`.

- item one
- item two with [a link](https://example.com)
- [ ] unchecked task
`;

export const medium_md = `---
title: Example
date: 2026-04-14
---

# Project Readme

A short **intro** paragraph with a [link](https://example.com "homepage")
and some \`inline code\`. Strikethrough like ~~this~~ renders too.

## Install

\`\`\`bash
pnpm install
pnpm build
\`\`\`

## Features

- fast character-scanning tokenizer
- **declarative** grammar definitions
- [ ] GFM task support
- [x] code span highlighting
- [X] fenced code blocks

> Note: read the [docs][docs-ref] for advanced usage.
> Multiple-line blockquotes work too.

## Example

Here's a function signature: \`tokenize(input, grammar)\`. The result is a
flat Uint32Array of token triplets.

### Inline HTML

Autolinks like <https://example.com> are recognized. Escape characters like
\\* and \\_ keep the literals intact.

---

[docs-ref]: https://example.com/docs "Documentation"
`;

export const large_md = `---
title: Full Example Document
author: Twinkleplop
date: 2026-04-14
tags: [syntax-highlighting, markdown, performance]
---

# Twinkleplop Markdown Sample

A **comprehensive** reference document exercising every major markdown
construct. This file is used for benchmarking the markdown grammar against
other syntax highlighters.

## Overview

Markdown is a lightweight markup language with plain-text formatting syntax.
Its design allows it to be converted to many output formats, most commonly
HTML. This paragraph uses *italic emphasis*, **strong emphasis**, and
~~strikethrough~~ to exercise the inline token states.

You can also nest: **bold with *italic inside* and back** — or mix with
\`inline code that ignores *asterisks*\`.

## Lists

### Unordered lists

- apple
- banana
  - nested bullet
  - another nested
- cherry

### Task lists (GFM)

- [ ] implement feature A
- [x] add unit tests
- [X] update documentation
- [ ] deploy to production

### Interleaved content

- item with **bold** formatting
- item with a [link](https://example.com)
- item with \`code\`
- item with an image: ![alt](https://example.com/img.png)

## Code blocks

Inline code: \`const x = 42;\` appears in the text flow.

Fenced code with a language identifier:

\`\`\`javascript
function greet(name) {
    const message = \`Hello, \${name}!\`;
    console.log(message);
    return message;
}

const users = ['Alice', 'Bob', 'Charlie'];
users.forEach(greet);
\`\`\`

Fenced code without a language:

\`\`\`
plain text block
no syntax highlighting
multiple lines preserved
\`\`\`

Tilde-fenced:

~~~python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(10))
~~~

Indented code block (four spaces):

    function example() {
        return 42;
    }

## Links and images

Inline link: [Twinkleplop](https://example.com "Homepage")

Reference link: [GitHub Repository][repo]

Shortcut reference: [also valid]

Autolink: <https://auto.link>

Email autolink: <user@example.com>

Image: ![logo](https://example.com/logo.png "Project Logo")

Linked image: [![banner](banner.png)](https://example.com)

## Blockquotes

> A single-line blockquote.

> A multi-line blockquote spanning
> several lines with **bold** and *italic*
> formatting inside.

> > Nested blockquotes are also possible,
> > each level prefixed with another \`>\`.

> # Heading inside a blockquote
>
> With a paragraph underneath.

## HTML and entities

Entity references: &amp; &copy; &#42; &#x2a; &hellip;

Escapes: \\* not emphasis \\* and \\\\ literal backslash.

Hard line break with trailing backslash:\\
continues on the next line.

## Thematic breaks

Three different styles:

---

***

___

## Mixed content

A paragraph that combines many inline constructs: some text with **bold**,
some *italic*, some \`inline code\`, a [link](url), an <https://autolink>,
an escape \\*, and an entity &amp; — all in one sentence.

### Final heading

This section closes out the sample with another paragraph containing a few
more elements to exercise the grammar's state transitions across long
documents. The last line is plain text, ending naturally.

[repo]: https://github.com/example/twinkleplop "Twinkleplop on GitHub"
[also valid]: https://example.com/shortcut
`;
