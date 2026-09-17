<script lang="ts">
	interface Props {
		label: string;
		value: string;
		options: string[];
		show_label?: boolean;
		align?: "left" | "right";
		on_change: (next: string) => void;
	}

	let {
		label,
		value,
		options,
		show_label = false,
		align = "left",
		on_change,
	}: Props = $props();

	let open = $state(false);
	let hi = $state(0);
	let root: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (!open) return;
		function on_down(e: MouseEvent) {
			if (root && !root.contains(e.target as Node)) open = false;
		}
		function on_key(e: KeyboardEvent) {
			if (e.key === "Escape") {
				open = false;
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				hi = Math.min(options.length - 1, hi + 1);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				hi = Math.max(0, hi - 1);
			} else if (e.key === "Enter") {
				e.preventDefault();
				on_change(options[hi]);
				open = false;
			}
		}
		document.addEventListener("mousedown", on_down);
		document.addEventListener("keydown", on_key);
		return () => {
			document.removeEventListener("mousedown", on_down);
			document.removeEventListener("keydown", on_key);
		};
	});

	function toggle() {
		open = !open;
		if (open) {
			hi = Math.max(0, options.indexOf(value));
		}
	}

	function pick(opt: string) {
		on_change(opt);
		open = false;
	}
</script>

<div class="chip" bind:this={root}>
	<button
		class="chip__button"
		type="button"
		aria-expanded={open}
		aria-haspopup="listbox"
		aria-label="{label}: {value}"
		onclick={toggle}
	>
		{#if show_label}<span class="chip__label">{label}</span>{/if}
		<span class="chip__value">{value}</span>
	</button>
	{#if open}
		<div class="chip__menu" class:chip__menu--right={align === "right"} role="listbox" aria-label={label}>
			<div class="chip__menu-head">
				<span>{label}</span>
			</div>
			<div class="chip__menu-items">
			{#each options as opt, i (opt)}
				<button
					class="chip__item"
					class:is-hi={i === hi}
					class:is-selected={opt === value}
					type="button"
					role="option"
					aria-selected={opt === value}
					onmouseenter={() => (hi = i)}
					onclick={() => pick(opt)}
				>
					<span class="chip__item-marker" aria-hidden="true">{opt === value ? "●" : "○"}</span>
					<span>{opt}</span>
				</button>
			{/each}
			</div>
		</div>
	{/if}
</div>


<style>
	.chip__menu-items {
		overflow: scroll;
		height: 100%;
	}
</style>
