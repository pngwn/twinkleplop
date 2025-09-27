import { TokenizeResult } from "./types";

// Pre-escaped lookup table for common characters
const ESCAPE_TABLE = new Array(128);
for (let i = 0; i < 128; i++) {
	ESCAPE_TABLE[i] = String.fromCharCode(i);
}
ESCAPE_TABLE[38] = "&amp;"; // &
ESCAPE_TABLE[60] = "&lt;"; // <
ESCAPE_TABLE[62] = "&gt;"; // >
ESCAPE_TABLE[34] = "&quot;"; // "
ESCAPE_TABLE[39] = "&#39;"; // '

// Pre-create escape check lookup for faster checking (minor improvement)
const NEEDS_ESCAPE = new Uint8Array(128);
NEEDS_ESCAPE[38] = 1;
NEEDS_ESCAPE[60] = 1;
NEEDS_ESCAPE[62] = 1;
NEEDS_ESCAPE[34] = 1;
NEEDS_ESCAPE[39] = 1;

// Optimized HTML generator with selective improvements
export function toHtml(
	input: string,
	tokenResult: TokenizeResult,
	options: { className?: string; lineNumbers?: boolean } = {}
) {
	const { tokens, tokenTypes } = tokenResult;
	const { className = "highlight", lineNumbers = false } = options;

	// Estimate output size and use chunked building for large inputs
	const tokenCount = tokens.length / 3;
	const useChunking = input.length > 10000; // Use chunking for files > 10KB

	if (useChunking) {
		return toHtmlChunked(input, tokenResult, options);
	}

	// For smaller files, use pre-sized array approach
	// Pre-size array based on rough estimation (4 elements per token + overhead)
	const estimatedChunks = tokenCount * 4 + 10;
	const chunks = new Array(estimatedChunks);
	let chunkCount = 0;

	chunks[chunkCount++] = `<pre class="${className}"><code>`;

	let lastEnd = 0;
	let prevTokenType = null;
	let spanOpen = false;

	// Process tokens with coalescing
	for (let i = 0; i < tokens.length; i += 3) {
		const tokenType = tokenTypes[tokens[i]];
		const start = tokens[i + 1];
		const end = tokens[i + 2];

		// Handle untokenized content
		if (start > lastEnd) {
			if (spanOpen) {
				chunks[chunkCount++] = "</span>";
				spanOpen = false;
			}
			chunks[chunkCount++] = escapeSubstringOptimized(input, lastEnd, start);
			prevTokenType = null;
		}

		// Coalesce adjacent tokens of the same type
		if (tokenType !== prevTokenType) {
			if (spanOpen) {
				chunks[chunkCount++] = "</span>";
			}
			chunks[chunkCount++] = `<span class="${tokenType}">`;
			spanOpen = true;
			prevTokenType = tokenType;
		}

		// Add token content
		chunks[chunkCount++] = escapeSubstringOptimized(input, start, end);
		lastEnd = end;
	}

	// Close any open span
	if (spanOpen) {
		chunks[chunkCount++] = "</span>";
	}

	// Handle remaining content
	if (lastEnd < input.length) {
		chunks[chunkCount++] = escapeSubstringOptimized(
			input,
			lastEnd,
			input.length
		);
	}

	chunks[chunkCount++] = "</code></pre>";

	return chunks.slice(0, chunkCount).join("");
}

// Chunked version for very large files - same as original
function toHtmlChunked(
	input: string,
	tokenResult: TokenizeResult,
	options: { className?: string } = {}
) {
	const { tokens, tokenTypes } = tokenResult;
	const { className = "highlight" } = options;

	const chunks = [];
	const maxChunkSize = 65536; // 64KB chunks
	let currentChunk = [];
	let chunkSize = 0;

	currentChunk.push(`<pre class="${className}"><code>`);
	chunkSize += currentChunk[0].length;

	let lastEnd = 0;
	let prevTokenType = null;
	let spanOpen = false;

	// Process tokens with batching
	for (let i = 0; i < tokens.length; i += 3) {
		const tokenType = tokenTypes[tokens[i]];
		const start = tokens[i + 1];
		const end = tokens[i + 2];

		// Skip tiny tokens (like single spaces) if same type as previous
		const tokenLength = end - start;
		if (tokenLength === 1 && tokenType === prevTokenType) {
			const char = input[start];
			const code = char.charCodeAt(0);
			const escaped =
				code < 128 && ESCAPE_TABLE[code] !== char ? ESCAPE_TABLE[code] : char;
			currentChunk.push(escaped);
			chunkSize += escaped.length;
			lastEnd = end;

			// Flush chunk if too large
			if (chunkSize > maxChunkSize) {
				chunks.push(currentChunk.join(""));
				currentChunk = [];
				chunkSize = 0;
			}
			continue;
		}

		// Handle untokenized content
		if (start > lastEnd) {
			if (spanOpen) {
				currentChunk.push("</span>");
				chunkSize += 7;
				spanOpen = false;
			}
			const escaped = escapeSubstringOptimized(input, lastEnd, start);
			currentChunk.push(escaped);
			chunkSize += escaped.length;
			prevTokenType = null;
		}

		// Change token type if needed
		if (tokenType !== prevTokenType) {
			if (spanOpen) {
				currentChunk.push("</span>");
				chunkSize += 7;
			}
			const openTag = `<span class="${tokenType}">`;
			currentChunk.push(openTag);
			chunkSize += openTag.length;
			spanOpen = true;
			prevTokenType = tokenType;
		}

		// Add token content
		const escaped = escapeSubstringOptimized(input, start, end);
		currentChunk.push(escaped);
		chunkSize += escaped.length;
		lastEnd = end;

		// Flush chunk if too large
		if (chunkSize > maxChunkSize) {
			chunks.push(currentChunk.join(""));
			currentChunk = [];
			chunkSize = 0;
		}
	}

	// Close any open span
	if (spanOpen) {
		currentChunk.push("</span>");
	}

	// Handle remaining content
	if (lastEnd < input.length) {
		currentChunk.push(escapeSubstringOptimized(input, lastEnd, input.length));
	}

	currentChunk.push("</code></pre>");

	// Final flush
	if (currentChunk.length > 0) {
		chunks.push(currentChunk.join(""));
	}

	return chunks.join("");
}

// Optimized escape function with early exit for no-escape case
function escapeSubstringOptimized(input: string, start: number, end: number) {
	// Fast path - scan for any characters that need escaping
	let needsEscape = false;
	for (let i = start; i < end; i++) {
		const code = input.charCodeAt(i);
		// Keep original OR conditions as they're fastest
		if (
			code === 38 ||
			code === 60 ||
			code === 62 ||
			code === 34 ||
			code === 39
		) {
			needsEscape = true;
			break;
		}
	}

	// If no escaping needed, return substring directly
	if (!needsEscape) {
		return input.substring(start, end);
	}

	// Slow path - build escaped string
	let result = "";
	let chunkStart = start;

	for (let i = start; i < end; i++) {
		const code = input.charCodeAt(i);

		// Fast path - check if escaping needed
		if (
			code === 38 ||
			code === 60 ||
			code === 62 ||
			code === 34 ||
			code === 39
		) {
			// Need escaping - flush previous chunk
			if (i > chunkStart) {
				result += input.substring(chunkStart, i);
			}
			result += ESCAPE_TABLE[code];
			chunkStart = i + 1;
		}
	}

	// Add remaining chunk
	if (end > chunkStart) {
		result += input.substring(chunkStart, end);
	}

	return result;
}

// Optimized standalone escapeHtml with early exit
export function escapeHtml(text: string) {
	const len = text.length;

	// Fast path - check if escaping is needed
	let needsEscape = false;
	for (let i = 0; i < len; i++) {
		const code = text.charCodeAt(i);
		if (
			code === 38 ||
			code === 60 ||
			code === 62 ||
			code === 34 ||
			code === 39
		) {
			needsEscape = true;
			break;
		}
	}

	// Early exit if no escaping needed
	if (!needsEscape) {
		return text;
	}

	// Slow path - build escaped string
	let result = "";
	let chunkStart = 0;

	for (let i = 0; i < len; i++) {
		const code = text.charCodeAt(i);

		if (
			code === 38 ||
			code === 60 ||
			code === 62 ||
			code === 34 ||
			code === 39
		) {
			// Need escaping
			if (i > chunkStart) {
				result += text.substring(chunkStart, i);
			}
			result += ESCAPE_TABLE[code];
			chunkStart = i + 1;
		}
	}

	// Add remaining
	if (len > chunkStart) {
		result += text.substring(chunkStart, len);
	}

	return result;
}
