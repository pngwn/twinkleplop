export const test = [
	{
		"type": "operator",
		"start": 0,
		"end": 1,
		"match": "%"
	},
	{
		"type": "keyword",
		"start": 1,
		"end": 5,
		"match": "YAML"
	},
	{
		"type": "number",
		"start": 6,
		"end": 9,
		"match": "1.2"
	},
	{
		"type": "operator",
		"start": 10,
		"end": 11,
		"match": "%"
	},
	{
		"type": "keyword",
		"start": 11,
		"end": 14,
		"match": "TAG"
	},
	{
		"type": "identifier",
		"start": 15,
		"end": 18,
		"match": "!e!"
	},
	{
		"type": "identifier",
		"start": 19,
		"end": 40,
		"match": "tag:example.com,2024:"
	},
	{
		"type": "punctuation",
		"start": 41,
		"end": 44,
		"match": "---"
	},
	{
		"type": "property",
		"start": 45,
		"end": 53,
		"match": "document"
	},
	{
		"type": "punctuation",
		"start": 53,
		"end": 54,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 55,
		"end": 60,
		"match": "first"
	},
	{
		"type": "punctuation",
		"start": 61,
		"end": 64,
		"match": "..."
	},
	{
		"type": "punctuation",
		"start": 65,
		"end": 68,
		"match": "---"
	},
	{
		"type": "property",
		"start": 69,
		"end": 77,
		"match": "document"
	},
	{
		"type": "punctuation",
		"start": 77,
		"end": 78,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 79,
		"end": 85,
		"match": "second"
	},
	{
		"type": "punctuation",
		"start": 86,
		"end": 89,
		"match": "..."
	}
];
