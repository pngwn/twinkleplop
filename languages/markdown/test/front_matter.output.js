export const test = [
	{
		"type": "front_matter_marker",
		"start": 0,
		"end": 4,
		"match": "---\n"
	},
	{
		"type": "raw_front_matter",
		"start": 4,
		"end": 33,
		"match": "title: Hello\ndate: 2026-04-14"
	},
	{
		"type": "front_matter_marker",
		"start": 33,
		"end": 38,
		"match": "\n---\n"
	},
	{
		"type": "heading_marker",
		"start": 39,
		"end": 40,
		"match": "#"
	},
	{
		"type": "heading",
		"start": 40,
		"end": 54,
		"match": " First heading"
	}
];
