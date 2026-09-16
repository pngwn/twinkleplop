<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
	import ArticleOtp from "$lib/docs/components/ArticleOtp.svelte";
	import Section from "$lib/docs/components/Section.svelte";
	import Callout from "$lib/docs/components/Callout.svelte";
	import PillToggle from "$lib/docs/components/PillToggle.svelte";
	import BenchChart from "$lib/docs/components/BenchChart.svelte";
	import type { Mode, Size } from "./+page.server";

	let { data } = $props();

	const bench = $derived(data.benchmarks);

	// the visitor's picks are kept apart from what the run actually measured.
	// a language or size that drops out of a future run degrades to the
	// nearest available chart instead of an empty page, and no effect has to
	// write back to the state that drives it.
	let selected_lang = $state<string | null>(null);
	let mode = $state<Mode>("tokenize");
	let selected_size = $state<Size>("medium");

	const lang = $derived.by(() => {
		const available = bench?.languages ?? [];
		if (selected_lang && available.includes(selected_lang)) return selected_lang;
		// every library here supports typescript, so the first chart a visitor
		// sees is a full field rather than a lone bar.
		return available.includes("typescript") ? "typescript" : (available[0] ?? "");
	});

	const available_sizes = $derived(
		new Set(
			(bench?.charts ?? [])
				.filter((c) => c.lang === lang && c.mode === mode)
				.map((c) => c.size)
		)
	);

	const size = $derived.by(() => {
		if (available_sizes.has(selected_size)) return selected_size;
		return (bench?.sizes ?? []).find((s) => available_sizes.has(s.id))?.id ?? selected_size;
	});

	const chart = $derived(
		(bench?.charts ?? []).find((c) => c.lang === lang && c.mode === mode && c.size === size) ??
			null
	);

	const size_options = $derived(
		(bench?.sizes ?? []).map((s) => ({
			id: s.id,
			label: s.label,
			title: s.title,
			disabled: !available_sizes.has(s.id)
		}))
	);
	const mode_options = $derived((bench?.modes ?? []).map((m) => ({ id: m.id, label: m.label })));

	const mode_option = $derived((bench?.modes ?? []).find((m) => m.id === mode));
	const size_option = $derived((bench?.sizes ?? []).find((s) => s.id === size));

	function format_bytes(bytes: number): string {
		if (bytes >= 1000) return `${(bytes / 1000).toFixed(bytes >= 10_000 ? 0 : 1)}KB`;
		return `${bytes}B`;
	}

	// iso date only. a locale aware string would differ between the prerender
	// and the visitor's browser.
	function run_date(iso: string): string {
		return iso ? iso.slice(0, 10) : "";
	}
</script>

<ArticleMain
	pane_path="docs / technical / benchmarks"
	title="benchmarks"
	subtitle="How fast twinkleplop turns source into tokens, and into HTML, next to the other JavaScript highlighters."
>
	{#if data.missing || !bench}
		<Callout variant="warn" mark="!">
			<strong>No benchmark data in this build.</strong> This page renders
			<code>lib/bench/published/comparison.json</code> when it is committed, and otherwise
			<code>lib/bench/results/comparison.json</code>. To generate one locally, run
			<code>node lib/bench/compare/bin/compare.mjs</code> from the repo root, then rebuild the site.
		</Callout>
	{:else}
		<Section id="compare" title="compare" num="§ 01">
			<p>
				Every bar in a chart was measured in the same process, alternating between libraries, so the
				machine drifting mid run moves all of them together instead of flattering whichever one
				happened to go first. Pick a language, then what to measure and how much of it.
			</p>

			<div class="controls">
				<label class="control">
					<span class="lbl">language</span>
					<span class="select">
						<select
							value={lang}
							aria-label="language"
							onchange={(e) => (selected_lang = (e.currentTarget as HTMLSelectElement).value)}
						>
							{#each bench.languages as l (l)}
								<option value={l}>{l}</option>
							{/each}
						</select>
					</span>
				</label>
				<PillToggle label="measure" options={mode_options} value={mode} onchange={(m) => (mode = m)} />
				<PillToggle
					label="input"
					options={size_options}
					value={size}
					onchange={(s) => (selected_size = s)}
				/>
			</div>

			{#if chart}
				<BenchChart
					{chart}
					title="{chart.lang} · {size_option?.title ?? size}"
					subtitle="{format_bytes(chart.bytes)} · {chart.lines} lines"
				/>
			{:else}
				<Callout variant="warn" mark="!">
					<strong>Nothing measured here.</strong> This run has no {lang} chart for that combination.
				</Callout>
			{/if}

			<p class="explain">
				{#if mode_option}<strong>{mode_option.label}.</strong> {mode_option.description}{/if}
				{#if size_option}<strong>{size_option.title}.</strong> {size_option.description}{/if}
			</p>

			<div class="provenance">
				<span>{data.source === "published" ? "published run" : "latest ci run"}</span>
				<span>{run_date(bench.meta.generated_at)}</span>
				<span>{bench.meta.runner}</span>
				<span>node {bench.meta.node}</span>
				{#if bench.meta.commit}
					<span
						><a href="https://github.com/pngwn/twinkleplop/commit/{bench.meta.commit}"
							>{bench.meta.commit.slice(0, 8)}</a
						></span
					>
				{/if}
				{#if data.behind}
					<span class="behind"
						>{data.behind} commit{data.behind === 1 ? "" : "s"} behind this build</span
					>
				{/if}
			</div>

			{#if bench.meta.anchor && !bench.meta.anchor.stable}
				<Callout variant="warn" mark="!">
					<strong
						>The machine drifted {(bench.meta.anchor.drift * 100).toFixed(1)}% during this run.</strong
					>
					The ratios still hold; the absolute ops/s figures should be treated as approximate.
				</Callout>
			{/if}
		</Section>

		<Section id="inputs" title="the inputs" num="§ 02">
			<p>
				Three of the four inputs are ours: every language at roughly 1KB, 10KB and 100KB. The fourth
				is not, and that is the point. A highlighter benchmark published by the people who wrote the
				highlighter is worth exactly as much as its inputs, so Shiki's own sample files sit beside
				ours as a fourth size rather than on a separate page.
			</p>
			<table>
				<thead>
					<tr><th>input</th><th>what it is</th></tr>
				</thead>
				<tbody>
					{#each bench.sizes as s (s.id)}
						<tr>
							<td><code>{s.label}</code> {s.title}</td>
							<td>{s.description}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if bench.meta.upstream}
				<p>
					The Shiki samples are vendored from
					<a href={bench.meta.upstream.repo}
						>{bench.meta.upstream.repo.replace("https://github.com/", "")}</a
					>
					at <code>{bench.meta.upstream.commit.slice(0, 8)}</code>. Not every language has one, and
					the toggle says so.
				</p>
			{/if}
		</Section>

		<Section id="reading" title="how to read this" num="§ 03">
			<p>
				<strong>Token counts are the caveat on every bar.</strong> A library that emits half as many
				tokens for the same file is doing less work per byte, not the same work faster. The counts are
				printed under the chart so you can see which is which rather than taking the bar on trust.
			</p>
			<p>
				<strong>The HTML numbers are not measuring identical output.</strong> twinkleplop and Prism
				emit classes and leave colour to a stylesheet; Shiki resolves a theme and writes inline styles.
				That is strictly more string work, and it is a real difference in what you get, not a handicap
				we imposed.
			</p>
			<p>
				<strong>These numbers do not travel.</strong> They describe one machine on one day. Comparing a
				bar here against a number from somewhere else, another run, another runner, another node
				version, is not a comparison. Within a single chart, the interleaving makes them fair.
				{#if data.source === "published"}
					The machine is named above and the commands that produced this file are in
					<code>lib/bench/published/README.md</code>; the same commands on the same hardware
					reproduce it.
				{/if}
			</p>
		</Section>

		<Section id="libraries" title="the libraries" num="§ 04">
			<table>
				<thead>
					<tr><th>library</th><th>version</th><th>note</th></tr>
				</thead>
				<tbody>
					{#each bench.meta.libraries as l (l.id)}
						<tr>
							<td class="lib" class:ours={l.id === "twinkleplop"}>{l.label}</td>
							<td><code>{l.version}</code></td>
							<td>{l.note}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</Section>
	{/if}
</ArticleMain>

<ArticleOtp
	title="benchmarks"
	sections={[
		{ href: "#compare", label: "§01 — compare", active: true },
		{ href: "#inputs", label: "§02 — the inputs" },
		{ href: "#reading", label: "§03 — how to read this" },
		{ href: "#libraries", label: "§04 — the libraries" },
	]}
/>

<style>
	.controls {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px 14px;
		margin: 14px 0 12px;
		border: 1px dashed var(--docs-line);
		border-radius: 3px;
		background: color-mix(in oklch, var(--docs-bg-1) 60%, transparent);
	}
	.control {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.control .lbl {
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-xs);
		text-transform: uppercase;
		letter-spacing: 0.6px;
		width: 72px;
		flex-shrink: 0;
	}
	.select {
		position: relative;
		display: inline-flex;
	}
	.select::after {
		content: "▾";
		position: absolute;
		right: 8px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--docs-fg-mute);
		pointer-events: none;
		font-size: var(--docs-fs-sm);
	}
	select {
		appearance: none;
		-webkit-appearance: none;
		background: var(--docs-bg-2);
		border: 1px solid var(--docs-line);
		border-radius: 2px;
		color: var(--docs-accent);
		font-family: var(--docs-mono);
		font-size: var(--docs-fs-sm);
		padding: 3px 26px 3px 9px;
		min-width: 160px;
		cursor: pointer;
		letter-spacing: 0.3px;
	}
	select:hover {
		border-color: var(--docs-accent-dim);
	}
	select:focus-visible {
		outline: 1px solid var(--docs-accent);
		outline-offset: 1px;
	}
	select option {
		background: var(--docs-bg-1);
		color: var(--docs-fg);
	}

	.explain {
		margin-top: 14px;
		font-size: var(--docs-fs-sm);
	}

	.provenance {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 0;
		margin: 6px 0 18px;
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg-mute);
		letter-spacing: 0.4px;
	}
	.provenance span + span::before {
		content: "·";
		padding: 0 8px;
		color: var(--docs-fg-ghost);
	}
	.provenance .behind {
		color: var(--t-yellow);
	}

	.lib {
		white-space: nowrap;
		color: var(--docs-fg);
	}
	.lib.ours {
		color: var(--docs-accent);
	}

	@media (max-width: 760px) {
		.control {
			flex-direction: column;
			align-items: flex-start;
			gap: 5px;
		}
		select {
			width: 100%;
		}
	}
</style>
