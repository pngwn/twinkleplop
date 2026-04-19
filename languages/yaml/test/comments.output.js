export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 20,
		"match": "# top level comment\n"
	},
	{
		"type": "property",
		"start": 20,
		"end": 23,
		"match": "key"
	},
	{
		"type": "punctuation",
		"start": 23,
		"end": 24,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 25,
		"end": 30,
		"match": "value"
	},
	{
		"type": "comment",
		"start": 32,
		"end": 69,
		"match": "# trailing comment\n# another comment\n"
	},
	{
		"type": "property",
		"start": 69,
		"end": 74,
		"match": "other"
	},
	{
		"type": "punctuation",
		"start": 74,
		"end": 75,
		"match": ":"
	},
	{
		"type": "number",
		"start": 76,
		"end": 78,
		"match": "42"
	},
	{
		"type": "property",
		"start": 79,
		"end": 87,
		"match": "no_space"
	},
	{
		"type": "punctuation",
		"start": 87,
		"end": 88,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 89,
		"end": 96,
		"match": "foo#bar"
	}
];
