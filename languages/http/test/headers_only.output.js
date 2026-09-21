export const test = [
	{
		"type": "property",
		"start": 0,
		"end": 12,
		"match": "Content-Type"
	},
	{
		"type": "punctuation",
		"start": 12,
		"end": 13,
		"match": ":"
	},
	{
		"type": "string",
		"start": 14,
		"end": 30,
		"match": "application/json"
	},
	{
		"type": "property",
		"start": 31,
		"end": 44,
		"match": "Cache-Control"
	},
	{
		"type": "punctuation",
		"start": 44,
		"end": 45,
		"match": ":"
	},
	{
		"type": "string",
		"start": 46,
		"end": 64,
		"match": "no-cache, no-store"
	},
	{
		"type": "property",
		"start": 65,
		"end": 77,
		"match": "X-Request-Id"
	},
	{
		"type": "punctuation",
		"start": 77,
		"end": 78,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 78,
		"end": 80,
		"match": "{{"
	},
	{
		"type": "builtin",
		"start": 80,
		"end": 85,
		"match": "$guid"
	},
	{
		"type": "punctuation",
		"start": 85,
		"end": 87,
		"match": "}}"
	},
	{
		"type": "property",
		"start": 88,
		"end": 95,
		"match": "X-Empty"
	},
	{
		"type": "punctuation",
		"start": 95,
		"end": 96,
		"match": ":"
	}
];
