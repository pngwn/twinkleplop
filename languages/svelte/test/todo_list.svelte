<script>
let items = $state([
	{ id: 1, text: "Ship Phase 3.5", done: true },
	{ id: 2, text: "Write architecture docs", done: true },
	{ id: 3, text: "Build a Svelte grammar", done: true },
	{ id: 4, text: "Drink coffee", done: false },
]);
let newItem = $state("");
const filter = $state("all");

const visible = $derived(
	filter === "all"
		? items
		: items.filter((item) => (filter === "done" ? item.done : !item.done)),
);

const remaining = $derived(items.filter((item) => !item.done).length);

function addItem() {
	if (!newItem.trim()) return;
	items = [...items, { id: Date.now(), text: newItem.trim(), done: false }];
	newItem = "";
}

function toggle(id) {
	items = items.map((item) =>
		item.id === id ? { ...item, done: !item.done } : item,
	);
}

function remove(id) {
	items = items.filter((item) => item.id !== id);
}
</script>

<style>
	.todo {
		max-width: 28rem;
		margin: 2rem auto;
		font-family: system-ui, sans-serif;
		background: #111;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.todo h1 {
		margin: 0 0 1rem;
		color: #fff;
	}

	.todo__form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.todo__input {
		flex: 1;
		padding: 0.5rem;
		background: #1a1a1a;
		border: 1px solid #333;
		color: #eaeaea;
		border-radius: 4px;
	}

	.todo__list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.todo__item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid #222;
	}

	.todo__item--done .todo__text {
		text-decoration: line-through;
		color: #666;
	}

	.todo__text {
		flex: 1;
		color: #eaeaea;
	}

	.todo__filters {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.todo__filter {
		padding: 0.25rem 0.75rem;
		background: transparent;
		border: 1px solid #333;
		color: #aaa;
		border-radius: 4px;
		cursor: pointer;
	}

	.todo__filter--active {
		background: #0070f3;
		color: white;
		border-color: #0070f3;
	}

	.todo__remaining {
		margin-top: 1rem;
		color: #888;
		font-size: 0.875rem;
	}
</style>

<div class="todo">
	<h1>Todo ({remaining} remaining)</h1>

	<form class="todo__form" onsubmit={addItem}>
		<input
			class="todo__input"
			type="text"
			bind:value={newItem}
			placeholder="What needs doing?"
		/>
		<button type="submit">Add</button>
	</form>

	{#if visible.length === 0}
		<p>Nothing to show — add an item or change the filter.</p>
	{:else}
		<ul class="todo__list">
			{#each visible as item (item.id)}
				<li
					class="todo__item"
					class:todo__item--done={item.done}
				>
					<input
						type="checkbox"
						checked={item.done}
						onchange={() => toggle(item.id)}
					/>
					<span class="todo__text">{item.text}</span>
					<button onclick={() => remove(item.id)}>×</button>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="todo__filters">
		{#each ['all', 'active', 'done'] as f}
			<button
				class="todo__filter"
				class:todo__filter--active={filter === f}
				onclick={() => (filter = f)}
			>
				{f}
			</button>
		{/each}
	</div>

	<p class="todo__remaining">
		{#if remaining === 0}
			Everything done!
		{:else if remaining === 1}
			1 item left
		{:else}
			{remaining} items left
		{/if}
	</p>
</div>
