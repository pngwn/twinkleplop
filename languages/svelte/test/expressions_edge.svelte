<!-- documented grammar-level limitations. the expression body skips `"` -->
<!-- and `'` strings plus `//…\n` and `/*…*/` comments, and tracks nested -->
<!-- `{...}` via brace counting. regex literals are not recognized, so -->
<!-- inputs below are captured incorrectly for that reason. -->

<!-- 1. a regex whose first `/` sits immediately after `{` is read as the -->
<!-- close-block sigil (shared with `{/if}`, `{/each}`, etc). -->
<p>{/ab/.test(s)}</p>

<!-- 2. a regex literal containing `}` closes the expression early even -->
<!-- when the `/` is not at the start of the body. -->
<p>{x.match(/}/)}</p>
