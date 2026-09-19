<script lang="ts">
	import { layout } from "./pixel_font";
	import { rainbow, type plop_pixel } from "./plop";

	let { text }: { text: string } = $props();

	const grid = $derived(layout(text));
	const cells = $derived(
		grid.cells.map((cell) => {
			const f = cell.x / (grid.cols - 1);
			return { ...cell, color: { dark: rainbow(f), light: rainbow(f, "light") } };
		})
	);

	let mount: HTMLElement | undefined = $state();

	export function cols(): number {
		return grid.cols;
	}

	export function element(): HTMLElement {
		return mount!;
	}

	export function pixels(): plop_pixel[] {
		const els = mount!.querySelectorAll<HTMLElement>(".px");
		const ghosts = mount!.querySelectorAll<HTMLElement>(".ghosts i");
		return cells.map((cell, i) => ({ ...cell, el: els[i], ghost: ghosts[i] }));
	}
</script>

<div
	class="wordmark"
	bind:this={mount}
	style:--cols={grid.cols}
	style:--rows={grid.rows}
	aria-hidden="true"
>
	<div class="ghosts">
		{#each cells as cell}
			<i style:--x={cell.x} style:--y={cell.y}></i>
		{/each}
	</div>
	{#each cells as cell}
		<div
			class="px"
			style:--x={cell.x}
			style:--y={cell.y}
			style:--c-dark={cell.color.dark}
			style:--c-light={cell.color.light}
		>
			<b></b>
		</div>
	{/each}
</div>

<style>
	.wordmark {
		/* whole pixels only: fractional cells leave uneven seams */
		--fit: calc(min(92vw, 510px) / var(--cols));
		--sz: clamp(4px, var(--fit), 12px);
		position: relative;
		/* above the ghosts and the page, below the sticky header */
		z-index: 19;
		flex: none;
		width: calc(var(--cols) * var(--sz));
		height: calc(var(--rows) * var(--sz));
	}
	@supports (width: round(down, 1px, 1px)) {
		.wordmark {
			--sz: clamp(4px, round(down, var(--fit), 1px), 12px);
		}
	}

	.px,
	.ghosts i {
		position: absolute;
		left: calc(var(--x) * var(--sz));
		top: calc(var(--y) * var(--sz));
		width: var(--sz);
		height: var(--sz);
	}

	.px {
		--c: var(--c-dark);
		will-change: transform, opacity;
	}
	:global(:root[data-mode="light"]) .px {
		--c: var(--c-light);
	}
	.px b {
		display: block;
		width: 84%;
		height: 84%;
		background: var(--c);
		box-shadow: 0 0 calc(var(--land, 0) * 10px) var(--c);
	}

	.ghosts {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
	}
	.ghosts i {
		display: block;
		opacity: 0;
		transition: opacity 0.4s;
	}
	.ghosts i::before {
		content: "";
		position: absolute;
		inset: 8%;
		background: var(--ghost);
		opacity: 0.35;
		border-radius: 1px;
	}
	:global(:root[data-mode="light"]) .ghosts i::before {
		opacity: 0.28;
	}
</style>
