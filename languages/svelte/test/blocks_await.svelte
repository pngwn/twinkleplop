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
