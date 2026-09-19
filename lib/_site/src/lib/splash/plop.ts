// the pixel wand.
//
// the code card starts grey. a click on it is a cast: every unlit token
// within HIT_RADIUS of the click is queued, nearest first, and the queue
// launches one token every STAGGER ms. each launch steals a pair of
// wordmark pixels, one from each side, from mirrored bands. they are lobbed
// up and outwards, come down onto either half of the token on an
// underdamped spring, and touch down together; the token flashes and takes
// its colour. a stolen pixel leaves a ghost and never comes back, and the
// snippet has half as many tokens as the wordmark has pixels (the odd one
// out flies alone), so a fully lit card leaves a fully grey wordmark.
//
// the dom is rendered by svelte; this module only animates it. per-frame
// work never reads layout: the wordmark and the tokens are measured in page
// space when something resizes or a cast lands, and the scroll position is
// cached from the scroll event. even `window.scrollY` is a layout read:
// asked for mid-frame it makes the browser flush every style written so far.

// px from a click to the nearest edge of a token's box for the cast to
// reach it
export const HIT_RADIUS = 25;
// ms between launches. a launch doesn't wait for the one before to land.
const STAGGER = 200;
// pixels per token
const PAIR = 2;
// the flight spring's natural frequency, in rad/s, and its damping ratio.
// under 1 it overshoots a little before it settles.
const STIFFNESS = 6.5;
const DAMPING = 0.6;
// upward launch speed in px/s, on top of 0.6 × the pair's mean distance to
// cover: the pixels are lobbed, not fired
const TOSS = 500;
// sideways launch speed in px/s, each pixel away from its partner, so the
// pair opens out and closes back in on the token
const SPREAD = 140;
// how far either side of the token's middle each pixel lands, as a share
// of its width
const LAND_SPLIT = 0.2;
// the wordmark's width is cut into this many bands. a pair takes a band on
// the left and its mirror on the right, the left bands visited in shuffled
// order, so consecutive steals are spread across the wordmark.
const BANDS = 12;
// a pair lands once both pixels are within this many cells of their spots
// (4px at least) after SETTLE_AFTER seconds, and regardless at GIVE_UP
const LAND_WITHIN = 0.6;
const SETTLE_AFTER = 0.25;
const GIVE_UP = 1.6;
// ms a landed pair takes to shrink away
const SHRINK = 320;

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

export interface plop_options {
	mount: HTMLElement;
	// the block the tokens live in
	code: HTMLElement;
	canvas: HTMLCanvasElement;
	pixels: plop_pixel[];
	cols: number;
	on_progress: (lit: number, total: number) => void;
}

export interface plop {
	set_targets: (tokens: HTMLElement[]) => void;
	// a click on the code, in page coordinates
	cast: (x: number, y: number) => void;
	// follow a light/dark switch: sparks and the landing flash are drawn
	// from resolved colours, not css vars
	set_mode: (mode: splash_mode) => void;
	destroy: () => void;
}

interface target {
	el: HTMLElement;
	// the token's syntax colour, resolved from its --tc
	color: string;
	// page-space box
	x: number;
	y: number;
	w: number;
	h: number;
	// claimed by a cast, waiting for its pixel
	queued: boolean;
	lit: boolean;
}

interface cell extends plop_pixel {
	// x offset of this pixel's mote in the atlas, per mode
	sprite: Record<splash_mode, number>;
	band: number;
	// -1 on the wordmark's left half, 1 on its right
	side: number;
	gone: boolean;
}

interface flight {
	cell: cell;
	// page-space centre of the home cell at launch
	sx: number;
	sy: number;
	// start minus landing spot, and launch velocity in px/s, per axis
	dx: number;
	dy: number;
	vx: number;
	vy: number;
	// last page-space centre, to shed the trail behind it
	px: number;
	py: number;
}

// the pixels one token launched, flown and landed as one
interface pair {
	target: target;
	t0: number;
	// when it touched down, 0 while still in the air
	landed: number;
	flights: flight[];
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

// offset from rest of an underdamped spring let go at offset d0 with speed
// v0, t seconds later. closed form, so a frame depends only on the time
// since launch, never on the frame before it.
const DAMPED = STIFFNESS * Math.sqrt(1 - DAMPING * DAMPING);
function spring(t: number, d0: number, v0: number) {
	const b = (v0 + DAMPING * STIFFNESS * d0) / DAMPED;
	return Math.exp(-DAMPING * STIFFNESS * t) * (d0 * Math.cos(DAMPED * t) + b * Math.sin(DAMPED * t));
}

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
		band: Math.floor((pixel.x / cols) * BANDS),
		side: pixel.x < cols / 2 ? -1 : 1,
		gone: false
	}));

	let targets: target[] = [];
	let queue: target[] = [];
	let next_launch = 0;
	let flying: pair[] = [];
	let sparks: spark[] = [];
	let lit = 0;
	// page-space top left of the wordmark, and the side of one of its cells
	let home_x = 0;
	let home_y = 0;
	let size = 0;
	// page-space left and right of the code's scrollport: a line too long
	// for it scrolls sideways, and what's out of view can't be hit or landed
	// on. scrolling it leaves the token boxes stale until the next launch.
	let view_l = 0;
	let view_r = 0;
	let stale = false;
	let canvas_dirty = false;
	let raf = 0;
	let scheduled = false;
	let scroll_x = window.scrollX;
	let scroll_y = window.scrollY;
	let viewport_h = window.innerHeight;

	// the order the left bands are stolen from, reshuffled each time round
	let bands: number[] = [];
	let band_at = 0;
	function shuffle_bands() {
		bands = Array.from({ length: BANDS / 2 }, (_, i) => i);
		for (let i = bands.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[bands[i], bands[j]] = [bands[j], bands[i]];
		}
		band_at = 0;
	}
	shuffle_bands();

	const any = (pool: cell[]) => pool[Math.floor(Math.random() * pool.length)];

	// a random pixel from the next left band with one left, and one from the
	// mirrored band on the right. the halves don't hold the same number of
	// pixels, so once a side runs dry the rest come from the other.
	function pick_pair(): cell[] {
		const free = cells.filter((c) => !c.gone);
		const left = free.filter((c) => c.side < 0);
		const right = free.filter((c) => c.side > 0);
		for (let tries = 0; tries < bands.length; tries++) {
			const band = bands[band_at++];
			if (band_at === bands.length) shuffle_bands();
			const l = left.filter((c) => c.band === band);
			const r = right.filter((c) => c.band === BANDS - 1 - band);
			if (l.length && r.length) return [any(l), any(r)];
		}
		if (left.length && right.length) return [any(left), any(right)];
		const rest = left.length ? left : right;
		const out: cell[] = [];
		while (out.length < PAIR && rest.length) out.push(...rest.splice(Math.floor(Math.random() * rest.length), 1));
		// left to right, so each takes the side it is on
		return out.sort((a, b) => a.x - b.x);
	}

	function measure() {
		const m = mount.getBoundingClientRect();
		scroll_x = window.scrollX;
		scroll_y = window.scrollY;
		size = m.width / cols;
		home_x = m.left + scroll_x;
		home_y = m.top + scroll_y;
		const view = opts.code.getBoundingClientRect();
		view_l = view.left + scroll_x;
		view_r = view.right + scroll_x;
		stale = false;
		for (const t of targets) {
			const rect = t.el.getBoundingClientRect();
			t.x = rect.left + scroll_x;
			t.y = rect.top + scroll_y;
			t.w = rect.width;
			t.h = rect.height;
		}
	}

	// the stretch of a token's box that is in view. scrolled wholly out, it
	// comes back empty, pinned to the nearest edge of the view.
	function visible(t: target): [number, number] {
		const left = Math.max(t.x, view_l);
		const right = Math.min(t.x + t.w, view_r);
		if (right > left) return [left, right];
		const edge = Math.min(Math.max(t.x + t.w / 2, view_l), view_r);
		return [edge, edge];
	}

	// the hit: white-hot, then cooling to the token's colour. white vanishes
	// on a light page, so there the token keeps its colour and only the glow
	// flares. easing sits on the keyframes so it applies per segment, as css
	// does it.
	function flash(t: target) {
		if (reduced) return;
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
		t.el.animate(keyframes, 500);
	}

	function light(t: target) {
		if (t.lit) return;
		t.lit = true;
		t.el.toggleAttribute("data-lit", true);
		flash(t);
		on_progress(++lit, targets.length);
	}

	function cast(x: number, y: number) {
		// cheap next to a click, and it catches anything that moved without
		// resizing
		measure();
		const hits: { t: target; d: number }[] = [];
		for (const t of targets) {
			if (t.lit || t.queued) continue;
			const [left, right] = visible(t);
			if (left === right) continue;
			// from the click to the nearest point of the token's box, so a
			// token the circle only clips still counts
			const d = Math.hypot(x - Math.min(Math.max(x, left), right), y - Math.min(Math.max(y, t.y), t.y + t.h));
			if (d <= HIT_RADIUS) hits.push({ t, d });
		}
		hits.sort((a, b) => a.d - b.d);
		if (reduced) {
			for (const { t } of hits) light(t);
			return;
		}
		if (!hits.length) return;
		// one queue for every cast, so quick clicks chain rather than
		// interleave. after a quiet spell the first launch goes at once.
		if (!queue.length && performance.now() >= next_launch) next_launch = 0;
		for (const { t } of hits) {
			t.queued = true;
			queue.push(t);
		}
		schedule();
	}

	function launch(t: target, now: number) {
		const picked = pick_pair();
		// more tokens than pixels: the rest light without any
		if (!picked.length) return light(t);

		// reads before this frame writes anything, so no forced flush
		if (stale) measure();
		const [left, right] = visible(t);
		const ey = t.y + t.h * 0.52;
		const starts = picked.map((c) => [home_x + (c.x + 0.5) * size, home_y + (c.y + 0.5) * size]);
		const reach = starts.reduce((sum, [sx, sy]) => sum + Math.hypot(sx - (left + right) / 2, sy - ey), 0) / starts.length;
		const flights = picked.map((c, i): flight => {
			c.gone = true;
			c.ghost.style.opacity = "1";
			c.el.toggleAttribute("data-fly", true);
			// the pair comes left to right: the left one lands left of the
			// middle, the right one right of it. alone, a pixel lands in the
			// middle.
			const side = picked.length > 1 ? (i === 0 ? -1 : 1) : 0;
			const [sx, sy] = starts[i];
			const dx = sx - (left + (right - left) * (0.5 + side * LAND_SPLIT));
			const dy = sy - ey;
			return {
				cell: c,
				sx,
				sy,
				dx,
				dy,
				// drifts towards the token and away from its partner, and both
				// are thrown up alike, harder the further they have to go
				vx: -dx * 0.35 + side * SPREAD,
				vy: -(TOSS + reach * 0.6),
				px: sx,
				py: sy
			};
		});
		flying.push({ target: t, t0: now, landed: 0, flights });
	}

	function fly(now: number) {
		let kept = 0;
		for (const p of flying) {
			const t = (now - p.t0) / 1000;
			// where each pixel is, relative to its landing spot
			const offsets = p.flights.map((f) => [spring(t, f.dx, f.vx), spring(t, f.dy, f.vy)]);
			const near = Math.max(4, size * LAND_WITHIN);
			const landing =
				!p.landed && ((t > SETTLE_AFTER && offsets.every(([rx, ry]) => Math.hypot(rx, ry) < near)) || t > GIVE_UP);
			if (landing) {
				p.landed = now;
				light(p.target);
			}
			// shrinks away where it landed, still riding out the spring
			const k = p.landed ? clamp((now - p.landed) / SHRINK) : 0;

			p.flights.forEach((f, i) => {
				// the spring is centred on the landing spot; the transform is
				// relative to the home cell
				const tx = offsets[i][0] - f.dx;
				const ty = offsets[i][1] - f.dy;
				const x = f.sx + tx;
				const y = f.sy + ty;
				if (landing) emit(f, x, y, true);
				else if (!p.landed && Math.random() < 0.6) emit(f, x, y, false);
				f.px = x;
				f.py = y;
				const el = f.cell.el;
				el.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${(1 - k).toFixed(3)})`;
				el.style.opacity = String(1 - k * k);
				if (k >= 1) el.removeAttribute("data-fly");
			});
			if (k < 1) flying[kept++] = p;
		}
		flying.length = kept;
	}

	function emit(f: flight, x: number, y: number, burst: boolean) {
		const vx = x - f.px;
		const vy = y - f.py;
		const speed = Math.hypot(vx, vy);
		if (!burst && speed < 0.4) return;
		const bx = speed ? -vx / speed : 0;
		const by = speed ? -vy / speed : 0;

		for (let i = 0; i < (burst ? 7 : 2); i++) {
			let angle: number, velocity: number, ox: number, oy: number;
			if (burst) {
				angle = Math.random() * Math.PI * 2;
				velocity = 0.4 + Math.random() * 0.9;
				ox = (Math.random() - 0.5) * size;
				oy = (Math.random() - 0.5) * size;
			} else {
				// shed from the trailing edge, roughly back along the path
				angle = Math.atan2(by, bx) + (Math.random() - 0.5) * 0.8;
				velocity = 0.1 + Math.random() * 0.35;
				const back = size * 0.45;
				const jitter = (Math.random() - 0.5) * size * 0.5;
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
				sprite: Math.random() < 0.3 ? 0 : f.cell.sprite[mode]
			});
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
			ctx.globalAlpha = Math.min(1, s.life * 0.9) * (0.45 + 0.55 * Math.abs(Math.sin(s.phase)));
			ctx.drawImage(atlas, s.sprite, 0, mote_cell, mote_cell, s.x - sx - side / 2, y - side / 2, side, side);
		}
		sparks.length = kept;
		ctx.globalAlpha = 1;
	}

	// frames run only while something is moving: a queue to launch, pixels
	// in the air, or sparks still falling
	function schedule() {
		if (scheduled) return;
		scheduled = true;
		raf = requestAnimationFrame(frame);
	}

	function frame(now: number) {
		scheduled = false;
		if (queue.length && now >= next_launch) {
			launch(queue.shift()!, now);
			next_launch = now + STAGGER;
		}
		fly(now);

		if (sparks.length) {
			draw_sparks();
			canvas_dirty = true;
		} else if (canvas_dirty) {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			canvas_dirty = false;
		}
		if (queue.length || flying.length || sparks.length) schedule();
	}

	function token_color(el: HTMLElement) {
		return getComputedStyle(el).getPropertyValue("--tc").trim() || "currentColor";
	}

	function set_mode(next: splash_mode) {
		if (next === mode) return;
		mode = next;
		for (const t of targets) t.color = token_color(t.el);
	}

	function set_targets(tokens: HTMLElement[]) {
		targets = tokens.map((el) => ({
			el,
			color: token_color(el),
			x: 0,
			y: 0,
			w: 0,
			h: 0,
			queued: false,
			lit: el.hasAttribute("data-lit")
		}));
		queue = [];
		lit = targets.filter((t) => t.lit).length;
		measure();
		on_progress(lit, targets.length);
	}

	function handle_resize() {
		size_canvas();
		measure();
	}

	function handle_code_scroll() {
		stale = true;
	}

	// scroll events are dispatched before the frame's styles are touched, so
	// the read is free here
	function handle_scroll() {
		scroll_x = window.scrollX;
		scroll_y = window.scrollY;
	}

	const observer = new ResizeObserver(measure);
	observer.observe(mount);
	observer.observe(opts.code);
	window.addEventListener("resize", handle_resize);
	window.addEventListener("scroll", handle_scroll, { passive: true });
	opts.code.addEventListener("scroll", handle_code_scroll, { passive: true });
	// web fonts change token widths without necessarily resizing anything
	document.fonts?.ready.then(measure);

	size_canvas();
	measure();

	return {
		set_targets,
		cast,
		set_mode,
		destroy() {
			cancelAnimationFrame(raf);
			observer.disconnect();
			window.removeEventListener("resize", handle_resize);
			window.removeEventListener("scroll", handle_scroll);
			opts.code.removeEventListener("scroll", handle_code_scroll);
		}
	};
}
