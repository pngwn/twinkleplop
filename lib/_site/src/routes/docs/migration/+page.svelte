<!-- <script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import CodeBlock from "$lib/docs/components/CodeBlock.svelte";
	import ParamTable from "$lib/docs/components/ParamTable.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";

	const before_code = `<span class="ln">1</span><span style="color:var(--t-red)">- import &#123; codeToHtml &#125; from 'shiki';</span>
<span class="ln">2</span><span style="color:var(--t-green)">+ import &#123; twinkle as codeToHtml &#125; from 'twinkleplop';</span>
<span class="ln">3</span>
<span class="ln">4</span>  <span class="tok-kw">const</span> <span class="tok-var">html</span> <span class="tok-punct">=</span> <span class="tok-kw">await</span> <span class="tok-fn">codeToHtml</span><span class="tok-punct">(</span><span class="tok-var">code</span><span class="tok-punct">,</span> <span class="tok-punct">&#123;</span> <span class="tok-var">lang</span><span class="tok-punct">:</span> <span class="tok-str">'ts'</span><span class="tok-punct">,</span> <span class="tok-var">theme</span><span class="tok-punct">:</span> <span class="tok-str">'github-dark'</span> <span class="tok-punct">&#125;</span><span class="tok-punct">)</span><span class="tok-punct">;</span>`;

	const diff_rows = [
		[
			{ kind: "name" as const, value: "getHighlighter()" },
			{ kind: "name" as const, value: "createInstance()" },
			{ kind: "desc" as const, value: `Same shape. Returns sync <code>twinkle()</code>.` },
		],
		[
			{ kind: "name" as const, value: "loadTheme()" },
			{ kind: "name" as const, value: "registerTheme()" },
			{ kind: "desc" as const, value: "Identical." },
		],
		[
			{ kind: "name" as const, value: "codeToHast()" },
			{ kind: "name" as const, value: "twinkle.toHast()" },
			{ kind: "desc" as const, value: "Same HAST, new namespace." },
		],
		[
			{ kind: "name" as const, value: "transformers" },
			{ kind: "name" as const, value: "transformers" },
			{ kind: "desc" as const, value: "Drop-in. Every shiki transformer works unchanged." },
		],
		[
			{ kind: "name" as const, value: "wasm loader" },
			{ kind: "desc" as const, value: "—" },
			{ kind: "desc" as const, value: "No WASM. If you pin shiki's WASM path, remove it." },
		],
	];
</script>

<ArticleMain
	pane_path="docs / guides / migration.md"
	last_edit="last edit: 4d ago · v0.4.2"
	breadcrumb={[
		{ label: "docs", href: "/docs" },
		{ label: "guides", href: "/docs" },
		{ label: "migrating from shiki" },
	]}
	tagline="↔ 06 · guides · ~2 min"
	title="migrating from shiki"
	subtitle="In most codebases, migration is one find-and-replace. Here's the full list of behavioural differences, ordered by likelihood to bite."
	prev={{ dir: "← prev", label: "05. transformers", href: "/docs/transformers" }}
>
	<Section id="swap" title="the basic swap" num="§ 01">
		<CodeBlock fname="before.ts" lang="diff" html={before_code} />
		<p>That's enough for 90% of usage. Keep reading if you use advanced shiki features.</p>
	</Section>

	<Section id="diffs" title="behavioural diffs" num="§ 02">
		<ParamTable headers={["shiki", "twinkleplop", "notes"]} rows={diff_rows} />
		<Callout variant="warn" mark="!">
			<strong>One gotcha.</strong> shiki emits an <code>inline-code</code> class by default;
			twinkleplop emits <code>twinkle</code>. Override with
			<code>&#123; cssPrefix: 'inline-code' &#125;</code> if you need exact parity.
		</Callout>
	</Section>
</ArticleMain>

<ArticleOtp
	title="migration"
	sections={[
		{ href: "#swap", label: "§01 — the basic swap", active: true },
		{ href: "#diffs", label: "§02 — behavioural diffs" },
	]}
	meta={[
		{ label: "version", value: "0.4.2" },
		{ label: "updated", value: "4d ago" },
		{ label: "authors", value: "pngwn" },
		{ label: "read", value: "~2 min" },
	]}
/> -->
