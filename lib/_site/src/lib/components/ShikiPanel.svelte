<script lang="ts">
	interface Props {
		shiki_html: string | null;
		lang: string;
	}

	let { shiki_html, lang }: Props = $props();
</script>

<div class="shiki-panel">
	<h3 class="panel-title">Shiki</h3>
	{#if lang === 'whitespace'}
		<p class="hint">Shiki has no whitespace grammar — no output available.</p>
	{/if}
	{#if shiki_html}
		<div class="shiki-output">{@html shiki_html}</div>
	{:else}
		<pre class="highlight"><code>No Shiki output available for this language.</code></pre>
	{/if}
</div>

<style>
	.shiki-panel {
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.panel-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		margin-bottom: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}

	.hint {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin: 0 0 0.5rem 0;
		font-style: italic;
		flex-shrink: 0;
	}

	.shiki-output {
		flex: 1;
		overflow: auto;
		min-height: 0;
	}

	/* Override Shiki's default pre styles to fit our layout */
	.shiki-output :global(pre) {
		margin: 0;
		padding: 1rem;
		height: 100%;
		overflow: auto;
		font-family: var(--font-mono);
		font-size: inherit;
		border-radius: 0;
	}

	.shiki-output :global(pre code) {
		font-family: var(--font-mono);
		font-size: inherit;
	}

	.highlight {
		flex: 1;
		overflow: auto;
		margin: 0;
		background: var(--bg-code);
		color: var(--text-primary);
	}
</style>
