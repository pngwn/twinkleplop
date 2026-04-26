<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import MiniLab from "$lib/docs/components/MiniLab.svelte";
	import Card from "$lib/docs/components/Card.svelte";
	import CardGrid from "$lib/docs/components/CardGrid.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import { language } from "@twinkleplop/bash";
	import { language as ts_language } from "@twinkleplop/typescript";

	const bash = language();
	const ts = ts_language();

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
	pane_path="docs / getting-started.md"
	last_edit="last edit: 5d ago · v0.4.2"
	breadcrumb={[
		{ label: "docs", href: "/docs" },
		{ label: "getting-started" },
	]}
	tagline="▸ 01 · start here · ~4 min"
	title="getting started"
	subtitle="Install and highlight your first snippet."
	prev={{ dir: "← prev", label: "00. welcome", href: "/docs" }}
	next={{ dir: "next →", label: "02. themes", href: "/docs/themes" }}
>
	<Section id="s1" title="install" num="§ 01">
		<p>
		Install a language and theme.
		</p>
		<CodeBlock fname="terminal" lang="sh" html={install_code} />
	</Section>

	<Section id="s2" title="first highlight" num="§ 02">
		<p>Import. Initialize. Highlight.</p>
		<CodeBlock fname="first-twinkle.ts" lang="typescript" html={first_highlight_code} />
	</Section>

	<Section id="s3" title="try it live" num="§ 03">
		<p>
			Edit the source on the left. The output on the right re-twinkles on every keystroke. This
			is a scaled-down embed of <a href="/explore">the lab</a>.
		</p>
		<MiniLab />
	</Section>

	<Section id="s4" title="framework adapters" num="§ 04">
		<p>
			Pre-built adapters for the usual suspects. All of them share the same rendering pipeline —
			nothing forked, nothing special.
		</p>
		<CardGrid cols={3}>
			<Card
				icon="⚛"
				title="react"
				description={`<code>&lt;Twinkle code=&#123;code&#125; lang="ts" /&gt;</code>`}
			/>
			<Card
				icon="△"
				title="svelte"
				description={`<code>&lt;Twinkle &#123;code&#125; lang="ts" /&gt;</code>`}
			/>
			<Card
				icon="♢"
				title="vue"
				description={`<code>&lt;Twinkle :code lang="ts" /&gt;</code>`}
			/>
		</CardGrid>
		<Callout mark="✦">
			<strong>What next?</strong> Pick a <a href="/docs/themes">theme</a>, skim the
			<a href="/docs/api">API reference</a>, or learn
			<a href="/docs/tokenization">how tokenization works</a> under the hood.
		</Callout>
	</Section>
</ArticleMain>

<ArticleOtp
	title="getting started"
	sections={[
		{ href: "#s1", label: "§01 — install", active: true },
		{ href: "#s2", label: "§02 — first highlight" },
		{ href: "#s3", label: "§03 — try it live" },
		{ href: "#s4", label: "§04 — framework adapters" },
	]}
	meta={[
		{ label: "version", value: "0.4.2" },
		{ label: "updated", value: "5d ago" },
		{ label: "authors", value: "pngwn" },
		{ label: "read", value: "~4 min" },
	]}
/>
