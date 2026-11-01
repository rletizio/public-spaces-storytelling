<script>
	import { onMount } from 'svelte';
	import { steps } from '#lib/story/steps.js';
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

	let active = $state(0);
	let progress = $state(0);

	// Scrollama tells us which scene is in view (`active`). `progress` (0 to 1 across that scene's step) is
	// measured from the scroll position itself, so it is right even after a fast scroll or when scrolling back.
	// Scene components read these two values and never look at the scroll position themselves.
	const OFFSET = 0.6; // the line, as a share of the viewport height, where a step becomes active
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
			<div class="maplayer center" class:on={active === NEWS}>
				<NewsPhones spaces={data.spaces} progress={active === NEWS ? progress : 0} />
			</div>
			<div class="full"><StageText kind="journey" on={active === JOURNEY} /></div>
			<div class="maplayer" class:on={active === OVERVIEW || active === EXPLORE || active === SMALL} class:faint={active === SMALL}>
				<StoryMap
					spaces={data.spaces}
					boundaries={data.boundaries}
					water={data.water}
					mode={active === EXPLORE ? 'explore' : 'overview'}
				/>
			</div>
			<div class="maplayer center" class:on={active === SMALL}>
				<NearestBar stats={data.story} fill={active === SMALL ? Math.min(1, Math.max(0, (progress - 0.05) / 0.5)) : 0} />
			</div>
			<div class="maplayer" class:on={active === ORDER || active === ACCESS}>
				<DotPlot
					spaces={data.spaces}
					layout={active === ACCESS ? 'access' : 'size'}
					emphasis={active === ACCESS ? 'pair' : 'top10'}
					show={progress >= 0.5}
				/>
			</div>
			<div class="maplayer center" class:on={active === HISTORY}>
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
			<p class="meter" aria-hidden="true">
				<span style:width="{((active + progress) / steps.length) * 100}%"></span>
			</p>
		</div>

		<div class="steps">
			{#each steps as s, i (s.id)}
				<article class="step" class:on={i === active} class:tall={s.tall}>
					{#if !s.bare}
						<div class="card">
							<p class="role">{s.role}</p>
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
	.full { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
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
	.maplayer.on.faint { opacity: 0.14; pointer-events: none; }
	.maplayer.center { display: flex; align-items: center; }
	.maplayer.center :global(.wrap) { width: 100%; }
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
	.step.tall { min-height: 160vh; align-items: flex-start; }
	.step.tall .card { position: sticky; top: 30vh; }
	.role { font-family: var(--font-title); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; color: var(--seq-4); margin: 0 0 6px; }
	h2 { font-family: var(--font-title); font-size: 1.5rem; line-height: 1.2; margin: 0 0 10px; text-wrap: balance; }
	.card p:last-child { margin: 0; line-height: 1.55; }
	@media (prefers-reduced-motion: reduce) {
		.layer, .card { transition: none; }
	}
</style>
