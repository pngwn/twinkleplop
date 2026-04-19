export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 76,
		"match": "<!-- documented grammar-level limitations. the expression body skips `\"` -->"
	},
	{
		"type": "comment",
		"start": 77,
		"end": 106,
		"match": "<!-- and `'` strings plus `//"
	},
	{
		"type": "comment",
		"start": 107,
		"end": 118,
		"match": "\\n` and `/*"
	},
	{
		"type": "comment",
		"start": 119,
		"end": 154,
		"match": "*/` comments, and tracks nested -->"
	},
	{
		"type": "comment",
		"start": 155,
		"end": 229,
		"match": "<!-- `{...}` via brace counting. regex literals are not recognized, so -->"
	},
	{
		"type": "comment",
		"start": 230,
		"end": 293,
		"match": "<!-- inputs below are captured incorrectly for that reason. -->"
	},
	{
		"type": "comment",
		"start": 295,
		"end": 372,
		"match": "<!-- 1. a regex whose first `/` sits immediately after `{` is read as the -->"
	},
	{
		"type": "comment",
		"start": 373,
		"end": 438,
		"match": "<!-- close-block sigil (shared with `{/if}`, `{/each}`, etc). -->"
	},
	{
		"type": "punctuation",
		"start": 439,
		"end": 440,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 440,
		"end": 441,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 441,
		"end": 442,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 442,
		"end": 443,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 443,
		"end": 444,
		"match": "/"
	},
	{
		"type": "raw_svelte_expression",
		"start": 444,
		"end": 455,
		"match": "ab/.test(s)"
	},
	{
		"type": "expression",
		"start": 455,
		"end": 456,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 456,
		"end": 458,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 458,
		"end": 459,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 459,
		"end": 460,
		"match": ">"
	},
	{
		"type": "comment",
		"start": 462,
		"end": 537,
		"match": "<!-- 2. a regex literal containing `}` closes the expression early even -->"
	},
	{
		"type": "comment",
		"start": 538,
		"end": 592,
		"match": "<!-- when the `/` is not at the start of the body. -->"
	},
	{
		"type": "punctuation",
		"start": 593,
		"end": 594,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 594,
		"end": 595,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 595,
		"end": 596,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 596,
		"end": 597,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 597,
		"end": 606,
		"match": "x.match(/"
	},
	{
		"type": "expression",
		"start": 606,
		"end": 607,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 610,
		"end": 612,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 612,
		"end": 613,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 613,
		"end": 614,
		"match": ">"
	}
];
