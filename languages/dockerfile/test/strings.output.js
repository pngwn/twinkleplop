export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 4,
		"match": "FROM"
	},
	{
		"type": "string",
		"start": 5,
		"end": 16,
		"match": "alpine:3.22"
	},
	{
		"type": "keyword",
		"start": 17,
		"end": 20,
		"match": "ENV"
	},
	{
		"type": "property",
		"start": 21,
		"end": 25,
		"match": "ROOT"
	},
	{
		"type": "operator",
		"start": 25,
		"end": 26,
		"match": "="
	},
	{
		"type": "string",
		"start": 26,
		"end": 30,
		"match": "/srv"
	},
	{
		"type": "property",
		"start": 31,
		"end": 36,
		"match": "CACHE"
	},
	{
		"type": "operator",
		"start": 36,
		"end": 37,
		"match": "="
	},
	{
		"type": "string",
		"start": 37,
		"end": 38,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 38,
		"end": 46,
		"match": "${ROOT:-"
	},
	{
		"type": "variable",
		"start": 46,
		"end": 60,
		"match": "${HOME:-/tmp}}"
	},
	{
		"type": "string",
		"start": 60,
		"end": 67,
		"match": "/cache\""
	},
	{
		"type": "property",
		"start": 68,
		"end": 71,
		"match": "RAW"
	},
	{
		"type": "operator",
		"start": 71,
		"end": 72,
		"match": "="
	},
	{
		"type": "string",
		"start": 72,
		"end": 87,
		"match": "'$HOME ${PATH}'"
	},
	{
		"type": "keyword",
		"start": 88,
		"end": 91,
		"match": "ENV"
	},
	{
		"type": "property",
		"start": 92,
		"end": 99,
		"match": "LITERAL"
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
		"end": 106,
		"match": "\\$HOME"
	},
	{
		"type": "property",
		"start": 107,
		"end": 113,
		"match": "SPACED"
	},
	{
		"type": "operator",
		"start": 113,
		"end": 114,
		"match": "="
	},
	{
		"type": "string",
		"start": 114,
		"end": 124,
		"match": "some\\ path"
	},
	{
		"type": "property",
		"start": 125,
		"end": 130,
		"match": "QUOTE"
	},
	{
		"type": "operator",
		"start": 130,
		"end": 131,
		"match": "="
	},
	{
		"type": "string",
		"start": 131,
		"end": 153,
		"match": "\"an escaped \\\"quote\\\"\""
	},
	{
		"type": "keyword",
		"start": 154,
		"end": 159,
		"match": "LABEL"
	},
	{
		"type": "property",
		"start": 160,
		"end": 166,
		"match": "quoted"
	},
	{
		"type": "operator",
		"start": 166,
		"end": 167,
		"match": "="
	},
	{
		"type": "string",
		"start": 167,
		"end": 188,
		"match": "\"a # inside a string\""
	},
	{
		"type": "property",
		"start": 189,
		"end": 196,
		"match": "version"
	},
	{
		"type": "operator",
		"start": 196,
		"end": 197,
		"match": "="
	},
	{
		"type": "string",
		"start": 197,
		"end": 200,
		"match": "1.0"
	},
	{
		"type": "property",
		"start": 201,
		"end": 208,
		"match": "enabled"
	},
	{
		"type": "operator",
		"start": 208,
		"end": 209,
		"match": "="
	},
	{
		"type": "string",
		"start": 209,
		"end": 213,
		"match": "true"
	},
	{
		"type": "property",
		"start": 214,
		"end": 219,
		"match": "unset"
	},
	{
		"type": "operator",
		"start": 219,
		"end": 220,
		"match": "="
	},
	{
		"type": "string",
		"start": 220,
		"end": 224,
		"match": "null"
	},
	{
		"type": "keyword",
		"start": 225,
		"end": 229,
		"match": "COPY"
	},
	{
		"type": "punctuation",
		"start": 230,
		"end": 231,
		"match": "["
	},
	{
		"type": "string",
		"start": 231,
		"end": 232,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 232,
		"end": 237,
		"match": "$ROOT"
	},
	{
		"type": "string",
		"start": 237,
		"end": 243,
		"match": "/file\""
	},
	{
		"type": "punctuation",
		"start": 243,
		"end": 244,
		"match": ","
	},
	{
		"type": "string",
		"start": 245,
		"end": 246,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 246,
		"end": 260,
		"match": "${DEST:-/data}"
	},
	{
		"type": "string",
		"start": 260,
		"end": 261,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 261,
		"end": 262,
		"match": "]"
	},
	{
		"type": "keyword",
		"start": 263,
		"end": 266,
		"match": "RUN"
	},
	{
		"type": "punctuation",
		"start": 267,
		"end": 268,
		"match": "["
	},
	{
		"type": "string",
		"start": 268,
		"end": 274,
		"match": "\"echo\""
	},
	{
		"type": "punctuation",
		"start": 274,
		"end": 275,
		"match": ","
	},
	{
		"type": "string",
		"start": 276,
		"end": 283,
		"match": "\"$HOME\""
	},
	{
		"type": "punctuation",
		"start": 283,
		"end": 284,
		"match": ","
	},
	{
		"type": "string",
		"start": 285,
		"end": 294,
		"match": "\"${PATH}\""
	},
	{
		"type": "punctuation",
		"start": 294,
		"end": 295,
		"match": ","
	},
	{
		"type": "string",
		"start": 296,
		"end": 302,
		"match": "\"a\\\\b\""
	},
	{
		"type": "punctuation",
		"start": 302,
		"end": 303,
		"match": ","
	},
	{
		"type": "string",
		"start": 304,
		"end": 310,
		"match": "\"a\\\"b\""
	},
	{
		"type": "punctuation",
		"start": 310,
		"end": 311,
		"match": ","
	},
	{
		"type": "string",
		"start": 312,
		"end": 320,
		"match": "\"\\u263a\""
	},
	{
		"type": "punctuation",
		"start": 320,
		"end": 321,
		"match": ","
	},
	{
		"type": "string",
		"start": 322,
		"end": 333,
		"match": "\"line\\nend\""
	},
	{
		"type": "punctuation",
		"start": 333,
		"end": 334,
		"match": "]"
	},
	{
		"type": "keyword",
		"start": 335,
		"end": 338,
		"match": "RUN"
	},
	{
		"type": "string",
		"start": 339,
		"end": 343,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 344,
		"end": 345,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 345,
		"end": 350,
		"match": "$HOME"
	},
	{
		"type": "string",
		"start": 350,
		"end": 351,
		"match": "\""
	},
	{
		"type": "operator",
		"start": 352,
		"end": 354,
		"match": "&&"
	},
	{
		"type": "string",
		"start": 355,
		"end": 359,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 360,
		"end": 375,
		"match": "'literal $HOME'"
	},
	{
		"type": "operator",
		"start": 376,
		"end": 378,
		"match": "||"
	},
	{
		"type": "string",
		"start": 379,
		"end": 383,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 384,
		"end": 398,
		"match": "escaped\\ space"
	},
	{
		"type": "keyword",
		"start": 399,
		"end": 402,
		"match": "RUN"
	},
	{
		"type": "string",
		"start": 403,
		"end": 407,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 408,
		"end": 409,
		"match": "["
	},
	{
		"type": "string",
		"start": 410,
		"end": 417,
		"match": "bracket"
	},
	{
		"type": "string",
		"start": 418,
		"end": 419,
		"match": "]"
	},
	{
		"type": "string",
		"start": 420,
		"end": 423,
		"match": "and"
	},
	{
		"type": "string",
		"start": 424,
		"end": 435,
		"match": "inline#hash"
	},
	{
		"type": "string",
		"start": 436,
		"end": 437,
		"match": "#"
	},
	{
		"type": "string",
		"start": 438,
		"end": 444,
		"match": "Docker"
	},
	{
		"type": "string",
		"start": 445,
		"end": 450,
		"match": "keeps"
	},
	{
		"type": "string",
		"start": 451,
		"end": 455,
		"match": "this"
	},
	{
		"type": "string",
		"start": 456,
		"end": 464,
		"match": "argument"
	},
	{
		"type": "keyword",
		"start": 465,
		"end": 469,
		"match": "COPY"
	},
	{
		"type": "string",
		"start": 470,
		"end": 485,
		"match": "source#fragment"
	},
	{
		"type": "string",
		"start": 486,
		"end": 498,
		"match": "/destination"
	},
	{
		"type": "keyword",
		"start": 499,
		"end": 502,
		"match": "RUN"
	},
	{
		"type": "string",
		"start": 503,
		"end": 507,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 508,
		"end": 509,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 509,
		"end": 511,
		"match": "$?"
	},
	{
		"type": "string",
		"start": 511,
		"end": 512,
		"match": " "
	},
	{
		"type": "variable",
		"start": 512,
		"end": 514,
		"match": "$$"
	},
	{
		"type": "string",
		"start": 514,
		"end": 515,
		"match": " "
	},
	{
		"type": "variable",
		"start": 515,
		"end": 517,
		"match": "$1"
	},
	{
		"type": "string",
		"start": 517,
		"end": 518,
		"match": " "
	},
	{
		"type": "variable",
		"start": 518,
		"end": 520,
		"match": "$@"
	},
	{
		"type": "string",
		"start": 520,
		"end": 521,
		"match": "\""
	},
	{
		"type": "operator",
		"start": 522,
		"end": 523,
		"match": ">"
	},
	{
		"type": "string",
		"start": 524,
		"end": 535,
		"match": "/tmp/status"
	},
	{
		"type": "keyword",
		"start": 536,
		"end": 541,
		"match": "LABEL"
	},
	{
		"type": "property",
		"start": 542,
		"end": 560,
		"match": "\"name with spaces\""
	},
	{
		"type": "operator",
		"start": 560,
		"end": 561,
		"match": "="
	},
	{
		"type": "string",
		"start": 561,
		"end": 568,
		"match": "\"value\""
	},
	{
		"type": "property",
		"start": 569,
		"end": 580,
		"match": "'other key'"
	},
	{
		"type": "operator",
		"start": 580,
		"end": 581,
		"match": "="
	},
	{
		"type": "string",
		"start": 581,
		"end": 590,
		"match": "'literal'"
	},
	{
		"type": "keyword",
		"start": 591,
		"end": 594,
		"match": "ENV"
	},
	{
		"type": "property",
		"start": 595,
		"end": 601,
		"match": "NESTED"
	},
	{
		"type": "operator",
		"start": 601,
		"end": 602,
		"match": "="
	},
	{
		"type": "variable",
		"start": 602,
		"end": 611,
		"match": "${VALUE:-"
	},
	{
		"type": "string",
		"start": 611,
		"end": 616,
		"match": "\"a}b\""
	},
	{
		"type": "variable",
		"start": 616,
		"end": 617,
		"match": "}"
	},
	{
		"type": "property",
		"start": 618,
		"end": 623,
		"match": "EMPTY"
	},
	{
		"type": "operator",
		"start": 623,
		"end": 624,
		"match": "="
	},
	{
		"type": "variable",
		"start": 624,
		"end": 633,
		"match": "${VALUE:+"
	},
	{
		"type": "variable",
		"start": 633,
		"end": 642,
		"match": "${OTHER}}"
	}
];
