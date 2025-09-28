// Exploring solutions for keyword boundary issue

// The problem: Keywords like "set", "get", "in", etc. are being matched
// at the beginning of longer identifiers like "setTimeout", "innerHTML", etc.

// Current matching process:
// 1. Patterns are sorted by length (longest first) during compilation
// 2. Character scanning checks multi-character patterns first
// 3. Keywords are stored as patterns and checked before identifier rules

console.log("=".repeat(60));
console.log("EXPLORING SOLUTIONS FOR KEYWORD BOUNDARY ISSUE");
console.log("=".repeat(60));

// Solution 1: Grammar-based approach - Reorder rules
console.log("\n1. GRAMMAR-BASED: Reorder rules");
console.log("-".repeat(40));
console.log("Pros:");
console.log("  - No core library changes needed");
console.log("  - Works with existing architecture");
console.log("Cons:");
console.log("  - Not possible - keywords must come before identifiers");
console.log("  - Identifiers would consume keywords if placed first");
console.log("Verdict: ❌ Not viable");

// Solution 2: Grammar-based approach - Use probe mode
console.log("\n2. GRAMMAR-BASED: Use probe mode for keywords");
console.log("-".repeat(40));
console.log("Concept:");
console.log("  - Enter probe mode on potential keyword start");
console.log("  - Look ahead to see if followed by non-identifier char");
console.log("  - Decide whether to tokenize as keyword or identifier");
console.log("Pros:");
console.log("  - No core library changes");
console.log("  - Uses existing probe mechanism");
console.log("Cons:");
console.log("  - Complex grammar - need probe for every keyword");
console.log("  - Performance impact from constant probing");
console.log("  - Probe mode designed for larger ambiguities");
console.log("Verdict: ⚠️  Possible but inefficient");

// Solution 3: Core library - Add word boundary matcher
console.log("\n3. CORE LIBRARY: Add word boundary support");
console.log("-".repeat(40));
console.log("Concept:");
console.log("  - Add new match type: 'word' or 'exact_word'");
console.log("  - Compiler checks if next char is non-identifier");
console.log("  - Only matches if word boundary exists");
console.log("Example:");
console.log('  { "word": "set", "token": "keyword" }');
console.log('  // or');
console.log('  { "match": "set", "boundary": true, "token": "keyword" }');
console.log("Pros:");
console.log("  - Clean, declarative solution");
console.log("  - Efficient - single lookahead check");
console.log("  - Follows architecture principles");
console.log("Cons:");
console.log("  - Requires core library modification");
console.log("  - New match type to document");
console.log("Verdict: ✅ Best solution");

// Solution 4: Core library - Post-processing approach
console.log("\n4. CORE LIBRARY: Post-process identifier scanning");
console.log("-".repeat(40));
console.log("Concept:");
console.log("  - Scan full identifier first");
console.log("  - Check against keyword set");
console.log("  - Only match if entire identifier is keyword");
console.log("Pros:");
console.log("  - Aligns with architecture doc suggestion");
console.log("  - No grammar changes needed");
console.log("  - Very efficient");
console.log("Cons:");
console.log("  - Major tokenizer refactor");
console.log("  - Changes fundamental matching order");
console.log("Verdict: ✅ Good but significant change");

// Solution 5: Hybrid - Special keyword state
console.log("\n5. GRAMMAR-BASED: Special keyword checking state");
console.log("-".repeat(40));
console.log("Concept:");
console.log("  - Don't match keywords in main state");
console.log("  - Transition to identifier state for all letters");
console.log("  - In identifier state, check if collected = keyword");
console.log("Pros:");
console.log("  - No core changes");
console.log("  - Follows scan-then-check pattern");
console.log("Cons:");
console.log("  - Need to collect identifier text (performance)");
console.log("  - Complex state management");
console.log("Verdict: ⚠️  Possible but complex");

console.log("\n" + "=".repeat(60));
console.log("RECOMMENDATION");
console.log("=".repeat(60));
console.log(`
Based on the architecture principles and implementation:

BEST APPROACH: Solution 3 - Add word boundary support to core

This aligns with:
- Architecture principle of declarative grammars
- Performance-first approach (single lookahead)
- Separation of concerns (core handles matching logic)

Implementation would involve:
1. Add 'word' or 'boundary' property to rule schema
2. In compiler, check boundary flag when processing patterns
3. In tokenizer, verify next char is non-identifier when matching
4. Update grammars to use boundary for keywords

Alternative: Solution 4 is also good and aligns with the 
architecture doc's suggestion about scanning identifiers then
checking against keyword set. But it's a bigger change.
`);

// Test what characters should be considered word boundaries
console.log("\n" + "=".repeat(60));
console.log("WORD BOUNDARY CHARACTERS");
console.log("=".repeat(60));

const testBoundaries = [
	{ char: ' ', code: 32, name: 'space', boundary: true },
	{ char: '\t', code: 9, name: 'tab', boundary: true },
	{ char: '\n', code: 10, name: 'newline', boundary: true },
	{ char: '(', code: 40, name: 'left paren', boundary: true },
	{ char: ')', code: 41, name: 'right paren', boundary: true },
	{ char: '{', code: 123, name: 'left brace', boundary: true },
	{ char: '}', code: 125, name: 'right brace', boundary: true },
	{ char: '[', code: 91, name: 'left bracket', boundary: true },
	{ char: ']', code: 93, name: 'right bracket', boundary: true },
	{ char: ';', code: 59, name: 'semicolon', boundary: true },
	{ char: ',', code: 44, name: 'comma', boundary: true },
	{ char: '.', code: 46, name: 'period', boundary: true },
	{ char: ':', code: 58, name: 'colon', boundary: true },
	{ char: '=', code: 61, name: 'equals', boundary: true },
	{ char: '+', code: 43, name: 'plus', boundary: true },
	{ char: '-', code: 45, name: 'minus', boundary: true },
	{ char: '*', code: 42, name: 'asterisk', boundary: true },
	{ char: '/', code: 47, name: 'slash', boundary: true },
	{ char: '<', code: 60, name: 'less than', boundary: true },
	{ char: '>', code: 62, name: 'greater than', boundary: true },
	{ char: '!', code: 33, name: 'exclamation', boundary: true },
	{ char: '?', code: 63, name: 'question', boundary: true },
	{ char: '&', code: 38, name: 'ampersand', boundary: true },
	{ char: '|', code: 124, name: 'pipe', boundary: true },
	{ char: '^', code: 94, name: 'caret', boundary: true },
	{ char: '~', code: 126, name: 'tilde', boundary: true },
	{ char: '%', code: 37, name: 'percent', boundary: true },
	{ char: '"', code: 34, name: 'double quote', boundary: true },
	{ char: "'", code: 39, name: 'single quote', boundary: true },
	{ char: '`', code: 96, name: 'backtick', boundary: true },
	// Non-boundaries (identifier continuation chars)
	{ char: '_', code: 95, name: 'underscore', boundary: false },
	{ char: '$', code: 36, name: 'dollar', boundary: false },
	{ char: 'a', code: 97, name: 'letter a', boundary: false },
	{ char: 'Z', code: 90, name: 'letter Z', boundary: false },
	{ char: '0', code: 48, name: 'digit 0', boundary: false },
	{ char: '9', code: 57, name: 'digit 9', boundary: false },
];

console.log("\nCharacters that should be word boundaries:");
testBoundaries.filter(b => b.boundary).forEach(b => {
	console.log(`  ${b.name.padEnd(15)} '${b.char}' (${b.code})`);
});

console.log("\nCharacters that should NOT be boundaries:");
testBoundaries.filter(b => !b.boundary).forEach(b => {
	console.log(`  ${b.name.padEnd(15)} '${b.char}' (${b.code})`);
});

console.log("\nBoundary check logic:");
console.log("  NOT: [a-zA-Z0-9_$]");
console.log("  In other words: Not identifier continuation characters");