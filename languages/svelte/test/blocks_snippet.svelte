{#snippet row(item, index)}
	<tr><td>{index}</td><td>{item.name}</td></tr>
{/snippet}

{@render row(user, 0)}
