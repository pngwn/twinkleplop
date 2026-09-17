<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import SubSection from "$lib/docs/components/SubSection.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash, html as html_hl } from "$lib/docs/snippets";

	const markdown_it = twoslash`declare const source: string;
// ---cut---
import markdown_it from "markdown-it";
import markdown_it_twinkleplop from "@twinkleplop/markdown-it";
import { language as typescript } from "@twinkleplop/typescript";
import { language as css } from "@twinkleplop/css";

const md = markdown_it().use(markdown_it_twinkleplop, {
  languages: { ts: typescript(), js: "ts", css: css() },
});

md.render(source);`;

	const remark = twoslash`import { unified } from "unified";
import remark_parse from "remark-parse";
import remark_rehype from "remark-rehype";
import rehype_stringify from "rehype-stringify";
import remark_twinkleplop from "@twinkleplop/remark";
import { language as typescript } from "@twinkleplop/typescript";

const pipeline = unified()
  .use(remark_parse)
  .use(remark_twinkleplop, { languages: { ts: typescript(), js: "ts" } })
  .use(remark_rehype, { allowDangerousHtml: true })
  .use(rehype_stringify, { allowDangerousHtml: true });`;

	const rehype = twoslash`import rehype_twinkleplop from "@twinkleplop/rehype";
import { language as typescript } from "@twinkleplop/typescript";
// ---cut-start---
import { unified } from "unified";
unified()
// ---cut-end---

.use(rehype_twinkleplop, {
  languages: { ts: typescript(), js: "ts" },
});`;

	const raw_output = twoslash`import { unified } from "unified";
import rehype_twinkleplop from "@twinkleplop/rehype";
import { language as typescript } from "@twinkleplop/typescript";
const languages = { ts: typescript() };
unified()
// ---cut---
// skip the hast re-parse and emit a raw node
.use(rehype_twinkleplop, { languages, output: "raw" });`;

	const registry = twoslash`import { unified } from "unified";
import rehype_twinkleplop from "@twinkleplop/rehype";
import { language as typescript } from "@twinkleplop/typescript";
import { language as tsx_lang } from "@twinkleplop/tsx";
import { create_highlighter } from "@twinkleplop/twoslash";
unified().use(rehype_twinkleplop, {
// ---cut---
languages: {
  // a highlight function
  ts: typescript(),
  // an entry with a second highlighter for twoslash fences
  tsx: { highlight: tsx_lang(), twoslash: create_highlighter({ lang: "tsx" }) },
  // an alias — resolves transitively, once, at setup
  js: "ts",
  mjs: "js",
}
// ---cut-after---
});`;

	const output = html_hl`<pre class="twinkleplop language-ts has-highlight" data-language="ts"><code>...</code></pre>`;

	const figure = html_hl`<figure class="twinkleplop-block" data-language="ts">
  <figcaption class="twinkleplop-title">math.ts</figcaption>
  <pre class="twinkleplop language-ts" data-language="ts"><code>...</code></pre>
  <figcaption class="twinkleplop-caption">the running total</figcaption>
</figure>`;
</script>

<ArticleMain
	pane_path="docs / markdown"
	title="markdown"
	subtitle="Highlight code in rehype, remark and markdown-it."
>
	<p>Use the plugin for your markdown processor. All three share the options described below.</p>

	<Section id="setup" title="setup" num="§ 01">
		<SubSection id="markdown-it" title="markdown-it">
			<CodeBlock fname="markdown-it.ts" html={markdown_it} />
			<p>
				The plugin replaces the <code>fence</code> renderer rule, and the
				<code>code_inline</code> rule when inline code is enabled. Code blocks that the plugin does not
				highlight use the previous renderer rule.
			</p>
		</SubSection>

		<SubSection id="remark" title="remark">
			<CodeBlock fname="remark.ts" html={remark} />
			<Callout mark="▸" variant="warn">
				The remark plugin emits mdast <code>html</code> nodes. If your pipeline continues into
				rehype, enable <code>allowDangerousHtml</code> on both <code>remark-rehype</code> and
				<code>rehype-stringify</code> to preserve the code blocks.
			</Callout>
		</SubSection>

		<SubSection id="rehype" title="rehype">
			<CodeBlock fname="rehype.ts" html={rehype} />
			<p>
				The plugin replaces each <code>pre &gt; code</code> element with the highlighted block. By
				default, it parses the highlighted HTML into hast nodes. This works without
				<code>allowDangerousHtml</code>.
			</p>
			<p>
				Parsing the HTML adds processing time. Set <code>output: "raw"</code> to return the highlighted
				string as a raw node.
			</p>
			<CodeBlock fname="raw.ts" html={raw_output} />
			<p>
				<code>"raw"</code> needs <code>allowDangerousHtml</code> on
				<code>rehype-stringify</code> (or <code>rehype-raw</code> before it), otherwise the stringifier
				escapes the block and displays the HTML as text.
			</p>
			<p>
				Both modes render the same code. In the default mode, the pipeline's stringifier may use
				different HTML entities, such as <code>&amp;#x3C;</code> for <code>&amp;lt;</code>. Raw mode
				preserves Twinkleplop's HTML string, as the markdown-it and remark plugins do.
			</p>
			<p>
				The language comes from the <code>code</code> element's
				<code>language-&lt;name&gt;</code> class, and the meta string from
				<code>data.meta</code> (which <code>remark-rehype</code> sets) or a
				<code>metastring</code> attribute for a tree parsed from HTML.
			</p>
		</SubSection>
	</Section>

	<Section id="registry" title="language registry" num="§ 02">
		<p>
			<code>languages</code> maps a fence name to a highlighter. A value is a highlight function, an entry
			with a second highlighter for twoslash fences, or the name of another entry.
		</p>
		<CodeBlock fname="registry.ts" html={registry} />
		<p>
			Aliases can refer to other aliases and are resolved during setup. Circular aliases, missing
			entries and an unregistered <code>default_language</code> cause setup errors.
		</p>
		<p>
			Configure <a href="/docs/fidelity">fidelity</a> and <a href="/docs/directives">directives</a>
			when calling <code>language(...)</code> to create each highlighter.
		</p>
		<p>
			Matching is exact and case sensitive: <code>TS</code> is not
			<code>ts</code>. A fence with no language uses
			<code>default_language</code>, and with none set is left exactly as the toolchain rendered it.
		</p>
		<Callout mark="▸" variant="warn">
			In rehype and remark, <code>default_language</code> applies to both indented code blocks and
			fences without a language. In markdown-it, it applies only to fences. Indented blocks use
			markdown-it's existing <code>code_block</code> rule.
		</Callout>
	</Section>

	<Section id="options" title="options" num="§ 03">
		<p>
			These are shared by all three plugins.
			<code>@twinkleplop/rehype</code> extends them with one more,
			<code>output</code>, covered <a href="#rehype">above</a>.
		</p>
		<ParamTable
			headers={["option", "default", "meaning"]}
			rows={[
				[
					{ kind: "name", value: "languages" },
					{ kind: "def", value: "required" },
					{ kind: "desc", value: `Fence name to highlighter, entry, or alias.` },
				],
				[
					{ kind: "name", value: "default_language" },
					{ kind: "def", value: "none" },
					{ kind: "desc", value: `Used by a fence that names no language.` },
				],
				[
					{ kind: "name", value: "on_unknown_language" },
					{ kind: "def", value: `"throw"` },
					{
						kind: "desc",
						value: `<code>"plain"</code> renders the fence as escaped text instead.`,
					},
				],
				[
					{ kind: "name", value: "line_numbers" },
					{ kind: "def", value: "false" },
					{ kind: "desc", value: `Site default; the fence metadata overrides it.` },
				],
				[
					{ kind: "name", value: "inline" },
					{ kind: "def", value: "false" },
					{
						kind: "desc",
						value: `<code>"tailing-curly-colon"</code> highlights <code>\`code&#123;:lang&#125;\`</code>.`,
					},
				],
				[
					{ kind: "name", value: "twoslash" },
					{ kind: "def", value: `"meta"` },
					{
						kind: "desc",
						value: `<code>"always"</code> routes every fence through the entry's twoslash highlighter.`,
					},
				],
				[
					{ kind: "name", value: "parse_meta" },
					{ kind: "def", value: "none" },
					{ kind: "desc", value: `<code>(raw, parsed) =&gt; render</code>, for custom metadata.` },
				],
				[
					{ kind: "name", value: "render" },
					{ kind: "def", value: "{}" },
					{ kind: "desc", value: `Default render options. Individual fences can override them.` },
				],
			]}
		/>
	</Section>

	<Section id="meta" title="fence metadata" num="§ 04">
		<p>
			The plugins support Shiki, VitePress and rehype-pretty-code metadata. Use <code
				>parse_meta</code
			> for custom metadata.
		</p>
		<ParamTable
			headers={["convention", "source", "effect"]}
			rows={[
				[
					{ kind: "name", value: "&#123;1,3-4&#125;" },
					{ kind: "type", value: "shiki / VitePress" },
					{ kind: "desc", value: `<code>highlight</code> on those lines` },
				],
				[
					{ kind: "name", value: "&#123;1,3-4&#125;#id" },
					{ kind: "type", value: "rehype-pretty-code" },
					{ kind: "desc", value: `plus <code>data-highlighted-line-id</code>` },
				],
				[
					{ kind: "name", value: "/word/" },
					{ kind: "type", value: "shiki" },
					{ kind: "desc", value: `<code>highlighted-word</code> on every occurrence` },
				],
				[
					{ kind: "name", value: "/word/3-5" },
					{ kind: "type", value: "rehype-pretty-code" },
					{ kind: "desc", value: `only the 3rd to 5th occurrences` },
				],
				[
					{ kind: "name", value: ":line-numbers=N" },
					{ kind: "type", value: "VitePress" },
					{ kind: "desc", value: `numbers on, starting at N` },
				],
				[
					{ kind: "name", value: "showLineNumbers&#123;N&#125;" },
					{ kind: "type", value: "rehype-pretty-code" },
					{ kind: "desc", value: `the same` },
				],
				[
					{ kind: "name", value: "[title]" },
					{ kind: "type", value: "VitePress" },
					{ kind: "desc", value: `title caption` },
				],
				[
					{ kind: "name", value: `title="…"` },
					{ kind: "type", value: "rehype-pretty-code" },
					{ kind: "desc", value: `title caption` },
				],
				[
					{ kind: "name", value: `caption="…"` },
					{ kind: "type", value: "rehype-pretty-code" },
					{ kind: "desc", value: `caption below the block` },
				],
				[
					{ kind: "name", value: "twoslash" },
					{ kind: "type", value: "shiki" },
					{ kind: "desc", value: `route through the entry's twoslash highlighter` },
				],
			]}
		/>
		<p>
			A pattern may hold spaces (<code>/two words/</code>) and escape a slash (<code>/a\/b/</code>).
			<code>[!code …]</code>
			inside the fence body is not a meta convention — it belongs to the registered language's
			<a href="/docs/directives">directives</a>.
		</p>
	</Section>

	<Section id="output" title="output" num="§ 05">
		<p>A fence without a title or caption renders as a code block:</p>
		<CodeBlock fname="output.html" html={output} />
		<p>A title or caption wraps it in a figure:</p>
		<CodeBlock fname="figure.html" html={figure} />
		<p>
			Inline code renders as
			<code>&lt;code class="twinkleplop-inline language-ts"&gt;</code> around the inline structure —
			no block, no line elements,
			<code>&lt;br&gt;</code> between lines.
		</p>
		<p>
			The registered highlighter renders the block. Its <code>has-*</code> classes, line classes and
			hidden ranges work as they do when calling it directly. <code>class_name</code> replaces
			<code>twinkleplop</code>; <code>language-&lt;name&gt;</code> and
			<code>data-language</code> use the language name written in the fence, including aliases.
		</p>
	</Section>
</ArticleMain>
