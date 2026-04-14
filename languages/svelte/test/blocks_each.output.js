export const test = [
	{
		"type": "punctuation",
		"start": 0,
		"end": 1,
		"match": "{"
	},
	{
		"type": "svelte-block",
		"start": 1,
		"end": 6,
		"match": "#each"
	},
	{
		"type": "raw_svelte_expression",
		"start": 6,
		"end": 33,
		"match": " items as item, i (item.id)"
	},
	{
		"type": "punctuation",
		"start": 33,
		"end": 34,
		"match": "}"
	},
	{
		"type": "punctuation",
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
		"type": "punctuation",
		"start": 39,
		"end": 41,
		"match": ">{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 41,
		"end": 50,
		"match": "item.name"
	},
	{
		"type": "punctuation",
		"start": 50,
		"end": 53,
		"match": "}</"
	},
	{
		"type": "tag-name",
		"start": 53,
		"end": 55,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 55,
		"end": 56,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 57,
		"end": 58,
		"match": "{"
	},
	{
		"type": "svelte-block",
		"start": 58,
		"end": 63,
		"match": ":else"
	},
	{
		"type": "punctuation",
		"start": 63,
		"end": 64,
		"match": "}"
	},
	{
		"type": "punctuation",
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
		"type": "punctuation",
		"start": 69,
		"end": 70,
		"match": ">"
	},
	{
		"type": "punctuation",
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
		"type": "punctuation",
		"start": 79,
		"end": 80,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 81,
		"end": 82,
		"match": "{"
	},
	{
		"type": "svelte-block",
		"start": 82,
		"end": 87,
		"match": "/each"
	},
	{
		"type": "punctuation",
		"start": 87,
		"end": 88,
		"match": "}"
	}
];
