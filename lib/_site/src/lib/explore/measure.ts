// browser `performance.now()` is quantized (typically 5us with cross-origin
// isolation, up to 100us without), so a single call to a microsecond-scale
// tokenizer routinely reads 0.0ms. to recover resolution we batch calls
// until each sample has accumulated enough wall time to be above the timer
// floor, divide by the iteration count to get a per-call estimate, then
// take the median of several such batches to damp out jit/gc spikes. a
// hard wall-clock ceiling keeps slow inputs from stalling the ui.

export interface measure_options {
  // minimum wall time per sample; larger values get finer resolution at
  // the cost of doing more work per edit.
  min_sample_ms?: number;
  // how many sample batches to run before taking the median.
  samples?: number;
  // abort once this much real time has elapsed across the whole call.
  budget_ms?: number;
}

export interface measurement<T> {
  result: T;
  ms: number;
  samples: number;
  iters: number;
}

export function measure<T>(fn: () => T, opts: measure_options = {}): measurement<T> {
  const min_sample_ms = opts.min_sample_ms ?? 2;
  const target_samples = opts.samples ?? 5;
  const budget_ms = opts.budget_ms ?? 60;

  // prime jit + locate a value to return even if everything else short-
  // circuits on the budget.
  let last_result = fn();

  const per_iter: number[] = [];
  let total_iters = 0;
  const session_start = performance.now();

  for (let s = 0; s < target_samples; s++) {
    if (performance.now() - session_start >= budget_ms) break;

    const t0 = performance.now();
    let t1 = t0;
    let iters = 0;
    do {
      last_result = fn();
      iters++;
      t1 = performance.now();
    } while (t1 - t0 < min_sample_ms);

    per_iter.push((t1 - t0) / iters);
    total_iters += iters;
  }

  if (per_iter.length === 0) {
    // budget was spent on the warmup alone; treat that single call as
    // the sample rather than reporting 0.
    const t0 = performance.now();
    last_result = fn();
    const ms = performance.now() - t0;
    return { result: last_result, ms, samples: 1, iters: 1 };
  }

  per_iter.sort((a, b) => a - b);
  return {
    result: last_result,
    ms: per_iter[per_iter.length >> 1],
    samples: per_iter.length,
    iters: total_iters,
  };
}

/** runs `fn` once the next frame has painted, returns a canceller */
export function after_paint(fn: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const frame = requestAnimationFrame(() => {
    timer = setTimeout(fn);
  });
  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
  };
}

/** times under a millisecond keep four decimals so they never round to zero */
export function format_ms(ms: number): string {
  return `${ms < 1 ? ms.toFixed(4) : ms.toFixed(2)}ms`;
}

export function speedup(a_ms: number, b_ms: number): string {
  return `×${(Math.max(a_ms, b_ms) / Math.max(0.001, Math.min(a_ms, b_ms))).toFixed(1)}`;
}
