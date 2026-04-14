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
