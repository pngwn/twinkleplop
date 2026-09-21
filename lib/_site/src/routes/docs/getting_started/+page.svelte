<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash, bash } from "$lib/docs/snippets";

	const install_code = bash`pnpm add @twinkleplop/typescript @twinkleplop/theme-github`;

	const first_highlight_code = twoslash`// import the language you want to highlight
import { language } from "@twinkleplop/typescript";

// import a theme once, anywhere in your app
import "@twinkleplop/theme-github";

// create a reusable highlighter
const ts = language();

// highlight some code
const html = ts("const total = 1 + 2;");

document.body.innerHTML = html;`;

	const render_code = twoslash`import { language } from "@twinkleplop/typescript";
declare const code: string;
// ---cut---
const ts = language();

// the highlighter takes per-call render options
const html = ts(code, {
  line_numbers: true,
  attributes: { "data-title": "math.ts" },
});`;

	const tokens_code = twoslash`import { tokenize } from "@twinkleplop/typescript";

const code = "const total = 1 + 2;";
const tokenizer = tokenize();
const result = tokenizer(code);

// tokens is a flat Uint32Array of [type, start, end] triplets
for (let i = 0; i < result.tokens.length; i += 3) {
  const name = result.token_types[result.tokens[i]];
  const text = code.slice(result.tokens[i + 1], result.tokens[i + 2]);
  console.log(name, text);
}`;
</script>

<ArticleMain
	pane_path="docs / getting-started"
	title="getting started"
	subtitle="Install and highlight your first snippet."
>
	<Section id="s1" title="install" num="§ 01">
		<p>
			Install one language package per language you want to highlight, plus a theme. Language
			packages depend on <code>@twinkleplop/core</code>, so it is installed automatically.
		</p>
		<CodeBlock fname="terminal" html={install_code} />
		<p>
			There are five theme packages: <code>@twinkleplop/theme-github</code>,
			<code>@twinkleplop/theme-atom-one</code>, <code>@twinkleplop/theme-solarized</code>,
			<code>@twinkleplop/theme-night-owl</code> and <code>@twinkleplop/theme-material</code>. Each
			includes a light and a dark variant. See
			<a href="/docs/themes">themes</a> for the options.
		</p>
	</Section>

	<Section id="s2" title="highlighting code" num="§ 02">
		<p>Import <code>language</code> and call it to create a highlighter.</p>
		<CodeBlock fname="first-twinkle.ts" html={first_highlight_code} />
		<p>
			<code>language()</code> takes configuration and returns a function that highlights source code as
			HTML. Create the highlighter once and reuse it. The grammar is compiled when the package is imported.
		</p>
	</Section>

	<Section id="s3" title="per-call options" num="§ 03">
		<p>
			Pass render options as the second argument to the highlight function. Each call can use
			different options.
		</p>
		<CodeBlock fname="render.ts" html={render_code} />
		<p>
			See <a href="/docs/render_options">render options</a> for the full list.
		</p>
	</Section>

	<Section id="s4" title="tokens instead of html" num="§ 04">
		<p>
			Use <code>tokenize</code> to get tokens for a custom renderer, such as the CSS Custom Highlight
			API, a canvas renderer or an editor.
		</p>
		<CodeBlock fname="tokens.ts" html={tokens_code} />
	</Section>

	<Callout mark="✦">
		<strong>What next?</strong> Pick a <a href="/docs/themes">theme</a>, read the
		<a href="/docs/api">API reference</a>, add
		<a href="/docs/directives">directives</a> to your snippets, or learn
		<a href="/docs/tokenization">how tokenization works</a> .
	</Callout>
</ArticleMain>
