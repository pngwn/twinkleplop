# Twinkleplop Benchmarks

Three harnesses live here, answering three different questions. Picking the
wrong one is the most common way to produce a number that means nothing, so
start here.

| directory   | question it answers                                              | run it when |
| ----------- | ---------------------------------------------------------------- | ----------- |
| `perf/`     | **did my change make this library faster or slower?** Paired A/B against a frozen build of another commit, with a calibrated noise floor and an output parity gate. | any change you intend to claim is a speedup — and this is what CI runs on every pull request |
| `compare/`  | **how does twinkleplop compare to Shiki, Prism and sugar-high?** Absolute, interleaved, across every language at three input sizes plus Shiki's own benchmark inputs. Produces the website's charts. | before publishing a comparison |
| `coldstart/`| **what does the first highlight cost?** Module load, compile, first call. | changes to what is paid at import |

`perf/` and `compare/` share one machine-wide lock, a frozen hashed corpus and
an anchor workload, because both of them are measurements of a machine and
two running at once do not give two noisy results — they give two wrong ones.

## CI

`.github/workflows/benchmarks.yml` runs `perf/` on every pull request against
the branch's merge base, calibrates the noise floor on the runner first, and
posts the delta as a single self-updating comment. It runs `compare/` on
pushes to `main` — or on a pull request labelled `bench:compare` — and uploads
the result as the `benchmarks` artifact, which `deploy-site.yml` downloads and
builds the website's benchmark page from.

See `perf/README.md` for what counts as a result, and `compare/README.md` for
what a cross-library number can and cannot be used for.

