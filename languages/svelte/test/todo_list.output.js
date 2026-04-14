export const test = [
	{
		"type": "tag-boundary",
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
		"type": "tag-boundary",
		"start": 7,
		"end": 8,
		"match": ">"
	},
	{
		"type": "raw_script",
		"start": 8,
		"end": 836,
		"match": "\nlet items = $state([\n\t{ id: 1, text: \"Ship Phase 3.5\", done: true },\n\t{ id: 2, text: \"Write architecture docs\", done: true },\n\t{ id: 3, text: \"Build a Svelte grammar\", done: true },\n\t{ id: 4, text: \"Drink coffee\", done: false },\n]);\nlet newItem = $state(\"\");\nconst filter = $state(\"all\");\n\nconst visible = $derived(\n\tfilter === \"all\"\n\t\t? items\n\t\t: items.filter((item) => (filter === \"done\" ? item.done : !item.done)),\n);\n\nconst remaining = $derived(items.filter((item) => !item.done).length);\n\nfunction addItem() {\n\tif (!newItem.trim()) return;\n\titems = [...items, { id: Date.now(), text: newItem.trim(), done: false }];\n\tnewItem = \"\";\n}\n\nfunction toggle(id) {\n\titems = items.map((item) =>\n\t\titem.id === id ? { ...item, done: !item.done } : item,\n\t);\n}\n\nfunction remove(id) {\n\titems = items.filter((item) => item.id !== id);\n}\n"
	},
	{
		"type": "tag-boundary",
		"start": 836,
		"end": 838,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 838,
		"end": 844,
		"match": "script"
	},
	{
		"type": "tag-boundary",
		"start": 844,
		"end": 845,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 847,
		"end": 848,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 848,
		"end": 853,
		"match": "style"
	},
	{
		"type": "tag-boundary",
		"start": 853,
		"end": 854,
		"match": ">"
	},
	{
		"type": "raw_style",
		"start": 854,
		"end": 2051,
		"match": "\n\t.todo {\n\t\tmax-width: 28rem;\n\t\tmargin: 2rem auto;\n\t\tfont-family: system-ui, sans-serif;\n\t\tbackground: #111;\n\t\tborder-radius: 12px;\n\t\tpadding: 1.5rem;\n\t\tbox-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);\n\t}\n\n\t.todo h1 {\n\t\tmargin: 0 0 1rem;\n\t\tcolor: #fff;\n\t}\n\n\t.todo__form {\n\t\tdisplay: flex;\n\t\tgap: 0.5rem;\n\t\tmargin-bottom: 1rem;\n\t}\n\n\t.todo__input {\n\t\tflex: 1;\n\t\tpadding: 0.5rem;\n\t\tbackground: #1a1a1a;\n\t\tborder: 1px solid #333;\n\t\tcolor: #eaeaea;\n\t\tborder-radius: 4px;\n\t}\n\n\t.todo__list {\n\t\tlist-style: none;\n\t\tpadding: 0;\n\t\tmargin: 0;\n\t}\n\n\t.todo__item {\n\t\tdisplay: flex;\n\t\talign-items: center;\n\t\tgap: 0.5rem;\n\t\tpadding: 0.5rem 0;\n\t\tborder-bottom: 1px solid #222;\n\t}\n\n\t.todo__item--done .todo__text {\n\t\ttext-decoration: line-through;\n\t\tcolor: #666;\n\t}\n\n\t.todo__text {\n\t\tflex: 1;\n\t\tcolor: #eaeaea;\n\t}\n\n\t.todo__filters {\n\t\tdisplay: flex;\n\t\tgap: 0.5rem;\n\t\tmargin-top: 1rem;\n\t}\n\n\t.todo__filter {\n\t\tpadding: 0.25rem 0.75rem;\n\t\tbackground: transparent;\n\t\tborder: 1px solid #333;\n\t\tcolor: #aaa;\n\t\tborder-radius: 4px;\n\t\tcursor: pointer;\n\t}\n\n\t.todo__filter--active {\n\t\tbackground: #0070f3;\n\t\tcolor: white;\n\t\tborder-color: #0070f3;\n\t}\n\n\t.todo__remaining {\n\t\tmargin-top: 1rem;\n\t\tcolor: #888;\n\t\tfont-size: 0.875rem;\n\t}\n"
	},
	{
		"type": "tag-boundary",
		"start": 2051,
		"end": 2053,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 2053,
		"end": 2058,
		"match": "style"
	},
	{
		"type": "tag-boundary",
		"start": 2058,
		"end": 2059,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 2061,
		"end": 2062,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 2062,
		"end": 2065,
		"match": "div"
	},
	{
		"type": "attr-name",
		"start": 2066,
		"end": 2071,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 2071,
		"end": 2072,
		"match": "="
	},
	{
		"type": "string",
		"start": 2072,
		"end": 2078,
		"match": "\"todo\""
	},
	{
		"type": "tag-boundary",
		"start": 2078,
		"end": 2079,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 2081,
		"end": 2082,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 2082,
		"end": 2084,
		"match": "h1"
	},
	{
		"type": "tag-boundary",
		"start": 2084,
		"end": 2085,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 2091,
		"end": 2092,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 2092,
		"end": 2101,
		"match": "remaining"
	},
	{
		"type": "expression",
		"start": 2101,
		"end": 2102,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 2113,
		"end": 2115,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 2115,
		"end": 2117,
		"match": "h1"
	},
	{
		"type": "tag-boundary",
		"start": 2117,
		"end": 2118,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 2121,
		"end": 2122,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 2122,
		"end": 2126,
		"match": "form"
	},
	{
		"type": "attr-name",
		"start": 2127,
		"end": 2132,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 2132,
		"end": 2133,
		"match": "="
	},
	{
		"type": "string",
		"start": 2133,
		"end": 2145,
		"match": "\"todo__form\""
	},
	{
		"type": "attr-name",
		"start": 2146,
		"end": 2154,
		"match": "onsubmit"
	},
	{
		"type": "operator",
		"start": 2154,
		"end": 2155,
		"match": "="
	},
	{
		"type": "expression",
		"start": 2155,
		"end": 2156,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 2156,
		"end": 2163,
		"match": "addItem"
	},
	{
		"type": "expression",
		"start": 2163,
		"end": 2164,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 2164,
		"end": 2165,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 2168,
		"end": 2169,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 2169,
		"end": 2174,
		"match": "input"
	},
	{
		"type": "attr-name",
		"start": 2178,
		"end": 2183,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 2183,
		"end": 2184,
		"match": "="
	},
	{
		"type": "string",
		"start": 2184,
		"end": 2197,
		"match": "\"todo__input\""
	},
	{
		"type": "attr-name",
		"start": 2201,
		"end": 2205,
		"match": "type"
	},
	{
		"type": "operator",
		"start": 2205,
		"end": 2206,
		"match": "="
	},
	{
		"type": "string",
		"start": 2206,
		"end": 2212,
		"match": "\"text\""
	},
	{
		"type": "svelte-directive",
		"start": 2216,
		"end": 2221,
		"match": "bind:"
	},
	{
		"type": "attr-name",
		"start": 2221,
		"end": 2226,
		"match": "value"
	},
	{
		"type": "operator",
		"start": 2226,
		"end": 2227,
		"match": "="
	},
	{
		"type": "expression",
		"start": 2227,
		"end": 2228,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 2228,
		"end": 2235,
		"match": "newItem"
	},
	{
		"type": "expression",
		"start": 2235,
		"end": 2236,
		"match": "}"
	},
	{
		"type": "attr-name",
		"start": 2240,
		"end": 2251,
		"match": "placeholder"
	},
	{
		"type": "operator",
		"start": 2251,
		"end": 2252,
		"match": "="
	},
	{
		"type": "string",
		"start": 2252,
		"end": 2271,
		"match": "\"What needs doing?\""
	},
	{
		"type": "tag-boundary",
		"start": 2274,
		"end": 2276,
		"match": "/>"
	},
	{
		"type": "tag-boundary",
		"start": 2279,
		"end": 2280,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 2280,
		"end": 2286,
		"match": "button"
	},
	{
		"type": "attr-name",
		"start": 2287,
		"end": 2291,
		"match": "type"
	},
	{
		"type": "operator",
		"start": 2291,
		"end": 2292,
		"match": "="
	},
	{
		"type": "string",
		"start": 2292,
		"end": 2300,
		"match": "\"submit\""
	},
	{
		"type": "tag-boundary",
		"start": 2300,
		"end": 2301,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 2304,
		"end": 2306,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 2306,
		"end": 2312,
		"match": "button"
	},
	{
		"type": "tag-boundary",
		"start": 2312,
		"end": 2313,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 2315,
		"end": 2317,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 2317,
		"end": 2321,
		"match": "form"
	},
	{
		"type": "tag-boundary",
		"start": 2321,
		"end": 2322,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 2325,
		"end": 2326,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 2326,
		"end": 2327,
		"match": "#"
	},
	{
		"type": "svelte-block",
		"start": 2327,
		"end": 2329,
		"match": "if"
	},
	{
		"type": "raw_svelte_expression",
		"start": 2329,
		"end": 2350,
		"match": " visible.length === 0"
	},
	{
		"type": "expression",
		"start": 2350,
		"end": 2351,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 2354,
		"end": 2355,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 2355,
		"end": 2356,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 2356,
		"end": 2357,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 2408,
		"end": 2410,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 2410,
		"end": 2411,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 2411,
		"end": 2412,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 2414,
		"end": 2415,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 2415,
		"end": 2416,
		"match": ":"
	},
	{
		"type": "svelte-block",
		"start": 2416,
		"end": 2420,
		"match": "else"
	},
	{
		"type": "expression",
		"start": 2420,
		"end": 2421,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 2424,
		"end": 2425,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 2425,
		"end": 2427,
		"match": "ul"
	},
	{
		"type": "attr-name",
		"start": 2428,
		"end": 2433,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 2433,
		"end": 2434,
		"match": "="
	},
	{
		"type": "string",
		"start": 2434,
		"end": 2446,
		"match": "\"todo__list\""
	},
	{
		"type": "tag-boundary",
		"start": 2446,
		"end": 2447,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 2451,
		"end": 2452,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 2452,
		"end": 2453,
		"match": "#"
	},
	{
		"type": "svelte-block",
		"start": 2453,
		"end": 2457,
		"match": "each"
	},
	{
		"type": "raw_svelte_expression",
		"start": 2457,
		"end": 2483,
		"match": " visible as item (item.id)"
	},
	{
		"type": "expression",
		"start": 2483,
		"end": 2484,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 2489,
		"end": 2490,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 2490,
		"end": 2492,
		"match": "li"
	},
	{
		"type": "attr-name",
		"start": 2498,
		"end": 2503,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 2503,
		"end": 2504,
		"match": "="
	},
	{
		"type": "string",
		"start": 2504,
		"end": 2516,
		"match": "\"todo__item\""
	},
	{
		"type": "svelte-directive",
		"start": 2522,
		"end": 2528,
		"match": "class:"
	},
	{
		"type": "attr-name",
		"start": 2528,
		"end": 2544,
		"match": "todo__item--done"
	},
	{
		"type": "operator",
		"start": 2544,
		"end": 2545,
		"match": "="
	},
	{
		"type": "expression",
		"start": 2545,
		"end": 2546,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 2546,
		"end": 2555,
		"match": "item.done"
	},
	{
		"type": "expression",
		"start": 2555,
		"end": 2556,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 2561,
		"end": 2562,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 2568,
		"end": 2569,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 2569,
		"end": 2574,
		"match": "input"
	},
	{
		"type": "attr-name",
		"start": 2581,
		"end": 2585,
		"match": "type"
	},
	{
		"type": "operator",
		"start": 2585,
		"end": 2586,
		"match": "="
	},
	{
		"type": "string",
		"start": 2586,
		"end": 2596,
		"match": "\"checkbox\""
	},
	{
		"type": "attr-name",
		"start": 2603,
		"end": 2610,
		"match": "checked"
	},
	{
		"type": "operator",
		"start": 2610,
		"end": 2611,
		"match": "="
	},
	{
		"type": "expression",
		"start": 2611,
		"end": 2612,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 2612,
		"end": 2621,
		"match": "item.done"
	},
	{
		"type": "expression",
		"start": 2621,
		"end": 2622,
		"match": "}"
	},
	{
		"type": "attr-name",
		"start": 2629,
		"end": 2637,
		"match": "onchange"
	},
	{
		"type": "operator",
		"start": 2637,
		"end": 2638,
		"match": "="
	},
	{
		"type": "expression",
		"start": 2638,
		"end": 2639,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 2639,
		"end": 2660,
		"match": "() => toggle(item.id)"
	},
	{
		"type": "expression",
		"start": 2660,
		"end": 2661,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 2667,
		"end": 2669,
		"match": "/>"
	},
	{
		"type": "tag-boundary",
		"start": 2675,
		"end": 2676,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 2676,
		"end": 2680,
		"match": "span"
	},
	{
		"type": "attr-name",
		"start": 2681,
		"end": 2686,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 2686,
		"end": 2687,
		"match": "="
	},
	{
		"type": "string",
		"start": 2687,
		"end": 2699,
		"match": "\"todo__text\""
	},
	{
		"type": "tag-boundary",
		"start": 2699,
		"end": 2700,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 2700,
		"end": 2701,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 2701,
		"end": 2710,
		"match": "item.text"
	},
	{
		"type": "expression",
		"start": 2710,
		"end": 2711,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 2711,
		"end": 2713,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 2713,
		"end": 2717,
		"match": "span"
	},
	{
		"type": "tag-boundary",
		"start": 2717,
		"end": 2718,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 2724,
		"end": 2725,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 2725,
		"end": 2731,
		"match": "button"
	},
	{
		"type": "attr-name",
		"start": 2732,
		"end": 2739,
		"match": "onclick"
	},
	{
		"type": "operator",
		"start": 2739,
		"end": 2740,
		"match": "="
	},
	{
		"type": "expression",
		"start": 2740,
		"end": 2741,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 2741,
		"end": 2762,
		"match": "() => remove(item.id)"
	},
	{
		"type": "expression",
		"start": 2762,
		"end": 2763,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 2763,
		"end": 2764,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 2765,
		"end": 2767,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 2767,
		"end": 2773,
		"match": "button"
	},
	{
		"type": "tag-boundary",
		"start": 2773,
		"end": 2774,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 2779,
		"end": 2781,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 2781,
		"end": 2783,
		"match": "li"
	},
	{
		"type": "tag-boundary",
		"start": 2783,
		"end": 2784,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 2788,
		"end": 2789,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 2789,
		"end": 2790,
		"match": "/"
	},
	{
		"type": "svelte-block",
		"start": 2790,
		"end": 2794,
		"match": "each"
	},
	{
		"type": "expression",
		"start": 2794,
		"end": 2795,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 2798,
		"end": 2800,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 2800,
		"end": 2802,
		"match": "ul"
	},
	{
		"type": "tag-boundary",
		"start": 2802,
		"end": 2803,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 2805,
		"end": 2806,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 2806,
		"end": 2807,
		"match": "/"
	},
	{
		"type": "svelte-block",
		"start": 2807,
		"end": 2809,
		"match": "if"
	},
	{
		"type": "expression",
		"start": 2809,
		"end": 2810,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 2813,
		"end": 2814,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 2814,
		"end": 2817,
		"match": "div"
	},
	{
		"type": "attr-name",
		"start": 2818,
		"end": 2823,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 2823,
		"end": 2824,
		"match": "="
	},
	{
		"type": "string",
		"start": 2824,
		"end": 2839,
		"match": "\"todo__filters\""
	},
	{
		"type": "tag-boundary",
		"start": 2839,
		"end": 2840,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 2843,
		"end": 2844,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 2844,
		"end": 2845,
		"match": "#"
	},
	{
		"type": "svelte-block",
		"start": 2845,
		"end": 2849,
		"match": "each"
	},
	{
		"type": "raw_svelte_expression",
		"start": 2849,
		"end": 2880,
		"match": " ['all', 'active', 'done'] as f"
	},
	{
		"type": "expression",
		"start": 2880,
		"end": 2881,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 2885,
		"end": 2886,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 2886,
		"end": 2892,
		"match": "button"
	},
	{
		"type": "attr-name",
		"start": 2897,
		"end": 2902,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 2902,
		"end": 2903,
		"match": "="
	},
	{
		"type": "string",
		"start": 2903,
		"end": 2917,
		"match": "\"todo__filter\""
	},
	{
		"type": "svelte-directive",
		"start": 2922,
		"end": 2928,
		"match": "class:"
	},
	{
		"type": "attr-name",
		"start": 2928,
		"end": 2948,
		"match": "todo__filter--active"
	},
	{
		"type": "operator",
		"start": 2948,
		"end": 2949,
		"match": "="
	},
	{
		"type": "expression",
		"start": 2949,
		"end": 2950,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 2950,
		"end": 2962,
		"match": "filter === f"
	},
	{
		"type": "expression",
		"start": 2962,
		"end": 2963,
		"match": "}"
	},
	{
		"type": "attr-name",
		"start": 2968,
		"end": 2975,
		"match": "onclick"
	},
	{
		"type": "operator",
		"start": 2975,
		"end": 2976,
		"match": "="
	},
	{
		"type": "expression",
		"start": 2976,
		"end": 2977,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 2977,
		"end": 2995,
		"match": "() => (filter = f)"
	},
	{
		"type": "expression",
		"start": 2995,
		"end": 2996,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 3000,
		"end": 3001,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 3006,
		"end": 3007,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 3007,
		"end": 3008,
		"match": "f"
	},
	{
		"type": "expression",
		"start": 3008,
		"end": 3009,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 3013,
		"end": 3015,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 3015,
		"end": 3021,
		"match": "button"
	},
	{
		"type": "tag-boundary",
		"start": 3021,
		"end": 3022,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 3025,
		"end": 3026,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 3026,
		"end": 3027,
		"match": "/"
	},
	{
		"type": "svelte-block",
		"start": 3027,
		"end": 3031,
		"match": "each"
	},
	{
		"type": "expression",
		"start": 3031,
		"end": 3032,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 3034,
		"end": 3036,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 3036,
		"end": 3039,
		"match": "div"
	},
	{
		"type": "tag-boundary",
		"start": 3039,
		"end": 3040,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 3043,
		"end": 3044,
		"match": "<"
	},
	{
		"type": "tag-name",
		"start": 3044,
		"end": 3045,
		"match": "p"
	},
	{
		"type": "attr-name",
		"start": 3046,
		"end": 3051,
		"match": "class"
	},
	{
		"type": "operator",
		"start": 3051,
		"end": 3052,
		"match": "="
	},
	{
		"type": "string",
		"start": 3052,
		"end": 3069,
		"match": "\"todo__remaining\""
	},
	{
		"type": "tag-boundary",
		"start": 3069,
		"end": 3070,
		"match": ">"
	},
	{
		"type": "expression",
		"start": 3073,
		"end": 3074,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 3074,
		"end": 3075,
		"match": "#"
	},
	{
		"type": "svelte-block",
		"start": 3075,
		"end": 3077,
		"match": "if"
	},
	{
		"type": "raw_svelte_expression",
		"start": 3077,
		"end": 3093,
		"match": " remaining === 0"
	},
	{
		"type": "expression",
		"start": 3093,
		"end": 3094,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 3117,
		"end": 3118,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 3118,
		"end": 3119,
		"match": ":"
	},
	{
		"type": "svelte-block",
		"start": 3119,
		"end": 3126,
		"match": "else if"
	},
	{
		"type": "raw_svelte_expression",
		"start": 3126,
		"end": 3142,
		"match": " remaining === 1"
	},
	{
		"type": "expression",
		"start": 3142,
		"end": 3143,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 3161,
		"end": 3162,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 3162,
		"end": 3163,
		"match": ":"
	},
	{
		"type": "svelte-block",
		"start": 3163,
		"end": 3167,
		"match": "else"
	},
	{
		"type": "expression",
		"start": 3167,
		"end": 3168,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 3172,
		"end": 3173,
		"match": "{"
	},
	{
		"type": "raw_svelte_expression",
		"start": 3173,
		"end": 3182,
		"match": "remaining"
	},
	{
		"type": "expression",
		"start": 3182,
		"end": 3183,
		"match": "}"
	},
	{
		"type": "expression",
		"start": 3197,
		"end": 3198,
		"match": "{"
	},
	{
		"type": "punctuation",
		"start": 3198,
		"end": 3199,
		"match": "/"
	},
	{
		"type": "svelte-block",
		"start": 3199,
		"end": 3201,
		"match": "if"
	},
	{
		"type": "expression",
		"start": 3201,
		"end": 3202,
		"match": "}"
	},
	{
		"type": "tag-boundary",
		"start": 3204,
		"end": 3206,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 3206,
		"end": 3207,
		"match": "p"
	},
	{
		"type": "tag-boundary",
		"start": 3207,
		"end": 3208,
		"match": ">"
	},
	{
		"type": "tag-boundary",
		"start": 3209,
		"end": 3211,
		"match": "</"
	},
	{
		"type": "tag-name",
		"start": 3211,
		"end": 3214,
		"match": "div"
	},
	{
		"type": "tag-boundary",
		"start": 3214,
		"end": 3215,
		"match": ">"
	}
];
