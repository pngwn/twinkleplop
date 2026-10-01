export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 56,
		"match": "# Named, anonymous, mutation and subscription operations"
	},
	{
		"type": "keyword",
		"start": 57,
		"end": 62,
		"match": "query"
	},
	{
		"type": "identifier",
		"start": 63,
		"end": 70,
		"match": "GetUser"
	},
	{
		"type": "punctuation",
		"start": 70,
		"end": 71,
		"match": "("
	},
	{
		"type": "variable",
		"start": 71,
		"end": 74,
		"match": "$id"
	},
	{
		"type": "punctuation",
		"start": 74,
		"end": 75,
		"match": ":"
	},
	{
		"type": "type",
		"start": 76,
		"end": 78,
		"match": "ID"
	},
	{
		"type": "operator",
		"start": 78,
		"end": 79,
		"match": "!"
	},
	{
		"type": "punctuation",
		"start": 79,
		"end": 80,
		"match": ","
	},
	{
		"type": "variable",
		"start": 81,
		"end": 87,
		"match": "$sizes"
	},
	{
		"type": "punctuation",
		"start": 87,
		"end": 88,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 89,
		"end": 90,
		"match": "["
	},
	{
		"type": "type",
		"start": 90,
		"end": 93,
		"match": "Int"
	},
	{
		"type": "operator",
		"start": 93,
		"end": 94,
		"match": "!"
	},
	{
		"type": "punctuation",
		"start": 94,
		"end": 95,
		"match": "]"
	},
	{
		"type": "operator",
		"start": 95,
		"end": 96,
		"match": "!"
	},
	{
		"type": "operator",
		"start": 97,
		"end": 98,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 99,
		"end": 100,
		"match": "["
	},
	{
		"type": "number",
		"start": 100,
		"end": 102,
		"match": "32"
	},
	{
		"type": "punctuation",
		"start": 102,
		"end": 103,
		"match": ","
	},
	{
		"type": "number",
		"start": 104,
		"end": 106,
		"match": "64"
	},
	{
		"type": "punctuation",
		"start": 106,
		"end": 108,
		"match": "],"
	},
	{
		"type": "variable",
		"start": 109,
		"end": 121,
		"match": "$withFriends"
	},
	{
		"type": "punctuation",
		"start": 121,
		"end": 122,
		"match": ":"
	},
	{
		"type": "type",
		"start": 123,
		"end": 130,
		"match": "Boolean"
	},
	{
		"type": "operator",
		"start": 131,
		"end": 132,
		"match": "="
	},
	{
		"type": "boolean",
		"start": 133,
		"end": 137,
		"match": "true"
	},
	{
		"type": "punctuation",
		"start": 137,
		"end": 138,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 139,
		"end": 140,
		"match": "{"
	},
	{
		"type": "property",
		"start": 143,
		"end": 149,
		"match": "viewer"
	},
	{
		"type": "punctuation",
		"start": 149,
		"end": 150,
		"match": ":"
	},
	{
		"type": "property",
		"start": 151,
		"end": 155,
		"match": "user"
	},
	{
		"type": "punctuation",
		"start": 155,
		"end": 156,
		"match": "("
	},
	{
		"type": "property",
		"start": 156,
		"end": 158,
		"match": "id"
	},
	{
		"type": "punctuation",
		"start": 158,
		"end": 159,
		"match": ":"
	},
	{
		"type": "variable",
		"start": 160,
		"end": 163,
		"match": "$id"
	},
	{
		"type": "punctuation",
		"start": 163,
		"end": 164,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 165,
		"end": 166,
		"match": "{"
	},
	{
		"type": "property",
		"start": 171,
		"end": 181,
		"match": "__typename"
	},
	{
		"type": "property",
		"start": 186,
		"end": 188,
		"match": "id"
	},
	{
		"type": "property",
		"start": 193,
		"end": 197,
		"match": "name"
	},
	{
		"type": "property",
		"start": 202,
		"end": 212,
		"match": "profilePic"
	},
	{
		"type": "punctuation",
		"start": 212,
		"end": 213,
		"match": "("
	},
	{
		"type": "property",
		"start": 213,
		"end": 217,
		"match": "size"
	},
	{
		"type": "punctuation",
		"start": 217,
		"end": 218,
		"match": ":"
	},
	{
		"type": "number",
		"start": 219,
		"end": 221,
		"match": "50"
	},
	{
		"type": "punctuation",
		"start": 221,
		"end": 222,
		"match": ")"
	},
	{
		"type": "property",
		"start": 227,
		"end": 234,
		"match": "friends"
	},
	{
		"type": "decorator",
		"start": 235,
		"end": 243,
		"match": "@include"
	},
	{
		"type": "punctuation",
		"start": 243,
		"end": 244,
		"match": "("
	},
	{
		"type": "property",
		"start": 244,
		"end": 246,
		"match": "if"
	},
	{
		"type": "punctuation",
		"start": 246,
		"end": 247,
		"match": ":"
	},
	{
		"type": "variable",
		"start": 248,
		"end": 260,
		"match": "$withFriends"
	},
	{
		"type": "punctuation",
		"start": 260,
		"end": 261,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 262,
		"end": 263,
		"match": "{"
	},
	{
		"type": "operator",
		"start": 270,
		"end": 273,
		"match": "..."
	},
	{
		"type": "identifier",
		"start": 273,
		"end": 285,
		"match": "FriendFields"
	},
	{
		"type": "operator",
		"start": 292,
		"end": 295,
		"match": "..."
	},
	{
		"type": "keyword",
		"start": 296,
		"end": 298,
		"match": "on"
	},
	{
		"type": "type",
		"start": 299,
		"end": 304,
		"match": "Admin"
	},
	{
		"type": "punctuation",
		"start": 305,
		"end": 306,
		"match": "{"
	},
	{
		"type": "property",
		"start": 307,
		"end": 318,
		"match": "permissions"
	},
	{
		"type": "punctuation",
		"start": 319,
		"end": 320,
		"match": "}"
	},
	{
		"type": "operator",
		"start": 327,
		"end": 330,
		"match": "..."
	},
	{
		"type": "decorator",
		"start": 331,
		"end": 336,
		"match": "@skip"
	},
	{
		"type": "punctuation",
		"start": 336,
		"end": 337,
		"match": "("
	},
	{
		"type": "property",
		"start": 337,
		"end": 339,
		"match": "if"
	},
	{
		"type": "punctuation",
		"start": 339,
		"end": 340,
		"match": ":"
	},
	{
		"type": "boolean",
		"start": 341,
		"end": 346,
		"match": "false"
	},
	{
		"type": "punctuation",
		"start": 346,
		"end": 347,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 348,
		"end": 349,
		"match": "{"
	},
	{
		"type": "property",
		"start": 350,
		"end": 356,
		"match": "active"
	},
	{
		"type": "punctuation",
		"start": 357,
		"end": 358,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 363,
		"end": 364,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 367,
		"end": 368,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 369,
		"end": 370,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 371,
		"end": 379,
		"match": "fragment"
	},
	{
		"type": "identifier",
		"start": 380,
		"end": 392,
		"match": "FriendFields"
	},
	{
		"type": "keyword",
		"start": 393,
		"end": 395,
		"match": "on"
	},
	{
		"type": "type",
		"start": 396,
		"end": 400,
		"match": "User"
	},
	{
		"type": "punctuation",
		"start": 401,
		"end": 402,
		"match": "{"
	},
	{
		"type": "property",
		"start": 403,
		"end": 405,
		"match": "id"
	},
	{
		"type": "property",
		"start": 406,
		"end": 410,
		"match": "name"
	},
	{
		"type": "punctuation",
		"start": 411,
		"end": 412,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 413,
		"end": 421,
		"match": "mutation"
	},
	{
		"type": "identifier",
		"start": 422,
		"end": 428,
		"match": "Update"
	},
	{
		"type": "punctuation",
		"start": 428,
		"end": 429,
		"match": "("
	},
	{
		"type": "variable",
		"start": 429,
		"end": 435,
		"match": "$input"
	},
	{
		"type": "punctuation",
		"start": 435,
		"end": 436,
		"match": ":"
	},
	{
		"type": "type",
		"start": 437,
		"end": 448,
		"match": "UpdateInput"
	},
	{
		"type": "operator",
		"start": 448,
		"end": 449,
		"match": "!"
	},
	{
		"type": "punctuation",
		"start": 449,
		"end": 450,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 451,
		"end": 452,
		"match": "{"
	},
	{
		"type": "property",
		"start": 455,
		"end": 465,
		"match": "updateUser"
	},
	{
		"type": "punctuation",
		"start": 465,
		"end": 466,
		"match": "("
	},
	{
		"type": "property",
		"start": 466,
		"end": 471,
		"match": "input"
	},
	{
		"type": "punctuation",
		"start": 471,
		"end": 472,
		"match": ":"
	},
	{
		"type": "variable",
		"start": 473,
		"end": 479,
		"match": "$input"
	},
	{
		"type": "punctuation",
		"start": 479,
		"end": 480,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 481,
		"end": 482,
		"match": "{"
	},
	{
		"type": "property",
		"start": 483,
		"end": 485,
		"match": "id"
	},
	{
		"type": "punctuation",
		"start": 486,
		"end": 487,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 488,
		"end": 489,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 490,
		"end": 502,
		"match": "subscription"
	},
	{
		"type": "identifier",
		"start": 503,
		"end": 511,
		"match": "Messages"
	},
	{
		"type": "punctuation",
		"start": 512,
		"end": 513,
		"match": "{"
	},
	{
		"type": "property",
		"start": 514,
		"end": 526,
		"match": "messageAdded"
	},
	{
		"type": "punctuation",
		"start": 527,
		"end": 528,
		"match": "{"
	},
	{
		"type": "property",
		"start": 529,
		"end": 533,
		"match": "body"
	},
	{
		"type": "punctuation",
		"start": 534,
		"end": 535,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 536,
		"end": 537,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 538,
		"end": 539,
		"match": "{"
	},
	{
		"type": "property",
		"start": 540,
		"end": 552,
		"match": "nearestThing"
	},
	{
		"type": "punctuation",
		"start": 552,
		"end": 553,
		"match": "("
	},
	{
		"type": "property",
		"start": 553,
		"end": 561,
		"match": "location"
	},
	{
		"type": "punctuation",
		"start": 561,
		"end": 562,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 563,
		"end": 564,
		"match": "{"
	},
	{
		"type": "property",
		"start": 565,
		"end": 568,
		"match": "lon"
	},
	{
		"type": "punctuation",
		"start": 568,
		"end": 569,
		"match": ":"
	},
	{
		"type": "number",
		"start": 570,
		"end": 575,
		"match": "12.43"
	},
	{
		"type": "punctuation",
		"start": 575,
		"end": 576,
		"match": ","
	},
	{
		"type": "property",
		"start": 577,
		"end": 580,
		"match": "lat"
	},
	{
		"type": "punctuation",
		"start": 580,
		"end": 581,
		"match": ":"
	},
	{
		"type": "number",
		"start": 582,
		"end": 589,
		"match": "-53.211"
	},
	{
		"type": "punctuation",
		"start": 590,
		"end": 592,
		"match": "})"
	},
	{
		"type": "punctuation",
		"start": 593,
		"end": 594,
		"match": "}"
	}
];
