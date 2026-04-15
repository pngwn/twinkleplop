export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 45,
		"match": "#!/usr/bin/env bash\n# simple greeting script\n"
	},
	{
		"type": "builtin",
		"start": 45,
		"end": 49,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 50,
		"end": 65,
		"match": "\"Hello, World!\""
	},
	{
		"type": "builtin",
		"start": 66,
		"end": 70,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 71,
		"end": 86,
		"match": "'single-quoted'"
	},
	{
		"type": "identifier",
		"start": 87,
		"end": 88,
		"match": "x"
	},
	{
		"type": "operator",
		"start": 88,
		"end": 89,
		"match": "="
	},
	{
		"type": "identifier",
		"start": 89,
		"end": 91,
		"match": "42"
	},
	{
		"type": "identifier",
		"start": 92,
		"end": 93,
		"match": "y"
	},
	{
		"type": "operator",
		"start": 93,
		"end": 94,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 94,
		"end": 97,
		"match": "$(("
	},
	{
		"type": "identifier",
		"start": 97,
		"end": 98,
		"match": "x"
	},
	{
		"type": "operator",
		"start": 99,
		"end": 100,
		"match": "+"
	},
	{
		"type": "number",
		"start": 101,
		"end": 102,
		"match": "8"
	},
	{
		"type": "punctuation",
		"start": 102,
		"end": 104,
		"match": "))"
	},
	{
		"type": "builtin",
		"start": 105,
		"end": 109,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 110,
		"end": 113,
		"match": "\"x="
	},
	{
		"type": "variable",
		"start": 113,
		"end": 115,
		"match": "$x"
	},
	{
		"type": "string",
		"start": 115,
		"end": 118,
		"match": " y="
	},
	{
		"type": "variable",
		"start": 118,
		"end": 120,
		"match": "$y"
	},
	{
		"type": "string",
		"start": 120,
		"end": 121,
		"match": "\""
	}
];
