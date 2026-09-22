<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import SplitCodeBlock from "$lib/docs/components/SplitCodeBlock.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash, twoslash_split, bash, ts } from "$lib/docs/snippets";

	const install = bash`pnpm add @twinkleplop/twoslash`;

	const usage = twoslash`declare const code: string;
// ---cut---
import { create_highlighter } from "@twinkleplop/twoslash";

const highlight = create_highlighter({ lang: "ts" });
const html = highlight(code);`;

	const svelte_usage = twoslash`import { create_highlighter } from "@twinkleplop/twoslash-svelte";

// same options, minus \`lang\`
const highlight = create_highlighter();`;

	const styles = ts`// token colours, then the twoslash layout/visibility rules
import "@twinkleplop/theme-github";
import "@twinkleplop/twoslash/style.css";`;

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
	<p>Twoslash is a gift, and as with all gifts, it is rude to refuse.</p>
	<p>
		Twoslash uses the TypeScript compiler to get hover types, query results, completions and errors
		for a snippet. Twinkleplop includes this information in the highlighted HTML.
	</p>
	<p>
		Every notation below is rendered side by side with <code>@shikijs/twoslash</code> on the
		<a href="/twoslash">twoslash comparison page</a>.
	</p>

	<Section id="install" title="install and use" num="§ 01">
		<CodeBlock fname="terminal" html={install} />
		<p>
			<code>create_highlighter</code> builds a reusable highlight function, the same shape as a language
			package's.
		</p>
		<CodeBlock fname="twoslash.ts" html={usage} />
		<Callout mark="▸" variant="tip">
			Create the highlighter once and reuse it. Each one builds its own TypeScript environment, which
			costs far more than highlighting a snippet, so calling <code>create_highlighter</code> per
			snippet can make a docs build several times slower.
		</Callout>
		<p>
			Use <code>@twinkleplop/twoslash-svelte</code> for Svelte snippets. It takes the same options
			except <code>lang</code>.
		</p>
		<CodeBlock fname="svelte.ts" html={svelte_usage} />
		<p>
			The output needs two stylesheets. A theme colours the tokens; <code
				>@twinkleplop/twoslash/style.css</code
			> positions the twoslash spans. Without it every popover renders inline, so hover type text
			appears in the middle of the code instead of on hover.
		</p>
		<CodeBlock fname="styles.ts" html={styles} />
		<Callout>
			The popovers are positioned against their hover target, which an ancestor with
			<code>overflow: hidden</code> or <code>overflow: auto</code> clips. If your code blocks scroll,
			drive them with the Popover API instead: <code>.twoslash-popover</code> sits directly inside
			<code>.twoslash-hover</code>, so setting <code>popover="manual"</code> and calling
			<code>showPopover()</code> on pointerover promotes them to the top layer.
		</Callout>
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
			<code>[]</code> to disable tags.
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
					{ kind: "def", value: `"twinkleplop twoslash"` },
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
