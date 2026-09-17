// machine speed anchor.
//
// absolute timings from this machine are not comparable across runs: an M1
// Max under sustained load drops sustained clocks, and snapshots taken in
// separate runs have carried double digit thermal penalties. the anchor is a
// fixed workload, defined entirely inside the harness so no change under test
// can alter it, measured at the start and end of every run.
//
// two uses:
//
//   1. drift within a run. if the end anchor differs from the start anchor
//      by more than a few percent the machine changed state mid-run and the
//      absolute numbers in that report are suspect. paired A/B ratios
//      survive this (both arms saw the same drift) but raw microseconds do
//      not.
//
//   2. comparability across runs. anchor_ns is recorded in every report so
//      a later reader can normalise.
//
// the workload deliberately mirrors the shapes the real tokenizer leans on
// (charCodeAt over a string, dense typed array table lookups, typed array
// writes, a small branchy state machine) so it tracks the same machine
// characteristics the highlighter cares about, rather than measuring, say,
// pure floating point throughput.

const ANCHOR_TEXT = (() => {
  // fixed pseudo-source. built from a linear congruential generator so it is
  // byte identical on every machine and every run without shipping a blob.
  //
  // joined, not concatenated. 65k `+=` steps build a cons-string tree that
  // charCodeAt flattens on first use but keeps reaching through until a GC
  // shortcuts the reference, so the first anchor reading of a process ran
  // 25-35% slower than every later one and every comparison run reported
  // that as the machine drifting. join() returns a flat string from the start.
  let seed = 0x2545f491;
  const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
  const alphabet =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$ \n\t{}()[];:,.\"'`+-*/=<>!&|";
  const out = new Array(65_536);
  for (let i = 0; i < 65_536; i++) out[i] = alphabet[next() % alphabet.length];
  return out.join("");
})();

const CHAR_CLASS = (() => {
  const t = new Uint8Array(128);
  for (let c = 0; c < 128; c++) {
    if ((c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 95 || c === 36) t[c] = 1;
    else if (c >= 48 && c <= 57) t[c] = 2;
    else if (c === 32 || c === 9 || c === 10 || c === 13) t[c] = 3;
    else if (c === 34 || c === 39 || c === 96) t[c] = 4;
    else t[c] = 5;
  }
  return t;
})();

const TRANSITIONS = (() => {
  const t = new Uint16Array(8 * 8);
  for (let s = 0; s < 8; s++) for (let c = 0; c < 8; c++) t[s * 8 + c] = (s * 3 + c * 5) % 8;
  return t;
})();

const OUT = new Uint32Array(ANCHOR_TEXT.length * 3);

function anchor_workload() {
  const text = ANCHOR_TEXT;
  const len = text.length;
  const classes = CHAR_CLASS;
  const trans = TRANSITIONS;
  const out = OUT;
  let state = 0;
  let n = 0;
  let checksum = 0;
  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i);
    const cls = code < 128 ? classes[code] : 5;
    const next = trans[state * 8 + cls];
    if (next !== state) {
      const o = n * 3;
      out[o] = state;
      out[o + 1] = i;
      out[o + 2] = i + 1;
      n++;
      state = next;
    }
    checksum = (checksum + cls * next) | 0;
  }
  return checksum + n;
}

// the anchor has to be warmed to the same tier on both readings or the
// "drift" it reports is just V8 optimising it, plus macOS moving the process
// off an efficiency core. an early version warmed for four iterations and
// reported a 30% speed-up across a run that was entirely this artefact.
// warm for a wall-clock budget instead, then take best-of over several
// repeats so a stray interrupt cannot inflate the reading.
const WARMUP_MS = 60;

function warm() {
  const deadline = process.hrtime.bigint() + BigInt(WARMUP_MS * 1e6);
  let sink = 0;
  do {
    sink += anchor_workload();
  } while (process.hrtime.bigint() < deadline);
  return sink;
}

/**
 * Measure the anchor. Returns nanoseconds per iteration.
 *
 * the reading is repeated, re-warming between attempts, until two in a row
 * agree within 3%, so a stray interrupt during the warm-up cannot become the
 * reading. (the 25-35% slow first reading that used to show up here was the
 * cons-string ANCHOR_TEXT above, not warm-up.)
 */
export function measure_anchor(iterations = 24) {
  const best_of_8 = () => {
    let best = Infinity;
    for (let r = 0; r < 8; r++) {
      const t0 = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) anchor_workload();
      const ns = Number(process.hrtime.bigint() - t0) / iterations;
      if (ns < best) best = ns;
    }
    return best;
  };
  warm();
  let previous = best_of_8();
  for (let attempt = 0; attempt < 10; attempt++) {
    warm();
    const current = best_of_8();
    const agree = Math.abs(current - previous) / Math.min(current, previous) <= 0.03;
    previous = current;
    if (agree) break;
  }
  return previous;
}

/**
 * Compare two anchor readings taken around a run.
 *
 * `drift` is positive when the machine got slower during the run.
 */
export function anchor_drift(start_ns, end_ns) {
  const drift = (end_ns - start_ns) / start_ns;
  return {
    start_ns: Math.round(start_ns),
    end_ns: Math.round(end_ns),
    drift,
    // 3% is roughly twice the run-to-run spread observed on an idle M1 Max.
    // above it, treat absolute microseconds in the report as unusable and
    // rely on the paired ratios only.
    stable: Math.abs(drift) < 0.03,
  };
}
