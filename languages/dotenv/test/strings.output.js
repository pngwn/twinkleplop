export const test = [
	{
		"type": "property",
		"start": 0,
		"end": 6,
		"match": "DOUBLE"
	},
	{
		"type": "operator",
		"start": 6,
		"end": 7,
		"match": "="
	},
	{
		"type": "string",
		"start": 7,
		"end": 22,
		"match": "\"double quoted\""
	},
	{
		"type": "property",
		"start": 23,
		"end": 29,
		"match": "SINGLE"
	},
	{
		"type": "operator",
		"start": 29,
		"end": 30,
		"match": "="
	},
	{
		"type": "string",
		"start": 30,
		"end": 45,
		"match": "'single quoted'"
	},
	{
		"type": "property",
		"start": 46,
		"end": 54,
		"match": "BACKTICK"
	},
	{
		"type": "operator",
		"start": 54,
		"end": 55,
		"match": "="
	},
	{
		"type": "string",
		"start": 55,
		"end": 72,
		"match": "`backtick quoted`"
	},
	{
		"type": "property",
		"start": 73,
		"end": 87,
		"match": "LEADING_BLANKS"
	},
	{
		"type": "operator",
		"start": 87,
		"end": 88,
		"match": "="
	},
	{
		"type": "string",
		"start": 91,
		"end": 105,
		"match": "\"still quoted\""
	},
	{
		"type": "property",
		"start": 106,
		"end": 118,
		"match": "EMPTY_DOUBLE"
	},
	{
		"type": "operator",
		"start": 118,
		"end": 119,
		"match": "="
	},
	{
		"type": "string",
		"start": 119,
		"end": 121,
		"match": "\"\""
	},
	{
		"type": "property",
		"start": 122,
		"end": 134,
		"match": "EMPTY_SINGLE"
	},
	{
		"type": "operator",
		"start": 134,
		"end": 135,
		"match": "="
	},
	{
		"type": "string",
		"start": 135,
		"end": 137,
		"match": "''"
	},
	{
		"type": "property",
		"start": 138,
		"end": 152,
		"match": "EMPTY_BACKTICK"
	},
	{
		"type": "operator",
		"start": 152,
		"end": 153,
		"match": "="
	},
	{
		"type": "string",
		"start": 153,
		"end": 155,
		"match": "``"
	},
	{
		"type": "property",
		"start": 157,
		"end": 167,
		"match": "DQ_ESCAPES"
	},
	{
		"type": "operator",
		"start": 167,
		"end": 168,
		"match": "="
	},
	{
		"type": "string",
		"start": 168,
		"end": 169,
		"match": "\""
	},
	{
		"type": "string_escape",
		"start": 169,
		"end": 171,
		"match": "\\n"
	},
	{
		"type": "string",
		"start": 171,
		"end": 172,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 172,
		"end": 174,
		"match": "\\r"
	},
	{
		"type": "string",
		"start": 174,
		"end": 175,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 175,
		"end": 177,
		"match": "\\t"
	},
	{
		"type": "string",
		"start": 177,
		"end": 178,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 178,
		"end": 180,
		"match": "\\\\"
	},
	{
		"type": "string",
		"start": 180,
		"end": 181,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 181,
		"end": 183,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 183,
		"end": 184,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 184,
		"end": 186,
		"match": "\\'"
	},
	{
		"type": "string",
		"start": 186,
		"end": 187,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 187,
		"end": 189,
		"match": "\\$"
	},
	{
		"type": "string",
		"start": 189,
		"end": 190,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 190,
		"end": 192,
		"match": "\\a"
	},
	{
		"type": "string",
		"start": 192,
		"end": 193,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 193,
		"end": 195,
		"match": "\\b"
	},
	{
		"type": "string",
		"start": 195,
		"end": 196,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 196,
		"end": 198,
		"match": "\\f"
	},
	{
		"type": "string",
		"start": 198,
		"end": 199,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 199,
		"end": 201,
		"match": "\\v"
	},
	{
		"type": "string",
		"start": 201,
		"end": 202,
		"match": " "
	},
	{
		"type": "string_escape",
		"start": 202,
		"end": 204,
		"match": "\\0"
	},
	{
		"type": "string",
		"start": 204,
		"end": 205,
		"match": "\""
	},
	{
		"type": "property",
		"start": 206,
		"end": 216,
		"match": "DQ_UNKNOWN"
	},
	{
		"type": "operator",
		"start": 216,
		"end": 217,
		"match": "="
	},
	{
		"type": "string",
		"start": 217,
		"end": 244,
		"match": "\"\\d \\x41 \\u00e9 stay plain\""
	},
	{
		"type": "property",
		"start": 245,
		"end": 257,
		"match": "WINDOWS_PATH"
	},
	{
		"type": "operator",
		"start": 257,
		"end": 258,
		"match": "="
	},
	{
		"type": "string",
		"start": 258,
		"end": 261,
		"match": "\"C:"
	},
	{
		"type": "string_escape",
		"start": 261,
		"end": 263,
		"match": "\\\\"
	},
	{
		"type": "string",
		"start": 263,
		"end": 266,
		"match": "dir"
	},
	{
		"type": "string_escape",
		"start": 266,
		"end": 268,
		"match": "\\\\"
	},
	{
		"type": "string",
		"start": 268,
		"end": 269,
		"match": "\""
	},
	{
		"type": "property",
		"start": 270,
		"end": 280,
		"match": "AFTER_PATH"
	},
	{
		"type": "operator",
		"start": 280,
		"end": 281,
		"match": "="
	},
	{
		"type": "string",
		"start": 281,
		"end": 285,
		"match": "next"
	},
	{
		"type": "property",
		"start": 286,
		"end": 296,
		"match": "SQ_ESCAPES"
	},
	{
		"type": "operator",
		"start": 296,
		"end": 297,
		"match": "="
	},
	{
		"type": "string",
		"start": 297,
		"end": 300,
		"match": "'It"
	},
	{
		"type": "string_escape",
		"start": 300,
		"end": 302,
		"match": "\\'"
	},
	{
		"type": "string",
		"start": 302,
		"end": 304,
		"match": "s "
	},
	{
		"type": "string_escape",
		"start": 304,
		"end": 306,
		"match": "\\\\"
	},
	{
		"type": "string",
		"start": 306,
		"end": 327,
		"match": " fine, \\n is literal'"
	},
	{
		"type": "property",
		"start": 328,
		"end": 338,
		"match": "BT_ESCAPES"
	},
	{
		"type": "operator",
		"start": 338,
		"end": 339,
		"match": "="
	},
	{
		"type": "string",
		"start": 339,
		"end": 342,
		"match": "`a "
	},
	{
		"type": "string_escape",
		"start": 342,
		"end": 344,
		"match": "\\`"
	},
	{
		"type": "string",
		"start": 344,
		"end": 356,
		"match": " inside and "
	},
	{
		"type": "string_escape",
		"start": 356,
		"end": 358,
		"match": "\\\\"
	},
	{
		"type": "string",
		"start": 358,
		"end": 363,
		"match": " too`"
	},
	{
		"type": "property",
		"start": 364,
		"end": 382,
		"match": "UNQUOTED_BACKSLASH"
	},
	{
		"type": "operator",
		"start": 382,
		"end": 383,
		"match": "="
	},
	{
		"type": "string",
		"start": 383,
		"end": 394,
		"match": "some\\tvalue"
	},
	{
		"type": "property",
		"start": 396,
		"end": 410,
		"match": "HASH_IN_QUOTES"
	},
	{
		"type": "operator",
		"start": 410,
		"end": 411,
		"match": "="
	},
	{
		"type": "string",
		"start": 411,
		"end": 428,
		"match": "\"not # a comment\""
	},
	{
		"type": "comment",
		"start": 429,
		"end": 440,
		"match": "# a comment"
	},
	{
		"type": "property",
		"start": 441,
		"end": 460,
		"match": "COMMENT_WITH_QUOTES"
	},
	{
		"type": "operator",
		"start": 460,
		"end": 461,
		"match": "="
	},
	{
		"type": "string",
		"start": 461,
		"end": 464,
		"match": "\"a\""
	},
	{
		"type": "comment",
		"start": 465,
		"end": 472,
		"match": "# c \"y\""
	},
	{
		"type": "property",
		"start": 473,
		"end": 489,
		"match": "NO_BLANK_COMMENT"
	},
	{
		"type": "operator",
		"start": 489,
		"end": 490,
		"match": "="
	},
	{
		"type": "string",
		"start": 490,
		"end": 493,
		"match": "\"a\""
	},
	{
		"type": "comment",
		"start": 493,
		"end": 495,
		"match": "#c"
	},
	{
		"type": "property",
		"start": 496,
		"end": 511,
		"match": "QUOTE_NOT_FIRST"
	},
	{
		"type": "operator",
		"start": 511,
		"end": 512,
		"match": "="
	},
	{
		"type": "string",
		"start": 512,
		"end": 517,
		"match": "a \"b "
	},
	{
		"type": "comment",
		"start": 517,
		"end": 521,
		"match": "# c\""
	},
	{
		"type": "property",
		"start": 522,
		"end": 526,
		"match": "JSON"
	},
	{
		"type": "operator",
		"start": 526,
		"end": 527,
		"match": "="
	},
	{
		"type": "string",
		"start": 527,
		"end": 541,
		"match": "{\"foo\": \"bar\"}"
	},
	{
		"type": "property",
		"start": 542,
		"end": 552,
		"match": "ALL_QUOTES"
	},
	{
		"type": "operator",
		"start": 552,
		"end": 553,
		"match": "="
	},
	{
		"type": "string",
		"start": 553,
		"end": 580,
		"match": "`has \"double\" and 'single'`"
	},
	{
		"type": "property",
		"start": 582,
		"end": 591,
		"match": "MULTILINE"
	},
	{
		"type": "operator",
		"start": 591,
		"end": 592,
		"match": "="
	},
	{
		"type": "string",
		"start": 592,
		"end": 686,
		"match": "\"first line\nsecond line with = and # inside\nLOOKS_LIKE=a key\n# looks like a comment\nlast line\""
	},
	{
		"type": "property",
		"start": 687,
		"end": 702,
		"match": "AFTER_MULTILINE"
	},
	{
		"type": "operator",
		"start": 702,
		"end": 703,
		"match": "="
	},
	{
		"type": "number",
		"start": 703,
		"end": 704,
		"match": "1"
	},
	{
		"type": "property",
		"start": 705,
		"end": 721,
		"match": "SINGLE_MULTILINE"
	},
	{
		"type": "operator",
		"start": 721,
		"end": 722,
		"match": "="
	},
	{
		"type": "string",
		"start": 722,
		"end": 731,
		"match": "'one\ntwo'"
	},
	{
		"type": "property",
		"start": 732,
		"end": 743,
		"match": "PRIVATE_KEY"
	},
	{
		"type": "operator",
		"start": 743,
		"end": 744,
		"match": "="
	},
	{
		"type": "string",
		"start": 744,
		"end": 776,
		"match": "\"-----BEGIN RSA PRIVATE KEY-----"
	},
	{
		"type": "string_escape",
		"start": 776,
		"end": 778,
		"match": "\\n"
	},
	{
		"type": "string",
		"start": 778,
		"end": 784,
		"match": "MIIEow"
	},
	{
		"type": "string_escape",
		"start": 784,
		"end": 786,
		"match": "\\n"
	},
	{
		"type": "string",
		"start": 786,
		"end": 792,
		"match": "IBAAKC"
	},
	{
		"type": "string_escape",
		"start": 792,
		"end": 794,
		"match": "\\n"
	},
	{
		"type": "string",
		"start": 794,
		"end": 823,
		"match": "-----END RSA PRIVATE KEY-----"
	},
	{
		"type": "string_escape",
		"start": 823,
		"end": 825,
		"match": "\\n"
	},
	{
		"type": "string",
		"start": 825,
		"end": 826,
		"match": "\""
	},
	{
		"type": "property",
		"start": 828,
		"end": 838,
		"match": "JUNK_AFTER"
	},
	{
		"type": "operator",
		"start": 838,
		"end": 839,
		"match": "="
	},
	{
		"type": "string",
		"start": 839,
		"end": 844,
		"match": "\"a\"b "
	},
	{
		"type": "comment",
		"start": 844,
		"end": 853,
		"match": "# comment"
	},
	{
		"type": "property",
		"start": 854,
		"end": 858,
		"match": "IT_S"
	},
	{
		"type": "operator",
		"start": 858,
		"end": 859,
		"match": "="
	},
	{
		"type": "string",
		"start": 859,
		"end": 865,
		"match": "'it's'"
	}
];
