export const test = [
	{
		"type": "escape",
		"start": 0,
		"end": 2,
		"match": "\\*"
	},
	{
		"type": "escape",
		"start": 14,
		"end": 16,
		"match": "\\*"
	},
	{
		"type": "escape",
		"start": 21,
		"end": 23,
		"match": "\\\\"
	},
	{
		"type": "entity",
		"start": 52,
		"end": 57,
		"match": "&amp;"
	},
	{
		"type": "entity",
		"start": 58,
		"end": 64,
		"match": "&copy;"
	},
	{
		"type": "entity",
		"start": 65,
		"end": 70,
		"match": "&#42;"
	},
	{
		"type": "entity",
		"start": 71,
		"end": 77,
		"match": "&#x2a;"
	},
	{
		"type": "hard-break",
		"start": 91,
		"end": 93,
		"match": "\\\n"
	}
];
