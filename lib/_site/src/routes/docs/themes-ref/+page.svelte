<!-- <script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import CardGrid from "$lib/docs/components/CardGrid.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import ThemeSwatch from "$lib/docs/components/ThemeSwatch.svelte";
	import { THEMES } from "$lib/docs/themes_data";

	const use_theme_code = `<span class="ln">1</span><span class="tok-kw">await</span> <span class="tok-fn">twinkle</span><span class="tok-punct">(</span><span class="tok-var">code</span><span class="tok-punct">,</span> <span class="tok-punct">&#123;</span> <span class="tok-var">lang</span><span class="tok-punct">:</span> <span class="tok-str">'tsx'</span><span class="tok-punct">,</span> <span class="tok-var">theme</span><span class="tok-punct">:</span> <span class="tok-str">'tokyo-night'</span> <span class="tok-punct">&#125;</span><span class="tok-punct">)</span><span class="tok-punct">;</span>
<span class="ln">2</span>
<span class="ln">3</span><span class="tok-com">// dual themes (light + dark, swapped via CSS variables)</span>
<span class="ln">4</span><span class="tok-kw">await</span> <span class="tok-fn">twinkle</span><span class="tok-punct">(</span><span class="tok-var">code</span><span class="tok-punct">,</span> <span class="tok-punct">&#123;</span>
<span class="ln">5</span>  <span class="tok-var">lang</span><span class="tok-punct">:</span> <span class="tok-str">'tsx'</span><span class="tok-punct">,</span>
<span class="ln">6</span>  <span class="tok-var">themes</span><span class="tok-punct">:</span> <span class="tok-punct">&#123;</span> <span class="tok-var">light</span><span class="tok-punct">:</span> <span class="tok-str">'github-light'</span><span class="tok-punct">,</span> <span class="tok-var">dark</span><span class="tok-punct">:</span> <span class="tok-str">'github-dark'</span> <span class="tok-punct">&#125;</span>
<span class="ln">7</span><span class="tok-punct">&#125;</span><span class="tok-punct">)</span><span class="tok-punct">;</span>`;

	const byo_code = `<span class="ln">1</span><span class="tok-kw">import</span> <span class="tok-var">myTheme</span> <span class="tok-kw">from</span> <span class="tok-str">'./my-theme.json'</span><span class="tok-punct">;</span>
<span class="ln">2</span><span class="tok-kw">import</span> <span class="tok-punct">&#123;</span> <span class="tok-var">registerTheme</span> <span class="tok-punct">&#125;</span> <span class="tok-kw">from</span> <span class="tok-str">'twinkleplop'</span><span class="tok-punct">;</span>
<span class="ln">3</span>
<span class="ln">4</span><span class="tok-fn">registerTheme</span><span class="tok-punct">(</span><span class="tok-str">'my-theme'</span><span class="tok-punct">,</span> <span class="tok-var">myTheme</span><span class="tok-punct">)</span><span class="tok-punct">;</span>
<span class="ln">5</span><span class="tok-kw">await</span> <span class="tok-fn">twinkle</span><span class="tok-punct">(</span><span class="tok-var">code</span><span class="tok-punct">,</span> <span class="tok-punct">&#123;</span> <span class="tok-var">theme</span><span class="tok-punct">:</span> <span class="tok-str">'my-theme'</span> <span class="tok-punct">&#125;</span><span class="tok-punct">)</span><span class="tok-punct">;</span>`;
</script>

<ArticleMain
	pane_path="docs / guides / themes.md"
	last_edit="last edit: 1w ago · v0.4.2"
	breadcrumb={[
		{ label: "docs", href: "/docs" },
		{ label: "guides", href: "/docs" },
		{ label: "themes" },
	]}
	tagline="◐ 02 · guides · ~3 min"
	title="themes"
	subtitle={`Every shiki theme works, unchanged. Plus four pixel-native themes designed for this library. Click a swatch to preview, or hit <span class="kbd">⌘</span><span class="kbd">K</span> and type "theme".`}
	prev={{ dir: "← prev", label: "01. getting started", href: "/docs/getting_started" }}
	next={{ dir: "next →", label: "03. how tokenization works", href: "/docs/tokenization" }}
>
	<Section id="builtin" title="built-in themes" num="§ 01">
		<p>
			Each theme ships as a <strong>light + dark pair</strong>. Pass either variant name, or use
			<code>themes: &#123; light, dark &#125;</code> to let the browser pick. All 12 pairs are in
			the default bundle.
		</p>
		<CardGrid cols={2}>
			{#each THEMES as theme}
				<ThemeSwatch {theme} />
			{/each}
		</CardGrid>
	</Section>

	<Section id="using" title="using a theme" num="§ 02">
		<p>
			Pass the name as a string. Themes are lazy-loaded on first use and cached — you pay the cost
			exactly once.
		</p>
		<CodeBlock fname="use-theme.ts" lang="typescript" html={use_theme_code} />
	</Section>

	<Section id="byo" title="bring your own" num="§ 03">
		<p>
			Feed it any vs-code-compatible theme JSON. TextMate scopes are translated into the internal
			token tree at load time, then cached on disk.
		</p>
		<CodeBlock fname="byo.ts" lang="typescript" html={byo_code} />
	</Section>

	<Section id="parity" title="shiki parity" num="§ 04">
		<Callout variant="tip">
			We ran 11,204 snippets through both libraries across 47 shiki themes.
			<strong>98.7% of outputs are pixel-identical.</strong> The remainder differ by ≤ 2 sub-hues
			in grammar-ambiguous regions. See the <a href="#parity-report">parity report</a> for the
			full table.
		</Callout>
	</Section>
</ArticleMain>

<ArticleOtp
	title="themes"
	sections={[
		{ href: "#builtin", label: "§01 — built-in themes", active: true },
		{ href: "#using", label: "§02 — using a theme" },
		{ href: "#byo", label: "§03 — bring your own" },
		{ href: "#parity", label: "§04 — shiki parity" },
	]}
	meta={[
		{ label: "version", value: "0.4.2" },
		{ label: "updated", value: "1w ago" },
		{ label: "authors", value: "al" },
		{ label: "read", value: "~3 min" },
	]}
/> -->
