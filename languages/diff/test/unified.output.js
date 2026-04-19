export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 10,
		"match": "diff --git"
	},
	{
		"type": "string",
		"start": 11,
		"end": 28,
		"match": "a/src/old_name.js"
	},
	{
		"type": "string",
		"start": 29,
		"end": 46,
		"match": "b/src/new_name.js"
	},
	{
		"type": "hash",
		"start": 53,
		"end": 60,
		"match": "abc1234"
	},
	{
		"type": "punctuation",
		"start": 60,
		"end": 62,
		"match": ".."
	},
	{
		"type": "hash",
		"start": 62,
		"end": 69,
		"match": "def5678"
	},
	{
		"type": "number",
		"start": 70,
		"end": 76,
		"match": "100644"
	},
	{
		"type": "heading",
		"start": 77,
		"end": 81,
		"match": "--- "
	},
	{
		"type": "string",
		"start": 81,
		"end": 98,
		"match": "a/src/old_name.js"
	},
	{
		"type": "heading",
		"start": 99,
		"end": 103,
		"match": "+++ "
	},
	{
		"type": "string",
		"start": 103,
		"end": 120,
		"match": "b/src/new_name.js"
	},
	{
		"type": "label",
		"start": 121,
		"end": 124,
		"match": "@@ "
	},
	{
		"type": "punctuation",
		"start": 124,
		"end": 125,
		"match": "-"
	},
	{
		"type": "number",
		"start": 125,
		"end": 126,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 126,
		"end": 127,
		"match": ","
	},
	{
		"type": "number",
		"start": 127,
		"end": 128,
		"match": "4"
	},
	{
		"type": "punctuation",
		"start": 129,
		"end": 130,
		"match": "+"
	},
	{
		"type": "number",
		"start": 130,
		"end": 131,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 131,
		"end": 132,
		"match": ","
	},
	{
		"type": "number",
		"start": 132,
		"end": 133,
		"match": "4"
	},
	{
		"type": "label",
		"start": 134,
		"end": 136,
		"match": "@@"
	},
	{
		"type": "deleted_marker",
		"start": 153,
		"end": 154,
		"match": "-"
	},
	{
		"type": "deleted",
		"start": 154,
		"end": 168,
		"match": "const bar = 2;"
	},
	{
		"type": "inserted_marker",
		"start": 169,
		"end": 170,
		"match": "+"
	},
	{
		"type": "inserted",
		"start": 170,
		"end": 184,
		"match": "const bar = 3;"
	}
];
