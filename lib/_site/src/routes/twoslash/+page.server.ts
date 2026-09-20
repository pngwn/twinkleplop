// Server-side load for the /twoslash demo route.
//
// Twoslash runs TypeScript's language service, which is Node-only — so we
// render each snippet to HTML on the server and hand the strings to the
// Svelte component. A single `create_highlighter` instance is reused for
// the whole load (that's why @twinkleplop/twoslash exports it separately
// from `highlight`): the TS language-service env is cached between calls.

import { create_highlighter } from "@twinkleplop/twoslash";
import { create_highlighter as create_svelte_highlighter } from "@twinkleplop/twoslash-svelte";
import type { PageServerLoad } from "./$types";

type Snippet = {
  id: string;
  title: string;
  blurb: string;
  code: string;
};

const ts_snippets: Snippet[] = [
  {
    id: "hover",
    title: "Hover types",
    blurb:
      "Every identifier carries the type TypeScript inferred for it. Hover the highlighted identifiers to see the tooltip.",
    code: `function greet(name: string, loud: boolean) {
	const suffix = loud ? "!!!" : "."
	return \`Hello, \${name}\${suffix}\`
}

const message = greet("world", true)
`,
  },
  {
    id: "query",
    title: "Query (^?) annotations",
    blurb:
      "A // ^? comment asks twoslash to print the type of the token above the caret. The result is rendered as a block below the line.",
    code: `const point = { x: 1, y: 2 }
//    ^?

const tags = ["admin", "editor"] as const
//    ^?
`,
  },
  {
    id: "error",
    title: "Expected errors",
    blurb:
      "Declare expected diagnostics with // @errors: <code>. The offending range is decorated and the message is rendered beneath the line.",
    code: `// @errors: 2322 2345
const count: number = "three"

function square(n: number) {
	return n * n
}

const result = square("four")
`,
  },
  {
    id: "completions",
    title: "Completions (^|)",
    blurb:
      "A // ^| comment asks the compiler what could come next at that caret. The members matching what has already been typed render as a dropdown anchored to the caret, the way an editor would show them.",
    code: `const users = ["ada", "grace"]
const found = users.find
//                     ^|
`,
  },
  {
    id: "types",
    title: "Type-level programming",
    blurb:
      "Inferred types for type-level constructs show up in hover popovers the same way value types do — handy for explaining generics.",
    code: `type Flatten<T> = T extends Array<infer U> ? U : T

type A = Flatten<string[]>
//   ^?

type B = Flatten<number>
//   ^?

interface Box<T> {
	value: T
	readonly tag: "box"
}

const numberBox: Box<number> = { value: 1, tag: "box" }
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
      "The ^? marker works inside the <script> block the same way it does in plain TypeScript — results render as a block annotation below the line.",
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

export const load: PageServerLoad = () => {
  const ts_highlight = create_highlighter();
  const svelte_highlight = create_svelte_highlighter();
  return {
    ts_snippets: ts_snippets.map((s) => ({ ...s, html: ts_highlight(s.code) })),
    svelte_snippets: svelte_snippets.map((s) => ({
      ...s,
      html: svelte_highlight(s.code),
    })),
  };
};
