export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 1,
		"match": "#"
	},
	{
		"type": "keyword",
		"start": 1,
		"end": 8,
		"match": "include"
	},
	{
		"type": "string",
		"start": 9,
		"end": 18,
		"match": "<compare>"
	},
	{
		"type": "keyword",
		"start": 19,
		"end": 20,
		"match": "#"
	},
	{
		"type": "keyword",
		"start": 20,
		"end": 27,
		"match": "include"
	},
	{
		"type": "string",
		"start": 28,
		"end": 36,
		"match": "<vector>"
	},
	{
		"type": "keyword",
		"start": 37,
		"end": 46,
		"match": "namespace"
	},
	{
		"type": "identifier",
		"start": 47,
		"end": 55,
		"match": "geometry"
	},
	{
		"type": "punctuation",
		"start": 56,
		"end": 57,
		"match": "{"
	},
	{
		"type": "keyword",
		"start": 58,
		"end": 66,
		"match": "template"
	},
	{
		"type": "operator",
		"start": 66,
		"end": 67,
		"match": "<"
	},
	{
		"type": "keyword",
		"start": 67,
		"end": 75,
		"match": "typename"
	},
	{
		"type": "identifier",
		"start": 76,
		"end": 77,
		"match": "T"
	},
	{
		"type": "operator",
		"start": 77,
		"end": 78,
		"match": ">"
	},
	{
		"type": "keyword",
		"start": 79,
		"end": 86,
		"match": "concept"
	},
	{
		"type": "identifier",
		"start": 87,
		"end": 94,
		"match": "Numeric"
	},
	{
		"type": "operator",
		"start": 95,
		"end": 96,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 97,
		"end": 105,
		"match": "requires"
	},
	{
		"type": "punctuation",
		"start": 105,
		"end": 106,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 106,
		"end": 107,
		"match": "T"
	},
	{
		"type": "identifier",
		"start": 108,
		"end": 113,
		"match": "value"
	},
	{
		"type": "punctuation",
		"start": 113,
		"end": 114,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 115,
		"end": 116,
		"match": "{"
	},
	{
		"type": "identifier",
		"start": 117,
		"end": 122,
		"match": "value"
	},
	{
		"type": "operator",
		"start": 123,
		"end": 124,
		"match": "+"
	},
	{
		"type": "identifier",
		"start": 125,
		"end": 130,
		"match": "value"
	},
	{
		"type": "punctuation",
		"start": 130,
		"end": 131,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 132,
		"end": 133,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 133,
		"end": 134,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 135,
		"end": 143,
		"match": "template"
	},
	{
		"type": "operator",
		"start": 143,
		"end": 144,
		"match": "<"
	},
	{
		"type": "identifier",
		"start": 144,
		"end": 151,
		"match": "Numeric"
	},
	{
		"type": "identifier",
		"start": 152,
		"end": 153,
		"match": "T"
	},
	{
		"type": "operator",
		"start": 153,
		"end": 154,
		"match": ">"
	},
	{
		"type": "keyword",
		"start": 155,
		"end": 161,
		"match": "struct"
	},
	{
		"type": "identifier",
		"start": 162,
		"end": 167,
		"match": "point"
	},
	{
		"type": "punctuation",
		"start": 168,
		"end": 169,
		"match": "{"
	},
	{
		"type": "identifier",
		"start": 172,
		"end": 173,
		"match": "T"
	},
	{
		"type": "identifier",
		"start": 174,
		"end": 175,
		"match": "x"
	},
	{
		"type": "punctuation",
		"start": 175,
		"end": 176,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 176,
		"end": 177,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 177,
		"end": 178,
		"match": ","
	},
	{
		"type": "identifier",
		"start": 179,
		"end": 180,
		"match": "y"
	},
	{
		"type": "punctuation",
		"start": 180,
		"end": 181,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 181,
		"end": 182,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 182,
		"end": 183,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 186,
		"end": 190,
		"match": "auto"
	},
	{
		"type": "keyword",
		"start": 191,
		"end": 199,
		"match": "operator"
	},
	{
		"type": "operator",
		"start": 199,
		"end": 202,
		"match": "<=>"
	},
	{
		"type": "punctuation",
		"start": 202,
		"end": 203,
		"match": "("
	},
	{
		"type": "keyword",
		"start": 203,
		"end": 208,
		"match": "const"
	},
	{
		"type": "identifier",
		"start": 209,
		"end": 214,
		"match": "point"
	},
	{
		"type": "operator",
		"start": 214,
		"end": 215,
		"match": "&"
	},
	{
		"type": "punctuation",
		"start": 215,
		"end": 216,
		"match": ")"
	},
	{
		"type": "keyword",
		"start": 217,
		"end": 222,
		"match": "const"
	},
	{
		"type": "operator",
		"start": 223,
		"end": 224,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 225,
		"end": 232,
		"match": "default"
	},
	{
		"type": "punctuation",
		"start": 232,
		"end": 233,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 234,
		"end": 235,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 235,
		"end": 236,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 237,
		"end": 242,
		"match": "class"
	},
	{
		"type": "identifier",
		"start": 243,
		"end": 248,
		"match": "shape"
	},
	{
		"type": "punctuation",
		"start": 249,
		"end": 250,
		"match": "{"
	},
	{
		"type": "keyword",
		"start": 251,
		"end": 257,
		"match": "public"
	},
	{
		"type": "punctuation",
		"start": 257,
		"end": 258,
		"match": ":"
	},
	{
		"type": "keyword",
		"start": 261,
		"end": 268,
		"match": "virtual"
	},
	{
		"type": "operator",
		"start": 269,
		"end": 270,
		"match": "~"
	},
	{
		"type": "identifier",
		"start": 270,
		"end": 275,
		"match": "shape"
	},
	{
		"type": "punctuation",
		"start": 275,
		"end": 276,
		"match": "("
	},
	{
		"type": "punctuation",
		"start": 276,
		"end": 277,
		"match": ")"
	},
	{
		"type": "operator",
		"start": 278,
		"end": 279,
		"match": "="
	},
	{
		"type": "keyword",
		"start": 280,
		"end": 287,
		"match": "default"
	},
	{
		"type": "punctuation",
		"start": 287,
		"end": 288,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 291,
		"end": 298,
		"match": "virtual"
	},
	{
		"type": "keyword",
		"start": 299,
		"end": 305,
		"match": "double"
	},
	{
		"type": "identifier",
		"start": 306,
		"end": 310,
		"match": "area"
	},
	{
		"type": "punctuation",
		"start": 310,
		"end": 311,
		"match": "("
	},
	{
		"type": "punctuation",
		"start": 311,
		"end": 312,
		"match": ")"
	},
	{
		"type": "keyword",
		"start": 313,
		"end": 318,
		"match": "const"
	},
	{
		"type": "operator",
		"start": 319,
		"end": 320,
		"match": "="
	},
	{
		"type": "number",
		"start": 321,
		"end": 322,
		"match": "0"
	},
	{
		"type": "punctuation",
		"start": 322,
		"end": 323,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 324,
		"end": 325,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 325,
		"end": 326,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 327,
		"end": 332,
		"match": "class"
	},
	{
		"type": "identifier",
		"start": 333,
		"end": 339,
		"match": "circle"
	},
	{
		"type": "identifier",
		"start": 340,
		"end": 345,
		"match": "final"
	},
	{
		"type": "punctuation",
		"start": 346,
		"end": 347,
		"match": ":"
	},
	{
		"type": "keyword",
		"start": 348,
		"end": 354,
		"match": "public"
	},
	{
		"type": "identifier",
		"start": 355,
		"end": 360,
		"match": "shape"
	},
	{
		"type": "punctuation",
		"start": 361,
		"end": 362,
		"match": "{"
	},
	{
		"type": "keyword",
		"start": 363,
		"end": 369,
		"match": "public"
	},
	{
		"type": "punctuation",
		"start": 369,
		"end": 370,
		"match": ":"
	},
	{
		"type": "keyword",
		"start": 373,
		"end": 379,
		"match": "double"
	},
	{
		"type": "identifier",
		"start": 380,
		"end": 384,
		"match": "area"
	},
	{
		"type": "punctuation",
		"start": 384,
		"end": 385,
		"match": "("
	},
	{
		"type": "punctuation",
		"start": 385,
		"end": 386,
		"match": ")"
	},
	{
		"type": "keyword",
		"start": 387,
		"end": 392,
		"match": "const"
	},
	{
		"type": "identifier",
		"start": 393,
		"end": 401,
		"match": "override"
	},
	{
		"type": "punctuation",
		"start": 402,
		"end": 403,
		"match": "{"
	},
	{
		"type": "keyword",
		"start": 404,
		"end": 410,
		"match": "return"
	},
	{
		"type": "identifier",
		"start": 411,
		"end": 417,
		"match": "radius"
	},
	{
		"type": "operator",
		"start": 418,
		"end": 419,
		"match": "*"
	},
	{
		"type": "identifier",
		"start": 420,
		"end": 426,
		"match": "radius"
	},
	{
		"type": "punctuation",
		"start": 426,
		"end": 427,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 428,
		"end": 429,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 430,
		"end": 437,
		"match": "private"
	},
	{
		"type": "punctuation",
		"start": 437,
		"end": 438,
		"match": ":"
	},
	{
		"type": "keyword",
		"start": 441,
		"end": 447,
		"match": "double"
	},
	{
		"type": "identifier",
		"start": 448,
		"end": 454,
		"match": "radius"
	},
	{
		"type": "operator",
		"start": 455,
		"end": 456,
		"match": "="
	},
	{
		"type": "number",
		"start": 457,
		"end": 459,
		"match": ".5"
	},
	{
		"type": "punctuation",
		"start": 459,
		"end": 460,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 461,
		"end": 462,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 462,
		"end": 463,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 464,
		"end": 465,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 466,
		"end": 469,
		"match": "int"
	},
	{
		"type": "identifier",
		"start": 470,
		"end": 474,
		"match": "main"
	},
	{
		"type": "punctuation",
		"start": 474,
		"end": 475,
		"match": "("
	},
	{
		"type": "punctuation",
		"start": 475,
		"end": 476,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 477,
		"end": 478,
		"match": "{"
	},
	{
		"type": "identifier",
		"start": 481,
		"end": 484,
		"match": "std"
	},
	{
		"type": "punctuation",
		"start": 484,
		"end": 486,
		"match": "::"
	},
	{
		"type": "identifier",
		"start": 486,
		"end": 492,
		"match": "vector"
	},
	{
		"type": "operator",
		"start": 492,
		"end": 493,
		"match": "<"
	},
	{
		"type": "identifier",
		"start": 493,
		"end": 496,
		"match": "std"
	},
	{
		"type": "punctuation",
		"start": 496,
		"end": 498,
		"match": "::"
	},
	{
		"type": "identifier",
		"start": 498,
		"end": 504,
		"match": "vector"
	},
	{
		"type": "operator",
		"start": 504,
		"end": 505,
		"match": "<"
	},
	{
		"type": "keyword",
		"start": 505,
		"end": 508,
		"match": "int"
	},
	{
		"type": "operator",
		"start": 508,
		"end": 510,
		"match": ">>"
	},
	{
		"type": "identifier",
		"start": 511,
		"end": 517,
		"match": "values"
	},
	{
		"type": "punctuation",
		"start": 517,
		"end": 518,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 518,
		"end": 519,
		"match": "{"
	},
	{
		"type": "number",
		"start": 519,
		"end": 520,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 520,
		"end": 521,
		"match": ","
	},
	{
		"type": "number",
		"start": 522,
		"end": 523,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 523,
		"end": 524,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 524,
		"end": 525,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 526,
		"end": 527,
		"match": "{"
	},
	{
		"type": "number",
		"start": 527,
		"end": 528,
		"match": "3"
	},
	{
		"type": "punctuation",
		"start": 528,
		"end": 529,
		"match": ","
	},
	{
		"type": "number",
		"start": 530,
		"end": 531,
		"match": "4"
	},
	{
		"type": "punctuation",
		"start": 531,
		"end": 532,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 532,
		"end": 533,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 533,
		"end": 534,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 537,
		"end": 541,
		"match": "auto"
	},
	{
		"type": "identifier",
		"start": 542,
		"end": 545,
		"match": "sum"
	},
	{
		"type": "operator",
		"start": 546,
		"end": 547,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 548,
		"end": 549,
		"match": "["
	},
	{
		"type": "identifier",
		"start": 549,
		"end": 555,
		"match": "factor"
	},
	{
		"type": "operator",
		"start": 556,
		"end": 557,
		"match": "="
	},
	{
		"type": "number",
		"start": 558,
		"end": 559,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 559,
		"end": 560,
		"match": "]"
	},
	{
		"type": "punctuation",
		"start": 560,
		"end": 561,
		"match": "("
	},
	{
		"type": "keyword",
		"start": 561,
		"end": 565,
		"match": "auto"
	},
	{
		"type": "identifier",
		"start": 566,
		"end": 567,
		"match": "x"
	},
	{
		"type": "punctuation",
		"start": 567,
		"end": 568,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 569,
		"end": 570,
		"match": "{"
	},
	{
		"type": "keyword",
		"start": 571,
		"end": 577,
		"match": "return"
	},
	{
		"type": "identifier",
		"start": 578,
		"end": 579,
		"match": "x"
	},
	{
		"type": "operator",
		"start": 580,
		"end": 581,
		"match": "*"
	},
	{
		"type": "identifier",
		"start": 582,
		"end": 588,
		"match": "factor"
	},
	{
		"type": "punctuation",
		"start": 588,
		"end": 589,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 590,
		"end": 591,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 591,
		"end": 592,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 595,
		"end": 599,
		"match": "bool"
	},
	{
		"type": "identifier",
		"start": 600,
		"end": 605,
		"match": "valid"
	},
	{
		"type": "operator",
		"start": 606,
		"end": 607,
		"match": "="
	},
	{
		"type": "boolean",
		"start": 608,
		"end": 612,
		"match": "true"
	},
	{
		"type": "operator",
		"start": 613,
		"end": 616,
		"match": "and"
	},
	{
		"type": "operator",
		"start": 617,
		"end": 620,
		"match": "not"
	},
	{
		"type": "boolean",
		"start": 621,
		"end": 626,
		"match": "false"
	},
	{
		"type": "punctuation",
		"start": 626,
		"end": 627,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 630,
		"end": 636,
		"match": "return"
	},
	{
		"type": "identifier",
		"start": 637,
		"end": 642,
		"match": "valid"
	},
	{
		"type": "operator",
		"start": 643,
		"end": 644,
		"match": "?"
	},
	{
		"type": "identifier",
		"start": 645,
		"end": 648,
		"match": "sum"
	},
	{
		"type": "punctuation",
		"start": 648,
		"end": 649,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 649,
		"end": 655,
		"match": "values"
	},
	{
		"type": "punctuation",
		"start": 655,
		"end": 656,
		"match": "["
	},
	{
		"type": "number",
		"start": 656,
		"end": 657,
		"match": "0"
	},
	{
		"type": "punctuation",
		"start": 657,
		"end": 658,
		"match": "]"
	},
	{
		"type": "punctuation",
		"start": 658,
		"end": 659,
		"match": "["
	},
	{
		"type": "number",
		"start": 659,
		"end": 660,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 660,
		"end": 661,
		"match": "]"
	},
	{
		"type": "punctuation",
		"start": 661,
		"end": 662,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 663,
		"end": 664,
		"match": ":"
	},
	{
		"type": "number",
		"start": 665,
		"end": 666,
		"match": "0"
	},
	{
		"type": "punctuation",
		"start": 666,
		"end": 667,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 668,
		"end": 669,
		"match": "}"
	}
];
