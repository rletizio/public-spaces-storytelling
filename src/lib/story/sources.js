// Sources and method for each scene, shown in a strip at the bottom of the stage while the scene is active.
// Keys match the scene ids in steps.js. `links` open in a new tab.
const SPACES =
	'836 public spaces in Boston, Cambridge and Somerville: MassGIS open space completed with the three cities’ open-space layers. Cemeteries, conservation land, water-supply and flood-control land are excluded, and so are school grounds, except Somerville’s schoolyards and libraries and MIT’s open spaces (Boston and Cambridge schoolyards are mostly closed to the public).';
const NEAR =
	'Population: 2020 census blocks. Distances are straight-line, from each block’s representative point to the border of a space, not walking routes.';

export const sources = {
	news: {
		data: 'Articles and a post as published (cropped screenshots): WBUR, May 2025; Boston 25 News, June 2019; Harvard Crimson, April 2026; Reddit r/CambridgeMA. Each picture links to its source.',
		method: 'Acres come from the space’s outline. Residents within 500 m are 2020 census block populations weighted by the share of each block inside a 500 m buffer of the space.'
	},
	journey: {
		data: SPACES,
		method: 'The study area is the three cities’ boundaries.'
	},
	everyone: {
		data: 'Share of the 875,095 residents (2020 census) who live within 500 m of the nearest public space.',
		method: `${NEAR} 500 m is about a six-minute walk.`
	},
	closest: {
		data: 'The 836 public spaces described in scene 2. Basemap © OpenStreetMap contributors.',
		method: 'The grey halo is a 500 m buffer around the space under the cross. The card counts the residents inside it, as described in scene 1.'
	},
	small: {
		data: 'Size of the public space nearest to each census block, weighted by the block’s 2020 population.',
		method: `${NEAR} Each resident is counted once, for their nearest space. The 5 to 10 acre share is the remainder. Computed by scripts/story_stats.py.`
	},
	order: {
		data: 'Area of each space’s outline, in acres. The ten largest spaces’ share is of the total area of the 836 spaces.',
		method: 'Dot area is proportional to the space’s area; the smallest dots are enlarged to stay visible. The horizontal axis is logarithmic. Spaces are grouped by the city they are in.'
	},
	access: {
		data: 'People within 500 m: 2020 census blocks weighted by the share of each block inside a 500 m buffer of the space. Area and size ratio from the spaces’ outlines.',
		method: 'The rank correlation between a space’s area and the people near it is about 0.02. Christian Science Plaza is owned by a nonprofit institution and open to the public.'
	},
	history: {
		data: 'Acquisition years come from Boston records and exist only for some Boston spaces; undated spaces, including Jamaica Pond, are in the hatched bar and not in the timeline. Cambridge and Somerville have no such records here.',
		method: 'Emerald Necklace parks with a year: Franklin Park and its zoo, Arnold Arboretum, Back Bay Fens, Olmsted Park and the Riverway. Park Act (1875) and Olmsted’s hiring (1878) from the National Park Service.',
		links: [{ label: 'National Park Service: the Emerald Necklace', url: 'https://www.nps.gov/articles/the-emerald-necklace-boston-s-green-connection.htm' }]
	},
	people: {
		data: 'A grid of 500 m cells; each cell’s residents are the 2020 census blocks split by the share of each block inside the cell.',
		method: 'Residents per acre counts the cell and its eight neighbours (about 1.5 km square) against the public space in them. “Downtown” is the center of Boston Common; south and southwest are approximate compass sectors.'
	},
	priority: {
		data: 'Priority cells: 1,000 or more residents per acre of public space (cell and neighbours) and no space of 10 acres or more within 1,000 m of the cell center.',
		method: 'Straight-line distances. The shares are of each city’s residents. Counting residents only understates the use of places near downtown. Boston and Cambridge school grounds are not counted.'
	},
	whyte: {
		data: 'William H. Whyte, The Social Life of Small Urban Spaces (1980). The map behind is the priority map from the previous scene.',
		method: ''
	},
	close: {
		data: 'Know, care and expand are this project’s recommendations, not results of the data.',
		method: ''
	}
};
