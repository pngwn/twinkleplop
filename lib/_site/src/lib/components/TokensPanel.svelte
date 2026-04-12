<script lang="ts">
	import type { TokenizeResult } from '@twinkleplop/core';

	interface Props {
		source: string;
		tokens: TokenizeResult;
		selected_token: number;
		on_token_select: (index: number) => void;
	}

	let { source, tokens, selected_token, on_token_select }: Props = $props();

	let tokens_container = $state<HTMLButtonElement[]>([]);

	function get_tokens(input: string, result: TokenizeResult) {
		const tokens_list = [];
		for (let i = 0; i < result.tokens.length / 3; i++) {
			const type = result.token_types[result.tokens[i * 3]];
			const start = result.tokens[i * 3 + 1];
			const end = result.tokens[i * 3 + 2];
			tokens_list.push({
				type,
				value: input.substring(start, end)
			});
		}
		return tokens_list;
	}

	function handle_keydown(event: KeyboardEvent) {
		event.preventDefault();
		if (!tokens_container[selected_token]) return;

		if (event.key === 'ArrowUp') {
			on_token_select(selected_token - 1);
		} else if (event.key === 'ArrowDown') {
			on_token_select(selected_token + 1);
		}

		const t = tokens_container[selected_token].getBoundingClientRect();
		const container_rect = tokens_container[selected_token]!.parentElement!.getBoundingClientRect();
		const is_in_view = t.top > container_rect.top && t.bottom < container_rect.bottom;

		if (!is_in_view) {
			tokens_container[selected_token].scrollIntoView({ behavior: 'smooth' });
		}
	}

	export function scroll_token_into_view(index: number) {
		if (!tokens_container[index]) return;
		const t = tokens_container[index].getBoundingClientRect();
		const container_rect = tokens_container[index]!.parentElement!.getBoundingClientRect();
		const is_in_view = t.top > container_rect.top && t.bottom < container_rect.bottom;
		if (!is_in_view) {
			tokens_container[index].scrollIntoView({
				behavior: 'smooth',
				block: 'nearest'
			});
		}
	}
</script>

<div class="tokens-panel">
	<div class="tokens-list">
		{#each get_tokens(source, tokens) as token, i}
			<button
				bind:this={tokens_container[i]}
				class:selected={i === selected_token}
				onclick={() => on_token_select(i)}
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