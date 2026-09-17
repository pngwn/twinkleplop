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
	subtitle="What maps across directly, what changes shape, and what has no equivalent."
>
	<p>
		The two libraries solve the same problem differently. Shiki runs TextMate
		grammars over a regex engine and writes inline styles; twinkleplop runs a
		character-scanning state machine and writes classes. Most migrations are
		small, but the differences are real and worth knowing before you start.
	</p>

	<Section id="calls" title="the basic call" num="§ 01">
		<p>Shiki:</p>
		<CodeBlock fname="before.ts" html={before} />
		<p>Twinkleplop:</p>
		<CodeBlock fname="after.ts" html={after} />
		<p>
			Three differences. Highlighting is <strong>synchronous</strong> — there is
			no async loading step and no highlighter instance to await. The language is
			chosen by <strong>which package you import</strong>, not by a
			<code>lang</code> string. The theme is a <strong>stylesheet</strong> you
			import once, not an option on every call.
		</p>
	</Section>

	<Section id="themes" title="themes" num="§ 02">
		<p>
			This is the biggest shift. Shiki resolves a theme at highlight time and
			emits inline <code>style</code> attributes. Twinkleplop emits stable class
			names and lets CSS do the rest.
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
						value: `The default import carries both; a <code>.dark</code> class on any ancestor switches.`,
					},
				],
				[
					{ kind: "name", value: "any bundled theme name" },
					{
						kind: "desc",
						value: `Two theme packages ship today. Restyling is CSS — see below.`,
					},
				],
			]}
		/>
		<CodeBlock fname="restyle.css" html={theme_css} />
		<Callout mark="▸" variant="warn">
			If you depend on a specific bundled shiki theme, there is no drop-in
			equivalent. The palettes are plain objects, though, so porting one is
			mechanical: map the scope colours onto
			<a href="/docs/themes-ref">the token vocabulary</a>.
		</Callout>
	</Section>

	<Section id="notation" title="transformer notation" num="§ 03">
		<p>
			Content written for <code>@shikijs/transformers</code> keeps working
			unchanged. The <code>shiki_notation</code> plugin claims the
			<code>code</code> verb and reads every notation of shiki 4.4.3.
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
			<code>:N</code> count — plus <code>word:text</code>. Line selection follows
			shiki's v3 matching.
		</p>
		<p>
			By default the plugin emits twinkleplop's class names so one theme covers
			both marker syntaxes. To keep your existing CSS instead:
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
			A <code>[!code xyz]</code> shiki would not recognise is left in the output
			as comment text. Going forward, twinkleplop's own
			<a href="/docs/directives">directives</a> are shorter and take a richer
			argument grammar.
		</p>
	</Section>

	<Section id="markdown" title="markdown pipelines" num="§ 04">
		<p>
			Fence meta conventions carry over directly — <code>&#123;1,3-4&#125;</code>,
			<code>/word/</code>, <code>:line-numbers</code>, <code>[title]</code> and
			the rehype-pretty-code family are all recognised. See
			<a href="/docs/markdown">markdown</a>.
		</p>
	</Section>

	<Section id="gaps" title="what has no equivalent" num="§ 05">
		<p>Worth checking before you commit to a migration:</p>
		<ul>
			<li>
				<strong>Transformer objects.</strong> Shiki transformers mutate a HAST
				tree. Twinkleplop builds HTML in one pass with no intermediate tree; the
				equivalents are the <a href="/docs/render_options">line and token hooks</a>
				and overlays, which cover classes and attributes but not arbitrary
				element surgery.
			</li>
			<li>
				<strong>Inline colour output.</strong> There is no mode that emits
				<code>style</code> attributes. If you need self-contained HTML with no
				stylesheet, twinkleplop is not a fit today.
			</li>
			<li>
				<strong>Arbitrary TextMate grammars.</strong> Grammars are written
				against twinkleplop's own DSL. Porting one is real work — see
				<a href="/docs/grammar">grammars</a>.
			</li>
			<li>
				<strong>Language coverage.</strong> Shiki ships hundreds of grammars.
				Twinkleplop ships <a href="/docs/languages-ref">eighteen</a>.
			</li>
		</ul>
	</Section>
</ArticleMain>

<ArticleOtp
	title="migrating from shiki"
	sections={[
		{ href: "#calls", label: "§01 — the basic call", active: true },
		{ href: "#themes", label: "§02 — themes" },
		{ href: "#notation", label: "§03 — transformer notation" },
		{ href: "#markdown", label: "§04 — markdown pipelines" },
		{ href: "#gaps", label: "§05 — what has no equivalent" },
	]}
/>
