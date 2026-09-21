---
"@twinkleplop/ini": patch
---

Add `@twinkleplop/ini` for INI-style config files, including php.ini, Python `setup.cfg` and `tox.ini`, git config, systemd units, `.desktop` entries and `.editorconfig`. Trailing comments, quoted git subsections, glob section names and indented continuation lines are read the way those tools read them, while a `;` inside a value such as a `.desktop` list stays part of the value:

```ini
[remote "origin"]
	url = git@example.com:team/project.git ; trailing comment
[*.[ch]]
indent_style = tab
[testenv]
commands =
    pytest {posargs}
Keywords=shell;prompt;
```
