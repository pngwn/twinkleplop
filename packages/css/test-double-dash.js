// Test if -- is matching single dash incorrectly

const testString = "-100px";
console.log("String:", testString);
console.log("Starts with '--':", testString.startsWith("--"));
console.log("Starts with '-':", testString.startsWith("-"));
console.log("First two chars:", testString.slice(0, 2));

// The CSS grammar check
if (testString[0] === '-' && testString[1] === '-') {
	console.log("Would match -- rule");
} else if (testString[0] === '-') {
	console.log("Would match - rule");
}