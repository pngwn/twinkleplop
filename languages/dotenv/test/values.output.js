export const test = [
	{
		"type": "property",
		"start": 0,
		"end": 4,
		"match": "PORT"
	},
	{
		"type": "operator",
		"start": 4,
		"end": 5,
		"match": "="
	},
	{
		"type": "number",
		"start": 5,
		"end": 9,
		"match": "5432"
	},
	{
		"type": "property",
		"start": 10,
		"end": 18,
		"match": "NEGATIVE"
	},
	{
		"type": "operator",
		"start": 18,
		"end": 19,
		"match": "="
	},
	{
		"type": "number",
		"start": 19,
		"end": 22,
		"match": "-42"
	},
	{
		"type": "property",
		"start": 23,
		"end": 31,
		"match": "POSITIVE"
	},
	{
		"type": "operator",
		"start": 31,
		"end": 32,
		"match": "="
	},
	{
		"type": "number",
		"start": 32,
		"end": 34,
		"match": "+1"
	},
	{
		"type": "property",
		"start": 35,
		"end": 40,
		"match": "FLOAT"
	},
	{
		"type": "operator",
		"start": 40,
		"end": 41,
		"match": "="
	},
	{
		"type": "number",
		"start": 41,
		"end": 44,
		"match": "0.5"
	},
	{
		"type": "property",
		"start": 45,
		"end": 56,
		"match": "ZERO_PADDED"
	},
	{
		"type": "operator",
		"start": 56,
		"end": 57,
		"match": "="
	},
	{
		"type": "number",
		"start": 57,
		"end": 60,
		"match": "007"
	},
	{
		"type": "property",
		"start": 61,
		"end": 67,
		"match": "PADDED"
	},
	{
		"type": "operator",
		"start": 67,
		"end": 68,
		"match": "="
	},
	{
		"type": "number",
		"start": 70,
		"end": 74,
		"match": "3000"
	},
	{
		"type": "comment",
		"start": 76,
		"end": 82,
		"match": "# port"
	},
	{
		"type": "property",
		"start": 83,
		"end": 99,
		"match": "NUMBER_THEN_HASH"
	},
	{
		"type": "operator",
		"start": 99,
		"end": 100,
		"match": "="
	},
	{
		"type": "number",
		"start": 100,
		"end": 104,
		"match": "5432"
	},
	{
		"type": "comment",
		"start": 104,
		"end": 112,
		"match": "#comment"
	},
	{
		"type": "property",
		"start": 113,
		"end": 118,
		"match": "DEBUG"
	},
	{
		"type": "operator",
		"start": 118,
		"end": 119,
		"match": "="
	},
	{
		"type": "boolean",
		"start": 119,
		"end": 123,
		"match": "true"
	},
	{
		"type": "property",
		"start": 124,
		"end": 131,
		"match": "VERBOSE"
	},
	{
		"type": "operator",
		"start": 131,
		"end": 132,
		"match": "="
	},
	{
		"type": "boolean",
		"start": 132,
		"end": 137,
		"match": "False"
	},
	{
		"type": "property",
		"start": 138,
		"end": 145,
		"match": "ENABLED"
	},
	{
		"type": "operator",
		"start": 145,
		"end": 146,
		"match": "="
	},
	{
		"type": "boolean",
		"start": 146,
		"end": 150,
		"match": "TRUE"
	},
	{
		"type": "property",
		"start": 151,
		"end": 159,
		"match": "DISABLED"
	},
	{
		"type": "operator",
		"start": 159,
		"end": 160,
		"match": "="
	},
	{
		"type": "boolean",
		"start": 160,
		"end": 165,
		"match": "false"
	},
	{
		"type": "comment",
		"start": 166,
		"end": 171,
		"match": "# off"
	},
	{
		"type": "property",
		"start": 172,
		"end": 174,
		"match": "IP"
	},
	{
		"type": "operator",
		"start": 174,
		"end": 175,
		"match": "="
	},
	{
		"type": "string",
		"start": 175,
		"end": 184,
		"match": "127.0.0.1"
	},
	{
		"type": "property",
		"start": 185,
		"end": 192,
		"match": "VERSION"
	},
	{
		"type": "operator",
		"start": 192,
		"end": 193,
		"match": "="
	},
	{
		"type": "string",
		"start": 193,
		"end": 198,
		"match": "1.2.3"
	},
	{
		"type": "property",
		"start": 199,
		"end": 209,
		"match": "PORT_PROTO"
	},
	{
		"type": "operator",
		"start": 209,
		"end": 210,
		"match": "="
	},
	{
		"type": "string",
		"start": 210,
		"end": 218,
		"match": "8080/tcp"
	},
	{
		"type": "property",
		"start": 219,
		"end": 223,
		"match": "DATE"
	},
	{
		"type": "operator",
		"start": 223,
		"end": 224,
		"match": "="
	},
	{
		"type": "string",
		"start": 224,
		"end": 234,
		"match": "2024-01-01"
	},
	{
		"type": "property",
		"start": 235,
		"end": 240,
		"match": "CLOCK"
	},
	{
		"type": "operator",
		"start": 240,
		"end": 241,
		"match": "="
	},
	{
		"type": "string",
		"start": 241,
		"end": 246,
		"match": "08:00"
	},
	{
		"type": "property",
		"start": 247,
		"end": 253,
		"match": "APPLES"
	},
	{
		"type": "operator",
		"start": 253,
		"end": 254,
		"match": "="
	},
	{
		"type": "string",
		"start": 254,
		"end": 262,
		"match": "5 apples"
	},
	{
		"type": "property",
		"start": 263,
		"end": 275,
		"match": "TRAILING_DOT"
	},
	{
		"type": "operator",
		"start": 275,
		"end": 276,
		"match": "="
	},
	{
		"type": "string",
		"start": 276,
		"end": 278,
		"match": "5."
	},
	{
		"type": "property",
		"start": 279,
		"end": 290,
		"match": "LEADING_DOT"
	},
	{
		"type": "operator",
		"start": 290,
		"end": 291,
		"match": "="
	},
	{
		"type": "string",
		"start": 291,
		"end": 293,
		"match": ".5"
	},
	{
		"type": "property",
		"start": 294,
		"end": 303,
		"match": "SIGN_ONLY"
	},
	{
		"type": "operator",
		"start": 303,
		"end": 304,
		"match": "="
	},
	{
		"type": "string",
		"start": 304,
		"end": 305,
		"match": "-"
	},
	{
		"type": "property",
		"start": 306,
		"end": 310,
		"match": "FLAG"
	},
	{
		"type": "operator",
		"start": 310,
		"end": 311,
		"match": "="
	},
	{
		"type": "string",
		"start": 311,
		"end": 320,
		"match": "--verbose"
	},
	{
		"type": "property",
		"start": 321,
		"end": 328,
		"match": "TRUEISH"
	},
	{
		"type": "operator",
		"start": 328,
		"end": 329,
		"match": "="
	},
	{
		"type": "string",
		"start": 329,
		"end": 336,
		"match": "trueish"
	},
	{
		"type": "property",
		"start": 337,
		"end": 340,
		"match": "YES"
	},
	{
		"type": "operator",
		"start": 340,
		"end": 341,
		"match": "="
	},
	{
		"type": "string",
		"start": 341,
		"end": 344,
		"match": "yes"
	},
	{
		"type": "property",
		"start": 345,
		"end": 349,
		"match": "NULL"
	},
	{
		"type": "operator",
		"start": 349,
		"end": 350,
		"match": "="
	},
	{
		"type": "string",
		"start": 350,
		"end": 354,
		"match": "null"
	},
	{
		"type": "property",
		"start": 355,
		"end": 368,
		"match": "QUOTED_NUMBER"
	},
	{
		"type": "operator",
		"start": 368,
		"end": 369,
		"match": "="
	},
	{
		"type": "string",
		"start": 369,
		"end": 375,
		"match": "\"5432\""
	},
	{
		"type": "property",
		"start": 376,
		"end": 390,
		"match": "QUOTED_BOOLEAN"
	},
	{
		"type": "operator",
		"start": 390,
		"end": 391,
		"match": "="
	},
	{
		"type": "string",
		"start": 391,
		"end": 397,
		"match": "'true'"
	}
];
