<script>
	import { fmtInt } from './format.js';

	// One stacked bar: residents split by the size of the public space nearest to home.
	// `fill` (0 to 1) reveals the bar from left to right; labels appear as each part is revealed.
	// `show` brings in the highlight (the bracket) once the bar is complete.
	let { stats, fill = 1, show = false } = $props();

	const W = 900;
	const H = 340;
	const X0 = 30;
	const BW = W - 2 * X0;
	const BAR = { y: 130, h: 74 };
	const TONES = ['var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)'];
	const DARK_TEXT = [true, true, false, false];
	const pct = (v) => Math.round(v * 100);

	const parts = $derived.by(() => {
		let acc = 0;
		return stats.nearest.map((c, i) => {
			const x = X0 + acc * BW;
			const w = c.share * BW;
			acc += c.share;
			return { ...c, x, w, end: x + w, tone: TONES[i], dark: DARK_TEXT[i] };
		});
	});
	const revealed = $derived(X0 + fill * BW);
	const done = (end) => revealed >= end - 1;

	// the one figure the bar does not show directly: the first two parts together
	const bracket = $derived({ from: parts[0].x, to: parts[1].end, y: 252, head: `${pct(stats.under5)}%`, text: 'Two in three residents: the nearest space is under 5 acres', end: parts[1].end });
</script>

<svg viewBox="0 0 {W} {H}" role="img" aria-label="Stacked bar of residents by the size of the public space nearest to home: {stats.nearest.map((c) => `${c.label} ${pct(c.share)} percent`).join(', ')}. Two in three have a nearest space under 5 acres.">
	<defs>
		<clipPath id="nearest-reveal"><rect x="0" y="0" width={revealed} height={H} /></clipPath>
	</defs>

	<text class="head" x={X0} y="36">Residents, by the size of the public space nearest to home</text>
	<text class="sub" x={X0} y="58">{fmtInt(stats.residents)} residents of Boston, Cambridge and Somerville · 2020 census</text>

	<g clip-path="url(#nearest-reveal)">
		{#each parts as p (p.key)}
			<rect x={p.x} y={BAR.y} width={p.w} height={BAR.h} fill={p.tone} stroke="var(--surface)" stroke-width="2" />
		{/each}
	</g>

	{#each parts as p (p.key)}
		<g class="lab" class:on={done(p.end)}>
			<text class="cat" x={p.x + p.w / 2} y={BAR.y - 12} text-anchor="middle">{p.label}</text>
			<text class="pct" x={p.x + p.w / 2} y={BAR.y + BAR.h / 2 + 10} text-anchor="middle" style:fill={p.dark ? 'var(--ink)' : 'var(--surface)'}>{pct(p.share)}%</text>
		</g>
	{/each}

	<g class="br" class:on={show && done(bracket.end)}>
		<path class="bracket" d="M{bracket.from + 2} {BAR.y + BAR.h + 14} V{bracket.y} H{bracket.to - 2} V{BAR.y + BAR.h + 14}" />
		<text class="bhead" x={bracket.from} y={bracket.y + 32}>{bracket.head}</text>
		<text class="btext" x={bracket.from + 70} y={bracket.y + 31}>{bracket.text}</text>
	</g>

	<text class="foot" x={X0} y={H - 6}>Straight-line distance from the center of each census block to the closest public space.</text>
</svg>

<style>
	svg { width: 100%; height: auto; display: block; }
	.head { fill: var(--ink); font-family: var(--font-title); font-weight: 700; font-size: 20px; }
	.sub { fill: var(--ink-2); font-size: 13px; }
	.cat { fill: var(--ink-2); font-size: 13px; }
	.pct { font-family: var(--font-title); font-weight: 700; font-size: 26px; }
	.lab, .br { opacity: 0; transition: opacity 0.5s ease; }
	.lab.on, .br.on { opacity: 1; }
	.bracket { fill: none; stroke: var(--ink-2); stroke-width: 1.6; }
	.bhead { fill: var(--ink); font-family: var(--font-title); font-weight: 700; font-size: 26px; }
	.btext { fill: var(--ink-2); font-size: 16px; }
	.foot { fill: var(--ink-2); font-size: 12px; }
	@media (prefers-reduced-motion: reduce) { .lab, .br { transition: none; } }
</style>
