<script>
	// Full-stage text scenes. kind 'journey': the title that replaces the phones (scene 2).
	// 'quote': William Whyte's closing passage over the faded map (scene 11).
	// 'close': Know. Care. Expand. with a way back to the map (scene 12). `on` is true while the scene is active.
	let { kind, on = false, onexplore = () => {} } = $props();

	const COLUMNS = [
		{ word: 'Know', text: 'the small places near you: they are mapped, they are used, and they are in reach.' },
		{ word: 'Care', text: 'about how they are designed and kept, because people already do.' },
		{ word: 'Expand', text: 'where many people share few, pressing the cities to reclaim unused or car space for the people in the area.' }
	];
</script>

<div class="stage-text {kind}" class:on>
	{#if kind === 'journey'}
		<h2>A journey through the Boston-area public spaces</h2>
		<p class="callout">We investigate the relationship of the cities with their parks, plazas and squares.</p>
	{:else if kind === 'quote'}
		<figure>
			<span class="mark open" aria-hidden="true">“</span>
			<blockquote>
				<p>
					I end then in praise of <mark class="g" style="--d: 1s">small spaces</mark>. The
					<mark class="o" style="--d: 1.6s">multiplier effect is tremendous</mark>. It is not just the number of people using them,
					but the larger number who pass by and enjoy them vicariously, or even the larger number who feel better about the city
					center for knowledge of them. For a city, such places are <mark class="o" style="--d: 2.2s">priceless, whatever the cost</mark>.
					They are built of a set of basics and they are <mark class="b" style="--d: 2.8s">right in front of our noses</mark>. If we will look.
				</p>
			</blockquote>
			<span class="mark close" aria-hidden="true">”</span>
			<figcaption>William H. Whyte, <cite>The Social Life of Small Urban Spaces</cite> (1980)</figcaption>
		</figure>
	{:else}
		<h2>Know. Care. Expand.</h2>
		<div class="cols">
			{#each COLUMNS as c, i (c.word)}
				<div class="col" style:--d="{0.3 + i * 0.5}s">
					<p class="word">{c.word}</p>
					<p>{c.text}</p>
				</div>
			{/each}
		</div>
		<button class="again" style:--d="1.9s" onclick={onexplore} tabindex={on ? 0 : -1}>↑ Explore again</button>
	{/if}
</div>

<style>
	.stage-text { max-width: 880px; padding: 0 32px; opacity: 0; transform: translateY(14px); transition: opacity 0.8s ease, transform 0.8s ease; pointer-events: none; }
	.stage-text.on { opacity: 1; transform: none; }
	.stage-text.on :global(button) { pointer-events: auto; }
	h2 { font-family: var(--font-title); font-weight: 700; font-size: clamp(2.2rem, 4.2vw, 3.4rem); line-height: 1.1; margin: 0; text-wrap: balance; }
	.journey { text-align: center; }
	.callout { margin: 18px auto 0; max-width: 34ch; font-size: 1.25rem; color: var(--ink-2); }

	.quote { max-width: 860px; text-align: center; }
	figure {
		margin: 0; display: flex; flex-direction: column; align-items: center; padding: 28px 40px 24px;
		background: color-mix(in srgb, var(--surface) 92%, transparent); border: 1px solid var(--line); border-radius: 14px;
	}
	blockquote { margin: 0; }
	blockquote p {
		margin: 0; font-family: var(--font-body);
		font-size: clamp(1.05rem, 1.45vw, 1.3rem); line-height: 1.6; color: var(--ink); text-wrap: balance;
		opacity: 0; transition: opacity 0.9s ease 0.3s;
	}
	.quote.on blockquote p { opacity: 1; }
	.mark { font-family: Georgia, 'Times New Roman', serif; font-weight: 700; font-size: 3.6rem; line-height: 0.8; color: var(--ink); opacity: 0; transition: opacity 0.8s ease; }
	.mark.open { margin-bottom: 10px; }
	.mark.close { margin-top: 18px; height: 1.9rem; }
	.quote.on .mark { opacity: 1; }
	mark {
		color: inherit; padding: 0.02em 0.28em; margin: 0 -0.12em; border-radius: 0.14em;
		background: linear-gradient(var(--c), var(--c)) no-repeat left center / 0% 100%;
		-webkit-box-decoration-break: clone; box-decoration-break: clone;
		transition: background-size 0.9s ease var(--d);
	}
	.quote.on mark { background-size: 100% 100%; }
	mark.g { --c: color-mix(in srgb, var(--seq-2) 75%, transparent); }
	mark.o { --c: color-mix(in srgb, var(--pp-2) 65%, transparent); }
	mark.b { --c: color-mix(in srgb, var(--accent-soft) 85%, transparent); }
	figcaption { margin-top: 14px; font-size: 0.92rem; color: var(--ink-2); opacity: 0; transition: opacity 0.8s ease 1.2s; }
	.quote.on figcaption { opacity: 1; }

	.close { text-align: center; max-width: 980px; }
	.cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin-top: 36px; text-align: left; }
	.col { padding: 20px 22px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; opacity: 0; transform: translateY(16px); transition: opacity 0.7s ease var(--d), transform 0.7s ease var(--d); }
	.close.on .col { opacity: 1; transform: none; }
	.col p { margin: 0; line-height: 1.55; }
	.word { font-family: var(--font-title); font-weight: 700; font-size: 1.7rem; color: var(--seq-4); margin-bottom: 6px !important; }
	.again {
		margin-top: 32px; padding: 10px 20px; font: inherit; font-weight: 600; color: var(--surface); background: var(--ink);
		border: 0; border-radius: 999px; cursor: pointer; opacity: 0; transition: opacity 0.7s ease var(--d);
	}
	.close.on .again { opacity: 1; }
	.again:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
	@media (prefers-reduced-motion: reduce) { .stage-text, .col, .again, blockquote p, .mark, mark, figcaption { transition: none; transform: none; } }
</style>
