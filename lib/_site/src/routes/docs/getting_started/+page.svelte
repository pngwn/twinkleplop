<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import MiniLab from "$lib/docs/components/MiniLab.svelte";
	import Card from "$lib/docs/components/Card.svelte";
	import CardGrid from "$lib/docs/components/CardGrid.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { bash, ts } from "$lib/docs/highlighters";

	const install_src = `pnpm add "@twinkleplop/typescript" "@twinkleplop/theme"`;
	const install_code = bash(install_src);
	const first_highlght_src = `// import the language
import { language } from '@twinkleplop/typescript';

// create a reusable highlighter
const typescript = language();

// highlight some code
const html = typescript("1 + 2");

document.body.innerHTML = html;`
	const first_highlight_code = ts(first_highlght_src);
</script>

<ArticleMain
	pane_path="docs / getting-started"
	title="getting started"
	subtitle="Install and highlight your first snippet."
>
	<Section id="s1" title="install" num="§ 01">
		<p>
		Install a language and theme.
		</p>
		<CodeBlock fname="terminal" html={install_code} />
	</Section>

	<Section id="s2" title="first highlight" num="§ 02">
		<p>Import. Initialize. Highlight.</p>
		<CodeBlock fname="first-twinkle.ts" html={first_highlight_code} />
	</Section>



		<Callout mark="✦">
			<strong>What next?</strong> Pick a <a href="/docs/themes">theme</a>, skim the
			<a href="/docs/api">API reference</a>, or learn
			<a href="/docs/tokenization">how tokenization works</a> under the hood.
		</Callout>

</ArticleMain>

<ArticleOtp
	title="getting started"
	sections={[
		{ href: "#s1", label: "§01 — install", active: true },
		{ href: "#s2", label: "§02 — first highlight" },
		{ href: "#s3", label: "§03 — try it live" },
		{ href: "#s4", label: "§04 — framework adapters" },
	]}

/>
