export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 10,
		"match": "### Upload"
	},
	{
		"type": "operator",
		"start": 11,
		"end": 12,
		"match": "<"
	},
	{
		"type": "punctuation",
		"start": 13,
		"end": 15,
		"match": "{%"
	},
	{
		"type": "raw_script",
		"start": 15,
		"end": 58,
		"match": "\n  request.variables.set(\"ts\", $timestamp)\n"
	},
	{
		"type": "punctuation",
		"start": 58,
		"end": 60,
		"match": "%}"
	},
	{
		"type": "keyword",
		"start": 61,
		"end": 65,
		"match": "POST"
	},
	{
		"type": "url",
		"start": 66,
		"end": 87,
		"match": "http://localhost:8080"
	},
	{
		"type": "url",
		"start": 92,
		"end": 96,
		"match": "/api"
	},
	{
		"type": "url",
		"start": 101,
		"end": 113,
		"match": "/upload?tag="
	},
	{
		"type": "punctuation",
		"start": 113,
		"end": 115,
		"match": "{{"
	},
	{
		"type": "variable",
		"start": 115,
		"end": 117,
		"match": "ts"
	},
	{
		"type": "punctuation",
		"start": 117,
		"end": 119,
		"match": "}}"
	},
	{
		"type": "property",
		"start": 120,
		"end": 132,
		"match": "Content-Type"
	},
	{
		"type": "punctuation",
		"start": 132,
		"end": 133,
		"match": ":"
	},
	{
		"type": "string",
		"start": 134,
		"end": 178,
		"match": "multipart/form-data; boundary=WebAppBoundary"
	},
	{
		"type": "label",
		"start": 180,
		"end": 196,
		"match": "--WebAppBoundary"
	},
	{
		"type": "property",
		"start": 197,
		"end": 216,
		"match": "Content-Disposition"
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
		"end": 240,
		"match": "form-data; name=\"meta\""
	},
	{
		"type": "property",
		"start": 241,
		"end": 253,
		"match": "Content-Type"
	},
	{
		"type": "punctuation",
		"start": 253,
		"end": 254,
		"match": ":"
	},
	{
		"type": "string",
		"start": 255,
		"end": 271,
		"match": "application/json"
	},
	{
		"type": "raw_json",
		"start": 273,
		"end": 283,
		"match": "{\"k\": \"v\"}"
	},
	{
		"type": "label",
		"start": 284,
		"end": 300,
		"match": "--WebAppBoundary"
	},
	{
		"type": "property",
		"start": 301,
		"end": 320,
		"match": "Content-Disposition"
	},
	{
		"type": "punctuation",
		"start": 320,
		"end": 321,
		"match": ":"
	},
	{
		"type": "string",
		"start": 322,
		"end": 362,
		"match": "form-data; name=\"file\"; filename=\"a.txt\""
	},
	{
		"type": "operator",
		"start": 364,
		"end": 366,
		"match": "< "
	},
	{
		"type": "string",
		"start": 366,
		"end": 373,
		"match": "./a.txt"
	},
	{
		"type": "label",
		"start": 374,
		"end": 392,
		"match": "--WebAppBoundary--"
	},
	{
		"type": "operator",
		"start": 394,
		"end": 397,
		"match": ">>!"
	},
	{
		"type": "punctuation",
		"start": 398,
		"end": 400,
		"match": "{{"
	},
	{
		"type": "builtin",
		"start": 400,
		"end": 414,
		"match": "$historyFolder"
	},
	{
		"type": "punctuation",
		"start": 414,
		"end": 416,
		"match": "}}"
	},
	{
		"type": "string",
		"start": 416,
		"end": 428,
		"match": "/upload.json"
	}
];
