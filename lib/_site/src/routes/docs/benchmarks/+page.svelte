<script lang="ts">
	import ArticleMain from "$lib/docs/components/ArticleMain.svelte";
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

	function throughput_change(ratio: number | null): string {
		if (ratio === null) return "";
		const pct = (ratio - 1) * 100;
		return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
	}

	// moves this small repeat run to run on the same box
	function tone(ratio: number | null): string {
		if (ratio === null || Math.abs(ratio - 1) < 0.02) return "flat";
		return ratio > 1 ? "up" : "down";
	}

	const history = $derived(data.history ?? []);
	const latest_step = $derived(history.find((s) => s.previous !== null) ?? null);
</script>

<ArticleMain
	pane_path="docs / technical / benchmarks"
	title="benchmarks"
	subtitle="How fast twinkleplop highlights compared to other JavaScript highlighters."
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
				Each chart compares libraries measured in the same process. The benchmark alternates between
				libraries to reduce the effect of changes in machine performance during the run.
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
				<PillToggle
					label="measure"
					options={mode_options}
					value={mode}
					onchange={(m) => (mode = m)}
				/>
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
					<strong>No results available.</strong> This run has no {lang} chart for that combination.
				</Callout>
			{/if}
			<div class="provenance">
				<span
					><span class="hw">AMD EPYC</span> · <span class="hw">8C16T</span> ·
					<span class="hw">64GM RAM</span></span
				>
				<span>node {bench.meta.node}</span>
				{#if bench.meta.commit}
					<span
						><a href="https://github.com/pngwn/twinkleplop/commit/{bench.meta.commit}"
							>{bench.meta.commit.slice(0, 8)}</a
						></span
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

		<Section id="versions" title="version history" num="§ 02">
			<p>
				How twinkleplop's own speed changed between published runs. Each row compares a run with
				the previous run on the same CPU and inputs, as a change in throughput across every chart
				above.
			</p>
			<p>
				The other libraries are the same versions in both runs, so the <em>reference</em> column
				shows how far the machine moved between runs. Treat a twinkleplop change that is close to
				it as noise.
			</p>
			{#if history.length === 0}
				<Callout variant="warn" mark="!">
					<strong>No version history in this build.</strong> Record a published run with
					<code>node lib/bench/compare/bin/history.mjs</code>.
				</Callout>
			{:else}
				<table class="versions">
					<thead>
						<tr>
							<th>version</th>
							<th>measured</th>
							<th>tokenise</th>
							<th>tokenise + render</th>
							<th>reference</th>
						</tr>
					</thead>
					<tbody>
						{#each history as step (step.commit)}
							<tr>
								<td
									><code>{step.version ?? "?"}</code>
									<a href="https://github.com/pngwn/twinkleplop/commit/{step.commit}"
										>{step.commit.slice(0, 8)}</a
									></td
								>
								<td>{step.date}</td>
								{#if step.previous}
									<td class="delta {tone(step.tokenize)}">{throughput_change(step.tokenize)}</td>
									<td class="delta {tone(step.html)}">{throughput_change(step.html)}</td>
									<td class="delta ref">{throughput_change(step.reference)}</td>
								{:else}
									<td colspan="3" class="first">first recorded run</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>

				{#if latest_step && latest_step.previous}
					<details class="by-lang">
						<summary>
							by language, <code>{latest_step.commit.slice(0, 8)}</code> against
							<code>{latest_step.previous.commit.slice(0, 8)}</code>
						</summary>
						<table class="versions">
							<thead>
								<tr><th>language</th><th>tokenise</th><th>tokenise + render</th></tr>
							</thead>
							<tbody>
								{#each latest_step.languages as l (l.lang)}
									<tr>
										<td>{l.lang}</td>
										<td class="delta {tone(l.tokenize)}">{throughput_change(l.tokenize)}</td>
										<td class="delta {tone(l.html)}">{throughput_change(l.html)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</details>
				{/if}
			{/if}
		</Section>

		<Section id="inputs" title="input files" num="§ 03">
			<p>
				Each language has Twinkleplop samples of roughly 1KB, 10KB and 100KB, plus sample files from
				Shiki's benchmarks.
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
					at <code>{bench.meta.upstream.commit.slice(0, 8)}</code>.
				</p>
			{/if}
		</Section>

		<Section id="reading" title="interpreting results" num="§ 04">
			<p>
				These numbers are intended as a rough ballpark. I've done my best to make them accurate but
				benchmarks are tricky.
			</p>
			<p>
				<strong>Token counts are not consistent across libraries.</strong> Different libraries emit different
				numbers of tokens. Typically more tokens require more work but more tokens doesn't necessarily
				mean better output.
			</p>
			<p>
				<strong>The HTML numbers are not measuring identical output.</strong> twinkleplop and Prism emit
				classes, Shiki resolves a theme and writes inline styles (in this configuration).
			</p>
			<p>
				<strong>Compare results within the same chart.</strong> Results from different runs, machines
				or Node versions may differ.
			</p>
			<p>
				{#if data.source === "published"}
					The machine is named above and the commands that produced this file are in
					<code>lib/bench/published/README.md</code>; you can use them to repeat the measurements.
				{/if}
			</p>
		</Section>

		<Section id="libraries" title="libraries" num="§ 05">
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
		gap: 14px ;
		margin: 6px 0 18px;
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg-mute);
		letter-spacing: 0.4px;
	}

	.provenance .hw {
		color: var(--docs-fg-dim);
	}



	.lib {
		white-space: nowrap;
		color: var(--docs-fg);
	}
	.lib.ours {
		color: var(--docs-accent);
	}

	.versions .delta {
		font-family: var(--docs-mono);
		white-space: nowrap;
	}
	.delta.up {
		color: var(--docs-accent);
	}
	.delta.down {
		color: var(--t-yellow);
	}
	.delta.flat,
	.delta.ref,
	.versions .first {
		color: var(--docs-fg-mute);
	}
	.by-lang {
		margin-top: 12px;
		font-size: var(--docs-fs-sm);
	}
	.by-lang summary {
		cursor: pointer;
		color: var(--docs-fg-dim);
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
