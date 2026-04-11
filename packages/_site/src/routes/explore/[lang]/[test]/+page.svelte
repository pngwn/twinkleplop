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
			'clike',
			{
				grammar: () => import('@twinkleplop/clike'),
				test: () => import('@twinkleplop/clike/test')
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
		]
]);

	if (!lang_map.get(data.lang)) {
		throw new Error(`Language ${data.lang} not found`);
	}

	const allLanguages = Array.from(lang_map.keys())
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
				enhancedLogging: true, // This will log with readable names automatically
				grammarMapper: mapper as any // Pass the mapper so introspector can use readable names
			})
	);

	let tokens = $derived(
		source && grammar && grammar(source)
	);

	let position = $state(0);
	let selectedToken = $state(0);
	let rightPanelView = $state<'tokens' | 'route' | 'compare'>('tokens');

	// Component references
	let codePanelRef = $state<CodePanel>();
	let tokensPanelRef = $state<TokensPanel>();

	function getAnalysisAtPosition(position: number) {
		return mapper?.analyzePosition(introspector as any, position);
	}

	function getFullRoute(position: number) {
		return mapper?.getFullRoute(introspector as any, position);
	}

	function getEnhancedRoute(position: number) {
		// Use getCompleteRoute to show all states including probes
		return mapper?.getCompleteRoute(introspector as any, position);
	}

	let analysis = $derived(getAnalysisAtPosition(position));

	// Get only the current active route (from last time we returned to main)
	let activeRoute = $derived.by(() => {
		const route = getEnhancedRoute(position);
		if (!route) return [];

		// Find the last occurrence where we're back at main (depth 0)
		let lastMainIndex = 0;
		for (let i = route.length - 1; i >= 0; i--) {
			const step = route[i];

			// Find the most recent return to main
			if (
				(step.type === 'POP' && step.depth === 0 && step.toName === 'main') ||
				(step.type === 'START' && step.stateName === 'main')
			) {
				// Start from the next step after returning to main
				lastMainIndex = i;
				// If we popped back to main, start from there
				if (step.type === 'POP') {
					lastMainIndex = i + 1;
					// If there's no next step, we're at main
					if (lastMainIndex >= route.length) {
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

		// Return the route from the last main position to current
		return route.slice(lastMainIndex);
	});

	function handleTokenClick(tokenIndex: number) {
		selectedToken = tokenIndex;
		codePanelRef?.highlightToken(tokenIndex);
		tokensPanelRef?.scrollTokenIntoView(tokenIndex);
	}

	function handleTokenSelect(index: number) {
		selectedToken = index;
		codePanelRef?.highlightToken(index);
	}

	function handlePositionChange(newPosition: number) {
		position = newPosition;
		// Update position highlight if needed
		const htmlContainer = document.querySelector('.code-inner') as HTMLElement;
		if (htmlContainer) {
			const textNode = htmlContainer.firstChild;
			if (textNode) {
				const r = new Range();
				r.setStart(textNode, position);
				r.setEnd(textNode, position + 1);
				const hl = CSS.highlights.get('position');
				if (hl) {
					hl.clear();
					hl.add(r);
				}
			}
		}
	}

	// Keyboard shortcuts for switching views
	function handleGlobalKeydown(event: KeyboardEvent) {
		if (event.key === '1' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			rightPanelView = 'tokens';
		} else if (event.key === '2' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			rightPanelView = 'route';
		} else if (event.key === '3' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			rightPanelView = 'compare';
		}
	}

	$effect(() => {
		window.addEventListener('keydown', handleGlobalKeydown);
		return () => window.removeEventListener('keydown', handleGlobalKeydown);
	});
</script>

<div class="page-wrapper">
	<TestHeader
		lang={data.lang}
		test={data.test}
		cssFiles={data.css_files}
		allLanguages={allLanguages}
	/>

	<div class="main-content">
		<CodePanel bind:this={codePanelRef} {source} {tokens} onTokenClick={handleTokenClick} />

		<div class="right-panel">
			<div class="panel-tabs">
				<button
					class="panel-tab"
					class:active={rightPanelView === 'tokens'}
					onclick={() => (rightPanelView = 'tokens')}
					title="Token Stream (Cmd+1)"
				>
					Token Stream
				</button>
				<button
					class="panel-tab"
					class:active={rightPanelView === 'route'}
					onclick={() => (rightPanelView = 'route')}
					title="State Route (Cmd+2)"
				>
					State Route
				</button>
				<button
					class="panel-tab"
					class:active={rightPanelView === 'compare'}
					onclick={() => (rightPanelView = 'compare')}
					title="Comparison (Cmd+3)"
				>
					Comparison
				</button>
			</div>

			{#if rightPanelView === 'tokens' && source && tokens}
				<TokensPanel
					bind:this={tokensPanelRef}
					{source}
					{tokens}
					{selectedToken}
					onTokenSelect={handleTokenSelect}
				/>
			{:else if rightPanelView === 'route'}
				<RoutePanel {activeRoute} {position} rawGrammar={data.raw_grammar} />
			{:else}
				<PrismPanel {source} lang={data.lang} />
			{/if}
		</div>
	</div>

	<InspectorPanel {source} {position} {analysis} onPositionChange={handlePositionChange} />
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
</style>
