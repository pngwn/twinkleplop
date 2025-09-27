/**
 * @type {import("@twinkleplop/core").Grammar}
 */
export default {
	name: "whitespace",
	states: {
		main: {
			rules: [
				//tabs
				{
					match: "\t",
					token: "tab",
				},
				//newlines
				{
					match: "\n",
					token: "newline",
				},
				//carriage returns
				{
					match: "\r",
					token: "carriage_return",
				},
				//spaces
				{
					match: " ",
					token: "space",
				},
				{
					any: true,
				},
			],
		},
	},
};
