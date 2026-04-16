<script lang="ts">
	import { tokenize } from '@twinkleplop/core/debug';
	import { TokenizerIntrospector } from '@twinkleplop/core/introspector';
	import { GrammarMapper } from '@twinkleplop/core/grammar-mapper';
	import type { RouteStep } from '@twinkleplop/core';

	import TestHeader from '$lib/components/TestHeader.svelte';
	import CodePanel from '$lib/components/CodePanel.svelte';
	import TokensPanel from '$lib/components/TokensPanel.svelte';
	import RoutePanel from '$lib/components/RoutePanel.svelte';
	import PrismPanel from '$lib/components/PrismPanel.svelte';
	import ShikiPanel from '$lib/components/ShikiPanel.svelte';
	import InspectorPanel from '$lib/components/InspectorPanel.svelte';

	let { data } = $props();

	const lang_map = new Map([
		[
			'css',
			{
				grammar: () => import('@twinkleplop/css'),
				test: () => import('@twinkleplop/css/test')
			}
		],
		[
			'whitespace',
			{
				grammar: () => import('@twinkleplop/whitespace'),
				test: () => import('@twinkleplop/whitespace/test')
			}
		],

		[
			'javascript',
			{
				grammar: () => import('@twinkleplop/javascript'),
				test: () => import('@twinkleplop/javascript/test')
			}
		],
		[
			'html',
			{
				grammar: () => import('@twinkleplop/html'),
				// HTML package doesn't expose an output-snapshot subpath.
				test: () => Promise.resolve({})
			}
		],
		[
			'svelte',
			{
				grammar: () => import('@twinkleplop/svelte'),
				// Svelte package doesn't expose an output-snapshot subpath.
				test: () => Promise.resolve({})
			}
		],
		[
			'rust',
			{
				grammar: () => import('@twinkleplop/rust'),
				test: () => import('@twinkleplop/rust/test')
			}
		],
		[
			'typescript',
			{
				grammar: () => import('@twinkleplop/typescript'),
				test: () => import('@twinkleplop/typescript/test')
			}
		],
		[
			'sql',
			{
				grammar: () => import('@twinkleplop/sql'),
				test: () => import('@twinkleplop/sql/test')
			}
		],
		[
			'yaml',
			{
				grammar: () => import('@twinkleplop/yaml'),
				test: () => import('@twinkleplop/yaml/test')
			}
		],
		[
			'markdown',
			{
				grammar: () => import('@twinkleplop/markdown'),
				test: () => import('@twinkleplop/markdown/test')
			}
		],
		[
			'toml',
			{
				grammar: () => import('@twinkleplop/toml'),
				test: () => import('@twinkleplop/toml/test')
			}
		],
		[
			'python',
			{
				grammar: () => import('@twinkleplop/python'),
				test: () => import('@twinkleplop/python/test')
			}
		],
		[
			'bash',
			{
				grammar: () => import('@twinkleplop/bash'),
				test: () => import('@twinkleplop/bash/test')
			}
		],
		[
			'go',
			{
				grammar: () => import('@twinkleplop/go'),
				test: () => import('@twinkleplop/go/test')
			}
		],
		[
			'diff',
			{
				grammar: () => import('@twinkleplop/diff'),
				test: () => import('@twinkleplop/diff/test')
			}
		],
		[
			'diff-basic',
			{
				grammar: () => import('@twinkleplop/diff-basic'),
				test: () => import('@twinkleplop/diff-basic/test')
			}
		]
	]);

	if (!lang_map.get(data.lang)) {
		throw new Error(`Language ${data.lang} not found`);
	}

	const all_languages = Array.from(lang_map.keys())
	let grammar = $state()
	let raw_grammar = $state();
	async function get_mod() {
		const x = await lang_map.get(data.lang)?.grammar();
		console.log(x)
		raw_grammar = x?.raw_grammar;
		grammar = x.language
		;
	}

	$effect(() => {
		get_mod();
	})
	// const mod = $derived(await get_mod());

	let source = $derived(data.css_files.find(([file]) => file === data.test)?.[1]);


	// Create the mapper with your original and compiled grammars
	let mapper = $derived(
		raw_grammar && grammar && new GrammarMapper(raw_grammar, grammar)
	);

	// Create an introspector with the grammar mapper for readable names
	const introspector = $derived(
		mapper &&
			new TokenizerIntrospector({
				log: console.log,
				enhanced_logging: true, // This will log with readable names automatically
				grammar_mapper: mapper as any // Pass the mapper so introspector can use readable names
			})
	);

	let tokens = $derived(
		source && grammar && grammar(source)
	);

	let position = $state(0);
	let selected_token = $state(0);
	let right_panel_view = $state<'tokens' | 'route' | 'compare'>('tokens');
	let compare_view = $state<'prism' | 'shiki'>('prism');

	// component references
	let code_panel_ref = $state<CodePanel>();
	let tokens_panel_ref = $state<TokensPanel>();

	function get_analysis_at_position(position: number) {
		return mapper?.analyze_position(introspector as any, position);
	}

	function get_full_route(position: number) {
		return mapper?.get_full_route(introspector as any, position);
	}

	function get_enhanced_route(position: number) {
		// use getCompleteRoute to show all states including probes
		return mapper?.get_complete_route(introspector as any, position);
	}

	let analysis = $derived(get_analysis_at_position(position));

	// get only the current active route (from last time we returned to main)
	let active_route = $derived.by(() => {
		const route = get_enhanced_route(position);
		if (!route) return [];

		// find the last occurrence where we're back at main (depth 0)
		let last_main_index = 0;
		for (let i = route.length - 1; i >= 0; i--) {
			const step = route[i];

			// find the most recent return to main
			if (
				(step.type === 'POP' && step.depth === 0 && step.to_name === 'main') ||
				(step.type === 'START' && step.state_name === 'main')
			) {
				// start from the next step after returning to main
				last_main_index = i;
				// if we popped back to main, start from there
				if (step.type === 'POP') {
					last_main_index = i + 1;
					// if there's no next step, we're at main
					if (last_main_index >= route.length) {
						return [
							{
								type: 'START',
								state: 0,
								stateName: 'main',
								position: step.position,
								depth: 0
							} as RouteStep
						];
					}
				}
				break;
			}
		}

		// return the route from the last main position to current
		return route.slice(last_main_index);
	});

	function handle_token_click(token_index: number) {
		selected_token = token_index;
		code_panel_ref?.highlight_token(token_index);
		tokens_panel_ref?.scroll_token_into_view(token_index);
	}

	function handle_token_select(index: number) {
		selected_token = index;
		code_panel_ref?.highlight_token(index);
	}

	function handle_position_change(new_position: number) {
		position = new_position;
		// update position highlight if needed
		const html_container = document.querySelector('.code-inner') as HTMLElement;
		if (html_container) {
			const text_node = html_container.firstChild;
			if (text_node) {
				const r = new Range();
				r.setStart(text_node, position);
				r.setEnd(text_node, position + 1);
				const hl = CSS.highlights.get('position');
				if (hl) {
					hl.clear();
					hl.add(r);
				}
			}
		}
	}

	function handle_global_keydown(event: KeyboardEvent) {
		if (event.key === '1' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			right_panel_view = 'tokens';
		} else if (event.key === '2' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			right_panel_view = 'route';
		} else if (event.key === '3' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			right_panel_view = 'compare';
		}
	}

	$effect(() => {
		window.addEventListener('keydown', handle_global_keydown);
		return () => window.removeEventListener('keydown', handle_global_keydown);
	});
</script>

<div class="page-wrapper">
	<TestHeader
		lang={data.lang}
		test={data.test}
		css_files={data.css_files}
		all_languages={all_languages}
	/>

	<div class="main-content">
		<CodePanel bind:this={code_panel_ref} {source} {tokens} on_token_click={handle_token_click} />

		<div class="right-panel">
			<div class="panel-tabs">
				<button
					class="panel-tab"
					class:active={right_panel_view === 'tokens'}
					onclick={() => (right_panel_view = 'tokens')}
					title="Token Stream (Cmd+1)"
				>
					Token Stream
				</button>
				<button
					class="panel-tab"
					class:active={right_panel_view === 'route'}
					onclick={() => (right_panel_view = 'route')}
					title="State Route (Cmd+2)"
				>
					State Route
				</button>
				<button
					class="panel-tab"
					class:active={right_panel_view === 'compare'}
					onclick={() => (right_panel_view = 'compare')}
					title="Comparison (Cmd+3)"
				>
					Comparison
				</button>
			</div>

			{#if right_panel_view === 'tokens' && source && tokens}
				<TokensPanel
					bind:this={tokens_panel_ref}
					{source}
					{tokens}
					{selected_token}
					on_token_select={handle_token_select}
				/>
			{:else if right_panel_view === 'route'}
				<RoutePanel {active_route} {position} raw_grammar={data.raw_grammar} />
			{:else}
				<div class="compare-wrapper">
					<div class="compare-tabs">
						<button
							class="compare-tab"
							class:active={compare_view === 'prism'}
							onclick={() => (compare_view = 'prism')}
						>Prism</button>
						<button
							class="compare-tab"
							class:active={compare_view === 'shiki'}
							onclick={() => (compare_view = 'shiki')}
						>Shiki</button>
					</div>
					{#if compare_view === 'prism'}
						<PrismPanel {source} lang={data.lang} />
					{:else}
						<ShikiPanel shiki_html={data.shiki_html} lang={data.lang} />
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<InspectorPanel {source} {position} {analysis} on_position_change={handle_position_change} />
</div>

<style>
	.page-wrapper {
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.main-content {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr 450px;
		gap: 2rem;
		padding: 1rem 0;
		overflow: hidden;
		min-height: 0;
	}

	.right-panel {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.panel-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.5rem;
	}

	.panel-tab {
		background: transparent;
		color: var(--text-secondary);
		border: none;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
	}

	.panel-tab:hover {
		color: var(--text-primary);
		background: var(--bg-tertiary);
	}

	.panel-tab.active {
		color: var(--accent);
		background: var(--bg-tertiary);
	}

	.panel-tab.active::after {
		content: '';
		position: absolute;
		bottom: -0.5rem;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--accent);
	}

	.compare-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-height: 0;
	}

	.compare-tabs {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
		padding: 0.25rem;
		background: var(--bg-tertiary);
		border-radius: 6px;
		flex-shrink: 0;
	}

	.compare-tab {
		flex: 1;
		background: transparent;
		color: var(--text-secondary);
		border: none;
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		border-radius: 4px;
		transition: all 0.15s ease;
	}

	.compare-tab:hover {
		color: var(--text-primary);
	}

	.compare-tab.active {
		background: var(--bg-primary, var(--bg-code));
		color: var(--text-primary);
	}

	.compare-wrapper :global(.prism-panel),
	.compare-wrapper :global(.shiki-panel) {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}
</style>
