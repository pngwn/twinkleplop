export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 8,
		"match": "@charset"
	},
	{
		"type": "string",
		"start": 9,
		"end": 16,
		"match": "\"UTF-8\""
	},
	{
		"type": "punctuation",
		"start": 16,
		"end": 17,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 18,
		"end": 26,
		"match": "@charset"
	},
	{
		"type": "string",
		"start": 27,
		"end": 39,
		"match": "\"ISO-8859-1\""
	},
	{
		"type": "punctuation",
		"start": 39,
		"end": 40,
		"match": ";"
	}
];
