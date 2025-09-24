<script lang="ts">
	import { goto } from '$app/navigation';
	import { tokenize } from '@twinkleplop/core/debug';
	import { TokenizerIntrospector } from '@twinkleplop/core/introspector';
	import { GrammarMapper } from '@twinkleplop/core/grammar-mapper';
	import { type IntrospectorEvent, type TokenizeResult, type RouteStep } from '@twinkleplop/core';
	import { Spring } from 'svelte/motion';
	import { SvelteSet } from 'svelte/reactivity';

	let { data } = $props();

	let source = $derived(data.css_files.find(([file]) => file === data.test)?.[1]);

	// Create the mapper with your original and compiled grammars
	let mapper = $derived(
		data.raw_grammar && data.grammar && new GrammarMapper(data.raw_grammar, data.grammar)
	);

	// Create an introspector with the grammar mapper for readable names
	const introspector = $derived(
		mapper &&
			new TokenizerIntrospector({
				enhancedLogging: true, // This will log with readable names automatically
				grammarMapper: mapper as any // Pass the mapper so introspector can use readable names
			})
	);

	let tokens = $derived(
		source && data.grammar && tokenize(source, data.grammar, introspector as any)
	);
	// let html = $derived(toHtml(source, tokens));
	let position = $state(0);

	function get_analysis_at_position(position: number) {
		return mapper?.analyzePosition(introspector as any, position);
	}

	function get_full_route(position: number) {
		return mapper?.getFullRoute(introspector as any, position);
	}

	function getTokens(input: string, result: TokenizeResult) {
		const tokens = [];
		for (let i = 0; i < result.tokens.length / 3; i++) {
			const type = result.tokenTypes[result.tokens[i * 3]];
			const start = result.tokens[i * 3 + 1];
			const end = result.tokens[i * 3 + 2];
			tokens.push({
				type,
				value: input.substring(start, end)
			});
		}
		return tokens;
	}

	function handleChange(event: Event & { currentTarget: EventTarget & HTMLSelectElement }) {
		goto(`/${data.lang}/${event.currentTarget.value}`);
	}

	let r: Range;
	let hl: Highlight;
	if (typeof window !== 'undefined') {
		hl = new Highlight();
		CSS.highlights.set('position', hl);
		r = new Range();
		hl.add(r);
	}

	let analysis = $derived(get_analysis_at_position(position));

	// Get all state transitions at current position
	// let completeState = $derived(introspector.getCompleteStateAtPosition(position));
	// let stateTransitions = $derived(completeState?.stateTransitionsAtPosition || []);
	// let allEventsAtPos = $derived(completeState?.allEventsAtPosition || []);

	// Helper to get readable state name from transition
	// function getStateNameFromTransition(transition: IntrospectorEvent) {
	// 	if (transition.type === 'ENTER_PROBE' && transition.currentState) {
	// 		return mapper?.getStateName(
	// 			typeof transition.currentState === 'string'
	// 				? parseInt(transition.currentState.replace('state_', ''))
	// 				: transition.currentState
	// 		);
	// 	}
	// 	if (transition.type === 'EXIT_PROBE' && transition.resetState) {
	// 		return mapper?.getStateName(
	// 			typeof transition.resetState === 'string'
	// 				? parseInt(transition.resetState.replace('state_', ''))
	// 				: transition.resetState
	// 		);
	// 	}
	// 	if (transition.toState) {
	// 		return mapper?.getStateName(
	// 			typeof transition.toState === 'string'
	// 				? parseInt(transition.toState.replace('state_', ''))
	// 				: transition.toStateIndex || transition.toState
	// 		);
	// 	}
	// 	return null;
	// }

	// Track which route steps are expanded
	let expandedSteps = $state(new SvelteSet());

	// Get rule definition from raw grammar
	function getRuleDefinition(step: RouteStep) {
		if (!step.rule || !data.raw_grammar || !data.raw_grammar.states || !step.fromName) {
			return null;
		}

		// Get the state rules
		let fromStateName = step.fromName;
		let stateRules = data.raw_grammar?.states[fromStateName];

		if (!stateRules) {
			return null;
		}

		const rules = stateRules.rules || stateRules; // Handle both formats
		if (!Array.isArray(rules)) {
			return null;
		}

		// If rule is a string like "rule_0", extract the index
		if (typeof step.rule === 'string' && step.rule.startsWith('rule_')) {
			const ruleIndex = parseInt(step.rule.replace('rule_', ''));
			if (rules[ruleIndex]) {
				return rules[ruleIndex];
			}
		} else if (typeof step.rule === 'number') {
			if (rules[step.rule]) {
				return rules[step.rule];
			}
		} else if (typeof step.rule === 'string') {
			// The rule is a descriptive string from GrammarMapper
			// The description format is like "[a-z], [A-Z] → selector ↓ identifier"
			const ruleDescription = step.rule;

			// Try to find the matching rule
			// First pass: look for exact matches including pattern
			for (let i = 0; i < rules.length; i++) {
				const rule = rules[i];
				let patternMatches = false;

				// Check if pattern matches what's in the description
				if (rule.range) {
					// Check for range patterns like [a-z]
					if (Array.isArray(rule.range[0])) {
						// Multiple ranges
						const rangeStr = rule.range
							.filter((r) => r !== undefined)
							.map((r) => (Array.isArray(r) ? `[${r[0]}-${r[1]}]` : `[${r}]`))
							.join(', ');
						patternMatches = ruleDescription.includes(rangeStr);
					} else {
						// Single range
						const rangeStr = `[${rule.range[0]}-${rule.range[1]}]`;
						patternMatches = ruleDescription.includes(rangeStr);
					}
				} else if (rule.match) {
					if (typeof rule.match === 'string') {
						patternMatches = ruleDescription.includes(`"${rule.match}"`);
					} else if (rule.match instanceof RegExp) {
						patternMatches = ruleDescription.includes(rule.match.toString());
					}
				}

				// Now check if the action also matches
				if (patternMatches) {
					// Check for token + state
					if (rule.token && rule.state) {
						if (
							ruleDescription.includes(`→ ${rule.token}`) &&
							ruleDescription.includes(`↓ ${rule.state}`)
						) {
							return rule;
						}
					}
					// Check for just token
					else if (rule.token && !rule.state) {
						if (ruleDescription.includes(`→ ${rule.token}`)) {
							return rule;
						}
					}
					// Check for just state
					else if (!rule.token && rule.state) {
						if (ruleDescription.includes(`↓ ${rule.state}`)) {
							return rule;
						}
					}
					// Check for exit
					else if (rule.exit) {
						if (ruleDescription.includes('↑ exit')) {
							return rule;
						}
					}
				}
			}

			// Second pass: match by action only (less precise)
			for (let i = 0; i < rules.length; i++) {
				const rule = rules[i];

				// Check for token match
				if (rule.token && ruleDescription.includes(`→ ${rule.token}`)) {
					// Also check state if present
					if (rule.state && ruleDescription.includes(`↓ ${rule.state}`)) {
						return rule;
					}
					// If no state transition in rule, still could be a match
				}

				// Check for state push without token
				if (!rule.token && rule.state && ruleDescription.includes(`↓ ${rule.state}`)) {
					// Make sure it's not matching a different pattern
					// Only return if no better match was found
					continue; // Skip this for now, will return in third pass
				}

				// Check for exit rules
				if (rule.exit && ruleDescription.includes('↑ exit')) {
					return rule;
				}
			}

			// Try pattern matching as fallback
			for (const rule of rules) {
				// Check for range patterns
				if (rule.range && ruleDescription.includes('[') && ruleDescription.includes('-')) {
					return rule;
				}

				// Check for exact string matches
				if (
					rule.match &&
					typeof rule.match === 'string' &&
					ruleDescription.includes(`"${rule.match}"`)
				) {
					return rule;
				}
			}

			// Return first rule as last resort
			return rules[0] || null;
		}

		return null;
	}

	// Toggle expansion of a route step
	function toggleStepExpansion(stepIndex: number) {
		if (expandedSteps.has(stepIndex)) {
			expandedSteps.delete(stepIndex);
		} else {
			expandedSteps.add(stepIndex);
		}
	}

	// Get only the current active route (from last time we returned to main)
	let activeRoute = $derived.by(() => {
		const route = get_full_route(position);
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

	let rightPanelView = $state('tokens'); // 'tokens' or 'route'

	let html_container: HTMLSpanElement;

	function handle_scrub(event: Event & Event & { currentTarget: EventTarget & HTMLInputElement }) {
		if (html_container === undefined || html_container === null) return;
		const text_node = html_container.firstChild;
		if (text_node === undefined || text_node === null) return;
		position = +event.currentTarget.value;
		r.setStart(text_node, position);
		r.setEnd(text_node, +position + 1);
	}

	const token_ranges: Range[] = [];
	const nl_locations: DOMRect[] = [];
	const NL = '\n'.charCodeAt(0);

	function syntax_highlight() {
		if (!tokens) return;
		token_ranges.length = 0;

		const text_node = html_container.firstChild;
		if (text_node === undefined || text_node === null) return;
		let highlights: Record<string, Highlight> = {};
		for (let i = 0; i < tokens.tokenTypes.length; i++) {
			const token_type = tokens.tokenTypes[i];
			highlights[token_type] = new Highlight();
			CSS.highlights.set(token_type, highlights[token_type]);
		}

		for (let i = 0; i < tokens.tokens.length; i += 3) {
			const token_code = tokens.tokens[i];
			const token_type = tokens.tokenTypes[token_code];
			const start = tokens.tokens[i + 1];
			const end = tokens.tokens[i + 2];

			const r = new Range();
			r.setStart(text_node, start);
			r.setEnd(text_node, end);
			highlights[token_type].add(r);
			token_ranges.push(r);

			if (token_type === 'whitespace') {
				// console.log('TOKEN', start, end);
				const box = r.getBoundingClientRect();

				let i = 0;
				for (let j = start; j < end; j++) {
					if (source !== undefined && source.charCodeAt(j) === NL) {
						const top = box?.top - box?.height;
						const bottom = box?.bottom;

						nl_locations.push({
							top,
							bottom,
							width: box?.width,
							height: box?.height
						} as DOMRect);
						i++;
					}
				}
			}
		}
	}

	$effect(() => {
		data;
		syntax_highlight();
	});

	const spring_config = {
		damping: 1,
		mass: 1,
		stiffness: 0.6
	};

	let highlight_top = new Spring(0, spring_config);
	let highlight_left = new Spring(0, spring_config);
	let highlight_width = new Spring(0, spring_config);
	let highlight_height = new Spring(0, spring_config);
	let selected_token = $state(0);

	function highlight_token(i: number) {
		const parent = html_container.parentElement;
		if (parent === undefined || parent === null) return;
		const parent_box = parent.getBoundingClientRect();

		const selected_range = token_ranges[i];
		if (!selected_range) return;

		const box = selected_range.getBoundingClientRect();

		// Get the scroll position of the code container
		const container_scroll_top = parent.scrollTop;
		const container_scroll_left = parent.scrollLeft;

		// Calculate position relative to the scrollable container
		// Add back the scroll offset since the highlight is positioned absolutely within the scrolled content
		highlight_top.set(box.top - parent_box.top + container_scroll_top - 1);
		highlight_left.set(box.left - parent_box.left + container_scroll_left - 1);
		highlight_width.set(box.width + 1);
		highlight_height.set(box.height + 1);
		selected_token = i;
	}

	let tokens_container: HTMLButtonElement[] = [];

	function handle_keydown(event: KeyboardEvent) {
		event.preventDefault();
		if (!tokens_container[selected_token]) return;

		if (event.key === 'ArrowUp') {
			highlight_token(selected_token - 1);
		} else if (event.key === 'ArrowDown') {
			highlight_token(selected_token + 1);
		}
		const t = tokens_container[selected_token].getBoundingClientRect();
		const container_rect = tokens_container[selected_token]!.parentElement!.getBoundingClientRect();
		const is_in_view = t.top > container_rect.top && t.bottom < container_rect.bottom;

		if (!is_in_view) {
			tokens_container[selected_token].scrollIntoView({ behavior: 'smooth' });
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
		}
	}

	$effect(() => {
		window.addEventListener('keydown', handleGlobalKeydown);
		return () => window.removeEventListener('keydown', handleGlobalKeydown);
	});

	function handle_token_click(e: MouseEvent) {
		// find clicked rnage + highlight
		const x = e.clientX;
		const y = e.clientY;

		const z = token_ranges.findIndex((range) => {
			const box = range.getBoundingClientRect();
			const is_in_box = x > box.left && x < box.right && y > box.top && y < box.bottom;

			return is_in_box;
		});

		const t = tokens_container[z].getBoundingClientRect();
		console.log('t', t, tokens_container[z]);
		const container_rect = tokens_container[z]!.parentElement!.getBoundingClientRect();
		console.log('container_rect', container_rect, tokens_container[z]!.parentElement);
		const is_in_view = t.top > container_rect.top && t.bottom < container_rect.bottom;
		console.log('is_in_view', is_in_view);
		if (!is_in_view) {
			tokens_container[z].scrollIntoView({
				behavior: 'smooth',
				block: 'nearest'
			});
		}
		if (z !== -1) {
			highlight_token(z);
		}
	}
</script>

<div class="page-wrapper">
	<div class="test-header">
		<div class="breadcrumbs">
			<a href="/" class="breadcrumb-link">Home</a>
			<span class="breadcrumb-separator">/</span>
			<a href="/{data.lang}" class="breadcrumb-link">{data.lang}</a>
			<span class="breadcrumb-separator">/</span>
			<span class="breadcrumb-current">{data.test}</span>
		</div>

		<div class="file-selector">
			<label for="file-select">Test file:</label>
			<select id="file-select" onchange={(e) => handleChange(e)} class="select-input">
				{#each data.css_files as [file]}
					<option value={file} selected={file === data.test}>{file}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="main-content">
		<div class="code-panel">
			<h3 class="panel-title">Code</h3>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<pre class="highlight" onclick={handle_token_click}><div
					class="highlight-container"
					style="
				--top: {highlight_top.current}px; 
				--left: {highlight_left.current}px; 
				--width: {highlight_width.current}px; 
					--height: {highlight_height.current}px;"></div><span class="code-inner" bind:this={html_container}
					>{source}</span
				></pre>
		</div>

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
			</div>

			{#if rightPanelView === 'tokens' && source && tokens}
				<div class="tokens-panel">
					<div class="tokens-list">
						{#each getTokens(source, tokens) as token, i}
							<button
								bind:this={tokens_container[i]}
								class:selected={i === selected_token}
								onclick={() => highlight_token(i)}
								onkeydown={handle_keydown}
							>
								<code>
									<span class="value">{token.value}</span>
									<span class="type {token.type}">({token.type})</span>
								</code>
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<div class="route-panel">
					<!-- <div class="route-overview">
						<h4 class="section-title">Current Route</h4>
						<div class="route-path">{activeRouteString}</div>
					</div> -->
					<div class="route-steps">
						{#each activeRoute as step, i}
							{@const ruleDefinition = getRuleDefinition(step)}
							{@const isExpanded = expandedSteps.has(i)}
							<div class="route-step-container">
								<button
									class="route-step {step.type.toLowerCase()}"
									class:active={step.position <= position &&
										(i === activeRoute.length - 1 || activeRoute[i + 1].position > position)}
									class:expanded={isExpanded}
									onclick={() => toggleStepExpansion(i)}
								>
									{#if step.rule}
										<span class="expand-icon"> ▶</span>
									{/if}
									{#if step.type === 'START'}
										<span class="step-icon">🏁</span>
										<span class="step-label">Start in</span>
										<span class="step-state">{step.stateName}</span>
									{:else if step.type === 'PUSH'}
										<span class="step-icon">→</span>
										<span class="step-label">Enter</span>
										<span class="step-state">{step.toName}</span>
										{#if step.tokenEmitted}
											<span class="token-indicator" title="Token emitted">📝</span>
										{/if}
										<span class="step-depth">(depth: {step.depth})</span>
									{:else if step.type === 'POP'}
										<span class="step-icon">←</span>
										<span class="step-label">Exit to</span>
										<span class="step-state">{step.toName}</span>
										{#if step.tokenEmitted}
											<span class="token-indicator" title="Token emitted">📝</span>
										{/if}
										<span class="step-depth">(depth: {step.depth})</span>
									{:else if step.type === 'TRANSITION'}
										<span class="step-icon">→</span>
										<span class="step-label">Transition to</span>
										<span class="step-state">{step.toName}</span>
										{#if step.tokenEmitted}
											<span class="token-indicator" title="Token emitted">📝</span>
										{/if}
									{/if}
									<!-- {#if step.rule}
										<span class="step-rule" title="Rule that triggered this transition">
											[{step.rule}]
										</span>
									{/if} -->
									<span class="step-position">@{step.position}</span>
								</button>

								{#if isExpanded && ruleDefinition}
									<div class="rule-details {step.type.toLowerCase()}">
										<div class="rule-content">
											<div class="rule-property">
												<span class="property-label">Pattern:</span>
												<span class="property-value">
													{#if ruleDefinition.match}
														{JSON.stringify(ruleDefinition.match)}
													{:else if ruleDefinition.range}
														[{ruleDefinition.range[0]}-{ruleDefinition.range[1]}]
													{:else}
														(no pattern)
													{/if}
												</span>
											</div>
											{#if ruleDefinition.token}
												<div class="rule-property">
													<span class="property-label">Token:</span>
													<span class="property-value">{ruleDefinition.token}</span>
												</div>
											{/if}
											{#if ruleDefinition.state}
												<div class="rule-property">
													<span class="property-label">Push to:</span>
													<span class="property-value">{ruleDefinition.state}</span>
												</div>
											{/if}
											{#if ruleDefinition.exit}
												<div class="rule-property">
													<span class="property-label">Action:</span>
													<span class="property-value">Exit (pop)</span>
												</div>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
	<div class="bottom-panel">
		<div class="inspector-controls">
			<div class="slider-section">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="slider-label">Position</label>
				<input
					type="range"
					min="0"
					max={source?.length ?? 1 - 1}
					value={position}
					oninput={handle_scrub}
					class="position-slider"
				/>
				<span class="position-value">{position}/{source?.length ?? 1 - 1}</span>
			</div>

			<div class="inspector-stats">
				<div class="stat-item">
					<span class="stat-label">Character:</span>
					<span class="stat-value">'{source?.[position] || 'EOF'}'</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">State:</span>
					<span class="stat-value">{analysis?.currentState}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Depth:</span>
					<span class="stat-value">{analysis?.depth}</span>
				</div>
			</div>
		</div>

		<div class="state-path-display">
			<span class="path-label">State Path:</span>
			<span class="path-value">{analysis?.statePath}</span>
		</div>

		<!-- {#if stateTransitions.length > 0}
			<div class="state-transitions-display">
				<div class="transitions-header">
					<span class="transitions-label">Transitions at position:</span>
					<span class="transitions-count">{stateTransitions.length}</span>
				</div>
				<div class="transitions-list">
					{#each stateTransitions as transition}
						{@const stateName = getStateNameFromTransition(transition)}
						<div class="transition-item">
							{#if transition.type === 'ENTER_PROBE'}
								<span class="transition-type probe">Probe</span>
								<span class="transition-detail">{stateName || transition.currentState}</span>
							{:else if transition.type === 'EXIT_PROBE'}
								<span class="transition-type probe-exit">Exit</span>
								<span class="transition-detail">
									{transition.success ? 'Success' : 'Fallback'} → {stateName ||
										transition.resetState ||
										'fallback'}
								</span>
							{:else if transition.type === 'PUSHED_STATE'}
								<span class="transition-type push">Push</span>
								<span class="transition-detail">{transition.fromState} → {transition.toState}</span>
							{:else if transition.type === 'POPPED_STATE'}
								<span class="transition-type pop">Pop</span>
								<span class="transition-detail">{transition.fromState} → {transition.toState}</span>
							{:else if transition.type === 'TRANSITIONED_STATE'}
								<span class="transition-type transition">Transition</span>
								<span class="transition-detail">{transition.fromState} → {transition.toState}</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if} -->
	</div>
</div>

<style>
	.page-wrapper {
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
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
		/* border-radius: 3px; */
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

	.main-content {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr 350px;
		gap: 2rem;
		padding: 1.5rem 0;
		overflow: hidden;
		min-height: 0;
	}

	.code-panel {
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
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
		/* border-radius: 4px 4px 0 0; */
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

	.tokens-panel,
	.route-panel {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
		min-height: 0;
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

	.tokens-list {
		flex: 1;
		/* background: var(--bg-secondary); */
		/* padding: 1rem; */
		padding-right: 0.5rem;
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		/* border: 1px solid var(--border); */
		/* border-radius: var(--radius-sm); */
	}

	.bottom-panel {
		background: var(--bg-secondary);
		border-top: 1px solid var(--border);
		padding: 1rem 2rem;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.inspector-controls {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.slider-section {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.slider-label {
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		min-width: 60px;
	}

	.position-slider {
		flex: 1;
		margin: 0;
	}

	.position-value {
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		min-width: 80px;
	}

	.inspector-stats {
		display: flex;
		gap: 1.5rem;
		flex-shrink: 0;
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.stat-label {
		color: var(--text-secondary);
		font-size: 0.875rem;
		flex-shrink: 0;
	}

	.stat-value {
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 500;
		min-width: 100px;
		max-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.state-transitions-display {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-light);
	}

	.transitions-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.transitions-label {
		color: var(--text-tertiary);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.transitions-count {
		background: var(--accent-dim);
		color: var(--accent);
		padding: 0.125rem 0.375rem;
		/* border-radius: 9999px; */
		font-size: 0.75rem;
		font-weight: 600;
	}

	.transitions-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.transition-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
		font-size: 0.8125rem;
	}

	.transition-type {
		padding: 0.125rem 0.375rem;
		/* border-radius: 4px; */
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		min-width: 4.5rem;
		text-align: center;
	}

	.transition-type.probe {
		background: rgba(78, 205, 196, 0.15);
		color: #4ecdc4;
	}

	.transition-type.probe-exit {
		background: rgba(255, 107, 107, 0.15);
		color: #ff6b6b;
	}

	.transition-type.push {
		background: rgba(0, 220, 130, 0.15);
		color: #00dc82;
	}

	.transition-type.pop {
		background: rgba(255, 107, 107, 0.15);
		color: #ff6b6b;
	}

	.transition-type.transition {
		background: rgba(78, 205, 196, 0.15);
		color: #4ecdc4;
	}

	.transition-detail {
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-size: 0.8125rem;
	}

	.state-path-display {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
		/* border-radius: 4px; */
	}

	.path-label {
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.path-value {
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		flex: 1;
	}

	.route-overview {
		padding: 0 1rem;
		margin-bottom: 1rem;
	}

	.inspector-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
	}

	.info-label {
		color: var(--text-secondary);
		font-weight: 500;
	}

	.info-value {
		color: var(--accent);
		font-family: var(--font-mono);
	}

	.state-section,
	.route-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.state-path,
	.route-path {
		color: var(--accent);
		font-size: 0.875rem;
		font-family: var(--font-mono);
		padding: 0.75rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
		/* border-radius: 4px; */
		word-break: break-all;
	}

	.route-steps {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		overflow-y: auto;
		padding: 0 01rem 0 0;
		min-height: 0;
	}

	.route-step-container {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.route-step {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: var(--bg-tertiary);
		/* border-radius: 4px; */
		font-size: 0.75rem;
		transition: all 0.2s ease;
		cursor: pointer;
		width: 100%;
		text-align: left;
		border: 1px solid var(--border);
		border-left: 5px solid transparent;

		outline: none;
	}

	.route-step.expanded {
		/* border-bottom-left-radius: 0;
		border-bottom-right-radius: 0; */
		border-bottom-color: var(--border-light);
	}

	.route-step:hover {
		background: var(--bg-hover);
		border-color: var(--border-light);
	}

	.route-step:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 2px var(--accent-dim);
	}

	.route-step.active {
		background: var(--accent-dim);
		border-color: var(--accent);
	}

	.route-step.start {
		border-left-color: var(--accent);
	}

	.route-step.push {
		border-left-color: #00dc82;
		margin-left: 0.5rem;
	}

	.route-step.pop {
		border-left-color: #ff6b6b;
	}

	.route-step.transition {
		border-left-color: #4ecdc4;
	}

	.step-icon {
		font-size: 1rem;
		width: 1.5rem;
		text-align: center;
		color: var(--text-secondary);
	}

	.step-label {
		color: var(--text-secondary);
		font-size: 0.7rem;
		min-width: 60px;
	}

	.step-state {
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-weight: 600;
	}

	.step-depth {
		color: var(--text-tertiary);
		font-size: 0.7rem;
		margin-left: auto;
	}

	.step-position {
		color: var(--text-tertiary);
		font-size: 0.7rem;
		font-family: var(--font-mono);
		margin-left: 0.5rem;
	}

	.step-rule {
		color: var(--text-secondary);
		font-size: 0.65rem;
		font-family: var(--font-mono);
		background: var(--bg-secondary);
		padding: 0.125rem 0.375rem;
		/* border-radius: 3px; */
		margin-left: 0.5rem;
		border: 1px solid var(--border);
	}

	.token-indicator {
		font-size: 0.8rem;
		margin-left: 0.25rem;
		opacity: 0.7;
	}

	.expand-icon {
		font-size: 0.7rem;
		color: var(--text-tertiary);
		margin-right: 0.25rem;
		transition: transform 0.2s ease;
	}

	.route-step.expanded .expand-icon {
		transform: rotate(90deg);
	}

	.rule-details {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-top: none;
		/* border-radius: 0 0 4px 4px; */
		padding: 0.75rem;
		margin-bottom: 0.25rem;
		width: 100%;
	}

	.rule-details.push {
		margin-left: 0.5rem;
	}

	.rule-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.rule-property {
		display: flex;
		gap: 0.75rem;
		font-size: 0.7rem;
		line-height: 1.4;
	}

	.property-label {
		color: var(--text-secondary);
		font-weight: 500;
		min-width: 80px;
		flex-shrink: 0;
	}

	.property-value {
		color: var(--accent);
		font-family: var(--font-mono);
		word-break: break-all;
		flex: 1;
	}

	.highlight-container {
		position: absolute;
		top: var(--top);
		left: var(--left);
		width: var(--width);
		height: var(--height);
		box-sizing: border-box;
		box-shadow:
			0 0 0 1px var(--accent),
			0 0 0 2px var(--bg-tertiary),
			0 0 20px var(--accent-dim);
		border-radius: 1px;
		z-index: 4;
		/* transform: scale(1.05);
		transform-origin: center; */
	}

	.highlight {
		flex: 1;
		position: relative;
		overflow: auto;
		margin: 0;
		max-height: 100%;
	}

	.code-inner {
		position: relative;
		z-index: 3;
	}

	:highlight {
		background-color: #eee;
	}

	::highlight(position) {
		/* border: 3px solid rgba(255, 255, 255, 0.7);
		border-color: rgba(255, 255, 255, 1); */
		text-decoration: underline;
		text-decoration-color: rgba(255, 255, 255, 1);
		text-decoration-thickness: 2px;
		text-underline-offset: 2px;
		text-decoration-skip-ink: none;
	}

	.tokens-list button {
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
		padding: 0;
		margin: 0;
		cursor: pointer;
		outline: none;
		/* border-radius: 3px; */
		transition: all 0.2s ease;
	}

	.tokens-list button:hover {
		background: var(--bg-hover);
		border-color: var(--border-light);
	}

	.tokens-list button.selected {
		background: var(--accent-dim);
		border-color: var(--accent);
	}

	.tokens-list code {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem;
		background: transparent;
	}

	.tokens-list .type {
		color: var(--text-tertiary);
		font-size: 0.75rem;
	}

	.tokens-list .value {
		color: var(--accent);
		font-weight: 500;
		font-size: 0.875rem;
		/* max-width: 150px;
		width: 150px; */
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		font-family: monospace;
		font-size: 1rem;
		font-weight: bold;
		color: #000;
		align-items: center;
	} */

	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		cursor: pointer;
	}

	input[type='range']::-webkit-slider-track {
		background: var(--bg-tertiary);
		height: 6px;
		/* border-radius: 3px; */
		border: 1px solid var(--border);
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		background: var(--accent);
		height: 16px;
		width: 16px;
		/* border-radius: 50%; */
		margin-top: -5px;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		transition: all 0.2s ease;
	}

	input[type='range']::-webkit-slider-thumb:hover {
		background: var(--accent-hover);
		transform: scale(1.1);
	}
</style>
