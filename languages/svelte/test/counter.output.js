export const test = [
	{
		"type": "punctuation",
		"start": 0,
		"end": 1,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 1,
		"end": 7,
		"match": "script"
	},
	{
		"type": "punctuation",
		"start": 7,
		"end": 8,
		"match": ">"
	},
	{
		"type": "raw_script",
		"start": 8,
		"end": 135,
		"match": "\nlet count = $state(0);\nconst double = $derived(count * 2);\n\nconst increment = () => count++;\nconst reset = () => (count = 0);\n"
	},
	{
		"type": "tag-name",
		"start": 135,
		"end": 144,
		"match": "</script>"
	},
	{
		"type": "punctuation",
		"start": 146,
		"end": 147,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 147,
		"end": 152,
		"match": "style"
	},
	{
		"type": "punctuation",
		"start": 152,
		"end": 153,
		"match": ">"
	},
	{
		"type": "raw_style",
		"start": 153,
		"end": 635,
		"match": "\n\t.counter {\n\t\tdisplay: flex;\n\t\talign-items: center;\n\t\tgap: 1rem;\n\t\tpadding: 1rem;\n\t\tbackground: #111;\n\t\tborder-radius: 8px;\n\t}\n\n\t.counter__value {\n\t\tfont-size: 2rem;\n\t\tfont-weight: 700;\n\t\tcolor: var(--primary, #0070f3);\n\t\tmin-width: 3rem;\n\t\ttext-align: center;\n\t}\n\n\t.counter__button {\n\t\tpadding: 0.5rem 1rem;\n\t\tbackground: var(--primary, #0070f3);\n\t\tcolor: white;\n\t\tborder: none;\n\t\tborder-radius: 4px;\n\t\tcursor: pointer;\n\t}\n\n\t.counter__button:hover {\n\t\tfilter: brightness(1.1);\n\t}\n"
	},
	{
		"type": "tag-name",
		"start": 635,
		"end": 643,
		"match": "</style>"
	},
	{
		"type": "punctuation",
		"start": 645,
		"end": 646,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 646,
		"end": 649,
		"match": "div"
	},
	{
		"type": "attr-name",
		"start": 650,
		"end": 655,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 655,
		"end": 656,
		"match": "="
	},
	{
		"type": "string",
		"start": 656,
		"end": 665,
		"match": "\"counter\""
	},
	{
		"type": "punctuation",
		"start": 665,
		"end": 666,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 668,
		"end": 669,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 669,
		"end": 675,
		"match": "button"
	},
	{
		"type": "attr-name",
		"start": 676,
		"end": 681,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 681,
		"end": 682,
		"match": "="
	},
	{
		"type": "string",
		"start": 682,
		"end": 699,
		"match": "\"counter__button\""
	},
	{
		"type": "attr-name",
		"start": 700,
		"end": 707,
		"match": "onclick"
	},
	{
		"type": "operator",
		"start": 707,
		"end": 708,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 708,
		"end": 709,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 709,
		"end": 714,
		"match": "reset"
	},
	{
		"type": "punctuation",
		"start": 714,
		"end": 716,
		"match": "}>"
	},
	{
		"type": "punctuation",
		"start": 721,
		"end": 723,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 723,
		"end": 729,
		"match": "button"
	},
	{
		"type": "punctuation",
		"start": 729,
		"end": 730,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 732,
		"end": 733,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 733,
		"end": 737,
		"match": "span"
	},
	{
		"type": "attr-name",
		"start": 738,
		"end": 743,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 743,
		"end": 744,
		"match": "="
	},
	{
		"type": "string",
		"start": 744,
		"end": 760,
		"match": "\"counter__value\""
	},
	{
		"type": "punctuation",
		"start": 760,
		"end": 762,
		"match": ">{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 762,
		"end": 767,
		"match": "count"
	},
	{
		"type": "punctuation",
		"start": 767,
		"end": 770,
		"match": "}</"
	},
	{
		"type": "tag-name",
		"start": 770,
		"end": 774,
		"match": "span"
	},
	{
		"type": "punctuation",
		"start": 774,
		"end": 775,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 777,
		"end": 778,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 778,
		"end": 784,
		"match": "button"
	},
	{
		"type": "attr-name",
		"start": 785,
		"end": 790,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 790,
		"end": 791,
		"match": "="
	},
	{
		"type": "string",
		"start": 791,
		"end": 808,
		"match": "\"counter__button\""
	},
	{
		"type": "attr-name",
		"start": 809,
		"end": 816,
		"match": "onclick"
	},
	{
		"type": "operator",
		"start": 816,
		"end": 817,
		"match": "="
	},
	{
		"type": "punctuation",
		"start": 817,
		"end": 818,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 818,
		"end": 827,
		"match": "increment"
	},
	{
		"type": "punctuation",
		"start": 827,
		"end": 829,
		"match": "}>"
	},
	{
		"type": "punctuation",
		"start": 831,
		"end": 833,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 833,
		"end": 839,
		"match": "button"
	},
	{
		"type": "punctuation",
		"start": 839,
		"end": 840,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 841,
		"end": 843,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 843,
		"end": 846,
		"match": "div"
	},
	{
		"type": "punctuation",
		"start": 846,
		"end": 847,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 849,
		"end": 850,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 850,
		"end": 851,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 851,
		"end": 852,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 860,
		"end": 861,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 861,
		"end": 867,
		"match": "double"
	},
	{
		"type": "punctuation",
		"start": 867,
		"end": 870,
		"match": "}</"
	},
	{
		"type": "tag-name",
		"start": 870,
		"end": 871,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 871,
		"end": 872,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 874,
		"end": 875,
		"match": "{"
	},
	{
		"type": "svelte-block",
		"start": 875,
		"end": 878,
		"match": "#if"
	},
	{
		"type": "raw_svelte_expression",
		"start": 878,
		"end": 889,
		"match": " count > 10"
	},
	{
		"type": "punctuation",
		"start": 889,
		"end": 890,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 892,
		"end": 893,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 893,
		"end": 894,
		"match": "p"
	},
	{
		"type": "attr-name",
		"start": 895,
		"end": 900,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 900,
		"end": 901,
		"match": "="
	},
	{
		"type": "string",
		"start": 901,
		"end": 910,
		"match": "\"warning\""
	},
	{
		"type": "punctuation",
		"start": 910,
		"end": 911,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 934,
		"end": 936,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 936,
		"end": 937,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 937,
		"end": 938,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 939,
		"end": 940,
		"match": "{"
	},
	{
		"type": "svelte-block",
		"start": 940,
		"end": 948,
		"match": ":else if"
	},
	{
		"type": "raw_svelte_expression",
		"start": 948,
		"end": 958,
		"match": " count > 0"
	},
	{
		"type": "punctuation",
		"start": 958,
		"end": 959,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 961,
		"end": 962,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 962,
		"end": 963,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 963,
		"end": 964,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 979,
		"end": 980,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 980,
		"end": 985,
		"match": "count"
	},
	{
		"type": "punctuation",
		"start": 985,
		"end": 986,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 991,
		"end": 992,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 992,
		"end": 1014,
		"match": "count === 1 ? '' : 's'"
	},
	{
		"type": "punctuation",
		"start": 1014,
		"end": 1015,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 1016,
		"end": 1018,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 1018,
		"end": 1019,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 1019,
		"end": 1020,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 1021,
		"end": 1022,
		"match": "{"
	},
	{
		"type": "svelte-block",
		"start": 1022,
		"end": 1027,
		"match": ":else"
	},
	{
		"type": "punctuation",
		"start": 1027,
		"end": 1028,
		"match": "}"
	},
	{
		"type": "punctuation",
		"start": 1030,
		"end": 1031,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 1031,
		"end": 1032,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 1032,
		"end": 1033,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 1057,
		"end": 1059,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 1059,
		"end": 1060,
		"match": "p"
	},
	{
		"type": "punctuation",
		"start": 1060,
		"end": 1061,
		"match": ">"
	},
	{
		"type": "punctuation",
		"start": 1062,
		"end": 1063,
		"match": "{"
	},
	{
		"type": "svelte-block",
		"start": 1063,
		"end": 1066,
		"match": "/if"
	},
	{
		"type": "punctuation",
		"start": 1066,
		"end": 1067,
		"match": "}"
	}
];
