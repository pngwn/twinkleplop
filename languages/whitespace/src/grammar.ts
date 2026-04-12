import { define_grammar } from "@twinkleplop/core/compile";
export default define_grammar({
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
});
