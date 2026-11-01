<script>
	import { fmtInt } from './format.js';

	// One stacked bar: residents split by the size of the public space nearest to home.
	// `fill` (0 to 1) reveals the bar from left to right; labels appear as each part is revealed.
	let { stats, fill = 1 } = $props();

	const W = 900;
	const H = 420;
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

	// brackets under the bar: which parts they span, and the words that go with them
	const brackets = $derived([
		{ from: parts[0].x, to: parts[0].end, y: 252, head: `${pct(parts[0].share)}%`, text: 'Nearly half: the nearest is under 1 acre', end: parts[0].end },
		{ from: parts[0].x, to: parts[1].end, y: 332, head: `${pct(stats.under5)}%`, text: 'Two in three: the nearest is under 5 acres', end: parts[1].end },
		{ from: parts[3].x, to: parts[3].end, y: 252, head: `${pct(parts[3].share)}%`, text: 'One in five: a park of 10 acres or more', end: parts[3].end, anchor: 'end' }
	]);
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

	{#each brackets as b (b.text)}
		<g class="br" class:on={done(b.end)}>
			<path class="bracket" d="M{b.from + 2} {BAR.y + BAR.h + 14} V{b.y} H{b.to - 2} V{BAR.y + BAR.h + 14}" />
			<text class="bhead" x={b.anchor === 'end' ? b.to : b.from} y={b.y + 28} text-anchor={b.anchor ?? 'start'}>{b.head}</text>
			<text class="btext" x={b.anchor === 'end' ? b.to : b.from} y={b.y + 48} text-anchor={b.anchor ?? 'start'}>{b.text}</text>
		</g>
	{/each}

	<text class="foot" x={X0} y={H - 6}>Straight-line distance from the center of each census block to the closest public space.</text>
</svg>

<style>
	svg { width: 100%; height: auto; display: block; }
	.head { fill: var(--ink); font-family: var(--font-title); font-weight: 700; font-size: 20px; }
	.sub { fill: var(--ink-3); font-size: 13px; }
	.cat { fill: var(--ink-2); font-size: 13px; }
	.pct { font-family: var(--font-title); font-weight: 700; font-size: 26px; }
	.lab, .br { opacity: 0; transition: opacity 0.5s ease; }
	.lab.on, .br.on { opacity: 1; }
	.bracket { fill: none; stroke: var(--ink-2); stroke-width: 1.6; }
	.bhead { fill: var(--ink); font-family: var(--font-title); font-weight: 700; font-size: 26px; }
	.btext { fill: var(--ink-2); font-size: 14px; }
	.foot { fill: var(--ink-3); font-size: 12px; }
	@media (prefers-reduced-motion: reduce) { .lab, .br { transition: none; } }
</style>
