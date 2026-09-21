export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 4,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 4,
		"end": 5,
		"match": "/"
	},
	{
		"type": "number",
		"start": 5,
		"end": 8,
		"match": "1.1"
	},
	{
		"type": "number",
		"start": 9,
		"end": 12,
		"match": "401"
	},
	{
		"type": "string",
		"start": 13,
		"end": 25,
		"match": "Unauthorized"
	},
	{
		"type": "property",
		"start": 26,
		"end": 30,
		"match": "Date"
	},
	{
		"type": "punctuation",
		"start": 30,
		"end": 31,
		"match": ":"
	},
	{
		"type": "string",
		"start": 32,
		"end": 61,
		"match": "Mon, 21 Sep 2026 14:28:00 GMT"
	},
	{
		"type": "property",
		"start": 62,
		"end": 78,
		"match": "WWW-Authenticate"
	},
	{
		"type": "punctuation",
		"start": 78,
		"end": 79,
		"match": ":"
	},
	{
		"type": "string",
		"start": 80,
		"end": 123,
		"match": "Basic realm=\"simple\", Newauth realm=\"apps\","
	},
	{
		"type": "string",
		"start": 141,
		"end": 174,
		"match": "type=1, title=\"Login to \\\"apps\\\"\""
	},
	{
		"type": "property",
		"start": 175,
		"end": 185,
		"match": "Set-Cookie"
	},
	{
		"type": "punctuation",
		"start": 185,
		"end": 186,
		"match": ":"
	},
	{
		"type": "string",
		"start": 187,
		"end": 252,
		"match": "sid=31d4; Path=/; Expires=Wed, 09 Jun 2027 10:18:14 GMT; HttpOnly"
	},
	{
		"type": "property",
		"start": 253,
		"end": 265,
		"match": "Cache-Status"
	},
	{
		"type": "punctuation",
		"start": 265,
		"end": 266,
		"match": ":"
	},
	{
		"type": "string",
		"start": 267,
		"end": 317,
		"match": "OriginCache; hit; ttl=1100, \"CDN Co\"; fwd=uri-miss"
	},
	{
		"type": "property",
		"start": 318,
		"end": 330,
		"match": "Content-Type"
	},
	{
		"type": "punctuation",
		"start": 330,
		"end": 331,
		"match": ":"
	},
	{
		"type": "string",
		"start": 332,
		"end": 356,
		"match": "text/html; charset=utf-8"
	},
	{
		"type": "raw_markup",
		"start": 358,
		"end": 383,
		"match": "<h1>401 &mdash; nope</h1>"
	}
];
