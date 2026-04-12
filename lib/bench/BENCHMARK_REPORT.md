# Twinkleplop Benchmark Report

## Executive Summary

Modern JavaScript regex engines significantly outperform character scanning for most tokenization tasks, contradicting the architectural assumption that character-by-character scanning is universally faster.

## Performance Results

### Character Scanning vs Regex

| Task                  | Regex (ops/sec) | Char Scan (ops/sec) | Winner    | Factor       |
| --------------------- | --------------- | ------------------- | --------- | ------------ |
| **Tokenize Keywords** | 18,728          | 2,560               | Regex     | 7.3x faster  |
| **Find Numbers**      | 16,186          | 9,227               | Regex     | 1.75x faster |
| **Find Strings**      | 26,515          | 12,512              | Regex     | 2.1x faster  |
| **Find Comments**     | 60,721          | 13,837              | Regex     | 4.4x faster  |
| **HTML Attributes**   | 8,789           | 10,780              | Char Scan | 1.23x faster |
| **Skip Whitespace**   | 3,129           | 2,714               | Regex     | 1.15x faster |

### Regex Method Comparison

| Method              | Use Case           | Ops/sec   | Notes                        |
| ------------------- | ------------------ | --------- | ---------------------------- |
| `regex.test()`      | Presence check     | 1,051,954 | Fastest for boolean checks   |
| `string.match()`    | Simple extraction  | 25,678    | Best for getting all matches |
| `regex.exec()`      | Complex extraction | 18,490    | Good with capture groups     |
| `string.matchAll()` | Iterator access    | 16,509    | Modern but slower            |
| `string.indexOf()`  | Keyword search     | 11,948    | Slowest option               |

### Optimization Techniques

| Technique                      | Performance Impact               |
| ------------------------------ | -------------------------------- |
| Non-capturing groups `(?:...)` | 20% faster than capture groups   |
| Word boundaries `\b`           | 30% faster than line anchors `^` |
| Negated char class `[^>]*`     | Similar to lazy quantifiers      |
| Greedy vs Lazy quantifiers     | Greedy 5.4x faster for HTML      |
| Unicode property escapes       | 11% slower than char ranges      |

### Lookup Table Performance

| Method                   | Ops/sec  | Use Case                       |
| ------------------------ | -------- | ------------------------------ |
| Dense Array (Uint8Array) | Best     | ASCII character classification |
| Range Checks             | Good     | Simple character ranges        |
| Set Lookup               | Moderate | Sparse character sets          |
| Switch Statement         | Slowest  | Complex branching              |

### State Machine Overhead

| Implementation               | Relative Performance |
| ---------------------------- | -------------------- |
| Simple Procedural            | 1.0x (baseline)      |
| Stack-based State Machine    | 0.96x                |
| Function-based State Machine | 0.34x                |

## Key Findings

### ✅ Validated Assumptions

- **Lookup tables** provide O(1) performance for character classification
- **Maximal munch** principle is efficient with proper implementation
- **State machine overhead** is acceptable for complex parsing

### ❌ Invalidated Assumptions

- **Character scanning is NOT universally faster** - Regex wins in most cases
- **Tries are overkill** for keyword matching - Set/Map are faster
- **Static regex compilation** doesn't always improve performance

## Recommendations

### When to Use Regex

- Simple pattern matching (keywords, numbers, strings)
- Comment extraction
- Whitespace handling
- When performance is critical for simple patterns

### When to Use Character Scanning

- Complex context-aware parsing (HTML attributes)
- Building AST structures
- Custom state management requirements
- Language-specific edge cases

### Best Practices

1. **Pre-compile regex patterns** outside hot paths
2. **Reset `lastIndex`** for stateful regex with `g` flag
3. **Use non-capturing groups** when capture not needed
4. **Prefer `test()`** for existence checks
5. **Use `match()`** for simple extraction
6. **Choose dense arrays** for ASCII lookup tables
7. **Avoid function-based state machines** in hot paths

## Performance Summary

Average performance comparison across all tests:

- **Regex**: ~23,000 ops/sec (average)
- **Character Scanning**: ~8,800 ops/sec (average)
- **Regex is 2.6x faster on average**

## Conclusion

The architecture should be revised to leverage regex for simple tokenization while reserving character scanning for complex, context-aware parsing scenarios. Modern JavaScript engines (V8) have highly optimized regex implementations that outperform manual character iteration for most common patterns.
