export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 32,
		"match": "#!/bin/bash\n# every string form\n"
	},
	{
		"type": "comment",
		"start": 33,
		"end": 58,
		"match": "# single-quoted: literal\n"
	},
	{
		"type": "identifier",
		"start": 58,
		"end": 59,
		"match": "a"
	},
	{
		"type": "operator",
		"start": 59,
		"end": 60,
		"match": "="
	},
	{
		"type": "string",
		"start": 60,
		"end": 73,
		"match": "'hello world'"
	},
	{
		"type": "identifier",
		"start": 74,
		"end": 75,
		"match": "b"
	},
	{
		"type": "operator",
		"start": 75,
		"end": 76,
		"match": "="
	},
	{
		"type": "string",
		"start": 76,
		"end": 88,
		"match": "'no\\nescape'"
	},
	{
		"type": "identifier",
		"start": 89,
		"end": 90,
		"match": "c"
	},
	{
		"type": "operator",
		"start": 90,
		"end": 91,
		"match": "="
	},
	{
		"type": "string",
		"start": 91,
		"end": 93,
		"match": "''"
	},
	{
		"type": "comment",
		"start": 95,
		"end": 126,
		"match": "# double-quoted: interpolation\n"
	},
	{
		"type": "identifier",
		"start": 126,
		"end": 127,
		"match": "d"
	},
	{
		"type": "operator",
		"start": 127,
		"end": 128,
		"match": "="
	},
	{
		"type": "string",
		"start": 128,
		"end": 135,
		"match": "\"hello "
	},
	{
		"type": "variable",
		"start": 135,
		"end": 140,
		"match": "$USER"
	},
	{
		"type": "string",
		"start": 140,
		"end": 141,
		"match": "\""
	},
	{
		"type": "identifier",
		"start": 142,
		"end": 143,
		"match": "e"
	},
	{
		"type": "operator",
		"start": 143,
		"end": 144,
		"match": "="
	},
	{
		"type": "string",
		"start": 144,
		"end": 150,
		"match": "\"x is "
	},
	{
		"type": "variable",
		"start": 150,
		"end": 152,
		"match": "$x"
	},
	{
		"type": "string",
		"start": 152,
		"end": 157,
		"match": " and "
	},
	{
		"type": "punctuation",
		"start": 157,
		"end": 159,
		"match": "${"
	},
	{
		"type": "identifier",
		"start": 159,
		"end": 160,
		"match": "y"
	},
	{
		"type": "punctuation",
		"start": 160,
		"end": 161,
		"match": "}"
	},
	{
		"type": "string",
		"start": 161,
		"end": 162,
		"match": "\""
	},
	{
		"type": "identifier",
		"start": 163,
		"end": 164,
		"match": "f"
	},
	{
		"type": "operator",
		"start": 164,
		"end": 165,
		"match": "="
	},
	{
		"type": "string",
		"start": 165,
		"end": 174,
		"match": "\"literal "
	},
	{
		"type": "string_escape",
		"start": 174,
		"end": 176,
		"match": "\\$"
	},
	{
		"type": "string",
		"start": 176,
		"end": 183,
		"match": "dollar "
	},
	{
		"type": "string_escape",
		"start": 183,
		"end": 185,
		"match": "\\\""
	},
	{
		"type": "string",
		"start": 185,
		"end": 190,
		"match": "quote"
	},
	{
		"type": "string_escape",
		"start": 190,
		"end": 192,
		"match": "\\\""
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
		"match": "\\\\"
	},
	{
		"type": "string",
		"start": 195,
		"end": 205,
		"match": "backslash\""
	},
	{
		"type": "identifier",
		"start": 206,
		"end": 207,
		"match": "g"
	},
	{
		"type": "operator",
		"start": 207,
		"end": 208,
		"match": "="
	},
	{
		"type": "string",
		"start": 208,
		"end": 215,
		"match": "\"subst "
	},
	{
		"type": "punctuation",
		"start": 215,
		"end": 217,
		"match": "$("
	},
	{
		"type": "identifier",
		"start": 217,
		"end": 221,
		"match": "date"
	},
	{
		"type": "punctuation",
		"start": 221,
		"end": 222,
		"match": ")"
	},
	{
		"type": "string",
		"start": 222,
		"end": 228,
		"match": " here\""
	},
	{
		"type": "comment",
		"start": 230,
		"end": 258,
		"match": "# ansi-c: escape processing\n"
	},
	{
		"type": "identifier",
		"start": 258,
		"end": 259,
		"match": "h"
	},
	{
		"type": "operator",
		"start": 259,
		"end": 260,
		"match": "="
	},
	{
		"type": "string",
		"start": 260,
		"end": 267,
		"match": "$'line1"
	},
	{
		"type": "string_escape",
		"start": 267,
		"end": 269,
		"match": "\\n"
	},
	{
		"type": "string",
		"start": 269,
		"end": 274,
		"match": "line2"
	},
	{
		"type": "string_escape",
		"start": 274,
		"end": 276,
		"match": "\\t"
	},
	{
		"type": "string",
		"start": 276,
		"end": 280,
		"match": "tab'"
	},
	{
		"type": "identifier",
		"start": 281,
		"end": 282,
		"match": "i"
	},
	{
		"type": "operator",
		"start": 282,
		"end": 283,
		"match": "="
	},
	{
		"type": "string",
		"start": 283,
		"end": 290,
		"match": "$'quote"
	},
	{
		"type": "string_escape",
		"start": 290,
		"end": 292,
		"match": "\\'"
	},
	{
		"type": "string",
		"start": 292,
		"end": 301,
		"match": "embedded'"
	},
	{
		"type": "identifier",
		"start": 302,
		"end": 303,
		"match": "j"
	},
	{
		"type": "operator",
		"start": 303,
		"end": 304,
		"match": "="
	},
	{
		"type": "string",
		"start": 304,
		"end": 306,
		"match": "$'"
	},
	{
		"type": "string_escape",
		"start": 306,
		"end": 308,
		"match": "\\x"
	},
	{
		"type": "string",
		"start": 308,
		"end": 310,
		"match": "48"
	},
	{
		"type": "string_escape",
		"start": 310,
		"end": 312,
		"match": "\\x"
	},
	{
		"type": "string",
		"start": 312,
		"end": 315,
		"match": "69'"
	},
	{
		"type": "comment",
		"start": 317,
		"end": 337,
		"match": "# locale-translated\n"
	},
	{
		"type": "identifier",
		"start": 337,
		"end": 338,
		"match": "k"
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
		"end": 353,
		"match": "$\"Hello world\""
	},
	{
		"type": "comment",
		"start": 355,
		"end": 373,
		"match": "# backtick legacy\n"
	},
	{
		"type": "identifier",
		"start": 373,
		"end": 374,
		"match": "l"
	},
	{
		"type": "operator",
		"start": 374,
		"end": 375,
		"match": "="
	},
	{
		"type": "string",
		"start": 375,
		"end": 381,
		"match": "`date`"
	},
	{
		"type": "comment",
		"start": 383,
		"end": 398,
		"match": "# mixed concat "
	},
	{
		"type": "comment",
		"start": 399,
		"end": 449,
		"match": " bash treats adjacent quoted/unquoted as one word\n"
	},
	{
		"type": "identifier",
		"start": 449,
		"end": 450,
		"match": "m"
	},
	{
		"type": "operator",
		"start": 450,
		"end": 451,
		"match": "="
	},
	{
		"type": "string",
		"start": 451,
		"end": 468,
		"match": "\"prefix\"'middle'\""
	},
	{
		"type": "variable",
		"start": 468,
		"end": 475,
		"match": "$suffix"
	},
	{
		"type": "string",
		"start": 475,
		"end": 476,
		"match": "\""
	}
];
