export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 22,
		"match": "# build dependencies \\"
	},
	{
		"type": "keyword",
		"start": 23,
		"end": 27,
		"match": "FROM"
	},
	{
		"type": "string",
		"start": 28,
		"end": 34,
		"match": "alpine"
	},
	{
		"type": "keyword",
		"start": 35,
		"end": 38,
		"match": "RUN"
	},
	{
		"type": "string",
		"start": 39,
		"end": 43,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 44,
		"end": 49,
		"match": "hello"
	},
	{
		"type": "operator",
		"start": 50,
		"end": 52,
		"match": "\\\n"
	},
	{
		"type": "comment",
		"start": 54,
		"end": 69,
		"match": "# package cache"
	},
	{
		"type": "string",
		"start": 73,
		"end": 78,
		"match": "world"
	},
	{
		"type": "operator",
		"start": 79,
		"end": 81,
		"match": "&&"
	},
	{
		"type": "operator",
		"start": 82,
		"end": 84,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 86,
		"end": 90,
		"match": "echo"
	},
	{
		"type": "string",
		"start": 91,
		"end": 98,
		"match": "goodbye"
	},
	{
		"type": "keyword",
		"start": 99,
		"end": 110,
		"match": "HEALTHCHECK"
	},
	{
		"type": "property",
		"start": 111,
		"end": 121,
		"match": "--interval"
	},
	{
		"type": "operator",
		"start": 121,
		"end": 122,
		"match": "="
	},
	{
		"type": "string",
		"start": 122,
		"end": 124,
		"match": "5m"
	},
	{
		"type": "property",
		"start": 125,
		"end": 134,
		"match": "--timeout"
	},
	{
		"type": "operator",
		"start": 134,
		"end": 135,
		"match": "="
	},
	{
		"type": "string",
		"start": 135,
		"end": 137,
		"match": "3s"
	},
	{
		"type": "operator",
		"start": 138,
		"end": 140,
		"match": "\\\n"
	},
	{
		"type": "keyword",
		"start": 142,
		"end": 145,
		"match": "CMD"
	},
	{
		"type": "string",
		"start": 146,
		"end": 150,
		"match": "curl"
	},
	{
		"type": "string",
		"start": 151,
		"end": 153,
		"match": "-f"
	},
	{
		"type": "string",
		"start": 154,
		"end": 171,
		"match": "http://localhost/"
	},
	{
		"type": "operator",
		"start": 172,
		"end": 174,
		"match": "||"
	},
	{
		"type": "string",
		"start": 175,
		"end": 179,
		"match": "exit"
	},
	{
		"type": "string",
		"start": 180,
		"end": 181,
		"match": "1"
	},
	{
		"type": "keyword",
		"start": 182,
		"end": 189,
		"match": "ONBUILD"
	},
	{
		"type": "operator",
		"start": 190,
		"end": 192,
		"match": "\\\n"
	},
	{
		"type": "keyword",
		"start": 194,
		"end": 198,
		"match": "COPY"
	},
	{
		"type": "property",
		"start": 199,
		"end": 205,
		"match": "--from"
	},
	{
		"type": "operator",
		"start": 205,
		"end": 206,
		"match": "="
	},
	{
		"type": "string",
		"start": 206,
		"end": 211,
		"match": "build"
	},
	{
		"type": "operator",
		"start": 212,
		"end": 214,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 216,
		"end": 220,
		"match": "/out"
	},
	{
		"type": "string",
		"start": 221,
		"end": 225,
		"match": "/app"
	},
	{
		"type": "keyword",
		"start": 226,
		"end": 229,
		"match": "ENV"
	},
	{
		"type": "property",
		"start": 230,
		"end": 237,
		"match": "MESSAGE"
	},
	{
		"type": "operator",
		"start": 237,
		"end": 238,
		"match": "="
	},
	{
		"type": "string",
		"start": 238,
		"end": 245,
		"match": "\"hello "
	},
	{
		"type": "operator",
		"start": 245,
		"end": 247,
		"match": "\\\n"
	},
	{
		"type": "comment",
		"start": 249,
		"end": 258,
		"match": "# message"
	},
	{
		"type": "string",
		"start": 261,
		"end": 267,
		"match": "world\""
	},
	{
		"type": "property",
		"start": 268,
		"end": 273,
		"match": "OTHER"
	},
	{
		"type": "operator",
		"start": 273,
		"end": 274,
		"match": "="
	},
	{
		"type": "string",
		"start": 274,
		"end": 279,
		"match": "'one "
	},
	{
		"type": "operator",
		"start": 279,
		"end": 281,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 283,
		"end": 287,
		"match": "two'"
	},
	{
		"type": "keyword",
		"start": 288,
		"end": 291,
		"match": "RUN"
	},
	{
		"type": "punctuation",
		"start": 292,
		"end": 293,
		"match": "["
	},
	{
		"type": "string",
		"start": 293,
		"end": 299,
		"match": "\"echo\""
	},
	{
		"type": "punctuation",
		"start": 299,
		"end": 300,
		"match": ","
	},
	{
		"type": "operator",
		"start": 301,
		"end": 303,
		"match": "\\\n"
	},
	{
		"type": "comment",
		"start": 305,
		"end": 322,
		"match": "# default command"
	},
	{
		"type": "string",
		"start": 325,
		"end": 332,
		"match": "\"$HOME\""
	},
	{
		"type": "punctuation",
		"start": 332,
		"end": 333,
		"match": "]"
	},
	{
		"type": "keyword",
		"start": 334,
		"end": 338,
		"match": "FROM"
	},
	{
		"type": "string",
		"start": 339,
		"end": 345,
		"match": "alpine"
	},
	{
		"type": "keyword",
		"start": 346,
		"end": 348,
		"match": "AS"
	},
	{
		"type": "operator",
		"start": 349,
		"end": 351,
		"match": "\\\n"
	},
	{
		"type": "string",
		"start": 353,
		"end": 363,
		"match": "production"
	},
	{
		"type": "keyword",
		"start": 364,
		"end": 368,
		"match": "COPY"
	},
	{
		"type": "string",
		"start": 369,
		"end": 373,
		"match": "file"
	},
	{
		"type": "string",
		"start": 374,
		"end": 379,
		"match": "/file"
	}
];
