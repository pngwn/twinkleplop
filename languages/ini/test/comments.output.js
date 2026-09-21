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
		"end": 277,
		"match": "value"
	},
	{
		"type": "comment",
		"start": 277,
		"end": 301,
		"match": ";comment without a space"
	},
	{
		"type": "property",
		"start": 302,
		"end": 305,
		"match": "key"
	},
	{
		"type": "operator",
		"start": 306,
		"end": 307,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 308,
		"end": 317,
		"match": "value#not"
	},
	{
		"type": "plain_scalar",
		"start": 318,
		"end": 319,
		"match": "a"
	},
	{
		"type": "plain_scalar",
		"start": 320,
		"end": 327,
		"match": "comment"
	},
	{
		"type": "property",
		"start": 328,
		"end": 336,
		"match": "Keywords"
	},
	{
		"type": "operator",
		"start": 336,
		"end": 337,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 337,
		"end": 342,
		"match": "shell"
	},
	{
		"type": "comment",
		"start": 342,
		"end": 358,
		"match": ";prompt;command;"
	},
	{
		"type": "property",
		"start": 359,
		"end": 366,
		"match": "escaped"
	},
	{
		"type": "operator",
		"start": 367,
		"end": 368,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 369,
		"end": 391,
		"match": "shell\\;prompt\\;command"
	},
	{
		"type": "property",
		"start": 392,
		"end": 395,
		"match": "tox"
	},
	{
		"type": "operator",
		"start": 396,
		"end": 397,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 398,
		"end": 399,
		"match": "a"
	},
	{
		"type": "plain_scalar",
		"start": 400,
		"end": 405,
		"match": "\\#not"
	},
	{
		"type": "plain_scalar",
		"start": 406,
		"end": 407,
		"match": "a"
	},
	{
		"type": "plain_scalar",
		"start": 408,
		"end": 415,
		"match": "comment"
	},
	{
		"type": "property",
		"start": 416,
		"end": 419,
		"match": "url"
	},
	{
		"type": "operator",
		"start": 420,
		"end": 421,
		"match": "="
	},
	{
		"type": "plain_scalar",
		"start": 422,
		"end": 454,
		"match": "http://example.com/?a=b#fragment"
	},
	{
		"type": "property",
		"start": 455,
		"end": 460,
		"match": "color"
	},
	{
		"type": "operator",
		"start": 461,
		"end": 462,
		"match": "="
	},
	{
		"type": "comment",
		"start": 463,
		"end": 467,
		"match": "#fff"
	},
	{
		"type": "property",
		"start": 468,
		"end": 471,
		"match": "sem"
	},
	{
		"type": "operator",
		"start": 471,
		"end": 472,
		"match": "="
	},
	{
		"type": "comment",
		"start": 472,
		"end": 473,
		"match": ";"
	},
	{
		"type": "property",
		"start": 474,
		"end": 478,
		"match": "bare"
	},
	{
		"type": "comment",
		"start": 478,
		"end": 503,
		"match": ";comment after a bare key"
	},
	{
		"type": "property",
		"start": 504,
		"end": 508,
		"match": "bare"
	},
	{
		"type": "comment",
		"start": 509,
		"end": 535,
		"match": "; comment after a bare key"
	},
	{
		"type": "property",
		"start": 536,
		"end": 542,
		"match": "quoted"
	},
	{
		"type": "operator",
		"start": 543,
		"end": 544,
		"match": "="
	},
	{
		"type": "string",
		"start": 545,
		"end": 556,
		"match": "\"a ; b # c\""
	},
	{
		"type": "comment",
		"start": 557,
		"end": 581,
		"match": "; comment after a string"
	}
];
