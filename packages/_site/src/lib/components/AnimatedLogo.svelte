<script lang="ts">
	import Spring from '$lib/utils/spring.svelte';
	import shapes from './twinkleplop-shapes.json';

	let springs: Record<string, Spring<[number, number]>[]> = {};

	for (const key in shapes) {
		for (let index = 0; index < shapes[key].length; index++) {
			const element = shapes[key][index];
			if (!springs[key]) {
				springs[key] = [];
			}
			springs[key][index] = new Spring([element.x, element.y], {
				damping: 0.1,
				mass: 0.1,
				stiffness: 2
			});
		}
	}

	function pause(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	console.log(springs);

	async function animate(compact: boolean) {
		for (const key in springs) {
			if (key === 't') {
				for (let index = 0; index < springs[key].length; index++) {
					springs[key][index].set(
						[
							compact ? shapes[key][index].x - 350 : shapes[key][index].x,
							compact ? shapes[key][index].y - 30 : shapes[key][index].y
						],
						{
							mode: 'curve',
							curvature: compact ? -0.5 : 0.5
						}
					);
					await pause(10);
				}
			} else if (key === '*') {
				for (let index = 0; index < springs[key].length; index++) {
					springs[key][index].set(
						[
							compact ? shapes[key][index].x - 1300 : shapes[key][index].x,
							compact ? shapes[key][index].y - 55 : shapes[key][index].y
						],
						{
							mode: 'curve',
							curvature: compact ? -0.2 : 0.2
						}
					);
					await pause(20);
				}
			}
		}
	}

	async function animate_two(compact: boolean) {
		let j = 0;
		for (const key in springs) {
			if (key === 't' || key === '*') {
				continue;
			}
			for (let index = 0; index < springs[key].length; index++) {
				const x = j % 7;
				const y = Math.floor(j / 7);
				// curve is a value between 0.5 and 0.1, less for higher J values
				let curvature = 0.3 * ((131 - j) / 131);
				console.log('curvature', j, curvature);
				springs[key][index].set(
					[
						compact ? -360 + x * 13 : shapes[key][index].x,
						compact ? 100 + y * 13 : shapes[key][index].y
					],
					{
						mode: 'curve',
						// inverse of this
						curvature: compact ? -(0.2 + curvature) : 0.2 + curvature
						// stiffness: 10,
						// damping: 0.5,
						// mass: 0.1
					}
				);
				j++;
				await pause(0.1);
			}
		}
	}

	let compact = $state(false);
	function handle_scroll() {
		if (window.scrollY > 10) {
			if (!compact) {
				compact = true;
				animate(compact);
				animate_two(compact);
			}
		}

		if (window.scrollY < 10) {
			if (compact) {
				compact = false;
				animate(compact);
				animate_two(compact);
			}
		}
	}

	// setTimeout(animate, 1000);
	// setTimeout(animate_two, 1000);
</script>

<svelte:window onscroll={handle_scroll} />

<div class="animated-logo">
	{#each Object.entries(springs) as [key, arr]}
		<div class="animated-logo-shape">
			{#each arr as s, index}
				<div
					class="animated-logo-shape-item"
					style:left="{s.current[0]}px"
					style:top="{s.current[1]}px"
					style:width="{10}px"
					style:height="{10}px"
					style:background={shapes[key][index].color}
				></div>
			{/each}
		</div>
	{/each}
</div>

<style>
	.animated-logo {
		position: sticky;
		top: 0;
		left: 0;
		right: 0;
		margin: 0 auto;
		width: 100%;
		height: 100px;
		transform: scale(0.5) translateX(-50px);
		/* transform: ; */
	}

	.animated-logo-shape {
		position: absolute;
		top: 20px;
		left: 0;
	}

	.animated-logo-shape-item {
		position: absolute;
	}
</style>
