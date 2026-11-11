<script>
	import { onMount } from 'svelte';
	import { steps } from '#lib/story/steps.js';
	import { sources } from '#lib/story/sources.js';
	import StoryMap from '#lib/StoryMap.svelte';
	import DotPlot from '#lib/DotPlot.svelte';
	import OwnershipTimeline from '#lib/OwnershipTimeline.svelte';
	import StoryGrid from '#lib/StoryGrid.svelte';
	import NearestBar from '#lib/NearestBar.svelte';
	import NewsPhones from '#lib/NewsPhones.svelte';
	import StageText from '#lib/StageText.svelte';

	let { data } = $props();

	// scenes that show the map: 'everyone' (overview) and 'closest' (explore)
	const OVERVIEW = steps.findIndex((s) => s.id === 'everyone');
	const EXPLORE = steps.findIndex((s) => s.id === 'closest');
	// scenes that show the dot plot: ordered by size, then by access
	const ORDER = steps.findIndex((s) => s.id === 'order');
	const ACCESS = steps.findIndex((s) => s.id === 'access');
	const HISTORY = steps.findIndex((s) => s.id === 'history');
	const PEOPLE = steps.findIndex((s) => s.id === 'people');
	const PRIORITY = steps.findIndex((s) => s.id === 'priority');
	const SMALL = steps.findIndex((s) => s.id === 'small');
	const NEWS = steps.findIndex((s) => s.id === 'news');
	const JOURNEY = steps.findIndex((s) => s.id === 'journey');
	const WHYTE = steps.findIndex((s) => s.id === 'whyte');
	const CLOSE = steps.findIndex((s) => s.id === 'close');

	// reader controls: jump to the start of a scene (the point where it becomes active)
	function goTo(i, instant = false) {
		const el = document.querySelectorAll('.step')[Math.max(0, Math.min(LAST, i))];
		if (!el) return;
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const y = Math.max(0, el.getBoundingClientRect().top + scrollY - OFFSET * innerHeight + 4);
		scrollTo({ top: y, behavior: instant || reduce ? 'auto' : 'smooth' });
	}

	// "Explore again": back to the interactive map
	function exploreAgain() {
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		document.querySelectorAll('.step')[EXPLORE]?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
	}

	// Emerald Necklace spaces in the dataset that have an acquisition year (Jamaica Pond has none):
	// Franklin Park and its zoo, Arnold Arboretum I and II, Back Bay Fens, Olmsted Park, The Riverway and Riverway.
	const NECKLACE = {
		label: 'Emerald Necklace parks',
		ids: ['S0001', 'S0283', 'S0003', 'S0014', 'S0011', 'S0023', 'S0035', 'S0169']
	};
	const bostonSpaces = $derived({
		...data.spaces,
		features: data.spaces.features.filter((f) => f.properties.city === 'Boston')
	});
	const half = $derived(progress >= 0.5);
	const OFFSET = 0.6; // the line, as a share of the viewport height, where a step becomes active
	const LAST = steps.length - 1;
	const atEnd = $derived(active === LAST);
	const source = $derived(sources[steps[active].id]);

	let active = $state(0);
	let progress = $state(0);

	// Scrollama tells us which scene is in view (`active`). `progress` (0 to 1 across that scene's step) is
	// measured from the scroll position itself, so it is right even after a fast scroll or when scrolling back.
	// Scene components read these two values and never look at the scroll position themselves.
	onMount(() => {
		let scroller;
		let cancelled = false;
		let frame = 0;
		const measure = () => {
			frame = 0;
			const el = document.querySelectorAll('.step')[active];
			if (!el) return;
			const r = el.getBoundingClientRect();
			progress = Math.max(0, Math.min(1, (innerHeight * OFFSET - r.top) / r.height));
		};
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(measure);
		};
		import('scrollama').then(({ default: scrollama }) => {
			if (cancelled) return;
			scroller = scrollama();
			scroller.setup({ step: '.step', offset: OFFSET }).onStepEnter(({ index }) => {
				active = index;
				measure();
			});
		});
		const onResize = () => {
			scroller?.resize();
			schedule();
		};
		window.addEventListener('resize', onResize);
		window.addEventListener('scroll', schedule, { passive: true });
		return () => {
			cancelled = true;
			cancelAnimationFrame(frame);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('scroll', schedule);
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
			<div class="frame">
			<div class="maplayer center" class:on={active === NEWS}>
				<NewsPhones spaces={data.spaces} progress={active === NEWS ? progress : 0} />
			</div>
			<div class="full"><StageText kind="journey" on={active === JOURNEY} /></div>
			<div class="maplayer" class:on={active === OVERVIEW || active === EXPLORE}>
				<StoryMap
					spaces={data.spaces}
					boundaries={data.boundaries}
					water={data.water}
					mode={active === EXPLORE ? 'explore' : 'overview'}
				/>
			</div>
			<div class="maplayer center" class:on={active === SMALL}>
				<NearestBar
					stats={data.story}
					fill={active === SMALL ? Math.min(1, Math.max(0, (progress - 0.05) / 0.4)) : 0}
					show={active === SMALL && half}
				/>
			</div>
			<div class="maplayer" class:on={active === ORDER || active === ACCESS}>
				<DotPlot
					spaces={data.spaces}
					layout={active === ACCESS ? 'access' : 'size'}
					emphasis={active === ACCESS ? 'pair' : 'top10'}
					show={progress >= 0.5}
				/>
			</div>
			<div class="maplayer" class:on={active === HISTORY}>
				<OwnershipTimeline spaces={bostonSpaces} show={active === HISTORY && half} necklace={NECKLACE} />
			</div>
			<div class="maplayer" class:on={active === PEOPLE || active === PRIORITY || active === WHYTE} class:faint={active === WHYTE}>
				<StoryGrid
					grid={data.grid}
					boundaries={data.boundaries}
					water={data.water}
					layer={active === PRIORITY || active === WHYTE || (active === PEOPLE && half) ? 'ratio' : 'space'}
					emphasis={active === WHYTE || (active === PRIORITY && half)}
					note={active === PEOPLE && half ? 'spread' : active === PRIORITY && half ? 'priority' : null}
				/>
			</div>
			<div class="full"><StageText kind="quote" on={active === WHYTE} /></div>
			<div class="full"><StageText kind="close" on={active === CLOSE} onexplore={exploreAgain} /></div>
			{#key active}
				<aside class="source" aria-label="Sources and method for this scene">
					<span class="lab">Data</span> {source.data}
					{#if source.method}<span class="lab">Method</span> {source.method}{/if}
					{#each source.links ?? [] as l (l.url)}
						<a href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
					{/each}
				</aside>
			{/key}
			<nav class="nav" class:on={active >= OVERVIEW} inert={active < OVERVIEW} aria-label="Story navigation">
				<button class="round" aria-label="Previous scene" title="Previous scene" disabled={active === 0} onclick={() => goTo(active - 1)}>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
				</button>
				<ol class="dots">
					{#each steps as s, i (s.id)}
						<li>
							<button
								class="dot"
								class:cur={i === active}
								aria-label="Scene {i + 1}: {s.title}"
								aria-current={i === active ? 'step' : undefined}
								title="{i + 1}. {s.title}"
								onclick={() => goTo(i)}
							></button>
						</li>
					{/each}
				</ol>
				<button class="round" aria-label="Next scene" title="Next scene" disabled={atEnd} onclick={() => goTo(active + 1)}>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
				</button>
				<button
					class="round skip"
					aria-label={atEnd ? 'Replay from the start' : 'Skip to the end'}
					title={atEnd ? 'Replay from the start' : 'Skip to the end'}
					onclick={() => (atEnd ? goTo(0, true) : goTo(LAST, true))}
				>
					{#if atEnd}
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4 4.5v4h4" /></svg>
					{:else}
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6l5 5 5-5M7 12l5 5 5-5M6 20.5h12" /></svg>
					{/if}
				</button>
			</nav>
			</div>
			<p class="meter" aria-hidden="true">
				<span style:width="{((active + progress) / steps.length) * 100}%"></span>
			</p>
		</div>

		<div class="steps">
			{#each steps as s, i (s.id)}
				<article class="step" class:on={i === active}>
					{#if !s.bare}
						<div class="card">
							<h2>{s.title}</h2>
							<p>{s.body}</p>
						</div>
					{/if}
				</article>
			{/each}
		</div>
	</section>

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
	.frame { position: absolute; top: 0; bottom: 0; left: 50%; width: min(100%, 1440px); transform: translateX(-50%); }
	.full { position: absolute; inset: 0 0 64px 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
	.maplayer {
		position: absolute;
		top: 24px;
		bottom: 76px;
		left: 440px;
		right: 64px;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.6s ease;
	}
	.maplayer.on { opacity: 1; pointer-events: auto; }
	.maplayer.on.faint { opacity: 0.14; pointer-events: none; }
	.maplayer.center { display: flex; align-items: center; }
	.maplayer.center :global(.wrap) { width: 100%; }
	.source {
		position: absolute; left: 0; right: 0; bottom: 4px; z-index: 2; padding: 6px 32px 8px;
		font-size: 0.72rem; line-height: 1.45; color: var(--ink-2); background: var(--surface-2); border-top: 1px solid var(--line);
		animation: source-in 0.5s ease;
	}
	.source .lab { font-family: var(--font-title); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink); margin-right: 2px; }
	.source .lab + .lab, .source a { margin-left: 10px; }
	.source a { color: var(--ink); }
	@keyframes source-in { from { opacity: 0; } to { opacity: 1; } }
	@media (prefers-reduced-motion: reduce) { .source { animation: none; } }
	.nav {
		position: absolute; right: 12px; top: 50%; transform: translateY(-50%); z-index: 3;
		display: flex; flex-direction: column; align-items: center; gap: 4px;
		opacity: 0; pointer-events: none; transition: opacity 0.9s ease;
	}
	.nav.on { opacity: 1; pointer-events: auto; }
	.round {
		display: grid; place-items: center; width: 32px; height: 32px; padding: 0; color: var(--ink);
		background: var(--surface); border: 1px solid var(--line); border-radius: 50%; cursor: pointer;
	}
	.round svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
	.round:hover:not(:disabled) { background: var(--ink); color: var(--surface); }
	.round:disabled { opacity: 0.3; cursor: default; }
	.skip { margin-top: 10px; }
	.dots { list-style: none; margin: 2px 0; padding: 0; display: flex; flex-direction: column; align-items: center; }
	.dot { display: grid; place-items: center; width: 22px; height: 18px; padding: 0; background: none; border: 0; cursor: pointer; }
	.dot::before { content: ''; width: 9px; height: 9px; border: 1.5px solid var(--ink-3); border-radius: 50%; background: transparent; transition: transform 0.2s ease, background 0.2s ease; }
	.dot:hover::before { background: var(--ink-3); }
	.dot.cur::before { background: var(--ink); border-color: var(--ink); transform: scale(1.35); }
	.round:focus-visible, .dot:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; border-radius: 50%; }
	.meter { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; margin: 0; background: var(--line); }
	.meter span { display: block; height: 100%; background: var(--seq-4); }

	.steps { position: relative; max-width: 1440px; margin: -100vh auto 0; z-index: 1; pointer-events: none; }
	.step { min-height: 160vh; display: flex; align-items: flex-start; padding: 0 32px; }
	.card {
		position: sticky;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: auto;
		width: 380px;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 20px 22px;
		opacity: 0;
		transition: opacity 0.5s ease;
	}
	.step.on .card { opacity: 1; }
	h2 { font-family: var(--font-title); font-size: 1.5rem; line-height: 1.2; margin: 0 0 10px; text-wrap: balance; }
	.card p:last-child { margin: 0; line-height: 1.55; }
	@media (prefers-reduced-motion: reduce) {
		.card, .nav, .dot::before { transition: none; }
	}
</style>
