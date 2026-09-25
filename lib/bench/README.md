# Twinkleplop Benchmarks

Use the harness that matches what you want to measure:

| directory | measures | use for |
| --- | --- | --- |
| `perf/` | Candidate and reference builds, with calibrated noise thresholds and output parity checks | Performance changes and pull request benchmarks |
| `compare/` | Twinkleplop, Shiki, Prism, sugar-high and speed-highlight across languages and input sizes | Cross-library comparisons |
| `coldstart/` | Module loading, grammar compilation and the first highlight | Import and startup costs |

`perf/` and `compare/` share a machine-wide lock, a fixed corpus with recorded
hashes, and a reference workload. Run one benchmark process at a time to avoid
interference between measurements.

## CI

`.github/workflows/benchmarks.yml` runs `perf/` on every pull request against
the branch's merge base, calibrates the noise floor on the runner first, and
posts the results in a comment. It runs `compare/` on request through
`workflow_dispatch` or a pull request labelled `bench:compare`, and uploads the
results as an artifact. The website uses the committed results in `published/`.

See `perf/README.md` and `compare/README.md` for measurement methods and guidance
on interpreting results.
