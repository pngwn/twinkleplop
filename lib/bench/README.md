# Twinkleplop Benchmarks

Four harnesses live here, answering four different questions. Picking the
wrong one is the most common way to produce a number that means nothing, so
start here.

| directory   | question it answers                                              | run it when |
| ----------- | ---------------------------------------------------------------- | ----------- |
| `perf/`     | **did my change make this library faster or slower?** Paired A/B against a frozen build of another commit, with a calibrated noise floor and an output parity gate. | any change you intend to claim is a speedup — and this is what CI runs on every pull request |
| `compare/`  | **how does twinkleplop compare to Shiki, Prism and sugar-high?** Absolute, interleaved, across every language at three input sizes plus Shiki's own benchmark inputs. Produces the website's charts. | before publishing a comparison |
| `coldstart/`| **what does the first highlight cost?** Module load, compile, first call. | changes to what is paid at import |
| `src/`      | **is the architecture's premise true?** Micro-benchmarks for character scanning vs regex, lookup tables, tries, state machines. Vitest. | designing, not optimising |

`perf/` and `compare/` share one machine-wide lock, a frozen hashed corpus and
an anchor workload, because both of them are measurements of a machine and
two running at once do not give two noisy results — they give two wrong ones.

**Do not use the `src/` numbers to claim a speedup.** They measure isolated
techniques, not this library, and a technique being faster in a micro-benchmark
has repeatedly failed to survive contact with the real tokenizer.

## CI

`.github/workflows/benchmarks.yml` runs `perf/` on every pull request against
the branch's merge base, calibrates the noise floor on the runner first, and
posts the delta as a single self-updating comment. It runs `compare/` on
pushes to `main` — or on a pull request labelled `bench:compare` — and uploads
the result as the `benchmarks` artifact, which `deploy-site.yml` downloads and
builds the website's benchmark page from.

See `perf/README.md` for what counts as a result, and `compare/README.md` for
what a cross-library number can and cannot be used for.

---

## `src/` — architectural micro-benchmarks

Performance benchmarks validating the architectural assumptions from the architecture document.

## Running Benchmarks

```bash
# Run all benchmarks
pnpm bench

# Run with UI
pnpm bench:ui
```

## Benchmark Categories

### 1. Character Scanning vs Regex (`char-vs-regex.bench.js`)

- Compares regex-based tokenization with character code scanning
- Tests keyword matching, number parsing, string extraction, and comment detection
- Validates the assumption that character scanning is faster than regex

### 2. Lookup Table Performance (`lookup-tables.bench.js`)

- Compares lookup tables vs range checks, Sets, and switch statements
- Tests dense vs sparse lookup tables
- Evaluates different table sizes (128 vs 256 entries)
- Validates O(1) character-to-action mapping performance

### 3. Trie Matching (`trie-matching.bench.js`)

- Compares trie data structure vs alternatives for string matching
- Tests keyword recognition, CSS property matching, and prefix matching
- Evaluates memory and construction overhead
- Validates trie efficiency for multi-string matching

### 4. State Machine Overhead (`state-machine.bench.js`)

- Compares stack-based state machines vs simpler approaches
- Tests context switching performance
- Evaluates different stack implementations
- Validates state machine model efficiency

### 5. Maximal Munch Principle (`maximal-munch.bench.js`)

- Tests greedy tokenization strategies
- Compares different approaches to operator parsing
- Evaluates ambiguity resolution performance
- Tests lookahead impact on performance

## Key Findings

The benchmarks are designed to prove or disprove the following architectural assumptions:

1. **Character scanning with `charCodeAt()` is faster than regex** - Tested in char-vs-regex
2. **Lookup tables provide O(1) performance** - Tested in lookup-tables
3. **Tries are efficient for keyword matching** - Tested in trie-matching
4. **State machine overhead is acceptable** - Tested in state-machine
5. **Maximal munch principle is performant** - Tested in maximal-munch
