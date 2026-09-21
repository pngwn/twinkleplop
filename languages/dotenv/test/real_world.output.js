export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 61,
		"match": "#/-------------------[DOTENV_PUBLIC_KEY]--------------------/"
	},
	{
		"type": "comment",
		"start": 62,
		"end": 123,
		"match": "#/            public-key encryption for .env files          /"
	},
	{
		"type": "comment",
		"start": 124,
		"end": 185,
		"match": "#/----------------------------------------------------------/"
	},
	{
		"type": "property",
		"start": 186,
		"end": 203,
		"match": "DOTENV_PUBLIC_KEY"
	},
	{
		"type": "operator",
		"start": 203,
		"end": 204,
		"match": "="
	},
	{
		"type": "string",
		"start": 204,
		"end": 272,
		"match": "\"03f8b3a7c1e2d4f6a8b0c2e4f6a8b0c2e4f6a8b0c2e4f6a8b0c2e4f6a8b0c2e4f6\""
	},
	{
		"type": "comment",
		"start": 274,
		"end": 279,
		"match": "# API"
	},
	{
		"type": "keyword",
		"start": 280,
		"end": 286,
		"match": "export"
	},
	{
		"type": "property",
		"start": 287,
		"end": 299,
		"match": "VITE_API_URL"
	},
	{
		"type": "operator",
		"start": 299,
		"end": 300,
		"match": "="
	},
	{
		"type": "string",
		"start": 300,
		"end": 326,
		"match": "https://api.example.com/v1"
	},
	{
		"type": "comment",
		"start": 326,
		"end": 331,
		"match": "#frag"
	},
	{
		"type": "property",
		"start": 332,
		"end": 344,
		"match": "DATABASE_URL"
	},
	{
		"type": "operator",
		"start": 344,
		"end": 345,
		"match": "="
	},
	{
		"type": "string",
		"start": 345,
		"end": 357,
		"match": "\"postgres://"
	},
	{
		"type": "punctuation",
		"start": 357,
		"end": 359,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 359,
		"end": 365,
		"match": "PGUSER"
	},
	{
		"type": "operator",
		"start": 365,
		"end": 367,
		"match": ":-"
	},
	{
		"type": "string",
		"start": 367,
		"end": 370,
		"match": "app"
	},
	{
		"type": "punctuation",
		"start": 370,
		"end": 371,
		"match": "}"
	},
	{
		"type": "string",
		"start": 371,
		"end": 372,
		"match": ":"
	},
	{
		"type": "variable",
		"start": 372,
		"end": 379,
		"match": "$PGPASS"
	},
	{
		"type": "string",
		"start": 379,
		"end": 392,
		"match": "@db:5432/app\""
	},
	{
		"type": "comment",
		"start": 393,
		"end": 402,
		"match": "# primary"
	},
	{
		"type": "property",
		"start": 403,
		"end": 424,
		"match": "NEXT_PUBLIC_SITE_NAME"
	},
	{
		"type": "operator",
		"start": 424,
		"end": 425,
		"match": "="
	},
	{
		"type": "string",
		"start": 425,
		"end": 433,
		"match": "'My App'"
	},
	{
		"type": "property",
		"start": 434,
		"end": 439,
		"match": "PRICE"
	},
	{
		"type": "operator",
		"start": 439,
		"end": 440,
		"match": "="
	},
	{
		"type": "string_escape",
		"start": 440,
		"end": 442,
		"match": "\\$"
	},
	{
		"type": "string",
		"start": 442,
		"end": 450,
		"match": "5 and $$"
	},
	{
		"type": "property",
		"start": 451,
		"end": 468,
		"match": "STRIPE_SECRET_KEY"
	},
	{
		"type": "operator",
		"start": 468,
		"end": 469,
		"match": "="
	},
	{
		"type": "string",
		"start": 469,
		"end": 617,
		"match": "\"encrypted:BDqDBibm4wsYqMpCjTQ6BsDHmMadg9K3dAt+Z9HPMfLEIRVz50hmLXPXRuDBXaJi/LwWYEVUNiq0HISrslzQPaoyS8Lotg3gFWJTsNCdOWnqpjF2xNUX2RQiP05kAbEXM6MWVjDr\""
	},
	{
		"type": "property",
		"start": 619,
		"end": 630,
		"match": "PRIVATE_KEY"
	},
	{
		"type": "operator",
		"start": 630,
		"end": 631,
		"match": "="
	},
	{
		"type": "string",
		"start": 631,
		"end": 656,
		"match": "\"-----BEGIN KEY-----\nMIIB"
	},
	{
		"type": "string_escape",
		"start": 656,
		"end": 658,
		"match": "\\n"
	},
	{
		"type": "string",
		"start": 658,
		"end": 697,
		"match": "q8w=\n# not a comment\n-----END KEY-----\""
	},
	{
		"type": "property",
		"start": 698,
		"end": 706,
		"match": "GREETING"
	},
	{
		"type": "operator",
		"start": 706,
		"end": 707,
		"match": "="
	},
	{
		"type": "string",
		"start": 707,
		"end": 710,
		"match": "'It"
	},
	{
		"type": "string_escape",
		"start": 710,
		"end": 712,
		"match": "\\'"
	},
	{
		"type": "string",
		"start": 712,
		"end": 722,
		"match": "s ${USER}'"
	},
	{
		"type": "comment",
		"start": 723,
		"end": 732,
		"match": "# literal"
	},
	{
		"type": "property",
		"start": 733,
		"end": 737,
		"match": "JSON"
	},
	{
		"type": "operator",
		"start": 737,
		"end": 738,
		"match": "="
	},
	{
		"type": "string",
		"start": 738,
		"end": 750,
		"match": "`{\"a\": \"b\"}`"
	},
	{
		"type": "property",
		"start": 754,
		"end": 757,
		"match": "SHA"
	},
	{
		"type": "operator",
		"start": 757,
		"end": 758,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 758,
		"end": 760,
		"match": "$("
	},
	{
		"type": "string",
		"start": 760,
		"end": 786,
		"match": "git rev-parse --short HEAD"
	},
	{
		"type": "punctuation",
		"start": 786,
		"end": 787,
		"match": ")"
	},
	{
		"type": "property",
		"start": 788,
		"end": 791,
		"match": "TAG"
	},
	{
		"type": "operator",
		"start": 791,
		"end": 792,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 793,
		"end": 795,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 795,
		"end": 804,
		"match": "IMAGE_TAG"
	},
	{
		"type": "operator",
		"start": 804,
		"end": 806,
		"match": ":-"
	},
	{
		"type": "punctuation",
		"start": 806,
		"end": 808,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 808,
		"end": 811,
		"match": "SHA"
	},
	{
		"type": "punctuation",
		"start": 811,
		"end": 812,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 812,
		"end": 813,
		"match": "}"
	},
	{
		"type": "property",
		"start": 814,
		"end": 823,
		"match": "INHERITED"
	},
	{
		"type": "property",
		"start": 824,
		"end": 829,
		"match": "COLOR"
	},
	{
		"type": "operator",
		"start": 830,
		"end": 831,
		"match": "="
	},
	{
		"type": "comment",
		"start": 832,
		"end": 836,
		"match": "#fff"
	},
	{
		"type": "property",
		"start": 837,
		"end": 842,
		"match": "EMPTY"
	},
	{
		"type": "operator",
		"start": 842,
		"end": 843,
		"match": "="
	},
	{
		"type": "property",
		"start": 845,
		"end": 851,
		"match": "export"
	},
	{
		"type": "operator",
		"start": 851,
		"end": 852,
		"match": "="
	},
	{
		"type": "number",
		"start": 852,
		"end": 853,
		"match": "1"
	},
	{
		"type": "property",
		"start": 854,
		"end": 855,
		"match": "A"
	},
	{
		"type": "operator",
		"start": 855,
		"end": 856,
		"match": "="
	},
	{
		"type": "string",
		"start": 856,
		"end": 861,
		"match": "\"x\"y "
	},
	{
		"type": "comment",
		"start": 861,
		"end": 864,
		"match": "# c"
	},
	{
		"type": "property",
		"start": 865,
		"end": 866,
		"match": "B"
	},
	{
		"type": "operator",
		"start": 866,
		"end": 867,
		"match": "="
	},
	{
		"type": "string",
		"start": 867,
		"end": 868,
		"match": "\""
	},
	{
		"type": "punctuation",
		"start": 868,
		"end": 870,
		"match": "${"
	},
	{
		"type": "variable",
		"start": 870,
		"end": 871,
		"match": "C"
	},
	{
		"type": "operator",
		"start": 871,
		"end": 873,
		"match": ":-"
	},
	{
		"type": "string",
		"start": 873,
		"end": 878,
		"match": "\"d\"}\""
	}
];
