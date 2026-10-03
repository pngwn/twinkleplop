export const test = [
	{
		"type": "variable",
		"start": 0,
		"end": 8,
		"match": "$decimal"
	},
	{
		"type": "operator",
		"start": 9,
		"end": 10,
		"match": "="
	},
	{
		"type": "number",
		"start": 11,
		"end": 12,
		"match": "0"
	},
	{
		"type": "punctuation",
		"start": 12,
		"end": 13,
		"match": ","
	},
	{
		"type": "number",
		"start": 14,
		"end": 16,
		"match": "42"
	},
	{
		"type": "punctuation",
		"start": 16,
		"end": 17,
		"match": ","
	},
	{
		"type": "operator",
		"start": 18,
		"end": 19,
		"match": "-"
	},
	{
		"type": "number",
		"start": 19,
		"end": 21,
		"match": "10"
	},
	{
		"type": "punctuation",
		"start": 21,
		"end": 22,
		"match": ","
	},
	{
		"type": "operator",
		"start": 23,
		"end": 24,
		"match": "+"
	},
	{
		"type": "number",
		"start": 24,
		"end": 25,
		"match": "7"
	},
	{
		"type": "punctuation",
		"start": 25,
		"end": 26,
		"match": ","
	},
	{
		"type": "number",
		"start": 27,
		"end": 29,
		"match": ".5"
	},
	{
		"type": "punctuation",
		"start": 29,
		"end": 30,
		"match": ","
	},
	{
		"type": "number",
		"start": 31,
		"end": 33,
		"match": "1."
	},
	{
		"type": "punctuation",
		"start": 33,
		"end": 34,
		"match": ","
	},
	{
		"type": "number",
		"start": 35,
		"end": 39,
		"match": "1.25"
	},
	{
		"type": "punctuation",
		"start": 39,
		"end": 40,
		"match": ","
	},
	{
		"type": "number",
		"start": 41,
		"end": 44,
		"match": "1e3"
	},
	{
		"type": "punctuation",
		"start": 44,
		"end": 45,
		"match": ","
	},
	{
		"type": "number",
		"start": 46,
		"end": 51,
		"match": "1.e+2"
	},
	{
		"type": "punctuation",
		"start": 51,
		"end": 52,
		"match": ","
	},
	{
		"type": "number",
		"start": 53,
		"end": 59,
		"match": "1.2E-3"
	},
	{
		"type": "punctuation",
		"start": 59,
		"end": 60,
		"match": ","
	},
	{
		"type": "number",
		"start": 61,
		"end": 66,
		"match": ".5e–2"
	},
	{
		"type": "variable",
		"start": 67,
		"end": 71,
		"match": "$hex"
	},
	{
		"type": "operator",
		"start": 72,
		"end": 73,
		"match": "="
	},
	{
		"type": "number",
		"start": 74,
		"end": 78,
		"match": "0xFF"
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
		"end": 90,
		"match": "0XdeadBEEF"
	},
	{
		"type": "punctuation",
		"start": 90,
		"end": 91,
		"match": ","
	},
	{
		"type": "number",
		"start": 92,
		"end": 98,
		"match": "0x1e2D"
	},
	{
		"type": "punctuation",
		"start": 98,
		"end": 99,
		"match": ","
	},
	{
		"type": "number",
		"start": 100,
		"end": 105,
		"match": "0xffL"
	},
	{
		"type": "punctuation",
		"start": 105,
		"end": 106,
		"match": ","
	},
	{
		"type": "number",
		"start": 107,
		"end": 113,
		"match": "0x10Gb"
	},
	{
		"type": "punctuation",
		"start": 113,
		"end": 114,
		"match": ","
	},
	{
		"type": "number",
		"start": 115,
		"end": 122,
		"match": "0x12Lpb"
	},
	{
		"type": "variable",
		"start": 123,
		"end": 130,
		"match": "$binary"
	},
	{
		"type": "operator",
		"start": 131,
		"end": 132,
		"match": "="
	},
	{
		"type": "number",
		"start": 133,
		"end": 139,
		"match": "0b1010"
	},
	{
		"type": "punctuation",
		"start": 139,
		"end": 140,
		"match": ","
	},
	{
		"type": "number",
		"start": 141,
		"end": 153,
		"match": "0B11111111uy"
	},
	{
		"type": "punctuation",
		"start": 153,
		"end": 154,
		"match": ","
	},
	{
		"type": "number",
		"start": 155,
		"end": 167,
		"match": "0b011111111n"
	},
	{
		"type": "variable",
		"start": 168,
		"end": 177,
		"match": "$suffixes"
	},
	{
		"type": "operator",
		"start": 178,
		"end": 179,
		"match": "="
	},
	{
		"type": "number",
		"start": 180,
		"end": 184,
		"match": "100y"
	},
	{
		"type": "punctuation",
		"start": 184,
		"end": 185,
		"match": ","
	},
	{
		"type": "number",
		"start": 186,
		"end": 191,
		"match": "100uy"
	},
	{
		"type": "punctuation",
		"start": 191,
		"end": 192,
		"match": ","
	},
	{
		"type": "number",
		"start": 193,
		"end": 197,
		"match": "100s"
	},
	{
		"type": "punctuation",
		"start": 197,
		"end": 198,
		"match": ","
	},
	{
		"type": "number",
		"start": 199,
		"end": 204,
		"match": "100us"
	},
	{
		"type": "punctuation",
		"start": 204,
		"end": 205,
		"match": ","
	},
	{
		"type": "number",
		"start": 206,
		"end": 210,
		"match": "100l"
	},
	{
		"type": "punctuation",
		"start": 210,
		"end": 211,
		"match": ","
	},
	{
		"type": "number",
		"start": 212,
		"end": 216,
		"match": "100u"
	},
	{
		"type": "punctuation",
		"start": 216,
		"end": 217,
		"match": ","
	},
	{
		"type": "number",
		"start": 218,
		"end": 223,
		"match": "100ul"
	},
	{
		"type": "punctuation",
		"start": 223,
		"end": 224,
		"match": ","
	},
	{
		"type": "number",
		"start": 225,
		"end": 229,
		"match": "100n"
	},
	{
		"type": "punctuation",
		"start": 229,
		"end": 230,
		"match": ","
	},
	{
		"type": "number",
		"start": 231,
		"end": 235,
		"match": "100d"
	},
	{
		"type": "variable",
		"start": 236,
		"end": 248,
		"match": "$multipliers"
	},
	{
		"type": "operator",
		"start": 249,
		"end": 250,
		"match": "="
	},
	{
		"type": "number",
		"start": 251,
		"end": 254,
		"match": "1kb"
	},
	{
		"type": "punctuation",
		"start": 254,
		"end": 255,
		"match": ","
	},
	{
		"type": "number",
		"start": 256,
		"end": 259,
		"match": "2MB"
	},
	{
		"type": "punctuation",
		"start": 259,
		"end": 260,
		"match": ","
	},
	{
		"type": "number",
		"start": 261,
		"end": 264,
		"match": "3Gb"
	},
	{
		"type": "punctuation",
		"start": 264,
		"end": 265,
		"match": ","
	},
	{
		"type": "number",
		"start": 266,
		"end": 269,
		"match": "4tB"
	},
	{
		"type": "punctuation",
		"start": 269,
		"end": 270,
		"match": ","
	},
	{
		"type": "number",
		"start": 271,
		"end": 274,
		"match": "5PB"
	},
	{
		"type": "punctuation",
		"start": 274,
		"end": 275,
		"match": ","
	},
	{
		"type": "number",
		"start": 276,
		"end": 283,
		"match": "1.30Dmb"
	},
	{
		"type": "punctuation",
		"start": 283,
		"end": 284,
		"match": ","
	},
	{
		"type": "number",
		"start": 285,
		"end": 291,
		"match": "482ngb"
	},
	{
		"type": "punctuation",
		"start": 291,
		"end": 292,
		"match": ","
	},
	{
		"type": "number",
		"start": 293,
		"end": 302,
		"match": "1.2345e1L"
	},
	{
		"type": "variable",
		"start": 303,
		"end": 309,
		"match": "$range"
	},
	{
		"type": "operator",
		"start": 310,
		"end": 311,
		"match": "="
	},
	{
		"type": "number",
		"start": 312,
		"end": 313,
		"match": "1"
	},
	{
		"type": "operator",
		"start": 313,
		"end": 315,
		"match": ".."
	},
	{
		"type": "number",
		"start": 315,
		"end": 317,
		"match": "10"
	},
	{
		"type": "variable",
		"start": 318,
		"end": 325,
		"match": "$values"
	},
	{
		"type": "operator",
		"start": 326,
		"end": 327,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 328,
		"end": 329,
		"match": "("
	},
	{
		"type": "number",
		"start": 329,
		"end": 330,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 330,
		"end": 332,
		"match": ")."
	},
	{
		"type": "property",
		"start": 332,
		"end": 339,
		"match": "GetType"
	},
	{
		"type": "punctuation",
		"start": 339,
		"end": 342,
		"match": "(),"
	},
	{
		"type": "number",
		"start": 343,
		"end": 346,
		"match": "2uL"
	},
	{
		"type": "punctuation",
		"start": 346,
		"end": 347,
		"match": "."
	},
	{
		"type": "property",
		"start": 347,
		"end": 354,
		"match": "GetType"
	},
	{
		"type": "punctuation",
		"start": 354,
		"end": 357,
		"match": "(),"
	},
	{
		"type": "number",
		"start": 358,
		"end": 363,
		"match": "1.234"
	},
	{
		"type": "punctuation",
		"start": 363,
		"end": 364,
		"match": "."
	},
	{
		"type": "property",
		"start": 364,
		"end": 371,
		"match": "GetType"
	},
	{
		"type": "punctuation",
		"start": 371,
		"end": 373,
		"match": "()"
	},
	{
		"type": "variable",
		"start": 374,
		"end": 382,
		"match": "$invalid"
	},
	{
		"type": "operator",
		"start": 383,
		"end": 384,
		"match": "="
	},
	{
		"type": "number",
		"start": 385,
		"end": 386,
		"match": "0"
	},
	{
		"type": "identifier",
		"start": 386,
		"end": 389,
		"match": "o77"
	},
	{
		"type": "punctuation",
		"start": 389,
		"end": 390,
		"match": ","
	},
	{
		"type": "number",
		"start": 391,
		"end": 392,
		"match": "1"
	},
	{
		"type": "identifier",
		"start": 392,
		"end": 396,
		"match": "_000"
	},
	{
		"type": "punctuation",
		"start": 396,
		"end": 397,
		"match": ","
	},
	{
		"type": "number",
		"start": 398,
		"end": 403,
		"match": "0b102"
	},
	{
		"type": "punctuation",
		"start": 403,
		"end": 404,
		"match": ","
	},
	{
		"type": "number",
		"start": 405,
		"end": 407,
		"match": "1e"
	},
	{
		"type": "punctuation",
		"start": 407,
		"end": 408,
		"match": ","
	},
	{
		"type": "number",
		"start": 409,
		"end": 412,
		"match": "1gb"
	},
	{
		"type": "identifier",
		"start": 412,
		"end": 414,
		"match": "us"
	},
	{
		"type": "punctuation",
		"start": 414,
		"end": 415,
		"match": ","
	},
	{
		"type": "number",
		"start": 416,
		"end": 418,
		"match": "77"
	},
	{
		"type": "identifier",
		"start": 418,
		"end": 419,
		"match": "z"
	}
];
