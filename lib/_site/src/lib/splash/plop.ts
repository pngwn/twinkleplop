// the "plop into code" scroll effect.
//
// every wordmark pixel is assigned a token in the live code sample. scroll
// progress `p` drives each pixel along an arc from its home cell to a point
// on that token; landing lights the token up. pixels shed sparks in flight
// and puff on impact. everything is a pure function of `p`, so scrolling
// back up runs it in reverse.
//
// the dom is rendered by svelte; this module only animates it. per-frame
// work never reads layout: pixel centres are derived from the measured home
// position plus the transform we just wrote, and the scroll position is
// cached from the scroll event. even `window.scrollY` is a layout read: asked
// for mid-frame it makes the browser flush every style written so far.

// scroll distance, in viewport heights, over which p runs 0 → 1
const RANGE = 0.85;
// each pixel flies for this much of p. with the latest start at 0.55 the
// last pixel lands exactly at p = 1.
const FLIGHT = 0.45;
const LAND_AT = 0.92;
const GHOST_AT = 0.12;
const MIN_TOKEN_WIDTH = 8;
// scroll reaches the page in steps: a wheel notch is a hundred px at once,
// close to a third of a pixel's flight, and even a smooth scroll is only
// reported once a frame. so p is not pinned to the scroll position, it
// follows it on a critically damped spring: it eases away from rest as
// well as into it, and never overshoots. this is the spring's natural
// frequency, per second. it trails a steady scroll by 2 / RESPONSE seconds
// and is 90% of the way to a new position after about 4 / RESPONSE.
const RESPONSE = 16;

// a pixel part way through its flight hangs over whatever the page has
// scrolled under it. while the scroll is moving that reads as the effect;
// once it has been still this long the pixel is only covering the text, so
// the flight fades out until the scroll moves again.
const IDLE_FADE_AFTER = 500;
const FADE_OUT = 260;
const FADE_IN = 140;
// how far into its flight a pixel has to be before it fades all the way
// out. the ones still sitting in the letters keep the wordmark whole
// rather than punching holes in it.
const CLEAR_AT = 0.3;

// a spark is a tiny square with a soft glow of its own colour. drawn
// directly that means parsing two colour strings and running a blur pass
// for every spark on every frame, so each colour's mote is rendered once
// into an atlas and stamped from there.
//
// side of the atlas mote in css px: about the size a typical spark is drawn
// at, so scaling the stamp keeps the glow close to a real shadowBlur
const MOTE = 1.2;
// device px, like shadowBlur itself: neither is affected by the transform
const MOTE_BLUR = 3;
const MOTE_PAD = 6;

const HUE_FROM = 25;
const HUE_TO = 350;

export type splash_mode = "light" | "dark";

export function rainbow(f: number, mode: splash_mode = "dark"): string {
	const hue = Math.round(HUE_FROM + f * (HUE_TO - HUE_FROM));
	return mode === "dark" ? `oklch(0.8 0.15 ${hue})` : rainbow_light(hue);
}

// darker on paper, with a dip around yellow-green. teal to blue still
// fall under 4.5:1 once in srgb, so each hue steps darker until the
// in-gamut colour clears it: the header and footer wordmarks are small text.
const PAPER_LUMINANCE = luminance([251 / 255, 251 / 255, 249 / 255]);
const light_ramp = new Map<number, string>();

function rainbow_light(hue: number): string {
	let color = light_ramp.get(hue);
	if (color) return color;
	const dip = Math.exp(-(((hue - 120) / 45) ** 2));
	for (let l = 0.58 - 0.1 * dip; ; l -= 0.005) {
		let c = 0.17;
		let rgb = oklch_to_srgb(l, c, hue);
		// pull chroma in rather than clipping channels, so wide-gamut
		// screens show the same colour that was measured here
		while (c > 0 && rgb.some((v) => v < 0 || v > 1)) rgb = oklch_to_srgb(l, (c -= 0.005), hue);
		if ((PAPER_LUMINANCE + 0.05) / (luminance(rgb) + 0.05) >= 4.6 || l < 0.3) {
			color = `oklch(${l.toFixed(3)} ${Math.max(0, c).toFixed(3)} ${hue})`;
			break;
		}
	}
	light_ramp.set(hue, color);
	return color;
}

function oklch_to_srgb(l: number, c: number, hue: number): number[] {
	const a = c * Math.cos((hue * Math.PI) / 180);
	const b = c * Math.sin((hue * Math.PI) / 180);
	const lms = [
		(l + 0.3963377774 * a + 0.2158037573 * b) ** 3,
		(l - 0.1055613458 * a - 0.0638541728 * b) ** 3,
		(l - 0.0894841775 * a - 1.291485548 * b) ** 3
	];
	return [
		4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2],
		-1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2],
		-0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2]
	].map((v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
}

function luminance(rgb: number[]): number {
	const [r, g, b] = rgb.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function current_mode(): splash_mode {
	return document.documentElement.dataset.mode === "light" ? "light" : "dark";
}

export interface plop_pixel {
	// grid position in the wordmark
	x: number;
	y: number;
	el: HTMLElement;
	ghost: HTMLElement;
	color: Record<splash_mode, string>;
}

export interface plop_target {
	el: HTMLElement;
	// index among the lines that hold at least one token
	line: number;
}

export interface plop_options {
	mount: HTMLElement;
	// the block the targets live in
	code: HTMLElement;
	canvas: HTMLCanvasElement;
	pixels: plop_pixel[];
	cols: number;
	on_progress: (lit: number, total: number) => void;
}

export interface plop {
	// swap in a new token list. `changed` indexes re-flash if they are lit.
	set_targets: (targets: plop_target[], changed?: Iterable<number>) => void;
	scroll_to: (el: HTMLElement, offset: number) => void;
	// follow a light/dark switch: sparks and the landing flash are drawn
	// from resolved colours, not css vars
	set_mode: (mode: splash_mode) => void;
	destroy: () => void;
}

interface cell extends plop_pixel {
	seed: [number, number, number, number];
	// assigned target, and this pixel's ordinal among those sharing it
	k: number;
	q: number;
	start: number;
	// page-space centre of the home cell, and the delta to the landing point
	hx: number;
	hy: number;
	dx: number;
	dy: number;
	// x offset of this pixel's mote in the atlas, per mode
	sprite: Record<splash_mode, number>;
	// last local progress written, last page-space centre, landed flag
	l: number;
	px: number;
	py: number;
	on: boolean;
}

interface target extends plop_target {
	// the token's syntax colour, resolved from its --tc
	color: string;
	hits: number;
	// no pixel reached this token (more tokens than pixels can cover), so
	// it lights on scroll progress alone
	free: boolean;
	lit: boolean;
}

interface spark {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	decay: number;
	size: number;
	phase: number;
	freq: number;
	// x offset of this spark's mote in the atlas
	sprite: number;
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const ease_cubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function create_plop(opts: plop_options): plop {
	const { mount, canvas, cols, on_progress } = opts;
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const ctx = canvas.getContext("2d")!;
	const dpr = Math.min(2, window.devicePixelRatio || 1);

	let mode = current_mode();

	const colors = [
		"#fff",
		...new Set(opts.pixels.flatMap((pixel) => [pixel.color.dark, pixel.color.light]))
	];
	const mote_cell = Math.ceil(MOTE * dpr) + MOTE_PAD * 2;
	const atlas_canvas =
		typeof OffscreenCanvas === "undefined"
			? Object.assign(document.createElement("canvas"), { width: mote_cell * colors.length, height: mote_cell })
			: new OffscreenCanvas(mote_cell * colors.length, mote_cell);
	const atlas_ctx = atlas_canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	atlas_ctx.shadowBlur = MOTE_BLUR;
	colors.forEach((color, i) => {
		atlas_ctx.fillStyle = atlas_ctx.shadowColor = color;
		atlas_ctx.fillRect(i * mote_cell + MOTE_PAD, MOTE_PAD, MOTE * dpr, MOTE * dpr);
	});
	// an immutable bitmap where there is one: drawing from a live canvas
	// snapshots it per call
	const atlas = "transferToImageBitmap" in atlas_canvas ? atlas_canvas.transferToImageBitmap() : atlas_canvas;
	// css px the whole atlas cell covers per css px of spark
	const mote_scale = mote_cell / dpr / MOTE;

	const cells: cell[] = opts.pixels.map((pixel) => ({
		...pixel,
		sprite: {
			dark: colors.indexOf(pixel.color.dark) * mote_cell,
			light: colors.indexOf(pixel.color.light) * mote_cell
		},
		seed: [Math.random(), Math.random(), Math.random(), Math.random()],
		k: -1,
		q: 0,
		start: 0,
		hx: 0,
		hy: 0,
		dx: 0,
		dy: 0,
		l: -1,
		px: NaN,
		py: NaN,
		on: false
	}));
	// the order pixels are dealt out to tokens in; fixed for the page's life
	const dealt = cells.slice().sort((a, b) => a.seed[2] - b.seed[2]);

	let targets: target[] = [];
	let lines = 1;
	let size = 0;
	let last_p = -1;
	// where the flight is drawn, easing towards where the scroll says it
	// should be. negative until the first frame, which snaps: a page loaded
	// part-scrolled starts in place rather than flying there.
	let shown = -1;
	let velocity = 0;
	let last_frame = 0;
	let last_lit = -1;
	let sparks: spark[] = [];
	// how far the flight has faded out under a still scroll, 0 → 1
	let dim = 0;
	let idle = false;
	let idle_timer: ReturnType<typeof setTimeout> | undefined;
	let canvas_dirty = false;
	let raf = 0;
	let scheduled = false;
	let scroll_raf = 0;
	let scroll_x = window.scrollX;
	let scroll_y = window.scrollY;
	let viewport_h = window.innerHeight;

	function line_start(line: number) {
		return lines > 1 ? (line / (lines - 1)) * 0.3 : 0;
	}

	function measure() {
		const m = mount.getBoundingClientRect();
		size = m.width / cols;
		scroll_x = window.scrollX;
		scroll_y = window.scrollY;
		for (const c of cells) {
			c.hx = m.left + scroll_x + (c.x + 0.5) * size;
			c.hy = m.top + scroll_y + (c.y + 0.5) * size;
			c.l = -1;
		}
		last_p = -1;
		schedule();
		if (!targets.length) {
			for (const c of cells) c.k = -1;
			return;
		}

		// deal pixels out in proportion to token width, so long tokens
		// catch more of them
		const rects = targets.map((t) => t.el.getBoundingClientRect());
		const cumulative: number[] = [];
		let total = 0;
		for (const rect of rects) {
			total += Math.max(MIN_TOKEN_WIDTH, rect.width);
			cumulative.push(total);
		}

		const counts = new Array<number>(targets.length).fill(0);
		dealt.forEach((c, i) => {
			const pick = ((i + 0.5) / dealt.length) * total;
			let k = 0;
			while (k < cumulative.length - 1 && cumulative[k] < pick) k++;
			c.k = k;
			c.q = ++counts[k];
			c.start = line_start(targets[k].line) + c.seed[0] * 0.25;
		});

		for (const c of cells) {
			const rect = rects[c.k];
			const slot = rect.width / counts[c.k];
			c.dx = rect.left + scroll_x + (c.q - 0.5) * slot - c.hx;
			c.dy = rect.top + scroll_y + rect.height * (0.35 + c.seed[3] * 0.3) - c.hy;
		}

		for (let k = 0; k < targets.length; k++) {
			targets[k].free = counts[k] === 0;
			targets[k].hits = 0;
		}
		for (const c of cells) if (c.on) targets[c.k].hits++;
		// settle lit state here, without the landing flash, so a resize or
		// an edit doesn't re-fire every token
		for (const t of targets) if (!t.free) set_lit(t, t.hits > 0);
	}

	// the hit: white-hot, then cooling to the token's colour. white vanishes
	// on a light page, so there the token keeps its colour and only the glow
	// flares. run through
	// the animations api because a css animation can only be re-triggered by
	// forcing a reflow, and this fires in the middle of a frame's writes.
	// easing sits on the keyframes so it applies per segment, as css does it.
	const flashes = new WeakMap<HTMLElement, { color: string; animation: Animation }>();

	function flash(t: target) {
		if (reduced) return;
		const running = flashes.get(t.el);
		if (running?.color === t.color) {
			running.animation.currentTime = 0;
			running.animation.play();
			return;
		}
		running?.animation.cancel();
		const c = t.color;
		const keyframes =
			mode === "light"
				? [
						{ color: c, textShadow: `0 0 8px ${c}, 0 0 18px ${c}`, easing: "ease-out" },
						{ color: c, textShadow: `0 0 5px ${c}, 0 0 12px ${c}`, easing: "ease-out", offset: 0.4 },
						{ color: c, textShadow: "0 0 0 transparent" }
					]
				: [
						{ color: "#fff", textShadow: `0 0 10px #fff, 0 0 22px ${c}, 0 0 40px ${c}`, easing: "ease-out" },
						{ color: "#fff", textShadow: `0 0 6px #fff, 0 0 16px ${c}`, easing: "ease-out", offset: 0.4 },
						{ color: c, textShadow: "0 0 0 transparent" }
					];
		const animation = t.el.animate(keyframes, 500);
		flashes.set(t.el, { color: c, animation });
	}

	function set_lit(t: target, lit: boolean) {
		if (t.lit === lit) return;
		t.lit = lit;
		t.el.toggleAttribute("data-lit", lit);
		if (!lit) flashes.get(t.el)?.animation.cancel();
	}

	function emit(c: cell, x: number, y: number, width: number, burst: boolean) {
		const vx = x - c.px;
		const vy = y - c.py;
		const speed = Math.hypot(vx, vy);
		// NaN on the first frame, before there is a previous centre
		if (!burst && !(speed >= 0.5)) return;
		const bx = speed ? -vx / speed : 0;
		const by = speed ? -vy / speed : 0;

		for (let i = 0; i < (burst ? 6 : 2); i++) {
			let angle: number, velocity: number, ox: number, oy: number;
			if (burst) {
				angle = Math.random() * Math.PI * 2;
				velocity = 0.4 + Math.random() * 0.9;
				ox = (Math.random() - 0.5) * width;
				oy = (Math.random() - 0.5) * width;
			} else {
				// shed from the trailing edge, roughly back along the path
				angle = Math.atan2(by, bx) + (Math.random() - 0.5) * 0.8;
				velocity = 0.1 + Math.random() * 0.35;
				const back = width * 0.45;
				const jitter = (Math.random() - 0.5) * width * 0.5;
				ox = bx * back - by * jitter;
				oy = by * back + bx * jitter;
			}
			sparks.push({
				x: x + ox,
				y: y + oy,
				vx: Math.cos(angle) * velocity,
				vy: Math.sin(angle) * velocity,
				life: 1,
				decay: burst ? 0.014 + Math.random() * 0.012 : 0.01 + Math.random() * 0.01,
				size: (burst ? 1.4 : 1.3) * (0.6 + Math.random()),
				phase: Math.random() * 6.3,
				freq: 0.15 + Math.random() * 0.25,
				// three in ten twinkle white
				sprite: Math.random() < 0.3 ? 0 : c.sprite[mode]
			});
		}
	}

	// a pixel's own fade as it lands, times the flight-wide idle fade, which
	// only takes hold once it is clear of the wordmark
	function set_opacity(c: cell, l: number) {
		const away = clamp((l - GHOST_AT) / (CLEAR_AT - GHOST_AT));
		c.el.style.opacity = ((1 - clamp((l - 0.9) / 0.1)) * (1 - dim * away)).toFixed(3);
	}

	// the idle fade moves on its own, with no change in p to drive update()
	function fade_flight() {
		for (const c of cells) if (c.l > GHOST_AT) set_opacity(c, c.l);
	}

	function update(p: number) {
		// no burst for pixels that are already down when the page loads
		const first = last_p < 0;

		for (const c of cells) {
			if (c.k < 0) continue;
			const l = clamp((p - c.start) / FLIGHT);
			if (l === c.l) continue;
			c.l = l;

			const t = targets[c.k];
			c.ghost.style.opacity = l > GHOST_AT ? "1" : "0";

			if (!reduced) {
				const e = ease(l);
				const fall = Math.sin(l * Math.PI);
				const tx = c.dx * e + fall * (c.seed[1] - 0.5) * 40;
				const ty = c.dy * e - fall * 30 * c.seed[3];
				const scale = 1 - clamp((l - 0.8) / 0.2) * 0.55;
				const rotate = l * (c.seed[1] - 0.5) * 360;
				c.el.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${rotate.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
				set_opacity(c, l);
				c.el.style.setProperty("--land", clamp((l - 0.6) / 0.3).toFixed(2));

				const x = c.hx + tx;
				const y = c.hy + ty;
				const width = size * 0.84 * scale;
				if (l > 0.05 && l < 0.9 && Math.random() < 0.55) emit(c, x, y, width, false);
				if (l > LAND_AT && !c.on && !first) emit(c, x, y, width, true);
				c.px = x;
				c.py = y;
			}

			const on = l > LAND_AT;
			if (on && !c.on) {
				c.on = true;
				if (t.hits++ === 0) set_lit(t, true);
				flash(t);
			} else if (!on && c.on) {
				c.on = false;
				if (--t.hits <= 0) {
					t.hits = 0;
					set_lit(t, false);
				}
			}
		}

		for (const t of targets) {
			if (!t.free) continue;
			const lit = clamp((p - line_start(t.line) - 0.125) / FLIGHT) > LAND_AT;
			if (lit && !t.lit) flash(t);
			set_lit(t, lit);
		}

		let lit = 0;
		for (const t of targets) if (t.lit) lit++;
		if (lit !== last_lit || first) {
			last_lit = lit;
			on_progress(lit, targets.length);
		}
	}

	function size_canvas() {
		viewport_h = window.innerHeight;
		canvas.width = window.innerWidth * dpr;
		canvas.height = viewport_h * dpr;
	}

	function draw_sparks() {
		const sx = scroll_x;
		const sy = scroll_y;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		const bottom = viewport_h + 8;

		let kept = 0;
		for (const s of sparks) {
			s.x += s.vx;
			s.y += s.vy;
			s.vx *= 0.98;
			s.vy = s.vy * 0.98 + 0.012;
			s.life -= s.decay;
			s.phase += s.freq;
			if (s.life <= 0) continue;
			sparks[kept++] = s;

			// sparks live in page space, so they stay put as the page scrolls
			const y = s.y - sy;
			if (y < -8 || y > bottom) continue;
			const side = s.size * (0.5 + s.life * 0.5) * mote_scale;
			ctx.globalAlpha =
				Math.min(1, s.life * 0.9) * (0.45 + 0.55 * Math.abs(Math.sin(s.phase))) * (1 - dim);
			ctx.drawImage(atlas, s.sprite, 0, mote_cell, mote_cell, s.x - sx - side / 2, y - side / 2, side, side);
		}
		sparks.length = kept;
		ctx.globalAlpha = 1;
	}

	// frames run only while something is moving: a scroll, a re-measure, or
	// sparks still in the air
	function schedule() {
		if (scheduled) return;
		scheduled = true;
		raf = requestAnimationFrame(frame);
	}

	function frame(now: number) {
		scheduled = false;
		const target = reduced ? 1 : clamp(scroll_y / Math.max(200, viewport_h * RANGE));
		// by elapsed time, so it feels the same at 60hz and 120hz. after an
		// idle spell there is no previous frame to measure from.
		const dt = (now - last_frame > 100 ? 1000 / 60 : now - last_frame) / 1000;
		last_frame = now;
		if (shown < 0 || reduced) {
			shown = target;
		} else {
			// exact solution over dt, so a long frame can't blow it up
			const gap = shown - target;
			const pull = (velocity + RESPONSE * gap) * dt;
			const decay = Math.exp(-RESPONSE * dt);
			shown = target + (gap + pull) * decay;
			velocity = (velocity - RESPONSE * pull) * decay;
		}
		if (Math.abs(target - shown) < 0.0005 && Math.abs(velocity) < 0.005) {
			shown = target;
			velocity = 0;
		}

		// nothing is in the way at the very top, where every pixel is home, so
		// the fade never has to run back in as a scroll starts
		const want = !reduced && idle && shown > 0 ? 1 : 0;
		if (dim !== want) {
			const step = (dt * 1000) / (want ? FADE_OUT : FADE_IN);
			dim = want ? Math.min(1, dim + step) : Math.max(0, dim - step);
			fade_flight();
			schedule();
		}

		if (shown !== last_p) {
			update(shown);
			last_p = shown;
		}
		if (shown !== target) schedule();

		if (sparks.length) {
			draw_sparks();
			canvas_dirty = true;
			schedule();
		} else if (canvas_dirty) {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			canvas_dirty = false;
		}
	}

	function token_color(el: HTMLElement) {
		return getComputedStyle(el).getPropertyValue("--tc").trim() || "currentColor";
	}

	function set_mode(next: splash_mode) {
		if (next === mode) return;
		mode = next;
		for (const t of targets) t.color = token_color(t.el);
	}

	function set_targets(next: plop_target[], changed: Iterable<number> = []) {
		targets = next.map((t) => ({
			...t,
			color: token_color(t.el),
			hits: 0,
			free: false,
			lit: t.el.hasAttribute("data-lit")
		}));
		lines = 1 + next.reduce((max, t) => Math.max(max, t.line), 0);
		measure();
		for (const k of changed) if (targets[k]?.lit) flash(targets[k]);
	}

	// native smooth scrolling can't be given a duration, and the flight wants
	// a slow, even pass to read well
	function scroll_to(el: HTMLElement, offset: number) {
		cancelAnimationFrame(scroll_raf);
		const from = window.scrollY;
		const to = el.getBoundingClientRect().top + from - offset;
		const duration = reduced ? 0 : 2200;
		const t0 = performance.now();
		const stop = () => cancelAnimationFrame(scroll_raf);
		const step = (now: number) => {
			const k = duration ? clamp((now - t0) / duration) : 1;
			window.scrollTo({ top: from + (to - from) * ease_cubic(k), behavior: "instant" });
			if (k < 1) scroll_raf = requestAnimationFrame(step);
			else cleanup();
		};
		const cleanup = () => {
			window.removeEventListener("wheel", cancel);
			window.removeEventListener("touchstart", cancel);
		};
		// never fight the user for the scroll position
		const cancel = () => {
			stop();
			cleanup();
		};
		window.addEventListener("wheel", cancel, { passive: true, once: true });
		window.addEventListener("touchstart", cancel, { passive: true, once: true });
		step(t0);
	}

	function handle_resize() {
		size_canvas();
		measure();
	}

	// frames stop once the scroll settles, so the fade is woken by a timer
	// rather than by a clock read in a frame that would never run
	function watch_idle() {
		idle = false;
		clearTimeout(idle_timer);
		idle_timer = setTimeout(() => {
			idle = true;
			schedule();
		}, IDLE_FADE_AFTER);
	}

	// scroll events are dispatched before the frame's styles are touched, so
	// the read is free here
	function handle_scroll() {
		scroll_x = window.scrollX;
		scroll_y = window.scrollY;
		watch_idle();
		schedule();
	}

	const observer = new ResizeObserver(measure);
	observer.observe(mount);
	observer.observe(opts.code);
	window.addEventListener("resize", handle_resize);
	window.addEventListener("scroll", handle_scroll, { passive: true });
	// web fonts change token widths without necessarily resizing anything
	document.fonts?.ready.then(measure);
	const settle = setTimeout(measure, 600);

	size_canvas();
	measure();
	watch_idle();

	return {
		set_targets,
		scroll_to,
		set_mode,
		destroy() {
			cancelAnimationFrame(raf);
			cancelAnimationFrame(scroll_raf);
			clearTimeout(settle);
			clearTimeout(idle_timer);
			observer.disconnect();
			window.removeEventListener("resize", handle_resize);
			window.removeEventListener("scroll", handle_scroll);
		}
	};
}
