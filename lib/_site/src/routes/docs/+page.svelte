<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import HomeHero from "$lib/docs/components/HomeHero.svelte";
	import QuickLinks from "$lib/docs/components/QuickLinks.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import Card from "$lib/docs/components/Card.svelte";
	import CardGrid from "$lib/docs/components/CardGrid.svelte";
	import AsciiArt from "$lib/docs/components/AsciiArt.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import MiniLab from "$lib/docs/components/MiniLab.svelte";
	import { language as ts_language } from "@twinkleplop/typescript";


	const ts = ts_language();


	const first_highlght_src = `import { language } from "@twinkleplop/typescript";
import "@twinkleplop/theme-github";

const typescript = language();
const html = typescript("1 + 2");`
	const first_highlight_code = ts(first_highlght_src);

	const pipeline_diagram_old = `┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   grammar   │  => │   compiled   │ ─▶ │   theme      │ ─▶  twinkle·html
└─────────────┘     │   grammar    │     │  tokenised   │
                    └──────────────┘     └──────────────┘
                         ▲                     ▲                     ▲
                         │                     │                     │
                      no regex              reusable              matches shiki
                                           tree-sitter           exactly*`;

const pipeline_diagram = `                 ┌────────────┐
                 │  GRAMMAR   │
                 └────────────┘
                    ║      ║
                    ║      ║
                 ┌────────────┐
                 │  COMPILED  │
                 │  GRAMMAR   │
                 └────────────┘
                    ║      ║
                    ║      ║
┌──────────┐     ┌────────────┐     ┌──────────────┐     ┌────────────┐
│  SOURCE  │ ==> │  LANGUAGE  │ ==> │  RAW TOKENS  │ ==> │  TWINKLED  │
└──────────┘     └────────────┘     └──────────────┘     └────────────┘
                     `

	const hello_code = `<span class="ln">1</span><span class="tok-kw">import</span> <span class="tok-punct">&#123;</span> <span class="tok-var">twinkle</span> <span class="tok-punct">&#125;</span> <span class="tok-kw">from</span> <span class="tok-str">'twinkleplop'</span><span class="tok-punct">;</span>
<span class="ln">2</span>
<span class="ln">3</span><span class="tok-kw">const</span> <span class="tok-var">html</span> <span class="tok-punct">=</span> <span class="tok-kw">await</span> <span class="tok-fn">twinkle</span><span class="tok-punct">(</span><span class="tok-str">'const x = 1;'</span><span class="tok-punct">,</span> <span class="tok-punct">&#123;</span> <span class="tok-var">lang</span><span class="tok-punct">:</span> <span class="tok-str">'ts'</span><span class="tok-punct">,</span> <span class="tok-var">theme</span><span class="tok-punct">:</span> <span class="tok-str">'github-dark'</span> <span class="tok-punct">&#125;</span><span class="tok-punct">)</span><span class="tok-punct">;</span>`;

	const quick_links = [
		{ num: "01 ›", title: "quick start", meta: "install and twinkle", href: "/docs/getting_started" },
		{ num: "02 ›", title: "themes", meta: "light and dark", href: "/docs/themes" },
		{ num: "03 ›", title: "customization", meta: "make it your own", href: "/docs/tokenization" },
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

	<!-- <Section id="pitch" title="the one-frame pitch" num="§ 03">
		<AsciiArt content={pipeline_diagram} />

	</Section> -->
	<Section id="try-it" title="try it live" num="§ 03">
		<p>
			Edit the source and watch it re-twinkle in real-time. This
			is a scaled-down embed of <a href="/explore">the lab</a> where you can every language and theme in the browser.
		</p>
		<MiniLab />
	</Section>
	<Section id="hello" title="hello, twinkle" num="§ 04">
		<p>Get started in a few lines. Drop this in a browser or Node:</p>
		<CodeBlock fname="first-twinkle.ts" lang="typescript" html={first_highlight_code} />

	</Section>
</ArticleMain>

<ArticleOtp
	title="welcome"
	sections={[
		{ href: "#quicklinks", label: "§01 — quick links", active: true },
		{ href: "#try-it", label: "§02 — try it live" },
		{ href: "#hello", label: "§04 — hello, twinkle" },
	]}

/>

<style>
	/*.footnote {
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-xs);
		margin-top: -12px;
	}*/
</style>
