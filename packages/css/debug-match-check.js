// Simulate what the tokenizer should be doing

const input = "div { transform: translateY(-100px); }";
const pos = 28; // Position of the dash

console.log("Input:", input);
console.log("Position:", pos, "char:", input[pos]);

// Simulate the pattern matching for "--"
const patternCodes = [45, 45]; // "--" 
const patternLength = 2;

console.log("\nPattern to match: '--' codes:", patternCodes);
console.log("Pattern length:", patternLength);

// Check if we have enough characters
if (pos + patternLength > input.length) {
	console.log("Not enough characters left");
} else {
	console.log("Have enough characters");
	
	// Check each character
	let matched = true;
	for (let i = 0; i < patternLength; i++) {
		const inputChar = input.charCodeAt(pos + i);
		const patternChar = patternCodes[i];
		console.log(`  Position ${pos + i}: input='${String.fromCharCode(inputChar)}' (${inputChar}) vs pattern='${String.fromCharCode(patternChar)}' (${patternChar})`);
		
		if (inputChar !== patternChar) {
			console.log("    -> MISMATCH");
			matched = false;
			break;
		} else {
			console.log("    -> match");
		}
	}
	
	console.log("\nFinal result: matched =", matched);
}

// The tokenizer code does this (starting from i=1 since first char is known to match):
console.log("\n\nTokenizer algorithm (starts from i=1):");
let matched2 = true;
for (let i = 1; i < patternLength; i++) {
	const inputChar = input.charCodeAt(pos + i);
	const patternChar = patternCodes[i];
	console.log(`  i=${i}, Position ${pos + i}: input='${String.fromCharCode(inputChar)}' (${inputChar}) vs pattern='${String.fromCharCode(patternChar)}' (${patternChar})`);
	
	if (inputChar !== patternChar) {
		console.log("    -> MISMATCH");
		matched2 = false;
		break;
	} else {
		console.log("    -> match");
	}
}
console.log("Result:", matched2);