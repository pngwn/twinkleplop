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
