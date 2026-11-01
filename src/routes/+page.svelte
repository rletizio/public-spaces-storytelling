<script>
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { steps } from '#lib/story/steps.js';
	import StoryMap from '#lib/StoryMap.svelte';

	let { data } = $props();

	// scenes that show the map: 'everyone' (overview) and 'closest' (explore)
	const OVERVIEW = steps.findIndex((s) => s.id === 'everyone');
	const EXPLORE = steps.findIndex((s) => s.id === 'closest');

	let active = $state(0);
	let progress = $state(0);

	// Scrollama drives `active` (the scene in view) and `progress` (0 to 1 inside that scene).
	// Scene components read these two values and never look at the scroll position themselves.
	onMount(() => {
		let scroller;
		let cancelled = false;
		import('scrollama').then(({ default: scrollama }) => {
			if (cancelled) return;
			scroller = scrollama();
			scroller
				.setup({ step: '.step', offset: 0.6, progress: true })
				.onStepEnter(({ index }) => {
					active = index;
					progress = 0;
				})
				.onStepProgress(({ index, progress: p }) => {
					if (index === active) progress = p;
				});
		});
		const onResize = () => scroller?.resize();
		window.addEventListener('resize', onResize);
		return () => {
			cancelled = true;
			window.removeEventListener('resize', onResize);
			scroller?.destroy();
		};
	});
</script>

<svelte:head>
	<title>Public Spaces Storytelling</title>
</svelte:head>

<main>
	<section class="story">
		<div class="stage" aria-live="polite">
			{#each steps as s, i (s.id)}
				{#if i !== OVERVIEW && i !== EXPLORE}
					<div class="layer" class:on={i === active} aria-hidden={i !== active}>
						<p class="tag">Scene {i + 1} · placeholder</p>
						<p class="what">{s.visual}</p>
					</div>
				{/if}
			{/each}
			<div class="maplayer" class:on={active === OVERVIEW || active === EXPLORE}>
				<StoryMap
					spaces={data.spaces}
					boundaries={data.boundaries}
					water={data.water}
					mode={active === EXPLORE ? 'explore' : 'overview'}
				/>
			</div>
			<p class="meter" aria-hidden="true">
				<span style:width="{((active + progress) / steps.length) * 100}%"></span>
			</p>
		</div>

		<div class="steps">
			{#each steps as s, i (s.id)}
				<article class="step" class:on={i === active}>
					<div class="card">
						<p class="role">{s.role}</p>
						<h2>{s.title}</h2>
						<p>{s.body}</p>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<footer>
		<a href={resolve('/dashboards')}>Earlier dashboards</a>
	</footer>
</main>

<style>
	.story { position: relative; }
	.stage {
		position: sticky;
		top: 0;
		height: 100vh;
		display: grid;
		place-items: center;
		background: var(--surface-2);
		border-bottom: 1px solid var(--line);
	}
	.layer {
		grid-area: 1 / 1;
		opacity: 0;
		transition: opacity 0.6s ease;
		text-align: center;
		max-width: 520px;
		padding: 24px;
		border: 1px dashed var(--ink-3);
		border-radius: 12px;
		margin-left: 380px;
	}
	.layer.on { opacity: 1; }
	.maplayer {
		position: absolute;
		top: 24px;
		bottom: 24px;
		left: 440px;
		right: 24px;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.6s ease;
	}
	.maplayer.on { opacity: 1; pointer-events: auto; }
	.tag { font-family: var(--font-title); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.8rem; color: var(--ink-3); margin: 0 0 6px; }
	.what { margin: 0; color: var(--ink-2); }
	.meter { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; margin: 0; background: var(--line); }
	.meter span { display: block; height: 100%; background: var(--seq-4); }

	.steps { position: relative; margin-top: -100vh; z-index: 1; pointer-events: none; }
	.step { min-height: 100vh; display: flex; align-items: center; padding: 0 32px; }
	.card {
		pointer-events: auto;
		width: 380px;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 20px 22px;
		opacity: 0.35;
		transition: opacity 0.4s ease;
	}
	.step.on .card { opacity: 1; }
	.role { font-family: var(--font-title); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; color: var(--seq-4); margin: 0 0 6px; }
	h2 { font-family: var(--font-title); font-size: 1.5rem; line-height: 1.2; margin: 0 0 10px; text-wrap: balance; }
	.card p:last-child { margin: 0; line-height: 1.55; }
	footer { padding: 24px 32px 48px; }
	footer a { color: var(--ink-2); }
	@media (prefers-reduced-motion: reduce) {
		.layer, .card { transition: none; }
	}
</style>
