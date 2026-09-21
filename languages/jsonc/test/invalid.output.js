export const test = [
	{
		"type": "punctuation",
		"start": 0,
		"end": 1,
		"match": "{"
	},
	{
		"type": "property",
		"start": 1,
		"end": 4,
		"match": "\"a\""
	},
	{
		"type": "punctuation",
		"start": 4,
		"end": 5,
		"match": ":"
	},
	{
		"type": "comment",
		"start": 5,
		"end": 12,
		"match": "/* c */"
	},
	{
		"type": "number",
		"start": 12,
		"end": 13,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 13,
		"end": 14,
		"match": ","
	},
	{
		"type": "property",
		"start": 14,
		"end": 17,
		"match": "\"b\""
	},
	{
		"type": "punctuation",
		"start": 17,
		"end": 18,
		"match": ":"
	},
	{
		"type": "string",
		"start": 18,
		"end": 35,
		"match": "\"//not a comment\""
	},
	{
		"type": "punctuation",
		"start": 35,
		"end": 36,
		"match": ","
	},
	{
		"type": "property",
		"start": 36,
		"end": 39,
		"match": "\"c\""
	},
	{
		"type": "punctuation",
		"start": 39,
		"end": 40,
		"match": ":"
	},
	{
		"type": "string",
		"start": 40,
		"end": 56,
		"match": "\"/* nor this */\""
	},
	{
		"type": "punctuation",
		"start": 56,
		"end": 57,
		"match": ","
	},
	{
		"type": "property",
		"start": 58,
		"end": 61,
		"match": "\"d\""
	},
	{
		"type": "punctuation",
		"start": 61,
		"end": 62,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 63,
		"end": 64,
		"match": "["
	},
	{
		"type": "number",
		"start": 64,
		"end": 67,
		"match": "007"
	},
	{
		"type": "punctuation",
		"start": 67,
		"end": 68,
		"match": ","
	},
	{
		"type": "number",
		"start": 69,
		"end": 70,
		"match": "-"
	},
	{
		"type": "punctuation",
		"start": 70,
		"end": 71,
		"match": ","
	},
	{
		"type": "number",
		"start": 72,
		"end": 74,
		"match": "1."
	},
	{
		"type": "punctuation",
		"start": 74,
		"end": 75,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 78,
		"end": 79,
		"match": ","
	},
	{
		"type": "number",
		"start": 80,
		"end": 82,
		"match": "1e"
	},
	{
		"type": "punctuation",
		"start": 82,
		"end": 83,
		"match": ","
	},
	{
		"type": "number",
		"start": 84,
		"end": 86,
		"match": "-0"
	},
	{
		"type": "punctuation",
		"start": 86,
		"end": 87,
		"match": ","
	},
	{
		"type": "number",
		"start": 88,
		"end": 89,
		"match": "0"
	},
	{
		"type": "punctuation",
		"start": 92,
		"end": 93,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 97,
		"end": 98,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 106,
		"end": 107,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 113,
		"end": 115,
		"match": "],"
	},
	{
		"type": "property",
		"start": 116,
		"end": 119,
		"match": "\"e\""
	},
	{
		"type": "punctuation",
		"start": 119,
		"end": 120,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 121,
		"end": 122,
		"match": "["
	},
	{
		"type": "punctuation",
		"start": 124,
		"end": 125,
		"match": ","
	},
	{
		"type": "number",
		"start": 126,
		"end": 127,
		"match": "-"
	},
	{
		"type": "punctuation",
		"start": 135,
		"end": 136,
		"match": ","
	},
	{
		"type": "number",
		"start": 137,
		"end": 140,
		"match": "1e5"
	},
	{
		"type": "punctuation",
		"start": 142,
		"end": 143,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 148,
		"end": 149,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 154,
		"end": 155,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 165,
		"end": 166,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 172,
		"end": 173,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 182,
		"end": 183,
		"match": ","
	},
	{
		"type": "boolean",
		"start": 184,
		"end": 188,
		"match": "true"
	},
	{
		"type": "punctuation",
		"start": 189,
		"end": 191,
		"match": "],"
	},
	{
		"type": "property",
		"start": 192,
		"end": 195,
		"match": "\"f\""
	},
	{
		"type": "punctuation",
		"start": 195,
		"end": 196,
		"match": ":"
	},
	{
		"type": "comment",
		"start": 197,
		"end": 209,
		"match": "/* a /* b */"
	},
	{
		"type": "number",
		"start": 213,
		"end": 214,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 214,
		"end": 215,
		"match": ","
	},
	{
		"type": "property",
		"start": 216,
		"end": 219,
		"match": "\"g\""
	},
	{
		"type": "punctuation",
		"start": 219,
		"end": 220,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 229,
		"end": 230,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 239,
		"end": 240,
		"match": ":"
	},
	{
		"type": "number",
		"start": 241,
		"end": 242,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 242,
		"end": 243,
		"match": ","
	},
	{
		"type": "property",
		"start": 251,
		"end": 254,
		"match": "\"h\""
	},
	{
		"type": "punctuation",
		"start": 254,
		"end": 255,
		"match": ":"
	},
	{
		"type": "string",
		"start": 256,
		"end": 269,
		"match": "\"unterminated"
	},
	{
		"type": "punctuation",
		"start": 270,
		"end": 271,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 272,
		"end": 321,
		"match": "/* unterminated block comment runs to EOF\n\"i\": 2\n"
	}
];
