# Kyiv resilience map · Карта стійкості Києва

An interactive, trilingual map of Kyiv resilience facilities, their equipment and published opening hours, modeled 15-minute child-paced walking catchments, and WorldPop population. Built for the FORWARD presentation supplied by Oleksii Boiko.

**Website:** https://oleksaboiko.github.io/open-data-and-resilience/

The site runs entirely on GitHub Pages. No API key, account or routing server is required by visitors. Electricity outage schedules are intentionally deferred to a later release.

## Included

- All 1,226 supplied facilities, preserving their original attributes; 1,185 records are active and 41 inactive. Inactive records are hidden by default.
- Search by name/address, district filter, equipment filter and a selector for every available scalar attribute.
- Open/closed/unknown status based on recorded hours in **Europe/Kyiv**, updated every minute. Nine vague schedules remain unknown. Register status and schedule state are distinct from live availability.
- Network-based 15-minute polygons at a configurable **3 km/h** child walking assumption, with partial road edges and entrance-to-road distance included in the 750 m budget.
- Blue population heatmap using the supplied **WorldPop 2025** raster at its native 3 arc-second grid (nominally 100 m). No 20 m upsampling or artificial increase in demographic precision.
- Ukrainian/English/German interface, mobile layout, geolocation, facility details and filtered GeoJSON downloads.
- Reproducible Python data preparation and downloadable provenance/assumption metadata.

## Run locally

```bash
python3 -m http.server 8000 --directory site
```

Open http://127.0.0.1:8000. Opening `index.html` directly as a file will not work because browsers block the data requests. Map scripts are bundled locally; the background map requires an internet connection to OpenStreetMap tile servers.

## Datasets

| File | Content |
| --- | --- |
| `site/data/facilities.geojson` | WGS84 points, source attributes, normalized names, equipment, schedules, registry status and routing diagnostics |
| `site/data/isochrones.geojson` | WGS84 Polygon/MultiPolygon catchments linked by `facility_id` |
| `site/data/population.json` | Native cell centers: `[latitude, longitude, population_count]` |
| `site/data/population-clipped.tif` | Clipped native-resolution population count raster, with original georeferencing |
| `site/data/boundary.geojson` | Kyiv study boundary from the supplied GeoPackage |
| `site/data/metadata.json` | Counts, source hashes, generation time, parameters, coverage estimates, attribution and limitations |

The population estimate is approximately **2.56 million people** within the supplied Kyiv boundary. This is a modeled 2025 snapshot, not a live population count. Read exact values and coverage scope from `metadata.json`.

## Rebuild or update facilities

The supplied original files are intentionally not committed: the full-country raster, GeoPackage and presentation are much larger than the web datasets. Place them in the repository root, or provide their paths explicitly:

- `query_poi.json` — GeoJSON FeatureCollection of WGS84 Point features;
- `aoi_roads_kyiv.gpkg` — layers `roads` and `admin_3`;
- `ukr_pop_2025_CN_100m_R2025A_v1.tif` — population counts in EPSG:4326.

On Ubuntu, install the system GIS bindings (Shapely 2 or newer is required):

```bash
sudo apt-get install python3-gdal python3-numpy python3-pyproj python3-shapely
python3 scripts/build_data.py
python3 scripts/validate_data.py
```

Other Python environments can use `requirements.txt`; the GDAL Python package must match the installed system GDAL library.

Example with manually maintained facility data:

```bash
python3 scripts/build_data.py \
  --facilities /path/to/query_poi.json \
  --roads /path/to/aoi_roads_kyiv.gpkg \
  --population /path/to/ukr_pop_2025_CN_100m_R2025A_v1.tif \
  --minutes 15 --speed-kmh 3 --corridor-m 35 --max-snap-m 150
python3 scripts/validate_data.py
```

Stable `objectid` or `id` values link facilities to polygons. Facility fields accepted include `name_po`/`name`, `type_po`/`category`, `address`, `district`, `working_time`/`opening_hours`, and `actual`/`is_operational`. Equipment flags are `heater`, `generator`, `charge`, `water`, `internet`, `cellular`, `first_aid` and `pandus`, using `Так`/`Ні` or booleans. Prefer a precise weekly schedule such as `Mo-Fr 09:00-18:00; Sa 10:00-14:00; Su off`, or `24/7`.

After changing coordinates or adding/removing points, regenerate both facilities and isochrones together. Commit the generated `site/data` files and source changes to `main`; the Pages workflow validates and publishes the site. The browser cannot regenerate network polygons by itself.

## Method and limits

See [METHODOLOGY.md](METHODOLOGY.md) for the graph, polygon and population methods. Key interpretations:

- The polygons are **buffered reachable street corridors**, not precise door-to-door travel-time surfaces. A 35 m buffer includes nearby properties; it is not extra network travel distance. The model does not establish route safety or accessibility for an individual child.
- Road accessibility tags, current barriers and sidewalk/crossing-safety details are not present in the supplied network. These limitations are explicit in the metadata. Limited road connectivity is flagged on affected facility records.
- Published hours do not establish live operation, functioning generators, supply availability or queue length. Inactive registry records are not counted as open.
- Corridor population is a cell-center estimate. Overlapping polygons are dissolved before citywide totals, so residents are not counted repeatedly. Individual facility catchments overlap and must not be summed as independent demand.
- The presentation refers to WorldPop 2022; the supplied raster is 2025, and the implementation uses and labels 2025.

## Checks

```bash
node --test tests/hours.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/validate_data.py
```

Optional browser integration checks, with Playwright and Chromium installed separately:

```bash
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright/index.mjs \
  node tests/browser-smoke.mjs http://127.0.0.1:8000
```

The browser checks cover desktop/mobile rendering, filters, hours, language switching, local data requests, downloads and walking polygons. They write screenshots and test artifacts under `/tmp`.

## GitHub Pages

The workflow `.github/workflows/pages.yml` validates the data and uploads only `site/`. Enable **Settings → Pages → Build and deployment → Source: GitHub Actions** once in the repository, then run or rerun **Validate and publish map**. No deployment secret is needed. The workflow uses GitHub's repository-scoped token with read-only contents and Pages deployment permissions.

## License

Application code and original documentation retain the repository’s [MIT license](LICENSE). Third-party datasets and bundled libraries retain their own licenses; MIT does not relicense those materials.

## Data attribution

- Facilities: user-supplied Kyiv warming/resilience register (`query_poi.json`). The original municipal source URL and publication license were not included with the file; these remain explicitly unverified in metadata.
- Roads: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL, from the supplied GeoPackage extract.
- Population: [WorldPop, individual countries 2015–2030, R2025A v1](https://hub.worldpop.org/project/categories?id=3), supplied Ukraine 2025 raster, CC BY 4.0.
- Kyiv boundary: the `admin_3` layer of the supplied GeoPackage; upstream source/license not independently established.
- Leaflet 1.9.4 and Leaflet.heat 0.2.0 are vendored with their license notices in `site/vendor`.

The presentation and this implementation do not override third-party data licenses. No GitHub token or other credential belongs in the repository or browser code.
