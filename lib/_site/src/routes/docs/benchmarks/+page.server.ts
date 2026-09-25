import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// reads the published comparison run committed at lib/bench/published/, or,
// when that is absent, a comparison.json in lib/bench/results/ where
// compare.mjs writes when run locally.
//
// a committed run can go stale silently, so the page prints the commit it
// measured and how far the code has moved since, next to the numbers.

interface RawLibrary {
	id: string;
	ns_per_op: number;
	ops_per_sec: number;
	mb_per_sec: number;
	spread: number;
}

interface RawCell {
	corpus: "sized" | "upstream";
	lang: string;
	tier: "small" | "medium" | "large" | null;
	bytes: number;
	lines: number;
	mode: "tokenize" | "html";
	tokens: Record<string, number> | null;
	libraries: RawLibrary[];
}

interface RawComparison {
	meta: {
		generated_at: string;
		commit: string | null;
		node: string;
		platform: string;
		cpu: string;
		runner: string;
		anchor: { drift: number; stable: boolean };
		libraries: Array<{ id: string; label: string; version: string; note: string }>;
		upstream: { repo: string; commit: string } | null;
		excluded: Array<{ cell: string; library: string; reason: string }>;
	};
	results: RawCell[];
}

interface HistoryEntry {
	version: string | null;
	commit: string;
	commit_subject: string | null;
	generated_at: string;
	runner: string;
	cpu: string;
	node: string;
	corpus_hash: string;
	libraries: Record<string, string>;
	cells: Record<string, Record<string, number>>;
}

export type Mode = "tokenize" | "html";

// the three size tiers of our own corpus plus shiki's sample files, which
// the page presents as a fourth size next to them.
export type Size = "small" | "medium" | "large" | "upstream";

export interface Bar {
	id: string;
	label: string;
	ops_per_sec: number;
	ns_per_op: number;
	mb_per_sec: number;
	tokens: number | null;
	/** how many times slower than the fastest bar in this chart. 1 for the fastest. */
	ratio: number;
	/** max/min across rounds. well above 1 means the machine was busy. */
	spread: number;
}

export interface Chart {
	key: string;
	lang: string;
	size: Size;
	mode: Mode;
	bytes: number;
	lines: number;
	bars: Bar[];
}

export interface VersionChange {
	lang: string;
	tokenize: number | null;
	html: number | null;
}

// speedups are previous time over current time, above 1 is faster
export interface VersionStep {
	version: string | null;
	commit: string;
	subject: string | null;
	date: string;
	node: string;
	previous: { version: string | null; commit: string } | null;
	tokenize: number | null;
	html: number | null;
	/** speed relative to the first entry of this chain, 1 for that entry */
	index: { tokenize: number; html: number };
	/** the same ratio for libraries whose version did not change, the part of a move that is the machine */
	reference: number | null;
	languages: VersionChange[];
}

export interface ModeOption {
	id: Mode;
	label: string;
	description: string;
}

export interface SizeOption {
	id: Size;
	label: string;
	title: string;
	description: string;
}

const MODES: ModeOption[] = [
	{
		id: "tokenize",
		label: "tokenise",
		description: "Tokens only. No HTML rendering."
	},
	{
		id: "html",
		label: "tokenise + render",
		description:
			"End to end: source to styled HTML."
	}
];

const SIZES: SizeOption[] = [
	{
		id: "small",
		label: "sm",
		title: "small · ~1KB",
		description:
			"The docs snippet case."
	},
	{
		id: "medium",
		label: "md",
		title: "medium · ~10KB",
		description: "A typical source file."
	},
	{
		id: "large",
		label: "lg",
		title: "large · ~100KB",
		description: "A big vendored file. Throughput."
	},
	{
		id: "upstream",
		label: "shiki",
		title: "shiki's sample",
		description:
			"The sample file for this language from shikijs/textmate-grammars-themes."
	}
];

function build(raw: RawComparison) {
	const labels = new Map(raw.meta.libraries.map((l) => [l.id, l.label]));

	const charts: Chart[] = raw.results.map((cell) => {
		const size: Size = cell.corpus === "upstream" ? "upstream" : (cell.tier ?? "medium");
		const sorted = [...cell.libraries].sort((a, b) => a.ns_per_op - b.ns_per_op);
		const fastest = sorted[0]?.ns_per_op ?? 0;
		return {
			key: `${cell.lang}:${size}:${cell.mode}`,
			lang: cell.lang,
			size,
			mode: cell.mode,
			bytes: cell.bytes,
			lines: cell.lines,
			bars: sorted.map((l) => ({
				id: l.id,
				label: labels.get(l.id) ?? l.id,
				ops_per_sec: l.ops_per_sec,
				ns_per_op: l.ns_per_op,
				mb_per_sec: l.mb_per_sec,
				tokens: cell.tokens?.[l.id] ?? null,
				ratio: fastest > 0 ? l.ns_per_op / fastest : 1,
				spread: l.spread
			}))
		};
	});

	const languages = [...new Set(charts.map((c) => c.lang))].sort();

	return {
		meta: raw.meta,
		languages,
		modes: MODES,
		sizes: SIZES,
		charts
	};
}

function geomean(ratios: number[]): number | null {
	if (ratios.length === 0) return null;
	return Math.exp(ratios.reduce((sum, r) => sum + Math.log(r), 0) / ratios.length);
}

// a step only compares with the latest earlier entry on the same cpu and corpus
function version_steps(entries: HistoryEntry[]): VersionStep[] {
	const indexes = new Map<string, { tokenize: number; html: number }>();
	const steps = entries.map((entry, i) => {
		const previous = entries
			.slice(0, i)
			.reverse()
			.find((e) => e.cpu === entry.cpu && e.corpus_hash === entry.corpus_hash);

		const ratios = (mode: Mode, lang: string | null) => {
			if (!previous) return null;
			const out: number[] = [];
			for (const [key, row] of Object.entries(entry.cells)) {
				const [cell_lang, , cell_mode] = key.split(":");
				if (cell_mode !== mode || (lang !== null && cell_lang !== lang)) continue;
				const before = previous.cells[key]?.twinkleplop;
				const after = row.twinkleplop;
				if (before && after) out.push(before / after);
			}
			return geomean(out);
		};

		let reference: number | null = null;
		if (previous) {
			const unchanged = Object.keys(entry.libraries).filter(
				(id) => id !== "twinkleplop" && previous.libraries[id] === entry.libraries[id]
			);
			const out: number[] = [];
			for (const [key, row] of Object.entries(entry.cells)) {
				for (const id of unchanged) {
					const before = previous.cells[key]?.[id];
					if (before && row[id]) out.push(before / row[id]);
				}
			}
			reference = geomean(out);
		}

		const languages = [...new Set(Object.keys(entry.cells).map((k) => k.split(":")[0]))]
			.sort()
			.map((lang) => ({ lang, tokenize: ratios("tokenize", lang), html: ratios("html", lang) }));

		const tokenize = ratios("tokenize", null);
		const html = ratios("html", null);
		const base = previous ? indexes.get(previous.commit) : undefined;
		const index = {
			tokenize: base && tokenize !== null ? base.tokenize * tokenize : 1,
			html: base && html !== null ? base.html * html : 1
		};
		indexes.set(entry.commit, index);

		return {
			version: entry.version,
			commit: entry.commit,
			subject: entry.commit_subject,
			date: entry.generated_at.slice(0, 10),
			node: entry.node,
			previous: previous ? { version: previous.version, commit: previous.commit } : null,
			tokenize,
			html,
			index,
			reference,
			languages
		};
	});
	return steps.reverse();
}

function read_history(): VersionStep[] {
	for (const parts of [
		["..", "bench", "published", "history.json"],
		["lib", "bench", "published", "history.json"]
	]) {
		const candidate = path.resolve(process.cwd(), ...parts);
		if (!fs.existsSync(candidate)) continue;
		try {
			const raw = JSON.parse(fs.readFileSync(candidate, "utf-8")) as { entries: HistoryEntry[] };
			return version_steps(raw.entries);
		} catch (err) {
			console.error(`[benchmarks] ${candidate} could not be read: ${(err as Error).message}`);
			return [];
		}
	}
	return [];
}

// import.meta.dirname is not usable here: this module is bundled into
// .svelte-kit/output/server/ before prerendering runs, so every relative hop
// from it lands somewhere that does not exist. resolve from the working
// directory instead, accepting both shapes rather than betting on where the
// build was invoked from.
//
// two sources, in order of preference. the published run is committed: it was
// taken on a named machine with a pinned clock, by the commands in
// lib/bench/published/README.md, and anyone can re-run them. the ci artifact
// is what the shared runner produced most recently; it is the fallback, not
// the headline, because its absolute numbers depend on which host the job
// landed on.
type Source = "published" | "ci-artifact";

const CANDIDATES: Array<{ source: Source; parts: string[] }> = [
	// pnpm --filter=site build, cwd is lib/_site
	{ source: "published", parts: ["..", "bench", "published", "comparison.json"] },
	// vite build from the repo root
	{ source: "published", parts: ["lib", "bench", "published", "comparison.json"] },
	{ source: "ci-artifact", parts: ["..", "bench", "results", "comparison.json"] },
	{ source: "ci-artifact", parts: ["lib", "bench", "results", "comparison.json"] }
];

function find_results(): { json_path: string; source: Source } | null {
	const override = process.env.TWINKLEPLOP_BENCH_RESULTS;
	if (override)
		return fs.existsSync(override) ? { json_path: override, source: "ci-artifact" } : null;
	for (const { source, parts } of CANDIDATES) {
		const candidate = path.resolve(process.cwd(), ...parts);
		if (fs.existsSync(candidate)) return { json_path: candidate, source };
	}
	return null;
}

// how far the site's own commit has moved past the commit the run measured.
// null when git cannot answer (a shallow checkout, a tarball, a commit git
// has never seen).
function commits_behind(measured_commit: string | null): number | null {
	if (!measured_commit) return null;
	try {
		const out = execFileSync("git", ["rev-list", "--count", `${measured_commit}..HEAD`], {
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"]
		}).trim();
		const n = Number(out);
		return Number.isFinite(n) ? n : null;
	} catch {
		return null;
	}
}

export const load = async () => {
	const found = find_results();

	if (found === null) {
		// a benchmark page that quietly renders an empty state is
		// indistinguishable from one whose data went missing, and the whole
		// point of running this in ci is that someone notices.
		console.warn(
			`[benchmarks] no comparison.json found (looked in ${CANDIDATES.map((c) =>
				path.resolve(process.cwd(), ...c.parts)
			).join(", ")}). The benchmarks page will render its empty state.`
		);
		return { benchmarks: null, missing: true as const, source: null, behind: null, history: [] };
	}

	const { json_path, source } = found;
	try {
		const raw = JSON.parse(fs.readFileSync(json_path, "utf-8")) as RawComparison;
		console.log(`[benchmarks] rendering the ${source} run from ${json_path}`);
		return {
			benchmarks: build(raw),
			missing: false as const,
			source,
			behind: commits_behind(raw.meta.commit),
			history: read_history()
		};
	} catch (err) {
		// a malformed file is a different problem from a missing one, and
		// swallowing it into the same empty state hides a broken artifact.
		console.error(`[benchmarks] ${json_path} could not be read: ${(err as Error).message}`);
		return { benchmarks: null, missing: true as const, source: null, behind: null, history: [] };
	}
};
