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
		"end": 5,
		"match": "#key"
	},
	{
		"type": "raw_svelte_expression",
		"start": 5,
		"end": 13,
		"match": " version"
	},
	{
		"type": "punctuation",
		"start": 13,
		"end": 14,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 16,
		"end": 17,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 17,
		"end": 26,
		"match": "Component"
	},
	{
		"type": "punctuation",
		"start": 27,
		"end": 29,
		"match": "/>"
	},
	{
		"type": "punctuation",
		"start": 30,
		"end": 31,
		"match": "{"
	},
	{
		"type": "svelte-block",
		"start": 31,
		"end": 35,
		"match": "/key"
	},
	{
		"type": "punctuation",
		"start": 35,
		"end": 36,
		"match": "}"
	}
];
