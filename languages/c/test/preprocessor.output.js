export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 20,
		"match": "/* before directive "
	},
	{
		"type": "comment",
		"start": 20,
		"end": 22,
		"match": "*/"
	},
	{
		"type": "keyword",
		"start": 23,
		"end": 24,
		"match": "#"
	},
	{
		"type": "keyword",
		"start": 25,
		"end": 32,
		"match": "include"
	},
	{
		"type": "string",
		"start": 33,
		"end": 43,
		"match": "<stdint.h>"
	},
	{
		"type": "keyword",
		"start": 44,
		"end": 46,
		"match": "%:"
	},
	{
		"type": "keyword",
		"start": 46,
		"end": 53,
		"match": "include"
	},
	{
		"type": "string",
		"start": 54,
		"end": 70,
		"match": "\"local/header.h\""
	},
	{
		"type": "keyword",
		"start": 71,
		"end": 72,
		"match": "#"
	},
	{
		"type": "keyword",
		"start": 72,
		"end": 78,
		"match": "define"
	},
	{
		"type": "identifier",
		"start": 79,
		"end": 83,
		"match": "JOIN"
	},
	{
		"type": "punctuation",
		"start": 83,
		"end": 84,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 84,
		"end": 85,
		"match": "a"
	},
	{
		"type": "punctuation",
		"start": 85,
		"end": 86,
		"match": ","
	},
	{
		"type": "identifier",
		"start": 87,
		"end": 88,
		"match": "b"
	},
	{
		"type": "punctuation",
		"start": 88,
		"end": 89,
		"match": ")"
	},
	{
		"type": "identifier",
		"start": 90,
		"end": 91,
		"match": "a"
	},
	{
		"type": "operator",
		"start": 92,
		"end": 94,
		"match": "##"
	},
	{
		"type": "identifier",
		"start": 95,
		"end": 96,
		"match": "b"
	},
	{
		"type": "keyword",
		"start": 97,
		"end": 98,
		"match": "#"
	},
	{
		"type": "keyword",
		"start": 98,
		"end": 104,
		"match": "define"
	},
	{
		"type": "identifier",
		"start": 105,
		"end": 108,
		"match": "LOG"
	},
	{
		"type": "punctuation",
		"start": 108,
		"end": 109,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 109,
		"end": 115,
		"match": "format"
	},
	{
		"type": "punctuation",
		"start": 115,
		"end": 116,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 117,
		"end": 120,
		"match": "..."
	},
	{
		"type": "punctuation",
		"start": 120,
		"end": 121,
		"match": ")"
	},
	{
		"type": "identifier",
		"start": 122,
		"end": 133,
		"match": "log_message"
	},
	{
		"type": "punctuation",
		"start": 133,
		"end": 134,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 134,
		"end": 140,
		"match": "format"
	},
	{
		"type": "identifier",
		"start": 141,
		"end": 151,
		"match": "__VA_OPT__"
	},
	{
		"type": "punctuation",
		"start": 151,
		"end": 152,
		"match": "("
	},
	{
		"type": "punctuation",
		"start": 152,
		"end": 153,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 153,
		"end": 154,
		"match": ")"
	},
	{
		"type": "identifier",
		"start": 155,
		"end": 166,
		"match": "__VA_ARGS__"
	},
	{
		"type": "punctuation",
		"start": 166,
		"end": 167,
		"match": ")"
	},
	{
		"type": "keyword",
		"start": 168,
		"end": 169,
		"match": "#"
	},
	{
		"type": "keyword",
		"start": 169,
		"end": 175,
		"match": "define"
	},
	{
		"type": "identifier",
		"start": 176,
		"end": 181,
		"match": "SCALE"
	},
	{
		"type": "punctuation",
		"start": 181,
		"end": 182,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 182,
		"end": 183,
		"match": "x"
	},
	{
		"type": "punctuation",
		"start": 183,
		"end": 184,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 185,
		"end": 186,
		"match": "("
	},
	{
		"type": "punctuation",
		"start": 186,
		"end": 187,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 187,
		"end": 188,
		"match": "x"
	},
	{
		"type": "punctuation",
		"start": 188,
		"end": 189,
		"match": ")"
	},
	{
		"type": "operator",
		"start": 190,
		"end": 191,
		"match": "*"
	},
	{
		"type": "number",
		"start": 192,
		"end": 200,
		"match": "0x1.fp+2"
	},
	{
		"type": "punctuation",
		"start": 200,
		"end": 201,
		"match": ")"
	},
	{
		"type": "operator",
		"start": 206,
		"end": 207,
		"match": "+"
	},
	{
		"type": "number",
		"start": 208,
		"end": 214,
		"match": "1'024u"
	},
	{
		"type": "keyword",
		"start": 215,
		"end": 216,
		"match": "#"
	},
	{
		"type": "keyword",
		"start": 216,
		"end": 218,
		"match": "if"
	},
	{
		"type": "identifier",
		"start": 219,
		"end": 226,
		"match": "defined"
	},
	{
		"type": "punctuation",
		"start": 226,
		"end": 227,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 227,
		"end": 234,
		"match": "FEATURE"
	},
	{
		"type": "punctuation",
		"start": 234,
		"end": 235,
		"match": ")"
	},
	{
		"type": "operator",
		"start": 236,
		"end": 238,
		"match": "&&"
	},
	{
		"type": "identifier",
		"start": 239,
		"end": 252,
		"match": "__has_include"
	},
	{
		"type": "punctuation",
		"start": 252,
		"end": 253,
		"match": "("
	},
	{
		"type": "operator",
		"start": 253,
		"end": 254,
		"match": "<"
	},
	{
		"type": "identifier",
		"start": 254,
		"end": 261,
		"match": "feature"
	},
	{
		"type": "punctuation",
		"start": 261,
		"end": 262,
		"match": "."
	},
	{
		"type": "identifier",
		"start": 262,
		"end": 263,
		"match": "h"
	},
	{
		"type": "operator",
		"start": 263,
		"end": 264,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 264,
		"end": 265,
		"match": ")"
	},
	{
		"type": "keyword",
		"start": 266,
		"end": 267,
		"match": "#"
	},
	{
		"type": "keyword",
		"start": 268,
		"end": 275,
		"match": "include"
	},
	{
		"type": "string",
		"start": 276,
		"end": 287,
		"match": "<feature.h>"
	},
	{
		"type": "keyword",
		"start": 288,
		"end": 289,
		"match": "#"
	},
	{
		"type": "keyword",
		"start": 289,
		"end": 297,
		"match": "elifndef"
	},
	{
		"type": "identifier",
		"start": 298,
		"end": 306,
		"match": "FALLBACK"
	},
	{
		"type": "keyword",
		"start": 307,
		"end": 308,
		"match": "#"
	},
	{
		"type": "keyword",
		"start": 309,
		"end": 316,
		"match": "warning"
	},
	{
		"type": "string",
		"start": 317,
		"end": 333,
		"match": "\"using fallback\""
	},
	{
		"type": "keyword",
		"start": 334,
		"end": 335,
		"match": "#"
	},
	{
		"type": "keyword",
		"start": 335,
		"end": 340,
		"match": "endif"
	},
	{
		"type": "keyword",
		"start": 341,
		"end": 346,
		"match": "const"
	},
	{
		"type": "keyword",
		"start": 347,
		"end": 355,
		"match": "unsigned"
	},
	{
		"type": "keyword",
		"start": 356,
		"end": 360,
		"match": "char"
	},
	{
		"type": "identifier",
		"start": 361,
		"end": 365,
		"match": "data"
	},
	{
		"type": "punctuation",
		"start": 365,
		"end": 366,
		"match": "["
	},
	{
		"type": "punctuation",
		"start": 366,
		"end": 367,
		"match": "]"
	},
	{
		"type": "operator",
		"start": 368,
		"end": 369,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 370,
		"end": 371,
		"match": "{"
	},
	{
		"type": "keyword",
		"start": 372,
		"end": 373,
		"match": "#"
	},
	{
		"type": "keyword",
		"start": 373,
		"end": 378,
		"match": "embed"
	},
	{
		"type": "string",
		"start": 379,
		"end": 389,
		"match": "\"data.bin\""
	},
	{
		"type": "identifier",
		"start": 390,
		"end": 395,
		"match": "limit"
	},
	{
		"type": "punctuation",
		"start": 395,
		"end": 396,
		"match": "("
	},
	{
		"type": "number",
		"start": 396,
		"end": 398,
		"match": "16"
	},
	{
		"type": "punctuation",
		"start": 398,
		"end": 399,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 400,
		"end": 401,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 401,
		"end": 402,
		"match": ";"
	},
	{
		"type": "comment",
		"start": 403,
		"end": 426,
		"match": "// a continued comment "
	},
	{
		"type": "comment",
		"start": 426,
		"end": 451,
		"match": "\\\n#define NOT_A_DIRECTIVE"
	},
	{
		"type": "keyword",
		"start": 452,
		"end": 455,
		"match": "int"
	},
	{
		"type": "identifier",
		"start": 456,
		"end": 469,
		"match": "after_comment"
	},
	{
		"type": "punctuation",
		"start": 469,
		"end": 470,
		"match": ";"
	}
];
