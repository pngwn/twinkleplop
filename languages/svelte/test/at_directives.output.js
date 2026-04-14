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
		"match": "@"
	},
	{
		"type": "svelte-block",
		"start": 2,
		"end": 6,
		"match": "html"
	},
	{
		"type": "raw_svelte_expression",
		"start": 6,
		"end": 16,
		"match": " rawMarkup"
	},
	{
		"type": "expression",
		"start": 16,
		"end": 17,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 18,
		"end": 19,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 19,
		"end": 20,
		"match": "@"
	},
	{
		"type": "svelte-block",
		"start": 20,
		"end": 25,
		"match": "const"
	},
	{
		"type": "raw_svelte_expression",
		"start": 25,
		"end": 45,
		"match": " doubled = count * 2"
	},
	{
		"type": "expression",
		"start": 45,
		"end": 46,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 47,
		"end": 48,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 48,
		"end": 49,
		"match": "@"
	},
	{
		"type": "svelte-block",
		"start": 49,
		"end": 54,
		"match": "debug"
	},
	{
		"type": "raw_svelte_expression",
		"start": 54,
		"end": 68,
		"match": " user, profile"
	},
	{
		"type": "expression",
		"start": 68,
		"end": 69,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 70,
		"end": 71,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 71,
		"end": 72,
		"match": "@"
	},
	{
		"type": "svelte-block",
		"start": 72,
		"end": 78,
		"match": "render"
	},
	{
		"type": "raw_svelte_expression",
		"start": 78,
		"end": 91,
		"match": " row(item, 0)"
	},
	{
		"type": "expression",
		"start": 91,
		"end": 92,
		"match": "}"
	}
];
