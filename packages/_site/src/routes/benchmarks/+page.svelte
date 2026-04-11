<script lang="ts">
	let { data } = $props();

	// Map library names to pixel-theme colors. Twinkleplop gets the accent
	// green so the "winner" is visually obvious in every chart.
	const LIBRARY_COLORS: Record<string, string> = {
		Twinkleplop: 'var(--pixel-green)',
		Prism: 'var(--pixel-yellow)',
		Shiki: 'var(--pixel-cyan)',
		'highlight.js': 'var(--pixel-orange)',
		'Starry Night': 'var(--pixel-pink)',
	};

	const DEFAULT_COLOR = 'var(--pixel-purple)';

	function colorFor(library: string): string {
		return LIBRARY_COLORS[library] ?? DEFAULT_COLOR;
	}

	function formatHz(hz: number): string {
		if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(2)}M`;
		if (hz >= 1_000) return `${(hz / 1_000).toFixed(1)}k`;
		return hz.toFixed(1);
	}

	function formatRatio(fastest: number, other: number): string {
		const ratio = fastest / other;
		if (!isFinite(ratio) || ratio <= 1) return '';
		if (ratio >= 10) return `${ratio.toFixed(0)}× slower`;
		return `${ratio.toFixed(1)}× slower`;
	}

	function niceDate(iso: string): string {
		if (!iso) return '';
		try {
			return new Date(iso).toLocaleString(undefined, {
				dateStyle: 'medium',
				timeStyle: 'short',
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
		<h1 class="page__title">HTML highlighting benchmarks</h1>
		<p class="page__lead">
			How fast does <strong>twinkleplop</strong> tokenise HTML compared to the
			mainstream JavaScript syntax highlighters? Each chart below is one
			sample size; each bar is one library, sorted fastest to slowest. Numbers
			are operations per second (higher is better). Bar widths are relative
			to the fastest library in each chart.
		</p>
		{#if data.benchmarks.generatedAt}
			<p class="page__meta">
				Last run: <time>{niceDate(data.benchmarks.generatedAt)}</time>
			</p>
		{/if}
	</header>

	{#if data.missing}
		<section class="empty">
			<h2>No benchmark data yet</h2>
			<p>
				Run <code>pnpm bench</code> in the <code>packages/bench</code> directory
				to generate <code>benchmark-results.json</code>, then reload this page.
			</p>
		</section>
	{:else if data.benchmarks.sections.every((s) => s.charts.length === 0)}
		<section class="empty">
			<h2>No HTML benchmark groups found</h2>
			<p>
				The benchmark JSON exists but doesn't contain any HTML-flavoured
				groups. Re-run <code>pnpm bench</code>.
			</p>
		</section>
	{:else}
		{#each data.benchmarks.sections as section (section.mode)}
			{#if section.charts.length > 0}
				<section class="section">
					<header class="section__header">
						<h2 class="section__title">{section.label.toLowerCase()}</h2>
						<p class="section__desc">{section.description}</p>
					</header>

					<div class="charts">
						{#each section.charts as chart (chart.sampleName)}
							{@const fastest = chart.results[0]?.hz ?? 0}
							<article class="chart">
								<header class="chart__header">
									<h3 class="chart__title">{chart.sampleName}</h3>
									<span class="chart__size">{chart.sampleSize}</span>
								</header>

								<ul class="bars">
									{#each chart.results as r (r.library)}
										{@const pct = fastest > 0 ? (r.hz / fastest) * 100 : 0}
										{@const isFastest = r.hz === fastest}
										<li
											class="bar"
											class:bar--fastest={isFastest}
											class:bar--twinkleplop={r.library === 'Twinkleplop'}
										>
											<div class="bar__label">{r.library}</div>
											<div class="bar__track">
												<div
													class="bar__fill"
													style="width: {Math.max(pct, 0.5)}%; background: {colorFor(r.library)};"
												></div>
												<span class="bar__value">{formatHz(r.hz)} ops/s</span>
											</div>
											<div class="bar__ratio">
												{#if r.library === 'Twinkleplop' && isFastest}
													<span class="ratio--fastest">fastest</span>
												{:else}
													{formatRatio(fastest, r.hz)}
												{/if}
											</div>
										</li>
									{/each}
								</ul>
							</article>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
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
</style>
