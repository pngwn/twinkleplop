export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 19,
		"match": "# full-line comment"
	},
	{
		"type": "comment",
		"start": 22,
		"end": 40,
		"match": "# indented comment"
	},
	{
		"type": "comment",
		"start": 41,
		"end": 65,
		"match": "#no space after the hash"
	},
	{
		"type": "property",
		"start": 67,
		"end": 72,
		"match": "BASIC"
	},
	{
		"type": "operator",
		"start": 72,
		"end": 73,
		"match": "="
	},
	{
		"type": "string",
		"start": 73,
		"end": 78,
		"match": "basic"
	},
	{
		"type": "property",
		"start": 79,
		"end": 85,
		"match": "SPACED"
	},
	{
		"type": "operator",
		"start": 86,
		"end": 87,
		"match": "="
	},
	{
		"type": "string",
		"start": 88,
		"end": 105,
		"match": "value with spaces"
	},
	{
		"type": "property",
		"start": 106,
		"end": 112,
		"match": "TABBED"
	},
	{
		"type": "operator",
		"start": 113,
		"end": 114,
		"match": "="
	},
	{
		"type": "string",
		"start": 115,
		"end": 121,
		"match": "tabbed"
	},
	{
		"type": "property",
		"start": 122,
		"end": 127,
		"match": "EMPTY"
	},
	{
		"type": "operator",
		"start": 127,
		"end": 128,
		"match": "="
	},
	{
		"type": "property",
		"start": 129,
		"end": 146,
		"match": "EMPTY_WITH_BLANKS"
	},
	{
		"type": "operator",
		"start": 146,
		"end": 147,
		"match": "="
	},
	{
		"type": "property",
		"start": 151,
		"end": 169,
		"match": "EMPTY_WITH_COMMENT"
	},
	{
		"type": "operator",
		"start": 169,
		"end": 170,
		"match": "="
	},
	{
		"type": "comment",
		"start": 171,
		"end": 185,
		"match": "# nothing here"
	},
	{
		"type": "property",
		"start": 186,
		"end": 199,
		"match": "DOUBLE_EQUALS"
	},
	{
		"type": "operator",
		"start": 199,
		"end": 200,
		"match": "="
	},
	{
		"type": "string",
		"start": 200,
		"end": 206,
		"match": "=value"
	},
	{
		"type": "property",
		"start": 207,
		"end": 210,
		"match": "URL"
	},
	{
		"type": "operator",
		"start": 210,
		"end": 211,
		"match": "="
	},
	{
		"type": "string",
		"start": 211,
		"end": 265,
		"match": "postgres://user:pass@localhost:5432/db?sslmode=require"
	},
	{
		"type": "property",
		"start": 266,
		"end": 272,
		"match": "INLINE"
	},
	{
		"type": "operator",
		"start": 272,
		"end": 273,
		"match": "="
	},
	{
		"type": "string",
		"start": 273,
		"end": 279,
		"match": "value "
	},
	{
		"type": "comment",
		"start": 279,
		"end": 297,
		"match": "# trailing comment"
	},
	{
		"type": "property",
		"start": 298,
		"end": 309,
		"match": "HASH_INSIDE"
	},
	{
		"type": "operator",
		"start": 309,
		"end": 310,
		"match": "="
	},
	{
		"type": "string",
		"start": 310,
		"end": 311,
		"match": "a"
	},
	{
		"type": "comment",
		"start": 311,
		"end": 313,
		"match": "#b"
	},
	{
		"type": "property",
		"start": 314,
		"end": 319,
		"match": "COLOR"
	},
	{
		"type": "operator",
		"start": 319,
		"end": 320,
		"match": "="
	},
	{
		"type": "comment",
		"start": 320,
		"end": 324,
		"match": "#fff"
	},
	{
		"type": "keyword",
		"start": 326,
		"end": 332,
		"match": "export"
	},
	{
		"type": "property",
		"start": 333,
		"end": 341,
		"match": "EXPORTED"
	},
	{
		"type": "operator",
		"start": 341,
		"end": 342,
		"match": "="
	},
	{
		"type": "number",
		"start": 342,
		"end": 343,
		"match": "1"
	},
	{
		"type": "keyword",
		"start": 344,
		"end": 350,
		"match": "export"
	},
	{
		"type": "property",
		"start": 351,
		"end": 363,
		"match": "TAB_EXPORTED"
	},
	{
		"type": "operator",
		"start": 363,
		"end": 364,
		"match": "="
	},
	{
		"type": "number",
		"start": 364,
		"end": 365,
		"match": "1"
	},
	{
		"type": "keyword",
		"start": 366,
		"end": 372,
		"match": "export"
	},
	{
		"type": "property",
		"start": 375,
		"end": 388,
		"match": "WIDE_EXPORTED"
	},
	{
		"type": "operator",
		"start": 388,
		"end": 389,
		"match": "="
	},
	{
		"type": "number",
		"start": 389,
		"end": 390,
		"match": "1"
	},
	{
		"type": "property",
		"start": 391,
		"end": 397,
		"match": "export"
	},
	{
		"type": "operator",
		"start": 397,
		"end": 398,
		"match": "="
	},
	{
		"type": "number",
		"start": 398,
		"end": 399,
		"match": "1"
	},
	{
		"type": "property",
		"start": 400,
		"end": 406,
		"match": "export"
	},
	{
		"type": "operator",
		"start": 408,
		"end": 409,
		"match": "="
	},
	{
		"type": "number",
		"start": 409,
		"end": 410,
		"match": "1"
	},
	{
		"type": "property",
		"start": 411,
		"end": 419,
		"match": "exported"
	},
	{
		"type": "operator",
		"start": 419,
		"end": 420,
		"match": "="
	},
	{
		"type": "number",
		"start": 420,
		"end": 421,
		"match": "1"
	},
	{
		"type": "property",
		"start": 422,
		"end": 428,
		"match": "export"
	},
	{
		"type": "property",
		"start": 429,
		"end": 435,
		"match": "export"
	},
	{
		"type": "comment",
		"start": 436,
		"end": 462,
		"match": "# just a key and a comment"
	},
	{
		"type": "property",
		"start": 463,
		"end": 469,
		"match": "EXPORT"
	},
	{
		"type": "property",
		"start": 479,
		"end": 489,
		"match": "YAML_STYLE"
	},
	{
		"type": "operator",
		"start": 489,
		"end": 490,
		"match": ":"
	},
	{
		"type": "string",
		"start": 491,
		"end": 496,
		"match": "value"
	},
	{
		"type": "property",
		"start": 497,
		"end": 505,
		"match": "NO_SPACE"
	},
	{
		"type": "operator",
		"start": 505,
		"end": 506,
		"match": ":"
	},
	{
		"type": "string",
		"start": 506,
		"end": 511,
		"match": "value"
	},
	{
		"type": "property",
		"start": 512,
		"end": 516,
		"match": "TIME"
	},
	{
		"type": "operator",
		"start": 516,
		"end": 517,
		"match": ":"
	},
	{
		"type": "string",
		"start": 518,
		"end": 523,
		"match": "08:00"
	},
	{
		"type": "property",
		"start": 525,
		"end": 546,
		"match": "spring.datasource.url"
	},
	{
		"type": "operator",
		"start": 546,
		"end": 547,
		"match": "="
	},
	{
		"type": "string",
		"start": 547,
		"end": 572,
		"match": "jdbc:mysql://localhost/db"
	},
	{
		"type": "property",
		"start": 573,
		"end": 579,
		"match": "MY-KEY"
	},
	{
		"type": "operator",
		"start": 579,
		"end": 580,
		"match": "="
	},
	{
		"type": "string",
		"start": 580,
		"end": 586,
		"match": "dashed"
	},
	{
		"type": "property",
		"start": 587,
		"end": 593,
		"match": "KEY[0]"
	},
	{
		"type": "operator",
		"start": 593,
		"end": 594,
		"match": "="
	},
	{
		"type": "string",
		"start": 594,
		"end": 603,
		"match": "bracketed"
	},
	{
		"type": "property",
		"start": 604,
		"end": 607,
		"match": "1ST"
	},
	{
		"type": "operator",
		"start": 607,
		"end": 608,
		"match": "="
	},
	{
		"type": "string",
		"start": 608,
		"end": 621,
		"match": "leading digit"
	},
	{
		"type": "property",
		"start": 622,
		"end": 634,
		"match": "'QUOTED_KEY'"
	},
	{
		"type": "operator",
		"start": 634,
		"end": 635,
		"match": "="
	},
	{
		"type": "string",
		"start": 635,
		"end": 647,
		"match": "python style"
	},
	{
		"type": "property",
		"start": 649,
		"end": 653,
		"match": "BARE"
	},
	{
		"type": "property",
		"start": 654,
		"end": 671,
		"match": "BARE_WITH_COMMENT"
	},
	{
		"type": "comment",
		"start": 672,
		"end": 678,
		"match": "# note"
	},
	{
		"type": "property",
		"start": 679,
		"end": 682,
		"match": "not"
	},
	{
		"type": "comment",
		"start": 696,
		"end": 711,
		"match": "# but a comment"
	},
	{
		"type": "operator",
		"start": 712,
		"end": 713,
		"match": "="
	},
	{
		"type": "string",
		"start": 713,
		"end": 732,
		"match": "value without a key"
	},
	{
		"type": "property",
		"start": 733,
		"end": 734,
		"match": "A"
	},
	{
		"type": "comment",
		"start": 734,
		"end": 738,
		"match": "#B=1"
	}
];
