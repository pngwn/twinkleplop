# @twinkleplop/ini

## 0.1.3
### Patch Changes



- [#73](https://github.com/pngwn/twinkleplop/pull/73) [`f3f24c8`](https://github.com/pngwn/twinkleplop/commit/f3f24c81395d00625b844dcd892aaa977ebcbb52) Thanks [@pngwn](https://github.com/pngwn)! - Add `@twinkleplop/ini` for INI-style config files, including php.ini, Python `setup.cfg` and `tox.ini`, git config, systemd units, `.desktop` entries and `.editorconfig`. Quoted git subsections, glob section names and indented continuation lines are read the way those tools read them. A `;` starts a comment anywhere outside quotes, as in git and php, while a `#` needs whitespace before it, so URL fragments stay part of the value:
  
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
- Updated dependencies [[`e36051c`](https://github.com/pngwn/twinkleplop/commit/e36051c72d4956e25c79daf627ec08f2c2934edf), [`185c681`](https://github.com/pngwn/twinkleplop/commit/185c681197726bc90abed3cca566e37078dab105), [`fba34b1`](https://github.com/pngwn/twinkleplop/commit/fba34b14df85f4f61fc54f75c977a1145ee8b18a), [`84b7527`](https://github.com/pngwn/twinkleplop/commit/84b75279520c63ca19d322cfbced72e41e439085), [`6710782`](https://github.com/pngwn/twinkleplop/commit/671078298b33450abfca1006d55666098d5f351c), [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1), [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1), [`d06f61e`](https://github.com/pngwn/twinkleplop/commit/d06f61efed390b05d572bc65bf8c772a15a9f987), [`a3e1a0c`](https://github.com/pngwn/twinkleplop/commit/a3e1a0c90a02ee14caf0dd4fa09d7df9dd591cfa), [`8cc71aa`](https://github.com/pngwn/twinkleplop/commit/8cc71aaea9008e5b7a5e53345e386990b85aed3a)]:
  - @twinkleplop/core@0.2.0
