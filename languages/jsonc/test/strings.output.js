export const test = [
	{
		"type": "punctuation",
		"start": 0,
		"end": 1,
		"match": "{"
	},
	{
		"type": "property",
		"start": 4,
		"end": 12,
		"match": "\"simple\""
	},
	{
		"type": "punctuation",
		"start": 12,
		"end": 13,
		"match": ":"
	},
	{
		"type": "string",
		"start": 14,
		"end": 21,
		"match": "\"hello\""
	},
	{
		"type": "punctuation",
		"start": 21,
		"end": 22,
		"match": ","
	},
	{
		"type": "property",
		"start": 25,
		"end": 32,
		"match": "\"empty\""
	},
	{
		"type": "punctuation",
		"start": 32,
		"end": 33,
		"match": ":"
	},
	{
		"type": "string",
		"start": 34,
		"end": 36,
		"match": "\"\""
	},
	{
		"type": "punctuation",
		"start": 36,
		"end": 37,
		"match": ","
	},
	{
		"type": "property",
		"start": 40,
		"end": 42,
		"match": "\"\""
	},
	{
		"type": "punctuation",
		"start": 42,
		"end": 43,
		"match": ":"
	},
	{
		"type": "string",
		"start": 44,
		"end": 55,
		"match": "\"empty key\""
	},
	{
		"type": "punctuation",
		"start": 55,
		"end": 56,
		"match": ","
	},
	{
		"type": "property",
		"start": 59,
		"end": 68,
		"match": "\"escapes\""
	},
	{
		"type": "punctuation",
		"start": 68,
		"end": 69,
		"match": ":"
	},
	{
		"type": "string",
		"start": 70,
		"end": 71,
		"match": "\""
	},
	{
		"type": "string_escape",
		"start": 71,
		"end": 73,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 73,
		"end": 74,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 74,
		"end": 76,
		"match": "\\\\"
	},
	{
		"type": "string",
		"start": 76,
		"end": 77,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 77,
		"end": 79,
		"match": "\\/"
	},
	{
		"type": "string",
		"start": 79,
		"end": 80,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 80,
		"end": 82,
		"match": "\\b"
	},
	{
		"type": "string",
		"start": 82,
		"end": 83,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 83,
		"end": 85,
		"match": "\\f"
	},
	{
		"type": "string",
		"start": 85,
		"end": 86,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 86,
		"end": 88,
		"match": "\\n"
	},
	{
		"type": "string",
		"start": 88,
		"end": 89,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 89,
		"end": 91,
		"match": "\\r"
	},
	{
		"type": "string",
		"start": 91,
		"end": 92,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 92,
		"end": 94,
		"match": "\\t"
	},
	{
		"type": "string",
		"start": 94,
		"end": 95,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 95,
		"end": 96,
		"match": ","
	},
	{
		"type": "property",
		"start": 99,
		"end": 108,
		"match": "\"unicode\""
	},
	{
		"type": "punctuation",
		"start": 108,
		"end": 109,
		"match": ":"
	},
	{
		"type": "string",
		"start": 110,
		"end": 114,
		"match": "\"caf"
	},
	{
		"type": "string_escape",
		"start": 114,
		"end": 120,
		"match": "\\u00e9"
	},
	{
		"type": "string",
		"start": 120,
		"end": 121,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 121,
		"end": 127,
		"match": "\\u00E9"
	},
	{
		"type": "string",
		"start": 127,
		"end": 128,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 128,
		"end": 140,
		"match": "\\uD834\\uDD1E"
	},
	{
		"type": "string",
		"start": 140,
		"end": 141,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 141,
		"end": 142,
		"match": ","
	},
	{
		"type": "property",
		"start": 145,
		"end": 160,
		"match": "\"short_unicode\""
	},
	{
		"type": "punctuation",
		"start": 160,
		"end": 161,
		"match": ":"
	},
	{
		"type": "string",
		"start": 162,
		"end": 163,
		"match": "\""
	},
	{
		"type": "string_escape",
		"start": 163,
		"end": 167,
		"match": "\\u12"
	},
	{
		"type": "string",
		"start": 167,
		"end": 169,
		"match": "G\""
	},
	{
		"type": "punctuation",
		"start": 169,
		"end": 170,
		"match": ","
	},
	{
		"type": "property",
		"start": 173,
		"end": 190,
		"match": "\"invalid_escapes\""
	},
	{
		"type": "punctuation",
		"start": 190,
		"end": 191,
		"match": ":"
	},
	{
		"type": "string",
		"start": 192,
		"end": 193,
		"match": "\""
	},
	{
		"type": "string_escape",
		"start": 193,
		"end": 195,
		"match": "\\x"
	},
	{
		"type": "string",
		"start": 195,
		"end": 198,
		"match": "41 "
	},
	{
		"type": "string_escape",
		"start": 198,
		"end": 200,
		"match": "\\'"
	},
	{
		"type": "string",
		"start": 200,
		"end": 201,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 201,
		"end": 203,
		"match": "\\0"
	},
	{
		"type": "string",
		"start": 203,
		"end": 204,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 204,
		"end": 206,
		"match": "\\a"
	},
	{
		"type": "string",
		"start": 206,
		"end": 207,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 207,
		"end": 208,
		"match": ","
	},
	{
		"type": "property",
		"start": 211,
		"end": 226,
		"match": "\"backslash_run\""
	},
	{
		"type": "punctuation",
		"start": 226,
		"end": 227,
		"match": ":"
	},
	{
		"type": "string",
		"start": 228,
		"end": 229,
		"match": "\""
	},
	{
		"type": "string_escape",
		"start": 229,
		"end": 233,
		"match": "\\\\\\\""
	},
	{
		"type": "string",
		"start": 233,
		"end": 234,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 234,
		"end": 235,
		"match": ","
	},
	{
		"type": "property",
		"start": 238,
		"end": 247,
		"match": "\"windows\""
	},
	{
		"type": "punctuation",
		"start": 247,
		"end": 248,
		"match": ":"
	},
	{
		"type": "string",
		"start": 249,
		"end": 252,
		"match": "\"C:"
	},
	{
		"type": "string_escape",
		"start": 252,
		"end": 254,
		"match": "\\\\"
	},
	{
		"type": "string",
		"start": 254,
		"end": 267,
		"match": "Program Files"
	},
	{
		"type": "string_escape",
		"start": 267,
		"end": 269,
		"match": "\\\\"
	},
	{
		"type": "string",
		"start": 269,
		"end": 273,
		"match": "app\""
	},
	{
		"type": "punctuation",
		"start": 273,
		"end": 274,
		"match": ","
	},
	{
		"type": "property",
		"start": 277,
		"end": 282,
		"match": "\"url\""
	},
	{
		"type": "punctuation",
		"start": 282,
		"end": 283,
		"match": ":"
	},
	{
		"type": "string",
		"start": 284,
		"end": 319,
		"match": "\"https://example.com/path?q=1#frag\""
	},
	{
		"type": "punctuation",
		"start": 319,
		"end": 320,
		"match": ","
	},
	{
		"type": "property",
		"start": 323,
		"end": 329,
		"match": "\"glob\""
	},
	{
		"type": "punctuation",
		"start": 329,
		"end": 330,
		"match": ":"
	},
	{
		"type": "string",
		"start": 331,
		"end": 344,
		"match": "\"src/**/*.ts\""
	},
	{
		"type": "punctuation",
		"start": 344,
		"end": 345,
		"match": ","
	},
	{
		"type": "property",
		"start": 348,
		"end": 362,
		"match": "\"comment_like\""
	},
	{
		"type": "punctuation",
		"start": 362,
		"end": 363,
		"match": ":"
	},
	{
		"type": "string",
		"start": 364,
		"end": 397,
		"match": "\"/* not a comment */ // nor this\""
	},
	{
		"type": "punctuation",
		"start": 397,
		"end": 398,
		"match": ","
	},
	{
		"type": "property",
		"start": 401,
		"end": 412,
		"match": "\"variables\""
	},
	{
		"type": "punctuation",
		"start": 412,
		"end": 413,
		"match": ":"
	},
	{
		"type": "string",
		"start": 414,
		"end": 446,
		"match": "\"${workspaceFolder}/${env:HOME}\""
	},
	{
		"type": "punctuation",
		"start": 446,
		"end": 447,
		"match": ","
	},
	{
		"type": "property",
		"start": 450,
		"end": 471,
		"match": "\"looks_like_literals\""
	},
	{
		"type": "punctuation",
		"start": 471,
		"end": 472,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 473,
		"end": 474,
		"match": "["
	},
	{
		"type": "string",
		"start": 474,
		"end": 480,
		"match": "\"true\""
	},
	{
		"type": "punctuation",
		"start": 480,
		"end": 481,
		"match": ","
	},
	{
		"type": "string",
		"start": 482,
		"end": 488,
		"match": "\"null\""
	},
	{
		"type": "punctuation",
		"start": 488,
		"end": 489,
		"match": ","
	},
	{
		"type": "string",
		"start": 490,
		"end": 497,
		"match": "\"0.2.0\""
	},
	{
		"type": "punctuation",
		"start": 497,
		"end": 498,
		"match": ","
	},
	{
		"type": "string",
		"start": 499,
		"end": 503,
		"match": "\"-1\""
	},
	{
		"type": "punctuation",
		"start": 503,
		"end": 505,
		"match": "],"
	},
	{
		"type": "property",
		"start": 508,
		"end": 519,
		"match": "\"non_ascii\""
	},
	{
		"type": "punctuation",
		"start": 519,
		"end": 520,
		"match": ":"
	},
	{
		"type": "string",
		"start": 521,
		"end": 539,
		"match": "\"日本語 — ünïcödé 🎉\""
	},
	{
		"type": "punctuation",
		"start": 539,
		"end": 540,
		"match": ","
	},
	{
		"type": "property",
		"start": 543,
		"end": 552,
		"match": "\"raw_tab\""
	},
	{
		"type": "punctuation",
		"start": 552,
		"end": 553,
		"match": ":"
	},
	{
		"type": "string",
		"start": 554,
		"end": 559,
		"match": "\"a\tb\""
	},
	{
		"type": "punctuation",
		"start": 559,
		"end": 560,
		"match": ","
	},
	{
		"type": "property",
		"start": 563,
		"end": 574,
		"match": "\"continued\""
	},
	{
		"type": "punctuation",
		"start": 574,
		"end": 575,
		"match": ":"
	},
	{
		"type": "string",
		"start": 576,
		"end": 585,
		"match": "\"line one"
	},
	{
		"type": "string_escape",
		"start": 585,
		"end": 587,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 587,
		"end": 596,
		"match": "line two\""
	},
	{
		"type": "punctuation",
		"start": 596,
		"end": 597,
		"match": ","
	},
	{
		"type": "property",
		"start": 600,
		"end": 614,
		"match": "\"unterminated\""
	},
	{
		"type": "punctuation",
		"start": 614,
		"end": 615,
		"match": ":"
	},
	{
		"type": "string",
		"start": 616,
		"end": 633,
		"match": "\"no closing quote"
	},
	{
		"type": "property",
		"start": 636,
		"end": 642,
		"match": "\"next\""
	},
	{
		"type": "punctuation",
		"start": 642,
		"end": 643,
		"match": ":"
	},
	{
		"type": "string",
		"start": 644,
		"end": 660,
		"match": "\"back to normal\""
	},
	{
		"type": "punctuation",
		"start": 661,
		"end": 662,
		"match": "}"
	}
];
