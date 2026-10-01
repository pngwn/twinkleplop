export const test = [
	{
		"type": "string",
		"start": 0,
		"end": 57,
		"match": "\"\"\"The public API, including descriptions and extensions."
	},
	{
		"type": "string",
		"start": 57,
		"end": 60,
		"match": "\"\"\""
	},
	{
		"type": "keyword",
		"start": 61,
		"end": 67,
		"match": "schema"
	},
	{
		"type": "decorator",
		"start": 68,
		"end": 76,
		"match": "@service"
	},
	{
		"type": "punctuation",
		"start": 76,
		"end": 77,
		"match": "("
	},
	{
		"type": "property",
		"start": 77,
		"end": 81,
		"match": "name"
	},
	{
		"type": "punctuation",
		"start": 81,
		"end": 82,
		"match": ":"
	},
	{
		"type": "string",
		"start": 83,
		"end": 91,
		"match": "\"public\""
	},
	{
		"type": "punctuation",
		"start": 91,
		"end": 92,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 93,
		"end": 94,
		"match": "{"
	},
	{
		"type": "keyword",
		"start": 97,
		"end": 102,
		"match": "query"
	},
	{
		"type": "punctuation",
		"start": 102,
		"end": 103,
		"match": ":"
	},
	{
		"type": "type",
		"start": 104,
		"end": 109,
		"match": "Query"
	},
	{
		"type": "keyword",
		"start": 112,
		"end": 120,
		"match": "mutation"
	},
	{
		"type": "punctuation",
		"start": 120,
		"end": 121,
		"match": ":"
	},
	{
		"type": "type",
		"start": 122,
		"end": 130,
		"match": "Mutation"
	},
	{
		"type": "keyword",
		"start": 133,
		"end": 145,
		"match": "subscription"
	},
	{
		"type": "punctuation",
		"start": 145,
		"end": 146,
		"match": ":"
	},
	{
		"type": "type",
		"start": 147,
		"end": 159,
		"match": "Subscription"
	},
	{
		"type": "punctuation",
		"start": 160,
		"end": 161,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 162,
		"end": 168,
		"match": "scalar"
	},
	{
		"type": "type",
		"start": 169,
		"end": 177,
		"match": "DateTime"
	},
	{
		"type": "decorator",
		"start": 178,
		"end": 190,
		"match": "@specifiedBy"
	},
	{
		"type": "punctuation",
		"start": 190,
		"end": 191,
		"match": "("
	},
	{
		"type": "property",
		"start": 191,
		"end": 194,
		"match": "url"
	},
	{
		"type": "punctuation",
		"start": 194,
		"end": 195,
		"match": ":"
	},
	{
		"type": "string",
		"start": 196,
		"end": 222,
		"match": "\"https://example.com/date\""
	},
	{
		"type": "punctuation",
		"start": 222,
		"end": 223,
		"match": ")"
	},
	{
		"type": "keyword",
		"start": 224,
		"end": 233,
		"match": "interface"
	},
	{
		"type": "type",
		"start": 234,
		"end": 238,
		"match": "Node"
	},
	{
		"type": "punctuation",
		"start": 239,
		"end": 240,
		"match": "{"
	},
	{
		"type": "property",
		"start": 241,
		"end": 243,
		"match": "id"
	},
	{
		"type": "punctuation",
		"start": 243,
		"end": 244,
		"match": ":"
	},
	{
		"type": "type",
		"start": 245,
		"end": 247,
		"match": "ID"
	},
	{
		"type": "operator",
		"start": 247,
		"end": 248,
		"match": "!"
	},
	{
		"type": "punctuation",
		"start": 249,
		"end": 250,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 251,
		"end": 260,
		"match": "interface"
	},
	{
		"type": "type",
		"start": 261,
		"end": 269,
		"match": "Resource"
	},
	{
		"type": "keyword",
		"start": 270,
		"end": 280,
		"match": "implements"
	},
	{
		"type": "type",
		"start": 281,
		"end": 285,
		"match": "Node"
	},
	{
		"type": "punctuation",
		"start": 286,
		"end": 287,
		"match": "{"
	},
	{
		"type": "property",
		"start": 288,
		"end": 290,
		"match": "id"
	},
	{
		"type": "punctuation",
		"start": 290,
		"end": 291,
		"match": ":"
	},
	{
		"type": "type",
		"start": 292,
		"end": 294,
		"match": "ID"
	},
	{
		"type": "operator",
		"start": 294,
		"end": 295,
		"match": "!"
	},
	{
		"type": "property",
		"start": 296,
		"end": 299,
		"match": "url"
	},
	{
		"type": "punctuation",
		"start": 299,
		"end": 300,
		"match": ":"
	},
	{
		"type": "type",
		"start": 301,
		"end": 307,
		"match": "String"
	},
	{
		"type": "punctuation",
		"start": 308,
		"end": 309,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 310,
		"end": 314,
		"match": "type"
	},
	{
		"type": "type",
		"start": 315,
		"end": 319,
		"match": "User"
	},
	{
		"type": "keyword",
		"start": 320,
		"end": 330,
		"match": "implements"
	},
	{
		"type": "operator",
		"start": 331,
		"end": 332,
		"match": "&"
	},
	{
		"type": "type",
		"start": 333,
		"end": 337,
		"match": "Node"
	},
	{
		"type": "operator",
		"start": 338,
		"end": 339,
		"match": "&"
	},
	{
		"type": "type",
		"start": 340,
		"end": 348,
		"match": "Resource"
	},
	{
		"type": "decorator",
		"start": 349,
		"end": 353,
		"match": "@key"
	},
	{
		"type": "punctuation",
		"start": 353,
		"end": 354,
		"match": "("
	},
	{
		"type": "property",
		"start": 354,
		"end": 360,
		"match": "fields"
	},
	{
		"type": "punctuation",
		"start": 360,
		"end": 361,
		"match": ":"
	},
	{
		"type": "string",
		"start": 362,
		"end": 366,
		"match": "\"id\""
	},
	{
		"type": "punctuation",
		"start": 366,
		"end": 367,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 368,
		"end": 369,
		"match": "{"
	},
	{
		"type": "string",
		"start": 372,
		"end": 391,
		"match": "\"Stable identifier\""
	},
	{
		"type": "property",
		"start": 394,
		"end": 396,
		"match": "id"
	},
	{
		"type": "punctuation",
		"start": 396,
		"end": 397,
		"match": ":"
	},
	{
		"type": "type",
		"start": 398,
		"end": 400,
		"match": "ID"
	},
	{
		"type": "operator",
		"start": 400,
		"end": 401,
		"match": "!"
	},
	{
		"type": "property",
		"start": 404,
		"end": 407,
		"match": "url"
	},
	{
		"type": "punctuation",
		"start": 407,
		"end": 408,
		"match": ":"
	},
	{
		"type": "type",
		"start": 409,
		"end": 415,
		"match": "String"
	},
	{
		"type": "property",
		"start": 418,
		"end": 425,
		"match": "friends"
	},
	{
		"type": "punctuation",
		"start": 425,
		"end": 426,
		"match": "("
	},
	{
		"type": "property",
		"start": 426,
		"end": 431,
		"match": "first"
	},
	{
		"type": "punctuation",
		"start": 431,
		"end": 432,
		"match": ":"
	},
	{
		"type": "type",
		"start": 433,
		"end": 436,
		"match": "Int"
	},
	{
		"type": "operator",
		"start": 437,
		"end": 438,
		"match": "="
	},
	{
		"type": "number",
		"start": 439,
		"end": 441,
		"match": "10"
	},
	{
		"type": "punctuation",
		"start": 441,
		"end": 442,
		"match": ","
	},
	{
		"type": "property",
		"start": 443,
		"end": 449,
		"match": "filter"
	},
	{
		"type": "punctuation",
		"start": 449,
		"end": 450,
		"match": ":"
	},
	{
		"type": "type",
		"start": 451,
		"end": 457,
		"match": "Filter"
	},
	{
		"type": "operator",
		"start": 458,
		"end": 459,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 460,
		"end": 461,
		"match": "{"
	},
	{
		"type": "property",
		"start": 461,
		"end": 466,
		"match": "roles"
	},
	{
		"type": "punctuation",
		"start": 466,
		"end": 467,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 468,
		"end": 469,
		"match": "["
	},
	{
		"type": "constant",
		"start": 469,
		"end": 474,
		"match": "ADMIN"
	},
	{
		"type": "punctuation",
		"start": 474,
		"end": 475,
		"match": ","
	},
	{
		"type": "constant",
		"start": 476,
		"end": 480,
		"match": "user"
	},
	{
		"type": "punctuation",
		"start": 480,
		"end": 482,
		"match": "],"
	},
	{
		"type": "property",
		"start": 483,
		"end": 490,
		"match": "enabled"
	},
	{
		"type": "punctuation",
		"start": 490,
		"end": 491,
		"match": ":"
	},
	{
		"type": "boolean",
		"start": 492,
		"end": 496,
		"match": "true"
	},
	{
		"type": "punctuation",
		"start": 496,
		"end": 499,
		"match": "}):"
	},
	{
		"type": "punctuation",
		"start": 500,
		"end": 501,
		"match": "["
	},
	{
		"type": "type",
		"start": 501,
		"end": 505,
		"match": "User"
	},
	{
		"type": "operator",
		"start": 505,
		"end": 506,
		"match": "!"
	},
	{
		"type": "punctuation",
		"start": 506,
		"end": 507,
		"match": "]"
	},
	{
		"type": "operator",
		"start": 507,
		"end": 508,
		"match": "!"
	},
	{
		"type": "property",
		"start": 511,
		"end": 518,
		"match": "oldName"
	},
	{
		"type": "punctuation",
		"start": 518,
		"end": 519,
		"match": ":"
	},
	{
		"type": "type",
		"start": 520,
		"end": 526,
		"match": "String"
	},
	{
		"type": "decorator",
		"start": 527,
		"end": 538,
		"match": "@deprecated"
	},
	{
		"type": "punctuation",
		"start": 538,
		"end": 539,
		"match": "("
	},
	{
		"type": "property",
		"start": 539,
		"end": 545,
		"match": "reason"
	},
	{
		"type": "punctuation",
		"start": 545,
		"end": 546,
		"match": ":"
	},
	{
		"type": "string",
		"start": 547,
		"end": 557,
		"match": "\"Use name\""
	},
	{
		"type": "punctuation",
		"start": 557,
		"end": 558,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 559,
		"end": 560,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 561,
		"end": 566,
		"match": "union"
	},
	{
		"type": "type",
		"start": 567,
		"end": 579,
		"match": "SearchResult"
	},
	{
		"type": "operator",
		"start": 580,
		"end": 581,
		"match": "="
	},
	{
		"type": "operator",
		"start": 582,
		"end": 583,
		"match": "|"
	},
	{
		"type": "type",
		"start": 584,
		"end": 588,
		"match": "User"
	},
	{
		"type": "operator",
		"start": 589,
		"end": 590,
		"match": "|"
	},
	{
		"type": "type",
		"start": 591,
		"end": 596,
		"match": "Query"
	},
	{
		"type": "keyword",
		"start": 597,
		"end": 601,
		"match": "enum"
	},
	{
		"type": "type",
		"start": 602,
		"end": 606,
		"match": "Role"
	},
	{
		"type": "punctuation",
		"start": 607,
		"end": 608,
		"match": "{"
	},
	{
		"type": "constant",
		"start": 609,
		"end": 614,
		"match": "ADMIN"
	},
	{
		"type": "constant",
		"start": 615,
		"end": 619,
		"match": "user"
	},
	{
		"type": "constant",
		"start": 620,
		"end": 624,
		"match": "type"
	},
	{
		"type": "decorator",
		"start": 625,
		"end": 636,
		"match": "@deprecated"
	},
	{
		"type": "punctuation",
		"start": 637,
		"end": 638,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 639,
		"end": 644,
		"match": "input"
	},
	{
		"type": "type",
		"start": 645,
		"end": 651,
		"match": "Filter"
	},
	{
		"type": "decorator",
		"start": 652,
		"end": 658,
		"match": "@oneOf"
	},
	{
		"type": "punctuation",
		"start": 659,
		"end": 660,
		"match": "{"
	},
	{
		"type": "property",
		"start": 661,
		"end": 666,
		"match": "roles"
	},
	{
		"type": "punctuation",
		"start": 666,
		"end": 667,
		"match": ":"
	},
	{
		"type": "punctuation",
		"start": 668,
		"end": 669,
		"match": "["
	},
	{
		"type": "type",
		"start": 669,
		"end": 673,
		"match": "Role"
	},
	{
		"type": "operator",
		"start": 673,
		"end": 674,
		"match": "!"
	},
	{
		"type": "punctuation",
		"start": 674,
		"end": 675,
		"match": "]"
	},
	{
		"type": "property",
		"start": 676,
		"end": 683,
		"match": "enabled"
	},
	{
		"type": "punctuation",
		"start": 683,
		"end": 684,
		"match": ":"
	},
	{
		"type": "type",
		"start": 685,
		"end": 692,
		"match": "Boolean"
	},
	{
		"type": "punctuation",
		"start": 693,
		"end": 694,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 695,
		"end": 699,
		"match": "type"
	},
	{
		"type": "type",
		"start": 700,
		"end": 705,
		"match": "Query"
	},
	{
		"type": "punctuation",
		"start": 706,
		"end": 707,
		"match": "{"
	},
	{
		"type": "property",
		"start": 708,
		"end": 712,
		"match": "user"
	},
	{
		"type": "punctuation",
		"start": 712,
		"end": 713,
		"match": "("
	},
	{
		"type": "property",
		"start": 713,
		"end": 715,
		"match": "id"
	},
	{
		"type": "punctuation",
		"start": 715,
		"end": 716,
		"match": ":"
	},
	{
		"type": "type",
		"start": 717,
		"end": 719,
		"match": "ID"
	},
	{
		"type": "operator",
		"start": 719,
		"end": 720,
		"match": "!"
	},
	{
		"type": "punctuation",
		"start": 720,
		"end": 722,
		"match": "):"
	},
	{
		"type": "type",
		"start": 723,
		"end": 727,
		"match": "User"
	},
	{
		"type": "punctuation",
		"start": 728,
		"end": 729,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 730,
		"end": 734,
		"match": "type"
	},
	{
		"type": "type",
		"start": 735,
		"end": 743,
		"match": "Mutation"
	},
	{
		"type": "punctuation",
		"start": 744,
		"end": 745,
		"match": "{"
	},
	{
		"type": "property",
		"start": 746,
		"end": 756,
		"match": "updateUser"
	},
	{
		"type": "punctuation",
		"start": 756,
		"end": 757,
		"match": "("
	},
	{
		"type": "property",
		"start": 757,
		"end": 762,
		"match": "input"
	},
	{
		"type": "punctuation",
		"start": 762,
		"end": 763,
		"match": ":"
	},
	{
		"type": "type",
		"start": 764,
		"end": 770,
		"match": "Filter"
	},
	{
		"type": "operator",
		"start": 770,
		"end": 771,
		"match": "!"
	},
	{
		"type": "punctuation",
		"start": 771,
		"end": 773,
		"match": "):"
	},
	{
		"type": "type",
		"start": 774,
		"end": 778,
		"match": "User"
	},
	{
		"type": "punctuation",
		"start": 779,
		"end": 780,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 781,
		"end": 785,
		"match": "type"
	},
	{
		"type": "type",
		"start": 786,
		"end": 798,
		"match": "Subscription"
	},
	{
		"type": "punctuation",
		"start": 799,
		"end": 800,
		"match": "{"
	},
	{
		"type": "property",
		"start": 801,
		"end": 813,
		"match": "messageAdded"
	},
	{
		"type": "punctuation",
		"start": 813,
		"end": 814,
		"match": ":"
	},
	{
		"type": "type",
		"start": 815,
		"end": 821,
		"match": "String"
	},
	{
		"type": "punctuation",
		"start": 822,
		"end": 823,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 824,
		"end": 833,
		"match": "directive"
	},
	{
		"type": "decorator",
		"start": 834,
		"end": 840,
		"match": "@audit"
	},
	{
		"type": "punctuation",
		"start": 840,
		"end": 841,
		"match": "("
	},
	{
		"type": "property",
		"start": 841,
		"end": 846,
		"match": "level"
	},
	{
		"type": "punctuation",
		"start": 846,
		"end": 847,
		"match": ":"
	},
	{
		"type": "type",
		"start": 848,
		"end": 852,
		"match": "Role"
	},
	{
		"type": "operator",
		"start": 853,
		"end": 854,
		"match": "="
	},
	{
		"type": "constant",
		"start": 855,
		"end": 860,
		"match": "ADMIN"
	},
	{
		"type": "punctuation",
		"start": 860,
		"end": 861,
		"match": ")"
	},
	{
		"type": "keyword",
		"start": 862,
		"end": 872,
		"match": "repeatable"
	},
	{
		"type": "keyword",
		"start": 873,
		"end": 875,
		"match": "on"
	},
	{
		"type": "constant",
		"start": 876,
		"end": 881,
		"match": "FIELD"
	},
	{
		"type": "operator",
		"start": 882,
		"end": 883,
		"match": "|"
	},
	{
		"type": "constant",
		"start": 884,
		"end": 890,
		"match": "OBJECT"
	},
	{
		"type": "operator",
		"start": 891,
		"end": 892,
		"match": "|"
	},
	{
		"type": "constant",
		"start": 893,
		"end": 898,
		"match": "QUERY"
	},
	{
		"type": "keyword",
		"start": 899,
		"end": 905,
		"match": "extend"
	},
	{
		"type": "keyword",
		"start": 906,
		"end": 912,
		"match": "schema"
	},
	{
		"type": "decorator",
		"start": 913,
		"end": 921,
		"match": "@service"
	},
	{
		"type": "punctuation",
		"start": 921,
		"end": 922,
		"match": "("
	},
	{
		"type": "property",
		"start": 922,
		"end": 926,
		"match": "name"
	},
	{
		"type": "punctuation",
		"start": 926,
		"end": 927,
		"match": ":"
	},
	{
		"type": "string",
		"start": 928,
		"end": 935,
		"match": "\"extra\""
	},
	{
		"type": "punctuation",
		"start": 935,
		"end": 936,
		"match": ")"
	},
	{
		"type": "keyword",
		"start": 937,
		"end": 943,
		"match": "extend"
	},
	{
		"type": "keyword",
		"start": 944,
		"end": 950,
		"match": "scalar"
	},
	{
		"type": "type",
		"start": 951,
		"end": 959,
		"match": "DateTime"
	},
	{
		"type": "decorator",
		"start": 960,
		"end": 972,
		"match": "@specifiedBy"
	},
	{
		"type": "punctuation",
		"start": 972,
		"end": 973,
		"match": "("
	},
	{
		"type": "property",
		"start": 973,
		"end": 976,
		"match": "url"
	},
	{
		"type": "punctuation",
		"start": 976,
		"end": 977,
		"match": ":"
	},
	{
		"type": "string",
		"start": 978,
		"end": 1003,
		"match": "\"https://example.com/new\""
	},
	{
		"type": "punctuation",
		"start": 1003,
		"end": 1004,
		"match": ")"
	},
	{
		"type": "keyword",
		"start": 1005,
		"end": 1011,
		"match": "extend"
	},
	{
		"type": "keyword",
		"start": 1012,
		"end": 1016,
		"match": "type"
	},
	{
		"type": "type",
		"start": 1017,
		"end": 1021,
		"match": "User"
	},
	{
		"type": "keyword",
		"start": 1022,
		"end": 1032,
		"match": "implements"
	},
	{
		"type": "type",
		"start": 1033,
		"end": 1037,
		"match": "Node"
	},
	{
		"type": "decorator",
		"start": 1038,
		"end": 1044,
		"match": "@audit"
	},
	{
		"type": "punctuation",
		"start": 1045,
		"end": 1046,
		"match": "{"
	},
	{
		"type": "property",
		"start": 1047,
		"end": 1050,
		"match": "age"
	},
	{
		"type": "punctuation",
		"start": 1050,
		"end": 1051,
		"match": ":"
	},
	{
		"type": "type",
		"start": 1052,
		"end": 1055,
		"match": "Int"
	},
	{
		"type": "punctuation",
		"start": 1056,
		"end": 1057,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 1058,
		"end": 1064,
		"match": "extend"
	},
	{
		"type": "keyword",
		"start": 1065,
		"end": 1074,
		"match": "interface"
	},
	{
		"type": "type",
		"start": 1075,
		"end": 1079,
		"match": "Node"
	},
	{
		"type": "punctuation",
		"start": 1080,
		"end": 1081,
		"match": "{"
	},
	{
		"type": "property",
		"start": 1082,
		"end": 1091,
		"match": "createdAt"
	},
	{
		"type": "punctuation",
		"start": 1091,
		"end": 1092,
		"match": ":"
	},
	{
		"type": "type",
		"start": 1093,
		"end": 1101,
		"match": "DateTime"
	},
	{
		"type": "punctuation",
		"start": 1102,
		"end": 1103,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 1104,
		"end": 1110,
		"match": "extend"
	},
	{
		"type": "keyword",
		"start": 1111,
		"end": 1116,
		"match": "union"
	},
	{
		"type": "type",
		"start": 1117,
		"end": 1129,
		"match": "SearchResult"
	},
	{
		"type": "operator",
		"start": 1130,
		"end": 1131,
		"match": "="
	},
	{
		"type": "type",
		"start": 1132,
		"end": 1140,
		"match": "Mutation"
	},
	{
		"type": "keyword",
		"start": 1141,
		"end": 1147,
		"match": "extend"
	},
	{
		"type": "keyword",
		"start": 1148,
		"end": 1152,
		"match": "enum"
	},
	{
		"type": "type",
		"start": 1153,
		"end": 1157,
		"match": "Role"
	},
	{
		"type": "punctuation",
		"start": 1158,
		"end": 1159,
		"match": "{"
	},
	{
		"type": "constant",
		"start": 1160,
		"end": 1165,
		"match": "GUEST"
	},
	{
		"type": "punctuation",
		"start": 1166,
		"end": 1167,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 1168,
		"end": 1174,
		"match": "extend"
	},
	{
		"type": "keyword",
		"start": 1175,
		"end": 1180,
		"match": "input"
	},
	{
		"type": "type",
		"start": 1181,
		"end": 1187,
		"match": "Filter"
	},
	{
		"type": "punctuation",
		"start": 1188,
		"end": 1189,
		"match": "{"
	},
	{
		"type": "property",
		"start": 1190,
		"end": 1195,
		"match": "limit"
	},
	{
		"type": "punctuation",
		"start": 1195,
		"end": 1196,
		"match": ":"
	},
	{
		"type": "type",
		"start": 1197,
		"end": 1200,
		"match": "Int"
	},
	{
		"type": "punctuation",
		"start": 1201,
		"end": 1202,
		"match": "}"
	}
];
