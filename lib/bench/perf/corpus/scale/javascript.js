// ---- arrow_functions.txt ----
// Simple arrow function
const add = (a, b) => a + b;

// No parameters
const greet = () => "Hello";

// Single parameter (no parens)
const double = x => x * 2;

// Block body
const calculate = (x, y) => {
  const sum = x + y;
  return sum * 2;
};

// Returning object literal
const makeUser = name => ({ name, id: 1 });

// Async arrow function
const fetchData = async () => await fetch(url);

// Arrow function in array methods
[1, 2, 3].map(n => n * 2);
items.filter(item => item.active);
data.reduce((acc, val) => acc + val, 0);

// ---- async_await.txt ----
// Async function declaration
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return await response.json();
}

// Async function expression
const getData = async function() {
  return await database.query();
};

// Async arrow function
const processData = async (data) => {
  const result = await transform(data);
  return result;
};

// Try-catch with async/await
async function safeFetch() {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    console.error(error);
  }
}

// Multiple awaits
async function sequential() {
  const first = await getFirst();
  const second = await getSecond(first);
  const third = await getThird(second);
  return third;
}

// Parallel awaits
async function parallel() {
  const [a, b, c] = await Promise.all([
    fetchA(),
    fetchB(),
    fetchC()
  ]);
  return { a, b, c };
}

// Async in class methods
class Service {
  async initialize() {
    this.data = await loadData();
  }
  
  async process() {
    return await this.transform();
  }
}

// Top-level await (modules)
const config = await loadConfig();
export default await initializeApp();

// ---- boolean.txt ----
true; false;


// ---- class_name.txt ----
class Foo
interface bar
extends Foo
implements bar
trait Foo
instanceof \bar
new \Foo
catch (bar)

// ---- classes.txt ----
// Basic class
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    console.log(`${this.name} makes a sound`);
  }
}

// Class inheritance
class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }

  speak() {
    super.speak();
    console.log('Woof!');
  }
}

// Static members
class MathUtils {
  static PI = 3.14159;

  static calculateArea(radius) {
    return this.PI * radius ** 2;
  }
}

// Private fields
class Person {
  #privateField;
  #privateMethod() {}

  constructor(name) {
    this.#privateField = name;
  }

  get name() {
    return this.#privateField;
  }
}

// Class expressions
const MyClass = class {
  constructor() {}
};

const NamedClass = class CustomName {
  static getName() {
    return CustomName.name;
  }
};

// Getters and setters
class Temperature {
  #celsius;

  get celsius() {
    return this.#celsius;
  }

  set celsius(value) {
    this.#celsius = value;
  }

  get fahrenheit() {
    return this.#celsius * 9/5 + 32;
  }

  set fahrenheit(value) {
    this.#celsius = (value - 32) * 5/9;
  }
}

// Static initialization blocks
class Config {
  static data;

  static {
    this.data = loadConfig();
  }
}


// ---- comment.txt ----
// foobar
/**/
/* foo
bar */

/*
//
*/

// ---- control_flow.txt ----
// If-else statements
if (condition) {
  doSomething();
} else if (otherCondition) {
  doSomethingElse();
} else {
  doDefault();
}

// Ternary operator
const result = condition ? valueIfTrue : valueIfFalse;
const nested = a ? b ? c : d : e;

// Switch statement
switch (value) {
  case 1:
    handleOne();
    break;
  case 2:
  case 3:
    handleTwoOrThree();
    break;
  default:
    handleDefault();
}

// For loops
for (let i = 0; i < 10; i++) {
  console.log(i);
}

for (const item of array) {
  process(item);
}

for (const key in object) {
  if (object.hasOwnProperty(key)) {
    handle(object[key]);
  }
}

// While loops
while (condition) {
  doWork();
}

do {
  attemptOperation();
} while (shouldRetry);

// Try-catch-finally
try {
  riskyOperation();
} catch (error) {
  handleError(error);
} finally {
  cleanup();
}

// Throw statements
throw new Error('Something went wrong');
throw { code: 'INVALID', message: 'Invalid input' };

// Break and continue
for (let i = 0; i < 10; i++) {
  if (i === 5) continue;
  if (i === 8) break;
  process(i);
}

// Labeled statements
outer: for (let i = 0; i < 3; i++) {
  inner: for (let j = 0; j < 3; j++) {
    if (i === j) continue outer;
    if (j === 2) break inner;
  }
}

// ---- destructuring.txt ----
// Array destructuring
const [a, b] = [1, 2];
const [first, , third] = array;
const [head, ...tail] = list;

// Object destructuring
const { name, age } = person;
const { x: newX, y: newY } = point;
const { prop = 'default' } = obj;

// Nested destructuring
const { user: { name, email } } = data;
const [{ id }, { title }] = items;

// Mixed destructuring
const { data: [first, second] } = response;

// Function parameters
function process({ id, name }) {}
const handler = ({ type, payload }) => {};

// Rest in objects
const { a, b, ...rest } = object;
const { ...copy } = original;

// Destructuring with renaming and defaults
const { 
  name: userName = 'Anonymous',
  role: userRole = 'guest'
} = user;

// Complex patterns
const [
  {
    meta: { version }
  },
  ...entries
] = data;

// ---- function_call.txt ----
foo()

foo_bar()

f42()

fn(1, 2, 3, "hello", true)

fn(1, 2, 3, "hello", true);

// ---- function_def.txt ----
foo() {

}

foo_bar(one, two, three) {

}


const foo = (x, y) => x + y;

const bar = async (x, y) => x + y;

const baz = function() {

}

const obj = {
  foo() {
  },
  bar: (x, y) => x + y,
  baz: async (x, y) => x + y,
}

const foo = (a, (b, c)) => (a, b, c)
const foo = cond ? () => 1 : () => 2
const foo = foo = (() => fn)()
const foo = (a, (b, (c, d))) => (a, b, c, d)


// ---- generators_iterators.txt ----
// Generator functions
function* simpleGenerator() {
  yield 1;
  yield 2;
  yield 3;
}

// Generator with parameters
function* fibonacci(n) {
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// Yield delegation
function* delegator() {
  yield* [1, 2, 3];
  yield* otherGenerator();
}

// Async generators
async function* asyncGenerator() {
  yield await fetchData(1);
  yield await fetchData(2);
  yield await fetchData(3);
}

// Iterator protocol
const iterator = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next() {
        return i < 10
          ? { value: i++, done: false }
          : { done: true };
      }
    };
  }
};

// Generator expressions
const gen = (function* () {
  yield* range(1, 10);
})();

// Yield in expressions
function* expressionYield() {
  const x = yield 1;
  const y = 2 + (yield 3);
  return x + y;
}

// For-of with generators
for (const value of simpleGenerator()) {
  console.log(value);
}

// Async iteration
for await (const chunk of asyncGenerator()) {
  process(chunk);
}

// ---- keywords.txt ----
if; else; while; do; for;
return; in; instanceof; function; new;
try; throw; catch; finally; null;
break; continue;

// ---- modern_operators.txt ----
// Nullish coalescing (??)
const value = input ?? defaultValue;
const port = process.env.PORT ?? 3000;
config.timeout = options.timeout ?? 5000;

// Optional chaining (?.)
const city = user?.address?.city;
const result = obj?.method?.();
const item = arr?.[index];
const value = func?.();

// Logical assignment operators
x ||= 1;  // x = x || 1
y &&= 2;  // y = y && 2
z ??= 3;  // z = z ?? 3

// Exponentiation (**)
const squared = 2 ** 2;
const cubed = 3 ** 3;
base **= exponent;

// Spread operator (...)
const newArray = [...oldArray];
const combined = [...arr1, ...arr2];
const copy = { ...original };
const merged = { ...defaults, ...options };
Math.max(...numbers);
fn(...args);

// Rest parameters
function sum(...numbers) {}
const [first, ...rest] = array;
const { a, ...others } = object;

// Bitwise operators
const shifted = value >>> 2;
flags &= ~MASK;
bits |= FLAG;
result ^= key;
value <<= 1;
value >>= 1;
value >>>= 1;

// Compound assignments
total += amount;
count -= 1;
result *= factor;
average /= count;
remainder %= divisor;

// Increment/decrement
++counter;
--index;
value++;
score--;

// ---- modules.txt ----
// Named exports
export const API_URL = 'https://api.example.com';
export let counter = 0;
export var config = {};

export function processData(data) {
  return transform(data);
}

export class DataProcessor {
  process() {}
}

// Default export
export default function main() {}
export default class Application {}
export default { key: 'value' };

// Named imports
import { Component, createElement } from 'react';
import { readFile, writeFile } from 'fs';

// Default import
import React from 'react';
import _ from 'lodash';

// Aliased imports
import { longNamedExport as short } from './module';
import { default as MyClass } from './class';

// Namespace import
import * as utils from './utils';
import * as constants from './constants';

// Mixed imports
import defaultExport, { namedExport } from './module';
import MyComponent, { helper, CONSTANT } from './component';

// Re-exports
export { field1, field2 } from './module';
export { default } from './other';
export * from './utilities';
export * as namespace from './lib';

// Dynamic imports
import('./module').then(module => {});
const module = await import('./lazy-module');

// Import assertions (JSON modules)
import data from './data.json' assert { type: 'json' };
import config from './config.json' with { type: 'json' };

// ---- number_literals.txt ----
// Integer literals
42
0
1000000

// Decimal literals
3.14159
0.5
.5
10.
1.23e4
2e10
3.14e-10

// Binary literals (ES6)
0b1010  // 10
0B1111  // 15
0b11111111  // 255

// Octal literals (ES6)
0o755  // 493
0O644  // 420
0o10   // 8

// Hexadecimal literals
0xFF    // 255
0x10    // 16
0xDEADBEEF
0X1234ABCD

// BigInt literals (ES2020)
123n
0n
1000000000000000000000n
0x1fffffffffffff
0b11111111111111111n
0o777777777777n

// Numeric separators (ES2021)
1_000_000
3.141_592_653
0xFF_FF_FF
0b1111_0000_1111_0000
123_456_789n

// Scientific notation
1e3     // 1000
1e-3    // 0.001
1.5e10
2.5e-5
6.022e23  // Avogadro's number

// Special numeric values
Infinity
-Infinity
NaN

// Number with unary operators
+42
-3.14
~15
+0xff
-0b1010

// ---- numbers.txt ----
42
3.14159
4e10
2.1e-10
0.4e+2
0xbabe
0xBABE

// ---- operators.txt ----
- + -- ++
< <= > >=
= == ===
! != !==
& && | ||
? * ~ ^ %

// bare `/` is regex
/hi/

// division
1 / 2 / 3 / 4 / 5


// ---- regex_literals.txt ----
// Simple regex literals
/pattern/
/hello world/
/\d+/
/[a-z]/

// Regex with flags
/pattern/gi
/test/img
/unicode/u
/dotall/s
/sticky/y

// Character classes
/[abc]/
/[^xyz]/
/[0-9]/
/[a-zA-Z]/
/[\w\s]/

// Quantifiers
/a*/
/b+/
/c?/
/d{3}/
/e{2,5}/
/f{4,}/

// Anchors
/^start/
/end$/
/\bword\b/
/\Bnot\B/

// Groups and alternation
/(group)/
/(?:non-capturing)/
/(?<named>group)/
/(a|b|c)/
/(?=lookahead)/
/(?!negative)/

// Escape sequences
/\./
/\\/
/\n/
/\t/
/\x41/
/\u0041/

// Complex patterns
/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}/
/(?:\d{3}|\(\d{3}\))([-\/\.])\d{3}\1\d{4}/

// Regex in context
const pattern = /test/g;
if (/^\d+$/.test(input)) {}
string.replace(/old/g, 'new');
text.match(/\w+/g);
data.split(/\s*,\s*/);

// Not regex (division operator context)
const result = 10 / 2;
const calc = a / b / c;
x = y /= 2;

// ---- strings.txt ----
""
''
"f\"oo"
'b\'ar'
"foo\
bar"
'foo\
bar'
"foo /* comment */ bar"
'foo // bar'
'foo // bar' //comment

// ---- tagged_templates.txt ----
// ==========================================================================
// Tagged template literals — JS hosting HTML and CSS via the reclassifier
// ==========================================================================
//
// Every tagged template below is fully tokenised: the contents are handed
// to the HTML or CSS sub-language, positions are remapped, and the backticks
// are preserved as template tokens. Interpolations (`${expr}`) stay as JS.


// --- Non-interpolated tagged templates -------------------------------------

const greeting = html`<p class="hi">Hello, world</p>`;
const theme = css`
	:root {
		--primary: #0070f3;
		--bg: #0a0a0a;
	}
	body {
		background: var(--bg);
		color: var(--primary);
		font-family: system-ui, sans-serif;
	}
`;


// --- Content-position interpolations ---------------------------------------
//
// The sub-language sees a well-formed document (with space-filled holes)
// and the matching tokens get spliced back at the real positions.

const welcome = (name) => html`
	<section class="welcome">
		<h1>Hello, ${name}!</h1>
		<p>Welcome to <em>twinkleplop</em>.</p>
	</section>
`;

const List = ({ items }) => html`
	<ul class="list">
		${items.map((item) => html`<li>${item.label}</li>`)}
	</ul>
`;


// --- Attribute-position interpolations (the exemplar case) -----------------
//
// The HTML sub-tokenizer sees `<p class="   ">hi</p>` and correctly parses
// the attribute value as a string. The string token then splits at the
// hole boundary so the ${cls} tokens sit between two `"` string pieces.

const Card = ({ variant, href, title }) => html`
	<article class="card card--${variant}" data-id="${title}">
		<a class="card__link" href="${href}" target="_blank" rel="noopener">
			${title}
		</a>
	</article>
`;


// --- Tag-name-position interpolations --------------------------------------

const Dynamic = (Tag, children) => html`<${Tag} class="dynamic">${children}</${Tag}>`;


// --- Nested brace expressions (grammar-layer brace-depth tracking) ---------

const meta = html`
	<meta name="config" content="${JSON.stringify({ theme: "dark", debug: true })}" />
	<meta name="size" content="${getSize({ width: 1024, height: 768 })}" />
`;


// --- CSS-tagged templates --------------------------------------------------

const buttonStyles = (color) => css`
	.btn {
		background: ${color};
		padding: 0.5rem 1rem;
		border-radius: 4px;
	}
	.btn:hover {
		filter: brightness(1.1);
	}
`;


// --- HTML with embedded CSS via css`...` -----------------------------------
//
// Recursion: the outer html`...` embeds HTML, and the css`...` expression
// inside its <style> interpolation embeds CSS. Everything composes through
// the reclassifier.

const Page = () => html`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<title>Demo</title>
			<style>${css`body { margin: 0; background: #111; }`}</style>
		</head>
		<body>
			<h1>Hello</h1>
		</body>
	</html>
`;


// --- Function-variable rule still fires around tagged templates ------------

const render = (data) => html`
	<output>${JSON.stringify(data)}</output>
`;

const compute = async () => {
	const data = await fetch("/api/data");
	return render(await data.json());
};


// ---- template_literals.txt ----
// Basic template literal
`Hello World`

// String interpolation
`Hello ${name}!`
`The answer is ${40 + 2}`

// Multi-line template
`This is
a multi-line
template literal`

// Nested templates
`Outer ${`Inner ${depth}`} text`

// Complex expressions
`User: ${user.firstName} ${user.lastName}`
`Total: $${price * quantity}`
`Status: ${isActive ? 'Active' : func("inactive")}`

// With function calls
`Result: ${calculate(x, y)}`
`Length: ${str.length}`
`Upper: ${text.toUpperCase()}`

// Escaping
`Line 1\nLine 2`
`Tab\there`
`Quote: \`nested\``

// Tagged templates
html`<div>${content}</div>`
css`.class { color: ${color}; }`
gql`query { user(id: ${id}) { name } }`
tmpl`heloo ${name()}`

// Nested braces inside interpolations — stack-tracked brace depth so the
// first `}` inside an inner object/block doesn't close the interpolation.
`${fn({a: 1})}`
`${{a: 1}}`
`${{a: {b: 2}}}`
`${function() { return 1; }}`
`${() => ({key: val})}`
`${obj.method({k: v}).b}`


// ---- lib/bench/src/library/tokenization-suite.bench.js ----
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
          if (
            !(
              (c >= 65 && c <= 90) ||
              (c >= 97 && c <= 122) ||
              (c >= 48 && c <= 57) ||
              c === 95 ||
              c === 36
            )
          ) {
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
      if (string_heavy_code.charCodeAt(i) === 34) {
        // "
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2; // skip escape
          } else if (char === 34) {
            // closing quote
            i++;
            break;
          } else {
            i++;
          }
        }
        tokens.push({ type: "string", start, end: i });
        continue;
      }

      if (string_heavy_code.charCodeAt(i) === 39) {
        // '
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2;
          } else if (char === 39) {
            // closing quote
            i++;
            break;
          } else {
            i++;
          }
        }
        tokens.push({ type: "string", start, end: i });
        continue;
      }

      if (string_heavy_code.charCodeAt(i) === 96) {
        // `
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2;
          } else if (char === 96) {
            // closing backtick
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
    "function",
    "const",
    "let",
    "var",
    "if",
    "else",
    "for",
    "while",
    "return",
    "class",
    "async",
    "await",
    "new",
    "this",
    "super",
  ]);

  const identifier_code =
    "function processData const results async transform return filter class DataProcessor";

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
      if (remaining[0] === " ") {
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
      if (char === 62) {
        // >
        if (i + 1 < complex_code.length && complex_code.charCodeAt(i + 1) === 62) {
          if (i + 2 < complex_code.length && complex_code.charCodeAt(i + 2) === 62) {
            tokens.push({ type: ">>>", start, end: i + 3 });
            i += 3;
            continue;
          }
        }
      }

      if (char === 61) {
        // =
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
      /^./, // fallback
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


// ---- lib/bench/src/library/micro-optimizations.bench.js ----
import { bench, describe } from "vitest";

// Micro-benchmarks to validate tokenizer inner-loop ideas in isolation

describe("Probe State Lookup", () => {
  const STATES = 64;
  const iterations = 2_000_000;

  // Set-based membership
  const probe_set = new Set();
  for (let i = 0; i < STATES; i += 5) probe_set.add(i);

  // Uint8Array mask membership
  const probe_mask = new Uint8Array(STATES);
  for (let i = 0; i < STATES; i += 5) probe_mask[i] = 1;

  bench("Set.has(state)", () => {
    let hits = 0;
    for (let i = 0, s = 0; i < iterations; i++, s = (s + 1) % STATES) {
      if (probe_set.has(s)) hits++;
    }
    return hits;
  });

  bench("Uint8Array[state]", () => {
    let hits = 0;
    for (let i = 0, s = 0; i < iterations; i++, s = (s + 1) % STATES) {
      if (probe_mask[s]) hits++;
    }
    return hits;
  });
});

describe("Failed Probe Guard", () => {
  const iterations = 5_000_000;
  const set = new Set();
  // Simulate some failures recorded
  for (let i = 0; i < 100; i++) set.add(i);
  const has_failures = set.size > 0; // boolean flag alternative

  bench("Check set.size > 0 each time", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      if (set.size > 0) sum++;
    }
    return sum;
  });

  bench("Precomputed boolean flag", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      if (has_failures) sum++;
    }
    return sum;
  });
});

describe("Pattern Code Storage", () => {
  // Compare matching loop against number[] vs Uint16Array for codes
  const make_word = (len) => {
    let s = "";
    for (let i = 0; i < len; i++) s += String.fromCharCode(65 + (i % 26));
    return s;
  };
  const input = make_word(64) + make_word(64); // ensure a few full matches
  const codes_array = Array.from(input).map((c) => c.charCodeAt(0));
  const codes_typed = new Uint16Array(codes_array);
  const pos = 0;
  const len = input.length;

  bench("number[] compare", () => {
    let matched = true;
    for (let i = 1; i < codes_array.length && pos + i < len; i++) {
      if (input.charCodeAt(pos + i) !== codes_array[i]) {
        matched = false;
        break;
      }
    }
    return matched;
  });

  bench("Uint16Array compare", () => {
    let matched = true;
    for (let i = 1; i < codes_typed.length && pos + i < len; i++) {
      if (input.charCodeAt(pos + i) !== codes_typed[i]) {
        matched = false;
        break;
      }
    }
    return matched;
  });
});

describe("Index Base Calculation", () => {
  const iterations = 10_000_000;
  bench("state * 128", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      const state = i & 0xff;
      sum += state * 128;
    }
    return sum;
  });

  bench("state << 7", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      const state = i & 0xff;
      sum += state << 7;
    }
    return sum;
  });
});

describe("Non-ASCII lookup structures", () => {
  const codes = [];
  for (let i = 200; i < 600; i += 3) codes.push(i);
  const value = 42;

  // Map-based
  const map = new Map();
  for (const c of codes) map.set(c, value);

  // Object-based
  const obj = Object.create(null);
  for (const c of codes) obj[c] = value;

  // Sparse typed array (range-limited)
  const max = Math.max(...codes);
  const arr = new Uint16Array(max + 1);
  for (const c of codes) arr[c] = value;

  const iters = 5_000_0; // 50k lookups per structure
  const query = codes.concat([1337, 2049, 1025, 777]);

  bench("Map.has + get", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        if (map.has(c)) sum += map.get(c);
      }
    }
    return sum;
  });

  bench("Object property check", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        const v = obj[c];
        if (v !== undefined) sum += v;
      }
    }
    return sum;
  });

  bench("Typed array direct index", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        const v = arr[c];
        if (v !== 0) sum += v;
      }
    }
    return sum;
  });
});


// ---- lib/bench/src/library/data-structures-suite.bench.js ----
import { bench, describe } from "vitest";

// ============================================================================
// Data Structures and Optimization Suite
// Benchmarks for token storage, lookup tables, and state management
// ============================================================================

describe("Token Storage Strategies", () => {
  const token_count = 1000;

  bench("Flat Uint32Array (triplets)", () => {
    const tokens = new Uint32Array(token_count * 3);

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      tokens[i * 3] = i % 20; // type
      tokens[i * 3 + 1] = i * 10; // start
      tokens[i * 3 + 2] = i * 10 + 8; // end
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
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
    for (let i = 0; i < token_count; i++) {
      tokens.push({
        type: i % 20,
        start: i * 10,
        end: i * 10 + 8,
      });
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      const { type, start, end } = tokens[i];
      sum += type + start + end;
    }

    return sum;
  });

  bench("Structure of Arrays (SoA)", () => {
    const types = new Uint8Array(token_count);
    const starts = new Uint32Array(token_count);
    const ends = new Uint32Array(token_count);

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      types[i] = i % 20;
      starts[i] = i * 10;
      ends[i] = i * 10 + 8;
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      sum += types[i] + starts[i] + ends[i];
    }

    return sum;
  });

  bench("Array of Arrays", () => {
    const tokens = [];

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      tokens.push([i % 20, i * 10, i * 10 + 8]);
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      const [type, start, end] = tokens[i];
      sum += type + start + end;
    }

    return sum;
  });
});

describe("Lookup Table Performance", () => {
  // ASCII character classification
  const is_alpha = new Uint8Array(128);
  const is_digit = new Uint8Array(128);
  const is_whitespace = new Uint8Array(128);

  // Initialize lookup tables
  for (let i = 65; i <= 90; i++) is_alpha[i] = 1; // A-Z
  for (let i = 97; i <= 122; i++) is_alpha[i] = 1; // a-z
  for (let i = 48; i <= 57; i++) is_digit[i] = 1; // 0-9
  is_whitespace[32] = 1; // space
  is_whitespace[9] = 1; // tab
  is_whitespace[10] = 1; // newline
  is_whitespace[13] = 1; // carriage return

  const test_string = "Hello123 World456\n\tTest789";

  bench("Uint8Array Lookup", () => {
    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if (char < 128) {
        if (is_alpha[char]) alpha_count++;
        if (is_digit[char]) digit_count++;
        if (is_whitespace[char]) ws_count++;
      }
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Direct Comparison", () => {
    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
        alpha_count++;
      }
      if (char >= 48 && char <= 57) {
        digit_count++;
      }
      if (char === 32 || char === 9 || char === 10 || char === 13) {
        ws_count++;
      }
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Set Lookup", () => {
    const alpha_set = new Set();
    const digit_set = new Set();
    const ws_set = new Set([32, 9, 10, 13]);

    for (let i = 65; i <= 90; i++) alpha_set.add(i);
    for (let i = 97; i <= 122; i++) alpha_set.add(i);
    for (let i = 48; i <= 57; i++) digit_set.add(i);

    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if (alpha_set.has(char)) alpha_count++;
      if (digit_set.has(char)) digit_count++;
      if (ws_set.has(char)) ws_count++;
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Map Lookup", () => {
    const char_types = new Map();

    for (let i = 65; i <= 90; i++) char_types.set(i, "alpha");
    for (let i = 97; i <= 122; i++) char_types.set(i, "alpha");
    for (let i = 48; i <= 57; i++) char_types.set(i, "digit");
    char_types.set(32, "whitespace");
    char_types.set(9, "whitespace");
    char_types.set(10, "whitespace");
    char_types.set(13, "whitespace");

    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const type = char_types.get(test_string.charCodeAt(i));
      if (type === "alpha") alpha_count++;
      else if (type === "digit") digit_count++;
      else if (type === "whitespace") ws_count++;
    }

    return { alpha_count, digit_count, ws_count };
  });
});

describe("State Machine Transitions", () => {
  const state_count = 10;
  const action_count = 5;

  bench("Computed Index (integer keys)", () => {
    // Flat array: [newState, token_type, stack_op]
    const transitions = new Uint8Array(state_count * action_count * 3);

    // Initialize some transitions
    for (let s = 0; s < state_count; s++) {
      for (let a = 0; a < action_count; a++) {
        const idx = (s * action_count + a) * 3;
        transitions[idx] = (s + 1) % state_count; // next state
        transitions[idx + 1] = a; // token type
        transitions[idx + 2] = 0; // no stack op
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const idx = (state * action_count + action) * 3;
      state = transitions[idx];
      const token_type = transitions[idx + 1];
      if (token_type > 0) token_count++;
    }

    return token_count;
  });

  bench("Map with string keys", () => {
    const transitions = new Map();

    // Initialize transitions
    for (let s = 0; s < state_count; s++) {
      for (let a = 0; a < action_count; a++) {
        transitions.set(`${s},${a}`, {
          next_state: (s + 1) % state_count,
          token_type: a,
          stack_op: 0,
        });
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const transition = transitions.get(`${state},${action}`);
      if (transition) {
        state = transition.next_state;
        if (transition.token_type > 0) token_count++;
      }
    }

    return token_count;
  });

  bench("Nested Objects", () => {
    const transitions = {};

    // Initialize transitions
    for (let s = 0; s < state_count; s++) {
      transitions[s] = {};
      for (let a = 0; a < action_count; a++) {
        transitions[s][a] = {
          next_state: (s + 1) % state_count,
          token_type: a,
          stack_op: 0,
        };
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const transition = transitions[state][action];
      if (transition) {
        state = transition.next_state;
        if (transition.token_type > 0) token_count++;
      }
    }

    return token_count;
  });
});

describe("Token Type Mapping", () => {
  const token_types = [
    "keyword",
    "identifier",
    "string",
    "number",
    "comment",
    "operator",
    "punctuation",
    "whitespace",
    "bracket",
    "semicolon",
  ];

  bench("Integer with Array Lookup", () => {
    // Map token names to integers
    const type_to_int = {};
    const int_to_type = [];

    token_types.forEach((type, i) => {
      type_to_int[type] = i;
      int_to_type[i] = type;
    });

    // Simulate tokenization with integer types
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      tokens.push(type_to_int[token_types[i % token_types.length]]);
    }

    // Convert back for rendering
    const results = [];
    for (const token of tokens) {
      results.push(int_to_type[token]);
    }

    return results.length;
  });

  bench("String Keys Directly", () => {
    // Use strings directly
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      tokens.push(token_types[i % token_types.length]);
    }

    // No conversion needed for rendering
    const results = [];
    for (const token of tokens) {
      results.push(token);
    }

    return results.length;
  });

  bench("Map Lookup", () => {
    const type_map = new Map();
    token_types.forEach((type, i) => {
      type_map.set(type, i);
    });

    const reverse_map = new Map();
    token_types.forEach((type, i) => {
      reverse_map.set(i, type);
    });

    // Simulate tokenization
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      const type = token_types[i % token_types.length];
      tokens.push(type_map.get(type));
    }

    // Convert back for rendering
    const results = [];
    for (const token of tokens) {
      results.push(reverse_map.get(token));
    }

    return results.length;
  });
});

describe("Stack Operations", () => {
  bench("Pre-allocated Uint8Array", () => {
    const stack = new Uint8Array(256);
    let stack_ptr = 0;
    let operations = 0;

    for (let i = 0; i < 1000; i++) {
      if (i % 3 === 0 && stack_ptr < 255) {
        // Push
        stack[stack_ptr++] = i % 10;
        operations++;
      } else if (stack_ptr > 0) {
        // Pop
        const value = stack[--stack_ptr];
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
    let stack = 0; // 32-bit integer, supports 8 states of 4 bits each
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
        const value = stack & 0xf;
        stack = stack >>> 4;
        depth--;
        operations += value;
      }
    }

    return operations;
  });
});


// ---- arrow_functions.txt ----
// Simple arrow function
const add = (a, b) => a + b;

// No parameters
const greet = () => "Hello";

// Single parameter (no parens)
const double = x => x * 2;

// Block body
const calculate = (x, y) => {
  const sum = x + y;
  return sum * 2;
};

// Returning object literal
const makeUser = name => ({ name, id: 1 });

// Async arrow function
const fetchData = async () => await fetch(url);

// Arrow function in array methods
[1, 2, 3].map(n => n * 2);
items.filter(item => item.active);
data.reduce((acc, val) => acc + val, 0);

// ---- async_await.txt ----
// Async function declaration
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return await response.json();
}

// Async function expression
const getData = async function() {
  return await database.query();
};

// Async arrow function
const processData = async (data) => {
  const result = await transform(data);
  return result;
};

// Try-catch with async/await
async function safeFetch() {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    console.error(error);
  }
}

// Multiple awaits
async function sequential() {
  const first = await getFirst();
  const second = await getSecond(first);
  const third = await getThird(second);
  return third;
}

// Parallel awaits
async function parallel() {
  const [a, b, c] = await Promise.all([
    fetchA(),
    fetchB(),
    fetchC()
  ]);
  return { a, b, c };
}

// Async in class methods
class Service {
  async initialize() {
    this.data = await loadData();
  }
  
  async process() {
    return await this.transform();
  }
}

// Top-level await (modules)
const config = await loadConfig();
export default await initializeApp();

// ---- boolean.txt ----
true; false;


// ---- class_name.txt ----
class Foo
interface bar
extends Foo
implements bar
trait Foo
instanceof \bar
new \Foo
catch (bar)

// ---- classes.txt ----
// Basic class
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    console.log(`${this.name} makes a sound`);
  }
}

// Class inheritance
class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }

  speak() {
    super.speak();
    console.log('Woof!');
  }
}

// Static members
class MathUtils {
  static PI = 3.14159;

  static calculateArea(radius) {
    return this.PI * radius ** 2;
  }
}

// Private fields
class Person {
  #privateField;
  #privateMethod() {}

  constructor(name) {
    this.#privateField = name;
  }

  get name() {
    return this.#privateField;
  }
}

// Class expressions
const MyClass = class {
  constructor() {}
};

const NamedClass = class CustomName {
  static getName() {
    return CustomName.name;
  }
};

// Getters and setters
class Temperature {
  #celsius;

  get celsius() {
    return this.#celsius;
  }

  set celsius(value) {
    this.#celsius = value;
  }

  get fahrenheit() {
    return this.#celsius * 9/5 + 32;
  }

  set fahrenheit(value) {
    this.#celsius = (value - 32) * 5/9;
  }
}

// Static initialization blocks
class Config {
  static data;

  static {
    this.data = loadConfig();
  }
}


// ---- comment.txt ----
// foobar
/**/
/* foo
bar */

/*
//
*/

// ---- control_flow.txt ----
// If-else statements
if (condition) {
  doSomething();
} else if (otherCondition) {
  doSomethingElse();
} else {
  doDefault();
}

// Ternary operator
const result = condition ? valueIfTrue : valueIfFalse;
const nested = a ? b ? c : d : e;

// Switch statement
switch (value) {
  case 1:
    handleOne();
    break;
  case 2:
  case 3:
    handleTwoOrThree();
    break;
  default:
    handleDefault();
}

// For loops
for (let i = 0; i < 10; i++) {
  console.log(i);
}

for (const item of array) {
  process(item);
}

for (const key in object) {
  if (object.hasOwnProperty(key)) {
    handle(object[key]);
  }
}

// While loops
while (condition) {
  doWork();
}

do {
  attemptOperation();
} while (shouldRetry);

// Try-catch-finally
try {
  riskyOperation();
} catch (error) {
  handleError(error);
} finally {
  cleanup();
}

// Throw statements
throw new Error('Something went wrong');
throw { code: 'INVALID', message: 'Invalid input' };

// Break and continue
for (let i = 0; i < 10; i++) {
  if (i === 5) continue;
  if (i === 8) break;
  process(i);
}

// Labeled statements
outer: for (let i = 0; i < 3; i++) {
  inner: for (let j = 0; j < 3; j++) {
    if (i === j) continue outer;
    if (j === 2) break inner;
  }
}

// ---- destructuring.txt ----
// Array destructuring
const [a, b] = [1, 2];
const [first, , third] = array;
const [head, ...tail] = list;

// Object destructuring
const { name, age } = person;
const { x: newX, y: newY } = point;
const { prop = 'default' } = obj;

// Nested destructuring
const { user: { name, email } } = data;
const [{ id }, { title }] = items;

// Mixed destructuring
const { data: [first, second] } = response;

// Function parameters
function process({ id, name }) {}
const handler = ({ type, payload }) => {};

// Rest in objects
const { a, b, ...rest } = object;
const { ...copy } = original;

// Destructuring with renaming and defaults
const { 
  name: userName = 'Anonymous',
  role: userRole = 'guest'
} = user;

// Complex patterns
const [
  {
    meta: { version }
  },
  ...entries
] = data;

// ---- function_call.txt ----
foo()

foo_bar()

f42()

fn(1, 2, 3, "hello", true)

fn(1, 2, 3, "hello", true);

// ---- function_def.txt ----
foo() {

}

foo_bar(one, two, three) {

}


const foo = (x, y) => x + y;

const bar = async (x, y) => x + y;

const baz = function() {

}

const obj = {
  foo() {
  },
  bar: (x, y) => x + y,
  baz: async (x, y) => x + y,
}

const foo = (a, (b, c)) => (a, b, c)
const foo = cond ? () => 1 : () => 2
const foo = foo = (() => fn)()
const foo = (a, (b, (c, d))) => (a, b, c, d)


// ---- generators_iterators.txt ----
// Generator functions
function* simpleGenerator() {
  yield 1;
  yield 2;
  yield 3;
}

// Generator with parameters
function* fibonacci(n) {
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// Yield delegation
function* delegator() {
  yield* [1, 2, 3];
  yield* otherGenerator();
}

// Async generators
async function* asyncGenerator() {
  yield await fetchData(1);
  yield await fetchData(2);
  yield await fetchData(3);
}

// Iterator protocol
const iterator = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next() {
        return i < 10
          ? { value: i++, done: false }
          : { done: true };
      }
    };
  }
};

// Generator expressions
const gen = (function* () {
  yield* range(1, 10);
})();

// Yield in expressions
function* expressionYield() {
  const x = yield 1;
  const y = 2 + (yield 3);
  return x + y;
}

// For-of with generators
for (const value of simpleGenerator()) {
  console.log(value);
}

// Async iteration
for await (const chunk of asyncGenerator()) {
  process(chunk);
}

// ---- keywords.txt ----
if; else; while; do; for;
return; in; instanceof; function; new;
try; throw; catch; finally; null;
break; continue;

// ---- modern_operators.txt ----
// Nullish coalescing (??)
const value = input ?? defaultValue;
const port = process.env.PORT ?? 3000;
config.timeout = options.timeout ?? 5000;

// Optional chaining (?.)
const city = user?.address?.city;
const result = obj?.method?.();
const item = arr?.[index];
const value = func?.();

// Logical assignment operators
x ||= 1;  // x = x || 1
y &&= 2;  // y = y && 2
z ??= 3;  // z = z ?? 3

// Exponentiation (**)
const squared = 2 ** 2;
const cubed = 3 ** 3;
base **= exponent;

// Spread operator (...)
const newArray = [...oldArray];
const combined = [...arr1, ...arr2];
const copy = { ...original };
const merged = { ...defaults, ...options };
Math.max(...numbers);
fn(...args);

// Rest parameters
function sum(...numbers) {}
const [first, ...rest] = array;
const { a, ...others } = object;

// Bitwise operators
const shifted = value >>> 2;
flags &= ~MASK;
bits |= FLAG;
result ^= key;
value <<= 1;
value >>= 1;
value >>>= 1;

// Compound assignments
total += amount;
count -= 1;
result *= factor;
average /= count;
remainder %= divisor;

// Increment/decrement
++counter;
--index;
value++;
score--;

// ---- modules.txt ----
// Named exports
export const API_URL = 'https://api.example.com';
export let counter = 0;
export var config = {};

export function processData(data) {
  return transform(data);
}

export class DataProcessor {
  process() {}
}

// Default export
export default function main() {}
export default class Application {}
export default { key: 'value' };

// Named imports
import { Component, createElement } from 'react';
import { readFile, writeFile } from 'fs';

// Default import
import React from 'react';
import _ from 'lodash';

// Aliased imports
import { longNamedExport as short } from './module';
import { default as MyClass } from './class';

// Namespace import
import * as utils from './utils';
import * as constants from './constants';

// Mixed imports
import defaultExport, { namedExport } from './module';
import MyComponent, { helper, CONSTANT } from './component';

// Re-exports
export { field1, field2 } from './module';
export { default } from './other';
export * from './utilities';
export * as namespace from './lib';

// Dynamic imports
import('./module').then(module => {});
const module = await import('./lazy-module');

// Import assertions (JSON modules)
import data from './data.json' assert { type: 'json' };
import config from './config.json' with { type: 'json' };

// ---- number_literals.txt ----
// Integer literals
42
0
1000000

// Decimal literals
3.14159
0.5
.5
10.
1.23e4
2e10
3.14e-10

// Binary literals (ES6)
0b1010  // 10
0B1111  // 15
0b11111111  // 255

// Octal literals (ES6)
0o755  // 493
0O644  // 420
0o10   // 8

// Hexadecimal literals
0xFF    // 255
0x10    // 16
0xDEADBEEF
0X1234ABCD

// BigInt literals (ES2020)
123n
0n
1000000000000000000000n
0x1fffffffffffff
0b11111111111111111n
0o777777777777n

// Numeric separators (ES2021)
1_000_000
3.141_592_653
0xFF_FF_FF
0b1111_0000_1111_0000
123_456_789n

// Scientific notation
1e3     // 1000
1e-3    // 0.001
1.5e10
2.5e-5
6.022e23  // Avogadro's number

// Special numeric values
Infinity
-Infinity
NaN

// Number with unary operators
+42
-3.14
~15
+0xff
-0b1010

// ---- numbers.txt ----
42
3.14159
4e10
2.1e-10
0.4e+2
0xbabe
0xBABE

// ---- operators.txt ----
- + -- ++
< <= > >=
= == ===
! != !==
& && | ||
? * ~ ^ %

// bare `/` is regex
/hi/

// division
1 / 2 / 3 / 4 / 5


// ---- regex_literals.txt ----
// Simple regex literals
/pattern/
/hello world/
/\d+/
/[a-z]/

// Regex with flags
/pattern/gi
/test/img
/unicode/u
/dotall/s
/sticky/y

// Character classes
/[abc]/
/[^xyz]/
/[0-9]/
/[a-zA-Z]/
/[\w\s]/

// Quantifiers
/a*/
/b+/
/c?/
/d{3}/
/e{2,5}/
/f{4,}/

// Anchors
/^start/
/end$/
/\bword\b/
/\Bnot\B/

// Groups and alternation
/(group)/
/(?:non-capturing)/
/(?<named>group)/
/(a|b|c)/
/(?=lookahead)/
/(?!negative)/

// Escape sequences
/\./
/\\/
/\n/
/\t/
/\x41/
/\u0041/

// Complex patterns
/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}/
/(?:\d{3}|\(\d{3}\))([-\/\.])\d{3}\1\d{4}/

// Regex in context
const pattern = /test/g;
if (/^\d+$/.test(input)) {}
string.replace(/old/g, 'new');
text.match(/\w+/g);
data.split(/\s*,\s*/);

// Not regex (division operator context)
const result = 10 / 2;
const calc = a / b / c;
x = y /= 2;

// ---- strings.txt ----
""
''
"f\"oo"
'b\'ar'
"foo\
bar"
'foo\
bar'
"foo /* comment */ bar"
'foo // bar'
'foo // bar' //comment

// ---- tagged_templates.txt ----
// ==========================================================================
// Tagged template literals — JS hosting HTML and CSS via the reclassifier
// ==========================================================================
//
// Every tagged template below is fully tokenised: the contents are handed
// to the HTML or CSS sub-language, positions are remapped, and the backticks
// are preserved as template tokens. Interpolations (`${expr}`) stay as JS.


// --- Non-interpolated tagged templates -------------------------------------

const greeting = html`<p class="hi">Hello, world</p>`;
const theme = css`
	:root {
		--primary: #0070f3;
		--bg: #0a0a0a;
	}
	body {
		background: var(--bg);
		color: var(--primary);
		font-family: system-ui, sans-serif;
	}
`;


// --- Content-position interpolations ---------------------------------------
//
// The sub-language sees a well-formed document (with space-filled holes)
// and the matching tokens get spliced back at the real positions.

const welcome = (name) => html`
	<section class="welcome">
		<h1>Hello, ${name}!</h1>
		<p>Welcome to <em>twinkleplop</em>.</p>
	</section>
`;

const List = ({ items }) => html`
	<ul class="list">
		${items.map((item) => html`<li>${item.label}</li>`)}
	</ul>
`;


// --- Attribute-position interpolations (the exemplar case) -----------------
//
// The HTML sub-tokenizer sees `<p class="   ">hi</p>` and correctly parses
// the attribute value as a string. The string token then splits at the
// hole boundary so the ${cls} tokens sit between two `"` string pieces.

const Card = ({ variant, href, title }) => html`
	<article class="card card--${variant}" data-id="${title}">
		<a class="card__link" href="${href}" target="_blank" rel="noopener">
			${title}
		</a>
	</article>
`;


// --- Tag-name-position interpolations --------------------------------------

const Dynamic = (Tag, children) => html`<${Tag} class="dynamic">${children}</${Tag}>`;


// --- Nested brace expressions (grammar-layer brace-depth tracking) ---------

const meta = html`
	<meta name="config" content="${JSON.stringify({ theme: "dark", debug: true })}" />
	<meta name="size" content="${getSize({ width: 1024, height: 768 })}" />
`;


// --- CSS-tagged templates --------------------------------------------------

const buttonStyles = (color) => css`
	.btn {
		background: ${color};
		padding: 0.5rem 1rem;
		border-radius: 4px;
	}
	.btn:hover {
		filter: brightness(1.1);
	}
`;


// --- HTML with embedded CSS via css`...` -----------------------------------
//
// Recursion: the outer html`...` embeds HTML, and the css`...` expression
// inside its <style> interpolation embeds CSS. Everything composes through
// the reclassifier.

const Page = () => html`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<title>Demo</title>
			<style>${css`body { margin: 0; background: #111; }`}</style>
		</head>
		<body>
			<h1>Hello</h1>
		</body>
	</html>
`;


// --- Function-variable rule still fires around tagged templates ------------

const render = (data) => html`
	<output>${JSON.stringify(data)}</output>
`;

const compute = async () => {
	const data = await fetch("/api/data");
	return render(await data.json());
};


// ---- template_literals.txt ----
// Basic template literal
`Hello World`

// String interpolation
`Hello ${name}!`
`The answer is ${40 + 2}`

// Multi-line template
`This is
a multi-line
template literal`

// Nested templates
`Outer ${`Inner ${depth}`} text`

// Complex expressions
`User: ${user.firstName} ${user.lastName}`
`Total: $${price * quantity}`
`Status: ${isActive ? 'Active' : func("inactive")}`

// With function calls
`Result: ${calculate(x, y)}`
`Length: ${str.length}`
`Upper: ${text.toUpperCase()}`

// Escaping
`Line 1\nLine 2`
`Tab\there`
`Quote: \`nested\``

// Tagged templates
html`<div>${content}</div>`
css`.class { color: ${color}; }`
gql`query { user(id: ${id}) { name } }`
tmpl`heloo ${name()}`

// Nested braces inside interpolations — stack-tracked brace depth so the
// first `}` inside an inner object/block doesn't close the interpolation.
`${fn({a: 1})}`
`${{a: 1}}`
`${{a: {b: 2}}}`
`${function() { return 1; }}`
`${() => ({key: val})}`
`${obj.method({k: v}).b}`


// ---- lib/bench/src/library/tokenization-suite.bench.js ----
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
          if (
            !(
              (c >= 65 && c <= 90) ||
              (c >= 97 && c <= 122) ||
              (c >= 48 && c <= 57) ||
              c === 95 ||
              c === 36
            )
          ) {
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
      if (string_heavy_code.charCodeAt(i) === 34) {
        // "
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2; // skip escape
          } else if (char === 34) {
            // closing quote
            i++;
            break;
          } else {
            i++;
          }
        }
        tokens.push({ type: "string", start, end: i });
        continue;
      }

      if (string_heavy_code.charCodeAt(i) === 39) {
        // '
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2;
          } else if (char === 39) {
            // closing quote
            i++;
            break;
          } else {
            i++;
          }
        }
        tokens.push({ type: "string", start, end: i });
        continue;
      }

      if (string_heavy_code.charCodeAt(i) === 96) {
        // `
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2;
          } else if (char === 96) {
            // closing backtick
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
    "function",
    "const",
    "let",
    "var",
    "if",
    "else",
    "for",
    "while",
    "return",
    "class",
    "async",
    "await",
    "new",
    "this",
    "super",
  ]);

  const identifier_code =
    "function processData const results async transform return filter class DataProcessor";

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
      if (remaining[0] === " ") {
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
      if (char === 62) {
        // >
        if (i + 1 < complex_code.length && complex_code.charCodeAt(i + 1) === 62) {
          if (i + 2 < complex_code.length && complex_code.charCodeAt(i + 2) === 62) {
            tokens.push({ type: ">>>", start, end: i + 3 });
            i += 3;
            continue;
          }
        }
      }

      if (char === 61) {
        // =
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
      /^./, // fallback
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


// ---- lib/bench/src/library/micro-optimizations.bench.js ----
import { bench, describe } from "vitest";

// Micro-benchmarks to validate tokenizer inner-loop ideas in isolation

describe("Probe State Lookup", () => {
  const STATES = 64;
  const iterations = 2_000_000;

  // Set-based membership
  const probe_set = new Set();
  for (let i = 0; i < STATES; i += 5) probe_set.add(i);

  // Uint8Array mask membership
  const probe_mask = new Uint8Array(STATES);
  for (let i = 0; i < STATES; i += 5) probe_mask[i] = 1;

  bench("Set.has(state)", () => {
    let hits = 0;
    for (let i = 0, s = 0; i < iterations; i++, s = (s + 1) % STATES) {
      if (probe_set.has(s)) hits++;
    }
    return hits;
  });

  bench("Uint8Array[state]", () => {
    let hits = 0;
    for (let i = 0, s = 0; i < iterations; i++, s = (s + 1) % STATES) {
      if (probe_mask[s]) hits++;
    }
    return hits;
  });
});

describe("Failed Probe Guard", () => {
  const iterations = 5_000_000;
  const set = new Set();
  // Simulate some failures recorded
  for (let i = 0; i < 100; i++) set.add(i);
  const has_failures = set.size > 0; // boolean flag alternative

  bench("Check set.size > 0 each time", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      if (set.size > 0) sum++;
    }
    return sum;
  });

  bench("Precomputed boolean flag", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      if (has_failures) sum++;
    }
    return sum;
  });
});

describe("Pattern Code Storage", () => {
  // Compare matching loop against number[] vs Uint16Array for codes
  const make_word = (len) => {
    let s = "";
    for (let i = 0; i < len; i++) s += String.fromCharCode(65 + (i % 26));
    return s;
  };
  const input = make_word(64) + make_word(64); // ensure a few full matches
  const codes_array = Array.from(input).map((c) => c.charCodeAt(0));
  const codes_typed = new Uint16Array(codes_array);
  const pos = 0;
  const len = input.length;

  bench("number[] compare", () => {
    let matched = true;
    for (let i = 1; i < codes_array.length && pos + i < len; i++) {
      if (input.charCodeAt(pos + i) !== codes_array[i]) {
        matched = false;
        break;
      }
    }
    return matched;
  });

  bench("Uint16Array compare", () => {
    let matched = true;
    for (let i = 1; i < codes_typed.length && pos + i < len; i++) {
      if (input.charCodeAt(pos + i) !== codes_typed[i]) {
        matched = false;
        break;
      }
    }
    return matched;
  });
});

describe("Index Base Calculation", () => {
  const iterations = 10_000_000;
  bench("state * 128", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      const state = i & 0xff;
      sum += state * 128;
    }
    return sum;
  });

  bench("state << 7", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      const state = i & 0xff;
      sum += state << 7;
    }
    return sum;
  });
});

describe("Non-ASCII lookup structures", () => {
  const codes = [];
  for (let i = 200; i < 600; i += 3) codes.push(i);
  const value = 42;

  // Map-based
  const map = new Map();
  for (const c of codes) map.set(c, value);

  // Object-based
  const obj = Object.create(null);
  for (const c of codes) obj[c] = value;

  // Sparse typed array (range-limited)
  const max = Math.max(...codes);
  const arr = new Uint16Array(max + 1);
  for (const c of codes) arr[c] = value;

  const iters = 5_000_0; // 50k lookups per structure
  const query = codes.concat([1337, 2049, 1025, 777]);

  bench("Map.has + get", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        if (map.has(c)) sum += map.get(c);
      }
    }
    return sum;
  });

  bench("Object property check", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        const v = obj[c];
        if (v !== undefined) sum += v;
      }
    }
    return sum;
  });

  bench("Typed array direct index", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        const v = arr[c];
        if (v !== 0) sum += v;
      }
    }
    return sum;
  });
});


// ---- lib/bench/src/library/data-structures-suite.bench.js ----
import { bench, describe } from "vitest";

// ============================================================================
// Data Structures and Optimization Suite
// Benchmarks for token storage, lookup tables, and state management
// ============================================================================

describe("Token Storage Strategies", () => {
  const token_count = 1000;

  bench("Flat Uint32Array (triplets)", () => {
    const tokens = new Uint32Array(token_count * 3);

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      tokens[i * 3] = i % 20; // type
      tokens[i * 3 + 1] = i * 10; // start
      tokens[i * 3 + 2] = i * 10 + 8; // end
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
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
    for (let i = 0; i < token_count; i++) {
      tokens.push({
        type: i % 20,
        start: i * 10,
        end: i * 10 + 8,
      });
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      const { type, start, end } = tokens[i];
      sum += type + start + end;
    }

    return sum;
  });

  bench("Structure of Arrays (SoA)", () => {
    const types = new Uint8Array(token_count);
    const starts = new Uint32Array(token_count);
    const ends = new Uint32Array(token_count);

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      types[i] = i % 20;
      starts[i] = i * 10;
      ends[i] = i * 10 + 8;
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      sum += types[i] + starts[i] + ends[i];
    }

    return sum;
  });

  bench("Array of Arrays", () => {
    const tokens = [];

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      tokens.push([i % 20, i * 10, i * 10 + 8]);
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      const [type, start, end] = tokens[i];
      sum += type + start + end;
    }

    return sum;
  });
});

describe("Lookup Table Performance", () => {
  // ASCII character classification
  const is_alpha = new Uint8Array(128);
  const is_digit = new Uint8Array(128);
  const is_whitespace = new Uint8Array(128);

  // Initialize lookup tables
  for (let i = 65; i <= 90; i++) is_alpha[i] = 1; // A-Z
  for (let i = 97; i <= 122; i++) is_alpha[i] = 1; // a-z
  for (let i = 48; i <= 57; i++) is_digit[i] = 1; // 0-9
  is_whitespace[32] = 1; // space
  is_whitespace[9] = 1; // tab
  is_whitespace[10] = 1; // newline
  is_whitespace[13] = 1; // carriage return

  const test_string = "Hello123 World456\n\tTest789";

  bench("Uint8Array Lookup", () => {
    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if (char < 128) {
        if (is_alpha[char]) alpha_count++;
        if (is_digit[char]) digit_count++;
        if (is_whitespace[char]) ws_count++;
      }
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Direct Comparison", () => {
    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
        alpha_count++;
      }
      if (char >= 48 && char <= 57) {
        digit_count++;
      }
      if (char === 32 || char === 9 || char === 10 || char === 13) {
        ws_count++;
      }
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Set Lookup", () => {
    const alpha_set = new Set();
    const digit_set = new Set();
    const ws_set = new Set([32, 9, 10, 13]);

    for (let i = 65; i <= 90; i++) alpha_set.add(i);
    for (let i = 97; i <= 122; i++) alpha_set.add(i);
    for (let i = 48; i <= 57; i++) digit_set.add(i);

    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if (alpha_set.has(char)) alpha_count++;
      if (digit_set.has(char)) digit_count++;
      if (ws_set.has(char)) ws_count++;
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Map Lookup", () => {
    const char_types = new Map();

    for (let i = 65; i <= 90; i++) char_types.set(i, "alpha");
    for (let i = 97; i <= 122; i++) char_types.set(i, "alpha");
    for (let i = 48; i <= 57; i++) char_types.set(i, "digit");
    char_types.set(32, "whitespace");
    char_types.set(9, "whitespace");
    char_types.set(10, "whitespace");
    char_types.set(13, "whitespace");

    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const type = char_types.get(test_string.charCodeAt(i));
      if (type === "alpha") alpha_count++;
      else if (type === "digit") digit_count++;
      else if (type === "whitespace") ws_count++;
    }

    return { alpha_count, digit_count, ws_count };
  });
});

describe("State Machine Transitions", () => {
  const state_count = 10;
  const action_count = 5;

  bench("Computed Index (integer keys)", () => {
    // Flat array: [newState, token_type, stack_op]
    const transitions = new Uint8Array(state_count * action_count * 3);

    // Initialize some transitions
    for (let s = 0; s < state_count; s++) {
      for (let a = 0; a < action_count; a++) {
        const idx = (s * action_count + a) * 3;
        transitions[idx] = (s + 1) % state_count; // next state
        transitions[idx + 1] = a; // token type
        transitions[idx + 2] = 0; // no stack op
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const idx = (state * action_count + action) * 3;
      state = transitions[idx];
      const token_type = transitions[idx + 1];
      if (token_type > 0) token_count++;
    }

    return token_count;
  });

  bench("Map with string keys", () => {
    const transitions = new Map();

    // Initialize transitions
    for (let s = 0; s < state_count; s++) {
      for (let a = 0; a < action_count; a++) {
        transitions.set(`${s},${a}`, {
          next_state: (s + 1) % state_count,
          token_type: a,
          stack_op: 0,
        });
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const transition = transitions.get(`${state},${action}`);
      if (transition) {
        state = transition.next_state;
        if (transition.token_type > 0) token_count++;
      }
    }

    return token_count;
  });

  bench("Nested Objects", () => {
    const transitions = {};

    // Initialize transitions
    for (let s = 0; s < state_count; s++) {
      transitions[s] = {};
      for (let a = 0; a < action_count; a++) {
        transitions[s][a] = {
          next_state: (s + 1) % state_count,
          token_type: a,
          stack_op: 0,
        };
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const transition = transitions[state][action];
      if (transition) {
        state = transition.next_state;
        if (transition.token_type > 0) token_count++;
      }
    }

    return token_count;
  });
});

describe("Token Type Mapping", () => {
  const token_types = [
    "keyword",
    "identifier",
    "string",
    "number",
    "comment",
    "operator",
    "punctuation",
    "whitespace",
    "bracket",
    "semicolon",
  ];

  bench("Integer with Array Lookup", () => {
    // Map token names to integers
    const type_to_int = {};
    const int_to_type = [];

    token_types.forEach((type, i) => {
      type_to_int[type] = i;
      int_to_type[i] = type;
    });

    // Simulate tokenization with integer types
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      tokens.push(type_to_int[token_types[i % token_types.length]]);
    }

    // Convert back for rendering
    const results = [];
    for (const token of tokens) {
      results.push(int_to_type[token]);
    }

    return results.length;
  });

  bench("String Keys Directly", () => {
    // Use strings directly
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      tokens.push(token_types[i % token_types.length]);
    }

    // No conversion needed for rendering
    const results = [];
    for (const token of tokens) {
      results.push(token);
    }

    return results.length;
  });

  bench("Map Lookup", () => {
    const type_map = new Map();
    token_types.forEach((type, i) => {
      type_map.set(type, i);
    });

    const reverse_map = new Map();
    token_types.forEach((type, i) => {
      reverse_map.set(i, type);
    });

    // Simulate tokenization
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      const type = token_types[i % token_types.length];
      tokens.push(type_map.get(type));
    }

    // Convert back for rendering
    const results = [];
    for (const token of tokens) {
      results.push(reverse_map.get(token));
    }

    return results.length;
  });
});

describe("Stack Operations", () => {
  bench("Pre-allocated Uint8Array", () => {
    const stack = new Uint8Array(256);
    let stack_ptr = 0;
    let operations = 0;

    for (let i = 0; i < 1000; i++) {
      if (i % 3 === 0 && stack_ptr < 255) {
        // Push
        stack[stack_ptr++] = i % 10;
        operations++;
      } else if (stack_ptr > 0) {
        // Pop
        const value = stack[--stack_ptr];
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
    let stack = 0; // 32-bit integer, supports 8 states of 4 bits each
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
        const value = stack & 0xf;
        stack = stack >>> 4;
        depth--;
        operations += value;
      }
    }

    return operations;
  });
});


// ---- arrow_functions.txt ----
// Simple arrow function
const add = (a, b) => a + b;

// No parameters
const greet = () => "Hello";

// Single parameter (no parens)
const double = x => x * 2;

// Block body
const calculate = (x, y) => {
  const sum = x + y;
  return sum * 2;
};

// Returning object literal
const makeUser = name => ({ name, id: 1 });

// Async arrow function
const fetchData = async () => await fetch(url);

// Arrow function in array methods
[1, 2, 3].map(n => n * 2);
items.filter(item => item.active);
data.reduce((acc, val) => acc + val, 0);

// ---- async_await.txt ----
// Async function declaration
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return await response.json();
}

// Async function expression
const getData = async function() {
  return await database.query();
};

// Async arrow function
const processData = async (data) => {
  const result = await transform(data);
  return result;
};

// Try-catch with async/await
async function safeFetch() {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    console.error(error);
  }
}

// Multiple awaits
async function sequential() {
  const first = await getFirst();
  const second = await getSecond(first);
  const third = await getThird(second);
  return third;
}

// Parallel awaits
async function parallel() {
  const [a, b, c] = await Promise.all([
    fetchA(),
    fetchB(),
    fetchC()
  ]);
  return { a, b, c };
}

// Async in class methods
class Service {
  async initialize() {
    this.data = await loadData();
  }
  
  async process() {
    return await this.transform();
  }
}

// Top-level await (modules)
const config = await loadConfig();
export default await initializeApp();

// ---- boolean.txt ----
true; false;


// ---- class_name.txt ----
class Foo
interface bar
extends Foo
implements bar
trait Foo
instanceof \bar
new \Foo
catch (bar)

// ---- classes.txt ----
// Basic class
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    console.log(`${this.name} makes a sound`);
  }
}

// Class inheritance
class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }

  speak() {
    super.speak();
    console.log('Woof!');
  }
}

// Static members
class MathUtils {
  static PI = 3.14159;

  static calculateArea(radius) {
    return this.PI * radius ** 2;
  }
}

// Private fields
class Person {
  #privateField;
  #privateMethod() {}

  constructor(name) {
    this.#privateField = name;
  }

  get name() {
    return this.#privateField;
  }
}

// Class expressions
const MyClass = class {
  constructor() {}
};

const NamedClass = class CustomName {
  static getName() {
    return CustomName.name;
  }
};

// Getters and setters
class Temperature {
  #celsius;

  get celsius() {
    return this.#celsius;
  }

  set celsius(value) {
    this.#celsius = value;
  }

  get fahrenheit() {
    return this.#celsius * 9/5 + 32;
  }

  set fahrenheit(value) {
    this.#celsius = (value - 32) * 5/9;
  }
}

// Static initialization blocks
class Config {
  static data;

  static {
    this.data = loadConfig();
  }
}


// ---- comment.txt ----
// foobar
/**/
/* foo
bar */

/*
//
*/

// ---- control_flow.txt ----
// If-else statements
if (condition) {
  doSomething();
} else if (otherCondition) {
  doSomethingElse();
} else {
  doDefault();
}

// Ternary operator
const result = condition ? valueIfTrue : valueIfFalse;
const nested = a ? b ? c : d : e;

// Switch statement
switch (value) {
  case 1:
    handleOne();
    break;
  case 2:
  case 3:
    handleTwoOrThree();
    break;
  default:
    handleDefault();
}

// For loops
for (let i = 0; i < 10; i++) {
  console.log(i);
}

for (const item of array) {
  process(item);
}

for (const key in object) {
  if (object.hasOwnProperty(key)) {
    handle(object[key]);
  }
}

// While loops
while (condition) {
  doWork();
}

do {
  attemptOperation();
} while (shouldRetry);

// Try-catch-finally
try {
  riskyOperation();
} catch (error) {
  handleError(error);
} finally {
  cleanup();
}

// Throw statements
throw new Error('Something went wrong');
throw { code: 'INVALID', message: 'Invalid input' };

// Break and continue
for (let i = 0; i < 10; i++) {
  if (i === 5) continue;
  if (i === 8) break;
  process(i);
}

// Labeled statements
outer: for (let i = 0; i < 3; i++) {
  inner: for (let j = 0; j < 3; j++) {
    if (i === j) continue outer;
    if (j === 2) break inner;
  }
}

// ---- destructuring.txt ----
// Array destructuring
const [a, b] = [1, 2];
const [first, , third] = array;
const [head, ...tail] = list;

// Object destructuring
const { name, age } = person;
const { x: newX, y: newY } = point;
const { prop = 'default' } = obj;

// Nested destructuring
const { user: { name, email } } = data;
const [{ id }, { title }] = items;

// Mixed destructuring
const { data: [first, second] } = response;

// Function parameters
function process({ id, name }) {}
const handler = ({ type, payload }) => {};

// Rest in objects
const { a, b, ...rest } = object;
const { ...copy } = original;

// Destructuring with renaming and defaults
const { 
  name: userName = 'Anonymous',
  role: userRole = 'guest'
} = user;

// Complex patterns
const [
  {
    meta: { version }
  },
  ...entries
] = data;

// ---- function_call.txt ----
foo()

foo_bar()

f42()

fn(1, 2, 3, "hello", true)

fn(1, 2, 3, "hello", true);

// ---- function_def.txt ----
foo() {

}

foo_bar(one, two, three) {

}


const foo = (x, y) => x + y;

const bar = async (x, y) => x + y;

const baz = function() {

}

const obj = {
  foo() {
  },
  bar: (x, y) => x + y,
  baz: async (x, y) => x + y,
}

const foo = (a, (b, c)) => (a, b, c)
const foo = cond ? () => 1 : () => 2
const foo = foo = (() => fn)()
const foo = (a, (b, (c, d))) => (a, b, c, d)


// ---- generators_iterators.txt ----
// Generator functions
function* simpleGenerator() {
  yield 1;
  yield 2;
  yield 3;
}

// Generator with parameters
function* fibonacci(n) {
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// Yield delegation
function* delegator() {
  yield* [1, 2, 3];
  yield* otherGenerator();
}

// Async generators
async function* asyncGenerator() {
  yield await fetchData(1);
  yield await fetchData(2);
  yield await fetchData(3);
}

// Iterator protocol
const iterator = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next() {
        return i < 10
          ? { value: i++, done: false }
          : { done: true };
      }
    };
  }
};

// Generator expressions
const gen = (function* () {
  yield* range(1, 10);
})();

// Yield in expressions
function* expressionYield() {
  const x = yield 1;
  const y = 2 + (yield 3);
  return x + y;
}

// For-of with generators
for (const value of simpleGenerator()) {
  console.log(value);
}

// Async iteration
for await (const chunk of asyncGenerator()) {
  process(chunk);
}

// ---- keywords.txt ----
if; else; while; do; for;
return; in; instanceof; function; new;
try; throw; catch; finally; null;
break; continue;

// ---- modern_operators.txt ----
// Nullish coalescing (??)
const value = input ?? defaultValue;
const port = process.env.PORT ?? 3000;
config.timeout = options.timeout ?? 5000;

// Optional chaining (?.)
const city = user?.address?.city;
const result = obj?.method?.();
const item = arr?.[index];
const value = func?.();

// Logical assignment operators
x ||= 1;  // x = x || 1
y &&= 2;  // y = y && 2
z ??= 3;  // z = z ?? 3

// Exponentiation (**)
const squared = 2 ** 2;
const cubed = 3 ** 3;
base **= exponent;

// Spread operator (...)
const newArray = [...oldArray];
const combined = [...arr1, ...arr2];
const copy = { ...original };
const merged = { ...defaults, ...options };
Math.max(...numbers);
fn(...args);

// Rest parameters
function sum(...numbers) {}
const [first, ...rest] = array;
const { a, ...others } = object;

// Bitwise operators
const shifted = value >>> 2;
flags &= ~MASK;
bits |= FLAG;
result ^= key;
value <<= 1;
value >>= 1;
value >>>= 1;

// Compound assignments
total += amount;
count -= 1;
result *= factor;
average /= count;
remainder %= divisor;

// Increment/decrement
++counter;
--index;
value++;
score--;

// ---- modules.txt ----
// Named exports
export const API_URL = 'https://api.example.com';
export let counter = 0;
export var config = {};

export function processData(data) {
  return transform(data);
}

export class DataProcessor {
  process() {}
}

// Default export
export default function main() {}
export default class Application {}
export default { key: 'value' };

// Named imports
import { Component, createElement } from 'react';
import { readFile, writeFile } from 'fs';

// Default import
import React from 'react';
import _ from 'lodash';

// Aliased imports
import { longNamedExport as short } from './module';
import { default as MyClass } from './class';

// Namespace import
import * as utils from './utils';
import * as constants from './constants';

// Mixed imports
import defaultExport, { namedExport } from './module';
import MyComponent, { helper, CONSTANT } from './component';

// Re-exports
export { field1, field2 } from './module';
export { default } from './other';
export * from './utilities';
export * as namespace from './lib';

// Dynamic imports
import('./module').then(module => {});
const module = await import('./lazy-module');

// Import assertions (JSON modules)
import data from './data.json' assert { type: 'json' };
import config from './config.json' with { type: 'json' };

// ---- number_literals.txt ----
// Integer literals
42
0
1000000

// Decimal literals
3.14159
0.5
.5
10.
1.23e4
2e10
3.14e-10

// Binary literals (ES6)
0b1010  // 10
0B1111  // 15
0b11111111  // 255

// Octal literals (ES6)
0o755  // 493
0O644  // 420
0o10   // 8

// Hexadecimal literals
0xFF    // 255
0x10    // 16
0xDEADBEEF
0X1234ABCD

// BigInt literals (ES2020)
123n
0n
1000000000000000000000n
0x1fffffffffffff
0b11111111111111111n
0o777777777777n

// Numeric separators (ES2021)
1_000_000
3.141_592_653
0xFF_FF_FF
0b1111_0000_1111_0000
123_456_789n

// Scientific notation
1e3     // 1000
1e-3    // 0.001
1.5e10
2.5e-5
6.022e23  // Avogadro's number

// Special numeric values
Infinity
-Infinity
NaN

// Number with unary operators
+42
-3.14
~15
+0xff
-0b1010

// ---- numbers.txt ----
42
3.14159
4e10
2.1e-10
0.4e+2
0xbabe
0xBABE

// ---- operators.txt ----
- + -- ++
< <= > >=
= == ===
! != !==
& && | ||
? * ~ ^ %

// bare `/` is regex
/hi/

// division
1 / 2 / 3 / 4 / 5


// ---- regex_literals.txt ----
// Simple regex literals
/pattern/
/hello world/
/\d+/
/[a-z]/

// Regex with flags
/pattern/gi
/test/img
/unicode/u
/dotall/s
/sticky/y

// Character classes
/[abc]/
/[^xyz]/
/[0-9]/
/[a-zA-Z]/
/[\w\s]/

// Quantifiers
/a*/
/b+/
/c?/
/d{3}/
/e{2,5}/
/f{4,}/

// Anchors
/^start/
/end$/
/\bword\b/
/\Bnot\B/

// Groups and alternation
/(group)/
/(?:non-capturing)/
/(?<named>group)/
/(a|b|c)/
/(?=lookahead)/
/(?!negative)/

// Escape sequences
/\./
/\\/
/\n/
/\t/
/\x41/
/\u0041/

// Complex patterns
/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}/
/(?:\d{3}|\(\d{3}\))([-\/\.])\d{3}\1\d{4}/

// Regex in context
const pattern = /test/g;
if (/^\d+$/.test(input)) {}
string.replace(/old/g, 'new');
text.match(/\w+/g);
data.split(/\s*,\s*/);

// Not regex (division operator context)
const result = 10 / 2;
const calc = a / b / c;
x = y /= 2;

// ---- strings.txt ----
""
''
"f\"oo"
'b\'ar'
"foo\
bar"
'foo\
bar'
"foo /* comment */ bar"
'foo // bar'
'foo // bar' //comment

// ---- tagged_templates.txt ----
// ==========================================================================
// Tagged template literals — JS hosting HTML and CSS via the reclassifier
// ==========================================================================
//
// Every tagged template below is fully tokenised: the contents are handed
// to the HTML or CSS sub-language, positions are remapped, and the backticks
// are preserved as template tokens. Interpolations (`${expr}`) stay as JS.


// --- Non-interpolated tagged templates -------------------------------------

const greeting = html`<p class="hi">Hello, world</p>`;
const theme = css`
	:root {
		--primary: #0070f3;
		--bg: #0a0a0a;
	}
	body {
		background: var(--bg);
		color: var(--primary);
		font-family: system-ui, sans-serif;
	}
`;


// --- Content-position interpolations ---------------------------------------
//
// The sub-language sees a well-formed document (with space-filled holes)
// and the matching tokens get spliced back at the real positions.

const welcome = (name) => html`
	<section class="welcome">
		<h1>Hello, ${name}!</h1>
		<p>Welcome to <em>twinkleplop</em>.</p>
	</section>
`;

const List = ({ items }) => html`
	<ul class="list">
		${items.map((item) => html`<li>${item.label}</li>`)}
	</ul>
`;


// --- Attribute-position interpolations (the exemplar case) -----------------
//
// The HTML sub-tokenizer sees `<p class="   ">hi</p>` and correctly parses
// the attribute value as a string. The string token then splits at the
// hole boundary so the ${cls} tokens sit between two `"` string pieces.

const Card = ({ variant, href, title }) => html`
	<article class="card card--${variant}" data-id="${title}">
		<a class="card__link" href="${href}" target="_blank" rel="noopener">
			${title}
		</a>
	</article>
`;


// --- Tag-name-position interpolations --------------------------------------

const Dynamic = (Tag, children) => html`<${Tag} class="dynamic">${children}</${Tag}>`;


// --- Nested brace expressions (grammar-layer brace-depth tracking) ---------

const meta = html`
	<meta name="config" content="${JSON.stringify({ theme: "dark", debug: true })}" />
	<meta name="size" content="${getSize({ width: 1024, height: 768 })}" />
`;


// --- CSS-tagged templates --------------------------------------------------

const buttonStyles = (color) => css`
	.btn {
		background: ${color};
		padding: 0.5rem 1rem;
		border-radius: 4px;
	}
	.btn:hover {
		filter: brightness(1.1);
	}
`;


// --- HTML with embedded CSS via css`...` -----------------------------------
//
// Recursion: the outer html`...` embeds HTML, and the css`...` expression
// inside its <style> interpolation embeds CSS. Everything composes through
// the reclassifier.

const Page = () => html`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<title>Demo</title>
			<style>${css`body { margin: 0; background: #111; }`}</style>
		</head>
		<body>
			<h1>Hello</h1>
		</body>
	</html>
`;


// --- Function-variable rule still fires around tagged templates ------------

const render = (data) => html`
	<output>${JSON.stringify(data)}</output>
`;

const compute = async () => {
	const data = await fetch("/api/data");
	return render(await data.json());
};


// ---- template_literals.txt ----
// Basic template literal
`Hello World`

// String interpolation
`Hello ${name}!`
`The answer is ${40 + 2}`

// Multi-line template
`This is
a multi-line
template literal`

// Nested templates
`Outer ${`Inner ${depth}`} text`

// Complex expressions
`User: ${user.firstName} ${user.lastName}`
`Total: $${price * quantity}`
`Status: ${isActive ? 'Active' : func("inactive")}`

// With function calls
`Result: ${calculate(x, y)}`
`Length: ${str.length}`
`Upper: ${text.toUpperCase()}`

// Escaping
`Line 1\nLine 2`
`Tab\there`
`Quote: \`nested\``

// Tagged templates
html`<div>${content}</div>`
css`.class { color: ${color}; }`
gql`query { user(id: ${id}) { name } }`
tmpl`heloo ${name()}`

// Nested braces inside interpolations — stack-tracked brace depth so the
// first `}` inside an inner object/block doesn't close the interpolation.
`${fn({a: 1})}`
`${{a: 1}}`
`${{a: {b: 2}}}`
`${function() { return 1; }}`
`${() => ({key: val})}`
`${obj.method({k: v}).b}`


// ---- lib/bench/src/library/tokenization-suite.bench.js ----
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
          if (
            !(
              (c >= 65 && c <= 90) ||
              (c >= 97 && c <= 122) ||
              (c >= 48 && c <= 57) ||
              c === 95 ||
              c === 36
            )
          ) {
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
      if (string_heavy_code.charCodeAt(i) === 34) {
        // "
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2; // skip escape
          } else if (char === 34) {
            // closing quote
            i++;
            break;
          } else {
            i++;
          }
        }
        tokens.push({ type: "string", start, end: i });
        continue;
      }

      if (string_heavy_code.charCodeAt(i) === 39) {
        // '
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2;
          } else if (char === 39) {
            // closing quote
            i++;
            break;
          } else {
            i++;
          }
        }
        tokens.push({ type: "string", start, end: i });
        continue;
      }

      if (string_heavy_code.charCodeAt(i) === 96) {
        // `
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2;
          } else if (char === 96) {
            // closing backtick
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
    "function",
    "const",
    "let",
    "var",
    "if",
    "else",
    "for",
    "while",
    "return",
    "class",
    "async",
    "await",
    "new",
    "this",
    "super",
  ]);

  const identifier_code =
    "function processData const results async transform return filter class DataProcessor";

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
      if (remaining[0] === " ") {
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
      if (char === 62) {
        // >
        if (i + 1 < complex_code.length && complex_code.charCodeAt(i + 1) === 62) {
          if (i + 2 < complex_code.length && complex_code.charCodeAt(i + 2) === 62) {
            tokens.push({ type: ">>>", start, end: i + 3 });
            i += 3;
            continue;
          }
        }
      }

      if (char === 61) {
        // =
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
      /^./, // fallback
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


// ---- lib/bench/src/library/micro-optimizations.bench.js ----
import { bench, describe } from "vitest";

// Micro-benchmarks to validate tokenizer inner-loop ideas in isolation

describe("Probe State Lookup", () => {
  const STATES = 64;
  const iterations = 2_000_000;

  // Set-based membership
  const probe_set = new Set();
  for (let i = 0; i < STATES; i += 5) probe_set.add(i);

  // Uint8Array mask membership
  const probe_mask = new Uint8Array(STATES);
  for (let i = 0; i < STATES; i += 5) probe_mask[i] = 1;

  bench("Set.has(state)", () => {
    let hits = 0;
    for (let i = 0, s = 0; i < iterations; i++, s = (s + 1) % STATES) {
      if (probe_set.has(s)) hits++;
    }
    return hits;
  });

  bench("Uint8Array[state]", () => {
    let hits = 0;
    for (let i = 0, s = 0; i < iterations; i++, s = (s + 1) % STATES) {
      if (probe_mask[s]) hits++;
    }
    return hits;
  });
});

describe("Failed Probe Guard", () => {
  const iterations = 5_000_000;
  const set = new Set();
  // Simulate some failures recorded
  for (let i = 0; i < 100; i++) set.add(i);
  const has_failures = set.size > 0; // boolean flag alternative

  bench("Check set.size > 0 each time", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      if (set.size > 0) sum++;
    }
    return sum;
  });

  bench("Precomputed boolean flag", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      if (has_failures) sum++;
    }
    return sum;
  });
});

describe("Pattern Code Storage", () => {
  // Compare matching loop against number[] vs Uint16Array for codes
  const make_word = (len) => {
    let s = "";
    for (let i = 0; i < len; i++) s += String.fromCharCode(65 + (i % 26));
    return s;
  };
  const input = make_word(64) + make_word(64); // ensure a few full matches
  const codes_array = Array.from(input).map((c) => c.charCodeAt(0));
  const codes_typed = new Uint16Array(codes_array);
  const pos = 0;
  const len = input.length;

  bench("number[] compare", () => {
    let matched = true;
    for (let i = 1; i < codes_array.length && pos + i < len; i++) {
      if (input.charCodeAt(pos + i) !== codes_array[i]) {
        matched = false;
        break;
      }
    }
    return matched;
  });

  bench("Uint16Array compare", () => {
    let matched = true;
    for (let i = 1; i < codes_typed.length && pos + i < len; i++) {
      if (input.charCodeAt(pos + i) !== codes_typed[i]) {
        matched = false;
        break;
      }
    }
    return matched;
  });
});

describe("Index Base Calculation", () => {
  const iterations = 10_000_000;
  bench("state * 128", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      const state = i & 0xff;
      sum += state * 128;
    }
    return sum;
  });

  bench("state << 7", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      const state = i & 0xff;
      sum += state << 7;
    }
    return sum;
  });
});

describe("Non-ASCII lookup structures", () => {
  const codes = [];
  for (let i = 200; i < 600; i += 3) codes.push(i);
  const value = 42;

  // Map-based
  const map = new Map();
  for (const c of codes) map.set(c, value);

  // Object-based
  const obj = Object.create(null);
  for (const c of codes) obj[c] = value;

  // Sparse typed array (range-limited)
  const max = Math.max(...codes);
  const arr = new Uint16Array(max + 1);
  for (const c of codes) arr[c] = value;

  const iters = 5_000_0; // 50k lookups per structure
  const query = codes.concat([1337, 2049, 1025, 777]);

  bench("Map.has + get", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        if (map.has(c)) sum += map.get(c);
      }
    }
    return sum;
  });

  bench("Object property check", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        const v = obj[c];
        if (v !== undefined) sum += v;
      }
    }
    return sum;
  });

  bench("Typed array direct index", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        const v = arr[c];
        if (v !== 0) sum += v;
      }
    }
    return sum;
  });
});


// ---- lib/bench/src/library/data-structures-suite.bench.js ----
import { bench, describe } from "vitest";

// ============================================================================
// Data Structures and Optimization Suite
// Benchmarks for token storage, lookup tables, and state management
// ============================================================================

describe("Token Storage Strategies", () => {
  const token_count = 1000;

  bench("Flat Uint32Array (triplets)", () => {
    const tokens = new Uint32Array(token_count * 3);

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      tokens[i * 3] = i % 20; // type
      tokens[i * 3 + 1] = i * 10; // start
      tokens[i * 3 + 2] = i * 10 + 8; // end
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
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
    for (let i = 0; i < token_count; i++) {
      tokens.push({
        type: i % 20,
        start: i * 10,
        end: i * 10 + 8,
      });
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      const { type, start, end } = tokens[i];
      sum += type + start + end;
    }

    return sum;
  });

  bench("Structure of Arrays (SoA)", () => {
    const types = new Uint8Array(token_count);
    const starts = new Uint32Array(token_count);
    const ends = new Uint32Array(token_count);

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      types[i] = i % 20;
      starts[i] = i * 10;
      ends[i] = i * 10 + 8;
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      sum += types[i] + starts[i] + ends[i];
    }

    return sum;
  });

  bench("Array of Arrays", () => {
    const tokens = [];

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      tokens.push([i % 20, i * 10, i * 10 + 8]);
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      const [type, start, end] = tokens[i];
      sum += type + start + end;
    }

    return sum;
  });
});

describe("Lookup Table Performance", () => {
  // ASCII character classification
  const is_alpha = new Uint8Array(128);
  const is_digit = new Uint8Array(128);
  const is_whitespace = new Uint8Array(128);

  // Initialize lookup tables
  for (let i = 65; i <= 90; i++) is_alpha[i] = 1; // A-Z
  for (let i = 97; i <= 122; i++) is_alpha[i] = 1; // a-z
  for (let i = 48; i <= 57; i++) is_digit[i] = 1; // 0-9
  is_whitespace[32] = 1; // space
  is_whitespace[9] = 1; // tab
  is_whitespace[10] = 1; // newline
  is_whitespace[13] = 1; // carriage return

  const test_string = "Hello123 World456\n\tTest789";

  bench("Uint8Array Lookup", () => {
    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if (char < 128) {
        if (is_alpha[char]) alpha_count++;
        if (is_digit[char]) digit_count++;
        if (is_whitespace[char]) ws_count++;
      }
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Direct Comparison", () => {
    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
        alpha_count++;
      }
      if (char >= 48 && char <= 57) {
        digit_count++;
      }
      if (char === 32 || char === 9 || char === 10 || char === 13) {
        ws_count++;
      }
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Set Lookup", () => {
    const alpha_set = new Set();
    const digit_set = new Set();
    const ws_set = new Set([32, 9, 10, 13]);

    for (let i = 65; i <= 90; i++) alpha_set.add(i);
    for (let i = 97; i <= 122; i++) alpha_set.add(i);
    for (let i = 48; i <= 57; i++) digit_set.add(i);

    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if (alpha_set.has(char)) alpha_count++;
      if (digit_set.has(char)) digit_count++;
      if (ws_set.has(char)) ws_count++;
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Map Lookup", () => {
    const char_types = new Map();

    for (let i = 65; i <= 90; i++) char_types.set(i, "alpha");
    for (let i = 97; i <= 122; i++) char_types.set(i, "alpha");
    for (let i = 48; i <= 57; i++) char_types.set(i, "digit");
    char_types.set(32, "whitespace");
    char_types.set(9, "whitespace");
    char_types.set(10, "whitespace");
    char_types.set(13, "whitespace");

    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const type = char_types.get(test_string.charCodeAt(i));
      if (type === "alpha") alpha_count++;
      else if (type === "digit") digit_count++;
      else if (type === "whitespace") ws_count++;
    }

    return { alpha_count, digit_count, ws_count };
  });
});

describe("State Machine Transitions", () => {
  const state_count = 10;
  const action_count = 5;

  bench("Computed Index (integer keys)", () => {
    // Flat array: [newState, token_type, stack_op]
    const transitions = new Uint8Array(state_count * action_count * 3);

    // Initialize some transitions
    for (let s = 0; s < state_count; s++) {
      for (let a = 0; a < action_count; a++) {
        const idx = (s * action_count + a) * 3;
        transitions[idx] = (s + 1) % state_count; // next state
        transitions[idx + 1] = a; // token type
        transitions[idx + 2] = 0; // no stack op
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const idx = (state * action_count + action) * 3;
      state = transitions[idx];
      const token_type = transitions[idx + 1];
      if (token_type > 0) token_count++;
    }

    return token_count;
  });

  bench("Map with string keys", () => {
    const transitions = new Map();

    // Initialize transitions
    for (let s = 0; s < state_count; s++) {
      for (let a = 0; a < action_count; a++) {
        transitions.set(`${s},${a}`, {
          next_state: (s + 1) % state_count,
          token_type: a,
          stack_op: 0,
        });
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const transition = transitions.get(`${state},${action}`);
      if (transition) {
        state = transition.next_state;
        if (transition.token_type > 0) token_count++;
      }
    }

    return token_count;
  });

  bench("Nested Objects", () => {
    const transitions = {};

    // Initialize transitions
    for (let s = 0; s < state_count; s++) {
      transitions[s] = {};
      for (let a = 0; a < action_count; a++) {
        transitions[s][a] = {
          next_state: (s + 1) % state_count,
          token_type: a,
          stack_op: 0,
        };
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const transition = transitions[state][action];
      if (transition) {
        state = transition.next_state;
        if (transition.token_type > 0) token_count++;
      }
    }

    return token_count;
  });
});

describe("Token Type Mapping", () => {
  const token_types = [
    "keyword",
    "identifier",
    "string",
    "number",
    "comment",
    "operator",
    "punctuation",
    "whitespace",
    "bracket",
    "semicolon",
  ];

  bench("Integer with Array Lookup", () => {
    // Map token names to integers
    const type_to_int = {};
    const int_to_type = [];

    token_types.forEach((type, i) => {
      type_to_int[type] = i;
      int_to_type[i] = type;
    });

    // Simulate tokenization with integer types
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      tokens.push(type_to_int[token_types[i % token_types.length]]);
    }

    // Convert back for rendering
    const results = [];
    for (const token of tokens) {
      results.push(int_to_type[token]);
    }

    return results.length;
  });

  bench("String Keys Directly", () => {
    // Use strings directly
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      tokens.push(token_types[i % token_types.length]);
    }

    // No conversion needed for rendering
    const results = [];
    for (const token of tokens) {
      results.push(token);
    }

    return results.length;
  });

  bench("Map Lookup", () => {
    const type_map = new Map();
    token_types.forEach((type, i) => {
      type_map.set(type, i);
    });

    const reverse_map = new Map();
    token_types.forEach((type, i) => {
      reverse_map.set(i, type);
    });

    // Simulate tokenization
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      const type = token_types[i % token_types.length];
      tokens.push(type_map.get(type));
    }

    // Convert back for rendering
    const results = [];
    for (const token of tokens) {
      results.push(reverse_map.get(token));
    }

    return results.length;
  });
});

describe("Stack Operations", () => {
  bench("Pre-allocated Uint8Array", () => {
    const stack = new Uint8Array(256);
    let stack_ptr = 0;
    let operations = 0;

    for (let i = 0; i < 1000; i++) {
      if (i % 3 === 0 && stack_ptr < 255) {
        // Push
        stack[stack_ptr++] = i % 10;
        operations++;
      } else if (stack_ptr > 0) {
        // Pop
        const value = stack[--stack_ptr];
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
    let stack = 0; // 32-bit integer, supports 8 states of 4 bits each
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
        const value = stack & 0xf;
        stack = stack >>> 4;
        depth--;
        operations += value;
      }
    }

    return operations;
  });
});


// ---- arrow_functions.txt ----
// Simple arrow function
const add = (a, b) => a + b;

// No parameters
const greet = () => "Hello";

// Single parameter (no parens)
const double = x => x * 2;

// Block body
const calculate = (x, y) => {
  const sum = x + y;
  return sum * 2;
};

// Returning object literal
const makeUser = name => ({ name, id: 1 });

// Async arrow function
const fetchData = async () => await fetch(url);

// Arrow function in array methods
[1, 2, 3].map(n => n * 2);
items.filter(item => item.active);
data.reduce((acc, val) => acc + val, 0);

// ---- async_await.txt ----
// Async function declaration
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return await response.json();
}

// Async function expression
const getData = async function() {
  return await database.query();
};

// Async arrow function
const processData = async (data) => {
  const result = await transform(data);
  return result;
};

// Try-catch with async/await
async function safeFetch() {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    console.error(error);
  }
}

// Multiple awaits
async function sequential() {
  const first = await getFirst();
  const second = await getSecond(first);
  const third = await getThird(second);
  return third;
}

// Parallel awaits
async function parallel() {
  const [a, b, c] = await Promise.all([
    fetchA(),
    fetchB(),
    fetchC()
  ]);
  return { a, b, c };
}

// Async in class methods
class Service {
  async initialize() {
    this.data = await loadData();
  }
  
  async process() {
    return await this.transform();
  }
}

// Top-level await (modules)
const config = await loadConfig();
export default await initializeApp();

// ---- boolean.txt ----
true; false;


// ---- class_name.txt ----
class Foo
interface bar
extends Foo
implements bar
trait Foo
instanceof \bar
new \Foo
catch (bar)

// ---- classes.txt ----
// Basic class
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    console.log(`${this.name} makes a sound`);
  }
}

// Class inheritance
class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }

  speak() {
    super.speak();
    console.log('Woof!');
  }
}

// Static members
class MathUtils {
  static PI = 3.14159;

  static calculateArea(radius) {
    return this.PI * radius ** 2;
  }
}

// Private fields
class Person {
  #privateField;
  #privateMethod() {}

  constructor(name) {
    this.#privateField = name;
  }

  get name() {
    return this.#privateField;
  }
}

// Class expressions
const MyClass = class {
  constructor() {}
};

const NamedClass = class CustomName {
  static getName() {
    return CustomName.name;
  }
};

// Getters and setters
class Temperature {
  #celsius;

  get celsius() {
    return this.#celsius;
  }

  set celsius(value) {
    this.#celsius = value;
  }

  get fahrenheit() {
    return this.#celsius * 9/5 + 32;
  }

  set fahrenheit(value) {
    this.#celsius = (value - 32) * 5/9;
  }
}

// Static initialization blocks
class Config {
  static data;

  static {
    this.data = loadConfig();
  }
}


// ---- comment.txt ----
// foobar
/**/
/* foo
bar */

/*
//
*/

// ---- control_flow.txt ----
// If-else statements
if (condition) {
  doSomething();
} else if (otherCondition) {
  doSomethingElse();
} else {
  doDefault();
}

// Ternary operator
const result = condition ? valueIfTrue : valueIfFalse;
const nested = a ? b ? c : d : e;

// Switch statement
switch (value) {
  case 1:
    handleOne();
    break;
  case 2:
  case 3:
    handleTwoOrThree();
    break;
  default:
    handleDefault();
}

// For loops
for (let i = 0; i < 10; i++) {
  console.log(i);
}

for (const item of array) {
  process(item);
}

for (const key in object) {
  if (object.hasOwnProperty(key)) {
    handle(object[key]);
  }
}

// While loops
while (condition) {
  doWork();
}

do {
  attemptOperation();
} while (shouldRetry);

// Try-catch-finally
try {
  riskyOperation();
} catch (error) {
  handleError(error);
} finally {
  cleanup();
}

// Throw statements
throw new Error('Something went wrong');
throw { code: 'INVALID', message: 'Invalid input' };

// Break and continue
for (let i = 0; i < 10; i++) {
  if (i === 5) continue;
  if (i === 8) break;
  process(i);
}

// Labeled statements
outer: for (let i = 0; i < 3; i++) {
  inner: for (let j = 0; j < 3; j++) {
    if (i === j) continue outer;
    if (j === 2) break inner;
  }
}

// ---- destructuring.txt ----
// Array destructuring
const [a, b] = [1, 2];
const [first, , third] = array;
const [head, ...tail] = list;

// Object destructuring
const { name, age } = person;
const { x: newX, y: newY } = point;
const { prop = 'default' } = obj;

// Nested destructuring
const { user: { name, email } } = data;
const [{ id }, { title }] = items;

// Mixed destructuring
const { data: [first, second] } = response;

// Function parameters
function process({ id, name }) {}
const handler = ({ type, payload }) => {};

// Rest in objects
const { a, b, ...rest } = object;
const { ...copy } = original;

// Destructuring with renaming and defaults
const { 
  name: userName = 'Anonymous',
  role: userRole = 'guest'
} = user;

// Complex patterns
const [
  {
    meta: { version }
  },
  ...entries
] = data;

// ---- function_call.txt ----
foo()

foo_bar()

f42()

fn(1, 2, 3, "hello", true)

fn(1, 2, 3, "hello", true);

// ---- function_def.txt ----
foo() {

}

foo_bar(one, two, three) {

}


const foo = (x, y) => x + y;

const bar = async (x, y) => x + y;

const baz = function() {

}

const obj = {
  foo() {
  },
  bar: (x, y) => x + y,
  baz: async (x, y) => x + y,
}

const foo = (a, (b, c)) => (a, b, c)
const foo = cond ? () => 1 : () => 2
const foo = foo = (() => fn)()
const foo = (a, (b, (c, d))) => (a, b, c, d)


// ---- generators_iterators.txt ----
// Generator functions
function* simpleGenerator() {
  yield 1;
  yield 2;
  yield 3;
}

// Generator with parameters
function* fibonacci(n) {
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// Yield delegation
function* delegator() {
  yield* [1, 2, 3];
  yield* otherGenerator();
}

// Async generators
async function* asyncGenerator() {
  yield await fetchData(1);
  yield await fetchData(2);
  yield await fetchData(3);
}

// Iterator protocol
const iterator = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next() {
        return i < 10
          ? { value: i++, done: false }
          : { done: true };
      }
    };
  }
};

// Generator expressions
const gen = (function* () {
  yield* range(1, 10);
})();

// Yield in expressions
function* expressionYield() {
  const x = yield 1;
  const y = 2 + (yield 3);
  return x + y;
}

// For-of with generators
for (const value of simpleGenerator()) {
  console.log(value);
}

// Async iteration
for await (const chunk of asyncGenerator()) {
  process(chunk);
}

// ---- keywords.txt ----
if; else; while; do; for;
return; in; instanceof; function; new;
try; throw; catch; finally; null;
break; continue;

// ---- modern_operators.txt ----
// Nullish coalescing (??)
const value = input ?? defaultValue;
const port = process.env.PORT ?? 3000;
config.timeout = options.timeout ?? 5000;

// Optional chaining (?.)
const city = user?.address?.city;
const result = obj?.method?.();
const item = arr?.[index];
const value = func?.();

// Logical assignment operators
x ||= 1;  // x = x || 1
y &&= 2;  // y = y && 2
z ??= 3;  // z = z ?? 3

// Exponentiation (**)
const squared = 2 ** 2;
const cubed = 3 ** 3;
base **= exponent;

// Spread operator (...)
const newArray = [...oldArray];
const combined = [...arr1, ...arr2];
const copy = { ...original };
const merged = { ...defaults, ...options };
Math.max(...numbers);
fn(...args);

// Rest parameters
function sum(...numbers) {}
const [first, ...rest] = array;
const { a, ...others } = object;

// Bitwise operators
const shifted = value >>> 2;
flags &= ~MASK;
bits |= FLAG;
result ^= key;
value <<= 1;
value >>= 1;
value >>>= 1;

// Compound assignments
total += amount;
count -= 1;
result *= factor;
average /= count;
remainder %= divisor;

// Increment/decrement
++counter;
--index;
value++;
score--;

// ---- modules.txt ----
// Named exports
export const API_URL = 'https://api.example.com';
export let counter = 0;
export var config = {};

export function processData(data) {
  return transform(data);
}

export class DataProcessor {
  process() {}
}

// Default export
export default function main() {}
export default class Application {}
export default { key: 'value' };

// Named imports
import { Component, createElement } from 'react';
import { readFile, writeFile } from 'fs';

// Default import
import React from 'react';
import _ from 'lodash';

// Aliased imports
import { longNamedExport as short } from './module';
import { default as MyClass } from './class';

// Namespace import
import * as utils from './utils';
import * as constants from './constants';

// Mixed imports
import defaultExport, { namedExport } from './module';
import MyComponent, { helper, CONSTANT } from './component';

// Re-exports
export { field1, field2 } from './module';
export { default } from './other';
export * from './utilities';
export * as namespace from './lib';

// Dynamic imports
import('./module').then(module => {});
const module = await import('./lazy-module');

// Import assertions (JSON modules)
import data from './data.json' assert { type: 'json' };
import config from './config.json' with { type: 'json' };

// ---- number_literals.txt ----
// Integer literals
42
0
1000000

// Decimal literals
3.14159
0.5
.5
10.
1.23e4
2e10
3.14e-10

// Binary literals (ES6)
0b1010  // 10
0B1111  // 15
0b11111111  // 255

// Octal literals (ES6)
0o755  // 493
0O644  // 420
0o10   // 8

// Hexadecimal literals
0xFF    // 255
0x10    // 16
0xDEADBEEF
0X1234ABCD

// BigInt literals (ES2020)
123n
0n
1000000000000000000000n
0x1fffffffffffff
0b11111111111111111n
0o777777777777n

// Numeric separators (ES2021)
1_000_000
3.141_592_653
0xFF_FF_FF
0b1111_0000_1111_0000
123_456_789n

// Scientific notation
1e3     // 1000
1e-3    // 0.001
1.5e10
2.5e-5
6.022e23  // Avogadro's number

// Special numeric values
Infinity
-Infinity
NaN

// Number with unary operators
+42
-3.14
~15
+0xff
-0b1010

// ---- numbers.txt ----
42
3.14159
4e10
2.1e-10
0.4e+2
0xbabe
0xBABE

// ---- operators.txt ----
- + -- ++
< <= > >=
= == ===
! != !==
& && | ||
? * ~ ^ %

// bare `/` is regex
/hi/

// division
1 / 2 / 3 / 4 / 5


// ---- regex_literals.txt ----
// Simple regex literals
/pattern/
/hello world/
/\d+/
/[a-z]/

// Regex with flags
/pattern/gi
/test/img
/unicode/u
/dotall/s
/sticky/y

// Character classes
/[abc]/
/[^xyz]/
/[0-9]/
/[a-zA-Z]/
/[\w\s]/

// Quantifiers
/a*/
/b+/
/c?/
/d{3}/
/e{2,5}/
/f{4,}/

// Anchors
/^start/
/end$/
/\bword\b/
/\Bnot\B/

// Groups and alternation
/(group)/
/(?:non-capturing)/
/(?<named>group)/
/(a|b|c)/
/(?=lookahead)/
/(?!negative)/

// Escape sequences
/\./
/\\/
/\n/
/\t/
/\x41/
/\u0041/

// Complex patterns
/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}/
/(?:\d{3}|\(\d{3}\))([-\/\.])\d{3}\1\d{4}/

// Regex in context
const pattern = /test/g;
if (/^\d+$/.test(input)) {}
string.replace(/old/g, 'new');
text.match(/\w+/g);
data.split(/\s*,\s*/);

// Not regex (division operator context)
const result = 10 / 2;
const calc = a / b / c;
x = y /= 2;

// ---- strings.txt ----
""
''
"f\"oo"
'b\'ar'
"foo\
bar"
'foo\
bar'
"foo /* comment */ bar"
'foo // bar'
'foo // bar' //comment

// ---- tagged_templates.txt ----
// ==========================================================================
// Tagged template literals — JS hosting HTML and CSS via the reclassifier
// ==========================================================================
//
// Every tagged template below is fully tokenised: the contents are handed
// to the HTML or CSS sub-language, positions are remapped, and the backticks
// are preserved as template tokens. Interpolations (`${expr}`) stay as JS.


// --- Non-interpolated tagged templates -------------------------------------

const greeting = html`<p class="hi">Hello, world</p>`;
const theme = css`
	:root {
		--primary: #0070f3;
		--bg: #0a0a0a;
	}
	body {
		background: var(--bg);
		color: var(--primary);
		font-family: system-ui, sans-serif;
	}
`;


// --- Content-position interpolations ---------------------------------------
//
// The sub-language sees a well-formed document (with space-filled holes)
// and the matching tokens get spliced back at the real positions.

const welcome = (name) => html`
	<section class="welcome">
		<h1>Hello, ${name}!</h1>
		<p>Welcome to <em>twinkleplop</em>.</p>
	</section>
`;

const List = ({ items }) => html`
	<ul class="list">
		${items.map((item) => html`<li>${item.label}</li>`)}
	</ul>
`;


// --- Attribute-position interpolations (the exemplar case) -----------------
//
// The HTML sub-tokenizer sees `<p class="   ">hi</p>` and correctly parses
// the attribute value as a string. The string token then splits at the
// hole boundary so the ${cls} tokens sit between two `"` string pieces.

const Card = ({ variant, href, title }) => html`
	<article class="card card--${variant}" data-id="${title}">
		<a class="card__link" href="${href}" target="_blank" rel="noopener">
			${title}
		</a>
	</article>
`;


// --- Tag-name-position interpolations --------------------------------------

const Dynamic = (Tag, children) => html`<${Tag} class="dynamic">${children}</${Tag}>`;


// --- Nested brace expressions (grammar-layer brace-depth tracking) ---------

const meta = html`
	<meta name="config" content="${JSON.stringify({ theme: "dark", debug: true })}" />
	<meta name="size" content="${getSize({ width: 1024, height: 768 })}" />
`;


// --- CSS-tagged templates --------------------------------------------------

const buttonStyles = (color) => css`
	.btn {
		background: ${color};
		padding: 0.5rem 1rem;
		border-radius: 4px;
	}
	.btn:hover {
		filter: brightness(1.1);
	}
`;


// --- HTML with embedded CSS via css`...` -----------------------------------
//
// Recursion: the outer html`...` embeds HTML, and the css`...` expression
// inside its <style> interpolation embeds CSS. Everything composes through
// the reclassifier.

const Page = () => html`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<title>Demo</title>
			<style>${css`body { margin: 0; background: #111; }`}</style>
		</head>
		<body>
			<h1>Hello</h1>
		</body>
	</html>
`;


// --- Function-variable rule still fires around tagged templates ------------

const render = (data) => html`
	<output>${JSON.stringify(data)}</output>
`;

const compute = async () => {
	const data = await fetch("/api/data");
	return render(await data.json());
};


// ---- template_literals.txt ----
// Basic template literal
`Hello World`

// String interpolation
`Hello ${name}!`
`The answer is ${40 + 2}`

// Multi-line template
`This is
a multi-line
template literal`

// Nested templates
`Outer ${`Inner ${depth}`} text`

// Complex expressions
`User: ${user.firstName} ${user.lastName}`
`Total: $${price * quantity}`
`Status: ${isActive ? 'Active' : func("inactive")}`

// With function calls
`Result: ${calculate(x, y)}`
`Length: ${str.length}`
`Upper: ${text.toUpperCase()}`

// Escaping
`Line 1\nLine 2`
`Tab\there`
`Quote: \`nested\``

// Tagged templates
html`<div>${content}</div>`
css`.class { color: ${color}; }`
gql`query { user(id: ${id}) { name } }`
tmpl`heloo ${name()}`

// Nested braces inside interpolations — stack-tracked brace depth so the
// first `}` inside an inner object/block doesn't close the interpolation.
`${fn({a: 1})}`
`${{a: 1}}`
`${{a: {b: 2}}}`
`${function() { return 1; }}`
`${() => ({key: val})}`
`${obj.method({k: v}).b}`


// ---- lib/bench/src/library/tokenization-suite.bench.js ----
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
          if (
            !(
              (c >= 65 && c <= 90) ||
              (c >= 97 && c <= 122) ||
              (c >= 48 && c <= 57) ||
              c === 95 ||
              c === 36
            )
          ) {
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
      if (string_heavy_code.charCodeAt(i) === 34) {
        // "
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2; // skip escape
          } else if (char === 34) {
            // closing quote
            i++;
            break;
          } else {
            i++;
          }
        }
        tokens.push({ type: "string", start, end: i });
        continue;
      }

      if (string_heavy_code.charCodeAt(i) === 39) {
        // '
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2;
          } else if (char === 39) {
            // closing quote
            i++;
            break;
          } else {
            i++;
          }
        }
        tokens.push({ type: "string", start, end: i });
        continue;
      }

      if (string_heavy_code.charCodeAt(i) === 96) {
        // `
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2;
          } else if (char === 96) {
            // closing backtick
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
    "function",
    "const",
    "let",
    "var",
    "if",
    "else",
    "for",
    "while",
    "return",
    "class",
    "async",
    "await",
    "new",
    "this",
    "super",
  ]);

  const identifier_code =
    "function processData const results async transform return filter class DataProcessor";

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
      if (remaining[0] === " ") {
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
      if (char === 62) {
        // >
        if (i + 1 < complex_code.length && complex_code.charCodeAt(i + 1) === 62) {
          if (i + 2 < complex_code.length && complex_code.charCodeAt(i + 2) === 62) {
            tokens.push({ type: ">>>", start, end: i + 3 });
            i += 3;
            continue;
          }
        }
      }

      if (char === 61) {
        // =
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
      /^./, // fallback
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


// ---- lib/bench/src/library/micro-optimizations.bench.js ----
import { bench, describe } from "vitest";

// Micro-benchmarks to validate tokenizer inner-loop ideas in isolation

describe("Probe State Lookup", () => {
  const STATES = 64;
  const iterations = 2_000_000;

  // Set-based membership
  const probe_set = new Set();
  for (let i = 0; i < STATES; i += 5) probe_set.add(i);

  // Uint8Array mask membership
  const probe_mask = new Uint8Array(STATES);
  for (let i = 0; i < STATES; i += 5) probe_mask[i] = 1;

  bench("Set.has(state)", () => {
    let hits = 0;
    for (let i = 0, s = 0; i < iterations; i++, s = (s + 1) % STATES) {
      if (probe_set.has(s)) hits++;
    }
    return hits;
  });

  bench("Uint8Array[state]", () => {
    let hits = 0;
    for (let i = 0, s = 0; i < iterations; i++, s = (s + 1) % STATES) {
      if (probe_mask[s]) hits++;
    }
    return hits;
  });
});

describe("Failed Probe Guard", () => {
  const iterations = 5_000_000;
  const set = new Set();
  // Simulate some failures recorded
  for (let i = 0; i < 100; i++) set.add(i);
  const has_failures = set.size > 0; // boolean flag alternative

  bench("Check set.size > 0 each time", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      if (set.size > 0) sum++;
    }
    return sum;
  });

  bench("Precomputed boolean flag", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      if (has_failures) sum++;
    }
    return sum;
  });
});

describe("Pattern Code Storage", () => {
  // Compare matching loop against number[] vs Uint16Array for codes
  const make_word = (len) => {
    let s = "";
    for (let i = 0; i < len; i++) s += String.fromCharCode(65 + (i % 26));
    return s;
  };
  const input = make_word(64) + make_word(64); // ensure a few full matches
  const codes_array = Array.from(input).map((c) => c.charCodeAt(0));
  const codes_typed = new Uint16Array(codes_array);
  const pos = 0;
  const len = input.length;

  bench("number[] compare", () => {
    let matched = true;
    for (let i = 1; i < codes_array.length && pos + i < len; i++) {
      if (input.charCodeAt(pos + i) !== codes_array[i]) {
        matched = false;
        break;
      }
    }
    return matched;
  });

  bench("Uint16Array compare", () => {
    let matched = true;
    for (let i = 1; i < codes_typed.length && pos + i < len; i++) {
      if (input.charCodeAt(pos + i) !== codes_typed[i]) {
        matched = false;
        break;
      }
    }
    return matched;
  });
});

describe("Index Base Calculation", () => {
  const iterations = 10_000_000;
  bench("state * 128", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      const state = i & 0xff;
      sum += state * 128;
    }
    return sum;
  });

  bench("state << 7", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      const state = i & 0xff;
      sum += state << 7;
    }
    return sum;
  });
});

describe("Non-ASCII lookup structures", () => {
  const codes = [];
  for (let i = 200; i < 600; i += 3) codes.push(i);
  const value = 42;

  // Map-based
  const map = new Map();
  for (const c of codes) map.set(c, value);

  // Object-based
  const obj = Object.create(null);
  for (const c of codes) obj[c] = value;

  // Sparse typed array (range-limited)
  const max = Math.max(...codes);
  const arr = new Uint16Array(max + 1);
  for (const c of codes) arr[c] = value;

  const iters = 5_000_0; // 50k lookups per structure
  const query = codes.concat([1337, 2049, 1025, 777]);

  bench("Map.has + get", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        if (map.has(c)) sum += map.get(c);
      }
    }
    return sum;
  });

  bench("Object property check", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        const v = obj[c];
        if (v !== undefined) sum += v;
      }
    }
    return sum;
  });

  bench("Typed array direct index", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        const v = arr[c];
        if (v !== 0) sum += v;
      }
    }
    return sum;
  });
});


// ---- lib/bench/src/library/data-structures-suite.bench.js ----
import { bench, describe } from "vitest";

// ============================================================================
// Data Structures and Optimization Suite
// Benchmarks for token storage, lookup tables, and state management
// ============================================================================

describe("Token Storage Strategies", () => {
  const token_count = 1000;

  bench("Flat Uint32Array (triplets)", () => {
    const tokens = new Uint32Array(token_count * 3);

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      tokens[i * 3] = i % 20; // type
      tokens[i * 3 + 1] = i * 10; // start
      tokens[i * 3 + 2] = i * 10 + 8; // end
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
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
    for (let i = 0; i < token_count; i++) {
      tokens.push({
        type: i % 20,
        start: i * 10,
        end: i * 10 + 8,
      });
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      const { type, start, end } = tokens[i];
      sum += type + start + end;
    }

    return sum;
  });

  bench("Structure of Arrays (SoA)", () => {
    const types = new Uint8Array(token_count);
    const starts = new Uint32Array(token_count);
    const ends = new Uint32Array(token_count);

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      types[i] = i % 20;
      starts[i] = i * 10;
      ends[i] = i * 10 + 8;
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      sum += types[i] + starts[i] + ends[i];
    }

    return sum;
  });

  bench("Array of Arrays", () => {
    const tokens = [];

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      tokens.push([i % 20, i * 10, i * 10 + 8]);
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      const [type, start, end] = tokens[i];
      sum += type + start + end;
    }

    return sum;
  });
});

describe("Lookup Table Performance", () => {
  // ASCII character classification
  const is_alpha = new Uint8Array(128);
  const is_digit = new Uint8Array(128);
  const is_whitespace = new Uint8Array(128);

  // Initialize lookup tables
  for (let i = 65; i <= 90; i++) is_alpha[i] = 1; // A-Z
  for (let i = 97; i <= 122; i++) is_alpha[i] = 1; // a-z
  for (let i = 48; i <= 57; i++) is_digit[i] = 1; // 0-9
  is_whitespace[32] = 1; // space
  is_whitespace[9] = 1; // tab
  is_whitespace[10] = 1; // newline
  is_whitespace[13] = 1; // carriage return

  const test_string = "Hello123 World456\n\tTest789";

  bench("Uint8Array Lookup", () => {
    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if (char < 128) {
        if (is_alpha[char]) alpha_count++;
        if (is_digit[char]) digit_count++;
        if (is_whitespace[char]) ws_count++;
      }
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Direct Comparison", () => {
    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
        alpha_count++;
      }
      if (char >= 48 && char <= 57) {
        digit_count++;
      }
      if (char === 32 || char === 9 || char === 10 || char === 13) {
        ws_count++;
      }
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Set Lookup", () => {
    const alpha_set = new Set();
    const digit_set = new Set();
    const ws_set = new Set([32, 9, 10, 13]);

    for (let i = 65; i <= 90; i++) alpha_set.add(i);
    for (let i = 97; i <= 122; i++) alpha_set.add(i);
    for (let i = 48; i <= 57; i++) digit_set.add(i);

    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if (alpha_set.has(char)) alpha_count++;
      if (digit_set.has(char)) digit_count++;
      if (ws_set.has(char)) ws_count++;
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Map Lookup", () => {
    const char_types = new Map();

    for (let i = 65; i <= 90; i++) char_types.set(i, "alpha");
    for (let i = 97; i <= 122; i++) char_types.set(i, "alpha");
    for (let i = 48; i <= 57; i++) char_types.set(i, "digit");
    char_types.set(32, "whitespace");
    char_types.set(9, "whitespace");
    char_types.set(10, "whitespace");
    char_types.set(13, "whitespace");

    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const type = char_types.get(test_string.charCodeAt(i));
      if (type === "alpha") alpha_count++;
      else if (type === "digit") digit_count++;
      else if (type === "whitespace") ws_count++;
    }

    return { alpha_count, digit_count, ws_count };
  });
});

describe("State Machine Transitions", () => {
  const state_count = 10;
  const action_count = 5;

  bench("Computed Index (integer keys)", () => {
    // Flat array: [newState, token_type, stack_op]
    const transitions = new Uint8Array(state_count * action_count * 3);

    // Initialize some transitions
    for (let s = 0; s < state_count; s++) {
      for (let a = 0; a < action_count; a++) {
        const idx = (s * action_count + a) * 3;
        transitions[idx] = (s + 1) % state_count; // next state
        transitions[idx + 1] = a; // token type
        transitions[idx + 2] = 0; // no stack op
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const idx = (state * action_count + action) * 3;
      state = transitions[idx];
      const token_type = transitions[idx + 1];
      if (token_type > 0) token_count++;
    }

    return token_count;
  });

  bench("Map with string keys", () => {
    const transitions = new Map();

    // Initialize transitions
    for (let s = 0; s < state_count; s++) {
      for (let a = 0; a < action_count; a++) {
        transitions.set(`${s},${a}`, {
          next_state: (s + 1) % state_count,
          token_type: a,
          stack_op: 0,
        });
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const transition = transitions.get(`${state},${action}`);
      if (transition) {
        state = transition.next_state;
        if (transition.token_type > 0) token_count++;
      }
    }

    return token_count;
  });

  bench("Nested Objects", () => {
    const transitions = {};

    // Initialize transitions
    for (let s = 0; s < state_count; s++) {
      transitions[s] = {};
      for (let a = 0; a < action_count; a++) {
        transitions[s][a] = {
          next_state: (s + 1) % state_count,
          token_type: a,
          stack_op: 0,
        };
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const transition = transitions[state][action];
      if (transition) {
        state = transition.next_state;
        if (transition.token_type > 0) token_count++;
      }
    }

    return token_count;
  });
});

describe("Token Type Mapping", () => {
  const token_types = [
    "keyword",
    "identifier",
    "string",
    "number",
    "comment",
    "operator",
    "punctuation",
    "whitespace",
    "bracket",
    "semicolon",
  ];

  bench("Integer with Array Lookup", () => {
    // Map token names to integers
    const type_to_int = {};
    const int_to_type = [];

    token_types.forEach((type, i) => {
      type_to_int[type] = i;
      int_to_type[i] = type;
    });

    // Simulate tokenization with integer types
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      tokens.push(type_to_int[token_types[i % token_types.length]]);
    }

    // Convert back for rendering
    const results = [];
    for (const token of tokens) {
      results.push(int_to_type[token]);
    }

    return results.length;
  });

  bench("String Keys Directly", () => {
    // Use strings directly
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      tokens.push(token_types[i % token_types.length]);
    }

    // No conversion needed for rendering
    const results = [];
    for (const token of tokens) {
      results.push(token);
    }

    return results.length;
  });

  bench("Map Lookup", () => {
    const type_map = new Map();
    token_types.forEach((type, i) => {
      type_map.set(type, i);
    });

    const reverse_map = new Map();
    token_types.forEach((type, i) => {
      reverse_map.set(i, type);
    });

    // Simulate tokenization
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      const type = token_types[i % token_types.length];
      tokens.push(type_map.get(type));
    }

    // Convert back for rendering
    const results = [];
    for (const token of tokens) {
      results.push(reverse_map.get(token));
    }

    return results.length;
  });
});

describe("Stack Operations", () => {
  bench("Pre-allocated Uint8Array", () => {
    const stack = new Uint8Array(256);
    let stack_ptr = 0;
    let operations = 0;

    for (let i = 0; i < 1000; i++) {
      if (i % 3 === 0 && stack_ptr < 255) {
        // Push
        stack[stack_ptr++] = i % 10;
        operations++;
      } else if (stack_ptr > 0) {
        // Pop
        const value = stack[--stack_ptr];
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
    let stack = 0; // 32-bit integer, supports 8 states of 4 bits each
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
        const value = stack & 0xf;
        stack = stack >>> 4;
        depth--;
        operations += value;
      }
    }

    return operations;
  });
});


// ---- arrow_functions.txt ----
// Simple arrow function
const add = (a, b) => a + b;

// No parameters
const greet = () => "Hello";

// Single parameter (no parens)
const double = x => x * 2;

// Block body
const calculate = (x, y) => {
  const sum = x + y;
  return sum * 2;
};

// Returning object literal
const makeUser = name => ({ name, id: 1 });

// Async arrow function
const fetchData = async () => await fetch(url);

// Arrow function in array methods
[1, 2, 3].map(n => n * 2);
items.filter(item => item.active);
data.reduce((acc, val) => acc + val, 0);

// ---- async_await.txt ----
// Async function declaration
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return await response.json();
}

// Async function expression
const getData = async function() {
  return await database.query();
};

// Async arrow function
const processData = async (data) => {
  const result = await transform(data);
  return result;
};

// Try-catch with async/await
async function safeFetch() {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    console.error(error);
  }
}

// Multiple awaits
async function sequential() {
  const first = await getFirst();
  const second = await getSecond(first);
  const third = await getThird(second);
  return third;
}

// Parallel awaits
async function parallel() {
  const [a, b, c] = await Promise.all([
    fetchA(),
    fetchB(),
    fetchC()
  ]);
  return { a, b, c };
}

// Async in class methods
class Service {
  async initialize() {
    this.data = await loadData();
  }
  
  async process() {
    return await this.transform();
  }
}

// Top-level await (modules)
const config = await loadConfig();
export default await initializeApp();

// ---- boolean.txt ----
true; false;


// ---- class_name.txt ----
class Foo
interface bar
extends Foo
implements bar
trait Foo
instanceof \bar
new \Foo
catch (bar)

// ---- classes.txt ----
// Basic class
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    console.log(`${this.name} makes a sound`);
  }
}

// Class inheritance
class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }

  speak() {
    super.speak();
    console.log('Woof!');
  }
}

// Static members
class MathUtils {
  static PI = 3.14159;

  static calculateArea(radius) {
    return this.PI * radius ** 2;
  }
}

// Private fields
class Person {
  #privateField;
  #privateMethod() {}

  constructor(name) {
    this.#privateField = name;
  }

  get name() {
    return this.#privateField;
  }
}

// Class expressions
const MyClass = class {
  constructor() {}
};

const NamedClass = class CustomName {
  static getName() {
    return CustomName.name;
  }
};

// Getters and setters
class Temperature {
  #celsius;

  get celsius() {
    return this.#celsius;
  }

  set celsius(value) {
    this.#celsius = value;
  }

  get fahrenheit() {
    return this.#celsius * 9/5 + 32;
  }

  set fahrenheit(value) {
    this.#celsius = (value - 32) * 5/9;
  }
}

// Static initialization blocks
class Config {
  static data;

  static {
    this.data = loadConfig();
  }
}


// ---- comment.txt ----
// foobar
/**/
/* foo
bar */

/*
//
*/

// ---- control_flow.txt ----
// If-else statements
if (condition) {
  doSomething();
} else if (otherCondition) {
  doSomethingElse();
} else {
  doDefault();
}

// Ternary operator
const result = condition ? valueIfTrue : valueIfFalse;
const nested = a ? b ? c : d : e;

// Switch statement
switch (value) {
  case 1:
    handleOne();
    break;
  case 2:
  case 3:
    handleTwoOrThree();
    break;
  default:
    handleDefault();
}

// For loops
for (let i = 0; i < 10; i++) {
  console.log(i);
}

for (const item of array) {
  process(item);
}

for (const key in object) {
  if (object.hasOwnProperty(key)) {
    handle(object[key]);
  }
}

// While loops
while (condition) {
  doWork();
}

do {
  attemptOperation();
} while (shouldRetry);

// Try-catch-finally
try {
  riskyOperation();
} catch (error) {
  handleError(error);
} finally {
  cleanup();
}

// Throw statements
throw new Error('Something went wrong');
throw { code: 'INVALID', message: 'Invalid input' };

// Break and continue
for (let i = 0; i < 10; i++) {
  if (i === 5) continue;
  if (i === 8) break;
  process(i);
}

// Labeled statements
outer: for (let i = 0; i < 3; i++) {
  inner: for (let j = 0; j < 3; j++) {
    if (i === j) continue outer;
    if (j === 2) break inner;
  }
}

// ---- destructuring.txt ----
// Array destructuring
const [a, b] = [1, 2];
const [first, , third] = array;
const [head, ...tail] = list;

// Object destructuring
const { name, age } = person;
const { x: newX, y: newY } = point;
const { prop = 'default' } = obj;

// Nested destructuring
const { user: { name, email } } = data;
const [{ id }, { title }] = items;

// Mixed destructuring
const { data: [first, second] } = response;

// Function parameters
function process({ id, name }) {}
const handler = ({ type, payload }) => {};

// Rest in objects
const { a, b, ...rest } = object;
const { ...copy } = original;

// Destructuring with renaming and defaults
const { 
  name: userName = 'Anonymous',
  role: userRole = 'guest'
} = user;

// Complex patterns
const [
  {
    meta: { version }
  },
  ...entries
] = data;

// ---- function_call.txt ----
foo()

foo_bar()

f42()

fn(1, 2, 3, "hello", true)

fn(1, 2, 3, "hello", true);

// ---- function_def.txt ----
foo() {

}

foo_bar(one, two, three) {

}


const foo = (x, y) => x + y;

const bar = async (x, y) => x + y;

const baz = function() {

}

const obj = {
  foo() {
  },
  bar: (x, y) => x + y,
  baz: async (x, y) => x + y,
}

const foo = (a, (b, c)) => (a, b, c)
const foo = cond ? () => 1 : () => 2
const foo = foo = (() => fn)()
const foo = (a, (b, (c, d))) => (a, b, c, d)


// ---- generators_iterators.txt ----
// Generator functions
function* simpleGenerator() {
  yield 1;
  yield 2;
  yield 3;
}

// Generator with parameters
function* fibonacci(n) {
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// Yield delegation
function* delegator() {
  yield* [1, 2, 3];
  yield* otherGenerator();
}

// Async generators
async function* asyncGenerator() {
  yield await fetchData(1);
  yield await fetchData(2);
  yield await fetchData(3);
}

// Iterator protocol
const iterator = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next() {
        return i < 10
          ? { value: i++, done: false }
          : { done: true };
      }
    };
  }
};

// Generator expressions
const gen = (function* () {
  yield* range(1, 10);
})();

// Yield in expressions
function* expressionYield() {
  const x = yield 1;
  const y = 2 + (yield 3);
  return x + y;
}

// For-of with generators
for (const value of simpleGenerator()) {
  console.log(value);
}

// Async iteration
for await (const chunk of asyncGenerator()) {
  process(chunk);
}

// ---- keywords.txt ----
if; else; while; do; for;
return; in; instanceof; function; new;
try; throw; catch; finally; null;
break; continue;

// ---- modern_operators.txt ----
// Nullish coalescing (??)
const value = input ?? defaultValue;
const port = process.env.PORT ?? 3000;
config.timeout = options.timeout ?? 5000;

// Optional chaining (?.)
const city = user?.address?.city;
const result = obj?.method?.();
const item = arr?.[index];
const value = func?.();

// Logical assignment operators
x ||= 1;  // x = x || 1
y &&= 2;  // y = y && 2
z ??= 3;  // z = z ?? 3

// Exponentiation (**)
const squared = 2 ** 2;
const cubed = 3 ** 3;
base **= exponent;

// Spread operator (...)
const newArray = [...oldArray];
const combined = [...arr1, ...arr2];
const copy = { ...original };
const merged = { ...defaults, ...options };
Math.max(...numbers);
fn(...args);

// Rest parameters
function sum(...numbers) {}
const [first, ...rest] = array;
const { a, ...others } = object;

// Bitwise operators
const shifted = value >>> 2;
flags &= ~MASK;
bits |= FLAG;
result ^= key;
value <<= 1;
value >>= 1;
value >>>= 1;

// Compound assignments
total += amount;
count -= 1;
result *= factor;
average /= count;
remainder %= divisor;

// Increment/decrement
++counter;
--index;
value++;
score--;

// ---- modules.txt ----
// Named exports
export const API_URL = 'https://api.example.com';
export let counter = 0;
export var config = {};

export function processData(data) {
  return transform(data);
}

export class DataProcessor {
  process() {}
}

// Default export
export default function main() {}
export default class Application {}
export default { key: 'value' };

// Named imports
import { Component, createElement } from 'react';
import { readFile, writeFile } from 'fs';

// Default import
import React from 'react';
import _ from 'lodash';

// Aliased imports
import { longNamedExport as short } from './module';
import { default as MyClass } from './class';

// Namespace import
import * as utils from './utils';
import * as constants from './constants';

// Mixed imports
import defaultExport, { namedExport } from './module';
import MyComponent, { helper, CONSTANT } from './component';

// Re-exports
export { field1, field2 } from './module';
export { default } from './other';
export * from './utilities';
export * as namespace from './lib';

// Dynamic imports
import('./module').then(module => {});
const module = await import('./lazy-module');

// Import assertions (JSON modules)
import data from './data.json' assert { type: 'json' };
import config from './config.json' with { type: 'json' };

// ---- number_literals.txt ----
// Integer literals
42
0
1000000

// Decimal literals
3.14159
0.5
.5
10.
1.23e4
2e10
3.14e-10

// Binary literals (ES6)
0b1010  // 10
0B1111  // 15
0b11111111  // 255

// Octal literals (ES6)
0o755  // 493
0O644  // 420
0o10   // 8

// Hexadecimal literals
0xFF    // 255
0x10    // 16
0xDEADBEEF
0X1234ABCD

// BigInt literals (ES2020)
123n
0n
1000000000000000000000n
0x1fffffffffffff
0b11111111111111111n
0o777777777777n

// Numeric separators (ES2021)
1_000_000
3.141_592_653
0xFF_FF_FF
0b1111_0000_1111_0000
123_456_789n

// Scientific notation
1e3     // 1000
1e-3    // 0.001
1.5e10
2.5e-5
6.022e23  // Avogadro's number

// Special numeric values
Infinity
-Infinity
NaN

// Number with unary operators
+42
-3.14
~15
+0xff
-0b1010

// ---- numbers.txt ----
42
3.14159
4e10
2.1e-10
0.4e+2
0xbabe
0xBABE

// ---- operators.txt ----
- + -- ++
< <= > >=
= == ===
! != !==
& && | ||
? * ~ ^ %

// bare `/` is regex
/hi/

// division
1 / 2 / 3 / 4 / 5


// ---- regex_literals.txt ----
// Simple regex literals
/pattern/
/hello world/
/\d+/
/[a-z]/

// Regex with flags
/pattern/gi
/test/img
/unicode/u
/dotall/s
/sticky/y

// Character classes
/[abc]/
/[^xyz]/
/[0-9]/
/[a-zA-Z]/
/[\w\s]/

// Quantifiers
/a*/
/b+/
/c?/
/d{3}/
/e{2,5}/
/f{4,}/

// Anchors
/^start/
/end$/
/\bword\b/
/\Bnot\B/

// Groups and alternation
/(group)/
/(?:non-capturing)/
/(?<named>group)/
/(a|b|c)/
/(?=lookahead)/
/(?!negative)/

// Escape sequences
/\./
/\\/
/\n/
/\t/
/\x41/
/\u0041/

// Complex patterns
/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}/
/(?:\d{3}|\(\d{3}\))([-\/\.])\d{3}\1\d{4}/

// Regex in context
const pattern = /test/g;
if (/^\d+$/.test(input)) {}
string.replace(/old/g, 'new');
text.match(/\w+/g);
data.split(/\s*,\s*/);

// Not regex (division operator context)
const result = 10 / 2;
const calc = a / b / c;
x = y /= 2;

// ---- strings.txt ----
""
''
"f\"oo"
'b\'ar'
"foo\
bar"
'foo\
bar'
"foo /* comment */ bar"
'foo // bar'
'foo // bar' //comment

// ---- tagged_templates.txt ----
// ==========================================================================
// Tagged template literals — JS hosting HTML and CSS via the reclassifier
// ==========================================================================
//
// Every tagged template below is fully tokenised: the contents are handed
// to the HTML or CSS sub-language, positions are remapped, and the backticks
// are preserved as template tokens. Interpolations (`${expr}`) stay as JS.


// --- Non-interpolated tagged templates -------------------------------------

const greeting = html`<p class="hi">Hello, world</p>`;
const theme = css`
	:root {
		--primary: #0070f3;
		--bg: #0a0a0a;
	}
	body {
		background: var(--bg);
		color: var(--primary);
		font-family: system-ui, sans-serif;
	}
`;


// --- Content-position interpolations ---------------------------------------
//
// The sub-language sees a well-formed document (with space-filled holes)
// and the matching tokens get spliced back at the real positions.

const welcome = (name) => html`
	<section class="welcome">
		<h1>Hello, ${name}!</h1>
		<p>Welcome to <em>twinkleplop</em>.</p>
	</section>
`;

const List = ({ items }) => html`
	<ul class="list">
		${items.map((item) => html`<li>${item.label}</li>`)}
	</ul>
`;


// --- Attribute-position interpolations (the exemplar case) -----------------
//
// The HTML sub-tokenizer sees `<p class="   ">hi</p>` and correctly parses
// the attribute value as a string. The string token then splits at the
// hole boundary so the ${cls} tokens sit between two `"` string pieces.

const Card = ({ variant, href, title }) => html`
	<article class="card card--${variant}" data-id="${title}">
		<a class="card__link" href="${href}" target="_blank" rel="noopener">
			${title}
		</a>
	</article>
`;


// --- Tag-name-position interpolations --------------------------------------

const Dynamic = (Tag, children) => html`<${Tag} class="dynamic">${children}</${Tag}>`;


// --- Nested brace expressions (grammar-layer brace-depth tracking) ---------

const meta = html`
	<meta name="config" content="${JSON.stringify({ theme: "dark", debug: true })}" />
	<meta name="size" content="${getSize({ width: 1024, height: 768 })}" />
`;


// --- CSS-tagged templates --------------------------------------------------

const buttonStyles = (color) => css`
	.btn {
		background: ${color};
		padding: 0.5rem 1rem;
		border-radius: 4px;
	}
	.btn:hover {
		filter: brightness(1.1);
	}
`;


// --- HTML with embedded CSS via css`...` -----------------------------------
//
// Recursion: the outer html`...` embeds HTML, and the css`...` expression
// inside its <style> interpolation embeds CSS. Everything composes through
// the reclassifier.

const Page = () => html`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<title>Demo</title>
			<style>${css`body { margin: 0; background: #111; }`}</style>
		</head>
		<body>
			<h1>Hello</h1>
		</body>
	</html>
`;


// --- Function-variable rule still fires around tagged templates ------------

const render = (data) => html`
	<output>${JSON.stringify(data)}</output>
`;

const compute = async () => {
	const data = await fetch("/api/data");
	return render(await data.json());
};


// ---- template_literals.txt ----
// Basic template literal
`Hello World`

// String interpolation
`Hello ${name}!`
`The answer is ${40 + 2}`

// Multi-line template
`This is
a multi-line
template literal`

// Nested templates
`Outer ${`Inner ${depth}`} text`

// Complex expressions
`User: ${user.firstName} ${user.lastName}`
`Total: $${price * quantity}`
`Status: ${isActive ? 'Active' : func("inactive")}`

// With function calls
`Result: ${calculate(x, y)}`
`Length: ${str.length}`
`Upper: ${text.toUpperCase()}`

// Escaping
`Line 1\nLine 2`
`Tab\there`
`Quote: \`nested\``

// Tagged templates
html`<div>${content}</div>`
css`.class { color: ${color}; }`
gql`query { user(id: ${id}) { name } }`
tmpl`heloo ${name()}`

// Nested braces inside interpolations — stack-tracked brace depth so the
// first `}` inside an inner object/block doesn't close the interpolation.
`${fn({a: 1})}`
`${{a: 1}}`
`${{a: {b: 2}}}`
`${function() { return 1; }}`
`${() => ({key: val})}`
`${obj.method({k: v}).b}`


// ---- lib/bench/src/library/tokenization-suite.bench.js ----
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
          if (
            !(
              (c >= 65 && c <= 90) ||
              (c >= 97 && c <= 122) ||
              (c >= 48 && c <= 57) ||
              c === 95 ||
              c === 36
            )
          ) {
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
      if (string_heavy_code.charCodeAt(i) === 34) {
        // "
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2; // skip escape
          } else if (char === 34) {
            // closing quote
            i++;
            break;
          } else {
            i++;
          }
        }
        tokens.push({ type: "string", start, end: i });
        continue;
      }

      if (string_heavy_code.charCodeAt(i) === 39) {
        // '
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2;
          } else if (char === 39) {
            // closing quote
            i++;
            break;
          } else {
            i++;
          }
        }
        tokens.push({ type: "string", start, end: i });
        continue;
      }

      if (string_heavy_code.charCodeAt(i) === 96) {
        // `
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2;
          } else if (char === 96) {
            // closing backtick
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
    "function",
    "const",
    "let",
    "var",
    "if",
    "else",
    "for",
    "while",
    "return",
    "class",
    "async",
    "await",
    "new",
    "this",
    "super",
  ]);

  const identifier_code =
    "function processData const results async transform return filter class DataProcessor";

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
      if (remaining[0] === " ") {
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
      if (char === 62) {
        // >
        if (i + 1 < complex_code.length && complex_code.charCodeAt(i + 1) === 62) {
          if (i + 2 < complex_code.length && complex_code.charCodeAt(i + 2) === 62) {
            tokens.push({ type: ">>>", start, end: i + 3 });
            i += 3;
            continue;
          }
        }
      }

      if (char === 61) {
        // =
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
      /^./, // fallback
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


// ---- lib/bench/src/library/micro-optimizations.bench.js ----
import { bench, describe } from "vitest";

// Micro-benchmarks to validate tokenizer inner-loop ideas in isolation

describe("Probe State Lookup", () => {
  const STATES = 64;
  const iterations = 2_000_000;

  // Set-based membership
  const probe_set = new Set();
  for (let i = 0; i < STATES; i += 5) probe_set.add(i);

  // Uint8Array mask membership
  const probe_mask = new Uint8Array(STATES);
  for (let i = 0; i < STATES; i += 5) probe_mask[i] = 1;

  bench("Set.has(state)", () => {
    let hits = 0;
    for (let i = 0, s = 0; i < iterations; i++, s = (s + 1) % STATES) {
      if (probe_set.has(s)) hits++;
    }
    return hits;
  });

  bench("Uint8Array[state]", () => {
    let hits = 0;
    for (let i = 0, s = 0; i < iterations; i++, s = (s + 1) % STATES) {
      if (probe_mask[s]) hits++;
    }
    return hits;
  });
});

describe("Failed Probe Guard", () => {
  const iterations = 5_000_000;
  const set = new Set();
  // Simulate some failures recorded
  for (let i = 0; i < 100; i++) set.add(i);
  const has_failures = set.size > 0; // boolean flag alternative

  bench("Check set.size > 0 each time", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      if (set.size > 0) sum++;
    }
    return sum;
  });

  bench("Precomputed boolean flag", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      if (has_failures) sum++;
    }
    return sum;
  });
});

describe("Pattern Code Storage", () => {
  // Compare matching loop against number[] vs Uint16Array for codes
  const make_word = (len) => {
    let s = "";
    for (let i = 0; i < len; i++) s += String.fromCharCode(65 + (i % 26));
    return s;
  };
  const input = make_word(64) + make_word(64); // ensure a few full matches
  const codes_array = Array.from(input).map((c) => c.charCodeAt(0));
  const codes_typed = new Uint16Array(codes_array);
  const pos = 0;
  const len = input.length;

  bench("number[] compare", () => {
    let matched = true;
    for (let i = 1; i < codes_array.length && pos + i < len; i++) {
      if (input.charCodeAt(pos + i) !== codes_array[i]) {
        matched = false;
        break;
      }
    }
    return matched;
  });

  bench("Uint16Array compare", () => {
    let matched = true;
    for (let i = 1; i < codes_typed.length && pos + i < len; i++) {
      if (input.charCodeAt(pos + i) !== codes_typed[i]) {
        matched = false;
        break;
      }
    }
    return matched;
  });
});

describe("Index Base Calculation", () => {
  const iterations = 10_000_000;
  bench("state * 128", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      const state = i & 0xff;
      sum += state * 128;
    }
    return sum;
  });

  bench("state << 7", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      const state = i & 0xff;
      sum += state << 7;
    }
    return sum;
  });
});

describe("Non-ASCII lookup structures", () => {
  const codes = [];
  for (let i = 200; i < 600; i += 3) codes.push(i);
  const value = 42;

  // Map-based
  const map = new Map();
  for (const c of codes) map.set(c, value);

  // Object-based
  const obj = Object.create(null);
  for (const c of codes) obj[c] = value;

  // Sparse typed array (range-limited)
  const max = Math.max(...codes);
  const arr = new Uint16Array(max + 1);
  for (const c of codes) arr[c] = value;

  const iters = 5_000_0; // 50k lookups per structure
  const query = codes.concat([1337, 2049, 1025, 777]);

  bench("Map.has + get", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        if (map.has(c)) sum += map.get(c);
      }
    }
    return sum;
  });

  bench("Object property check", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        const v = obj[c];
        if (v !== undefined) sum += v;
      }
    }
    return sum;
  });

  bench("Typed array direct index", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        const v = arr[c];
        if (v !== 0) sum += v;
      }
    }
    return sum;
  });
});


// ---- lib/bench/src/library/data-structures-suite.bench.js ----
import { bench, describe } from "vitest";

// ============================================================================
// Data Structures and Optimization Suite
// Benchmarks for token storage, lookup tables, and state management
// ============================================================================

describe("Token Storage Strategies", () => {
  const token_count = 1000;

  bench("Flat Uint32Array (triplets)", () => {
    const tokens = new Uint32Array(token_count * 3);

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      tokens[i * 3] = i % 20; // type
      tokens[i * 3 + 1] = i * 10; // start
      tokens[i * 3 + 2] = i * 10 + 8; // end
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
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
    for (let i = 0; i < token_count; i++) {
      tokens.push({
        type: i % 20,
        start: i * 10,
        end: i * 10 + 8,
      });
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      const { type, start, end } = tokens[i];
      sum += type + start + end;
    }

    return sum;
  });

  bench("Structure of Arrays (SoA)", () => {
    const types = new Uint8Array(token_count);
    const starts = new Uint32Array(token_count);
    const ends = new Uint32Array(token_count);

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      types[i] = i % 20;
      starts[i] = i * 10;
      ends[i] = i * 10 + 8;
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      sum += types[i] + starts[i] + ends[i];
    }

    return sum;
  });

  bench("Array of Arrays", () => {
    const tokens = [];

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      tokens.push([i % 20, i * 10, i * 10 + 8]);
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      const [type, start, end] = tokens[i];
      sum += type + start + end;
    }

    return sum;
  });
});

describe("Lookup Table Performance", () => {
  // ASCII character classification
  const is_alpha = new Uint8Array(128);
  const is_digit = new Uint8Array(128);
  const is_whitespace = new Uint8Array(128);

  // Initialize lookup tables
  for (let i = 65; i <= 90; i++) is_alpha[i] = 1; // A-Z
  for (let i = 97; i <= 122; i++) is_alpha[i] = 1; // a-z
  for (let i = 48; i <= 57; i++) is_digit[i] = 1; // 0-9
  is_whitespace[32] = 1; // space
  is_whitespace[9] = 1; // tab
  is_whitespace[10] = 1; // newline
  is_whitespace[13] = 1; // carriage return

  const test_string = "Hello123 World456\n\tTest789";

  bench("Uint8Array Lookup", () => {
    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if (char < 128) {
        if (is_alpha[char]) alpha_count++;
        if (is_digit[char]) digit_count++;
        if (is_whitespace[char]) ws_count++;
      }
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Direct Comparison", () => {
    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
        alpha_count++;
      }
      if (char >= 48 && char <= 57) {
        digit_count++;
      }
      if (char === 32 || char === 9 || char === 10 || char === 13) {
        ws_count++;
      }
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Set Lookup", () => {
    const alpha_set = new Set();
    const digit_set = new Set();
    const ws_set = new Set([32, 9, 10, 13]);

    for (let i = 65; i <= 90; i++) alpha_set.add(i);
    for (let i = 97; i <= 122; i++) alpha_set.add(i);
    for (let i = 48; i <= 57; i++) digit_set.add(i);

    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if (alpha_set.has(char)) alpha_count++;
      if (digit_set.has(char)) digit_count++;
      if (ws_set.has(char)) ws_count++;
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Map Lookup", () => {
    const char_types = new Map();

    for (let i = 65; i <= 90; i++) char_types.set(i, "alpha");
    for (let i = 97; i <= 122; i++) char_types.set(i, "alpha");
    for (let i = 48; i <= 57; i++) char_types.set(i, "digit");
    char_types.set(32, "whitespace");
    char_types.set(9, "whitespace");
    char_types.set(10, "whitespace");
    char_types.set(13, "whitespace");

    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const type = char_types.get(test_string.charCodeAt(i));
      if (type === "alpha") alpha_count++;
      else if (type === "digit") digit_count++;
      else if (type === "whitespace") ws_count++;
    }

    return { alpha_count, digit_count, ws_count };
  });
});

describe("State Machine Transitions", () => {
  const state_count = 10;
  const action_count = 5;

  bench("Computed Index (integer keys)", () => {
    // Flat array: [newState, token_type, stack_op]
    const transitions = new Uint8Array(state_count * action_count * 3);

    // Initialize some transitions
    for (let s = 0; s < state_count; s++) {
      for (let a = 0; a < action_count; a++) {
        const idx = (s * action_count + a) * 3;
        transitions[idx] = (s + 1) % state_count; // next state
        transitions[idx + 1] = a; // token type
        transitions[idx + 2] = 0; // no stack op
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const idx = (state * action_count + action) * 3;
      state = transitions[idx];
      const token_type = transitions[idx + 1];
      if (token_type > 0) token_count++;
    }

    return token_count;
  });

  bench("Map with string keys", () => {
    const transitions = new Map();

    // Initialize transitions
    for (let s = 0; s < state_count; s++) {
      for (let a = 0; a < action_count; a++) {
        transitions.set(`${s},${a}`, {
          next_state: (s + 1) % state_count,
          token_type: a,
          stack_op: 0,
        });
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const transition = transitions.get(`${state},${action}`);
      if (transition) {
        state = transition.next_state;
        if (transition.token_type > 0) token_count++;
      }
    }

    return token_count;
  });

  bench("Nested Objects", () => {
    const transitions = {};

    // Initialize transitions
    for (let s = 0; s < state_count; s++) {
      transitions[s] = {};
      for (let a = 0; a < action_count; a++) {
        transitions[s][a] = {
          next_state: (s + 1) % state_count,
          token_type: a,
          stack_op: 0,
        };
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const transition = transitions[state][action];
      if (transition) {
        state = transition.next_state;
        if (transition.token_type > 0) token_count++;
      }
    }

    return token_count;
  });
});

describe("Token Type Mapping", () => {
  const token_types = [
    "keyword",
    "identifier",
    "string",
    "number",
    "comment",
    "operator",
    "punctuation",
    "whitespace",
    "bracket",
    "semicolon",
  ];

  bench("Integer with Array Lookup", () => {
    // Map token names to integers
    const type_to_int = {};
    const int_to_type = [];

    token_types.forEach((type, i) => {
      type_to_int[type] = i;
      int_to_type[i] = type;
    });

    // Simulate tokenization with integer types
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      tokens.push(type_to_int[token_types[i % token_types.length]]);
    }

    // Convert back for rendering
    const results = [];
    for (const token of tokens) {
      results.push(int_to_type[token]);
    }

    return results.length;
  });

  bench("String Keys Directly", () => {
    // Use strings directly
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      tokens.push(token_types[i % token_types.length]);
    }

    // No conversion needed for rendering
    const results = [];
    for (const token of tokens) {
      results.push(token);
    }

    return results.length;
  });

  bench("Map Lookup", () => {
    const type_map = new Map();
    token_types.forEach((type, i) => {
      type_map.set(type, i);
    });

    const reverse_map = new Map();
    token_types.forEach((type, i) => {
      reverse_map.set(i, type);
    });

    // Simulate tokenization
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      const type = token_types[i % token_types.length];
      tokens.push(type_map.get(type));
    }

    // Convert back for rendering
    const results = [];
    for (const token of tokens) {
      results.push(reverse_map.get(token));
    }

    return results.length;
  });
});

describe("Stack Operations", () => {
  bench("Pre-allocated Uint8Array", () => {
    const stack = new Uint8Array(256);
    let stack_ptr = 0;
    let operations = 0;

    for (let i = 0; i < 1000; i++) {
      if (i % 3 === 0 && stack_ptr < 255) {
        // Push
        stack[stack_ptr++] = i % 10;
        operations++;
      } else if (stack_ptr > 0) {
        // Pop
        const value = stack[--stack_ptr];
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
    let stack = 0; // 32-bit integer, supports 8 states of 4 bits each
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
        const value = stack & 0xf;
        stack = stack >>> 4;
        depth--;
        operations += value;
      }
    }

    return operations;
  });
});
