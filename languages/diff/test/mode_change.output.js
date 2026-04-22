export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 5,
		"match": "diff "
	},
	{
		"type": "keyword",
		"start": 5,
		"end": 10,
		"match": "--git"
	},
	{
		"type": "string",
		"start": 11,
		"end": 22,
		"match": "a/script.sh"
	},
	{
		"type": "string",
		"start": 23,
		"end": 34,
		"match": "b/script.sh"
	},
	{
		"type": "number",
		"start": 44,
		"end": 50,
		"match": "100644"
	},
	{
		"type": "number",
		"start": 60,
		"end": 66,
		"match": "100755"
	}
];
