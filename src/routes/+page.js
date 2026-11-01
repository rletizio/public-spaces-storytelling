import { asset } from '$app/paths';

// Data shared by the story's visualizations, loaded once.
export async function load({ fetch }) {
	const get = (name) => fetch(asset(`data/${name}.geojson`)).then((r) => r.json());
	const [spaces, boundaries, water] = await Promise.all([get('spaces'), get('boundaries'), get('water')]);
	return { spaces, boundaries, water };
}
