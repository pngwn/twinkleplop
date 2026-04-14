export const test = [
	{
		"type": "punctuation",
		"start": 0,
		"end": 1,
		"match": "{"
	},
	{
		"type": "svelte-directive",
		"start": 1,
		"end": 6,
		"match": "@html"
	},
	{
		"type": "raw_svelte_expression",
		"start": 6,
		"end": 16,
		"match": " rawMarkup"
	},
	{
		"type": "punctuation",
		"start": 16,
		"end": 17,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 18,
		"end": 19,
		"match": "{"
	},
	{
		"type": "svelte-directive",
		"start": 19,
		"end": 25,
		"match": "@const"
	},
	{
		"type": "raw_svelte_expression",
		"start": 25,
		"end": 45,
		"match": " doubled = count * 2"
	},
	{
		"type": "punctuation",
		"start": 45,
		"end": 46,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 47,
		"end": 48,
		"match": "{"
	},
	{
		"type": "svelte-directive",
		"start": 48,
		"end": 54,
		"match": "@debug"
	},
	{
		"type": "raw_svelte_expression",
		"start": 54,
		"end": 68,
		"match": " user, profile"
	},
	{
		"type": "punctuation",
		"start": 68,
		"end": 69,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 70,
		"end": 71,
		"match": "{"
	},
	{
		"type": "svelte-directive",
		"start": 71,
		"end": 78,
		"match": "@render"
	},
	{
		"type": "raw_svelte_expression",
		"start": 78,
		"end": 91,
		"match": " row(item, 0)"
	},
	{
		"type": "punctuation",
		"start": 91,
		"end": 92,
		"match": "}"
	}
];
