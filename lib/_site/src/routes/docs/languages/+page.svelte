<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash } from "$lib/docs/snippets";

	const html_usage = twoslash`import { language } from "@twinkleplop/html";

const html = language();

// css and javascript inside the document are highlighted too
const out = html("<script>1 + 2<\/script>");`;

	const tokenize_usage = twoslash`import { tokenize } from "@twinkleplop/html";

const html_tokenizer = tokenize();

// get a TokenizeResult instead of an HTML string
const result = html_tokenizer("<p>hello world</p>");`;

	const multiple_languages_usage = twoslash`import { language as make_html } from "@twinkleplop/html";
import { language as make_ts } from "@twinkleplop/typescript";

const html = make_html();
const ts = make_ts();

const html_out = html("<script>1 + 2<\/script>");
const ts_out = ts("1 + 2");`;

	const lazy_loading_usage = twoslash`const langs = {
  ts: () => import("@twinkleplop/typescript"),
  html: () => import("@twinkleplop/html"),
};

async function get_lang(name: keyof typeof langs) {
  const { language } = await langs[name]();
  return language();
}

// later
const ts = await get_lang("ts");
const html = await get_lang("html");`;

	const exports_usage = twoslash`import {
  language,      // (options?) => (code, render?) => html string
  tokenize,      // (options?) => (code) => TokenizeResult
  grammar,       // the compiled grammar
  raw_grammar,   // the uncompiled definition
  reclassifiers, // the default reclassifier pipeline
} from "@twinkleplop/javascript";`;
</script>

<ArticleMain
	pane_path="docs / languages"
	title="languages"
	subtitle="Working with language packages."
>
	<Section id="s1" title="language support" num="§ 01">
		<p>
			Every language is its own package. See
			<a href="/docs/languages-ref">the language reference</a> for the full list of supported languages.
		</p>
		<p>
			Check the <a href="https://github.com/pngwn/twinkleplop/issues">GitHub issues</a> for planned
			languages, and
			<a href="https://github.com/pngwn/twinkleplop/issues/new">file an issue</a> if yours isn't listed.
		</p>
	</Section>

	<Section id="s2" title="loading languages" num="§ 02">
		<p>Install and import a package for each language you need.</p>
		<p>
			You do not need to think about embedded or dependent languages. They are internal
			dependencies and handled for you.
		</p>
		<CodeBlock fname="html.ts" html={html_usage} />
	</Section>

	<Section id="s3" title="using multiple languages" num="§ 03">
		<p>Using two languages is a lot like using one, except you do it twice.</p>
		<p>All languages are exported as <code>language</code>. Use import aliases to prevent sorrow.</p>
		<p>
			Do not worry about duplicate 'embedded' languages. They are all regular package dependencies,
			so they will be deduplicated by your bundler.
		</p>
		<CodeBlock fname="multiple.ts" html={multiple_languages_usage} />
	</Section>

	<Section id="s4" title="lazy loading" num="§ 04">
		<p>
			Languages are regular JavaScript modules. Lazy loading can be accomplished by dynamically
			importing a language.
		</p>
		<CodeBlock fname="lazy.ts" html={lazy_loading_usage} />
	</Section>

	<Section id="s5" title="package exports" num="§ 05">
		<p>Languages all have the same set of exports, for your perusal.</p>
		<CodeBlock fname="exports.ts" html={exports_usage} />
		<p>
			Use <code>language</code> to generate HTML and <code>tokenize</code> to get tokens for a
			custom renderer.
		</p>
		<p>
			Use <code>grammar</code> and <code>reclassifiers</code> to configure your own pipeline. See
			<a href="/docs/reclassifier">reclassifiers</a>.
		</p>
		<p>
			<code>raw_grammar</code> is the uncompiled grammar definition and could be useful, so it is
			there.
		</p>
		<CodeBlock fname="tokenize.ts" html={tokenize_usage} />
		<Callout mark="▸" variant="warn">
			<code>@twinkleplop/whitespace</code> is the one exception: it exports only
			<code>grammar</code> and <code>raw_grammar</code>. It has no reclassifier pipeline and no
			<code>language</code>
			or <code>tokenize</code> factory.
		</Callout>
	</Section>
</ArticleMain>
