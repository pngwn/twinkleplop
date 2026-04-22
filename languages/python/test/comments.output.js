export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 67,
		"match": "#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n# A regular comment\n"
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
		"end": 106,
		"match": "# inline comment\n# another line\n"
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
		"end": 228,
		"match": "# with trailing\n# final comment\n"
	}
];
