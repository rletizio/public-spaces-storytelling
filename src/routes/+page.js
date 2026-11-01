import { asset } from '$app/paths';

// Data shared by the story's visualizations, loaded once.
export async function load({ fetch }) {
	const get = (name) => fetch(asset(`data/${name}.geojson`)).then((r) => r.json());
	const [spaces, boundaries, water, grid] = await Promise.all([get('spaces'), get('boundaries'), get('water'), get('grid')]);
	const story = await fetch(asset('data/story.json')).then((r) => r.json());
	return { spaces, boundaries, water, grid, story };
}
