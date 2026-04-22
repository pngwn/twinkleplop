export type doc_entry = {
	id: string;
	title: string;
	path: string;
	crumb: string;
	icon: string;
};

export type doc_group = {
	group: string;
	items: doc_entry[];
};

export const DOCS: doc_group[] = [
	{
		group: "Start here",
		items: [
			{
				id: "home",
				title: "Welcome",
				path: "/docs",
				crumb: "docs / welcome",
				icon: "★",
			},
			{
				id: "getting_started",
				title: "Getting started",
				path: "/docs/getting_started",
				crumb: "docs / getting-started",
				icon: "▸",
			},
		],
	},
	{
		group: "Guides",
		items: [
			{
				id: "themes",
				title: "Themes",
				path: "/docs/themes",
				crumb: "docs / guides / themes",
				icon: "◐",
			},
			{
				id: "tokenization",
				title: "How tokenization works",
				path: "/docs/tokenization",
				crumb: "docs / concepts / tokenization",
				icon: "λ",
			},
			{
				id: "transformers",
				title: "Transformers",
				path: "/docs/transformers",
				crumb: "docs / guides / transformers",
				icon: "⇢",
			},
			{
				id: "migration",
				title: "Migrating from shiki",
				path: "/docs/migration",
				crumb: "docs / guides / migration",
				icon: "↔",
			},
		],
	},
	{
		group: "Reference",
		items: [
			{
				id: "api",
				title: "API reference",
				path: "/docs/api",
				crumb: "docs / reference / api",
				icon: "¶",
			},
		],
	},
];

export const FLAT: (doc_entry & { group: string })[] = DOCS.flatMap((g) =>
	g.items.map((it) => ({ ...it, group: g.group })),
);

export function find_by_id(id: string): (doc_entry & { group: string }) | undefined {
	return FLAT.find((it) => it.id === id);
}

export function neighbors(
	id: string,
): { prev?: doc_entry & { group: string }; next?: doc_entry & { group: string } } {
	const i = FLAT.findIndex((it) => it.id === id);
	if (i < 0) return {};
	return {
		prev: i > 0 ? FLAT[i - 1] : undefined,
		next: i < FLAT.length - 1 ? FLAT[i + 1] : undefined,
	};
}
