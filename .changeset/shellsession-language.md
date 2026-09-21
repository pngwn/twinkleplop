---
"@twinkleplop/shellsession": patch
"@twinkleplop/core": patch
"@twinkleplop/theme-github": patch
"@twinkleplop/theme-atom-one": patch
---

Add `@twinkleplop/shellsession` for terminal transcripts. Prompts become `prompt_prefix` and `prompt` tokens, commands are highlighted as bash, and every other line is `output`. Both themes colour the new tokens.

A command continued on `> ` lines is highlighted as one command, so a quoted string or a trailing `\` carries over:

```console
$ echo 'first line
> second line'
```
