export const test = [
	{
		"type": "identifier",
		"start": 0,
		"end": 1,
		"match": "a"
	},
	{
		"type": "operator",
		"start": 2,
		"end": 3,
		"match": "="
	},
	{
		"type": "string",
		"start": 4,
		"end": 11,
		"match": "\"hello\""
	},
	{
		"type": "identifier",
		"start": 12,
		"end": 13,
		"match": "b"
	},
	{
		"type": "operator",
		"start": 14,
		"end": 15,
		"match": "="
	},
	{
		"type": "string",
		"start": 16,
		"end": 23,
		"match": "'world'"
	},
	{
		"type": "identifier",
		"start": 24,
		"end": 25,
		"match": "c"
	},
	{
		"type": "operator",
		"start": 26,
		"end": 27,
		"match": "="
	},
	{
		"type": "string",
		"start": 28,
		"end": 47,
		"match": "\"\"\"triple double\"\"\""
	},
	{
		"type": "identifier",
		"start": 48,
		"end": 49,
		"match": "d"
	},
	{
		"type": "operator",
		"start": 50,
		"end": 51,
		"match": "="
	},
	{
		"type": "string",
		"start": 52,
		"end": 71,
		"match": "'''triple single'''"
	},
	{
		"type": "identifier",
		"start": 72,
		"end": 73,
		"match": "e"
	},
	{
		"type": "operator",
		"start": 74,
		"end": 75,
		"match": "="
	},
	{
		"type": "string",
		"start": 76,
		"end": 84,
		"match": "\"escape "
	},
	{
		"type": "string_escape",
		"start": 84,
		"end": 86,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 86,
		"end": 92,
		"match": "quoted"
	},
	{
		"type": "string_escape",
		"start": 92,
		"end": 94,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 94,
		"end": 101,
		"match": " chars\""
	},
	{
		"type": "identifier",
		"start": 102,
		"end": 103,
		"match": "f"
	},
	{
		"type": "operator",
		"start": 104,
		"end": 105,
		"match": "="
	},
	{
		"type": "string",
		"start": 106,
		"end": 116,
		"match": "'she said "
	},
	{
		"type": "string_escape",
		"start": 116,
		"end": 118,
		"match": "\\'"
	},
	{
		"type": "string",
		"start": 118,
		"end": 120,
		"match": "hi"
	},
	{
		"type": "string_escape",
		"start": 120,
		"end": 122,
		"match": "\\'"
	},
	{
		"type": "string",
		"start": 122,
		"end": 123,
		"match": "'"
	},
	{
		"type": "identifier",
		"start": 124,
		"end": 125,
		"match": "g"
	},
	{
		"type": "operator",
		"start": 126,
		"end": 127,
		"match": "="
	},
	{
		"type": "string",
		"start": 128,
		"end": 136,
		"match": "\"newline"
	},
	{
		"type": "string_escape",
		"start": 136,
		"end": 138,
		"match": "\\n"
	},
	{
		"type": "string",
		"start": 138,
		"end": 143,
		"match": "here\""
	},
	{
		"type": "identifier",
		"start": 144,
		"end": 145,
		"match": "h"
	},
	{
		"type": "operator",
		"start": 146,
		"end": 147,
		"match": "="
	},
	{
		"type": "string",
		"start": 148,
		"end": 152,
		"match": "\"tab"
	},
	{
		"type": "string_escape",
		"start": 152,
		"end": 154,
		"match": "\\t"
	},
	{
		"type": "string",
		"start": 154,
		"end": 159,
		"match": "here\""
	},
	{
		"type": "identifier",
		"start": 160,
		"end": 161,
		"match": "i"
	},
	{
		"type": "operator",
		"start": 162,
		"end": 163,
		"match": "="
	},
	{
		"type": "string",
		"start": 164,
		"end": 173,
		"match": "\"unicode "
	},
	{
		"type": "string_escape",
		"start": 173,
		"end": 179,
		"match": "\\u00e9"
	},
	{
		"type": "string",
		"start": 179,
		"end": 180,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 180,
		"end": 189,
		"match": "\\N{SNAKE}"
	},
	{
		"type": "string",
		"start": 189,
		"end": 190,
		"match": "\""
	},
	{
		"type": "identifier",
		"start": 191,
		"end": 192,
		"match": "j"
	},
	{
		"type": "operator",
		"start": 193,
		"end": 194,
		"match": "="
	},
	{
		"type": "string",
		"start": 195,
		"end": 200,
		"match": "\"hex "
	},
	{
		"type": "string_escape",
		"start": 200,
		"end": 204,
		"match": "\\x41"
	},
	{
		"type": "string",
		"start": 204,
		"end": 211,
		"match": " octal "
	},
	{
		"type": "string_escape",
		"start": 211,
		"end": 215,
		"match": "\\101"
	},
	{
		"type": "string",
		"start": 215,
		"end": 216,
		"match": "\""
	},
	{
		"type": "identifier",
		"start": 217,
		"end": 218,
		"match": "k"
	},
	{
		"type": "operator",
		"start": 219,
		"end": 220,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 221,
		"end": 222,
		"match": "b"
	},
	{
		"type": "string",
		"start": 222,
		"end": 229,
		"match": "\"bytes\""
	},
	{
		"type": "identifier",
		"start": 230,
		"end": 231,
		"match": "l"
	},
	{
		"type": "operator",
		"start": 232,
		"end": 233,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 234,
		"end": 235,
		"match": "B"
	},
	{
		"type": "string",
		"start": 235,
		"end": 242,
		"match": "\"BYTES\""
	},
	{
		"type": "identifier",
		"start": 243,
		"end": 244,
		"match": "m"
	},
	{
		"type": "operator",
		"start": 245,
		"end": 246,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 247,
		"end": 248,
		"match": "r"
	},
	{
		"type": "string",
		"start": 248,
		"end": 268,
		"match": "\"raw \\n not escaped\""
	},
	{
		"type": "identifier",
		"start": 269,
		"end": 270,
		"match": "n"
	},
	{
		"type": "operator",
		"start": 271,
		"end": 272,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 273,
		"end": 274,
		"match": "R"
	},
	{
		"type": "string",
		"start": 274,
		"end": 281,
		"match": "\"raw R\""
	},
	{
		"type": "identifier",
		"start": 282,
		"end": 283,
		"match": "o"
	},
	{
		"type": "operator",
		"start": 284,
		"end": 285,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 286,
		"end": 287,
		"match": "u"
	},
	{
		"type": "string",
		"start": 287,
		"end": 295,
		"match": "\"legacy\""
	},
	{
		"type": "identifier",
		"start": 296,
		"end": 297,
		"match": "p"
	},
	{
		"type": "operator",
		"start": 298,
		"end": 299,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 300,
		"end": 301,
		"match": "U"
	},
	{
		"type": "string",
		"start": 301,
		"end": 309,
		"match": "\"LEGACY\""
	},
	{
		"type": "identifier",
		"start": 310,
		"end": 311,
		"match": "q"
	},
	{
		"type": "operator",
		"start": 312,
		"end": 313,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 314,
		"end": 316,
		"match": "rb"
	},
	{
		"type": "string",
		"start": 316,
		"end": 327,
		"match": "\"raw bytes\""
	},
	{
		"type": "identifier",
		"start": 328,
		"end": 330,
		"match": "r_"
	},
	{
		"type": "operator",
		"start": 331,
		"end": 332,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 333,
		"end": 335,
		"match": "br"
	},
	{
		"type": "string",
		"start": 335,
		"end": 345,
		"match": "\"byte raw\""
	},
	{
		"type": "identifier",
		"start": 346,
		"end": 347,
		"match": "s"
	},
	{
		"type": "operator",
		"start": 348,
		"end": 349,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 350,
		"end": 352,
		"match": "rB"
	},
	{
		"type": "string",
		"start": 352,
		"end": 358,
		"match": "\"case\""
	},
	{
		"type": "identifier",
		"start": 359,
		"end": 360,
		"match": "t"
	},
	{
		"type": "operator",
		"start": 361,
		"end": 362,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 363,
		"end": 365,
		"match": "Br"
	},
	{
		"type": "string",
		"start": 365,
		"end": 372,
		"match": "\"case2\""
	},
	{
		"type": "identifier",
		"start": 373,
		"end": 374,
		"match": "u"
	},
	{
		"type": "operator",
		"start": 375,
		"end": 376,
		"match": "="
	},
	{
		"type": "string",
		"start": 377,
		"end": 400,
		"match": "\"\"\"multi\nline\nstring\"\"\""
	},
	{
		"type": "identifier",
		"start": 401,
		"end": 402,
		"match": "v"
	},
	{
		"type": "operator",
		"start": 403,
		"end": 404,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 405,
		"end": 406,
		"match": "r"
	},
	{
		"type": "string",
		"start": 406,
		"end": 433,
		"match": "\"\"\"raw triple \\n literal\"\"\""
	},
	{
		"type": "identifier",
		"start": 434,
		"end": 435,
		"match": "w"
	},
	{
		"type": "operator",
		"start": 436,
		"end": 437,
		"match": "="
	},
	{
		"type": "string",
		"start": 438,
		"end": 450,
		"match": "\"bad escape "
	},
	{
		"type": "string_escape",
		"start": 450,
		"end": 452,
		"match": "\\q"
	},
	{
		"type": "string",
		"start": 452,
		"end": 453,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 453,
		"end": 455,
		"match": "\\z"
	},
	{
		"type": "string",
		"start": 455,
		"end": 462,
		"match": " stays\""
	},
	{
		"type": "identifier",
		"start": 463,
		"end": 464,
		"match": "x"
	},
	{
		"type": "operator",
		"start": 465,
		"end": 466,
		"match": "="
	},
	{
		"type": "string",
		"start": 467,
		"end": 469,
		"match": "\"\""
	},
	{
		"type": "operator",
		"start": 470,
		"end": 471,
		"match": "+"
	},
	{
		"type": "string",
		"start": 472,
		"end": 474,
		"match": "''"
	},
	{
		"type": "identifier",
		"start": 475,
		"end": 476,
		"match": "y"
	},
	{
		"type": "operator",
		"start": 477,
		"end": 478,
		"match": "="
	},
	{
		"type": "string",
		"start": 479,
		"end": 487,
		"match": "\"concat\""
	},
	{
		"type": "string",
		"start": 488,
		"end": 496,
		"match": "\"enated\""
	}
];
