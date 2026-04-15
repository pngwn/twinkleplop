export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 34,
		"match": "#!/bin/bash\n# pipelines and lists\n"
	},
	{
		"type": "identifier",
		"start": 35,
		"end": 37,
		"match": "ls"
	},
	{
		"type": "punctuation",
		"start": 38,
		"end": 39,
		"match": "|"
	},
	{
		"type": "identifier",
		"start": 40,
		"end": 44,
		"match": "grep"
	},
	{
		"type": "identifier",
		"start": 45,
		"end": 48,
		"match": "foo"
	},
	{
		"type": "punctuation",
		"start": 49,
		"end": 50,
		"match": "|"
	},
	{
		"type": "identifier",
		"start": 51,
		"end": 53,
		"match": "wc"
	},
	{
		"type": "operator",
		"start": 54,
		"end": 55,
		"match": "-"
	},
	{
		"type": "identifier",
		"start": 55,
		"end": 56,
		"match": "l"
	},
	{
		"type": "identifier",
		"start": 57,
		"end": 59,
		"match": "ls"
	},
	{
		"type": "punctuation",
		"start": 60,
		"end": 62,
		"match": "|&"
	},
	{
		"type": "identifier",
		"start": 63,
		"end": 67,
		"match": "grep"
	},
	{
		"type": "identifier",
		"start": 68,
		"end": 73,
		"match": "error"
	},
	{
		"type": "boolean",
		"start": 74,
		"end": 78,
		"match": "true"
	},
	{
		"type": "punctuation",
		"start": 79,
		"end": 81,
		"match": "&&"
	},
	{
		"type": "builtin",
		"start": 82,
		"end": 86,
		"match": "echo"
	},
	{
		"type": "identifier",
		"start": 87,
		"end": 90,
		"match": "yes"
	},
	{
		"type": "boolean",
		"start": 91,
		"end": 96,
		"match": "false"
	},
	{
		"type": "punctuation",
		"start": 97,
		"end": 99,
		"match": "||"
	},
	{
		"type": "builtin",
		"start": 100,
		"end": 104,
		"match": "echo"
	},
	{
		"type": "identifier",
		"start": 105,
		"end": 107,
		"match": "no"
	},
	{
		"type": "identifier",
		"start": 108,
		"end": 112,
		"match": "cmd1"
	},
	{
		"type": "punctuation",
		"start": 112,
		"end": 113,
		"match": ";"
	},
	{
		"type": "identifier",
		"start": 114,
		"end": 118,
		"match": "cmd2"
	},
	{
		"type": "punctuation",
		"start": 118,
		"end": 119,
		"match": ";"
	},
	{
		"type": "identifier",
		"start": 120,
		"end": 124,
		"match": "cmd3"
	},
	{
		"type": "identifier",
		"start": 125,
		"end": 129,
		"match": "cmd1"
	},
	{
		"type": "punctuation",
		"start": 130,
		"end": 131,
		"match": "&"
	},
	{
		"type": "identifier",
		"start": 132,
		"end": 136,
		"match": "cmd2"
	},
	{
		"type": "punctuation",
		"start": 137,
		"end": 138,
		"match": "&"
	},
	{
		"type": "operator",
		"start": 139,
		"end": 140,
		"match": "!"
	},
	{
		"type": "boolean",
		"start": 141,
		"end": 145,
		"match": "true"
	},
	{
		"type": "operator",
		"start": 146,
		"end": 147,
		"match": "!"
	},
	{
		"type": "keyword",
		"start": 148,
		"end": 150,
		"match": "[["
	},
	{
		"type": "operator",
		"start": 151,
		"end": 153,
		"match": "-f"
	},
	{
		"type": "identifier",
		"start": 154,
		"end": 157,
		"match": "foo"
	},
	{
		"type": "keyword",
		"start": 158,
		"end": 160,
		"match": "]]"
	},
	{
		"type": "identifier",
		"start": 161,
		"end": 165,
		"match": "cmd1"
	},
	{
		"type": "punctuation",
		"start": 166,
		"end": 168,
		"match": "&&"
	},
	{
		"type": "identifier",
		"start": 169,
		"end": 173,
		"match": "cmd2"
	},
	{
		"type": "punctuation",
		"start": 174,
		"end": 176,
		"match": "||"
	},
	{
		"type": "identifier",
		"start": 177,
		"end": 181,
		"match": "cmd3"
	}
];
