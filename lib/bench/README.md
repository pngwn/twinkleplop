# Twinkleplop Benchmarks

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
