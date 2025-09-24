<script>
	let { css_files } = $props();
</script>

<div class="home-page">
<div class="hero">
	<h1 class="hero-title">
		<span class="gradient-text">Twinkleplop</span>
		<span class="subtitle">Syntax Highlighter</span>
	</h1>
	<p class="hero-description">
		High-performance, regex-free syntax highlighting powered by character scanning.
		<br />
		<span class="perf-badge">8-15x faster</span> than traditional regex-based approaches.
	</p>
</div>

<section class="tests-section">
	<div class="section-header">
		<h2>Test Files</h2>
		<span class="file-count">{css_files?.length || 0} files</span>
	</div>
	
	<div class="file-grid">
		{#each css_files as [file, content]}
			<a href={`/css/${file}`} class="file-card">
				<div class="file-icon">📄</div>
				<div class="file-info">
					<span class="file-name">{file}</span>
					<span class="file-size">{Math.round(content.length / 1024)}KB</span>
				</div>
				<div class="file-arrow">→</div>
			</a>
		{/each}
	</div>
</section>
</div>

<style>
	.home-page {
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: auto;
	}
	.hero {
		padding: 3rem 0;
		text-align: center;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.hero-title {
		font-size: 3rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		letter-spacing: -0.03em;
		line-height: 1.1;
	}

	.gradient-text {
		background: linear-gradient(135deg, var(--accent) 0%, #00ff94 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.subtitle {
		display: block;
		font-size: 1.5rem;
		font-weight: 400;
		color: var(--text-secondary);
		margin-top: 0.5rem;
	}

	.hero-description {
		font-size: 1rem;
		color: var(--text-secondary);
		margin-top: 1.5rem;
		line-height: 1.8;
	}

	.perf-badge {
		display: inline-block;
		background: var(--accent-dim);
		color: var(--accent);
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}

	.tests-section {
		flex: 1;
		padding: 2rem 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2rem;
	}

	.section-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.file-count {
		color: var(--text-tertiary);
		font-size: 0.875rem;
		background: var(--bg-tertiary);
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
	}

	.file-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.file-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
	}

	.file-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 3px;
		height: 100%;
		background: var(--accent);
		transform: translateX(-100%);
		transition: transform 0.2s ease;
	}

	.file-card:hover {
		background: var(--bg-tertiary);
		border-color: var(--border-light);
		transform: translateX(2px);
	}

	.file-card:hover::before {
		transform: translateX(0);
	}

	.file-card:hover .file-arrow {
		transform: translateX(4px);
	}

	.file-icon {
		font-size: 1.5rem;
		filter: grayscale(1) opacity(0.6);
	}

	.file-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.file-name {
		color: var(--text-primary);
		font-weight: 500;
		font-size: 0.9375rem;
	}

	.file-size {
		color: var(--text-tertiary);
		font-size: 0.75rem;
	}

	.file-arrow {
		color: var(--text-tertiary);
		transition: transform 0.2s ease;
	}
</style>
