<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import SplitCodeBlock from "$lib/docs/components/SplitCodeBlock.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash, css, ts_shiki_split } from "$lib/docs/snippets";

	const before = twoslash`declare const code: string;
// ---cut---
import { codeToHtml } from "shiki";

const html = await codeToHtml(code, {
  lang: "ts",
  theme: "github-dark",
});`;

	const after = twoslash`declare const code: string;
// ---cut---
import { language } from "@twinkleplop/typescript";
import "@twinkleplop/theme-github";

const ts = language();
const html = ts(code);`;

	const notation = twoslash`import { language } from "@twinkleplop/typescript";
import { shiki_notation } from "@twinkleplop/annotation/shiki";

const ts = language({ annotation: { plugins: [shiki_notation()] } });`;

	const notation_source = ts_shiki_split`const a = 1 // [!code highlight]
// [!code focus:2]
const b = 2
const c = 3 // [!code --]
const d = 4 // [!code ++]`;

	const classes = twoslash`import { shiki_notation } from "@twinkleplop/annotation/shiki";
// ---cut---
// emit shiki's class names instead of twinkleplop's
shiki_notation({ classes: "shiki" });`;

	const theme_css = css`/* shiki writes inline styles; twinkleplop writes classes.
   restyling is CSS, not a theme rebuild. */
.twinkleplop { --twp-keyword: #ff7b72; }
.twinkleplop .keyword { color: var(--twp-keyword); }`;
</script>

<ArticleMain
	pane_path="docs / migration"
	title="migrating from shiki"
	subtitle="Move a Shiki setup to Twinkleplop."
>
	<p>
		Shiki uses TextMate grammars and generates inline styles. Twinkleplop uses its own grammars and
		generates CSS classes. This guide covers the changes needed to migrate.
	</p>

	<Section id="calls" title="highlighting code" num="§ 01">
		<p>Shiki:</p>
		<CodeBlock fname="before.ts" html={before} />
		<p>Twinkleplop:</p>
		<CodeBlock fname="after.ts" html={after} />
		<p>
			Twinkleplop highlighting is synchronous. Import the package for each language you need and
			import a theme stylesheet for the colours.
		</p>
	</Section>

	<Section id="themes" title="themes" num="§ 02">
		<p>
			Shiki applies theme colours through inline <code>style</code> attributes. Twinkleplop uses CSS classes
			styled by a theme stylesheet.
		</p>
		<ParamTable
			headers={["shiki", "twinkleplop"]}
			rows={[
				[
					{ kind: "name", value: `theme: "github-dark"` },
					{ kind: "desc", value: `<code>import "@twinkleplop/theme-github"</code>` },
				],
				[
					{ kind: "name", value: `themes: &#123; light, dark &#125;` },
					{
						kind: "desc",
						value: `The default import includes both variants. Add <code>.dark</code> to an ancestor to use dark colours.`,
					},
				],
				[
					{ kind: "name", value: "any bundled theme name" },
					{
						kind: "desc",
						value: `Two theme packages are available. Customise their colours with CSS.`,
					},
				],
			]}
		/>
		<CodeBlock fname="restyle.css" html={theme_css} />
		<Callout mark="▸" variant="warn">
			To port a Shiki theme, map its scope colours to Twinkleplop's <a href="/docs/themes-ref"
				>token types</a
			>.
		</Callout>
	</Section>

	<Section id="notation" title="transformer notation" num="§ 03">
		<p>
			The <code>shiki_notation</code> plugin supports the comment notation used by
			<code>@shikijs/transformers</code> in Shiki 4.4.3.
		</p>
		<CodeBlock fname="setup.ts" html={notation} />
		<SplitCodeBlock
			lang="typescript"
			left_html={notation_source.input}
			right_html={notation_source.output}
		/>
		<p>
			<code>highlight</code>, <code>hl</code>, <code>focus</code>,
			<code>++</code>, <code>--</code>, <code>error</code>,
			<code>warning</code>, <code>info</code> — each with an optional
			<code>:N</code> count — plus <code>word:text</code>. Line selection follows shiki's v3
			matching.
		</p>
		<p>
			By default the plugin emits twinkleplop's class names so one theme covers both marker
			syntaxes. To keep your existing CSS instead:
		</p>
		<CodeBlock fname="classes.ts" html={classes} />
		<p>
			That emits <code>highlighted</code>, <code>focused</code>,
			<code>diff add</code>, <code>diff remove</code> and
			<code>highlighted-word</code>, making the block classes read
			<code>has-highlighted</code>, <code>has-focused</code> and
			<code>has-diff</code> as shiki's <code>classActivePre</code> defaults do.
		</p>
		<p>
			A <code>[!code xyz]</code> shiki would not recognise is left in the output as comment text.
			Twinkleplop's <a href="/docs/directives">directives</a> also support text anchors, ranges and paired
			markers.
		</p>
	</Section>

	<Section id="markdown" title="markdown pipelines" num="§ 04">
		<p>
			Fence meta conventions carry over directly — <code>&#123;1,3-4&#125;</code>,
			<code>/word/</code>, <code>:line-numbers</code>, <code>[title]</code> and the
			rehype-pretty-code family are all recognised. See
			<a href="/docs/markdown">markdown</a>.
		</p>
	</Section>

	<Section id="gaps" title="unsupported features" num="§ 05">
		<p>Check whether your project uses these features before migrating:</p>
		<ul>
			<li>
				<strong>Transformer objects.</strong> Shiki transformers mutate a HAST tree. Twinkleplop
				builds HTML in one pass with no intermediate tree; the equivalents are the
				<a href="/docs/render_options">line and token hooks</a>
				and overlays, which cover classes and attributes but not changes to the element structure.
			</li>
			<li>
				<strong>Inline colour output.</strong> There is no mode that emits
				<code>style</code> attributes. If you need self-contained HTML with no stylesheet, you will need
				to add the styles yourself.
			</li>
			<li>
				<strong>Arbitrary TextMate grammars.</strong> Twinkleplop uses its own grammar format.
				TextMate grammars need to be rewritten. See
				<a href="/docs/grammar">grammars</a>.
			</li>
			<li>
				<strong>Language coverage.</strong> Shiki ships hundreds of grammars. Twinkleplop ships
				<a href="/docs/languages-ref">eighteen</a>.
			</li>
		</ul>
	</Section>
</ArticleMain>

<ArticleOtp
	title="migrating from shiki"
	sections={[
		{ href: "#calls", label: "§01 — highlighting code", active: true },
		{ href: "#themes", label: "§02 — themes" },
		{ href: "#notation", label: "§03 — transformer notation" },
		{ href: "#markdown", label: "§04 — markdown pipelines" },
		{ href: "#gaps", label: "§05 — unsupported features" },
	]}
/>
