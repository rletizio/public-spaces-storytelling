# Public Spaces Storytelling

A scrolling data story about parks, plazas and squares in Boston, Cambridge and Somerville (CS171 visualization project). Built with SvelteKit, D3 and Scrollama. It builds on visualizations first made for a set of dashboards, shown here one at a time.

**Live site:** https://rletizio.github.io/public-spaces-storytelling/

The story's structure, texts and technical specification are in `prompt/Storytelling Structure.md`.

## Run locally

```bash
npm ci
npm run dev        # http://localhost:5173
npm run build      # static site in ./build
```

## Data

The app reads only the small, processed files in `static/data/` (`spaces.geojson`, `boundaries.geojson`,
`water.geojson`, `spaces.csv`; see `static/data/README.md` for the fields). They are produced by
`scripts/preprocess_spaces.py` from MassGIS (open space, census blocks, town boundaries, hydrography)
and the Boston, Cambridge and Somerville open-space layers. The raw source files are large and are not in this
repository; the script needs them in `prompt/data/` and Python with `geopandas`.

Rules used to build the dataset: usable public spaces only (cemeteries, conservation land, school grounds other than Somerville schoolyards and libraries and MIT open spaces,
water supply and flood control land are excluded); MassGIS is the primary source, completed with municipal
data; people within 500 m are 2020 census block populations weighted by the share of each block inside a
500 m buffer of the space (straight-line distance).

## Page structure

One route (`/`) holds the whole story: a sticky stage plus one Scrollama step per scene. Step texts are in `src/lib/story/steps.js`; each visualization is a component in `src/lib/` that receives the active scene from the page.

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the static site with
`BASE_PATH=/public-spaces-storytelling` and publishes it to GitHub Pages.

Basemap © OpenStreetMap contributors.
