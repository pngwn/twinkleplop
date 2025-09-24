# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Twinkleplop is a high-performance, regex-free syntax highlighter written in JavaScript. Based on comprehensive benchmarking, the system uses character scanning as its primary tokenization method (8-15x faster than regex in realistic parsing scenarios). It consists of a generic Runtime Engine and language-specific Grammar Definitions, implementing a stack-augmented finite state machine for tokenization.

## Architecture

### Core Design Principles
- **Performance First**: Character scanning with charCodeAt() for optimal tokenization speed
- **Separation of Concerns**: Language-agnostic runtime engine with external declarative language definitions
- **Declarative Grammars**: Intuitive JSON-based language definitions focusing on language structure
- **Robustness**: Handles nested contexts, language injection, and grammatical ambiguities

### Key Components

1. **Runtime Engine**: Small, efficient JavaScript module executing tokenization
   - Single `while` loop processing input character-by-character
   - Uses `charCodeAt()` for state transitions and character classification
   - Outputs tokens to flat Uint32Array: `[type, start, end]` triplets
   - Token types as integers (0-255) for Uint8Array storage
   - Maintains position and stateStack with pre-allocated typed arrays

2. **Language Definitions**: JSON format with states and rules
   - Root properties: `name` and `states`
   - Rule matchers: `match`, `range`, `begin/end`
   - Actions: `token`, `state`, `exit`
   - Lookahead assertions via `peek` property

3. **Compilation Phase**: One-time transformation of JSON grammars to optimized representation
   - Integer mapping for state/token identifiers (0-255 range)
   - Token types mapped to integers with pre-computed class names array
   - Computed indices for transitions: `(state * MAX_ACTIONS + action) * 3`
   - Dense Uint8Arrays for ASCII lookups (0-127)
   - Character patterns compiled to code sequences for direct comparison
   - Set for keyword matching after identifier scanning

### Performance Guidelines (Based on Realistic Benchmarks)

#### Core Strategy:
- **Character Scanning**: Primary tokenization method - 8-15x faster than regex in real scenarios
- **Why Regex is Slower**: String slicing overhead (66x penalty), multiple pattern attempts, failed matches
- **Lookup Tables**: Character classification - O(1) with dense Uint8Arrays
- **Computed Indices**: State transitions - 4.6x faster than string keys
- **Context Chomping**: Tight character loops when in known states (strings, comments)

#### Data Structures (Benchmarked):
- **Token Storage**: Flat Uint32Array (17,534 ops/sec) - 1.4x faster than objects
  - Access: `tokens[i*3]` = type, `tokens[i*3+1]` = start, `tokens[i*3+2]` = end
- **Token Types**: Integer encoding with Uint8Array - 1.5x faster than Map lookups
- **Alternative**: Structure of Arrays (SoA) - separate type/position arrays (16,769 ops/sec)

#### Key Optimizations:
- Pre-allocate typed arrays for stacks and token storage
- Use bit-packing for shallow nesting (14% faster)
- Scan identifiers with charCodeAt(), then Set lookup for keywords
- Avoid string slicing, regex in hot paths, generators (79% slower)
- Keep hot data contiguous for cache locality

### Implementation Notes
- Pure character scanning approach with state machine architecture
- Flat typed arrays for transition tables: `[newState, tokenType, stackOp]`
- Flat Uint32Array for token storage with integer type encoding
- 128-entry Uint8Arrays for ASCII character classification
- Maximal munch via character lookahead (5.9x faster than trie traversal)
- Token naming: flat convention mapped to integers (0-255)
- Context-aware chomping for known constructs (strings, comments, numbers)
- Pre-computed class name arrays for O(1) rendering

## Development Commands

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run benchmarks
pnpm bench

# Format code with Biome
npx biome format --write .

# Lint code with Biome
npx biome check --write .
```

## Project Structure

- `/packages/` - Monorepo packages managed by pnpm workspaces
  - `/bench/` - Benchmarking package
- `/architecture.md` - Design document and source of truth for system architecture
- `/biome.json` - Code formatting and linting configuration (tabs, double quotes)

## Testing Strategy

The project supports two testing methodologies:
1. **Snapshot Testing**: Code snippet with corresponding expected token stream JSON
2. **Assertion-Based Testing**: Inline comment assertions (e.g., `// ^ keyword`)

## Code Style

- Use tabs for indentation (enforced by Biome)
- Use double quotes for strings in JavaScript
- Follow existing patterns in the codebase

## Debugging Grammars

### Debug Template

A comprehensive grammar debugging template is available at `/packages/core/debug-grammar-template.js` for troubleshooting tokenization issues, including infinite loops.

### When to Use the Debug Template

Use the debug template when you encounter:
- **Infinite loops**: Grammar rules that cause the tokenizer to get stuck
- **Unexpected tokenization**: Tokens not being generated as expected
- **State transition issues**: Problems with push/pop/exit operations
- **Probe mode problems**: Issues with lookahead/probe rules
- **Performance problems**: Unusually slow tokenization
- **Grammar validation**: Testing new grammar rules before integration

### How to Use the Debug Template

1. **Copy the template** to your package directory:
   ```bash
   cp packages/core/debug-grammar-template.js packages/YOUR_PACKAGE/debug-issue.js
   ```

2. **Modify the configuration section** in the file:
   ```javascript
   // Import your grammar
   import grammar from "./src/grammar.js";
   
   // Define your problematic test input
   const testCode = `your test code here`;
   
   // Adjust debug configuration
   const config = {
     maxIterations: 10000,     // Stop after this many iterations
     maxLogLines: 5000,         // Limit log output
     verbosity: 2,              // 0=errors, 1=summary, 2=detailed
     showCharacterProcessing: true,  // Show each character
     showStateStack: true,      // Show state stack changes
   };
   ```

3. **Run the debug script**:
   ```bash
   node debug-issue.js
   ```

4. **Analyze the output**:
   - Console shows real-time processing with human-readable state/rule names
   - Log file created with timestamp contains full debugging details
   - Automatic detection of infinite loops with position tracking
   - Performance metrics to identify bottlenecks

### Debug Output Features

- **Character-by-character visualization**: See exactly how each character is processed
- **State tracking**: Monitor state transitions, push/pop operations
- **Rule matching**: See which rules match and in what order
- **Token emission**: Track when and what tokens are generated
- **Probe mode**: Visualize lookahead/probe mode entry and exit
- **Infinite loop protection**: Automatically stops and reports stuck positions
- **Performance analysis**: Iteration counts and processing speed

### Example Debug Output

```
[   0] '.' in 'main'
      ✓ Matched: /\./ → class-name in 'main'
      → Token: class-name = "." [0-1]
      ↓ Push: main → class_selector [main]
[   1] 'c' in 'class_selector' (stack: 1)
      ✓ Matched: /[a-z]/ → identifier.char in 'class_selector'
```

### Tips for Grammar Debugging

1. **Start with minimal test cases** - Use the smallest input that reproduces the issue
2. **Check probe mode rules** - These often cause infinite loops if misconfigured
3. **Verify state exits** - Ensure all pushed states have proper exit conditions
4. **Watch for position advancement** - Rules must consume at least one character
5. **Use verbosity levels** - Start with level 1 for overview, then 2 for details
6. **Check the log file** - Contains complete trace even if console is truncated