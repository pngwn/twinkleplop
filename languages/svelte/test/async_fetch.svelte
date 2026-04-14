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
