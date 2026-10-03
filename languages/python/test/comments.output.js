export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 23,
		"match": "#!/usr/bin/env python3\n"
	},
	{
		"type": "comment",
		"start": 23,
		"end": 47,
		"match": "# -*- coding: utf-8 -*-\n"
	},
	{
		"type": "comment",
		"start": 47,
		"end": 67,
		"match": "# A regular comment\n"
	},
	{
		"type": "identifier",
		"start": 67,
		"end": 68,
		"match": "x"
	},
	{
		"type": "operator",
		"start": 69,
		"end": 70,
		"match": "="
	},
	{
		"type": "number",
		"start": 71,
		"end": 72,
		"match": "1"
	},
	{
		"type": "comment",
		"start": 74,
		"end": 91,
		"match": "# inline comment\n"
	},
	{
		"type": "comment",
		"start": 91,
		"end": 106,
		"match": "# another line\n"
	},
	{
		"type": "keyword",
		"start": 106,
		"end": 109,
		"match": "def"
	},
	{
		"type": "identifier",
		"start": 110,
		"end": 113,
		"match": "foo"
	},
	{
		"type": "punctuation",
		"start": 113,
		"end": 116,
		"match": "():"
	},
	{
		"type": "string",
		"start": 121,
		"end": 151,
		"match": "\"\"\"A docstring, not a comment."
	},
	{
		"type": "string",
		"start": 151,
		"end": 154,
		"match": "\"\"\""
	},
	{
		"type": "comment",
		"start": 159,
		"end": 181,
		"match": "# comment in function\n"
	},
	{
		"type": "keyword",
		"start": 185,
		"end": 191,
		"match": "return"
	},
	{
		"type": "number",
		"start": 192,
		"end": 194,
		"match": "42"
	},
	{
		"type": "comment",
		"start": 196,
		"end": 212,
		"match": "# with trailing\n"
	},
	{
		"type": "comment",
		"start": 212,
		"end": 228,
		"match": "# final comment\n"
	}
];
