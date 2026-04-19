export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 65,
		"match": "#!/usr/bin/env bash\n# real-world example combining many features\n"
	},
	{
		"type": "builtin",
		"start": 66,
		"end": 69,
		"match": "set"
	},
	{
		"type": "operator",
		"start": 70,
		"end": 71,
		"match": "-"
	},
	{
		"type": "identifier",
		"start": 71,
		"end": 74,
		"match": "euo"
	},
	{
		"type": "identifier",
		"start": 75,
		"end": 83,
		"match": "pipefail"
	},
	{
		"type": "builtin",
		"start": 85,
		"end": 93,
		"match": "readonly"
	},
	{
		"type": "identifier",
		"start": 94,
		"end": 101,
		"match": "LOGFILE"
	},
	{
		"type": "operator",
		"start": 101,
		"end": 102,
		"match": "="
	},
	{
		"type": "string",
		"start": 102,
		"end": 103,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 103,
		"end": 105,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 105,
		"end": 112,
		"match": "LOGFILE"
	},
	{
		"type": "operator",
		"start": 112,
		"end": 115,
		"match": ":-/"
	},
	{
		"type": "identifier",
		"start": 115,
		"end": 118,
		"match": "tmp"
	},
	{
		"type": "operator",
		"start": 118,
		"end": 119,
		"match": "/"
	},
	{
		"type": "identifier",
		"start": 119,
		"end": 126,
		"match": "app.log"
	},
	{
		"type": "punctuation",
		"start": 126,
		"end": 127,
		"match": "}"
	},
	{
		"type": "string",
		"start": 127,
		"end": 128,
		"match": "\""
	},
	{
		"type": "builtin",
		"start": 129,
		"end": 137,
		"match": "readonly"
	},
	{
		"type": "identifier",
		"start": 138,
		"end": 143,
		"match": "COUNT"
	},
	{
		"type": "operator",
		"start": 143,
		"end": 144,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 144,
		"end": 146,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 146,
		"end": 147,
		"match": "1"
	},
	{
		"type": "operator",
		"start": 147,
		"end": 149,
		"match": ":-"
	},
	{
		"type": "identifier",
		"start": 149,
		"end": 151,
		"match": "10"
	},
	{
		"type": "punctuation",
		"start": 151,
		"end": 152,
		"match": "}"
	},
	{
		"type": "identifier",
		"start": 154,
		"end": 163,
		"match": "log_error"
	},
	{
		"type": "punctuation",
		"start": 163,
		"end": 165,
		"match": "()"
	},
	{
		"type": "punctuation",
		"start": 166,
		"end": 167,
		"match": "{"
	},
	{
		"type": "builtin",
		"start": 172,
		"end": 177,
		"match": "local"
	},
	{
		"type": "identifier",
		"start": 178,
		"end": 181,
		"match": "msg"
	},
	{
		"type": "operator",
		"start": 181,
		"end": 182,
		"match": "="
	},
	{
		"type": "string",
		"start": 182,
		"end": 183,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 183,
		"end": 185,
		"match": "$1"
	},
	{
		"type": "string",
		"start": 185,
		"end": 186,
		"match": "\""
	},
	{
		"type": "builtin",
		"start": 191,
		"end": 197,
		"match": "printf"
	},
	{
		"type": "string",
		"start": 198,
		"end": 214,
		"match": "'%s ERROR: %s\\n'"
	},
	{
		"type": "string",
		"start": 215,
		"end": 216,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 216,
		"end": 218,
		"match": "$("
	},
	{
		"type": "identifier",
		"start": 218,
		"end": 222,
		"match": "date"
	},
	{
		"type": "identifier",
		"start": 225,
		"end": 226,
		"match": "Y"
	},
	{
		"type": "operator",
		"start": 226,
		"end": 227,
		"match": "-"
	},
	{
		"type": "identifier",
		"start": 228,
		"end": 229,
		"match": "m"
	},
	{
		"type": "operator",
		"start": 229,
		"end": 230,
		"match": "-"
	},
	{
		"type": "identifier",
		"start": 231,
		"end": 233,
		"match": "dT"
	},
	{
		"type": "identifier",
		"start": 234,
		"end": 235,
		"match": "H"
	},
	{
		"type": "builtin",
		"start": 235,
		"end": 236,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 237,
		"end": 238,
		"match": "M"
	},
	{
		"type": "builtin",
		"start": 238,
		"end": 239,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 240,
		"end": 241,
		"match": "S"
	},
	{
		"type": "punctuation",
		"start": 241,
		"end": 242,
		"match": ")"
	},
	{
		"type": "string",
		"start": 242,
		"end": 243,
		"match": "\""
	},
	{
		"type": "string",
		"start": 244,
		"end": 245,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 245,
		"end": 249,
		"match": "$msg"
	},
	{
		"type": "string",
		"start": 249,
		"end": 250,
		"match": "\""
	},
	{
		"type": "operator",
		"start": 251,
		"end": 253,
		"match": ">&"
	},
	{
		"type": "identifier",
		"start": 253,
		"end": 254,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 255,
		"end": 256,
		"match": "}"
	},
	{
		"type": "identifier",
		"start": 258,
		"end": 270,
		"match": "process_file"
	},
	{
		"type": "punctuation",
		"start": 270,
		"end": 272,
		"match": "()"
	},
	{
		"type": "punctuation",
		"start": 273,
		"end": 274,
		"match": "{"
	},
	{
		"type": "builtin",
		"start": 279,
		"end": 284,
		"match": "local"
	},
	{
		"type": "identifier",
		"start": 285,
		"end": 289,
		"match": "file"
	},
	{
		"type": "operator",
		"start": 289,
		"end": 290,
		"match": "="
	},
	{
		"type": "string",
		"start": 290,
		"end": 291,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 291,
		"end": 293,
		"match": "$1"
	},
	{
		"type": "string",
		"start": 293,
		"end": 294,
		"match": "\""
	},
	{
		"type": "keyword",
		"start": 299,
		"end": 301,
		"match": "if"
	},
	{
		"type": "keyword",
		"start": 302,
		"end": 304,
		"match": "[["
	},
	{
		"type": "operator",
		"start": 305,
		"end": 306,
		"match": "!"
	},
	{
		"type": "operator",
		"start": 307,
		"end": 309,
		"match": "-r"
	},
	{
		"type": "string",
		"start": 310,
		"end": 311,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 311,
		"end": 316,
		"match": "$file"
	},
	{
		"type": "string",
		"start": 316,
		"end": 317,
		"match": "\""
	},
	{
		"type": "keyword",
		"start": 318,
		"end": 320,
		"match": "]]"
	},
	{
		"type": "punctuation",
		"start": 320,
		"end": 321,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 322,
		"end": 326,
		"match": "then"
	},
	{
		"type": "identifier",
		"start": 335,
		"end": 344,
		"match": "log_error"
	},
	{
		"type": "string",
		"start": 345,
		"end": 359,
		"match": "\"cannot read: "
	},
	{
		"type": "variable",
		"start": 359,
		"end": 364,
		"match": "$file"
	},
	{
		"type": "string",
		"start": 364,
		"end": 365,
		"match": "\""
	},
	{
		"type": "builtin",
		"start": 374,
		"end": 380,
		"match": "return"
	},
	{
		"type": "identifier",
		"start": 381,
		"end": 382,
		"match": "1"
	},
	{
		"type": "keyword",
		"start": 387,
		"end": 389,
		"match": "fi"
	},
	{
		"type": "keyword",
		"start": 394,
		"end": 399,
		"match": "while"
	},
	{
		"type": "identifier",
		"start": 400,
		"end": 403,
		"match": "IFS"
	},
	{
		"type": "operator",
		"start": 403,
		"end": 404,
		"match": "="
	},
	{
		"type": "builtin",
		"start": 405,
		"end": 409,
		"match": "read"
	},
	{
		"type": "operator",
		"start": 410,
		"end": 411,
		"match": "-"
	},
	{
		"type": "identifier",
		"start": 411,
		"end": 412,
		"match": "r"
	},
	{
		"type": "identifier",
		"start": 413,
		"end": 417,
		"match": "line"
	},
	{
		"type": "punctuation",
		"start": 417,
		"end": 418,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 419,
		"end": 421,
		"match": "do"
	},
	{
		"type": "keyword",
		"start": 430,
		"end": 432,
		"match": "if"
	},
	{
		"type": "keyword",
		"start": 433,
		"end": 435,
		"match": "[["
	},
	{
		"type": "string",
		"start": 436,
		"end": 437,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 437,
		"end": 442,
		"match": "$line"
	},
	{
		"type": "string",
		"start": 442,
		"end": 443,
		"match": "\""
	},
	{
		"type": "operator",
		"start": 444,
		"end": 446,
		"match": "=~"
	},
	{
		"type": "regex",
		"start": 447,
		"end": 461,
		"match": "^[[:space:]]*#"
	},
	{
		"type": "keyword",
		"start": 462,
		"end": 464,
		"match": "]]"
	},
	{
		"type": "punctuation",
		"start": 464,
		"end": 465,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 466,
		"end": 470,
		"match": "then"
	},
	{
		"type": "builtin",
		"start": 483,
		"end": 491,
		"match": "continue"
	},
	{
		"type": "keyword",
		"start": 500,
		"end": 502,
		"match": "fi"
	},
	{
		"type": "builtin",
		"start": 511,
		"end": 515,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 516,
		"end": 529,
		"match": "\"processing: "
	},
	{
		"type": "variable",
		"start": 529,
		"end": 534,
		"match": "$line"
	},
	{
		"type": "string",
		"start": 534,
		"end": 535,
		"match": "\""
	},
	{
		"type": "keyword",
		"start": 540,
		"end": 544,
		"match": "done"
	},
	{
		"type": "operator",
		"start": 545,
		"end": 546,
		"match": "<"
	},
	{
		"type": "string",
		"start": 547,
		"end": 548,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 548,
		"end": 553,
		"match": "$file"
	},
	{
		"type": "string",
		"start": 553,
		"end": 554,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 555,
		"end": 556,
		"match": "}"
	},
	{
		"type": "identifier",
		"start": 558,
		"end": 562,
		"match": "main"
	},
	{
		"type": "punctuation",
		"start": 562,
		"end": 564,
		"match": "()"
	},
	{
		"type": "punctuation",
		"start": 565,
		"end": 566,
		"match": "{"
	},
	{
		"type": "builtin",
		"start": 571,
		"end": 576,
		"match": "local"
	},
	{
		"type": "operator",
		"start": 577,
		"end": 578,
		"match": "-"
	},
	{
		"type": "identifier",
		"start": 578,
		"end": 579,
		"match": "i"
	},
	{
		"type": "identifier",
		"start": 580,
		"end": 588,
		"match": "failures"
	},
	{
		"type": "operator",
		"start": 588,
		"end": 589,
		"match": "="
	},
	{
		"type": "identifier",
		"start": 589,
		"end": 590,
		"match": "0"
	},
	{
		"type": "keyword",
		"start": 595,
		"end": 598,
		"match": "for"
	},
	{
		"type": "identifier",
		"start": 599,
		"end": 600,
		"match": "f"
	},
	{
		"type": "keyword",
		"start": 601,
		"end": 603,
		"match": "in"
	},
	{
		"type": "string",
		"start": 604,
		"end": 605,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 605,
		"end": 607,
		"match": "$@"
	},
	{
		"type": "string",
		"start": 607,
		"end": 608,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 608,
		"end": 609,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 610,
		"end": 612,
		"match": "do"
	},
	{
		"type": "keyword",
		"start": 621,
		"end": 623,
		"match": "if"
	},
	{
		"type": "operator",
		"start": 624,
		"end": 625,
		"match": "!"
	},
	{
		"type": "identifier",
		"start": 626,
		"end": 638,
		"match": "process_file"
	},
	{
		"type": "string",
		"start": 639,
		"end": 640,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 640,
		"end": 642,
		"match": "$f"
	},
	{
		"type": "string",
		"start": 642,
		"end": 643,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 643,
		"end": 644,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 645,
		"end": 649,
		"match": "then"
	},
	{
		"type": "identifier",
		"start": 662,
		"end": 670,
		"match": "failures"
	},
	{
		"type": "operator",
		"start": 670,
		"end": 671,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 671,
		"end": 674,
		"match": "$(("
	},
	{
		"type": "identifier",
		"start": 674,
		"end": 682,
		"match": "failures"
	},
	{
		"type": "operator",
		"start": 683,
		"end": 684,
		"match": "+"
	},
	{
		"type": "number",
		"start": 685,
		"end": 686,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 686,
		"end": 688,
		"match": "))"
	},
	{
		"type": "keyword",
		"start": 697,
		"end": 699,
		"match": "fi"
	},
	{
		"type": "keyword",
		"start": 704,
		"end": 708,
		"match": "done"
	},
	{
		"type": "keyword",
		"start": 713,
		"end": 715,
		"match": "if"
	},
	{
		"type": "punctuation",
		"start": 716,
		"end": 718,
		"match": "(("
	},
	{
		"type": "identifier",
		"start": 719,
		"end": 727,
		"match": "failures"
	},
	{
		"type": "operator",
		"start": 728,
		"end": 729,
		"match": ">"
	},
	{
		"type": "number",
		"start": 730,
		"end": 731,
		"match": "0"
	},
	{
		"type": "punctuation",
		"start": 732,
		"end": 735,
		"match": "));"
	},
	{
		"type": "keyword",
		"start": 736,
		"end": 740,
		"match": "then"
	},
	{
		"type": "builtin",
		"start": 749,
		"end": 755,
		"match": "printf"
	},
	{
		"type": "string",
		"start": 756,
		"end": 771,
		"match": "'%d failures\\n'"
	},
	{
		"type": "string",
		"start": 772,
		"end": 773,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 773,
		"end": 782,
		"match": "$failures"
	},
	{
		"type": "string",
		"start": 782,
		"end": 783,
		"match": "\""
	},
	{
		"type": "operator",
		"start": 784,
		"end": 786,
		"match": ">&"
	},
	{
		"type": "identifier",
		"start": 786,
		"end": 787,
		"match": "2"
	},
	{
		"type": "builtin",
		"start": 796,
		"end": 800,
		"match": "exit"
	},
	{
		"type": "identifier",
		"start": 801,
		"end": 802,
		"match": "1"
	},
	{
		"type": "keyword",
		"start": 807,
		"end": 809,
		"match": "fi"
	},
	{
		"type": "punctuation",
		"start": 810,
		"end": 811,
		"match": "}"
	},
	{
		"type": "identifier",
		"start": 813,
		"end": 817,
		"match": "main"
	},
	{
		"type": "string",
		"start": 818,
		"end": 819,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 819,
		"end": 821,
		"match": "$@"
	},
	{
		"type": "string",
		"start": 821,
		"end": 822,
		"match": "\""
	}
];
