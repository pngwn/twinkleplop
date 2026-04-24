export const small_css = `
.container {
	display: flex;
	margin: 0 auto;
	padding: 20px;
}

#header {
	background: linear-gradient(45deg, #333, #666);
	color: white;
}
`.trim();

export const medium_css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');

:root {
	--primary-color: #007bff;
	--secondary-color: #6c757d;
	--spacing-unit: 8px;
	--border-radius: 4px;
}

* {
	box-sizing: border-box;
	margin: 0;
	padding: 0;
}

body {
	font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
	line-height: 1.6;
	color: #333;
	background-color: #f8f9fa;
}

.container {
	max-width: 1200px;
	margin: 0 auto;
	padding: calc(var(--spacing-unit) * 2);
}

.btn {
	display: inline-block;
	padding: 12px 24px;
	background: var(--primary-color);
	color: white;
	border: none;
	border-radius: var(--border-radius);
	cursor: pointer;
	transition: all 0.3s ease;
}

.btn:hover {
	background: var(--primary-color);
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
	.container {
		padding: var(--spacing-unit);
	}
	
	.btn {
		width: 100%;
		padding: 16px;
	}
}
`.trim();

export const large_css = `
@charset "UTF-8";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* CSS Variables and Custom Properties */
:root {
	--primary: #007bff;
	--primary-dark: #0056b3;
	--secondary: #6c757d;
	--success: #28a745;
	--danger: #dc3545;
	--warning: #ffc107;
	--info: #17a2b8;
	--light: #f8f9fa;
	--dark: #343a40;
	
	--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	--font-mono: 'SF Mono', Monaco, 'Cascadia Code', monospace;
	
	--spacing-xs: 4px;
	--spacing-sm: 8px;
	--spacing-md: 16px;
	--spacing-lg: 32px;
	--spacing-xl: 64px;
	
	--radius-sm: 4px;
	--radius-md: 8px;
	--radius-lg: 16px;
	--radius-full: 9999px;
	
	--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);
	--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
	--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
	--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
	
	--transition-fast: 150ms ease;
	--transition-base: 250ms ease;
	--transition-slow: 350ms ease;
}

/* Reset and Base Styles */
*,
*::before,
*::after {
	box-sizing: border-box;
	margin: 0;
	padding: 0;
}

html {
	font-size: 16px;
	-webkit-text-size-adjust: 100%;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

body {
	font-family: var(--font-sans);
	font-size: 1rem;
	line-height: 1.6;
	color: var(--dark);
	background-color: var(--light);
	min-height: 100vh;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
	font-weight: 600;
	line-height: 1.2;
	margin-bottom: 0.5em;
}

h1 { font-size: 2.5rem; }
h2 { font-size: 2rem; }
h3 { font-size: 1.75rem; }
h4 { font-size: 1.5rem; }
h5 { font-size: 1.25rem; }
h6 { font-size: 1rem; }

p {
	margin-bottom: 1rem;
}

a {
	color: var(--primary);
	text-decoration: none;
	transition: color var(--transition-fast);
}

a:hover {
	color: var(--primary-dark);
	text-decoration: underline;
}

/* Layout Components */
.container {
	width: 100%;
	max-width: 1200px;
	margin: 0 auto;
	padding: 0 var(--spacing-md);
}

.container-fluid {
	width: 100%;
	padding: 0 var(--spacing-md);
}

.row {
	display: flex;
	flex-wrap: wrap;
	margin: 0 calc(-1 * var(--spacing-md));
}

.col {
	flex: 1;
	padding: 0 var(--spacing-md);
}

[class*="col-"] {
	padding: 0 var(--spacing-md);
}

.col-1 { flex: 0 0 8.333333%; }
.col-2 { flex: 0 0 16.666667%; }
.col-3 { flex: 0 0 25%; }
.col-4 { flex: 0 0 33.333333%; }
.col-5 { flex: 0 0 41.666667%; }
.col-6 { flex: 0 0 50%; }
.col-7 { flex: 0 0 58.333333%; }
.col-8 { flex: 0 0 66.666667%; }
.col-9 { flex: 0 0 75%; }
.col-10 { flex: 0 0 83.333333%; }
.col-11 { flex: 0 0 91.666667%; }
.col-12 { flex: 0 0 100%; }

/* Card Component */
.card {
	background: white;
	border-radius: var(--radius-md);
	box-shadow: var(--shadow-md);
	overflow: hidden;
	transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.card:hover {
	transform: translateY(-4px);
	box-shadow: var(--shadow-lg);
}

.card-header {
	padding: var(--spacing-md);
	border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	font-weight: 600;
}

.card-body {
	padding: var(--spacing-md);
}

.card-footer {
	padding: var(--spacing-md);
	border-top: 1px solid rgba(0, 0, 0, 0.1);
	background: rgba(0, 0, 0, 0.02);
}

/* Button Component */
.btn {
	display: inline-block;
	padding: var(--spacing-sm) var(--spacing-md);
	font-family: inherit;
	font-size: 1rem;
	font-weight: 500;
	line-height: 1.5;
	text-align: center;
	text-decoration: none;
	white-space: nowrap;
	vertical-align: middle;
	cursor: pointer;
	user-select: none;
	background-color: var(--primary);
	color: white;
	border: 1px solid transparent;
	border-radius: var(--radius-sm);
	transition: all var(--transition-base);
}

.btn:hover {
	background-color: var(--primary-dark);
	transform: translateY(-2px);
	box-shadow: var(--shadow-md);
}

.btn:active {
	transform: translateY(0);
	box-shadow: var(--shadow-sm);
}

.btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.btn-secondary {
	background-color: var(--secondary);
	color: white;
}

.btn-outline {
	background-color: transparent;
	color: var(--primary);
	border-color: var(--primary);
}

.btn-outline:hover {
	background-color: var(--primary);
	color: white;
}

/* Form Elements */
.form-group {
	margin-bottom: var(--spacing-md);
}

.form-label {
	display: block;
	margin-bottom: var(--spacing-xs);
	font-weight: 500;
}

.form-control {
	display: block;
	width: 100%;
	padding: var(--spacing-sm) var(--spacing-md);
	font-family: inherit;
	font-size: 1rem;
	line-height: 1.5;
	color: var(--dark);
	background-color: white;
	border: 1px solid #ced4da;
	border-radius: var(--radius-sm);
	transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.form-control:focus {
	outline: none;
	border-color: var(--primary);
	box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

/* Animations */
@keyframes fadeIn {
	from { opacity: 0; }
	to { opacity: 1; }
}

@keyframes slideInUp {
	from {
		opacity: 0;
		transform: translateY(20px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes pulse {
	0%, 100% { transform: scale(1); }
	50% { transform: scale(1.05); }
}

.animate-fade-in {
	animation: fadeIn var(--transition-base);
}

.animate-slide-in {
	animation: slideInUp var(--transition-base);
}

.animate-pulse {
	animation: pulse 2s infinite;
}

/* Utility Classes */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.text-primary { color: var(--primary); }
.text-secondary { color: var(--secondary); }
.text-success { color: var(--success); }
.text-danger { color: var(--danger); }
.text-warning { color: var(--warning); }
.text-info { color: var(--info); }

.bg-primary { background-color: var(--primary); }
.bg-secondary { background-color: var(--secondary); }
.bg-success { background-color: var(--success); }
.bg-danger { background-color: var(--danger); }
.bg-warning { background-color: var(--warning); }
.bg-info { background-color: var(--info); }

/* Responsive Design */
@media (max-width: 768px) {
	.container {
		padding: 0 var(--spacing-sm);
	}
	
	.row {
		margin: 0;
	}
	
	[class*="col-"] {
		flex: 0 0 100%;
		padding: 0 var(--spacing-sm);
	}
	
	.btn {
		width: 100%;
		margin-bottom: var(--spacing-sm);
	}
	
	h1 { font-size: 2rem; }
	h2 { font-size: 1.75rem; }
	h3 { font-size: 1.5rem; }
}

@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
		scroll-behavior: auto !important;
	}
}

@media (prefers-color-scheme: dark) {
	:root {
		--light: #1a1a1a;
		--dark: #f0f0f0;
	}
	
	body {
		background-color: #121212;
		color: #e0e0e0;
	}
	
	.card {
		background: #1e1e1e;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
	}
	
	.form-control {
		background-color: #2a2a2a;
		border-color: #3a3a3a;
		color: #e0e0e0;
	}
}
`.trim();

// Generate a very large CSS file (1-2MB)
function generate_very_large_css() {
  const components = [];
  const component_count = 800; // This will generate roughly 1-2MB

  // Add a base framework
  components.push(large_css);

  // Generate many component variations
  for (let i = 0; i < component_count; i++) {
    components.push(`
/* Component ${i} - Auto-generated for benchmark testing */
.component-${i} {
	display: flex;
	flex-direction: column;
	padding: var(--spacing-md);
	margin: var(--spacing-sm) auto;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: var(--radius-lg);
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	position: relative;
	overflow: hidden;
}

.component-${i}::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(255, 255, 255, 0.1);
	transform: translateX(-100%);
	transition: transform 0.6s ease;
}

.component-${i}:hover::before {
	transform: translateX(100%);
}

.component-${i}-header {
	font-size: 1.5rem;
	font-weight: 700;
	color: white;
	margin-bottom: 1rem;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.component-${i}-body {
	flex: 1;
	padding: 1rem;
	background: rgba(255, 255, 255, 0.95);
	border-radius: calc(var(--radius-lg) - 4px);
	color: #333;
}

.component-${i}-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-top: 1rem;
	border-top: 1px solid rgba(255, 255, 255, 0.2);
	margin-top: auto;
}

.component-${i}-btn {
	padding: 0.5rem 1.5rem;
	background: white;
	color: #667eea;
	border: none;
	border-radius: 100px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.component-${i}-btn:hover {
	transform: translateY(-2px);
	box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.component-${i}-btn:active {
	transform: translateY(0);
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
	.component-${i} {
		padding: var(--spacing-sm);
		margin: var(--spacing-xs);
	}
	
	.component-${i}-header {
		font-size: 1.25rem;
	}
	
	.component-${i}-footer {
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.component-${i}-btn {
		width: 100%;
	}
}

@media (prefers-color-scheme: dark) {
	.component-${i} {
		background: linear-gradient(135deg, #434343 0%, #000000 100%);
	}
	
	.component-${i}-body {
		background: rgba(30, 30, 30, 0.95);
		color: #e0e0e0;
	}
	
	.component-${i}-btn {
		background: #333;
		color: #e0e0e0;
	}
}

/* State variations for component-${i} */
.component-${i}.is-active {
	transform: scale(1.02);
	box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
}

.component-${i}.is-disabled {
	opacity: 0.5;
	pointer-events: none;
	filter: grayscale(100%);
}

.component-${i}.is-loading {
	position: relative;
}

.component-${i}.is-loading::after {
	content: '';
	position: absolute;
	top: 50%;
	left: 50%;
	width: 30px;
	height: 30px;
	margin: -15px 0 0 -15px;
	border: 3px solid rgba(255, 255, 255, 0.3);
	border-top-color: white;
	border-radius: 50%;
	animation: spin-${i} 0.8s linear infinite;
}

@keyframes spin-${i} {
	to { transform: rotate(360deg); }
}
`);
  }

  // Add some complex selectors and nested rules
  components.push(`
/* Complex Grid System */
.grid-system {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: 2rem;
	padding: 2rem;
}

.grid-system > * {
	animation: fadeInGrid 0.5s ease backwards;
}

.grid-system > *:nth-child(1) { animation-delay: 0.1s; }
.grid-system > *:nth-child(2) { animation-delay: 0.2s; }
.grid-system > *:nth-child(3) { animation-delay: 0.3s; }
.grid-system > *:nth-child(4) { animation-delay: 0.4s; }
.grid-system > *:nth-child(5) { animation-delay: 0.5s; }
.grid-system > *:nth-child(6) { animation-delay: 0.6s; }
.grid-system > *:nth-child(7) { animation-delay: 0.7s; }
.grid-system > *:nth-child(8) { animation-delay: 0.8s; }
.grid-system > *:nth-child(9) { animation-delay: 0.9s; }
.grid-system > *:nth-child(10) { animation-delay: 1s; }

@keyframes fadeInGrid {
	from {
		opacity: 0;
		transform: translateY(20px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* Complex attribute selectors */
[data-theme="light"][data-mode="compact"] .widget,
[data-theme="dark"][data-mode="compact"] .widget {
	padding: 0.25rem;
	font-size: 0.875rem;
}

[data-theme="light"][data-mode="comfortable"] .widget,
[data-theme="dark"][data-mode="comfortable"] .widget {
	padding: 0.5rem;
	font-size: 1rem;
}

[data-theme="light"][data-mode="spacious"] .widget,
[data-theme="dark"][data-mode="spacious"] .widget {
	padding: 1rem;
	font-size: 1.125rem;
}

/* Complex pseudo-selectors */
.nav-item:not(:first-child):not(:last-child):not(.is-active):hover {
	background: rgba(0, 0, 0, 0.05);
}

.form-input:valid:not(:focus):not(:placeholder-shown) {
	border-color: var(--success);
}

.form-input:invalid:not(:focus):not(:placeholder-shown) {
	border-color: var(--danger);
}

/* CSS Grid complex layouts */
.dashboard {
	display: grid;
	grid-template-areas:
		"header header header"
		"sidebar main aside"
		"footer footer footer";
	grid-template-columns: 200px 1fr 300px;
	grid-template-rows: auto 1fr auto;
	min-height: 100vh;
	gap: 1rem;
}

.dashboard-header { grid-area: header; }
.dashboard-sidebar { grid-area: sidebar; }
.dashboard-main { grid-area: main; }
.dashboard-aside { grid-area: aside; }
.dashboard-footer { grid-area: footer; }

@media (max-width: 1024px) {
	.dashboard {
		grid-template-areas:
			"header"
			"main"
			"sidebar"
			"aside"
			"footer";
		grid-template-columns: 1fr;
	}
}
`);

  return components.join("\n");
}

export const very_large_css = generate_very_large_css();
