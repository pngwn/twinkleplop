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
		"end": 23,
		"match": "a/src/old.js"
	},
	{
		"type": "string",
		"start": 24,
		"end": 36,
		"match": "b/src/new.js"
	},
	{
		"type": "meta",
		"start": 37,
		"end": 54,
		"match": "similarity index "
	},
	{
		"type": "number",
		"start": 54,
		"end": 56,
		"match": "85"
	},
	{
		"type": "punctuation",
		"start": 56,
		"end": 57,
		"match": "%"
	},
	{
		"type": "meta",
		"start": 58,
		"end": 70,
		"match": "rename from "
	},
	{
		"type": "string",
		"start": 70,
		"end": 80,
		"match": "src/old.js"
	},
	{
		"type": "meta",
		"start": 81,
		"end": 91,
		"match": "rename to "
	},
	{
		"type": "string",
		"start": 91,
		"end": 101,
		"match": "src/new.js"
	},
	{
		"type": "meta",
		"start": 102,
		"end": 108,
		"match": "index "
	},
	{
		"type": "hash",
		"start": 108,
		"end": 115,
		"match": "abc1234"
	},
	{
		"type": "punctuation",
		"start": 115,
		"end": 117,
		"match": ".."
	},
	{
		"type": "hash",
		"start": 117,
		"end": 124,
		"match": "def5678"
	},
	{
		"type": "number",
		"start": 125,
		"end": 131,
		"match": "100644"
	},
	{
		"type": "heading",
		"start": 132,
		"end": 136,
		"match": "--- "
	},
	{
		"type": "string",
		"start": 136,
		"end": 148,
		"match": "a/src/old.js"
	},
	{
		"type": "heading",
		"start": 149,
		"end": 153,
		"match": "+++ "
	},
	{
		"type": "string",
		"start": 153,
		"end": 165,
		"match": "b/src/new.js"
	},
	{
		"type": "label",
		"start": 166,
		"end": 169,
		"match": "@@ "
	},
	{
		"type": "punctuation",
		"start": 169,
		"end": 170,
		"match": "-"
	},
	{
		"type": "number",
		"start": 170,
		"end": 171,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 171,
		"end": 172,
		"match": ","
	},
	{
		"type": "number",
		"start": 172,
		"end": 173,
		"match": "3"
	},
	{
		"type": "punctuation",
		"start": 174,
		"end": 175,
		"match": "+"
	},
	{
		"type": "number",
		"start": 175,
		"end": 176,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 176,
		"end": 177,
		"match": ","
	},
	{
		"type": "number",
		"start": 177,
		"end": 178,
		"match": "3"
	},
	{
		"type": "label",
		"start": 179,
		"end": 181,
		"match": "@@"
	},
	{
		"type": "context",
		"start": 183,
		"end": 193,
		"match": "var x = 1;"
	},
	{
		"type": "deleted_marker",
		"start": 194,
		"end": 195,
		"match": "-"
	},
	{
		"type": "deleted",
		"start": 195,
		"end": 205,
		"match": "var y = 2;"
	},
	{
		"type": "inserted_marker",
		"start": 206,
		"end": 207,
		"match": "+"
	},
	{
		"type": "inserted",
		"start": 207,
		"end": 217,
		"match": "var y = 3;"
	}
];
