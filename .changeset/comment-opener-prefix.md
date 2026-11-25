---
"@twinkleplop/core": patch
---

Open input that ends partway through a comment opener hides those characters until the next one decides what they are. A `/` that may become `//` or `/*`, a `-` that may become `--`, and `<`, `<!` or `<!-` that may become `<!--` no longer show for one step before a directive comment hides them. This applies when annotation is configured, and the openers are read from each grammar, so a `/` inside a string or JSX text is left alone. Code embedded in another language, such as a `<script>` body, is not covered.
