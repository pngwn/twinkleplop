// Both highlighters drive TypeScript's language service, which is Node-only,
// so every snippet is rendered here and the page is handed HTML strings. Each
// highlighter is built once for the whole load: twoslash caches its TS env
// between calls, and shiki loads oniguruma and its themes once.
//
// The two sides get the same twoslash configuration, so what differs
// downstream is the renderer, not the type information behind it.

import { transformerTwoslash } from "@shikijs/twoslash";
import { create_highlighter, DEFAULT_CUSTOM_TAGS } from "@twinkleplop/twoslash";
import { create_highlighter as create_svelte_highlighter } from "@twinkleplop/twoslash-svelte";
import { createHighlighter } from "shiki";
import typescript from "typescript";
import type { PageServerLoad } from "./$types";

type Snippet = {
  id: string;
  title: string;
  blurb: string;
  code: string;
};

type Pane = { html: string; error: null } | { html: null; error: string };

// shiki's palette is ported from the current primer theme, which is what our
// github theme tracks — the `-default` variants, not shiki's legacy
// `github-dark` / `github-light` snapshot. see $lib/explore/themes.ts.
const SHIKI_THEMES = { light: "github-light-default", dark: "github-dark-default" } as const;

// twoslash resolves a snippet's imports from here; a trailing slash makes the
// diagnostics' file names miss and silently drops every error.
const vfs_root = process.cwd().replace(/\/+$/, "");

const compiler_options = {
  target: typescript.ScriptTarget.ES2022,
  module: typescript.ModuleKind.ESNext,
  moduleResolution: typescript.ModuleResolutionKind.Bundler,
  strict: true,
  skipLibCheck: true,
};

const ts_snippets: Snippet[] = [
  {
    id: "hover",
    title: "Hover types",
    blurb:
      "Every identifier carries the type TypeScript inferred for it. Hover a marked identifier in either pane to see it.",
    code: `function greet(name: string, loud: boolean) {
  const suffix = loud ? "!!!" : ".";
  return \`Hello, \${name}\${suffix}\`;
}

const message = greet("world", true);
`,
  },
  {
    id: "query",
    title: "Query (^?)",
    blurb:
      "A // ^? comment asks twoslash to print the type of the token above the caret. twinkleplop inserts a block annotation, which pushes the rest of the snippet down; shiki's default queryRendering is an absolutely positioned popup pinned open, which reserves no space and so lies over the lines below it.",
    code: `const point = { x: 1, y: 2 };
//    ^?

const tags = ["admin", "editor"] as const;
//    ^?
`,
  },
  {
    id: "errors",
    title: "Expected errors",
    blurb:
      "Declare expected diagnostics with // @errors: <code>. The offending range is decorated and the message is rendered beneath the line.",
    code: `// @errors: 2322 2345
const count: number = "three";

function square(n: number) {
  return n * n;
}

const result = square("four");
`,
  },
  {
    id: "types",
    title: "Type-level programming",
    blurb:
      "Inferred types for type-level constructs surface the same way value types do: twoslash reports the resolved alias and both renderers print it against the query. The type string inside a popover is highlighted too — twinkleplop tokenizes it with its own grammar, shiki runs it back through codeToHast.",
    code: `type Flatten<T> = T extends Array<infer U> ? U : T;

type A = Flatten<string[]>;
//   ^?

type B = Flatten<number>;
//   ^?
`,
  },
  {
    id: "tags",
    title: "Custom tags",
    blurb:
      "@log, @annotate, @warn and @error render as line annotations. shiki's rich renderer prefixes each with an icon; twinkleplop prefixes the tag name from CSS.",
    code: `// @log: loading the config
const config = { retries: 3, timeout: 500 };

// @annotate: clamped so a negative count cannot disable retries
const retries = Math.max(0, config.retries);

// @warn: timeout is in milliseconds, not seconds
const timeout = config.timeout;
`,
  },
  {
    id: "highlight",
    title: "Highlight (^^^)",
    blurb: "A // ^^^ comment marks a range of the line above for emphasis.",
    code: `const enabled = true;
//    ^^^^^^^
`,
  },
  {
    id: "completions",
    title: "Completions (^|)",
    blurb:
      "A // ^| comment asks for the completion list at that position. shiki renders the list; twinkleplop currently drops it, because twoslash reports a completion as a zero-length node and the renderer only opens spans that cover at least one character.",
    code: `// @errors: 2339
const users = ["ada", "grace"];
users.fi
//      ^|
`,
  },
  {
    id: "cut",
    title: "Setup above the cut",
    blurb:
      "Everything above a // ---cut--- line is type checked but not rendered, so a snippet can lean on declarations the reader never sees.",
    code: `declare const raw: string;
// ---cut---
const size = raw.length;
`,
  },
];

const svelte_snippets: Snippet[] = [
  {
    id: "svelte-runes",
    title: "Svelte 5 runes + template bindings",
    blurb:
      "Svelte components flow through svelte2tsx so twoslash sees the same TypeScript svelte-language-server does. Hovers work on runes, script identifiers, AND template expressions like {count}.",
    code: `<script lang="ts">
	let count = $state(0);

	function increment() {
		count += 1;
	}
</script>

<button onclick={increment}>
	clicks: {count}
</button>
`,
  },
  {
    id: "svelte-query",
    title: "Query (^?) in a Svelte script",
    blurb:
      "The ^? marker works inside the <script> block the same way it does in plain TypeScript.",
    code: `<script lang="ts">
	const user = { name: "alice", age: 30, admin: true };
	//    ^?
</script>
`,
  },
  {
    id: "svelte-error",
    title: "Expected errors in Svelte",
    blurb:
      "Declare diagnostics with // @errors: at column 0 inside the script block. Typing a number into a string-annotated const gets a proper squiggle and message.",
    code: `<script lang="ts">
// @errors: 2322
const label: string = 42;
</script>
`,
  },
];

// a snippet a highlighter rejects becomes a visible failure, not a dead build.
function render(highlight: (code: string) => string, code: string): Pane {
  try {
    return { html: highlight(code), error: null };
  } catch (error) {
    return { html: null, error: error instanceof Error ? error.message : String(error) };
  }
}

export const load: PageServerLoad = async () => {
  const twinkleplop = create_highlighter({
    lang: "ts",
    twoslash: { vfsRoot: vfs_root, compilerOptions: compiler_options },
  });

  const shiki = await createHighlighter({
    themes: [SHIKI_THEMES.light, SHIKI_THEMES.dark],
    langs: ["ts"],
  });
  // `twoslashOptions` replaces shiki's defaults rather than merging into
  // them, so the custom tags have to be repeated here or `// @log:` reads as
  // a mistyped compiler flag and throws.
  const shiki_twoslash = transformerTwoslash({
    twoslashOptions: {
      vfsRoot: vfs_root,
      compilerOptions: compiler_options,
      customTags: [...DEFAULT_CUSTOM_TAGS],
    },
  });
  const shiki_highlight = (code: string) =>
    shiki.codeToHtml(code, {
      lang: "ts",
      // both variants bake into one tree as --shiki-light / --shiki-dark, so
      // the site's mode switch repaints the pane without a round trip.
      themes: SHIKI_THEMES,
      defaultColor: false,
      transformers: [shiki_twoslash],
    });

  const svelte_highlight = create_svelte_highlighter();

  return {
    ts_snippets: ts_snippets.map((snippet) => ({
      ...snippet,
      twinkleplop: render(twinkleplop, snippet.code),
      shiki: render(shiki_highlight, snippet.code),
    })),
    svelte_snippets: svelte_snippets.map((snippet) => ({
      ...snippet,
      twinkleplop: render(svelte_highlight, snippet.code),
    })),
  };
};
