export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 3,
		"match": "GET"
	},
	{
		"type": "url",
		"start": 4,
		"end": 14,
		"match": "/home.html"
	},
	{
		"type": "keyword",
		"start": 15,
		"end": 19,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 19,
		"end": 20,
		"match": "/"
	},
	{
		"type": "number",
		"start": 20,
		"end": 23,
		"match": "1.1"
	},
	{
		"type": "property",
		"start": 24,
		"end": 28,
		"match": "Host"
	},
	{
		"type": "punctuation",
		"start": 28,
		"end": 29,
		"match": ":"
	},
	{
		"type": "string",
		"start": 30,
		"end": 51,
		"match": "developer.mozilla.org"
	},
	{
		"type": "property",
		"start": 52,
		"end": 58,
		"match": "Accept"
	},
	{
		"type": "punctuation",
		"start": 58,
		"end": 59,
		"match": ":"
	},
	{
		"type": "string",
		"start": 60,
		"end": 123,
		"match": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
	},
	{
		"type": "property",
		"start": 124,
		"end": 129,
		"match": "X-Tag"
	},
	{
		"type": "punctuation",
		"start": 129,
		"end": 130,
		"match": ":"
	},
	{
		"type": "string",
		"start": 131,
		"end": 145,
		"match": "#not-a-comment"
	},
	{
		"type": "keyword",
		"start": 147,
		"end": 151,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 151,
		"end": 152,
		"match": "/"
	},
	{
		"type": "number",
		"start": 152,
		"end": 155,
		"match": "1.1"
	},
	{
		"type": "number",
		"start": 156,
		"end": 159,
		"match": "200"
	},
	{
		"type": "string",
		"start": 160,
		"end": 162,
		"match": "OK"
	},
	{
		"type": "property",
		"start": 163,
		"end": 175,
		"match": "Content-Type"
	},
	{
		"type": "punctuation",
		"start": 175,
		"end": 176,
		"match": ":"
	},
	{
		"type": "string",
		"start": 177,
		"end": 201,
		"match": "text/html; charset=utf-8"
	},
	{
		"type": "property",
		"start": 202,
		"end": 216,
		"match": "Content-Length"
	},
	{
		"type": "punctuation",
		"start": 216,
		"end": 217,
		"match": ":"
	},
	{
		"type": "string",
		"start": 218,
		"end": 220,
		"match": "29"
	},
	{
		"type": "raw_markup",
		"start": 222,
		"end": 237,
		"match": "<!DOCTYPE html>"
	},
	{
		"type": "raw_markup",
		"start": 238,
		"end": 248,
		"match": "<p class=\""
	},
	{
		"type": "punctuation",
		"start": 248,
		"end": 250,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 250,
		"end": 253,
		"match": "cls"
	},
	{
		"type": "punctuation",
		"start": 253,
		"end": 255,
		"match": "}}"
	},
	{
		"type": "raw_markup",
		"start": 255,
		"end": 269,
		"match": "\">Hi & bye</p>"
	},
	{
		"type": "comment",
		"start": 270,
		"end": 294,
		"match": "# comment at column zero"
	},
	{
		"type": "raw_markup",
		"start": 295,
		"end": 315,
		"match": "  #id { color: red }"
	},
	{
		"type": "keyword",
		"start": 316,
		"end": 320,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 320,
		"end": 321,
		"match": "/"
	},
	{
		"type": "number",
		"start": 321,
		"end": 322,
		"match": "2"
	},
	{
		"type": "number",
		"start": 323,
		"end": 326,
		"match": "204"
	},
	{
		"type": "property",
		"start": 327,
		"end": 334,
		"match": "x-cache"
	},
	{
		"type": "punctuation",
		"start": 334,
		"end": 335,
		"match": ":"
	},
	{
		"type": "string",
		"start": 336,
		"end": 339,
		"match": "HIT"
	}
];
