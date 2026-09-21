export const test = [
	{
		"type": "property",
		"start": 0,
		"end": 4,
		"match": "HOST"
	},
	{
		"type": "operator",
		"start": 4,
		"end": 5,
		"match": "="
	},
	{
		"type": "string",
		"start": 5,
		"end": 16,
		"match": "example.com"
	},
	{
		"type": "property",
		"start": 17,
		"end": 25,
		"match": "BARE_REF"
	},
	{
		"type": "operator",
		"start": 25,
		"end": 26,
		"match": "="
	},
	{
		"type": "variable",
		"start": 26,
		"end": 31,
		"match": "$HOST"
	},
	{
		"type": "property",
		"start": 32,
		"end": 38,
		"match": "BRACED"
	},
	{
		"type": "operator",
		"start": 38,
		"end": 39,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 39,
		"end": 41,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 41,
		"end": 45,
		"match": "HOST"
	},
	{
		"type": "punctuation",
		"start": 45,
		"end": 46,
		"match": "}"
	},
	{
		"type": "property",
		"start": 47,
		"end": 56,
		"match": "IN_DOUBLE"
	},
	{
		"type": "operator",
		"start": 56,
		"end": 57,
		"match": "="
	},
	{
		"type": "string",
		"start": 57,
		"end": 66,
		"match": "\"https://"
	},
	{
		"type": "punctuation",
		"start": 66,
		"end": 68,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 68,
		"end": 72,
		"match": "HOST"
	},
	{
		"type": "punctuation",
		"start": 72,
		"end": 73,
		"match": "}"
	},
	{
		"type": "string",
		"start": 73,
		"end": 74,
		"match": ":"
	},
	{
		"type": "variable",
		"start": 74,
		"end": 79,
		"match": "$PORT"
	},
	{
		"type": "string",
		"start": 79,
		"end": 85,
		"match": "/path\""
	},
	{
		"type": "property",
		"start": 86,
		"end": 99,
		"match": "NOT_IN_SINGLE"
	},
	{
		"type": "operator",
		"start": 99,
		"end": 100,
		"match": "="
	},
	{
		"type": "string",
		"start": 100,
		"end": 132,
		"match": "'${HOST} and $HOST stay literal'"
	},
	{
		"type": "property",
		"start": 133,
		"end": 148,
		"match": "NOT_IN_BACKTICK"
	},
	{
		"type": "operator",
		"start": 148,
		"end": 149,
		"match": "="
	},
	{
		"type": "string",
		"start": 149,
		"end": 158,
		"match": "`${HOST}`"
	},
	{
		"type": "property",
		"start": 159,
		"end": 170,
		"match": "GREEDY_NAME"
	},
	{
		"type": "operator",
		"start": 170,
		"end": 171,
		"match": "="
	},
	{
		"type": "string",
		"start": 171,
		"end": 176,
		"match": "\"test"
	},
	{
		"type": "variable",
		"start": 176,
		"end": 185,
		"match": "$VAR2test"
	},
	{
		"type": "string",
		"start": 185,
		"end": 186,
		"match": "\""
	},
	{
		"type": "property",
		"start": 187,
		"end": 197,
		"match": "NAME_STOPS"
	},
	{
		"type": "operator",
		"start": 197,
		"end": 198,
		"match": "="
	},
	{
		"type": "variable",
		"start": 198,
		"end": 203,
		"match": "$USER"
	},
	{
		"type": "string",
		"start": 203,
		"end": 209,
		"match": "@host "
	},
	{
		"type": "variable",
		"start": 209,
		"end": 214,
		"match": "$HOST"
	},
	{
		"type": "string",
		"start": 214,
		"end": 215,
		"match": ":"
	},
	{
		"type": "variable",
		"start": 215,
		"end": 220,
		"match": "$PORT"
	},
	{
		"type": "property",
		"start": 222,
		"end": 229,
		"match": "DEFAULT"
	},
	{
		"type": "operator",
		"start": 229,
		"end": 230,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 230,
		"end": 232,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 232,
		"end": 236,
		"match": "PORT"
	},
	{
		"type": "operator",
		"start": 236,
		"end": 238,
		"match": ":-"
	},
	{
		"type": "string",
		"start": 238,
		"end": 242,
		"match": "8080"
	},
	{
		"type": "punctuation",
		"start": 242,
		"end": 243,
		"match": "}"
	},
	{
		"type": "property",
		"start": 244,
		"end": 255,
		"match": "SET_DEFAULT"
	},
	{
		"type": "operator",
		"start": 255,
		"end": 256,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 256,
		"end": 258,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 258,
		"end": 262,
		"match": "PORT"
	},
	{
		"type": "operator",
		"start": 262,
		"end": 263,
		"match": "-"
	},
	{
		"type": "string",
		"start": 263,
		"end": 267,
		"match": "8080"
	},
	{
		"type": "punctuation",
		"start": 267,
		"end": 268,
		"match": "}"
	},
	{
		"type": "property",
		"start": 269,
		"end": 278,
		"match": "ALTERNATE"
	},
	{
		"type": "operator",
		"start": 278,
		"end": 279,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 279,
		"end": 281,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 281,
		"end": 286,
		"match": "DEBUG"
	},
	{
		"type": "operator",
		"start": 286,
		"end": 288,
		"match": ":+"
	},
	{
		"type": "string",
		"start": 288,
		"end": 295,
		"match": "verbose"
	},
	{
		"type": "punctuation",
		"start": 295,
		"end": 296,
		"match": "}"
	},
	{
		"type": "property",
		"start": 297,
		"end": 310,
		"match": "SET_ALTERNATE"
	},
	{
		"type": "operator",
		"start": 310,
		"end": 311,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 311,
		"end": 313,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 313,
		"end": 318,
		"match": "DEBUG"
	},
	{
		"type": "operator",
		"start": 318,
		"end": 319,
		"match": "+"
	},
	{
		"type": "string",
		"start": 319,
		"end": 326,
		"match": "verbose"
	},
	{
		"type": "punctuation",
		"start": 326,
		"end": 327,
		"match": "}"
	},
	{
		"type": "property",
		"start": 328,
		"end": 336,
		"match": "REQUIRED"
	},
	{
		"type": "operator",
		"start": 336,
		"end": 337,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 337,
		"end": 339,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 339,
		"end": 346,
		"match": "API_KEY"
	},
	{
		"type": "operator",
		"start": 346,
		"end": 348,
		"match": ":?"
	},
	{
		"type": "string",
		"start": 348,
		"end": 367,
		"match": "API_KEY must be set"
	},
	{
		"type": "punctuation",
		"start": 367,
		"end": 368,
		"match": "}"
	},
	{
		"type": "property",
		"start": 369,
		"end": 381,
		"match": "SET_REQUIRED"
	},
	{
		"type": "operator",
		"start": 381,
		"end": 382,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 382,
		"end": 384,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 384,
		"end": 391,
		"match": "API_KEY"
	},
	{
		"type": "operator",
		"start": 391,
		"end": 392,
		"match": "?"
	},
	{
		"type": "string",
		"start": 392,
		"end": 399,
		"match": "missing"
	},
	{
		"type": "punctuation",
		"start": 399,
		"end": 400,
		"match": "}"
	},
	{
		"type": "property",
		"start": 401,
		"end": 412,
		"match": "URL_DEFAULT"
	},
	{
		"type": "operator",
		"start": 412,
		"end": 413,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 413,
		"end": 415,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 415,
		"end": 422,
		"match": "API_URL"
	},
	{
		"type": "operator",
		"start": 422,
		"end": 424,
		"match": ":-"
	},
	{
		"type": "string",
		"start": 424,
		"end": 448,
		"match": "http://localhost:3000/v1"
	},
	{
		"type": "punctuation",
		"start": 448,
		"end": 449,
		"match": "}"
	},
	{
		"type": "property",
		"start": 450,
		"end": 456,
		"match": "NESTED"
	},
	{
		"type": "operator",
		"start": 456,
		"end": 457,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 457,
		"end": 459,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 459,
		"end": 468,
		"match": "IMAGE_TAG"
	},
	{
		"type": "operator",
		"start": 468,
		"end": 470,
		"match": ":-"
	},
	{
		"type": "punctuation",
		"start": 470,
		"end": 472,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 472,
		"end": 479,
		"match": "GIT_SHA"
	},
	{
		"type": "operator",
		"start": 479,
		"end": 481,
		"match": ":-"
	},
	{
		"type": "string",
		"start": 481,
		"end": 487,
		"match": "latest"
	},
	{
		"type": "punctuation",
		"start": 487,
		"end": 488,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 488,
		"end": 489,
		"match": "}"
	},
	{
		"type": "property",
		"start": 490,
		"end": 500,
		"match": "REF_IN_ARG"
	},
	{
		"type": "operator",
		"start": 500,
		"end": 501,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 501,
		"end": 503,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 503,
		"end": 504,
		"match": "A"
	},
	{
		"type": "operator",
		"start": 504,
		"end": 506,
		"match": ":-"
	},
	{
		"type": "variable",
		"start": 506,
		"end": 508,
		"match": "$B"
	},
	{
		"type": "punctuation",
		"start": 508,
		"end": 509,
		"match": "}"
	},
	{
		"type": "property",
		"start": 510,
		"end": 522,
		"match": "EMPTY_BRACES"
	},
	{
		"type": "operator",
		"start": 522,
		"end": 523,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 523,
		"end": 525,
		"match": "${"
	},
	{
		"type": "punctuation",
		"start": 525,
		"end": 526,
		"match": "}"
	},
	{
		"type": "property",
		"start": 527,
		"end": 534,
		"match": "NO_NAME"
	},
	{
		"type": "operator",
		"start": 534,
		"end": 535,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 535,
		"end": 537,
		"match": "${"
	},
	{
		"type": "operator",
		"start": 537,
		"end": 539,
		"match": ":-"
	},
	{
		"type": "string",
		"start": 539,
		"end": 540,
		"match": "x"
	},
	{
		"type": "punctuation",
		"start": 540,
		"end": 541,
		"match": "}"
	},
	{
		"type": "property",
		"start": 542,
		"end": 553,
		"match": "UNSUPPORTED"
	},
	{
		"type": "operator",
		"start": 553,
		"end": 554,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 554,
		"end": 556,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 556,
		"end": 557,
		"match": "A"
	},
	{
		"type": "string",
		"start": 557,
		"end": 560,
		"match": ":=x"
	},
	{
		"type": "punctuation",
		"start": 560,
		"end": 561,
		"match": "}"
	},
	{
		"type": "property",
		"start": 562,
		"end": 574,
		"match": "BACK_TO_BACK"
	},
	{
		"type": "operator",
		"start": 574,
		"end": 575,
		"match": "="
	},
	{
		"type": "string",
		"start": 575,
		"end": 576,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 576,
		"end": 578,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 578,
		"end": 579,
		"match": "A"
	},
	{
		"type": "punctuation",
		"start": 579,
		"end": 580,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 580,
		"end": 582,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 582,
		"end": 583,
		"match": "B"
	},
	{
		"type": "punctuation",
		"start": 583,
		"end": 584,
		"match": "}"
	},
	{
		"type": "variable",
		"start": 584,
		"end": 586,
		"match": "$C"
	},
	{
		"type": "string",
		"start": 586,
		"end": 587,
		"match": "\""
	},
	{
		"type": "property",
		"start": 589,
		"end": 596,
		"match": "COMMAND"
	},
	{
		"type": "operator",
		"start": 596,
		"end": 597,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 597,
		"end": 599,
		"match": "$("
	},
	{
		"type": "string",
		"start": 599,
		"end": 625,
		"match": "git rev-parse --short HEAD"
	},
	{
		"type": "punctuation",
		"start": 625,
		"end": 626,
		"match": ")"
	},
	{
		"type": "property",
		"start": 627,
		"end": 641,
		"match": "NESTED_COMMAND"
	},
	{
		"type": "operator",
		"start": 641,
		"end": 642,
		"match": "="
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
		"end": 645,
		"match": "$("
	},
	{
		"type": "string",
		"start": 645,
		"end": 650,
		"match": "echo "
	},
	{
		"type": "punctuation",
		"start": 650,
		"end": 652,
		"match": "$("
	},
	{
		"type": "string",
		"start": 652,
		"end": 660,
		"match": "date +%s"
	},
	{
		"type": "punctuation",
		"start": 660,
		"end": 661,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 661,
		"end": 662,
		"match": ")"
	},
	{
		"type": "string",
		"start": 662,
		"end": 663,
		"match": "\""
	},
	{
		"type": "property",
		"start": 664,
		"end": 670,
		"match": "PARENS"
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
		"end": 673,
		"match": "$("
	},
	{
		"type": "string",
		"start": 673,
		"end": 688,
		"match": "echo (a b) done"
	},
	{
		"type": "punctuation",
		"start": 688,
		"end": 689,
		"match": ")"
	},
	{
		"type": "property",
		"start": 690,
		"end": 703,
		"match": "ESCAPED_PAREN"
	},
	{
		"type": "operator",
		"start": 703,
		"end": 704,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 704,
		"end": 706,
		"match": "$("
	},
	{
		"type": "string",
		"start": 706,
		"end": 711,
		"match": "echo "
	},
	{
		"type": "string",
		"start": 711,
		"end": 726,
		"match": "\\) still inside"
	},
	{
		"type": "punctuation",
		"start": 726,
		"end": 727,
		"match": ")"
	},
	{
		"type": "property",
		"start": 728,
		"end": 739,
		"match": "COMMAND_REF"
	},
	{
		"type": "operator",
		"start": 739,
		"end": 740,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 740,
		"end": 742,
		"match": "$("
	},
	{
		"type": "string",
		"start": 742,
		"end": 747,
		"match": "echo "
	},
	{
		"type": "punctuation",
		"start": 747,
		"end": 749,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 749,
		"end": 753,
		"match": "HOME"
	},
	{
		"type": "punctuation",
		"start": 753,
		"end": 754,
		"match": "}"
	},
	{
		"type": "string",
		"start": 754,
		"end": 755,
		"match": " "
	},
	{
		"type": "variable",
		"start": 755,
		"end": 760,
		"match": "$USER"
	},
	{
		"type": "punctuation",
		"start": 760,
		"end": 761,
		"match": ")"
	},
	{
		"type": "property",
		"start": 763,
		"end": 770,
		"match": "ESCAPED"
	},
	{
		"type": "operator",
		"start": 770,
		"end": 771,
		"match": "="
	},
	{
		"type": "string_escape",
		"start": 771,
		"end": 773,
		"match": "\\$"
	},
	{
		"type": "string",
		"start": 773,
		"end": 782,
		"match": "NOT_A_VAR"
	},
	{
		"type": "property",
		"start": 783,
		"end": 800,
		"match": "ESCAPED_IN_DOUBLE"
	},
	{
		"type": "operator",
		"start": 800,
		"end": 801,
		"match": "="
	},
	{
		"type": "string",
		"start": 801,
		"end": 802,
		"match": "\""
	},
	{
		"type": "string_escape",
		"start": 802,
		"end": 804,
		"match": "\\$"
	},
	{
		"type": "string",
		"start": 804,
		"end": 816,
		"match": "{NOT_A_VAR}\""
	},
	{
		"type": "property",
		"start": 817,
		"end": 830,
		"match": "DOUBLE_DOLLAR"
	},
	{
		"type": "operator",
		"start": 830,
		"end": 831,
		"match": "="
	},
	{
		"type": "string",
		"start": 831,
		"end": 833,
		"match": "$$"
	},
	{
		"type": "property",
		"start": 834,
		"end": 851,
		"match": "DOLLAR_DOLLAR_VAR"
	},
	{
		"type": "operator",
		"start": 851,
		"end": 852,
		"match": "="
	},
	{
		"type": "string",
		"start": 852,
		"end": 853,
		"match": "$"
	},
	{
		"type": "variable",
		"start": 853,
		"end": 858,
		"match": "$HOME"
	},
	{
		"type": "property",
		"start": 859,
		"end": 870,
		"match": "LONE_DOLLAR"
	},
	{
		"type": "operator",
		"start": 870,
		"end": 871,
		"match": "="
	},
	{
		"type": "string",
		"start": 871,
		"end": 879,
		"match": "$ and a$"
	},
	{
		"type": "property",
		"start": 880,
		"end": 898,
		"match": "DIGIT_AFTER_DOLLAR"
	},
	{
		"type": "operator",
		"start": 898,
		"end": 899,
		"match": "="
	},
	{
		"type": "string",
		"start": 899,
		"end": 901,
		"match": "$1"
	},
	{
		"type": "property",
		"start": 903,
		"end": 916,
		"match": "HASH_IN_BRACE"
	},
	{
		"type": "operator",
		"start": 916,
		"end": 917,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 917,
		"end": 919,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 919,
		"end": 920,
		"match": "A"
	},
	{
		"type": "operator",
		"start": 920,
		"end": 922,
		"match": ":-"
	},
	{
		"type": "comment",
		"start": 922,
		"end": 931,
		"match": "#comment}"
	},
	{
		"type": "property",
		"start": 932,
		"end": 940,
		"match": "UNCLOSED"
	},
	{
		"type": "operator",
		"start": 940,
		"end": 941,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 941,
		"end": 943,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 943,
		"end": 944,
		"match": "A"
	},
	{
		"type": "property",
		"start": 945,
		"end": 954,
		"match": "NEXT_LINE"
	},
	{
		"type": "operator",
		"start": 954,
		"end": 955,
		"match": "="
	},
	{
		"type": "string",
		"start": 955,
		"end": 957,
		"match": "ok"
	},
	{
		"type": "property",
		"start": 958,
		"end": 970,
		"match": "QUOTE_IN_ARG"
	},
	{
		"type": "operator",
		"start": 970,
		"end": 971,
		"match": "="
	},
	{
		"type": "string",
		"start": 971,
		"end": 972,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 972,
		"end": 974,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 974,
		"end": 975,
		"match": "A"
	},
	{
		"type": "operator",
		"start": 975,
		"end": 977,
		"match": ":-"
	},
	{
		"type": "string",
		"start": 977,
		"end": 982,
		"match": "\"x\"}\""
	},
	{
		"type": "property",
		"start": 983,
		"end": 1001,
		"match": "UNCLOSED_IN_DOUBLE"
	},
	{
		"type": "operator",
		"start": 1001,
		"end": 1002,
		"match": "="
	},
	{
		"type": "string",
		"start": 1002,
		"end": 1003,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 1003,
		"end": 1005,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 1005,
		"end": 1006,
		"match": "A"
	},
	{
		"type": "string",
		"start": 1006,
		"end": 1026,
		"match": "\nstill in the string"
	},
	{
		"type": "punctuation",
		"start": 1026,
		"end": 1027,
		"match": "}"
	},
	{
		"type": "string",
		"start": 1027,
		"end": 1028,
		"match": "\""
	}
];
