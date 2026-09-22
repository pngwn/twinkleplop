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
const { token_types, tokens } = tokenizer(code);

// tokens is a flat Uint32Array of [type, start, end] triplets
for (let i = 0; i < tokens.length; i += 3) {
  const name = token_types[tokens[i]];
  const text = code.slice(tokens[i + 1], tokens[i + 2]);
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
			Install a package per language you wish to highlight. Power and beauty are bedfellows, so you
			will probably want a <a href="/docs/themes">theme</a> as well.
		</p>
		<p>I have used <code>pnpm</code> here but you are your own person.</p>
		<CodeBlock fname="terminal" html={install_code} />
	</Section>

	<Section id="s2" title="highlighting code" num="§ 02">
		<p>Create a highlighter by calling the <code>language</code> function and save it to a variable.</p>
		<p>You can call this new variable to highlight your code.</p>
		<CodeBlock fname="first-twinkle.ts" html={first_highlight_code} />
		<p>
			The <code>language</code> function takes similar but different
			<a href="/docs/api#language_options">options</a> depending on the language. Create a
			highlighter once and reuse it.
		</p>
	</Section>

	<Section id="s3" title="per-call options" num="§ 03">
		<p>
			The resulting highlighter function <em>also</em> takes
			<a href="/docs/render_options">options</a>.
		</p>
		<p>You can switch these options as you wish. There are no rules.</p>
		<CodeBlock fname="render.ts" html={render_code} />
	</Section>

	<Section id="s4" title="tokens instead of html" num="§ 04">
		<p>If you want 'tokens' instead of HTML, you can use the <code>tokenize</code> function.</p>
		<p>
			Tokens do not contain the source but are a flat array of <code>[type, start, end]</code>
			triplets. A <code>token_types</code> map is also returned from <code>tokenize</code>.
		</p>
		<CodeBlock fname="tokens.ts" html={tokens_code} />
		<p>
			You can use this new power to create a custom renderer, fancy hovery things, and other
			majestic creations.
		</p>
	</Section>

	<Callout mark="✦">
		<strong>What next?</strong> Pick a <a href="/docs/themes">theme</a>, read the
		<a href="/docs/api">API reference</a>, add
		<a href="/docs/directives">directives</a> to your snippets, or learn
		<a href="/docs/tokenization">how tokenization works</a> .
	</Callout>
</ArticleMain>
