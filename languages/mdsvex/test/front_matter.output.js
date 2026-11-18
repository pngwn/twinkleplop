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
		"end": 44,
		"match": "title: Hello World\ncount: 42\ndraft: true"
	},
	{
		"type": "front_matter_marker",
		"start": 44,
		"end": 49,
		"match": "\n---\n"
	},
	{
		"type": "raw_script",
		"start": 49,
		"end": 162,
		"match": "import Chart from './Chart.svelte'\nimport { lang, clamp } from \"./const\";\nimport {\n  a,\n  b,\n} from \"./multi.js\";"
	},
	{
		"type": "heading_marker",
		"start": 164,
		"end": 166,
		"match": "# "
	},
	{
		"type": "expression",
		"start": 166,
		"end": 167,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 167,
		"end": 181,
		"match": "metadata.title"
	},
	{
		"type": "expression",
		"start": 181,
		"end": 182,
		"match": "}"
	}
];
