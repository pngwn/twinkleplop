// author & validate per-language "demo" snippets that exercise every
// emitted token type. run with `node _demo_author.mjs` (lists coverage)
// or `node _demo_author.mjs --write` to persist into each language's
// test/ directory.

import fs from "node:fs";
import path from "node:path";

const write_mode = process.argv.includes("--write");

// filename extension per language (first-listed wins); drives test/demo.<ext>.
const EXT = {
	bash: "sh",
	css: "css",
	diff: "diff",
	"diff-basic": "txt",
	go: "go",
	html: "html",
	javascript: "txt",
	markdown: "md",
	python: "py",
	rust: "rs",
	sql: "sql",
	svelte: "svelte",
	toml: "toml",
	tsx: "txt",
	typescript: "txt",
	whitespace: "txt",
	yaml: "yaml",
};

const DEMOS = {
	bash: [
		"#!/usr/bin/env bash",
		"# greet every user in the directory",
		"set -euo pipefail",
		"readonly GREETING=\"Hello, \\$USER!\"",
		"TAB=$'\\thello\\n'",
		"files=( *.sh )",
		"for f in \"${files[@]}\"; do",
		"  if [[ $f =~ ^[a-z]+\\.sh$ && -r \"$f\" ]]; then",
		"    printf '%s\\t%s\\n' \"$GREETING\" \"$f\"",
		"    count=$(( ${#f} + 16#ff ))",
		"    true && echo \"count=$count$TAB\"",
		"  fi",
		"done",
		"",
	].join("\n"),

	css: `/* site theme tokens and layout */
@import url("./base.css");
:root {
  --fg: #1f2328;
  --bg: rgb(255 255 255 / 0.9);
}
html, body { margin: 0; font-size: 16px; color: inherit; }
#main > .card:hover {
  padding: 1.5rem;
  color: var(--fg);
  background: linear-gradient(90deg, #fff 0%, #eee 100%);
  cursor: pointer;
}
@media (min-width: 768px) { .card { flex: 1 1 320px; } }
`,

	diff: `# three-way diff showing changed, added, and removed lines.
diff --git a/src/app.js b/src/app.js
index e69de29..d00491f 100644
--- a/src/app.js
+++ b/src/app.js
@@ -1,5 +1,6 @@
 import { start } from "./core";
-const port = 3000;
+const port = 8080;
+const host = "0.0.0.0";
! const retries = 3;
 start({ port });
`,

	"diff-basic": `@@ -1,5 +1,6 @@ function start(opts) {
   import { start } from "./core";
-  const port = 3000;
+  const port = 8080;
+  const host = "0.0.0.0";
!  const retries = 3;
   start({ port });
`,

	go: `// package greet prints salutations.
package greet

import "fmt"

// Greeter is the greeting target.
type Greeter struct {
	Name    string
	Verbose bool
}

func (g *Greeter) Hello() string {
	if g.Name == "" || !g.Verbose {
		return "Hello, \"world\"!\\n"
	}
	return fmt.Sprintf("Hello,\\t%s!\\n", g.Name)
}

func main() {
	count := 3
	ok := true
	buf := make([]string, 0, count)
	for i := 0; i < count && ok; i++ {
		buf = append(buf, (&Greeter{Name: "gopher", Verbose: true}).Hello())
	}
	_ = len(buf)
	fmt.Println(buf)
}
`,

	html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Demo</title>
    <style>
      :root { --fg: #1f2328; }
      body.main > .card { color: var(--fg); padding: 1rem; }
    </style>
  </head>
  <body class="main">
    <!-- hello -->
    <h1 id="top">Welcome</h1>
    <a href="https://example.com">link</a>
    <script>
      class Greeter {
        constructor(prefix) { this.prefix = prefix; }
        greet(name) { return ` + "`${this.prefix}, ${name}`" + `; }
      }
      const g = new Greeter("hello");
      console.log(g.greet("world"));
    </script>
  </body>
</html>
`,

	javascript: [
		"// collects user scores and renders them as html.",
		"import { render } from \"./lib.js\";",
		"",
		"const MAX = 100;",
		"const users = [",
		"  { name: \"ada\\tlovelace\", score: 93, active: true },",
		"  { name: \"alan\",          score: null, active: false },",
		"];",
		"",
		"class Scoreboard {",
		"  constructor(entries) { this.entries = entries; }",
		"  top() { return this.entries.filter((e) => e.active).sort((a, b) => b.score - a.score); }",
		"}",
		"",
		"const re = /^[a-z]+$/i;",
		"const format = (u) => `${u.name}: ${u.score ?? \"-\"}`;",
		"const styles = css`:root { --fg: #1f2328; } body .scores { padding: 1rem; color: var(--fg); } .scores:hover { cursor: pointer; }`;",
		"const markup = html`<!doctype html><ul class=\"scores\" id=\"board\">${users.map((u) => `<li>${format(u)}</li>`).join(\"\")}</ul>`;",
		"",
		"render(markup, styles);",
		"",
	].join("\n"),

	markdown: `---
title: Twinkleplop
tags: [demo, showcase]
---

# Twinkleplop

> A **regex-free** syntax highlighter with _opt-in_ fidelity. ~~Slow~~ **fast**.

## Features &amp; friends

1. Language packs with [docs](https://example.com "home").
2. \`inline code\` and fenced blocks:

\`\`\`js
const greet = (name) => ` + "`hi, ${name}`" + `;
\`\`\`

    // indented code block
    const x = 1 + 2;

- [x] ship demo
  second line after a hard break
- [ ] celebrate

Escapes: \\* not italic, \\# not a heading.

---

Visit <https://example.com> or email <hi@example.com>.

![logo](./logo.png)
`,

	python: `"""greeter module prints salutations."""
# a tiny demo that exercises most of the grammar.
from __future__ import annotations

ANSWER: int = 42
names: list[str] = ["ada\\tlovelace", "alan"]
ACTIVE: bool = True


class Greeter:
    """Greets people by name."""

    def __init__(self, prefix: str = "Hello") -> None:
        self.prefix = prefix

    def greet(self, name: str) -> str:
        return f"{self.prefix}, {name:>12}!\\n"


def main() -> None:
    g = Greeter()
    for n in names:
        msg = g.greet(n)
        print(msg, end="\\n")
    assert len(names) == 2 and ACTIVE, "expected two active names"


if __name__ == "__main__":
    main()
`,

	rust: `//! greeter crate prints salutations.
use std::collections::HashMap;

const MAX: u32 = 100;
const ACTIVE: bool = true;

#[derive(Debug, Clone)]
pub struct Greeter<'a> {
    name: &'a str,
    scores: HashMap<String, i32>,
}

impl<'a> Greeter<'a> {
    pub fn new(name: &'a str) -> Self {
        Self { name, scores: HashMap::new() }
    }

    pub fn greet(&self) -> String {
        format!("hello,\\t{}!\\n", self.name)
    }
}

fn main() {
    let g = Greeter::new("world");
    let msg = g.greet();
    let nums: Vec<i32> = (0..3).collect();
    if ACTIVE {
        println!("{} {:?}", msg, nums);
    }
}
`,

	sql: `-- create a users table and seed rows.
CREATE TABLE users (
    id        INT PRIMARY KEY,
    name      VARCHAR(64) NOT NULL,
    active    BIT DEFAULT 1,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (id, name, active) VALUES
    (1, 'ada\\n',  TRUE),
    (2, 'alan',    FALSE);

SELECT u.id, u.name, COUNT(@sessions) AS n
FROM users AS u
WHERE u.active = TRUE AND u.name LIKE 'a%' AND u.flags & b'0101' = 0x0A
GROUP BY u.id, u.name
ORDER BY n DESC;
`,

	svelte: `<script lang="ts">
  import { Greeter } from "./greeter.js";
  let count = $state(0);
  let active = $state(true);
  let doubled = $derived(count * 2);
  const re = /^[a-z]+$/i;
  const g = new Greeter("hello");
  const tpl = ` + "`greeting=${g.prefix}`" + `;
  function inc() { count += 1; }
</script>

<style>
  :root { --fg: #1f2328; }
  button.primary { color: var(--fg); padding: 0.5rem 1rem; }
</style>

<!-- interactive counter -->
<main class="root" use:tooltip>
  <h1>Count: {count} (x2 = {doubled})</h1>
  <button class="primary" onclick={inc}>click me</button>

  {#if count > 0 && active}
    <p>non-zero</p>
  {:else}
    <p>zero</p>
  {/if}

  {#each [1, 2, 3] as n (n)}
    <span>{n}</span>
  {/each}
</main>
`,

	toml: `# sample project manifest
title = "Twinkleplop"
version = "1.0.0"
enabled = true
port = 8080
ratio = inf
banner = "line 1\\nline 2"
released = 2026-04-20T09:30:00Z

[package]
name = "demo"
authors = ["ada <ada@example.com>", "alan"]

[dependencies]
core = { version = "^1.0", features = ["fast"] }

[[bin]]
name = "cli"
path = "src/cli.rs"
`,

	tsx: [
		"// interactive greeter demo.",
		"import { useState } from \"react\";",
		"",
		"type Props = { name: string; count?: number };",
		"",
		"export class Store<T> {",
		"  items: T[] = [];",
		"  add(item: T) { this.items.push(item); }",
		"}",
		"",
		"export function Greeter({ name, count = 1 }: Props) {",
		"  const [clicks, setClicks] = useState<number>(0);",
		"  const banner = `hello, ${name}`;",
		"  return (",
		"    <section className=\"root\" data-count={count}>",
		"      <h1>{banner}!</h1>",
		"      <button onClick={() => setClicks((c) => c + 1)}>",
		"        clicked {clicks} &times;",
		"      </button>",
		"    </section>",
		"  );",
		"}",
		"",
	].join("\n"),

	typescript: [
		"// decorators + generics demo.",
		"import { fetchUser } from \"./api\";",
		"",
		"@sealed",
		"class UserStore<T extends { id: number }> {",
		"  private items: Map<number, T> = new Map();",
		"  public readonly name = \"users\";",
		"  public readonly active: boolean = true;",
		"",
		"  add(item: T): this { this.items.set(item.id, item); return this; }",
		"  get(id: number): T | undefined { return this.items.get(id); }",
		"}",
		"",
		"interface User { id: number; name: string; active?: boolean; }",
		"",
		"const store = new UserStore<User>();",
		"const re = /^[a-z]+$/i;",
		"const query = `id=${1}`;",
		"const markup = html`<section class=\"root\" data-id=\"1\">hi</section>`;",
		"",
		"async function run() {",
		"  const user = await fetchUser(1) as User satisfies User;",
		"  if (re.test(user.name)) store.add(user);",
		"}",
		"",
		"function sealed(ctor: Function) { Object.seal(ctor); }",
		"",
	].join("\n"),

	whitespace: `  line 1
	line 2 with tabs
    line 3 indented
`,

	yaml: `%YAML 1.2
---
# site deployment configuration
name: "twinkleplop\\nhighlighter"
version: 1.0.0
published: true
owners: null
banner: |
  line one
  line two
rollout: &base
  retries: 3
  timeout: 30s
environments:
  - name: "staging"
    url: "https://staging.example.com"
    <<: *base
  - name: "prod"
    url: "https://example.com"
    retries: 5
tags: [demo, showcase]
`,
};

async function coverage() {
	const report = [];
	for (const [lang, src] of Object.entries(DEMOS)) {
		const mod = await import(`@twinkleplop/${lang}`);
		if (!mod.language) { report.push([lang, "(no language)"]); continue; }
		const hl = mod.language();
		const { tokens, token_types } = hl(src);
		const seen = new Set();
		for (let i = 0; i < tokens.length / 3; i++) seen.add(token_types[tokens[i * 3]]);
		report.push([lang, [...seen].sort().join(" ")]);
	}
	for (const [lang, line] of report) console.log(lang.padEnd(12), line);
}

function write_files() {
	const dir = "/Users/peterallen/Projects/twinkleplop/lib/_site/src/lib/explore/demos";
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	for (const [lang, src] of Object.entries(DEMOS)) {
		const ext = EXT[lang];
		const out = path.join(dir, `${lang}.${ext}`);
		fs.writeFileSync(out, src);
		console.log("wrote", out);
	}
}

if (write_mode) write_files();
await coverage();
