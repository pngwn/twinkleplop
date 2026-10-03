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
		"end": 30,
		"match": "docker/dockerfile:1.7"
	},
	{
		"type": "comment",
		"start": 31,
		"end": 33,
		"match": "# "
	},
	{
		"type": "directive",
		"start": 33,
		"end": 39,
		"match": "escape"
	},
	{
		"type": "operator",
		"start": 39,
		"end": 40,
		"match": "="
	},
	{
		"type": "comment",
		"start": 40,
		"end": 41,
		"match": "`"
	},
	{
		"type": "comment",
		"start": 42,
		"end": 44,
		"match": "# "
	},
	{
		"type": "directive",
		"start": 44,
		"end": 49,
		"match": "check"
	},
	{
		"type": "operator",
		"start": 49,
		"end": 50,
		"match": "="
	},
	{
		"type": "comment",
		"start": 50,
		"end": 85,
		"match": "skip=JSONArgsRecommended;error=true"
	},
	{
		"type": "comment",
		"start": 86,
		"end": 112,
		"match": "# second comment line here"
	},
	{
		"type": "keyword",
		"start": 113,
		"end": 117,
		"match": "FROM"
	},
	{
		"type": "string",
		"start": 118,
		"end": 125,
		"match": "node:22"
	},
	{
		"type": "keyword",
		"start": 126,
		"end": 128,
		"match": "AS"
	},
	{
		"type": "string",
		"start": 129,
		"end": 134,
		"match": "build"
	},
	{
		"type": "keyword",
		"start": 135,
		"end": 138,
		"match": "RUN"
	},
	{
		"type": "string",
		"start": 139,
		"end": 143,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 144,
		"end": 147,
		"match": "one"
	},
	{
		"type": "operator",
		"start": 148,
		"end": 150,
		"match": "`\n"
	},
	{
		"type": "operator",
		"start": 152,
		"end": 154,
		"match": "&&"
	},
	{
		"type": "string",
		"start": 155,
		"end": 159,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 160,
		"end": 163,
		"match": "two"
	}
];
