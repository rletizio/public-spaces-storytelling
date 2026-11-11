<script>
	// The small "how to use this" box at the top left of an interactive visualization.
	let { children } = $props();
</script>

<aside class="hint">{@render children()}</aside>

<style>
	.hint {
		align-self: flex-start; box-sizing: border-box; width: fit-content; max-width: min(100%, 540px); margin: 0; padding: 5px 12px;
		font-size: 0.78rem; line-height: 1.35; color: var(--ink-2);
		background: color-mix(in srgb, var(--surface) 90%, transparent); border: 1px solid var(--line); border-radius: 8px;
	}
</style>
