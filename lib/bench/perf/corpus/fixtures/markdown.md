
<!-- ---- blockquote.md ---- -->

> a simple quote

> quote with **bold** inside

> > nested quote

> # heading in quote



<!-- ---- code_span.md ---- -->

a `code` span.

`code with *asterisks* inside` stays literal.

An `unclosed code and more
text.



<!-- ---- composition.md ---- -->

**bold with *italic nested* bold**

*italic with `code inside` italic*

**bold with `code` bold**

~~strike with **bold** strike~~

*italic [link text](https://example.com) italic*

[link with **bold** and `code` inside](url)

**[bold link](url) followed by bold**

*~~italic strike~~*

**bold *italic ~~and strike~~ back to italic* bold**

`plain code` outside emphasis

*italic containing <https://autolink> inside*

**bold across ![image alt](img.png) bold**

`code` then **bold** then *italic* flat



<!-- ---- emphasis.md ---- -->

**bold text**

*italic text*

***both***

~~strikethrough~~

**outer *inner* outer**

*emph with `code` inside*

__underscore bold__

_underscore italic_

**unclosed bold



<!-- ---- escape_entity.md ---- -->

\*not emphasis\* and \\ literal backslash.

entity: &amp; &copy; &#42; &#x2a;

a hard break\
continues here.



<!-- ---- fenced_code.md ---- -->

```js
const x = 1;
```

```
no language
```

~~~python
print("tilde fence")
~~~



<!-- ---- front_matter.md ---- -->

---
title: Hello
date: 2026-04-14
---

# First heading

A paragraph.



<!-- ---- headings.md ---- -->

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

# Heading with **bold** and *italic*

#notaheading

####### not a heading either

#



<!-- ---- indented_code.md ---- -->

a paragraph first.

    four spaces of code
    line two

back to paragraph.



<!-- ---- links.md ---- -->

[text](https://example.com)

[with title](https://example.com "Example")

[reference][label]

[just brackets]

![image alt](image.png)

See <https://auto.link> for details.



<!-- ---- lists.md ---- -->

- first bullet
- second bullet
* star bullet
+ plus bullet

- [ ] open task
- [x] done task
- [X] capital done



<!-- ---- mixed.md ---- -->

# Project Readme

A short **intro** paragraph with a [link](https://example.com) and `inline code`.

## Install

```bash
pnpm install
```

## Features

- fast
- **bold** feature
- [ ] roadmap item

> Note: read the docs.

---

See <https://example.com> for more.



<!-- ---- thematic_break.md ---- -->

above

---

below

***

more

___

end
