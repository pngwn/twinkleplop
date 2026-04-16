export const test = [
	{
		"type": "keyword",
		"start": 0,
		"end": 10,
		"match": "diff --git"
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
		"type": "meta",
		"start": 35,
		"end": 44,
		"match": "old mode "
	},
	{
		"type": "number",
		"start": 44,
		"end": 50,
		"match": "100644"
	},
	{
		"type": "meta",
		"start": 51,
		"end": 60,
		"match": "new mode "
	},
	{
		"type": "number",
		"start": 60,
		"end": 66,
		"match": "100755"
	}
];
