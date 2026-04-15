export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 58,
		"match": "#!/bin/bash\n# arithmetic expansion and arithmetic command\n"
	},
	{
		"type": "identifier",
		"start": 59,
		"end": 60,
		"match": "x"
	},
	{
		"type": "operator",
		"start": 60,
		"end": 61,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 61,
		"end": 64,
		"match": "$(("
	},
	{
		"type": "number",
		"start": 64,
		"end": 65,
		"match": "1"
	},
	{
		"type": "operator",
		"start": 66,
		"end": 67,
		"match": "+"
	},
	{
		"type": "number",
		"start": 68,
		"end": 69,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 69,
		"end": 71,
		"match": "))"
	},
	{
		"type": "identifier",
		"start": 72,
		"end": 73,
		"match": "y"
	},
	{
		"type": "operator",
		"start": 73,
		"end": 74,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 74,
		"end": 77,
		"match": "$(("
	},
	{
		"type": "number",
		"start": 78,
		"end": 79,
		"match": "3"
	},
	{
		"type": "operator",
		"start": 80,
		"end": 81,
		"match": "*"
	},
	{
		"type": "number",
		"start": 82,
		"end": 83,
		"match": "4"
	},
	{
		"type": "operator",
		"start": 84,
		"end": 85,
		"match": "-"
	},
	{
		"type": "number",
		"start": 86,
		"end": 87,
		"match": "5"
	},
	{
		"type": "punctuation",
		"start": 88,
		"end": 90,
		"match": "))"
	},
	{
		"type": "identifier",
		"start": 91,
		"end": 92,
		"match": "z"
	},
	{
		"type": "operator",
		"start": 92,
		"end": 93,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 93,
		"end": 96,
		"match": "$(("
	},
	{
		"type": "identifier",
		"start": 97,
		"end": 98,
		"match": "a"
	},
	{
		"type": "operator",
		"start": 99,
		"end": 101,
		"match": "**"
	},
	{
		"type": "number",
		"start": 102,
		"end": 103,
		"match": "2"
	},
	{
		"type": "operator",
		"start": 104,
		"end": 105,
		"match": "+"
	},
	{
		"type": "identifier",
		"start": 106,
		"end": 107,
		"match": "b"
	},
	{
		"type": "operator",
		"start": 108,
		"end": 110,
		"match": "**"
	},
	{
		"type": "number",
		"start": 111,
		"end": 112,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 113,
		"end": 115,
		"match": "))"
	},
	{
		"type": "punctuation",
		"start": 117,
		"end": 119,
		"match": "(("
	},
	{
		"type": "identifier",
		"start": 120,
		"end": 125,
		"match": "count"
	},
	{
		"type": "operator",
		"start": 125,
		"end": 127,
		"match": "++"
	},
	{
		"type": "punctuation",
		"start": 128,
		"end": 130,
		"match": "))"
	},
	{
		"type": "punctuation",
		"start": 131,
		"end": 133,
		"match": "(("
	},
	{
		"type": "identifier",
		"start": 134,
		"end": 135,
		"match": "i"
	},
	{
		"type": "operator",
		"start": 136,
		"end": 137,
		"match": "="
	},
	{
		"type": "number",
		"start": 138,
		"end": 139,
		"match": "0"
	},
	{
		"type": "punctuation",
		"start": 140,
		"end": 142,
		"match": "))"
	},
	{
		"type": "punctuation",
		"start": 143,
		"end": 145,
		"match": "(("
	},
	{
		"type": "identifier",
		"start": 146,
		"end": 147,
		"match": "a"
	},
	{
		"type": "operator",
		"start": 148,
		"end": 149,
		"match": "<"
	},
	{
		"type": "identifier",
		"start": 150,
		"end": 151,
		"match": "b"
	},
	{
		"type": "operator",
		"start": 152,
		"end": 154,
		"match": "&&"
	},
	{
		"type": "identifier",
		"start": 155,
		"end": 156,
		"match": "c"
	},
	{
		"type": "operator",
		"start": 157,
		"end": 158,
		"match": ">"
	},
	{
		"type": "identifier",
		"start": 159,
		"end": 160,
		"match": "d"
	},
	{
		"type": "punctuation",
		"start": 161,
		"end": 163,
		"match": "))"
	},
	{
		"type": "comment",
		"start": 165,
		"end": 175,
		"match": "# bitwise\n"
	},
	{
		"type": "identifier",
		"start": 175,
		"end": 179,
		"match": "mask"
	},
	{
		"type": "operator",
		"start": 179,
		"end": 180,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 180,
		"end": 183,
		"match": "$(("
	},
	{
		"type": "number",
		"start": 184,
		"end": 188,
		"match": "0xff"
	},
	{
		"type": "operator",
		"start": 189,
		"end": 190,
		"match": "&"
	},
	{
		"type": "number",
		"start": 191,
		"end": 195,
		"match": "0x0f"
	},
	{
		"type": "punctuation",
		"start": 196,
		"end": 198,
		"match": "))"
	},
	{
		"type": "builtin",
		"start": 199,
		"end": 204,
		"match": "shift"
	},
	{
		"type": "operator",
		"start": 204,
		"end": 205,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 205,
		"end": 208,
		"match": "$(("
	},
	{
		"type": "number",
		"start": 209,
		"end": 210,
		"match": "1"
	},
	{
		"type": "operator",
		"start": 211,
		"end": 213,
		"match": "<<"
	},
	{
		"type": "number",
		"start": 214,
		"end": 215,
		"match": "8"
	},
	{
		"type": "punctuation",
		"start": 216,
		"end": 218,
		"match": "))"
	},
	{
		"type": "comment",
		"start": 220,
		"end": 228,
		"match": "# bases\n"
	},
	{
		"type": "identifier",
		"start": 228,
		"end": 231,
		"match": "hex"
	},
	{
		"type": "operator",
		"start": 231,
		"end": 232,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 232,
		"end": 235,
		"match": "$(("
	},
	{
		"type": "number",
		"start": 236,
		"end": 246,
		"match": "0xDEADBEEF"
	},
	{
		"type": "punctuation",
		"start": 247,
		"end": 249,
		"match": "))"
	},
	{
		"type": "identifier",
		"start": 250,
		"end": 253,
		"match": "oct"
	},
	{
		"type": "operator",
		"start": 253,
		"end": 254,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 254,
		"end": 257,
		"match": "$(("
	},
	{
		"type": "number",
		"start": 258,
		"end": 261,
		"match": "077"
	},
	{
		"type": "punctuation",
		"start": 262,
		"end": 264,
		"match": "))"
	},
	{
		"type": "identifier",
		"start": 265,
		"end": 268,
		"match": "bin"
	},
	{
		"type": "operator",
		"start": 268,
		"end": 269,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 269,
		"end": 272,
		"match": "$(("
	},
	{
		"type": "number",
		"start": 273,
		"end": 279,
		"match": "2#1010"
	},
	{
		"type": "punctuation",
		"start": 280,
		"end": 282,
		"match": "))"
	},
	{
		"type": "comment",
		"start": 284,
		"end": 308,
		"match": "# c-style for-loop head\n"
	},
	{
		"type": "keyword",
		"start": 308,
		"end": 311,
		"match": "for"
	},
	{
		"type": "punctuation",
		"start": 312,
		"end": 314,
		"match": "(("
	},
	{
		"type": "identifier",
		"start": 315,
		"end": 316,
		"match": "i"
	},
	{
		"type": "operator",
		"start": 316,
		"end": 317,
		"match": "="
	},
	{
		"type": "number",
		"start": 317,
		"end": 318,
		"match": "0"
	},
	{
		"type": "identifier",
		"start": 318,
		"end": 319,
		"match": ";"
	},
	{
		"type": "identifier",
		"start": 320,
		"end": 321,
		"match": "i"
	},
	{
		"type": "operator",
		"start": 321,
		"end": 322,
		"match": "<"
	},
	{
		"type": "number",
		"start": 322,
		"end": 324,
		"match": "10"
	},
	{
		"type": "identifier",
		"start": 324,
		"end": 325,
		"match": ";"
	},
	{
		"type": "identifier",
		"start": 326,
		"end": 327,
		"match": "i"
	},
	{
		"type": "operator",
		"start": 327,
		"end": 329,
		"match": "++"
	},
	{
		"type": "punctuation",
		"start": 330,
		"end": 333,
		"match": "));"
	},
	{
		"type": "keyword",
		"start": 334,
		"end": 336,
		"match": "do"
	},
	{
		"type": "builtin",
		"start": 341,
		"end": 345,
		"match": "echo"
	},
	{
		"type": "variable",
		"start": 346,
		"end": 348,
		"match": "$i"
	},
	{
		"type": "keyword",
		"start": 349,
		"end": 353,
		"match": "done"
	},
	{
		"type": "comment",
		"start": 355,
		"end": 364,
		"match": "# nested\n"
	},
	{
		"type": "identifier",
		"start": 364,
		"end": 365,
		"match": "r"
	},
	{
		"type": "operator",
		"start": 365,
		"end": 366,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 366,
		"end": 369,
		"match": "$(("
	},
	{
		"type": "punctuation",
		"start": 370,
		"end": 373,
		"match": "$(("
	},
	{
		"type": "identifier",
		"start": 374,
		"end": 375,
		"match": "a"
	},
	{
		"type": "operator",
		"start": 376,
		"end": 377,
		"match": "+"
	},
	{
		"type": "identifier",
		"start": 378,
		"end": 379,
		"match": "b"
	},
	{
		"type": "punctuation",
		"start": 380,
		"end": 382,
		"match": "))"
	},
	{
		"type": "operator",
		"start": 383,
		"end": 384,
		"match": "*"
	},
	{
		"type": "identifier",
		"start": 385,
		"end": 386,
		"match": "c"
	},
	{
		"type": "punctuation",
		"start": 387,
		"end": 389,
		"match": "))"
	}
];
