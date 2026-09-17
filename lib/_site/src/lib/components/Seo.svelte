<script lang="ts">
	import { page } from '$app/state';

	// social tags need absolute urls, and prerendering has no real origin,
	// so they are built from the deployed site url.
	const SITE = 'https://twinkleplop.pngwn.at';

	let {
		title,
		description,
		image = `${SITE}/og.png`,
		type = 'website'
	}: {
		title: string;
		description: string;
		image?: string;
		type?: 'website' | 'article';
	} = $props();

	const url = $derived(new URL(page.url.pathname, SITE).href);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />

	<meta property="og:site_name" content="twinkleplop" />
	<meta property="og:type" content={type} />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="twinkleplop — plop some twinkle in your code" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
</svelte:head>
