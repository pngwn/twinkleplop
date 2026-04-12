<script>
	let count = $state(0);
	const double = $derived(count * 2);

	const increment = () => count++;
	const reset = () => (count = 0);
</script>

<style>
	.counter {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #111;
		border-radius: 8px;
	}

	.counter__value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--primary, #0070f3);
		min-width: 3rem;
		text-align: center;
	}

	.counter__button {
		padding: 0.5rem 1rem;
		background: var(--primary, #0070f3);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.counter__button:hover {
		filter: brightness(1.1);
	}
</style>

<div class="counter">
	<button class="counter__button" onclick={reset}>Reset</button>
	<span class="counter__value">{count}</span>
	<button class="counter__button" onclick={increment}>+1</button>
</div>

<p>Double: {double}</p>

{#if count > 10}
	<p class="warning">That's a lot of clicks!</p>
{:else if count > 0}
	<p>You've clicked {count} time{count === 1 ? '' : 's'}.</p>
{:else}
	<p>Click to start counting.</p>
{/if}
