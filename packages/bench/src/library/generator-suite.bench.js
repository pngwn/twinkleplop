import { bench, describe } from "vitest";

// ============================================================================
// HTML Generation and String Building Suite
// Benchmarks for HTML escaping and string building strategies
// ============================================================================

// Test strings with varying escape needs
const noEscapeSmall = "Hello world this is a simple test string with no special characters";
const fewEscapeSmall = "This has <some> HTML & a few \"special\" chars that need 'escaping'";
const manyEscapeSmall = "<div class=\"test\" data-value='test&value'>Content & more</div>";

const mixedContent = `
function test() {
	const html = "<div class='container'>";
	const data = { name: "Test & Co.", value: "Some <value>" };
	return html + "</div>";
}`.trim();

// ============================================================================
// HTML Escaping Strategies
// ============================================================================

// Character scanning with lookup table
function escapeHtmlLookup(text) {
	let result = "";
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		switch (char) {
			case "&": result += "&amp;"; break;
			case "<": result += "&lt;"; break;
			case ">": result += "&gt;"; break;
			case '"': result += "&quot;"; break;
			case "'": result += "&#39;"; break;
			default: result += char;
		}
	}
	return result;
}

// CharCode lookup (optimized)
function escapeHtmlCharCode(text) {
	let result = "";
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (code === 38) result += "&amp;";        // &
		else if (code === 60) result += "&lt;";    // <
		else if (code === 62) result += "&gt;";    // >
		else if (code === 34) result += "&quot;";  // "
		else if (code === 39) result += "&#39;";   // '
		else result += text[i];
	}
	return result;
}

// Regex replace
function escapeHtmlRegex(text) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

// Array join (check-first optimization)
function escapeHtmlArray(text) {
	if (!/[&<>"']/.test(text)) return text;
	
	const parts = [];
	let last = 0;
	
	for (let i = 0; i < text.length; i++) {
		let escape;
		const char = text[i];
		
		if (char === "&") escape = "&amp;";
		else if (char === "<") escape = "&lt;";
		else if (char === ">") escape = "&gt;";
		else if (char === '"') escape = "&quot;";
		else if (char === "'") escape = "&#39;";
		else continue;
		
		if (i > last) parts.push(text.slice(last, i));
		parts.push(escape);
		last = i + 1;
	}
	
	if (last < text.length) parts.push(text.slice(last));
	return parts.join("");
}

describe("HTML Escape - No special characters", () => {
	bench("CharCode lookup", () => {
		escapeHtmlCharCode(noEscapeSmall);
	});

	bench("Switch lookup", () => {
		escapeHtmlLookup(noEscapeSmall);
	});

	bench("Regex replace", () => {
		escapeHtmlRegex(noEscapeSmall);
	});

	bench("Array join (check-first)", () => {
		escapeHtmlArray(noEscapeSmall);
	});
});

describe("HTML Escape - Few special characters", () => {
	bench("CharCode lookup", () => {
		escapeHtmlCharCode(fewEscapeSmall);
	});

	bench("Switch lookup", () => {
		escapeHtmlLookup(fewEscapeSmall);
	});

	bench("Regex replace", () => {
		escapeHtmlRegex(fewEscapeSmall);
	});

	bench("Array join (check-first)", () => {
		escapeHtmlArray(fewEscapeSmall);
	});
});

describe("HTML Escape - Many special characters", () => {
	bench("CharCode lookup", () => {
		escapeHtmlCharCode(manyEscapeSmall);
	});

	bench("Switch lookup", () => {
		escapeHtmlLookup(manyEscapeSmall);
	});

	bench("Regex replace", () => {
		escapeHtmlRegex(manyEscapeSmall);
	});

	bench("Array join (check-first)", () => {
		escapeHtmlArray(manyEscapeSmall);
	});
});

// ============================================================================
// String Building Strategies
// ============================================================================

// Generate mock tokens
function generateTokens(count) {
	const tokens = new Uint32Array(count * 3);
	const tokenTypes = ["keyword", "string", "comment", "number", "identifier", "operator"];
	const typeMap = new Array(tokenTypes.length);
	
	for (let i = 0; i < tokenTypes.length; i++) {
		typeMap[i] = tokenTypes[i];
	}
	
	let pos = 0;
	for (let i = 0; i < count; i++) {
		const tokenLength = Math.floor(Math.random() * 20) + 1;
		tokens[i * 3] = i % tokenTypes.length; // token type index
		tokens[i * 3 + 1] = pos; // start
		tokens[i * 3 + 2] = pos + tokenLength; // end
		pos += tokenLength + Math.floor(Math.random() * 3); // add some gaps
	}
	
	return { tokens, tokenTypes: typeMap, totalLength: pos };
}

// Generate test input
function generateInput(length) {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 \n\t";
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars[Math.floor(Math.random() * chars.length)];
	}
	return result;
}

const smallTokenData = generateTokens(100);
const smallInput = generateInput(smallTokenData.totalLength);

const mediumTokenData = generateTokens(1000);
const mediumInput = generateInput(mediumTokenData.totalLength);

// String concatenation
function buildWithConcat(input, tokens, tokenTypes) {
	let result = "";
	let lastEnd = 0;
	
	for (let i = 0; i < tokens.length / 3; i++) {
		const type = tokens[i * 3];
		const start = tokens[i * 3 + 1];
		const end = tokens[i * 3 + 2];
		
		// Add any text before this token
		if (start > lastEnd) {
			result += input.slice(lastEnd, start);
		}
		
		// Add the token with wrapping
		result += `<span class="${tokenTypes[type]}">`;
		result += input.slice(start, end);
		result += "</span>";
		
		lastEnd = end;
	}
	
	// Add any remaining text
	if (lastEnd < input.length) {
		result += input.slice(lastEnd);
	}
	
	return result;
}

// Array join
function buildWithArray(input, tokens, tokenTypes) {
	const parts = [];
	let lastEnd = 0;
	
	for (let i = 0; i < tokens.length / 3; i++) {
		const type = tokens[i * 3];
		const start = tokens[i * 3 + 1];
		const end = tokens[i * 3 + 2];
		
		// Add any text before this token
		if (start > lastEnd) {
			parts.push(input.slice(lastEnd, start));
		}
		
		// Add the token with wrapping
		parts.push(`<span class="${tokenTypes[type]}">`);
		parts.push(input.slice(start, end));
		parts.push("</span>");
		
		lastEnd = end;
	}
	
	// Add any remaining text
	if (lastEnd < input.length) {
		parts.push(input.slice(lastEnd));
	}
	
	return parts.join("");
}

// Pre-sized array
function buildWithPresizedArray(input, tokens, tokenTypes) {
	// Estimate size: each token adds 3 parts, plus gaps
	const estimatedParts = (tokens.length / 3) * 3 + 100;
	const parts = new Array(estimatedParts);
	let partIndex = 0;
	let lastEnd = 0;
	
	for (let i = 0; i < tokens.length / 3; i++) {
		const type = tokens[i * 3];
		const start = tokens[i * 3 + 1];
		const end = tokens[i * 3 + 2];
		
		// Add any text before this token
		if (start > lastEnd) {
			parts[partIndex++] = input.slice(lastEnd, start);
		}
		
		// Add the token with wrapping
		parts[partIndex++] = `<span class="${tokenTypes[type]}">`;
		parts[partIndex++] = input.slice(start, end);
		parts[partIndex++] = "</span>";
		
		lastEnd = end;
	}
	
	// Add any remaining text
	if (lastEnd < input.length) {
		parts[partIndex++] = input.slice(lastEnd);
	}
	
	// Trim array to actual size and join
	parts.length = partIndex;
	return parts.join("");
}

describe("String Building - Small (100 tokens)", () => {
	bench("String concatenation", () => {
		buildWithConcat(smallInput, smallTokenData.tokens, smallTokenData.tokenTypes);
	});

	bench("Array join", () => {
		buildWithArray(smallInput, smallTokenData.tokens, smallTokenData.tokenTypes);
	});

	bench("Pre-sized array", () => {
		buildWithPresizedArray(smallInput, smallTokenData.tokens, smallTokenData.tokenTypes);
	});
});

describe("String Building - Medium (1000 tokens)", () => {
	bench("String concatenation", () => {
		buildWithConcat(mediumInput, mediumTokenData.tokens, mediumTokenData.tokenTypes);
	});

	bench("Array join", () => {
		buildWithArray(mediumInput, mediumTokenData.tokens, mediumTokenData.tokenTypes);
	});

	bench("Pre-sized array", () => {
		buildWithPresizedArray(mediumInput, mediumTokenData.tokens, mediumTokenData.tokenTypes);
	});
});