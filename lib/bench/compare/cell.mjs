// one cell of the cross-library comparison, in a process of its own.
//
// bin/compare.mjs spawns this once per (file, mode). the libraries under test
// are loaded here, probed here, warmed here, measured here, and the process
// exits: nothing a previous cell did to the heap, the inline caches or the
// compiler's view of any function follows into the next one. measured back to
// back in one process, the same build read 4141 ops/s on `typescript.small`
// tokenize after a hundred-odd cells and 5387 fresh, and prism moved the other
// way. the arms WITHIN the cell still share this process and are interleaved,
// which is the part that makes them comparable to each other.
//
//   node --expose-gc lib/bench/compare/cell.mjs '<json spec>'
//
// prints one JSON line: { tokens, libraries, excluded, library_meta }.

import { load_arm } from "../perf/arm.mjs";
import { corpus } from "../perf/corpus.mjs";
import { load_libraries } from "./libraries.mjs";
import { measure_cell } from "./measure.mjs";

const spec = JSON.parse(process.argv[2]);
const { family, lang, file, mode } = spec;

const arm = await load_arm(spec.arm_root, "twinkleplop");
const libraries = await load_libraries(spec.library_ids, { arm });

const entry = corpus({ families: [family], languages: [lang] }).find((e) => e.file === file);
if (!entry) throw new Error(`corpus entry not found: ${family}/${file}`);
const src = entry.source;
const cell_id = `${entry.id}:${mode}`;

const arms = [];
const excluded = [];
const token_counts = {};

for (const lib of libraries) {
  if (!lib.supports(lang)) continue;

  // bound outside the timed loop. twinkleplop is the only library here with
  // a bind step, and charging it per iteration would measure something no
  // consumer pays.
  const bound = lib.bind ? lib.bind(lang) : null;
  const run = bound ? () => bound[mode](src) : () => lib[mode](src, lang);

  // several of these return escaped plaintext for a language they do not
  // know instead of throwing, which benchmarks as spectacularly fast. probe
  // once and drop the cell if it is empty.
  let probe;
  try {
    probe = run();
  } catch (err) {
    excluded.push({ cell: cell_id, library: lib.id, reason: `threw: ${err.message}` });
    continue;
  }
  const tokens = mode === "tokenize" ? lib.count_tokens(probe) : null;
  if (mode === "tokenize" && !(tokens > 0)) {
    excluded.push({
      cell: cell_id,
      library: lib.id,
      reason: "produced no tokens - refusing to publish a fallback path as a result",
    });
    continue;
  }
  if (mode === "html" && !(typeof probe === "string" && probe.length > 0)) {
    excluded.push({ cell: cell_id, library: lib.id, reason: "produced no HTML" });
    continue;
  }

  if (tokens !== null) token_counts[lib.id] = tokens;
  arms.push({ id: lib.id, run });
}

const measured =
  arms.length === 0
    ? []
    : measure_cell(arms, {
        rounds: spec.rounds,
        target_ms: spec.target_ms,
        warmup_ms: spec.warmup_ms,
        rewarm_ms: spec.rewarm_ms,
      });

process.stdout.write(
  `${JSON.stringify({
    tokens: mode === "tokenize" ? token_counts : null,
    libraries: measured,
    excluded,
    library_meta: libraries.map((l) => ({
      id: l.id,
      label: l.label,
      version: l.version,
      note: l.note,
    })),
  })}\n`,
);
