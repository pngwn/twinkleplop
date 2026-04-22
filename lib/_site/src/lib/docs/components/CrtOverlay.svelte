<div class="crt-overlay"></div>

<style>
	.crt-overlay {
		pointer-events: none;
		position: fixed;
		inset: 0;
		z-index: 200;
		background: repeating-linear-gradient(
			0deg,
			rgba(255, 255, 255, 0.018) 0px,
			rgba(255, 255, 255, 0.018) 1px,
			transparent 1px,
			transparent 3px
		);
		mix-blend-mode: overlay;
		opacity: 1;
		transition: opacity 0.25s;
	}
	:global([data-docs-crt="off"]) .crt-overlay {
		opacity: 0;
	}

	@media (max-width: 760px) {
		.crt-overlay {
			opacity: 0.5;
		}
	}
</style>
