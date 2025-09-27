import { bench, describe } from "vitest";

// ============================================================================
// Data Structures and Optimization Suite
// Benchmarks for token storage, lookup tables, and state management
// ============================================================================

describe("Token Storage Strategies", () => {
	const tokenCount = 1000;

	bench("Flat Uint32Array (triplets)", () => {
		const tokens = new Uint32Array(tokenCount * 3);
		
		// Write tokens
		for (let i = 0; i < tokenCount; i++) {
			tokens[i * 3] = i % 20;     // type
			tokens[i * 3 + 1] = i * 10; // start
			tokens[i * 3 + 2] = i * 10 + 8; // end
		}
		
		// Read tokens
		let sum = 0;
		for (let i = 0; i < tokenCount; i++) {
			const type = tokens[i * 3];
			const start = tokens[i * 3 + 1];
			const end = tokens[i * 3 + 2];
			sum += type + start + end;
		}
		
		return sum;
	});

	bench("Array of Objects", () => {
		const tokens = [];
		
		// Write tokens
		for (let i = 0; i < tokenCount; i++) {
			tokens.push({
				type: i % 20,
				start: i * 10,
				end: i * 10 + 8,
			});
		}
		
		// Read tokens
		let sum = 0;
		for (let i = 0; i < tokenCount; i++) {
			const { type, start, end } = tokens[i];
			sum += type + start + end;
		}
		
		return sum;
	});

	bench("Structure of Arrays (SoA)", () => {
		const types = new Uint8Array(tokenCount);
		const starts = new Uint32Array(tokenCount);
		const ends = new Uint32Array(tokenCount);
		
		// Write tokens
		for (let i = 0; i < tokenCount; i++) {
			types[i] = i % 20;
			starts[i] = i * 10;
			ends[i] = i * 10 + 8;
		}
		
		// Read tokens
		let sum = 0;
		for (let i = 0; i < tokenCount; i++) {
			sum += types[i] + starts[i] + ends[i];
		}
		
		return sum;
	});

	bench("Array of Arrays", () => {
		const tokens = [];
		
		// Write tokens
		for (let i = 0; i < tokenCount; i++) {
			tokens.push([i % 20, i * 10, i * 10 + 8]);
		}
		
		// Read tokens
		let sum = 0;
		for (let i = 0; i < tokenCount; i++) {
			const [type, start, end] = tokens[i];
			sum += type + start + end;
		}
		
		return sum;
	});
});

describe("Lookup Table Performance", () => {
	// ASCII character classification
	const isAlpha = new Uint8Array(128);
	const isDigit = new Uint8Array(128);
	const isWhitespace = new Uint8Array(128);
	
	// Initialize lookup tables
	for (let i = 65; i <= 90; i++) isAlpha[i] = 1;  // A-Z
	for (let i = 97; i <= 122; i++) isAlpha[i] = 1; // a-z
	for (let i = 48; i <= 57; i++) isDigit[i] = 1;  // 0-9
	isWhitespace[32] = 1; // space
	isWhitespace[9] = 1;  // tab
	isWhitespace[10] = 1; // newline
	isWhitespace[13] = 1; // carriage return

	const testString = "Hello123 World456\n\tTest789";

	bench("Uint8Array Lookup", () => {
		let alphaCount = 0;
		let digitCount = 0;
		let wsCount = 0;
		
		for (let i = 0; i < testString.length; i++) {
			const char = testString.charCodeAt(i);
			if (char < 128) {
				if (isAlpha[char]) alphaCount++;
				if (isDigit[char]) digitCount++;
				if (isWhitespace[char]) wsCount++;
			}
		}
		
		return { alphaCount, digitCount, wsCount };
	});

	bench("Direct Comparison", () => {
		let alphaCount = 0;
		let digitCount = 0;
		let wsCount = 0;
		
		for (let i = 0; i < testString.length; i++) {
			const char = testString.charCodeAt(i);
			if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
				alphaCount++;
			}
			if (char >= 48 && char <= 57) {
				digitCount++;
			}
			if (char === 32 || char === 9 || char === 10 || char === 13) {
				wsCount++;
			}
		}
		
		return { alphaCount, digitCount, wsCount };
	});

	bench("Set Lookup", () => {
		const alphaSet = new Set();
		const digitSet = new Set();
		const wsSet = new Set([32, 9, 10, 13]);
		
		for (let i = 65; i <= 90; i++) alphaSet.add(i);
		for (let i = 97; i <= 122; i++) alphaSet.add(i);
		for (let i = 48; i <= 57; i++) digitSet.add(i);
		
		let alphaCount = 0;
		let digitCount = 0;
		let wsCount = 0;
		
		for (let i = 0; i < testString.length; i++) {
			const char = testString.charCodeAt(i);
			if (alphaSet.has(char)) alphaCount++;
			if (digitSet.has(char)) digitCount++;
			if (wsSet.has(char)) wsCount++;
		}
		
		return { alphaCount, digitCount, wsCount };
	});

	bench("Map Lookup", () => {
		const charTypes = new Map();
		
		for (let i = 65; i <= 90; i++) charTypes.set(i, "alpha");
		for (let i = 97; i <= 122; i++) charTypes.set(i, "alpha");
		for (let i = 48; i <= 57; i++) charTypes.set(i, "digit");
		charTypes.set(32, "whitespace");
		charTypes.set(9, "whitespace");
		charTypes.set(10, "whitespace");
		charTypes.set(13, "whitespace");
		
		let alphaCount = 0;
		let digitCount = 0;
		let wsCount = 0;
		
		for (let i = 0; i < testString.length; i++) {
			const type = charTypes.get(testString.charCodeAt(i));
			if (type === "alpha") alphaCount++;
			else if (type === "digit") digitCount++;
			else if (type === "whitespace") wsCount++;
		}
		
		return { alphaCount, digitCount, wsCount };
	});
});

describe("State Machine Transitions", () => {
	const stateCount = 10;
	const actionCount = 5;

	bench("Computed Index (integer keys)", () => {
		// Flat array: [newState, tokenType, stackOp]
		const transitions = new Uint8Array(stateCount * actionCount * 3);
		
		// Initialize some transitions
		for (let s = 0; s < stateCount; s++) {
			for (let a = 0; a < actionCount; a++) {
				const idx = (s * actionCount + a) * 3;
				transitions[idx] = (s + 1) % stateCount;     // next state
				transitions[idx + 1] = a;                     // token type
				transitions[idx + 2] = 0;                     // no stack op
			}
		}
		
		// Simulate state machine execution
		let state = 0;
		let tokenCount = 0;
		
		for (let i = 0; i < 1000; i++) {
			const action = i % actionCount;
			const idx = (state * actionCount + action) * 3;
			state = transitions[idx];
			const tokenType = transitions[idx + 1];
			if (tokenType > 0) tokenCount++;
		}
		
		return tokenCount;
	});

	bench("Map with string keys", () => {
		const transitions = new Map();
		
		// Initialize transitions
		for (let s = 0; s < stateCount; s++) {
			for (let a = 0; a < actionCount; a++) {
				transitions.set(`${s},${a}`, {
					nextState: (s + 1) % stateCount,
					tokenType: a,
					stackOp: 0,
				});
			}
		}
		
		// Simulate state machine execution
		let state = 0;
		let tokenCount = 0;
		
		for (let i = 0; i < 1000; i++) {
			const action = i % actionCount;
			const transition = transitions.get(`${state},${action}`);
			if (transition) {
				state = transition.nextState;
				if (transition.tokenType > 0) tokenCount++;
			}
		}
		
		return tokenCount;
	});

	bench("Nested Objects", () => {
		const transitions = {};
		
		// Initialize transitions
		for (let s = 0; s < stateCount; s++) {
			transitions[s] = {};
			for (let a = 0; a < actionCount; a++) {
				transitions[s][a] = {
					nextState: (s + 1) % stateCount,
					tokenType: a,
					stackOp: 0,
				};
			}
		}
		
		// Simulate state machine execution
		let state = 0;
		let tokenCount = 0;
		
		for (let i = 0; i < 1000; i++) {
			const action = i % actionCount;
			const transition = transitions[state][action];
			if (transition) {
				state = transition.nextState;
				if (transition.tokenType > 0) tokenCount++;
			}
		}
		
		return tokenCount;
	});
});

describe("Token Type Mapping", () => {
	const tokenTypes = [
		"keyword", "identifier", "string", "number", "comment",
		"operator", "punctuation", "whitespace", "bracket", "semicolon"
	];

	bench("Integer with Array Lookup", () => {
		// Map token names to integers
		const typeToInt = {};
		const intToType = [];
		
		tokenTypes.forEach((type, i) => {
			typeToInt[type] = i;
			intToType[i] = type;
		});
		
		// Simulate tokenization with integer types
		const tokens = [];
		for (let i = 0; i < 100; i++) {
			tokens.push(typeToInt[tokenTypes[i % tokenTypes.length]]);
		}
		
		// Convert back for rendering
		const results = [];
		for (const token of tokens) {
			results.push(intToType[token]);
		}
		
		return results.length;
	});

	bench("String Keys Directly", () => {
		// Use strings directly
		const tokens = [];
		for (let i = 0; i < 100; i++) {
			tokens.push(tokenTypes[i % tokenTypes.length]);
		}
		
		// No conversion needed for rendering
		const results = [];
		for (const token of tokens) {
			results.push(token);
		}
		
		return results.length;
	});

	bench("Map Lookup", () => {
		const typeMap = new Map();
		tokenTypes.forEach((type, i) => {
			typeMap.set(type, i);
		});
		
		const reverseMap = new Map();
		tokenTypes.forEach((type, i) => {
			reverseMap.set(i, type);
		});
		
		// Simulate tokenization
		const tokens = [];
		for (let i = 0; i < 100; i++) {
			const type = tokenTypes[i % tokenTypes.length];
			tokens.push(typeMap.get(type));
		}
		
		// Convert back for rendering
		const results = [];
		for (const token of tokens) {
			results.push(reverseMap.get(token));
		}
		
		return results.length;
	});
});

describe("Stack Operations", () => {
	bench("Pre-allocated Uint8Array", () => {
		const stack = new Uint8Array(256);
		let stackPtr = 0;
		let operations = 0;
		
		for (let i = 0; i < 1000; i++) {
			if (i % 3 === 0 && stackPtr < 255) {
				// Push
				stack[stackPtr++] = i % 10;
				operations++;
			} else if (stackPtr > 0) {
				// Pop
				const value = stack[--stackPtr];
				operations += value;
			}
		}
		
		return operations;
	});

	bench("JavaScript Array", () => {
		const stack = [];
		let operations = 0;
		
		for (let i = 0; i < 1000; i++) {
			if (i % 3 === 0 && stack.length < 255) {
				// Push
				stack.push(i % 10);
				operations++;
			} else if (stack.length > 0) {
				// Pop
				const value = stack.pop();
				operations += value;
			}
		}
		
		return operations;
	});

	bench("Bit-packed for shallow nesting", () => {
		let stack = 0;  // 32-bit integer, supports 8 states of 4 bits each
		let depth = 0;
		let operations = 0;
		
		for (let i = 0; i < 1000; i++) {
			if (i % 3 === 0 && depth < 8) {
				// Push (4-bit value)
				stack = (stack << 4) | (i % 10);
				depth++;
				operations++;
			} else if (depth > 0) {
				// Pop
				const value = stack & 0xF;
				stack = stack >>> 4;
				depth--;
				operations += value;
			}
		}
		
		return operations;
	});
});