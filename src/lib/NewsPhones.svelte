<script>
	import { asset } from '$app/paths';
	import { fmtAcres, fmtInt } from './format.js';

	// Four phone-style screenshots, one per place. They enter one at a time as `progress` (0 to 1 across the scene)
	// grows; the question enters last. Sizes come from the dataset.
	let { spaces, progress = 0 } = $props();

	const CASES = [
		{
			name: 'Copley Square', city: 'Boston', img: 'copley.jpg', source: 'WBUR', date: 'May 2025',
			url: 'https://www.wbur.org/news/2025/05/09/speck-copley-concerete-grass-trinity-church',
			alt: 'WBUR article: Copley Square’s redesign has stirred controversy, but a prominent urban designer urges patience'
		},
		{
			name: 'City Hall Plaza', city: 'Boston', img: 'city-hall.jpg', source: 'Boston 25 News', date: 'June 2019',
			url: 'https://www.boston25news.com/news/some-residents-less-than-impressed-with-city-hall-plaza-renovation-plans/955685085/',
			alt: 'Boston 25 News article: some residents less than impressed with City Hall Plaza renovation plans'
		},
		{
			name: 'Harvard Square', city: 'Cambridge', img: 'harvard-square.jpg', source: 'Harvard Crimson', date: 'April 2026',
			url: 'https://www.thecrimson.com/article/2026/4/6/kiosk-city-council-questioning/',
			alt: 'Harvard Crimson article: City Council says Harvard Square kiosk has not met expectations nearly a year after reopening'
		},
		{
			name: 'Central Square (Carl Barron Plaza)', lookup: 'Carl Barron Plaza', city: 'Cambridge', img: 'central-square.jpg',
			source: 'Reddit, r/CambridgeMA', date: '',
			url: 'https://www.reddit.com/r/CambridgeMA/comments/1t5dw6k/the_horror_that_is_central_square_construction/',
			alt: 'Reddit post in r/CambridgeMA: The horror that is Central Square construction and the new ribbon, which is already rusting'
		}
	];

	const cases = $derived(
		CASES.map((c) => {
			const f = spaces.features.find((f) => f.properties.name === (c.lookup ?? c.name) && f.properties.city === c.city);
			return { ...c, acres: f.properties.area_acres, people: f.properties.pop_500m };
		})
	);
	const START = 0.06;
	const GAP = 0.1;
	const shown = (i) => progress >= START + i * GAP;
	const asking = $derived(progress >= START + cases.length * GAP + 0.05);
</script>

<div class="wrap">
	<ul class="phones">
		{#each cases as c, i (c.name)}
			<li class="phone" class:on={shown(i)}>
				<a href={c.url} target="_blank" rel="noreferrer" aria-label="Read the source: {c.source}">
					<img src={asset(`news/${c.img}`)} alt={c.alt} />
				</a>
				<p class="name">{c.name}</p>
				<p class="src">{c.source}{c.date ? ` · ${c.date}` : ''}</p>
				<p class="chip">{fmtAcres(c.acres)} · {fmtInt(c.people)} people within 500 m</p>
			</li>
		{/each}
	</ul>
	<p class="ask" class:on={asking}>Why care about these spaces when Boston is known for its big parks?</p>
</div>

<style>
	.wrap { width: 100%; display: flex; flex-direction: column; gap: 40px; }
	.phones { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; align-items: start; }
	.phone { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
	.phone.on { opacity: 1; transform: none; }
	img {
		display: block; width: 100%; height: auto; aspect-ratio: 560 / 644; object-fit: cover; object-position: top;
		border: 5px solid #1c1c1b; border-radius: 28px; background: #fff; box-shadow: 0 8px 24px var(--shadow);
	}
	.name { margin: 10px 0 0; font-family: var(--font-title); font-weight: 700; font-size: 1rem; line-height: 1.2; }
	.src { margin: 2px 0 0; color: var(--ink-2); font-size: 0.78rem; }
	.chip {
		display: inline-block; margin: 6px 0 0; padding: 3px 9px; font-size: 0.74rem; line-height: 1.3; color: var(--ink-2);
		border: 1px solid var(--line); border-radius: 10px; background: var(--surface);
	}
	.ask {
		margin: 0; max-width: 28ch; font-family: var(--font-title); font-weight: 700; font-size: 2rem; line-height: 1.2; text-wrap: balance;
		opacity: 0; transform: translateY(16px); transition: opacity 0.7s ease, transform 0.7s ease;
	}
	.ask.on { opacity: 1; transform: none; }
	@media (prefers-reduced-motion: reduce) { .phone, .ask { transition: none; transform: none; } }
</style>
