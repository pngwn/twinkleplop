<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import SubSection from "$lib/docs/components/SubSection.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { html as html_hl, ts } from "$lib/docs/highlighters";

	const markdown_it_src = `import markdown_it from "markdown-it";
import markdown_it_twinkleplop from "@twinkleplop/markdown-it";
import { language as typescript } from "@twinkleplop/typescript";
import { language as css } from "@twinkleplop/css";

const md = markdown_it().use(markdown_it_twinkleplop, {
  languages: { ts: typescript(), js: "ts", css: css() },
});

md.render(source);`;
	const markdown_it = ts(markdown_it_src);

	const remark_src = `import { unified } from "unified";
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
	const remark = ts(remark_src);

	const rehype_src = `import rehype_twinkleplop from "@twinkleplop/rehype";
import { language as typescript } from "@twinkleplop/typescript";

.use(rehype_twinkleplop, {
  languages: { ts: typescript(), js: "ts" },
});`;
	const rehype = ts(rehype_src);

	const raw_output_src = `// skip the hast re-parse and emit a raw node
.use(rehype_twinkleplop, { languages, output: "raw" });`;
	const raw_output = ts(raw_output_src);

	const registry_src = `languages: {
  // a highlight function
  ts: typescript(),
  // an entry with a second highlighter for twoslash fences
  tsx: { highlight: tsx_lang(), twoslash: create_highlighter({ lang: "tsx" }) },
  // an alias — resolves transitively, once, at setup
  js: "ts",
  mjs: "js",
}`;
	const registry = ts(registry_src);

	const output_src = `<pre class="twinkleplop language-ts has-highlight" data-language="ts"><code>...</code></pre>`;
	const output = html_hl(output_src);

	const figure_src = `<figure class="twinkleplop-block" data-language="ts">
  <figcaption class="twinkleplop-title">math.ts</figcaption>
  <pre class="twinkleplop language-ts" data-language="ts"><code>...</code></pre>
  <figcaption class="twinkleplop-caption">the running total</figcaption>
</figure>`;
	const figure = html_hl(figure_src);
</script>

<ArticleMain
	pane_path="docs / markdown"
	title="markdown"
	subtitle="Three plugins over one core: rehype, remark and markdown-it."
>
	<p>
		The same options produce the same HTML for the same fence through any of the
		three. Pick the one that matches your toolchain; everything below applies
		identically to all of them.
	</p>

	<Section id="setup" title="setup" num="§ 01">
		<SubSection id="markdown-it" title="markdown-it">
			<CodeBlock fname="markdown-it.ts" html={markdown_it} />
			<p>
				The plugin replaces the <code>fence</code> renderer rule, and the
				<code>code_inline</code> rule when inline code is enabled. A fence it
				leaves alone falls through to whatever rule was in place before, so
				markdown-it's defaults and other plugins still apply.
			</p>
		</SubSection>

		<SubSection id="remark" title="remark">
			<CodeBlock fname="remark.ts" html={remark} />
			<Callout mark="▸" variant="warn">
				The remark plugin always emits mdast <code>html</code> nodes — it has no
				hast mode — so a pipeline continuing into rehype needs
				<code>allowDangerousHtml</code> on both <code>remark-rehype</code> and
				<code>rehype-stringify</code>. Without it the code blocks disappear.
				The rehype plugin is different: see below.
			</Callout>
		</SubSection>

		<SubSection id="rehype" title="rehype">
			<CodeBlock fname="rehype.ts" html={rehype} />
			<p>
				The plugin replaces each <code>pre &gt; code</code> element with the
				highlighted block. By default that block is parsed back into hast, so it
				asks nothing of the rest of the pipeline — no
				<code>allowDangerousHtml</code> anywhere.
			</p>
			<p>
				Parsing it back costs about as much again as rendering it did: roughly
				0.13&nbsp;ms on a 2&nbsp;KB block, or 26&nbsp;ms across a 200-fence
				document. A build that would rather keep that time can take the string
				as a raw node instead.
			</p>
			<CodeBlock fname="raw.ts" html={raw_output} />
			<p>
				<code>"raw"</code> needs <code>allowDangerousHtml</code> on
				<code>rehype-stringify</code> (or <code>rehype-raw</code> before it), as
				any plugin emitting markup of its own does; without it the stringifier
				escapes the block and the page shows the markup as text.
			</p>
			<p>
				The two modes mean the same markup, but not the same bytes. The default
				path is re-serialised by the pipeline's stringifier, which spells
				entities its own way — <code>&amp;#x3C;</code> where twinkleplop wrote
				<code>&amp;lt;</code>, a bare <code>'</code> where it wrote
				<code>&amp;#39;</code>. <code>"raw"</code> reproduces twinkleplop's own
				bytes, which is what the markdown-it and remark plugins emit.
			</p>
			<p>
				The language comes from the <code>code</code> element's
				<code>language-&lt;name&gt;</code> class, and the meta string from
				<code>data.meta</code> (which <code>remark-rehype</code> sets) or a
				<code>metastring</code> attribute for a tree parsed from HTML.
			</p>
		</SubSection>
	</Section>

	<Section id="registry" title="the registry" num="§ 02">
		<p>
			<code>languages</code> maps a fence name to a highlighter. A value is a
			highlight function, an entry with a second highlighter for twoslash fences,
			or the name of another entry.
		</p>
		<CodeBlock fname="registry.ts" html={registry} />
		<p>
			Aliases resolve transitively and once, at plugin setup, so a fence costs one
			map lookup. A cycle, a name that resolves to nothing, or a
			<code>default_language</code> outside the registry fails before any
			document is read.
		</p>
		<p>
			A registry value is whatever <code>language(...)</code> returned, so
			<a href="/docs/fidelity">fidelity</a> tiers and
			<a href="/docs/directives">directives</a> are configured where the entry is
			created — not in the markdown plugin.
		</p>
		<p>
			Matching is exact and case sensitive: <code>TS</code> is not
			<code>ts</code>. A fence with no language uses
			<code>default_language</code>, and with none set is left exactly as the
			toolchain rendered it.
		</p>
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
					{ kind: "desc", value: `<code>"plain"</code> renders the fence as escaped text instead.` },
				],
				[
					{ kind: "name", value: "line_numbers" },
					{ kind: "def", value: "false" },
					{ kind: "desc", value: `Site default; the fence meta overrides it.` },
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
					{ kind: "desc", value: `<code>(raw, parsed) =&gt; render</code>, for house conventions.` },
				],
				[
					{ kind: "name", value: "render" },
					{ kind: "def", value: "{}" },
					{ kind: "desc", value: `Site-wide render options, under the per-fence ones.` },
				],
			]}
		/>
	</Section>

	<Section id="meta" title="fence meta" num="§ 04">
		<p>
			Both the shiki/VitePress and rehype-pretty-code families are recognised, so
			content written for either ports unchanged. Anything no convention claims
			is left for <code>parse_meta</code>.
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
			A pattern may hold spaces (<code>/two words/</code>) and escape a slash
			(<code>/a\/b/</code>). <code>[!code …]</code> inside the fence body is not a
			meta convention — it belongs to the registered language's
			<a href="/docs/directives">directives</a>.
		</p>
	</Section>

	<Section id="output" title="output" num="§ 05">
		<p>A fence with no title and no caption is the block alone:</p>
		<CodeBlock fname="output.html" html={output} />
		<p>A title or caption wraps it in a figure:</p>
		<CodeBlock fname="figure.html" html={figure} />
		<p>
			Inline code renders as
			<code>&lt;code class="twinkleplop-inline language-ts"&gt;</code> around the
			inline structure — no block, no line elements,
			<code>&lt;br&gt;</code> between lines.
		</p>
		<p>
			The block itself is whatever the registered highlighter renders, so
			<code>has-*</code> classes, line classes and hidden marker bytes all apply
			as on a direct call. <code>class_name</code> replaces
			<code>twinkleplop</code>; <code>language-&lt;name&gt;</code> and
			<code>data-language</code> always carry the name the author wrote, alias
			and all.
		</p>
	</Section>
</ArticleMain>

<ArticleOtp
	title="markdown"
	sections={[
		{ href: "#setup", label: "§01 — setup", active: true },
		{ href: "#registry", label: "§02 — the registry" },
		{ href: "#options", label: "§03 — options" },
		{ href: "#meta", label: "§04 — fence meta" },
		{ href: "#output", label: "§05 — output" },
	]}
/>
