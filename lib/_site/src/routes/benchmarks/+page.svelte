<script lang="ts">
	import type { Chart } from './+page.server.ts';

	let { data } = $props();

	const LIBRARY_COLORS: Record<string, string> = {
		twinkleplop: 'var(--pixel-green)',
		'shiki-wasm': 'var(--pixel-cyan)',
		'shiki-js': 'var(--pixel-blue)',
		prism: 'var(--pixel-yellow)',
		'sugar-high': 'var(--pixel-pink)'
	};
	const DEFAULT_COLOR = 'var(--pixel-purple)';
	const color_for = (id: string) => LIBRARY_COLORS[id] ?? DEFAULT_COLOR;

	const bench = $derived(data.benchmarks);

	// `selected` holds what the visitor clicked; `lang` resolves it against
	// what the run actually measured. Keeping those separate means a language
	// that drops out of a future run degrades to the default instead of
	// rendering an empty page, and it avoids an $effect writing back to the
	// state that drives it.
	let selected = $state<string | null>(null);
	let mode = $state('tokenize');

	const lang = $derived.by(() => {
		const available = bench?.languages ?? [];
		if (selected && available.includes(selected)) return selected;
		// TypeScript by default: every library here supports it, so the first
		// chart a visitor sees is a full field rather than two bars.
		return available.includes('typescript') ? 'typescript' : (available[0] ?? '');
	});

	const visible = $derived(
		(bench?.charts ?? []).filter((c: Chart) => c.lang === lang && c.mode === mode)
	);

	const sized = $derived(
		(bench?.tier_order ?? [])
			.map((tier: string) => visible.find((c: Chart) => c.corpus === 'sized' && c.tier === tier))
			.filter(Boolean) as Chart[]
	);
	const upstream = $derived(visible.filter((c: Chart) => c.corpus === 'upstream'));

	function format_hz(hz: number): string {
		if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(2)}M`;
		if (hz >= 1_000) return `${(hz / 1_000).toFixed(1)}k`;
		return hz.toFixed(1);
	}

	function format_ratio(ratio: number): string {
		if (!isFinite(ratio) || ratio <= 1.005) return '';
		if (ratio >= 10) return `${ratio.toFixed(0)}× slower`;
		return `${ratio.toFixed(1)}× slower`;
	}

	function format_bytes(bytes: number): string {
		if (bytes >= 1000) return `${(bytes / 1000).toFixed(0)}KB`;
		return `${bytes}B`;
	}

	function nice_date(iso: string): string {
		if (!iso) return '';
		try {
			return new Date(iso).toLocaleString(undefined, {
				dateStyle: 'medium',
				timeStyle: 'short'
			});
		} catch {
			return iso;
		}
	}
</script>

<svelte:head>
	<title>Benchmarks · twinkleplop</title>
</svelte:head>

<div class="page">
	<header class="page__header">
		<a href="/" class="crumb">&larr; twinkleplop</a>
		<h1 class="page__title">Highlighting benchmarks</h1>
		<p class="page__lead">
			How fast does <strong>twinkleplop</strong> turn source into tokens, and into HTML, compared to the
			other JavaScript syntax highlighters? Every bar in a chart was measured in the same process, alternating
			between libraries, so the machine drifting mid-run moves all of them together instead of flattering
			whichever one happened to go first.
		</p>
		{#if bench}
			<p class="page__meta">
				{data.source === 'published' ? 'Published run' : 'Latest CI run'} ·
				{nice_date(bench.meta.generated_at)} · {bench.meta.runner} · {bench.meta.cpu} · node {bench.meta
					.node}
				{#if bench.meta.commit}
					· <code>{bench.meta.commit.slice(0, 8)}</code>
				{/if}
				{#if data.behind}
					· {data.behind} commit{data.behind === 1 ? '' : 's'} behind this build
				{/if}
			</p>
		{/if}
	</header>

	{#if data.missing || !bench}
		<section class="empty">
			<h2>No benchmark data yet</h2>
			<p>
				This page renders <code>lib/bench/published/comparison.json</code> when it is committed, and
				otherwise the artifact the CI benchmark job uploads. To generate one locally, run
				<code>node lib/bench/compare/bin/compare.mjs</code> from the repo root, then rebuild the site.
			</p>
			<p>
				The published run is committed with its provenance — machine, commit, date — and the page
				says how far the code has moved since, so a stale chart announces itself.
			</p>
		</section>
	{:else}
		<div class="controls">
			<div class="control">
				<span class="control__label" id="lang-label">Language</span>
				<div class="chips" role="group" aria-labelledby="lang-label">
					{#each bench.languages as l (l)}
						<button
							type="button"
							class="chip"
							class:chip--on={l === lang}
							aria-pressed={l === lang}
							onclick={() => (selected = l)}>{l}</button
						>
					{/each}
				</div>
			</div>

			<div class="control">
				<span class="control__label" id="mode-label">Measuring</span>
				<div class="chips" role="group" aria-labelledby="mode-label">
					{#each bench.modes as m (m.id)}
						<button
							type="button"
							class="chip"
							class:chip--on={m.id === mode}
							aria-pressed={m.id === mode}
							onclick={() => (mode = m.id)}>{m.label}</button
						>
					{/each}
				</div>
			</div>
		</div>

		{#each bench.modes.filter((m) => m.id === mode) as m (m.id)}
			<p class="mode-desc">{m.description}</p>
		{/each}

		{#snippet chart_card(c: Chart, title: string, subtitle: string)}
			<article class="chart">
				<header class="chart__header">
					<h3 class="chart__title">{title}</h3>
					<span class="chart__size">{subtitle}</span>
				</header>

				<ul class="bars">
					{#each c.bars as b (b.id)}
						{@const pct = (1 / b.ratio) * 100}
						<li class="bar" class:bar--twinkleplop={b.id === 'twinkleplop'}>
							<div class="bar__label">{b.label}</div>
							<div class="bar__track">
								<div
									class="bar__fill"
									style="width: {Math.max(pct, 0.5)}%; background: {color_for(b.id)};"
								></div>
								<span class="bar__value">{format_hz(b.ops_per_sec)} ops/s</span>
							</div>
							<div class="bar__ratio">
								{#if b.ratio <= 1.005}
									<span class="ratio--fastest">fastest</span>
								{:else}
									{format_ratio(b.ratio)}
								{/if}
							</div>
						</li>
					{/each}
				</ul>

				{#if c.bars.some((b) => b.tokens !== null)}
					<p class="chart__note">
						tokens emitted:
						{#each c.bars.filter((b) => b.tokens !== null) as b, i (b.id)}{i > 0
								? ' · '
								: ''}{b.label}
							{b.tokens}{/each}
					</p>
				{/if}
			</article>
		{/snippet}

		{#if sized.length > 0}
			<section class="section">
				<header class="section__header">
					<h2 class="section__title">{bench.corpus_copy.sized.label}</h2>
					<p class="section__desc">{bench.corpus_copy.sized.description}</p>
				</header>
				<div class="charts">
					{#each sized as c (c.key)}
						{@render chart_card(c, c.tier ?? '', `${format_bytes(c.bytes)} · ${c.lines} lines`)}
					{/each}
				</div>
			</section>
		{/if}

		{#if upstream.length > 0}
			<section class="section">
				<header class="section__header">
					<h2 class="section__title">{bench.corpus_copy.upstream.label}</h2>
					<p class="section__desc">
						{bench.corpus_copy.upstream.description}
						{#if bench.meta.upstream}
							<a href={bench.meta.upstream.repo} class="inline-link"
								>{bench.meta.upstream.repo.replace('https://github.com/', '')}</a
							>
							at <code>{bench.meta.upstream.commit.slice(0, 8)}</code>.
						{/if}
					</p>
				</header>
				<div class="charts">
					{#each upstream as c (c.key)}
						{@render chart_card(c, c.lang, `${format_bytes(c.bytes)} · ${c.lines} lines`)}
					{/each}
				</div>
			</section>
		{/if}

		<section class="section">
			<header class="section__header">
				<h2 class="section__title">How to read this</h2>
			</header>
			<div class="caveats">
				<p>
					<strong>Token counts are the caveat on every bar.</strong> A library that emits half as many
					tokens for the same file is doing less work per byte, not the same work faster. The counts are
					printed under each chart so you can see which is which rather than taking the bar on trust.
				</p>
				<p>
					<strong>The HTML numbers are not measuring identical output.</strong>
					twinkleplop and Prism emit classes and leave colour to a stylesheet; Shiki resolves a theme
					and writes inline styles. That is strictly more string work, and it is a real difference in
					what you get, not a handicap we imposed.
				</p>
				<p>
					<strong>These numbers do not travel.</strong> They describe one machine on one day. Comparing
					a bar here against a number from somewhere else — another run, another runner, another node
					version — is not a comparison. Within a single chart, the interleaving makes them fair.
					{#if data.source === 'published'}
						The machine is named above and the commands that produced this file are in
						<code>lib/bench/published/README.md</code>; the same three commands on the same hardware
						reproduce it.
					{/if}
				</p>
				{#if bench.meta.anchor && !bench.meta.anchor.stable}
					<p class="warn">
						⚠️ The machine drifted {(bench.meta.anchor.drift * 100).toFixed(1)}% during this run.
						The ratios still hold; the absolute ops/s figures should be treated as approximate.
					</p>
				{/if}
				<ul class="libs">
					{#each bench.meta.libraries as l (l.id)}
						<li>
							<span class="libs__name" style="color: {color_for(l.id)};">{l.label}</span>
							<span class="libs__version">{l.version}</span>
							<span class="libs__note">{l.note}</span>
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{/if}
</div>

<style>
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 3rem 2rem 5rem;
		color: var(--text-primary);
		font-family: var(--font-mono);
	}

	.crumb {
		display: inline-block;
		font-family: var(--font-pixel);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-secondary);
		text-decoration: none;
		margin-bottom: 1.5rem;
	}

	.crumb:hover {
		color: var(--pixel-green);
	}

	.page__title {
		font-family: var(--font-grid);
		font-size: clamp(2rem, 5vw, 3.25rem);
		margin: 0 0 1rem;
		line-height: 1.1;
		background: var(--rainbow-gradient);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		font-variation-settings:
			'BACK' 150,
			'ELSH' 3,
			'RECT' 200,
			'wght' 700;
	}

	.page__lead {
		font-size: 1.125rem;
		line-height: 1.6;
		color: var(--text-secondary);
		max-width: 42rem;
		margin: 0 0 0.5rem;
	}

	.page__lead strong {
		color: var(--pixel-green);
		font-weight: 700;
	}

	.page__meta {
		font-family: var(--font-pixel);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-tertiary);
		margin: 0;
	}

	.empty {
		background: var(--bg-secondary);
		border: var(--border-width) solid var(--border);
		padding: 2rem;
		margin-top: 3rem;
	}

	.empty h2 {
		margin: 0 0 1rem;
		color: var(--pixel-pink);
	}

	.section {
		margin-top: 4rem;
	}

	.section__header {
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: var(--border-width) solid var(--border);
	}

	.section__title {
		font-family: var(--font-grid);
		font-size: 2rem;
		margin: 0 0 0.5rem;
		color: var(--pixel-cyan);
		font-variation-settings:
			'BACK' 150,
			'ELSH' 3,
			'RECT' 200,
			'wght' 700;
	}

	.section__desc {
		color: var(--text-secondary);
		max-width: 40rem;
		margin: 0;
		font-size: 1rem;
	}

	.charts {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	@media (min-width: 900px) {
		.charts {
			grid-template-columns: 1fr 1fr;
		}
	}

	.chart {
		background: var(--bg-secondary);
		border: var(--border-width) solid var(--border);
		padding: 1.5rem;
		box-shadow: var(--shadow-md);
	}

	.chart__header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 1.25rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border);
	}

	.chart__title {
		font-family: var(--font-grid);
		font-size: 1.25rem;
		margin: 0;
		color: var(--text-primary);
		text-transform: capitalize;
		font-variation-settings:
			'BACK' 150,
			'ELSH' 3,
			'RECT' 200,
			'wght' 700;
	}

	.chart__size {
		font-family: var(--font-pixel);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
	}

	.bars {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.bar {
		display: grid;
		grid-template-columns: 6rem 1fr 6rem;
		align-items: center;
		gap: 0.75rem;
	}

	.bar__label {
		font-family: var(--font-pixel);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		text-align: right;
	}

	.bar--twinkleplop .bar__label {
		color: var(--pixel-green);
	}

	.bar__track {
		position: relative;
		height: 1.75rem;
		background: var(--bg-code);
		border: 1px solid var(--border);
		overflow: hidden;
	}

	.bar__fill {
		position: absolute;
		inset: 0 auto 0 0;
		transition: width 0.4s ease;
		opacity: 0.85;
	}

	.bar--twinkleplop .bar__fill {
		opacity: 1;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
	}

	.bar__value {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		height: 100%;
		padding: 0 0.75rem;
		font-family: var(--font-retro);
		font-size: 1rem;
		color: var(--text-primary);
		white-space: nowrap;
		mix-blend-mode: difference;
	}

	.bar__ratio {
		font-family: var(--font-pixel);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
	}

	.ratio--fastest {
		color: var(--pixel-green);
		font-weight: 700;
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		margin-top: 2.5rem;
		padding: 1.25rem;
		background: var(--bg-secondary);
		border: var(--border-width) solid var(--border);
	}

	.control {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.75rem;
	}

	.control__label {
		font-family: var(--font-pixel);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-tertiary);
		min-width: 6rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.chip {
		font-family: var(--font-pixel);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.3rem 0.6rem;
		background: var(--bg-code);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		cursor: pointer;
	}

	.chip:hover {
		color: var(--text-primary);
		border-color: var(--text-tertiary);
	}

	.chip--on {
		background: var(--pixel-green);
		border-color: var(--pixel-green);
		color: var(--bg-primary);
		font-weight: 700;
	}

	.mode-desc {
		color: var(--text-secondary);
		margin: 1.25rem 0 0;
		max-width: 42rem;
	}

	.chart__note {
		margin: 1rem 0 0;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border);
		font-family: var(--font-pixel);
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
		line-height: 1.7;
	}

	.caveats p {
		color: var(--text-secondary);
		max-width: 44rem;
		line-height: 1.7;
	}

	.caveats strong {
		color: var(--text-primary);
	}

	.warn {
		border-left: 3px solid var(--pixel-yellow);
		padding-left: 1rem;
	}

	.libs {
		list-style: none;
		padding: 0;
		margin: 2rem 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.libs li {
		display: grid;
		grid-template-columns: 10rem 5rem 1fr;
		gap: 0.75rem;
		align-items: baseline;
		font-size: 0.875rem;
	}

	@media (max-width: 700px) {
		.libs li {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}
	}

	.libs__name {
		font-family: var(--font-pixel);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.libs__version {
		font-family: var(--font-mono);
		color: var(--text-tertiary);
	}

	.libs__note {
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.inline-link {
		color: var(--pixel-cyan);
	}
</style>
