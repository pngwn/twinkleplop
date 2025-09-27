<script lang="ts">
	import type { TokenizeResult } from '@twinkleplop/core';

	interface Props {
		source: string;
		tokens: TokenizeResult;
		selectedToken: number;
		onTokenSelect: (index: number) => void;
	}

	let { source, tokens, selectedToken, onTokenSelect }: Props = $props();

	let tokensContainer = $state<HTMLButtonElement[]>([]);

	function getTokens(input: string, result: TokenizeResult) {
		const tokensList = [];
		for (let i = 0; i < result.tokens.length / 3; i++) {
			const type = result.tokenTypes[result.tokens[i * 3]];
			const start = result.tokens[i * 3 + 1];
			const end = result.tokens[i * 3 + 2];
			tokensList.push({
				type,
				value: input.substring(start, end)
			});
		}
		return tokensList;
	}

	function handleKeydown(event: KeyboardEvent) {
		event.preventDefault();
		if (!tokensContainer[selectedToken]) return;

		if (event.key === 'ArrowUp') {
			onTokenSelect(selectedToken - 1);
		} else if (event.key === 'ArrowDown') {
			onTokenSelect(selectedToken + 1);
		}
		
		const t = tokensContainer[selectedToken].getBoundingClientRect();
		const containerRect = tokensContainer[selectedToken]!.parentElement!.getBoundingClientRect();
		const isInView = t.top > containerRect.top && t.bottom < containerRect.bottom;

		if (!isInView) {
			tokensContainer[selectedToken].scrollIntoView({ behavior: 'smooth' });
		}
	}

	export function scrollTokenIntoView(index: number) {
		if (!tokensContainer[index]) return;
		const t = tokensContainer[index].getBoundingClientRect();
		const containerRect = tokensContainer[index]!.parentElement!.getBoundingClientRect();
		const isInView = t.top > containerRect.top && t.bottom < containerRect.bottom;
		if (!isInView) {
			tokensContainer[index].scrollIntoView({
				behavior: 'smooth',
				block: 'nearest'
			});
		}
	}
</script>

<div class="tokens-panel">
	<div class="tokens-list">
		{#each getTokens(source, tokens) as token, i}
			<button
				bind:this={tokensContainer[i]}
				class:selected={i === selectedToken}
				onclick={() => onTokenSelect(i)}
				onkeydown={handleKeydown}
			>
				<code>
					<span class="value">{token.value}</span>
					<span class="type {token.type}">({token.type})</span>
				</code>
			</button>
		{/each}
	</div>
</div>

<style>
	.tokens-panel {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
		min-height: 0;
	}

	.tokens-list {
		flex: 1;
		padding-right: 0.5rem;
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.tokens-list button {
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
		padding: 0;
		margin: 0;
		cursor: pointer;
		outline: none;
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
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>