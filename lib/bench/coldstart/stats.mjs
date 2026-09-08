// robust summary statistics for spawn-timed samples.
//
// cold start samples are not normal. the distribution has a hard floor (the
// work genuinely takes that long) and an unbounded right tail (the scheduler
// put the child on an efficiency core, another agent's build woke up, the
// page cache missed). the mean tracks the tail, so everything here is
// median-based and the spread is reported as an interquartile range rather
// than a standard deviation.

export function median(xs) {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function quantile(xs, q) {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/**
 * Summarise one sample vector.
 *
 * `rsd_pct` is the interquartile range as a percentage of the median. it is
 * the number to look at before believing a difference between two scenarios:
 * a 5% gap between medians whose iqr is 20% is not a gap.
 */
export function summarise(xs) {
  const med = median(xs);
  const q1 = quantile(xs, 0.25);
  const q3 = quantile(xs, 0.75);
  return {
    n: xs.length,
    min: xs.length === 0 ? NaN : Math.min(...xs),
    median: med,
    q1,
    q3,
    iqr_pct: med === 0 ? 0 : ((q3 - q1) / med) * 100,
    p90: quantile(xs, 0.9),
    max: xs.length === 0 ? NaN : Math.max(...xs),
  };
}

export function fmt_ms(x) {
  if (!Number.isFinite(x)) return "-";
  if (x >= 100) return x.toFixed(0);
  if (x >= 10) return x.toFixed(1);
  return x.toFixed(2);
}
