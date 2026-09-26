export const test = [
	{
		"type": "comment",
		"start": 0,
		"end": 225,
		"match": "# ============================================================\n# EDGE CASE FILE 2: Tables and Keys\n# Sources: toml-test spec-1.0.0 generated tests + manual tests\n# ============================================================\n"
	},
	{
		"type": "comment",
		"start": 226,
		"end": 252,
		"match": "# --- (3) Dotted keys ---\n"
	},
	{
		"type": "comment",
		"start": 253,
		"end": 314,
		"match": "# From spec-1.0.0/keys-3: dotted keys creating nested tables\n"
	},
	{
		"type": "property",
		"start": 314,
		"end": 318,
		"match": "name"
	},
	{
		"type": "operator",
		"start": 319,
		"end": 320,
		"match": "="
	},
	{
		"type": "string",
		"start": 321,
		"end": 329,
		"match": "\"Orange\""
	},
	{
		"type": "property",
		"start": 330,
		"end": 338,
		"match": "physical"
	},
	{
		"type": "punctuation",
		"start": 338,
		"end": 339,
		"match": "."
	},
	{
		"type": "property",
		"start": 339,
		"end": 344,
		"match": "color"
	},
	{
		"type": "operator",
		"start": 345,
		"end": 346,
		"match": "="
	},
	{
		"type": "string",
		"start": 347,
		"end": 355,
		"match": "\"orange\""
	},
	{
		"type": "property",
		"start": 356,
		"end": 364,
		"match": "physical"
	},
	{
		"type": "punctuation",
		"start": 364,
		"end": 365,
		"match": "."
	},
	{
		"type": "property",
		"start": 365,
		"end": 370,
		"match": "shape"
	},
	{
		"type": "operator",
		"start": 371,
		"end": 372,
		"match": "="
	},
	{
		"type": "string",
		"start": 373,
		"end": 380,
		"match": "\"round\""
	},
	{
		"type": "property",
		"start": 381,
		"end": 385,
		"match": "site"
	},
	{
		"type": "punctuation",
		"start": 385,
		"end": 386,
		"match": "."
	},
	{
		"type": "property",
		"start": 386,
		"end": 398,
		"match": "\"google.com\""
	},
	{
		"type": "operator",
		"start": 399,
		"end": 400,
		"match": "="
	},
	{
		"type": "boolean",
		"start": 401,
		"end": 405,
		"match": "true"
	},
	{
		"type": "comment",
		"start": 407,
		"end": 496,
		"match": "# From tests/valid/key/dotted.toml: mixed quoting in dotted keys, whitespace around dots\n"
	},
	{
		"type": "property",
		"start": 496,
		"end": 500,
		"match": "name"
	},
	{
		"type": "punctuation",
		"start": 500,
		"end": 501,
		"match": "."
	},
	{
		"type": "property",
		"start": 501,
		"end": 506,
		"match": "first"
	},
	{
		"type": "operator",
		"start": 507,
		"end": 508,
		"match": "="
	},
	{
		"type": "string",
		"start": 509,
		"end": 517,
		"match": "\"Arthur\""
	},
	{
		"type": "property",
		"start": 518,
		"end": 524,
		"match": "\"name\""
	},
	{
		"type": "punctuation",
		"start": 524,
		"end": 525,
		"match": "."
	},
	{
		"type": "property",
		"start": 525,
		"end": 531,
		"match": "'last'"
	},
	{
		"type": "operator",
		"start": 532,
		"end": 533,
		"match": "="
	},
	{
		"type": "string",
		"start": 534,
		"end": 540,
		"match": "\"Dent\""
	},
	{
		"type": "property",
		"start": 542,
		"end": 546,
		"match": "many"
	},
	{
		"type": "punctuation",
		"start": 546,
		"end": 547,
		"match": "."
	},
	{
		"type": "property",
		"start": 547,
		"end": 551,
		"match": "dots"
	},
	{
		"type": "punctuation",
		"start": 551,
		"end": 552,
		"match": "."
	},
	{
		"type": "property",
		"start": 552,
		"end": 556,
		"match": "here"
	},
	{
		"type": "punctuation",
		"start": 556,
		"end": 557,
		"match": "."
	},
	{
		"type": "property",
		"start": 557,
		"end": 560,
		"match": "dot"
	},
	{
		"type": "punctuation",
		"start": 560,
		"end": 561,
		"match": "."
	},
	{
		"type": "property",
		"start": 561,
		"end": 564,
		"match": "dot"
	},
	{
		"type": "punctuation",
		"start": 564,
		"end": 565,
		"match": "."
	},
	{
		"type": "property",
		"start": 565,
		"end": 568,
		"match": "dot"
	},
	{
		"type": "operator",
		"start": 569,
		"end": 570,
		"match": "="
	},
	{
		"type": "number",
		"start": 571,
		"end": 573,
		"match": "42"
	},
	{
		"type": "comment",
		"start": 575,
		"end": 625,
		"match": "# Spaces are ignored, and key parts can be quoted\n"
	},
	{
		"type": "property",
		"start": 625,
		"end": 630,
		"match": "count"
	},
	{
		"type": "punctuation",
		"start": 630,
		"end": 631,
		"match": "."
	},
	{
		"type": "property",
		"start": 631,
		"end": 632,
		"match": "a"
	},
	{
		"type": "operator",
		"start": 633,
		"end": 634,
		"match": "="
	},
	{
		"type": "number",
		"start": 635,
		"end": 636,
		"match": "1"
	},
	{
		"type": "property",
		"start": 637,
		"end": 642,
		"match": "count"
	},
	{
		"type": "punctuation",
		"start": 643,
		"end": 644,
		"match": "."
	},
	{
		"type": "property",
		"start": 645,
		"end": 646,
		"match": "b"
	},
	{
		"type": "operator",
		"start": 647,
		"end": 648,
		"match": "="
	},
	{
		"type": "number",
		"start": 649,
		"end": 650,
		"match": "2"
	},
	{
		"type": "property",
		"start": 651,
		"end": 658,
		"match": "\"count\""
	},
	{
		"type": "punctuation",
		"start": 658,
		"end": 659,
		"match": "."
	},
	{
		"type": "property",
		"start": 659,
		"end": 662,
		"match": "\"c\""
	},
	{
		"type": "operator",
		"start": 663,
		"end": 664,
		"match": "="
	},
	{
		"type": "number",
		"start": 665,
		"end": 666,
		"match": "3"
	},
	{
		"type": "property",
		"start": 667,
		"end": 674,
		"match": "\"count\""
	},
	{
		"type": "punctuation",
		"start": 675,
		"end": 676,
		"match": "."
	},
	{
		"type": "property",
		"start": 677,
		"end": 680,
		"match": "\"d\""
	},
	{
		"type": "operator",
		"start": 681,
		"end": 682,
		"match": "="
	},
	{
		"type": "number",
		"start": 683,
		"end": 684,
		"match": "4"
	},
	{
		"type": "property",
		"start": 685,
		"end": 692,
		"match": "'count'"
	},
	{
		"type": "punctuation",
		"start": 692,
		"end": 693,
		"match": "."
	},
	{
		"type": "property",
		"start": 693,
		"end": 696,
		"match": "'e'"
	},
	{
		"type": "operator",
		"start": 697,
		"end": 698,
		"match": "="
	},
	{
		"type": "number",
		"start": 699,
		"end": 700,
		"match": "5"
	},
	{
		"type": "property",
		"start": 701,
		"end": 708,
		"match": "'count'"
	},
	{
		"type": "punctuation",
		"start": 709,
		"end": 710,
		"match": "."
	},
	{
		"type": "property",
		"start": 711,
		"end": 714,
		"match": "'f'"
	},
	{
		"type": "operator",
		"start": 715,
		"end": 716,
		"match": "="
	},
	{
		"type": "number",
		"start": 717,
		"end": 718,
		"match": "6"
	},
	{
		"type": "property",
		"start": 719,
		"end": 726,
		"match": "\"count\""
	},
	{
		"type": "punctuation",
		"start": 726,
		"end": 727,
		"match": "."
	},
	{
		"type": "property",
		"start": 727,
		"end": 730,
		"match": "'g'"
	},
	{
		"type": "operator",
		"start": 731,
		"end": 732,
		"match": "="
	},
	{
		"type": "number",
		"start": 733,
		"end": 734,
		"match": "7"
	},
	{
		"type": "property",
		"start": 735,
		"end": 742,
		"match": "\"count\""
	},
	{
		"type": "punctuation",
		"start": 743,
		"end": 744,
		"match": "."
	},
	{
		"type": "property",
		"start": 745,
		"end": 748,
		"match": "'h'"
	},
	{
		"type": "operator",
		"start": 749,
		"end": 750,
		"match": "="
	},
	{
		"type": "number",
		"start": 751,
		"end": 752,
		"match": "8"
	},
	{
		"type": "property",
		"start": 753,
		"end": 758,
		"match": "count"
	},
	{
		"type": "punctuation",
		"start": 758,
		"end": 759,
		"match": "."
	},
	{
		"type": "property",
		"start": 759,
		"end": 762,
		"match": "'i'"
	},
	{
		"type": "operator",
		"start": 763,
		"end": 764,
		"match": "="
	},
	{
		"type": "number",
		"start": 765,
		"end": 766,
		"match": "9"
	},
	{
		"type": "property",
		"start": 767,
		"end": 772,
		"match": "count"
	},
	{
		"type": "punctuation",
		"start": 773,
		"end": 774,
		"match": "."
	},
	{
		"type": "property",
		"start": 775,
		"end": 778,
		"match": "'j'"
	},
	{
		"type": "operator",
		"start": 779,
		"end": 780,
		"match": "="
	},
	{
		"type": "number",
		"start": 781,
		"end": 783,
		"match": "10"
	},
	{
		"type": "property",
		"start": 784,
		"end": 791,
		"match": "\"count\""
	},
	{
		"type": "punctuation",
		"start": 791,
		"end": 792,
		"match": "."
	},
	{
		"type": "property",
		"start": 792,
		"end": 793,
		"match": "k"
	},
	{
		"type": "operator",
		"start": 794,
		"end": 795,
		"match": "="
	},
	{
		"type": "number",
		"start": 796,
		"end": 798,
		"match": "11"
	},
	{
		"type": "property",
		"start": 799,
		"end": 806,
		"match": "\"count\""
	},
	{
		"type": "punctuation",
		"start": 807,
		"end": 808,
		"match": "."
	},
	{
		"type": "property",
		"start": 809,
		"end": 810,
		"match": "l"
	},
	{
		"type": "operator",
		"start": 811,
		"end": 812,
		"match": "="
	},
	{
		"type": "number",
		"start": 813,
		"end": 815,
		"match": "12"
	},
	{
		"type": "comment",
		"start": 817,
		"end": 882,
		"match": "# From spec-1.0.0/keys-1: quoted keys (non-ASCII, special chars)\n"
	},
	{
		"type": "property",
		"start": 882,
		"end": 893,
		"match": "\"127.0.0.1\""
	},
	{
		"type": "operator",
		"start": 894,
		"end": 895,
		"match": "="
	},
	{
		"type": "string",
		"start": 896,
		"end": 903,
		"match": "\"value\""
	},
	{
		"type": "property",
		"start": 904,
		"end": 924,
		"match": "\"character encoding\""
	},
	{
		"type": "operator",
		"start": 925,
		"end": 926,
		"match": "="
	},
	{
		"type": "string",
		"start": 927,
		"end": 934,
		"match": "\"value\""
	},
	{
		"type": "property",
		"start": 935,
		"end": 940,
		"match": "\"ʎǝʞ\""
	},
	{
		"type": "operator",
		"start": 941,
		"end": 942,
		"match": "="
	},
	{
		"type": "string",
		"start": 943,
		"end": 950,
		"match": "\"value\""
	},
	{
		"type": "property",
		"start": 951,
		"end": 957,
		"match": "'key2'"
	},
	{
		"type": "operator",
		"start": 958,
		"end": 959,
		"match": "="
	},
	{
		"type": "string",
		"start": 960,
		"end": 967,
		"match": "\"value\""
	},
	{
		"type": "property",
		"start": 968,
		"end": 984,
		"match": "'quoted \"value\"'"
	},
	{
		"type": "operator",
		"start": 985,
		"end": 986,
		"match": "="
	},
	{
		"type": "string",
		"start": 987,
		"end": 994,
		"match": "\"value\""
	},
	{
		"type": "comment",
		"start": 996,
		"end": 1024,
		"match": "# --- (6) Nested tables ---\n"
	},
	{
		"type": "comment",
		"start": 1025,
		"end": 1103,
		"match": "# From spec-1.0.0/table-2: dotted keys in table headers + nested table values\n"
	},
	{
		"type": "punctuation",
		"start": 1103,
		"end": 1104,
		"match": "["
	},
	{
		"type": "property",
		"start": 1104,
		"end": 1107,
		"match": "dog"
	},
	{
		"type": "punctuation",
		"start": 1107,
		"end": 1108,
		"match": "."
	},
	{
		"type": "property",
		"start": 1108,
		"end": 1119,
		"match": "\"tater.man\""
	},
	{
		"type": "punctuation",
		"start": 1119,
		"end": 1120,
		"match": "]"
	},
	{
		"type": "property",
		"start": 1121,
		"end": 1125,
		"match": "type"
	},
	{
		"type": "punctuation",
		"start": 1125,
		"end": 1126,
		"match": "."
	},
	{
		"type": "property",
		"start": 1126,
		"end": 1130,
		"match": "name"
	},
	{
		"type": "operator",
		"start": 1131,
		"end": 1132,
		"match": "="
	},
	{
		"type": "string",
		"start": 1133,
		"end": 1138,
		"match": "\"pug\""
	},
	{
		"type": "comment",
		"start": 1140,
		"end": 1195,
		"match": "# From spec-1.0.0/table-3: whitespace in table headers\n"
	},
	{
		"type": "punctuation",
		"start": 1195,
		"end": 1196,
		"match": "["
	},
	{
		"type": "property",
		"start": 1196,
		"end": 1197,
		"match": "a"
	},
	{
		"type": "punctuation",
		"start": 1197,
		"end": 1198,
		"match": "."
	},
	{
		"type": "property",
		"start": 1198,
		"end": 1199,
		"match": "b"
	},
	{
		"type": "punctuation",
		"start": 1199,
		"end": 1200,
		"match": "."
	},
	{
		"type": "property",
		"start": 1200,
		"end": 1201,
		"match": "c"
	},
	{
		"type": "punctuation",
		"start": 1201,
		"end": 1202,
		"match": "]"
	},
	{
		"type": "comment",
		"start": 1214,
		"end": 1238,
		"match": "# this is best practice\n"
	},
	{
		"type": "punctuation",
		"start": 1238,
		"end": 1239,
		"match": "["
	},
	{
		"type": "property",
		"start": 1240,
		"end": 1241,
		"match": "d"
	},
	{
		"type": "punctuation",
		"start": 1241,
		"end": 1242,
		"match": "."
	},
	{
		"type": "property",
		"start": 1242,
		"end": 1243,
		"match": "e"
	},
	{
		"type": "punctuation",
		"start": 1243,
		"end": 1244,
		"match": "."
	},
	{
		"type": "property",
		"start": 1244,
		"end": 1245,
		"match": "f"
	},
	{
		"type": "punctuation",
		"start": 1246,
		"end": 1247,
		"match": "]"
	},
	{
		"type": "comment",
		"start": 1257,
		"end": 1275,
		"match": "# same as [d.e.f]\n"
	},
	{
		"type": "punctuation",
		"start": 1275,
		"end": 1276,
		"match": "["
	},
	{
		"type": "property",
		"start": 1277,
		"end": 1278,
		"match": "g"
	},
	{
		"type": "punctuation",
		"start": 1279,
		"end": 1280,
		"match": "."
	},
	{
		"type": "property",
		"start": 1281,
		"end": 1282,
		"match": "h"
	},
	{
		"type": "punctuation",
		"start": 1283,
		"end": 1284,
		"match": "."
	},
	{
		"type": "property",
		"start": 1285,
		"end": 1286,
		"match": "i"
	},
	{
		"type": "punctuation",
		"start": 1287,
		"end": 1288,
		"match": "]"
	},
	{
		"type": "comment",
		"start": 1294,
		"end": 1312,
		"match": "# same as [g.h.i]\n"
	},
	{
		"type": "punctuation",
		"start": 1312,
		"end": 1313,
		"match": "["
	},
	{
		"type": "property",
		"start": 1314,
		"end": 1315,
		"match": "j"
	},
	{
		"type": "punctuation",
		"start": 1316,
		"end": 1317,
		"match": "."
	},
	{
		"type": "property",
		"start": 1318,
		"end": 1321,
		"match": "\"ʞ\""
	},
	{
		"type": "punctuation",
		"start": 1322,
		"end": 1323,
		"match": "."
	},
	{
		"type": "property",
		"start": 1324,
		"end": 1327,
		"match": "'l'"
	},
	{
		"type": "punctuation",
		"start": 1328,
		"end": 1329,
		"match": "]"
	},
	{
		"type": "comment",
		"start": 1331,
		"end": 1353,
		"match": "# same as [j.\"ʞ\".'l']\n"
	},
	{
		"type": "comment",
		"start": 1354,
		"end": 1464,
		"match": "# From spec-1.0.0/table-4: super-tables defined after sub-tables\n# [x] you\n# [x.y] don't\n# [x.y.z] need these\n"
	},
	{
		"type": "punctuation",
		"start": 1464,
		"end": 1465,
		"match": "["
	},
	{
		"type": "property",
		"start": 1465,
		"end": 1466,
		"match": "x"
	},
	{
		"type": "punctuation",
		"start": 1466,
		"end": 1467,
		"match": "."
	},
	{
		"type": "property",
		"start": 1467,
		"end": 1468,
		"match": "y"
	},
	{
		"type": "punctuation",
		"start": 1468,
		"end": 1469,
		"match": "."
	},
	{
		"type": "property",
		"start": 1469,
		"end": 1470,
		"match": "z"
	},
	{
		"type": "punctuation",
		"start": 1470,
		"end": 1471,
		"match": "."
	},
	{
		"type": "property",
		"start": 1471,
		"end": 1472,
		"match": "w"
	},
	{
		"type": "punctuation",
		"start": 1472,
		"end": 1473,
		"match": "]"
	},
	{
		"type": "comment",
		"start": 1475,
		"end": 1494,
		"match": "# for this to work\n"
	},
	{
		"type": "punctuation",
		"start": 1495,
		"end": 1496,
		"match": "["
	},
	{
		"type": "property",
		"start": 1496,
		"end": 1497,
		"match": "x"
	},
	{
		"type": "punctuation",
		"start": 1497,
		"end": 1498,
		"match": "]"
	},
	{
		"type": "comment",
		"start": 1500,
		"end": 1541,
		"match": "# defining a super-table afterward is ok\n"
	},
	{
		"type": "comment",
		"start": 1542,
		"end": 1608,
		"match": "# From spec-1.0.0/table-8: dotted keys defining tables implicitly\n"
	},
	{
		"type": "property",
		"start": 1608,
		"end": 1613,
		"match": "fruit"
	},
	{
		"type": "punctuation",
		"start": 1613,
		"end": 1614,
		"match": "."
	},
	{
		"type": "property",
		"start": 1614,
		"end": 1619,
		"match": "apple"
	},
	{
		"type": "punctuation",
		"start": 1619,
		"end": 1620,
		"match": "."
	},
	{
		"type": "property",
		"start": 1620,
		"end": 1625,
		"match": "color"
	},
	{
		"type": "operator",
		"start": 1626,
		"end": 1627,
		"match": "="
	},
	{
		"type": "string",
		"start": 1628,
		"end": 1633,
		"match": "\"red\""
	},
	{
		"type": "comment",
		"start": 1634,
		"end": 1700,
		"match": "# Defines a table named fruit\n# Defines a table named fruit.apple\n"
	},
	{
		"type": "property",
		"start": 1701,
		"end": 1706,
		"match": "fruit"
	},
	{
		"type": "punctuation",
		"start": 1706,
		"end": 1707,
		"match": "."
	},
	{
		"type": "property",
		"start": 1707,
		"end": 1712,
		"match": "apple"
	},
	{
		"type": "punctuation",
		"start": 1712,
		"end": 1713,
		"match": "."
	},
	{
		"type": "property",
		"start": 1713,
		"end": 1718,
		"match": "taste"
	},
	{
		"type": "punctuation",
		"start": 1718,
		"end": 1719,
		"match": "."
	},
	{
		"type": "property",
		"start": 1719,
		"end": 1724,
		"match": "sweet"
	},
	{
		"type": "operator",
		"start": 1725,
		"end": 1726,
		"match": "="
	},
	{
		"type": "boolean",
		"start": 1727,
		"end": 1731,
		"match": "true"
	},
	{
		"type": "comment",
		"start": 1732,
		"end": 1819,
		"match": "# Defines a table named fruit.apple.taste\n# fruit and fruit.apple were already created\n"
	},
	{
		"type": "comment",
		"start": 1820,
		"end": 1883,
		"match": "# From tests/valid/key/dotted.toml: dotted keys inside a table\n"
	},
	{
		"type": "punctuation",
		"start": 1883,
		"end": 1884,
		"match": "["
	},
	{
		"type": "property",
		"start": 1884,
		"end": 1887,
		"match": "tbl"
	},
	{
		"type": "punctuation",
		"start": 1887,
		"end": 1888,
		"match": "]"
	},
	{
		"type": "property",
		"start": 1889,
		"end": 1890,
		"match": "a"
	},
	{
		"type": "punctuation",
		"start": 1890,
		"end": 1891,
		"match": "."
	},
	{
		"type": "property",
		"start": 1891,
		"end": 1892,
		"match": "b"
	},
	{
		"type": "punctuation",
		"start": 1892,
		"end": 1893,
		"match": "."
	},
	{
		"type": "property",
		"start": 1893,
		"end": 1894,
		"match": "c"
	},
	{
		"type": "operator",
		"start": 1895,
		"end": 1896,
		"match": "="
	},
	{
		"type": "number",
		"start": 1897,
		"end": 1903,
		"match": "42.666"
	},
	{
		"type": "punctuation",
		"start": 1905,
		"end": 1906,
		"match": "["
	},
	{
		"type": "property",
		"start": 1906,
		"end": 1907,
		"match": "a"
	},
	{
		"type": "punctuation",
		"start": 1907,
		"end": 1908,
		"match": "."
	},
	{
		"type": "property",
		"start": 1908,
		"end": 1911,
		"match": "few"
	},
	{
		"type": "punctuation",
		"start": 1911,
		"end": 1912,
		"match": "."
	},
	{
		"type": "property",
		"start": 1912,
		"end": 1916,
		"match": "dots"
	},
	{
		"type": "punctuation",
		"start": 1916,
		"end": 1917,
		"match": "]"
	},
	{
		"type": "property",
		"start": 1918,
		"end": 1923,
		"match": "polka"
	},
	{
		"type": "punctuation",
		"start": 1923,
		"end": 1924,
		"match": "."
	},
	{
		"type": "property",
		"start": 1924,
		"end": 1927,
		"match": "dot"
	},
	{
		"type": "operator",
		"start": 1928,
		"end": 1929,
		"match": "="
	},
	{
		"type": "string",
		"start": 1930,
		"end": 1938,
		"match": "\"again?\""
	},
	{
		"type": "property",
		"start": 1939,
		"end": 1944,
		"match": "polka"
	},
	{
		"type": "punctuation",
		"start": 1944,
		"end": 1945,
		"match": "."
	},
	{
		"type": "property",
		"start": 1945,
		"end": 1955,
		"match": "dance-with"
	},
	{
		"type": "operator",
		"start": 1956,
		"end": 1957,
		"match": "="
	},
	{
		"type": "string",
		"start": 1958,
		"end": 1963,
		"match": "\"Dot\""
	},
	{
		"type": "comment",
		"start": 1965,
		"end": 1993,
		"match": "# --- (4) Inline tables ---\n"
	},
	{
		"type": "comment",
		"start": 1994,
		"end": 2048,
		"match": "# From spec-1.0.0/inline-table-0: basic inline tables\n"
	},
	{
		"type": "property",
		"start": 2048,
		"end": 2059,
		"match": "name_inline"
	},
	{
		"type": "operator",
		"start": 2060,
		"end": 2061,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 2062,
		"end": 2063,
		"match": "{"
	},
	{
		"type": "property",
		"start": 2064,
		"end": 2069,
		"match": "first"
	},
	{
		"type": "operator",
		"start": 2070,
		"end": 2071,
		"match": "="
	},
	{
		"type": "string",
		"start": 2072,
		"end": 2077,
		"match": "\"Tom\""
	},
	{
		"type": "punctuation",
		"start": 2077,
		"end": 2078,
		"match": ","
	},
	{
		"type": "property",
		"start": 2079,
		"end": 2083,
		"match": "last"
	},
	{
		"type": "operator",
		"start": 2084,
		"end": 2085,
		"match": "="
	},
	{
		"type": "string",
		"start": 2086,
		"end": 2102,
		"match": "\"Preston-Werner\""
	},
	{
		"type": "punctuation",
		"start": 2103,
		"end": 2104,
		"match": "}"
	},
	{
		"type": "property",
		"start": 2105,
		"end": 2110,
		"match": "point"
	},
	{
		"type": "operator",
		"start": 2111,
		"end": 2112,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 2113,
		"end": 2114,
		"match": "{"
	},
	{
		"type": "property",
		"start": 2115,
		"end": 2116,
		"match": "x"
	},
	{
		"type": "operator",
		"start": 2117,
		"end": 2118,
		"match": "="
	},
	{
		"type": "number",
		"start": 2119,
		"end": 2120,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 2120,
		"end": 2121,
		"match": ","
	},
	{
		"type": "property",
		"start": 2122,
		"end": 2123,
		"match": "y"
	},
	{
		"type": "operator",
		"start": 2124,
		"end": 2125,
		"match": "="
	},
	{
		"type": "number",
		"start": 2126,
		"end": 2127,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 2128,
		"end": 2129,
		"match": "}"
	},
	{
		"type": "property",
		"start": 2130,
		"end": 2136,
		"match": "animal"
	},
	{
		"type": "operator",
		"start": 2137,
		"end": 2138,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 2139,
		"end": 2140,
		"match": "{"
	},
	{
		"type": "property",
		"start": 2141,
		"end": 2145,
		"match": "type"
	},
	{
		"type": "punctuation",
		"start": 2145,
		"end": 2146,
		"match": "."
	},
	{
		"type": "property",
		"start": 2146,
		"end": 2150,
		"match": "name"
	},
	{
		"type": "operator",
		"start": 2151,
		"end": 2152,
		"match": "="
	},
	{
		"type": "string",
		"start": 2153,
		"end": 2158,
		"match": "\"pug\""
	},
	{
		"type": "punctuation",
		"start": 2159,
		"end": 2160,
		"match": "}"
	},
	{
		"type": "comment",
		"start": 2162,
		"end": 2195,
		"match": "# dotted key inside inline table\n"
	},
	{
		"type": "comment",
		"start": 2196,
		"end": 2274,
		"match": "# From tests/valid/inline-table/inline-table.toml: more inline table variants\n"
	},
	{
		"type": "property",
		"start": 2274,
		"end": 2280,
		"match": "simple"
	},
	{
		"type": "operator",
		"start": 2281,
		"end": 2282,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 2283,
		"end": 2284,
		"match": "{"
	},
	{
		"type": "property",
		"start": 2285,
		"end": 2286,
		"match": "a"
	},
	{
		"type": "operator",
		"start": 2287,
		"end": 2288,
		"match": "="
	},
	{
		"type": "number",
		"start": 2289,
		"end": 2290,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 2291,
		"end": 2292,
		"match": "}"
	},
	{
		"type": "property",
		"start": 2293,
		"end": 2300,
		"match": "str-key"
	},
	{
		"type": "operator",
		"start": 2301,
		"end": 2302,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 2303,
		"end": 2304,
		"match": "{"
	},
	{
		"type": "property",
		"start": 2305,
		"end": 2308,
		"match": "\"a\""
	},
	{
		"type": "operator",
		"start": 2309,
		"end": 2310,
		"match": "="
	},
	{
		"type": "number",
		"start": 2311,
		"end": 2312,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 2313,
		"end": 2314,
		"match": "}"
	},
	{
		"type": "property",
		"start": 2315,
		"end": 2326,
		"match": "table-array"
	},
	{
		"type": "operator",
		"start": 2327,
		"end": 2328,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 2329,
		"end": 2331,
		"match": "[{"
	},
	{
		"type": "property",
		"start": 2332,
		"end": 2335,
		"match": "\"a\""
	},
	{
		"type": "operator",
		"start": 2336,
		"end": 2337,
		"match": "="
	},
	{
		"type": "number",
		"start": 2338,
		"end": 2339,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 2340,
		"end": 2342,
		"match": "},"
	},
	{
		"type": "punctuation",
		"start": 2343,
		"end": 2344,
		"match": "{"
	},
	{
		"type": "property",
		"start": 2345,
		"end": 2348,
		"match": "\"b\""
	},
	{
		"type": "operator",
		"start": 2349,
		"end": 2350,
		"match": "="
	},
	{
		"type": "number",
		"start": 2351,
		"end": 2352,
		"match": "2"
	},
	{
		"type": "punctuation",
		"start": 2353,
		"end": 2355,
		"match": "}]"
	},
	{
		"type": "comment",
		"start": 2357,
		"end": 2382,
		"match": "# array of inline tables\n"
	},
	{
		"type": "comment",
		"start": 2383,
		"end": 2439,
		"match": "# From spec-1.0.0/array-0: inline table inside an array\n"
	},
	{
		"type": "property",
		"start": 2439,
		"end": 2451,
		"match": "contributors"
	},
	{
		"type": "operator",
		"start": 2452,
		"end": 2453,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 2454,
		"end": 2455,
		"match": "["
	},
	{
		"type": "string",
		"start": 2458,
		"end": 2468,
		"match": "\"Foo Bar \""
	},
	{
		"type": "punctuation",
		"start": 2468,
		"end": 2469,
		"match": ","
	},
	{
		"type": "punctuation",
		"start": 2472,
		"end": 2473,
		"match": "{"
	},
	{
		"type": "property",
		"start": 2474,
		"end": 2478,
		"match": "name"
	},
	{
		"type": "operator",
		"start": 2479,
		"end": 2480,
		"match": "="
	},
	{
		"type": "string",
		"start": 2481,
		"end": 2490,
		"match": "\"Baz Qux\""
	},
	{
		"type": "punctuation",
		"start": 2490,
		"end": 2491,
		"match": ","
	},
	{
		"type": "property",
		"start": 2492,
		"end": 2497,
		"match": "email"
	},
	{
		"type": "operator",
		"start": 2498,
		"end": 2499,
		"match": "="
	},
	{
		"type": "string",
		"start": 2500,
		"end": 2520,
		"match": "\"bazqux@example.com\""
	},
	{
		"type": "punctuation",
		"start": 2520,
		"end": 2521,
		"match": ","
	},
	{
		"type": "property",
		"start": 2522,
		"end": 2525,
		"match": "url"
	},
	{
		"type": "operator",
		"start": 2526,
		"end": 2527,
		"match": "="
	},
	{
		"type": "string",
		"start": 2528,
		"end": 2556,
		"match": "\"https://example.com/bazqux\""
	},
	{
		"type": "punctuation",
		"start": 2557,
		"end": 2558,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 2559,
		"end": 2560,
		"match": "]"
	},
	{
		"type": "comment",
		"start": 2562,
		"end": 2600,
		"match": "# --- (5) Array-of-tables [[...]] ---\n"
	},
	{
		"type": "comment",
		"start": 2601,
		"end": 2679,
		"match": "# From tests/valid/array/array-subtables.toml: array-of-tables with subtables\n"
	},
	{
		"type": "array_table_header",
		"start": 2679,
		"end": 2681,
		"match": "[["
	},
	{
		"type": "property",
		"start": 2681,
		"end": 2684,
		"match": "arr"
	},
	{
		"type": "array_table_header",
		"start": 2684,
		"end": 2686,
		"match": "]]"
	},
	{
		"type": "punctuation",
		"start": 2687,
		"end": 2688,
		"match": "["
	},
	{
		"type": "property",
		"start": 2688,
		"end": 2691,
		"match": "arr"
	},
	{
		"type": "punctuation",
		"start": 2691,
		"end": 2692,
		"match": "."
	},
	{
		"type": "property",
		"start": 2692,
		"end": 2698,
		"match": "subtab"
	},
	{
		"type": "punctuation",
		"start": 2698,
		"end": 2699,
		"match": "]"
	},
	{
		"type": "property",
		"start": 2700,
		"end": 2703,
		"match": "val"
	},
	{
		"type": "operator",
		"start": 2704,
		"end": 2705,
		"match": "="
	},
	{
		"type": "number",
		"start": 2706,
		"end": 2707,
		"match": "1"
	},
	{
		"type": "array_table_header",
		"start": 2709,
		"end": 2711,
		"match": "[["
	},
	{
		"type": "property",
		"start": 2711,
		"end": 2714,
		"match": "arr"
	},
	{
		"type": "array_table_header",
		"start": 2714,
		"end": 2716,
		"match": "]]"
	},
	{
		"type": "punctuation",
		"start": 2717,
		"end": 2718,
		"match": "["
	},
	{
		"type": "property",
		"start": 2718,
		"end": 2721,
		"match": "arr"
	},
	{
		"type": "punctuation",
		"start": 2721,
		"end": 2722,
		"match": "."
	},
	{
		"type": "property",
		"start": 2722,
		"end": 2728,
		"match": "subtab"
	},
	{
		"type": "punctuation",
		"start": 2728,
		"end": 2729,
		"match": "]"
	},
	{
		"type": "property",
		"start": 2730,
		"end": 2733,
		"match": "val"
	},
	{
		"type": "operator",
		"start": 2734,
		"end": 2735,
		"match": "="
	},
	{
		"type": "number",
		"start": 2736,
		"end": 2737,
		"match": "2"
	},
	{
		"type": "comment",
		"start": 2739,
		"end": 2810,
		"match": "# From tests/valid/key/dotted.toml: dotted keys inside array-of-tables\n"
	},
	{
		"type": "array_table_header",
		"start": 2810,
		"end": 2812,
		"match": "[["
	},
	{
		"type": "property",
		"start": 2812,
		"end": 2816,
		"match": "arr2"
	},
	{
		"type": "array_table_header",
		"start": 2816,
		"end": 2818,
		"match": "]]"
	},
	{
		"type": "property",
		"start": 2819,
		"end": 2820,
		"match": "a"
	},
	{
		"type": "punctuation",
		"start": 2820,
		"end": 2821,
		"match": "."
	},
	{
		"type": "property",
		"start": 2821,
		"end": 2822,
		"match": "b"
	},
	{
		"type": "punctuation",
		"start": 2822,
		"end": 2823,
		"match": "."
	},
	{
		"type": "property",
		"start": 2823,
		"end": 2824,
		"match": "c"
	},
	{
		"type": "operator",
		"start": 2825,
		"end": 2826,
		"match": "="
	},
	{
		"type": "number",
		"start": 2827,
		"end": 2828,
		"match": "1"
	},
	{
		"type": "property",
		"start": 2829,
		"end": 2830,
		"match": "a"
	},
	{
		"type": "punctuation",
		"start": 2830,
		"end": 2831,
		"match": "."
	},
	{
		"type": "property",
		"start": 2831,
		"end": 2832,
		"match": "b"
	},
	{
		"type": "punctuation",
		"start": 2832,
		"end": 2833,
		"match": "."
	},
	{
		"type": "property",
		"start": 2833,
		"end": 2834,
		"match": "d"
	},
	{
		"type": "operator",
		"start": 2835,
		"end": 2836,
		"match": "="
	},
	{
		"type": "number",
		"start": 2837,
		"end": 2838,
		"match": "2"
	},
	{
		"type": "array_table_header",
		"start": 2840,
		"end": 2842,
		"match": "[["
	},
	{
		"type": "property",
		"start": 2842,
		"end": 2846,
		"match": "arr2"
	},
	{
		"type": "array_table_header",
		"start": 2846,
		"end": 2848,
		"match": "]]"
	},
	{
		"type": "property",
		"start": 2849,
		"end": 2850,
		"match": "a"
	},
	{
		"type": "punctuation",
		"start": 2850,
		"end": 2851,
		"match": "."
	},
	{
		"type": "property",
		"start": 2851,
		"end": 2852,
		"match": "b"
	},
	{
		"type": "punctuation",
		"start": 2852,
		"end": 2853,
		"match": "."
	},
	{
		"type": "property",
		"start": 2853,
		"end": 2854,
		"match": "c"
	},
	{
		"type": "operator",
		"start": 2855,
		"end": 2856,
		"match": "="
	},
	{
		"type": "number",
		"start": 2857,
		"end": 2858,
		"match": "3"
	},
	{
		"type": "property",
		"start": 2859,
		"end": 2860,
		"match": "a"
	},
	{
		"type": "punctuation",
		"start": 2860,
		"end": 2861,
		"match": "."
	},
	{
		"type": "property",
		"start": 2861,
		"end": 2862,
		"match": "b"
	},
	{
		"type": "punctuation",
		"start": 2862,
		"end": 2863,
		"match": "."
	},
	{
		"type": "property",
		"start": 2863,
		"end": 2864,
		"match": "d"
	},
	{
		"type": "operator",
		"start": 2865,
		"end": 2866,
		"match": "="
	},
	{
		"type": "number",
		"start": 2867,
		"end": 2868,
		"match": "4"
	},
	{
		"type": "comment",
		"start": 2870,
		"end": 2914,
		"match": "# TOML spec example: nested array-of-tables\n"
	},
	{
		"type": "array_table_header",
		"start": 2914,
		"end": 2916,
		"match": "[["
	},
	{
		"type": "property",
		"start": 2916,
		"end": 2922,
		"match": "fruits"
	},
	{
		"type": "array_table_header",
		"start": 2922,
		"end": 2924,
		"match": "]]"
	},
	{
		"type": "property",
		"start": 2925,
		"end": 2929,
		"match": "name"
	},
	{
		"type": "operator",
		"start": 2930,
		"end": 2931,
		"match": "="
	},
	{
		"type": "string",
		"start": 2932,
		"end": 2939,
		"match": "\"apple\""
	},
	{
		"type": "punctuation",
		"start": 2941,
		"end": 2942,
		"match": "["
	},
	{
		"type": "property",
		"start": 2942,
		"end": 2948,
		"match": "fruits"
	},
	{
		"type": "punctuation",
		"start": 2948,
		"end": 2949,
		"match": "."
	},
	{
		"type": "property",
		"start": 2949,
		"end": 2957,
		"match": "physical"
	},
	{
		"type": "punctuation",
		"start": 2957,
		"end": 2958,
		"match": "]"
	},
	{
		"type": "property",
		"start": 2959,
		"end": 2964,
		"match": "color"
	},
	{
		"type": "operator",
		"start": 2965,
		"end": 2966,
		"match": "="
	},
	{
		"type": "string",
		"start": 2967,
		"end": 2972,
		"match": "\"red\""
	},
	{
		"type": "property",
		"start": 2973,
		"end": 2978,
		"match": "shape"
	},
	{
		"type": "operator",
		"start": 2979,
		"end": 2980,
		"match": "="
	},
	{
		"type": "string",
		"start": 2981,
		"end": 2988,
		"match": "\"round\""
	},
	{
		"type": "array_table_header",
		"start": 2990,
		"end": 2992,
		"match": "[["
	},
	{
		"type": "property",
		"start": 2992,
		"end": 2998,
		"match": "fruits"
	},
	{
		"type": "punctuation",
		"start": 2998,
		"end": 2999,
		"match": "."
	},
	{
		"type": "property",
		"start": 2999,
		"end": 3008,
		"match": "varieties"
	},
	{
		"type": "array_table_header",
		"start": 3008,
		"end": 3010,
		"match": "]]"
	},
	{
		"type": "property",
		"start": 3011,
		"end": 3015,
		"match": "name"
	},
	{
		"type": "operator",
		"start": 3016,
		"end": 3017,
		"match": "="
	},
	{
		"type": "string",
		"start": 3018,
		"end": 3033,
		"match": "\"red delicious\""
	},
	{
		"type": "array_table_header",
		"start": 3035,
		"end": 3037,
		"match": "[["
	},
	{
		"type": "property",
		"start": 3037,
		"end": 3043,
		"match": "fruits"
	},
	{
		"type": "punctuation",
		"start": 3043,
		"end": 3044,
		"match": "."
	},
	{
		"type": "property",
		"start": 3044,
		"end": 3053,
		"match": "varieties"
	},
	{
		"type": "array_table_header",
		"start": 3053,
		"end": 3055,
		"match": "]]"
	},
	{
		"type": "property",
		"start": 3056,
		"end": 3060,
		"match": "name"
	},
	{
		"type": "operator",
		"start": 3061,
		"end": 3062,
		"match": "="
	},
	{
		"type": "string",
		"start": 3063,
		"end": 3077,
		"match": "\"granny smith\""
	},
	{
		"type": "array_table_header",
		"start": 3079,
		"end": 3081,
		"match": "[["
	},
	{
		"type": "property",
		"start": 3081,
		"end": 3087,
		"match": "fruits"
	},
	{
		"type": "array_table_header",
		"start": 3087,
		"end": 3089,
		"match": "]]"
	},
	{
		"type": "property",
		"start": 3090,
		"end": 3094,
		"match": "name"
	},
	{
		"type": "operator",
		"start": 3095,
		"end": 3096,
		"match": "="
	},
	{
		"type": "string",
		"start": 3097,
		"end": 3105,
		"match": "\"banana\""
	},
	{
		"type": "array_table_header",
		"start": 3107,
		"end": 3109,
		"match": "[["
	},
	{
		"type": "property",
		"start": 3109,
		"end": 3115,
		"match": "fruits"
	},
	{
		"type": "punctuation",
		"start": 3115,
		"end": 3116,
		"match": "."
	},
	{
		"type": "property",
		"start": 3116,
		"end": 3125,
		"match": "varieties"
	},
	{
		"type": "array_table_header",
		"start": 3125,
		"end": 3127,
		"match": "]]"
	},
	{
		"type": "property",
		"start": 3128,
		"end": 3132,
		"match": "name"
	},
	{
		"type": "operator",
		"start": 3133,
		"end": 3134,
		"match": "="
	},
	{
		"type": "string",
		"start": 3135,
		"end": 3145,
		"match": "\"plantain\""
	}
];
