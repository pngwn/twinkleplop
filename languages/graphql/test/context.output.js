export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 5,
		"match": "query"
	},
	{
		"type": "function",
		"start": 6,
		"end": 11,
		"match": "query"
	},
	{
		"type": "punctuation",
		"start": 11,
		"end": 12,
		"match": "("
	},
	{
		"type": "parameter",
		"start": 12,
		"end": 18,
		"match": "$query"
	},
	{
		"type": "punctuation",
		"start": 18,
		"end": 19,
		"match": ":"
	},
	{
		"type": "type",
		"start": 20,
		"end": 24,
		"match": "type"
	},
	{
		"type": "punctuation",
		"start": 24,
		"end": 25,
		"match": ","
	},
	{
		"type": "parameter",
		"start": 26,
		"end": 31,
		"match": "$type"
	},
	{
		"type": "punctuation",
		"start": 31,
		"end": 32,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 33,
		"end": 35,
		"match": "[["
	},
	{
		"type": "type",
		"start": 35,
		"end": 40,
		"match": "lower"
	},
	{
		"type": "operator",
		"start": 40,
		"end": 41,
		"match": "!"
	},
	{
		"type": "punctuation",
		"start": 41,
		"end": 42,
		"match": "]"
	},
	{
		"type": "operator",
		"start": 42,
		"end": 43,
		"match": "!"
	},
	{
		"type": "punctuation",
		"start": 43,
		"end": 44,
		"match": "]"
	},
	{
		"type": "operator",
		"start": 44,
		"end": 45,
		"match": "!"
	},
	{
		"type": "operator",
		"start": 46,
		"end": 47,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 48,
		"end": 50,
		"match": "[["
	},
	{
		"type": "constant",
		"start": 50,
		"end": 55,
		"match": "query"
	},
	{
		"type": "punctuation",
		"start": 55,
		"end": 58,
		"match": "]])"
	},
	{
		"type": "decorator",
		"start": 59,
		"end": 64,
		"match": "@type"
	},
	{
		"type": "punctuation",
		"start": 65,
		"end": 66,
		"match": "{"
	},
	{
		"type": "property",
		"start": 69,
		"end": 74,
		"match": "query"
	},
	{
		"type": "punctuation",
		"start": 74,
		"end": 75,
		"match": ":"
	},
	{
		"type": "property",
		"start": 76,
		"end": 84,
		"match": "mutation"
	},
	{
		"type": "punctuation",
		"start": 84,
		"end": 85,
		"match": "("
	},
	{
		"type": "property",
		"start": 85,
		"end": 89,
		"match": "type"
	},
	{
		"type": "punctuation",
		"start": 89,
		"end": 90,
		"match": ":"
	},
	{
		"type": "constant",
		"start": 91,
		"end": 95,
		"match": "enum"
	},
	{
		"type": "punctuation",
		"start": 95,
		"end": 96,
		"match": ","
	},
	{
		"type": "property",
		"start": 97,
		"end": 102,
		"match": "input"
	},
	{
		"type": "punctuation",
		"start": 102,
		"end": 103,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 104,
		"end": 105,
		"match": "{"
	},
	{
		"type": "property",
		"start": 105,
		"end": 109,
		"match": "true"
	},
	{
		"type": "punctuation",
		"start": 109,
		"end": 110,
		"match": ":"
	},
	{
		"type": "boolean",
		"start": 111,
		"end": 116,
		"match": "false"
	},
	{
		"type": "punctuation",
		"start": 116,
		"end": 117,
		"match": ","
	},
	{
		"type": "property",
		"start": 118,
		"end": 122,
		"match": "null"
	},
	{
		"type": "punctuation",
		"start": 122,
		"end": 123,
		"match": ":"
	},
	{
		"type": "null",
		"start": 124,
		"end": 128,
		"match": "null"
	},
	{
		"type": "punctuation",
		"start": 128,
		"end": 129,
		"match": ","
	},
	{
		"type": "property",
		"start": 130,
		"end": 135,
		"match": "query"
	},
	{
		"type": "punctuation",
		"start": 135,
		"end": 136,
		"match": ":"
	},
	{
		"type": "constant",
		"start": 137,
		"end": 141,
		"match": "type"
	},
	{
		"type": "punctuation",
		"start": 141,
		"end": 143,
		"match": "})"
	},
	{
		"type": "punctuation",
		"start": 144,
		"end": 145,
		"match": "{"
	},
	{
		"type": "property",
		"start": 150,
		"end": 154,
		"match": "type"
	},
	{
		"type": "property",
		"start": 155,
		"end": 164,
		"match": "interface"
	},
	{
		"type": "property",
		"start": 165,
		"end": 175,
		"match": "implements"
	},
	{
		"type": "property",
		"start": 176,
		"end": 181,
		"match": "union"
	},
	{
		"type": "property",
		"start": 182,
		"end": 186,
		"match": "enum"
	},
	{
		"type": "property",
		"start": 187,
		"end": 192,
		"match": "input"
	},
	{
		"type": "property",
		"start": 193,
		"end": 199,
		"match": "extend"
	},
	{
		"type": "property",
		"start": 200,
		"end": 209,
		"match": "directive"
	},
	{
		"type": "property",
		"start": 210,
		"end": 220,
		"match": "repeatable"
	},
	{
		"type": "property",
		"start": 221,
		"end": 223,
		"match": "on"
	},
	{
		"type": "property",
		"start": 228,
		"end": 232,
		"match": "true"
	},
	{
		"type": "property",
		"start": 233,
		"end": 238,
		"match": "false"
	},
	{
		"type": "property",
		"start": 239,
		"end": 243,
		"match": "null"
	},
	{
		"type": "property",
		"start": 244,
		"end": 253,
		"match": "queryName"
	},
	{
		"type": "property",
		"start": 254,
		"end": 262,
		"match": "typeName"
	},
	{
		"type": "property",
		"start": 263,
		"end": 272,
		"match": "trueValue"
	},
	{
		"type": "operator",
		"start": 277,
		"end": 280,
		"match": "..."
	},
	{
		"type": "identifier",
		"start": 280,
		"end": 285,
		"match": "query"
	},
	{
		"type": "operator",
		"start": 290,
		"end": 293,
		"match": "..."
	},
	{
		"type": "keyword",
		"start": 293,
		"end": 295,
		"match": "on"
	},
	{
		"type": "type",
		"start": 296,
		"end": 300,
		"match": "type"
	},
	{
		"type": "punctuation",
		"start": 301,
		"end": 302,
		"match": "{"
	},
	{
		"type": "property",
		"start": 303,
		"end": 305,
		"match": "on"
	},
	{
		"type": "punctuation",
		"start": 306,
		"end": 307,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 310,
		"end": 311,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 312,
		"end": 313,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 314,
		"end": 322,
		"match": "fragment"
	},
	{
		"type": "identifier",
		"start": 323,
		"end": 328,
		"match": "query"
	},
	{
		"type": "keyword",
		"start": 329,
		"end": 331,
		"match": "on"
	},
	{
		"type": "type",
		"start": 332,
		"end": 336,
		"match": "type"
	},
	{
		"type": "punctuation",
		"start": 337,
		"end": 338,
		"match": "{"
	},
	{
		"type": "property",
		"start": 339,
		"end": 343,
		"match": "type"
	},
	{
		"type": "punctuation",
		"start": 344,
		"end": 345,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 346,
		"end": 350,
		"match": "type"
	},
	{
		"type": "type",
		"start": 351,
		"end": 355,
		"match": "type"
	},
	{
		"type": "punctuation",
		"start": 356,
		"end": 357,
		"match": "{"
	},
	{
		"type": "property",
		"start": 358,
		"end": 363,
		"match": "query"
	},
	{
		"type": "punctuation",
		"start": 363,
		"end": 364,
		"match": ":"
	},
	{
		"type": "type",
		"start": 365,
		"end": 370,
		"match": "lower"
	},
	{
		"type": "property",
		"start": 371,
		"end": 375,
		"match": "true"
	},
	{
		"type": "punctuation",
		"start": 375,
		"end": 376,
		"match": ":"
	},
	{
		"type": "type",
		"start": 377,
		"end": 384,
		"match": "Boolean"
	},
	{
		"type": "property",
		"start": 385,
		"end": 389,
		"match": "null"
	},
	{
		"type": "punctuation",
		"start": 389,
		"end": 390,
		"match": ":"
	},
	{
		"type": "type",
		"start": 391,
		"end": 397,
		"match": "String"
	},
	{
		"type": "punctuation",
		"start": 398,
		"end": 399,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 400,
		"end": 406,
		"match": "scalar"
	},
	{
		"type": "type",
		"start": 407,
		"end": 412,
		"match": "lower"
	},
	{
		"type": "keyword",
		"start": 413,
		"end": 417,
		"match": "enum"
	},
	{
		"type": "type",
		"start": 418,
		"end": 423,
		"match": "query"
	},
	{
		"type": "punctuation",
		"start": 424,
		"end": 425,
		"match": "{"
	},
	{
		"type": "constant",
		"start": 426,
		"end": 431,
		"match": "query"
	},
	{
		"type": "constant",
		"start": 432,
		"end": 440,
		"match": "mutation"
	},
	{
		"type": "constant",
		"start": 441,
		"end": 453,
		"match": "subscription"
	},
	{
		"type": "constant",
		"start": 454,
		"end": 458,
		"match": "type"
	},
	{
		"type": "constant",
		"start": 459,
		"end": 461,
		"match": "on"
	},
	{
		"type": "punctuation",
		"start": 462,
		"end": 463,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 464,
		"end": 473,
		"match": "directive"
	},
	{
		"type": "decorator",
		"start": 474,
		"end": 479,
		"match": "@type"
	},
	{
		"type": "punctuation",
		"start": 479,
		"end": 480,
		"match": "("
	},
	{
		"type": "property",
		"start": 480,
		"end": 484,
		"match": "type"
	},
	{
		"type": "punctuation",
		"start": 484,
		"end": 485,
		"match": ":"
	},
	{
		"type": "type",
		"start": 486,
		"end": 490,
		"match": "type"
	},
	{
		"type": "operator",
		"start": 491,
		"end": 492,
		"match": "="
	},
	{
		"type": "constant",
		"start": 493,
		"end": 498,
		"match": "query"
	},
	{
		"type": "punctuation",
		"start": 498,
		"end": 499,
		"match": ")"
	},
	{
		"type": "keyword",
		"start": 500,
		"end": 502,
		"match": "on"
	},
	{
		"type": "constant",
		"start": 503,
		"end": 519,
		"match": "FIELD_DEFINITION"
	},
	{
		"type": "keyword",
		"start": 520,
		"end": 525,
		"match": "query"
	},
	{
		"type": "function",
		"start": 526,
		"end": 532,
		"match": "Sigils"
	},
	{
		"type": "punctuation",
		"start": 532,
		"end": 533,
		"match": "("
	},
	{
		"type": "parameter",
		"start": 533,
		"end": 534,
		"match": "$"
	},
	{
		"type": "comment",
		"start": 535,
		"end": 576,
		"match": "# variable name can follow ignored tokens"
	},
	{
		"type": "parameter",
		"start": 579,
		"end": 584,
		"match": "query"
	},
	{
		"type": "punctuation",
		"start": 584,
		"end": 585,
		"match": ":"
	},
	{
		"type": "type",
		"start": 586,
		"end": 588,
		"match": "ID"
	},
	{
		"type": "punctuation",
		"start": 588,
		"end": 589,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 590,
		"end": 591,
		"match": "{"
	},
	{
		"type": "property",
		"start": 592,
		"end": 597,
		"match": "field"
	},
	{
		"type": "punctuation",
		"start": 597,
		"end": 598,
		"match": "("
	},
	{
		"type": "property",
		"start": 598,
		"end": 603,
		"match": "value"
	},
	{
		"type": "punctuation",
		"start": 603,
		"end": 604,
		"match": ":"
	},
	{
		"type": "variable",
		"start": 605,
		"end": 606,
		"match": "$"
	},
	{
		"type": "punctuation",
		"start": 607,
		"end": 608,
		"match": ","
	},
	{
		"type": "variable",
		"start": 609,
		"end": 614,
		"match": "query"
	},
	{
		"type": "punctuation",
		"start": 614,
		"end": 615,
		"match": ")"
	},
	{
		"type": "decorator",
		"start": 616,
		"end": 617,
		"match": "@"
	},
	{
		"type": "comment",
		"start": 618,
		"end": 638,
		"match": "# directive name too"
	},
	{
		"type": "decorator",
		"start": 641,
		"end": 645,
		"match": "type"
	},
	{
		"type": "punctuation",
		"start": 646,
		"end": 647,
		"match": "}"
	}
];
