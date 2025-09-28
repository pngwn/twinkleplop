// JavaScript samples of varying complexity for benchmarking

export const tinyJS = `const x = 42;`;

export const smallJS = `// Simple function with various features
function fibonacci(n) {
	if (n <= 1) return n;
	return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(\`Result: \${result}\`);
`;

export const mediumJS = `// React component with hooks and TypeScript-like syntax
import React, { useState, useEffect } from 'react';
import { fetchUserData, updateProfile } from './api';

const UserProfile = ({ userId }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	
	useEffect(() => {
		async function loadUser() {
			try {
				setLoading(true);
				const userData = await fetchUserData(userId);
				setUser(userData);
			} catch (err) {
				setError(err.message);
				console.error('Failed to load user:', err);
			} finally {
				setLoading(false);
			}
		}
		
		loadUser();
	}, [userId]);
	
	const handleUpdate = async (updates) => {
		try {
			const updated = await updateProfile(userId, updates);
			setUser(updated);
			return { success: true };
		} catch (error) {
			return { success: false, error: error.message };
		}
	};
	
	if (loading) return <div>Loading...</div>;
	if (error) return <div>Error: {error}</div>;
	
	return (
		<div className="user-profile">
			<h1>{user?.name || 'Anonymous'}</h1>
			<p>{user?.email}</p>
			<button onClick={() => handleUpdate({ verified: true })}>
				Verify Account
			</button>
		</div>
	);
};

export default UserProfile;
`;

export const largeJS = `// Complex JavaScript with various language features
import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import logger from 'redux-logger';

// Regular expressions and division operators mixed
const patterns = {
	email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/,
	phone: /^\\+?1?\\d{9,15}$/,
	url: /https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b/gi
};

// Math operations with division
function calculateStats(numbers) {
	const sum = numbers.reduce((a, b) => a + b, 0);
	const avg = sum / numbers.length;
	const variance = numbers.reduce((acc, n) => acc + Math.pow(n - avg, 2), 0) / numbers.length;
	const stdDev = Math.sqrt(variance);
	
	return {
		sum,
		average: avg,
		variance,
		standardDeviation: stdDev,
		coefficient: stdDev / avg * 100
	};
}

// Class with private fields and decorators
class DataProcessor {
	#privateKey = null;
	static instances = 0;
	
	constructor(config = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.#privateKey = crypto.randomUUID();
		DataProcessor.instances++;
	}
	
	async *processStream(dataStream) {
		for await (const chunk of dataStream) {
			if (chunk.length === 0) continue;
			
			try {
				const processed = await this.transform(chunk);
				yield processed;
			} catch (error) {
				console.error(\`Processing failed: \${error.message}\`);
				yield { error: true, message: error.message };
			}
		}
	}
	
	transform(data) {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				if (Math.random() > 0.9) {
					reject(new Error('Random failure'));
				} else {
					resolve(data.map(x => x * 2));
				}
			}, 100);
		});
	}
}

// Advanced async patterns
const asyncOperations = {
	sequential: async function(tasks) {
		const results = [];
		for (const task of tasks) {
			results.push(await task());
		}
		return results;
	},
	
	parallel: async (tasks) => {
		return await Promise.all(tasks.map(task => task()));
	},
	
	race: async (tasks, timeout = 5000) => {
		const timeoutPromise = new Promise((_, reject) => 
			setTimeout(() => reject(new Error('Timeout')), timeout)
		);
		
		return Promise.race([
			Promise.race(tasks.map(t => t())),
			timeoutPromise
		]);
	}
};

// Template literals and tagged templates
const sql = (strings, ...values) => {
	let result = strings[0];
	for (let i = 0; i < values.length; i++) {
		result += sanitize(values[i]) + strings[i + 1];
	}
	return result;
};

const query = sql\`
	SELECT * FROM users
	WHERE age > \${18}
	AND name LIKE \${'%john%'}
	ORDER BY created_at DESC
\`;

// Complex object destructuring and spread
function processUserData({ 
	name: userName = 'Anonymous',
	age,
	address: { 
		street,
		city = 'Unknown',
		...restAddress
	} = {},
	hobbies = [],
	...otherData
}) {
	const enhancedUser = {
		userName,
		age: age ?? 0,
		location: \`\${street || 'N/A'}, \${city}\`,
		additionalAddress: restAddress,
		interests: [...hobbies, ...(otherData.interests || [])],
		metadata: {
			...otherData,
			processed: new Date().toISOString(),
			valid: age >= 18 && userName !== 'Anonymous'
		}
	};
	
	return enhancedUser;
}

// Switch with regex patterns
function detectContentType(input) {
	switch (true) {
		case /^\\{.*\\}$/.test(input):
			return 'json';
		case /^<.*>$/.test(input):
			return 'xml';
		case /^\\d+$/.test(input):
			return 'number';
		case /^[\\w\\s]+$/.test(input):
			return 'text';
		default:
			return 'unknown';
	}
}

// Proxy and Reflect
const handler = {
	get(target, prop, receiver) {
		console.log(\`Accessing property: \${String(prop)}\`);
		return Reflect.get(target, prop, receiver);
	},
	
	set(target, prop, value, receiver) {
		if (typeof value === 'number' && value < 0) {
			throw new Error('Negative values not allowed');
		}
		return Reflect.set(target, prop, value, receiver);
	}
};

const proxiedData = new Proxy({ count: 0 }, handler);

// Export variations
export { DataProcessor, asyncOperations };
export const VERSION = '1.0.0';
export default class MainExport {
	static init() {
		console.log('Initialized');
	}
}
`;

export const complexJS = `// Ultra-complex JavaScript showcasing edge cases and modern features
'use strict';

// Complex regex patterns with lookahead/lookbehind
const complexPatterns = {
	// IPv4 validation
	ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
	// Credit card with spaces
	creditCard: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$/,
	// Markdown bold/italic
	markdown: /(?<!\\\\)(\\*\\*|__)(.*?)\\1|(?<!\\\\)(\\*|_)(.*?)\\3/g,
	// HTML tag matching
	htmlTag: /<(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+>/g,
	// Nested parentheses
	balanced: /\\((?:[^)(]*|\\((?:[^)(]*|\\([^)(]*\\))*\\))*\\)/g
};

// BigInt operations and numeric separators
const bigNumbers = {
	maxSafe: 9_007_199_254_740_991n,
	googol: 10n ** 100n,
	factorial: function(n) {
		if (n === 0n) return 1n;
		return n * this.factorial(n - 1n);
	},
	fibonacci: function* () {
		let [a, b] = [0n, 1n];
		while (true) {
			yield a;
			[a, b] = [b, a + b];
		}
	}
};

// Symbol usage and well-known symbols
const symbolKeys = {
	[Symbol.iterator]: function* () {
		yield* Object.values(this);
	},
	[Symbol.toStringTag]: 'CustomObject',
	[Symbol.hasInstance](instance) {
		return instance?.type === 'custom';
	},
	[Symbol.toPrimitive](hint) {
		if (hint === 'number') return 42;
		if (hint === 'string') return 'custom';
		return null;
	}
};

// WeakMap/WeakSet for memory management
const cache = new WeakMap();
const registry = new WeakSet();

class MemoryEfficientCache {
	#storage = new WeakMap();
	#refs = new WeakRef(null);
	
	set(key, value) {
		if (!registry.has(key)) {
			registry.add(key);
		}
		this.#storage.set(key, new WeakRef(value));
		return this;
	}
	
	get(key) {
		const ref = this.#storage.get(key);
		const value = ref?.deref();
		if (value === undefined) {
			this.#storage.delete(key);
		}
		return value;
	}
}

// Advanced destructuring with computed property names
const complexKey = Symbol('complex');
const { 
	[complexKey]: symbolValue,
	[\`computed_\${Date.now()}\`]: computed,
	nested: {
		deep: {
			value: deepValue = 'default',
			...deepRest
		} = {},
		...nestedRest
	} = {},
	...rest
} = { [complexKey]: 'symbol', nested: { deep: { value: 'found' } } };

// Async iterators and for-await-of
async function* asyncRange(start, end, delay = 100) {
	for (let i = start; i <= end; i++) {
		await new Promise(resolve => setTimeout(resolve, delay));
		yield i;
	}
}

// Pipeline operator simulation and function composition
const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);

const processData = pipe(
	x => x.trim(),
	x => x.toLowerCase(),
	x => x.replace(/\\s+/g, '_'),
	x => \`processed_\${x}\`
);

// Optional chaining and nullish coalescing in complex scenarios
const deepAccess = (obj) => {
	return obj?.level1?.level2?.[0]?.method?.() 
		?? obj?.fallback?.value 
		?? 'ultimate_default';
};

// Dynamic imports and code splitting
const loadModule = async (moduleName) => {
	try {
		const module = await import(\`./modules/\${moduleName}.js\`);
		return module?.default ?? module;
	} catch (error) {
		console.warn(\`Failed to load module: \${moduleName}\`);
		return null;
	}
};

// Meta-programming with Proxy traps
const metaObject = new Proxy({}, {
	get(target, prop, receiver) {
		if (prop === Symbol.iterator) {
			return function* () {
				yield* Object.keys(target);
			};
		}
		return Reflect.get(target, prop, receiver);
	},
	
	has(target, prop) {
		console.log(\`Checking existence of \${String(prop)}\`);
		return Reflect.has(target, prop);
	},
	
	deleteProperty(target, prop) {
		console.log(\`Deleting \${String(prop)}\`);
		return Reflect.deleteProperty(target, prop);
	},
	
	defineProperty(target, prop, descriptor) {
		if (descriptor.value < 0) {
			throw new TypeError('Negative values not allowed');
		}
		return Reflect.defineProperty(target, prop, descriptor);
	}
});

// Tagged template for SQL with proper escaping
function sql(strings, ...values) {
	return strings.reduce((result, str, i) => {
		const value = values[i - 1];
		const escaped = typeof value === 'string' 
			? value.replace(/'/g, "''")
			: value;
		return result + escaped + str;
	});
}

// Complex conditional with mixed operators
const complexCondition = (x, y) => {
	return (x > 0 && y > 0) 
		? x / y 
		: (x < 0 || y < 0) 
			? Math.abs(x) / Math.abs(y) 
			: (x === 0) 
				? 0 
				: Infinity;
};

// Private methods and static blocks
class AdvancedClass {
	static #privateStatic = 'hidden';
	#privateInstance = 42;
	
	static {
		// Static initialization block
		this.#privateStatic = 'initialized';
		console.log('Class initialized');
	}
	
	#privateMethod() {
		return this.#privateInstance * 2;
	}
	
	get #privateGetter() {
		return this.#privateInstance;
	}
	
	set #privateSetter(value) {
		this.#privateInstance = value;
	}
	
	publicMethod() {
		return this.#privateMethod() + this.#privateGetter;
	}
}

// Decorators (proposal stage)
function logged(value, { kind, name }) {
	if (kind === 'method') {
		return function(...args) {
			console.log(\`Calling \${name} with \${args}\`);
			const result = value.call(this, ...args);
			console.log(\`Result: \${result}\`);
			return result;
		};
	}
}

// Export all variations
export { 
	complexPatterns,
	bigNumbers,
	MemoryEfficientCache,
	asyncRange,
	pipe,
	compose 
};
export default AdvancedClass;
`;