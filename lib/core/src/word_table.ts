// longer words share the last length slot of their first code unit
const LEN_SLOTS = 32;

export interface WordTable {
  // indexed by bucket_key
  buckets: (WordEntry[] | null)[];
  min_len: number;
  max_len: number;
  fold: boolean;
  // for a non ascii first code unit, or any non ascii code unit when folding
  // since toLowerCase can map one onto an ascii letter
  exact: Map<string, number>;
}

interface WordEntry {
  codes: Uint16Array;
  value: number;
}

// first is always ascii here
function bucket_key(first: number, len: number): number {
  return (first << 5) | (len < LEN_SLOTS ? len : LEN_SLOTS - 1);
}

// a word takes the one based index of the first group holding it, with fold
// set words must be lowercase and lookups ignore ascii case
export function compile_word_table(
  groups: readonly Iterable<string>[],
  options: { fold?: boolean } = {},
): WordTable {
  const fold = options.fold === true;
  const buckets: (WordEntry[] | null)[] = new Array(128 << 5).fill(null);
  const exact = new Map<string, number>();
  let min_len = Infinity;
  let max_len = 0;
  for (let g = 0; g < groups.length; g++) {
    for (const word of groups[g]) {
      if (word.length === 0 || exact.has(word)) continue;
      const value = g + 1;
      exact.set(word, value);
      if (word.length < min_len) min_len = word.length;
      if (word.length > max_len) max_len = word.length;
      const first = word.charCodeAt(0);
      if (first >= 128) continue;
      const codes = new Uint16Array(word.length);
      for (let i = 0; i < word.length; i++) codes[i] = word.charCodeAt(i);
      const key = bucket_key(first, word.length);
      let bucket = buckets[key];
      if (bucket === null) {
        bucket = [];
        buckets[key] = bucket;
      }
      bucket.push({ codes, value });
    }
  }
  return { buckets, min_len: min_len === Infinity ? 1 : min_len, max_len, fold, exact };
}

// 0 when the text is in no group
export function word_table_get(table: WordTable, input: string, s: number, e: number): number {
  const len = e - s;
  if (len < table.min_len || len > table.max_len) return 0;
  let first = input.charCodeAt(s);
  if (first >= 128) return word_table_exact(table, input, s, e);
  const fold = table.fold;
  if (fold && first >= 65 && first <= 90) first |= 32;
  const bucket = table.buckets[bucket_key(first, len)];
  if (bucket === null) return 0;
  for (let b = 0; b < bucket.length; b++) {
    const codes = bucket[b].codes;
    if (codes.length !== len) continue;
    let k = 1;
    for (; k < len; k++) {
      let c = input.charCodeAt(s + k);
      if (c !== codes[k]) {
        if (!fold) break;
        if (c >= 128) return word_table_exact(table, input, s, e);
        if (c < 65 || c > 90 || (c | 32) !== codes[k]) break;
      }
    }
    if (k === len) return bucket[b].value;
  }
  return 0;
}

function word_table_exact(table: WordTable, input: string, s: number, e: number): number {
  const text = table.fold ? input.slice(s, e).toLowerCase() : input.slice(s, e);
  return table.exact.get(text) ?? 0;
}
