export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 22,
		"match": "// -*- mode: jsonc -*-"
	},
	{
		"type": "comment",
		"start": 23,
		"end": 85,
		"match": "/** Header doc comment with a URL: https://example.com/a//b */"
	},
	{
		"type": "comment",
		"start": 86,
		"end": 234,
		"match": "/*\n * Multi-line block comment.\n * \"quotes\", 'apostrophes', {braces}, [brackets], a // line marker\n * and a /* nested opener that does not nest.\n */"
	},
	{
		"type": "punctuation",
		"start": 235,
		"end": 236,
		"match": "{"
	},
	{
		"type": "comment",
		"start": 239,
		"end": 243,
		"match": "/**/"
	},
	{
		"type": "property",
		"start": 244,
		"end": 251,
		"match": "\"empty\""
	},
	{
		"type": "punctuation",
		"start": 251,
		"end": 252,
		"match": ":"
	},
	{
		"type": "number",
		"start": 253,
		"end": 254,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 254,
		"end": 255,
		"match": ","
	},
	{
		"type": "comment",
		"start": 258,
		"end": 263,
		"match": "/***/"
	},
	{
		"type": "property",
		"start": 264,
		"end": 271,
		"match": "\"stars\""
	},
	{
		"type": "punctuation",
		"start": 271,
		"end": 272,
		"match": ":"
	},
	{
		"type": "number",
		"start": 273,
		"end": 274,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 274,
		"end": 275,
		"match": ","
	},
	{
		"type": "comment",
		"start": 278,
		"end": 288,
		"match": "/* one **/"
	},
	{
		"type": "property",
		"start": 289,
		"end": 302,
		"match": "\"double_star\""
	},
	{
		"type": "punctuation",
		"start": 302,
		"end": 303,
		"match": ":"
	},
	{
		"type": "number",
		"start": 304,
		"end": 305,
		"match": "3"
	},
	{
		"type": "punctuation",
		"start": 305,
		"end": 306,
		"match": ","
	},
	{
		"type": "comment",
		"start": 309,
		"end": 330,
		"match": "/*/ not closed yet */"
	},
	{
		"type": "property",
		"start": 331,
		"end": 349,
		"match": "\"slash_star_slash\""
	},
	{
		"type": "punctuation",
		"start": 349,
		"end": 350,
		"match": ":"
	},
	{
		"type": "number",
		"start": 351,
		"end": 352,
		"match": "4"
	},
	{
		"type": "punctuation",
		"start": 352,
		"end": 353,
		"match": ","
	},
	{
		"type": "property",
		"start": 356,
		"end": 365,
		"match": "\"between\""
	},
	{
		"type": "comment",
		"start": 366,
		"end": 385,
		"match": "/* key and colon */"
	},
	{
		"type": "punctuation",
		"start": 386,
		"end": 387,
		"match": ":"
	},
	{
		"type": "number",
		"start": 388,
		"end": 389,
		"match": "5"
	},
	{
		"type": "punctuation",
		"start": 389,
		"end": 390,
		"match": ","
	},
	{
		"type": "property",
		"start": 393,
		"end": 406,
		"match": "\"after_colon\""
	},
	{
		"type": "punctuation",
		"start": 406,
		"end": 407,
		"match": ":"
	},
	{
		"type": "comment",
		"start": 407,
		"end": 421,
		"match": "/* no space */"
	},
	{
		"type": "number",
		"start": 421,
		"end": 422,
		"match": "6"
	},
	{
		"type": "punctuation",
		"start": 422,
		"end": 423,
		"match": ","
	},
	{
		"type": "property",
		"start": 426,
		"end": 445,
		"match": "\"line_before_colon\""
	},
	{
		"type": "comment",
		"start": 446,
		"end": 456,
		"match": "// comment"
	},
	{
		"type": "punctuation",
		"start": 461,
		"end": 462,
		"match": ":"
	},
	{
		"type": "number",
		"start": 463,
		"end": 464,
		"match": "7"
	},
	{
		"type": "punctuation",
		"start": 464,
		"end": 465,
		"match": ","
	},
	{
		"type": "property",
		"start": 468,
		"end": 478,
		"match": "\"trailing\""
	},
	{
		"type": "punctuation",
		"start": 478,
		"end": 479,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 480,
		"end": 481,
		"match": "["
	},
	{
		"type": "number",
		"start": 481,
		"end": 482,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 482,
		"end": 483,
		"match": ","
	},
	{
		"type": "number",
		"start": 484,
		"end": 485,
		"match": "2"
	},
	{
		"type": "comment",
		"start": 486,
		"end": 495,
		"match": "/* end */"
	},
	{
		"type": "punctuation",
		"start": 495,
		"end": 497,
		"match": "],"
	},
	{
		"type": "comment",
		"start": 498,
		"end": 516,
		"match": "// after the value"
	},
	{
		"type": "comment",
		"start": 519,
		"end": 569,
		"match": "// don't \"quote\" or {open} anything here /* either"
	},
	{
		"type": "property",
		"start": 572,
		"end": 579,
		"match": "\"glued\""
	},
	{
		"type": "punctuation",
		"start": 579,
		"end": 580,
		"match": ":"
	},
	{
		"type": "number",
		"start": 581,
		"end": 582,
		"match": "8"
	},
	{
		"type": "comment",
		"start": 582,
		"end": 587,
		"match": "/*c*/"
	},
	{
		"type": "punctuation",
		"start": 587,
		"end": 588,
		"match": ","
	},
	{
		"type": "property",
		"start": 591,
		"end": 610,
		"match": "\"true_then_comment\""
	},
	{
		"type": "punctuation",
		"start": 610,
		"end": 611,
		"match": ":"
	},
	{
		"type": "boolean",
		"start": 612,
		"end": 616,
		"match": "true"
	},
	{
		"type": "comment",
		"start": 616,
		"end": 619,
		"match": "//c"
	},
	{
		"type": "punctuation",
		"start": 620,
		"end": 621,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 622,
		"end": 666,
		"match": "// trailing comment at EOF without a newline"
	}
];
