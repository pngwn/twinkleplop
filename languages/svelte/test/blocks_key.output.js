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
		"end": 5,
		"match": "key"
	},
	{
		"type": "raw_svelte_expression",
		"start": 5,
		"end": 13,
		"match": " version"
	},
	{
		"type": "expression",
		"start": 13,
		"end": 14,
		"match": "}"
	},
	{
		"type": "tag-boundary",
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
		"type": "tag-boundary",
		"start": 27,
		"end": 29,
		"match": "/>"
	},
	{
		"type": "expression",
		"start": 30,
		"end": 31,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 31,
		"end": 32,
		"match": "/"
	},
	{
		"type": "svelte-block",
		"start": 32,
		"end": 35,
		"match": "key"
	},
	{
		"type": "expression",
		"start": 35,
		"end": 36,
		"match": "}"
	}
];
