export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 7,
		"match": "@import"
	},
	{
		"type": "keyword",
		"start": 8,
		"end": 11,
		"match": "url"
	},
	{
		"type": "punctuation",
		"start": 11,
		"end": 12,
		"match": "("
	},
	{
		"type": "string",
		"start": 12,
		"end": 23,
		"match": "'fonts.css'"
	},
	{
		"type": "punctuation",
		"start": 23,
		"end": 25,
		"match": ");"
	},
	{
		"type": "keyword",
		"start": 26,
		"end": 33,
		"match": "@import"
	},
	{
		"type": "string",
		"start": 34,
		"end": 44,
		"match": "'base.css'"
	},
	{
		"type": "punctuation",
		"start": 44,
		"end": 45,
		"match": ";"
	}
];
