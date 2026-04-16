export const test = [
	{
		"type": "changed_marker",
		"start": 0,
		"end": 2,
		"match": "! "
	},
	{
		"type": "changed",
		"start": 2,
		"end": 14,
		"match": "line two old"
	},
	{
		"type": "changed_marker",
		"start": 15,
		"end": 17,
		"match": "! "
	},
	{
		"type": "changed",
		"start": 17,
		"end": 29,
		"match": "line two new"
	},
	{
		"type": "inserted_marker",
		"start": 30,
		"end": 31,
		"match": "+"
	},
	{
		"type": "inserted",
		"start": 31,
		"end": 41,
		"match": "added line"
	},
	{
		"type": "deleted_marker",
		"start": 42,
		"end": 43,
		"match": "-"
	},
	{
		"type": "deleted",
		"start": 43,
		"end": 55,
		"match": "removed line"
	},
	{
		"type": "comment",
		"start": 56,
		"end": 83,
		"match": "\\ No newline at end of file"
	}
];
