export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 5,
		"match": "const"
	},
	{
		"type": "keyword",
		"start": 6,
		"end": 10,
		"match": "char"
	},
	{
		"type": "operator",
		"start": 11,
		"end": 12,
		"match": "*"
	},
	{
		"type": "identifier",
		"start": 12,
		"end": 19,
		"match": "message"
	},
	{
		"type": "operator",
		"start": 20,
		"end": 21,
		"match": "="
	},
	{
		"type": "string",
		"start": 22,
		"end": 30,
		"match": "u8\"hello"
	},
	{
		"type": "string_escape",
		"start": 30,
		"end": 32,
		"match": "\\n"
	},
	{
		"type": "string",
		"start": 32,
		"end": 33,
		"match": "\""
	},
	{
		"type": "string",
		"start": 34,
		"end": 41,
		"match": "\"world\""
	},
	{
		"type": "punctuation",
		"start": 41,
		"end": 42,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 43,
		"end": 48,
		"match": "const"
	},
	{
		"type": "keyword",
		"start": 49,
		"end": 52,
		"match": "int"
	},
	{
		"type": "identifier",
		"start": 53,
		"end": 58,
		"match": "chars"
	},
	{
		"type": "punctuation",
		"start": 58,
		"end": 59,
		"match": "["
	},
	{
		"type": "punctuation",
		"start": 59,
		"end": 60,
		"match": "]"
	},
	{
		"type": "operator",
		"start": 61,
		"end": 62,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 63,
		"end": 64,
		"match": "{"
	},
	{
		"type": "string",
		"start": 64,
		"end": 67,
		"match": "'a'"
	},
	{
		"type": "punctuation",
		"start": 67,
		"end": 68,
		"match": ","
	},
	{
		"type": "string",
		"start": 69,
		"end": 70,
		"match": "'"
	},
	{
		"type": "string_escape",
		"start": 70,
		"end": 72,
		"match": "\\'"
	},
	{
		"type": "string",
		"start": 72,
		"end": 73,
		"match": "'"
	},
	{
		"type": "punctuation",
		"start": 73,
		"end": 74,
		"match": ","
	},
	{
		"type": "string",
		"start": 75,
		"end": 76,
		"match": "'"
	},
	{
		"type": "string_escape",
		"start": 76,
		"end": 80,
		"match": "\\123"
	},
	{
		"type": "string",
		"start": 80,
		"end": 81,
		"match": "'"
	},
	{
		"type": "punctuation",
		"start": 81,
		"end": 82,
		"match": ","
	},
	{
		"type": "string",
		"start": 83,
		"end": 84,
		"match": "'"
	},
	{
		"type": "string_escape",
		"start": 84,
		"end": 88,
		"match": "\\x41"
	},
	{
		"type": "string",
		"start": 88,
		"end": 89,
		"match": "'"
	},
	{
		"type": "punctuation",
		"start": 89,
		"end": 90,
		"match": ","
	},
	{
		"type": "string",
		"start": 91,
		"end": 95,
		"match": "u'λ'"
	},
	{
		"type": "punctuation",
		"start": 95,
		"end": 96,
		"match": ","
	},
	{
		"type": "string",
		"start": 97,
		"end": 102,
		"match": "U'𐐀'"
	},
	{
		"type": "punctuation",
		"start": 102,
		"end": 103,
		"match": ","
	},
	{
		"type": "string",
		"start": 104,
		"end": 108,
		"match": "L'Z'"
	},
	{
		"type": "punctuation",
		"start": 108,
		"end": 109,
		"match": ","
	},
	{
		"type": "string",
		"start": 110,
		"end": 115,
		"match": "u8'x'"
	},
	{
		"type": "punctuation",
		"start": 115,
		"end": 116,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 116,
		"end": 117,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 118,
		"end": 123,
		"match": "const"
	},
	{
		"type": "keyword",
		"start": 124,
		"end": 128,
		"match": "void"
	},
	{
		"type": "operator",
		"start": 129,
		"end": 130,
		"match": "*"
	},
	{
		"type": "identifier",
		"start": 130,
		"end": 137,
		"match": "strings"
	},
	{
		"type": "punctuation",
		"start": 137,
		"end": 138,
		"match": "["
	},
	{
		"type": "punctuation",
		"start": 138,
		"end": 139,
		"match": "]"
	},
	{
		"type": "operator",
		"start": 140,
		"end": 141,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 142,
		"end": 143,
		"match": "{"
	},
	{
		"type": "string",
		"start": 143,
		"end": 153,
		"match": "\"ordinary\""
	},
	{
		"type": "punctuation",
		"start": 153,
		"end": 154,
		"match": ","
	},
	{
		"type": "string",
		"start": 155,
		"end": 162,
		"match": "L\"wide\""
	},
	{
		"type": "punctuation",
		"start": 162,
		"end": 163,
		"match": ","
	},
	{
		"type": "string",
		"start": 164,
		"end": 172,
		"match": "u\"utf16\""
	},
	{
		"type": "punctuation",
		"start": 172,
		"end": 173,
		"match": ","
	},
	{
		"type": "string",
		"start": 174,
		"end": 182,
		"match": "U\"utf32\""
	},
	{
		"type": "punctuation",
		"start": 182,
		"end": 183,
		"match": ","
	},
	{
		"type": "string",
		"start": 184,
		"end": 192,
		"match": "u8\"utf8\""
	},
	{
		"type": "punctuation",
		"start": 192,
		"end": 193,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 193,
		"end": 194,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 195,
		"end": 203,
		"match": "unsigned"
	},
	{
		"type": "keyword",
		"start": 204,
		"end": 208,
		"match": "long"
	},
	{
		"type": "keyword",
		"start": 209,
		"end": 213,
		"match": "long"
	},
	{
		"type": "identifier",
		"start": 214,
		"end": 218,
		"match": "mask"
	},
	{
		"type": "operator",
		"start": 219,
		"end": 220,
		"match": "="
	},
	{
		"type": "number",
		"start": 221,
		"end": 231,
		"match": "0xff'ffULL"
	},
	{
		"type": "operator",
		"start": 232,
		"end": 233,
		"match": "|"
	},
	{
		"type": "number",
		"start": 234,
		"end": 241,
		"match": "0B1010u"
	},
	{
		"type": "operator",
		"start": 242,
		"end": 243,
		"match": "|"
	},
	{
		"type": "number",
		"start": 244,
		"end": 250,
		"match": "0755UL"
	},
	{
		"type": "punctuation",
		"start": 250,
		"end": 251,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 252,
		"end": 258,
		"match": "double"
	},
	{
		"type": "identifier",
		"start": 259,
		"end": 264,
		"match": "scale"
	},
	{
		"type": "operator",
		"start": 265,
		"end": 266,
		"match": "="
	},
	{
		"type": "operator",
		"start": 267,
		"end": 268,
		"match": "-"
	},
	{
		"type": "number",
		"start": 268,
		"end": 276,
		"match": "0x1.fp+2"
	},
	{
		"type": "operator",
		"start": 277,
		"end": 278,
		"match": "+"
	},
	{
		"type": "number",
		"start": 279,
		"end": 284,
		"match": ".5e-3"
	},
	{
		"type": "operator",
		"start": 285,
		"end": 286,
		"match": "+"
	},
	{
		"type": "number",
		"start": 287,
		"end": 289,
		"match": "1."
	},
	{
		"type": "punctuation",
		"start": 289,
		"end": 290,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 291,
		"end": 298,
		"match": "_BitInt"
	},
	{
		"type": "punctuation",
		"start": 298,
		"end": 299,
		"match": "("
	},
	{
		"type": "number",
		"start": 299,
		"end": 301,
		"match": "17"
	},
	{
		"type": "punctuation",
		"start": 301,
		"end": 302,
		"match": ")"
	},
	{
		"type": "identifier",
		"start": 303,
		"end": 307,
		"match": "bits"
	},
	{
		"type": "operator",
		"start": 308,
		"end": 309,
		"match": "="
	},
	{
		"type": "number",
		"start": 310,
		"end": 317,
		"match": "65535wb"
	},
	{
		"type": "punctuation",
		"start": 317,
		"end": 318,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 319,
		"end": 329,
		"match": "_Decimal64"
	},
	{
		"type": "identifier",
		"start": 330,
		"end": 337,
		"match": "decimal"
	},
	{
		"type": "operator",
		"start": 338,
		"end": 339,
		"match": "="
	},
	{
		"type": "number",
		"start": 340,
		"end": 346,
		"match": "1.25dd"
	},
	{
		"type": "punctuation",
		"start": 346,
		"end": 347,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 348,
		"end": 352,
		"match": "bool"
	},
	{
		"type": "identifier",
		"start": 353,
		"end": 358,
		"match": "ready"
	},
	{
		"type": "operator",
		"start": 359,
		"end": 360,
		"match": "="
	},
	{
		"type": "boolean",
		"start": 361,
		"end": 365,
		"match": "true"
	},
	{
		"type": "punctuation",
		"start": 365,
		"end": 366,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 367,
		"end": 371,
		"match": "void"
	},
	{
		"type": "operator",
		"start": 372,
		"end": 373,
		"match": "*"
	},
	{
		"type": "identifier",
		"start": 373,
		"end": 378,
		"match": "empty"
	},
	{
		"type": "operator",
		"start": 379,
		"end": 380,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 381,
		"end": 388,
		"match": "nullptr"
	},
	{
		"type": "punctuation",
		"start": 388,
		"end": 389,
		"match": ";"
	}
];
