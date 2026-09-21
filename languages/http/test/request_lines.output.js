export const test = [
	{
		"type": "url",
		"start": 0,
		"end": 30,
		"match": "https://example.com/comments/1"
	},
	{
		"type": "comment",
		"start": 31,
		"end": 34,
		"match": "###"
	},
	{
		"type": "url",
		"start": 35,
		"end": 56,
		"match": "localhost:8080/health"
	},
	{
		"type": "comment",
		"start": 57,
		"end": 60,
		"match": "###"
	},
	{
		"type": "keyword",
		"start": 61,
		"end": 68,
		"match": "OPTIONS"
	},
	{
		"type": "url",
		"start": 69,
		"end": 70,
		"match": "*"
	},
	{
		"type": "keyword",
		"start": 71,
		"end": 75,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 75,
		"end": 76,
		"match": "/"
	},
	{
		"type": "number",
		"start": 76,
		"end": 79,
		"match": "1.1"
	},
	{
		"type": "comment",
		"start": 80,
		"end": 83,
		"match": "###"
	},
	{
		"type": "keyword",
		"start": 84,
		"end": 91,
		"match": "CONNECT"
	},
	{
		"type": "url",
		"start": 92,
		"end": 107,
		"match": "example.com:443"
	},
	{
		"type": "keyword",
		"start": 108,
		"end": 112,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 112,
		"end": 113,
		"match": "/"
	},
	{
		"type": "number",
		"start": 113,
		"end": 116,
		"match": "1.1"
	},
	{
		"type": "comment",
		"start": 117,
		"end": 120,
		"match": "###"
	},
	{
		"type": "keyword",
		"start": 121,
		"end": 124,
		"match": "get"
	},
	{
		"type": "url",
		"start": 125,
		"end": 153,
		"match": "http://[::1]:8080/a%20b#frag"
	},
	{
		"type": "keyword",
		"start": 154,
		"end": 158,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 158,
		"end": 159,
		"match": "/"
	},
	{
		"type": "number",
		"start": 159,
		"end": 160,
		"match": "2"
	},
	{
		"type": "comment",
		"start": 161,
		"end": 164,
		"match": "###"
	},
	{
		"type": "keyword",
		"start": 165,
		"end": 181,
		"match": "BASELINE-CONTROL"
	},
	{
		"type": "url",
		"start": 182,
		"end": 184,
		"match": "/x"
	},
	{
		"type": "keyword",
		"start": 185,
		"end": 189,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 189,
		"end": 190,
		"match": "/"
	},
	{
		"type": "number",
		"start": 190,
		"end": 193,
		"match": "1.1"
	},
	{
		"type": "comment",
		"start": 194,
		"end": 197,
		"match": "###"
	},
	{
		"type": "url",
		"start": 198,
		"end": 218,
		"match": "HTTP://EXAMPLE.COM/x"
	},
	{
		"type": "comment",
		"start": 219,
		"end": 222,
		"match": "###"
	},
	{
		"type": "url",
		"start": 223,
		"end": 243,
		"match": "example.com/path?q=a"
	},
	{
		"type": "url",
		"start": 244,
		"end": 245,
		"match": "b"
	},
	{
		"type": "keyword",
		"start": 246,
		"end": 250,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 250,
		"end": 251,
		"match": "/"
	},
	{
		"type": "number",
		"start": 251,
		"end": 254,
		"match": "1.1"
	},
	{
		"type": "comment",
		"start": 255,
		"end": 258,
		"match": "###"
	},
	{
		"type": "url",
		"start": 259,
		"end": 271,
		"match": "/just/a/path"
	},
	{
		"type": "comment",
		"start": 272,
		"end": 275,
		"match": "###"
	},
	{
		"type": "punctuation",
		"start": 276,
		"end": 278,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 278,
		"end": 282,
		"match": "host"
	},
	{
		"type": "punctuation",
		"start": 282,
		"end": 284,
		"match": "}}"
	},
	{
		"type": "url",
		"start": 284,
		"end": 286,
		"match": "/x"
	},
	{
		"type": "comment",
		"start": 287,
		"end": 290,
		"match": "###"
	},
	{
		"type": "keyword",
		"start": 291,
		"end": 294,
		"match": "GET"
	},
	{
		"type": "url",
		"start": 295,
		"end": 314,
		"match": "https://x/search?q="
	},
	{
		"type": "punctuation",
		"start": 314,
		"end": 316,
		"match": "{{"
	},
	{
		"type": "builtin",
		"start": 316,
		"end": 325,
		"match": "$datetime"
	},
	{
		"type": "string",
		"start": 326,
		"end": 331,
		"match": "'YYYY"
	},
	{
		"type": "string",
		"start": 332,
		"end": 335,
		"match": "MM'"
	},
	{
		"type": "punctuation",
		"start": 335,
		"end": 337,
		"match": "}}"
	},
	{
		"type": "keyword",
		"start": 338,
		"end": 342,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 342,
		"end": 343,
		"match": "/"
	},
	{
		"type": "number",
		"start": 343,
		"end": 346,
		"match": "1.1"
	},
	{
		"type": "comment",
		"start": 347,
		"end": 350,
		"match": "###"
	},
	{
		"type": "keyword",
		"start": 351,
		"end": 354,
		"match": "PRI"
	},
	{
		"type": "url",
		"start": 355,
		"end": 356,
		"match": "*"
	},
	{
		"type": "keyword",
		"start": 357,
		"end": 361,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 361,
		"end": 362,
		"match": "/"
	},
	{
		"type": "number",
		"start": 362,
		"end": 365,
		"match": "2.0"
	},
	{
		"type": "comment",
		"start": 366,
		"end": 369,
		"match": "###"
	},
	{
		"type": "keyword",
		"start": 370,
		"end": 375,
		"match": "QUERY"
	},
	{
		"type": "url",
		"start": 376,
		"end": 385,
		"match": "/contacts"
	},
	{
		"type": "keyword",
		"start": 386,
		"end": 390,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 390,
		"end": 391,
		"match": "/"
	},
	{
		"type": "number",
		"start": 391,
		"end": 394,
		"match": "1.1"
	},
	{
		"type": "comment",
		"start": 395,
		"end": 398,
		"match": "###"
	},
	{
		"type": "property",
		"start": 399,
		"end": 409,
		"match": ":authority"
	},
	{
		"type": "punctuation",
		"start": 409,
		"end": 410,
		"match": ":"
	},
	{
		"type": "string",
		"start": 411,
		"end": 422,
		"match": "example.com"
	},
	{
		"type": "comment",
		"start": 423,
		"end": 426,
		"match": "###"
	},
	{
		"type": "property",
		"start": 427,
		"end": 439,
		"match": "content-type"
	},
	{
		"type": "punctuation",
		"start": 439,
		"end": 440,
		"match": ":"
	},
	{
		"type": "string",
		"start": 440,
		"end": 450,
		"match": "text/plain"
	},
	{
		"type": "comment",
		"start": 451,
		"end": 454,
		"match": "###"
	},
	{
		"type": "url",
		"start": 455,
		"end": 464,
		"match": "x-count:5"
	}
];
