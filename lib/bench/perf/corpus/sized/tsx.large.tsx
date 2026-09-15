// ---- unit 1 ----
// interactive greeter demo.
import { useState } from "react";

type Props = { name: string; count?: number };

export class Store<T> {
  items: T[] = [];
  add(item: T) { this.items.push(item); }
}

export function Greeter({ name, count = 1 }: Props) {
  const [clicks, setClicks] = useState<number>(0);
  const banner = `hello, ${name}`;
  return (
    <section className="root" data-count={count}>
      <h1>{banner}!</h1>
      <button onClick={() => setClicks((c) => c + 1)}>
        clicked {clicks} &times;
      </button>
    </section>
  );
}


// ---- unit 2 ----
// ---- attributes.txt ----
const el = <input
  value="hello"
  placeholder='search'
  disabled
  data-testid="input-1"
  aria-label="search field"
  {...rest}
  onChange={handler}
/>;


// ---- basic_element.txt ----
const el = <div>hello</div>;


// ---- conditional.txt ----
const view = (show: boolean, items: string[]) => {
  return (
    <div>
      {show && <Badge count={items.length} />}
      {items.length > 0 ? (
        <ul>
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <em>empty</em>
      )}
      {/* fallback block */}
    </div>
  );
};


// ---- entity.txt ----
const msg = <p>Hello &amp; Goodbye &mdash; &#9733; &#x2605;</p>;
const q = <p>Smart &ldquo;quotes&rdquo;</p>;


// ---- expression_container.txt ----
const el = <div className={classes.root} style={{ color: "red", padding: 4 }}>
  {count} item{count !== 1 ? "s" : ""}
</div>;


// ---- fragment.txt ----
const list = <>
  <li>one</li>
  <li>two</li>
</>;


// ---- generic_arrow.txt ----
const id = <T,>(x: T): T => x;
const other = <T extends unknown>(x: T): T => x;
const pair = <T, U>(a: T, b: U): [T, U] => [a, b];


// ---- generics_call.txt ----
const state = useState<string>("");
const arr = new Array<number>(5);
const result = fn<A, B>(a, b);
type Alias<T> = Promise<T>;
interface Box<T extends object> {
  value: T;
}


// ---- jsx_in_template.txt ----
const msg = `Result: ${<span>value</span>}`;
const multi = `${<b>bold</b>} and ${<i>italic</i>}`;


// ---- less_than.txt ----
const a = 1 < 2;
const b = x < y && y > z;
const c = compare<string>(a, b);
const d = Array<number>();
const e = arr.length < 10 ? "short" : "long";


// ---- member_tag.txt ----
const el = <React.Fragment>
  <Motion.div initial={{ opacity: 0 }} />
</React.Fragment>;


// ---- namespaced.txt ----
const icon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <use xlink:href="#icon-home" />
</svg>;


// ---- nested.txt ----
const page = <div>
  <header>
    <h1>Title</h1>
  </header>
  <main>
    <p>paragraph</p>
  </main>
</div>;


// ---- return_jsx.txt ----
function Greeting(name: string) {
  return <h1>Hello, {name}!</h1>;
}

const arrow = (name: string) => <p>{name}</p>;

const maybeShow = (show: boolean) =>
  show ? <div>visible</div> : null;


// ---- self_closing.txt ----
const br = <br />;
const img = <img src="logo.png" alt="Logo" />;


// ---- ts_compat.txt ----
interface User {
  id: number;
  name: string;
}

enum Color {
  Red = "red",
  Green = "green",
  Blue = "blue",
}

class Service {
  private readonly client: string;
  constructor(client: string) {
    this.client = client;
  }
  async fetch(): Promise<User[]> {
    return [];
  }
}

const x = 1 < 2 && 3 > 2;
const y: number = 5;


// ---- ts_in_jsx.txt ----
type Props = { count: number; label: string };

const Panel: React.FC<Props> = ({ count, label }) => {
  const [q, setQ] = useState<string>("");
  return (
    <section>
      <h2>{label}</h2>
      <p>Count: {count as number}</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
    </section>
  );
};


// ---- unit 3 ----
import * as React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
	type Dispatch,
	type PropsWithChildren,
	type ReactNode,
} from "react";

export type Status = "idle" | "loading" | "ready" | "error";

export interface Series<T extends number | string = number> {
	readonly id: string;
	readonly label: string;
	readonly points: ReadonlyArray<{ t: number; v: T }>;
	readonly unit?: "ms" | "req/s" | "%" | "bytes";
	readonly colour?: `#${string}`;
}

interface DashboardState {
	status: Status;
	range: [start: number, end: number];
	series: Record<string, Series>;
	selected: Set<string>;
	error?: Error;
}

type Action =
	| { type: "fetch/start" }
	| { type: "fetch/success"; payload: Series[] }
	| { type: "fetch/failure"; error: Error }
	| { type: "range/set"; range: [number, number] }
	| { type: "series/toggle"; id: string };

const initial_state: DashboardState = {
	status: "idle",
	range: [Date.now() - 86_400_000, Date.now()],
	series: {},
	selected: new Set<string>(),
};

function reducer(state: DashboardState, action: Action): DashboardState {
	switch (action.type) {
		case "fetch/start":
			return { ...state, status: "loading", error: undefined };
		case "fetch/success": {
			const series = Object.fromEntries(action.payload.map((s) => [s.id, s] as const));
			return { ...state, status: "ready", series };
		}
		case "fetch/failure":
			return { ...state, status: "error", error: action.error };
		case "range/set":
			return { ...state, range: action.range };
		case "series/toggle": {
			const selected = new Set(state.selected);
			selected.has(action.id) ? selected.delete(action.id) : selected.add(action.id);
			return { ...state, selected };
		}
		default: {
			const _exhaustive: never = action;
			return state;
		}
	}
}

const DashboardContext = createContext<
	{ state: DashboardState; dispatch: Dispatch<Action> } | undefined
>(undefined);

export function useDashboard() {
	const ctx = useContext(DashboardContext);
	if (!ctx) throw new Error("useDashboard must be used inside <DashboardProvider>");
	return ctx;
}

export function DashboardProvider({ children }: PropsWithChildren): React.JSX.Element {
	const [state, dispatch] = useReducer(reducer, initial_state);
	const value = useMemo(() => ({ state, dispatch }), [state]);
	return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

function subscribe_to_media(query: string) {
	return (on_change: () => void) => {
		const mql = window.matchMedia(query);
		mql.addEventListener("change", on_change);
		return () => mql.removeEventListener("change", on_change);
	};
}

export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		useMemo(() => subscribe_to_media(query), [query]),
		() => window.matchMedia(query).matches,
		() => false,
	);
}

interface SparklineProps {
	series: Series;
	width?: number;
	height?: number;
	onHover?: (index: number | null) => void;
}

export const Sparkline = React.memo(function Sparkline({
	series,
	width = 240,
	height = 48,
	onHover,
}: SparklineProps) {
	const gradient_id = useId();
	const path = useMemo(() => {
		const pts = series.points;
		if (pts.length < 2) return "";
		const xs = pts.map((p) => p.t);
		const ys = pts.map((p) => Number(p.v));
		const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
		const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
		const sx = (t: number) => ((t - x0) / (x1 - x0 || 1)) * width;
		const sy = (v: number) => height - ((v - y0) / (y1 - y0 || 1)) * height;
		return pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.t).toFixed(2)},${sy(Number(p.v)).toFixed(2)}`).join(" ");
	}, [series.points, width, height]);

	return (
		<svg
			role="img"
			aria-label={`${series.label} sparkline`}
			viewBox={`0 0 ${width} ${height}`}
			width={width}
			height={height}
			onPointerLeave={() => onHover?.(null)}
		>
			<defs>
				<linearGradient id={gradient_id} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0.35} />
					<stop offset="100%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0} />
				</linearGradient>
			</defs>
			{path && <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#${gradient_id})`} />}
			<path d={path} fill="none" stroke={series.colour ?? "#4f46e5"} strokeWidth={1.5} />
		</svg>
	);
});

function format_value(v: number, unit: Series["unit"]): string {
	switch (unit) {
		case "bytes": {
			const units = ["B", "KB", "MB", "GB"] as const;
			let n = v;
			let i = 0;
			while (n >= 1024 && i < units.length - 1) {
				n /= 1024;
				i++;
			}
			return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
		}
		case "%":
			return `${(v * 100).toFixed(1)}%`;
		case "ms":
			return v < 1 ? `${(v * 1000).toFixed(0)}µs` : `${v.toFixed(1)}ms`;
		default:
			return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
	}
}

export function MetricCard({ series }: { series: Series }): ReactNode {
	const { state, dispatch } = useDashboard();
	const selected = state.selected.has(series.id);
	const latest = series.points.at(-1);
	const previous = series.points.at(-2);
	const delta =
		latest && previous ? (Number(latest.v) - Number(previous.v)) / (Number(previous.v) || 1) : 0;

	const toggle = useCallback(
		() => dispatch({ type: "series/toggle", id: series.id }),
		[dispatch, series.id],
	);

	return (
		<button
			type="button"
			className={["metric-card", selected && "metric-card--selected"].filter(Boolean).join(" ")}
			aria-pressed={selected}
			onClick={toggle}
		>
			<header>
				<h3>{series.label}</h3>
				<span data-trend={delta > 0 ? "up" : delta < 0 ? "down" : "flat"}>
					{delta >= 0 ? "+" : ""}
					{(delta * 100).toFixed(1)}%
				</span>
			</header>
			<p className="metric-card__value">
				{latest ? format_value(Number(latest.v), series.unit) : <>&mdash;</>}
			</p>
			<Sparkline series={series} />
		</button>
	);
}

export function Dashboard({ endpoint }: { endpoint: string }) {
	const { state, dispatch } = useDashboard();
	const abort_ref = useRef<AbortController | null>(null);
	const compact = useMediaQuery("(max-width: 640px)");
	const [query, set_query] = useState("");

	useEffect(() => {
		abort_ref.current?.abort();
		const controller = new AbortController();
		abort_ref.current = controller;

		dispatch({ type: "fetch/start" });
		const [start, end] = state.range;
		fetch(`${endpoint}?start=${start}&end=${end}`, { signal: controller.signal })
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
				return (await res.json()) as Series[];
			})
			.then((payload) => dispatch({ type: "fetch/success", payload }))
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") return;
				dispatch({ type: "fetch/failure", error: error as Error });
			});

		return () => controller.abort();
	}, [dispatch, endpoint, state.range]);

	const visible = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return Object.values(state.series).filter(
			(s) => !needle || s.label.toLowerCase().includes(needle),
		);
	}, [state.series, query]);

	if (state.status === "error") {
		return (
			<div role="alert" className="dashboard__error">
				<p>Could not load metrics: {state.error?.message ?? "unknown error"}</p>
				<button onClick={() => dispatch({ type: "range/set", range: state.range })}>Retry</button>
			</div>
		);
	}

	return (
		<section className="dashboard" data-compact={compact || undefined}>
			<label>
				Filter
				<input value={query} onChange={(e) => set_query(e.currentTarget.value)} placeholder="latency…" />
			</label>
			{state.status === "loading" && <progress aria-label="loading metrics" />}
			<div className="dashboard__grid">
				{visible.map((s) => (
					<MetricCard key={s.id} series={s} />
				))}
				{visible.length === 0 && state.status === "ready" && <p>No series match “{query}”.</p>}
			</div>
		</section>
	);
}


// ---- unit 4 ----
// interactive greeter demo.
import { useState } from "react";

type Props = { name: string; count?: number };

export class Store<T> {
  items: T[] = [];
  add(item: T) { this.items.push(item); }
}

export function Greeter({ name, count = 1 }: Props) {
  const [clicks, setClicks] = useState<number>(0);
  const banner = `hello, ${name}`;
  return (
    <section className="root" data-count={count}>
      <h1>{banner}!</h1>
      <button onClick={() => setClicks((c) => c + 1)}>
        clicked {clicks} &times;
      </button>
    </section>
  );
}


// ---- unit 5 ----
// ---- attributes.txt ----
const el = <input
  value="hello"
  placeholder='search'
  disabled
  data-testid="input-1"
  aria-label="search field"
  {...rest}
  onChange={handler}
/>;


// ---- basic_element.txt ----
const el = <div>hello</div>;


// ---- conditional.txt ----
const view = (show: boolean, items: string[]) => {
  return (
    <div>
      {show && <Badge count={items.length} />}
      {items.length > 0 ? (
        <ul>
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <em>empty</em>
      )}
      {/* fallback block */}
    </div>
  );
};


// ---- entity.txt ----
const msg = <p>Hello &amp; Goodbye &mdash; &#9733; &#x2605;</p>;
const q = <p>Smart &ldquo;quotes&rdquo;</p>;


// ---- expression_container.txt ----
const el = <div className={classes.root} style={{ color: "red", padding: 4 }}>
  {count} item{count !== 1 ? "s" : ""}
</div>;


// ---- fragment.txt ----
const list = <>
  <li>one</li>
  <li>two</li>
</>;


// ---- generic_arrow.txt ----
const id = <T,>(x: T): T => x;
const other = <T extends unknown>(x: T): T => x;
const pair = <T, U>(a: T, b: U): [T, U] => [a, b];


// ---- generics_call.txt ----
const state = useState<string>("");
const arr = new Array<number>(5);
const result = fn<A, B>(a, b);
type Alias<T> = Promise<T>;
interface Box<T extends object> {
  value: T;
}


// ---- jsx_in_template.txt ----
const msg = `Result: ${<span>value</span>}`;
const multi = `${<b>bold</b>} and ${<i>italic</i>}`;


// ---- less_than.txt ----
const a = 1 < 2;
const b = x < y && y > z;
const c = compare<string>(a, b);
const d = Array<number>();
const e = arr.length < 10 ? "short" : "long";


// ---- member_tag.txt ----
const el = <React.Fragment>
  <Motion.div initial={{ opacity: 0 }} />
</React.Fragment>;


// ---- namespaced.txt ----
const icon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <use xlink:href="#icon-home" />
</svg>;


// ---- nested.txt ----
const page = <div>
  <header>
    <h1>Title</h1>
  </header>
  <main>
    <p>paragraph</p>
  </main>
</div>;


// ---- return_jsx.txt ----
function Greeting(name: string) {
  return <h1>Hello, {name}!</h1>;
}

const arrow = (name: string) => <p>{name}</p>;

const maybeShow = (show: boolean) =>
  show ? <div>visible</div> : null;


// ---- self_closing.txt ----
const br = <br />;
const img = <img src="logo.png" alt="Logo" />;


// ---- ts_compat.txt ----
interface User {
  id: number;
  name: string;
}

enum Color {
  Red = "red",
  Green = "green",
  Blue = "blue",
}

class Service {
  private readonly client: string;
  constructor(client: string) {
    this.client = client;
  }
  async fetch(): Promise<User[]> {
    return [];
  }
}

const x = 1 < 2 && 3 > 2;
const y: number = 5;


// ---- ts_in_jsx.txt ----
type Props = { count: number; label: string };

const Panel: React.FC<Props> = ({ count, label }) => {
  const [q, setQ] = useState<string>("");
  return (
    <section>
      <h2>{label}</h2>
      <p>Count: {count as number}</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
    </section>
  );
};


// ---- unit 6 ----
import * as React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
	type Dispatch,
	type PropsWithChildren,
	type ReactNode,
} from "react";

export type Status = "idle" | "loading" | "ready" | "error";

export interface Series<T extends number | string = number> {
	readonly id: string;
	readonly label: string;
	readonly points: ReadonlyArray<{ t: number; v: T }>;
	readonly unit?: "ms" | "req/s" | "%" | "bytes";
	readonly colour?: `#${string}`;
}

interface DashboardState {
	status: Status;
	range: [start: number, end: number];
	series: Record<string, Series>;
	selected: Set<string>;
	error?: Error;
}

type Action =
	| { type: "fetch/start" }
	| { type: "fetch/success"; payload: Series[] }
	| { type: "fetch/failure"; error: Error }
	| { type: "range/set"; range: [number, number] }
	| { type: "series/toggle"; id: string };

const initial_state: DashboardState = {
	status: "idle",
	range: [Date.now() - 86_400_000, Date.now()],
	series: {},
	selected: new Set<string>(),
};

function reducer(state: DashboardState, action: Action): DashboardState {
	switch (action.type) {
		case "fetch/start":
			return { ...state, status: "loading", error: undefined };
		case "fetch/success": {
			const series = Object.fromEntries(action.payload.map((s) => [s.id, s] as const));
			return { ...state, status: "ready", series };
		}
		case "fetch/failure":
			return { ...state, status: "error", error: action.error };
		case "range/set":
			return { ...state, range: action.range };
		case "series/toggle": {
			const selected = new Set(state.selected);
			selected.has(action.id) ? selected.delete(action.id) : selected.add(action.id);
			return { ...state, selected };
		}
		default: {
			const _exhaustive: never = action;
			return state;
		}
	}
}

const DashboardContext = createContext<
	{ state: DashboardState; dispatch: Dispatch<Action> } | undefined
>(undefined);

export function useDashboard() {
	const ctx = useContext(DashboardContext);
	if (!ctx) throw new Error("useDashboard must be used inside <DashboardProvider>");
	return ctx;
}

export function DashboardProvider({ children }: PropsWithChildren): React.JSX.Element {
	const [state, dispatch] = useReducer(reducer, initial_state);
	const value = useMemo(() => ({ state, dispatch }), [state]);
	return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

function subscribe_to_media(query: string) {
	return (on_change: () => void) => {
		const mql = window.matchMedia(query);
		mql.addEventListener("change", on_change);
		return () => mql.removeEventListener("change", on_change);
	};
}

export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		useMemo(() => subscribe_to_media(query), [query]),
		() => window.matchMedia(query).matches,
		() => false,
	);
}

interface SparklineProps {
	series: Series;
	width?: number;
	height?: number;
	onHover?: (index: number | null) => void;
}

export const Sparkline = React.memo(function Sparkline({
	series,
	width = 240,
	height = 48,
	onHover,
}: SparklineProps) {
	const gradient_id = useId();
	const path = useMemo(() => {
		const pts = series.points;
		if (pts.length < 2) return "";
		const xs = pts.map((p) => p.t);
		const ys = pts.map((p) => Number(p.v));
		const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
		const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
		const sx = (t: number) => ((t - x0) / (x1 - x0 || 1)) * width;
		const sy = (v: number) => height - ((v - y0) / (y1 - y0 || 1)) * height;
		return pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.t).toFixed(2)},${sy(Number(p.v)).toFixed(2)}`).join(" ");
	}, [series.points, width, height]);

	return (
		<svg
			role="img"
			aria-label={`${series.label} sparkline`}
			viewBox={`0 0 ${width} ${height}`}
			width={width}
			height={height}
			onPointerLeave={() => onHover?.(null)}
		>
			<defs>
				<linearGradient id={gradient_id} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0.35} />
					<stop offset="100%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0} />
				</linearGradient>
			</defs>
			{path && <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#${gradient_id})`} />}
			<path d={path} fill="none" stroke={series.colour ?? "#4f46e5"} strokeWidth={1.5} />
		</svg>
	);
});

function format_value(v: number, unit: Series["unit"]): string {
	switch (unit) {
		case "bytes": {
			const units = ["B", "KB", "MB", "GB"] as const;
			let n = v;
			let i = 0;
			while (n >= 1024 && i < units.length - 1) {
				n /= 1024;
				i++;
			}
			return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
		}
		case "%":
			return `${(v * 100).toFixed(1)}%`;
		case "ms":
			return v < 1 ? `${(v * 1000).toFixed(0)}µs` : `${v.toFixed(1)}ms`;
		default:
			return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
	}
}

export function MetricCard({ series }: { series: Series }): ReactNode {
	const { state, dispatch } = useDashboard();
	const selected = state.selected.has(series.id);
	const latest = series.points.at(-1);
	const previous = series.points.at(-2);
	const delta =
		latest && previous ? (Number(latest.v) - Number(previous.v)) / (Number(previous.v) || 1) : 0;

	const toggle = useCallback(
		() => dispatch({ type: "series/toggle", id: series.id }),
		[dispatch, series.id],
	);

	return (
		<button
			type="button"
			className={["metric-card", selected && "metric-card--selected"].filter(Boolean).join(" ")}
			aria-pressed={selected}
			onClick={toggle}
		>
			<header>
				<h3>{series.label}</h3>
				<span data-trend={delta > 0 ? "up" : delta < 0 ? "down" : "flat"}>
					{delta >= 0 ? "+" : ""}
					{(delta * 100).toFixed(1)}%
				</span>
			</header>
			<p className="metric-card__value">
				{latest ? format_value(Number(latest.v), series.unit) : <>&mdash;</>}
			</p>
			<Sparkline series={series} />
		</button>
	);
}

export function Dashboard({ endpoint }: { endpoint: string }) {
	const { state, dispatch } = useDashboard();
	const abort_ref = useRef<AbortController | null>(null);
	const compact = useMediaQuery("(max-width: 640px)");
	const [query, set_query] = useState("");

	useEffect(() => {
		abort_ref.current?.abort();
		const controller = new AbortController();
		abort_ref.current = controller;

		dispatch({ type: "fetch/start" });
		const [start, end] = state.range;
		fetch(`${endpoint}?start=${start}&end=${end}`, { signal: controller.signal })
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
				return (await res.json()) as Series[];
			})
			.then((payload) => dispatch({ type: "fetch/success", payload }))
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") return;
				dispatch({ type: "fetch/failure", error: error as Error });
			});

		return () => controller.abort();
	}, [dispatch, endpoint, state.range]);

	const visible = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return Object.values(state.series).filter(
			(s) => !needle || s.label.toLowerCase().includes(needle),
		);
	}, [state.series, query]);

	if (state.status === "error") {
		return (
			<div role="alert" className="dashboard__error">
				<p>Could not load metrics: {state.error?.message ?? "unknown error"}</p>
				<button onClick={() => dispatch({ type: "range/set", range: state.range })}>Retry</button>
			</div>
		);
	}

	return (
		<section className="dashboard" data-compact={compact || undefined}>
			<label>
				Filter
				<input value={query} onChange={(e) => set_query(e.currentTarget.value)} placeholder="latency…" />
			</label>
			{state.status === "loading" && <progress aria-label="loading metrics" />}
			<div className="dashboard__grid">
				{visible.map((s) => (
					<MetricCard key={s.id} series={s} />
				))}
				{visible.length === 0 && state.status === "ready" && <p>No series match “{query}”.</p>}
			</div>
		</section>
	);
}


// ---- unit 7 ----
// interactive greeter demo.
import { useState } from "react";

type Props = { name: string; count?: number };

export class Store<T> {
  items: T[] = [];
  add(item: T) { this.items.push(item); }
}

export function Greeter({ name, count = 1 }: Props) {
  const [clicks, setClicks] = useState<number>(0);
  const banner = `hello, ${name}`;
  return (
    <section className="root" data-count={count}>
      <h1>{banner}!</h1>
      <button onClick={() => setClicks((c) => c + 1)}>
        clicked {clicks} &times;
      </button>
    </section>
  );
}


// ---- unit 8 ----
// ---- attributes.txt ----
const el = <input
  value="hello"
  placeholder='search'
  disabled
  data-testid="input-1"
  aria-label="search field"
  {...rest}
  onChange={handler}
/>;


// ---- basic_element.txt ----
const el = <div>hello</div>;


// ---- conditional.txt ----
const view = (show: boolean, items: string[]) => {
  return (
    <div>
      {show && <Badge count={items.length} />}
      {items.length > 0 ? (
        <ul>
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <em>empty</em>
      )}
      {/* fallback block */}
    </div>
  );
};


// ---- entity.txt ----
const msg = <p>Hello &amp; Goodbye &mdash; &#9733; &#x2605;</p>;
const q = <p>Smart &ldquo;quotes&rdquo;</p>;


// ---- expression_container.txt ----
const el = <div className={classes.root} style={{ color: "red", padding: 4 }}>
  {count} item{count !== 1 ? "s" : ""}
</div>;


// ---- fragment.txt ----
const list = <>
  <li>one</li>
  <li>two</li>
</>;


// ---- generic_arrow.txt ----
const id = <T,>(x: T): T => x;
const other = <T extends unknown>(x: T): T => x;
const pair = <T, U>(a: T, b: U): [T, U] => [a, b];


// ---- generics_call.txt ----
const state = useState<string>("");
const arr = new Array<number>(5);
const result = fn<A, B>(a, b);
type Alias<T> = Promise<T>;
interface Box<T extends object> {
  value: T;
}


// ---- jsx_in_template.txt ----
const msg = `Result: ${<span>value</span>}`;
const multi = `${<b>bold</b>} and ${<i>italic</i>}`;


// ---- less_than.txt ----
const a = 1 < 2;
const b = x < y && y > z;
const c = compare<string>(a, b);
const d = Array<number>();
const e = arr.length < 10 ? "short" : "long";


// ---- member_tag.txt ----
const el = <React.Fragment>
  <Motion.div initial={{ opacity: 0 }} />
</React.Fragment>;


// ---- namespaced.txt ----
const icon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <use xlink:href="#icon-home" />
</svg>;


// ---- nested.txt ----
const page = <div>
  <header>
    <h1>Title</h1>
  </header>
  <main>
    <p>paragraph</p>
  </main>
</div>;


// ---- return_jsx.txt ----
function Greeting(name: string) {
  return <h1>Hello, {name}!</h1>;
}

const arrow = (name: string) => <p>{name}</p>;

const maybeShow = (show: boolean) =>
  show ? <div>visible</div> : null;


// ---- self_closing.txt ----
const br = <br />;
const img = <img src="logo.png" alt="Logo" />;


// ---- ts_compat.txt ----
interface User {
  id: number;
  name: string;
}

enum Color {
  Red = "red",
  Green = "green",
  Blue = "blue",
}

class Service {
  private readonly client: string;
  constructor(client: string) {
    this.client = client;
  }
  async fetch(): Promise<User[]> {
    return [];
  }
}

const x = 1 < 2 && 3 > 2;
const y: number = 5;


// ---- ts_in_jsx.txt ----
type Props = { count: number; label: string };

const Panel: React.FC<Props> = ({ count, label }) => {
  const [q, setQ] = useState<string>("");
  return (
    <section>
      <h2>{label}</h2>
      <p>Count: {count as number}</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
    </section>
  );
};


// ---- unit 9 ----
import * as React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
	type Dispatch,
	type PropsWithChildren,
	type ReactNode,
} from "react";

export type Status = "idle" | "loading" | "ready" | "error";

export interface Series<T extends number | string = number> {
	readonly id: string;
	readonly label: string;
	readonly points: ReadonlyArray<{ t: number; v: T }>;
	readonly unit?: "ms" | "req/s" | "%" | "bytes";
	readonly colour?: `#${string}`;
}

interface DashboardState {
	status: Status;
	range: [start: number, end: number];
	series: Record<string, Series>;
	selected: Set<string>;
	error?: Error;
}

type Action =
	| { type: "fetch/start" }
	| { type: "fetch/success"; payload: Series[] }
	| { type: "fetch/failure"; error: Error }
	| { type: "range/set"; range: [number, number] }
	| { type: "series/toggle"; id: string };

const initial_state: DashboardState = {
	status: "idle",
	range: [Date.now() - 86_400_000, Date.now()],
	series: {},
	selected: new Set<string>(),
};

function reducer(state: DashboardState, action: Action): DashboardState {
	switch (action.type) {
		case "fetch/start":
			return { ...state, status: "loading", error: undefined };
		case "fetch/success": {
			const series = Object.fromEntries(action.payload.map((s) => [s.id, s] as const));
			return { ...state, status: "ready", series };
		}
		case "fetch/failure":
			return { ...state, status: "error", error: action.error };
		case "range/set":
			return { ...state, range: action.range };
		case "series/toggle": {
			const selected = new Set(state.selected);
			selected.has(action.id) ? selected.delete(action.id) : selected.add(action.id);
			return { ...state, selected };
		}
		default: {
			const _exhaustive: never = action;
			return state;
		}
	}
}

const DashboardContext = createContext<
	{ state: DashboardState; dispatch: Dispatch<Action> } | undefined
>(undefined);

export function useDashboard() {
	const ctx = useContext(DashboardContext);
	if (!ctx) throw new Error("useDashboard must be used inside <DashboardProvider>");
	return ctx;
}

export function DashboardProvider({ children }: PropsWithChildren): React.JSX.Element {
	const [state, dispatch] = useReducer(reducer, initial_state);
	const value = useMemo(() => ({ state, dispatch }), [state]);
	return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

function subscribe_to_media(query: string) {
	return (on_change: () => void) => {
		const mql = window.matchMedia(query);
		mql.addEventListener("change", on_change);
		return () => mql.removeEventListener("change", on_change);
	};
}

export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		useMemo(() => subscribe_to_media(query), [query]),
		() => window.matchMedia(query).matches,
		() => false,
	);
}

interface SparklineProps {
	series: Series;
	width?: number;
	height?: number;
	onHover?: (index: number | null) => void;
}

export const Sparkline = React.memo(function Sparkline({
	series,
	width = 240,
	height = 48,
	onHover,
}: SparklineProps) {
	const gradient_id = useId();
	const path = useMemo(() => {
		const pts = series.points;
		if (pts.length < 2) return "";
		const xs = pts.map((p) => p.t);
		const ys = pts.map((p) => Number(p.v));
		const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
		const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
		const sx = (t: number) => ((t - x0) / (x1 - x0 || 1)) * width;
		const sy = (v: number) => height - ((v - y0) / (y1 - y0 || 1)) * height;
		return pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.t).toFixed(2)},${sy(Number(p.v)).toFixed(2)}`).join(" ");
	}, [series.points, width, height]);

	return (
		<svg
			role="img"
			aria-label={`${series.label} sparkline`}
			viewBox={`0 0 ${width} ${height}`}
			width={width}
			height={height}
			onPointerLeave={() => onHover?.(null)}
		>
			<defs>
				<linearGradient id={gradient_id} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0.35} />
					<stop offset="100%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0} />
				</linearGradient>
			</defs>
			{path && <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#${gradient_id})`} />}
			<path d={path} fill="none" stroke={series.colour ?? "#4f46e5"} strokeWidth={1.5} />
		</svg>
	);
});

function format_value(v: number, unit: Series["unit"]): string {
	switch (unit) {
		case "bytes": {
			const units = ["B", "KB", "MB", "GB"] as const;
			let n = v;
			let i = 0;
			while (n >= 1024 && i < units.length - 1) {
				n /= 1024;
				i++;
			}
			return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
		}
		case "%":
			return `${(v * 100).toFixed(1)}%`;
		case "ms":
			return v < 1 ? `${(v * 1000).toFixed(0)}µs` : `${v.toFixed(1)}ms`;
		default:
			return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
	}
}

export function MetricCard({ series }: { series: Series }): ReactNode {
	const { state, dispatch } = useDashboard();
	const selected = state.selected.has(series.id);
	const latest = series.points.at(-1);
	const previous = series.points.at(-2);
	const delta =
		latest && previous ? (Number(latest.v) - Number(previous.v)) / (Number(previous.v) || 1) : 0;

	const toggle = useCallback(
		() => dispatch({ type: "series/toggle", id: series.id }),
		[dispatch, series.id],
	);

	return (
		<button
			type="button"
			className={["metric-card", selected && "metric-card--selected"].filter(Boolean).join(" ")}
			aria-pressed={selected}
			onClick={toggle}
		>
			<header>
				<h3>{series.label}</h3>
				<span data-trend={delta > 0 ? "up" : delta < 0 ? "down" : "flat"}>
					{delta >= 0 ? "+" : ""}
					{(delta * 100).toFixed(1)}%
				</span>
			</header>
			<p className="metric-card__value">
				{latest ? format_value(Number(latest.v), series.unit) : <>&mdash;</>}
			</p>
			<Sparkline series={series} />
		</button>
	);
}

export function Dashboard({ endpoint }: { endpoint: string }) {
	const { state, dispatch } = useDashboard();
	const abort_ref = useRef<AbortController | null>(null);
	const compact = useMediaQuery("(max-width: 640px)");
	const [query, set_query] = useState("");

	useEffect(() => {
		abort_ref.current?.abort();
		const controller = new AbortController();
		abort_ref.current = controller;

		dispatch({ type: "fetch/start" });
		const [start, end] = state.range;
		fetch(`${endpoint}?start=${start}&end=${end}`, { signal: controller.signal })
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
				return (await res.json()) as Series[];
			})
			.then((payload) => dispatch({ type: "fetch/success", payload }))
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") return;
				dispatch({ type: "fetch/failure", error: error as Error });
			});

		return () => controller.abort();
	}, [dispatch, endpoint, state.range]);

	const visible = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return Object.values(state.series).filter(
			(s) => !needle || s.label.toLowerCase().includes(needle),
		);
	}, [state.series, query]);

	if (state.status === "error") {
		return (
			<div role="alert" className="dashboard__error">
				<p>Could not load metrics: {state.error?.message ?? "unknown error"}</p>
				<button onClick={() => dispatch({ type: "range/set", range: state.range })}>Retry</button>
			</div>
		);
	}

	return (
		<section className="dashboard" data-compact={compact || undefined}>
			<label>
				Filter
				<input value={query} onChange={(e) => set_query(e.currentTarget.value)} placeholder="latency…" />
			</label>
			{state.status === "loading" && <progress aria-label="loading metrics" />}
			<div className="dashboard__grid">
				{visible.map((s) => (
					<MetricCard key={s.id} series={s} />
				))}
				{visible.length === 0 && state.status === "ready" && <p>No series match “{query}”.</p>}
			</div>
		</section>
	);
}


// ---- unit 10 ----
// interactive greeter demo.
import { useState } from "react";

type Props = { name: string; count?: number };

export class Store<T> {
  items: T[] = [];
  add(item: T) { this.items.push(item); }
}

export function Greeter({ name, count = 1 }: Props) {
  const [clicks, setClicks] = useState<number>(0);
  const banner = `hello, ${name}`;
  return (
    <section className="root" data-count={count}>
      <h1>{banner}!</h1>
      <button onClick={() => setClicks((c) => c + 1)}>
        clicked {clicks} &times;
      </button>
    </section>
  );
}


// ---- unit 11 ----
// ---- attributes.txt ----
const el = <input
  value="hello"
  placeholder='search'
  disabled
  data-testid="input-1"
  aria-label="search field"
  {...rest}
  onChange={handler}
/>;


// ---- basic_element.txt ----
const el = <div>hello</div>;


// ---- conditional.txt ----
const view = (show: boolean, items: string[]) => {
  return (
    <div>
      {show && <Badge count={items.length} />}
      {items.length > 0 ? (
        <ul>
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <em>empty</em>
      )}
      {/* fallback block */}
    </div>
  );
};


// ---- entity.txt ----
const msg = <p>Hello &amp; Goodbye &mdash; &#9733; &#x2605;</p>;
const q = <p>Smart &ldquo;quotes&rdquo;</p>;


// ---- expression_container.txt ----
const el = <div className={classes.root} style={{ color: "red", padding: 4 }}>
  {count} item{count !== 1 ? "s" : ""}
</div>;


// ---- fragment.txt ----
const list = <>
  <li>one</li>
  <li>two</li>
</>;


// ---- generic_arrow.txt ----
const id = <T,>(x: T): T => x;
const other = <T extends unknown>(x: T): T => x;
const pair = <T, U>(a: T, b: U): [T, U] => [a, b];


// ---- generics_call.txt ----
const state = useState<string>("");
const arr = new Array<number>(5);
const result = fn<A, B>(a, b);
type Alias<T> = Promise<T>;
interface Box<T extends object> {
  value: T;
}


// ---- jsx_in_template.txt ----
const msg = `Result: ${<span>value</span>}`;
const multi = `${<b>bold</b>} and ${<i>italic</i>}`;


// ---- less_than.txt ----
const a = 1 < 2;
const b = x < y && y > z;
const c = compare<string>(a, b);
const d = Array<number>();
const e = arr.length < 10 ? "short" : "long";


// ---- member_tag.txt ----
const el = <React.Fragment>
  <Motion.div initial={{ opacity: 0 }} />
</React.Fragment>;


// ---- namespaced.txt ----
const icon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <use xlink:href="#icon-home" />
</svg>;


// ---- nested.txt ----
const page = <div>
  <header>
    <h1>Title</h1>
  </header>
  <main>
    <p>paragraph</p>
  </main>
</div>;


// ---- return_jsx.txt ----
function Greeting(name: string) {
  return <h1>Hello, {name}!</h1>;
}

const arrow = (name: string) => <p>{name}</p>;

const maybeShow = (show: boolean) =>
  show ? <div>visible</div> : null;


// ---- self_closing.txt ----
const br = <br />;
const img = <img src="logo.png" alt="Logo" />;


// ---- ts_compat.txt ----
interface User {
  id: number;
  name: string;
}

enum Color {
  Red = "red",
  Green = "green",
  Blue = "blue",
}

class Service {
  private readonly client: string;
  constructor(client: string) {
    this.client = client;
  }
  async fetch(): Promise<User[]> {
    return [];
  }
}

const x = 1 < 2 && 3 > 2;
const y: number = 5;


// ---- ts_in_jsx.txt ----
type Props = { count: number; label: string };

const Panel: React.FC<Props> = ({ count, label }) => {
  const [q, setQ] = useState<string>("");
  return (
    <section>
      <h2>{label}</h2>
      <p>Count: {count as number}</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
    </section>
  );
};


// ---- unit 12 ----
import * as React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
	type Dispatch,
	type PropsWithChildren,
	type ReactNode,
} from "react";

export type Status = "idle" | "loading" | "ready" | "error";

export interface Series<T extends number | string = number> {
	readonly id: string;
	readonly label: string;
	readonly points: ReadonlyArray<{ t: number; v: T }>;
	readonly unit?: "ms" | "req/s" | "%" | "bytes";
	readonly colour?: `#${string}`;
}

interface DashboardState {
	status: Status;
	range: [start: number, end: number];
	series: Record<string, Series>;
	selected: Set<string>;
	error?: Error;
}

type Action =
	| { type: "fetch/start" }
	| { type: "fetch/success"; payload: Series[] }
	| { type: "fetch/failure"; error: Error }
	| { type: "range/set"; range: [number, number] }
	| { type: "series/toggle"; id: string };

const initial_state: DashboardState = {
	status: "idle",
	range: [Date.now() - 86_400_000, Date.now()],
	series: {},
	selected: new Set<string>(),
};

function reducer(state: DashboardState, action: Action): DashboardState {
	switch (action.type) {
		case "fetch/start":
			return { ...state, status: "loading", error: undefined };
		case "fetch/success": {
			const series = Object.fromEntries(action.payload.map((s) => [s.id, s] as const));
			return { ...state, status: "ready", series };
		}
		case "fetch/failure":
			return { ...state, status: "error", error: action.error };
		case "range/set":
			return { ...state, range: action.range };
		case "series/toggle": {
			const selected = new Set(state.selected);
			selected.has(action.id) ? selected.delete(action.id) : selected.add(action.id);
			return { ...state, selected };
		}
		default: {
			const _exhaustive: never = action;
			return state;
		}
	}
}

const DashboardContext = createContext<
	{ state: DashboardState; dispatch: Dispatch<Action> } | undefined
>(undefined);

export function useDashboard() {
	const ctx = useContext(DashboardContext);
	if (!ctx) throw new Error("useDashboard must be used inside <DashboardProvider>");
	return ctx;
}

export function DashboardProvider({ children }: PropsWithChildren): React.JSX.Element {
	const [state, dispatch] = useReducer(reducer, initial_state);
	const value = useMemo(() => ({ state, dispatch }), [state]);
	return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

function subscribe_to_media(query: string) {
	return (on_change: () => void) => {
		const mql = window.matchMedia(query);
		mql.addEventListener("change", on_change);
		return () => mql.removeEventListener("change", on_change);
	};
}

export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		useMemo(() => subscribe_to_media(query), [query]),
		() => window.matchMedia(query).matches,
		() => false,
	);
}

interface SparklineProps {
	series: Series;
	width?: number;
	height?: number;
	onHover?: (index: number | null) => void;
}

export const Sparkline = React.memo(function Sparkline({
	series,
	width = 240,
	height = 48,
	onHover,
}: SparklineProps) {
	const gradient_id = useId();
	const path = useMemo(() => {
		const pts = series.points;
		if (pts.length < 2) return "";
		const xs = pts.map((p) => p.t);
		const ys = pts.map((p) => Number(p.v));
		const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
		const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
		const sx = (t: number) => ((t - x0) / (x1 - x0 || 1)) * width;
		const sy = (v: number) => height - ((v - y0) / (y1 - y0 || 1)) * height;
		return pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.t).toFixed(2)},${sy(Number(p.v)).toFixed(2)}`).join(" ");
	}, [series.points, width, height]);

	return (
		<svg
			role="img"
			aria-label={`${series.label} sparkline`}
			viewBox={`0 0 ${width} ${height}`}
			width={width}
			height={height}
			onPointerLeave={() => onHover?.(null)}
		>
			<defs>
				<linearGradient id={gradient_id} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0.35} />
					<stop offset="100%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0} />
				</linearGradient>
			</defs>
			{path && <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#${gradient_id})`} />}
			<path d={path} fill="none" stroke={series.colour ?? "#4f46e5"} strokeWidth={1.5} />
		</svg>
	);
});

function format_value(v: number, unit: Series["unit"]): string {
	switch (unit) {
		case "bytes": {
			const units = ["B", "KB", "MB", "GB"] as const;
			let n = v;
			let i = 0;
			while (n >= 1024 && i < units.length - 1) {
				n /= 1024;
				i++;
			}
			return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
		}
		case "%":
			return `${(v * 100).toFixed(1)}%`;
		case "ms":
			return v < 1 ? `${(v * 1000).toFixed(0)}µs` : `${v.toFixed(1)}ms`;
		default:
			return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
	}
}

export function MetricCard({ series }: { series: Series }): ReactNode {
	const { state, dispatch } = useDashboard();
	const selected = state.selected.has(series.id);
	const latest = series.points.at(-1);
	const previous = series.points.at(-2);
	const delta =
		latest && previous ? (Number(latest.v) - Number(previous.v)) / (Number(previous.v) || 1) : 0;

	const toggle = useCallback(
		() => dispatch({ type: "series/toggle", id: series.id }),
		[dispatch, series.id],
	);

	return (
		<button
			type="button"
			className={["metric-card", selected && "metric-card--selected"].filter(Boolean).join(" ")}
			aria-pressed={selected}
			onClick={toggle}
		>
			<header>
				<h3>{series.label}</h3>
				<span data-trend={delta > 0 ? "up" : delta < 0 ? "down" : "flat"}>
					{delta >= 0 ? "+" : ""}
					{(delta * 100).toFixed(1)}%
				</span>
			</header>
			<p className="metric-card__value">
				{latest ? format_value(Number(latest.v), series.unit) : <>&mdash;</>}
			</p>
			<Sparkline series={series} />
		</button>
	);
}

export function Dashboard({ endpoint }: { endpoint: string }) {
	const { state, dispatch } = useDashboard();
	const abort_ref = useRef<AbortController | null>(null);
	const compact = useMediaQuery("(max-width: 640px)");
	const [query, set_query] = useState("");

	useEffect(() => {
		abort_ref.current?.abort();
		const controller = new AbortController();
		abort_ref.current = controller;

		dispatch({ type: "fetch/start" });
		const [start, end] = state.range;
		fetch(`${endpoint}?start=${start}&end=${end}`, { signal: controller.signal })
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
				return (await res.json()) as Series[];
			})
			.then((payload) => dispatch({ type: "fetch/success", payload }))
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") return;
				dispatch({ type: "fetch/failure", error: error as Error });
			});

		return () => controller.abort();
	}, [dispatch, endpoint, state.range]);

	const visible = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return Object.values(state.series).filter(
			(s) => !needle || s.label.toLowerCase().includes(needle),
		);
	}, [state.series, query]);

	if (state.status === "error") {
		return (
			<div role="alert" className="dashboard__error">
				<p>Could not load metrics: {state.error?.message ?? "unknown error"}</p>
				<button onClick={() => dispatch({ type: "range/set", range: state.range })}>Retry</button>
			</div>
		);
	}

	return (
		<section className="dashboard" data-compact={compact || undefined}>
			<label>
				Filter
				<input value={query} onChange={(e) => set_query(e.currentTarget.value)} placeholder="latency…" />
			</label>
			{state.status === "loading" && <progress aria-label="loading metrics" />}
			<div className="dashboard__grid">
				{visible.map((s) => (
					<MetricCard key={s.id} series={s} />
				))}
				{visible.length === 0 && state.status === "ready" && <p>No series match “{query}”.</p>}
			</div>
		</section>
	);
}


// ---- unit 13 ----
// interactive greeter demo.
import { useState } from "react";

type Props = { name: string; count?: number };

export class Store<T> {
  items: T[] = [];
  add(item: T) { this.items.push(item); }
}

export function Greeter({ name, count = 1 }: Props) {
  const [clicks, setClicks] = useState<number>(0);
  const banner = `hello, ${name}`;
  return (
    <section className="root" data-count={count}>
      <h1>{banner}!</h1>
      <button onClick={() => setClicks((c) => c + 1)}>
        clicked {clicks} &times;
      </button>
    </section>
  );
}


// ---- unit 14 ----
// ---- attributes.txt ----
const el = <input
  value="hello"
  placeholder='search'
  disabled
  data-testid="input-1"
  aria-label="search field"
  {...rest}
  onChange={handler}
/>;


// ---- basic_element.txt ----
const el = <div>hello</div>;


// ---- conditional.txt ----
const view = (show: boolean, items: string[]) => {
  return (
    <div>
      {show && <Badge count={items.length} />}
      {items.length > 0 ? (
        <ul>
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <em>empty</em>
      )}
      {/* fallback block */}
    </div>
  );
};


// ---- entity.txt ----
const msg = <p>Hello &amp; Goodbye &mdash; &#9733; &#x2605;</p>;
const q = <p>Smart &ldquo;quotes&rdquo;</p>;


// ---- expression_container.txt ----
const el = <div className={classes.root} style={{ color: "red", padding: 4 }}>
  {count} item{count !== 1 ? "s" : ""}
</div>;


// ---- fragment.txt ----
const list = <>
  <li>one</li>
  <li>two</li>
</>;


// ---- generic_arrow.txt ----
const id = <T,>(x: T): T => x;
const other = <T extends unknown>(x: T): T => x;
const pair = <T, U>(a: T, b: U): [T, U] => [a, b];


// ---- generics_call.txt ----
const state = useState<string>("");
const arr = new Array<number>(5);
const result = fn<A, B>(a, b);
type Alias<T> = Promise<T>;
interface Box<T extends object> {
  value: T;
}


// ---- jsx_in_template.txt ----
const msg = `Result: ${<span>value</span>}`;
const multi = `${<b>bold</b>} and ${<i>italic</i>}`;


// ---- less_than.txt ----
const a = 1 < 2;
const b = x < y && y > z;
const c = compare<string>(a, b);
const d = Array<number>();
const e = arr.length < 10 ? "short" : "long";


// ---- member_tag.txt ----
const el = <React.Fragment>
  <Motion.div initial={{ opacity: 0 }} />
</React.Fragment>;


// ---- namespaced.txt ----
const icon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <use xlink:href="#icon-home" />
</svg>;


// ---- nested.txt ----
const page = <div>
  <header>
    <h1>Title</h1>
  </header>
  <main>
    <p>paragraph</p>
  </main>
</div>;


// ---- return_jsx.txt ----
function Greeting(name: string) {
  return <h1>Hello, {name}!</h1>;
}

const arrow = (name: string) => <p>{name}</p>;

const maybeShow = (show: boolean) =>
  show ? <div>visible</div> : null;


// ---- self_closing.txt ----
const br = <br />;
const img = <img src="logo.png" alt="Logo" />;


// ---- ts_compat.txt ----
interface User {
  id: number;
  name: string;
}

enum Color {
  Red = "red",
  Green = "green",
  Blue = "blue",
}

class Service {
  private readonly client: string;
  constructor(client: string) {
    this.client = client;
  }
  async fetch(): Promise<User[]> {
    return [];
  }
}

const x = 1 < 2 && 3 > 2;
const y: number = 5;


// ---- ts_in_jsx.txt ----
type Props = { count: number; label: string };

const Panel: React.FC<Props> = ({ count, label }) => {
  const [q, setQ] = useState<string>("");
  return (
    <section>
      <h2>{label}</h2>
      <p>Count: {count as number}</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
    </section>
  );
};


// ---- unit 15 ----
import * as React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
	type Dispatch,
	type PropsWithChildren,
	type ReactNode,
} from "react";

export type Status = "idle" | "loading" | "ready" | "error";

export interface Series<T extends number | string = number> {
	readonly id: string;
	readonly label: string;
	readonly points: ReadonlyArray<{ t: number; v: T }>;
	readonly unit?: "ms" | "req/s" | "%" | "bytes";
	readonly colour?: `#${string}`;
}

interface DashboardState {
	status: Status;
	range: [start: number, end: number];
	series: Record<string, Series>;
	selected: Set<string>;
	error?: Error;
}

type Action =
	| { type: "fetch/start" }
	| { type: "fetch/success"; payload: Series[] }
	| { type: "fetch/failure"; error: Error }
	| { type: "range/set"; range: [number, number] }
	| { type: "series/toggle"; id: string };

const initial_state: DashboardState = {
	status: "idle",
	range: [Date.now() - 86_400_000, Date.now()],
	series: {},
	selected: new Set<string>(),
};

function reducer(state: DashboardState, action: Action): DashboardState {
	switch (action.type) {
		case "fetch/start":
			return { ...state, status: "loading", error: undefined };
		case "fetch/success": {
			const series = Object.fromEntries(action.payload.map((s) => [s.id, s] as const));
			return { ...state, status: "ready", series };
		}
		case "fetch/failure":
			return { ...state, status: "error", error: action.error };
		case "range/set":
			return { ...state, range: action.range };
		case "series/toggle": {
			const selected = new Set(state.selected);
			selected.has(action.id) ? selected.delete(action.id) : selected.add(action.id);
			return { ...state, selected };
		}
		default: {
			const _exhaustive: never = action;
			return state;
		}
	}
}

const DashboardContext = createContext<
	{ state: DashboardState; dispatch: Dispatch<Action> } | undefined
>(undefined);

export function useDashboard() {
	const ctx = useContext(DashboardContext);
	if (!ctx) throw new Error("useDashboard must be used inside <DashboardProvider>");
	return ctx;
}

export function DashboardProvider({ children }: PropsWithChildren): React.JSX.Element {
	const [state, dispatch] = useReducer(reducer, initial_state);
	const value = useMemo(() => ({ state, dispatch }), [state]);
	return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

function subscribe_to_media(query: string) {
	return (on_change: () => void) => {
		const mql = window.matchMedia(query);
		mql.addEventListener("change", on_change);
		return () => mql.removeEventListener("change", on_change);
	};
}

export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		useMemo(() => subscribe_to_media(query), [query]),
		() => window.matchMedia(query).matches,
		() => false,
	);
}

interface SparklineProps {
	series: Series;
	width?: number;
	height?: number;
	onHover?: (index: number | null) => void;
}

export const Sparkline = React.memo(function Sparkline({
	series,
	width = 240,
	height = 48,
	onHover,
}: SparklineProps) {
	const gradient_id = useId();
	const path = useMemo(() => {
		const pts = series.points;
		if (pts.length < 2) return "";
		const xs = pts.map((p) => p.t);
		const ys = pts.map((p) => Number(p.v));
		const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
		const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
		const sx = (t: number) => ((t - x0) / (x1 - x0 || 1)) * width;
		const sy = (v: number) => height - ((v - y0) / (y1 - y0 || 1)) * height;
		return pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.t).toFixed(2)},${sy(Number(p.v)).toFixed(2)}`).join(" ");
	}, [series.points, width, height]);

	return (
		<svg
			role="img"
			aria-label={`${series.label} sparkline`}
			viewBox={`0 0 ${width} ${height}`}
			width={width}
			height={height}
			onPointerLeave={() => onHover?.(null)}
		>
			<defs>
				<linearGradient id={gradient_id} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0.35} />
					<stop offset="100%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0} />
				</linearGradient>
			</defs>
			{path && <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#${gradient_id})`} />}
			<path d={path} fill="none" stroke={series.colour ?? "#4f46e5"} strokeWidth={1.5} />
		</svg>
	);
});

function format_value(v: number, unit: Series["unit"]): string {
	switch (unit) {
		case "bytes": {
			const units = ["B", "KB", "MB", "GB"] as const;
			let n = v;
			let i = 0;
			while (n >= 1024 && i < units.length - 1) {
				n /= 1024;
				i++;
			}
			return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
		}
		case "%":
			return `${(v * 100).toFixed(1)}%`;
		case "ms":
			return v < 1 ? `${(v * 1000).toFixed(0)}µs` : `${v.toFixed(1)}ms`;
		default:
			return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
	}
}

export function MetricCard({ series }: { series: Series }): ReactNode {
	const { state, dispatch } = useDashboard();
	const selected = state.selected.has(series.id);
	const latest = series.points.at(-1);
	const previous = series.points.at(-2);
	const delta =
		latest && previous ? (Number(latest.v) - Number(previous.v)) / (Number(previous.v) || 1) : 0;

	const toggle = useCallback(
		() => dispatch({ type: "series/toggle", id: series.id }),
		[dispatch, series.id],
	);

	return (
		<button
			type="button"
			className={["metric-card", selected && "metric-card--selected"].filter(Boolean).join(" ")}
			aria-pressed={selected}
			onClick={toggle}
		>
			<header>
				<h3>{series.label}</h3>
				<span data-trend={delta > 0 ? "up" : delta < 0 ? "down" : "flat"}>
					{delta >= 0 ? "+" : ""}
					{(delta * 100).toFixed(1)}%
				</span>
			</header>
			<p className="metric-card__value">
				{latest ? format_value(Number(latest.v), series.unit) : <>&mdash;</>}
			</p>
			<Sparkline series={series} />
		</button>
	);
}

export function Dashboard({ endpoint }: { endpoint: string }) {
	const { state, dispatch } = useDashboard();
	const abort_ref = useRef<AbortController | null>(null);
	const compact = useMediaQuery("(max-width: 640px)");
	const [query, set_query] = useState("");

	useEffect(() => {
		abort_ref.current?.abort();
		const controller = new AbortController();
		abort_ref.current = controller;

		dispatch({ type: "fetch/start" });
		const [start, end] = state.range;
		fetch(`${endpoint}?start=${start}&end=${end}`, { signal: controller.signal })
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
				return (await res.json()) as Series[];
			})
			.then((payload) => dispatch({ type: "fetch/success", payload }))
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") return;
				dispatch({ type: "fetch/failure", error: error as Error });
			});

		return () => controller.abort();
	}, [dispatch, endpoint, state.range]);

	const visible = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return Object.values(state.series).filter(
			(s) => !needle || s.label.toLowerCase().includes(needle),
		);
	}, [state.series, query]);

	if (state.status === "error") {
		return (
			<div role="alert" className="dashboard__error">
				<p>Could not load metrics: {state.error?.message ?? "unknown error"}</p>
				<button onClick={() => dispatch({ type: "range/set", range: state.range })}>Retry</button>
			</div>
		);
	}

	return (
		<section className="dashboard" data-compact={compact || undefined}>
			<label>
				Filter
				<input value={query} onChange={(e) => set_query(e.currentTarget.value)} placeholder="latency…" />
			</label>
			{state.status === "loading" && <progress aria-label="loading metrics" />}
			<div className="dashboard__grid">
				{visible.map((s) => (
					<MetricCard key={s.id} series={s} />
				))}
				{visible.length === 0 && state.status === "ready" && <p>No series match “{query}”.</p>}
			</div>
		</section>
	);
}


// ---- unit 16 ----
// interactive greeter demo.
import { useState } from "react";

type Props = { name: string; count?: number };

export class Store<T> {
  items: T[] = [];
  add(item: T) { this.items.push(item); }
}

export function Greeter({ name, count = 1 }: Props) {
  const [clicks, setClicks] = useState<number>(0);
  const banner = `hello, ${name}`;
  return (
    <section className="root" data-count={count}>
      <h1>{banner}!</h1>
      <button onClick={() => setClicks((c) => c + 1)}>
        clicked {clicks} &times;
      </button>
    </section>
  );
}


// ---- unit 17 ----
// ---- attributes.txt ----
const el = <input
  value="hello"
  placeholder='search'
  disabled
  data-testid="input-1"
  aria-label="search field"
  {...rest}
  onChange={handler}
/>;


// ---- basic_element.txt ----
const el = <div>hello</div>;


// ---- conditional.txt ----
const view = (show: boolean, items: string[]) => {
  return (
    <div>
      {show && <Badge count={items.length} />}
      {items.length > 0 ? (
        <ul>
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <em>empty</em>
      )}
      {/* fallback block */}
    </div>
  );
};


// ---- entity.txt ----
const msg = <p>Hello &amp; Goodbye &mdash; &#9733; &#x2605;</p>;
const q = <p>Smart &ldquo;quotes&rdquo;</p>;


// ---- expression_container.txt ----
const el = <div className={classes.root} style={{ color: "red", padding: 4 }}>
  {count} item{count !== 1 ? "s" : ""}
</div>;


// ---- fragment.txt ----
const list = <>
  <li>one</li>
  <li>two</li>
</>;


// ---- generic_arrow.txt ----
const id = <T,>(x: T): T => x;
const other = <T extends unknown>(x: T): T => x;
const pair = <T, U>(a: T, b: U): [T, U] => [a, b];


// ---- generics_call.txt ----
const state = useState<string>("");
const arr = new Array<number>(5);
const result = fn<A, B>(a, b);
type Alias<T> = Promise<T>;
interface Box<T extends object> {
  value: T;
}


// ---- jsx_in_template.txt ----
const msg = `Result: ${<span>value</span>}`;
const multi = `${<b>bold</b>} and ${<i>italic</i>}`;


// ---- less_than.txt ----
const a = 1 < 2;
const b = x < y && y > z;
const c = compare<string>(a, b);
const d = Array<number>();
const e = arr.length < 10 ? "short" : "long";


// ---- member_tag.txt ----
const el = <React.Fragment>
  <Motion.div initial={{ opacity: 0 }} />
</React.Fragment>;


// ---- namespaced.txt ----
const icon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <use xlink:href="#icon-home" />
</svg>;


// ---- nested.txt ----
const page = <div>
  <header>
    <h1>Title</h1>
  </header>
  <main>
    <p>paragraph</p>
  </main>
</div>;


// ---- return_jsx.txt ----
function Greeting(name: string) {
  return <h1>Hello, {name}!</h1>;
}

const arrow = (name: string) => <p>{name}</p>;

const maybeShow = (show: boolean) =>
  show ? <div>visible</div> : null;


// ---- self_closing.txt ----
const br = <br />;
const img = <img src="logo.png" alt="Logo" />;


// ---- ts_compat.txt ----
interface User {
  id: number;
  name: string;
}

enum Color {
  Red = "red",
  Green = "green",
  Blue = "blue",
}

class Service {
  private readonly client: string;
  constructor(client: string) {
    this.client = client;
  }
  async fetch(): Promise<User[]> {
    return [];
  }
}

const x = 1 < 2 && 3 > 2;
const y: number = 5;


// ---- ts_in_jsx.txt ----
type Props = { count: number; label: string };

const Panel: React.FC<Props> = ({ count, label }) => {
  const [q, setQ] = useState<string>("");
  return (
    <section>
      <h2>{label}</h2>
      <p>Count: {count as number}</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
    </section>
  );
};


// ---- unit 18 ----
import * as React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
	type Dispatch,
	type PropsWithChildren,
	type ReactNode,
} from "react";

export type Status = "idle" | "loading" | "ready" | "error";

export interface Series<T extends number | string = number> {
	readonly id: string;
	readonly label: string;
	readonly points: ReadonlyArray<{ t: number; v: T }>;
	readonly unit?: "ms" | "req/s" | "%" | "bytes";
	readonly colour?: `#${string}`;
}

interface DashboardState {
	status: Status;
	range: [start: number, end: number];
	series: Record<string, Series>;
	selected: Set<string>;
	error?: Error;
}

type Action =
	| { type: "fetch/start" }
	| { type: "fetch/success"; payload: Series[] }
	| { type: "fetch/failure"; error: Error }
	| { type: "range/set"; range: [number, number] }
	| { type: "series/toggle"; id: string };

const initial_state: DashboardState = {
	status: "idle",
	range: [Date.now() - 86_400_000, Date.now()],
	series: {},
	selected: new Set<string>(),
};

function reducer(state: DashboardState, action: Action): DashboardState {
	switch (action.type) {
		case "fetch/start":
			return { ...state, status: "loading", error: undefined };
		case "fetch/success": {
			const series = Object.fromEntries(action.payload.map((s) => [s.id, s] as const));
			return { ...state, status: "ready", series };
		}
		case "fetch/failure":
			return { ...state, status: "error", error: action.error };
		case "range/set":
			return { ...state, range: action.range };
		case "series/toggle": {
			const selected = new Set(state.selected);
			selected.has(action.id) ? selected.delete(action.id) : selected.add(action.id);
			return { ...state, selected };
		}
		default: {
			const _exhaustive: never = action;
			return state;
		}
	}
}

const DashboardContext = createContext<
	{ state: DashboardState; dispatch: Dispatch<Action> } | undefined
>(undefined);

export function useDashboard() {
	const ctx = useContext(DashboardContext);
	if (!ctx) throw new Error("useDashboard must be used inside <DashboardProvider>");
	return ctx;
}

export function DashboardProvider({ children }: PropsWithChildren): React.JSX.Element {
	const [state, dispatch] = useReducer(reducer, initial_state);
	const value = useMemo(() => ({ state, dispatch }), [state]);
	return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

function subscribe_to_media(query: string) {
	return (on_change: () => void) => {
		const mql = window.matchMedia(query);
		mql.addEventListener("change", on_change);
		return () => mql.removeEventListener("change", on_change);
	};
}

export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		useMemo(() => subscribe_to_media(query), [query]),
		() => window.matchMedia(query).matches,
		() => false,
	);
}

interface SparklineProps {
	series: Series;
	width?: number;
	height?: number;
	onHover?: (index: number | null) => void;
}

export const Sparkline = React.memo(function Sparkline({
	series,
	width = 240,
	height = 48,
	onHover,
}: SparklineProps) {
	const gradient_id = useId();
	const path = useMemo(() => {
		const pts = series.points;
		if (pts.length < 2) return "";
		const xs = pts.map((p) => p.t);
		const ys = pts.map((p) => Number(p.v));
		const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
		const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
		const sx = (t: number) => ((t - x0) / (x1 - x0 || 1)) * width;
		const sy = (v: number) => height - ((v - y0) / (y1 - y0 || 1)) * height;
		return pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.t).toFixed(2)},${sy(Number(p.v)).toFixed(2)}`).join(" ");
	}, [series.points, width, height]);

	return (
		<svg
			role="img"
			aria-label={`${series.label} sparkline`}
			viewBox={`0 0 ${width} ${height}`}
			width={width}
			height={height}
			onPointerLeave={() => onHover?.(null)}
		>
			<defs>
				<linearGradient id={gradient_id} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0.35} />
					<stop offset="100%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0} />
				</linearGradient>
			</defs>
			{path && <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#${gradient_id})`} />}
			<path d={path} fill="none" stroke={series.colour ?? "#4f46e5"} strokeWidth={1.5} />
		</svg>
	);
});

function format_value(v: number, unit: Series["unit"]): string {
	switch (unit) {
		case "bytes": {
			const units = ["B", "KB", "MB", "GB"] as const;
			let n = v;
			let i = 0;
			while (n >= 1024 && i < units.length - 1) {
				n /= 1024;
				i++;
			}
			return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
		}
		case "%":
			return `${(v * 100).toFixed(1)}%`;
		case "ms":
			return v < 1 ? `${(v * 1000).toFixed(0)}µs` : `${v.toFixed(1)}ms`;
		default:
			return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
	}
}

export function MetricCard({ series }: { series: Series }): ReactNode {
	const { state, dispatch } = useDashboard();
	const selected = state.selected.has(series.id);
	const latest = series.points.at(-1);
	const previous = series.points.at(-2);
	const delta =
		latest && previous ? (Number(latest.v) - Number(previous.v)) / (Number(previous.v) || 1) : 0;

	const toggle = useCallback(
		() => dispatch({ type: "series/toggle", id: series.id }),
		[dispatch, series.id],
	);

	return (
		<button
			type="button"
			className={["metric-card", selected && "metric-card--selected"].filter(Boolean).join(" ")}
			aria-pressed={selected}
			onClick={toggle}
		>
			<header>
				<h3>{series.label}</h3>
				<span data-trend={delta > 0 ? "up" : delta < 0 ? "down" : "flat"}>
					{delta >= 0 ? "+" : ""}
					{(delta * 100).toFixed(1)}%
				</span>
			</header>
			<p className="metric-card__value">
				{latest ? format_value(Number(latest.v), series.unit) : <>&mdash;</>}
			</p>
			<Sparkline series={series} />
		</button>
	);
}

export function Dashboard({ endpoint }: { endpoint: string }) {
	const { state, dispatch } = useDashboard();
	const abort_ref = useRef<AbortController | null>(null);
	const compact = useMediaQuery("(max-width: 640px)");
	const [query, set_query] = useState("");

	useEffect(() => {
		abort_ref.current?.abort();
		const controller = new AbortController();
		abort_ref.current = controller;

		dispatch({ type: "fetch/start" });
		const [start, end] = state.range;
		fetch(`${endpoint}?start=${start}&end=${end}`, { signal: controller.signal })
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
				return (await res.json()) as Series[];
			})
			.then((payload) => dispatch({ type: "fetch/success", payload }))
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") return;
				dispatch({ type: "fetch/failure", error: error as Error });
			});

		return () => controller.abort();
	}, [dispatch, endpoint, state.range]);

	const visible = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return Object.values(state.series).filter(
			(s) => !needle || s.label.toLowerCase().includes(needle),
		);
	}, [state.series, query]);

	if (state.status === "error") {
		return (
			<div role="alert" className="dashboard__error">
				<p>Could not load metrics: {state.error?.message ?? "unknown error"}</p>
				<button onClick={() => dispatch({ type: "range/set", range: state.range })}>Retry</button>
			</div>
		);
	}

	return (
		<section className="dashboard" data-compact={compact || undefined}>
			<label>
				Filter
				<input value={query} onChange={(e) => set_query(e.currentTarget.value)} placeholder="latency…" />
			</label>
			{state.status === "loading" && <progress aria-label="loading metrics" />}
			<div className="dashboard__grid">
				{visible.map((s) => (
					<MetricCard key={s.id} series={s} />
				))}
				{visible.length === 0 && state.status === "ready" && <p>No series match “{query}”.</p>}
			</div>
		</section>
	);
}


// ---- unit 19 ----
// interactive greeter demo.
import { useState } from "react";

type Props = { name: string; count?: number };

export class Store<T> {
  items: T[] = [];
  add(item: T) { this.items.push(item); }
}

export function Greeter({ name, count = 1 }: Props) {
  const [clicks, setClicks] = useState<number>(0);
  const banner = `hello, ${name}`;
  return (
    <section className="root" data-count={count}>
      <h1>{banner}!</h1>
      <button onClick={() => setClicks((c) => c + 1)}>
        clicked {clicks} &times;
      </button>
    </section>
  );
}


// ---- unit 20 ----
// ---- attributes.txt ----
const el = <input
  value="hello"
  placeholder='search'
  disabled
  data-testid="input-1"
  aria-label="search field"
  {...rest}
  onChange={handler}
/>;


// ---- basic_element.txt ----
const el = <div>hello</div>;


// ---- conditional.txt ----
const view = (show: boolean, items: string[]) => {
  return (
    <div>
      {show && <Badge count={items.length} />}
      {items.length > 0 ? (
        <ul>
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <em>empty</em>
      )}
      {/* fallback block */}
    </div>
  );
};


// ---- entity.txt ----
const msg = <p>Hello &amp; Goodbye &mdash; &#9733; &#x2605;</p>;
const q = <p>Smart &ldquo;quotes&rdquo;</p>;


// ---- expression_container.txt ----
const el = <div className={classes.root} style={{ color: "red", padding: 4 }}>
  {count} item{count !== 1 ? "s" : ""}
</div>;


// ---- fragment.txt ----
const list = <>
  <li>one</li>
  <li>two</li>
</>;


// ---- generic_arrow.txt ----
const id = <T,>(x: T): T => x;
const other = <T extends unknown>(x: T): T => x;
const pair = <T, U>(a: T, b: U): [T, U] => [a, b];


// ---- generics_call.txt ----
const state = useState<string>("");
const arr = new Array<number>(5);
const result = fn<A, B>(a, b);
type Alias<T> = Promise<T>;
interface Box<T extends object> {
  value: T;
}


// ---- jsx_in_template.txt ----
const msg = `Result: ${<span>value</span>}`;
const multi = `${<b>bold</b>} and ${<i>italic</i>}`;


// ---- less_than.txt ----
const a = 1 < 2;
const b = x < y && y > z;
const c = compare<string>(a, b);
const d = Array<number>();
const e = arr.length < 10 ? "short" : "long";


// ---- member_tag.txt ----
const el = <React.Fragment>
  <Motion.div initial={{ opacity: 0 }} />
</React.Fragment>;


// ---- namespaced.txt ----
const icon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <use xlink:href="#icon-home" />
</svg>;


// ---- nested.txt ----
const page = <div>
  <header>
    <h1>Title</h1>
  </header>
  <main>
    <p>paragraph</p>
  </main>
</div>;


// ---- return_jsx.txt ----
function Greeting(name: string) {
  return <h1>Hello, {name}!</h1>;
}

const arrow = (name: string) => <p>{name}</p>;

const maybeShow = (show: boolean) =>
  show ? <div>visible</div> : null;


// ---- self_closing.txt ----
const br = <br />;
const img = <img src="logo.png" alt="Logo" />;


// ---- ts_compat.txt ----
interface User {
  id: number;
  name: string;
}

enum Color {
  Red = "red",
  Green = "green",
  Blue = "blue",
}

class Service {
  private readonly client: string;
  constructor(client: string) {
    this.client = client;
  }
  async fetch(): Promise<User[]> {
    return [];
  }
}

const x = 1 < 2 && 3 > 2;
const y: number = 5;


// ---- ts_in_jsx.txt ----
type Props = { count: number; label: string };

const Panel: React.FC<Props> = ({ count, label }) => {
  const [q, setQ] = useState<string>("");
  return (
    <section>
      <h2>{label}</h2>
      <p>Count: {count as number}</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
    </section>
  );
};


// ---- unit 21 ----
import * as React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
	type Dispatch,
	type PropsWithChildren,
	type ReactNode,
} from "react";

export type Status = "idle" | "loading" | "ready" | "error";

export interface Series<T extends number | string = number> {
	readonly id: string;
	readonly label: string;
	readonly points: ReadonlyArray<{ t: number; v: T }>;
	readonly unit?: "ms" | "req/s" | "%" | "bytes";
	readonly colour?: `#${string}`;
}

interface DashboardState {
	status: Status;
	range: [start: number, end: number];
	series: Record<string, Series>;
	selected: Set<string>;
	error?: Error;
}

type Action =
	| { type: "fetch/start" }
	| { type: "fetch/success"; payload: Series[] }
	| { type: "fetch/failure"; error: Error }
	| { type: "range/set"; range: [number, number] }
	| { type: "series/toggle"; id: string };

const initial_state: DashboardState = {
	status: "idle",
	range: [Date.now() - 86_400_000, Date.now()],
	series: {},
	selected: new Set<string>(),
};

function reducer(state: DashboardState, action: Action): DashboardState {
	switch (action.type) {
		case "fetch/start":
			return { ...state, status: "loading", error: undefined };
		case "fetch/success": {
			const series = Object.fromEntries(action.payload.map((s) => [s.id, s] as const));
			return { ...state, status: "ready", series };
		}
		case "fetch/failure":
			return { ...state, status: "error", error: action.error };
		case "range/set":
			return { ...state, range: action.range };
		case "series/toggle": {
			const selected = new Set(state.selected);
			selected.has(action.id) ? selected.delete(action.id) : selected.add(action.id);
			return { ...state, selected };
		}
		default: {
			const _exhaustive: never = action;
			return state;
		}
	}
}

const DashboardContext = createContext<
	{ state: DashboardState; dispatch: Dispatch<Action> } | undefined
>(undefined);

export function useDashboard() {
	const ctx = useContext(DashboardContext);
	if (!ctx) throw new Error("useDashboard must be used inside <DashboardProvider>");
	return ctx;
}

export function DashboardProvider({ children }: PropsWithChildren): React.JSX.Element {
	const [state, dispatch] = useReducer(reducer, initial_state);
	const value = useMemo(() => ({ state, dispatch }), [state]);
	return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

function subscribe_to_media(query: string) {
	return (on_change: () => void) => {
		const mql = window.matchMedia(query);
		mql.addEventListener("change", on_change);
		return () => mql.removeEventListener("change", on_change);
	};
}

export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		useMemo(() => subscribe_to_media(query), [query]),
		() => window.matchMedia(query).matches,
		() => false,
	);
}

interface SparklineProps {
	series: Series;
	width?: number;
	height?: number;
	onHover?: (index: number | null) => void;
}

export const Sparkline = React.memo(function Sparkline({
	series,
	width = 240,
	height = 48,
	onHover,
}: SparklineProps) {
	const gradient_id = useId();
	const path = useMemo(() => {
		const pts = series.points;
		if (pts.length < 2) return "";
		const xs = pts.map((p) => p.t);
		const ys = pts.map((p) => Number(p.v));
		const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
		const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
		const sx = (t: number) => ((t - x0) / (x1 - x0 || 1)) * width;
		const sy = (v: number) => height - ((v - y0) / (y1 - y0 || 1)) * height;
		return pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.t).toFixed(2)},${sy(Number(p.v)).toFixed(2)}`).join(" ");
	}, [series.points, width, height]);

	return (
		<svg
			role="img"
			aria-label={`${series.label} sparkline`}
			viewBox={`0 0 ${width} ${height}`}
			width={width}
			height={height}
			onPointerLeave={() => onHover?.(null)}
		>
			<defs>
				<linearGradient id={gradient_id} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0.35} />
					<stop offset="100%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0} />
				</linearGradient>
			</defs>
			{path && <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#${gradient_id})`} />}
			<path d={path} fill="none" stroke={series.colour ?? "#4f46e5"} strokeWidth={1.5} />
		</svg>
	);
});

function format_value(v: number, unit: Series["unit"]): string {
	switch (unit) {
		case "bytes": {
			const units = ["B", "KB", "MB", "GB"] as const;
			let n = v;
			let i = 0;
			while (n >= 1024 && i < units.length - 1) {
				n /= 1024;
				i++;
			}
			return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
		}
		case "%":
			return `${(v * 100).toFixed(1)}%`;
		case "ms":
			return v < 1 ? `${(v * 1000).toFixed(0)}µs` : `${v.toFixed(1)}ms`;
		default:
			return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
	}
}

export function MetricCard({ series }: { series: Series }): ReactNode {
	const { state, dispatch } = useDashboard();
	const selected = state.selected.has(series.id);
	const latest = series.points.at(-1);
	const previous = series.points.at(-2);
	const delta =
		latest && previous ? (Number(latest.v) - Number(previous.v)) / (Number(previous.v) || 1) : 0;

	const toggle = useCallback(
		() => dispatch({ type: "series/toggle", id: series.id }),
		[dispatch, series.id],
	);

	return (
		<button
			type="button"
			className={["metric-card", selected && "metric-card--selected"].filter(Boolean).join(" ")}
			aria-pressed={selected}
			onClick={toggle}
		>
			<header>
				<h3>{series.label}</h3>
				<span data-trend={delta > 0 ? "up" : delta < 0 ? "down" : "flat"}>
					{delta >= 0 ? "+" : ""}
					{(delta * 100).toFixed(1)}%
				</span>
			</header>
			<p className="metric-card__value">
				{latest ? format_value(Number(latest.v), series.unit) : <>&mdash;</>}
			</p>
			<Sparkline series={series} />
		</button>
	);
}

export function Dashboard({ endpoint }: { endpoint: string }) {
	const { state, dispatch } = useDashboard();
	const abort_ref = useRef<AbortController | null>(null);
	const compact = useMediaQuery("(max-width: 640px)");
	const [query, set_query] = useState("");

	useEffect(() => {
		abort_ref.current?.abort();
		const controller = new AbortController();
		abort_ref.current = controller;

		dispatch({ type: "fetch/start" });
		const [start, end] = state.range;
		fetch(`${endpoint}?start=${start}&end=${end}`, { signal: controller.signal })
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
				return (await res.json()) as Series[];
			})
			.then((payload) => dispatch({ type: "fetch/success", payload }))
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") return;
				dispatch({ type: "fetch/failure", error: error as Error });
			});

		return () => controller.abort();
	}, [dispatch, endpoint, state.range]);

	const visible = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return Object.values(state.series).filter(
			(s) => !needle || s.label.toLowerCase().includes(needle),
		);
	}, [state.series, query]);

	if (state.status === "error") {
		return (
			<div role="alert" className="dashboard__error">
				<p>Could not load metrics: {state.error?.message ?? "unknown error"}</p>
				<button onClick={() => dispatch({ type: "range/set", range: state.range })}>Retry</button>
			</div>
		);
	}

	return (
		<section className="dashboard" data-compact={compact || undefined}>
			<label>
				Filter
				<input value={query} onChange={(e) => set_query(e.currentTarget.value)} placeholder="latency…" />
			</label>
			{state.status === "loading" && <progress aria-label="loading metrics" />}
			<div className="dashboard__grid">
				{visible.map((s) => (
					<MetricCard key={s.id} series={s} />
				))}
				{visible.length === 0 && state.status === "ready" && <p>No series match “{query}”.</p>}
			</div>
		</section>
	);
}


// ---- unit 22 ----
// interactive greeter demo.
import { useState } from "react";

type Props = { name: string; count?: number };

export class Store<T> {
  items: T[] = [];
  add(item: T) { this.items.push(item); }
}

export function Greeter({ name, count = 1 }: Props) {
  const [clicks, setClicks] = useState<number>(0);
  const banner = `hello, ${name}`;
  return (
    <section className="root" data-count={count}>
      <h1>{banner}!</h1>
      <button onClick={() => setClicks((c) => c + 1)}>
        clicked {clicks} &times;
      </button>
    </section>
  );
}


// ---- unit 23 ----
// ---- attributes.txt ----
const el = <input
  value="hello"
  placeholder='search'
  disabled
  data-testid="input-1"
  aria-label="search field"
  {...rest}
  onChange={handler}
/>;


// ---- basic_element.txt ----
const el = <div>hello</div>;


// ---- conditional.txt ----
const view = (show: boolean, items: string[]) => {
  return (
    <div>
      {show && <Badge count={items.length} />}
      {items.length > 0 ? (
        <ul>
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <em>empty</em>
      )}
      {/* fallback block */}
    </div>
  );
};


// ---- entity.txt ----
const msg = <p>Hello &amp; Goodbye &mdash; &#9733; &#x2605;</p>;
const q = <p>Smart &ldquo;quotes&rdquo;</p>;


// ---- expression_container.txt ----
const el = <div className={classes.root} style={{ color: "red", padding: 4 }}>
  {count} item{count !== 1 ? "s" : ""}
</div>;


// ---- fragment.txt ----
const list = <>
  <li>one</li>
  <li>two</li>
</>;


// ---- generic_arrow.txt ----
const id = <T,>(x: T): T => x;
const other = <T extends unknown>(x: T): T => x;
const pair = <T, U>(a: T, b: U): [T, U] => [a, b];


// ---- generics_call.txt ----
const state = useState<string>("");
const arr = new Array<number>(5);
const result = fn<A, B>(a, b);
type Alias<T> = Promise<T>;
interface Box<T extends object> {
  value: T;
}


// ---- jsx_in_template.txt ----
const msg = `Result: ${<span>value</span>}`;
const multi = `${<b>bold</b>} and ${<i>italic</i>}`;


// ---- less_than.txt ----
const a = 1 < 2;
const b = x < y && y > z;
const c = compare<string>(a, b);
const d = Array<number>();
const e = arr.length < 10 ? "short" : "long";


// ---- member_tag.txt ----
const el = <React.Fragment>
  <Motion.div initial={{ opacity: 0 }} />
</React.Fragment>;


// ---- namespaced.txt ----
const icon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <use xlink:href="#icon-home" />
</svg>;


// ---- nested.txt ----
const page = <div>
  <header>
    <h1>Title</h1>
  </header>
  <main>
    <p>paragraph</p>
  </main>
</div>;


// ---- return_jsx.txt ----
function Greeting(name: string) {
  return <h1>Hello, {name}!</h1>;
}

const arrow = (name: string) => <p>{name}</p>;

const maybeShow = (show: boolean) =>
  show ? <div>visible</div> : null;


// ---- self_closing.txt ----
const br = <br />;
const img = <img src="logo.png" alt="Logo" />;


// ---- ts_compat.txt ----
interface User {
  id: number;
  name: string;
}

enum Color {
  Red = "red",
  Green = "green",
  Blue = "blue",
}

class Service {
  private readonly client: string;
  constructor(client: string) {
    this.client = client;
  }
  async fetch(): Promise<User[]> {
    return [];
  }
}

const x = 1 < 2 && 3 > 2;
const y: number = 5;


// ---- ts_in_jsx.txt ----
type Props = { count: number; label: string };

const Panel: React.FC<Props> = ({ count, label }) => {
  const [q, setQ] = useState<string>("");
  return (
    <section>
      <h2>{label}</h2>
      <p>Count: {count as number}</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
    </section>
  );
};


// ---- unit 24 ----
import * as React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
	type Dispatch,
	type PropsWithChildren,
	type ReactNode,
} from "react";

export type Status = "idle" | "loading" | "ready" | "error";

export interface Series<T extends number | string = number> {
	readonly id: string;
	readonly label: string;
	readonly points: ReadonlyArray<{ t: number; v: T }>;
	readonly unit?: "ms" | "req/s" | "%" | "bytes";
	readonly colour?: `#${string}`;
}

interface DashboardState {
	status: Status;
	range: [start: number, end: number];
	series: Record<string, Series>;
	selected: Set<string>;
	error?: Error;
}

type Action =
	| { type: "fetch/start" }
	| { type: "fetch/success"; payload: Series[] }
	| { type: "fetch/failure"; error: Error }
	| { type: "range/set"; range: [number, number] }
	| { type: "series/toggle"; id: string };

const initial_state: DashboardState = {
	status: "idle",
	range: [Date.now() - 86_400_000, Date.now()],
	series: {},
	selected: new Set<string>(),
};

function reducer(state: DashboardState, action: Action): DashboardState {
	switch (action.type) {
		case "fetch/start":
			return { ...state, status: "loading", error: undefined };
		case "fetch/success": {
			const series = Object.fromEntries(action.payload.map((s) => [s.id, s] as const));
			return { ...state, status: "ready", series };
		}
		case "fetch/failure":
			return { ...state, status: "error", error: action.error };
		case "range/set":
			return { ...state, range: action.range };
		case "series/toggle": {
			const selected = new Set(state.selected);
			selected.has(action.id) ? selected.delete(action.id) : selected.add(action.id);
			return { ...state, selected };
		}
		default: {
			const _exhaustive: never = action;
			return state;
		}
	}
}

const DashboardContext = createContext<
	{ state: DashboardState; dispatch: Dispatch<Action> } | undefined
>(undefined);

export function useDashboard() {
	const ctx = useContext(DashboardContext);
	if (!ctx) throw new Error("useDashboard must be used inside <DashboardProvider>");
	return ctx;
}

export function DashboardProvider({ children }: PropsWithChildren): React.JSX.Element {
	const [state, dispatch] = useReducer(reducer, initial_state);
	const value = useMemo(() => ({ state, dispatch }), [state]);
	return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

function subscribe_to_media(query: string) {
	return (on_change: () => void) => {
		const mql = window.matchMedia(query);
		mql.addEventListener("change", on_change);
		return () => mql.removeEventListener("change", on_change);
	};
}

export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		useMemo(() => subscribe_to_media(query), [query]),
		() => window.matchMedia(query).matches,
		() => false,
	);
}

interface SparklineProps {
	series: Series;
	width?: number;
	height?: number;
	onHover?: (index: number | null) => void;
}

export const Sparkline = React.memo(function Sparkline({
	series,
	width = 240,
	height = 48,
	onHover,
}: SparklineProps) {
	const gradient_id = useId();
	const path = useMemo(() => {
		const pts = series.points;
		if (pts.length < 2) return "";
		const xs = pts.map((p) => p.t);
		const ys = pts.map((p) => Number(p.v));
		const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
		const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
		const sx = (t: number) => ((t - x0) / (x1 - x0 || 1)) * width;
		const sy = (v: number) => height - ((v - y0) / (y1 - y0 || 1)) * height;
		return pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.t).toFixed(2)},${sy(Number(p.v)).toFixed(2)}`).join(" ");
	}, [series.points, width, height]);

	return (
		<svg
			role="img"
			aria-label={`${series.label} sparkline`}
			viewBox={`0 0 ${width} ${height}`}
			width={width}
			height={height}
			onPointerLeave={() => onHover?.(null)}
		>
			<defs>
				<linearGradient id={gradient_id} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0.35} />
					<stop offset="100%" stopColor={series.colour ?? "#4f46e5"} stopOpacity={0} />
				</linearGradient>
			</defs>
			{path && <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#${gradient_id})`} />}
			<path d={path} fill="none" stroke={series.colour ?? "#4f46e5"} strokeWidth={1.5} />
		</svg>
	);
});

function format_value(v: number, unit: Series["unit"]): string {
	switch (unit) {
		case "bytes": {
			const units = ["B", "KB", "MB", "GB"] as const;
			let n = v;
			let i = 0;
			while (n >= 1024 && i < units.length - 1) {
				n /= 1024;
				i++;
			}
			return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
		}
		case "%":
			return `${(v * 100).toFixed(1)}%`;
		case "ms":
			return v < 1 ? `${(v * 1000).toFixed(0)}µs` : `${v.toFixed(1)}ms`;
		default:
			return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
	}
}

export function MetricCard({ series }: { series: Series }): ReactNode {
	const { state, dispatch } = useDashboard();
	const selected = state.selected.has(series.id);
	const latest = series.points.at(-1);
	const previous = series.points.at(-2);
	const delta =
		latest && previous ? (Number(latest.v) - Number(previous.v)) / (Number(previous.v) || 1) : 0;

	const toggle = useCallback(
		() => dispatch({ type: "series/toggle", id: series.id }),
		[dispatch, series.id],
	);

	return (
		<button
			type="button"
			className={["metric-card", selected && "metric-card--selected"].filter(Boolean).join(" ")}
			aria-pressed={selected}
			onClick={toggle}
		>
			<header>
				<h3>{series.label}</h3>
				<span data-trend={delta > 0 ? "up" : delta < 0 ? "down" : "flat"}>
					{delta >= 0 ? "+" : ""}
					{(delta * 100).toFixed(1)}%
				</span>
			</header>
			<p className="metric-card__value">
				{latest ? format_value(Number(latest.v), series.unit) : <>&mdash;</>}
			</p>
			<Sparkline series={series} />
		</button>
	);
}

export function Dashboard({ endpoint }: { endpoint: string }) {
	const { state, dispatch } = useDashboard();
	const abort_ref = useRef<AbortController | null>(null);
	const compact = useMediaQuery("(max-width: 640px)");
	const [query, set_query] = useState("");

	useEffect(() => {
		abort_ref.current?.abort();
		const controller = new AbortController();
		abort_ref.current = controller;

		dispatch({ type: "fetch/start" });
		const [start, end] = state.range;
		fetch(`${endpoint}?start=${start}&end=${end}`, { signal: controller.signal })
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
				return (await res.json()) as Series[];
			})
			.then((payload) => dispatch({ type: "fetch/success", payload }))
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") return;
				dispatch({ type: "fetch/failure", error: error as Error });
			});

		return () => controller.abort();
	}, [dispatch, endpoint, state.range]);

	const visible = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return Object.values(state.series).filter(
			(s) => !needle || s.label.toLowerCase().includes(needle),
		);
	}, [state.series, query]);

	if (state.status === "error") {
		return (
			<div role="alert" className="dashboard__error">
				<p>Could not load metrics: {state.error?.message ?? "unknown error"}</p>
				<button onClick={() => dispatch({ type: "range/set", range: state.range })}>Retry</button>
			</div>
		);
	}

	return (
		<section className="dashboard" data-compact={compact || undefined}>
			<label>
				Filter
				<input value={query} onChange={(e) => set_query(e.currentTarget.value)} placeholder="latency…" />
			</label>
			{state.status === "loading" && <progress aria-label="loading metrics" />}
			<div className="dashboard__grid">
				{visible.map((s) => (
					<MetricCard key={s.id} series={s} />
				))}
				{visible.length === 0 && state.status === "ready" && <p>No series match “{query}”.</p>}
			</div>
		</section>
	);
}


// ---- unit 25 ----
// interactive greeter demo.
import { useState } from "react";

type Props = { name: string; count?: number };

export class Store<T> {
  items: T[] = [];
  add(item: T) { this.items.push(item); }
}

export function Greeter({ name, count = 1 }: Props) {
  const [clicks, setClicks] = useState<number>(0);
  const banner = `hello, ${name}`;
  return (
    <section className="root" data-count={count}>
      <h1>{banner}!</h1>
      <button onClick={() => setClicks((c) => c + 1)}>
        clicked {clicks} &times;
      </button>
    </section>
  );
}


// ---- unit 26 ----
// ---- attributes.txt ----
const el = <input
  value="hello"
  placeholder='search'
  disabled
  data-testid="input-1"
  aria-label="search field"
  {...rest}
  onChange={handler}
/>;


// ---- basic_element.txt ----
const el = <div>hello</div>;


// ---- conditional.txt ----
const view = (show: boolean, items: string[]) => {
  return (
    <div>
      {show && <Badge count={items.length} />}
      {items.length > 0 ? (
        <ul>
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <em>empty</em>
      )}
      {/* fallback block */}
    </div>
  );
};


// ---- entity.txt ----
const msg = <p>Hello &amp; Goodbye &mdash; &#9733; &#x2605;</p>;
const q = <p>Smart &ldquo;quotes&rdquo;</p>;


// ---- expression_container.txt ----
const el = <div className={classes.root} style={{ color: "red", padding: 4 }}>
  {count} item{count !== 1 ? "s" : ""}
</div>;


// ---- fragment.txt ----
const list = <>
  <li>one</li>
  <li>two</li>
</>;


// ---- generic_arrow.txt ----
const id = <T,>(x: T): T => x;
const other = <T extends unknown>(x: T): T => x;
const pair = <T, U>(a: T, b: U): [T, U] => [a, b];


// ---- generics_call.txt ----
const state = useState<string>("");
const arr = new Array<number>(5);
const result = fn<A, B>(a, b);
type Alias<T> = Promise<T>;
interface Box<T extends object> {
  value: T;
}


// ---- jsx_in_template.txt ----
const msg = `Result: ${<span>value</span>}`;
const multi = `${<b>bold</b>} and ${<i>italic</i>}`;


// ---- less_than.txt ----
const a = 1 < 2;
const b = x < y && y > z;
const c = compare<string>(a, b);
const d = Array<number>();
const e = arr.length < 10 ? "short" : "long";


// ---- member_tag.txt ----
const el = <React.Fragment>
  <Motion.div initial={{ opacity: 0 }} />
</React.Fragment>;


// ---- namespaced.txt ----
const icon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <use xlink:href="#icon-home" />
</svg>;


// ---- nested.txt ----
const page = <div>
  <header>
    <h1>Title</h1>
  </header>
  <main>
    <p>paragraph</p>
  </main>
</div>;


// ---- return_jsx.txt ----
function Greeting(name: string) {
  return <h1>Hello, {name}!</h1>;
}

const arrow = (name: string) => <p>{name}</p>;

const maybeShow = (show: boolean) =>
  show ? <div>visible</div> : null;


// ---- self_closing.txt ----
const br = <br />;
const img = <img src="logo.png" alt="Logo" />;


// ---- ts_compat.txt ----
interface User {
  id: number;
  name: string;
}

enum Color {
  Red = "red",
  Green = "green",
  Blue = "blue",
}

class Service {
  private readonly client: string;
  constructor(client: string) {
    this.client = client;
  }
  async fetch(): Promise<User[]> {
    return [];
  }
}

const x = 1 < 2 && 3 > 2;
const y: number = 5;


// ---- ts_in_jsx.txt ----
type Props = { count: number; label: string };

const Panel: React.FC<Props> = ({ count, label }) => {
  const [q, setQ] = useState<string>("");
  return (
    <section>
      <h2>{label}</h2>
      <p>Count: {count as number}</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
    </section>
  );
};
