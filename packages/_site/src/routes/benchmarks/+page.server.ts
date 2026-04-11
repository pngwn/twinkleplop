import fs from 'node:fs';
import path from 'node:path';

// Shape we want to hand to the page: for each mode ("tokenise" vs "render"),
// a list of samples (tiny/small/medium/…), and within each sample a sorted
// list of library bars with ops/sec. The mapping from vitest's raw JSON to
// this shape is done here so the page component can stay presentational.

interface LibraryResult {
	library: string;
	hz: number;
	mean: number; // ms per op
}

interface SampleChart {
	sampleName: string; // "tiny", "small", …
	sampleSize: string; // "1 line", "10 lines", …
	results: LibraryResult[];
}

interface ModeSection {
	mode: 'tokenise' | 'render';
	label: string;
	description: string;
	charts: SampleChart[];
}

interface BenchmarkData {
	sections: ModeSection[];
	generatedAt: string;
}

// Vitest benchmark-results.json shape (relevant bits only).
interface RawResults {
	files: Record<
		string | number,
		{
			filepath: string;
			groups: Array<{
				fullName: string;
				benchmarks: Array<{
					name: string;
					hz: number;
					mean: number;
				}>;
			}>;
		}
	>;
}

// Parse a group's fullName into its parts. Two shapes:
//   "…bench.js > HTML (tokenise) - tiny (1 line)"
//   "…bench.js > HTML - tiny (1 line)"
// Returns null for non-HTML groups.
function parseGroupName(
	fullName: string,
): { mode: 'tokenise' | 'render'; sampleName: string; sampleSize: string } | null {
	const afterGt = fullName.split(' > ').pop() ?? fullName;
	// HTML (tokenise) - <name> (<size>)
	// HTML - <name> (<size>)
	const match = afterGt.match(/^HTML(?: \((tokenise)\))? - (\S+) \(([^)]+)\)$/);
	if (!match) return null;
	const mode = match[1] === 'tokenise' ? 'tokenise' : 'render';
	return { mode, sampleName: match[2], sampleSize: match[3] };
}

// Natural sample ordering so charts read small → large regardless of the
// benchmark file's source order.
const SAMPLE_ORDER = ['tiny', 'small', 'medium', 'large', 'largeEmbedded'];
const sampleRank = (name: string) => {
	const i = SAMPLE_ORDER.indexOf(name);
	return i === -1 ? SAMPLE_ORDER.length : i;
};

export const load = async () => {
	// Benchmark JSON lives in the bench package alongside the bench file.
	// Relative hops from packages/_site/src/routes/benchmarks/:
	//   .. → routes/       .. → src/       .. → _site/       .. → packages/
	// then into bench/.
	const jsonPath = path.join(
		import.meta.dirname,
		'..',
		'..',
		'..',
		'..',
		'bench',
		'benchmark-results.json',
	);

	let raw: RawResults;
	try {
		const text = fs.readFileSync(jsonPath, 'utf-8');
		raw = JSON.parse(text) as RawResults;
	} catch (err) {
		// Benchmark hasn't been run yet — return an empty payload so the page
		// can render a friendly "run the bench" message.
		return {
			benchmarks: {
				sections: [],
				generatedAt: '',
			} as BenchmarkData,
			missing: true as const,
		};
	}

	const tokeniseCharts = new Map<string, SampleChart>();
	const renderCharts = new Map<string, SampleChart>();

	for (const key of Object.keys(raw.files)) {
		const file = raw.files[key];
		for (const group of file.groups ?? []) {
			const parsed = parseGroupName(group.fullName);
			if (!parsed) continue;

			const target =
				parsed.mode === 'tokenise' ? tokeniseCharts : renderCharts;

			const chart: SampleChart = target.get(parsed.sampleName) ?? {
				sampleName: parsed.sampleName,
				sampleSize: parsed.sampleSize,
				results: [],
			};

			for (const b of group.benchmarks ?? []) {
				chart.results.push({
					library: b.name.trim(),
					hz: b.hz,
					mean: b.mean,
				});
			}

			// Sort fastest-to-slowest so the chart reads top → bottom clearly.
			chart.results.sort((a, b) => b.hz - a.hz);
			target.set(parsed.sampleName, chart);
		}
	}

	const orderChart = (a: SampleChart, b: SampleChart) =>
		sampleRank(a.sampleName) - sampleRank(b.sampleName);

	const sections: ModeSection[] = [
		{
			mode: 'tokenise',
			label: 'Tokenise only',
			description:
				'How fast each library can turn HTML source into a structured token stream. No HTML output, no rendering — just the parse.',
			charts: [...tokeniseCharts.values()].sort(orderChart),
		},
		{
			mode: 'render',
			label: 'Tokenise + render HTML',
			description:
				'End-to-end highlighting: tokenise the input AND produce styled HTML output ready to drop into a page.',
			charts: [...renderCharts.values()].sort(orderChart),
		},
	];

	let generatedAt = '';
	try {
		const stat = fs.statSync(jsonPath);
		generatedAt = stat.mtime.toISOString();
	} catch {
		// ignore
	}

	return {
		benchmarks: {
			sections,
			generatedAt,
		} as BenchmarkData,
		missing: false as const,
	};
};
