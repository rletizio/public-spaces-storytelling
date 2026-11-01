# Storytelling Structure

Technical specification and storyboard for **Public Spaces Storytelling**, the scrolling data story about parks, plazas and squares in Boston, Cambridge and Somerville.

Status: draft v1, reviewed with the project owner. Everything marked **[check]** has to be verified while building. Everything marked **[corrected]** differs from the text in `Milestone 8 - Prototype I.docx` because the data said otherwise.

---

## 1. The story in one paragraph

Small, everyday public spaces (plazas, squares, pocket parks) are where public debates happen, and they are what most residents live next to. Boston is known for its big parks, but those parks are unevenly within reach, and in some parts of the area many people share very few acres. So the small places deserve to be known, designed and cared for, starting where many people share few.

Message structure: **hook** (scenes 1 to 4), **rising insights** (5 to 8), **main message** (9 and 10), **close** (11 and 12).

---

## 2. Technical specification

### 2.1 Stack

| Layer | Choice |
|---|---|
| Framework | SvelteKit with Svelte 5 (runes mode), static output through `@sveltejs/adapter-static` |
| Charts and maps | D3 v7 (`d3`, `d3-sankey`), drawn as SVG |
| Scroll structure | Scrollama 3.2.0 (`scrollama`) |
| Hosting | GitHub Pages, deployed by GitHub Actions on every push to `main` |
| Repository | `rletizio/public-spaces-storytelling` (public) |
| Live site | `https://rletizio.github.io/public-spaces-storytelling/` |
| Preprocessing | Python (geopandas, pyogrio), scripts in `scripts/`, outputs in `static/data/` |
| Target | Desktop only (viewport width 1100 px or more). No mobile layout for now. |

The base path comes from the `BASE_PATH` environment variable, set by the deploy workflow to `/<repository name>`. All data requests go through SvelteKit's `asset()` helper so they work under that path.

### 2.2 Page architecture

One route (`/`) holds the whole story. The page is a single scrolly block:

```
<main>
  <section class="story">
    <div class="stage">            // position: sticky; top: 0; height: 100vh
      <Scene1 /> ... <Scene12 />   // layers stacked in the same box, shown by activeStep
    </div>
    <div class="steps">            // normal flow, one .step per scene, min-height 100vh
      <article class="step" data-step="0"> text card </article>
      ...
    </div>
  </section>
</main>
```

Scrollama pattern:

- Created in `onMount` with a dynamic `import('scrollama')`, destroyed in the cleanup function.
- `scroller.setup({ step: '.step', offset: 0.6, progress: true })`.
- `onStepEnter({ index, direction })` sets `activeStep` (a `$state` value). `onStepProgress({ index, progress })` sets `stepProgress`, used by scenes with a continuous animation (scene 5 fill).
- Each scene component receives `step` (the active index), `progress` and `direction` as props and decides what to draw. Scenes never read the scroll position themselves.
- Scene transitions use D3 transitions for marks (position, size, opacity) and CSS opacity for whole layers. Durations 600 to 1,200 ms. Everything respects `prefers-reduced-motion` (jump to the end state).
- Scenes 1 to 3 and 5 to 12 are non-interactive. **Scene 4 is the only interactive one**: drag and zoom the map, hover or click a space, as in Dashboard 1. The page does not capture scroll over the map except through a visible "scroll to continue" cue below it.
- A small "Explore again" button on scene 12 scrolls back to scene 4.

### 2.3 Visual components (one visualization at a time, not a dashboard)

The existing dashboards become standalone, controlless components that take their state from props. The dashboards stay available at `/dashboard-1`, `/dashboard-2`, `/dashboard-3` for reference.

| Component | Origin | Used in scenes | Changes needed |
|---|---|---|---|
| `SpaceMap.svelte` | Dashboard 1 | 3, 4, 5 (as faded background), 11 (faded background) | Props for zoom extent, interaction on or off, highlight set, opacity |
| `NearestBars.svelte` | New | 5 | Single stacked bar for nearest-space size classes, fills left to right with `progress` |
| `AccessPlot.svelte` | Dashboard 2 | 6, 7 | `xMode` prop (`size` then `access`), animated positions, highlight and callout for two spaces |
| `OwnershipTimeline.svelte` | Dashboard 2 | 8 | Boston only; highlight set for Emerald Necklace spaces |
| `GreenGrid.svelte` | Dashboard 3 | 9, 10 | `layer` prop (`space`, `people`, `ratio`), `priority` highlight, no controls |
| `PhoneClippings.svelte` | New | 1 | Four phone-style screenshots, see scene 1 |
| `Quote.svelte`, `Closing.svelte` | New | 11, 12 | Text layers over the faded map |

State and controls inside the components (selectors, legends with filters, tables) are removed or hidden in the story. Legends stay where a reader needs them to read the chart.

### 2.4 Data

Existing files in `static/data/`:

| File | Content |
|---|---|
| `spaces.geojson`, `spaces.csv` | 836 spaces: category, owner, year, area, residents and homes within 500 m, source |
| `grid.geojson` | 823 cells of 500 m with residents, public space, greenery, neighbour window, spaces inside |
| `boundaries.geojson`, `water.geojson` | City boundaries and water |

New file to produce: `static/data/story.json`, one small object with every number quoted in the text, computed by `scripts/story_stats.py` so the page never hard-codes a figure. Keys: `pct_within_500m`, `nearest_size_classes`, `top10_area_share`, `share_under_half_acre`, `rank_corr_area_access`, `plaza_vs_franklin`, `priority`, and so on (see section 3).

Raw source data stays in `prompt/data/` (not published). Other files in `prompt/` are course material; only this document is tracked in git.

### 2.5 Standard distances

| Use | Distance | Equivalent walk |
|---|---|---|
| Access to any public space (scene 3), residents near a space (scenes 6 and 7) | **500 m** | about 6 minutes |
| "Large park within reach" in the priority areas (scene 10) | **1,000 m** | about 12 minutes |

All distances are straight-line, not street network. Say so in a footnote on scenes 3 and 10.

### 2.6 Visual design

- Palettes carry over: one-hue green for public space and greenery, one-hue orange for residents per acre, blue for water. Tokens `--seq-1..5` and `--pp-1..5` in `src/app.css`.
- Story pages use a calm light background, with the dark variant kept from the tokens.
- Type: one serif for headlines, one sans for body, mono for chart labels.
- Text cards: left column, about 380 px wide, white card on a faint scrim so they stay readable over the stage.
- Every chart has a direct label for the key number, a visible legend where color encodes data, and a text alternative (`aria-label`) summarizing it.

### 2.7 Accessibility and quality

- Keyboard: Scene 4 map reachable by keyboard (zoom and pan buttons, spaces focusable).
- Motion: reduced-motion fallback described in 2.2.
- Contrast: text over map layers always on a card.
- Each statistic in the text is generated from `story.json`; a short "Sources and method" section at the end of the page lists data sources, the 500 m and 1,000 m definitions, the priority-area definition and known limits.

### 2.8 Deployment

- `.github/workflows/deploy.yml` builds with `BASE_PATH` set and publishes `build/` to GitHub Pages.
- `.gitignore` excludes `node_modules`, build output and `prompt/` (except this document).
- Cropped news screenshots are committed under `static/news/` (not the originals).

### 2.9 Build order

1. Scaffold: page, sticky stage, Scrollama steps, all 12 text cards, placeholders. Deploy.
2. Scenes 3 and 4 (map component refactor), then 11 and 12.
3. Scenes 5 and 6 and 7 (new bar, dot plot states).
4. Scene 8 (timeline highlight), then scenes 9 and 10 (grid layers).
5. Scene 1 (phone clippings), scene 2.
6. `story.json`, polish, text review, accessibility pass.

---

## 3. Storyboard

Texts below are the draft on-screen copy. Motion, visual and data notes follow each text.

### Scene 1. The news (Hook)

**Text:** Recently, Copley Square made the news. The newly renovated place, part of the shared image of Boston, got mixed judgments. But iconic and everyday places enter this kind of debate alike.

**Visual:** Four smartphone screenshots with rounded corners, side by side, each in a simple phone frame. Under each, the place name, source, and a small chip with its size and the residents within 500 m.

| # | Place | Source | Date | Chip |
|---|---|---|---|---|
| 1 | Harvard Square | Harvard Crimson | April 2026 | 0.24 acres, 7,976 residents within 500 m |
| 2 | City Hall Plaza | Boston 25 News | June 2019 | 5.29 acres, 14,435 |
| 3 | Copley Square | WBUR | May 2025 | 1.85 acres, 11,570 |
| 4 | Central Square (Carl Barron Plaza) | Reddit, r/CambridgeMA | about May 2026 | 0.17 acres, 10,880 |

Links: Crimson https://www.thecrimson.com/article/2026/4/6/kiosk-city-council-questioning/ , Boston 25 https://www.boston25news.com/news/some-residents-less-than-impressed-with-city-hall-plaza-renovation-plans/955685085/ , WBUR https://www.wbur.org/news/2025/05/09/speck-copley-concerete-grass-trinity-church , Reddit https://www.reddit.com/r/CambridgeMA/comments/1t5dw6k/the_horror_that_is_central_square_construction/

**Motion:** The phones enter one at a time. Then the phrase enters: "Why care about these spaces when Boston is known for its big parks?"

**Data and notes:**
- Source images in `prompt/screenshots/`. Crop each to its headline, byline and image. Credit each outlet. The Reddit username does not need to be hidden; do not reproduce the body text beyond what the cropped image shows.
- Sizes and residents come from `spaces.csv` (rows named Harvard Square, City Hall Plaza, Copley Square, Carl Barron Plaza). Two are small (under 0.25 acre); City Hall Plaza is the largest.
- The greenery layer likely predates the 2026 Copley reopening, so this scene uses size and residents only.

### Scene 2. The journey (Hook)

**Text:** A journey through the Boston-area public spaces. We look at how the cities relate to their parks, plazas and squares.

**Visual:** Title and call-out on a clean screen.

**Motion:** The title replaces the phone screenshots.

### Scene 3. Almost everyone (Rising)

**Text:** Almost everyone lives within a short walk of a public space. There are 836 parks, plazas, playgrounds and gardens across Boston, Cambridge and Somerville. **98% of residents live within 500 m of one** (about a six-minute walk). **[corrected: the 95% figure was for 400 m; 500 m gives 97.6%]**

**Visual:** Dashboard 1 map, zoomed out to show every public space in the three cities. No controls or interaction.

**Data:** Straight-line distance from census-block representative points (2020 population) to the nearest space. Share of population within 500 m. 400 m: 95.1%, 800 m: 99.7%, for reference.

### Scene 4. What is closest to you? (Rising, interactive)

**Text:** What is closest to you? This map contains all the public spaces in the area. Which ones do you pass every day? And which is the closest to your home?

**Visual:** Dashboard 1 map with interaction. No address search and no pin to place; the reader drags and zooms the map and inspects spaces as in Dashboard 1.

**Motion:** The map interface, instructions and data fade in, and interaction starts to work. A "scroll to continue" cue stays visible.

### Scene 5. Chances are, it is small (Rising)

**Text:** Chances are, it is small. For two in three residents, the nearest public space is under 5 acres. For nearly half, it is under one. For one in five, the nearest is a park of 10 acres or more.

**Visual:** New. One horizontal stacked bar of residents by the size of their nearest space: under 1 acre 47%, 1 to 5 acres 19%, 5 to 10 acres 13%, 10 acres or more 21%. The map behind fades to very light colors.

**Motion:** The map fades; the bar appears in front and fills left to right, tied to scroll progress.

**Data:** Nearest space to each census-block point, by area. 66% under 5 acres, 47% under 1 acre, 21% at 10 acres or more; the 5 to 10 acre share (13%) is the remainder. **[check]** that the numbers hold after the pipeline is rewritten into `story_stats.py`.

### Scene 6. Order by size (Rising)

**Text:** Let's order all the spaces in the area by size. The ten largest spaces hold 43% of all the public space area.

**Visual:** Dashboard 2 dot plot, x-axis organized by size.

**Motion:** The map and the bar fade out completely; the dot plot appears.

**Data:** Share of total area held by the 10 largest of the 836 spaces: 43%. **[check]**

### Scene 7. But size is not access (Rising)

**Text:** But size is not access. Half of all spaces are under half an acre, and how many people live near a space has almost nothing to do with how big it is.

**Visual:** The same dot plot, now with the x-axis organized by access (residents within 500 m).

**Motion:** The dots move gradually from their previous positions to the new ones.

**Highlight:** Christian Science Plaza and Franklin Park, with the callout: "Christian Science Plaza is accessible to more than 25 thousand people, almost as many as Franklin Park, which is 57 times larger." **[corrected: 56 became 57]**

**Data:**
- 51% of spaces are under 0.5 acre. Rank correlation between area and residents within 500 m is about 0.02.
- Christian Science Plaza: 6.98 acres, 25,408 residents within 500 m. Franklin Park: 396.7 acres, 26,395. Ratio 56.9.
- Christian Science Plaza is owned by a nonprofit/institution (category: Square, Plaza & Mall). Mention this in a note or tooltip so readers know it is privately owned public space.

### Scene 8. Why it looks like this, in Boston (Rising)

**Text:** About two thirds of the public space we can date in the city of Boston was created between 1875 and 1900. In 1875 the city passed a Park Act, and in 1878 it hired Frederick Law Olmsted to design a chain of large parks, the Emerald Necklace. The land for them lay in the newly annexed Roxbury and Dorchester, beyond the crowded peninsula. They were meant as an escape from city life and as a matter of public health, for the whole city. **[reworded to follow the National Park Service history]**

**Visual:** Dashboard 2 ownership timeline and flow, **Boston only**, labeled as such ("Cambridge and Somerville have their own histories").

**Highlight:** The Emerald Necklace spaces in the chart: Back Bay Fens, The Riverway, Olmsted Park (Muddy River), Jamaica Pond, Arnold Arboretum, Franklin Park. Boston Common (1634) and the Public Garden (1837) are older and are not part of the necklace. **[check]** that the dataset's year field matches these dates, and which of the highlighted spaces fall inside 1875 to 1900.

**How to frame it:**
- The necklace is a system of big parks planned for the whole city, as an escape and for health. It was not planned around the neighborhood next door. That is why scene 9 can say space does not follow people.
- Do not say the parks were a "buffer" or were placed to keep people out. The National Park Service text does not say that. It says the annexations of Roxbury (1867) and Dorchester (1869) provided land large enough, and that the city was crowded and dirty.
- Keep a caption that this is Boston's history, even though Cambridge and Somerville sit next door.
- Source: https://www.nps.gov/articles/the-emerald-necklace-boston-s-green-connection.htm . It gives dates and Olmsted's purposes, not visitor numbers or who used the parks, so do not claim outcomes.
- Also visible in the data: spaces of 25 acres or more are 55% State-owned by area, spaces under one acre are 67% City-owned.

### Scene 9. Public space does not follow people (Message)

**Text:** Public space does not follow people. Small spaces cluster near downtown Boston: about 21 spaces per square kilometer within 1.5 km of Boston Common, against about 4 beyond 8 km. The largest areas of public space lie south and southwest of downtown, around Franklin Park, the Arnold Arboretum and Stony Brook Reservation. Then population enters the map. Some parts of the area have fewer than 100 residents for every acre of public space. Others have more than 3,000. **[reworded after verification]**

**Visual:** Dashboard 3 grid map, circles sized by public space.

**Motion:** The grid first shows public space. Then population information is added, and the phrase about 100 and 3,000 residents enters.

**Verification of the original text:**
- "More densely closer to Boston downtown": true for the number of spaces (21, 17, 11, 10 and 4 spaces per km² in rings of 0 to 1.5, 1.5 to 3, 3 to 5, 5 to 8 and over 8 km from Boston Common). It is not true for the share of land: public space covers 14% of land within 1.5 km, 8% at 3 to 5 km and 14.5% at 5 to 8 km. The text says "small spaces" and "spaces" accordingly. The reference point is the center of Boston Common, an approximation of downtown. The "Charles harbor" part was not tested and is removed.
- "Biggest clusters in southwest Boston": true. 45% of Boston's public-space area lies in the southwest sector from the Common and 21% in the south sector, so about two thirds is south or southwest. 17 of the 20 cells with the most public space are south or southwest. They contain Franklin Park, Arnold Arboretum, Jamaica Pond and Stony Brook Reservation.
- "Fewer than 100 residents per acre": 139 cells (cell and its neighbours), 69 of them in the southwest. "More than 3,000": 41 cells, 39 in Boston and 2 in Cambridge, scattered across the east, north, south and southwest sectors, not only downtown.
- All counts use the cell and its eight neighbours (about 1.5 km square). Compass sectors are approximate. **[check]** neighborhood names before printing them.

### Scene 10. Where small spaces make the difference (Message)

**Text:** In these places, the small plazas and squares make the difference. **8% of residents (about 72,000 people)** live where each acre of public space is shared by more than 1,000 people and where no large park lies within 1,000 m. **[corrected: figure computed at 1,000 m]** By city: Somerville 27%, Cambridge 8%, Boston 7%.

**Visual:** Dashboard 3 grid map, circles for public space, color for residents per acre.

**Highlight:** Priority cells outlined.

**Definition (on screen, small):** A priority cell has 1,000 or more residents per acre of public space, counting the cell and its neighbours, and has no space of 10 acres or more within 1,000 m of the cell center.

**Data (1,000 m):** 64 cells, 71,673 residents, 8.2% of residents. Boston 50 cells (45,167 residents, 6.5% of Boston), Cambridge 4 cells (10,113 residents, 8.1%), Somerville 10 cells (16,393 residents, 27.1%). For comparison, at 800 m there were 101 cells and 15% of residents. **[check]**

Notes: "Large park" means a space of 10 acres or more. Boston and Cambridge school grounds are mostly closed to the public and are not counted; Somerville schoolyards and libraries are counted because they are open. Residents-only counts understate pressure around downtown.

### Scene 11. In praise of small spaces (Close)

**Text:** "I end then in praise of small spaces. The multiplier effect is tremendous. It is not just the number of people using them, but the larger number who pass by and enjoy them vicariously, or even the larger number who feel better about the city center for knowledge of them. For a city, such places are priceless, whatever the cost. They are built of a set of basics and they are right in front of our noses. If we will look." William H. Whyte, *The Social Life of Small Urban Spaces* (1980).

**Visual and motion:** The quote appears above the faded map.

**Note:** The year is 1980. Check the page number against the owner's copy.

### Scene 12. Know. Care. Expand. (Close)

**Text:** **Know** the small places near you: they are mapped, they are used, and they are in reach. **Care** about how they are designed and kept, because people already do. **Expand** where many people share few, pressing the cities to reclaim unused or car space for the people in the area.

**Motion:** Each column appears with a short delay. An **Explore again** button scrolls back to scene 4.

**Optional line (owner to decide):** Bringing the 64 priority cells to 500 residents per acre of public space would take about 108 more acres, roughly 220 half-acre parks. Bringing them to 300 would take about 200 acres. Estimate: for each priority cell, residents divided by the target, minus the acres already there, summed. Pocket parks alone are unlikely to be enough; schoolyards, street plazas and reclaimed street space would be part of the mix. **[check]** before use; it is a rough estimate.

---

## 4. Numbers at a glance

| Scene | Number | Value | Definition |
|---|---|---|---|
| 3 | Residents within 500 m of any space | 97.6% | Census-block point to nearest space |
| 5 | Nearest space under 5 acres | 66% | Same |
| 5 | Nearest under 1 acre | 47% | Same |
| 5 | Nearest 10 acres or more | 21% | Same |
| 6 | Ten largest spaces, share of area | 43% | 836 spaces |
| 7 | Spaces under half an acre | 51% | |
| 7 | Rank correlation, area and residents within 500 m | about 0.02 | Spearman |
| 7 | Christian Science Plaza and Franklin Park | 25,408 and 26,395 residents; 6.98 and 396.7 acres; ratio 56.9 | Within 500 m |
| 8 | Dated Boston public space created 1875 to 1900 | about 68% by area | **[check]** |
| 9 | Spaces per km², 0 to 1.5 km and over 8 km from the Common | 21 and 4 | Spaces by centroid |
| 9 | Boston public-space area south or southwest of the Common | 66% (45% and 21%) | Compass sectors from the Common |
| 9 | Cells under 100 and over 3,000 residents per acre | 139 and 41 | Cell plus neighbours |
| 10 | Residents in priority cells | 71,673 (8.2%) | 1,000 m, 1,000 residents per acre |
| 10 | By city | Somerville 27%, Cambridge 8%, Boston 7% | |
| 12 | Extra acres for 500 residents per acre | about 108 | Optional |

## 5. Open items

- Review all texts, especially the new scene 8 and scene 9 wording.
- Decide whether to keep the optional acreage line in scene 12.
- Confirm the wording "about a six-minute walk" for 500 m, or keep the plain "500 m".
- Confirm the Emerald Necklace list for the scene 8 highlight.
- Add a Somerville example to scene 1 if one is found.
- Write the "Sources and method" section.

---

## 6. As built (all 12 scenes)

- **Components:** `StoryMap` (scenes 3, 4), `NearestBar` (5), `DotPlot` (6, 7), `OwnershipTimeline` (8), `StoryGrid` (9, 10, faded in 11), `NewsPhones` (1), `StageText` (2, 11, 12). Texts are in `src/lib/story/steps.js`.
- **Scroll:** Scrollama picks the active scene; the scene's progress (0 to 1) is measured from the scroll position. Scenes whose highlight appears halfway (5 to 10) have extra scroll room (`tall`). Scenes 2, 11 and 12 have no text card (`bare`): their text is on the stage.
- **Scene 1:** the four phone screenshots are cropped from `prompt/screenshots/` into `static/news/` (headline and first lines, top of each page; the Reddit crop stops before the post's stronger language). Order on screen: Copley Square, City Hall Plaza, Harvard Square, Central Square. Each links to its source.
- **Scene 11:** the quote is shown in full over the faded priority map from scene 10.
- **Scene 12:** columns enter with a delay; "Explore again" scrolls back to scene 4.
- **Data:** `static/data/story.json` (nearest-space shares, from `scripts/story_stats.py`) and `grid.geojson` with `d_big_m` (from `scripts/preprocess_grid.py`).
- **Removed:** the dashboard pages and their components that the story replaced.
