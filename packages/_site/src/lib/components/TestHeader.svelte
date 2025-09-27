<script lang="ts">
	import { goto } from '$app/navigation';

	interface Props {
		lang: string;
		test: string;
		cssFiles: [string, string][];
	}

	let { lang, test, cssFiles }: Props = $props();

	function handleFileChange(event: Event & { currentTarget: EventTarget & HTMLSelectElement }) {
		goto(`/explore/${lang}/${event.currentTarget.value}`);
	}
</script>

<div class="test-header">
	<div class="breadcrumbs">
		<a href="/" class="breadcrumb-link">Home</a>
		<span class="breadcrumb-separator">/</span>
		<a href="/{lang}" class="breadcrumb-link">{lang}</a>
		<span class="breadcrumb-separator">/</span>
		<span class="breadcrumb-current">{test}</span>
	</div>

	<div class="file-selector">
		<label for="file-select">Test file:</label>
		<select id="file-select" onchange={(e) => handleFileChange(e)} class="select-input">
			{#each cssFiles as [file]}
				<option value={file} selected={file === test}>{file}</option>
			{/each}
		</select>
	</div>
</div>

<style>
	.test-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 0;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.breadcrumbs {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.875rem;
	}

	.breadcrumb-link {
		color: var(--text-secondary);
		transition: color 0.2s ease;
	}

	.breadcrumb-link:hover {
		color: var(--accent);
	}

	.breadcrumb-separator {
		color: var(--text-tertiary);
	}

	.breadcrumb-current {
		color: var(--text-primary);
		font-weight: 500;
	}

	.file-selector {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.file-selector label {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.select-input {
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border: 1px solid var(--border);
		padding: 0.25rem 1rem 0.25rem 0.15rem;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		outline: none;
	}

	.select-input:hover {
		background: var(--bg-hover);
		border-color: var(--border-light);
	}

	.select-input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-dim);
	}
</style>
