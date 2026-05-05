<script lang="ts">
	import { untrack } from "svelte";
	import { SvelteSet } from "svelte/reactivity";
	import Section from "./Section.svelte";
	import FaqRow from "./FaqRow.svelte";

	type faq_item = { q: string; a: import("svelte").Snippet };
	type faq_section = { id: string; title: string; items: faq_item[] };

	let {
		sections,
		initial_open,
	}: {
		sections: faq_section[];
		initial_open?: string;
	} = $props();

	const open_set = new SvelteSet<string>(
		untrack(() => (initial_open ? [initial_open] : [])),
	);
	let query = $state("");

	const total = $derived(sections.reduce((n, s) => n + s.items.length, 0));

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return sections;
		return sections
			.map((sec) => ({
				...sec,
				items: sec.items.filter((it) => it.q.toLowerCase().includes(q)),
			}))
			.filter((sec) => sec.items.length > 0);
	});

	$effect(() => {
		const q = query.trim().toLowerCase();
		if (!q) return;
		open_set.clear();
		for (const sec of sections) {
			sec.items.forEach((it, i) => {
				if (it.q.toLowerCase().includes(q)) open_set.add(`${sec.id}-${i}`);
			});
		}
	});

	const all_open = $derived(open_set.size === total);

	function toggle(key: string) {
		if (open_set.has(key)) open_set.delete(key);
		else open_set.add(key);
	}

	function expand_all() {
		for (const sec of sections) {
			sec.items.forEach((_, i) => open_set.add(`${sec.id}-${i}`));
		}
	}

	function collapse_all() {
		open_set.clear();
	}
</script>

<div class="search">
	<span class="prompt">?</span>
	<input
		type="text"
		placeholder="filter questions…"
		bind:value={query}
		spellcheck="false"
		autocomplete="off"
		aria-label="filter questions"
	/>
	{#if query}
		<button type="button" class="clear" onclick={() => (query = "")} aria-label="clear filter">
			[ x ]
		</button>
	{/if}
</div>

<div class="bar">
	<span class="count">{filtered.reduce((n, s) => n + s.items.length, 0)} / {total}</span>
	<button type="button" onclick={all_open ? collapse_all : expand_all}>
		{all_open ? "[ collapse all ]" : "[ expand all ]"}
	</button>
</div>

{#if filtered.length === 0}
	<div class="empty">
		no questions matched <span class="q-text">"{query}"</span>.
	</div>
{/if}

{#each filtered as section (section.id)}
	<Section id="s-{section.id}" title={section.title} num="§ {section.id}">
		<div class="list">
			{#each section.items as item, i (section.id + "-" + item.q)}
				<FaqRow
					question={item.q}
					answer={item.a}
					open={open_set.has(`${section.id}-${i}`)}
					onclick={() => toggle(`${section.id}-${i}`)}
				/>
			{/each}
		</div>
	</Section>
{/each}

<style>
	.search {
		display: flex;
		align-items: center;
		gap: 10px;
		background: var(--docs-bg-1);
		border: 1px solid var(--docs-line);
		border-radius: 3px;
		padding: 8px 12px;
		margin: 18px 0 6px;
		transition: border-color 0.15s ease;
	}
	.search:focus-within {
		border-color: var(--docs-fg-mute);
	}
	.search .prompt {
		color: var(--docs-accent);
		font-weight: 600;
		font-family: var(--docs-mono);
	}
	.search input {
		flex: 1;
		background: transparent;
		border: 0;
		outline: 0;
		color: var(--docs-fg);
		font: inherit;
		font-family: var(--docs-mono);
		font-size: var(--docs-fs-body);
		min-width: 0;
	}
	.search input::placeholder {
		color: var(--docs-fg-mute);
	}
	.search .clear {
		background: transparent;
		border: 0;
		color: var(--docs-fg-mute);
		font: inherit;
		font-family: var(--docs-mono);
		font-size: var(--docs-fs-xs);
		cursor: pointer;
		padding: 0;
		letter-spacing: 0.4px;
	}
	.search .clear:hover {
		color: var(--docs-fg);
	}

	.bar {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 14px;
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg-mute);
		margin: 0 0 6px;
	}
	.bar .count {
		font-family: var(--docs-mono);
		letter-spacing: 0.4px;
	}
	.bar button {
		background: transparent;
		border: 0;
		color: var(--docs-fg-mute);
		font: inherit;
		font-family: var(--docs-mono);
		font-size: var(--docs-fs-xs);
		cursor: pointer;
		padding: 2px 0;
		letter-spacing: 0.4px;
	}
	.bar button:hover {
		color: var(--docs-fg);
	}

	.empty {
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-body);
		padding: 32px 0;
		text-align: center;
		border-bottom: 1px solid var(--docs-line);
	}
	.empty .q-text {
		color: var(--docs-fg-dim);
	}

	.list {
		border-top: 1px solid var(--docs-line);
		margin-top: 4px;
	}
</style>
