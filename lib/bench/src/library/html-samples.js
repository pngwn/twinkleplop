// HTML samples of varying complexity for benchmarking.
//
// Each sample escalates in structural complexity:
//   - tiny_html: a single tag
//   - small_html: a basic nav/content block (~10 lines)
//   - medium_html: a realistic article layout (~50 lines)
//   - large_html: a full page with header/nav/main/sections/footer (~150 lines)
//
// `embedded_html` (the full document with substantial <script> and <style>
// blocks) lives in `reclassifier-samples.js` and is reserved for the
// reclassifier-overhead suite, where the multi-language composition cost
// matters. For the library comparison we measure *base HTML structure*
// tokenization.

export const tiny_html = `<p class="hi">Hello, world</p>`;

export const small_html = `<nav class="main-nav" aria-label="Primary">
	<ul>
		<li><a href="/">Home</a></li>
		<li><a href="/docs">Docs</a></li>
		<li><a href="/blog">Blog</a></li>
		<li><a href="/about">About</a></li>
	</ul>
</nav>`;

export const medium_html = `<article class="post">
	<header class="post__header">
		<h1 class="post__title">Understanding grammar injections</h1>
		<p class="post__meta">
			By <a href="/authors/peter" class="post__author">Peter Allen</a>
			on <time datetime="2025-03-14">March 14, 2025</time>
		</p>
		<ul class="post__tags">
			<li><a href="/tags/grammars">grammars</a></li>
			<li><a href="/tags/tokenizers">tokenizers</a></li>
			<li><a href="/tags/performance">performance</a></li>
		</ul>
	</header>
	<section class="post__intro">
		<p>
			When a host language needs to embed content from another language,
			the question is where the <em>decision</em> lives. In twinkleplop,
			that decision lives in the host grammar — the reclassifier only
			<strong>executes</strong> the embedding.
		</p>
	</section>
	<section class="post__body">
		<h2 id="the-pattern">The pattern</h2>
		<p>Every embedding case reduces to the same three things:</p>
		<ol>
			<li>A host token marks the embed point.</li>
			<li>The reclassifier calls a sub-language function.</li>
			<li>The result is spliced back at the right positions.</li>
		</ol>
		<figure class="post__figure">
			<img src="/assets/diagram.svg" alt="Pipeline diagram" loading="lazy" />
			<figcaption>The generic embedding pipeline</figcaption>
		</figure>
	</section>
	<footer class="post__footer">
		<a href="/blog" class="post__back" rel="up">&larr; Back to all posts</a>
	</footer>
</article>`;

// ---------------------------------------------------------------------------
// large_embedded_html — a full page with substantial <style> and <script>
// ---------------------------------------------------------------------------
//
// This is the "realistic real-world page" sample for measuring cross-language
// tokenization. It has:
//   - ~80 lines of inline CSS (selectors, properties, media queries, vars)
//   - ~80 lines of inline JS (classes, arrow fns, async, template literals)
//   - ~80 lines of HTML structure around them
//
// Every comparison library handles embedded sub-languages to some degree:
//   - Twinkleplop:  embed_grammars → full CSS and JS pipelines via reclassifier
//   - Prism:        markup language re-tokenizes <script>/<style> internals
//   - Shiki:        TextMate HTML grammar embeds source.js / source.css
//   - Starry Night: TextMate grammar embeds via injection rules
//   - highlight.js: xml language does NOT sub-tokenize script/style by default
//
// So the four libraries produce DIFFERENT fidelity outputs on this sample,
// but the benchmark number is still a fair "what does `highlight this HTML`
// cost me end-to-end" comparison.

export const large_embedded_html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Dashboard &middot; Example</title>
	<style>
		:root {
			--primary: #0070f3;
			--primary-dark: #0056c1;
			--bg: #0a0a0a;
			--bg-card: #111;
			--fg: #ededed;
			--fg-muted: #8a8a8a;
			--border: #2a2a2a;
			--radius: 8px;
			--space-1: 0.25rem;
			--space-2: 0.5rem;
			--space-3: 1rem;
			--space-4: 1.5rem;
			--space-5: 2rem;
		}

		* { box-sizing: border-box; }

		html, body {
			margin: 0;
			padding: 0;
			background: var(--bg);
			color: var(--fg);
			font-family: system-ui, -apple-system, sans-serif;
			font-size: 14px;
			line-height: 1.5;
		}

		.layout {
			display: grid;
			grid-template-columns: 240px 1fr;
			grid-template-rows: 60px 1fr;
			grid-template-areas: "header header" "sidebar main";
			min-height: 100vh;
		}

		.header {
			grid-area: header;
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0 var(--space-4);
			background: var(--bg-card);
			border-bottom: 1px solid var(--border);
		}

		.sidebar {
			grid-area: sidebar;
			background: var(--bg-card);
			border-right: 1px solid var(--border);
			padding: var(--space-3);
			overflow-y: auto;
		}

		.sidebar__link {
			display: block;
			padding: var(--space-2) var(--space-3);
			color: var(--fg-muted);
			text-decoration: none;
			border-radius: 4px;
			transition: all 0.15s ease;
		}

		.sidebar__link:hover,
		.sidebar__link--active {
			color: var(--fg);
			background: rgba(255, 255, 255, 0.05);
		}

		.main { grid-area: main; padding: var(--space-5); overflow-y: auto; }

		.card-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
			gap: var(--space-4);
		}

		.card {
			background: var(--bg-card);
			border: 1px solid var(--border);
			border-radius: var(--radius);
			padding: var(--space-4);
		}

		.card__title {
			margin: 0 0 var(--space-2);
			font-size: 1rem;
			color: var(--fg);
		}

		.card__value {
			font-size: 2rem;
			font-weight: 600;
			color: var(--primary);
			margin: 0;
		}

		.card__delta { font-size: 0.875rem; color: var(--fg-muted); }
		.card__delta--positive { color: #10b981; }
		.card__delta--negative { color: #ef4444; }

		.btn {
			display: inline-block;
			padding: var(--space-2) var(--space-3);
			background: var(--primary);
			color: white;
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 0.875rem;
			transition: background 0.15s ease;
		}

		.btn:hover { background: var(--primary-dark); }

		@media (max-width: 768px) {
			.layout {
				grid-template-columns: 1fr;
				grid-template-areas: "header" "main";
			}
			.sidebar { display: none; }
			.card-grid { grid-template-columns: 1fr; }
		}

		@keyframes pulse {
			0%, 100% { opacity: 1; }
			50%      { opacity: 0.5; }
		}

		.loading { animation: pulse 1.5s ease-in-out infinite; }
	</style>
</head>
<body>
	<div class="layout">
		<header class="header" role="banner">
			<a href="/" class="brand">
				<img src="/logo.svg" alt="Logo" width="32" height="32" />
				<span>Dashboard</span>
			</a>
			<nav class="header__nav" aria-label="User">
				<button type="button" class="btn" id="refresh-btn">Refresh</button>
				<img src="/avatar.jpg" alt="User avatar" class="header__avatar" width="32" height="32" />
			</nav>
		</header>

		<aside class="sidebar" role="navigation" aria-label="Main">
			<nav>
				<a href="/dashboard" class="sidebar__link sidebar__link--active" aria-current="page">Overview</a>
				<a href="/users"      class="sidebar__link">Users</a>
				<a href="/billing"    class="sidebar__link">Billing</a>
				<a href="/settings"   class="sidebar__link">Settings</a>
				<a href="/logs"       class="sidebar__link">Logs</a>
				<a href="/support"    class="sidebar__link">Support</a>
			</nav>
		</aside>

		<main class="main" id="main">
			<h1>Overview</h1>
			<p>Real-time metrics for your account.</p>

			<section class="card-grid" aria-label="Key metrics">
				<article class="card">
					<h2 class="card__title">Active users</h2>
					<p class="card__value" id="metric-users">&mdash;</p>
					<p class="card__delta card__delta--positive">+12% vs last week</p>
				</article>
				<article class="card">
					<h2 class="card__title">Revenue</h2>
					<p class="card__value" id="metric-revenue">&mdash;</p>
					<p class="card__delta card__delta--positive">+3.4% vs last week</p>
				</article>
				<article class="card">
					<h2 class="card__title">Errors</h2>
					<p class="card__value" id="metric-errors">&mdash;</p>
					<p class="card__delta card__delta--negative">-8% vs last week</p>
				</article>
				<article class="card">
					<h2 class="card__title">Latency (p99)</h2>
					<p class="card__value" id="metric-latency">&mdash;</p>
					<p class="card__delta">~ same as last week</p>
				</article>
			</section>
		</main>
	</div>

	<script>
		// Simple dashboard wiring: fetch metrics, render them, handle refresh.
		const METRIC_IDS = ["users", "revenue", "errors", "latency"];

		class MetricStore {
			constructor() {
				this.values = new Map();
				this.listeners = new Set();
			}

			set(key, value) {
				this.values.set(key, value);
				this.notify(key, value);
			}

			get(key) {
				return this.values.get(key);
			}

			subscribe(fn) {
				this.listeners.add(fn);
				return () => this.listeners.delete(fn);
			}

			notify(key, value) {
				for (const fn of this.listeners) {
					fn(key, value);
				}
			}
		}

		const store = new MetricStore();

		const formatters = {
			users:    (n) => n.toLocaleString("en-US"),
			revenue:  (n) => \`$\${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}\`,
			errors:   (n) => n.toString(),
			latency:  (n) => \`\${n} ms\`,
		};

		function renderMetric(key, value) {
			const el = document.getElementById(\`metric-\${key}\`);
			if (!el) return;
			const format = formatters[key] || ((x) => String(x));
			el.textContent = format(value);
			el.classList.remove("loading");
		}

		async function fetchMetrics() {
			const res = await fetch("/api/metrics", {
				method: "GET",
				headers: { "Content-Type": "application/json" },
			});
			if (!res.ok) {
				throw new Error(\`Failed to fetch metrics: \${res.status}\`);
			}
			return res.json();
		}

		async function refresh() {
			for (const id of METRIC_IDS) {
				const el = document.getElementById(\`metric-\${id}\`);
				if (el) el.classList.add("loading");
			}
			try {
				const data = await fetchMetrics();
				for (const key of Object.keys(data)) {
					store.set(key, data[key]);
				}
			} catch (err) {
				console.error("Refresh failed:", err);
			}
		}

		store.subscribe((key, value) => renderMetric(key, value));

		document.getElementById("refresh-btn").addEventListener("click", refresh);

		// Initial load + periodic refresh
		refresh();
		setInterval(refresh, 30_000);
	</script>
</body>
</html>`;

export const large_html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="description" content="A comprehensive example page" />
	<title>Documentation &middot; Example</title>
	<link rel="stylesheet" href="/assets/styles.css" />
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<link rel="canonical" href="https://example.com/docs" />
</head>
<body class="theme--dark">
	<a href="#main" class="skip-link">Skip to content</a>
	<header class="site-header" role="banner">
		<div class="site-header__brand">
			<a href="/" class="brand-link">
				<img src="/logo.svg" alt="Example Logo" width="120" height="32" />
			</a>
		</div>
		<nav class="site-nav" aria-label="Primary">
			<ul class="site-nav__list">
				<li><a href="/" class="site-nav__link">Home</a></li>
				<li><a href="/docs" class="site-nav__link site-nav__link--active" aria-current="page">Docs</a></li>
				<li><a href="/examples" class="site-nav__link">Examples</a></li>
				<li><a href="/blog" class="site-nav__link">Blog</a></li>
				<li><a href="/about" class="site-nav__link">About</a></li>
			</ul>
		</nav>
		<form class="site-search" role="search" action="/search" method="get">
			<label class="visually-hidden" for="q">Search the docs</label>
			<input id="q" name="q" type="search" placeholder="Search&hellip;" />
			<button type="submit" aria-label="Submit search">
				<svg width="16" height="16" aria-hidden="true"><use href="#icon-search" /></svg>
			</button>
		</form>
	</header>
	<main id="main" class="site-main" role="main">
		<aside class="sidebar" aria-label="Documentation navigation">
			<h2 class="sidebar__heading">Getting started</h2>
			<ul class="sidebar__list">
				<li><a href="/docs/install">Installation</a></li>
				<li><a href="/docs/quickstart">Quick start</a></li>
				<li><a href="/docs/concepts">Core concepts</a></li>
			</ul>
			<h2 class="sidebar__heading">Guides</h2>
			<ul class="sidebar__list">
				<li><a href="/docs/guides/grammars">Writing a grammar</a></li>
				<li><a href="/docs/guides/tokens">Token streams</a></li>
				<li><a href="/docs/guides/embedding">Embedded languages</a></li>
				<li><a href="/docs/guides/reclassifier">Reclassifier rules</a></li>
			</ul>
			<h2 class="sidebar__heading">Reference</h2>
			<ul class="sidebar__list">
				<li><a href="/docs/api/tokenize">tokenize()</a></li>
				<li><a href="/docs/api/reclassify">reclassify()</a></li>
				<li><a href="/docs/api/createLanguage">createLanguage()</a></li>
			</ul>
		</aside>
		<article class="content">
			<header class="content__header">
				<p class="breadcrumbs" aria-label="Breadcrumb">
					<a href="/">Home</a> &rsaquo;
					<a href="/docs">Docs</a> &rsaquo;
					<span aria-current="page">Embedded languages</span>
				</p>
				<h1 class="content__title">Embedded languages</h1>
				<p class="content__lead">
					Host grammars can hand off content to sub-languages via the
					reclassifier's generic <code>embedInterleaved</code> primitive.
				</p>
			</header>
			<section class="content__section">
				<h2>Overview</h2>
				<p>
					Every embedding case has the same shape: the host grammar
					marks <strong>where</strong> the embedding happens, and the
					reclassifier takes care of <strong>how</strong>. The
					host-specific code is just a scanner callback; the generic
					machinery does virtual-source construction, sub-tokenization,
					position remapping, and splicing.
				</p>
				<figure>
					<img src="/assets/pipeline.png" alt="Pipeline diagram showing host → reclassifier → sub-language" />
					<figcaption>The end-to-end pipeline for a tagged template literal.</figcaption>
				</figure>
			</section>
			<section class="content__section">
				<h2>Supported host languages</h2>
				<table class="content__table">
					<thead>
						<tr>
							<th scope="col">Language</th>
							<th scope="col">Embedded contexts</th>
							<th scope="col">Status</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>HTML</td>
							<td>&lt;script&gt;, &lt;style&gt;</td>
							<td><span class="badge badge--stable">stable</span></td>
						</tr>
						<tr>
							<td>JavaScript</td>
							<td>html&#96;&hellip;&#96;, css&#96;&hellip;&#96;</td>
							<td><span class="badge badge--stable">stable</span></td>
						</tr>
						<tr>
							<td>Markdown</td>
							<td>Code fences</td>
							<td><span class="badge badge--planned">planned</span></td>
						</tr>
					</tbody>
				</table>
			</section>
		</article>
	</main>
	<footer class="site-footer" role="contentinfo">
		<div class="site-footer__inner">
			<p>&copy; 2025 Example Inc. All rights reserved.</p>
			<nav aria-label="Legal">
				<ul class="site-footer__legal">
					<li><a href="/privacy">Privacy</a></li>
					<li><a href="/terms">Terms</a></li>
					<li><a href="/cookies">Cookies</a></li>
				</ul>
			</nav>
		</div>
	</footer>
</body>
</html>`;
