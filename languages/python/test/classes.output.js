export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 4,
		"match": "from"
	},
	{
		"type": "identifier",
		"start": 5,
		"end": 16,
		"match": "dataclasses"
	},
	{
		"type": "keyword",
		"start": 17,
		"end": 23,
		"match": "import"
	},
	{
		"type": "identifier",
		"start": 24,
		"end": 33,
		"match": "dataclass"
	},
	{
		"type": "operator",
		"start": 35,
		"end": 36,
		"match": "@"
	},
	{
		"type": "identifier",
		"start": 36,
		"end": 45,
		"match": "dataclass"
	},
	{
		"type": "punctuation",
		"start": 45,
		"end": 46,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 46,
		"end": 52,
		"match": "frozen"
	},
	{
		"type": "operator",
		"start": 52,
		"end": 53,
		"match": "="
	},
	{
		"type": "boolean",
		"start": 53,
		"end": 57,
		"match": "True"
	},
	{
		"type": "punctuation",
		"start": 57,
		"end": 58,
		"match": ")"
	},
	{
		"type": "keyword",
		"start": 59,
		"end": 64,
		"match": "class"
	},
	{
		"type": "class_name",
		"start": 65,
		"end": 71,
		"match": "Circle"
	},
	{
		"type": "punctuation",
		"start": 71,
		"end": 72,
		"match": ":"
	},
	{
		"type": "string",
		"start": 77,
		"end": 106,
		"match": "\"\"\"A circle with a radius.\"\"\""
	},
	{
		"type": "identifier",
		"start": 111,
		"end": 117,
		"match": "radius"
	},
	{
		"type": "punctuation",
		"start": 117,
		"end": 118,
		"match": ":"
	},
	{
		"type": "class_name",
		"start": 119,
		"end": 124,
		"match": "float"
	},
	{
		"type": "operator",
		"start": 125,
		"end": 126,
		"match": "="
	},
	{
		"type": "number",
		"start": 127,
		"end": 130,
		"match": "1.0"
	},
	{
		"type": "keyword",
		"start": 136,
		"end": 139,
		"match": "def"
	},
	{
		"type": "identifier",
		"start": 140,
		"end": 144,
		"match": "area"
	},
	{
		"type": "punctuation",
		"start": 144,
		"end": 145,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 145,
		"end": 149,
		"match": "self"
	},
	{
		"type": "punctuation",
		"start": 149,
		"end": 150,
		"match": ")"
	},
	{
		"type": "operator",
		"start": 151,
		"end": 153,
		"match": "->"
	},
	{
		"type": "class_name",
		"start": 154,
		"end": 159,
		"match": "float"
	},
	{
		"type": "punctuation",
		"start": 159,
		"end": 160,
		"match": ":"
	},
	{
		"type": "keyword",
		"start": 169,
		"end": 175,
		"match": "return"
	},
	{
		"type": "number",
		"start": 176,
		"end": 180,
		"match": "3.14"
	},
	{
		"type": "operator",
		"start": 181,
		"end": 182,
		"match": "*"
	},
	{
		"type": "identifier",
		"start": 183,
		"end": 187,
		"match": "self"
	},
	{
		"type": "punctuation",
		"start": 187,
		"end": 188,
		"match": "."
	},
	{
		"type": "identifier",
		"start": 188,
		"end": 194,
		"match": "radius"
	},
	{
		"type": "operator",
		"start": 195,
		"end": 197,
		"match": "**"
	},
	{
		"type": "number",
		"start": 198,
		"end": 199,
		"match": "2"
	},
	{
		"type": "operator",
		"start": 205,
		"end": 206,
		"match": "@"
	},
	{
		"type": "identifier",
		"start": 206,
		"end": 217,
		"match": "classmethod"
	},
	{
		"type": "keyword",
		"start": 222,
		"end": 225,
		"match": "def"
	},
	{
		"type": "identifier",
		"start": 226,
		"end": 230,
		"match": "unit"
	},
	{
		"type": "punctuation",
		"start": 230,
		"end": 231,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 231,
		"end": 234,
		"match": "cls"
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
		"match": "->"
	},
	{
		"type": "string",
		"start": 239,
		"end": 247,
		"match": "\"Circle\""
	},
	{
		"type": "punctuation",
		"start": 247,
		"end": 248,
		"match": ":"
	},
	{
		"type": "keyword",
		"start": 257,
		"end": 263,
		"match": "return"
	},
	{
		"type": "identifier",
		"start": 264,
		"end": 267,
		"match": "cls"
	},
	{
		"type": "punctuation",
		"start": 267,
		"end": 268,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 268,
		"end": 274,
		"match": "radius"
	},
	{
		"type": "operator",
		"start": 274,
		"end": 275,
		"match": "="
	},
	{
		"type": "number",
		"start": 275,
		"end": 278,
		"match": "1.0"
	},
	{
		"type": "punctuation",
		"start": 278,
		"end": 279,
		"match": ")"
	},
	{
		"type": "operator",
		"start": 285,
		"end": 286,
		"match": "@"
	},
	{
		"type": "identifier",
		"start": 286,
		"end": 298,
		"match": "staticmethod"
	},
	{
		"type": "keyword",
		"start": 303,
		"end": 306,
		"match": "def"
	},
	{
		"type": "identifier",
		"start": 307,
		"end": 309,
		"match": "pi"
	},
	{
		"type": "punctuation",
		"start": 309,
		"end": 311,
		"match": "()"
	},
	{
		"type": "operator",
		"start": 312,
		"end": 314,
		"match": "->"
	},
	{
		"type": "class_name",
		"start": 315,
		"end": 320,
		"match": "float"
	},
	{
		"type": "punctuation",
		"start": 320,
		"end": 321,
		"match": ":"
	},
	{
		"type": "keyword",
		"start": 330,
		"end": 336,
		"match": "return"
	},
	{
		"type": "number",
		"start": 337,
		"end": 344,
		"match": "3.14159"
	},
	{
		"type": "keyword",
		"start": 346,
		"end": 351,
		"match": "class"
	},
	{
		"type": "class_name",
		"start": 352,
		"end": 359,
		"match": "Generic"
	},
	{
		"type": "punctuation",
		"start": 359,
		"end": 360,
		"match": "["
	},
	{
		"type": "class_name",
		"start": 360,
		"end": 361,
		"match": "T"
	},
	{
		"type": "punctuation",
		"start": 361,
		"end": 363,
		"match": "]:"
	},
	{
		"type": "identifier",
		"start": 368,
		"end": 373,
		"match": "items"
	},
	{
		"type": "punctuation",
		"start": 373,
		"end": 374,
		"match": ":"
	},
	{
		"type": "class_name",
		"start": 375,
		"end": 379,
		"match": "list"
	},
	{
		"type": "punctuation",
		"start": 379,
		"end": 380,
		"match": "["
	},
	{
		"type": "class_name",
		"start": 380,
		"end": 381,
		"match": "T"
	},
	{
		"type": "punctuation",
		"start": 381,
		"end": 382,
		"match": "]"
	},
	{
		"type": "keyword",
		"start": 388,
		"end": 391,
		"match": "def"
	},
	{
		"type": "identifier",
		"start": 392,
		"end": 400,
		"match": "__init__"
	},
	{
		"type": "punctuation",
		"start": 400,
		"end": 401,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 401,
		"end": 405,
		"match": "self"
	},
	{
		"type": "punctuation",
		"start": 405,
		"end": 406,
		"match": ","
	},
	{
		"type": "identifier",
		"start": 407,
		"end": 412,
		"match": "items"
	},
	{
		"type": "punctuation",
		"start": 412,
		"end": 413,
		"match": ":"
	},
	{
		"type": "class_name",
		"start": 414,
		"end": 418,
		"match": "list"
	},
	{
		"type": "punctuation",
		"start": 418,
		"end": 419,
		"match": "["
	},
	{
		"type": "class_name",
		"start": 419,
		"end": 420,
		"match": "T"
	},
	{
		"type": "punctuation",
		"start": 420,
		"end": 422,
		"match": "])"
	},
	{
		"type": "operator",
		"start": 423,
		"end": 425,
		"match": "->"
	},
	{
		"type": "keyword",
		"start": 426,
		"end": 430,
		"match": "None"
	},
	{
		"type": "punctuation",
		"start": 430,
		"end": 431,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 440,
		"end": 444,
		"match": "self"
	},
	{
		"type": "punctuation",
		"start": 444,
		"end": 445,
		"match": "."
	},
	{
		"type": "identifier",
		"start": 445,
		"end": 450,
		"match": "items"
	},
	{
		"type": "operator",
		"start": 451,
		"end": 452,
		"match": "="
	},
	{
		"type": "identifier",
		"start": 453,
		"end": 458,
		"match": "items"
	},
	{
		"type": "class_name",
		"start": 460,
		"end": 464,
		"match": "type"
	},
	{
		"type": "class_name",
		"start": 465,
		"end": 468,
		"match": "Vec"
	},
	{
		"type": "punctuation",
		"start": 468,
		"end": 469,
		"match": "["
	},
	{
		"type": "class_name",
		"start": 469,
		"end": 470,
		"match": "T"
	},
	{
		"type": "punctuation",
		"start": 470,
		"end": 471,
		"match": "]"
	},
	{
		"type": "operator",
		"start": 472,
		"end": 473,
		"match": "="
	},
	{
		"type": "class_name",
		"start": 474,
		"end": 478,
		"match": "list"
	},
	{
		"type": "punctuation",
		"start": 478,
		"end": 479,
		"match": "["
	},
	{
		"type": "class_name",
		"start": 479,
		"end": 480,
		"match": "T"
	},
	{
		"type": "punctuation",
		"start": 480,
		"end": 481,
		"match": "]"
	},
	{
		"type": "class_name",
		"start": 482,
		"end": 486,
		"match": "type"
	},
	{
		"type": "class_name",
		"start": 487,
		"end": 491,
		"match": "Pair"
	},
	{
		"type": "operator",
		"start": 492,
		"end": 493,
		"match": "="
	},
	{
		"type": "class_name",
		"start": 494,
		"end": 499,
		"match": "tuple"
	},
	{
		"type": "punctuation",
		"start": 499,
		"end": 500,
		"match": "["
	},
	{
		"type": "class_name",
		"start": 500,
		"end": 503,
		"match": "int"
	},
	{
		"type": "punctuation",
		"start": 503,
		"end": 504,
		"match": ","
	},
	{
		"type": "class_name",
		"start": 505,
		"end": 508,
		"match": "str"
	},
	{
		"type": "punctuation",
		"start": 508,
		"end": 509,
		"match": "]"
	}
];
