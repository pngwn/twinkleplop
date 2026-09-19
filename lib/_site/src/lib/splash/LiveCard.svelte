<script lang="ts">
	import { onMount } from "svelte";
	import { tokenize as ts_tokenize } from "@twinkleplop/typescript";
	import { measure } from "$lib/explore/measure";
	import { HIT_RADIUS } from "./plop";

	const tokenize = ts_tokenize({ fidelity: "high" });

	// every token the wand lights costs the wordmark a pixel, so this has
	// exactly as many tokens as "twinkleplop" has pixels: 123. recount if
	// either changes.
	const SOURCE = `import { twinkle, type Token } from "twinkleplop";

type Theme = "light" | "dark";

interface Options {
  theme: Theme;
  lang: string;
  tabSize?: number;
}

export function highlight(src: string, opts: Options): string {
  if (!src) return "";
  const tokens = twinkle(src, opts.lang, opts.tabSize);
  return tokens
    .map((t: Token) => \`<span class="\${t.kind}">\${t.text}</span>\`)
    .join("");
}

export const html = highlight("const x = 1;", {
  theme: "dark",
  lang: "ts",
  tabSize: 2,
});`;

	let {
		lit,
		total,
		on_targets,
		on_cast
	}: {
		// how many tokens the wand has lit so far
		lit: number;
		total: number;
		on_targets: (tokens: HTMLElement[]) => void;
		// a click on the code, in page coordinates
		on_cast: (x: number, y: number) => void;
	} = $props();

	interface segment {
		text: string;
		// null for the whitespace between tokens
		type: string | null;
	}

	const segments = build_segments(SOURCE);

	let card: HTMLElement | undefined = $state();
	let pre: HTMLPreElement | undefined = $state();
	let parse_ms = $state(0);
	// the dashed circle each cast leaves, in card coordinates
	let rings: { id: number; x: number; y: number }[] = $state([]);
	let next_ring = 0;

	function build_segments(text: string): segment[] {
		const { tokens, token_types } = tokenize(text);
		const out: segment[] = [];
		// `${` and its closing `}` have no token type of their own. track the
		// brace depth each interpolation opened at so they can be picked out.
		const interpolations: number[] = [];
		let depth = 0;
		let pos = 0;

		for (let i = 0; i < tokens.length; i += 3) {
			const start = tokens[i + 1];
			const end = tokens[i + 2];
			if (start === end) continue;
			if (start > pos) out.push({ text: text.slice(pos, start), type: null });
			const chunk = text.slice(start, end);
			let type: string | null = token_types[tokens[i]] ?? "identifier";

			if (!/\S/.test(chunk)) {
				type = null;
			} else if (type === "punctuation") {
				if (chunk === "${") {
					interpolations.push(depth);
					type = "interpolation";
				} else if (chunk === "{") {
					depth++;
				} else if (chunk === "}") {
					if (interpolations.at(-1) === depth) {
						interpolations.pop();
						type = "interpolation";
					} else {
						depth--;
					}
				}
			}
			out.push({ text: chunk, type });
			pos = end;
		}
		if (pos < text.length) out.push({ text: text.slice(pos), type: null });
		return out;
	}

	function cast(e: MouseEvent) {
		const box = card!.getBoundingClientRect();
		const id = next_ring++;
		rings.push({ id, x: e.clientX - box.left, y: e.clientY - box.top });
		setTimeout(() => (rings = rings.filter((ring) => ring.id !== id)), 600);
		on_cast(e.pageX, e.pageY);
	}

	onMount(() => {
		on_targets([...pre!.querySelectorAll<HTMLElement>(".tok")]);
		// timing a microsecond-scale call means running it for a few ms, so
		// keep it out of hydration
		const id = setTimeout(() => {
			parse_ms = measure(() => tokenize(SOURCE), { samples: 10 }).ms;
		}, 150);
		return () => clearTimeout(id);
	});
</script>

<div class="card" bind:this={card}>
	<!-- the wand is a pointer flourish: without it the code still reads, in
	     grey that clears 4.5:1 -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<!-- whitespace in here is rendered -->
	<!-- prettier-ignore -->
	<pre class="code" bind:this={pre} onclick={cast}>{#each segments as segment}{#if segment.type}<span class="tok" style:--tc="var(--tok-{segment.type}, var(--ink))">{segment.text}</span>{:else}{segment.text}{/if}{/each}</pre>
	{#each rings as ring (ring.id)}
		<span class="ring" style:left="{ring.x}px" style:top="{ring.y}px" style:--r="{HIT_RADIUS}px"></span>
	{/each}
	<div class="bar">
		<span>
			{#if lit === 0}
				tap the code with the wand to <b>twinkle</b> it
			{:else if lit >= total}
				twinkled in <b>{parse_ms.toFixed(3)}ms</b>
			{:else}
				twinkling · <b>{lit}/{total}</b> tokens
			{/if}
		</span>
	</div>
</div>

<style>
	.card {
		border: 1px solid var(--line);
		background: var(--bg2);
		position: relative;
		transition: border-color 0.25s;
	}
	.card:hover {
		border-color: var(--line2);
	}

	.bar {
		padding: 10px 16px;
		font-size: 12px;
		color: var(--ink2);
		border-top: 1px solid var(--line);
		background: var(--bg3);
	}
	.bar b {
		font-weight: 400;
		color: var(--green);
	}

	.code {
		display: block;
		margin: 0;
		padding: 16px 20px;
		/* the ua gives pre its own monospace */
		font-family: inherit;
		font-size: clamp(11.5px, 1vw, 13px);
		line-height: 1.6;
		letter-spacing: 0;
		/* as the lab: `=>` and `</` spelled out, not drawn as ligatures */
		font-feature-settings:
			"liga" 0,
			"calt" 0;
		white-space: pre-wrap;
		overflow-wrap: break-word;
		tab-size: 2;
		user-select: none;
		-webkit-user-select: none;
		/* quick taps stay taps, not a double-tap zoom */
		touch-action: manipulation;
		/* a pixel-art wand: a star at the tip, the hotspot, on a rainbow stick */
		cursor:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26' shape-rendering='crispEdges'%3E%3Crect x='3' y='0' width='3' height='3' fill='%23fff'/%3E%3Crect x='0' y='3' width='3' height='3' fill='%23fff'/%3E%3Crect x='6' y='3' width='3' height='3' fill='%23fff'/%3E%3Crect x='3' y='6' width='3' height='3' fill='%23fff'/%3E%3Crect x='3' y='3' width='3' height='3' fill='%23e6c07b'/%3E%3Crect x='8' y='8' width='3' height='3' fill='%23c792ea'/%3E%3Crect x='10' y='10' width='3' height='3' fill='%237cb7ff'/%3E%3Crect x='12' y='12' width='3' height='3' fill='%235be08c'/%3E%3Crect x='14' y='14' width='3' height='3' fill='%23e6c07b'/%3E%3Crect x='16' y='16' width='3' height='3' fill='%23f2a25c'/%3E%3Crect x='18' y='18' width='3' height='3' fill='%23f0716c'/%3E%3Crect x='20' y='20' width='3' height='3' fill='%23d8d8d8'/%3E%3Crect x='22' y='22' width='3' height='3' fill='%23d8d8d8'/%3E%3C/svg%3E")
				4 4,
			crosshair;

		--tok-keyword: var(--red);
		--tok-function: var(--yellow);
		--tok-parameter: var(--orange);
		--tok-type: var(--blue);
		--tok-class_name: var(--blue);
		--tok-constant: var(--blue);
		--tok-variable: var(--blue);
		--tok-property: var(--blue);
		--tok-builtin: var(--blue);
		--tok-string: var(--green);
		--tok-template: var(--green);
		--tok-regex: var(--green);
		--tok-string_escape: var(--purple);
		--tok-interpolation: var(--purple);
		--tok-decorator: var(--purple);
		--tok-number: var(--pink);
		--tok-boolean: var(--pink);
		--tok-null: var(--pink);
		--tok-punctuation: var(--ink2);
		--tok-operator: var(--ink2);
		--tok-comment: var(--ink2);
		--tok-identifier: var(--ink);
	}
	/* a white star is lost on paper: ink star, light-mode rainbow */
	:global(:root[data-mode="light"]) .code {
		cursor:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26' shape-rendering='crispEdges'%3E%3Crect x='3' y='0' width='3' height='3' fill='%23171715'/%3E%3Crect x='0' y='3' width='3' height='3' fill='%23171715'/%3E%3Crect x='6' y='3' width='3' height='3' fill='%23171715'/%3E%3Crect x='3' y='6' width='3' height='3' fill='%23171715'/%3E%3Crect x='3' y='3' width='3' height='3' fill='%23e6c07b'/%3E%3Crect x='8' y='8' width='3' height='3' fill='%237b3fb8'/%3E%3Crect x='10' y='10' width='3' height='3' fill='%231b5fc4'/%3E%3Crect x='12' y='12' width='3' height='3' fill='%230f7a3f'/%3E%3Crect x='14' y='14' width='3' height='3' fill='%237a5c00'/%3E%3Crect x='16' y='16' width='3' height='3' fill='%23a4520a'/%3E%3Crect x='18' y='18' width='3' height='3' fill='%23b8321f'/%3E%3Crect x='20' y='20' width='3' height='3' fill='%2333332f'/%3E%3Crect x='22' y='22' width='3' height='3' fill='%2333332f'/%3E%3C/svg%3E")
				4 4,
			crosshair;
	}

	.tok {
		color: var(--unlit);
		transition:
			color 0.35s,
			text-shadow 0.35s;
	}
	.tok:global([data-lit]) {
		color: var(--tc);
	}

	.ring {
		position: absolute;
		z-index: 31;
		width: calc(2 * var(--r));
		height: calc(2 * var(--r));
		margin: calc(-1 * var(--r)) 0 0 calc(-1 * var(--r));
		border: 1px dashed var(--ink2);
		border-radius: 50%;
		pointer-events: none;
		animation: ring 0.55s ease-out forwards;
	}
	@keyframes ring {
		from {
			transform: scale(0.5);
			opacity: 0.9;
		}
		to {
			transform: scale(1);
			opacity: 0;
		}
	}

	@media (max-width: 760px) {
		.code {
			padding: 14px 16px;
			font-size: 12.5px;
			line-height: 1.7;
		}
		.bar {
			padding: 8px 12px;
			font-size: 11px;
		}
	}
</style>
