// Geometry helpers shared by the story map. They mirror the logic inside SpaceMap.svelte (Dashboard 1),
// which keeps its own copy so the dashboards stay untouched.
import * as d3 from 'd3';
import { groupOf } from './colors.js';

export const ACCESS_M = 500;

export function buildModel(spaces, boundaries, W, H, pad = 24) {
	const proj = d3.geoMercator().fitExtent(
		[
			[pad, pad],
			[W - pad, H - pad]
		],
		boundaries
	);
	const path = d3.geoPath(proj);
	// 500 m expressed in "world" pixels (the map's unzoomed coordinate system).
	const lat0 = 42.355;
	const dlon = ACCESS_M / (111320 * Math.cos((lat0 * Math.PI) / 180));
	const r0 = Math.abs(proj([-71.09 + dlon, lat0])[0] - proj([-71.09, lat0])[0]);

	const feats = spaces.features.map((f) => {
		const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
		const [[x0, y0], [x1, y1]] = path.bounds(f);
		return {
			id: f.properties.id,
			p: f.properties,
			group: groupOf(f.properties.category),
			d: path(f),
			rings: polys.map((poly) => poly[0].map((c) => proj(c))),
			bbox: [x0, y0, x1, y1],
			at: proj([f.properties.lon, f.properties.lat])
		};
	});
	return {
		proj,
		scale: proj.scale(),
		r0,
		feats,
		byId: new Map(feats.map((f) => [f.id, f])),
		boundaryD: path(boundaries)
	};
}

function segDist(px, py, a, b) {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const l2 = dx * dx + dy * dy;
	let u = l2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / l2 : 0;
	u = Math.max(0, Math.min(1, u));
	return Math.hypot(px - (a[0] + u * dx), py - (a[1] + u * dy));
}

/** The space under (x, y), or else the nearest one within `snap` world px. */
export function findSpace(feats, x, y, snap) {
	let best = null;
	let bestD = Infinity;
	for (const f of feats) {
		const [x0, y0, x1, y1] = f.bbox;
		if (x < x0 - snap || x > x1 + snap || y < y0 - snap || y > y1 + snap) continue;
		let inside = false;
		let d = Infinity;
		for (const ring of f.rings) {
			if (!inside && d3.polygonContains(ring, [x, y])) inside = true;
			for (let i = 1; i < ring.length; i++) d = Math.min(d, segDist(x, y, ring[i - 1], ring[i]));
		}
		if (inside) d = -f.p.area_m2; // containing spaces win; smallest container first
		if (d < bestD && (inside || d <= snap)) {
			best = f;
			bestD = d;
		}
	}
	return best;
}

/** OpenStreetMap raster tiles covering the view, positioned in screen pixels. */
export function tilesFor(model, t, W, H) {
	const K = model.scale * t.k;
	const z = Math.max(0, Math.min(19, Math.round(Math.log2((2 * Math.PI * K) / 256) + 0.35)));
	const n = 2 ** z;
	const [wx0, wy0] = t.invert([0, 0]);
	const [wx1, wy1] = t.invert([W, H]);
	const [lon0, lat0] = model.proj.invert([wx0, wy0]);
	const [lon1, lat1] = model.proj.invert([wx1, wy1]);
	const tx = (lon) => Math.floor(((lon + 180) / 360) * n);
	const ty = (lat) => {
		const r = (lat * Math.PI) / 180;
		return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
	};
	const nw = (x, y) => [
		(x / n) * 360 - 180,
		(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI
	];
	const out = [];
	for (let x = Math.max(0, tx(lon0)); x <= Math.min(n - 1, tx(lon1)); x++) {
		for (let y = Math.max(0, ty(lat0)); y <= Math.min(n - 1, ty(lat1)); y++) {
			const a = t.apply(model.proj(nw(x, y)));
			const b = t.apply(model.proj(nw(x + 1, y + 1)));
			out.push({
				key: `${z}/${x}/${y}`,
				href: `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
				x: a[0],
				y: a[1],
				w: b[0] - a[0] + 0.7,
				h: b[1] - a[1] + 0.7
			});
		}
	}
	return out.length > 48 ? [] : out;
}
