export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 2,
		"match": "# "
	},
	{
		"type": "directive",
		"start": 2,
		"end": 8,
		"match": "syntax"
	},
	{
		"type": "operator",
		"start": 8,
		"end": 9,
		"match": "="
	},
	{
		"type": "comment",
		"start": 9,
		"end": 31,
		"match": "docker/dockerfile:1\n# "
	},
	{
		"type": "directive",
		"start": 31,
		"end": 37,
		"match": "EsCaPe"
	},
	{
		"type": "comment",
		"start": 37,
		"end": 38,
		"match": " "
	},
	{
		"type": "operator",
		"start": 38,
		"end": 39,
		"match": "="
	},
	{
		"type": "comment",
		"start": 39,
		"end": 42,
		"match": " `\n"
	},
	{
		"type": "keyword",
		"start": 43,
		"end": 47,
		"match": "FROM"
	},
	{
		"type": "string",
		"start": 48,
		"end": 93,
		"match": "mcr.microsoft.com/windows/nanoserver:ltsc2022"
	},
	{
		"type": "keyword",
		"start": 94,
		"end": 98,
		"match": "COPY"
	},
	{
		"type": "string",
		"start": 99,
		"end": 107,
		"match": "file.txt"
	},
	{
		"type": "string",
		"start": 108,
		"end": 111,
		"match": "C:\\"
	},
	{
		"type": "keyword",
		"start": 112,
		"end": 115,
		"match": "RUN"
	},
	{
		"type": "string",
		"start": 116,
		"end": 120,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 121,
		"end": 126,
		"match": "hello"
	},
	{
		"type": "operator",
		"start": 127,
		"end": 129,
		"match": "`\n"
	},
	{
		"type": "comment",
		"start": 131,
		"end": 145,
		"match": "# build output"
	},
	{
		"type": "operator",
		"start": 148,
		"end": 150,
		"match": "&&"
	},
	{
		"type": "string",
		"start": 151,
		"end": 155,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 156,
		"end": 161,
		"match": "world"
	},
	{
		"type": "keyword",
		"start": 162,
		"end": 167,
		"match": "SHELL"
	},
	{
		"type": "punctuation",
		"start": 168,
		"end": 169,
		"match": "["
	},
	{
		"type": "string",
		"start": 169,
		"end": 181,
		"match": "\"powershell\""
	},
	{
		"type": "punctuation",
		"start": 181,
		"end": 182,
		"match": ","
	},
	{
		"type": "string",
		"start": 183,
		"end": 193,
		"match": "\"-command\""
	},
	{
		"type": "punctuation",
		"start": 193,
		"end": 194,
		"match": "]"
	},
	{
		"type": "keyword",
		"start": 195,
		"end": 198,
		"match": "RUN"
	},
	{
		"type": "punctuation",
		"start": 199,
		"end": 200,
		"match": "["
	},
	{
		"type": "string",
		"start": 200,
		"end": 205,
		"match": "\"cmd\""
	},
	{
		"type": "punctuation",
		"start": 205,
		"end": 206,
		"match": ","
	},
	{
		"type": "string",
		"start": 207,
		"end": 211,
		"match": "\"/C\""
	},
	{
		"type": "punctuation",
		"start": 211,
		"end": 212,
		"match": ","
	},
	{
		"type": "string",
		"start": 213,
		"end": 245,
		"match": "\"C:\\\\Windows\\\\System32\\\\cmd.exe\""
	},
	{
		"type": "punctuation",
		"start": 245,
		"end": 246,
		"match": ","
	},
	{
		"type": "string",
		"start": 247,
		"end": 253,
		"match": "\"a\\\"b\""
	},
	{
		"type": "punctuation",
		"start": 253,
		"end": 254,
		"match": "]"
	},
	{
		"type": "keyword",
		"start": 255,
		"end": 258,
		"match": "ENV"
	},
	{
		"type": "property",
		"start": 259,
		"end": 263,
		"match": "DEST"
	},
	{
		"type": "operator",
		"start": 263,
		"end": 264,
		"match": "="
	},
	{
		"type": "string",
		"start": 264,
		"end": 274,
		"match": "\"C:\\cache\""
	},
	{
		"type": "property",
		"start": 275,
		"end": 281,
		"match": "QUOTED"
	},
	{
		"type": "operator",
		"start": 281,
		"end": 282,
		"match": "="
	},
	{
		"type": "string",
		"start": 282,
		"end": 294,
		"match": "\"a`\"quote`\"\""
	},
	{
		"type": "property",
		"start": 295,
		"end": 300,
		"match": "VALUE"
	},
	{
		"type": "operator",
		"start": 300,
		"end": 301,
		"match": "="
	},
	{
		"type": "variable",
		"start": 301,
		"end": 306,
		"match": "$DEST"
	},
	{
		"type": "comment",
		"start": 307,
		"end": 317,
		"match": "# escape=\\"
	},
	{
		"type": "keyword",
		"start": 318,
		"end": 321,
		"match": "RUN"
	},
	{
		"type": "string",
		"start": 322,
		"end": 326,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 327,
		"end": 332,
		"match": "still"
	},
	{
		"type": "operator",
		"start": 333,
		"end": 335,
		"match": "`\n"
	},
	{
		"type": "string",
		"start": 337,
		"end": 346,
		"match": "continued"
	},
	{
		"type": "keyword",
		"start": 347,
		"end": 354,
		"match": "WORKDIR"
	},
	{
		"type": "string",
		"start": 355,
		"end": 361,
		"match": "C:\\app"
	}
];
