// A lightweight Svelte 5 spring utility inspired by
// svelte/motion's Spring, with a mass parameter and
// optional curved-path animation for 2D coordinates.

type Numeric = number;
type Vec = number[]; // typically [x, y]

type Mode = 'spring' | 'linear' | 'curve';

export type SpringOptions = {
	stiffness?: number; // spring constant (k)
	damping?: number; // damping coefficient (c)
	mass?: number; // mass (m)
	precision?: number; // snap-to-target threshold
};

export type SetOptions = SpringOptions &
	(
		| {
				mode?: 'spring';
		  }
		| {
				mode: 'linear';
				duration?: number; // ms
				alpha?: number; // per-frame mix if no duration
		  }
		| {
				mode: 'curve'; // quadratic Bezier between points (2D)
				curvature?: number; // 0..1, arc intensity (default 0.15)
				duration?: number; // optional linear duration for progress
				alpha?: number; // optional per-frame mix for progress
		  }
	);

function isNumber(x: unknown): x is number {
	return typeof x === 'number';
}

function isVec(x: unknown): x is Vec {
	return Array.isArray(x) && x.every((n) => typeof n === 'number');
}

function vecLerp(a: Vec, b: Vec, t: number): Vec {
	const n = Math.min(a.length, b.length);
	const out = new Array(n);
	for (let i = 0; i < n; i++) out[i] = a[i] + (b[i] - a[i]) * t;
	return out as number[];
}

function nearly(a: number, b: number, eps: number) {
	return Math.abs(a - b) <= eps;
}

function distance(a: Numeric | Vec, b: Numeric | Vec): number {
	if (isNumber(a) && isNumber(b)) return Math.abs(a - b);
	if (isVec(a) && isVec(b)) {
		const n = Math.min(a.length, b.length);
		let acc = 0;
		for (let i = 0; i < n; i++) {
			const d = a[i] - b[i];
			acc += d * d;
		}
		return Math.sqrt(acc);
	}
	return 0;
}

function asVec(x: Numeric | Vec): Vec {
	return isNumber(x) ? [x] : x.slice();
}

function toTypeLike<T extends Numeric | Vec>(template: T, vec: Vec): T {
	return isNumber(template)
		? (vec[0] as unknown as T)
		: (vec.slice(0, (template as Vec).length) as unknown as T);
}

// Quadratic Bezier helper: B(u) = (1-u)^2 P0 + 2(1-u)u P1 + u^2 P2
function quadraticBezier(p0: Vec, p1: Vec, p2: Vec, u: number): Vec {
	const one = 1 - u;
	const one2 = one * one;
	const u2 = u * u;
	const n = Math.min(p0.length, p1.length, p2.length);
	const out = new Array(n);
	for (let i = 0; i < n; i++) {
		out[i] = one2 * p0[i] + 2 * one * u * p1[i] + u2 * p2[i];
	}
	return out as number[];
}

// Compute a perpendicular control point for a gentle arc
function computeControlPoint(p0: Vec, p2: Vec, curvature = 0.15): Vec {
	const n = Math.min(p0.length, p2.length);
	const mid = new Array(n).fill(0) as number[];
	const diff = new Array(n).fill(0) as number[];
	for (let i = 0; i < n; i++) {
		mid[i] = (p0[i] + p2[i]) / 2;
		diff[i] = p2[i] - p0[i];
	}
	// Only define a perpendicular in 2D; otherwise fallback to midpoint
	if (n >= 2) {
		const [dx, dy] = [diff[0], diff[1]];
		const len = Math.hypot(dx, dy) || 1;
		const nx = -dy / len;
		const ny = dx / len;
		const mag = len * curvature;
		return [mid[0] + nx * mag, mid[1] + ny * mag];
	}
	return mid as number[];
}

export class Spring<T extends Numeric | Vec> {
	#stiffness = $state(0.15);
	#damping = $state(0.8);
	#mass = $state(1);
	#precision = $state(0.01);

	#value = $state<T>(undefined as unknown as T);
	#target: T;
	#velocity: Vec = [0]; // stored as vector for unified math
	#raf: number | null = null;
	#mode: Mode = 'spring';

	// curve mode internals
	#curveP0: Vec | null = null;
	#curveP1: Vec | null = null;
	#curveP2: Vec | null = null;
	#u = 0; // progress along curve (0..1)
	#du = 0; // velocity for u when using spring progress
	#linearDuration: number | null = null;
	#linearStart = 0;
	#alpha: number | null = null;

	constructor(initial: T, opts: SpringOptions = {}) {
		this.#value = initial;
		this.#target = initial;
		this.configure(opts);
	}

	configure(opts: SpringOptions = {}) {
		if (opts.stiffness != null) this.#stiffness = opts.stiffness;
		if (opts.damping != null) this.#damping = opts.damping;
		if (opts.mass != null) this.#mass = opts.mass;
		if (opts.precision != null) this.#precision = opts.precision;
	}

	get current(): T {
		return this.#value;
	}

	stop() {
		if (this.#raf != null && typeof cancelAnimationFrame !== 'undefined') {
			cancelAnimationFrame(this.#raf);
		}
		this.#raf = null;
	}

	set(target: T, options: SetOptions = {}) {
		// SSR: set immediately
		if (typeof window === 'undefined') {
			this.#value = target;
			this.#target = target;
			return;
		}

		this.configure(options);
		this.#target = target;
		this.#mode = options.mode ?? 'spring';

		if (this.#mode === 'curve' && isVec(this.#value) && isVec(target)) {
			this.#curveP0 = asVec(this.#value);
			this.#curveP2 = asVec(target);
			this.#curveP1 = computeControlPoint(this.#curveP0, this.#curveP2, options.curvature ?? 0.15);
			this.#u = 0;
			this.#du = 0;
			this.#linearDuration = options.duration ?? null;
			this.#alpha = options.alpha ?? null;
		} else if (this.#mode === 'linear') {
			this.#linearDuration = options.duration ?? null;
			this.#alpha = options.alpha ?? 0.15;
			this.#linearStart = performance.now();
		}

		if (this.#raf == null) this.#loop();
	}

	#loop = () => {
		const start = performance.now();
		let last = start;
		const step = () => {
			const now = performance.now();
			const dt = Math.min(64, now - last) / 1000; // clamp long frames
			last = now;

			let done = false;
			switch (this.#mode) {
				case 'linear':
					done = this.#tickLinear(now);
					break;
				case 'curve':
					done = this.#tickCurve(dt, now);
					break;
				default:
					done = this.#tickSpring(dt);
			}

			if (!done) {
				this.#raf = requestAnimationFrame(step);
			} else {
				this.#raf = null;
			}
		};
		this.#raf = requestAnimationFrame(step);
	};

	#tickLinear(now: number): boolean {
		const target = this.#target;
		const cur = this.#value;
		const eps = this.#precision;

		if (this.#linearDuration != null) {
			const t = Math.min(1, (now - this.#linearStart) / this.#linearDuration);
			if (isNumber(cur) && isNumber(target)) {
				this.#value = (cur + (target - (cur as number)) * t) as T;
			} else {
				const v = vecLerp(asVec(cur as Numeric | Vec), asVec(target as Numeric | Vec), t);
				this.#value = toTypeLike(cur as T, v);
			}
			return t >= 1;
		}

		const alpha = this.#alpha ?? 0.15;
		if (isNumber(cur) && isNumber(target)) {
			const next = cur + (target - cur) * alpha;
			this.#value = next as T;
			return nearly(next, target, eps);
		} else {
			const v = vecLerp(asVec(cur as Numeric | Vec), asVec(target as Numeric | Vec), alpha);
			this.#value = toTypeLike(cur as T, v);
			return distance(this.#value as Numeric | Vec, target as Numeric | Vec) <= eps;
		}
	}

	#tickSpring(dt: number): boolean {
		// Per-component spring integration
		const k = this.#stiffness;
		const c = this.#damping;
		const m = this.#mass;
		const eps = this.#precision;

		const curV = asVec(this.#value as Numeric | Vec);
		const tgtV = asVec(this.#target as Numeric | Vec);
		if (this.#velocity.length !== curV.length) this.#velocity = new Array(curV.length).fill(0);

		let maxDelta = 0;
		for (let i = 0; i < curV.length; i++) {
			const x = curV[i];
			const v = this.#velocity[i];
			const xt = tgtV[i];
			const f = -k * (x - xt) - c * v; // Hooke + damping
			const a = f / (m || 1);
			const v2 = v + a * dt;
			const x2 = x + v2 * dt; // semi-implicit euler
			curV[i] = x2;
			this.#velocity[i] = v2;
			maxDelta = Math.max(maxDelta, Math.abs(x2 - xt));
		}

		this.#value = toTypeLike(this.#value as T, curV);
		const near = maxDelta <= eps && this.#velocity.every((v) => Math.abs(v) <= eps);
		if (near) {
			this.#value = this.#target;
			this.#velocity = new Array(curV.length).fill(0);
		}
		return near;
	}

	#tickCurve(dt: number, now: number): boolean {
		if (!this.#curveP0 || !this.#curveP1 || !this.#curveP2) return true;
		const eps = this.#precision;

		// Progress u either linearly or with a spring
		if (this.#linearDuration != null) {
			if (this.#u === 0) this.#linearStart = now;
			const t = Math.min(1, (now - this.#linearStart) / this.#linearDuration);
			this.#u = t;
		} else {
			// spring on scalar u towards 1
			const k = this.#stiffness;
			const c = this.#damping;
			const m = this.#mass;
			const f = -k * (this.#u - 1) - c * this.#du;
			const a = f / (m || 1);
			this.#du += a * dt;
			this.#u += this.#du * dt;
			// clamp range
			if (this.#u > 1) this.#u = 1;
			if (this.#u < 0) this.#u = 0;
		}

		const pos = quadraticBezier(this.#curveP0, this.#curveP1, this.#curveP2, this.#u);
		this.#value = toTypeLike(this.#value as T, pos);

		const done = Math.abs(this.#u - 1) <= eps && distance(pos, this.#curveP2) <= eps;
		if (done) {
			this.#value = toTypeLike(this.#value as T, this.#curveP2);
		}
		return done;
	}
}

export default Spring;
