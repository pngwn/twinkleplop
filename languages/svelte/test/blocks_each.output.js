export const test = [
	{
		"type": "expression",
		"start": 0,
		"end": 1,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 1,
		"end": 2,
		"match": "#"
	},
	{
		"type": "svelte-block",
		"start": 2,
		"end": 6,
		"match": "each"
	},
	{
		"type": "raw_svelte_expression",
		"start": 6,
		"end": 33,
		"match": " items as item, i (item.id)"
	},
	{
		"type": "expression",
		"start": 33,
		"end": 34,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 36,
		"end": 37,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 37,
		"end": 39,
		"match": "li"
	},
	{
		"type": "tag-boundary",
		"start": 39,
		"end": 40,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 40,
		"end": 41,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 41,
		"end": 50,
		"match": "item.name"
	},
	{
		"type": "expression",
		"start": 50,
		"end": 51,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 51,
		"end": 53,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 53,
		"end": 55,
		"match": "li"
	},
	{
		"type": "tag-boundary",
		"start": 55,
		"end": 56,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 57,
		"end": 58,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 58,
		"end": 59,
		"match": ":"
	},
	{
		"type": "svelte-block",
		"start": 59,
		"end": 63,
		"match": "else"
	},
	{
		"type": "expression",
		"start": 63,
		"end": 64,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 66,
		"end": 67,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 67,
		"end": 69,
		"match": "li"
	},
	{
		"type": "tag-boundary",
		"start": 69,
		"end": 70,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 75,
		"end": 77,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 77,
		"end": 79,
		"match": "li"
	},
	{
		"type": "tag-boundary",
		"start": 79,
		"end": 80,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 81,
		"end": 82,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 82,
		"end": 83,
		"match": "/"
	},
	{
		"type": "svelte-block",
		"start": 83,
		"end": 87,
		"match": "each"
	},
	{
		"type": "expression",
		"start": 87,
		"end": 88,
		"match": "}"
	}
];
