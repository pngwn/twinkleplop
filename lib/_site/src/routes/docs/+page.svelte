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
		{ num: "04 ›", title: "api reference", meta: "every knob, every default", href: "/docs/api" },
	];

	const reading_cards = [
		{
			icon: "▸",
			title: "getting started",
			description: "Install, import, and get your first twinkle on the screen in under a minute. No build step required.",
			more_href: "/docs/getting_started",
			more_label: "read →",
		},
		{
			icon: "◐",
			title: "themes",
			description: "Every shiki theme works unchanged, plus four new pixel-native themes tuned for CRT-class vibes.",
			more_href: "/docs/themes",
			more_label: "browse →",
		},
		{
			icon: "λ",
			title: "how tokenization works",
			description: "Walk through the pipeline: source → lexer → tree → themed tokens → HTML. With pictures.",
			more_href: "/docs/tokenization",
			more_label: "read →",
		},
		{
			icon: "⇢",
			title: "transformers",
			description: "Mutate the HAST before render. Line numbers, diff gutters, highlighted ranges, copy buttons.",
			more_href: "/docs/transformers",
			more_label: "read →",
		},
	];
</script>

<ArticleMain
	pane_path="docs / welcome.md"
	last_edit="last edit: 2m ago · v0.4.2"
	next={{ dir: "next →", label: "01. getting started", href: "/docs/getting_started" }}
>
	<HomeHero
		tagline="◎ docs · v0.4.2 · reading time ~ 3m"
		title="twinkleplop"
		lead="A syntax hilighter and code authoring toolkit. Small, fast, customisable. plop it in and make your code twinkle."

	/>

	<!-- <Section id="quicklinks" title="quick links" num="§ 01"> -->
		<QuickLinks items={quick_links} />
	<!-- </Section> -->

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

	<Section id="pitch" title="the one-frame pitch" num="§ 03">
		<AsciiArt content={pipeline_diagram} />

	</Section>

	<Section id="hello" title="hello, twinkle" num="§ 04">
		<p>The three-line version. Drop this in a browser or Node, run it, ship it:</p>
		<CodeBlock fname="hello.ts" lang="typescript" html={hello_code} />
		<Callout variant="tip">
			<strong>Want to play before you read?</strong> Head to the <a href="/explore">lab</a> and drop
			some code in. Every example on every docs page has a live link into the lab with your snippet
			pre-loaded.
		</Callout>
	</Section>
</ArticleMain>

<ArticleOtp
	title="welcome"
	sections={[
		{ href: "#quicklinks", label: "§01 — quick links", active: true },
		{ href: "#reading", label: "§02 — start reading" },
		{ href: "#pitch", label: "§03 — the one-frame pitch" },
		{ href: "#hello", label: "§04 — hello, twinkle" },
	]}
	meta={[
		{ label: "version", value: "0.4.2" },
		{ label: "updated", value: "2m ago" },
		{ label: "authors", value: "pngwn, al" },
		{ label: "size", value: "14.2 kB gz" },
	]}
/>

<style>
	.footnote {
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-xs);
		margin-top: -12px;
	}
</style>
