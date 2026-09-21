export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 4,
		"match": "POST"
	},
	{
		"type": "url",
		"start": 5,
		"end": 49,
		"match": "/api/v2/users?filter=active&sort=-created_at"
	},
	{
		"type": "keyword",
		"start": 50,
		"end": 54,
		"match": "HTTP"
	},
	{
		"type": "punctuation",
		"start": 54,
		"end": 55,
		"match": "/"
	},
	{
		"type": "number",
		"start": 55,
		"end": 58,
		"match": "1.1"
	},
	{
		"type": "property",
		"start": 59,
		"end": 63,
		"match": "Host"
	},
	{
		"type": "punctuation",
		"start": 63,
		"end": 64,
		"match": ":"
	},
	{
		"type": "string",
		"start": 65,
		"end": 85,
		"match": "api.example.com:8443"
	},
	{
		"type": "property",
		"start": 86,
		"end": 96,
		"match": "User-Agent"
	},
	{
		"type": "punctuation",
		"start": 96,
		"end": 97,
		"match": ":"
	},
	{
		"type": "string",
		"start": 98,
		"end": 136,
		"match": "curl/8.4.0 (x86_64; (nested \\) paren))"
	},
	{
		"type": "property",
		"start": 137,
		"end": 143,
		"match": "Accept"
	},
	{
		"type": "punctuation",
		"start": 143,
		"end": 144,
		"match": ":"
	},
	{
		"type": "string",
		"start": 145,
		"end": 178,
		"match": "application/json;q=0.9, */*;q=0.1"
	},
	{
		"type": "property",
		"start": 179,
		"end": 191,
		"match": "Content-Type"
	},
	{
		"type": "punctuation",
		"start": 191,
		"end": 192,
		"match": ":"
	},
	{
		"type": "string",
		"start": 193,
		"end": 226,
		"match": "application/json; charset=\"utf-8\""
	},
	{
		"type": "property",
		"start": 227,
		"end": 240,
		"match": "If-None-Match"
	},
	{
		"type": "punctuation",
		"start": 240,
		"end": 241,
		"match": ":"
	},
	{
		"type": "string",
		"start": 242,
		"end": 262,
		"match": "W/\"67ab43\", \"54ed21\""
	},
	{
		"type": "property",
		"start": 263,
		"end": 271,
		"match": "X-Folded"
	},
	{
		"type": "punctuation",
		"start": 271,
		"end": 272,
		"match": ":"
	},
	{
		"type": "string",
		"start": 273,
		"end": 283,
		"match": "first part"
	},
	{
		"type": "string",
		"start": 286,
		"end": 302,
		"match": "continued \"part\""
	},
	{
		"type": "property",
		"start": 303,
		"end": 317,
		"match": "Content-Length"
	},
	{
		"type": "punctuation",
		"start": 317,
		"end": 318,
		"match": ":"
	},
	{
		"type": "string",
		"start": 319,
		"end": 321,
		"match": "32"
	},
	{
		"type": "raw_json",
		"start": 323,
		"end": 355,
		"match": "{\"name\": \"Ada\", \"tags\": [\"ops\"]}"
	}
];
