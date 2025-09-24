import fs from 'fs';

const testCode = fs.readFileSync('./test/nested_selectors.css', 'utf-8');

console.log("Characters around position 110-120:");
for (let i = 110; i < 120; i++) {
	const char = testCode[i];
	console.log(`  pos ${i}: '${char}' (code: ${testCode.charCodeAt(i)}, char: '${char.replace(/\n/g, '\\n').replace(/\t/g, '\\t')}')`);
}