---
"@twinkleplop/bash": patch
---

Heredoc bodies highlight as strings for the common delimiters (`EOF`, `END`, `EOT` and a few more). A quoted delimiter keeps the body literal, an unquoted one still highlights `$var` and `$(...)`, the rest of the opening line stays code, and `<<-` closers may be tab indented. Other delimiters read as before.
