<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash } from "$lib/docs/twoslash";

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
			Every grammar is its own package. See
			<a href="/docs/languages-ref">the language reference</a> for the full list
			of what ships today.
		</p>
		<p>
			Check the <a href="https://github.com/pngwn/twinkleplop/issues">
				GitHub issues
			</a>
			for planned languages, and
			<a href="https://github.com/pngwn/twinkleplop/issues/new">
				file an issue if yours isn't listed
			</a>.
		</p>
	</Section>

	<Section id="s2" title="loading languages" num="§ 02">
		<p>
			Languages are self-contained packages. Install and import the ones you
			need — nothing is bundled that you did not ask for.
		</p>
		<CodeBlock fname="html.ts" html={html_usage} />
		<p>
			Some grammars embed others. HTML hosts CSS and JavaScript, Svelte hosts
			both, and JavaScript hosts HTML and CSS through tagged templates. Those
			sub-languages come along as dependencies of the host package, so a single
			install is enough.
		</p>
	</Section>

	<Section id="s3" title="using several at once" num="§ 03">
		<p>
			Each package exports its factory under the same name, so alias them on
			import and bind each highlighter to its own variable.
		</p>
		<CodeBlock fname="multiple.ts" html={multiple_languages_usage} />
	</Section>

	<Section id="s4" title="lazy loading" num="§ 04">
		<p>
			Nothing about a language package needs to be loaded eagerly. Keep the
			imports behind a dynamic <code>import()</code> when you only know the
			language at runtime.
		</p>
		<CodeBlock fname="lazy.ts" html={lazy_loading_usage} />
	</Section>

	<Section id="s5" title="what a package exports" num="§ 05">
		<p>Every language package exposes the same five things.</p>
		<CodeBlock fname="exports.ts" html={exports_usage} />
		<p>
			<code>language</code> is the common path. <code>tokenize</code> is for
			custom renderers. <code>grammar</code> and <code>reclassifiers</code> are
			for composing a pipeline by hand — see
			<a href="/docs/reclassifier">reclassifiers</a>.
		</p>
		<CodeBlock fname="tokenize.ts" html={tokenize_usage} />
		<Callout mark="▸" variant="warn">
			<code>@twinkleplop/whitespace</code> is the one exception: it exports only
			<code>grammar</code> and <code>raw_grammar</code>. It has no reclassifier
			pipeline and no <code>language</code> or <code>tokenize</code> factory.
		</Callout>
	</Section>
</ArticleMain>

<ArticleOtp
	title="languages"
	sections={[
		{ href: "#s1", label: "§01 — language support", active: true },
		{ href: "#s2", label: "§02 — loading languages" },
		{ href: "#s3", label: "§03 — using several at once" },
		{ href: "#s4", label: "§04 — lazy loading" },
		{ href: "#s5", label: "§05 — what a package exports" },
	]}
/>
