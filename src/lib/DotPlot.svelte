<script>
	import * as d3 from 'd3';
	import { fmtAcres, fmtCompact, fmtInt } from './format.js';
	import { GROUPS, groupOf, groupCss } from './colors.js';

	// One dot per space, in one stripe per city. `layout` 'size' orders the dots by area (log axis);
	// 'access' by the people living within 500 m, and the dots glide between the two.
	// `emphasis` is what to highlight once `show` is true: 'top10' outlines the ten largest spaces,
	// 'pair' rings Christian Science Plaza and Franklin Park and shows the comparison.
	let { spaces, layout = 'size', emphasis = 'top10', show = false } = $props();

	const W = 900;
	const H = 760;
	const M = { l: 112, r: 28, top: 8, axis: 64 };
	const CITIES = ['Boston', 'Cambridge', 'Somerville'];
	const BAND = { Boston: 350, Cambridge: 200, Somerville: 130 };
	const R_MAX = 48; // radius of the largest space; every other radius follows sqrt(area), so dot AREA is proportional
	const R_MIN = 1.8; // floor so the smallest spaces stay visible
	const PAIR = { small: 'Christian Science Plaza', big: 'Franklin Park' };

	function build(spaces) {
		const feats = spaces.features.map((f) => ({ ...f.properties, group: groupOf(f.properties.category) }));
		const maxArea = d3.max(feats, (d) => d.area_m2);
		const r = (areaM2) => Math.max(R_MIN, R_MAX * Math.sqrt(areaM2 / maxArea));
		const xs = d3.scaleLog().domain([0.01, 600]).range([M.l, W - M.r]);
		const xa = d3.scaleLinear().domain([0, Math.ceil(d3.max(feats, (d) => d.pop_500m) / 10000) * 10000]).range([M.l, W - M.r]);

		let y0 = M.top;
		const rows = [];
		const nodes = [];
		for (const city of CITIES) {
			const h = BAND[city];
			const cy = y0 + h / 2;
			const own = feats.filter((d) => d.city === city).sort((a, b) => b.area_m2 - a.area_m2);
			const swarm = (xOf) => {
				const items = own.map((d, i) => ({ d, r: r(d.area_m2), tx: xOf(d), x: xOf(d), y: cy + (i % 2 ? 1 : -1) * ((i * 5) % 30) }));
				d3.forceSimulation(items)
					.force('x', d3.forceX((n) => n.tx).strength(1))
					.force('y', d3.forceY(cy).strength(0.07))
					.force('collide', d3.forceCollide((n) => n.r + 0.8).strength(0.9))
					.stop()
					.tick(260);
				for (const n of items) n.y = Math.max(y0 + n.r + 1, Math.min(y0 + h - n.r - 1, n.y));
				return new Map(items.map((n) => [n.d.id, { x: n.x, y: n.y }]));
			};
			const size = swarm((d) => xs(d.area_acres));
			const access = swarm((d) => xa(d.pop_500m));
			for (const d of own) nodes.push({ d, r: r(d.area_m2), size: size.get(d.id), access: access.get(d.id) });
			rows.push({ city, y0, h, cy, n: own.length, ids: own.map((d) => d.id) });
			y0 += h;
		}
		const ranked = feats.slice().sort((a, b) => b.area_m2 - a.area_m2);
		const total = d3.sum(feats, (d) => d.area_m2);
		const small = feats.find((d) => d.name === PAIR.small);
		const big = feats.find((d) => d.name === PAIR.big);
		return {
			nodes,
			rows,
			r,
			xs,
			xa,
			top10: new Set(ranked.slice(0, 10).map((d) => d.id)),
			top10Share: d3.sum(ranked.slice(0, 10), (d) => d.area_m2) / total,
			small,
			big,
			times: Math.round(big.area_m2 / small.area_m2),
			byId: new Map(nodes.map((n) => [n.d.id, n])),
			delaunay: {
				size: d3.Delaunay.from(nodes, (n) => n.size.x, (n) => n.size.y),
				access: d3.Delaunay.from(nodes, (n) => n.access.x, (n) => n.access.y)
			}
		};
	}
	const model = $derived(build(spaces));

	// ---- filter by type (legend buttons) ----
	let hiddenGroups = $state.raw(new Set());
	function toggle(key) {
		const next = new Set(hiddenGroups);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		hiddenGroups = next;
	}
	const hidden = (d) => hiddenGroups.has(d.group);
	const activeCount = $derived(model.nodes.filter((n) => !hidden(n.d)).length);
	const rowStats = $derived(
		model.rows.map((row) => {
			const act = row.ids.map((id) => model.byId.get(id).d).filter((d) => !hidden(d));
			return { ...row, k: act.length, median: act.length ? d3.median(act, (d) => d.pop_500m) : null };
		})
	);

	// ---- hover ----
	let wrap = $state();
	let svg = $state();
	let hover = $state(null);
	let tip = $state({ left: 0, top: 0, flip: false });
	function onMove(e) {
		const rect = svg.getBoundingClientRect();
		const s = Math.min(rect.width / W, rect.height / H);
		const px = (e.clientX - rect.left - (rect.width - W * s) / 2) / s;
		const py = (e.clientY - rect.top - (rect.height - H * s) / 2) / s;
		const n = model.nodes[model.delaunay[layout].find(px, py)];
		if (n && !hidden(n.d) && Math.hypot(at(n).x - px, at(n).y - py) <= n.r + 6) {
			hover = n;
			const w = wrap.getBoundingClientRect();
			tip = { left: e.clientX - w.left, top: e.clientY - w.top, flip: e.clientX - w.left > w.width - 290 };
		} else hover = null;
	}

	const at = (n) => n[layout];
	const css = (n) => `translate(${at(n).x}px, ${at(n).y}px)`;
	const isPair = (n) => n.d.id === model.small.id || n.d.id === model.big.id;
	const hlNodes = $derived(
		!show
			? []
			: emphasis === 'pair'
				? [model.byId.get(model.small.id), model.byId.get(model.big.id)]
				: [model.byId.get(model.big.id)]
	);
	const kind = (d) => (d.owner === 'Unknown' ? 'unknown' : d.private_owned ? 'private' : 'public');
	const sizeTicks = [0.01, 0.1, 1, 10, 100];
	const accessTicks = $derived(model.xa.ticks(8));
</script>

<div class="wrap" bind:this={wrap}>
	<p class="status" aria-live="polite">
		Showing <strong>{activeCount}</strong> of {model.nodes.length} spaces. Hover a dot for details; click a type below to hide or show it.
	</p>

	<svg
		bind:this={svg}
		viewBox="0 0 {W} {H}"
		role="img"
		aria-label={layout === 'size'
			? 'Dot plot of all 836 public spaces, one stripe per city, ordered by area on a logarithmic axis. The ten largest hold 43 percent of all public space area.'
			: 'Dot plot of all 836 public spaces, one stripe per city, placed by the number of people living within 500 meters. Large and small spaces are spread across the whole axis.'}
		onpointermove={onMove}
		onpointerleave={() => (hover = null)}
	>
		<g class="axis" class:on={layout === 'size'}>
			{#each sizeTicks as tk (tk)}
				<line class="grid" x1={model.xs(tk)} x2={model.xs(tk)} y1={M.top} y2={H - M.axis} />
				<text class="tick" x={model.xs(tk)} y={H - M.axis + 20} text-anchor="middle">{tk}</text>
			{/each}
			<text class="title" x={(M.l + W - M.r) / 2} y={H - 10} text-anchor="middle">Area of the space, in acres (log scale)</text>
		</g>
		<g class="axis" class:on={layout === 'access'}>
			{#each accessTicks as tk (tk)}
				<line class="grid" x1={model.xa(tk)} x2={model.xa(tk)} y1={M.top} y2={H - M.axis} />
				<text class="tick" x={model.xa(tk)} y={H - M.axis + 20} text-anchor="middle">{fmtCompact(tk)}</text>
			{/each}
			<text class="title" x={(M.l + W - M.r) / 2} y={H - 10} text-anchor="middle">People living within 500 m of the space (2020 census)</text>
		</g>

		{#each rowStats as row, i (row.city)}
			{#if i > 0}<line class="sep" x1="0" x2={W} y1={row.y0} y2={row.y0} />{/if}
			<text class="row-label" x="6" y={row.cy - 4}>{row.city}</text>
			<text class="row-sub" x="6" y={row.cy + 12}>{row.k === row.n ? `${row.n} spaces` : `${row.k} of ${row.n} spaces`}</text>
			{#if row.median != null}
				<g class="axis median" class:on={layout === 'access'}>
					<text class="row-sub" x="6" y={row.cy + 26}>median {fmtCompact(row.median)}</text>
					<line x1={model.xa(row.median)} x2={model.xa(row.median)} y1={row.y0 + 4} y2={row.y0 + row.h - 4} />
				</g>
			{/if}
		{/each}

		{#each model.nodes as n (n.d.id)}
			<circle
				class="dot {kind(n.d)}"
				class:top={show && emphasis === 'top10' && model.top10.has(n.d.id)}
				class:mute={show && emphasis === 'pair' && !isPair(n)}
				class:off={hidden(n.d)}
				class:hover={hover === n}
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

	{#if hover}
		{@const d = hover.d}
		<div class="tip" style:left="{tip.flip ? tip.left - 14 : tip.left + 14}px" style:top="{tip.top + 14}px" style:transform={tip.flip ? 'translateX(-100%)' : 'none'} role="tooltip">
			<strong>{d.name}</strong>
			<div class="t-sub">{d.city} · {d.category}</div>
			<div><strong>{fmtInt(d.pop_500m)}</strong> people within 500 m</div>
			<div>{fmtAcres(d.area_acres)} · {d.owner}{d.owner_name && d.owner_name !== d.owner ? ` (${d.owner_name})` : ''}</div>
		</div>
	{/if}

	<div class="note top" class:on={show && emphasis === 'top10' && layout === 'size'}>
		<strong>The ten largest spaces</strong> (outlined) hold <strong>{Math.round(model.top10Share * 100)}%</strong> of all the public space area.
	</div>
	<div class="note pair" class:on={show && emphasis === 'pair'}>
		<strong>{model.small.name}</strong> is accessible to more than {Math.floor(model.small.pop_500m / 1000)} thousand people,
		almost as many as <strong>{model.big.name}</strong>, which is {model.times} times larger.
	</div>

	<div class="legend">
		<span class="lgt">Color = type</span>
		{#each GROUPS as g (g.key)}
			<button class="chip" class:off={hiddenGroups.has(g.key)} aria-pressed={!hiddenGroups.has(g.key)} onclick={() => toggle(g.key)}>
				<svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" class="dot public" style:--c={g.css} /></svg>{g.label}
			</button>
		{/each}
		<span class="lg"><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" class="dot private" style:--c="var(--ink-2)" /></svg>Hollow = private or nonprofit, open to the public</span>
		<span class="lg">
			Dot area = area of the space (the smallest are enlarged to stay visible)
			<svg width="96" height="42" aria-hidden="true">
				{#each [1, 10, 100] as ac, i (ac)}
					<circle cx={14 + i * 32} cy="21" r={model.r(ac * 4046.86)} class="size" />
				{/each}
			</svg>
			1 · 10 · 100 ac
		</span>
	</div>
</div>

<style>
	.wrap { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; gap: 6px; }
	svg { width: 100%; flex: 1; min-height: 0; display: block; }
	.status { margin: 0; font-size: 0.82rem; color: var(--ink-2); }
	.axis { opacity: 0; transition: opacity 0.8s ease; }
	.axis.on { opacity: 1; }
	.grid { stroke: var(--line); stroke-width: 1; }
	.sep { stroke: var(--line); stroke-width: 1; }
	.median line { stroke: var(--ink-3); stroke-width: 1; stroke-dasharray: 3 3; }
	.tick { fill: var(--ink-3); font-size: 12px; }
	.title { fill: var(--ink-2); font-size: 13px; }
	.row-label { fill: var(--ink); font-size: 16px; font-weight: 700; font-family: var(--font-title); }
	.row-sub { fill: var(--ink-3); font-size: 11.5px; }
	.dot { transition: transform 1.6s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.6s ease; stroke-width: 1.2; }
	.dot.public { fill: var(--c); stroke: var(--surface); fill-opacity: 0.85; }
	.dot.private { fill: var(--surface); stroke: var(--c); stroke-width: 1.6; }
	.dot.unknown { fill: var(--c); fill-opacity: 0.35; stroke: var(--c); stroke-width: 1; }
	.dot.top { stroke: var(--ink); stroke-width: 2.4; }
	.dot.mute { opacity: 0.22; }
	.dot.off { opacity: 0.04; }
	.dot.hover { stroke: var(--ink); stroke-width: 2.5; }
	.hl { transition: transform 1.6s cubic-bezier(0.65, 0, 0.35, 1); pointer-events: none; }
	.hl .dot { transition: none; }
	.ring { fill: none; stroke: var(--ink); stroke-width: 2.5; }
	.label {
		fill: var(--ink); font-size: 13px; font-weight: 700; paint-order: stroke; stroke: var(--surface);
		stroke-width: 4px; stroke-linejoin: round;
	}
	.tip {
		position: absolute; pointer-events: none; z-index: 3; width: max-content; max-width: 260px; padding: 8px 10px;
		background: var(--surface); color: var(--ink); border: 1px solid var(--line); border-radius: 8px;
		box-shadow: 0 4px 14px rgb(0 0 0 / 0.15); font-size: 0.8rem; line-height: 1.35;
	}
	.t-sub { color: var(--ink-2); }
	.note {
		position: absolute; top: 34px; right: 12px; width: 300px; padding: 12px 14px; font-size: 0.92rem; line-height: 1.4;
		background: var(--surface); border: 1px solid var(--line); border-radius: 10px; opacity: 0; transition: opacity 0.6s ease;
		pointer-events: none;
	}
	.note.on { opacity: 1; }
	.legend { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; font-size: 0.8rem; color: var(--ink-2); padding: 0 4px; }
	.lgt { font-weight: 700; color: var(--ink); }
	.lg { display: inline-flex; align-items: center; gap: 6px; }
	.lg svg, .chip svg { width: auto; display: inline-block; flex: none; }
	.chip { display: inline-flex; align-items: center; gap: 6px; font: inherit; color: inherit; padding: 3px 9px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); cursor: pointer; }
	.chip.off { opacity: 0.45; }
	.chip.off svg { filter: grayscale(1); }
	.legend .dot { transition: none; }
	.size { fill: none; stroke: var(--ink-2); stroke-width: 1.2; }
	@media (prefers-reduced-motion: reduce) {
		.dot, .hl, .axis, .note { transition: none; }
	}
</style>
