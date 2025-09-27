import { bench, describe } from "vitest";

// Micro-benchmarks to validate tokenizer inner-loop ideas in isolation

describe("Probe State Lookup", () => {
  const STATES = 64;
  const iterations = 2_000_000;

  // Set-based membership
  const probeSet = new Set();
  for (let i = 0; i < STATES; i += 5) probeSet.add(i);

  // Uint8Array mask membership
  const probeMask = new Uint8Array(STATES);
  for (let i = 0; i < STATES; i += 5) probeMask[i] = 1;

  bench("Set.has(state)", () => {
    let hits = 0;
    for (let i = 0, s = 0; i < iterations; i++, s = (s + 1) % STATES) {
      if (probeSet.has(s)) hits++;
    }
    return hits;
  });

  bench("Uint8Array[state]", () => {
    let hits = 0;
    for (let i = 0, s = 0; i < iterations; i++, s = (s + 1) % STATES) {
      if (probeMask[s]) hits++;
    }
    return hits;
  });
});

describe("Failed Probe Guard", () => {
  const iterations = 5_000_000;
  const set = new Set();
  // Simulate some failures recorded
  for (let i = 0; i < 100; i++) set.add(i);
  const hasFailures = set.size > 0; // boolean flag alternative

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
      if (hasFailures) sum++;
    }
    return sum;
  });
});

describe("Pattern Code Storage", () => {
  // Compare matching loop against number[] vs Uint16Array for codes
  const makeWord = (len) => {
    let s = "";
    for (let i = 0; i < len; i++) s += String.fromCharCode(65 + (i % 26));
    return s;
  };
  const input = makeWord(64) + makeWord(64); // ensure a few full matches
  const codesArray = Array.from(input).map((c) => c.charCodeAt(0));
  const codesTyped = new Uint16Array(codesArray);
  const pos = 0;
  const len = input.length;

  bench("number[] compare", () => {
    let matched = true;
    for (let i = 1; i < codesArray.length && pos + i < len; i++) {
      if (input.charCodeAt(pos + i) !== codesArray[i]) {
        matched = false;
        break;
      }
    }
    return matched;
  });

  bench("Uint16Array compare", () => {
    let matched = true;
    for (let i = 1; i < codesTyped.length && pos + i < len; i++) {
      if (input.charCodeAt(pos + i) !== codesTyped[i]) {
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

