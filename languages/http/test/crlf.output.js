export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 4,
		"match": "POST"
	},
	{
		"type": "url",
		"start": 5,
		"end": 7,
		"match": "/x"
	},
	{
		"type": "keyword",
		"start": 8,
		"end": 12,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 12,
		"end": 13,
		"match": "/"
	},
	{
		"type": "number",
		"start": 13,
		"end": 16,
		"match": "1.1"
	},
	{
		"type": "property",
		"start": 18,
		"end": 22,
		"match": "Host"
	},
	{
		"type": "punctuation",
		"start": 22,
		"end": 23,
		"match": ":"
	},
	{
		"type": "string",
		"start": 24,
		"end": 26,
		"match": "a\r"
	},
	{
		"type": "property",
		"start": 27,
		"end": 35,
		"match": "X-Folded"
	},
	{
		"type": "punctuation",
		"start": 35,
		"end": 36,
		"match": ":"
	},
	{
		"type": "string",
		"start": 37,
		"end": 41,
		"match": "one\r"
	},
	{
		"type": "string",
		"start": 43,
		"end": 47,
		"match": "two\r"
	},
	{
		"type": "raw_json",
		"start": 50,
		"end": 59,
		"match": "{\"a\": 1}\r"
	}
];
