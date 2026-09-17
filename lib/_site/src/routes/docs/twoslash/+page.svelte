<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import SplitCodeBlock from "$lib/docs/components/SplitCodeBlock.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash, twoslash_split, bash } from "$lib/docs/snippets";

	const install = bash`pnpm add @twinkleplop/twoslash`;

	const usage = twoslash`declare const code: string;
// ---cut---
import { create_highlighter } from "@twinkleplop/twoslash";

const highlight = create_highlighter({ lang: "ts" });
const html = highlight(code);`;

	const oneshot = twoslash`declare const code: string;
// ---cut---
import { highlight } from "@twinkleplop/twoslash";

const html = highlight(code, { lang: "ts" });`;

	const svelte_usage = twoslash`import { create_highlighter } from "@twinkleplop/twoslash-svelte";

// same options, minus \`lang\`
const highlight = create_highlighter();`;

	const tags = twoslash_split`// @log: x is 1
const x = 1;
// @annotate: y follows x
const y = x + 1;`;

	const options = twoslash`import { marked } from "marked";
import { create_highlighter } from "@twinkleplop/twoslash";
import { language as plain_ts } from "@twinkleplop/typescript";

const fallback = plain_ts();

const highlight = create_highlighter({
  lang: "ts",
  // a snippet twoslash rejects falls back to plain highlighting
  on_error: (_error, code) => fallback(code),
  // jsdoc becomes rendered markdown instead of escaped text
  render_docs: (md) => marked.parseInline(md, { async: false }),
  // massage the type string before it is highlighted
  process_type: (type) => type.replace(/import\\(".*?"\\)\\./g, ""),
});`;

	const markdown = twoslash`import rehype_twinkleplop from "@twinkleplop/rehype";
import { create_highlighter } from "@twinkleplop/twoslash";
import { language as typescript } from "@twinkleplop/typescript";
// ---cut-start---
import { unified } from "unified";
unified()
// ---cut-end---

.use(rehype_twinkleplop, {
  languages: {
    ts: {
      highlight: typescript(),
      twoslash: create_highlighter({ lang: "ts" }),
    },
  },
});`;
</script>

<ArticleMain
	pane_path="docs / twoslash"
	title="twoslash"
	subtitle="TypeScript type information rendered into the highlighted output."
>
	<p>
		Twoslash uses the TypeScript compiler to get hover types, query results, completions and errors
		for a snippet. Twinkleplop includes this information in the highlighted HTML.
	</p>

	<Section id="install" title="install and use" num="§ 01">
		<CodeBlock fname="terminal" html={install} />
		<p>
			<code>create_highlighter</code> builds a reusable highlight function, the same shape as a language
			package's.
		</p>
		<CodeBlock fname="twoslash.ts" html={usage} />
		<p>Or highlight a single snippet directly:</p>
		<CodeBlock fname="oneshot.ts" html={oneshot} />
		<p>
			Use <code>@twinkleplop/twoslash-svelte</code> for Svelte snippets. It takes the same options
			except <code>lang</code>.
		</p>
		<CodeBlock fname="svelte.ts" html={svelte_usage} />
	</Section>

	<Section id="tags" title="custom tags" num="§ 02">
		<p>
			Twoslash throws an error for unregistered tags such as <code>// @foo</code>. Four tags are
			registered by default: <code>annotate</code>, <code>log</code>,
			<code>warn</code> and <code>error</code>.
		</p>
		<SplitCodeBlock lang="typescript" left_html={tags.input} right_html={tags.output} />
		<p>
			A tag renders beneath the line that follows it. Tags on adjacent lines merge into one, so keep
			a line of code between them.
		</p>
		<p>
			Pass <code>custom_tags</code> to replace that list, or
			<code>[]</code> to disable tags entirely.
		</p>
	</Section>

	<Section id="options" title="options" num="§ 03">
		<CodeBlock fname="options.ts" html={options} />
		<ParamTable
			headers={["option", "type", "default", "meaning"]}
			rows={[
				[
					{ kind: "name", value: "lang" },
					{ kind: "type", value: `"ts" | "tsx" | "js" | "jsx"` },
					{ kind: "def", value: `"ts"` },
					{ kind: "desc", value: `Which grammar to tokenize with.` },
				],
				[
					{ kind: "name", value: "class_name" },
					{ kind: "type", value: "string" },
					{ kind: "def", value: `"twinkleplop"` },
					{ kind: "desc", value: `Replaces the class on the block.` },
				],
				[
					{ kind: "name", value: "custom_tags" },
					{ kind: "type", value: "string[]" },
					{ kind: "def", value: `annotate, log, warn, error` },
					{ kind: "desc", value: `Tags usable as <code>// @&lt;tag&gt;: text</code>.` },
				],
				[
					{ kind: "name", value: "on_error" },
					{ kind: "type", value: "(error, code) =&gt; string | void" },
					{ kind: "def", value: "—" },
					{
						kind: "desc",
						value: `Called when twoslash rejects the snippet. A string return becomes the result; no return rethrows.`,
					},
				],
				[
					{ kind: "name", value: "render_docs" },
					{ kind: "type", value: "(markdown) =&gt; string" },
					{ kind: "def", value: "escaped" },
					{
						kind: "desc",
						value: `Renders jsdoc. The return value is inserted as trusted HTML.`,
					},
				],
				[
					{ kind: "name", value: "process_type" },
					{ kind: "type", value: "(type) =&gt; string" },
					{ kind: "def", value: "identity" },
					{ kind: "desc", value: `Called with every hover and query type before highlighting.` },
				],
				[
					{ kind: "name", value: "docs_tags" },
					{ kind: "type", value: `"split" | "raw"` },
					{ kind: "def", value: `"split"` },
					{
						kind: "desc",
						value: `<code>split</code> gives each jsdoc tag its own element; <code>raw</code> keeps one escaped block.`,
					},
				],
				[
					{ kind: "name", value: "twoslash" },
					{ kind: "type", value: "TwoslashOptions" },
					{ kind: "def", value: "—" },
					{ kind: "desc", value: `Passed through to twoslash itself.` },
				],
			]}
		/>
		<Callout mark="▸" variant="warn">
			<code>render_docs</code> output is inserted as trusted HTML. Sanitise it yourself if the jsdoc is
			untrusted. Without the option, docs are escaped text.
		</Callout>
		<p>
			<code>on_error</code> handles errors from Twoslash. Tokenization and rendering errors are thrown
			directly.
		</p>
	</Section>

	<Section id="markdown" title="in markdown" num="§ 04">
		<p>
			A language registry entry can include a separate Twoslash highlighter. Fences marked <code
				>```ts twoslash</code
			>
			use it; <code>```ts</code> fences use the regular highlighter.
		</p>
		<CodeBlock fname="markdown.ts" html={markdown} />
		<p>
			Set <code>twoslash: "always"</code> in the plugin options to route every fence through the
			twoslash highlighter instead. See
			<a href="/docs/markdown">markdown</a>.
		</p>
	</Section>
</ArticleMain>

<ArticleOtp
	title="twoslash"
	sections={[
		{ href: "#install", label: "§01 — install and use", active: true },
		{ href: "#tags", label: "§02 — custom tags" },
		{ href: "#options", label: "§03 — options" },
		{ href: "#markdown", label: "§04 — in markdown" },
	]}
/>
