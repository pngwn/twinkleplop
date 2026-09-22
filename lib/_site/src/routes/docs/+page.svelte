<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import HomeHero from "$lib/docs/components/HomeHero.svelte";
	import QuickLinks from "$lib/docs/components/QuickLinks.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import Card from "$lib/docs/components/Card.svelte";
	import CardGrid from "$lib/docs/components/CardGrid.svelte";
	import AsciiArt from "$lib/docs/components/AsciiArt.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import MiniLab from "$lib/docs/components/MiniLab.svelte";
	import { twoslash } from "$lib/docs/snippets";

	const first_highlight_code = twoslash`import { language } from "@twinkleplop/typescript";
import "@twinkleplop/theme-github";

const typescript = language();
const html = typescript("1 + 2");`

	const quick_links = [
		{ num: "01 ›", title: "quick start", meta: "install and twinkle", href: "/docs/getting_started" },
		{ num: "02 ›", title: "themes", meta: "light and dark", href: "/docs/themes" },
		{ num: "03 ›", title: "render options", meta: "customise the output", href: "/docs/render_options" },
		{ num: "04 ›", title: "faq", meta: "no-one actually asked", href: "/docs/faq" },
	];
</script>

<ArticleMain
	pane_path="docs / welcome.md"
	title="twinkleplop"
	subtitle="A syntax highlighter and code authoring toolkit. Small, fast, customisable. plop it in and twinkle."
>
	<!-- <HomeHero
		title="twinkleplop"
		lead="A syntax highlighter and code authoring toolkit. Small, fast, customisable. plop it in and twinkle."
	/> -->

	<blockquote>
		<p>In the beginning there was only darkness.</p>
		<p>Then some idiot lit a cigarette and set off the twinklers.</p>
	</blockquote>
	<p>Twinkleplop is a syntax highlighter of unspeakable power.</p>

	<Section id="quicklinks" title="quick links" num="§ 01">
		<QuickLinks items={quick_links} />
	</Section>

	<!-- <Section id="reading" title="start reading" num="§ 02">
		<CardGrid cols={2}>
			{#each reading_cards as c}
				<Card
					icon={c.icon}
					title={c.title}
					description={c.description}
					more_href={c.more_href}
					more_label={c.more_label}
				/>
			{/each}
		</CardGrid>
	</Section> -->

	<!-- <Section id="pitch" title="highlighting pipeline" num="§ 03">
		<AsciiArt content={pipeline_diagram} />

	</Section> -->
	<Section id="try-it" title="try it live" num="§ 02">
		<p>Tread lightly.</p>
		<MiniLab />
	</Section>
	<Section id="hello" title="basic usage" num="§ 03">
		<p>With a few lines of code you can bestow its power upon your code blocks.</p>
		<CodeBlock fname="first-twinkle.ts" html={first_highlight_code} />
	</Section>
</ArticleMain>


<style>
	/*.footnote {
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-xs);
		margin-top: -12px;
	}*/
</style>
