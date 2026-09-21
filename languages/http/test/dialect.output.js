export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 20,
		"match": "# file-level comment"
	},
	{
		"type": "comment",
		"start": 21,
		"end": 31,
		"match": "// another"
	},
	{
		"type": "keyword",
		"start": 32,
		"end": 33,
		"match": "@"
	},
	{
		"type": "variable",
		"start": 33,
		"end": 37,
		"match": "host"
	},
	{
		"type": "operator",
		"start": 38,
		"end": 39,
		"match": "="
	},
	{
		"type": "string",
		"start": 40,
		"end": 55,
		"match": "api.example.com"
	},
	{
		"type": "keyword",
		"start": 56,
		"end": 57,
		"match": "@"
	},
	{
		"type": "variable",
		"start": 57,
		"end": 62,
		"match": "token"
	},
	{
		"type": "operator",
		"start": 62,
		"end": 63,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 63,
		"end": 65,
		"match": "{{"
	},
	{
		"type": "builtin",
		"start": 65,
		"end": 76,
		"match": "$processEnv"
	},
	{
		"type": "string",
		"start": 77,
		"end": 87,
		"match": "%TOKEN_KEY"
	},
	{
		"type": "punctuation",
		"start": 87,
		"end": 89,
		"match": "}}"
	},
	{
		"type": "keyword",
		"start": 90,
		"end": 91,
		"match": "@"
	},
	{
		"type": "comment",
		"start": 110,
		"end": 129,
		"match": "### named separator"
	},
	{
		"type": "comment",
		"start": 130,
		"end": 132,
		"match": "# "
	},
	{
		"type": "decorator",
		"start": 132,
		"end": 133,
		"match": "@"
	},
	{
		"type": "decorator",
		"start": 133,
		"end": 137,
		"match": "name"
	},
	{
		"type": "comment",
		"start": 137,
		"end": 138,
		"match": " "
	},
	{
		"type": "variable",
		"start": 138,
		"end": 148,
		"match": "createUser"
	},
	{
		"type": "comment",
		"start": 149,
		"end": 151,
		"match": "# "
	},
	{
		"type": "decorator",
		"start": 151,
		"end": 163,
		"match": "@no-redirect"
	},
	{
		"type": "comment",
		"start": 164,
		"end": 167,
		"match": "// "
	},
	{
		"type": "decorator",
		"start": 167,
		"end": 175,
		"match": "@timeout"
	},
	{
		"type": "comment",
		"start": 175,
		"end": 179,
		"match": " 600"
	},
	{
		"type": "keyword",
		"start": 180,
		"end": 184,
		"match": "POST"
	},
	{
		"type": "url",
		"start": 185,
		"end": 193,
		"match": "https://"
	},
	{
		"type": "punctuation",
		"start": 193,
		"end": 195,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 195,
		"end": 199,
		"match": "host"
	},
	{
		"type": "punctuation",
		"start": 199,
		"end": 201,
		"match": "}}"
	},
	{
		"type": "url",
		"start": 201,
		"end": 215,
		"match": "/users?source="
	},
	{
		"type": "punctuation",
		"start": 215,
		"end": 217,
		"match": "{{"
	},
	{
		"type": "builtin",
		"start": 217,
		"end": 227,
		"match": "$randomInt"
	},
	{
		"type": "string",
		"start": 228,
		"end": 229,
		"match": "1"
	},
	{
		"type": "string",
		"start": 230,
		"end": 232,
		"match": "10"
	},
	{
		"type": "punctuation",
		"start": 232,
		"end": 234,
		"match": "}}"
	},
	{
		"type": "keyword",
		"start": 235,
		"end": 239,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 239,
		"end": 240,
		"match": "/"
	},
	{
		"type": "number",
		"start": 240,
		"end": 243,
		"match": "1.1"
	},
	{
		"type": "property",
		"start": 244,
		"end": 257,
		"match": "Authorization"
	},
	{
		"type": "punctuation",
		"start": 257,
		"end": 258,
		"match": ":"
	},
	{
		"type": "string",
		"start": 259,
		"end": 266,
		"match": "Bearer "
	},
	{
		"type": "punctuation",
		"start": 266,
		"end": 268,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 268,
		"end": 273,
		"match": "token"
	},
	{
		"type": "punctuation",
		"start": 273,
		"end": 275,
		"match": "}}"
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
		"end": 291,
		"match": "dynamicHeader"
	},
	{
		"type": "punctuation",
		"start": 291,
		"end": 293,
		"match": "}}"
	},
	{
		"type": "punctuation",
		"start": 293,
		"end": 294,
		"match": ":"
	},
	{
		"type": "string",
		"start": 295,
		"end": 300,
		"match": "value"
	},
	{
		"type": "comment",
		"start": 301,
		"end": 317,
		"match": "# header comment"
	},
	{
		"type": "operator",
		"start": 319,
		"end": 327,
		"match": "<@latin1"
	},
	{
		"type": "string",
		"start": 328,
		"end": 342,
		"match": "./payload.json"
	},
	{
		"type": "comment",
		"start": 344,
		"end": 347,
		"match": "###"
	},
	{
		"type": "keyword",
		"start": 348,
		"end": 351,
		"match": "GET"
	},
	{
		"type": "url",
		"start": 352,
		"end": 360,
		"match": "https://"
	},
	{
		"type": "punctuation",
		"start": 360,
		"end": 362,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 362,
		"end": 366,
		"match": "host"
	},
	{
		"type": "punctuation",
		"start": 366,
		"end": 368,
		"match": "}}"
	},
	{
		"type": "url",
		"start": 368,
		"end": 374,
		"match": "/users"
	},
	{
		"type": "url",
		"start": 379,
		"end": 386,
		"match": "?page=2"
	},
	{
		"type": "url",
		"start": 391,
		"end": 397,
		"match": "&size="
	},
	{
		"type": "punctuation",
		"start": 397,
		"end": 399,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 400,
		"end": 404,
		"match": "size"
	},
	{
		"type": "punctuation",
		"start": 405,
		"end": 407,
		"match": "}}"
	},
	{
		"type": "comment",
		"start": 410,
		"end": 428,
		"match": "# indented comment"
	},
	{
		"type": "property",
		"start": 429,
		"end": 435,
		"match": "Accept"
	},
	{
		"type": "punctuation",
		"start": 435,
		"end": 436,
		"match": ":"
	},
	{
		"type": "string",
		"start": 437,
		"end": 453,
		"match": "application/json"
	},
	{
		"type": "operator",
		"start": 455,
		"end": 458,
		"match": "<> "
	},
	{
		"type": "string",
		"start": 458,
		"end": 484,
		"match": "previous-response.200.json"
	},
	{
		"type": "operator",
		"start": 485,
		"end": 487,
		"match": ">>"
	},
	{
		"type": "string",
		"start": 488,
		"end": 498,
		"match": "./out.json"
	},
	{
		"type": "comment",
		"start": 500,
		"end": 503,
		"match": "###"
	},
	{
		"type": "raw_shell",
		"start": 504,
		"end": 588,
		"match": "curl -X DELETE https://api.example.com/users/1 \\\n  -H \"Authorization: Bearer token\"\n"
	},
	{
		"type": "comment",
		"start": 589,
		"end": 592,
		"match": "###"
	},
	{
		"type": "keyword",
		"start": 593,
		"end": 602,
		"match": "WEBSOCKET"
	},
	{
		"type": "url",
		"start": 603,
		"end": 625,
		"match": "ws://localhost:8080/ws"
	},
	{
		"type": "label",
		"start": 633,
		"end": 652,
		"match": "=== wait-for-server"
	},
	{
		"type": "label",
		"start": 670,
		"end": 673,
		"match": "==="
	},
	{
		"type": "comment",
		"start": 675,
		"end": 678,
		"match": "###"
	},
	{
		"type": "keyword",
		"start": 679,
		"end": 683,
		"match": "POST"
	},
	{
		"type": "url",
		"start": 684,
		"end": 689,
		"match": "/form"
	},
	{
		"type": "property",
		"start": 690,
		"end": 702,
		"match": "Content-Type"
	},
	{
		"type": "punctuation",
		"start": 702,
		"end": 703,
		"match": ":"
	},
	{
		"type": "string",
		"start": 704,
		"end": 771,
		"match": "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW"
	},
	{
		"type": "label",
		"start": 773,
		"end": 812,
		"match": "------WebKitFormBoundary7MA4YWxkTrZu0gW"
	},
	{
		"type": "property",
		"start": 813,
		"end": 832,
		"match": "Content-Disposition"
	},
	{
		"type": "punctuation",
		"start": 832,
		"end": 833,
		"match": ":"
	},
	{
		"type": "string",
		"start": 834,
		"end": 856,
		"match": "form-data; name=\"text\""
	},
	{
		"type": "label",
		"start": 879,
		"end": 920,
		"match": "------WebKitFormBoundary7MA4YWxkTrZu0gW--"
	}
];
