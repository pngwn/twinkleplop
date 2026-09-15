import fs from 'node:fs';
import path from 'node:path';

// Reads the artifact produced by `lib/bench/compare/bin/compare.mjs` — the
// same JSON the CI benchmark job uploads. The site build downloads that
// artifact into `lib/bench/results/` before running, so a deploy publishes
// numbers from one known machine and one known commit rather than whatever
// the last person to run a benchmark locally happened to get.
//
// The file is deliberately NOT committed. A checked-in benchmark result goes
// stale silently: it keeps rendering confident bar charts long after the
// numbers stopped being true. Missing data renders an honest empty state.

interface RawLibrary {
	id: string;
	ns_per_op: number;
	ops_per_sec: number;
	mb_per_sec: number;
	spread: number;
}

interface RawCell {
	corpus: 'sized' | 'upstream';
	lang: string;
	tier: 'small' | 'medium' | 'large' | null;
	bytes: number;
	lines: number;
	mode: 'tokenize' | 'html';
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

export interface Bar {
	id: string;
	label: string;
	ops_per_sec: number;
	ns_per_op: number;
	mb_per_sec: number;
	tokens: number | null;
	/** How many times slower than the fastest bar in this chart. 1 for the fastest. */
	ratio: number;
	/** Max/min across rounds. Well above 1 means the machine was busy. */
	spread: number;
}

export interface Chart {
	key: string;
	corpus: 'sized' | 'upstream';
	lang: string;
	tier: 'small' | 'medium' | 'large' | null;
	mode: 'tokenize' | 'html';
	bytes: number;
	lines: number;
	bars: Bar[];
}

const TIER_ORDER = ['small', 'medium', 'large'];

const MODE_LABEL: Record<string, { label: string; description: string }> = {
	tokenize: {
		label: 'Tokenise only',
		description: 'Source in, structured token stream out. No HTML, no rendering — just the parse.'
	},
	html: {
		label: 'Tokenise + render HTML',
		description: 'End-to-end: parse the source and produce styled HTML ready to drop into a page.'
	}
};

const CORPUS_COPY: Record<string, { label: string; description: string }> = {
	sized: {
		label: 'Our corpus, three sizes',
		description:
			'Every language at roughly 1KB, 10KB and 100KB. The small tier is the docs-snippet case, where fixed per-call cost still dominates; the large tier is a big vendored file. These are inputs we assembled, so read them alongside the set below.'
	},
	upstream: {
		label: "Shiki's own benchmark inputs",
		description:
			"The sample files from shikijs/textmate-grammars-themes, vendored and pinned. Shiki's own engine benchmark runs on these. We did not choose them, which is the point: a highlighter benchmark published by the people who wrote the highlighter is worth exactly as much as its inputs."
	}
};

function build(raw: RawComparison) {
	const labels = new Map(raw.meta.libraries.map((l) => [l.id, l.label]));

	const charts: Chart[] = raw.results.map((cell) => {
		const sorted = [...cell.libraries].sort((a, b) => a.ns_per_op - b.ns_per_op);
		const fastest = sorted[0]?.ns_per_op ?? 0;
		return {
			key: `${cell.corpus}:${cell.lang}:${cell.tier ?? '-'}:${cell.mode}`,
			corpus: cell.corpus,
			lang: cell.lang,
			tier: cell.tier,
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
	const modes = [...new Set(charts.map((c) => c.mode))].sort();

	return {
		meta: raw.meta,
		languages,
		modes: modes.map((m) => ({ id: m, ...MODE_LABEL[m] })),
		tier_order: TIER_ORDER,
		corpus_copy: CORPUS_COPY,
		charts
	};
}

// Where to look for the results file, in order.
//
// `import.meta.dirname` is NOT usable here. This module is bundled into
// `.svelte-kit/output/server/entries/pages/…` before prerendering runs, so at
// the point the path is resolved it points into the build output and every
// relative hop from it lands somewhere that does not exist. The failure is
// silent — the catch below turns it into "no benchmark data yet" — which is
// how a page can go on rendering an empty state for months while the data it
// wanted was sitting on disk the whole time.
//
// So: resolve from the working directory, which prerendering inherits, and
// accept both the package-relative and repo-root-relative shapes rather than
// betting on which one the build was invoked from.
const CANDIDATES = [
	// `pnpm --filter=site build` — cwd is lib/_site
	['..', 'bench', 'results', 'comparison.json'],
	// `vite build` from the repo root
	['lib', 'bench', 'results', 'comparison.json']
];

function find_results(): string | null {
	const override = process.env.TWINKLEPLOP_BENCH_RESULTS;
	if (override) return fs.existsSync(override) ? override : null;
	for (const parts of CANDIDATES) {
		const candidate = path.resolve(process.cwd(), ...parts);
		if (fs.existsSync(candidate)) return candidate;
	}
	return null;
}

export const load = async () => {
	const json_path = find_results();

	if (json_path === null) {
		// say so in the build log. a benchmark page that quietly renders an
		// empty state is indistinguishable from one whose data went missing,
		// and the whole point of running this in CI is that someone notices.
		console.warn(
			`[benchmarks] no comparison.json found (looked in ${CANDIDATES.map((c) =>
				path.resolve(process.cwd(), ...c)
			).join(', ')}). The benchmarks page will render its empty state.`
		);
		return { benchmarks: null, missing: true as const };
	}

	try {
		const raw = JSON.parse(fs.readFileSync(json_path, 'utf-8')) as RawComparison;
		return { benchmarks: build(raw), missing: false as const };
	} catch (err) {
		// a malformed file is a different problem from a missing one, and
		// swallowing it into the same empty state hides a broken artifact.
		console.error(`[benchmarks] ${json_path} could not be read: ${(err as Error).message}`);
		return { benchmarks: null, missing: true as const };
	}
};
