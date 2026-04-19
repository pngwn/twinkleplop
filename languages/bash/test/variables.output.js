export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 57,
		"match": "#!/bin/bash\n# variable references and special parameters\n"
	},
	{
		"type": "comment",
		"start": 58,
		"end": 72,
		"match": "# simple refs\n"
	},
	{
		"type": "builtin",
		"start": 72,
		"end": 76,
		"match": "echo"
	},
	{
		"type": "variable",
		"start": 77,
		"end": 82,
		"match": "$PATH"
	},
	{
		"type": "builtin",
		"start": 83,
		"end": 87,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 88,
		"end": 90,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 90,
		"end": 94,
		"match": "HOME"
	},
	{
		"type": "punctuation",
		"start": 94,
		"end": 95,
		"match": "}"
	},
	{
		"type": "builtin",
		"start": 96,
		"end": 100,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 101,
		"end": 103,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 103,
		"end": 107,
		"match": "USER"
	},
	{
		"type": "operator",
		"start": 107,
		"end": 109,
		"match": ":-"
	},
	{
		"type": "identifier",
		"start": 109,
		"end": 116,
		"match": "default"
	},
	{
		"type": "punctuation",
		"start": 116,
		"end": 117,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 119,
		"end": 140,
		"match": "# special parameters\n"
	},
	{
		"type": "builtin",
		"start": 140,
		"end": 144,
		"match": "echo"
	},
	{
		"type": "variable",
		"start": 145,
		"end": 147,
		"match": "$@"
	},
	{
		"type": "variable",
		"start": 148,
		"end": 150,
		"match": "$*"
	},
	{
		"type": "builtin",
		"start": 151,
		"end": 155,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 156,
		"end": 157,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 157,
		"end": 159,
		"match": "$#"
	},
	{
		"type": "string",
		"start": 159,
		"end": 160,
		"match": "\""
	},
	{
		"type": "string",
		"start": 161,
		"end": 162,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 162,
		"end": 164,
		"match": "$?"
	},
	{
		"type": "string",
		"start": 164,
		"end": 165,
		"match": "\""
	},
	{
		"type": "builtin",
		"start": 166,
		"end": 170,
		"match": "echo"
	},
	{
		"type": "variable",
		"start": 171,
		"end": 173,
		"match": "$$"
	},
	{
		"type": "variable",
		"start": 174,
		"end": 176,
		"match": "$!"
	},
	{
		"type": "variable",
		"start": 177,
		"end": 179,
		"match": "$_"
	},
	{
		"type": "comment",
		"start": 181,
		"end": 194,
		"match": "# positional\n"
	},
	{
		"type": "builtin",
		"start": 194,
		"end": 198,
		"match": "echo"
	},
	{
		"type": "variable",
		"start": 199,
		"end": 201,
		"match": "$0"
	},
	{
		"type": "variable",
		"start": 202,
		"end": 204,
		"match": "$1"
	},
	{
		"type": "variable",
		"start": 205,
		"end": 207,
		"match": "$2"
	},
	{
		"type": "comment",
		"start": 209,
		"end": 233,
		"match": "# braced with operators\n"
	},
	{
		"type": "builtin",
		"start": 233,
		"end": 237,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 238,
		"end": 240,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 240,
		"end": 243,
		"match": "var"
	},
	{
		"type": "operator",
		"start": 243,
		"end": 245,
		"match": ":-"
	},
	{
		"type": "identifier",
		"start": 245,
		"end": 252,
		"match": "default"
	},
	{
		"type": "punctuation",
		"start": 252,
		"end": 253,
		"match": "}"
	},
	{
		"type": "builtin",
		"start": 254,
		"end": 258,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 259,
		"end": 261,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 261,
		"end": 264,
		"match": "var"
	},
	{
		"type": "operator",
		"start": 264,
		"end": 266,
		"match": ":="
	},
	{
		"type": "identifier",
		"start": 266,
		"end": 272,
		"match": "assign"
	},
	{
		"type": "punctuation",
		"start": 272,
		"end": 273,
		"match": "}"
	},
	{
		"type": "builtin",
		"start": 274,
		"end": 278,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 279,
		"end": 281,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 281,
		"end": 284,
		"match": "var"
	},
	{
		"type": "operator",
		"start": 284,
		"end": 286,
		"match": ":?"
	},
	{
		"type": "identifier",
		"start": 286,
		"end": 294,
		"match": "required"
	},
	{
		"type": "punctuation",
		"start": 294,
		"end": 295,
		"match": "}"
	},
	{
		"type": "builtin",
		"start": 296,
		"end": 300,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 301,
		"end": 303,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 303,
		"end": 306,
		"match": "var"
	},
	{
		"type": "operator",
		"start": 306,
		"end": 308,
		"match": ":+"
	},
	{
		"type": "identifier",
		"start": 308,
		"end": 317,
		"match": "alternate"
	},
	{
		"type": "punctuation",
		"start": 317,
		"end": 318,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 320,
		"end": 332,
		"match": "# substring\n"
	},
	{
		"type": "builtin",
		"start": 332,
		"end": 336,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 337,
		"end": 339,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 339,
		"end": 343,
		"match": "name"
	},
	{
		"type": "operator",
		"start": 343,
		"end": 344,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 344,
		"end": 345,
		"match": "0"
	},
	{
		"type": "operator",
		"start": 345,
		"end": 346,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 346,
		"end": 347,
		"match": "5"
	},
	{
		"type": "punctuation",
		"start": 347,
		"end": 348,
		"match": "}"
	},
	{
		"type": "builtin",
		"start": 349,
		"end": 353,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 354,
		"end": 356,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 356,
		"end": 360,
		"match": "name"
	},
	{
		"type": "operator",
		"start": 360,
		"end": 362,
		"match": ":-"
	},
	{
		"type": "identifier",
		"start": 362,
		"end": 363,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 363,
		"end": 364,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 366,
		"end": 380,
		"match": "# pattern ops\n"
	},
	{
		"type": "builtin",
		"start": 380,
		"end": 384,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 385,
		"end": 387,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 387,
		"end": 391,
		"match": "file"
	},
	{
		"type": "operator",
		"start": 391,
		"end": 392,
		"match": "%"
	},
	{
		"type": "identifier",
		"start": 392,
		"end": 396,
		"match": ".txt"
	},
	{
		"type": "punctuation",
		"start": 396,
		"end": 397,
		"match": "}"
	},
	{
		"type": "builtin",
		"start": 398,
		"end": 402,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 403,
		"end": 405,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 405,
		"end": 409,
		"match": "file"
	},
	{
		"type": "operator",
		"start": 409,
		"end": 411,
		"match": "##"
	},
	{
		"type": "punctuation",
		"start": 411,
		"end": 412,
		"match": "*"
	},
	{
		"type": "operator",
		"start": 412,
		"end": 413,
		"match": "/"
	},
	{
		"type": "punctuation",
		"start": 413,
		"end": 414,
		"match": "}"
	},
	{
		"type": "builtin",
		"start": 415,
		"end": 419,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 420,
		"end": 422,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 422,
		"end": 426,
		"match": "path"
	},
	{
		"type": "operator",
		"start": 426,
		"end": 430,
		"match": "//:/"
	},
	{
		"type": "identifier",
		"start": 430,
		"end": 431,
		"match": ";"
	},
	{
		"type": "punctuation",
		"start": 431,
		"end": 432,
		"match": "}"
	},
	{
		"type": "builtin",
		"start": 433,
		"end": 437,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 438,
		"end": 440,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 440,
		"end": 444,
		"match": "path"
	},
	{
		"type": "operator",
		"start": 444,
		"end": 446,
		"match": "/#"
	},
	{
		"type": "identifier",
		"start": 446,
		"end": 452,
		"match": "prefix"
	},
	{
		"type": "operator",
		"start": 452,
		"end": 453,
		"match": "/"
	},
	{
		"type": "identifier",
		"start": 453,
		"end": 456,
		"match": "new"
	},
	{
		"type": "punctuation",
		"start": 456,
		"end": 457,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 459,
		"end": 476,
		"match": "# case transform\n"
	},
	{
		"type": "builtin",
		"start": 476,
		"end": 480,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 481,
		"end": 483,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 483,
		"end": 486,
		"match": "str"
	},
	{
		"type": "operator",
		"start": 486,
		"end": 488,
		"match": "^^"
	},
	{
		"type": "punctuation",
		"start": 488,
		"end": 489,
		"match": "}"
	},
	{
		"type": "builtin",
		"start": 490,
		"end": 494,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 495,
		"end": 497,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 497,
		"end": 500,
		"match": "str"
	},
	{
		"type": "operator",
		"start": 500,
		"end": 502,
		"match": ",,"
	},
	{
		"type": "punctuation",
		"start": 502,
		"end": 503,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 505,
		"end": 523,
		"match": "# transformations\n"
	},
	{
		"type": "builtin",
		"start": 523,
		"end": 527,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 528,
		"end": 530,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 530,
		"end": 533,
		"match": "var"
	},
	{
		"type": "operator",
		"start": 533,
		"end": 535,
		"match": "@U"
	},
	{
		"type": "punctuation",
		"start": 535,
		"end": 536,
		"match": "}"
	},
	{
		"type": "builtin",
		"start": 537,
		"end": 541,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 542,
		"end": 544,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 544,
		"end": 547,
		"match": "var"
	},
	{
		"type": "operator",
		"start": 547,
		"end": 549,
		"match": "@Q"
	},
	{
		"type": "punctuation",
		"start": 549,
		"end": 550,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 552,
		"end": 563,
		"match": "# indirect\n"
	},
	{
		"type": "builtin",
		"start": 563,
		"end": 567,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 568,
		"end": 570,
		"match": "${"
	},
	{
		"type": "operator",
		"start": 570,
		"end": 571,
		"match": "!"
	},
	{
		"type": "identifier",
		"start": 571,
		"end": 578,
		"match": "varname"
	},
	{
		"type": "punctuation",
		"start": 578,
		"end": 579,
		"match": "}"
	}
];
