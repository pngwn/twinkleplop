export const test = [
	{
		"type": "directive",
		"start": 0,
		"end": 9,
		"match": "%YAML 1.2"
	},
	{
		"type": "directive",
		"start": 10,
		"end": 40,
		"match": "%TAG !e! tag:example.com,2024:"
	},
	{
		"type": "doc-marker",
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
		"type": "plain_scalar",
		"start": 55,
		"end": 60,
		"match": "first"
	},
	{
		"type": "doc-marker",
		"start": 61,
		"end": 64,
		"match": "..."
	},
	{
		"type": "doc-marker",
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
		"type": "plain_scalar",
		"start": 79,
		"end": 85,
		"match": "second"
	},
	{
		"type": "doc-marker",
		"start": 86,
		"end": 89,
		"match": "..."
	}
];
