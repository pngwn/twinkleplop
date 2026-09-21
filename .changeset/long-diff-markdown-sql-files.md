---
"@twinkleplop/sql": patch
"@twinkleplop/rust": patch
"@twinkleplop/diff": patch
"@twinkleplop/diff-basic": patch
"@twinkleplop/markdown": patch
---

Long diffs, markdown documents and SQL scripts now highlight correctly all the way through. After a few hundred hunks, headings, list items or `@var` parameters, highlighting used to go wrong and stay wrong, with `diff --git` lines losing their colour or SQL `--` comments showing as operators. Rust files with hundreds of malformed char literals such as `'ab'` are fixed too.
