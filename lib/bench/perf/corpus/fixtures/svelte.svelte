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
