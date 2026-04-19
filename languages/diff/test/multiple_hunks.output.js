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
		"end": 20,
		"match": "a/main.py"
	},
	{
		"type": "string",
		"start": 21,
		"end": 30,
		"match": "b/main.py"
	},
	{
		"type": "hash",
		"start": 37,
		"end": 44,
		"match": "aaa1111"
	},
	{
		"type": "punctuation",
		"start": 44,
		"end": 46,
		"match": ".."
	},
	{
		"type": "hash",
		"start": 46,
		"end": 53,
		"match": "bbb2222"
	},
	{
		"type": "number",
		"start": 54,
		"end": 60,
		"match": "100644"
	},
	{
		"type": "heading",
		"start": 61,
		"end": 65,
		"match": "--- "
	},
	{
		"type": "string",
		"start": 65,
		"end": 74,
		"match": "a/main.py"
	},
	{
		"type": "heading",
		"start": 75,
		"end": 79,
		"match": "+++ "
	},
	{
		"type": "string",
		"start": 79,
		"end": 88,
		"match": "b/main.py"
	},
	{
		"type": "label",
		"start": 89,
		"end": 92,
		"match": "@@ "
	},
	{
		"type": "punctuation",
		"start": 92,
		"end": 93,
		"match": "-"
	},
	{
		"type": "number",
		"start": 93,
		"end": 94,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 94,
		"end": 95,
		"match": ","
	},
	{
		"type": "number",
		"start": 95,
		"end": 96,
		"match": "5"
	},
	{
		"type": "punctuation",
		"start": 97,
		"end": 98,
		"match": "+"
	},
	{
		"type": "number",
		"start": 98,
		"end": 99,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 99,
		"end": 100,
		"match": ","
	},
	{
		"type": "number",
		"start": 100,
		"end": 101,
		"match": "5"
	},
	{
		"type": "label",
		"start": 102,
		"end": 104,
		"match": "@@"
	},
	{
		"type": "deleted_marker",
		"start": 116,
		"end": 117,
		"match": "-"
	},
	{
		"type": "deleted",
		"start": 117,
		"end": 127,
		"match": "import sys"
	},
	{
		"type": "inserted_marker",
		"start": 128,
		"end": 129,
		"match": "+"
	},
	{
		"type": "inserted",
		"start": 129,
		"end": 143,
		"match": "import pathlib"
	},
	{
		"type": "label",
		"start": 168,
		"end": 171,
		"match": "@@ "
	},
	{
		"type": "punctuation",
		"start": 171,
		"end": 172,
		"match": "-"
	},
	{
		"type": "number",
		"start": 172,
		"end": 174,
		"match": "10"
	},
	{
		"type": "punctuation",
		"start": 174,
		"end": 175,
		"match": ","
	},
	{
		"type": "number",
		"start": 175,
		"end": 176,
		"match": "4"
	},
	{
		"type": "punctuation",
		"start": 177,
		"end": 178,
		"match": "+"
	},
	{
		"type": "number",
		"start": 178,
		"end": 180,
		"match": "10"
	},
	{
		"type": "punctuation",
		"start": 180,
		"end": 181,
		"match": ","
	},
	{
		"type": "number",
		"start": 181,
		"end": 182,
		"match": "6"
	},
	{
		"type": "label",
		"start": 183,
		"end": 185,
		"match": "@@"
	},
	{
		"type": "deleted_marker",
		"start": 215,
		"end": 216,
		"match": "-"
	},
	{
		"type": "deleted",
		"start": 216,
		"end": 226,
		"match": "    main()"
	},
	{
		"type": "inserted_marker",
		"start": 227,
		"end": 228,
		"match": "+"
	},
	{
		"type": "inserted",
		"start": 228,
		"end": 247,
		"match": "    result = main()"
	},
	{
		"type": "inserted_marker",
		"start": 248,
		"end": 249,
		"match": "+"
	},
	{
		"type": "inserted",
		"start": 249,
		"end": 266,
		"match": "    print(result)"
	},
	{
		"type": "inserted_marker",
		"start": 267,
		"end": 268,
		"match": "+"
	},
	{
		"type": "inserted",
		"start": 268,
		"end": 283,
		"match": "    sys.exit(0)"
	}
];
