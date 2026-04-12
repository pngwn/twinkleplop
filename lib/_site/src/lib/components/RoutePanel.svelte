<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import type { RouteStep } from '@twinkleplop/core';

	interface Props {
		active_route: RouteStep[];
		position: number;
		raw_grammar: any;
	}

	let { active_route, position, raw_grammar }: Props = $props();

	let expanded_steps = $state(new SvelteSet());

	function get_rule_definition(step: RouteStep) {
		if (!step.rule || !raw_grammar || !raw_grammar.states || !step.from_name) {
			return null;
		}

		let from_state_name = step.from_name;
		let state_rules = raw_grammar?.states[from_state_name];

		if (!state_rules) {
			return null;
		}

		const rules = state_rules.rules || state_rules;
		if (!Array.isArray(rules)) {
			return null;
		}

		if (typeof step.rule === 'string' && step.rule.startsWith('rule_')) {
			const rule_index = parseInt(step.rule.replace('rule_', ''));
			if (rules[rule_index]) {
				return rules[rule_index];
			}
		} else if (typeof step.rule === 'number') {
			if (rules[step.rule]) {
				return rules[step.rule];
			}
		} else if (typeof step.rule === 'string') {
			const rule_description = step.rule;

			for (let i = 0; i < rules.length; i++) {
				const rule = rules[i];
				let pattern_matches = false;

				if (rule.range) {
					if (Array.isArray(rule.range[0])) {
						const range_str = rule.range
							.filter((r) => r !== undefined)
							.map((r) => (Array.isArray(r) ? `[${r[0]}-${r[1]}]` : `[${r}]`))
							.join(', ');
						pattern_matches = rule_description.includes(range_str);
					} else {
						const range_str = `[${rule.range[0]}-${rule.range[1]}]`;
						pattern_matches = rule_description.includes(range_str);
					}
				} else if (rule.match) {
					if (typeof rule.match === 'string') {
						pattern_matches = rule_description.includes(`"${rule.match}"`);
					} else if (rule.match instanceof RegExp) {
						pattern_matches = rule_description.includes(rule.match.toString());
					}
				}

				if (pattern_matches) {
					if (rule.token && rule.state) {
						if (
							rule_description.includes(`→ ${rule.token}`) &&
							rule_description.includes(`↓ ${rule.state}`)
						) {
							return rule;
						}
					}
					else if (rule.token && !rule.state) {
						if (rule_description.includes(`→ ${rule.token}`)) {
							return rule;
						}
					}
					else if (!rule.token && rule.state) {
						if (rule_description.includes(`↓ ${rule.state}`)) {
							return rule;
						}
					}
					else if (rule.exit) {
						if (rule_description.includes('↑ exit')) {
							return rule;
						}
					}
				}
			}

			return rules[0] || null;
		}

		return null;
	}

	function toggle_step_expansion(step_index: number) {
		if (expanded_steps.has(step_index)) {
			expanded_steps.delete(step_index);
		} else {
			expanded_steps.add(step_index);
		}
	}
</script>

<div class="route-panel">
	<div class="route-steps">
		{#each active_route as step, i}
			{@const rule_definition = get_rule_definition(step)}
			{@const is_expanded = expanded_steps.has(i)}
			<div class="route-step-container">
				<button
					class="route-step {step.type.toLowerCase()}"
					class:active={step.position <= position &&
						(i === active_route.length - 1 || active_route[i + 1].position > position)}
					class:expanded={is_expanded}
					onclick={() => toggle_step_expansion(i)}
				>
					{#if step.rule}
						<span class="expand-icon"> ▶</span>
					{/if}
					{#if step.type === 'START'}
						<span class="step-icon">🏁</span>
						<span class="step-label">Start in</span>
						<span class="step-state">{step.state_name}</span>
						{#if step.characters_processed}
							<span class="char-count" title="Characters processed in this state">({step.characters_processed} chars)</span>
						{/if}
					{:else if step.type === 'PUSH'}
						<span class="step-icon">{step.is_probe ? '🔍' : '→'}</span>
						<span class="step-label">{step.is_probe ? 'Probe' : 'Enter'}</span>
						<span class="step-state">{step.to_name}</span>
						{#if step.characters_processed}
							<span class="char-count" title="Characters processed in this state">({step.characters_processed} chars)</span>
						{/if}
						{#if step.token_emitted}
							<span class="token-indicator" title="Token emitted">📝</span>
						{/if}
						<span class="step-depth">(depth: {step.depth})</span>
					{:else if step.type === 'POP'}
						<span class="step-icon">←</span>
						<span class="step-label">Exit to</span>
						<span class="step-state">{step.to_name}</span>
						{#if step.token_emitted}
							<span class="token-indicator" title="Token emitted">📝</span>
						{/if}
						<span class="step-depth">(depth: {step.depth})</span>
					{:else if step.type === 'TRANSITION'}
						<span class="step-icon">→</span>
						<span class="step-label">Transition to</span>
						<span class="step-state">{step.to_name}</span>
						{#if step.token_emitted}
							<span class="token-indicator" title="Token emitted">📝</span>
						{/if}
					{/if}
					<span class="step-position">@{step.position}</span>
				</button>

				{#if is_expanded && rule_definition}
					<div class="rule-details {step.type.toLowerCase()}">
						<div class="rule-content">
							{#if step.entry_position !== undefined}
								<div class="rule-property">
									<span class="property-label">Entry Position:</span>
									<span class="property-value">@{step.entry_position}</span>
								</div>
							{/if}
							{#if step.rules_applied && step.rules_applied.length > 0}
								<div class="rule-property">
									<span class="property-label">Rules Applied:</span>
									<div class="rules-list">
										{#each step.rules_applied as { rule, count }}
											<div class="applied-rule">
												<span class="rule-text">{rule}</span>
												<span class="rule-count">×{count}</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}
							<div class="rule-property">
								<span class="property-label">Pattern:</span>
								<span class="property-value">
									{#if rule_definition.match}
										{JSON.stringify(rule_definition.match)}
									{:else if rule_definition.range}
										[{rule_definition.range[0]}-{rule_definition.range[1]}]
									{:else}
										(no pattern)
									{/if}
								</span>
							</div>
							{#if rule_definition.token}
								<div class="rule-property">
									<span class="property-label">Token:</span>
									<span class="property-value">{rule_definition.token}</span>
								</div>
							{/if}
							{#if rule_definition.state}
								<div class="rule-property">
									<span class="property-label">Push to:</span>
									<span class="property-value">{rule_definition.state}</span>
								</div>
							{/if}
							{#if rule_definition.exit}
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

<style>
	.route-panel {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
		min-height: 0;
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
	
	.char-count {
		color: var(--text-tertiary);
		font-size: 0.75rem;
		margin-left: 0.5rem;
	}
	
	.rules-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}
	
	.applied-rule {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.125rem 0.25rem;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 2px;
	}
	
	.rule-text {
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		flex: 1;
	}
	
	.rule-count {
		color: var(--text-tertiary);
		font-size: 0.65rem;
		margin-left: 0.5rem;
		font-weight: 600;
	}
</style>