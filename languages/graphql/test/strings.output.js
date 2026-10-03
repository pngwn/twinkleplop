export const test = [
	{
		"type": "string",
		"start": 0,
		"end": 29,
		"match": "\"Description of an operation\""
	},
	{
		"type": "keyword",
		"start": 30,
		"end": 35,
		"match": "query"
	},
	{
		"type": "function",
		"start": 36,
		"end": 43,
		"match": "Strings"
	},
	{
		"type": "punctuation",
		"start": 43,
		"end": 44,
		"match": "("
	},
	{
		"type": "string",
		"start": 44,
		"end": 68,
		"match": "\"A variable description\""
	},
	{
		"type": "parameter",
		"start": 69,
		"end": 74,
		"match": "$text"
	},
	{
		"type": "punctuation",
		"start": 74,
		"end": 75,
		"match": ":"
	},
	{
		"type": "type",
		"start": 76,
		"end": 82,
		"match": "String"
	},
	{
		"type": "operator",
		"start": 83,
		"end": 84,
		"match": "="
	},
	{
		"type": "string",
		"start": 85,
		"end": 87,
		"match": "\"\""
	},
	{
		"type": "punctuation",
		"start": 87,
		"end": 88,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 89,
		"end": 90,
		"match": "{"
	},
	{
		"type": "property",
		"start": 93,
		"end": 97,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 97,
		"end": 98,
		"match": "("
	},
	{
		"type": "property",
		"start": 98,
		"end": 103,
		"match": "input"
	},
	{
		"type": "punctuation",
		"start": 103,
		"end": 104,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 105,
		"end": 106,
		"match": "{"
	},
	{
		"type": "property",
		"start": 111,
		"end": 116,
		"match": "plain"
	},
	{
		"type": "punctuation",
		"start": 116,
		"end": 117,
		"match": ":"
	},
	{
		"type": "string",
		"start": 118,
		"end": 162,
		"match": "\"Quotes: \\\" and slash: \\/ and backslash: \\\\\""
	},
	{
		"type": "property",
		"start": 167,
		"end": 174,
		"match": "escapes"
	},
	{
		"type": "punctuation",
		"start": 174,
		"end": 175,
		"match": ":"
	},
	{
		"type": "string",
		"start": 176,
		"end": 215,
		"match": "\"\\b\\f\\n\\r\\t\\u0041\\uD83D\\uDE00\\u{1F600}\""
	},
	{
		"type": "property",
		"start": 220,
		"end": 227,
		"match": "unicode"
	},
	{
		"type": "punctuation",
		"start": 227,
		"end": 228,
		"match": ":"
	},
	{
		"type": "string",
		"start": 229,
		"end": 242,
		"match": "\"café 日本語 😀\""
	},
	{
		"type": "property",
		"start": 247,
		"end": 253,
		"match": "syntax"
	},
	{
		"type": "punctuation",
		"start": 253,
		"end": 254,
		"match": ":"
	},
	{
		"type": "string",
		"start": 255,
		"end": 310,
		"match": "\"# comment $variable @directive { } ${noInterpolation}\""
	},
	{
		"type": "property",
		"start": 315,
		"end": 320,
		"match": "block"
	},
	{
		"type": "punctuation",
		"start": 320,
		"end": 321,
		"match": ":"
	},
	{
		"type": "string",
		"start": 322,
		"end": 426,
		"match": "\"\"\"\n      Quotes \" and \"\" are literal.\n      Backslashes \\n \\u{41} remain raw.\n      Escaped delimiter: "
	},
	{
		"type": "string",
		"start": 426,
		"end": 492,
		"match": "\\\"\"\" and still inside.\n      Two backslashes before a delimiter: \\"
	},
	{
		"type": "string",
		"start": 492,
		"end": 537,
		"match": "\\\"\"\" still inside.\n      # not a comment\n    "
	},
	{
		"type": "string",
		"start": 537,
		"end": 540,
		"match": "\"\"\""
	},
	{
		"type": "property",
		"start": 545,
		"end": 555,
		"match": "emptyBlock"
	},
	{
		"type": "punctuation",
		"start": 555,
		"end": 556,
		"match": ":"
	},
	{
		"type": "string",
		"start": 557,
		"end": 560,
		"match": "\"\"\""
	},
	{
		"type": "string",
		"start": 560,
		"end": 563,
		"match": "\"\"\""
	},
	{
		"type": "punctuation",
		"start": 566,
		"end": 568,
		"match": "})"
	},
	{
		"type": "punctuation",
		"start": 569,
		"end": 570,
		"match": "}"
	}
];
