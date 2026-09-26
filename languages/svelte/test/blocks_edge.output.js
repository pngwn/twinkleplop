export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 75,
		"match": "<!-- block heads share the same brace-tracking as `{expression}`: strings, "
	},
	{
		"type": "comment",
		"start": 75,
		"end": 78,
		"match": "-->"
	},
	{
		"type": "comment",
		"start": 79,
		"end": 150,
		"match": "<!-- `//…\\n` / `/*…*/` comments, and nested `{...}` are handled. regex "
	},
	{
		"type": "comment",
		"start": 150,
		"end": 153,
		"match": "-->"
	},
	{
		"type": "comment",
		"start": 154,
		"end": 219,
		"match": "<!-- literals are not, so inputs below are captured incorrectly. "
	},
	{
		"type": "comment",
		"start": 219,
		"end": 222,
		"match": "-->"
	},
	{
		"type": "comment",
		"start": 224,
		"end": 296,
		"match": "<!-- 1. regex literal containing `}` inside an `#if` head closes early. "
	},
	{
		"type": "comment",
		"start": 296,
		"end": 299,
		"match": "-->"
	},
	{
		"type": "expression",
		"start": 300,
		"end": 301,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 301,
		"end": 302,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 302,
		"end": 304,
		"match": "if"
	},
	{
		"type": "raw_svelte_expression",
		"start": 304,
		"end": 306,
		"match": " /"
	},
	{
		"type": "expression",
		"start": 306,
		"end": 307,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 319,
		"end": 320,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 320,
		"end": 321,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 321,
		"end": 322,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 329,
		"end": 331,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 331,
		"end": 332,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 332,
		"end": 333,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 334,
		"end": 335,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 335,
		"end": 336,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 336,
		"end": 338,
		"match": "if"
	},
	{
		"type": "expression",
		"start": 338,
		"end": 339,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 341,
		"end": 395,
		"match": "<!-- 2. same failure mode inside an `#each` iterable. "
	},
	{
		"type": "comment",
		"start": 395,
		"end": 398,
		"match": "-->"
	},
	{
		"type": "expression",
		"start": 399,
		"end": 400,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 400,
		"end": 401,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 401,
		"end": 405,
		"match": "each"
	},
	{
		"type": "raw_svelte_expression",
		"start": 405,
		"end": 427,
		"match": " items.filter((x) => /"
	},
	{
		"type": "expression",
		"start": 427,
		"end": 428,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 449,
		"end": 450,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 450,
		"end": 452,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 452,
		"end": 453,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 453,
		"end": 454,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 454,
		"end": 458,
		"match": "item"
	},
	{
		"type": "expression",
		"start": 458,
		"end": 459,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 459,
		"end": 461,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 461,
		"end": 463,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 463,
		"end": 464,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 465,
		"end": 466,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 466,
		"end": 467,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 467,
		"end": 471,
		"match": "each"
	},
	{
		"type": "expression",
		"start": 471,
		"end": 472,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 474,
		"end": 525,
		"match": "<!-- 3. same failure mode inside an `@const` body. "
	},
	{
		"type": "comment",
		"start": 525,
		"end": 528,
		"match": "-->"
	},
	{
		"type": "expression",
		"start": 529,
		"end": 530,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 530,
		"end": 531,
		"match": "@"
	},
	{
		"type": "svelte_block",
		"start": 531,
		"end": 536,
		"match": "const"
	},
	{
		"type": "raw_svelte_expression",
		"start": 536,
		"end": 547,
		"match": " marker = /"
	},
	{
		"type": "expression",
		"start": 547,
		"end": 548,
		"match": "}"
	}
];
