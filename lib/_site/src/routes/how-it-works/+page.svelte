<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const beats = [
		[
			'One helper. A whole little machine.',
			'Describe a string by the characters that open, close, and escape it.'
		],
		[
			'Between the quotes is a new place.',
			'The start quote enters it. The end quote returns from it.'
		],
		[
			'An escape needs a place of its own.',
			'Take one character literally, then return to the string.'
		],
		[
			'That is where the states come from.',
			'Each place has different rules for the same characters.'
		],
		[
			'Give each route an address.',
			'The compiler stores character → rule → action. Here is the opening quote.'
		],
		[
			'Now let some source use it.',
			'The machine begins in root. Follow the character through its route.'
		],
		[
			'The first quote takes us inside.',
			'Remember root as the return address. Begin a string token.'
		],
		[
			'Ordinary characters stay inside.',
			'The body rule consumes h and i together. The same token grows.'
		],
		['The backslash takes a detour.', 'Remember inside. The next character gets the escape rule.'],
		['This quote does not close the string.', 'Consume it literally, then return to inside.'],
		['This quote does.', 'After the !, the closing quote returns to root. The string is complete.'],
		[
			'Seven characters. One token.',
			'Keep the original source. Store its type and its start and end offsets.'
		]
	];
	let scroll = $state(0);
	let reduced = $state(false);
	let story: HTMLElement;
	const clamp = (v: number) => Math.min(1, Math.max(0, v));
	const smooth = (v: number) => {
		const t = clamp(v);
		return t * t * (3 - 2 * t);
	};
	const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
	let beat = $derived(Math.min(11, Math.floor(scroll + 0.55)));
	let time = $derived(reduced ? beat : scroll);
	const phase = (a: number, b: number) => smooth((time - a) / (b - a));
	let split = $derived(phase(0.12, 0.92));
	let detour = $derived(phase(1.12, 1.92));
	let compiled = $derived(phase(3.1, 3.9) * (1 - phase(4.15, 4.9)));
	let runtime = $derived(phase(4.2, 4.95));
	let output = $derived(phase(10.12, 10.95));
	let machine = $derived(1 - output);
	let quiet = $derived(1 - compiled);
	let id_visible = $derived(phase(3.15, 3.8));

	// The helper's frame becomes the inside state. Its root badge becomes root.
	let root = $derived({
		x: lerp(282, lerp(230, 176, compiled), split),
		y: lerp(165, 300, split),
		w: lerp(110, 150, split),
		h: lerp(36, 150, split)
	});
	let inside = $derived({
		x: lerp(640, lerp(640, 1034, compiled), split),
		y: lerp(305, 300, split),
		w: lerp(790, lerp(170, 194, compiled), split),
		h: lerp(334, lerp(170, 150, compiled), split)
	});
	let escape = $derived({ x: lerp(850, 1050, detour), y: 300, size: 160 * detour });
	let start = $derived({
		x: lerp(395, lerp(433, 483, compiled), split),
		y: lerp(310, lerp(187, 265, compiled), split)
	});
	let end = $derived({ x: lerp(640, 433, split), y: lerp(310, 417, split) });
	let slash = $derived({
		x: lerp(885, lerp(850, 847, detour), split),
		y: lerp(310, lerp(300, 187, detour), split)
	});
	const path = (points: number[]) => `M ${points[0]} ${points[1]} C ${points.slice(2).join(' ')}`;
	const cubic = (points: number[], t: number) => {
		const k = 1 - t;
		return {
			x:
				k * k * k * points[0] +
				3 * k * k * t * points[2] +
				3 * k * t * t * points[4] +
				t * t * t * points[6],
			y:
				k * k * k * points[1] +
				3 * k * k * t * points[3] +
				3 * k * t * t * points[5] +
				t * t * t * points[7]
		};
	};
	let opening = $derived([
		lerp(root.x + root.w * 0.36, root.x + root.w / 2, compiled),
		lerp(root.y - root.h * 0.36, root.y, compiled),
		lerp(375, 410, compiled),
		lerp(123, 300, compiled),
		lerp(495, 830, compiled),
		lerp(123, 300, compiled),
		lerp(inside.x - inside.w * 0.36, inside.x - inside.w / 2, compiled),
		lerp(inside.y - inside.h * 0.36, inside.y, compiled)
	]);
	let closing = $derived([
		inside.x - inside.w * 0.36,
		inside.y + inside.h * 0.36,
		490,
		482,
		370,
		482,
		root.x + root.w * 0.36,
		root.y + root.h * 0.36
	]);
	const escaping = [701, 240, 790, 123, 913, 123, 992, 243];
	const returning = [992, 357, 910, 480, 790, 480, 701, 360];
	const body_loop = [607, 225, 543, 77, 737, 77, 673, 225];
	// Each event lifts source characters into a route, traverses it, then extends
	// the token. Durations are scroll distances, so backward scrolling is exact.
	let events = $derived([
		{ start: 5, end: 6, from: 0, to: 1, index: 0, text: '"', route: opening },
		{ start: 6, end: 7, from: 1, to: 3, index: 1.5, text: 'hi', route: body_loop },
		{ start: 7, end: 8, from: 3, to: 4, index: 3, text: '\\', route: escaping },
		{ start: 8, end: 9, from: 4, to: 5, index: 4, text: '"', route: returning },
		{ start: 9, end: 9.35, from: 5, to: 6, index: 5, text: '!', route: body_loop },
		{ start: 9.35, end: 10, from: 6, to: 7, index: 6, text: '"', route: closing }
	]);
	let event = $derived(events.find((entry) => time < entry.end) ?? events[5]);
	let event_time = $derived((time - event.start) / (event.end - event.start));
	let lift = $derived(smooth((event_time - 0.06) / 0.22));
	let travel = $derived(smooth((event_time - 0.28) / 0.62));
	let packet = $derived.by(() => {
		const point = cubic(event.route, travel);
		return {
			x: lerp(448 + event.index * 64, point.x, lift),
			y: lerp(540, point.y, lift),
			text: event.text
		};
	});
	let packet_visible = $derived(time >= 5 && time < 10 && lift > 0 && travel < 1);
	let completed = $derived(time < 5 ? 0 : travel === 1 ? event.to : event.from);
	let span_end = $derived(
		time < 5 ? 0 : lerp(event.from, event.to, smooth((event_time - 0.72) / 0.18))
	);
	let active = $derived(
		completed === 0 || completed === 7 ? 'root' : completed === 4 ? 'escape' : 'inside'
	);
	let save_root = $derived(phase(5.25, 5.9) * (1 - phase(9.5, 9.935)));
	let save_inside = $derived(phase(7.2, 7.9) * (1 - phase(8.2, 8.9)));
	let source_y = $derived(lerp(540, 170, output));
	const char_x = (i: number) => 448 + i * 64;
	function go(n: number) {
		window.scrollTo({
			top:
				window.scrollY +
				story.getBoundingClientRect().top +
				Math.max(0, Math.min(11, n)) * window.innerHeight * 0.9,
			behavior: reduced ? 'instant' : 'smooth'
		});
	}
	onMount(() => {
		const preference = matchMedia('(prefers-reduced-motion: reduce)');
		const set_preference = () => {
			reduced = preference.matches;
		};
		let frame = 0;
		const update = () => {
			frame = 0;
			scroll = Math.max(0, Math.min(11, -story.getBoundingClientRect().top / (innerHeight * 0.9)));
		};
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};
		set_preference();
		update();
		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule);
		preference.addEventListener('change', set_preference);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			preference.removeEventListener('change', set_preference);
		};
	});
</script>

<svelte:head>
	<title>One helper, a whole machine — twinkleplop</title>
	<meta
		name="description"
		content="Watch a quoted-string helper unfold into a state machine, compile into tables, and turn seven characters into one token."
	/>
</svelte:head>

<main bind:this={story} class="story">
	<div class="screen">
		<header>
			<a href="/" class="brand">✳ <span>twinkleplop</span></a><span class="part"
				>{beat < 4
					? 'Build the machine'
					: beat === 4
						? 'Compile its routes'
						: beat < 11
							? 'Use the machine'
							: 'Keep the spans'}</span
			><a href="/explore/svelte" class="explore">Explore</a>
		</header>
		<div class="caption">
			<h1>{beats[beat][0]}</h1>
			<p>{beats[beat][1]}</p>
		</div>
		<div class="canvas">
			<svg viewBox="80 80 1120 540" role="img" aria-labelledby="visual-title visual-description">
				<title id="visual-title">{beats[beat][0]}</title><desc id="visual-description"
					>{beats[beat][1]}</desc
				>
				<defs
					><marker
						id="route-arrow"
						viewBox="0 0 12 12"
						refX="10"
						refY="6"
						markerWidth="7"
						markerHeight="7"
						orient="auto"
						><path
							d="M2 2 L10 6 L2 10"
							fill="none"
							stroke="context-stroke"
							stroke-width="1.5"
						/></marker
					></defs
				>

				<g opacity={machine}>
					<!-- The perimeter and labels survive the transformation; no replacement scene. -->
					<rect
						x={inside.x - inside.w / 2}
						y={inside.y - inside.h / 2}
						width={inside.w}
						height={inside.h}
						rx={lerp(18, 85, split) * (1 - compiled * 0.8)}
						class="inside-surface"
					/>
					<rect
						x={root.x - root.w / 2}
						y={root.y - root.h / 2}
						width={root.w}
						height={root.h}
						rx={lerp(18, 75, split) * (1 - compiled * 0.8)}
						class="root-surface"
					/>
					<text
						x={root.x}
						y={lerp(root.y + 6, root.y + 9, split)}
						class="state-name"
						text-anchor="middle">root</text
					>
					<text
						x={inside.x}
						y={lerp(215, 309, split)}
						text-anchor="middle"
						class="state-name purple">{split < 0.4 ? 'match_within' : 'inside'}</text
					>
					<text
						x="640"
						y="429"
						text-anchor="middle"
						class="small purple"
						opacity={1 - phase(0.1, 0.35)}>emit string</text
					>
					<text x={root.x} y="338" text-anchor="middle" class="state-id" opacity={id_visible}
						>{data.states[0].id}</text
					>
					<text x={inside.x} y="338" text-anchor="middle" class="state-id" opacity={id_visible}
						>{data.action[0]}</text
					>
					<g opacity={detour * quiet}>
						<rect
							x={escape.x - escape.size / 2}
							y={escape.y - escape.size / 2}
							width={escape.size}
							height={escape.size}
							rx={escape.size / 2}
							class="escape-surface"
						/>
						<text x={escape.x} y="309" class="state-name amber" text-anchor="middle">escape</text>
						<text x={escape.x} y="338" class="state-id" text-anchor="middle" opacity={id_visible}
							>{data.states.find((s) => s.label === 'escape')?.id}</text
						>
					</g>

					<!-- Route strokes are drawn out of the original helper fields. -->
					<path
						d={path(opening)}
						class="route teal-line"
						pathLength="1"
						stroke-dasharray="1"
						stroke-dashoffset={1 - split}
						marker-end={split > 0.9 ? 'url(#route-arrow)' : undefined}
					/>
					<path
						d={path(closing)}
						class="route purple-line"
						pathLength="1"
						stroke-dasharray="1"
						stroke-dashoffset={1 - split}
						opacity={quiet}
						marker-end={split > 0.9 ? 'url(#route-arrow)' : undefined}
					/>
					<path
						d={path(escaping)}
						class="route amber-line"
						pathLength="1"
						stroke-dasharray="1"
						stroke-dashoffset={1 - detour}
						opacity={quiet}
						marker-end={detour > 0.9 ? 'url(#route-arrow)' : undefined}
					/>
					<path
						d={path(returning)}
						class="route amber-line"
						pathLength="1"
						stroke-dasharray="1"
						stroke-dashoffset={1 - phase(1.45, 2)}
						opacity={quiet}
						marker-end={detour > 0.9 ? 'url(#route-arrow)' : undefined}
					/>
					<path
						d={path(body_loop)}
						class="route purple-line"
						pathLength="1"
						stroke-dasharray="1"
						stroke-dashoffset={1 - phase(2.15, 2.9)}
						opacity={quiet}
						marker-end={time > 2.9 ? 'url(#route-arrow)' : undefined}
					/>

					<!-- These three pieces begin inside match_within and become edge labels. -->
					<g transform={`translate(${start.x}, ${start.y})`}>
						<rect x="-63" y="-46" width="126" height="92" rx="12" class="start-field" />
						<text y="-15" text-anchor="middle" class="field-name teal">start</text><text
							y="29"
							text-anchor="middle"
							class="character teal">"</text
						>
					</g>
					<g transform={`translate(${end.x}, ${end.y}) scale(${quiet})`}>
						<rect x="-63" y="-46" width="126" height="92" rx="12" class="end-field" />
						<text y="-15" text-anchor="middle" class="field-name purple">end</text><text
							y="29"
							text-anchor="middle"
							class="character purple">"</text
						>
					</g>
					<g transform={`translate(${slash.x}, ${slash.y}) scale(${quiet})`}>
						<rect x="-63" y="-46" width="126" height="92" rx="12" class="escape-field" />
						<text y="-15" text-anchor="middle" class="field-name amber">escape</text><text
							y="29"
							text-anchor="middle"
							class="character amber">\</text
						>
					</g>
					<g opacity={detour * quiet}
						><rect x="773" y="394" width="148" height="42" rx="21" class="label-bg" /><text
							x="847"
							y="421"
							text-anchor="middle"
							class="edge-label amber">one character</text
						></g
					>
					<g opacity={phase(2.2, 2.9) * quiet}
						><rect x="557" y="107" width="166" height="36" rx="18" class="label-bg" /><text
							x="640"
							y="131"
							text-anchor="middle"
							class="edge-label purple">anything else</text
						></g
					>
					<text
						x="230"
						y="420"
						text-anchor="middle"
						class="small"
						opacity={phase(0.8, 1) * (1 - runtime) * quiet}>already existed</text
					>
					<text
						x="640"
						y="420"
						text-anchor="middle"
						class="small purple"
						opacity={phase(0.8, 1) * (1 - runtime) * quiet}>created by the helper</text
					>
					<text
						x="1050"
						y="420"
						text-anchor="middle"
						class="small amber"
						opacity={phase(1.8, 2) * (1 - runtime) * quiet}>created by escape</text
					>

					<!-- A single compiled route; the quote and destination are the same objects. -->
					<g opacity={compiled}>
						<text x="483" y="172" text-anchor="middle" class="small">character map for root</text>
						<g transform={`translate(299, 359) scale(${compiled}, 1)`}>
							{#each data.quote_map as cell, i}<rect
									x={i * 53}
									width="48"
									height="50"
									rx="5"
									class:chosen={cell.code === 34}
									class="map-cell"
								/><text x={i * 53 + 24} y="32" text-anchor="middle" class="mono small"
									>{cell.rule === 65535 ? '—' : cell.rule}</text
								><text x={i * 53 + 24} y="76" text-anchor="middle" class="tiny">{cell.code}</text
								>{/each}
						</g>
						<path d="M 483 313 L 483 337 L 432 337 L 432 353" class="guide" />
						<rect x="750" y="266" width="128" height="68" rx="12" class="rule-surface" /><text
							x="814"
							y="308"
							text-anchor="middle"
							class="small">rule {data.quote_rule}</text
						>
						<text x="1034" y="192" class="small" text-anchor="middle">action</text>
						<text x="1034" y="411" class="small" text-anchor="middle">push · emit string</text>
						<text x="1034" y="445" class="mono tiny" text-anchor="middle"
							>[{data.action.join(', ')}]</text
						>
					</g>

					<!-- Runtime: a character visibly follows one of the routes just constructed. -->
					<g opacity={runtime * quiet}>
						<circle
							cx={active === 'root' ? 230 : active === 'inside' ? 640 : 1050}
							cy="300"
							r={active === 'root' ? 86 : 95}
							class="active-ring"
						/>
						{#if packet_visible}
							<g transform={`translate(${packet.x}, ${packet.y})`}
								><circle r="30" class="packet" /><text
									y="10"
									text-anchor="middle"
									class="packet-letter">{packet.text}</text
								></g
							>
						{/if}
						<!-- A return address travels from its state to the saved frame. -->
						<g
							transform={`translate(${lerp(230, 615, save_root)}, ${lerp(300, 453, save_root)}) scale(${save_root})`}
							><rect x="-46" y="-17" width="92" height="34" rx="17" class="saved-root" /><text
								y="6"
								text-anchor="middle"
								class="tiny">↶ root</text
							></g
						>
						<g
							transform={`translate(${lerp(640, 1075, save_inside)}, ${lerp(300, 453, save_inside)}) scale(${save_inside})`}
							><rect x="-58" y="-17" width="116" height="34" rx="17" class="saved-inside" /><text
								y="6"
								text-anchor="middle"
								class="tiny purple">↶ inside</text
							></g
						>
					</g>
				</g>

				<!-- The seven source characters persist, then their span becomes the result. -->
				<g opacity={runtime} transform={`translate(0, ${source_y})`}>
					<text x="365" y="10" class="small" text-anchor="end">source</text>
					{#each [...data.source] as char, i}
						<text
							x={char_x(i)}
							y="12"
							text-anchor="middle"
							class="source-character"
							opacity={packet_visible && i >= event.from && i < event.to ? 0.18 : 1}
							class:consumed={i < completed}>{char}</text
						>
						<text x={char_x(i)} y="44" text-anchor="middle" class="tiny" opacity={output}>{i}</text>
					{/each}
					<path
						d={`M 422 31 L 422 39 L ${422 + Math.max(0, span_end) * 64} 39 L ${422 + Math.max(0, span_end) * 64} 31`}
						class="token-span"
						opacity={span_end > 0 ? 1 : 0}
						transform={`translate(0, ${output * 28})`}
					/>
					<text
						x="644"
						y={75 + output * 28}
						text-anchor="middle"
						class="small purple"
						opacity={span_end > 0 ? 1 : 0}>{output > 0.5 ? 'one string span' : 'string'}</text
					>
				</g>
				<g opacity={output} transform={`translate(0, ${35 * (1 - output)})`}>
					<path d="M 644 284 L 644 344" class="guide" marker-end="url(#route-arrow)" />
					{#each ['type', 'start', 'end'] as label, i}<rect
							x={434 + i * 140}
							y="370"
							width="132"
							height="100"
							rx="10"
							class="result-cell"
						/><text x={500 + i * 140} y="432" text-anchor="middle" class="result-value"
							>{data.tokens[i]}</text
						><text x={500 + i * 140} y="510" text-anchor="middle" class="small">{label}</text
						>{/each}
					<text x="640" y="566" text-anchor="middle" class="small purple"
						>type 0 = string · end 7 is exclusive</text
					>
				</g>
			</svg>
		</div>
		<footer>
			{#if beat === 11}<button class="restart" onclick={() => go(0)}>↶ Start again</button
				>{:else}<span class="scroll-hint">↓ Scroll to transform</span>{/if}
			<div class="progress" aria-hidden="true">
				<span style={`transform: scaleX(${scroll / 11})`}></span>
			</div>
			<div class="controls">
				<button onclick={() => go(beat - 1)} disabled={beat === 0} aria-label="Previous scene"
					>←</button
				><span>{String(beat + 1).padStart(2, '0')} / 12</span><button
					onclick={() => go(beat + 1)}
					disabled={beat === 11}
					aria-label="Next scene">→</button
				>
			</div>
		</footer>
	</div>
</main>
<section class="afterword">
	<p>
		This is one ASCII string helper, using twinkleplop’s actual compiler and token output. Larger
		grammars add more routes; the runtime stays the same.
	</p>
	<a href="https://github.com/pngwn/twinkleplop/blob/main/lib/core/src/compiler.ts"
		>Read the compiler ↗</a
	><a href="/explore/svelte">Explore a language ↗</a>
</section>

<style>
	.story,
	.afterword {
		--ink: #303748;
		--muted: #768091;
		--purple: #7559a9;
		--paper: #f7f8fb;
		font-family: 'Avenir Next', Avenir, 'Segoe UI', sans-serif;
		color: var(--ink);
		background: var(--paper);
	}
	.story {
		height: 1090vh;
	}
	.screen {
		position: sticky;
		top: 0;
		height: 100vh;
		min-height: 640px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	header {
		padding: 0 4%;
		flex: 0 0 65px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	a {
		color: var(--ink);
	}
	a:hover {
		color: var(--purple);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 24px;
		color: var(--purple);
	}
	.brand span {
		color: var(--ink);
		font-size: 16px;
		font-weight: 650;
		letter-spacing: -0.5px;
	}
	.part,
	.explore {
		color: var(--muted);
		font-size: 12px;
	}
	.caption {
		text-align: center;
		flex: 0 0 110px;
		padding: 14px 20px 0;
	}
	h1 {
		color: var(--ink);
		font-size: clamp(27px, 3vw, 44px);
		font-weight: 500;
		letter-spacing: -1.4px;
		line-height: 1.2;
		margin: 0 0 13px;
	}
	.caption p {
		font-size: 15px;
		color: #667184;
		margin: 0;
	}
	.canvas {
		min-height: 0;
		flex: 1;
		position: relative;
		padding: 0 3%;
	}
	svg {
		position: absolute;
		inset: 0 3%;
		width: 94%;
		height: 100%;
		max-width: none;
		display: block;
		overflow: visible;
	}
	svg text {
		font-family: 'Avenir Next', Avenir, 'Segoe UI', sans-serif;
		fill: #6c7585;
	}
	.state-name {
		font-size: 29px;
		font-weight: 550;
		fill: #303748;
	}
	.state-id {
		font-size: 18px;
		fill: #959aaa;
	}
	.small {
		font-size: 19px;
	}
	.tiny {
		font-size: 15px;
	}
	.edge-label,
	.field-name {
		font-size: 18px;
	}
	.character {
		font-family: 'Courier New', monospace;
		font-size: 48px;
	}
	.mono {
		font-family: 'Courier New', monospace;
	}
	.purple {
		fill: #7559a9;
	}
	.teal {
		fill: #267b83;
	}
	.amber {
		fill: #a27835;
	}
	.inside-surface {
		fill: #f0eaf7;
		stroke: #ccbcdf;
		stroke-width: 1.5;
	}
	.root-surface {
		fill: #fff;
		stroke: #cdd3dd;
		stroke-width: 1.5;
	}
	.escape-surface {
		fill: #f7f0e3;
		stroke: #d8c59e;
		stroke-width: 1.5;
	}
	.start-field {
		fill: #e6f1f1;
		stroke: #b9d8d7;
	}
	.end-field {
		fill: #f4eef9;
		stroke: #d4c3e5;
	}
	.escape-field {
		fill: #fbf4e8;
		stroke: #e0cda7;
	}
	.route {
		fill: none;
		stroke-width: 2;
	}
	.teal-line {
		stroke: #75a9ab;
	}
	.purple-line {
		stroke: #b09acb;
	}
	.amber-line {
		stroke: #cab17e;
	}
	.label-bg {
		fill: #f7f8fb;
	}
	.guide {
		fill: none;
		stroke: #a4aab6;
		stroke-width: 1.5;
	}
	.map-cell {
		fill: #fff;
		stroke: #d5dbe5;
	}
	.map-cell.chosen {
		fill: #dbeeed;
		stroke: #72a6a9;
	}
	.rule-surface {
		fill: #fff;
		stroke: #aebcc9;
	}
	.active-ring {
		fill: none;
		stroke: #7559a9;
		stroke-width: 2;
		stroke-dasharray: 3 6;
	}
	.packet {
		fill: #7559a9;
		stroke: #fff;
		stroke-width: 4;
	}
	.packet-letter {
		font-family: 'Courier New', monospace;
		fill: #fff;
		font-size: 28px;
	}
	.saved-root {
		fill: #e5e9ef;
		stroke: #cdd3dd;
	}
	.saved-inside {
		fill: #e9dff3;
		stroke: #ccbcdf;
	}
	.source-character {
		font-family: 'Courier New', monospace;
		font-size: 36px;
		fill: #9298a5;
	}
	.source-character.consumed {
		fill: #7559a9;
	}
	.token-span {
		fill: none;
		stroke: #a993c5;
		stroke-width: 2;
	}
	.result-cell {
		fill: #eee6f7;
		stroke: #c8b7dd;
	}
	.result-value {
		font-family: 'Courier New', monospace;
		font-size: 42px;
		fill: #7559a9;
	}
	footer {
		padding: 0 4%;
		flex: 0 0 66px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 30px;
		color: var(--muted);
		font-size: 11px;
	}
	.progress {
		width: 180px;
		height: 2px;
		background: #dfe2e9;
	}
	.progress > span {
		display: block;
		height: 100%;
		background: #9d84bc;
		transform-origin: left;
	}
	.restart {
		width: auto;
		color: var(--muted);
		font-size: 11px;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 15px;
	}
	.controls span {
		min-width: 43px;
		text-align: center;
	}
	button {
		font-family: inherit;
		border: 0;
		background: transparent;
		color: var(--ink);
		width: 34px;
		height: 34px;
		font-size: 21px;
	}
	button:disabled {
		opacity: 0.25;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid var(--purple);
		outline-offset: 5px;
	}
	.afterword {
		padding: 50px 8%;
		display: flex;
		align-items: center;
		gap: 40px;
		font-size: 12px;
		border-top: 1px solid #e2e5ec;
	}
	.afterword p {
		max-width: 620px;
		margin: 0 auto 0 0;
	}
	.afterword a {
		flex-shrink: 0;
	}
	@media (max-width: 760px) {
		.caption {
			flex-basis: 125px;
		}
		.caption p {
			font-size: 13px;
			max-width: 430px;
			margin: auto;
		}
		.canvas {
			padding: 0;
		}
		.part {
			display: none;
		}
		.progress {
			width: 90px;
		}
		.afterword {
			flex-direction: column;
			gap: 15px;
		}
		.screen {
			min-height: 570px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			transition: none !important;
		}
	}
</style>
