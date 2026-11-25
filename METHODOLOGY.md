# Data preparation and interpretation

## Facility records

The source is a GeoJSON FeatureCollection of 1,226 resilience/warming points. All original scalar attributes are retained. Normalization adds stable identifiers, name/category, service flags, an operational registry flag and weekly schedules. A record marked `actual = 0` is retained but hidden by default. Schedules describe published hours and are evaluated in Europe/Kyiv regardless of the visitor's timezone; daylight-saving changes are handled by the browser's timezone database. Unknown or unsupported hours remain unknown.

## Walking graph

Road geometries are transformed to UTM zone 36N (EPSG:32636). Consecutive source vertices form weighted, undirected edges whose lengths are measured in metres. Shared source vertices connect the network; geometric line crossings without a shared vertex do not create intersections. Layer and bridge hints separate grade levels. Where source topology or level tags are incomplete, connectivity remains an approximation.

Motorway, trunk, construction, proposed, raceway, bus guideway, cycleway, ladder and elevator features are excluded. The supplied network does not contain sufficient pedestrian access, sidewalk, barrier or crossing-safety information to fully establish legal and practical walkability. Remaining road classes are assumed walkable in both directions. Stairs are included; this is not a wheelchair accessibility model.

Each facility projects to the closest retained road segment. The direct entrance connector is charged against the total distance budget; a snap beyond 150 m is rejected. Dijkstra's algorithm expands through the graph for the remaining budget. Partially reachable edges are cut at the exact remaining length. At 3 km/h for 15 minutes, the budget is 750 m. Other speeds/times can be supplied as build arguments.

Short or isolated road components cannot describe a complete local network. Those facility records carry routing diagnostics and a warning. The pipeline does not bridge gaps by inventing roads. Facilities and generated polygons should be reviewed against local conditions before operational use.

## Polygon construction

Reachable road pieces and the entrance connector are buffered by 35 m and dissolved for each facility. Geometry is simplified for browser distribution and clipped to the supplied Kyiv boundary. The result is a Polygon or MultiPolygon representing a **street-corridor approximation** of access. It is not a circular radius, convex hull, or precise surface of travel times through buildings and blocks.

The off-network buffer can include land that is not directly accessible, while narrow corridors can omit residents farther inside large blocks. The area includes a buffer beyond the traveled road centerline. Rivers, crossings, access restrictions and local hazards require additional data. Isochrones must not be presented as safe evacuation routes.

## Population and coverage

The input raster is WorldPop Ukraine **2025**, R2025A v1, with population counts per native grid cell. It is not a density raster. The native grid is 3 arc-seconds (approximately 100 m nominal resolution; physical east-west cell width varies with latitude). Native cells whose centers fall within the supplied Kyiv boundary are retained. No 20 m resampling is performed.

The web JSON contains positive cell counts and their centers; a clipped GeoTIFF preserves the source grid. Heatmap weights are normalized for display, with the highest values visually capped at the 98th percentile. The heatmap is a zoom-dependent, smoothed relative intensity display; analytical totals use the original cell counts, not the display weights.

For each facility, corridor population sums native counts whose centers lie inside that corridor. Citywide operational coverage uses the **union** of all `actual = 1` corridor polygons, independent of their current schedule. This prevents overlap double counting. Residents outside this union are a model estimate, not a direct count of people without any support. Citywide coverage statistics in metadata do not change when the browser applies equipment or opening-hours filters.

Capacity, when present, is a register attribute. The app does not infer queues, attendance or depletion of supplies. Catchment population is not an occupancy prediction, and summing per-facility populations would double-count overlaps.

## Provenance and reproducibility

The generated metadata includes UTC build time, source filenames and SHA-256 hashes, spatial bounds, routing parameters, population resolution, record counts, coverage scope, assumptions and attribution. The source inputs may describe different dates. Their acquisition dates and the facility register's original source URL/license were not supplied and are not invented.

The data validator checks JSON structure, geometry validity, identifier joins, coordinate bounds, distance plausibility and conservation of population counts. Synthetic tests cover network junctions, overpasses, partial edges, entrance cost, rejected long snaps, opening schedules and raster clipping. Browser tests exercise actual local assets and exported datasets.

## Later integrations

Electricity outage schedules are excluded from this release at the owner's request. A future integration needs an authoritative source, service-area/address linkage, effective dates, outage intervals, refresh rules and explicit stale-data handling. Live queues and occupancy similarly require direct observations; they cannot be deduced from WorldPop or published hours.
