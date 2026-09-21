export const test = [
	{
		"type": "property",
		"start": 0,
		"end": 17,
		"match": "\"editor.fontSize\""
	},
	{
		"type": "punctuation",
		"start": 17,
		"end": 18,
		"match": ":"
	},
	{
		"type": "number",
		"start": 19,
		"end": 21,
		"match": "14"
	},
	{
		"type": "punctuation",
		"start": 21,
		"end": 22,
		"match": ","
	},
	{
		"type": "comment",
		"start": 23,
		"end": 60,
		"match": "// a bare member from docs, no braces"
	},
	{
		"type": "property",
		"start": 61,
		"end": 77,
		"match": "\"editor.tabSize\""
	},
	{
		"type": "punctuation",
		"start": 77,
		"end": 78,
		"match": ":"
	},
	{
		"type": "number",
		"start": 79,
		"end": 80,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 80,
		"end": 81,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 83,
		"end": 84,
		"match": "{"
	},
	{
		"type": "property",
		"start": 87,
		"end": 95,
		"match": "\"nested\""
	},
	{
		"type": "punctuation",
		"start": 95,
		"end": 96,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 97,
		"end": 98,
		"match": "{"
	},
	{
		"type": "property",
		"start": 99,
		"end": 106,
		"match": "\"inner\""
	},
	{
		"type": "punctuation",
		"start": 106,
		"end": 107,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 108,
		"end": 109,
		"match": "{"
	},
	{
		"type": "property",
		"start": 110,
		"end": 119,
		"match": "\"deepest\""
	},
	{
		"type": "punctuation",
		"start": 119,
		"end": 120,
		"match": ":"
	},
	{
		"type": "string",
		"start": 121,
		"end": 128,
		"match": "\"value\""
	},
	{
		"type": "punctuation",
		"start": 129,
		"end": 130,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 131,
		"end": 133,
		"match": "},"
	},
	{
		"type": "property",
		"start": 136,
		"end": 154,
		"match": "\"array_of_objects\""
	},
	{
		"type": "punctuation",
		"start": 154,
		"end": 155,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 156,
		"end": 158,
		"match": "[{"
	},
	{
		"type": "property",
		"start": 159,
		"end": 162,
		"match": "\"k\""
	},
	{
		"type": "punctuation",
		"start": 162,
		"end": 163,
		"match": ":"
	},
	{
		"type": "string",
		"start": 164,
		"end": 167,
		"match": "\"v\""
	},
	{
		"type": "punctuation",
		"start": 168,
		"end": 170,
		"match": "},"
	},
	{
		"type": "punctuation",
		"start": 171,
		"end": 172,
		"match": "{"
	},
	{
		"type": "property",
		"start": 173,
		"end": 176,
		"match": "\"k\""
	},
	{
		"type": "punctuation",
		"start": 176,
		"end": 177,
		"match": ":"
	},
	{
		"type": "string",
		"start": 178,
		"end": 181,
		"match": "\"w\""
	},
	{
		"type": "punctuation",
		"start": 182,
		"end": 185,
		"match": "}],"
	},
	{
		"type": "property",
		"start": 188,
		"end": 206,
		"match": "\"array_of_strings\""
	},
	{
		"type": "punctuation",
		"start": 206,
		"end": 207,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 208,
		"end": 209,
		"match": "["
	},
	{
		"type": "string",
		"start": 209,
		"end": 214,
		"match": "\"not\""
	},
	{
		"type": "punctuation",
		"start": 214,
		"end": 215,
		"match": ","
	},
	{
		"type": "string",
		"start": 216,
		"end": 222,
		"match": "\"keys\""
	},
	{
		"type": "punctuation",
		"start": 222,
		"end": 224,
		"match": "],"
	},
	{
		"type": "property",
		"start": 227,
		"end": 235,
		"match": "\"escaped"
	},
	{
		"type": "string_escape",
		"start": 235,
		"end": 237,
		"match": "\\\""
	},
	{
		"type": "property",
		"start": 237,
		"end": 241,
		"match": "key\""
	},
	{
		"type": "punctuation",
		"start": 241,
		"end": 242,
		"match": ":"
	},
	{
		"type": "number",
		"start": 243,
		"end": 244,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 244,
		"end": 245,
		"match": ","
	},
	{
		"type": "property",
		"start": 248,
		"end": 249,
		"match": "\""
	},
	{
		"type": "string_escape",
		"start": 249,
		"end": 255,
		"match": "\\u0041"
	},
	{
		"type": "property",
		"start": 255,
		"end": 256,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 256,
		"end": 257,
		"match": ":"
	},
	{
		"type": "number",
		"start": 258,
		"end": 259,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 259,
		"end": 260,
		"match": ","
	},
	{
		"type": "property",
		"start": 263,
		"end": 278,
		"match": "\"missing_comma\""
	},
	{
		"type": "punctuation",
		"start": 278,
		"end": 279,
		"match": ":"
	},
	{
		"type": "number",
		"start": 280,
		"end": 281,
		"match": "1"
	},
	{
		"type": "property",
		"start": 282,
		"end": 288,
		"match": "\"next\""
	},
	{
		"type": "punctuation",
		"start": 288,
		"end": 289,
		"match": ":"
	},
	{
		"type": "number",
		"start": 290,
		"end": 291,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 291,
		"end": 292,
		"match": ","
	},
	{
		"type": "property",
		"start": 295,
		"end": 313,
		"match": "\"value_then_colon\""
	},
	{
		"type": "punctuation",
		"start": 313,
		"end": 314,
		"match": ":"
	},
	{
		"type": "string",
		"start": 315,
		"end": 323,
		"match": "\"string\""
	},
	{
		"type": "punctuation",
		"start": 323,
		"end": 324,
		"match": ","
	},
	{
		"type": "property",
		"start": 327,
		"end": 337,
		"match": "\"minified\""
	},
	{
		"type": "punctuation",
		"start": 337,
		"end": 339,
		"match": ":{"
	},
	{
		"type": "property",
		"start": 339,
		"end": 342,
		"match": "\"a\""
	},
	{
		"type": "punctuation",
		"start": 342,
		"end": 344,
		"match": ":{"
	},
	{
		"type": "property",
		"start": 344,
		"end": 347,
		"match": "\"b\""
	},
	{
		"type": "punctuation",
		"start": 347,
		"end": 349,
		"match": ":["
	},
	{
		"type": "number",
		"start": 349,
		"end": 350,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 350,
		"end": 352,
		"match": ",{"
	},
	{
		"type": "property",
		"start": 352,
		"end": 355,
		"match": "\"c\""
	},
	{
		"type": "punctuation",
		"start": 355,
		"end": 356,
		"match": ":"
	},
	{
		"type": "null",
		"start": 356,
		"end": 360,
		"match": "null"
	},
	{
		"type": "punctuation",
		"start": 360,
		"end": 365,
		"match": "}]}},"
	},
	{
		"type": "property",
		"start": 368,
		"end": 378,
		"match": "\"trailing\""
	},
	{
		"type": "punctuation",
		"start": 378,
		"end": 379,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 380,
		"end": 383,
		"match": "{},"
	},
	{
		"type": "property",
		"start": 386,
		"end": 393,
		"match": "\"empty\""
	},
	{
		"type": "punctuation",
		"start": 393,
		"end": 394,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 395,
		"end": 398,
		"match": "[],"
	},
	{
		"type": "punctuation",
		"start": 399,
		"end": 400,
		"match": "}"
	}
];
