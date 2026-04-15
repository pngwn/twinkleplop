export const test = [
	{
		"type": "bold",
		"start": 0,
		"end": 2,
		"match": "**"
	},
	{
		"type": "bold",
		"start": 2,
		"end": 12,
		"match": "bold with "
	},
	{
		"type": "bold italic",
		"start": 12,
		"end": 13,
		"match": "*"
	},
	{
		"type": "bold italic",
		"start": 13,
		"end": 26,
		"match": "italic nested"
	},
	{
		"type": "bold italic",
		"start": 26,
		"end": 27,
		"match": "*"
	},
	{
		"type": "bold",
		"start": 27,
		"end": 32,
		"match": " bold"
	},
	{
		"type": "bold",
		"start": 32,
		"end": 34,
		"match": "**"
	},
	{
		"type": "italic",
		"start": 36,
		"end": 37,
		"match": "*"
	},
	{
		"type": "italic",
		"start": 37,
		"end": 49,
		"match": "italic with "
	},
	{
		"type": "italic code",
		"start": 49,
		"end": 50,
		"match": "`"
	},
	{
		"type": "italic code",
		"start": 50,
		"end": 61,
		"match": "code inside"
	},
	{
		"type": "italic code",
		"start": 61,
		"end": 62,
		"match": "`"
	},
	{
		"type": "italic",
		"start": 62,
		"end": 69,
		"match": " italic"
	},
	{
		"type": "italic",
		"start": 69,
		"end": 70,
		"match": "*"
	},
	{
		"type": "bold",
		"start": 72,
		"end": 74,
		"match": "**"
	},
	{
		"type": "bold",
		"start": 74,
		"end": 84,
		"match": "bold with "
	},
	{
		"type": "bold code",
		"start": 84,
		"end": 85,
		"match": "`"
	},
	{
		"type": "bold code",
		"start": 85,
		"end": 89,
		"match": "code"
	},
	{
		"type": "bold code",
		"start": 89,
		"end": 90,
		"match": "`"
	},
	{
		"type": "bold",
		"start": 90,
		"end": 95,
		"match": " bold"
	},
	{
		"type": "bold",
		"start": 95,
		"end": 97,
		"match": "**"
	},
	{
		"type": "strike",
		"start": 99,
		"end": 101,
		"match": "~~"
	},
	{
		"type": "strike",
		"start": 101,
		"end": 113,
		"match": "strike with "
	},
	{
		"type": "strike bold",
		"start": 113,
		"end": 115,
		"match": "**"
	},
	{
		"type": "strike bold",
		"start": 115,
		"end": 119,
		"match": "bold"
	},
	{
		"type": "strike bold",
		"start": 119,
		"end": 121,
		"match": "**"
	},
	{
		"type": "strike",
		"start": 121,
		"end": 128,
		"match": " strike"
	},
	{
		"type": "strike",
		"start": 128,
		"end": 130,
		"match": "~~"
	},
	{
		"type": "italic",
		"start": 132,
		"end": 133,
		"match": "*"
	},
	{
		"type": "italic",
		"start": 133,
		"end": 140,
		"match": "italic "
	},
	{
		"type": "italic link-text",
		"start": 140,
		"end": 141,
		"match": "["
	},
	{
		"type": "italic link-text",
		"start": 141,
		"end": 150,
		"match": "link text"
	},
	{
		"type": "italic link-text",
		"start": 150,
		"end": 151,
		"match": "]"
	},
	{
		"type": "italic url-link",
		"start": 151,
		"end": 152,
		"match": "("
	},
	{
		"type": "italic url",
		"start": 152,
		"end": 171,
		"match": "https://example.com"
	},
	{
		"type": "italic url-link",
		"start": 171,
		"end": 172,
		"match": ")"
	},
	{
		"type": "italic",
		"start": 172,
		"end": 179,
		"match": " italic"
	},
	{
		"type": "italic",
		"start": 179,
		"end": 180,
		"match": "*"
	},
	{
		"type": "link-text",
		"start": 182,
		"end": 183,
		"match": "["
	},
	{
		"type": "link-text",
		"start": 183,
		"end": 193,
		"match": "link with "
	},
	{
		"type": "link-text bold",
		"start": 193,
		"end": 195,
		"match": "**"
	},
	{
		"type": "link-text bold",
		"start": 195,
		"end": 199,
		"match": "bold"
	},
	{
		"type": "link-text bold",
		"start": 199,
		"end": 201,
		"match": "**"
	},
	{
		"type": "link-text",
		"start": 201,
		"end": 206,
		"match": " and "
	},
	{
		"type": "link-text code",
		"start": 206,
		"end": 207,
		"match": "`"
	},
	{
		"type": "link-text code",
		"start": 207,
		"end": 211,
		"match": "code"
	},
	{
		"type": "link-text code",
		"start": 211,
		"end": 212,
		"match": "`"
	},
	{
		"type": "link-text",
		"start": 212,
		"end": 219,
		"match": " inside"
	},
	{
		"type": "link-text",
		"start": 219,
		"end": 220,
		"match": "]"
	},
	{
		"type": "url-link",
		"start": 220,
		"end": 221,
		"match": "("
	},
	{
		"type": "url",
		"start": 221,
		"end": 224,
		"match": "url"
	},
	{
		"type": "url-link",
		"start": 224,
		"end": 225,
		"match": ")"
	},
	{
		"type": "bold",
		"start": 227,
		"end": 229,
		"match": "**"
	},
	{
		"type": "bold link-text",
		"start": 229,
		"end": 230,
		"match": "["
	},
	{
		"type": "bold link-text",
		"start": 230,
		"end": 239,
		"match": "bold link"
	},
	{
		"type": "bold link-text",
		"start": 239,
		"end": 240,
		"match": "]"
	},
	{
		"type": "bold url-link",
		"start": 240,
		"end": 241,
		"match": "("
	},
	{
		"type": "bold url",
		"start": 241,
		"end": 244,
		"match": "url"
	},
	{
		"type": "bold url-link",
		"start": 244,
		"end": 245,
		"match": ")"
	},
	{
		"type": "bold",
		"start": 245,
		"end": 262,
		"match": " followed by bold"
	},
	{
		"type": "bold",
		"start": 262,
		"end": 264,
		"match": "**"
	},
	{
		"type": "italic",
		"start": 266,
		"end": 267,
		"match": "*"
	},
	{
		"type": "italic strike",
		"start": 267,
		"end": 269,
		"match": "~~"
	},
	{
		"type": "italic strike",
		"start": 269,
		"end": 282,
		"match": "italic strike"
	},
	{
		"type": "italic strike",
		"start": 282,
		"end": 284,
		"match": "~~"
	},
	{
		"type": "italic",
		"start": 284,
		"end": 285,
		"match": "*"
	},
	{
		"type": "bold",
		"start": 287,
		"end": 289,
		"match": "**"
	},
	{
		"type": "bold",
		"start": 289,
		"end": 294,
		"match": "bold "
	},
	{
		"type": "bold italic",
		"start": 294,
		"end": 295,
		"match": "*"
	},
	{
		"type": "bold italic",
		"start": 295,
		"end": 302,
		"match": "italic "
	},
	{
		"type": "bold italic strike",
		"start": 302,
		"end": 304,
		"match": "~~"
	},
	{
		"type": "bold italic strike",
		"start": 304,
		"end": 314,
		"match": "and strike"
	},
	{
		"type": "bold italic strike",
		"start": 314,
		"end": 316,
		"match": "~~"
	},
	{
		"type": "bold italic",
		"start": 316,
		"end": 331,
		"match": " back to italic"
	},
	{
		"type": "bold italic",
		"start": 331,
		"end": 332,
		"match": "*"
	},
	{
		"type": "bold",
		"start": 332,
		"end": 337,
		"match": " bold"
	},
	{
		"type": "bold",
		"start": 337,
		"end": 339,
		"match": "**"
	},
	{
		"type": "code",
		"start": 341,
		"end": 342,
		"match": "`"
	},
	{
		"type": "code",
		"start": 342,
		"end": 352,
		"match": "plain code"
	},
	{
		"type": "code",
		"start": 352,
		"end": 353,
		"match": "`"
	},
	{
		"type": "italic",
		"start": 372,
		"end": 373,
		"match": "*"
	},
	{
		"type": "italic",
		"start": 373,
		"end": 391,
		"match": "italic containing "
	},
	{
		"type": "italic autolink",
		"start": 391,
		"end": 392,
		"match": "<"
	},
	{
		"type": "italic autolink",
		"start": 392,
		"end": 408,
		"match": "https://autolink"
	},
	{
		"type": "italic autolink",
		"start": 408,
		"end": 409,
		"match": ">"
	},
	{
		"type": "italic",
		"start": 409,
		"end": 416,
		"match": " inside"
	},
	{
		"type": "italic",
		"start": 416,
		"end": 417,
		"match": "*"
	},
	{
		"type": "bold",
		"start": 419,
		"end": 421,
		"match": "**"
	},
	{
		"type": "bold",
		"start": 421,
		"end": 433,
		"match": "bold across "
	},
	{
		"type": "bold link-text",
		"start": 433,
		"end": 435,
		"match": "!["
	},
	{
		"type": "bold link-text",
		"start": 435,
		"end": 444,
		"match": "image alt"
	},
	{
		"type": "bold link-text",
		"start": 444,
		"end": 445,
		"match": "]"
	},
	{
		"type": "bold url-link",
		"start": 445,
		"end": 446,
		"match": "("
	},
	{
		"type": "bold url",
		"start": 446,
		"end": 453,
		"match": "img.png"
	},
	{
		"type": "bold url-link",
		"start": 453,
		"end": 454,
		"match": ")"
	},
	{
		"type": "bold",
		"start": 454,
		"end": 459,
		"match": " bold"
	},
	{
		"type": "bold",
		"start": 459,
		"end": 461,
		"match": "**"
	},
	{
		"type": "code",
		"start": 463,
		"end": 464,
		"match": "`"
	},
	{
		"type": "code",
		"start": 464,
		"end": 468,
		"match": "code"
	},
	{
		"type": "code",
		"start": 468,
		"end": 469,
		"match": "`"
	},
	{
		"type": "bold",
		"start": 475,
		"end": 477,
		"match": "**"
	},
	{
		"type": "bold",
		"start": 477,
		"end": 481,
		"match": "bold"
	},
	{
		"type": "bold",
		"start": 481,
		"end": 483,
		"match": "**"
	},
	{
		"type": "italic",
		"start": 489,
		"end": 490,
		"match": "*"
	},
	{
		"type": "italic",
		"start": 490,
		"end": 496,
		"match": "italic"
	},
	{
		"type": "italic",
		"start": 496,
		"end": 497,
		"match": "*"
	}
];
