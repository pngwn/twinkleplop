export const test = [
	{
		"type": "label",
		"start": 0,
		"end": 2,
		"match": "@@"
	},
	{
		"type": "punctuation",
		"start": 3,
		"end": 4,
		"match": "-"
	},
	{
		"type": "number",
		"start": 4,
		"end": 6,
		"match": "10"
	},
	{
		"type": "punctuation",
		"start": 6,
		"end": 7,
		"match": ","
	},
	{
		"type": "number",
		"start": 7,
		"end": 8,
		"match": "7"
	},
	{
		"type": "punctuation",
		"start": 9,
		"end": 10,
		"match": "+"
	},
	{
		"type": "number",
		"start": 10,
		"end": 12,
		"match": "10"
	},
	{
		"type": "punctuation",
		"start": 12,
		"end": 13,
		"match": ","
	},
	{
		"type": "number",
		"start": 13,
		"end": 14,
		"match": "8"
	},
	{
		"type": "label",
		"start": 15,
		"end": 17,
		"match": "@@"
	},
	{
		"type": "comment",
		"start": 17,
		"end": 43,
		"match": " function process(input) {"
	},
	{
		"type": "deleted_marker",
		"start": 66,
		"end": 67,
		"match": "-"
	},
	{
		"type": "deleted",
		"start": 67,
		"end": 109,
		"match": "  for (let i = 0; i < input.length; i++) {"
	},
	{
		"type": "deleted_marker",
		"start": 110,
		"end": 111,
		"match": "-"
	},
	{
		"type": "deleted",
		"start": 111,
		"end": 141,
		"match": "    result.push(input[i] * 2);"
	},
	{
		"type": "inserted_marker",
		"start": 142,
		"end": 143,
		"match": "+"
	},
	{
		"type": "inserted",
		"start": 143,
		"end": 172,
		"match": "  for (const item of input) {"
	},
	{
		"type": "inserted_marker",
		"start": 173,
		"end": 174,
		"match": "+"
	},
	{
		"type": "inserted",
		"start": 174,
		"end": 200,
		"match": "    result.push(item * 2);"
	},
	{
		"type": "inserted_marker",
		"start": 201,
		"end": 202,
		"match": "+"
	},
	{
		"type": "inserted",
		"start": 202,
		"end": 224,
		"match": "    console.log(item);"
	}
];
