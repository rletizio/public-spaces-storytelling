"""Numbers quoted in the story that need the census blocks: who lives how close to a public space, and how big the
nearest space is. Writes static/data/story.json.

Run from the project root:  python scripts/story_stats.py

Inputs:  static/data/spaces.geojson                      (the 836 spaces, with area_acres)
         prompt/data/MassGIS - Census Blocks.geojson     (2020 population; Boston, Cambridge and Somerville blocks only)
Method:  each block is represented by its representative point; the nearest space is the one with the closest border
         (straight-line distance, EPSG:26986, meters). Residents are the 2020 block population (POP20).
"""
import json
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parents[1]
M = 26986
TOWNS = [35, 49, 274]  # Boston, Cambridge, Somerville
CLASSES = [  # nearest space, by area
    ("under1", "Under 1 acre", 0, 1),
    ("1to5", "1 to 5 acres", 1, 5),
    ("5to10", "5 to 10 acres", 5, 10),
    ("10plus", "10 acres or more", 10, float("inf")),
]

spaces = gpd.read_file(ROOT / "static" / "data" / "spaces.geojson").to_crs(M)
blocks = gpd.read_file(ROOT / "prompt" / "data" / "MassGIS - Census Blocks.geojson", engine="pyogrio").set_crs(M, allow_override=True)
blocks = blocks[blocks.TOWN_ID.isin(TOWNS) & (blocks.POP20 > 0)][["POP20", "TOWN", "geometry"]].copy()
blocks["geometry"] = blocks.geometry.representative_point()
total = float(blocks.POP20.sum())

near = gpd.sjoin_nearest(blocks, spaces[["area_acres", "geometry"]], distance_col="d", how="left")
near = near[~near.index.duplicated()]

nearest = []
for key, label, lo, hi in CLASSES:
    n = float(near[(near.area_acres >= lo) & (near.area_acres < hi)].POP20.sum())
    nearest.append(dict(key=key, label=label, residents=round(n), share=n / total))

within = {str(m): float(near[near.d <= m].POP20.sum() / total) for m in (400, 500, 800, 1000)}
under5 = float(near[near.area_acres < 5].POP20.sum() / total)

out = dict(
    residents=round(total),
    spaces=len(spaces),
    nearest=nearest,
    under5=under5,
    within_m=within,
    note="Nearest space by straight-line distance from the representative point of each 2020 census block.",
)
with open(ROOT / "static" / "data" / "story.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=1)

print("residents", round(total), "| spaces", len(spaces))
for c in nearest:
    print(f"{c['label']:<18} {c['residents']:>8,}  {c['share'] * 100:5.1f}%")
print(f"under 5 acres {under5 * 100:.1f}%  | within 400/500/800/1000 m:", {k: round(v * 100, 1) for k, v in within.items()})
