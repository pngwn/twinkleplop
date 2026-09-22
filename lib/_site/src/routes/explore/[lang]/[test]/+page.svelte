<script lang="ts">
	import { goto } from '$app/navigation';

	import ExploreLab from '$lib/components/explore/ExploreLab.svelte';
	import { fidelity_by_lang, view } from '$lib/explore/lab_state.svelte';
	import { encode_share } from '$lib/explore/share';

	let { data } = $props();

	const source = $derived(data.css_files.find(([file]) => file === data.test)?.[1] ?? '');

	// an href rather than a click handler so middle click works, it opens a
	// blank editor until the first encode lands
	let edit_href = $state('/explore/edit');
	$effect(() => {
		const state = {
			lang: data.lang,
			source,
			theme: view.theme,
			fidelity: fidelity_by_lang[data.lang]?.slice() ?? null
		};
		let stale = false;
		encode_share(state).then((hash) => {
			if (!stale) edit_href = `/explore/edit#${hash}`;
		});
		return () => {
			stale = true;
		};
	});

	function handle_lang(next: string) {
		if (next === data.lang) return;
		// keep the sample when the next language has one of the same name
		const sample = data.samples[next]?.includes(data.test) ? data.test : 'demo';
		goto(`/explore/${next}/${sample}`);
	}

	function handle_sample(next: string) {
		if (next === data.test) return;
		goto(`/explore/${data.lang}/${next}`);
	}
</script>

<ExploreLab
	path={{
		lang: data.lang,
		on_lang_change: handle_lang,
		sample: data.test,
		samples: data.css_files.map(([file]) => file),
		on_sample_change: handle_sample
	}}
	edit={{ href: edit_href }}
	{source}
/>
