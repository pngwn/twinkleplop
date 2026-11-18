export const test = [
	{
		"type": "code_open",
		"start": 7,
		"end": 8,
		"match": "`"
	},
	{
		"type": "code",
		"start": 8,
		"end": 12,
		"match": "code"
	},
	{
		"type": "code_close",
		"start": 12,
		"end": 13,
		"match": "`"
	},
	{
		"type": "code_open",
		"start": 18,
		"end": 20,
		"match": "``"
	},
	{
		"type": "code",
		"start": 20,
		"end": 38,
		"match": "code with ` inside"
	},
	{
		"type": "code_close",
		"start": 38,
		"end": 40,
		"match": "``"
	},
	{
		"type": "code_open",
		"start": 45,
		"end": 46,
		"match": "`"
	},
	{
		"type": "code",
		"start": 46,
		"end": 64,
		"match": "{braces} stay text"
	},
	{
		"type": "code_close",
		"start": 64,
		"end": 65,
		"match": "`"
	},
	{
		"type": "code_open",
		"start": 76,
		"end": 77,
		"match": "`"
	},
	{
		"type": "code_language",
		"start": 77,
		"end": 81,
		"match": "#!js"
	},
	{
		"type": "code",
		"start": 81,
		"end": 93,
		"match": " const x = 1"
	},
	{
		"type": "code_close",
		"start": 93,
		"end": 94,
		"match": "`"
	},
	{
		"type": "code_open",
		"start": 99,
		"end": 101,
		"match": "``"
	},
	{
		"type": "code_language",
		"start": 101,
		"end": 105,
		"match": "#!ts"
	},
	{
		"type": "code",
		"start": 105,
		"end": 119,
		"match": " type A = `b` "
	},
	{
		"type": "code_close",
		"start": 119,
		"end": 121,
		"match": "``"
	},
	{
		"type": "code_open",
		"start": 142,
		"end": 144,
		"match": "$`"
	},
	{
		"type": "code",
		"start": 144,
		"end": 160,
		"match": "e^{i\\pi} + 1 = 0"
	},
	{
		"type": "code_close",
		"start": 160,
		"end": 162,
		"match": "`$"
	},
	{
		"type": "code_open",
		"start": 224,
		"end": 226,
		"match": "$`"
	},
	{
		"type": "code",
		"start": 226,
		"end": 227,
		"match": "x"
	},
	{
		"type": "code_close",
		"start": 227,
		"end": 228,
		"match": "`"
	},
	{
		"type": "code_fence",
		"start": 255,
		"end": 258,
		"match": "```"
	},
	{
		"type": "code_language",
		"start": 258,
		"end": 260,
		"match": "js"
	},
	{
		"type": "raw_code_block",
		"start": 260,
		"end": 281,
		"match": "\nconst x = { a: 1 };\n"
	},
	{
		"type": "code_fence",
		"start": 281,
		"end": 285,
		"match": "```\n"
	},
	{
		"type": "code_fence",
		"start": 286,
		"end": 290,
		"match": "````"
	},
	{
		"type": "code_language",
		"start": 290,
		"end": 292,
		"match": "md"
	},
	{
		"type": "raw_code_block",
		"start": 292,
		"end": 310,
		"match": "\n```js\nlet x;\n```\n"
	},
	{
		"type": "code_fence",
		"start": 310,
		"end": 315,
		"match": "````\n"
	},
	{
		"type": "code_fence",
		"start": 316,
		"end": 319,
		"match": "```"
	},
	{
		"type": "code_language",
		"start": 319,
		"end": 340,
		"match": "ts title=\"a.ts\" {1,3}"
	},
	{
		"type": "raw_code_block",
		"start": 340,
		"end": 374,
		"match": "\ntype A = string;\n``` not a close\n"
	},
	{
		"type": "code_fence",
		"start": 374,
		"end": 378,
		"match": "```\n"
	},
	{
		"type": "code_fence",
		"start": 381,
		"end": 384,
		"match": "```"
	},
	{
		"type": "code_language",
		"start": 384,
		"end": 387,
		"match": "css"
	},
	{
		"type": "raw_code_block",
		"start": 387,
		"end": 409,
		"match": "\n  a { color: red }\n  "
	},
	{
		"type": "code_fence",
		"start": 409,
		"end": 413,
		"match": "```\n"
	},
	{
		"type": "code_fence",
		"start": 414,
		"end": 417,
		"match": "```"
	},
	{
		"type": "code_language",
		"start": 417,
		"end": 421,
		"match": "math"
	},
	{
		"type": "raw_code_block",
		"start": 421,
		"end": 472,
		"match": "\n\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}\n"
	},
	{
		"type": "code_fence",
		"start": 472,
		"end": 476,
		"match": "```\n"
	},
	{
		"type": "blockquote_marker",
		"start": 477,
		"end": 478,
		"match": ">"
	},
	{
		"type": "code_fence",
		"start": 479,
		"end": 482,
		"match": "```"
	},
	{
		"type": "code_language",
		"start": 482,
		"end": 484,
		"match": "js"
	},
	{
		"type": "raw_code_block",
		"start": 484,
		"end": 501,
		"match": "\n> let quoted;\n> "
	},
	{
		"type": "code_fence",
		"start": 501,
		"end": 505,
		"match": "```\n"
	},
	{
		"type": "code_fence",
		"start": 506,
		"end": 509,
		"match": "```"
	},
	{
		"type": "raw_code_block",
		"start": 509,
		"end": 522,
		"match": "\nno language\n"
	},
	{
		"type": "code_fence",
		"start": 522,
		"end": 526,
		"match": "```\n"
	}
];
