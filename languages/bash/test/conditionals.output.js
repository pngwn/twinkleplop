export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 38,
		"match": "#!/bin/bash\n# [[ ]] conditional tests\n"
	},
	{
		"type": "keyword",
		"start": 39,
		"end": 41,
		"match": "[["
	},
	{
		"type": "operator",
		"start": 42,
		"end": 44,
		"match": "-e"
	},
	{
		"type": "operator",
		"start": 45,
		"end": 46,
		"match": "/"
	},
	{
		"type": "identifier",
		"start": 46,
		"end": 49,
		"match": "etc"
	},
	{
		"type": "operator",
		"start": 49,
		"end": 50,
		"match": "/"
	},
	{
		"type": "identifier",
		"start": 50,
		"end": 56,
		"match": "passwd"
	},
	{
		"type": "keyword",
		"start": 57,
		"end": 59,
		"match": "]]"
	},
	{
		"type": "keyword",
		"start": 60,
		"end": 62,
		"match": "[["
	},
	{
		"type": "operator",
		"start": 63,
		"end": 65,
		"match": "-f"
	},
	{
		"type": "string",
		"start": 66,
		"end": 67,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 67,
		"end": 72,
		"match": "$file"
	},
	{
		"type": "string",
		"start": 72,
		"end": 73,
		"match": "\""
	},
	{
		"type": "operator",
		"start": 74,
		"end": 76,
		"match": "&&"
	},
	{
		"type": "operator",
		"start": 77,
		"end": 79,
		"match": "-r"
	},
	{
		"type": "string",
		"start": 80,
		"end": 81,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 81,
		"end": 86,
		"match": "$file"
	},
	{
		"type": "string",
		"start": 86,
		"end": 87,
		"match": "\""
	},
	{
		"type": "keyword",
		"start": 88,
		"end": 90,
		"match": "]]"
	},
	{
		"type": "keyword",
		"start": 91,
		"end": 93,
		"match": "[["
	},
	{
		"type": "operator",
		"start": 94,
		"end": 96,
		"match": "-z"
	},
	{
		"type": "string",
		"start": 97,
		"end": 98,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 98,
		"end": 100,
		"match": "$s"
	},
	{
		"type": "string",
		"start": 100,
		"end": 101,
		"match": "\""
	},
	{
		"type": "operator",
		"start": 102,
		"end": 104,
		"match": "||"
	},
	{
		"type": "operator",
		"start": 105,
		"end": 107,
		"match": "-n"
	},
	{
		"type": "string",
		"start": 108,
		"end": 109,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 109,
		"end": 111,
		"match": "$t"
	},
	{
		"type": "string",
		"start": 111,
		"end": 112,
		"match": "\""
	},
	{
		"type": "keyword",
		"start": 113,
		"end": 115,
		"match": "]]"
	},
	{
		"type": "keyword",
		"start": 116,
		"end": 118,
		"match": "[["
	},
	{
		"type": "string",
		"start": 119,
		"end": 120,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 120,
		"end": 122,
		"match": "$a"
	},
	{
		"type": "string",
		"start": 122,
		"end": 123,
		"match": "\""
	},
	{
		"type": "operator",
		"start": 124,
		"end": 126,
		"match": "=="
	},
	{
		"type": "string",
		"start": 127,
		"end": 128,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 128,
		"end": 130,
		"match": "$b"
	},
	{
		"type": "string",
		"start": 130,
		"end": 131,
		"match": "\""
	},
	{
		"type": "keyword",
		"start": 132,
		"end": 134,
		"match": "]]"
	},
	{
		"type": "keyword",
		"start": 135,
		"end": 137,
		"match": "[["
	},
	{
		"type": "string",
		"start": 138,
		"end": 139,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 139,
		"end": 141,
		"match": "$a"
	},
	{
		"type": "string",
		"start": 141,
		"end": 142,
		"match": "\""
	},
	{
		"type": "operator",
		"start": 143,
		"end": 145,
		"match": "!="
	},
	{
		"type": "identifier",
		"start": 146,
		"end": 149,
		"match": "pat"
	},
	{
		"type": "operator",
		"start": 149,
		"end": 150,
		"match": "*"
	},
	{
		"type": "keyword",
		"start": 151,
		"end": 153,
		"match": "]]"
	},
	{
		"type": "keyword",
		"start": 154,
		"end": 156,
		"match": "[["
	},
	{
		"type": "string",
		"start": 157,
		"end": 158,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 158,
		"end": 160,
		"match": "$a"
	},
	{
		"type": "string",
		"start": 160,
		"end": 161,
		"match": "\""
	},
	{
		"type": "operator",
		"start": 162,
		"end": 164,
		"match": "=~"
	},
	{
		"type": "regex",
		"start": 165,
		"end": 172,
		"match": "^[0-9]+"
	},
	{
		"type": "operator",
		"start": 172,
		"end": 173,
		"match": "$"
	},
	{
		"type": "keyword",
		"start": 174,
		"end": 176,
		"match": "]]"
	},
	{
		"type": "keyword",
		"start": 177,
		"end": 179,
		"match": "[["
	},
	{
		"type": "string",
		"start": 180,
		"end": 181,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 181,
		"end": 183,
		"match": "$a"
	},
	{
		"type": "string",
		"start": 183,
		"end": 184,
		"match": "\""
	},
	{
		"type": "operator",
		"start": 185,
		"end": 186,
		"match": "<"
	},
	{
		"type": "string",
		"start": 187,
		"end": 188,
		"match": "\""
	},
	{
		"type": "variable",
		"start": 188,
		"end": 190,
		"match": "$b"
	},
	{
		"type": "string",
		"start": 190,
		"end": 191,
		"match": "\""
	},
	{
		"type": "keyword",
		"start": 192,
		"end": 194,
		"match": "]]"
	},
	{
		"type": "keyword",
		"start": 195,
		"end": 197,
		"match": "[["
	},
	{
		"type": "variable",
		"start": 198,
		"end": 200,
		"match": "$n"
	},
	{
		"type": "operator",
		"start": 201,
		"end": 204,
		"match": "-eq"
	},
	{
		"type": "identifier",
		"start": 205,
		"end": 207,
		"match": "42"
	},
	{
		"type": "keyword",
		"start": 208,
		"end": 210,
		"match": "]]"
	},
	{
		"type": "keyword",
		"start": 211,
		"end": 213,
		"match": "[["
	},
	{
		"type": "variable",
		"start": 214,
		"end": 216,
		"match": "$n"
	},
	{
		"type": "operator",
		"start": 217,
		"end": 220,
		"match": "-lt"
	},
	{
		"type": "identifier",
		"start": 221,
		"end": 224,
		"match": "100"
	},
	{
		"type": "keyword",
		"start": 225,
		"end": 227,
		"match": "]]"
	},
	{
		"type": "keyword",
		"start": 228,
		"end": 230,
		"match": "[["
	},
	{
		"type": "operator",
		"start": 231,
		"end": 232,
		"match": "!"
	},
	{
		"type": "operator",
		"start": 233,
		"end": 235,
		"match": "-d"
	},
	{
		"type": "operator",
		"start": 236,
		"end": 237,
		"match": "/"
	},
	{
		"type": "identifier",
		"start": 237,
		"end": 240,
		"match": "tmp"
	},
	{
		"type": "operator",
		"start": 241,
		"end": 243,
		"match": "||"
	},
	{
		"type": "operator",
		"start": 244,
		"end": 246,
		"match": "-w"
	},
	{
		"type": "operator",
		"start": 247,
		"end": 248,
		"match": "/"
	},
	{
		"type": "identifier",
		"start": 248,
		"end": 251,
		"match": "tmp"
	},
	{
		"type": "keyword",
		"start": 252,
		"end": 254,
		"match": "]]"
	},
	{
		"type": "keyword",
		"start": 255,
		"end": 257,
		"match": "[["
	},
	{
		"type": "punctuation",
		"start": 258,
		"end": 259,
		"match": "("
	},
	{
		"type": "operator",
		"start": 260,
		"end": 262,
		"match": "-f"
	},
	{
		"type": "identifier",
		"start": 263,
		"end": 264,
		"match": "a"
	},
	{
		"type": "operator",
		"start": 265,
		"end": 267,
		"match": "||"
	},
	{
		"type": "operator",
		"start": 268,
		"end": 270,
		"match": "-f"
	},
	{
		"type": "identifier",
		"start": 271,
		"end": 272,
		"match": "b"
	},
	{
		"type": "punctuation",
		"start": 273,
		"end": 274,
		"match": ")"
	},
	{
		"type": "operator",
		"start": 275,
		"end": 277,
		"match": "&&"
	},
	{
		"type": "operator",
		"start": 278,
		"end": 280,
		"match": "-r"
	},
	{
		"type": "identifier",
		"start": 281,
		"end": 282,
		"match": "c"
	},
	{
		"type": "keyword",
		"start": 283,
		"end": 285,
		"match": "]]"
	},
	{
		"type": "keyword",
		"start": 286,
		"end": 288,
		"match": "[["
	},
	{
		"type": "operator",
		"start": 289,
		"end": 291,
		"match": "-v"
	},
	{
		"type": "identifier",
		"start": 292,
		"end": 299,
		"match": "varname"
	},
	{
		"type": "keyword",
		"start": 300,
		"end": 302,
		"match": "]]"
	},
	{
		"type": "keyword",
		"start": 303,
		"end": 305,
		"match": "[["
	},
	{
		"type": "identifier",
		"start": 306,
		"end": 311,
		"match": "file1"
	},
	{
		"type": "operator",
		"start": 312,
		"end": 315,
		"match": "-nt"
	},
	{
		"type": "identifier",
		"start": 316,
		"end": 321,
		"match": "file2"
	},
	{
		"type": "keyword",
		"start": 322,
		"end": 324,
		"match": "]]"
	}
];
