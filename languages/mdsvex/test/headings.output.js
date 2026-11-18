export const test = [
	{
		"type": "heading_marker",
		"start": 0,
		"end": 2,
		"match": "# "
	},
	{
		"type": "heading",
		"start": 2,
		"end": 13,
		"match": "Heading one"
	},
	{
		"type": "heading_marker",
		"start": 14,
		"end": 17,
		"match": "## "
	},
	{
		"type": "heading",
		"start": 17,
		"end": 25,
		"match": "Heading "
	},
	{
		"type": "italic_open",
		"start": 25,
		"end": 26,
		"match": "_"
	},
	{
		"type": "italic",
		"start": 26,
		"end": 29,
		"match": "two"
	},
	{
		"type": "italic_close",
		"start": 29,
		"end": 30,
		"match": "_"
	},
	{
		"type": "heading",
		"start": 30,
		"end": 36,
		"match": " with "
	},
	{
		"type": "bold_open",
		"start": 36,
		"end": 37,
		"match": "*"
	},
	{
		"type": "bold",
		"start": 37,
		"end": 43,
		"match": "strong"
	},
	{
		"type": "bold_close",
		"start": 43,
		"end": 44,
		"match": "*"
	},
	{
		"type": "heading_marker",
		"start": 45,
		"end": 52,
		"match": "###### "
	},
	{
		"type": "heading",
		"start": 52,
		"end": 84,
		"match": "Heading six: with a colon & more"
	},
	{
		"type": "heading_marker",
		"start": 146,
		"end": 148,
		"match": "# "
	},
	{
		"type": "heading",
		"start": 148,
		"end": 175,
		"match": "Trailing hashes are text ##"
	},
	{
		"type": "heading_marker",
		"start": 176,
		"end": 178,
		"match": "# "
	},
	{
		"type": "heading",
		"start": 178,
		"end": 206,
		"match": "snake_case and 2*3 stay text"
	},
	{
		"type": "heading_marker",
		"start": 207,
		"end": 209,
		"match": "# "
	},
	{
		"type": "expression",
		"start": 209,
		"end": 210,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 210,
		"end": 215,
		"match": "title"
	},
	{
		"type": "expression",
		"start": 215,
		"end": 216,
		"match": "}"
	},
	{
		"type": "heading",
		"start": 216,
		"end": 221,
		"match": " and "
	},
	{
		"type": "punctuation",
		"start": 221,
		"end": 222,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 222,
		"end": 227,
		"match": "Badge"
	},
	{
		"type": "punctuation",
		"start": 228,
		"end": 230,
		"match": "/>"
	},
	{
		"type": "heading",
		"start": 230,
		"end": 235,
		"match": " and "
	},
	{
		"type": "code_open",
		"start": 235,
		"end": 236,
		"match": "`"
	},
	{
		"type": "code",
		"start": 236,
		"end": 240,
		"match": "code"
	},
	{
		"type": "code_close",
		"start": 240,
		"end": 241,
		"match": "`"
	},
	{
		"type": "heading_marker",
		"start": 245,
		"end": 248,
		"match": "## "
	},
	{
		"type": "heading",
		"start": 248,
		"end": 264,
		"match": "indented heading"
	},
	{
		"type": "heading_marker",
		"start": 265,
		"end": 267,
		"match": "#\n"
	}
];
