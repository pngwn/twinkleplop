export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 36,
		"match": "#!/bin/bash\n# redirection operators\n"
	},
	{
		"type": "comment",
		"start": 37,
		"end": 45,
		"match": "# basic\n"
	},
	{
		"type": "identifier",
		"start": 45,
		"end": 48,
		"match": "cmd"
	},
	{
		"type": "operator",
		"start": 49,
		"end": 50,
		"match": "<"
	},
	{
		"type": "identifier",
		"start": 51,
		"end": 56,
		"match": "input"
	},
	{
		"type": "punctuation",
		"start": 56,
		"end": 57,
		"match": "."
	},
	{
		"type": "identifier",
		"start": 57,
		"end": 60,
		"match": "txt"
	},
	{
		"type": "identifier",
		"start": 61,
		"end": 64,
		"match": "cmd"
	},
	{
		"type": "operator",
		"start": 65,
		"end": 66,
		"match": ">"
	},
	{
		"type": "identifier",
		"start": 67,
		"end": 73,
		"match": "output"
	},
	{
		"type": "punctuation",
		"start": 73,
		"end": 74,
		"match": "."
	},
	{
		"type": "identifier",
		"start": 74,
		"end": 77,
		"match": "txt"
	},
	{
		"type": "identifier",
		"start": 78,
		"end": 81,
		"match": "cmd"
	},
	{
		"type": "operator",
		"start": 82,
		"end": 84,
		"match": ">>"
	},
	{
		"type": "identifier",
		"start": 85,
		"end": 91,
		"match": "output"
	},
	{
		"type": "punctuation",
		"start": 91,
		"end": 92,
		"match": "."
	},
	{
		"type": "identifier",
		"start": 92,
		"end": 95,
		"match": "txt"
	},
	{
		"type": "identifier",
		"start": 96,
		"end": 99,
		"match": "cmd"
	},
	{
		"type": "operator",
		"start": 100,
		"end": 102,
		"match": "<>"
	},
	{
		"type": "identifier",
		"start": 103,
		"end": 105,
		"match": "rw"
	},
	{
		"type": "punctuation",
		"start": 105,
		"end": 106,
		"match": "."
	},
	{
		"type": "identifier",
		"start": 106,
		"end": 109,
		"match": "txt"
	},
	{
		"type": "identifier",
		"start": 110,
		"end": 113,
		"match": "cmd"
	},
	{
		"type": "operator",
		"start": 114,
		"end": 116,
		"match": ">|"
	},
	{
		"type": "identifier",
		"start": 117,
		"end": 122,
		"match": "force"
	},
	{
		"type": "punctuation",
		"start": 122,
		"end": 123,
		"match": "."
	},
	{
		"type": "identifier",
		"start": 123,
		"end": 126,
		"match": "txt"
	},
	{
		"type": "comment",
		"start": 128,
		"end": 142,
		"match": "# fd-prefixed\n"
	},
	{
		"type": "identifier",
		"start": 142,
		"end": 145,
		"match": "cmd"
	},
	{
		"type": "identifier",
		"start": 146,
		"end": 147,
		"match": "2"
	},
	{
		"type": "operator",
		"start": 147,
		"end": 148,
		"match": ">"
	},
	{
		"type": "identifier",
		"start": 149,
		"end": 155,
		"match": "errors"
	},
	{
		"type": "punctuation",
		"start": 155,
		"end": 156,
		"match": "."
	},
	{
		"type": "identifier",
		"start": 156,
		"end": 159,
		"match": "log"
	},
	{
		"type": "identifier",
		"start": 160,
		"end": 163,
		"match": "cmd"
	},
	{
		"type": "identifier",
		"start": 164,
		"end": 165,
		"match": "2"
	},
	{
		"type": "operator",
		"start": 165,
		"end": 167,
		"match": ">&"
	},
	{
		"type": "identifier",
		"start": 167,
		"end": 168,
		"match": "1"
	},
	{
		"type": "identifier",
		"start": 169,
		"end": 172,
		"match": "cmd"
	},
	{
		"type": "operator",
		"start": 173,
		"end": 175,
		"match": ">&"
	},
	{
		"type": "identifier",
		"start": 175,
		"end": 176,
		"match": "2"
	},
	{
		"type": "identifier",
		"start": 177,
		"end": 180,
		"match": "cmd"
	},
	{
		"type": "operator",
		"start": 181,
		"end": 183,
		"match": "<&"
	},
	{
		"type": "identifier",
		"start": 183,
		"end": 184,
		"match": "0"
	},
	{
		"type": "comment",
		"start": 186,
		"end": 197,
		"match": "# combined\n"
	},
	{
		"type": "identifier",
		"start": 197,
		"end": 200,
		"match": "cmd"
	},
	{
		"type": "operator",
		"start": 201,
		"end": 203,
		"match": "&>"
	},
	{
		"type": "identifier",
		"start": 204,
		"end": 207,
		"match": "all"
	},
	{
		"type": "punctuation",
		"start": 207,
		"end": 208,
		"match": "."
	},
	{
		"type": "identifier",
		"start": 208,
		"end": 211,
		"match": "log"
	},
	{
		"type": "identifier",
		"start": 212,
		"end": 215,
		"match": "cmd"
	},
	{
		"type": "operator",
		"start": 216,
		"end": 219,
		"match": "&>>"
	},
	{
		"type": "identifier",
		"start": 220,
		"end": 223,
		"match": "all"
	},
	{
		"type": "punctuation",
		"start": 223,
		"end": 224,
		"match": "."
	},
	{
		"type": "identifier",
		"start": 224,
		"end": 227,
		"match": "log"
	},
	{
		"type": "comment",
		"start": 229,
		"end": 243,
		"match": "# here-string\n"
	},
	{
		"type": "identifier",
		"start": 243,
		"end": 246,
		"match": "cat"
	},
	{
		"type": "operator",
		"start": 247,
		"end": 250,
		"match": "<<<"
	},
	{
		"type": "string",
		"start": 251,
		"end": 258,
		"match": "\"hello\""
	},
	{
		"type": "comment",
		"start": 260,
		"end": 270,
		"match": "# heredoc\n"
	},
	{
		"type": "identifier",
		"start": 270,
		"end": 273,
		"match": "cat"
	},
	{
		"type": "operator",
		"start": 274,
		"end": 276,
		"match": "<<"
	},
	{
		"type": "identifier",
		"start": 276,
		"end": 279,
		"match": "EOF"
	},
	{
		"type": "identifier",
		"start": 280,
		"end": 287,
		"match": "literal"
	},
	{
		"type": "identifier",
		"start": 288,
		"end": 292,
		"match": "text"
	},
	{
		"type": "identifier",
		"start": 293,
		"end": 296,
		"match": "EOF"
	},
	{
		"type": "comment",
		"start": 298,
		"end": 318,
		"match": "# heredoc tab-strip\n"
	},
	{
		"type": "identifier",
		"start": 318,
		"end": 321,
		"match": "cat"
	},
	{
		"type": "operator",
		"start": 322,
		"end": 325,
		"match": "<<-"
	},
	{
		"type": "identifier",
		"start": 325,
		"end": 328,
		"match": "END"
	},
	{
		"type": "identifier",
		"start": 330,
		"end": 338,
		"match": "stripped"
	},
	{
		"type": "identifier",
		"start": 340,
		"end": 343,
		"match": "END"
	},
	{
		"type": "comment",
		"start": 345,
		"end": 410,
		"match": "# heredoc quoted delimiter: no expansion (limitation documented)\n"
	},
	{
		"type": "identifier",
		"start": 410,
		"end": 413,
		"match": "cat"
	},
	{
		"type": "operator",
		"start": 414,
		"end": 416,
		"match": "<<"
	},
	{
		"type": "string",
		"start": 416,
		"end": 422,
		"match": "'DONE'"
	},
	{
		"type": "identifier",
		"start": 423,
		"end": 425,
		"match": "no"
	},
	{
		"type": "variable",
		"start": 426,
		"end": 440,
		"match": "$interpolation"
	},
	{
		"type": "identifier",
		"start": 441,
		"end": 445,
		"match": "DONE"
	},
	{
		"type": "comment",
		"start": 447,
		"end": 458,
		"match": "# close fd\n"
	},
	{
		"type": "builtin",
		"start": 458,
		"end": 462,
		"match": "exec"
	},
	{
		"type": "identifier",
		"start": 463,
		"end": 464,
		"match": "3"
	},
	{
		"type": "operator",
		"start": 464,
		"end": 467,
		"match": ">&-"
	}
];
