---
"@twinkleplop/dockerfile": patch
---

A parser directive value, such as `docker/dockerfile:1.7` in `# syntax=docker/dockerfile:1.7`, ends at its line break. A comment or another directive on the next line is its own token instead of being merged into the value.
