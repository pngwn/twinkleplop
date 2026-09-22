<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { page } from '$app/state';

	import TopBar from '$lib/components/explore/TopBar.svelte';
	import SourceEditor from '$lib/components/explore/SourceEditor.svelte';
	import ExploreLab from '$lib/components/explore/ExploreLab.svelte';
	import { fidelity_by_lang, view } from '$lib/explore/lab_state.svelte';
	import { decode_share, encode_share, type share_state } from '$lib/explore/share';
	import { THEME_NAMES, type theme_name } from '$lib/explore/themes';

	let lang = $state('javascript');
	let source = $state('');
	// nothing is written back to the url until its hash has been read
	let ready = $state(false);
	let unreadable = $state(false);
	let textarea = $state<HTMLTextAreaElement>();

	// the hash the url holds for the current state
	let written = '';
	// bumped by every load and write, so a slow encode cannot land over a
	// newer one
	let seq = 0;

	function current(): share_state {
		return {
			lang,
			source,
			theme: view.theme,
			fidelity: fidelity_by_lang[lang]?.slice() ?? null
		};
	}

	async function load(hash: string) {
		const token = ++seq;
		ready = false;
		const shared = hash.length > 1 ? await decode_share(hash) : null;
		if (token !== seq) return;
		unreadable = hash.length > 1 && !shared;
		if (shared) {
			lang = shared.lang;
			source = shared.source;
			if (THEME_NAMES.includes(shared.theme as theme_name)) view.theme = shared.theme as theme_name;
			fidelity_by_lang[shared.lang] = shared.fidelity;
		}
		// the url stays as it is until something changes, another browser may
		// compress the same state differently and a broken link is worth keeping
		written = await encode_share(current());
		if (token !== seq) return;
		ready = true;
	}

	/** puts `state` in the url and returns the link for it */
	async function write(state: share_state): Promise<string> {
		const token = ++seq;
		const hash = await encode_share(state);
		const url = new URL(location.href);
		url.hash = hash;
		if (token === seq && hash !== written) {
			written = hash;
			replaceState(url, page.state);
		}
		return url.href;
	}

	onMount(() => {
		// not page.url, replaceState leaves it at the hash the page opened with
		load(location.hash);
		// pasting another link over this one changes only the hash, which does
		// not reload the page
		const on_hashchange = () => load(location.hash);
		addEventListener('hashchange', on_hashchange);
		return () => removeEventListener('hashchange', on_hashchange);
	});

	// arriving from a sample means the next thing is typing
	afterNavigate(({ from }) => {
		if (from) textarea?.focus();
	});

	// debounced so typing does not encode on every key
	$effect(() => {
		if (!ready) return;
		const state = current();
		const timer = setTimeout(() => write(state), 250);
		return () => clearTimeout(timer);
	});

	let copy_status = $state<'idle' | 'copied' | 'failed'>('idle');
	let copy_timer: ReturnType<typeof setTimeout> | undefined;

	async function copy_link() {
		const link = write(current());
		try {
			// safari only allows a clipboard write inside the click, so hand it
			// the pending link instead of awaiting it first
			if (typeof ClipboardItem === 'undefined') {
				await navigator.clipboard.writeText(await link);
			} else {
				const blob = link.then((href) => new Blob([href], { type: 'text/plain' }));
				await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
			}
			copy_status = 'copied';
		} catch {
			copy_status = 'failed';
		}
		clearTimeout(copy_timer);
		copy_timer = setTimeout(() => (copy_status = 'idle'), 1600);
	}
</script>

<div class="explore-app explore-app--edit">
	<TopBar {lang} on_lang_change={(next) => (lang = next)}>
		{#snippet actions()}
			<button class="toggle" type="button" disabled={!ready} onclick={copy_link}>
				<span aria-live="polite">
					{copy_status === 'copied'
						? 'link copied'
						: copy_status === 'failed'
							? 'copy failed'
							: 'copy link'}
				</span>
			</button>
		{/snippet}
	</TopBar>

	<SourceEditor
		bind:value={source}
		bind:textarea
		error={unreadable ? "this link's snippet could not be read" : null}
	/>

	<ExploreLab {lang} {source} />
</div>
