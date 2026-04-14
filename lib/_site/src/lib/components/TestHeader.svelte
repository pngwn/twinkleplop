<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	interface Props {
		lang: string;
		test: string;
		css_files: [string, string][];
		all_languages?: string[];
	}

	let {
		lang,
		test,
		css_files,
		all_languages = ['css', 'javascript', 'whitespace']
	}: Props = $props();

	let show_lang_menu = $state(false);
	let show_test_menu = $state(false);

	function handle_lang_select(new_lang: string) {
		show_lang_menu = false;
		goto(`/explore/${new_lang}/${test}`);
	}

	function handle_test_select(new_test: string) {
		show_test_menu = false;
		goto(`/explore/${lang}/${new_test}`);
	}

	function handle_click_outside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.breadcrumb-dropdown')) {
			show_lang_menu = false;
			show_test_menu = false;
		}
	}

	$effect(() => {
		document.addEventListener('click', handle_click_outside);
		return () => document.removeEventListener('click', handle_click_outside);
	});
</script>

<div class="test-header">
	<div class="breadcrumbs">
		<a href="/" class="logo-link">
			<span class="logo-text">twinkleplop</span>
			<span class="cursor">_</span>
		</a>
		<span class="breadcrumb-separator">/</span>

		<!-- Language selector -->
		<div class="breadcrumb-dropdown">
			<button
				class="breadcrumb-button"
				class:active={show_lang_menu}
				onclick={(e) => {
					e.stopPropagation();
					show_lang_menu = !show_lang_menu;
					show_test_menu = false;
				}}
			>
				<span>{lang}</span>
				<svg
					class="chevron"
					class:rotated={show_lang_menu}
					width="12"
					height="12"
					viewBox="0 0 12 12"
				>
					<path
						d="M3 4.5L6 7.5L9 4.5"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						fill="none"
					/>
				</svg>
			</button>

			{#if show_lang_menu}
				<div class="dropdown-menu">
					{#each all_languages as available_lang}
						<button
							class="dropdown-item"
							class:current={available_lang === lang}
							onclick={() => handle_lang_select(available_lang)}
						>
							{available_lang}
							{#if available_lang === lang}
								<svg class="check-icon" width="14" height="14" viewBox="0 0 14 14">
									<path
										d="M2 7L5.5 10.5L12 4"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
										stroke-linejoin="round"
										fill="none"
									/>
								</svg>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<span class="breadcrumb-separator">/</span>

		<!-- Test selector -->
		<div class="breadcrumb-dropdown">
			<button
				class="breadcrumb-button"
				class:active={show_test_menu}
				onclick={(e) => {
					e.stopPropagation();
					show_test_menu = !show_test_menu;
					show_lang_menu = false;
				}}
			>
				<span>{test}</span>
				<svg
					class="chevron"
					class:rotated={show_test_menu}
					width="12"
					height="12"
					viewBox="0 0 12 12"
				>
					<path
						d="M3 4.5L6 7.5L9 4.5"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						fill="none"
					/>
				</svg>
			</button>

			{#if show_test_menu}
				<div class="dropdown-menu test-menu">
					<div class="dropdown-header">Test Files</div>
					<div class="test-grid">
						{#each css_files as [file]}
							<button
								class="test-item"
								class:current={file === test}
								onclick={() => handle_test_select(file)}
								title={file}
							>
								{file}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="header-actions">
		<span class="file-count">{css_files.length} test files</span>
	</div>
</div>

<style>
	.test-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 0 0.5rem 0;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
		margin-bottom: 0.5rem;
	}

	.breadcrumbs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.logo-link {
		display: flex;
		align-items: center;
		color: var(--text-primary);
		transition: all 0.2s ease;
		/* padding: 0.25rem 0.75rem; */
		/* border-radius: 6px; */
		font-size: 0.9375rem;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.logo-link:hover {
		/* background: var(--bg-tertiary); */
		transform: translateX(2px);
	}

	.logo-text {
		background: linear-gradient(135deg, var(--accent) 0%, #00ff94 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		font-family: var(--font-mono);
	}

	.cursor {
		animation: blink 1.2s infinite;
		color: var(--accent);
		font-weight: 300;
		margin-left: 2px;
	}

	@keyframes blink {
		0%,
		50% {
			opacity: 1;
		}
		51%,
		100% {
			opacity: 0;
		}
	}

	.breadcrumb-separator {
		color: var(--text-tertiary);
		opacity: 0.5;
	}

	.breadcrumb-dropdown {
		position: relative;
	}

	.breadcrumb-button {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.625rem;
		background: transparent;
		color: var(--text-primary);
		border: 1px solid transparent;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.breadcrumb-button:hover {
		background: var(--bg-tertiary);
		border-color: var(--border);
	}

	.breadcrumb-button.active {
		background: var(--bg-tertiary);
		border-color: var(--accent);
		color: var(--accent);
	}

	.chevron {
		transition: transform 0.2s ease;
		opacity: 0.6;
	}

	.chevron.rotated {
		transform: rotate(180deg);
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + 0.4rem);
		left: 0;
		min-width: 180px;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 4px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 1000;
		padding: 0.2rem;
		animation: fadeIn 0.15s ease;
	}

	.dropdown-menu.test-menu {
		min-width: 320px;
		max-width: 480px;
	}

	.dropdown-header {
		padding: 0.5rem 0.75rem 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-family: var(--font-mono);
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: transparent;
		color: var(--text-primary);
		border: none;
		border-radius: 2px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
	}

	.dropdown-item:hover {
		background: var(--bg-tertiary);
		color: var(--accent);
	}

	.dropdown-item.current {
		background: var(--accent-dim);
		color: var(--accent);
		font-weight: 500;
	}

	.check-icon {
		color: var(--accent);
	}

	.test-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.25rem;
		padding: 0.25rem;
		max-height: 400px;
		overflow-y: auto;
	}

	.test-item {
		padding: 0.3rem 0.5rem;
		background: transparent;
		color: var(--text-primary);
		border: 1px solid var(--border);
		border-radius: 2px;
		font-size: 0.8125rem;
		font-family: var(--font-mono);
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.test-item:hover {
		background: var(--bg-tertiary);
		border-color: var(--accent);
		color: var(--accent);
		transform: translateY(-1px);
	}

	.test-item.current {
		background: var(--accent);
		color: var(--bg-primary);
		border-color: var(--accent);
		font-weight: 500;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.file-count {
		color: var(--text-tertiary);
		font-size: 0.8125rem;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Custom scrollbar for test grid */
	.test-grid::-webkit-scrollbar {
		width: 6px;
	}

	.test-grid::-webkit-scrollbar-track {
		background: var(--bg-tertiary);
		border-radius: 2px;
	}

	.test-grid::-webkit-scrollbar-thumb {
		background: var(--border);
		border-radius: 2px;
	}

	.test-grid::-webkit-scrollbar-thumb:hover {
		background: var(--text-tertiary);
	}
</style>
