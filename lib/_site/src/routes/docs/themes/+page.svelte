<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { twoslash, bash, css } from "$lib/docs/snippets";

	const install_code = bash`pnpm add @twinkleplop/theme-github`;

	const use_theme_code = twoslash`import "@twinkleplop/theme-github";`;

	const variants_code = twoslash`// both variants, switched by a .dark class on any ancestor
import "@twinkleplop/theme-github";

// or pick one explicitly
import "@twinkleplop/theme-github/light";
import "@twinkleplop/theme-github/dark";`;

	const generated_css = css`:root {
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

	const override_css = css`/* customise a token colour */
.twinkleplop {
  --twp-keyword: rebeccapurple;
}

/* apply the background colour to your container */
.my-code-block {
  background: var(--twp-background);
}`;

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
	subtitle="Eight themes ship today, each with a light and a dark variant. Themes are CSS custom properties and can be customised with plain CSS."
>
	<p>
		A theme is a stylesheet. Colours are defined as <code>--twp-*</code> custom properties and
		applied to <code>.twinkleplop .&lt;token&gt;</code> selectors.
	</p>

	<Section id="install" title="install a theme" num="§ 01">
		<p>
			Pick one from <a href="/docs/themes-ref">the theme reference</a> and install it with your package
			manager.
		</p>
		<CodeBlock fname="terminal" html={install_code} />
	</Section>

	<Section id="css_import" title="direct import" num="§ 02">
		<p>
			With a bundler that handles CSS imports — Vite, Webpack, Parcel — import the package directly.
		</p>
		<CodeBlock fname="theme.ts" html={use_theme_code} />
		<p>
			The main export includes both variants. Light colours are defined on <code>:root</code> and
			dark colours on <code>.dark</code>. Add a <code>.dark</code> class to an ancestor of the snippet
			to use the dark theme. You can also import either variant separately.
		</p>
		<CodeBlock fname="variants.ts" html={variants_code} />
	</Section>

	<Section id="css" title="theme CSS" num="§ 03">
		<p>The generated stylesheet defines the colours and token selectors:</p>
		<CodeBlock fname="theme-github/dist/index.css" html={generated_css} />
		<p>The background and whitespace tokens have separate rules:</p>
		<ul>
			<li>
				<code>background_color</code> is exported as <code>--twp-background</code>. Apply it to your
				code container yourself. All other variables use the palette key as their name.
			</li>
			<li>
				<code>space</code>, <code>tab</code>, <code>newline</code> and
				<code>carriage_return</code> are never coloured. They get
				<code>white-space: pre</code> instead.
			</li>
			<li>
				Tokens a theme draws in italic, bold, underline or strikethrough also read
				<code>--twp-&lt;token&gt;-font-style</code>, <code>-font-weight</code> or
				<code>-text-decoration</code>, which you can override like the colours.
			</li>
		</ul>
	</Section>

	<Section id="override" title="overriding colours" num="§ 04">
		<p>
			Override a custom property to change a colour. The selector determines which code blocks are
			affected.
		</p>
		<CodeBlock fname="overrides.css" html={override_css} />
		<Callout mark="▸">
			If you are not using a bundler, copy the generated stylesheet out of
			<code>node_modules/@twinkleplop/theme-github/dist/</code> into your project. It has no CSS imports.
		</Callout>
	</Section>

	<Section id="tokens" title="token colours" num="§ 05">
		<p>
			To build the CSS yourself, or to work with the colours directly, every theme exports its
			palettes from a <code>/tokens</code> subpath.
		</p>
		<CodeBlock fname="tokens.ts" html={use_theme_tokens} />
		<p>
			The <code>light</code> and <code>dark</code> exports map token names to colours.
		</p>
		<CodeBlock fname="tokens.ts" html={sample_tokens} />
		<p>
			The keys match the token types exported by <code>@twinkleplop/core/tokens</code>. See
			<a href="/docs/themes-ref">the theme reference</a> for the full list.
		</p>
	</Section>
</ArticleMain>
