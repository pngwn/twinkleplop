<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { bash, ts } from "$lib/docs/highlighters";

	const install_src = `pnpm add @twinkleplop/twoslash`;
	const install = bash(install_src);

	const usage_src = `import { create_highlighter } from "@twinkleplop/twoslash";

const highlight = create_highlighter({ lang: "ts" });
const html = highlight(code);`;
	const usage = ts(usage_src);

	const oneshot_src = `import { highlight } from "@twinkleplop/twoslash";

const html = highlight(code, { lang: "ts" });`;
	const oneshot = ts(oneshot_src);

	const svelte_src = `import { create_highlighter } from "@twinkleplop/twoslash-svelte";

// same options, minus \`lang\`
const highlight = create_highlighter();`;
	const svelte_usage = ts(svelte_src);

	const tags_src = `// @log: this is a log message
// @annotate: pointing at the line below
const x = 1;`;
	const tags = ts(tags_src);

	const options_src = `import { marked } from "marked";
import { create_highlighter } from "@twinkleplop/twoslash";
import { language as plain_ts } from "@twinkleplop/typescript";

const fallback = plain_ts();

const highlight = create_highlighter({
  lang: "ts",
  // a snippet twoslash rejects falls back to plain highlighting
  on_error: (_error, code) => fallback(code),
  // jsdoc becomes rendered markdown instead of escaped text
  render_docs: (md) => marked.parseInline(md),
  // massage the type string before it is highlighted
  process_type: (type) => type.replace(/import\\(".*?"\\)\\./g, ""),
});`;
	const options = ts(options_src);

	const markdown_src = `import rehype_twinkleplop from "@twinkleplop/rehype";
import { create_highlighter } from "@twinkleplop/twoslash";
import { language as typescript } from "@twinkleplop/typescript";

.use(rehype_twinkleplop, {
  languages: {
    ts: {
      highlight: typescript(),
      twoslash: create_highlighter({ lang: "ts" }),
    },
  },
});`;
	const markdown = ts(markdown_src);
</script>

<ArticleMain
	pane_path="docs / twoslash"
	title="twoslash"
	subtitle="TypeScript type information rendered into the highlighted output."
>
	<p>
		Twoslash runs the TypeScript compiler over a snippet and reports what it
		knows: hover types, query results, completions, and errors. Twinkleplop
		renders that alongside its own tokens, so the output is one HTML string with
		both.
	</p>

	<Section id="install" title="install and use" num="§ 01">
		<CodeBlock fname="terminal" html={install} />
		<p>
			<code>create_highlighter</code> builds a reusable highlight function, the
			same shape as a language package's.
		</p>
		<CodeBlock fname="twoslash.ts" html={usage} />
		<p>Or highlight a single snippet directly:</p>
		<CodeBlock fname="oneshot.ts" html={oneshot} />
		<p>
			Svelte snippets use the sibling package, which takes the same options minus
			<code>lang</code>.
		</p>
		<CodeBlock fname="svelte.ts" html={svelte_usage} />
	</Section>

	<Section id="tags" title="custom tags" num="§ 02">
		<p>
			An undeclared <code>// @foo</code> reads to twoslash as a mistyped compiler
			flag and throws. Four tags are pre-registered so the common ones work with
			no configuration: <code>annotate</code>, <code>log</code>,
			<code>warn</code> and <code>error</code>.
		</p>
		<CodeBlock fname="tags.ts" html={tags} />
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
			<code>render_docs</code> output is inserted as trusted HTML. Sanitise it
			yourself if the jsdoc is untrusted. Without the option, docs are escaped
			text.
		</Callout>
		<p>
			<code>on_error</code> covers the twoslash call alone. A failure in
			tokenizing or rendering is a bug in twinkleplop and surfaces as one rather
			than being swallowed.
		</p>
	</Section>

	<Section id="markdown" title="in markdown" num="§ 04">
		<p>
			A registry entry can carry a second highlighter used only for fences that
			ask for twoslash, so <code>```ts twoslash</code> gets types and plain
			<code>```ts</code> stays fast.
		</p>
		<CodeBlock fname="markdown.ts" html={markdown} />
		<p>
			Set <code>twoslash: "always"</code> in the plugin options to route every
			fence through the twoslash highlighter instead. See
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
