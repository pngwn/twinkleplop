<script lang="ts">
	import { onMount } from "svelte";
	import { tokenize as ts_tokenize } from "@twinkleplop/typescript";
	import { measure } from "$lib/explore/measure";
	import { HIT_RADIUS } from "./plop";

	const tokenize = ts_tokenize({ fidelity: "high" });

	// every token the wand lights costs the wordmark a pair of pixels, so
	// this has half as many tokens as "twinkleplop" has pixels, rounded up:
	// 62 for 123, the odd pixel flying alone. every line but the first
	// import fits a phone's card as is; that one wraps there and sits on one
	// line wherever there is room. recount if either changes.
	const SOURCE = `import { language } from "@twinkleplop/typescript";
import "@twinkleplop/theme-github";

const ts = language();
for (const [i, src] of docs) {
  const html = ts(src, {
    line_numbers: i > 0,
    attributes: { id: \`doc-\${i}\` },
  });
  el[i].innerHTML = html;
}`;

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

	// wall-clock time from the first cast to the last token, for the joke
	// next to the parse time
	let started = 0;
	let spent_ms = $state(0);
	const spent = $derived(
		spent_ms < 60000
			? `${(spent_ms / 1000).toFixed(1)}s`
			: `${Math.floor(spent_ms / 60000)}m ${Math.round((spent_ms % 60000) / 1000)}s`
	);

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

	// dragging paints casts along the path: from the press with a mouse,
	// and on touch only after a short hold, so a swipe still scrolls
	const PAINT_STEP = 14;
	const HOLD_MS = 150;
	// far enough to call it a swipe rather than a hold
	const SLIP = 8;

	let painting = false;
	let hold: ReturnType<typeof setTimeout> | undefined;
	let last_x = 0;
	let last_y = 0;
	// the ring the wand carries while painting, in card coordinates, and
	// the code's box to keep it over the code
	let live: { x: number; y: number } | null = $state(null);
	let code_box: DOMRect | undefined;

	function cast(e: PointerEvent) {
		last_x = e.clientX;
		last_y = e.clientY;
		on_cast(e.pageX, e.pageY);
	}

	// where the ring sits, unless the wand has wandered off the code
	function aim(e: PointerEvent) {
		const box = card!.getBoundingClientRect();
		const over =
			code_box &&
			e.clientX >= code_box.left &&
			e.clientX <= code_box.right &&
			e.clientY >= code_box.top &&
			e.clientY <= code_box.bottom;
		live = over ? { x: e.clientX - box.left, y: e.clientY - box.top } : null;
	}

	// a ring left to fade where the wand just cast
	function pulse() {
		if (!live) return;
		const id = next_ring++;
		const { x, y } = live;
		rings.push({ id, x, y });
		setTimeout(() => (rings = rings.filter((r) => r.id !== id)), 600);
	}

	// on release the wand goes with it
	function drop_ring() {
		pulse();
		live = null;
	}

	// --- keyboard: the wand hops from token to token

	// where the wand sits, as an index into the tokens
	let key_at = -1;

	const all_tokens = () => [...pre!.querySelectorAll<HTMLElement>(".tok")];

	function aim_at(el: HTMLElement) {
		const box = card!.getBoundingClientRect();
		const r = el.getBoundingClientRect();
		live = { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
	}

	// left and right walk the code as it reads; up and down land on the
	// nearest token in the row above or below
	function hop(tokens: HTMLElement[], dx: number, dy: number) {
		if (dx) {
			key_at = Math.min(tokens.length - 1, Math.max(0, key_at + dx));
			return;
		}
		const boxes = tokens.map((el) => el.getBoundingClientRect());
		const from = boxes[key_at];
		const cx = from.left + from.width / 2;
		// a wrapped line is two rows, so rows come from where tokens sit
		let row: number | null = null;
		for (const box of boxes) {
			const step = box.top - from.top;
			if (step * dy <= 1) continue;
			if (row === null || Math.abs(step) < Math.abs(row - from.top)) row = box.top;
		}
		if (row === null) return;
		let best = -1;
		let score = Infinity;
		boxes.forEach((box, i) => {
			if (box.top !== row) return;
			const ex = Math.abs(box.left + box.width / 2 - cx);
			if (ex < score) {
				score = ex;
				best = i;
			}
		});
		if (best >= 0) key_at = best;
	}

	function focus_code() {
		const tokens = all_tokens();
		if (!tokens.length || painting) return;
		// start where there is still something to light
		if (key_at < 0) key_at = Math.max(0, tokens.findIndex((t) => !t.hasAttribute("data-lit")));
		aim_at(tokens[key_at]);
	}

	function blur_code() {
		if (!painting) live = null;
	}

	const ARROWS: Record<string, [number, number]> = {
		ArrowLeft: [-1, 0],
		ArrowRight: [1, 0],
		ArrowUp: [0, -1],
		ArrowDown: [0, 1]
	};

	function key(e: KeyboardEvent) {
		const tokens = all_tokens();
		if (!tokens.length) return;
		if (key_at < 0) key_at = 0;
		const arrow = ARROWS[e.key];
		if (arrow) {
			// the page would scroll otherwise
			e.preventDefault();
			hop(tokens, arrow[0], arrow[1]);
			aim_at(tokens[key_at]);
			return;
		}
		if (e.key !== "Enter" && e.key !== " ") return;
		e.preventDefault();
		const el = tokens[key_at];
		const r = el.getBoundingClientRect();
		aim_at(el);
		pulse();
		on_cast(r.left + window.scrollX + r.width / 2, r.top + window.scrollY + r.height / 2);
	}

	function down(e: PointerEvent) {
		if (e.button > 0) return;
		pre!.setPointerCapture(e.pointerId);
		code_box = pre!.getBoundingClientRect();
		if (e.pointerType !== "touch") {
			painting = true;
			aim(e);
			cast(e);
			return;
		}
		// a tap casts when the finger lifts; a hold turns into painting
		last_x = e.clientX;
		last_y = e.clientY;
		hold = setTimeout(() => {
			hold = undefined;
			painting = true;
			aim(e);
			cast(e);
		}, HOLD_MS);
	}

	function move(e: PointerEvent) {
		const moved = Math.hypot(e.clientX - last_x, e.clientY - last_y);
		// moving before the hold is up means they meant to scroll
		if (hold && moved > SLIP) {
			clearTimeout(hold);
			hold = undefined;
		}
		if (!painting) return;
		// the ring follows every move; casting waits for a step
		aim(e);
		if (moved >= PAINT_STEP) cast(e);
	}

	function up(e: PointerEvent) {
		if (hold) {
			clearTimeout(hold);
			hold = undefined;
			aim(e);
			cast(e);
		}
		painting = false;
		drop_ring();
	}

	function cancel() {
		clearTimeout(hold);
		hold = undefined;
		painting = false;
		live = null;
	}

	$effect(() => {
		if (lit > 0 && !started) started = Date.now();
		if (total > 0 && lit >= total && started && !spent_ms) spent_ms = Date.now() - started;
	});

	onMount(() => {
		on_targets([...pre!.querySelectorAll<HTMLElement>(".tok")]);
		// the page is free to scroll until a hold turns into a drag, so this
		// has to be able to cancel the scroll: not a passive listener
		const keep = (e: TouchEvent) => painting && e.preventDefault();
		pre!.addEventListener("touchmove", keep, { passive: false });
		// timing a microsecond-scale call means running it for a few ms, so
		// keep it out of hydration
		const id = setTimeout(() => {
			parse_ms = measure(() => tokenize(SOURCE), { samples: 10 }).ms;
		}, 150);
		return () => {
			clearTimeout(id);
			pre!.removeEventListener("touchmove", keep);
		};
	});
</script>

<div class="card" bind:this={card}>
	<!-- whitespace in here is rendered -->
	<div class="editor">
		<!-- pointer, touch or keyboard: the code takes focus and the arrows
		     hop the wand from token to token -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -->
		<!-- prettier-ignore -->
		<pre class="code" bind:this={pre} tabindex="0" role="group" aria-label="twinkleplop sample: arrow keys move the wand, enter twinkles the code under it" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={cancel} onkeydown={key} onfocus={focus_code} onblur={blur_code}>{#each segments as segment}{#if segment.type}<span class="tok" style:--tc="var(--tok-{segment.type}, var(--ink))">{segment.text}</span>{:else}{segment.text}{/if}{/each}</pre>
		{#if lit === 0}
			<!-- the cursor carries the hint on a pointer; touch gets the wand
			     in the corner, pointing back into the code, until the first
			     token lights -->
			<svg class="wand" viewBox="0 0 26 26" shape-rendering="crispEdges" aria-hidden="true">
				<g fill="var(--ink)">
					<rect x="6" y="2" width="3" height="3" />
					<rect x="3" y="5" width="3" height="3" />
					<rect x="9" y="5" width="3" height="3" />
					<rect x="6" y="8" width="3" height="3" />
				</g>
				<rect x="6" y="5" width="3" height="3" fill="var(--yellow)" />
				<rect x="10" y="10" width="3" height="3" fill="var(--purple)" />
				<rect x="13" y="13" width="3" height="3" fill="var(--blue)" />
				<rect x="16" y="16" width="3" height="3" fill="var(--green)" />
				<rect x="19" y="19" width="3" height="3" fill="var(--orange)" />
				<rect x="22" y="22" width="3" height="3" fill="var(--red)" />
				<rect x="16" y="4" width="2" height="2" fill="var(--pink)" />
				<rect x="21" y="9" width="2" height="2" fill="var(--blue)" />
				<rect x="2" y="13" width="2" height="2" fill="var(--green)" />
			</svg>
		{/if}
	</div>
	{#if live}
		<span class="ring live" style:translate="{live.x}px {live.y}px" style:--r="{HIT_RADIUS}px"></span>
	{/if}
	{#each rings as ring (ring.id)}
		<span class="ring gone" style:translate="{ring.x}px {ring.y}px" style:--r="{HIT_RADIUS}px"></span>
	{/each}
	<div class="bar">
		<span>
			{#if lit === 0}
				no twinkle :[
			{:else if lit >= total}
				twinkled in <b>{parse_ms.toFixed(3)}ms</b> · your time <b>{spent}</b>
			{:else}
				twinkling · <b>{lit}/{total}</b> twinkles
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
	/* the code takes the focus; the card wears the ring */
	.card:has(.code:focus-visible) {
		outline: 2px solid var(--green);
		outline-offset: 2px;
	}
	.code:focus {
		outline: none;
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

	.editor {
		position: relative;
	}
	/* pinned to the corner of the card, not the scrolling code, breathing
	 * slowly so it is noticed without insisting */
	.wand {
		position: absolute;
		right: 10px;
		bottom: 10px;
		width: 26px;
		height: 26px;
		display: none;
		pointer-events: none;
		opacity: 0.85;
		animation: wand 2.6s ease-in-out infinite;
	}
	@keyframes wand {
		0%,
		100% {
			opacity: 0.55;
		}
		50% {
			opacity: 0.95;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.wand {
			animation: none;
		}
	}
	/* where there is no pointer there is no wand cursor to find */
	@media (hover: none) {
		.wand {
			display: block;
		}
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
		/* a line too wide for the card wraps at a space; a single token too
		 * wide to fit scrolls instead, since a token split over two rows
		 * would be aimed at by its union box */
		white-space: pre-wrap;
		overflow-wrap: normal;
		overflow-x: auto;
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

	/* the wand's reticle: it opens where the press lands, rides along with
	 * the drag, and is left behind to fade on release */
	.ring {
		position: absolute;
		z-index: 31;
		top: 0;
		left: 0;
		width: calc(2 * var(--r));
		height: calc(2 * var(--r));
		margin: calc(-1 * var(--r)) 0 0 calc(-1 * var(--r));
		border: 1px dashed var(--ink2);
		border-radius: 50%;
		pointer-events: none;
	}
	.ring.live {
		animation: ring_in 0.12s ease-out both;
	}
	.ring.gone {
		animation: ring_out 0.45s ease-out forwards;
	}
	@keyframes ring_in {
		from {
			transform: scale(0.5);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 0.9;
		}
	}
	@keyframes ring_out {
		from {
			transform: scale(1);
			opacity: 0.9;
		}
		to {
			transform: scale(1.3);
			opacity: 0;
		}
	}

	@media (max-width: 760px) {
		.code {
			padding: 14px 16px;
			font-size: 11.5px;
			line-height: 1.6;
		}
		.bar {
			padding: 8px 12px;
			font-size: 11px;
		}
	}
</style>
