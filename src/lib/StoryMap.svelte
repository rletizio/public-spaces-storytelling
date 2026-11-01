<script>
	import { onMount, untrack } from 'svelte';
	import * as d3 from 'd3';
	import { buildModel, findSpace, tilesFor, ACCESS_M } from './mapModel.js';
	import { fmtAcres, fmtInt, ordinal } from './format.js';
	import { GROUPS, groupCss } from './colors.js';

	// mode 'overview': every space, no interaction (scene 3).
	// mode 'explore': zooms to `start`, then the reader drags the map; the space under the + is described (scene 4).
	let { spaces, boundaries, water, mode = 'overview', start = 'Copley Square' } = $props();

	const W = 860;
	const H = 740;
	const model = $derived(buildModel(spaces, boundaries, W, H));
	const waterD = $derived(d3.geoPath(model.proj)(water));
	const explore = $derived(mode === 'explore');

	let svg = $state();
	let t = $state.raw(d3.zoomIdentity);
	let zoomBehavior;
	let dark = $state(false);
	let dur = 900;

	const focus = $derived.by(() => {
		if (!explore) return null;
		const [x, y] = t.invert([W / 2, H / 2]);
		return findSpace(model.feats, x, y, Math.max(model.r0 * 0.3, 22 / t.k));
	});
	const p = $derived(focus?.p);

	function go(next, animate = true) {
		const sel = d3.select(svg);
		(animate && dur ? sel.transition().duration(dur) : sel).call(zoomBehavior.transform, next);
	}

	function jumpTo(f, animate = true) {
		const [x0, y0, x1, y1] = f.bbox;
		// fit the space (about 110 px) but keep the whole 500 m halo inside the view
		const k = Math.max(4, Math.min(110 / Math.max(x1 - x0, y1 - y0, 1e-6), 170 / model.r0));
		go(d3.zoomIdentity.translate(W / 2 - k * f.at[0], H / 2 - k * f.at[1]).scale(k), animate);
	}

	onMount(() => {
		dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900;
		zoomBehavior = d3
			.zoom()
			.scaleExtent([1, 40])
			.translateExtent([
				[-40, -40],
				[W + 40, H + 40]
			])
			// plain scrolling must keep moving the page: the wheel zooms only with Ctrl or Cmd held
			.filter((e) => {
				if (!explore) return false;
				if (e.type === 'wheel') return e.ctrlKey || e.metaKey;
				return !e.button && !e.ctrlKey;
			})
			.on('zoom', (e) => (t = e.transform));
		d3.select(svg).call(zoomBehavior).on('dblclick.zoom', null);

		const mq = matchMedia('(prefers-color-scheme: dark)');
		const root = document.documentElement;
		const sync = () => {
			const th = root.dataset.theme;
			dark = th === 'dark' || (th !== 'light' && mq.matches);
		};
		sync();
		mq.addEventListener('change', sync);
		const mo = new MutationObserver(sync);
		mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
		return () => {
			mq.removeEventListener('change', sync);
			mo.disconnect();
		};
	});

	// declared after onMount so the zoom behaviour exists when it first runs
	$effect(() => {
		const m = mode;
		if (!zoomBehavior) return;
		untrack(() => {
			if (m === 'explore') jumpTo(model.feats.find((f) => f.p.name === start) ?? model.feats[0]);
			else go(d3.zoomIdentity);
		});
	});

	function zoomBy(k) {
		const sel = d3.select(svg);
		(dur ? sel.transition().duration(300) : sel).call(zoomBehavior.scaleBy, k);
	}
	function onKey(e) {
		if (!explore) return;
		const step = 60;
		const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
		if (moves[e.key]) {
			e.preventDefault();
			d3.select(svg).call(zoomBehavior.translateBy, moves[e.key][0] / t.k, moves[e.key][1] / t.k);
		} else if (e.key === '+' || e.key === '=') zoomBy(1.6);
		else if (e.key === '-') zoomBy(1 / 1.6);
	}

	const tiles = $derived(tilesFor(model, t, W, H));
	const barPx = $derived(model.r0 * t.k);
	const ring = $derived.by(() => {
		if (!focus) return null;
		const [x0, y0, x1, y1] = focus.bbox;
		if (Math.max(x1 - x0, y1 - y0) * t.k >= 18) return null;
		const [cx, cy] = t.apply(focus.at);
		return { cx, cy };
	});
</script>

<div class="wrap">
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<svg
		bind:this={svg}
		viewBox="0 0 {W} {H}"
		role="img"
		aria-label={explore
			? 'Map of public spaces. Drag to move; the space under the center cross is described in the card.'
			: 'Map of all 836 public spaces in Boston, Cambridge and Somerville.'}
		tabindex={explore ? 0 : -1}
		class:explore
		onkeydown={onKey}
	>
		<rect class="bg" width={W} height={H} />
		<g transform={t.toString()}>
			<path class="water" d={waterD} />
		</g>
		<g class="tiles" class:dark>
			{#each tiles as tl (tl.key)}
				<image href={tl.href} x={tl.x} y={tl.y} width={tl.w} height={tl.h} preserveAspectRatio="none" />
			{/each}
		</g>
		<g transform={t.toString()}>
			<path class="boundary" d={model.boundaryD} />
			{#if focus}
				<path class="band" d={focus.d} style:stroke-width="{model.r0 * 2}px" />
			{/if}
			{#each model.feats as f (f.id)}
				<path class="space" d={f.d} style:--c={groupCss[f.group]} />
			{/each}
			{#if focus}
				<path class="focus" d={focus.d} style:--c={groupCss[focus.group]} />
			{/if}
		</g>
		{#if ring}
			<circle class="ring" cx={ring.cx} cy={ring.cy} r="13" />
		{/if}
		{#if explore}
			<g class="reticle" transform="translate({W / 2},{H / 2})">
				<line x1="-9" x2="9" y1="0" y2="0" />
				<line x1="0" x2="0" y1="-9" y2="9" />
			</g>
			<g class="scale" transform="translate(16,{H - 18})">
				<line x1="0" x2={barPx} y1="0" y2="0" />
				<line x1="0" x2="0" y1="-4" y2="4" />
				<line x1={barPx} x2={barPx} y1="-4" y2="4" />
				<text x="0" y="-8">{ACCESS_M} m</text>
			</g>
		{/if}
		<text class="attrib" x={W - 6} y={H - 6} text-anchor="end">© OpenStreetMap contributors</text>
	</svg>

	<ul class="legend" aria-label="Types of space">
		{#each GROUPS as g (g.key)}
			<li><span class="sw" style:background={g.css}></span>{g.label}</li>
		{/each}
	</ul>

	<div class="ui" class:on={explore} aria-hidden={!explore}>
		<div class="zoom" role="group" aria-label="Zoom">
			<button onclick={() => zoomBy(1.6)} aria-label="Zoom in" tabindex={explore ? 0 : -1}>+</button>
			<button onclick={() => zoomBy(1 / 1.6)} aria-label="Zoom out" tabindex={explore ? 0 : -1}>−</button>
		</div>
		<p class="hint">Drag to move the map. Hold Ctrl or ⌘ and scroll, or use the buttons, to zoom. Scrolling anywhere else continues the story.</p>
		<div class="card" aria-live="polite">
			{#if p}
				<h3>{p.name}</h3>
				<p class="meta">{p.city} · {p.category}</p>
				<p class="fig"><strong>{fmtAcres(p.area_acres)}</strong> <span>{ordinal(p.rank_all)} largest of {model.feats.length}</span></p>
				<p class="fig"><strong>{fmtInt(p.pop_500m)}</strong> <span>people within 500 m (the grey halo)</span></p>
			{:else}
				<h3 class="empty">No space under the cross</h3>
				<p class="meta">Move the map until a park, square or plaza sits at the center.</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.wrap { position: relative; width: 100%; height: 100%; }
	svg {
		width: 100%; height: 100%; display: block; border: 1px solid var(--line); border-radius: 12px;
		touch-action: none; user-select: none;
	}
	svg.explore { cursor: grab; }
	svg.explore:active { cursor: grabbing; }
	.bg { fill: var(--surface-2); }
	.water { fill: var(--water); }
	.tiles { pointer-events: none; opacity: 0.42; filter: grayscale(0.95) contrast(0.7) brightness(1.2); }
	.tiles.dark { opacity: 0.4; filter: invert(1) hue-rotate(180deg) grayscale(0.95) contrast(0.7) brightness(0.8); }
	.boundary { fill: none; stroke: var(--boundary); stroke-width: 1.2; stroke-dasharray: 5 3; vector-effect: non-scaling-stroke; }
	.space { fill: var(--c); fill-opacity: 0.55; stroke: var(--c); stroke-width: 1; vector-effect: non-scaling-stroke; }
	.band { fill: var(--ink); stroke: var(--ink); stroke-linejoin: round; opacity: 0.07; }
	.focus { fill: var(--c); stroke: var(--ink); stroke-width: 2.2; vector-effect: non-scaling-stroke; fill-opacity: 0.95; }
	.ring { fill: none; stroke: var(--ink); stroke-width: 2.5; }
	.reticle line { stroke: var(--ink); stroke-width: 1.5; opacity: 0.75; }
	.scale line { stroke: var(--ink-2); stroke-width: 1.5; }
	.scale text, .attrib { fill: var(--ink-2); font-size: 11px; paint-order: stroke; stroke: var(--surface); stroke-width: 3px; }
	.attrib { font-size: 9px; }

	.legend {
		position: absolute; left: 14px; bottom: 30px; margin: 0; padding: 8px 12px; list-style: none;
		display: grid; gap: 4px; font-size: 0.8rem; color: var(--ink-2);
		background: color-mix(in srgb, var(--surface) 88%, transparent); border: 1px solid var(--line); border-radius: 8px;
	}
	.sw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 8px; vertical-align: -1px; }

	.ui { opacity: 0; pointer-events: none; transition: opacity 0.6s ease; }
	.ui.on { opacity: 1; pointer-events: none; }
	.ui.on button { pointer-events: auto; }
	.zoom { position: absolute; right: 14px; bottom: 30px; display: grid; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: var(--surface); }
	.zoom button { font: inherit; font-size: 1.2rem; width: 36px; height: 36px; border: 0; background: var(--surface); color: var(--ink); cursor: pointer; }
	.zoom button + button { border-top: 1px solid var(--line); }
	.zoom button:hover { background: var(--surface-2); }
	.hint {
		position: absolute; left: 14px; top: 14px; max-width: 300px; margin: 0; padding: 8px 12px; font-size: 0.78rem; color: var(--ink-2);
		background: color-mix(in srgb, var(--surface) 90%, transparent); border: 1px solid var(--line); border-radius: 8px;
	}
	.card {
		position: absolute; right: 14px; top: 14px; width: 290px; padding: 14px 16px;
		background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
	}
	.card h3 { font-family: var(--font-title); font-size: 1.2rem; line-height: 1.2; margin: 0; }
	.card .empty { color: var(--ink-2); }
	.meta { margin: 2px 0 8px; color: var(--ink-2); font-size: 0.85rem; }
	.fig { margin: 3px 0; font-size: 0.95rem; }
	.fig span { color: var(--ink-2); font-size: 0.82rem; }
	@media (prefers-reduced-motion: reduce) { .ui { transition: none; } }
</style>
