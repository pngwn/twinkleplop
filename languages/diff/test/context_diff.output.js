export const test = [
	{
		"type": "heading",
		"start": 0,
		"end": 4,
		"match": "*** "
	},
	{
		"type": "string",
		"start": 4,
		"end": 16,
		"match": "old_file.txt"
	},
	{
		"type": "punctuation",
		"start": 16,
		"end": 17,
		"match": "\t"
	},
	{
		"type": "comment",
		"start": 17,
		"end": 52,
		"match": "2024-01-15 10:00:00.000000000 +0000"
	},
	{
		"type": "heading",
		"start": 53,
		"end": 57,
		"match": "--- "
	},
	{
		"type": "string",
		"start": 57,
		"end": 69,
		"match": "new_file.txt"
	},
	{
		"type": "punctuation",
		"start": 69,
		"end": 70,
		"match": "\t"
	},
	{
		"type": "comment",
		"start": 70,
		"end": 105,
		"match": "2024-01-15 10:30:00.000000000 +0000"
	},
	{
		"type": "label",
		"start": 106,
		"end": 121,
		"match": "***************"
	},
	{
		"type": "heading",
		"start": 122,
		"end": 126,
		"match": "*** "
	},
	{
		"type": "number",
		"start": 126,
		"end": 127,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 127,
		"end": 128,
		"match": ","
	},
	{
		"type": "number",
		"start": 128,
		"end": 129,
		"match": "5"
	},
	{
		"type": "label",
		"start": 129,
		"end": 134,
		"match": " ****"
	},
	{
		"type": "context",
		"start": 136,
		"end": 145,
		"match": " line one"
	},
	{
		"type": "changed_marker",
		"start": 146,
		"end": 147,
		"match": "!"
	},
	{
		"type": "changed",
		"start": 147,
		"end": 160,
		"match": " line two old"
	},
	{
		"type": "context",
		"start": 162,
		"end": 173,
		"match": " line three"
	},
	{
		"type": "heading",
		"start": 174,
		"end": 178,
		"match": "--- "
	},
	{
		"type": "number",
		"start": 178,
		"end": 179,
		"match": "1"
	},
	{
		"type": "punctuation",
		"start": 179,
		"end": 180,
		"match": ","
	},
	{
		"type": "number",
		"start": 180,
		"end": 181,
		"match": "5"
	},
	{
		"type": "label",
		"start": 181,
		"end": 186,
		"match": " ----"
	},
	{
		"type": "context",
		"start": 188,
		"end": 197,
		"match": " line one"
	},
	{
		"type": "changed_marker",
		"start": 198,
		"end": 199,
		"match": "!"
	},
	{
		"type": "changed",
		"start": 199,
		"end": 212,
		"match": " line two new"
	},
	{
		"type": "context",
		"start": 214,
		"end": 225,
		"match": " line three"
	}
];
