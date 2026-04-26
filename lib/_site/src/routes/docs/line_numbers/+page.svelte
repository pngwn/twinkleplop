<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import MiniLab from "$lib/docs/components/MiniLab.svelte";
	import Card from "$lib/docs/components/Card.svelte";
	import CardGrid from "$lib/docs/components/CardGrid.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";

	const install_code = `<span class="ln">1</span><span class="tok-com"># the core package — everything, lazy-loaded</span>
<span class="ln">2</span><span class="tok-var">npm</span> <span class="tok-var">i</span> <span class="tok-str">'twinkleplop'</span>
<span class="ln">3</span>
<span class="ln">4</span><span class="tok-com"># or, just what you need (tree-shakeable)</span>
<span class="ln">5</span><span class="tok-var">npm</span> <span class="tok-var">i</span> <span class="tok-str">'@twinkleplop/core'</span> <span class="tok-str">'@twinkleplop/themes'</span>`;

	const first_highlight_code = `<span class="ln">1</span><span class="tok-kw">import</span> <span class="tok-punct">&#123;</span> <span class="tok-var">twinkle</span> <span class="tok-punct">&#125;</span> <span class="tok-kw">from</span> <span class="tok-str">'twinkleplop'</span><span class="tok-punct">;</span>
<span class="ln">2</span>
<span class="ln">3</span><span class="tok-kw">const</span> <span class="tok-var">html</span> <span class="tok-punct">=</span> <span class="tok-kw">await</span> <span class="tok-fn">twinkle</span><span class="tok-punct">(</span><span class="tok-str">\`const greet = (name: string) =&gt; \\\`hi, \$&#123;name&#125;\\\`;\`</span><span class="tok-punct">,</span> <span class="tok-punct">&#123;</span>
<span class="ln">4</span>  <span class="tok-var">lang</span><span class="tok-punct">:</span> <span class="tok-str">'typescript'</span><span class="tok-punct">,</span>
<span class="ln">5</span>  <span class="tok-var">theme</span><span class="tok-punct">:</span> <span class="tok-str">'github-dark'</span><span class="tok-punct">,</span>
<span class="ln">6</span><span class="tok-punct">&#125;</span><span class="tok-punct">)</span><span class="tok-punct">;</span>
<span class="ln">7</span>
<span class="ln">8</span><span class="tok-var">document</span><span class="tok-punct">.</span><span class="tok-var">body</span><span class="tok-punct">.</span><span class="tok-var">innerHTML</span> <span class="tok-punct">=</span> <span class="tok-var">html</span><span class="tok-punct">;</span>`;
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
	subtitle="Install twinkleplop, highlight your first snippet, and ship it to production before lunch."
	prev={{ dir: "← prev", label: "00. welcome", href: "/docs" }}
	next={{ dir: "next →", label: "02. themes", href: "/docs/themes" }}
>
	<Section id="s1" title="install" num="§ 01">
		<p>
			Pick your flavour. All three packages ship the same core; the wrappers differ only in what
			they import by default.
		</p>
		<CodeBlock fname="terminal" lang="sh" html={install_code} />
	</Section>

	<Section id="s2" title="first highlight" num="§ 02">
		<p>One call. One await. One HTML string. That is the whole library from the outside:</p>
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
