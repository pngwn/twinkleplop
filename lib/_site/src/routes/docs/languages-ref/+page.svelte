<!-- <script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";


	import { language } from '@twinkleplop/typescript';
	const ts = language();

  	const html_usage_src = `import { language } from '@twinkleplop/html';

const html_highlighter = language();

// highlight some code, CSS and JS work
const html = html_highlighter("<script>1 + 2<\/script>");`;
	const html_usage = ts(html_usage_src);

	const tokenizer_src = `import { tokenizer } from '@twinkleplop/html';

const html_tokenizer = tokenizer();

// get some tokens
const tokens = html_tokenizer("<p>hello world</p>");`;
const tokenizer_usage = ts(tokenizer_src);

const multiple_languages_src = `import { language as make_html } from '@twinkleplop/html';
import { language as make_ts } from '@twinkleplop/typescript';

const html = make_html();
const ts = make_ts();

// highlight some code, CSS and JS work
const html = html("<script>1 + 2<\/script>");
const ts = ts("1 + 2");
`;
const multiple_languages_usage = ts(multiple_languages_src);

const lazy_loading_src = `const langs = {
  ts: () => import('@twinkleplop/typescript'),
  html: () => import('@twinkleplop/html'),
}

async function get_lang(lang) {
  return (await langs[lang]()).language();
}

// later
const ts = await get_lang("ts");
const html = await get_lang("html");
`;

const lazy_loading_usage = ts(lazy_loading_src);

</script>

<ArticleMain
	pane_path="docs / languages"
	title="api reference"
	subtitle="Working with languages."
>
	<Section id="lang-support" title="language support" num="§ 01">
		<p>
		Currently twinkleplop only supports <a href="/docs/languages-ref">a handful of languages</a>.
		</p>
		<p>Check the <a href="https://github.com/pngwn/twinkleplop/issues">GitHub issues</a> for planned languages. <a href="https://github.com/pngwn/twinkleplop/issues/new">File an issue if yours isn't listed.</a></p>
	</Section>

	<Section id="loading" title="loading languages" num="§ 02">
		<p>Languages are self contained packages. You can simply install and import the ones you need.</p>
		<p>Embedded languages are an implementation detail of the language, you don't need to think about them.</p>

		<CodeBlock fname="highlight.ts" html={html_usage} />
		<p>If you want raw tokens, you can use the tokenizer export:</p>
		<CodeBlock fname="tokenize.ts" html={tokenizer_usage} />
	</Section>


	<Section id="multiple-languages" title="multiple languages" num="§ 03">
		<p>Using two languages is a little bit like using one, except you do it twice:</p>
		<CodeBlock fname="multiple-languages.ts" html={multiple_languages_usage} />
		<p>In this example we import the <code>typescript</code> and <code>html</code> languages. html uses typescript internally, but we don't pay for it twice, any modern bundler will deduplicate internal imports as they point to the same thing.</p>
		<p>Twinkleplop has modern ESM output with granular imports and exports at all sensible boundaries. This works very nicely with bundlers like Vite. No additional gymnastics required.</p>
	</Section>

	<Section id="lazy-loading" title="lazy loading" num="§ 04">
		<p>Twinkleplop does not have a custom module loading API, you can simply use your bundler's native dynamic import capabilities.</p>
		<CodeBlock fname="lazy-loading.ts" html={lazy_loading_usage} />
		<p>This will create chunks for each language so they can be loaded and initialised on demand.</p>
	</Section>

</ArticleMain>

<ArticleOtp
	title="api reference"
	sections={[
		{ href: "#twinkle", label: "§01 — twinkle()", active: true },
		{ href: "#createInstance", label: "§02 — createInstance()" },
		{ href: "#registerTheme", label: "§03 — registerTheme()" },
		{ href: "#languages", label: "§04 — languages" },
	]}
	meta={[
		{ label: "version", value: "0.4.2" },
		{ label: "updated", value: "2d ago" },
		{ label: "authors", value: "pngwn, al" },
		{ label: "read", value: "~5 min" },
	]}
/> -->
