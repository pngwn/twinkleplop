export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 5,
		"match": "using"
	},
	{
		"type": "keyword",
		"start": 6,
		"end": 15,
		"match": "namespace"
	},
	{
		"type": "identifier",
		"start": 16,
		"end": 42,
		"match": "System.Collections.Generic"
	},
	{
		"type": "keyword",
		"start": 43,
		"end": 51,
		"match": "FuNcTiOn"
	},
	{
		"type": "function",
		"start": 52,
		"end": 62,
		"match": "Get-Report"
	},
	{
		"type": "punctuation",
		"start": 63,
		"end": 64,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 69,
		"end": 70,
		"match": "["
	},
	{
		"type": "type",
		"start": 70,
		"end": 83,
		"match": "CmdletBinding"
	},
	{
		"type": "punctuation",
		"start": 83,
		"end": 86,
		"match": "()]"
	},
	{
		"type": "keyword",
		"start": 91,
		"end": 96,
		"match": "param"
	},
	{
		"type": "punctuation",
		"start": 96,
		"end": 98,
		"match": "(["
	},
	{
		"type": "type",
		"start": 98,
		"end": 107,
		"match": "Parameter"
	},
	{
		"type": "punctuation",
		"start": 107,
		"end": 108,
		"match": "("
	},
	{
		"type": "identifier",
		"start": 108,
		"end": 117,
		"match": "Mandatory"
	},
	{
		"type": "operator",
		"start": 117,
		"end": 118,
		"match": "="
	},
	{
		"type": "boolean",
		"start": 118,
		"end": 123,
		"match": "$true"
	},
	{
		"type": "punctuation",
		"start": 123,
		"end": 126,
		"match": ")]["
	},
	{
		"type": "type",
		"start": 126,
		"end": 132,
		"match": "string"
	},
	{
		"type": "punctuation",
		"start": 132,
		"end": 133,
		"match": "]"
	},
	{
		"type": "variable",
		"start": 133,
		"end": 138,
		"match": "$Name"
	},
	{
		"type": "punctuation",
		"start": 138,
		"end": 139,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 140,
		"end": 141,
		"match": "["
	},
	{
		"type": "type",
		"start": 141,
		"end": 147,
		"match": "switch"
	},
	{
		"type": "punctuation",
		"start": 147,
		"end": 148,
		"match": "]"
	},
	{
		"type": "variable",
		"start": 148,
		"end": 154,
		"match": "$Force"
	},
	{
		"type": "punctuation",
		"start": 154,
		"end": 155,
		"match": ")"
	},
	{
		"type": "keyword",
		"start": 160,
		"end": 165,
		"match": "begin"
	},
	{
		"type": "punctuation",
		"start": 166,
		"end": 167,
		"match": "{"
	},
	{
		"type": "variable",
		"start": 168,
		"end": 181,
		"match": "$script:count"
	},
	{
		"type": "operator",
		"start": 182,
		"end": 183,
		"match": "="
	},
	{
		"type": "number",
		"start": 184,
		"end": 185,
		"match": "0"
	},
	{
		"type": "punctuation",
		"start": 186,
		"end": 187,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 192,
		"end": 199,
		"match": "process"
	},
	{
		"type": "punctuation",
		"start": 200,
		"end": 201,
		"match": "{"
	},
	{
		"type": "variable",
		"start": 210,
		"end": 219,
		"match": "$settings"
	},
	{
		"type": "operator",
		"start": 220,
		"end": 221,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 222,
		"end": 224,
		"match": "@{"
	},
	{
		"type": "identifier",
		"start": 225,
		"end": 229,
		"match": "Name"
	},
	{
		"type": "operator",
		"start": 230,
		"end": 231,
		"match": "="
	},
	{
		"type": "variable",
		"start": 232,
		"end": 237,
		"match": "$Name"
	},
	{
		"type": "punctuation",
		"start": 237,
		"end": 238,
		"match": ";"
	},
	{
		"type": "identifier",
		"start": 239,
		"end": 246,
		"match": "Enabled"
	},
	{
		"type": "operator",
		"start": 247,
		"end": 248,
		"match": "="
	},
	{
		"type": "boolean",
		"start": 249,
		"end": 254,
		"match": "$TRUE"
	},
	{
		"type": "punctuation",
		"start": 254,
		"end": 255,
		"match": ";"
	},
	{
		"type": "identifier",
		"start": 256,
		"end": 261,
		"match": "Count"
	},
	{
		"type": "operator",
		"start": 262,
		"end": 263,
		"match": "="
	},
	{
		"type": "number",
		"start": 264,
		"end": 267,
		"match": "1KB"
	},
	{
		"type": "punctuation",
		"start": 268,
		"end": 269,
		"match": "}"
	},
	{
		"type": "variable",
		"start": 278,
		"end": 283,
		"match": "$list"
	},
	{
		"type": "operator",
		"start": 284,
		"end": 285,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 286,
		"end": 287,
		"match": "["
	},
	{
		"type": "type",
		"start": 287,
		"end": 318,
		"match": "System.Collections.Generic.List"
	},
	{
		"type": "punctuation",
		"start": 318,
		"end": 319,
		"match": "["
	},
	{
		"type": "type",
		"start": 319,
		"end": 325,
		"match": "string"
	},
	{
		"type": "punctuation",
		"start": 325,
		"end": 327,
		"match": "]]"
	},
	{
		"type": "punctuation",
		"start": 327,
		"end": 329,
		"match": "::"
	},
	{
		"type": "property",
		"start": 329,
		"end": 332,
		"match": "new"
	},
	{
		"type": "punctuation",
		"start": 332,
		"end": 334,
		"match": "()"
	},
	{
		"type": "variable",
		"start": 343,
		"end": 349,
		"match": "$items"
	},
	{
		"type": "punctuation",
		"start": 349,
		"end": 350,
		"match": "["
	},
	{
		"type": "number",
		"start": 350,
		"end": 351,
		"match": "0"
	},
	{
		"type": "punctuation",
		"start": 351,
		"end": 353,
		"match": "];"
	},
	{
		"type": "variable",
		"start": 354,
		"end": 360,
		"match": "$items"
	},
	{
		"type": "punctuation",
		"start": 360,
		"end": 361,
		"match": "["
	},
	{
		"type": "variable",
		"start": 361,
		"end": 367,
		"match": "$index"
	},
	{
		"type": "punctuation",
		"start": 367,
		"end": 369,
		"match": "];"
	},
	{
		"type": "variable",
		"start": 370,
		"end": 376,
		"match": "$items"
	},
	{
		"type": "punctuation",
		"start": 376,
		"end": 377,
		"match": "["
	},
	{
		"type": "number",
		"start": 377,
		"end": 378,
		"match": "1"
	},
	{
		"type": "operator",
		"start": 378,
		"end": 380,
		"match": ".."
	},
	{
		"type": "number",
		"start": 380,
		"end": 381,
		"match": "3"
	},
	{
		"type": "punctuation",
		"start": 381,
		"end": 382,
		"match": "]"
	},
	{
		"type": "variable",
		"start": 391,
		"end": 402,
		"match": "${settings}"
	},
	{
		"type": "punctuation",
		"start": 402,
		"end": 404,
		"match": "?."
	},
	{
		"type": "property",
		"start": 404,
		"end": 408,
		"match": "Name"
	},
	{
		"type": "variable",
		"start": 417,
		"end": 425,
		"match": "${items}"
	},
	{
		"type": "operator",
		"start": 425,
		"end": 427,
		"match": "?["
	},
	{
		"type": "number",
		"start": 427,
		"end": 428,
		"match": "0"
	},
	{
		"type": "punctuation",
		"start": 428,
		"end": 429,
		"match": "]"
	},
	{
		"type": "variable",
		"start": 438,
		"end": 443,
		"match": "$type"
	},
	{
		"type": "punctuation",
		"start": 443,
		"end": 445,
		"match": "::"
	},
	{
		"type": "property",
		"start": 445,
		"end": 451,
		"match": "Member"
	},
	{
		"type": "variable",
		"start": 460,
		"end": 467,
		"match": "$object"
	},
	{
		"type": "punctuation",
		"start": 467,
		"end": 468,
		"match": "."
	},
	{
		"type": "property",
		"start": 468,
		"end": 470,
		"match": "if"
	},
	{
		"type": "punctuation",
		"start": 470,
		"end": 471,
		"match": ";"
	},
	{
		"type": "variable",
		"start": 472,
		"end": 479,
		"match": "$object"
	},
	{
		"type": "punctuation",
		"start": 479,
		"end": 480,
		"match": "."
	},
	{
		"type": "property",
		"start": 480,
		"end": 486,
		"match": "return"
	},
	{
		"type": "keyword",
		"start": 495,
		"end": 497,
		"match": "if"
	},
	{
		"type": "punctuation",
		"start": 498,
		"end": 499,
		"match": "("
	},
	{
		"type": "variable",
		"start": 499,
		"end": 504,
		"match": "$Name"
	},
	{
		"type": "operator",
		"start": 505,
		"end": 515,
		"match": "-cnotmatch"
	},
	{
		"type": "string",
		"start": 516,
		"end": 523,
		"match": "'^temp'"
	},
	{
		"type": "operator",
		"start": 524,
		"end": 528,
		"match": "-and"
	},
	{
		"type": "operator",
		"start": 529,
		"end": 533,
		"match": "-not"
	},
	{
		"type": "variable",
		"start": 534,
		"end": 540,
		"match": "$Force"
	},
	{
		"type": "punctuation",
		"start": 540,
		"end": 541,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 542,
		"end": 543,
		"match": "{"
	},
	{
		"type": "keyword",
		"start": 544,
		"end": 550,
		"match": "return"
	},
	{
		"type": "keyword",
		"start": 551,
		"end": 556,
		"match": "$null"
	},
	{
		"type": "punctuation",
		"start": 557,
		"end": 558,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 567,
		"end": 570,
		"match": "try"
	},
	{
		"type": "punctuation",
		"start": 571,
		"end": 572,
		"match": "{"
	},
	{
		"type": "operator",
		"start": 573,
		"end": 574,
		"match": "&"
	},
	{
		"type": "variable",
		"start": 575,
		"end": 583,
		"match": "$command"
	},
	{
		"type": "variable",
		"start": 584,
		"end": 593,
		"match": "@settings"
	},
	{
		"type": "parameter",
		"start": 594,
		"end": 606,
		"match": "-ErrorAction"
	},
	{
		"type": "identifier",
		"start": 607,
		"end": 611,
		"match": "Stop"
	},
	{
		"type": "punctuation",
		"start": 612,
		"end": 613,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 614,
		"end": 619,
		"match": "catch"
	},
	{
		"type": "punctuation",
		"start": 620,
		"end": 621,
		"match": "{"
	},
	{
		"type": "keyword",
		"start": 622,
		"end": 627,
		"match": "throw"
	},
	{
		"type": "punctuation",
		"start": 628,
		"end": 629,
		"match": "}"
	},
	{
		"type": "variable",
		"start": 638,
		"end": 651,
		"match": "$script:count"
	},
	{
		"type": "operator",
		"start": 651,
		"end": 653,
		"match": "++"
	},
	{
		"type": "punctuation",
		"start": 658,
		"end": 659,
		"match": "}"
	},
	{
		"type": "keyword",
		"start": 664,
		"end": 669,
		"match": "clean"
	},
	{
		"type": "punctuation",
		"start": 670,
		"end": 671,
		"match": "{"
	},
	{
		"type": "identifier",
		"start": 672,
		"end": 685,
		"match": "Write-Verbose"
	},
	{
		"type": "string",
		"start": 686,
		"end": 692,
		"match": "'done'"
	},
	{
		"type": "punctuation",
		"start": 693,
		"end": 694,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 695,
		"end": 696,
		"match": "}"
	},
	{
		"type": "identifier",
		"start": 697,
		"end": 708,
		"match": "Get-Process"
	},
	{
		"type": "operator",
		"start": 709,
		"end": 710,
		"match": "|"
	},
	{
		"type": "identifier",
		"start": 711,
		"end": 723,
		"match": "Where-Object"
	},
	{
		"type": "punctuation",
		"start": 724,
		"end": 725,
		"match": "{"
	},
	{
		"type": "variable",
		"start": 726,
		"end": 728,
		"match": "$_"
	},
	{
		"type": "punctuation",
		"start": 728,
		"end": 729,
		"match": "."
	},
	{
		"type": "property",
		"start": 729,
		"end": 739,
		"match": "WorkingSet"
	},
	{
		"type": "operator",
		"start": 740,
		"end": 743,
		"match": "-GT"
	},
	{
		"type": "number",
		"start": 744,
		"end": 749,
		"match": "1.5GB"
	},
	{
		"type": "operator",
		"start": 750,
		"end": 754,
		"match": "-and"
	},
	{
		"type": "keyword",
		"start": 755,
		"end": 760,
		"match": "$null"
	},
	{
		"type": "operator",
		"start": 761,
		"end": 764,
		"match": "-ne"
	},
	{
		"type": "variable",
		"start": 765,
		"end": 767,
		"match": "$_"
	},
	{
		"type": "punctuation",
		"start": 768,
		"end": 769,
		"match": "}"
	},
	{
		"type": "operator",
		"start": 770,
		"end": 774,
		"match": "2>&1"
	},
	{
		"type": "comment",
		"start": 775,
		"end": 783,
		"match": "# report"
	},
	{
		"type": "variable",
		"start": 784,
		"end": 792,
		"match": "$unicode"
	},
	{
		"type": "operator",
		"start": 793,
		"end": 794,
		"match": "="
	},
	{
		"type": "variable",
		"start": 795,
		"end": 800,
		"match": "$café"
	},
	{
		"type": "punctuation",
		"start": 800,
		"end": 801,
		"match": ","
	},
	{
		"type": "variable",
		"start": 802,
		"end": 805,
		"match": "$総計"
	},
	{
		"type": "punctuation",
		"start": 805,
		"end": 806,
		"match": ","
	},
	{
		"type": "variable",
		"start": 807,
		"end": 826,
		"match": "${name with spaces}"
	},
	{
		"type": "punctuation",
		"start": 826,
		"end": 827,
		"match": ","
	},
	{
		"type": "variable",
		"start": 828,
		"end": 837,
		"match": "$env:PATH"
	},
	{
		"type": "punctuation",
		"start": 837,
		"end": 838,
		"match": ","
	},
	{
		"type": "variable",
		"start": 839,
		"end": 852,
		"match": "$script:count"
	},
	{
		"type": "punctuation",
		"start": 852,
		"end": 853,
		"match": ","
	},
	{
		"type": "variable",
		"start": 854,
		"end": 856,
		"match": "$$"
	},
	{
		"type": "punctuation",
		"start": 856,
		"end": 857,
		"match": ","
	},
	{
		"type": "variable",
		"start": 858,
		"end": 860,
		"match": "$?"
	},
	{
		"type": "punctuation",
		"start": 860,
		"end": 861,
		"match": ","
	},
	{
		"type": "variable",
		"start": 862,
		"end": 864,
		"match": "$^"
	},
	{
		"type": "identifier",
		"start": 865,
		"end": 874,
		"match": "if-config"
	},
	{
		"type": "parameter",
		"start": 875,
		"end": 883,
		"match": "-notable"
	},
	{
		"type": "parameter",
		"start": 884,
		"end": 889,
		"match": "-Name"
	},
	{
		"type": "punctuation",
		"start": 889,
		"end": 890,
		"match": ":"
	},
	{
		"type": "boolean",
		"start": 890,
		"end": 896,
		"match": "$false"
	},
	{
		"type": "parameter",
		"start": 897,
		"end": 906,
		"match": "-FilePath"
	},
	{
		"type": "punctuation",
		"start": 907,
		"end": 908,
		"match": "."
	},
	{
		"type": "operator",
		"start": 908,
		"end": 909,
		"match": "/"
	},
	{
		"type": "identifier",
		"start": 909,
		"end": 919,
		"match": "report.txt"
	},
	{
		"type": "keyword",
		"start": 920,
		"end": 925,
		"match": "class"
	},
	{
		"type": "identifier",
		"start": 926,
		"end": 932,
		"match": "Report"
	},
	{
		"type": "punctuation",
		"start": 933,
		"end": 934,
		"match": "{"
	},
	{
		"type": "keyword",
		"start": 935,
		"end": 941,
		"match": "hidden"
	},
	{
		"type": "punctuation",
		"start": 942,
		"end": 943,
		"match": "["
	},
	{
		"type": "type",
		"start": 943,
		"end": 949,
		"match": "string"
	},
	{
		"type": "punctuation",
		"start": 949,
		"end": 950,
		"match": "]"
	},
	{
		"type": "variable",
		"start": 950,
		"end": 955,
		"match": "$Name"
	},
	{
		"type": "punctuation",
		"start": 955,
		"end": 956,
		"match": ";"
	},
	{
		"type": "keyword",
		"start": 957,
		"end": 963,
		"match": "static"
	},
	{
		"type": "punctuation",
		"start": 964,
		"end": 965,
		"match": "["
	},
	{
		"type": "type",
		"start": 965,
		"end": 968,
		"match": "int"
	},
	{
		"type": "punctuation",
		"start": 968,
		"end": 969,
		"match": "]"
	},
	{
		"type": "variable",
		"start": 969,
		"end": 975,
		"match": "$Count"
	},
	{
		"type": "operator",
		"start": 976,
		"end": 977,
		"match": "="
	},
	{
		"type": "number",
		"start": 978,
		"end": 979,
		"match": "0"
	},
	{
		"type": "punctuation",
		"start": 980,
		"end": 981,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 982,
		"end": 983,
		"match": ":"
	},
	{
		"type": "identifier",
		"start": 983,
		"end": 988,
		"match": "retry"
	},
	{
		"type": "keyword",
		"start": 989,
		"end": 994,
		"match": "while"
	},
	{
		"type": "punctuation",
		"start": 995,
		"end": 996,
		"match": "("
	},
	{
		"type": "boolean",
		"start": 996,
		"end": 1001,
		"match": "$true"
	},
	{
		"type": "punctuation",
		"start": 1001,
		"end": 1002,
		"match": ")"
	},
	{
		"type": "punctuation",
		"start": 1003,
		"end": 1004,
		"match": "{"
	},
	{
		"type": "keyword",
		"start": 1005,
		"end": 1010,
		"match": "break"
	},
	{
		"type": "identifier",
		"start": 1011,
		"end": 1016,
		"match": "retry"
	},
	{
		"type": "punctuation",
		"start": 1017,
		"end": 1018,
		"match": "}"
	}
];
