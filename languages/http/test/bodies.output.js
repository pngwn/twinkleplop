export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 4,
		"match": "POST"
	},
	{
		"type": "url",
		"start": 5,
		"end": 10,
		"match": "/json"
	},
	{
		"type": "property",
		"start": 11,
		"end": 23,
		"match": "Content-Type"
	},
	{
		"type": "punctuation",
		"start": 23,
		"end": 24,
		"match": ":"
	},
	{
		"type": "string",
		"start": 25,
		"end": 41,
		"match": "application/json"
	},
	{
		"type": "raw_json",
		"start": 43,
		"end": 44,
		"match": "["
	},
	{
		"type": "raw_json",
		"start": 45,
		"end": 54,
		"match": "  {\"id\": "
	},
	{
		"type": "punctuation",
		"start": 54,
		"end": 56,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 56,
		"end": 58,
		"match": "id"
	},
	{
		"type": "punctuation",
		"start": 58,
		"end": 60,
		"match": "}}"
	},
	{
		"type": "raw_json",
		"start": 60,
		"end": 77,
		"match": ", \"tags\": [\"a\", \""
	},
	{
		"type": "punctuation",
		"start": 77,
		"end": 79,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 79,
		"end": 82,
		"match": "tag"
	},
	{
		"type": "punctuation",
		"start": 82,
		"end": 84,
		"match": "}}"
	},
	{
		"type": "raw_json",
		"start": 84,
		"end": 88,
		"match": "\"]},"
	},
	{
		"type": "raw_json",
		"start": 89,
		"end": 91,
		"match": "  "
	},
	{
		"type": "comment",
		"start": 91,
		"end": 106,
		"match": "// comment line"
	},
	{
		"type": "raw_json",
		"start": 107,
		"end": 109,
		"match": "  "
	},
	{
		"type": "comment",
		"start": 109,
		"end": 123,
		"match": "# hash comment"
	},
	{
		"type": "raw_json",
		"start": 124,
		"end": 161,
		"match": "  {\"id\": 2, \"ok\": true, \"none\": null}"
	},
	{
		"type": "raw_json",
		"start": 162,
		"end": 163,
		"match": "]"
	},
	{
		"type": "comment",
		"start": 165,
		"end": 168,
		"match": "###"
	},
	{
		"type": "keyword",
		"start": 169,
		"end": 173,
		"match": "POST"
	},
	{
		"type": "url",
		"start": 174,
		"end": 178,
		"match": "/xml"
	},
	{
		"type": "raw_markup",
		"start": 180,
		"end": 201,
		"match": "<?xml version=\"1.0\"?>"
	},
	{
		"type": "raw_markup",
		"start": 202,
		"end": 212,
		"match": "<item id=\""
	},
	{
		"type": "punctuation",
		"start": 212,
		"end": 214,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 214,
		"end": 216,
		"match": "id"
	},
	{
		"type": "punctuation",
		"start": 216,
		"end": 218,
		"match": "}}"
	},
	{
		"type": "raw_markup",
		"start": 218,
		"end": 220,
		"match": "\">"
	},
	{
		"type": "raw_markup",
		"start": 221,
		"end": 229,
		"match": "  <name>"
	},
	{
		"type": "punctuation",
		"start": 229,
		"end": 231,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 231,
		"end": 235,
		"match": "name"
	},
	{
		"type": "punctuation",
		"start": 235,
		"end": 237,
		"match": "}}"
	},
	{
		"type": "raw_markup",
		"start": 237,
		"end": 244,
		"match": "</name>"
	},
	{
		"type": "raw_markup",
		"start": 245,
		"end": 252,
		"match": "</item>"
	},
	{
		"type": "comment",
		"start": 254,
		"end": 257,
		"match": "###"
	},
	{
		"type": "keyword",
		"start": 258,
		"end": 262,
		"match": "POST"
	},
	{
		"type": "url",
		"start": 263,
		"end": 268,
		"match": "/text"
	},
	{
		"type": "punctuation",
		"start": 299,
		"end": 301,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 301,
		"end": 306,
		"match": "value"
	},
	{
		"type": "punctuation",
		"start": 306,
		"end": 308,
		"match": "}}"
	},
	{
		"type": "comment",
		"start": 331,
		"end": 334,
		"match": "###"
	},
	{
		"type": "keyword",
		"start": 335,
		"end": 338,
		"match": "GET"
	},
	{
		"type": "url",
		"start": 339,
		"end": 353,
		"match": "/unterminated/"
	},
	{
		"type": "punctuation",
		"start": 353,
		"end": 355,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 355,
		"end": 358,
		"match": "var"
	},
	{
		"type": "property",
		"start": 359,
		"end": 365,
		"match": "X-Test"
	},
	{
		"type": "punctuation",
		"start": 365,
		"end": 366,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 367,
		"end": 369,
		"match": "{{"
	},
	{
		"type": "builtin",
		"start": 369,
		"end": 384,
		"match": "$random.integer"
	},
	{
		"type": "string",
		"start": 384,
		"end": 387,
		"match": "(1,"
	},
	{
		"type": "string",
		"start": 388,
		"end": 392,
		"match": "100)"
	},
	{
		"type": "punctuation",
		"start": 392,
		"end": 394,
		"match": "}}"
	},
	{
		"type": "string",
		"start": 394,
		"end": 395,
		"match": " "
	},
	{
		"type": "punctuation",
		"start": 395,
		"end": 397,
		"match": "{{"
	},
	{
		"type": "builtin",
		"start": 397,
		"end": 406,
		"match": "$datetime"
	},
	{
		"type": "string",
		"start": 407,
		"end": 410,
		"match": "\"DD"
	},
	{
		"type": "string",
		"start": 411,
		"end": 414,
		"match": "MM\""
	},
	{
		"type": "string",
		"start": 415,
		"end": 417,
		"match": "-1"
	},
	{
		"type": "string",
		"start": 418,
		"end": 419,
		"match": "y"
	},
	{
		"type": "punctuation",
		"start": 419,
		"end": 421,
		"match": "}}"
	},
	{
		"type": "operator",
		"start": 423,
		"end": 425,
		"match": "> "
	},
	{
		"type": "punctuation",
		"start": 425,
		"end": 427,
		"match": "{%"
	},
	{
		"type": "raw_script",
		"start": 427,
		"end": 441,
		"match": " unterminated\n"
	}
];
