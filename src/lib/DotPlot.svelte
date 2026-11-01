<script>
	import * as d3 from 'd3';
	import { fmtCompact, fmtInt } from './format.js';
	import { GROUPS, groupOf, groupCss } from './colors.js';

	// One dot per space. `layout` 'size' orders them by area (log axis); 'access' by the people living within 500 m.
	// Dots glide between the two layouts. `emphasis` 'top10' outlines the ten largest spaces,
	// 'pair' rings Christian Science Plaza and Franklin Park and shows the comparison.
	let { spaces, layout = 'size', emphasis = 'top10' } = $props();

	const W = 900;
	const H = 760;
	const M = { l: 36, r: 36, top: 24, axis: 64 };
	const CY = (H - M.axis + M.top) / 2;
	const PAIR = { small: 'Christian Science Plaza', big: 'Franklin Park' };

	function build(spaces) {
		const feats = spaces.features.map((f) => ({ ...f.properties, group: groupOf(f.properties.category) }));
		const r = d3.scaleSqrt().domain([0, d3.max(feats, (d) => d.area_m2)]).range([2.5, 30]);
		const xs = d3.scaleLog().domain([0.01, 600]).range([M.l, W - M.r]);
		const xa = d3.scaleLinear().domain([0, Math.ceil(d3.max(feats, (d) => d.pop_500m) / 10000) * 10000]).range([M.l, W - M.r]);

		const swarm = (xOf) => {
			const items = feats
				.slice()
				.sort((a, b) => b.area_m2 - a.area_m2)
				.map((d, i) => ({ d, r: r(d.area_m2), tx: xOf(d), x: xOf(d), y: CY + ((i % 2 ? 1 : -1) * ((i * 7) % 60)) }));
			d3.forceSimulation(items)
				.force('x', d3.forceX((n) => n.tx).strength(1))
				.force('y', d3.forceY(CY).strength(0.012))
				.force('collide', d3.forceCollide((n) => n.r + 0.7).strength(0.9))
				.stop()
				.tick(400);
			for (const n of items) n.y = Math.max(M.top + n.r, Math.min(H - M.axis - n.r, n.y));
			return new Map(items.map((n) => [n.d.id, { x: n.x, y: n.y }]));
		};
		const bySize = swarm((d) => xs(d.area_acres));
		const byAccess = swarm((d) => xa(d.pop_500m));

		const nodes = feats.map((d) => ({ d, r: r(d.area_m2), size: bySize.get(d.id), access: byAccess.get(d.id) }));
		const ranked = feats.slice().sort((a, b) => b.area_m2 - a.area_m2);
		const total = d3.sum(feats, (d) => d.area_m2);
		const top10 = new Set(ranked.slice(0, 10).map((d) => d.id));
		const small = feats.find((d) => d.name === PAIR.small);
		const big = feats.find((d) => d.name === PAIR.big);
		return {
			nodes,
			r,
			xs,
			xa,
			top10,
			top10Share: d3.sum(ranked.slice(0, 10), (d) => d.area_m2) / total,
			labelled: [big.id],
			small,
			big,
			times: Math.round(big.area_m2 / small.area_m2),
			byId: new Map(nodes.map((n) => [n.d.id, n]))
		};
	}
	const model = $derived(build(spaces));

	const at = (n) => n[layout];
	const css = (n) => `translate(${at(n).x}px, ${at(n).y}px)`;
	const isPair = (n) => n.d.id === model.small.id || n.d.id === model.big.id;
	const hlNodes = $derived(
		emphasis === 'pair'
			? [model.byId.get(model.small.id), model.byId.get(model.big.id)]
			: model.labelled.map((id) => model.byId.get(id))
	);
	const kind = (d) => (d.owner === 'Unknown' ? 'unknown' : d.private_owned ? 'private' : 'public');
	const sizeTicks = [0.01, 0.1, 1, 10, 100];
	const accessTicks = $derived(model.xa.ticks(8));
</script>

<div class="wrap">
	<svg viewBox="0 0 {W} {H}" role="img" aria-label={layout === 'size'
		? 'Dot plot of all 836 public spaces ordered by area on a logarithmic axis. The ten largest hold 43 percent of all public space area.'
		: 'Dot plot of all 836 public spaces placed by the number of people living within 500 meters. Large and small spaces are spread across the whole axis.'}>
		<g class="axis" class:on={layout === 'size'}>
			{#each sizeTicks as tk (tk)}
				<line class="grid" x1={model.xs(tk)} x2={model.xs(tk)} y1={M.top} y2={H - M.axis} />
				<text class="tick" x={model.xs(tk)} y={H - M.axis + 20} text-anchor="middle">{tk}</text>
			{/each}
			<text class="title" x={W / 2} y={H - 10} text-anchor="middle">Area of the space, in acres (log scale)</text>
		</g>
		<g class="axis" class:on={layout === 'access'}>
			{#each accessTicks as tk (tk)}
				<line class="grid" x1={model.xa(tk)} x2={model.xa(tk)} y1={M.top} y2={H - M.axis} />
				<text class="tick" x={model.xa(tk)} y={H - M.axis + 20} text-anchor="middle">{fmtCompact(tk)}</text>
			{/each}
			<text class="title" x={W / 2} y={H - 10} text-anchor="middle">People living within 500 m of the space (2020 census)</text>
		</g>

		{#each model.nodes as n (n.d.id)}
			<circle
				class="dot {kind(n.d)}"
				class:top={emphasis === 'top10' && model.top10.has(n.d.id)}
				class:mute={emphasis === 'pair' && !isPair(n)}
				r={n.r}
				style:transform={css(n)}
				style:--c={groupCss[n.d.group]}
			/>
		{/each}

		{#each hlNodes as n (n.d.id)}
			<g class="hl" style:transform={css(n)}>
				{#if emphasis === 'pair'}
					<circle class="dot public" r={n.r} style:--c={groupCss[n.d.group]} />
					<circle class="ring" r={n.r + 5} />
				{/if}
				<text class="label" y={emphasis === 'pair' && n.d.id === model.big.id ? n.r + 24 : -(n.r + 10)} text-anchor="middle">
					{n.d.name}{#if emphasis === 'pair'}{` · ${fmtInt(n.d.pop_500m)} people`}{/if}
				</text>
			</g>
		{/each}
	</svg>

	<div class="note top" class:on={emphasis === 'top10' && layout === 'size'}>
		<strong>The ten largest spaces</strong> (outlined) hold <strong>{Math.round(model.top10Share * 100)}%</strong> of all the public space area.
	</div>
	<div class="note pair" class:on={emphasis === 'pair'}>
		<strong>{model.small.name}</strong> is accessible to more than {Math.floor(model.small.pop_500m / 1000)} thousand people,
		almost as many as <strong>{model.big.name}</strong>, which is {model.times} times larger.
	</div>

	<div class="legend">
		<span class="lgt">Color = type</span>
		{#each GROUPS as g (g.key)}
			<span class="lg"><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" class="dot public" style:--c={g.css} /></svg>{g.label}</span>
		{/each}
		<span class="lg"><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" class="dot private" style:--c="var(--ink-2)" /></svg>Hollow = private or nonprofit, open to the public</span>
		<span class="lg">
			Size = area
			<svg width="86" height="34" aria-hidden="true">
				{#each [0.1, 10, 100] as ac, i (ac)}
					<circle cx={10 + i * 28} cy="17" r={model.r(ac * 4046.86)} class="size" />
				{/each}
			</svg>
			0.1 · 10 · 100 ac
		</span>
	</div>
</div>

<style>
	.wrap { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; gap: 6px; }
	svg { width: 100%; flex: 1; min-height: 0; display: block; }
	.axis { opacity: 0; transition: opacity 0.8s ease; }
	.axis.on { opacity: 1; }
	.grid { stroke: var(--line); stroke-width: 1; }
	.tick { fill: var(--ink-3); font-size: 12px; }
	.title { fill: var(--ink-2); font-size: 13px; }
	.dot {
		transition: transform 1.6s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.6s ease;
		stroke-width: 1.5;
	}
	.dot.public { fill: var(--c); stroke: var(--surface); fill-opacity: 0.85; }
	.dot.private { fill: var(--surface); stroke: var(--c); }
	.dot.unknown { fill: var(--c); fill-opacity: 0.35; stroke: var(--c); stroke-width: 1; }
	.dot.top { stroke: var(--ink); stroke-width: 2.4; }
	.dot.mute { opacity: 0.22; }
	.hl { transition: transform 1.6s cubic-bezier(0.65, 0, 0.35, 1); pointer-events: none; }
	.hl .dot { transition: none; }
	.ring { fill: none; stroke: var(--ink); stroke-width: 2.5; }
	.label {
		fill: var(--ink); font-size: 13px; font-weight: 700; paint-order: stroke; stroke: var(--surface);
		stroke-width: 4px; stroke-linejoin: round;
	}
	.note {
		position: absolute; top: 12px; right: 12px; width: 300px; padding: 12px 14px; font-size: 0.92rem; line-height: 1.4;
		background: var(--surface); border: 1px solid var(--line); border-radius: 10px; opacity: 0; transition: opacity 0.6s ease;
		pointer-events: none;
	}
	.note.on { opacity: 1; }
	.legend { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; font-size: 0.8rem; color: var(--ink-2); padding: 0 4px; }
	.lgt { font-weight: 700; color: var(--ink); }
	.lg { display: inline-flex; align-items: center; gap: 6px; }
	.lg svg { width: auto; display: inline-block; flex: none; }
	.legend .dot { transition: none; }
	.size { fill: none; stroke: var(--ink-2); stroke-width: 1.2; }
	@media (prefers-reduced-motion: reduce) {
		.dot, .hl, .axis, .note { transition: none; }
	}
</style>
