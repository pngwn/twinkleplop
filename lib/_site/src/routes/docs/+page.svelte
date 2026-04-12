<script>
	// Documentation page with rainbow theme
</script>

<div class="docs-container">
	<div class="docs-hero">
		<h1 class="pixel-brand" data-text="DOCUMENTATION">DOCUMENTATION</h1>
		<p class="docs-intro">
			Minimal. Fast. Retro.
		</p>
	</div>

	<section class="docs-section">
		<div class="pixel-card">
			<h2>GETTING STARTED</h2>
			<p>Fast syntax highlighting for modern development</p>
			<div class="feature-grid">
				<div class="pixel-feature">
					<h3>FAST</h3>
					<p>8-15x faster</p>
				</div>
				<div class="pixel-feature">
					<h3>CLEAN</h3>
					<p>Minimal design</p>
				</div>
				<div class="pixel-feature">
					<h3>SIMPLE</h3>
					<p>Easy to use</p>
				</div>
			</div>
		</div>
	</section>

	<section class="docs-section">
		<div class="pixel-card">
			<h2>INSTALLATION</h2>
			<div class="code-example">
				<pre><code>npm install twinkleplop</code></pre>
				<div class="rainbow-border"></div>
			</div>
		</div>
	</section>

	<section class="docs-section">
		<div class="pixel-card">
			<h2>USAGE</h2>
			<div class="code-example">
				<pre><code
						>import tokenize from 'twinkleplop';

const tokens = tokenize(yourCode, 'javascript');
// Fast. Clean. Simple.</code
					></pre>
				<div class="rainbow-border"></div>
			</div>
		</div>
	</section>

	<section class="docs-section">
		<div class="pixel-card">
			<h2>FEATURES</h2>
			<ul class="pixel-list">
				<li>» Character scanning (8-15x faster)</li>
				<li>» 50+ language support</li>
				<li>» Zero dependencies</li>
				<li>» TypeScript ready</li>
				<li>» Minimal footprint</li>
				<li>» Clean API</li>
			</ul>
		</div>
	</section>

</div>

<style>
	.docs-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	.docs-hero {
		text-align: center;
		margin-bottom: 3rem;
		border-bottom: 2px solid var(--border);
		padding-bottom: 2rem;
	}

	.docs-hero h1 {
		margin-bottom: 1rem;
	}

	.rainbow-text {
		background: linear-gradient(
			135deg,
			#ff6b6b,
			#feca57,
			#48dbfb,
			#ff9ff3,
			#54a0ff,
			#5f27cd,
			#00d2d3,
			#ff6b6b
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		background-size: 200% 200%;
		animation: rainbow-wave 3s ease infinite;
	}

	.docs-intro {
		font-family: 'VT323', monospace;
		font-size: 1.5rem;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 2px;
	}

	.magical-gradient {
		background: linear-gradient(90deg, #ff6ec7, #ffb347, #6ec7ff);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		background-size: 200% auto;
		animation: gradient-slide 3s ease infinite;
	}

	.docs-section {
		margin-bottom: 2rem;
	}

	.pixel-card {
		background: var(--bg-primary);
		border: 2px solid var(--border);
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.1);
	}

	.pixel-card:hover {
		transform: translate(-2px, -2px);
		box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.1);
	}

	.pixel-card h2 {
		font-family: 'Silkscreen', monospace;
		font-size: 1.25rem;
		margin-bottom: 1rem;
		color: var(--text-primary);
		letter-spacing: 1px;
	}

	.sparkle-card {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 245, 251, 0.9));
		border-radius: 20px;
		padding: 2rem;
		position: relative;
		overflow: hidden;
		border: 2px solid transparent;
		background-clip: padding-box;
		box-shadow: 0 10px 40px rgba(255, 110, 199, 0.1);
		transition: all 0.3s ease;
	}

	.sparkle-card::before {
		content: '';
		position: absolute;
		top: -2px;
		left: -2px;
		right: -2px;
		bottom: -2px;
		background: linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3);
		border-radius: inherit;
		z-index: -1;
		opacity: 0.3;
		background-size: 400% 400%;
		animation: rainbow-wave 5s ease infinite;
	}

	.sparkle-card:hover {
		transform: translateY(-5px);
		box-shadow: 0 15px 50px rgba(255, 110, 199, 0.2);
	}

	.sparkle-card h2 {
		margin-bottom: 1.5rem;
		font-size: 2rem;
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.pixel-feature {
		text-align: center;
		padding: 1rem;
		border: 2px solid var(--border);
		background: var(--bg-secondary);
	}

	.pixel-feature:nth-child(1) { border-color: #ff6b6b; }
	.pixel-feature:nth-child(2) { border-color: #6bffb8; }
	.pixel-feature:nth-child(3) { border-color: #6bebff; }

	.pixel-feature h3 {
		font-family: 'Silkscreen', monospace;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
		color: var(--text-primary);
	}

	.pixel-feature p {
		font-family: 'VT323', monospace;
		font-size: 1.125rem;
		color: var(--text-secondary);
	}


	.code-example {
		position: relative;
		margin-top: 1rem;
	}

	.code-example pre {
		background: var(--bg-code);
		border: var(--border-width) solid var(--border);
		padding: 1rem;
		overflow-x: auto;
		box-shadow: var(--shadow-sm);
	}

	.code-example code {
		color: var(--text-primary);
		font-family: var(--font-retro);
		font-size: 1.25rem;
	}

	.rainbow-border {
		height: 2px;
		background: linear-gradient(90deg, 
			#ff6b6b, #ffb86b, #ffeb6b, #6bffb8, 
			#6bebff, #6b8eff, #b86bff, #ff6beb);
		margin-top: -2px;
	}

	.pixel-list {
		list-style: none;
		padding: 0;
		font-family: var(--font-retro);
		font-size: 1.25rem;
	}

	.pixel-list li {
		padding: 0.75rem 1rem;
		margin-bottom: 0.5rem;
		border-left: 4px solid var(--pixel-purple);
		background: var(--bg-tertiary);
		color: var(--text-primary);
		transition: transform 0.1s;
	}

	.pixel-list li:hover {
		transform: translateX(4px);
		border-left-color: var(--pixel-pink);
	}


</style>
