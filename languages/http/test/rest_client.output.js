export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 1,
		"match": "@"
	},
	{
		"type": "variable",
		"start": 1,
		"end": 8,
		"match": "baseUrl"
	},
	{
		"type": "operator",
		"start": 9,
		"end": 10,
		"match": "="
	},
	{
		"type": "string",
		"start": 11,
		"end": 37,
		"match": "https://api.example.com/v1"
	},
	{
		"type": "keyword",
		"start": 38,
		"end": 39,
		"match": "@"
	},
	{
		"type": "variable",
		"start": 39,
		"end": 44,
		"match": "token"
	},
	{
		"type": "operator",
		"start": 45,
		"end": 46,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 47,
		"end": 49,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 49,
		"end": 83,
		"match": "login.response.body.$.access_token"
	},
	{
		"type": "punctuation",
		"start": 83,
		"end": 85,
		"match": "}}"
	},
	{
		"type": "comment",
		"start": 87,
		"end": 97,
		"match": "### Log in"
	},
	{
		"type": "comment",
		"start": 98,
		"end": 100,
		"match": "# "
	},
	{
		"type": "decorator",
		"start": 100,
		"end": 101,
		"match": "@"
	},
	{
		"type": "decorator",
		"start": 101,
		"end": 105,
		"match": "name"
	},
	{
		"type": "comment",
		"start": 105,
		"end": 106,
		"match": " "
	},
	{
		"type": "variable",
		"start": 106,
		"end": 111,
		"match": "login"
	},
	{
		"type": "keyword",
		"start": 112,
		"end": 116,
		"match": "POST"
	},
	{
		"type": "punctuation",
		"start": 117,
		"end": 119,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 119,
		"end": 126,
		"match": "baseUrl"
	},
	{
		"type": "punctuation",
		"start": 126,
		"end": 128,
		"match": "}}"
	},
	{
		"type": "url",
		"start": 128,
		"end": 139,
		"match": "/auth/login"
	},
	{
		"type": "keyword",
		"start": 140,
		"end": 144,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 144,
		"end": 145,
		"match": "/"
	},
	{
		"type": "number",
		"start": 145,
		"end": 148,
		"match": "1.1"
	},
	{
		"type": "property",
		"start": 149,
		"end": 161,
		"match": "Content-Type"
	},
	{
		"type": "punctuation",
		"start": 161,
		"end": 162,
		"match": ":"
	},
	{
		"type": "string",
		"start": 163,
		"end": 196,
		"match": "application/x-www-form-urlencoded"
	},
	{
		"type": "punctuation",
		"start": 217,
		"end": 219,
		"match": "{{"
	},
	{
		"type": "builtin",
		"start": 219,
		"end": 226,
		"match": "$dotenv"
	},
	{
		"type": "string",
		"start": 227,
		"end": 235,
		"match": "PASSWORD"
	},
	{
		"type": "punctuation",
		"start": 235,
		"end": 237,
		"match": "}}"
	},
	{
		"type": "comment",
		"start": 239,
		"end": 242,
		"match": "###"
	},
	{
		"type": "comment",
		"start": 243,
		"end": 246,
		"match": "// "
	},
	{
		"type": "decorator",
		"start": 246,
		"end": 247,
		"match": "@"
	},
	{
		"type": "decorator",
		"start": 247,
		"end": 253,
		"match": "prompt"
	},
	{
		"type": "comment",
		"start": 253,
		"end": 254,
		"match": " "
	},
	{
		"type": "variable",
		"start": 254,
		"end": 257,
		"match": "otp"
	},
	{
		"type": "comment",
		"start": 257,
		"end": 280,
		"match": " Your one-time password"
	},
	{
		"type": "keyword",
		"start": 281,
		"end": 284,
		"match": "GET"
	},
	{
		"type": "punctuation",
		"start": 285,
		"end": 287,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 287,
		"end": 294,
		"match": "baseUrl"
	},
	{
		"type": "punctuation",
		"start": 294,
		"end": 296,
		"match": "}}"
	},
	{
		"type": "url",
		"start": 296,
		"end": 305,
		"match": "/comments"
	},
	{
		"type": "url",
		"start": 310,
		"end": 317,
		"match": "?page=2"
	},
	{
		"type": "url",
		"start": 322,
		"end": 332,
		"match": "&pageSize="
	},
	{
		"type": "punctuation",
		"start": 332,
		"end": 334,
		"match": "{{"
	},
	{
		"type": "builtin",
		"start": 334,
		"end": 344,
		"match": "$randomInt"
	},
	{
		"type": "string",
		"start": 345,
		"end": 346,
		"match": "5"
	},
	{
		"type": "string",
		"start": 347,
		"end": 349,
		"match": "20"
	},
	{
		"type": "punctuation",
		"start": 349,
		"end": 351,
		"match": "}}"
	},
	{
		"type": "property",
		"start": 352,
		"end": 365,
		"match": "Authorization"
	},
	{
		"type": "punctuation",
		"start": 365,
		"end": 366,
		"match": ":"
	},
	{
		"type": "string",
		"start": 367,
		"end": 374,
		"match": "Bearer "
	},
	{
		"type": "punctuation",
		"start": 374,
		"end": 376,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 376,
		"end": 381,
		"match": "token"
	},
	{
		"type": "punctuation",
		"start": 381,
		"end": 383,
		"match": "}}"
	},
	{
		"type": "comment",
		"start": 385,
		"end": 388,
		"match": "###"
	},
	{
		"type": "keyword",
		"start": 389,
		"end": 394,
		"match": "PATCH"
	},
	{
		"type": "url",
		"start": 395,
		"end": 423,
		"match": "https://example.com/items/42"
	},
	{
		"type": "property",
		"start": 424,
		"end": 436,
		"match": "Content-Type"
	},
	{
		"type": "punctuation",
		"start": 436,
		"end": 437,
		"match": ":"
	},
	{
		"type": "string",
		"start": 438,
		"end": 454,
		"match": "application/json"
	},
	{
		"type": "raw_json",
		"start": 456,
		"end": 457,
		"match": "{"
	},
	{
		"type": "raw_json",
		"start": 458,
		"end": 469,
		"match": "  \"when\": \""
	},
	{
		"type": "punctuation",
		"start": 469,
		"end": 471,
		"match": "{{"
	},
	{
		"type": "builtin",
		"start": 471,
		"end": 480,
		"match": "$datetime"
	},
	{
		"type": "string",
		"start": 481,
		"end": 493,
		"match": "'YYYY-MM-DD'"
	},
	{
		"type": "string",
		"start": 494,
		"end": 495,
		"match": "1"
	},
	{
		"type": "string",
		"start": 496,
		"end": 497,
		"match": "d"
	},
	{
		"type": "punctuation",
		"start": 497,
		"end": 499,
		"match": "}}"
	},
	{
		"type": "raw_json",
		"start": 499,
		"end": 501,
		"match": "\","
	},
	{
		"type": "raw_json",
		"start": 502,
		"end": 530,
		"match": "  \"note\": \"# not a comment\","
	},
	{
		"type": "raw_json",
		"start": 531,
		"end": 533,
		"match": "  "
	},
	{
		"type": "comment",
		"start": 533,
		"end": 557,
		"match": "// dropped by the client"
	},
	{
		"type": "raw_json",
		"start": 558,
		"end": 582,
		"match": "  \"list\": [1, 2.5e3, -7]"
	},
	{
		"type": "raw_json",
		"start": 583,
		"end": 584,
		"match": "}"
	},
	{
		"type": "operator",
		"start": 586,
		"end": 588,
		"match": "> "
	},
	{
		"type": "punctuation",
		"start": 588,
		"end": 590,
		"match": "{%"
	},
	{
		"type": "raw_script",
		"start": 590,
		"end": 634,
		"match": " client.global.set(\"id\", response.body.id); "
	},
	{
		"type": "punctuation",
		"start": 634,
		"end": 636,
		"match": "%}"
	}
];
