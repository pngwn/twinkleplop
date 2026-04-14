export const test = [
	{
		"type": "property",
		"start": 0,
		"end": 7,
		"match": "literal"
	},
	{
		"type": "punctuation",
		"start": 7,
		"end": 8,
		"match": ":"
	},
	{
		"type": "block-scalar-header",
		"start": 9,
		"end": 10,
		"match": "|"
	},
	{
		"type": "string",
		"start": 10,
		"end": 33,
		"match": "\n  line one\n  line two\n"
	},
	{
		"type": "property",
		"start": 33,
		"end": 39,
		"match": "folded"
	},
	{
		"type": "punctuation",
		"start": 39,
		"end": 40,
		"match": ":"
	},
	{
		"type": "block-scalar-header",
		"start": 41,
		"end": 42,
		"match": ">"
	},
	{
		"type": "string",
		"start": 42,
		"end": 72,
		"match": "\n  words wrap\n  into one line\n"
	},
	{
		"type": "property",
		"start": 72,
		"end": 80,
		"match": "stripped"
	},
	{
		"type": "punctuation",
		"start": 80,
		"end": 81,
		"match": ":"
	},
	{
		"type": "block-scalar-header",
		"start": 82,
		"end": 84,
		"match": "|-"
	},
	{
		"type": "string",
		"start": 84,
		"end": 107,
		"match": "\n  no trailing newline\n"
	},
	{
		"type": "property",
		"start": 107,
		"end": 111,
		"match": "kept"
	},
	{
		"type": "punctuation",
		"start": 111,
		"end": 112,
		"match": ":"
	},
	{
		"type": "block-scalar-header",
		"start": 113,
		"end": 115,
		"match": "|+"
	},
	{
		"type": "string",
		"start": 115,
		"end": 132,
		"match": "\n  keep trailing\n"
	},
	{
		"type": "property",
		"start": 132,
		"end": 140,
		"match": "explicit"
	},
	{
		"type": "punctuation",
		"start": 140,
		"end": 141,
		"match": ":"
	},
	{
		"type": "block-scalar-header",
		"start": 142,
		"end": 144,
		"match": "|2"
	},
	{
		"type": "string",
		"start": 144,
		"end": 156,
		"match": "\n  indented\n"
	},
	{
		"type": "property",
		"start": 156,
		"end": 160,
		"match": "next"
	},
	{
		"type": "punctuation",
		"start": 160,
		"end": 161,
		"match": ":"
	},
	{
		"type": "plain_scalar",
		"start": 162,
		"end": 167,
		"match": "value"
	}
];
