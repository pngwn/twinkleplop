<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import Card from "$lib/docs/components/Card.svelte";
	import CardGrid from "$lib/docs/components/CardGrid.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";

	const my_transformer_code = `<span class="ln">1</span><span class="tok-kw">import</span> <span class="tok-kw">type</span> <span class="tok-punct">&#123;</span> <span class="tok-var">Transformer</span> <span class="tok-punct">&#125;</span> <span class="tok-kw">from</span> <span class="tok-str">'twinkleplop'</span><span class="tok-punct">;</span>
<span class="ln">2</span>
<span class="ln">3</span><span class="tok-kw">export const</span> <span class="tok-var">wrapEachLine</span><span class="tok-punct">:</span> <span class="tok-var">Transformer</span> <span class="tok-punct">=</span> <span class="tok-punct">(</span><span class="tok-var">root</span><span class="tok-punct">)</span> <span class="tok-punct">=&gt;</span> <span class="tok-punct">&#123;</span>
<span class="ln">4</span>  <span class="tok-kw">for</span> <span class="tok-punct">(</span><span class="tok-kw">const</span> <span class="tok-var">line</span> <span class="tok-kw">of</span> <span class="tok-var">root</span><span class="tok-punct">.</span><span class="tok-var">lines</span><span class="tok-punct">)</span> <span class="tok-punct">&#123;</span>
<span class="ln">5</span>    <span class="tok-var">line</span><span class="tok-punct">.</span><span class="tok-fn">addClass</span><span class="tok-punct">(</span><span class="tok-str">'my-line'</span><span class="tok-punct">)</span><span class="tok-punct">;</span>
<span class="ln">6</span>  <span class="tok-punct">&#125;</span>
<span class="ln">7</span>  <span class="tok-kw">return</span> <span class="tok-var">root</span><span class="tok-punct">;</span>
<span class="ln">8</span><span class="tok-punct">&#125;</span><span class="tok-punct">;</span>`;
</script>

<ArticleMain
	pane_path="docs / guides / transformers.md"
	last_edit="last edit: 6d ago · v0.4.2"
	breadcrumb={[
		{ label: "docs", href: "/docs" },
		{ label: "guides", href: "/docs" },
		{ label: "transformers" },
	]}
	tagline="⇢ 05 · guides · ~4 min"
	title="transformers"
	subtitle="Transformers mutate the HAST after tokenization but before render. Small, composable, and cacheable."
	prev={{ dir: "← prev", label: "04. api reference", href: "/docs/api" }}
	next={{ dir: "next →", label: "06. migration", href: "/docs/migration" }}
>
	<Section id="built-in" title="built-in transformers" num="§ 01">
		<CardGrid cols={2}>
			<Card
				icon="№"
				title="lineNumbers()"
				description="Prepend each line with a right-aligned line number. Configurable start index."
			/>
			<Card
				icon="◆"
				title="highlightLines([1,3])"
				description={`Add a <code>data-highlighted</code> attr and background band on the given lines.`}
			/>
			<Card
				icon="±"
				title="diff()"
				description={`Detect <code>+</code>/<code>-</code> prefixes and apply the diff gutter + colors.`}
			/>
			<Card
				icon="⎘"
				title="copyButton()"
				description="Attach a copy-to-clipboard button. Positions absolutely in the code block."
			/>
		</CardGrid>
	</Section>

	<Section id="custom" title="writing your own" num="§ 02">
		<p>
			A transformer is a plain function that receives a HAST root and returns a HAST root. Sync or
			async. Idempotent is strongly recommended.
		</p>
		<CodeBlock fname="my-transformer.ts" html={my_transformer_code} />
		<Callout variant="tip">
			Transformer results are cached by <strong>(transformer identity + input hash)</strong>. Keep
			them pure and you get free caching across calls.
		</Callout>
	</Section>
</ArticleMain>

<ArticleOtp
	title="transformers"
	sections={[
		{ href: "#built-in", label: "§01 — built-in", active: true },
		{ href: "#custom", label: "§02 — writing your own" },
	]}
	meta={[
		{ label: "version", value: "0.4.2" },
		{ label: "updated", value: "6d ago" },
		{ label: "authors", value: "al" },
		{ label: "read", value: "~4 min" },
	]}
/>
