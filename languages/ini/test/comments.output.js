export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 19,
		"match": "; semicolon comment"
	},
	{
		"type": "comment",
		"start": 20,
		"end": 34,
		"match": "# hash comment"
	},
	{
		"type": "comment",
		"start": 37,
		"end": 55,
		"match": "; indented comment"
	},
	{
		"type": "comment",
		"start": 57,
		"end": 79,
		"match": "# tab-indented comment"
	},
	{
		"type": "comment",
		"start": 80,
		"end": 99,
		"match": "#!/usr/bin/env tool"
	},
	{
		"type": "comment",
		"start": 100,
		"end": 125,
		"match": ";extension=disabled_entry"
	},
	{
		"type": "comment",
		"start": 126,
		"end": 145,
		"match": ";[disabled.section]"
	},
	{
		"type": "comment",
		"start": 146,
		"end": 188,
		"match": "; quotes are inert in comments: it's \"open"
	},
	{
		"type": "punctuation",
		"start": 189,
		"end": 190,
		"match": "["
	},
	{
		"type": "namespace",
		"start": 190,
		"end": 197,
		"match": "section"
	},
	{
		"type": "punctuation",
		"start": 197,
		"end": 198,
		"match": "]"
	},
	{
		"type": "property",
		"start": 199,
		"end": 202,
		"match": "key"
	},
	{
		"type": "operator",
		"start": 203,
		"end": 204,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 205,
		"end": 210,
		"match": "value"
	},
	{
		"type": "comment",
		"start": 211,
		"end": 229,
		"match": "; trailing comment"
	},
	{
		"type": "property",
		"start": 230,
		"end": 233,
		"match": "key"
	},
	{
		"type": "operator",
		"start": 234,
		"end": 235,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 236,
		"end": 241,
		"match": "value"
	},
	{
		"type": "comment",
		"start": 242,
		"end": 265,
		"match": "# trailing hash comment"
	},
	{
		"type": "property",
		"start": 266,
		"end": 269,
		"match": "key"
	},
	{
		"type": "operator",
		"start": 270,
		"end": 271,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 272,
		"end": 281,
		"match": "value;not"
	},
	{
		"type": "plain_scalar",
		"start": 282,
		"end": 283,
		"match": "a"
	},
	{
		"type": "plain_scalar",
		"start": 284,
		"end": 291,
		"match": "comment"
	},
	{
		"type": "property",
		"start": 292,
		"end": 295,
		"match": "key"
	},
	{
		"type": "operator",
		"start": 296,
		"end": 297,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 298,
		"end": 307,
		"match": "value#not"
	},
	{
		"type": "plain_scalar",
		"start": 308,
		"end": 309,
		"match": "a"
	},
	{
		"type": "plain_scalar",
		"start": 310,
		"end": 317,
		"match": "comment"
	},
	{
		"type": "plain_scalar",
		"start": 318,
		"end": 324,
		"match": "either"
	},
	{
		"type": "property",
		"start": 325,
		"end": 333,
		"match": "Keywords"
	},
	{
		"type": "operator",
		"start": 333,
		"end": 334,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 334,
		"end": 355,
		"match": "shell;prompt;command;"
	},
	{
		"type": "property",
		"start": 356,
		"end": 359,
		"match": "url"
	},
	{
		"type": "operator",
		"start": 360,
		"end": 361,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 362,
		"end": 394,
		"match": "http://example.com/?a=b#fragment"
	},
	{
		"type": "property",
		"start": 395,
		"end": 400,
		"match": "color"
	},
	{
		"type": "operator",
		"start": 401,
		"end": 402,
		"match": "="
	},
	{
		"type": "comment",
		"start": 403,
		"end": 407,
		"match": "#fff"
	},
	{
		"type": "property",
		"start": 408,
		"end": 411,
		"match": "sem"
	},
	{
		"type": "operator",
		"start": 411,
		"end": 412,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 412,
		"end": 413,
		"match": ";"
	},
	{
		"type": "property",
		"start": 414,
		"end": 418,
		"match": "bare"
	},
	{
		"type": "comment",
		"start": 419,
		"end": 445,
		"match": "; comment after a bare key"
	},
	{
		"type": "property",
		"start": 446,
		"end": 452,
		"match": "quoted"
	},
	{
		"type": "operator",
		"start": 453,
		"end": 454,
		"match": "="
	},
	{
		"type": "string",
		"start": 455,
		"end": 466,
		"match": "\"a ; b # c\""
	},
	{
		"type": "comment",
		"start": 467,
		"end": 491,
		"match": "; comment after a string"
	}
];
