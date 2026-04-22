<script lang="ts">
	type cell = { kind: "name" | "type" | "def" | "desc"; value: string };

	let {
		headers,
		rows,
	}: {
		headers?: string[];
		rows: cell[][];
	} = $props();

	function class_for(kind: cell["kind"]) {
		return kind === "name"
			? "pname"
			: kind === "type"
				? "ptype"
				: kind === "def"
					? "pdef"
					: "pdesc";
	}
</script>

<table class="param-table">
	{#if headers && headers.length}
		<thead>
			<tr>
				{#each headers as h}
					<th>{h}</th>
				{/each}
			</tr>
		</thead>
	{/if}
	<tbody>
		{#each rows as row}
			<tr>
				{#each row as c}
					<td>
						<span class={class_for(c.kind)}>{@html c.value}</span>
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.param-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--docs-fs-sm);
		margin: 8px 0 18px;
	}
	.param-table th,
	.param-table td {
		text-align: left;
		padding: 7px 10px;
		border-bottom: 1px dotted var(--docs-line);
		vertical-align: top;
	}
	.param-table th {
		color: var(--docs-fg-mute);
		font-weight: 400;
		font-size: var(--docs-fs-xs);
		text-transform: uppercase;
		letter-spacing: 0.6px;
		background: var(--docs-bg-1);
	}
	.param-table :global(.pname) {
		color: var(--t-purple);
	}
	.param-table :global(.ptype) {
		color: var(--t-teal);
	}
	.param-table :global(.pdef) {
		color: var(--t-yellow);
	}
	.param-table :global(.pdesc) {
		color: var(--docs-fg-dim);
	}
	.param-table :global(code) {
		background: var(--docs-bg-2);
		border: 1px solid var(--docs-line-2);
		padding: 1px 5px;
		border-radius: 2px;
		color: var(--docs-fg);
		font-size: 0.92em;
		font-family: var(--docs-mono);
	}
	.param-table tr:last-child td {
		border-bottom: 0;
	}

	@media (max-width: 760px) {
		.param-table {
			display: block;
			overflow-x: auto;
		}
		.param-table tbody,
		.param-table thead,
		.param-table tr {
			display: table;
			width: 100%;
			table-layout: fixed;
		}
	}
</style>
