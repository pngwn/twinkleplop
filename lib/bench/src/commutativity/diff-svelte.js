import { tokenize, reclassify } from "@twinkleplop/core";
import {
	grammar as svelte_grammar,
	reclassifiers as svelte_reclassifiers,
} from "@twinkleplop/svelte";

const src = `<script>\n  let count = 0;\n</script>\n<button on:click={inc}>\n  {#if count > 0}\n    Count is {count}\n  {:else}\n    Start\n  {/if}\n</button>\n`;

const order_a = reclassify([svelte_reclassifiers[0], svelte_reclassifiers[1]]);
const order_b = reclassify([svelte_reclassifiers[1], svelte_reclassifiers[0]]);

const raw = tokenize(src, svelte_grammar);
const a = order_a(src, { tokens: new Uint32Array(raw.tokens), token_types: raw.token_types.slice() });
const b = order_b(src, { tokens: new Uint32Array(raw.tokens), token_types: raw.token_types.slice() });

console.log("a: open → close");
console.log("b: close → open");
console.log();

for (let i = 0; i < Math.max(a.tokens.length, b.tokens.length); i += 3) {
	const at = a.token_types[a.tokens[i]] || "-";
	const bt = b.token_types[b.tokens[i]] || "-";
	const atxt = src.slice(a.tokens[i + 1], a.tokens[i + 2]);
	const btxt = src.slice(b.tokens[i + 1], b.tokens[i + 2]);
	if (at !== bt) {
		console.log(`@ ${i / 3}  a: ${at.padEnd(14)} ${JSON.stringify(atxt)}   |   b: ${bt.padEnd(14)} ${JSON.stringify(btxt)}`);
	}
}
