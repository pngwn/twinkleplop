<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import { bash, ts } from "$lib/docs/highlighters";

	const install_code_src = `pnpm add @twinkleplop/theme-github`;
	const install_code = bash(install_code_src);

	const use_theme_code_src = `import "@twinkleplop/theme-github";`;
	const use_theme_code = ts(use_theme_code_src);

	const copy_css_code_src = `twp theme github out "./src/my_css.css"`;
	const copy_css_code = bash(copy_css_code_src);

	const interactive_code_src = `twp`;
	const interactive_code = bash(interactive_code_src);

	const use_theme_tokens_src = `import { light, dark } from "@twinkleplop/theme-github/tokens";`
	const use_theme_tokens = ts(use_theme_tokens_src);

	const sample_tokens_src = `const light = {
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
  ...
}`
	const sample_tokens = ts(sample_tokens_src);

</script>

<ArticleMain
	pane_path="docs / themes"
	title="themes"
	subtitle={`Twinkleplop has many themes to choose from. Every theme ships with a light and dark variant.`}

>

    <p>Syntax Highlighting themes have historically be pretty difficult to work with. Twinkleplop doesn't have a concrete solution to this problem but it does provide several different ways to work with themes.</p>


	<Section id="install" title="install a theme" num="§ 01">
		<p>
		Regardless of how you want to work with themes, the first step is to install one.
		</p>

		<p>Choose your favourite from <a href="/docs/themes-ref/">the theme reference</a>, and install it using your package manager.</p>
		<CodeBlock fname="terminal" html={install_code} />
	</Section>

	<Section id="css_import" title="direct import" num="§ 02">
		<p>
			If you are using a bundler that can handle CSS imports, like Vite or Webpack, you can import the package directly into your app.
		</p>
		<p>The main export is a stylesheet with both dark and light styles. As long as there is a <code>.dark</code> class on a parent above the code snippet, you will get dark and light mode for free.</p>
		<CodeBlock fname="theme.ts" html={use_theme_code} />
	</Section>

	<Section id="copy_css" title="copy the css" num="§ 03">
		<p>
		If you are not using a bundler or wish to modify the CSS in some way, it might be easier to just copy (vendor) the CSS directly into your project.
		</p>
		<p>Twinkleplop provides a CLI to do this. <code>twp</code> will not download files over the internet, both for your security and my sanity, it will simple copy from an already installed pacakge.</p>

		<CodeBlock fname="terminal" html={copy_css_code} />

		<p>Or just run <code>twp</code> without any arguments and answer the interactive prompts. It will ask you what theme to copy and where to copy it to.</p>
		<CodeBlock fname="terminal" html={interactive_code} />
	</Section>

	<Section id="tokens" title="token colors" num="§ 04">
		<p>In some instances you may want to build the css yourself, or work directly with the tokens and colors.</p>
		<p>To support this usecase and provide maxium flexibility, every theme exports the tokens directly from a <code>/tokens</code> subpath.</p>
		<p>This special export has two named exports, <code>light</code> and <code>dark</code>, which are object maps of token names to color values.</p>
		<CodeBlock fname="tokens.ts" html={use_theme_tokens} />
		<p>They look a bit like this:</p>
		<CodeBlock fname="tokens.ts" html={sample_tokens} />
		<p>All token names in these two structures correspond to the token names that the highlighter spits out. Every theme should have a definition for every token, even if they resolve to the same color.</p>
		<p>For a full list of token names, see the <a href="/docs/themes-ref/">themes reference</a>.</p>
	</Section>


</ArticleMain>

<ArticleOtp
	title="themes"
	sections={[
		{ href: "#builtin", label: "§01 — built-in themes", active: true },
		{ href: "#using", label: "§02 — using import" },
		{ href: "#parity", label: "§03 — shiki parity" },
	]}

/>
