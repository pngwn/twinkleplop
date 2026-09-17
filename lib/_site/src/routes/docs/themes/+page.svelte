<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { bash, css } from "$lib/docs/highlighters";
	import { twoslash } from "$lib/docs/twoslash";

	const install_code_src = `pnpm add @twinkleplop/theme-github`;
	const install_code = bash(install_code_src);

	const use_theme_code = twoslash`// @noUncheckedSideEffectImports: false
import "@twinkleplop/theme-github";`;

	const variants_code = twoslash`// @noUncheckedSideEffectImports: false
// both variants, switched by a .dark class on any ancestor
import "@twinkleplop/theme-github";

// or pick one explicitly
import "@twinkleplop/theme-github/light";
import "@twinkleplop/theme-github/dark";`;

	const generated_css_src = `:root {
  --twp-background: #ffffff;
  --twp-keyword: #cf222e;
  --twp-string: #0a3069;
}

.dark {
  --twp-background: #0d1117;
  --twp-keyword: #ff7b72;
  --twp-string: #a5d6ff;
}

.twinkleplop .keyword { color: var(--twp-keyword); }
.twinkleplop .string  { color: var(--twp-string); }`;
	const generated_css = css(generated_css_src);

	const override_css_src = `/* override a single colour without forking a theme */
.twinkleplop {
  --twp-keyword: rebeccapurple;
}

/* the background is exposed as a variable but never bound,
   so you opt into it on whatever container you like */
.my-code-block {
  background: var(--twp-background);
}`;
	const override_css = css(override_css_src);

	const use_theme_tokens = twoslash`import { light, dark } from "@twinkleplop/theme-github/tokens";`;

	const sample_tokens = twoslash`const light = {
  background_color: "#ffffff",
  boolean: "#0550ae",
  comment: "#6e7781",
  identifier: "#1f2328",
  keyword: "#cf222e",
  number: "#0550ae",
  operator: "#cf222e",
  punctuation: "#1f2328",
  regex: "#0a3069",
  string: "#0a3069",
  template: "#0a3069",
  // ...one entry per token type
};`;
</script>

<ArticleMain
	pane_path="docs / themes"
	title="themes"
	subtitle="Two themes ship today, each with a light and a dark variant. Everything is plain CSS custom properties, so overriding one colour never means forking a theme."
>
	<p>
		A theme is a stylesheet. It declares every palette entry as a
		<code>--twp-*</code> custom property and binds each one to a
		<code>.twinkleplop .&lt;token&gt;</code> selector. There is no theme registry,
		no runtime colour lookup, and no JavaScript involved in applying one.
	</p>

	<Section id="install" title="install a theme" num="§ 01">
		<p>
			Pick one from <a href="/docs/themes-ref">the theme reference</a> and
			install it with your package manager.
		</p>
		<CodeBlock fname="terminal" html={install_code} />
	</Section>

	<Section id="css_import" title="direct import" num="§ 02">
		<p>
			With a bundler that handles CSS imports — Vite, Webpack, Parcel — import
			the package directly.
		</p>
		<CodeBlock fname="theme.ts" html={use_theme_code} />
		<p>
			The main export carries both variants. Light lives on
			<code>:root</code> and dark on <code>.dark</code>, so putting a
			<code>.dark</code> class on any ancestor of the snippet gives you both
			modes for free. Import a single variant instead when you control the mode
			yourself.
		</p>
		<CodeBlock fname="variants.ts" html={variants_code} />
	</Section>

	<Section id="css" title="the css contract" num="§ 03">
		<p>The generated stylesheet is small and entirely predictable.</p>
		<CodeBlock fname="theme-github/dist/index.css" html={generated_css} />
		<p>Two details worth knowing:</p>
		<ul>
			<li>
				<code>background_color</code> is the one palette key whose variable name
				differs — it is exposed as <code>--twp-background</code>, and it gets no
				binding selector, so you apply it where you want it. Every other key
				maps 1:1.
			</li>
			<li>
				<code>space</code>, <code>tab</code>, <code>newline</code> and
				<code>carriage_return</code> are never coloured. They get
				<code>white-space: pre</code> instead.
			</li>
		</ul>
	</Section>

	<Section id="override" title="overriding colours" num="§ 04">
		<p>
			Because everything is a custom property, changing one colour is one
			declaration. Scope it as narrowly or as broadly as you like.
		</p>
		<CodeBlock fname="overrides.css" html={override_css} />
		<Callout mark="▸">
			If you are not using a bundler, copy the generated stylesheet out of
			<code>node_modules/@twinkleplop/theme-github/dist/</code> and vendor it into
			your project. It is a normal CSS file with no imports of its own.
		</Callout>
	</Section>

	<Section id="tokens" title="token colours" num="§ 05">
		<p>
			To build the CSS yourself, or to work with the colours directly, every
			theme exports its palettes from a <code>/tokens</code> subpath.
		</p>
		<CodeBlock fname="tokens.ts" html={use_theme_tokens} />
		<p>
			Two named exports, <code>light</code> and <code>dark</code>, each an object
			mapping token name to colour.
		</p>
		<CodeBlock fname="tokens.ts" html={sample_tokens} />
		<p>
			The keys correspond exactly to the token types the highlighter emits. The
			canonical list lives in <code>@twinkleplop/core/tokens</code>; a key that
			is not in that catalogue will never match a span. See
			<a href="/docs/themes-ref">the theme reference</a> for the full vocabulary.
		</p>
	</Section>
</ArticleMain>

<ArticleOtp
	title="themes"
	sections={[
		{ href: "#install", label: "§01 — install a theme", active: true },
		{ href: "#css_import", label: "§02 — direct import" },
		{ href: "#css", label: "§03 — the css contract" },
		{ href: "#override", label: "§04 — overriding colours" },
		{ href: "#tokens", label: "§05 — token colours" },
	]}
/>
