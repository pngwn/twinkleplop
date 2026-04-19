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
		"end": 22,
		"match": "a/image.png"
	},
	{
		"type": "string",
		"start": 23,
		"end": 34,
		"match": "b/image.png"
	},
	{
		"type": "number",
		"start": 49,
		"end": 55,
		"match": "100644"
	},
	{
		"type": "string",
		"start": 69,
		"end": 78,
		"match": "/dev/null"
	},
	{
		"type": "string",
		"start": 83,
		"end": 94,
		"match": "b/image.png"
	},
	{
		"type": "keyword",
		"start": 102,
		"end": 112,
		"match": "diff --git"
	},
	{
		"type": "string",
		"start": 113,
		"end": 126,
		"match": "a/config.json"
	},
	{
		"type": "string",
		"start": 127,
		"end": 140,
		"match": "b/config.json"
	},
	{
		"type": "hash",
		"start": 147,
		"end": 154,
		"match": "1a2b3c4"
	},
	{
		"type": "punctuation",
		"start": 154,
		"end": 156,
		"match": ".."
	},
	{
		"type": "hash",
		"start": 156,
		"end": 163,
		"match": "5d6e7f8"
	},
	{
		"type": "number",
		"start": 164,
		"end": 170,
		"match": "100644"
	},
	{
		"type": "heading",
		"start": 171,
		"end": 175,
		"match": "--- "
	},
	{
		"type": "string",
		"start": 175,
		"end": 188,
		"match": "a/config.json"
	},
	{
		"type": "heading",
		"start": 189,
		"end": 193,
		"match": "+++ "
	},
	{
		"type": "string",
		"start": 193,
		"end": 206,
		"match": "b/config.json"
	},
	{
		"type": "label",
		"start": 207,
		"end": 210,
		"match": "@@ "
	},
	{
		"type": "punctuation",
		"start": 210,
		"end": 211,
		"match": "-"
	},
	{
		"type": "number",
		"start": 211,
		"end": 212,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 212,
		"end": 213,
		"match": ","
	},
	{
		"type": "number",
		"start": 213,
		"end": 214,
		"match": "3"
	},
	{
		"type": "punctuation",
		"start": 215,
		"end": 216,
		"match": "+"
	},
	{
		"type": "number",
		"start": 216,
		"end": 217,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 217,
		"end": 218,
		"match": ","
	},
	{
		"type": "number",
		"start": 218,
		"end": 219,
		"match": "3"
	},
	{
		"type": "label",
		"start": 220,
		"end": 222,
		"match": "@@"
	},
	{
		"type": "deleted_marker",
		"start": 226,
		"end": 227,
		"match": "-"
	},
	{
		"type": "deleted",
		"start": 227,
		"end": 241,
		"match": "  \"port\": 3000"
	},
	{
		"type": "inserted_marker",
		"start": 242,
		"end": 243,
		"match": "+"
	},
	{
		"type": "inserted",
		"start": 243,
		"end": 257,
		"match": "  \"port\": 8080"
	}
];
