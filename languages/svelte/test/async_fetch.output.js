export const test = [
	{
		"type": "punctuation",
		"start": 0,
		"end": 1,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 1,
		"end": 7,
		"match": "script"
	},
	{
		"type": "punctuation",
		"start": 7,
		"end": 8,
		"match": ">"
	},
	{
		"type": "raw_script",
		"start": 8,
		"end": 304,
		"match": "\nconst url = $state(\"/api/users\");\n\nasync function fetchUsers() {\n\tconst response = await fetch(url);\n\tif (!response.ok) {\n\t\tthrow new Error(`Request failed: ${response.status}`);\n\t}\n\treturn response.json();\n}\n\nlet promise = $state(fetchUsers());\n\nfunction refresh() {\n\tpromise = fetchUsers();\n}\n"
	},
	{
		"type": "punctuation",
		"start": 304,
		"end": 306,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 306,
		"end": 312,
		"match": "script"
	},
	{
		"type": "punctuation",
		"start": 312,
		"end": 313,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 315,
		"end": 316,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 316,
		"end": 321,
		"match": "style"
	},
	{
		"type": "punctuation",
		"start": 321,
		"end": 322,
		"match": ">"
	},
	{
		"type": "raw_style",
		"start": 322,
		"end": 878,
		"match": "\n\t.user-list {\n\t\tpadding: 1rem;\n\t\tbackground: #0a0a0a;\n\t\tborder-radius: 8px;\n\t\tcolor: #eaeaea;\n\t}\n\n\t.user-list__loading,\n\t.user-list__error {\n\t\tpadding: 2rem;\n\t\ttext-align: center;\n\t}\n\n\t.user-list__error {\n\t\tcolor: #ef4444;\n\t}\n\n\t.user-list__items {\n\t\tlist-style: none;\n\t\tpadding: 0;\n\t\tmargin: 0;\n\t}\n\n\t.user-list__item {\n\t\tpadding: 0.75rem;\n\t\tborder-bottom: 1px solid #222;\n\t}\n\n\t.user-list__item:last-child {\n\t\tborder-bottom: none;\n\t}\n\n\t.user-list__name {\n\t\tfont-weight: 600;\n\t\tcolor: #fff;\n\t}\n\n\t.user-list__email {\n\t\tcolor: #888;\n\t\tfont-size: 0.875rem;\n\t}\n"
	},
	{
		"type": "punctuation",
		"start": 878,
		"end": 880,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 880,
		"end": 885,
		"match": "style"
	},
	{
		"type": "punctuation",
		"start": 885,
		"end": 886,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 888,
		"end": 889,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 889,
		"end": 892,
		"match": "div"
	},
	{
		"type": "attr_name",
		"start": 893,
		"end": 898,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 898,
		"end": 899,
		"match": "="
	},
	{
		"type": "string",
		"start": 899,
		"end": 910,
		"match": "\"user-list\""
	},
	{
		"type": "punctuation",
		"start": 910,
		"end": 911,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 913,
		"end": 914,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 914,
		"end": 916,
		"match": "h2"
	},
	{
		"type": "punctuation",
		"start": 916,
		"end": 917,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 922,
		"end": 924,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 924,
		"end": 926,
		"match": "h2"
	},
	{
		"type": "punctuation",
		"start": 926,
		"end": 927,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 929,
		"end": 930,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 930,
		"end": 936,
		"match": "button"
	},
	{
		"type": "attr_name",
		"start": 937,
		"end": 944,
		"match": "onclick"
	},
	{
		"type": "operator",
		"start": 944,
		"end": 945,
		"match": "="
	},
	{
		"type": "expression",
		"start": 945,
		"end": 946,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 946,
		"end": 953,
		"match": "refresh"
	},
	{
		"type": "expression",
		"start": 953,
		"end": 954,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 954,
		"end": 955,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 962,
		"end": 964,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 964,
		"end": 970,
		"match": "button"
	},
	{
		"type": "punctuation",
		"start": 970,
		"end": 971,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 974,
		"end": 975,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 975,
		"end": 976,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 976,
		"end": 981,
		"match": "await"
	},
	{
		"type": "raw_svelte_expression",
		"start": 981,
		"end": 989,
		"match": " promise"
	},
	{
		"type": "expression",
		"start": 989,
		"end": 990,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 993,
		"end": 994,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 994,
		"end": 995,
		"match": "p"
	},
	{
		"type": "attr_name",
		"start": 996,
		"end": 1001,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 1001,
		"end": 1002,
		"match": "="
	},
	{
		"type": "string",
		"start": 1002,
		"end": 1022,
		"match": "\"user-list__loading\""
	},
	{
		"type": "punctuation",
		"start": 1022,
		"end": 1023,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 1031,
		"end": 1033,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 1033,
		"end": 1034,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 1034,
		"end": 1035,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 1037,
		"end": 1038,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 1038,
		"end": 1039,
		"match": ":"
	},
	{
		"type": "svelte_block",
		"start": 1039,
		"end": 1043,
		"match": "then"
	},
	{
		"type": "raw_svelte_expression",
		"start": 1043,
		"end": 1049,
		"match": " users"
	},
	{
		"type": "expression",
		"start": 1049,
		"end": 1050,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 1053,
		"end": 1054,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 1054,
		"end": 1055,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 1055,
		"end": 1057,
		"match": "if"
	},
	{
		"type": "raw_svelte_expression",
		"start": 1057,
		"end": 1076,
		"match": " users.length === 0"
	},
	{
		"type": "expression",
		"start": 1076,
		"end": 1077,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 1081,
		"end": 1082,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 1082,
		"end": 1083,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 1083,
		"end": 1084,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 1099,
		"end": 1101,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 1101,
		"end": 1102,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 1102,
		"end": 1103,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 1106,
		"end": 1107,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 1107,
		"end": 1108,
		"match": ":"
	},
	{
		"type": "svelte_block",
		"start": 1108,
		"end": 1112,
		"match": "else"
	},
	{
		"type": "expression",
		"start": 1112,
		"end": 1113,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 1117,
		"end": 1118,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 1118,
		"end": 1120,
		"match": "ul"
	},
	{
		"type": "attr_name",
		"start": 1121,
		"end": 1126,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 1126,
		"end": 1127,
		"match": "="
	},
	{
		"type": "string",
		"start": 1127,
		"end": 1145,
		"match": "\"user-list__items\""
	},
	{
		"type": "punctuation",
		"start": 1145,
		"end": 1146,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 1151,
		"end": 1152,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 1152,
		"end": 1153,
		"match": "#"
	},
	{
		"type": "svelte_block",
		"start": 1153,
		"end": 1157,
		"match": "each"
	},
	{
		"type": "raw_svelte_expression",
		"start": 1157,
		"end": 1181,
		"match": " users as user (user.id)"
	},
	{
		"type": "expression",
		"start": 1181,
		"end": 1182,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 1188,
		"end": 1189,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 1189,
		"end": 1191,
		"match": "li"
	},
	{
		"type": "attr_name",
		"start": 1192,
		"end": 1197,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 1197,
		"end": 1198,
		"match": "="
	},
	{
		"type": "string",
		"start": 1198,
		"end": 1215,
		"match": "\"user-list__item\""
	},
	{
		"type": "punctuation",
		"start": 1215,
		"end": 1216,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 1223,
		"end": 1224,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 1224,
		"end": 1228,
		"match": "span"
	},
	{
		"type": "attr_name",
		"start": 1229,
		"end": 1234,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 1234,
		"end": 1235,
		"match": "="
	},
	{
		"type": "string",
		"start": 1235,
		"end": 1252,
		"match": "\"user-list__name\""
	},
	{
		"type": "punctuation",
		"start": 1252,
		"end": 1253,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 1253,
		"end": 1254,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 1254,
		"end": 1263,
		"match": "user.name"
	},
	{
		"type": "expression",
		"start": 1263,
		"end": 1264,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 1264,
		"end": 1266,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 1266,
		"end": 1270,
		"match": "span"
	},
	{
		"type": "punctuation",
		"start": 1270,
		"end": 1271,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 1278,
		"end": 1279,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 1279,
		"end": 1283,
		"match": "span"
	},
	{
		"type": "attr_name",
		"start": 1284,
		"end": 1289,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 1289,
		"end": 1290,
		"match": "="
	},
	{
		"type": "string",
		"start": 1290,
		"end": 1308,
		"match": "\"user-list__email\""
	},
	{
		"type": "punctuation",
		"start": 1308,
		"end": 1309,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 1309,
		"end": 1310,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 1310,
		"end": 1320,
		"match": "user.email"
	},
	{
		"type": "expression",
		"start": 1320,
		"end": 1321,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 1321,
		"end": 1323,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 1323,
		"end": 1327,
		"match": "span"
	},
	{
		"type": "punctuation",
		"start": 1327,
		"end": 1328,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 1334,
		"end": 1336,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 1336,
		"end": 1338,
		"match": "li"
	},
	{
		"type": "punctuation",
		"start": 1338,
		"end": 1339,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 1344,
		"end": 1345,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 1345,
		"end": 1346,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 1346,
		"end": 1350,
		"match": "each"
	},
	{
		"type": "expression",
		"start": 1350,
		"end": 1351,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 1355,
		"end": 1357,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 1357,
		"end": 1359,
		"match": "ul"
	},
	{
		"type": "punctuation",
		"start": 1359,
		"end": 1360,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 1363,
		"end": 1364,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 1364,
		"end": 1365,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 1365,
		"end": 1367,
		"match": "if"
	},
	{
		"type": "expression",
		"start": 1367,
		"end": 1368,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 1370,
		"end": 1371,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 1371,
		"end": 1372,
		"match": ":"
	},
	{
		"type": "svelte_block",
		"start": 1372,
		"end": 1377,
		"match": "catch"
	},
	{
		"type": "raw_svelte_expression",
		"start": 1377,
		"end": 1383,
		"match": " error"
	},
	{
		"type": "expression",
		"start": 1383,
		"end": 1384,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 1387,
		"end": 1388,
		"match": "<"
	},
	{
		"type": "tag_name",
		"start": 1388,
		"end": 1389,
		"match": "p"
	},
	{
		"type": "attr_name",
		"start": 1390,
		"end": 1395,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 1395,
		"end": 1396,
		"match": "="
	},
	{
		"type": "string",
		"start": 1396,
		"end": 1414,
		"match": "\"user-list__error\""
	},
	{
		"type": "punctuation",
		"start": 1414,
		"end": 1415,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 1435,
		"end": 1436,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 1436,
		"end": 1449,
		"match": "error.message"
	},
	{
		"type": "expression",
		"start": 1449,
		"end": 1450,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 1453,
		"end": 1455,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 1455,
		"end": 1456,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 1456,
		"end": 1457,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 1459,
		"end": 1460,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 1460,
		"end": 1461,
		"match": "/"
	},
	{
		"type": "svelte_block",
		"start": 1461,
		"end": 1466,
		"match": "await"
	},
	{
		"type": "expression",
		"start": 1466,
		"end": 1467,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 1468,
		"end": 1470,
		"match": "</"
	},
	{
		"type": "tag_name",
		"start": 1470,
		"end": 1473,
		"match": "div"
	},
	{
		"type": "punctuation",
		"start": 1473,
		"end": 1474,
		"match": ">"
	}
];
