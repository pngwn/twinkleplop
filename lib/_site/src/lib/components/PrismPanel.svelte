<script lang="ts">
	interface Props {
		source: string | undefined;
		lang: string;
	}

	let { source, lang }: Props = $props();

	const lang_map: Record<string, string> = {
		css: 'css',
		javascript: 'javascript',
		rust: 'rust',
		typescript: "typescript",
		sql: 'sql',
		yaml: 'yaml',
		markdown: 'markdown',
		toml: 'toml'
	};

	function escape_html(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	const src = $derived(source ?? '');
	const prism_lang = $derived(lang_map[lang]);
	const fallback = $derived(escape_html(src));

	let prism_html = $state('');

	$effect(() => {
		const current_src = src;
		const current_lang = prism_lang;
		console.log({current_lang})
		if (!current_lang) {
			prism_html = '';
			return;
		}

		let cancelled = false;
		(async () => {
			const Prism = (await import('prismjs')).default;
			await import('prismjs/components/prism-rust');
			await import('prismjs/components/prism-typescript');
			await import('prismjs/components/prism-sql');
			await import('prismjs/components/prism-yaml');
			await import('prismjs/components/prism-markdown');
			await import('prismjs/components/prism-toml');
			if (cancelled) return;
			const grammar = Prism.languages[current_lang];
			if (!grammar) {
				prism_html = '';
				return;
			}
			prism_html = Prism.highlight(current_src, grammar, current_lang);
		})();

		return () => {
			cancelled = true;
		};
	});

	const highlighted = $derived(prism_lang && prism_html ? prism_html : fallback);
</script>

<div class="prism-panel">
	<h3 class="panel-title">Prism</h3>
	{#if lang === 'whitespace'}
		<p class="hint">Prism has no whitespace grammar — showing plain text.</p>
	{/if}
	<pre class="highlight"><code>{@html highlighted}</code></pre>
</div>

<style>
	.prism-panel {
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

	.highlight {
		flex: 1;
		position: relative;
		overflow: auto;
		margin: 0;
		max-height: 100%;
		background: var(--bg-code);
		color: var(--text-primary);
	}

	.highlight code {
		background: transparent;
		border: none;
		padding: 0;
		font-family: inherit;
		font-size: inherit;
		color: inherit;
	}

	.prism-panel :global(.token.comment),
	.prism-panel :global(.token.prolog),
	.prism-panel :global(.token.doctype),
	.prism-panel :global(.token.cdata) {
		color: #5c6773;
		font-style: italic;
	}

	.prism-panel :global(.token.string),
	.prism-panel :global(.token.attr-value),
	.prism-panel :global(.token.char),
	.prism-panel :global(.token.regex),
	.prism-panel :global(.token.url) {
		color: #b8cc52;
	}

	.prism-panel :global(.token.number) {
		color: #d2a6ff;
	}

	.prism-panel :global(.token.keyword),
	.prism-panel :global(.token.boolean),
	.prism-panel :global(.token.atrule),
	.prism-panel :global(.token.important),
	.prism-panel :global(.token.rule) {
		color: #ff7733;
	}

	.prism-panel :global(.token.function) {
		color: #ffb454;
	}

	.prism-panel :global(.token.selector) {
		color: #fbbf24;
	}

	.prism-panel :global(.token.property) {
		color: #38bdf8;
	}

	.prism-panel :global(.token.tag),
	.prism-panel :global(.token.attr-name),
	.prism-panel :global(.token.namespace),
	.prism-panel :global(.token.builtin),
	.prism-panel :global(.token.symbol) {
		color: #38bdf8;
	}

	.prism-panel :global(.token.class-name) {
		color: #22d3ee;
	}

	.prism-panel :global(.token.punctuation),
	.prism-panel :global(.token.operator),
	.prism-panel :global(.token.entity) {
		color: #9ca3af;
	}

	.prism-panel :global(.token.variable),
	.prism-panel :global(.token.constant),
	.prism-panel :global(.token.deleted) {
		color: #d2a6ff;
	}

	.prism-panel :global(.token.inserted) {
		color: #b8cc52;
	}

	.prism-panel :global(.token.italic) {
		font-style: italic;
	}

	.prism-panel :global(.token.bold) {
		font-weight: bold;
	}
</style>
