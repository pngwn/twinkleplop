<script lang="ts">
	import Keycap from './Keycap.svelte';
	import { FLAT } from '../nav';
	import { chrome, close_palette, set_tweak } from '../chrome.svelte';
	import { set_mode } from '$lib/theme_mode.svelte';

	let query = $state('');
	let input_el: HTMLInputElement | undefined = $state();
	let active_index = $state(0);

	type palette_cmd = {
		id: string;
		title: string;
		crumb: string;
		icon: string;
		href?: string;
		action?: () => void;
	};

	const COMMANDS: palette_cmd[] = [
		{
			id: 'cmd:mode:system',
			title: 'Switch mode → system',
			crumb: 'cmd / mode',
			icon: '⎈',
			action: () => set_mode('system')
		},
		{
			id: 'cmd:mode:light',
			title: 'Switch mode → light',
			crumb: 'cmd / mode',
			icon: '⎈',
			action: () => set_mode('light')
		},
		{
			id: 'cmd:mode:dark',
			title: 'Switch mode → dark',
			crumb: 'cmd / mode',
			icon: '⎈',
			action: () => set_mode('dark')
		},
		{
			id: 'cmd:crt:toggle',
			title: 'Toggle CRT scanlines',
			crumb: 'cmd / crt',
			icon: '⎈',
			action: () => set_tweak('crt', chrome.tweaks.crt === 'on' ? 'off' : 'on')
		},
		{
			id: 'cmd:lab',
			title: 'Open lab (playground)',
			crumb: 'cmd / open',
			icon: '↗',
			href: '/explore'
		}
	];

	function score_match(text: string, crumb: string, q: string): number {
		if (!q) return 1;
		const t = text.toLowerCase();
		const c = crumb.toLowerCase();
		if (t.includes(q)) return 3;
		if (c.includes(q)) return 2;
		let i = 0;
		for (const ch of q) {
			i = t.indexOf(ch, i);
			if (i < 0) return 0;
			i++;
		}
		return 1;
	}

	function escape_html(s: string): string {
		return s.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m] ?? m);
	}

	function highlight_match(s: string, q: string): string {
		if (!q) return escape_html(s);
		const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
		return escape_html(s).replace(re, '<span class="accent">$1</span>');
	}

	const query_lower = $derived(query.trim().toLowerCase());

	const pages = $derived.by(() => {
		const q = query_lower;
		let items = FLAT.map((it) => ({ ...it, score: score_match(it.title, it.crumb, q) }));
		if (q) items = items.filter((it) => it.score > 0).sort((a, b) => b.score - a.score);
		return items.slice(0, 10);
	});

	const cmds = $derived.by(() => {
		const q = query_lower;
		let items = COMMANDS.map((c) => ({ ...c, score: score_match(c.title, c.crumb, q) }));
		if (q) items = items.filter((c) => c.score > 0).sort((a, b) => b.score - a.score);
		return items;
	});

	const has_results = $derived(pages.length + cmds.length > 0);
	const total_rows = $derived(pages.length + cmds.length);

	$effect(() => {
		query;
		active_index = 0;
	});

	$effect(() => {
		if (chrome.palette_open && input_el) {
			query = '';
			setTimeout(() => input_el?.focus(), 10);
		}
	});

	function activate_row() {
		const rows = [...pages, ...cmds];
		const row = rows[active_index];
		if (!row) return;
		if ('path' in row && row.path) {
			close_palette();
			window.location.href = row.path;
			return;
		}
		if ('action' in row && row.action) {
			row.action();
			close_palette();
			return;
		}
		if ('href' in row && row.href) {
			close_palette();
			window.location.href = row.href;
		}
	}

	export function handle_keydown(e: KeyboardEvent) {
		if (!chrome.palette_open) return;
		if (e.key === 'Escape') {
			close_palette();
			e.preventDefault();
		}
		if (e.key === 'ArrowDown') {
			active_index = (active_index + 1) % Math.max(1, total_rows);
			e.preventDefault();
		}
		if (e.key === 'ArrowUp') {
			active_index = (active_index - 1 + total_rows) % Math.max(1, total_rows);
			e.preventDefault();
		}
		if (e.key === 'Enter') {
			activate_row();
			e.preventDefault();
		}
	}

	function backdrop_click(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('backdrop')) close_palette();
	}
</script>

<svelte:window onkeydown={handle_keydown} />

<div
	class="backdrop"
	class:open={chrome.palette_open}
	role="dialog"
	aria-label="Command palette"
	onclick={backdrop_click}
>
	<div class="palette">
		<div class="input-row">
			<span class="prompt">$</span>
			<input
				bind:this={input_el}
				type="text"
				autocomplete="off"
				spellcheck="false"
				placeholder="type to search pages, themes, commands…"
				bind:value={query}
			/>
			<button class="esc" onclick={close_palette}><Keycap>esc</Keycap></button>
		</div>
		<div class="results">
			{#if !has_results}
				<div class="empty">
					no matches for &ldquo;<span class="yellow">{query}</span>&rdquo;
					<br />
					<span class="ghost">try: themes, install, hast, plop</span>
				</div>
			{:else}
				{#if pages.length}
					<div class="group">pages — {pages.length}</div>
					{#each pages as item, i}
						<a
							class="row"
							class:active={i === active_index}
							href={item.path}
							onclick={close_palette}
							onmouseenter={() => (active_index = i)}
						>
							<span class="ico">{item.icon}</span>
							<span>{@html highlight_match(item.title, query_lower)}</span>
							<span class="crumbs">{item.crumb}</span>
						</a>
					{/each}
				{/if}
				{#if cmds.length}
					<div class="group">commands</div>
					{#each cmds as cmd, i}
						{@const idx = pages.length + i}
						<button
							class="row"
							class:active={idx === active_index}
							onclick={() => {
								if (cmd.action) {
									cmd.action();
									close_palette();
								} else if (cmd.href) {
									close_palette();
									window.location.href = cmd.href;
								}
							}}
							onmouseenter={() => (active_index = idx)}
						>
							<span class="ico">{cmd.icon}</span>
							<span>{@html highlight_match(cmd.title, query_lower)}</span>
							<span class="crumbs">{cmd.crumb}</span>
						</button>
					{/each}
				{/if}
			{/if}
		</div>
		<div class="foot">
			<span class="h"><Keycap>↑</Keycap><Keycap>↓</Keycap> nav</span>
			<span class="h"><Keycap>↵</Keycap> open</span>
			<span class="h"><Keycap>esc</Keycap> close</span>
			<span class="h live">● all systems twinkling</span>
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(2px);
		z-index: 300;
		display: none;
		align-items: flex-start;
		justify-content: center;
		padding-top: 12vh;
	}
	.backdrop.open {
		display: flex;
	}
	.palette {
		width: min(640px, 92vw);
		background: var(--docs-bg-1);
		border: 1px solid var(--docs-line);
		border-radius: 3px;
		box-shadow:
			0 20px 60px rgba(0, 0, 0, 0.6),
			0 0 0 1px var(--docs-bg);
		overflow: hidden;
	}
	.input-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--docs-line);
	}
	.prompt {
		color: var(--docs-accent);
		font-family: var(--docs-mono);
	}
	input {
		flex: 1;
		background: transparent;
		border: 0;
		outline: 0;
		color: var(--docs-fg);
		font-family: var(--docs-mono);
		font-size: 14px;
		caret-color: var(--docs-accent);
	}
	.esc {
		background: transparent;
		border: 0;
		padding: 0;
		cursor: pointer;
	}
	.results {
		max-height: 55vh;
		overflow: auto;
		padding: 6px;
	}
	.group {
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg-mute);
		letter-spacing: 0.6px;
		text-transform: uppercase;
		padding: 10px 12px 4px;
	}
	.row {
		display: grid;
		grid-template-columns: 20px 1fr auto;
		gap: 10px;
		align-items: center;
		padding: 8px 12px;
		font-size: 13px;
		color: var(--docs-fg-dim);
		cursor: pointer;
		border-radius: 2px;
		text-decoration: none;
		background: transparent;
		border: 0;
		width: 100%;
		text-align: left;
		font-family: inherit;
	}
	.row .ico {
		color: var(--docs-fg-mute);
	}
	.row .crumbs {
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-xs);
	}
	.row.active,
	.row:hover {
		background: color-mix(in oklch, var(--docs-accent) 12%, transparent);
		color: var(--docs-fg);
	}
	.row.active .ico {
		color: var(--docs-accent);
	}
	.row :global(.accent) {
		color: var(--docs-accent);
	}
	.empty {
		padding: 30px;
		text-align: center;
		color: var(--docs-fg-mute);
		font-size: var(--docs-fs-sm);
	}
	.empty .yellow {
		color: var(--t-yellow);
	}
	.empty .ghost {
		color: var(--docs-fg-ghost);
	}
	.foot {
		display: flex;
		gap: 16px;
		padding: 8px 14px;
		border-top: 1px solid var(--docs-line);
		background: var(--docs-bg-2);
		font-size: var(--docs-fs-xs);
		color: var(--docs-fg-mute);
	}
	.foot .h {
		display: inline-flex;
		gap: 6px;
		align-items: center;
	}
	.foot .live {
		margin-left: auto;
		color: var(--docs-accent);
	}

	@media (max-width: 760px) {
		.backdrop {
			padding-top: 6vh;
		}
		.palette {
			width: 94vw;
		}
	}
</style>
