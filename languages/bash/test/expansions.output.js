export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 71,
		"match": "#!/bin/bash\n# expansion forms: command, process, arithmetic, parameter\n"
	},
	{
		"type": "comment",
		"start": 72,
		"end": 95,
		"match": "# command substitution\n"
	},
	{
		"type": "identifier",
		"start": 95,
		"end": 96,
		"match": "a"
	},
	{
		"type": "operator",
		"start": 96,
		"end": 97,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 97,
		"end": 99,
		"match": "$("
	},
	{
		"type": "identifier",
		"start": 99,
		"end": 103,
		"match": "date"
	},
	{
		"type": "punctuation",
		"start": 103,
		"end": 104,
		"match": ")"
	},
	{
		"type": "identifier",
		"start": 105,
		"end": 106,
		"match": "b"
	},
	{
		"type": "operator",
		"start": 106,
		"end": 107,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 107,
		"end": 109,
		"match": "$("
	},
	{
		"type": "identifier",
		"start": 109,
		"end": 111,
		"match": "ls"
	},
	{
		"type": "operator",
		"start": 112,
		"end": 113,
		"match": "-"
	},
	{
		"type": "identifier",
		"start": 113,
		"end": 115,
		"match": "la"
	},
	{
		"type": "punctuation",
		"start": 116,
		"end": 117,
		"match": "|"
	},
	{
		"type": "identifier",
		"start": 118,
		"end": 122,
		"match": "head"
	},
	{
		"type": "punctuation",
		"start": 122,
		"end": 123,
		"match": ")"
	},
	{
		"type": "identifier",
		"start": 124,
		"end": 125,
		"match": "c"
	},
	{
		"type": "operator",
		"start": 125,
		"end": 126,
		"match": "="
	},
	{
		"type": "string",
		"start": 126,
		"end": 134,
		"match": "`whoami`"
	},
	{
		"type": "comment",
		"start": 136,
		"end": 166,
		"match": "# nested command substitution\n"
	},
	{
		"type": "identifier",
		"start": 166,
		"end": 167,
		"match": "d"
	},
	{
		"type": "operator",
		"start": 167,
		"end": 168,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 168,
		"end": 170,
		"match": "$("
	},
	{
		"type": "builtin",
		"start": 170,
		"end": 174,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 175,
		"end": 177,
		"match": "$("
	},
	{
		"type": "identifier",
		"start": 177,
		"end": 185,
		"match": "hostname"
	},
	{
		"type": "punctuation",
		"start": 185,
		"end": 187,
		"match": "))"
	},
	{
		"type": "identifier",
		"start": 188,
		"end": 189,
		"match": "e"
	},
	{
		"type": "operator",
		"start": 189,
		"end": 190,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 190,
		"end": 192,
		"match": "$("
	},
	{
		"type": "identifier",
		"start": 192,
		"end": 196,
		"match": "cmd1"
	},
	{
		"type": "punctuation",
		"start": 197,
		"end": 198,
		"match": "|"
	},
	{
		"type": "identifier",
		"start": 199,
		"end": 203,
		"match": "cmd2"
	},
	{
		"type": "punctuation",
		"start": 203,
		"end": 204,
		"match": ";"
	},
	{
		"type": "identifier",
		"start": 205,
		"end": 209,
		"match": "cmd3"
	},
	{
		"type": "punctuation",
		"start": 209,
		"end": 210,
		"match": ")"
	},
	{
		"type": "comment",
		"start": 212,
		"end": 235,
		"match": "# process substitution\n"
	},
	{
		"type": "identifier",
		"start": 235,
		"end": 239,
		"match": "diff"
	},
	{
		"type": "punctuation",
		"start": 240,
		"end": 242,
		"match": "<("
	},
	{
		"type": "identifier",
		"start": 242,
		"end": 246,
		"match": "sort"
	},
	{
		"type": "identifier",
		"start": 247,
		"end": 252,
		"match": "file1"
	},
	{
		"type": "punctuation",
		"start": 252,
		"end": 253,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 254,
		"end": 256,
		"match": "<("
	},
	{
		"type": "identifier",
		"start": 256,
		"end": 260,
		"match": "sort"
	},
	{
		"type": "identifier",
		"start": 261,
		"end": 266,
		"match": "file2"
	},
	{
		"type": "punctuation",
		"start": 266,
		"end": 267,
		"match": ")"
	},
	{
		"type": "identifier",
		"start": 268,
		"end": 271,
		"match": "tee"
	},
	{
		"type": "punctuation",
		"start": 272,
		"end": 274,
		"match": ">("
	},
	{
		"type": "identifier",
		"start": 274,
		"end": 278,
		"match": "grep"
	},
	{
		"type": "identifier",
		"start": 279,
		"end": 282,
		"match": "foo"
	},
	{
		"type": "punctuation",
		"start": 282,
		"end": 283,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 284,
		"end": 286,
		"match": ">("
	},
	{
		"type": "identifier",
		"start": 286,
		"end": 290,
		"match": "grep"
	},
	{
		"type": "identifier",
		"start": 291,
		"end": 294,
		"match": "bar"
	},
	{
		"type": "punctuation",
		"start": 294,
		"end": 295,
		"match": ")"
	},
	{
		"type": "operator",
		"start": 296,
		"end": 297,
		"match": "<"
	},
	{
		"type": "identifier",
		"start": 298,
		"end": 303,
		"match": "input"
	},
	{
		"type": "comment",
		"start": 305,
		"end": 318,
		"match": "# arithmetic\n"
	},
	{
		"type": "identifier",
		"start": 318,
		"end": 319,
		"match": "n"
	},
	{
		"type": "operator",
		"start": 319,
		"end": 320,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 320,
		"end": 323,
		"match": "$(("
	},
	{
		"type": "number",
		"start": 323,
		"end": 324,
		"match": "5"
	},
	{
		"type": "operator",
		"start": 325,
		"end": 326,
		"match": "*"
	},
	{
		"type": "number",
		"start": 327,
		"end": 328,
		"match": "5"
	},
	{
		"type": "punctuation",
		"start": 328,
		"end": 330,
		"match": "))"
	},
	{
		"type": "comment",
		"start": 332,
		"end": 354,
		"match": "# parameter expansion\n"
	},
	{
		"type": "identifier",
		"start": 354,
		"end": 355,
		"match": "e"
	},
	{
		"type": "operator",
		"start": 355,
		"end": 356,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 356,
		"end": 358,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 358,
		"end": 359,
		"match": "x"
	},
	{
		"type": "operator",
		"start": 359,
		"end": 361,
		"match": ":-"
	},
	{
		"type": "identifier",
		"start": 361,
		"end": 368,
		"match": "default"
	},
	{
		"type": "punctuation",
		"start": 368,
		"end": 369,
		"match": "}"
	},
	{
		"type": "identifier",
		"start": 370,
		"end": 371,
		"match": "f"
	},
	{
		"type": "operator",
		"start": 371,
		"end": 372,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 372,
		"end": 374,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 374,
		"end": 375,
		"match": "x"
	},
	{
		"type": "operator",
		"start": 375,
		"end": 376,
		"match": "/"
	},
	{
		"type": "identifier",
		"start": 376,
		"end": 379,
		"match": "pat"
	},
	{
		"type": "operator",
		"start": 379,
		"end": 380,
		"match": "/"
	},
	{
		"type": "identifier",
		"start": 380,
		"end": 383,
		"match": "new"
	},
	{
		"type": "punctuation",
		"start": 383,
		"end": 384,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 386,
		"end": 404,
		"match": "# brace expansion\n"
	},
	{
		"type": "builtin",
		"start": 404,
		"end": 408,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 409,
		"end": 410,
		"match": "{"
	},
	{
		"type": "identifier",
		"start": 410,
		"end": 411,
		"match": "a"
	},
	{
		"type": "punctuation",
		"start": 411,
		"end": 412,
		"match": ","
	},
	{
		"type": "identifier",
		"start": 412,
		"end": 413,
		"match": "b"
	},
	{
		"type": "punctuation",
		"start": 413,
		"end": 414,
		"match": ","
	},
	{
		"type": "identifier",
		"start": 414,
		"end": 415,
		"match": "c"
	},
	{
		"type": "punctuation",
		"start": 415,
		"end": 416,
		"match": "}"
	},
	{
		"type": "builtin",
		"start": 417,
		"end": 421,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 422,
		"end": 423,
		"match": "{"
	},
	{
		"type": "identifier",
		"start": 423,
		"end": 424,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 424,
		"end": 426,
		"match": ".."
	},
	{
		"type": "identifier",
		"start": 426,
		"end": 428,
		"match": "10"
	},
	{
		"type": "punctuation",
		"start": 428,
		"end": 429,
		"match": "}"
	},
	{
		"type": "builtin",
		"start": 430,
		"end": 434,
		"match": "echo"
	},
	{
		"type": "punctuation",
		"start": 435,
		"end": 436,
		"match": "{"
	},
	{
		"type": "identifier",
		"start": 436,
		"end": 438,
		"match": "01"
	},
	{
		"type": "punctuation",
		"start": 438,
		"end": 440,
		"match": ".."
	},
	{
		"type": "identifier",
		"start": 440,
		"end": 442,
		"match": "20"
	},
	{
		"type": "punctuation",
		"start": 442,
		"end": 444,
		"match": ".."
	},
	{
		"type": "identifier",
		"start": 444,
		"end": 445,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 445,
		"end": 446,
		"match": "}"
	},
	{
		"type": "builtin",
		"start": 447,
		"end": 451,
		"match": "echo"
	},
	{
		"type": "identifier",
		"start": 452,
		"end": 456,
		"match": "file"
	},
	{
		"type": "punctuation",
		"start": 456,
		"end": 457,
		"match": "{"
	},
	{
		"type": "identifier",
		"start": 457,
		"end": 458,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 458,
		"end": 459,
		"match": ","
	},
	{
		"type": "identifier",
		"start": 459,
		"end": 460,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 460,
		"end": 461,
		"match": ","
	},
	{
		"type": "identifier",
		"start": 461,
		"end": 462,
		"match": "3"
	},
	{
		"type": "punctuation",
		"start": 462,
		"end": 464,
		"match": "}."
	},
	{
		"type": "identifier",
		"start": 464,
		"end": 467,
		"match": "txt"
	},
	{
		"type": "comment",
		"start": 469,
		"end": 477,
		"match": "# tilde\n"
	},
	{
		"type": "builtin",
		"start": 477,
		"end": 479,
		"match": "cd"
	},
	{
		"type": "punctuation",
		"start": 480,
		"end": 481,
		"match": "~"
	},
	{
		"type": "builtin",
		"start": 482,
		"end": 484,
		"match": "cd"
	},
	{
		"type": "punctuation",
		"start": 485,
		"end": 486,
		"match": "~"
	},
	{
		"type": "identifier",
		"start": 486,
		"end": 490,
		"match": "user"
	},
	{
		"type": "builtin",
		"start": 491,
		"end": 493,
		"match": "cd"
	},
	{
		"type": "punctuation",
		"start": 494,
		"end": 495,
		"match": "~"
	},
	{
		"type": "builtin",
		"start": 497,
		"end": 499,
		"match": "cd"
	},
	{
		"type": "punctuation",
		"start": 500,
		"end": 501,
		"match": "~"
	},
	{
		"type": "operator",
		"start": 501,
		"end": 502,
		"match": "-"
	}
];
