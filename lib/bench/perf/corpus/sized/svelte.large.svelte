<script lang="ts">
  import { Greeter } from "./greeter.js";
  let count = $state(0);
  let active = $state(true);
  let doubled = $derived(count * 2);
  const re = /^[a-z]+$/i;
  const g = new Greeter("hello");
  const tpl = `greeting=${g.prefix}`;
  function inc() { count += 1; }
</script>

<style>
  :root { --fg: #1f2328; }
  button.primary { color: var(--fg); padding: 0.5rem 1rem; }
</style>

<!-- interactive counter -->
<main class="root" use:tooltip>
  <h1>Count: {count} (x2 = {doubled})</h1>
  <button class="primary" onclick={inc}>click me</button>

  {#if count > 0 && active}
    <p>non-zero</p>
  {:else}
    <p>zero</p>
  {/if}

  {#each [1, 2, 3] as n (n)}
    <span>{n}</span>
  {/each}
</main>

<script lang="ts">
	interface Props {
		source: string | undefined;
		position: number;
		analysis: any;
		on_position_change: (position: number) => void;
	}

	let { source, position, analysis, on_position_change }: Props = $props();

	let r: Range;
	let hl: Highlight;
	if (typeof window !== 'undefined') {
		hl = new Highlight();
		CSS.highlights.set('position', hl);
		r = new Range();
		hl.add(r);
	}

	function handle_scrub(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const new_position = +event.currentTarget.value;
		on_position_change(new_position);
	}
</script>

<div class="bottom-panel">
	<div class="inspector-controls">
		<div class="slider-section">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label class="slider-label">Position</label>
			<button onclick={() => on_position_change(position - 1)}>-</button>
			<input
				type="range"
				min="0"
				max={source?.length ?? 1 - 1}
				value={position}
				oninput={handle_scrub}
				class="position-slider"
			/>
			<button onclick={() => on_position_change(position + 1)}>+</button>
			<span class="position-value">{position}/{source?.length ?? 1 - 1}</span>
		</div>

		<div class="inspector-stats">
			<div class="stat-item">
				<span class="stat-label">Character:</span>
				<span class="stat-value">'{source?.[position] || 'EOF'}'</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">State:</span>
				<span class="stat-value">{analysis?.current_state}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Depth:</span>
				<span class="stat-value">{analysis?.depth}</span>
			</div>
		</div>
	</div>

	<div class="state-path-display">
		<span class="path-label">State Path:</span>
		<span class="path-value">{analysis?.state_path}</span>
	</div>
</div>

<style>
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

	.state-path-display {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
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

	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		cursor: pointer;
	}

	input[type='range']::-webkit-slider-track {
		background: var(--bg-tertiary);
		height: 6px;
		border: 1px solid var(--border);
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		background: var(--accent);
		height: 16px;
		width: 16px;
		margin-top: -5px;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		transition: all 0.2s ease;
	}

	input[type='range']::-webkit-slider-thumb:hover {
		background: var(--accent-hover);
		transform: scale(1.1);
	}
</style>

<script lang="ts">
	import { Spring } from 'svelte/motion';
	import type { TokenizeResult } from '@twinkleplop/core';

	interface Props {
		source: string | undefined;
		tokens: TokenizeResult | undefined;
		on_token_click: (token_index: number) => void;
	}

	let { source, tokens, on_token_click }: Props = $props();

	let html_container = $state<HTMLSpanElement>();
	let token_ranges: Range[] = [];

	const spring_config = {
		damping: 1,
		mass: 1,
		stiffness: 0.6
	};

	let highlight_top = new Spring(0, spring_config);
	let highlight_left = new Spring(0, spring_config);
	let highlight_width = new Spring(0, spring_config);
	let highlight_height = new Spring(0, spring_config);

	export function highlight_token(i: number) {
		const parent = html_container?.parentElement;
		if (!parent) return;
		const parent_box = parent.getBoundingClientRect();

		const selected_range = token_ranges[i];
		if (!selected_range) return;

		const box = selected_range.getBoundingClientRect();

		// get the scroll position of the code container
		const container_scroll_top = parent.scrollTop;
		const container_scroll_left = parent.scrollLeft;

		// calculate position relative to the scrollable container
		highlight_top.set(box.top - parent_box.top + container_scroll_top - 1);
		highlight_left.set(box.left - parent_box.left + container_scroll_left - 1);
		highlight_width.set(box.width + 1);
		highlight_height.set(box.height + 1);
	}

	function syntax_highlight() {
		if (!tokens || !html_container) return;
		token_ranges.length = 0;

		const text_node = html_container.firstChild;
		if (!text_node) return;

		// markdown emits compound token types like `"bold italic"` that
		// carry multiple active-style classes in one string. split on
		// whitespace and register the range with each individual highlight
		// so `::highlight(bold)` and `::highlight(italic)` both target it.
		// non-compound types (the common case for every other language)
		// split into a single-element array — unchanged behaviour.
		const highlights: Record<string, Highlight> = {};
		const ensure_highlight = (name: string): Highlight => {
			let h = highlights[name];
			if (!h) {
				h = new Highlight();
				highlights[name] = h;
				CSS.highlights.set(name, h);
			}
			return h;
		};

		for (let i = 0; i < tokens.tokens.length; i += 3) {
			const token_code = tokens.tokens[i];
			const token_type = tokens.token_types[token_code];
			console.log({token_type})
			const start = tokens.tokens[i + 1];
			const end = tokens.tokens[i + 2];

			const r = new Range();
			r.setStart(text_node, start);
			r.setEnd(text_node, end);
			token_ranges.push(r);

			for (const name of token_type.split(/\s+/)) {
				if (name) ensure_highlight(name).add(r);
			}
		}
	}

	function handle_token_click(e: MouseEvent) {
		const x = e.clientX;
		const y = e.clientY;

		const token_index = token_ranges.findIndex((range) => {
			const box = range.getBoundingClientRect();
			return x > box.left && x < box.right && y > box.top && y < box.bottom;
		});

		if (token_index !== -1) {
			on_token_click(token_index);
		}
	}

	$effect(() => {
		syntax_highlight();
	});
</script>

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

<style>
	.code-panel {
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
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
		text-decoration: underline;
		text-decoration-color: rgba(255, 255, 255, 1);
		text-decoration-thickness: 2px;
		text-underline-offset: 2px;
		text-decoration-skip-ink: none;
	}
</style>

<script>
const url = $state("/api/users");

async function fetchUsers() {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}
	return response.json();
}

let promise = $state(fetchUsers());

function refresh() {
	promise = fetchUsers();
}
</script>

<style>
	.user-list {
		padding: 1rem;
		background: #0a0a0a;
		border-radius: 8px;
		color: #eaeaea;
	}

	.user-list__loading,
	.user-list__error {
		padding: 2rem;
		text-align: center;
	}

	.user-list__error {
		color: #ef4444;
	}

	.user-list__items {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.user-list__item {
		padding: 0.75rem;
		border-bottom: 1px solid #222;
	}

	.user-list__item:last-child {
		border-bottom: none;
	}

	.user-list__name {
		font-weight: 600;
		color: #fff;
	}

	.user-list__email {
		color: #888;
		font-size: 0.875rem;
	}
</style>

<div class="user-list">
	<h2>Users</h2>
	<button onclick={refresh}>Refresh</button>

	{#await promise}
		<p class="user-list__loading">Loading…</p>
	{:then users}
		{#if users.length === 0}
			<p>No users found.</p>
		{:else}
			<ul class="user-list__items">
				{#each users as user (user.id)}
					<li class="user-list__item">
						<span class="user-list__name">{user.name}</span>
						<span class="user-list__email">{user.email}</span>
					</li>
				{/each}
			</ul>
		{/if}
	{:catch error}
		<p class="user-list__error">
			Failed to load: {error.message}
		</p>
	{/await}
</div>

{@html rawMarkup}
{@const doubled = count * 2}
{@debug user, profile}
{@render row(item, 0)}

<input bind:value={name} bind:this={el} />
<button on:click={handler}>go</button>
<button on:click|preventDefault|stopPropagation={handler}>stop</button>
<div use:action={params}>hi</div>
<div transition:fade={{duration: 200}}>hi</div>
<div transition:fade|local>hi</div>
<div in:fly out:fly animate:flip>hi</div>
<li class:active={isActive} class:done>item</li>
<span style:color={c} style:font-weight|important={w}>hi</span>
<div let:item let:index={i}>hi</div>

<Component {value} {title} />
<input {disabled} {placeholder} />

<div class="foo {bar} baz">hi</div>
<img src="/img/{id}.png" alt='icon-{id}' />
<a title="plain" href='/{path}/end'>link</a>

{#await promise}
	<p>loading</p>
{:then value}
	<p>{value}</p>
{:catch err}
	<p>{err.message}</p>
{/await}

{#await fetchInline() then v}
	<p>{v}</p>
{/await}

{#each items as {id, name}}
	<li>{id}: {name}</li>
{/each}

{#each pairs as [k, v]}
	<li>{k}={v}</li>
{/each}

{#each items as {data: {name}}}
	<li>{name}</li>
{/each}

{#each items.filter((x) => x.active) as item}
	<li>{item}</li>
{/each}

{#each items as item (`row-${item.id}`)}
	<li>{item}</li>
{/each}

{#each (pairs as SomeType<T>) as [k, v]}
	<li>{k}={v}</li>
{/each}

{#each arr.filter(b => (1, 2, "}")) as t as id, i (`${id + 1}_key`)}
	<li>{id}</li>
{/each}

{#if user?.permissions?.admin}
	<p>welcome</p>
{:else if x instanceof Foo}
	<p>foo</p>
{/if}

{#await api.load().then(parse)}
	<p>loading</p>
{:then {name, age}}
	<p>{name} {age}</p>
{/await}

{#snippet row({id, name})}
	<tr><td>{id}</td><td>{name}</td></tr>
{/snippet}

{#snippet head(...cols)}
	<tr>{cols.join(",")}</tr>
{/snippet}

{#snippet cell(data = {})}
	<td>{data.value}</td>
{/snippet}

{@const label = `${count} items`}
{@const pair = [first, second]}

{#if x /* > }? */ > 0}
	<p>positive</p>
{/if}


{#each arr.filter(b => ({
  a: 1,
  /* > }? */  c: "}"
})) as A<B> as C as D, i (html`<h1>hi</h1>` + "}")}
	<li>{id}</li>
{/each}




{#each items as item, i (item.id)}
	<li>{item.name}</li>
{:else}
	<li>empty</li>
{/each}

<!-- block heads share the same brace-tracking as `{expression}`: strings, -->
<!-- `//…\n` / `/*…*/` comments, and nested `{...}` are handled. regex -->
<!-- literals are not, so inputs below are captured incorrectly. -->

<!-- 1. regex literal containing `}` inside an `#if` head closes early. -->
{#if /}/.test(s)}
	<p>matched</p>
{/if}

<!-- 2. same failure mode inside an `#each` iterable. -->
{#each items.filter((x) => /}/.test(x)) as item}
	<li>{item}</li>
{/each}

<!-- 3. same failure mode inside an `@const` body. -->
{@const marker = /}/}

{#if count > 10}
	<p>lots</p>
{:else if count > 0}
	<p>some</p>
{:else}
	<p>none</p>
{/if}

{#key version}
	<Component />
{/key}

{#snippet row(item, index)}
	<tr><td>{index}</td><td>{item.name}</td></tr>
{/snippet}

{@render row(user, 0)}

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

<p>Hello {name}!</p>
<p>{count === 1 ? 'one' : 'many'}</p>
<p>{fn({a: 1, b: 2})}</p>
<p>{"has } brace"}</p>
<p>{`hi ${x}`}</p>
<p>{list.map((x) => x * 2).join(", ")}</p>
<p>{foo?.bar ?? "none"}</p>
<p>{[...arr, "more"]}</p>
<p>{({a: 1, b: {c: 2}})}</p>
<p>{list.map(({id, name}) => name)}</p>
<p>{html`<b>${x}</b>`}</p>
<p>{await promise}</p>
<p>{value as SomeType}</p>
<p>{fn<T>(x)}</p>
<p>{x /* inline } note */ + 1}</p>
<p>{x // trailing } note
}</p>

<!-- documented grammar-level limitations. the expression body skips `"` -->
<!-- and `'` strings plus `//…\n` and `/*…*/` comments, and tracks nested -->
<!-- `{...}` via brace counting. regex literals are not recognized, so -->
<!-- inputs below are captured incorrectly for that reason. -->

<!-- 1. a regex whose first `/` sits immediately after `{` is read as the -->
<!-- close-block sigil (shared with `{/if}`, `{/each}`, etc). -->
<p>{/ab/.test(s)}</p>

<!-- 2. a regex literal containing `}` closes the expression early even -->
<!-- when the `/` is not at the start of the body. -->
<p>{x.match(/}/)}</p>

<script>let a = 1;</script>
<script lang="ts">let b: number = 2;</script>
<script module>export const c = 3;</script>

<style>p { color: red; }</style>
<style lang="scss">.a { .b { color: blue; } }</style>

<svelte:component this={Component} />
<svelte:element this={tagname}>hi</svelte:element>
<svelte:window on:resize={handler} />
<svelte:document on:keydown={handler} />
<svelte:body on:mousemove={handler} />
<svelte:head>
	<title>Page</title>
</svelte:head>
<svelte:self />
<svelte:fragment slot="named">content</svelte:fragment>
<svelte:boundary>hi</svelte:boundary>
<svelte:options customElement="my-el" />
<notsvelte:options customElement="my-el" />

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

<script lang="ts">
  import { Greeter } from "./greeter.js";
  let count = $state(0);
  let active = $state(true);
  let doubled = $derived(count * 2);
  const re = /^[a-z]+$/i;
  const g = new Greeter("hello");
  const tpl = `greeting=${g.prefix}`;
  function inc() { count += 1; }
</script>

<style>
  :root { --fg: #1f2328; }
  button.primary { color: var(--fg); padding: 0.5rem 1rem; }
</style>

<!-- interactive counter -->
<main class="root" use:tooltip>
  <h1>Count: {count} (x2 = {doubled})</h1>
  <button class="primary" onclick={inc}>click me</button>

  {#if count > 0 && active}
    <p>non-zero</p>
  {:else}
    <p>zero</p>
  {/if}

  {#each [1, 2, 3] as n (n)}
    <span>{n}</span>
  {/each}
</main>

<script lang="ts">
	interface Props {
		source: string | undefined;
		position: number;
		analysis: any;
		on_position_change: (position: number) => void;
	}

	let { source, position, analysis, on_position_change }: Props = $props();

	let r: Range;
	let hl: Highlight;
	if (typeof window !== 'undefined') {
		hl = new Highlight();
		CSS.highlights.set('position', hl);
		r = new Range();
		hl.add(r);
	}

	function handle_scrub(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const new_position = +event.currentTarget.value;
		on_position_change(new_position);
	}
</script>

<div class="bottom-panel">
	<div class="inspector-controls">
		<div class="slider-section">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label class="slider-label">Position</label>
			<button onclick={() => on_position_change(position - 1)}>-</button>
			<input
				type="range"
				min="0"
				max={source?.length ?? 1 - 1}
				value={position}
				oninput={handle_scrub}
				class="position-slider"
			/>
			<button onclick={() => on_position_change(position + 1)}>+</button>
			<span class="position-value">{position}/{source?.length ?? 1 - 1}</span>
		</div>

		<div class="inspector-stats">
			<div class="stat-item">
				<span class="stat-label">Character:</span>
				<span class="stat-value">'{source?.[position] || 'EOF'}'</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">State:</span>
				<span class="stat-value">{analysis?.current_state}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Depth:</span>
				<span class="stat-value">{analysis?.depth}</span>
			</div>
		</div>
	</div>

	<div class="state-path-display">
		<span class="path-label">State Path:</span>
		<span class="path-value">{analysis?.state_path}</span>
	</div>
</div>

<style>
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

	.state-path-display {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
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

	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		cursor: pointer;
	}

	input[type='range']::-webkit-slider-track {
		background: var(--bg-tertiary);
		height: 6px;
		border: 1px solid var(--border);
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		background: var(--accent);
		height: 16px;
		width: 16px;
		margin-top: -5px;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		transition: all 0.2s ease;
	}

	input[type='range']::-webkit-slider-thumb:hover {
		background: var(--accent-hover);
		transform: scale(1.1);
	}
</style>

<script lang="ts">
	import { Spring } from 'svelte/motion';
	import type { TokenizeResult } from '@twinkleplop/core';

	interface Props {
		source: string | undefined;
		tokens: TokenizeResult | undefined;
		on_token_click: (token_index: number) => void;
	}

	let { source, tokens, on_token_click }: Props = $props();

	let html_container = $state<HTMLSpanElement>();
	let token_ranges: Range[] = [];

	const spring_config = {
		damping: 1,
		mass: 1,
		stiffness: 0.6
	};

	let highlight_top = new Spring(0, spring_config);
	let highlight_left = new Spring(0, spring_config);
	let highlight_width = new Spring(0, spring_config);
	let highlight_height = new Spring(0, spring_config);

	export function highlight_token(i: number) {
		const parent = html_container?.parentElement;
		if (!parent) return;
		const parent_box = parent.getBoundingClientRect();

		const selected_range = token_ranges[i];
		if (!selected_range) return;

		const box = selected_range.getBoundingClientRect();

		// get the scroll position of the code container
		const container_scroll_top = parent.scrollTop;
		const container_scroll_left = parent.scrollLeft;

		// calculate position relative to the scrollable container
		highlight_top.set(box.top - parent_box.top + container_scroll_top - 1);
		highlight_left.set(box.left - parent_box.left + container_scroll_left - 1);
		highlight_width.set(box.width + 1);
		highlight_height.set(box.height + 1);
	}

	function syntax_highlight() {
		if (!tokens || !html_container) return;
		token_ranges.length = 0;

		const text_node = html_container.firstChild;
		if (!text_node) return;

		// markdown emits compound token types like `"bold italic"` that
		// carry multiple active-style classes in one string. split on
		// whitespace and register the range with each individual highlight
		// so `::highlight(bold)` and `::highlight(italic)` both target it.
		// non-compound types (the common case for every other language)
		// split into a single-element array — unchanged behaviour.
		const highlights: Record<string, Highlight> = {};
		const ensure_highlight = (name: string): Highlight => {
			let h = highlights[name];
			if (!h) {
				h = new Highlight();
				highlights[name] = h;
				CSS.highlights.set(name, h);
			}
			return h;
		};

		for (let i = 0; i < tokens.tokens.length; i += 3) {
			const token_code = tokens.tokens[i];
			const token_type = tokens.token_types[token_code];
			console.log({token_type})
			const start = tokens.tokens[i + 1];
			const end = tokens.tokens[i + 2];

			const r = new Range();
			r.setStart(text_node, start);
			r.setEnd(text_node, end);
			token_ranges.push(r);

			for (const name of token_type.split(/\s+/)) {
				if (name) ensure_highlight(name).add(r);
			}
		}
	}

	function handle_token_click(e: MouseEvent) {
		const x = e.clientX;
		const y = e.clientY;

		const token_index = token_ranges.findIndex((range) => {
			const box = range.getBoundingClientRect();
			return x > box.left && x < box.right && y > box.top && y < box.bottom;
		});

		if (token_index !== -1) {
			on_token_click(token_index);
		}
	}

	$effect(() => {
		syntax_highlight();
	});
</script>

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

<style>
	.code-panel {
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
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
		text-decoration: underline;
		text-decoration-color: rgba(255, 255, 255, 1);
		text-decoration-thickness: 2px;
		text-underline-offset: 2px;
		text-decoration-skip-ink: none;
	}
</style>

<script>
const url = $state("/api/users");

async function fetchUsers() {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}
	return response.json();
}

let promise = $state(fetchUsers());

function refresh() {
	promise = fetchUsers();
}
</script>

<style>
	.user-list {
		padding: 1rem;
		background: #0a0a0a;
		border-radius: 8px;
		color: #eaeaea;
	}

	.user-list__loading,
	.user-list__error {
		padding: 2rem;
		text-align: center;
	}

	.user-list__error {
		color: #ef4444;
	}

	.user-list__items {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.user-list__item {
		padding: 0.75rem;
		border-bottom: 1px solid #222;
	}

	.user-list__item:last-child {
		border-bottom: none;
	}

	.user-list__name {
		font-weight: 600;
		color: #fff;
	}

	.user-list__email {
		color: #888;
		font-size: 0.875rem;
	}
</style>

<div class="user-list">
	<h2>Users</h2>
	<button onclick={refresh}>Refresh</button>

	{#await promise}
		<p class="user-list__loading">Loading…</p>
	{:then users}
		{#if users.length === 0}
			<p>No users found.</p>
		{:else}
			<ul class="user-list__items">
				{#each users as user (user.id)}
					<li class="user-list__item">
						<span class="user-list__name">{user.name}</span>
						<span class="user-list__email">{user.email}</span>
					</li>
				{/each}
			</ul>
		{/if}
	{:catch error}
		<p class="user-list__error">
			Failed to load: {error.message}
		</p>
	{/await}
</div>

{@html rawMarkup}
{@const doubled = count * 2}
{@debug user, profile}
{@render row(item, 0)}

<input bind:value={name} bind:this={el} />
<button on:click={handler}>go</button>
<button on:click|preventDefault|stopPropagation={handler}>stop</button>
<div use:action={params}>hi</div>
<div transition:fade={{duration: 200}}>hi</div>
<div transition:fade|local>hi</div>
<div in:fly out:fly animate:flip>hi</div>
<li class:active={isActive} class:done>item</li>
<span style:color={c} style:font-weight|important={w}>hi</span>
<div let:item let:index={i}>hi</div>

<Component {value} {title} />
<input {disabled} {placeholder} />

<div class="foo {bar} baz">hi</div>
<img src="/img/{id}.png" alt='icon-{id}' />
<a title="plain" href='/{path}/end'>link</a>

{#await promise}
	<p>loading</p>
{:then value}
	<p>{value}</p>
{:catch err}
	<p>{err.message}</p>
{/await}

{#await fetchInline() then v}
	<p>{v}</p>
{/await}

{#each items as {id, name}}
	<li>{id}: {name}</li>
{/each}

{#each pairs as [k, v]}
	<li>{k}={v}</li>
{/each}

{#each items as {data: {name}}}
	<li>{name}</li>
{/each}

{#each items.filter((x) => x.active) as item}
	<li>{item}</li>
{/each}

{#each items as item (`row-${item.id}`)}
	<li>{item}</li>
{/each}

{#each (pairs as SomeType<T>) as [k, v]}
	<li>{k}={v}</li>
{/each}

{#each arr.filter(b => (1, 2, "}")) as t as id, i (`${id + 1}_key`)}
	<li>{id}</li>
{/each}

{#if user?.permissions?.admin}
	<p>welcome</p>
{:else if x instanceof Foo}
	<p>foo</p>
{/if}

{#await api.load().then(parse)}
	<p>loading</p>
{:then {name, age}}
	<p>{name} {age}</p>
{/await}

{#snippet row({id, name})}
	<tr><td>{id}</td><td>{name}</td></tr>
{/snippet}

{#snippet head(...cols)}
	<tr>{cols.join(",")}</tr>
{/snippet}

{#snippet cell(data = {})}
	<td>{data.value}</td>
{/snippet}

{@const label = `${count} items`}
{@const pair = [first, second]}

{#if x /* > }? */ > 0}
	<p>positive</p>
{/if}


{#each arr.filter(b => ({
  a: 1,
  /* > }? */  c: "}"
})) as A<B> as C as D, i (html`<h1>hi</h1>` + "}")}
	<li>{id}</li>
{/each}




{#each items as item, i (item.id)}
	<li>{item.name}</li>
{:else}
	<li>empty</li>
{/each}

<!-- block heads share the same brace-tracking as `{expression}`: strings, -->
<!-- `//…\n` / `/*…*/` comments, and nested `{...}` are handled. regex -->
<!-- literals are not, so inputs below are captured incorrectly. -->

<!-- 1. regex literal containing `}` inside an `#if` head closes early. -->
{#if /}/.test(s)}
	<p>matched</p>
{/if}

<!-- 2. same failure mode inside an `#each` iterable. -->
{#each items.filter((x) => /}/.test(x)) as item}
	<li>{item}</li>
{/each}

<!-- 3. same failure mode inside an `@const` body. -->
{@const marker = /}/}

{#if count > 10}
	<p>lots</p>
{:else if count > 0}
	<p>some</p>
{:else}
	<p>none</p>
{/if}

{#key version}
	<Component />
{/key}

{#snippet row(item, index)}
	<tr><td>{index}</td><td>{item.name}</td></tr>
{/snippet}

{@render row(user, 0)}

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

<p>Hello {name}!</p>
<p>{count === 1 ? 'one' : 'many'}</p>
<p>{fn({a: 1, b: 2})}</p>
<p>{"has } brace"}</p>
<p>{`hi ${x}`}</p>
<p>{list.map((x) => x * 2).join(", ")}</p>
<p>{foo?.bar ?? "none"}</p>
<p>{[...arr, "more"]}</p>
<p>{({a: 1, b: {c: 2}})}</p>
<p>{list.map(({id, name}) => name)}</p>
<p>{html`<b>${x}</b>`}</p>
<p>{await promise}</p>
<p>{value as SomeType}</p>
<p>{fn<T>(x)}</p>
<p>{x /* inline } note */ + 1}</p>
<p>{x // trailing } note
}</p>

<!-- documented grammar-level limitations. the expression body skips `"` -->
<!-- and `'` strings plus `//…\n` and `/*…*/` comments, and tracks nested -->
<!-- `{...}` via brace counting. regex literals are not recognized, so -->
<!-- inputs below are captured incorrectly for that reason. -->

<!-- 1. a regex whose first `/` sits immediately after `{` is read as the -->
<!-- close-block sigil (shared with `{/if}`, `{/each}`, etc). -->
<p>{/ab/.test(s)}</p>

<!-- 2. a regex literal containing `}` closes the expression early even -->
<!-- when the `/` is not at the start of the body. -->
<p>{x.match(/}/)}</p>

<script>let a = 1;</script>
<script lang="ts">let b: number = 2;</script>
<script module>export const c = 3;</script>

<style>p { color: red; }</style>
<style lang="scss">.a { .b { color: blue; } }</style>

<svelte:component this={Component} />
<svelte:element this={tagname}>hi</svelte:element>
<svelte:window on:resize={handler} />
<svelte:document on:keydown={handler} />
<svelte:body on:mousemove={handler} />
<svelte:head>
	<title>Page</title>
</svelte:head>
<svelte:self />
<svelte:fragment slot="named">content</svelte:fragment>
<svelte:boundary>hi</svelte:boundary>
<svelte:options customElement="my-el" />
<notsvelte:options customElement="my-el" />

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

<script lang="ts">
  import { Greeter } from "./greeter.js";
  let count = $state(0);
  let active = $state(true);
  let doubled = $derived(count * 2);
  const re = /^[a-z]+$/i;
  const g = new Greeter("hello");
  const tpl = `greeting=${g.prefix}`;
  function inc() { count += 1; }
</script>

<style>
  :root { --fg: #1f2328; }
  button.primary { color: var(--fg); padding: 0.5rem 1rem; }
</style>

<!-- interactive counter -->
<main class="root" use:tooltip>
  <h1>Count: {count} (x2 = {doubled})</h1>
  <button class="primary" onclick={inc}>click me</button>

  {#if count > 0 && active}
    <p>non-zero</p>
  {:else}
    <p>zero</p>
  {/if}

  {#each [1, 2, 3] as n (n)}
    <span>{n}</span>
  {/each}
</main>

<script lang="ts">
	interface Props {
		source: string | undefined;
		position: number;
		analysis: any;
		on_position_change: (position: number) => void;
	}

	let { source, position, analysis, on_position_change }: Props = $props();

	let r: Range;
	let hl: Highlight;
	if (typeof window !== 'undefined') {
		hl = new Highlight();
		CSS.highlights.set('position', hl);
		r = new Range();
		hl.add(r);
	}

	function handle_scrub(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const new_position = +event.currentTarget.value;
		on_position_change(new_position);
	}
</script>

<div class="bottom-panel">
	<div class="inspector-controls">
		<div class="slider-section">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label class="slider-label">Position</label>
			<button onclick={() => on_position_change(position - 1)}>-</button>
			<input
				type="range"
				min="0"
				max={source?.length ?? 1 - 1}
				value={position}
				oninput={handle_scrub}
				class="position-slider"
			/>
			<button onclick={() => on_position_change(position + 1)}>+</button>
			<span class="position-value">{position}/{source?.length ?? 1 - 1}</span>
		</div>

		<div class="inspector-stats">
			<div class="stat-item">
				<span class="stat-label">Character:</span>
				<span class="stat-value">'{source?.[position] || 'EOF'}'</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">State:</span>
				<span class="stat-value">{analysis?.current_state}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Depth:</span>
				<span class="stat-value">{analysis?.depth}</span>
			</div>
		</div>
	</div>

	<div class="state-path-display">
		<span class="path-label">State Path:</span>
		<span class="path-value">{analysis?.state_path}</span>
	</div>
</div>

<style>
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

	.state-path-display {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
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

	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		cursor: pointer;
	}

	input[type='range']::-webkit-slider-track {
		background: var(--bg-tertiary);
		height: 6px;
		border: 1px solid var(--border);
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		background: var(--accent);
		height: 16px;
		width: 16px;
		margin-top: -5px;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		transition: all 0.2s ease;
	}

	input[type='range']::-webkit-slider-thumb:hover {
		background: var(--accent-hover);
		transform: scale(1.1);
	}
</style>

<script lang="ts">
	import { Spring } from 'svelte/motion';
	import type { TokenizeResult } from '@twinkleplop/core';

	interface Props {
		source: string | undefined;
		tokens: TokenizeResult | undefined;
		on_token_click: (token_index: number) => void;
	}

	let { source, tokens, on_token_click }: Props = $props();

	let html_container = $state<HTMLSpanElement>();
	let token_ranges: Range[] = [];

	const spring_config = {
		damping: 1,
		mass: 1,
		stiffness: 0.6
	};

	let highlight_top = new Spring(0, spring_config);
	let highlight_left = new Spring(0, spring_config);
	let highlight_width = new Spring(0, spring_config);
	let highlight_height = new Spring(0, spring_config);

	export function highlight_token(i: number) {
		const parent = html_container?.parentElement;
		if (!parent) return;
		const parent_box = parent.getBoundingClientRect();

		const selected_range = token_ranges[i];
		if (!selected_range) return;

		const box = selected_range.getBoundingClientRect();

		// get the scroll position of the code container
		const container_scroll_top = parent.scrollTop;
		const container_scroll_left = parent.scrollLeft;

		// calculate position relative to the scrollable container
		highlight_top.set(box.top - parent_box.top + container_scroll_top - 1);
		highlight_left.set(box.left - parent_box.left + container_scroll_left - 1);
		highlight_width.set(box.width + 1);
		highlight_height.set(box.height + 1);
	}

	function syntax_highlight() {
		if (!tokens || !html_container) return;
		token_ranges.length = 0;

		const text_node = html_container.firstChild;
		if (!text_node) return;

		// markdown emits compound token types like `"bold italic"` that
		// carry multiple active-style classes in one string. split on
		// whitespace and register the range with each individual highlight
		// so `::highlight(bold)` and `::highlight(italic)` both target it.
		// non-compound types (the common case for every other language)
		// split into a single-element array — unchanged behaviour.
		const highlights: Record<string, Highlight> = {};
		const ensure_highlight = (name: string): Highlight => {
			let h = highlights[name];
			if (!h) {
				h = new Highlight();
				highlights[name] = h;
				CSS.highlights.set(name, h);
			}
			return h;
		};

		for (let i = 0; i < tokens.tokens.length; i += 3) {
			const token_code = tokens.tokens[i];
			const token_type = tokens.token_types[token_code];
			console.log({token_type})
			const start = tokens.tokens[i + 1];
			const end = tokens.tokens[i + 2];

			const r = new Range();
			r.setStart(text_node, start);
			r.setEnd(text_node, end);
			token_ranges.push(r);

			for (const name of token_type.split(/\s+/)) {
				if (name) ensure_highlight(name).add(r);
			}
		}
	}

	function handle_token_click(e: MouseEvent) {
		const x = e.clientX;
		const y = e.clientY;

		const token_index = token_ranges.findIndex((range) => {
			const box = range.getBoundingClientRect();
			return x > box.left && x < box.right && y > box.top && y < box.bottom;
		});

		if (token_index !== -1) {
			on_token_click(token_index);
		}
	}

	$effect(() => {
		syntax_highlight();
	});
</script>

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

<style>
	.code-panel {
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
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
		text-decoration: underline;
		text-decoration-color: rgba(255, 255, 255, 1);
		text-decoration-thickness: 2px;
		text-underline-offset: 2px;
		text-decoration-skip-ink: none;
	}
</style>

<script>
const url = $state("/api/users");

async function fetchUsers() {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}
	return response.json();
}

let promise = $state(fetchUsers());

function refresh() {
	promise = fetchUsers();
}
</script>

<style>
	.user-list {
		padding: 1rem;
		background: #0a0a0a;
		border-radius: 8px;
		color: #eaeaea;
	}

	.user-list__loading,
	.user-list__error {
		padding: 2rem;
		text-align: center;
	}

	.user-list__error {
		color: #ef4444;
	}

	.user-list__items {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.user-list__item {
		padding: 0.75rem;
		border-bottom: 1px solid #222;
	}

	.user-list__item:last-child {
		border-bottom: none;
	}

	.user-list__name {
		font-weight: 600;
		color: #fff;
	}

	.user-list__email {
		color: #888;
		font-size: 0.875rem;
	}
</style>

<div class="user-list">
	<h2>Users</h2>
	<button onclick={refresh}>Refresh</button>

	{#await promise}
		<p class="user-list__loading">Loading…</p>
	{:then users}
		{#if users.length === 0}
			<p>No users found.</p>
		{:else}
			<ul class="user-list__items">
				{#each users as user (user.id)}
					<li class="user-list__item">
						<span class="user-list__name">{user.name}</span>
						<span class="user-list__email">{user.email}</span>
					</li>
				{/each}
			</ul>
		{/if}
	{:catch error}
		<p class="user-list__error">
			Failed to load: {error.message}
		</p>
	{/await}
</div>

{@html rawMarkup}
{@const doubled = count * 2}
{@debug user, profile}
{@render row(item, 0)}

<input bind:value={name} bind:this={el} />
<button on:click={handler}>go</button>
<button on:click|preventDefault|stopPropagation={handler}>stop</button>
<div use:action={params}>hi</div>
<div transition:fade={{duration: 200}}>hi</div>
<div transition:fade|local>hi</div>
<div in:fly out:fly animate:flip>hi</div>
<li class:active={isActive} class:done>item</li>
<span style:color={c} style:font-weight|important={w}>hi</span>
<div let:item let:index={i}>hi</div>

<Component {value} {title} />
<input {disabled} {placeholder} />

<div class="foo {bar} baz">hi</div>
<img src="/img/{id}.png" alt='icon-{id}' />
<a title="plain" href='/{path}/end'>link</a>

{#await promise}
	<p>loading</p>
{:then value}
	<p>{value}</p>
{:catch err}
	<p>{err.message}</p>
{/await}

{#await fetchInline() then v}
	<p>{v}</p>
{/await}

{#each items as {id, name}}
	<li>{id}: {name}</li>
{/each}

{#each pairs as [k, v]}
	<li>{k}={v}</li>
{/each}

{#each items as {data: {name}}}
	<li>{name}</li>
{/each}

{#each items.filter((x) => x.active) as item}
	<li>{item}</li>
{/each}

{#each items as item (`row-${item.id}`)}
	<li>{item}</li>
{/each}

{#each (pairs as SomeType<T>) as [k, v]}
	<li>{k}={v}</li>
{/each}

{#each arr.filter(b => (1, 2, "}")) as t as id, i (`${id + 1}_key`)}
	<li>{id}</li>
{/each}

{#if user?.permissions?.admin}
	<p>welcome</p>
{:else if x instanceof Foo}
	<p>foo</p>
{/if}

{#await api.load().then(parse)}
	<p>loading</p>
{:then {name, age}}
	<p>{name} {age}</p>
{/await}

{#snippet row({id, name})}
	<tr><td>{id}</td><td>{name}</td></tr>
{/snippet}

{#snippet head(...cols)}
	<tr>{cols.join(",")}</tr>
{/snippet}

{#snippet cell(data = {})}
	<td>{data.value}</td>
{/snippet}

{@const label = `${count} items`}
{@const pair = [first, second]}

{#if x /* > }? */ > 0}
	<p>positive</p>
{/if}


{#each arr.filter(b => ({
  a: 1,
  /* > }? */  c: "}"
})) as A<B> as C as D, i (html`<h1>hi</h1>` + "}")}
	<li>{id}</li>
{/each}




{#each items as item, i (item.id)}
	<li>{item.name}</li>
{:else}
	<li>empty</li>
{/each}

<!-- block heads share the same brace-tracking as `{expression}`: strings, -->
<!-- `//…\n` / `/*…*/` comments, and nested `{...}` are handled. regex -->
<!-- literals are not, so inputs below are captured incorrectly. -->

<!-- 1. regex literal containing `}` inside an `#if` head closes early. -->
{#if /}/.test(s)}
	<p>matched</p>
{/if}

<!-- 2. same failure mode inside an `#each` iterable. -->
{#each items.filter((x) => /}/.test(x)) as item}
	<li>{item}</li>
{/each}

<!-- 3. same failure mode inside an `@const` body. -->
{@const marker = /}/}

{#if count > 10}
	<p>lots</p>
{:else if count > 0}
	<p>some</p>
{:else}
	<p>none</p>
{/if}

{#key version}
	<Component />
{/key}

{#snippet row(item, index)}
	<tr><td>{index}</td><td>{item.name}</td></tr>
{/snippet}

{@render row(user, 0)}

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

<p>Hello {name}!</p>
<p>{count === 1 ? 'one' : 'many'}</p>
<p>{fn({a: 1, b: 2})}</p>
<p>{"has } brace"}</p>
<p>{`hi ${x}`}</p>
<p>{list.map((x) => x * 2).join(", ")}</p>
<p>{foo?.bar ?? "none"}</p>
<p>{[...arr, "more"]}</p>
<p>{({a: 1, b: {c: 2}})}</p>
<p>{list.map(({id, name}) => name)}</p>
<p>{html`<b>${x}</b>`}</p>
<p>{await promise}</p>
<p>{value as SomeType}</p>
<p>{fn<T>(x)}</p>
<p>{x /* inline } note */ + 1}</p>
<p>{x // trailing } note
}</p>

<!-- documented grammar-level limitations. the expression body skips `"` -->
<!-- and `'` strings plus `//…\n` and `/*…*/` comments, and tracks nested -->
<!-- `{...}` via brace counting. regex literals are not recognized, so -->
<!-- inputs below are captured incorrectly for that reason. -->

<!-- 1. a regex whose first `/` sits immediately after `{` is read as the -->
<!-- close-block sigil (shared with `{/if}`, `{/each}`, etc). -->
<p>{/ab/.test(s)}</p>

<!-- 2. a regex literal containing `}` closes the expression early even -->
<!-- when the `/` is not at the start of the body. -->
<p>{x.match(/}/)}</p>

<script>let a = 1;</script>
<script lang="ts">let b: number = 2;</script>
<script module>export const c = 3;</script>

<style>p { color: red; }</style>
<style lang="scss">.a { .b { color: blue; } }</style>

<svelte:component this={Component} />
<svelte:element this={tagname}>hi</svelte:element>
<svelte:window on:resize={handler} />
<svelte:document on:keydown={handler} />
<svelte:body on:mousemove={handler} />
<svelte:head>
	<title>Page</title>
</svelte:head>
<svelte:self />
<svelte:fragment slot="named">content</svelte:fragment>
<svelte:boundary>hi</svelte:boundary>
<svelte:options customElement="my-el" />
<notsvelte:options customElement="my-el" />

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

<script lang="ts">
  import { Greeter } from "./greeter.js";
  let count = $state(0);
  let active = $state(true);
  let doubled = $derived(count * 2);
  const re = /^[a-z]+$/i;
  const g = new Greeter("hello");
  const tpl = `greeting=${g.prefix}`;
  function inc() { count += 1; }
</script>

<style>
  :root { --fg: #1f2328; }
  button.primary { color: var(--fg); padding: 0.5rem 1rem; }
</style>

<!-- interactive counter -->
<main class="root" use:tooltip>
  <h1>Count: {count} (x2 = {doubled})</h1>
  <button class="primary" onclick={inc}>click me</button>

  {#if count > 0 && active}
    <p>non-zero</p>
  {:else}
    <p>zero</p>
  {/if}

  {#each [1, 2, 3] as n (n)}
    <span>{n}</span>
  {/each}
</main>

<script lang="ts">
	interface Props {
		source: string | undefined;
		position: number;
		analysis: any;
		on_position_change: (position: number) => void;
	}

	let { source, position, analysis, on_position_change }: Props = $props();

	let r: Range;
	let hl: Highlight;
	if (typeof window !== 'undefined') {
		hl = new Highlight();
		CSS.highlights.set('position', hl);
		r = new Range();
		hl.add(r);
	}

	function handle_scrub(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const new_position = +event.currentTarget.value;
		on_position_change(new_position);
	}
</script>

<div class="bottom-panel">
	<div class="inspector-controls">
		<div class="slider-section">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label class="slider-label">Position</label>
			<button onclick={() => on_position_change(position - 1)}>-</button>
			<input
				type="range"
				min="0"
				max={source?.length ?? 1 - 1}
				value={position}
				oninput={handle_scrub}
				class="position-slider"
			/>
			<button onclick={() => on_position_change(position + 1)}>+</button>
			<span class="position-value">{position}/{source?.length ?? 1 - 1}</span>
		</div>

		<div class="inspector-stats">
			<div class="stat-item">
				<span class="stat-label">Character:</span>
				<span class="stat-value">'{source?.[position] || 'EOF'}'</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">State:</span>
				<span class="stat-value">{analysis?.current_state}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Depth:</span>
				<span class="stat-value">{analysis?.depth}</span>
			</div>
		</div>
	</div>

	<div class="state-path-display">
		<span class="path-label">State Path:</span>
		<span class="path-value">{analysis?.state_path}</span>
	</div>
</div>

<style>
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

	.state-path-display {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
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

	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		cursor: pointer;
	}

	input[type='range']::-webkit-slider-track {
		background: var(--bg-tertiary);
		height: 6px;
		border: 1px solid var(--border);
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		background: var(--accent);
		height: 16px;
		width: 16px;
		margin-top: -5px;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		transition: all 0.2s ease;
	}

	input[type='range']::-webkit-slider-thumb:hover {
		background: var(--accent-hover);
		transform: scale(1.1);
	}
</style>

<script lang="ts">
	import { Spring } from 'svelte/motion';
	import type { TokenizeResult } from '@twinkleplop/core';

	interface Props {
		source: string | undefined;
		tokens: TokenizeResult | undefined;
		on_token_click: (token_index: number) => void;
	}

	let { source, tokens, on_token_click }: Props = $props();

	let html_container = $state<HTMLSpanElement>();
	let token_ranges: Range[] = [];

	const spring_config = {
		damping: 1,
		mass: 1,
		stiffness: 0.6
	};

	let highlight_top = new Spring(0, spring_config);
	let highlight_left = new Spring(0, spring_config);
	let highlight_width = new Spring(0, spring_config);
	let highlight_height = new Spring(0, spring_config);

	export function highlight_token(i: number) {
		const parent = html_container?.parentElement;
		if (!parent) return;
		const parent_box = parent.getBoundingClientRect();

		const selected_range = token_ranges[i];
		if (!selected_range) return;

		const box = selected_range.getBoundingClientRect();

		// get the scroll position of the code container
		const container_scroll_top = parent.scrollTop;
		const container_scroll_left = parent.scrollLeft;

		// calculate position relative to the scrollable container
		highlight_top.set(box.top - parent_box.top + container_scroll_top - 1);
		highlight_left.set(box.left - parent_box.left + container_scroll_left - 1);
		highlight_width.set(box.width + 1);
		highlight_height.set(box.height + 1);
	}

	function syntax_highlight() {
		if (!tokens || !html_container) return;
		token_ranges.length = 0;

		const text_node = html_container.firstChild;
		if (!text_node) return;

		// markdown emits compound token types like `"bold italic"` that
		// carry multiple active-style classes in one string. split on
		// whitespace and register the range with each individual highlight
		// so `::highlight(bold)` and `::highlight(italic)` both target it.
		// non-compound types (the common case for every other language)
		// split into a single-element array — unchanged behaviour.
		const highlights: Record<string, Highlight> = {};
		const ensure_highlight = (name: string): Highlight => {
			let h = highlights[name];
			if (!h) {
				h = new Highlight();
				highlights[name] = h;
				CSS.highlights.set(name, h);
			}
			return h;
		};

		for (let i = 0; i < tokens.tokens.length; i += 3) {
			const token_code = tokens.tokens[i];
			const token_type = tokens.token_types[token_code];
			console.log({token_type})
			const start = tokens.tokens[i + 1];
			const end = tokens.tokens[i + 2];

			const r = new Range();
			r.setStart(text_node, start);
			r.setEnd(text_node, end);
			token_ranges.push(r);

			for (const name of token_type.split(/\s+/)) {
				if (name) ensure_highlight(name).add(r);
			}
		}
	}

	function handle_token_click(e: MouseEvent) {
		const x = e.clientX;
		const y = e.clientY;

		const token_index = token_ranges.findIndex((range) => {
			const box = range.getBoundingClientRect();
			return x > box.left && x < box.right && y > box.top && y < box.bottom;
		});

		if (token_index !== -1) {
			on_token_click(token_index);
		}
	}

	$effect(() => {
		syntax_highlight();
	});
</script>

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

<style>
	.code-panel {
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
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
		text-decoration: underline;
		text-decoration-color: rgba(255, 255, 255, 1);
		text-decoration-thickness: 2px;
		text-underline-offset: 2px;
		text-decoration-skip-ink: none;
	}
</style>

<script>
const url = $state("/api/users");

async function fetchUsers() {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}
	return response.json();
}

let promise = $state(fetchUsers());

function refresh() {
	promise = fetchUsers();
}
</script>

<style>
	.user-list {
		padding: 1rem;
		background: #0a0a0a;
		border-radius: 8px;
		color: #eaeaea;
	}

	.user-list__loading,
	.user-list__error {
		padding: 2rem;
		text-align: center;
	}

	.user-list__error {
		color: #ef4444;
	}

	.user-list__items {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.user-list__item {
		padding: 0.75rem;
		border-bottom: 1px solid #222;
	}

	.user-list__item:last-child {
		border-bottom: none;
	}

	.user-list__name {
		font-weight: 600;
		color: #fff;
	}

	.user-list__email {
		color: #888;
		font-size: 0.875rem;
	}
</style>

<div class="user-list">
	<h2>Users</h2>
	<button onclick={refresh}>Refresh</button>

	{#await promise}
		<p class="user-list__loading">Loading…</p>
	{:then users}
		{#if users.length === 0}
			<p>No users found.</p>
		{:else}
			<ul class="user-list__items">
				{#each users as user (user.id)}
					<li class="user-list__item">
						<span class="user-list__name">{user.name}</span>
						<span class="user-list__email">{user.email}</span>
					</li>
				{/each}
			</ul>
		{/if}
	{:catch error}
		<p class="user-list__error">
			Failed to load: {error.message}
		</p>
	{/await}
</div>

{@html rawMarkup}
{@const doubled = count * 2}
{@debug user, profile}
{@render row(item, 0)}

<input bind:value={name} bind:this={el} />
<button on:click={handler}>go</button>
<button on:click|preventDefault|stopPropagation={handler}>stop</button>
<div use:action={params}>hi</div>
<div transition:fade={{duration: 200}}>hi</div>
<div transition:fade|local>hi</div>
<div in:fly out:fly animate:flip>hi</div>
<li class:active={isActive} class:done>item</li>
<span style:color={c} style:font-weight|important={w}>hi</span>
<div let:item let:index={i}>hi</div>

<Component {value} {title} />
<input {disabled} {placeholder} />

<div class="foo {bar} baz">hi</div>
<img src="/img/{id}.png" alt='icon-{id}' />
<a title="plain" href='/{path}/end'>link</a>

{#await promise}
	<p>loading</p>
{:then value}
	<p>{value}</p>
{:catch err}
	<p>{err.message}</p>
{/await}

{#await fetchInline() then v}
	<p>{v}</p>
{/await}

{#each items as {id, name}}
	<li>{id}: {name}</li>
{/each}

{#each pairs as [k, v]}
	<li>{k}={v}</li>
{/each}

{#each items as {data: {name}}}
	<li>{name}</li>
{/each}

{#each items.filter((x) => x.active) as item}
	<li>{item}</li>
{/each}

{#each items as item (`row-${item.id}`)}
	<li>{item}</li>
{/each}

{#each (pairs as SomeType<T>) as [k, v]}
	<li>{k}={v}</li>
{/each}

{#each arr.filter(b => (1, 2, "}")) as t as id, i (`${id + 1}_key`)}
	<li>{id}</li>
{/each}

{#if user?.permissions?.admin}
	<p>welcome</p>
{:else if x instanceof Foo}
	<p>foo</p>
{/if}

{#await api.load().then(parse)}
	<p>loading</p>
{:then {name, age}}
	<p>{name} {age}</p>
{/await}

{#snippet row({id, name})}
	<tr><td>{id}</td><td>{name}</td></tr>
{/snippet}

{#snippet head(...cols)}
	<tr>{cols.join(",")}</tr>
{/snippet}

{#snippet cell(data = {})}
	<td>{data.value}</td>
{/snippet}

{@const label = `${count} items`}
{@const pair = [first, second]}

{#if x /* > }? */ > 0}
	<p>positive</p>
{/if}


{#each arr.filter(b => ({
  a: 1,
  /* > }? */  c: "}"
})) as A<B> as C as D, i (html`<h1>hi</h1>` + "}")}
	<li>{id}</li>
{/each}




{#each items as item, i (item.id)}
	<li>{item.name}</li>
{:else}
	<li>empty</li>
{/each}

<!-- block heads share the same brace-tracking as `{expression}`: strings, -->
<!-- `//…\n` / `/*…*/` comments, and nested `{...}` are handled. regex -->
<!-- literals are not, so inputs below are captured incorrectly. -->

<!-- 1. regex literal containing `}` inside an `#if` head closes early. -->
{#if /}/.test(s)}
	<p>matched</p>
{/if}

<!-- 2. same failure mode inside an `#each` iterable. -->
{#each items.filter((x) => /}/.test(x)) as item}
	<li>{item}</li>
{/each}

<!-- 3. same failure mode inside an `@const` body. -->
{@const marker = /}/}

{#if count > 10}
	<p>lots</p>
{:else if count > 0}
	<p>some</p>
{:else}
	<p>none</p>
{/if}

{#key version}
	<Component />
{/key}

{#snippet row(item, index)}
	<tr><td>{index}</td><td>{item.name}</td></tr>
{/snippet}

{@render row(user, 0)}

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

<p>Hello {name}!</p>
<p>{count === 1 ? 'one' : 'many'}</p>
<p>{fn({a: 1, b: 2})}</p>
<p>{"has } brace"}</p>
<p>{`hi ${x}`}</p>
<p>{list.map((x) => x * 2).join(", ")}</p>
<p>{foo?.bar ?? "none"}</p>
<p>{[...arr, "more"]}</p>
<p>{({a: 1, b: {c: 2}})}</p>
<p>{list.map(({id, name}) => name)}</p>
<p>{html`<b>${x}</b>`}</p>
<p>{await promise}</p>
<p>{value as SomeType}</p>
<p>{fn<T>(x)}</p>
<p>{x /* inline } note */ + 1}</p>
<p>{x // trailing } note
}</p>

<!-- documented grammar-level limitations. the expression body skips `"` -->
<!-- and `'` strings plus `//…\n` and `/*…*/` comments, and tracks nested -->
<!-- `{...}` via brace counting. regex literals are not recognized, so -->
<!-- inputs below are captured incorrectly for that reason. -->

<!-- 1. a regex whose first `/` sits immediately after `{` is read as the -->
<!-- close-block sigil (shared with `{/if}`, `{/each}`, etc). -->
<p>{/ab/.test(s)}</p>

<!-- 2. a regex literal containing `}` closes the expression early even -->
<!-- when the `/` is not at the start of the body. -->
<p>{x.match(/}/)}</p>

<script>let a = 1;</script>
<script lang="ts">let b: number = 2;</script>
<script module>export const c = 3;</script>

<style>p { color: red; }</style>
<style lang="scss">.a { .b { color: blue; } }</style>

<svelte:component this={Component} />
<svelte:element this={tagname}>hi</svelte:element>
<svelte:window on:resize={handler} />
<svelte:document on:keydown={handler} />
<svelte:body on:mousemove={handler} />
<svelte:head>
	<title>Page</title>
</svelte:head>
<svelte:self />
<svelte:fragment slot="named">content</svelte:fragment>
<svelte:boundary>hi</svelte:boundary>
<svelte:options customElement="my-el" />
<notsvelte:options customElement="my-el" />

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

<script lang="ts">
  import { Greeter } from "./greeter.js";
  let count = $state(0);
  let active = $state(true);
  let doubled = $derived(count * 2);
  const re = /^[a-z]+$/i;
  const g = new Greeter("hello");
  const tpl = `greeting=${g.prefix}`;
  function inc() { count += 1; }
</script>

<style>
  :root { --fg: #1f2328; }
  button.primary { color: var(--fg); padding: 0.5rem 1rem; }
</style>

<!-- interactive counter -->
<main class="root" use:tooltip>
  <h1>Count: {count} (x2 = {doubled})</h1>
  <button class="primary" onclick={inc}>click me</button>

  {#if count > 0 && active}
    <p>non-zero</p>
  {:else}
    <p>zero</p>
  {/if}

  {#each [1, 2, 3] as n (n)}
    <span>{n}</span>
  {/each}
</main>

<script lang="ts">
	interface Props {
		source: string | undefined;
		position: number;
		analysis: any;
		on_position_change: (position: number) => void;
	}

	let { source, position, analysis, on_position_change }: Props = $props();

	let r: Range;
	let hl: Highlight;
	if (typeof window !== 'undefined') {
		hl = new Highlight();
		CSS.highlights.set('position', hl);
		r = new Range();
		hl.add(r);
	}

	function handle_scrub(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const new_position = +event.currentTarget.value;
		on_position_change(new_position);
	}
</script>

<div class="bottom-panel">
	<div class="inspector-controls">
		<div class="slider-section">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label class="slider-label">Position</label>
			<button onclick={() => on_position_change(position - 1)}>-</button>
			<input
				type="range"
				min="0"
				max={source?.length ?? 1 - 1}
				value={position}
				oninput={handle_scrub}
				class="position-slider"
			/>
			<button onclick={() => on_position_change(position + 1)}>+</button>
			<span class="position-value">{position}/{source?.length ?? 1 - 1}</span>
		</div>

		<div class="inspector-stats">
			<div class="stat-item">
				<span class="stat-label">Character:</span>
				<span class="stat-value">'{source?.[position] || 'EOF'}'</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">State:</span>
				<span class="stat-value">{analysis?.current_state}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Depth:</span>
				<span class="stat-value">{analysis?.depth}</span>
			</div>
		</div>
	</div>

	<div class="state-path-display">
		<span class="path-label">State Path:</span>
		<span class="path-value">{analysis?.state_path}</span>
	</div>
</div>

<style>
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

	.state-path-display {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
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

	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		cursor: pointer;
	}

	input[type='range']::-webkit-slider-track {
		background: var(--bg-tertiary);
		height: 6px;
		border: 1px solid var(--border);
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		background: var(--accent);
		height: 16px;
		width: 16px;
		margin-top: -5px;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		transition: all 0.2s ease;
	}

	input[type='range']::-webkit-slider-thumb:hover {
		background: var(--accent-hover);
		transform: scale(1.1);
	}
</style>

<script lang="ts">
	import { Spring } from 'svelte/motion';
	import type { TokenizeResult } from '@twinkleplop/core';

	interface Props {
		source: string | undefined;
		tokens: TokenizeResult | undefined;
		on_token_click: (token_index: number) => void;
	}

	let { source, tokens, on_token_click }: Props = $props();

	let html_container = $state<HTMLSpanElement>();
	let token_ranges: Range[] = [];

	const spring_config = {
		damping: 1,
		mass: 1,
		stiffness: 0.6
	};

	let highlight_top = new Spring(0, spring_config);
	let highlight_left = new Spring(0, spring_config);
	let highlight_width = new Spring(0, spring_config);
	let highlight_height = new Spring(0, spring_config);

	export function highlight_token(i: number) {
		const parent = html_container?.parentElement;
		if (!parent) return;
		const parent_box = parent.getBoundingClientRect();

		const selected_range = token_ranges[i];
		if (!selected_range) return;

		const box = selected_range.getBoundingClientRect();

		// get the scroll position of the code container
		const container_scroll_top = parent.scrollTop;
		const container_scroll_left = parent.scrollLeft;

		// calculate position relative to the scrollable container
		highlight_top.set(box.top - parent_box.top + container_scroll_top - 1);
		highlight_left.set(box.left - parent_box.left + container_scroll_left - 1);
		highlight_width.set(box.width + 1);
		highlight_height.set(box.height + 1);
	}

	function syntax_highlight() {
		if (!tokens || !html_container) return;
		token_ranges.length = 0;

		const text_node = html_container.firstChild;
		if (!text_node) return;

		// markdown emits compound token types like `"bold italic"` that
		// carry multiple active-style classes in one string. split on
		// whitespace and register the range with each individual highlight
		// so `::highlight(bold)` and `::highlight(italic)` both target it.
		// non-compound types (the common case for every other language)
		// split into a single-element array — unchanged behaviour.
		const highlights: Record<string, Highlight> = {};
		const ensure_highlight = (name: string): Highlight => {
			let h = highlights[name];
			if (!h) {
				h = new Highlight();
				highlights[name] = h;
				CSS.highlights.set(name, h);
			}
			return h;
		};

		for (let i = 0; i < tokens.tokens.length; i += 3) {
			const token_code = tokens.tokens[i];
			const token_type = tokens.token_types[token_code];
			console.log({token_type})
			const start = tokens.tokens[i + 1];
			const end = tokens.tokens[i + 2];

			const r = new Range();
			r.setStart(text_node, start);
			r.setEnd(text_node, end);
			token_ranges.push(r);

			for (const name of token_type.split(/\s+/)) {
				if (name) ensure_highlight(name).add(r);
			}
		}
	}

	function handle_token_click(e: MouseEvent) {
		const x = e.clientX;
		const y = e.clientY;

		const token_index = token_ranges.findIndex((range) => {
			const box = range.getBoundingClientRect();
			return x > box.left && x < box.right && y > box.top && y < box.bottom;
		});

		if (token_index !== -1) {
			on_token_click(token_index);
		}
	}

	$effect(() => {
		syntax_highlight();
	});
</script>

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

<style>
	.code-panel {
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
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
		text-decoration: underline;
		text-decoration-color: rgba(255, 255, 255, 1);
		text-decoration-thickness: 2px;
		text-underline-offset: 2px;
		text-decoration-skip-ink: none;
	}
</style>

<script>
const url = $state("/api/users");

async function fetchUsers() {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}
	return response.json();
}

let promise = $state(fetchUsers());

function refresh() {
	promise = fetchUsers();
}
</script>

<style>
	.user-list {
		padding: 1rem;
		background: #0a0a0a;
		border-radius: 8px;
		color: #eaeaea;
	}

	.user-list__loading,
	.user-list__error {
		padding: 2rem;
		text-align: center;
	}

	.user-list__error {
		color: #ef4444;
	}

	.user-list__items {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.user-list__item {
		padding: 0.75rem;
		border-bottom: 1px solid #222;
	}

	.user-list__item:last-child {
		border-bottom: none;
	}

	.user-list__name {
		font-weight: 600;
		color: #fff;
	}

	.user-list__email {
		color: #888;
		font-size: 0.875rem;
	}
</style>

<div class="user-list">
	<h2>Users</h2>
	<button onclick={refresh}>Refresh</button>

	{#await promise}
		<p class="user-list__loading">Loading…</p>
	{:then users}
		{#if users.length === 0}
			<p>No users found.</p>
		{:else}
			<ul class="user-list__items">
				{#each users as user (user.id)}
					<li class="user-list__item">
						<span class="user-list__name">{user.name}</span>
						<span class="user-list__email">{user.email}</span>
					</li>
				{/each}
			</ul>
		{/if}
	{:catch error}
		<p class="user-list__error">
			Failed to load: {error.message}
		</p>
	{/await}
</div>

{@html rawMarkup}
{@const doubled = count * 2}
{@debug user, profile}
{@render row(item, 0)}

<input bind:value={name} bind:this={el} />
<button on:click={handler}>go</button>
<button on:click|preventDefault|stopPropagation={handler}>stop</button>
<div use:action={params}>hi</div>
<div transition:fade={{duration: 200}}>hi</div>
<div transition:fade|local>hi</div>
<div in:fly out:fly animate:flip>hi</div>
<li class:active={isActive} class:done>item</li>
<span style:color={c} style:font-weight|important={w}>hi</span>
<div let:item let:index={i}>hi</div>

<Component {value} {title} />
<input {disabled} {placeholder} />

<div class="foo {bar} baz">hi</div>
<img src="/img/{id}.png" alt='icon-{id}' />
<a title="plain" href='/{path}/end'>link</a>

{#await promise}
	<p>loading</p>
{:then value}
	<p>{value}</p>
{:catch err}
	<p>{err.message}</p>
{/await}

{#await fetchInline() then v}
	<p>{v}</p>
{/await}

{#each items as {id, name}}
	<li>{id}: {name}</li>
{/each}

{#each pairs as [k, v]}
	<li>{k}={v}</li>
{/each}

{#each items as {data: {name}}}
	<li>{name}</li>
{/each}

{#each items.filter((x) => x.active) as item}
	<li>{item}</li>
{/each}

{#each items as item (`row-${item.id}`)}
	<li>{item}</li>
{/each}

{#each (pairs as SomeType<T>) as [k, v]}
	<li>{k}={v}</li>
{/each}

{#each arr.filter(b => (1, 2, "}")) as t as id, i (`${id + 1}_key`)}
	<li>{id}</li>
{/each}

{#if user?.permissions?.admin}
	<p>welcome</p>
{:else if x instanceof Foo}
	<p>foo</p>
{/if}

{#await api.load().then(parse)}
	<p>loading</p>
{:then {name, age}}
	<p>{name} {age}</p>
{/await}

{#snippet row({id, name})}
	<tr><td>{id}</td><td>{name}</td></tr>
{/snippet}

{#snippet head(...cols)}
	<tr>{cols.join(",")}</tr>
{/snippet}

{#snippet cell(data = {})}
	<td>{data.value}</td>
{/snippet}

{@const label = `${count} items`}
{@const pair = [first, second]}

{#if x /* > }? */ > 0}
	<p>positive</p>
{/if}


{#each arr.filter(b => ({
  a: 1,
  /* > }? */  c: "}"
})) as A<B> as C as D, i (html`<h1>hi</h1>` + "}")}
	<li>{id}</li>
{/each}




{#each items as item, i (item.id)}
	<li>{item.name}</li>
{:else}
	<li>empty</li>
{/each}

<!-- block heads share the same brace-tracking as `{expression}`: strings, -->
<!-- `//…\n` / `/*…*/` comments, and nested `{...}` are handled. regex -->
<!-- literals are not, so inputs below are captured incorrectly. -->

<!-- 1. regex literal containing `}` inside an `#if` head closes early. -->
{#if /}/.test(s)}
	<p>matched</p>
{/if}

<!-- 2. same failure mode inside an `#each` iterable. -->
{#each items.filter((x) => /}/.test(x)) as item}
	<li>{item}</li>
{/each}

<!-- 3. same failure mode inside an `@const` body. -->
{@const marker = /}/}

{#if count > 10}
	<p>lots</p>
{:else if count > 0}
	<p>some</p>
{:else}
	<p>none</p>
{/if}

{#key version}
	<Component />
{/key}

{#snippet row(item, index)}
	<tr><td>{index}</td><td>{item.name}</td></tr>
{/snippet}

{@render row(user, 0)}

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

<p>Hello {name}!</p>
<p>{count === 1 ? 'one' : 'many'}</p>
<p>{fn({a: 1, b: 2})}</p>
<p>{"has } brace"}</p>
<p>{`hi ${x}`}</p>
<p>{list.map((x) => x * 2).join(", ")}</p>
<p>{foo?.bar ?? "none"}</p>
<p>{[...arr, "more"]}</p>
<p>{({a: 1, b: {c: 2}})}</p>
<p>{list.map(({id, name}) => name)}</p>
<p>{html`<b>${x}</b>`}</p>
<p>{await promise}</p>
<p>{value as SomeType}</p>
<p>{fn<T>(x)}</p>
<p>{x /* inline } note */ + 1}</p>
<p>{x // trailing } note
}</p>

<!-- documented grammar-level limitations. the expression body skips `"` -->
<!-- and `'` strings plus `//…\n` and `/*…*/` comments, and tracks nested -->
<!-- `{...}` via brace counting. regex literals are not recognized, so -->
<!-- inputs below are captured incorrectly for that reason. -->

<!-- 1. a regex whose first `/` sits immediately after `{` is read as the -->
<!-- close-block sigil (shared with `{/if}`, `{/each}`, etc). -->
<p>{/ab/.test(s)}</p>

<!-- 2. a regex literal containing `}` closes the expression early even -->
<!-- when the `/` is not at the start of the body. -->
<p>{x.match(/}/)}</p>

<script>let a = 1;</script>
<script lang="ts">let b: number = 2;</script>
<script module>export const c = 3;</script>

<style>p { color: red; }</style>
<style lang="scss">.a { .b { color: blue; } }</style>

<svelte:component this={Component} />
<svelte:element this={tagname}>hi</svelte:element>
<svelte:window on:resize={handler} />
<svelte:document on:keydown={handler} />
<svelte:body on:mousemove={handler} />
<svelte:head>
	<title>Page</title>
</svelte:head>
<svelte:self />
<svelte:fragment slot="named">content</svelte:fragment>
<svelte:boundary>hi</svelte:boundary>
<svelte:options customElement="my-el" />
<notsvelte:options customElement="my-el" />

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

<script lang="ts">
  import { Greeter } from "./greeter.js";
  let count = $state(0);
  let active = $state(true);
  let doubled = $derived(count * 2);
  const re = /^[a-z]+$/i;
  const g = new Greeter("hello");
  const tpl = `greeting=${g.prefix}`;
  function inc() { count += 1; }
</script>

<style>
  :root { --fg: #1f2328; }
  button.primary { color: var(--fg); padding: 0.5rem 1rem; }
</style>

<!-- interactive counter -->
<main class="root" use:tooltip>
  <h1>Count: {count} (x2 = {doubled})</h1>
  <button class="primary" onclick={inc}>click me</button>

  {#if count > 0 && active}
    <p>non-zero</p>
  {:else}
    <p>zero</p>
  {/if}

  {#each [1, 2, 3] as n (n)}
    <span>{n}</span>
  {/each}
</main>
