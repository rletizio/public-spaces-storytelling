<script>
	import * as d3 from 'd3';
	import { fmtInt, fmtAcres } from './format.js';
	import Hint from './Hint.svelte';

	// The 500 m grid. layer 'space': a circle per cell sized by its public space. layer 'ratio': cells are also shaded by
	// residents per acre of public space (cell + its 8 neighbours). `emphasis` outlines the priority cells and dims the rest.
	// `note` picks the text shown over the map: 'spread' | 'priority' | null.
	let { grid, boundaries, water, layer = 'space', emphasis = false, note = null } = $props();

	const W = 760;
	const CELL_M2 = 250000; // a full 500 m x 500 m cell
	const ACRES = 4046.8564;
	const BIG_PARK_M = 1000; // no space of 10 acres or more within this distance of the cell centre
	const PPA_CUTS = [100, 300, 1000, 3000];
	const PPA_LABELS = ['under 100', '100–300', '300–1,000', '1,000–3,000', 'over 3,000'];
	const PRIORITY_PPA = 1000;
	// Large census blocks (the airport, the harbor) spread a few residents evenly over many cells, about 1 each.
	// A cell with fewer residents than this counts as uninhabited.
	const MIN_RESIDENTS = 10;
	const ppaClass = (v) => {
		const i = PPA_CUTS.findIndex((c) => v < c);
		return i === -1 ? 4 : i;
	};

	function build(grid, boundaries, water) {
		const proj = d3.geoMercator().fitWidth(W, grid);
		const path = d3.geoPath(proj);
		const [, [, y1]] = path.bounds(grid);
		const H = Math.ceil(y1 + 6);
		const cells = grid.features.map((f) => {
			const [[bx0, by0], [bx1, by1]] = path.bounds(f);
			const [cx, cy] = proj(d3.geoCentroid(f));
			const p = f.properties;
			const space = p.pub_nb_m2;
			const state = !(p.pop >= MIN_RESIDENTS)
				? { kind: 'none' }
				: !(space > 0)
					? { kind: 'nospace' }
					: { kind: 'ppa', v: p.pop_nb / (space / ACRES), k: ppaClass(p.pop_nb / (space / ACRES)) };
			const priority =
				state.kind !== 'none' && (state.kind === 'nospace' || state.v >= PRIORITY_PPA) && p.d_big_m > BIG_PARK_M;
			return { id: p.id, p, d: path(f), cx, cy, side: (bx1 - bx0 + by1 - by0) / 2, state, priority };
		});
		const side = d3.median(cells, (c) => c.side);
		const total = d3.sum(cells, (c) => c.p.pop);
		const pri = cells.filter((c) => c.priority);
		const byCity = Object.fromEntries(
			['Boston', 'Cambridge', 'Somerville'].map((city) => [
				city,
				d3.sum(pri.filter((c) => c.p.city === city), (c) => c.p.pop) / d3.sum(cells.filter((c) => c.p.city === city), (c) => c.p.pop)
			])
		);
		return {
			H,
			cells,
			rMax: side * 0.5 * 0.94,
			boundaryD: path(boundaries),
			waterD: path(water),
			priority: pri,
			priPeople: d3.sum(pri, (c) => c.p.pop),
			priShare: d3.sum(pri, (c) => c.p.pop) / total,
			byCity
		};
	}
	const model = $derived(build(grid, boundaries, water));

	const radius = (p) => (p.pub_m2 > 0 ? Math.max(1.6, model.rMax * Math.sqrt(Math.min(1, p.pub_m2 / CELL_M2))) : 0);
	const circles = $derived(model.cells.filter((c) => c.p.pub_m2 > 0));
	const ratio = $derived(layer === 'ratio');
	const fillOf = (s) => (s.kind === 'ppa' ? `var(--pp-${s.k + 1})` : s.kind === 'nospace' ? 'url(#grid-hatch)' : 'none');

	let hover = $state.raw(null);
	let tip = $state.raw({ x: 0, y: 0, flip: false });
	let box;
	function move(e, c) {
		const r = box.getBoundingClientRect();
		hover = c;
		tip = { x: e.clientX - r.left, y: e.clientY - r.top, flip: e.clientX - r.left > r.width - 240 };
	}
	const roundK = (n) => fmtInt(Math.round(n / 1000) * 1000);
</script>

<div class="wrap" bind:this={box}>
	<Hint>Hover a cell to see its public space{ratio ? ' and its residents' : ''}.</Hint>
	<svg
		viewBox="0 0 {W} {model.H}"
		role="img"
		aria-label={ratio
			? 'Grid of 500 m cells over Boston, Cambridge and Somerville, shaded by residents per acre of public space. Circles show where the public space is.'
			: 'Grid of 500 m cells over Boston, Cambridge and Somerville. Circle size shows how much of each cell is public space.'}
	>
		<defs>
			<pattern id="grid-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
				<rect width="6" height="6" class="hatch-bg" />
				<line x1="0" y1="0" x2="0" y2="6" class="hatch-line" />
			</pattern>
		</defs>
		<path d={model.waterD} class="water" />
		<path d={model.boundaryD} class="boundary" />
		<g>
			{#each model.cells as c (c.id)}
				<path d={c.d} class="cell" class:shown={ratio} class:dimmed={emphasis && !c.priority} style:fill={fillOf(c.state)} />
			{/each}
		</g>
		<g>
			{#each circles as c (c.id)}
				<circle cx={c.cx} cy={c.cy} r={radius(c.p)} class="dot" class:ghost={ratio} class:dimmed={emphasis && !c.priority} />
			{/each}
		</g>
		<g class="prio" class:on={emphasis}>
			{#each model.priority as c (c.id)}
				<path d={c.d} class="ring" />
			{/each}
		</g>
		<g>
			{#each model.cells as c (c.id)}
				<path d={c.d} class="hit" role="presentation" onpointerenter={(e) => move(e, c)} onpointermove={(e) => move(e, c)} onpointerleave={() => (hover = null)} />
			{/each}
		</g>
	</svg>

	{#if hover}
		{@const p = hover.p}
		<div class="tip" style:left="{tip.flip ? tip.x - 14 : tip.x + 14}px" style:top="{tip.y + 14}px" style:transform={tip.flip ? 'translateX(-100%)' : 'none'} role="tooltip">
			<strong>{p.city}</strong> · cell {p.row}-{p.col}
			<div>{p.pub_m2 > 0 ? fmtAcres(p.pub_m2 / ACRES) : 'No'} public space in the cell</div>
			{#if ratio}
				<div>{fmtInt(p.pop)} residents in the cell</div>
				{#if hover.state.kind === 'ppa'}
					<div><b>{fmtInt(hover.state.v)}</b> residents per acre (cell + neighbours)</div>
				{:else if hover.state.kind === 'nospace'}
					<div>No public space in or next to this cell</div>
				{:else}
					<div>Almost nobody lives here (fewer than {MIN_RESIDENTS} residents)</div>
				{/if}
			{/if}
		</div>
	{/if}

	<div class="note" class:on={note === 'spread'}>
		Some parts of the area have <strong>fewer than 100</strong> residents for every acre of public space. Others have <strong>more than 3,000</strong>.
	</div>
	<div class="note" class:on={note === 'priority'}>
		<strong>{Math.round(model.priShare * 100)}% of residents</strong> (about {roundK(model.priPeople)} people) live in the outlined
		cells. Somerville {Math.round(model.byCity.Somerville * 100)}% · Cambridge {Math.round(model.byCity.Cambridge * 100)}% · Boston {Math.round(model.byCity.Boston * 100)}%.
		<small>Outlined: 1,000 or more residents per acre of public space (cell and neighbours) and no space of 10 acres or more within 1,000 m.</small>
	</div>

	<div class="legend">
		<div class="lg">
			<div class="lgt">Circle · public space in the 500 m cell</div>
			<svg width="170" height="44" aria-hidden="true">
				{#each [0.02, 0.2, 1] as v, i (v)}
					<circle cx={22 + i * 56} cy="18" r={Math.min(17, Math.max(1.6, model.rMax * Math.sqrt(v)))} class="size" />
					<text x={22 + i * 56} y="42" text-anchor="middle">{fmtInt((v * CELL_M2) / ACRES)} ac</text>
				{/each}
			</svg>
		</div>
		<div class="lg ramp" class:on={ratio}>
			<div class="lgt">Shade · residents per acre of public space</div>
			<div class="chips">
				{#each PPA_LABELS as l, i (l)}
					<span class="sw"><span class="chip" style:background="var(--pp-{i + 1})"></span>{l}</span>
				{/each}
				<span class="sw"><span class="chip hatched"></span>No public space</span>
			</div>
		</div>
	</div>
</div>

<style>
	.wrap { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; gap: 6px; }
	svg { width: 100%; flex: 1; min-height: 0; display: block; }
	.water { fill: var(--water); }
	.boundary { fill: none; stroke: var(--boundary); stroke-width: 1.2; stroke-dasharray: 5 3; }
	.cell { fill-opacity: 0; stroke: var(--line); stroke-width: 0.6; transition: fill-opacity 0.9s ease, opacity 0.6s ease; }
	.cell.shown { fill-opacity: 1; stroke: var(--surface); stroke-width: 0.8; }
	.cell.dimmed { opacity: 0.2; }
	.hatch-bg { fill: var(--surface-2); }
	.hatch-line { stroke: var(--ink-3); stroke-width: 1.6; }
	.dot { fill: var(--seq-3); fill-opacity: 0.8; stroke: var(--seq-4); stroke-width: 0.8; transition: fill 0.9s ease, opacity 0.6s ease; }
	.dot.ghost { fill: var(--surface); fill-opacity: 0.85; stroke: var(--ink-2); stroke-opacity: 0.8; stroke-width: 0.9; }
	.dot.dimmed { opacity: 0.25; }
	.prio { opacity: 0; transition: opacity 0.7s ease; pointer-events: none; }
	.prio.on { opacity: 1; }
	.ring { fill: none; stroke: var(--ink); stroke-width: 2.2; }
	.hit { fill: transparent; stroke: none; }
	.tip {
		position: absolute; z-index: 5; pointer-events: none; max-width: 260px; padding: 7px 10px; font-size: 0.78rem; line-height: 1.35;
		background: var(--surface); color: var(--ink); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 4px 14px var(--shadow);
	}
	.note {
		position: absolute; top: 8px; right: 8px; width: min(310px, calc(100% - 316px)); padding: 12px 14px; font-size: 0.92rem; line-height: 1.4;
		background: var(--surface); border: 1px solid var(--line); border-radius: 10px; opacity: 0; transition: opacity 0.6s ease; pointer-events: none;
	}
	.note.on { opacity: 1; }
	.note small { display: block; margin-top: 6px; color: var(--ink-2); font-size: 0.74rem; }
	.legend { display: flex; flex-wrap: wrap; gap: 8px 32px; font-size: 0.78rem; color: var(--ink-2); padding: 0 4px; }
	.lgt { font-weight: 700; color: var(--ink); margin-bottom: 4px; }
	.ramp { opacity: 0; transition: opacity 0.8s ease; }
	.ramp.on { opacity: 1; }
	.chips { display: flex; flex-wrap: wrap; gap: 4px 10px; }
	.sw { display: inline-flex; align-items: center; gap: 5px; }
	.chip { width: 13px; height: 13px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.12); }
	.chip.hatched { background: repeating-linear-gradient(135deg, var(--ink-3) 0 1.5px, var(--surface-2) 1.5px 4px); }
	.size { fill: none; stroke: var(--ink-2); stroke-width: 1.2; }
	text { fill: var(--ink-2); font-size: 10.5px; }
	@media (prefers-reduced-motion: reduce) {
		.cell, .dot, .prio, .note, .ramp { transition: none; }
	}
</style>
