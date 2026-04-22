export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 240,
		"match": "# ============================================================\n# EDGE CASE FILE 3: Datetimes and Complex Multi-type Document\n# Sources: toml-test spec-1.0.0 + manual test cases\n# ============================================================\n"
	},
	{
		"type": "comment",
		"start": 241,
		"end": 287,
		"match": "# --- (8) Local date/time/datetime values ---\n"
	},
	{
		"type": "comment",
		"start": 288,
		"end": 318,
		"match": "# Offset datetimes (RFC 3339)\n"
	},
	{
		"type": "property",
		"start": 318,
		"end": 322,
		"match": "odt1"
	},
	{
		"type": "operator",
		"start": 323,
		"end": 324,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 325,
		"end": 329,
		"match": "1979"
	},
	{
		"type": "punctuation",
		"start": 329,
		"end": 330,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 330,
		"end": 332,
		"match": "05"
	},
	{
		"type": "punctuation",
		"start": 332,
		"end": 333,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 333,
		"end": 338,
		"match": "27T07"
	},
	{
		"type": "punctuation",
		"start": 338,
		"end": 339,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 339,
		"end": 341,
		"match": "32"
	},
	{
		"type": "punctuation",
		"start": 341,
		"end": 342,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 342,
		"end": 345,
		"match": "00Z"
	},
	{
		"type": "property",
		"start": 346,
		"end": 350,
		"match": "odt2"
	},
	{
		"type": "operator",
		"start": 351,
		"end": 352,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 353,
		"end": 357,
		"match": "1979"
	},
	{
		"type": "punctuation",
		"start": 357,
		"end": 358,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 358,
		"end": 360,
		"match": "05"
	},
	{
		"type": "punctuation",
		"start": 360,
		"end": 361,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 361,
		"end": 366,
		"match": "27T00"
	},
	{
		"type": "punctuation",
		"start": 366,
		"end": 367,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 367,
		"end": 369,
		"match": "32"
	},
	{
		"type": "punctuation",
		"start": 369,
		"end": 370,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 370,
		"end": 372,
		"match": "00"
	},
	{
		"type": "punctuation",
		"start": 372,
		"end": 373,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 373,
		"end": 375,
		"match": "07"
	},
	{
		"type": "punctuation",
		"start": 375,
		"end": 376,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 376,
		"end": 378,
		"match": "00"
	},
	{
		"type": "property",
		"start": 379,
		"end": 383,
		"match": "odt3"
	},
	{
		"type": "operator",
		"start": 384,
		"end": 385,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 386,
		"end": 390,
		"match": "1979"
	},
	{
		"type": "punctuation",
		"start": 390,
		"end": 391,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 391,
		"end": 393,
		"match": "05"
	},
	{
		"type": "punctuation",
		"start": 393,
		"end": 394,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 394,
		"end": 399,
		"match": "27T00"
	},
	{
		"type": "punctuation",
		"start": 399,
		"end": 400,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 400,
		"end": 402,
		"match": "32"
	},
	{
		"type": "punctuation",
		"start": 402,
		"end": 403,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 403,
		"end": 405,
		"match": "00"
	},
	{
		"type": "punctuation",
		"start": 405,
		"end": 406,
		"match": "."
	},
	{
		"type": "datetime",
		"start": 406,
		"end": 412,
		"match": "999999"
	},
	{
		"type": "punctuation",
		"start": 412,
		"end": 413,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 413,
		"end": 415,
		"match": "07"
	},
	{
		"type": "punctuation",
		"start": 415,
		"end": 416,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 416,
		"end": 418,
		"match": "00"
	},
	{
		"type": "comment",
		"start": 420,
		"end": 490,
		"match": "# From tests/valid/datetime/datetime.toml: space separator, lowercase\n"
	},
	{
		"type": "property",
		"start": 490,
		"end": 498,
		"match": "space_dt"
	},
	{
		"type": "operator",
		"start": 499,
		"end": 500,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 501,
		"end": 505,
		"match": "1987"
	},
	{
		"type": "punctuation",
		"start": 505,
		"end": 506,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 506,
		"end": 508,
		"match": "07"
	},
	{
		"type": "punctuation",
		"start": 508,
		"end": 509,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 509,
		"end": 514,
		"match": "05 17"
	},
	{
		"type": "punctuation",
		"start": 514,
		"end": 515,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 515,
		"end": 517,
		"match": "45"
	},
	{
		"type": "punctuation",
		"start": 517,
		"end": 518,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 518,
		"end": 521,
		"match": "00Z"
	},
	{
		"type": "comment",
		"start": 523,
		"end": 586,
		"match": "# ABNF is case-insensitive, both \"Z\" and \"z\" must be supported\n"
	},
	{
		"type": "property",
		"start": 586,
		"end": 594,
		"match": "lower_dt"
	},
	{
		"type": "operator",
		"start": 595,
		"end": 596,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 597,
		"end": 601,
		"match": "1987"
	},
	{
		"type": "punctuation",
		"start": 601,
		"end": 602,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 602,
		"end": 604,
		"match": "07"
	},
	{
		"type": "punctuation",
		"start": 604,
		"end": 605,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 605,
		"end": 610,
		"match": "05t17"
	},
	{
		"type": "punctuation",
		"start": 610,
		"end": 611,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 611,
		"end": 613,
		"match": "45"
	},
	{
		"type": "punctuation",
		"start": 613,
		"end": 614,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 614,
		"end": 617,
		"match": "00z"
	},
	{
		"type": "comment",
		"start": 619,
		"end": 688,
		"match": "# From tests/valid/datetime/milliseconds.toml: millisecond precision\n"
	},
	{
		"type": "property",
		"start": 688,
		"end": 692,
		"match": "utc1"
	},
	{
		"type": "operator",
		"start": 693,
		"end": 694,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 695,
		"end": 699,
		"match": "1987"
	},
	{
		"type": "punctuation",
		"start": 699,
		"end": 700,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 700,
		"end": 702,
		"match": "07"
	},
	{
		"type": "punctuation",
		"start": 702,
		"end": 703,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 703,
		"end": 708,
		"match": "05T17"
	},
	{
		"type": "punctuation",
		"start": 708,
		"end": 709,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 709,
		"end": 711,
		"match": "45"
	},
	{
		"type": "punctuation",
		"start": 711,
		"end": 712,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 712,
		"end": 714,
		"match": "56"
	},
	{
		"type": "punctuation",
		"start": 714,
		"end": 715,
		"match": "."
	},
	{
		"type": "datetime",
		"start": 715,
		"end": 719,
		"match": "123Z"
	},
	{
		"type": "property",
		"start": 720,
		"end": 724,
		"match": "utc2"
	},
	{
		"type": "operator",
		"start": 725,
		"end": 726,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 727,
		"end": 731,
		"match": "1987"
	},
	{
		"type": "punctuation",
		"start": 731,
		"end": 732,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 732,
		"end": 734,
		"match": "07"
	},
	{
		"type": "punctuation",
		"start": 734,
		"end": 735,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 735,
		"end": 740,
		"match": "05T17"
	},
	{
		"type": "punctuation",
		"start": 740,
		"end": 741,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 741,
		"end": 743,
		"match": "45"
	},
	{
		"type": "punctuation",
		"start": 743,
		"end": 744,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 744,
		"end": 746,
		"match": "56"
	},
	{
		"type": "punctuation",
		"start": 746,
		"end": 747,
		"match": "."
	},
	{
		"type": "datetime",
		"start": 747,
		"end": 749,
		"match": "6Z"
	},
	{
		"type": "property",
		"start": 750,
		"end": 755,
		"match": "wita1"
	},
	{
		"type": "operator",
		"start": 756,
		"end": 757,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 758,
		"end": 762,
		"match": "1987"
	},
	{
		"type": "punctuation",
		"start": 762,
		"end": 763,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 763,
		"end": 765,
		"match": "07"
	},
	{
		"type": "punctuation",
		"start": 765,
		"end": 766,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 766,
		"end": 771,
		"match": "05T17"
	},
	{
		"type": "punctuation",
		"start": 771,
		"end": 772,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 772,
		"end": 774,
		"match": "45"
	},
	{
		"type": "punctuation",
		"start": 774,
		"end": 775,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 775,
		"end": 777,
		"match": "56"
	},
	{
		"type": "punctuation",
		"start": 777,
		"end": 778,
		"match": "."
	},
	{
		"type": "datetime",
		"start": 778,
		"end": 781,
		"match": "123"
	},
	{
		"type": "punctuation",
		"start": 781,
		"end": 782,
		"match": "+"
	},
	{
		"type": "datetime",
		"start": 782,
		"end": 784,
		"match": "08"
	},
	{
		"type": "punctuation",
		"start": 784,
		"end": 785,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 785,
		"end": 787,
		"match": "00"
	},
	{
		"type": "property",
		"start": 788,
		"end": 793,
		"match": "wita2"
	},
	{
		"type": "operator",
		"start": 794,
		"end": 795,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 796,
		"end": 800,
		"match": "1987"
	},
	{
		"type": "punctuation",
		"start": 800,
		"end": 801,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 801,
		"end": 803,
		"match": "07"
	},
	{
		"type": "punctuation",
		"start": 803,
		"end": 804,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 804,
		"end": 809,
		"match": "05T17"
	},
	{
		"type": "punctuation",
		"start": 809,
		"end": 810,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 810,
		"end": 812,
		"match": "45"
	},
	{
		"type": "punctuation",
		"start": 812,
		"end": 813,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 813,
		"end": 815,
		"match": "56"
	},
	{
		"type": "punctuation",
		"start": 815,
		"end": 816,
		"match": "."
	},
	{
		"type": "datetime",
		"start": 816,
		"end": 817,
		"match": "6"
	},
	{
		"type": "punctuation",
		"start": 817,
		"end": 818,
		"match": "+"
	},
	{
		"type": "datetime",
		"start": 818,
		"end": 820,
		"match": "08"
	},
	{
		"type": "punctuation",
		"start": 820,
		"end": 821,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 821,
		"end": 823,
		"match": "00"
	},
	{
		"type": "comment",
		"start": 825,
		"end": 856,
		"match": "# Local datetime (no timezone)\n"
	},
	{
		"type": "property",
		"start": 856,
		"end": 860,
		"match": "ldt1"
	},
	{
		"type": "operator",
		"start": 861,
		"end": 862,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 863,
		"end": 867,
		"match": "1979"
	},
	{
		"type": "punctuation",
		"start": 867,
		"end": 868,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 868,
		"end": 870,
		"match": "05"
	},
	{
		"type": "punctuation",
		"start": 870,
		"end": 871,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 871,
		"end": 876,
		"match": "27T07"
	},
	{
		"type": "punctuation",
		"start": 876,
		"end": 877,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 877,
		"end": 879,
		"match": "32"
	},
	{
		"type": "punctuation",
		"start": 879,
		"end": 880,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 880,
		"end": 882,
		"match": "00"
	},
	{
		"type": "property",
		"start": 883,
		"end": 887,
		"match": "ldt2"
	},
	{
		"type": "operator",
		"start": 888,
		"end": 889,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 890,
		"end": 894,
		"match": "1979"
	},
	{
		"type": "punctuation",
		"start": 894,
		"end": 895,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 895,
		"end": 897,
		"match": "05"
	},
	{
		"type": "punctuation",
		"start": 897,
		"end": 898,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 898,
		"end": 903,
		"match": "27T00"
	},
	{
		"type": "punctuation",
		"start": 903,
		"end": 904,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 904,
		"end": 906,
		"match": "32"
	},
	{
		"type": "punctuation",
		"start": 906,
		"end": 907,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 907,
		"end": 909,
		"match": "00"
	},
	{
		"type": "punctuation",
		"start": 909,
		"end": 910,
		"match": "."
	},
	{
		"type": "datetime",
		"start": 910,
		"end": 916,
		"match": "999999"
	},
	{
		"type": "comment",
		"start": 918,
		"end": 957,
		"match": "# From tests/valid/datetime/local.toml\n"
	},
	{
		"type": "property",
		"start": 957,
		"end": 962,
		"match": "local"
	},
	{
		"type": "operator",
		"start": 963,
		"end": 964,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 965,
		"end": 969,
		"match": "1987"
	},
	{
		"type": "punctuation",
		"start": 969,
		"end": 970,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 970,
		"end": 972,
		"match": "07"
	},
	{
		"type": "punctuation",
		"start": 972,
		"end": 973,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 973,
		"end": 978,
		"match": "05T17"
	},
	{
		"type": "punctuation",
		"start": 978,
		"end": 979,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 979,
		"end": 981,
		"match": "45"
	},
	{
		"type": "punctuation",
		"start": 981,
		"end": 982,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 982,
		"end": 984,
		"match": "00"
	},
	{
		"type": "property",
		"start": 985,
		"end": 994,
		"match": "milli_ldt"
	},
	{
		"type": "operator",
		"start": 995,
		"end": 996,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 997,
		"end": 1001,
		"match": "1977"
	},
	{
		"type": "punctuation",
		"start": 1001,
		"end": 1002,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1002,
		"end": 1004,
		"match": "12"
	},
	{
		"type": "punctuation",
		"start": 1004,
		"end": 1005,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1005,
		"end": 1010,
		"match": "21T10"
	},
	{
		"type": "punctuation",
		"start": 1010,
		"end": 1011,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1011,
		"end": 1013,
		"match": "32"
	},
	{
		"type": "punctuation",
		"start": 1013,
		"end": 1014,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1014,
		"end": 1016,
		"match": "00"
	},
	{
		"type": "punctuation",
		"start": 1016,
		"end": 1017,
		"match": "."
	},
	{
		"type": "datetime",
		"start": 1017,
		"end": 1020,
		"match": "555"
	},
	{
		"type": "property",
		"start": 1021,
		"end": 1030,
		"match": "space_ldt"
	},
	{
		"type": "operator",
		"start": 1031,
		"end": 1032,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1033,
		"end": 1037,
		"match": "1987"
	},
	{
		"type": "punctuation",
		"start": 1037,
		"end": 1038,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1038,
		"end": 1040,
		"match": "07"
	},
	{
		"type": "punctuation",
		"start": 1040,
		"end": 1041,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1041,
		"end": 1046,
		"match": "05 17"
	},
	{
		"type": "punctuation",
		"start": 1046,
		"end": 1047,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1047,
		"end": 1049,
		"match": "45"
	},
	{
		"type": "punctuation",
		"start": 1049,
		"end": 1050,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1050,
		"end": 1052,
		"match": "00"
	},
	{
		"type": "comment",
		"start": 1054,
		"end": 1067,
		"match": "# Local date\n"
	},
	{
		"type": "property",
		"start": 1067,
		"end": 1070,
		"match": "ld1"
	},
	{
		"type": "operator",
		"start": 1071,
		"end": 1072,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1073,
		"end": 1077,
		"match": "1979"
	},
	{
		"type": "punctuation",
		"start": 1077,
		"end": 1078,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1078,
		"end": 1080,
		"match": "05"
	},
	{
		"type": "punctuation",
		"start": 1080,
		"end": 1081,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1081,
		"end": 1083,
		"match": "27"
	},
	{
		"type": "comment",
		"start": 1085,
		"end": 1129,
		"match": "# From tests/valid/datetime/local-date.toml\n"
	},
	{
		"type": "property",
		"start": 1129,
		"end": 1140,
		"match": "bestdayever"
	},
	{
		"type": "operator",
		"start": 1141,
		"end": 1142,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1143,
		"end": 1147,
		"match": "1987"
	},
	{
		"type": "punctuation",
		"start": 1147,
		"end": 1148,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1148,
		"end": 1150,
		"match": "07"
	},
	{
		"type": "punctuation",
		"start": 1150,
		"end": 1151,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1151,
		"end": 1153,
		"match": "05"
	},
	{
		"type": "comment",
		"start": 1155,
		"end": 1168,
		"match": "# Local time\n"
	},
	{
		"type": "property",
		"start": 1168,
		"end": 1171,
		"match": "lt1"
	},
	{
		"type": "operator",
		"start": 1172,
		"end": 1173,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1174,
		"end": 1176,
		"match": "07"
	},
	{
		"type": "punctuation",
		"start": 1176,
		"end": 1177,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1177,
		"end": 1179,
		"match": "32"
	},
	{
		"type": "punctuation",
		"start": 1179,
		"end": 1180,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1180,
		"end": 1182,
		"match": "00"
	},
	{
		"type": "property",
		"start": 1183,
		"end": 1186,
		"match": "lt2"
	},
	{
		"type": "operator",
		"start": 1187,
		"end": 1188,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1189,
		"end": 1191,
		"match": "00"
	},
	{
		"type": "punctuation",
		"start": 1191,
		"end": 1192,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1192,
		"end": 1194,
		"match": "32"
	},
	{
		"type": "punctuation",
		"start": 1194,
		"end": 1195,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1195,
		"end": 1197,
		"match": "00"
	},
	{
		"type": "punctuation",
		"start": 1197,
		"end": 1198,
		"match": "."
	},
	{
		"type": "datetime",
		"start": 1198,
		"end": 1204,
		"match": "999999"
	},
	{
		"type": "comment",
		"start": 1206,
		"end": 1250,
		"match": "# From tests/valid/datetime/local-time.toml\n"
	},
	{
		"type": "property",
		"start": 1250,
		"end": 1262,
		"match": "besttimeever"
	},
	{
		"type": "operator",
		"start": 1263,
		"end": 1264,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1265,
		"end": 1267,
		"match": "17"
	},
	{
		"type": "punctuation",
		"start": 1267,
		"end": 1268,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1268,
		"end": 1270,
		"match": "45"
	},
	{
		"type": "punctuation",
		"start": 1270,
		"end": 1271,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1271,
		"end": 1273,
		"match": "00"
	},
	{
		"type": "property",
		"start": 1274,
		"end": 1289,
		"match": "milliseconds_lt"
	},
	{
		"type": "operator",
		"start": 1290,
		"end": 1291,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1292,
		"end": 1294,
		"match": "10"
	},
	{
		"type": "punctuation",
		"start": 1294,
		"end": 1295,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1295,
		"end": 1297,
		"match": "32"
	},
	{
		"type": "punctuation",
		"start": 1297,
		"end": 1298,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1298,
		"end": 1300,
		"match": "00"
	},
	{
		"type": "punctuation",
		"start": 1300,
		"end": 1301,
		"match": "."
	},
	{
		"type": "datetime",
		"start": 1301,
		"end": 1304,
		"match": "555"
	},
	{
		"type": "comment",
		"start": 1306,
		"end": 1360,
		"match": "# From tests/valid/datetime/edge.toml: boundary dates\n"
	},
	{
		"type": "property",
		"start": 1360,
		"end": 1372,
		"match": "first_offset"
	},
	{
		"type": "operator",
		"start": 1373,
		"end": 1374,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1375,
		"end": 1379,
		"match": "0001"
	},
	{
		"type": "punctuation",
		"start": 1379,
		"end": 1380,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1380,
		"end": 1382,
		"match": "01"
	},
	{
		"type": "punctuation",
		"start": 1382,
		"end": 1383,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1383,
		"end": 1388,
		"match": "01 00"
	},
	{
		"type": "punctuation",
		"start": 1388,
		"end": 1389,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1389,
		"end": 1391,
		"match": "00"
	},
	{
		"type": "punctuation",
		"start": 1391,
		"end": 1392,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1392,
		"end": 1395,
		"match": "00Z"
	},
	{
		"type": "property",
		"start": 1396,
		"end": 1407,
		"match": "first_local"
	},
	{
		"type": "operator",
		"start": 1408,
		"end": 1409,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1410,
		"end": 1414,
		"match": "0001"
	},
	{
		"type": "punctuation",
		"start": 1414,
		"end": 1415,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1415,
		"end": 1417,
		"match": "01"
	},
	{
		"type": "punctuation",
		"start": 1417,
		"end": 1418,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1418,
		"end": 1423,
		"match": "01 00"
	},
	{
		"type": "punctuation",
		"start": 1423,
		"end": 1424,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1424,
		"end": 1426,
		"match": "00"
	},
	{
		"type": "punctuation",
		"start": 1426,
		"end": 1427,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1427,
		"end": 1429,
		"match": "00"
	},
	{
		"type": "property",
		"start": 1430,
		"end": 1440,
		"match": "first_date"
	},
	{
		"type": "operator",
		"start": 1441,
		"end": 1442,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1443,
		"end": 1447,
		"match": "0001"
	},
	{
		"type": "punctuation",
		"start": 1447,
		"end": 1448,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1448,
		"end": 1450,
		"match": "01"
	},
	{
		"type": "punctuation",
		"start": 1450,
		"end": 1451,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1451,
		"end": 1453,
		"match": "01"
	},
	{
		"type": "property",
		"start": 1455,
		"end": 1466,
		"match": "last_offset"
	},
	{
		"type": "operator",
		"start": 1467,
		"end": 1468,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1469,
		"end": 1473,
		"match": "9999"
	},
	{
		"type": "punctuation",
		"start": 1473,
		"end": 1474,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1474,
		"end": 1476,
		"match": "12"
	},
	{
		"type": "punctuation",
		"start": 1476,
		"end": 1477,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1477,
		"end": 1482,
		"match": "31 23"
	},
	{
		"type": "punctuation",
		"start": 1482,
		"end": 1483,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1483,
		"end": 1485,
		"match": "59"
	},
	{
		"type": "punctuation",
		"start": 1485,
		"end": 1486,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1486,
		"end": 1489,
		"match": "59Z"
	},
	{
		"type": "property",
		"start": 1490,
		"end": 1500,
		"match": "last_local"
	},
	{
		"type": "operator",
		"start": 1501,
		"end": 1502,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1503,
		"end": 1507,
		"match": "9999"
	},
	{
		"type": "punctuation",
		"start": 1507,
		"end": 1508,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1508,
		"end": 1510,
		"match": "12"
	},
	{
		"type": "punctuation",
		"start": 1510,
		"end": 1511,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1511,
		"end": 1516,
		"match": "31 23"
	},
	{
		"type": "punctuation",
		"start": 1516,
		"end": 1517,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1517,
		"end": 1519,
		"match": "59"
	},
	{
		"type": "punctuation",
		"start": 1519,
		"end": 1520,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1520,
		"end": 1522,
		"match": "59"
	},
	{
		"type": "property",
		"start": 1523,
		"end": 1532,
		"match": "last_date"
	},
	{
		"type": "operator",
		"start": 1533,
		"end": 1534,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1535,
		"end": 1539,
		"match": "9999"
	},
	{
		"type": "punctuation",
		"start": 1539,
		"end": 1540,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1540,
		"end": 1542,
		"match": "12"
	},
	{
		"type": "punctuation",
		"start": 1542,
		"end": 1543,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1543,
		"end": 1545,
		"match": "31"
	},
	{
		"type": "comment",
		"start": 1547,
		"end": 1607,
		"match": "# From tests/valid/datetime/leap-year.toml: leap year dates\n"
	},
	{
		"type": "property",
		"start": 1607,
		"end": 1619,
		"match": "leap_2000_dt"
	},
	{
		"type": "operator",
		"start": 1620,
		"end": 1621,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1622,
		"end": 1626,
		"match": "2000"
	},
	{
		"type": "punctuation",
		"start": 1626,
		"end": 1627,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1627,
		"end": 1629,
		"match": "02"
	},
	{
		"type": "punctuation",
		"start": 1629,
		"end": 1630,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1630,
		"end": 1635,
		"match": "29 15"
	},
	{
		"type": "punctuation",
		"start": 1635,
		"end": 1636,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1636,
		"end": 1638,
		"match": "15"
	},
	{
		"type": "punctuation",
		"start": 1638,
		"end": 1639,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1639,
		"end": 1642,
		"match": "15Z"
	},
	{
		"type": "property",
		"start": 1643,
		"end": 1658,
		"match": "leap_2000_local"
	},
	{
		"type": "operator",
		"start": 1659,
		"end": 1660,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1661,
		"end": 1665,
		"match": "2000"
	},
	{
		"type": "punctuation",
		"start": 1665,
		"end": 1666,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1666,
		"end": 1668,
		"match": "02"
	},
	{
		"type": "punctuation",
		"start": 1668,
		"end": 1669,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1669,
		"end": 1674,
		"match": "29 15"
	},
	{
		"type": "punctuation",
		"start": 1674,
		"end": 1675,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1675,
		"end": 1677,
		"match": "15"
	},
	{
		"type": "punctuation",
		"start": 1677,
		"end": 1678,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1678,
		"end": 1680,
		"match": "15"
	},
	{
		"type": "property",
		"start": 1681,
		"end": 1695,
		"match": "leap_2000_date"
	},
	{
		"type": "operator",
		"start": 1696,
		"end": 1697,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1698,
		"end": 1702,
		"match": "2000"
	},
	{
		"type": "punctuation",
		"start": 1702,
		"end": 1703,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1703,
		"end": 1705,
		"match": "02"
	},
	{
		"type": "punctuation",
		"start": 1705,
		"end": 1706,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1706,
		"end": 1708,
		"match": "29"
	},
	{
		"type": "property",
		"start": 1710,
		"end": 1722,
		"match": "leap_2024_dt"
	},
	{
		"type": "operator",
		"start": 1723,
		"end": 1724,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1725,
		"end": 1729,
		"match": "2024"
	},
	{
		"type": "punctuation",
		"start": 1729,
		"end": 1730,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1730,
		"end": 1732,
		"match": "02"
	},
	{
		"type": "punctuation",
		"start": 1732,
		"end": 1733,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1733,
		"end": 1738,
		"match": "29 15"
	},
	{
		"type": "punctuation",
		"start": 1738,
		"end": 1739,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1739,
		"end": 1741,
		"match": "15"
	},
	{
		"type": "punctuation",
		"start": 1741,
		"end": 1742,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1742,
		"end": 1745,
		"match": "15Z"
	},
	{
		"type": "property",
		"start": 1746,
		"end": 1761,
		"match": "leap_2024_local"
	},
	{
		"type": "operator",
		"start": 1762,
		"end": 1763,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 1764,
		"end": 1768,
		"match": "2024"
	},
	{
		"type": "punctuation",
		"start": 1768,
		"end": 1769,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1769,
		"end": 1771,
		"match": "02"
	},
	{
		"type": "punctuation",
		"start": 1771,
		"end": 1772,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 1772,
		"end": 1777,
		"match": "29 15"
	},
	{
		"type": "punctuation",
		"start": 1777,
		"end": 1778,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1778,
		"end": 1780,
		"match": "15"
	},
	{
		"type": "punctuation",
		"start": 1780,
		"end": 1781,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 1781,
		"end": 1783,
		"match": "15"
	},
	{
		"type": "comment",
		"start": 1785,
		"end": 1906,
		"match": "# --- Complex multi-type document (real-world config) ---\n# Based on toml-test spec-example-1 + array.toml + tricky.toml\n"
	},
	{
		"type": "comment",
		"start": 1907,
		"end": 1940,
		"match": "# This is a TOML document. Boom.\n"
	},
	{
		"type": "property",
		"start": 1940,
		"end": 1945,
		"match": "title"
	},
	{
		"type": "operator",
		"start": 1946,
		"end": 1947,
		"match": "="
	},
	{
		"type": "string",
		"start": 1948,
		"end": 1962,
		"match": "\"TOML Example\""
	},
	{
		"type": "punctuation",
		"start": 1964,
		"end": 1965,
		"match": "["
	},
	{
		"type": "property",
		"start": 1965,
		"end": 1970,
		"match": "owner"
	},
	{
		"type": "punctuation",
		"start": 1970,
		"end": 1971,
		"match": "]"
	},
	{
		"type": "property",
		"start": 1972,
		"end": 1976,
		"match": "name"
	},
	{
		"type": "operator",
		"start": 1977,
		"end": 1978,
		"match": "="
	},
	{
		"type": "string",
		"start": 1979,
		"end": 1995,
		"match": "\"Lance Uppercut\""
	},
	{
		"type": "property",
		"start": 1996,
		"end": 1999,
		"match": "dob"
	},
	{
		"type": "operator",
		"start": 2000,
		"end": 2001,
		"match": "="
	},
	{
		"type": "datetime",
		"start": 2002,
		"end": 2006,
		"match": "1979"
	},
	{
		"type": "punctuation",
		"start": 2006,
		"end": 2007,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 2007,
		"end": 2009,
		"match": "05"
	},
	{
		"type": "punctuation",
		"start": 2009,
		"end": 2010,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 2010,
		"end": 2015,
		"match": "27T07"
	},
	{
		"type": "punctuation",
		"start": 2015,
		"end": 2016,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 2016,
		"end": 2018,
		"match": "32"
	},
	{
		"type": "punctuation",
		"start": 2018,
		"end": 2019,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 2019,
		"end": 2021,
		"match": "00"
	},
	{
		"type": "punctuation",
		"start": 2021,
		"end": 2022,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 2022,
		"end": 2024,
		"match": "08"
	},
	{
		"type": "punctuation",
		"start": 2024,
		"end": 2025,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 2025,
		"end": 2027,
		"match": "00"
	},
	{
		"type": "comment",
		"start": 2029,
		"end": 2059,
		"match": "# First class dates? Why not?\n"
	},
	{
		"type": "punctuation",
		"start": 2060,
		"end": 2061,
		"match": "["
	},
	{
		"type": "property",
		"start": 2061,
		"end": 2069,
		"match": "database"
	},
	{
		"type": "punctuation",
		"start": 2069,
		"end": 2070,
		"match": "]"
	},
	{
		"type": "property",
		"start": 2071,
		"end": 2077,
		"match": "server"
	},
	{
		"type": "operator",
		"start": 2078,
		"end": 2079,
		"match": "="
	},
	{
		"type": "string",
		"start": 2080,
		"end": 2093,
		"match": "\"192.168.1.1\""
	},
	{
		"type": "property",
		"start": 2094,
		"end": 2099,
		"match": "ports"
	},
	{
		"type": "operator",
		"start": 2100,
		"end": 2101,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 2102,
		"end": 2103,
		"match": "["
	},
	{
		"type": "number",
		"start": 2104,
		"end": 2108,
		"match": "8001"
	},
	{
		"type": "punctuation",
		"start": 2108,
		"end": 2109,
		"match": ","
	},
	{
		"type": "number",
		"start": 2110,
		"end": 2114,
		"match": "8001"
	},
	{
		"type": "punctuation",
		"start": 2114,
		"end": 2115,
		"match": ","
	},
	{
		"type": "number",
		"start": 2116,
		"end": 2120,
		"match": "8002"
	},
	{
		"type": "punctuation",
		"start": 2121,
		"end": 2122,
		"match": "]"
	},
	{
		"type": "property",
		"start": 2123,
		"end": 2137,
		"match": "connection_max"
	},
	{
		"type": "operator",
		"start": 2138,
		"end": 2139,
		"match": "="
	},
	{
		"type": "number",
		"start": 2140,
		"end": 2144,
		"match": "5000"
	},
	{
		"type": "property",
		"start": 2145,
		"end": 2152,
		"match": "enabled"
	},
	{
		"type": "operator",
		"start": 2153,
		"end": 2154,
		"match": "="
	},
	{
		"type": "boolean",
		"start": 2155,
		"end": 2159,
		"match": "true"
	},
	{
		"type": "punctuation",
		"start": 2161,
		"end": 2162,
		"match": "["
	},
	{
		"type": "property",
		"start": 2162,
		"end": 2169,
		"match": "servers"
	},
	{
		"type": "punctuation",
		"start": 2169,
		"end": 2170,
		"match": "]"
	},
	{
		"type": "comment",
		"start": 2174,
		"end": 2239,
		"match": "# You can indent as you please. Tabs or spaces. TOML don't care.\n"
	},
	{
		"type": "punctuation",
		"start": 2241,
		"end": 2242,
		"match": "["
	},
	{
		"type": "property",
		"start": 2242,
		"end": 2249,
		"match": "servers"
	},
	{
		"type": "punctuation",
		"start": 2249,
		"end": 2250,
		"match": "."
	},
	{
		"type": "property",
		"start": 2250,
		"end": 2255,
		"match": "alpha"
	},
	{
		"type": "punctuation",
		"start": 2255,
		"end": 2256,
		"match": "]"
	},
	{
		"type": "property",
		"start": 2259,
		"end": 2261,
		"match": "ip"
	},
	{
		"type": "operator",
		"start": 2262,
		"end": 2263,
		"match": "="
	},
	{
		"type": "string",
		"start": 2264,
		"end": 2274,
		"match": "\"10.0.0.1\""
	},
	{
		"type": "property",
		"start": 2277,
		"end": 2279,
		"match": "dc"
	},
	{
		"type": "operator",
		"start": 2280,
		"end": 2281,
		"match": "="
	},
	{
		"type": "string",
		"start": 2282,
		"end": 2290,
		"match": "\"eqdc10\""
	},
	{
		"type": "punctuation",
		"start": 2294,
		"end": 2295,
		"match": "["
	},
	{
		"type": "property",
		"start": 2295,
		"end": 2302,
		"match": "servers"
	},
	{
		"type": "punctuation",
		"start": 2302,
		"end": 2303,
		"match": "."
	},
	{
		"type": "property",
		"start": 2303,
		"end": 2307,
		"match": "beta"
	},
	{
		"type": "punctuation",
		"start": 2307,
		"end": 2308,
		"match": "]"
	},
	{
		"type": "property",
		"start": 2311,
		"end": 2313,
		"match": "ip"
	},
	{
		"type": "operator",
		"start": 2314,
		"end": 2315,
		"match": "="
	},
	{
		"type": "string",
		"start": 2316,
		"end": 2326,
		"match": "\"10.0.0.2\""
	},
	{
		"type": "property",
		"start": 2329,
		"end": 2331,
		"match": "dc"
	},
	{
		"type": "operator",
		"start": 2332,
		"end": 2333,
		"match": "="
	},
	{
		"type": "string",
		"start": 2334,
		"end": 2342,
		"match": "\"eqdc10\""
	},
	{
		"type": "punctuation",
		"start": 2344,
		"end": 2345,
		"match": "["
	},
	{
		"type": "property",
		"start": 2345,
		"end": 2352,
		"match": "clients"
	},
	{
		"type": "punctuation",
		"start": 2352,
		"end": 2353,
		"match": "]"
	},
	{
		"type": "property",
		"start": 2354,
		"end": 2358,
		"match": "data"
	},
	{
		"type": "operator",
		"start": 2359,
		"end": 2360,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 2361,
		"end": 2362,
		"match": "["
	},
	{
		"type": "punctuation",
		"start": 2363,
		"end": 2364,
		"match": "["
	},
	{
		"type": "string",
		"start": 2364,
		"end": 2371,
		"match": "\"gamma\""
	},
	{
		"type": "punctuation",
		"start": 2371,
		"end": 2372,
		"match": ","
	},
	{
		"type": "string",
		"start": 2373,
		"end": 2380,
		"match": "\"delta\""
	},
	{
		"type": "punctuation",
		"start": 2380,
		"end": 2382,
		"match": "],"
	},
	{
		"type": "punctuation",
		"start": 2383,
		"end": 2384,
		"match": "["
	},
	{
		"type": "number",
		"start": 2384,
		"end": 2385,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 2385,
		"end": 2386,
		"match": ","
	},
	{
		"type": "number",
		"start": 2387,
		"end": 2388,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 2388,
		"end": 2389,
		"match": "]"
	},
	{
		"type": "punctuation",
		"start": 2390,
		"end": 2391,
		"match": "]"
	},
	{
		"type": "comment",
		"start": 2393,
		"end": 2433,
		"match": "# Line breaks are OK when inside arrays\n"
	},
	{
		"type": "property",
		"start": 2433,
		"end": 2438,
		"match": "hosts"
	},
	{
		"type": "operator",
		"start": 2439,
		"end": 2440,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 2441,
		"end": 2442,
		"match": "["
	},
	{
		"type": "string",
		"start": 2445,
		"end": 2452,
		"match": "\"alpha\""
	},
	{
		"type": "punctuation",
		"start": 2452,
		"end": 2453,
		"match": ","
	},
	{
		"type": "string",
		"start": 2456,
		"end": 2463,
		"match": "\"omega\""
	},
	{
		"type": "punctuation",
		"start": 2464,
		"end": 2465,
		"match": "]"
	},
	{
		"type": "comment",
		"start": 2467,
		"end": 2543,
		"match": "# From tests/valid/array/array.toml: mixed-type arrays with datetime values\n"
	},
	{
		"type": "property",
		"start": 2543,
		"end": 2554,
		"match": "mixed_dates"
	},
	{
		"type": "operator",
		"start": 2555,
		"end": 2556,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 2557,
		"end": 2558,
		"match": "["
	},
	{
		"type": "datetime",
		"start": 2561,
		"end": 2565,
		"match": "1987"
	},
	{
		"type": "punctuation",
		"start": 2565,
		"end": 2566,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 2566,
		"end": 2568,
		"match": "07"
	},
	{
		"type": "punctuation",
		"start": 2568,
		"end": 2569,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 2569,
		"end": 2574,
		"match": "05T17"
	},
	{
		"type": "punctuation",
		"start": 2574,
		"end": 2575,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 2575,
		"end": 2577,
		"match": "45"
	},
	{
		"type": "punctuation",
		"start": 2577,
		"end": 2578,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 2578,
		"end": 2581,
		"match": "00Z"
	},
	{
		"type": "punctuation",
		"start": 2581,
		"end": 2582,
		"match": ","
	},
	{
		"type": "datetime",
		"start": 2585,
		"end": 2589,
		"match": "1979"
	},
	{
		"type": "punctuation",
		"start": 2589,
		"end": 2590,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 2590,
		"end": 2592,
		"match": "05"
	},
	{
		"type": "punctuation",
		"start": 2592,
		"end": 2593,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 2593,
		"end": 2598,
		"match": "27T07"
	},
	{
		"type": "punctuation",
		"start": 2598,
		"end": 2599,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 2599,
		"end": 2601,
		"match": "32"
	},
	{
		"type": "punctuation",
		"start": 2601,
		"end": 2602,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 2602,
		"end": 2604,
		"match": "00"
	},
	{
		"type": "punctuation",
		"start": 2604,
		"end": 2605,
		"match": ","
	},
	{
		"type": "datetime",
		"start": 2608,
		"end": 2612,
		"match": "2006"
	},
	{
		"type": "punctuation",
		"start": 2612,
		"end": 2613,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 2613,
		"end": 2615,
		"match": "06"
	},
	{
		"type": "punctuation",
		"start": 2615,
		"end": 2616,
		"match": "-"
	},
	{
		"type": "datetime",
		"start": 2616,
		"end": 2618,
		"match": "01"
	},
	{
		"type": "punctuation",
		"start": 2618,
		"end": 2619,
		"match": ","
	},
	{
		"type": "datetime",
		"start": 2622,
		"end": 2624,
		"match": "11"
	},
	{
		"type": "punctuation",
		"start": 2624,
		"end": 2625,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 2625,
		"end": 2627,
		"match": "00"
	},
	{
		"type": "punctuation",
		"start": 2627,
		"end": 2628,
		"match": ":"
	},
	{
		"type": "datetime",
		"start": 2628,
		"end": 2630,
		"match": "00"
	},
	{
		"type": "punctuation",
		"start": 2630,
		"end": 2631,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 2632,
		"end": 2633,
		"match": "]"
	},
	{
		"type": "comment",
		"start": 2635,
		"end": 2711,
		"match": "# From tests/valid/comment/tricky.toml: hash characters in strings and keys\n"
	},
	{
		"type": "punctuation",
		"start": 2711,
		"end": 2712,
		"match": "["
	},
	{
		"type": "property",
		"start": 2712,
		"end": 2722,
		"match": "\"hash#tag\""
	},
	{
		"type": "punctuation",
		"start": 2722,
		"end": 2723,
		"match": "]"
	},
	{
		"type": "property",
		"start": 2724,
		"end": 2728,
		"match": "\"#!\""
	},
	{
		"type": "operator",
		"start": 2729,
		"end": 2730,
		"match": "="
	},
	{
		"type": "string",
		"start": 2731,
		"end": 2742,
		"match": "\"hash bang\""
	},
	{
		"type": "property",
		"start": 2743,
		"end": 2747,
		"match": "arr3"
	},
	{
		"type": "operator",
		"start": 2748,
		"end": 2749,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 2750,
		"end": 2751,
		"match": "["
	},
	{
		"type": "string",
		"start": 2752,
		"end": 2755,
		"match": "\"#\""
	},
	{
		"type": "punctuation",
		"start": 2755,
		"end": 2756,
		"match": ","
	},
	{
		"type": "string",
		"start": 2757,
		"end": 2760,
		"match": "'#'"
	},
	{
		"type": "punctuation",
		"start": 2760,
		"end": 2761,
		"match": ","
	},
	{
		"type": "string",
		"start": 2762,
		"end": 2768,
		"match": "\"\"\"###"
	},
	{
		"type": "string",
		"start": 2768,
		"end": 2771,
		"match": "\"\"\""
	},
	{
		"type": "punctuation",
		"start": 2772,
		"end": 2773,
		"match": "]"
	},
	{
		"type": "property",
		"start": 2774,
		"end": 2778,
		"match": "tbl1"
	},
	{
		"type": "operator",
		"start": 2779,
		"end": 2780,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 2781,
		"end": 2782,
		"match": "{"
	},
	{
		"type": "property",
		"start": 2783,
		"end": 2786,
		"match": "\"#\""
	},
	{
		"type": "operator",
		"start": 2787,
		"end": 2788,
		"match": "="
	},
	{
		"type": "string",
		"start": 2789,
		"end": 2793,
		"match": "'}#'"
	},
	{
		"type": "punctuation",
		"start": 2794,
		"end": 2795,
		"match": "}"
	}
];
