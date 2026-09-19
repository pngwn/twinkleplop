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
		const ghosts = mount!.querySelectorAll<HTMLElement>(".ghosts span");
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
			<span style:--x={cell.x} style:--y={cell.y}><i></i></span>
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
	.ghosts span {
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
	/* in flight: over the pixels still at home, and glowing */
	.px:global([data-fly]) {
		z-index: 2;
	}
	.px b,
	.ghosts i {
		display: block;
		width: 84%;
		height: 84%;
		margin: 8%;
	}
	.px b {
		background: var(--c);
	}
	.px:global([data-fly]) b {
		box-shadow:
			0 0 6px var(--c),
			0 0 14px var(--c);
	}

	.ghosts {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
	}
	/* a stolen pixel's empty socket, recessed into the page */
	.ghosts span {
		opacity: 0;
	}
	.ghosts i {
		background: var(--bg3);
	}
</style>
