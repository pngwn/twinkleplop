<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { bash, ts } from "$lib/docs/highlighters";

	const install_src = `pnpm add @twinkleplop/typescript @twinkleplop/theme-github`;
	const install_code = bash(install_src);

	const first_highlight_src = `// import the language you want to highlight
import { language } from "@twinkleplop/typescript";

// import a theme once, anywhere in your app
import "@twinkleplop/theme-github";

// create a reusable highlighter
const ts = language();

// highlight some code
const html = ts("const total = 1 + 2;");

document.body.innerHTML = html;`;
	const first_highlight_code = ts(first_highlight_src);

	const render_src = `const ts = language();

// the highlighter takes per-call render options
const html = ts(code, {
  line_numbers: true,
  attributes: { "data-title": "math.ts" },
});`;
	const render_code = ts(render_src);

	const tokens_src = `import { tokenize } from "@twinkleplop/typescript";

const code = "const total = 1 + 2;";
const tokenizer = tokenize();
const result = tokenizer(code);

// tokens is a flat Uint32Array of [type, start, end] triplets
for (let i = 0; i < result.tokens.length; i += 3) {
  const name = result.token_types[result.tokens[i]];
  const text = code.slice(result.tokens[i + 1], result.tokens[i + 2]);
  console.log(name, text);
}`;
	const tokens_code = ts(tokens_src);
</script>

<ArticleMain
	pane_path="docs / getting-started"
	title="getting started"
	subtitle="Install and highlight your first snippet."
>
	<Section id="s1" title="install" num="§ 01">
		<p>
			Install one language package per language you want to highlight, plus a
			theme. Language packages depend on <code>@twinkleplop/core</code>, so you
			rarely install it directly.
		</p>
		<CodeBlock fname="terminal" html={install_code} />
		<p>
			There are two theme packages: <code>@twinkleplop/theme-github</code> and
			<code>@twinkleplop/theme-atom-one</code>. Each ships a light and a dark
			variant. See <a href="/docs/themes">themes</a> for the options.
		</p>
	</Section>

	<Section id="s2" title="first highlight" num="§ 02">
		<p>Import. Initialize. Highlight.</p>
		<CodeBlock fname="first-twinkle.ts" html={first_highlight_code} />
		<p>
			<code>language()</code> is a <em>factory</em>. It takes configuration and
			returns a highlight function; that function takes source and returns an
			HTML string. Create the highlighter once and reuse it — compiling the
			grammar is the expensive part, and it happens at import.
		</p>
	</Section>

	<Section id="s3" title="per-call options" num="§ 03">
		<p>
			The highlight function takes a second argument of render options, applied
			to that call alone. The highlighter itself stays reusable.
		</p>
		<CodeBlock fname="render.ts" html={render_code} />
		<p>
			See <a href="/docs/render_options">render options</a> for the full list.
		</p>
	</Section>

	<Section id="s4" title="tokens instead of html" num="§ 04">
		<p>
			When you want to render yourself — the CSS Custom Highlight API, a canvas
			renderer, an editor — use <code>tokenize</code> and skip the generator.
		</p>
		<CodeBlock fname="tokens.ts" html={tokens_code} />
	</Section>

	<Callout mark="✦">
		<strong>What next?</strong> Pick a <a href="/docs/themes">theme</a>, skim the
		<a href="/docs/api">API reference</a>, add
		<a href="/docs/directives">directives</a> to your snippets, or learn
		<a href="/docs/tokenization">how tokenization works</a> under the hood.
	</Callout>
</ArticleMain>

<ArticleOtp
	title="getting started"
	sections={[
		{ href: "#s1", label: "§01 — install", active: true },
		{ href: "#s2", label: "§02 — first highlight" },
		{ href: "#s3", label: "§03 — per-call options" },
		{ href: "#s4", label: "§04 — tokens instead of html" },
	]}
/>
