export const test = [
	{
		"type": "heading",
		"start": 0,
		"end": 4,
		"match": "--- "
	},
	{
		"type": "string",
		"start": 4,
		"end": 14,
		"match": "a/file.txt"
	},
	{
		"type": "heading",
		"start": 15,
		"end": 19,
		"match": "+++ "
	},
	{
		"type": "string",
		"start": 19,
		"end": 29,
		"match": "b/file.txt"
	},
	{
		"type": "label",
		"start": 30,
		"end": 33,
		"match": "@@ "
	},
	{
		"type": "punctuation",
		"start": 33,
		"end": 34,
		"match": "-"
	},
	{
		"type": "number",
		"start": 34,
		"end": 35,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 35,
		"end": 36,
		"match": ","
	},
	{
		"type": "number",
		"start": 36,
		"end": 37,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 38,
		"end": 39,
		"match": "+"
	},
	{
		"type": "number",
		"start": 39,
		"end": 40,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 40,
		"end": 41,
		"match": ","
	},
	{
		"type": "number",
		"start": 41,
		"end": 42,
		"match": "2"
	},
	{
		"type": "label",
		"start": 43,
		"end": 45,
		"match": "@@"
	},
	{
		"type": "context",
		"start": 47,
		"end": 55,
		"match": "line one"
	},
	{
		"type": "deleted_marker",
		"start": 56,
		"end": 57,
		"match": "-"
	},
	{
		"type": "deleted",
		"start": 57,
		"end": 65,
		"match": "line two"
	},
	{
		"type": "comment",
		"start": 66,
		"end": 93,
		"match": "\\ No newline at end of file"
	},
	{
		"type": "inserted_marker",
		"start": 94,
		"end": 95,
		"match": "+"
	},
	{
		"type": "inserted",
		"start": 95,
		"end": 112,
		"match": "line two modified"
	},
	{
		"type": "comment",
		"start": 113,
		"end": 140,
		"match": "\\ No newline at end of file"
	}
];
