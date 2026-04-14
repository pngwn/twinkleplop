{#each items as item, i (item.id)}
	<li>{item.name}</li>
{:else}
	<li>empty</li>
{/each}
