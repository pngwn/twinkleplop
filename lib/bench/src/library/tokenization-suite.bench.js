import { bench, describe } from "vitest";

// ============================================================================
// Core Tokenization Performance Suite
// Benchmarks the fundamental char scanning vs regex approaches
// ============================================================================

const js_code = `
function processData(items, options = {}) {
	const results = [];
	const maxItems = options.limit || 100;
	
	for (let i = 0; i < items.length && i < maxItems; i++) {
		const item = items[i];
		// Process each item
		if (item.value > 0 && item.active) {
			results.push({
				id: item.id,
				value: item.value * 2.5,
				name: \`Item #\${i + 1}\`,
				tags: ['processed', 'valid']
			});
		}
	}
	
	return results.filter(r => r.value < 1000);
}`.trim();

const css_code = `
:root {
	--primary: #3b82f6;
	--secondary: #10b981;
}

.component {
	display: flex;
	padding: 1rem;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 0.5rem;
	transition: all 0.3s ease;
}

.component:hover {
	transform: translateY(-2px);
	box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}`.trim();

describe("Character Scanning vs Regex", () => {
	// Pre-compiled regexes
	const patterns = [
		/^\s+/,
		/^\/\/.*/,
		/^\/\*[\s\S]*?\*\//,
		/^"(?:[^"\\]|\\.)*"/,
		/^'(?:[^'\\]|\\.)*'/,
		/^`(?:[^`\\]|\\.)*`/,
		/^\d+(\.\d+)?/,
		/^[a-zA-Z_$][a-zA-Z0-9_$]*/,
		/^[(){}\[\]]/,
		/^[+\-*/%=<>!&|^~?:]/,
		/^[,;.]/,
	];

	bench("Character Scanning", () => {
		const tokens = [];
		let i = 0;
		
		while (i < js_code.length) {
			const char = js_code.charCodeAt(i);
			
			// Whitespace
			if (char === 32 || char === 9 || char === 10 || char === 13) {
				const start = i;
				while (i < js_code.length) {
					const c = js_code.charCodeAt(i);
					if (c !== 32 && c !== 9 && c !== 10 && c !== 13) break;
					i++;
				}
				tokens.push({ type: "whitespace", start, end: i });
				continue;
			}
			
			// Numbers
			if (char >= 48 && char <= 57) {
				const start = i;
				while (i < js_code.length && js_code.charCodeAt(i) >= 48 && js_code.charCodeAt(i) <= 57) {
					i++;
				}
				if (i < js_code.length && js_code.charCodeAt(i) === 46) {
					i++;
					while (i < js_code.length && js_code.charCodeAt(i) >= 48 && js_code.charCodeAt(i) <= 57) {
						i++;
					}
				}
				tokens.push({ type: "number", start, end: i });
				continue;
			}
			
			// Identifiers
			if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122) || char === 95 || char === 36) {
				const start = i;
				while (i < js_code.length) {
					const c = js_code.charCodeAt(i);
					if (!((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 95 || c === 36)) {
						break;
					}
					i++;
				}
				tokens.push({ type: "identifier", start, end: i });
				continue;
			}
			
			// Single character tokens
			tokens.push({ type: "punctuation", start: i, end: ++i });
		}
		
		return tokens;
	});

	bench("Regex with Slicing", () => {
		const tokens = [];
		let remaining = js_code;
		let position = 0;
		
		while (remaining.length > 0) {
			let matched = false;
			
			for (const pattern of patterns) {
				const match = remaining.match(pattern);
				if (match) {
					tokens.push({
						type: "token",
						start: position,
						end: position + match[0].length,
					});
					position += match[0].length;
					remaining = remaining.slice(match[0].length);
					matched = true;
					break;
				}
			}
			
			if (!matched) {
				tokens.push({ type: "unknown", start: position, end: position + 1 });
				position++;
				remaining = remaining.slice(1);
			}
		}
		
		return tokens;
	});
});

describe("String Context Handling", () => {
	const string_heavy_code = `
const message = "This is a longer string with some content that needs escaping: \\"quotes\\" and \\n newlines";
const template = \`
	Multi-line template literal
	with \${interpolation} and more text
	spanning several lines
\`;
const single = 'Single quoted string with \\'escapes\\' inside';
`.trim();

	bench("Character Chomping", () => {
		const tokens = [];
		let i = 0;
		
		while (i < string_heavy_code.length) {
			// Check for strings
			if (string_heavy_code.charCodeAt(i) === 34) { // "
				const start = i++;
				while (i < string_heavy_code.length) {
					const char = string_heavy_code.charCodeAt(i);
					if (char === 92) { // backslash
						i += 2; // skip escape
					} else if (char === 34) { // closing quote
						i++;
						break;
					} else {
						i++;
					}
				}
				tokens.push({ type: "string", start, end: i });
				continue;
			}
			
			if (string_heavy_code.charCodeAt(i) === 39) { // '
				const start = i++;
				while (i < string_heavy_code.length) {
					const char = string_heavy_code.charCodeAt(i);
					if (char === 92) { // backslash
						i += 2;
					} else if (char === 39) { // closing quote
						i++;
						break;
					} else {
						i++;
					}
				}
				tokens.push({ type: "string", start, end: i });
				continue;
			}
			
			if (string_heavy_code.charCodeAt(i) === 96) { // `
				const start = i++;
				while (i < string_heavy_code.length) {
					const char = string_heavy_code.charCodeAt(i);
					if (char === 92) { // backslash
						i += 2;
					} else if (char === 96) { // closing backtick
						i++;
						break;
					} else {
						i++;
					}
				}
				tokens.push({ type: "template", start, end: i });
				continue;
			}
			
			// Skip other characters
			i++;
		}
		
		return tokens;
	});

	bench("Regex String Matching", () => {
		const tokens = [];
		const string_pattern = /^(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/;
		let remaining = string_heavy_code;
		let position = 0;
		
		while (remaining.length > 0) {
			const match = remaining.match(string_pattern);
			if (match) {
				tokens.push({
					type: "string",
					start: position,
					end: position + match[0].length,
				});
				position += match[0].length;
				remaining = remaining.slice(match[0].length);
			} else {
				position++;
				remaining = remaining.slice(1);
			}
		}
		
		return tokens;
	});
});

describe("Identifier and Keyword Detection", () => {
	const keywords = new Set([
		"function", "const", "let", "var", "if", "else", "for", "while",
		"return", "class", "async", "await", "new", "this", "super"
	]);
	
	const identifier_code = "function processData const results async transform return filter class DataProcessor";

	bench("Scan + Set Lookup", () => {
		const tokens = [];
		let i = 0;
		
		while (i < identifier_code.length) {
			const char = identifier_code.charCodeAt(i);
			
			// Skip whitespace
			if (char === 32) {
				i++;
				continue;
			}
			
			// Identifier
			if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
				const start = i;
				while (i < identifier_code.length) {
					const c = identifier_code.charCodeAt(i);
					if (!((c >= 65 && c <= 90) || (c >= 97 && c <= 122))) {
						break;
					}
					i++;
				}
				
				const word = identifier_code.slice(start, i);
				tokens.push({
					type: keywords.has(word) ? "keyword" : "identifier",
					start,
					end: i,
				});
				continue;
			}
			
			i++;
		}
		
		return tokens;
	});

	bench("Regex + Array Search", () => {
		const tokens = [];
		const keyword_list = Array.from(keywords);
		const ident_pattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*/;
		let remaining = identifier_code;
		let position = 0;
		
		while (remaining.length > 0) {
			if (remaining[0] === ' ') {
				position++;
				remaining = remaining.slice(1);
				continue;
			}
			
			const match = remaining.match(ident_pattern);
			if (match) {
				const word = match[0];
				tokens.push({
					type: keyword_list.includes(word) ? "keyword" : "identifier",
					start: position,
					end: position + word.length,
				});
				position += word.length;
				remaining = remaining.slice(word.length);
			} else {
				position++;
				remaining = remaining.slice(1);
			}
		}
		
		return tokens;
	});
});

describe("Failed Match Performance", () => {
	// Code with many tokens that won't match initial patterns
	const complex_code = ">>>===<<<???.?.?.***&&&|||^^^~~~";
	
	bench("Character Scanning (predictable)", () => {
		const tokens = [];
		let i = 0;
		
		while (i < complex_code.length) {
			const char = complex_code.charCodeAt(i);
			const start = i;
			
			// Try multi-char operators
			if (char === 62) { // >
				if (i + 1 < complex_code.length && complex_code.charCodeAt(i + 1) === 62) {
					if (i + 2 < complex_code.length && complex_code.charCodeAt(i + 2) === 62) {
						tokens.push({ type: ">>>", start, end: i + 3 });
						i += 3;
						continue;
					}
				}
			}
			
			if (char === 61) { // =
				if (i + 1 < complex_code.length && complex_code.charCodeAt(i + 1) === 61) {
					if (i + 2 < complex_code.length && complex_code.charCodeAt(i + 2) === 61) {
						tokens.push({ type: "===", start, end: i + 3 });
						i += 3;
						continue;
					}
				}
			}
			
			// Default single char
			tokens.push({ type: "operator", start, end: ++i });
		}
		
		return tokens;
	});

	bench("Regex (multiple attempts)", () => {
		const tokens = [];
		const patterns = [
			/^>>>/,
			/^===/,
			/^<<</,
			/^\?\?\?/,
			/^\.\.\./,
			/^\*\*\*/,
			/^&&&/,
			/^\|\|\|/,
			/^\^\^\^/,
			/^~~~/,
			/^./,  // fallback
		];
		
		let remaining = complex_code;
		let position = 0;
		
		while (remaining.length > 0) {
			for (const pattern of patterns) {
				const match = remaining.match(pattern);
				if (match) {
					tokens.push({
						type: "operator",
						start: position,
						end: position + match[0].length,
					});
					position += match[0].length;
					remaining = remaining.slice(match[0].length);
					break;
				}
			}
		}
		
		return tokens;
	});
});