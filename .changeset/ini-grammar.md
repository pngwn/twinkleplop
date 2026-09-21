---
"@twinkleplop/ini": patch
---

Add `@twinkleplop/ini` for INI-style config files, including php.ini, Python `setup.cfg` and `tox.ini`, git config, systemd units, `.desktop` entries and `.editorconfig`. Quoted git subsections, glob section names and indented continuation lines are read the way those tools read them. A `;` starts a comment anywhere outside quotes, as in git and php, while a `#` needs whitespace before it, so URL fragments stay part of the value:

```ini
[remote "origin"]
	url = git@example.com:team/project.git;trailing comment
[*.[ch]]
indent_style = tab
[testenv]
commands =
    pytest {posargs}
docs = https://example.com/setup#install
```
