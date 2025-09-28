// Demonstrating the identifier-first scanning approach
// As mentioned in architecture.md line 258:
// "Keyword Matching: Scan identifiers with charCodeAt(), then Set lookup for classification"

console.log("=".repeat(60));
console.log("IDENTIFIER-FIRST SCANNING APPROACH");
console.log("=".repeat(60));

// JavaScript keywords
const KEYWORDS = new Set([
	"if", "else", "switch", "case", "default", "while", "do", "for",
	"break", "continue", "return", "var", "let", "const", "function",
	"class", "extends", "static", "async", "await", "new", "typeof",
	"instanceof", "in", "of", "delete", "void", "try", "catch",
	"finally", "throw", "import", "export", "from", "as", "this",
	"super", "null", "undefined", "debugger", "with", "yield", "get", "set"
]);

const BOOLEAN_LITERALS = new Set(["true", "false"]);
const SPECIAL_VALUES = new Set(["undefined", "null", "NaN", "Infinity"]);

// Simulate identifier scanning
function scanIdentifierThenClassify(input, startPos) {
	let pos = startPos;
	const len = input.length;
	
	// Scan the full identifier
	while (pos < len) {
		const char = input.charCodeAt(pos);
		// Check if it's an identifier continuation character
		if ((char >= 97 && char <= 122) ||  // a-z
		    (char >= 65 && char <= 90) ||   // A-Z
		    (char >= 48 && char <= 57) ||   // 0-9
		    char === 95 ||                  // _
		    char === 36) {                  // $
			pos++;
		} else {
			break;
		}
	}
	
	// Extract the identifier
	const identifier = input.slice(startPos, pos);
	
	// Classify based on Set lookup
	let tokenType;
	if (KEYWORDS.has(identifier)) {
		tokenType = "keyword";
	} else if (BOOLEAN_LITERALS.has(identifier)) {
		tokenType = "boolean";
	} else if (SPECIAL_VALUES.has(identifier)) {
		tokenType = "special";
	} else {
		tokenType = "identifier";
	}
	
	return {
		text: identifier,
		type: tokenType,
		start: startPos,
		end: pos
	};
}

// Test cases
const testCases = [
	"setTimeout",
	"set",
	"innerHTML",
	"in",
	"className",
	"class",
	"forEach",
	"for",
	"constructor",
	"const",
	"true",
	"trueValue",
	"false",
	"falsePositive",
	"null",
	"nullish",
	"undefined",
	"undefinedVariable",
	"async",
	"asyncFunction",
	"await",
	"awaitPromise"
];

console.log("\nTesting identifier-first scanning:");
console.log("-".repeat(40));

for (const test of testCases) {
	const result = scanIdentifierThenClassify(test, 0);
	const icon = result.type === "identifier" ? "✅" : "🔑";
	console.log(`${icon} "${test}" → ${result.type}`);
}

console.log("\n" + "=".repeat(60));
console.log("ANALYSIS");
console.log("=".repeat(60));
console.log(`
This approach correctly handles all cases:
- Full identifiers are scanned first
- Keywords are only matched if the ENTIRE identifier matches
- No partial matching issues

This aligns with the architecture document's recommendation
and is how many real-world tokenizers work (scan then classify).

Implementation options:

1. MINIMAL CHANGE: Add 'boundary' flag to match rules
   - Keywords would have { match: "set", boundary: true }
   - Tokenizer checks next char is not identifier continuation
   - Small change to both compiler and tokenizer

2. FULL REFACTOR: Identifier-first scanning (as shown above)
   - Remove keywords from main state match rules
   - Scan full identifiers first
   - Classify using Set lookup
   - Bigger change but cleaner architecture

3. HYBRID: Special handling for keyword patterns
   - During compilation, mark keyword patterns specially
   - Tokenizer applies boundary check only for keywords
   - Moderate change, good performance
`);