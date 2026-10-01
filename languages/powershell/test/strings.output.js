export const test = [
	{
		"type": "variable",
		"start": 0,
		"end": 8,
		"match": "$literal"
	},
	{
		"type": "operator",
		"start": 9,
		"end": 10,
		"match": "="
	},
	{
		"type": "string",
		"start": 11,
		"end": 15,
		"match": "'don"
	},
	{
		"type": "string",
		"start": 15,
		"end": 46,
		"match": "''t expand $x or `n or C:\\temp'"
	},
	{
		"type": "variable",
		"start": 47,
		"end": 54,
		"match": "$double"
	},
	{
		"type": "operator",
		"start": 55,
		"end": 56,
		"match": "="
	},
	{
		"type": "string",
		"start": 57,
		"end": 65,
		"match": "\"quotes "
	},
	{
		"type": "string",
		"start": 65,
		"end": 73,
		"match": "\"\"inside"
	},
	{
		"type": "string",
		"start": 73,
		"end": 88,
		"match": "\"\", `$literal, "
	},
	{
		"type": "variable",
		"start": 88,
		"end": 99,
		"match": "${env:PATH}"
	},
	{
		"type": "string",
		"start": 99,
		"end": 101,
		"match": ", "
	},
	{
		"type": "boolean",
		"start": 101,
		"end": 106,
		"match": "$true"
	},
	{
		"type": "string",
		"start": 106,
		"end": 108,
		"match": ", "
	},
	{
		"type": "boolean",
		"start": 108,
		"end": 114,
		"match": "$false"
	},
	{
		"type": "string",
		"start": 114,
		"end": 116,
		"match": ", "
	},
	{
		"type": "keyword",
		"start": 116,
		"end": 121,
		"match": "$null"
	},
	{
		"type": "string",
		"start": 121,
		"end": 122,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 123,
		"end": 133,
		"match": "$multiline"
	},
	{
		"type": "operator",
		"start": 134,
		"end": 135,
		"match": "="
	},
	{
		"type": "string",
		"start": 136,
		"end": 150,
		"match": "'first\nsecond'"
	},
	{
		"type": "variable",
		"start": 151,
		"end": 157,
		"match": "$smart"
	},
	{
		"type": "operator",
		"start": 158,
		"end": 159,
		"match": "="
	},
	{
		"type": "string",
		"start": 160,
		"end": 177,
		"match": "“double ”“quotes”"
	},
	{
		"type": "identifier",
		"start": 178,
		"end": 181,
		"match": "and"
	},
	{
		"type": "variable",
		"start": 182,
		"end": 187,
		"match": "$name"
	},
	{
		"type": "string",
		"start": 187,
		"end": 189,
		"match": "”\n"
	},
	{
		"type": "variable",
		"start": 189,
		"end": 201,
		"match": "$smartSingle"
	},
	{
		"type": "string",
		"start": 201,
		"end": 219,
		"match": " = ‘don’‘t expand "
	},
	{
		"type": "variable",
		"start": 219,
		"end": 224,
		"match": "$name"
	},
	{
		"type": "string",
		"start": 224,
		"end": 226,
		"match": "’\n"
	},
	{
		"type": "variable",
		"start": 226,
		"end": 234,
		"match": "$message"
	},
	{
		"type": "string",
		"start": 234,
		"end": 238,
		"match": " = \""
	},
	{
		"type": "identifier",
		"start": 238,
		"end": 244,
		"match": "State:"
	},
	{
		"type": "punctuation",
		"start": 245,
		"end": 247,
		"match": "$("
	},
	{
		"type": "keyword",
		"start": 247,
		"end": 249,
		"match": "if"
	},
	{
		"type": "punctuation",
		"start": 250,
		"end": 251,
		"match": "("
	},
	{
		"type": "variable",
		"start": 251,
		"end": 259,
		"match": "$service"
	},
	{
		"type": "punctuation",
		"start": 259,
		"end": 260,
		"match": "."
	},
	{
		"type": "property",
		"start": 260,
		"end": 267,
		"match": "Running"
	},
	{
		"type": "punctuation",
		"start": 267,
		"end": 268,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 269,
		"end": 270,
		"match": "{"
	},
	{
		"type": "string",
		"start": 271,
		"end": 272,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 272,
		"end": 291,
		"match": "${env:COMPUTERNAME}"
	},
	{
		"type": "string",
		"start": 291,
		"end": 296,
		"match": ": up\""
	},
	{
		"type": "punctuation",
		"start": 297,
		"end": 299,
		"match": "})"
	},
	{
		"type": "string",
		"start": 299,
		"end": 301,
		"match": "\"\n"
	},
	{
		"type": "variable",
		"start": 301,
		"end": 308,
		"match": "$nested"
	},
	{
		"type": "string",
		"start": 308,
		"end": 312,
		"match": " = \""
	},
	{
		"type": "identifier",
		"start": 312,
		"end": 318,
		"match": "Items:"
	},
	{
		"type": "punctuation",
		"start": 319,
		"end": 321,
		"match": "$("
	},
	{
		"type": "punctuation",
		"start": 321,
		"end": 323,
		"match": "@("
	},
	{
		"type": "number",
		"start": 323,
		"end": 324,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 324,
		"end": 325,
		"match": ","
	},
	{
		"type": "number",
		"start": 326,
		"end": 327,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 327,
		"end": 328,
		"match": ")"
	},
	{
		"type": "operator",
		"start": 329,
		"end": 330,
		"match": "|"
	},
	{
		"type": "identifier",
		"start": 331,
		"end": 345,
		"match": "ForEach-Object"
	},
	{
		"type": "punctuation",
		"start": 346,
		"end": 347,
		"match": "{"
	},
	{
		"type": "string",
		"start": 348,
		"end": 355,
		"match": "\"value="
	},
	{
		"type": "punctuation",
		"start": 355,
		"end": 357,
		"match": "$("
	},
	{
		"type": "variable",
		"start": 357,
		"end": 359,
		"match": "$_"
	},
	{
		"type": "operator",
		"start": 360,
		"end": 361,
		"match": "+"
	},
	{
		"type": "punctuation",
		"start": 362,
		"end": 363,
		"match": "("
	},
	{
		"type": "number",
		"start": 363,
		"end": 364,
		"match": "2"
	},
	{
		"type": "operator",
		"start": 365,
		"end": 366,
		"match": "*"
	},
	{
		"type": "number",
		"start": 367,
		"end": 368,
		"match": "3"
	},
	{
		"type": "punctuation",
		"start": 368,
		"end": 370,
		"match": "))"
	},
	{
		"type": "string",
		"start": 370,
		"end": 371,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 372,
		"end": 374,
		"match": "})"
	},
	{
		"type": "string",
		"start": 374,
		"end": 376,
		"match": "\"\n"
	},
	{
		"type": "variable",
		"start": 376,
		"end": 385,
		"match": "$variable"
	},
	{
		"type": "string",
		"start": 385,
		"end": 389,
		"match": " = \""
	},
	{
		"type": "variable",
		"start": 389,
		"end": 408,
		"match": "${name with spaces}"
	},
	{
		"type": "variable",
		"start": 409,
		"end": 426,
		"match": "${escaped`}brace}"
	},
	{
		"type": "variable",
		"start": 427,
		"end": 429,
		"match": "$$"
	},
	{
		"type": "variable",
		"start": 430,
		"end": 432,
		"match": "$?"
	},
	{
		"type": "variable",
		"start": 433,
		"end": 435,
		"match": "$^"
	},
	{
		"type": "variable",
		"start": 436,
		"end": 438,
		"match": "$x"
	},
	{
		"type": "punctuation",
		"start": 438,
		"end": 439,
		"match": "."
	},
	{
		"type": "property",
		"start": 439,
		"end": 443,
		"match": "Name"
	},
	{
		"type": "punctuation",
		"start": 444,
		"end": 446,
		"match": "$("
	},
	{
		"type": "variable",
		"start": 446,
		"end": 448,
		"match": "$x"
	},
	{
		"type": "punctuation",
		"start": 448,
		"end": 449,
		"match": "."
	},
	{
		"type": "property",
		"start": 449,
		"end": 453,
		"match": "Name"
	},
	{
		"type": "punctuation",
		"start": 453,
		"end": 454,
		"match": ")"
	},
	{
		"type": "string",
		"start": 454,
		"end": 456,
		"match": "\"\n"
	},
	{
		"type": "variable",
		"start": 456,
		"end": 464,
		"match": "$escapes"
	},
	{
		"type": "string",
		"start": 464,
		"end": 468,
		"match": " = \""
	},
	{
		"type": "identifier",
		"start": 468,
		"end": 488,
		"match": "`0`a`b`e`f`n`r`t`v`u"
	},
	{
		"type": "punctuation",
		"start": 488,
		"end": 489,
		"match": "{"
	},
	{
		"type": "number",
		"start": 489,
		"end": 490,
		"match": "1"
	},
	{
		"type": "identifier",
		"start": 490,
		"end": 494,
		"match": "F642"
	},
	{
		"type": "punctuation",
		"start": 494,
		"end": 495,
		"match": "}"
	},
	{
		"type": "identifier",
		"start": 495,
		"end": 501,
		"match": "`\"``\\n"
	},
	{
		"type": "string",
		"start": 501,
		"end": 503,
		"match": "\"\n"
	},
	{
		"type": "variable",
		"start": 503,
		"end": 515,
		"match": "$plainDollar"
	},
	{
		"type": "string",
		"start": 515,
		"end": 519,
		"match": " = \""
	},
	{
		"type": "identifier",
		"start": 519,
		"end": 525,
		"match": "Price:"
	},
	{
		"type": "string",
		"start": 526,
		"end": 527,
		"match": "$"
	},
	{
		"type": "identifier",
		"start": 528,
		"end": 531,
		"match": "and"
	},
	{
		"type": "string",
		"start": 532,
		"end": 533,
		"match": "$"
	},
	{
		"type": "operator",
		"start": 533,
		"end": 534,
		"match": "!"
	},
	{
		"type": "identifier",
		"start": 535,
		"end": 538,
		"match": "and"
	},
	{
		"type": "variable",
		"start": 539,
		"end": 541,
		"match": "$$"
	},
	{
		"type": "identifier",
		"start": 541,
		"end": 545,
		"match": "tail"
	},
	{
		"type": "string",
		"start": 545,
		"end": 547,
		"match": "\"\n"
	},
	{
		"type": "variable",
		"start": 547,
		"end": 552,
		"match": "$body"
	},
	{
		"type": "string",
		"start": 552,
		"end": 557,
		"match": " = @\""
	},
	{
		"type": "punctuation",
		"start": 558,
		"end": 559,
		"match": "{"
	},
	{
		"type": "string",
		"start": 559,
		"end": 565,
		"match": "\"host\""
	},
	{
		"type": "punctuation",
		"start": 565,
		"end": 566,
		"match": ":"
	},
	{
		"type": "string",
		"start": 566,
		"end": 567,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 567,
		"end": 586,
		"match": "${env:COMPUTERNAME}"
	},
	{
		"type": "string",
		"start": 586,
		"end": 587,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 587,
		"end": 588,
		"match": ","
	},
	{
		"type": "string",
		"start": 588,
		"end": 594,
		"match": "\"cost\""
	},
	{
		"type": "punctuation",
		"start": 594,
		"end": 595,
		"match": ":"
	},
	{
		"type": "string",
		"start": 595,
		"end": 600,
		"match": "\"`$5\""
	},
	{
		"type": "punctuation",
		"start": 600,
		"end": 601,
		"match": ","
	},
	{
		"type": "string",
		"start": 601,
		"end": 608,
		"match": "\"count\""
	},
	{
		"type": "punctuation",
		"start": 608,
		"end": 609,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 609,
		"end": 612,
		"match": "$(("
	},
	{
		"type": "variable",
		"start": 612,
		"end": 618,
		"match": "$items"
	},
	{
		"type": "punctuation",
		"start": 618,
		"end": 620,
		"match": ")."
	},
	{
		"type": "property",
		"start": 620,
		"end": 625,
		"match": "Count"
	},
	{
		"type": "punctuation",
		"start": 625,
		"end": 627,
		"match": ")}"
	},
	{
		"type": "identifier",
		"start": 628,
		"end": 635,
		"match": "midline"
	},
	{
		"type": "string",
		"start": 636,
		"end": 656,
		"match": "\"@ is still text\n  \""
	},
	{
		"type": "variable",
		"start": 656,
		"end": 657,
		"match": "@"
	},
	{
		"type": "identifier",
		"start": 658,
		"end": 660,
		"match": "is"
	},
	{
		"type": "identifier",
		"start": 661,
		"end": 666,
		"match": "still"
	},
	{
		"type": "identifier",
		"start": 667,
		"end": 671,
		"match": "text"
	},
	{
		"type": "string",
		"start": 672,
		"end": 675,
		"match": "\"@\n"
	},
	{
		"type": "variable",
		"start": 675,
		"end": 679,
		"match": "$raw"
	},
	{
		"type": "string",
		"start": 679,
		"end": 685,
		"match": " = @'\n"
	},
	{
		"type": "variable",
		"start": 685,
		"end": 687,
		"match": "$x"
	},
	{
		"type": "string",
		"start": 687,
		"end": 692,
		"match": " and "
	},
	{
		"type": "punctuation",
		"start": 692,
		"end": 694,
		"match": "$("
	},
	{
		"type": "identifier",
		"start": 694,
		"end": 702,
		"match": "Get-Date"
	},
	{
		"type": "punctuation",
		"start": 702,
		"end": 703,
		"match": ")"
	},
	{
		"type": "string",
		"start": 703,
		"end": 725,
		"match": " are literal; so are \""
	},
	{
		"type": "identifier",
		"start": 725,
		"end": 731,
		"match": "quotes"
	},
	{
		"type": "string",
		"start": 731,
		"end": 743,
		"match": "\" and `n\n'@\n"
	},
	{
		"type": "variable",
		"start": 743,
		"end": 749,
		"match": "$empty"
	},
	{
		"type": "string",
		"start": 749,
		"end": 754,
		"match": " = @\""
	},
	{
		"type": "string",
		"start": 755,
		"end": 758,
		"match": "\"@\n"
	},
	{
		"type": "variable",
		"start": 758,
		"end": 764,
		"match": "$after"
	},
	{
		"type": "string",
		"start": 764,
		"end": 774,
		"match": " = 'done'\n"
	}
];
