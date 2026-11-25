#!/usr/bin/env python3
"""Build a local, reproducible Kyiv resilience map dataset.

Distances follow supplied OSM road vertices in a metric CRS. Published polygons
are buffered reachable road corridors, not exact door-to-door travel areas.
No external routing service, population redistribution, or invented POIs is used.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import heapq
import html
import json
import math
from pathlib import Path
import re
import sys

import numpy as np
from osgeo import gdal, ogr
from pyproj import CRS, Transformer
import shapely
from shapely.geometry import LineString, Point, mapping, shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

gdal.UseExceptions()
ogr.UseExceptions()

ROOT = Path(__file__).resolve().parents[1]
METRIC_CRS = "EPSG:32636"
FORWARD = Transformer.from_crs("EPSG:4326", METRIC_CRS, always_xy=True)
INVERSE = Transformer.from_crs(METRIC_CRS, "EPSG:4326", always_xy=True)
AMENITIES = ("heater", "generator", "charge", "water", "internet", "cellular", "first_aid", "pandus")
EXCLUDED_HIGHWAYS = {"motorway", "motorway_link", "trunk", "trunk_link", "construction", "proposed", "raceway", "bus_guideway", "cycleway", "ladder", "elevator", "bus_stop"}
DAY_NAMES = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
UK_DAYS = {"ПН": "Mo", "ВТ": "Tu", "СР": "We", "ЧТ": "Th", "ПТ": "Fr", "СБ": "Sa", "НД": "Su"}


def log(message):
    print(message, flush=True)


def write_json(path, value):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    temporary.replace(path)


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def clean_text(value):
    return html.unescape(re.sub(r"<[^>]+>", " ", str(value or ""))).replace("\xa0", " ").strip()


def normalize_hours(raw):
    """Conservatively convert the register's documented Ukrainian schedules."""
    text = html.unescape(str(raw or "")).replace("\xa0", " ").strip()
    if text.casefold() in {"цілодобово", "24/7"}:
        return "24/7"
    text = re.sub(r"<br\s*/?>", ";", text, flags=re.I)
    text = text.replace("—", "-").replace("–", "-")
    daily = re.fullmatch(r"Щодня\s+з\s+(\d{1,2}:\d{2})\s+до\s+(\d{1,2}:\d{2})", text, re.I)
    if daily:
        first, last = daily.groups()
        result = f"Mo-Su {first.zfill(5)}-{last.zfill(5)}"
        return result if schedule_from_hours(result)["known"] else None
    rules = []
    for part in text.split(";"):
        match = re.fullmatch(r"\s*([А-ЯІЇЄҐ\s,\-]+):\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*", part)
        if not match:
            # Also accept already-normalized OSM weekly schedules from manual input.
            return text if schedule_from_hours(text)["known"] else None
        days, first, last = match.groups()
        for ukrainian, english in UK_DAYS.items():
            days = days.replace(ukrainian, english)
        day_selector = re.sub(r"\s+", "", days)
        rules.append(f"{day_selector} {first.zfill(5)}-{last.zfill(5)}")
    result = "; ".join(rules)
    return result if schedule_from_hours(result)["known"] else None


def schedule_from_hours(hours):
    """Parse weekly OSM-style rules; later day rules override earlier ones.

    Only this documented subset is supported. Unknown syntax never silently
    becomes an open period. Intervals are local Europe/Kyiv wall-clock minutes.
    """
    weekly = [[] for _ in range(7)]
    unknown = {"known": False, "timezone": "Europe/Kyiv", "weekly": None}
    if not hours:
        return unknown
    for rule in hours.split(";"):
        rule = rule.strip()
        if rule == "24/7":
            weekly = [[[0, 1440]] for _ in range(7)]
            continue
        if rule in {"off", "closed"}:
            weekly = [[] for _ in range(7)]
            continue
        match = re.fullmatch(r"(?:([A-Za-z,\-\s]+?)\s+)?(off|closed|[0-9:,\-\s]+)", rule)
        if not match:
            return unknown
        day_text, times_text = match.groups()
        day_text = re.sub(r"\s+", "", day_text or "Mo-Su")
        days = set()
        for selector in day_text.split(","):
            endpoints = selector.split("-")
            if len(endpoints) not in (1, 2) or any(day not in DAY_NAMES for day in endpoints):
                return unknown
            first, last = DAY_NAMES.index(endpoints[0]), DAY_NAMES.index(endpoints[-1])
            days.update((first + step) % 7 for step in range((last - first) % 7 + 1))
        current, overnight = [], []
        if times_text not in {"off", "closed"}:
            for interval in times_text.split(","):
                match = re.fullmatch(r"\s*(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})\s*", interval)
                if not match:
                    return unknown
                sh, sm, eh, em = map(int, match.groups())
                if sh > 23 or eh > 24 or sm > 59 or em > 59 or (eh == 24 and em != 0):
                    return unknown
                begin, finish = sh * 60 + sm, eh * 60 + em
                if begin == finish:
                    return unknown
                if finish > begin:
                    current.append([begin, finish])
                else:
                    current.append([begin, 1440])
                    if finish:
                        overnight.append([0, finish])
        # Replace every selected day's previous rule before adding overnight
        # carry, so a later explicit off rule can close an earlier night period.
        for day in days:
            weekly[day] = [interval[:] for interval in current]
        for day in days:
            weekly[(day + 1) % 7].extend(interval[:] for interval in overnight)
    for day, intervals in enumerate(weekly):
        merged = []
        for begin, finish in sorted(intervals):
            if merged and begin <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], finish)
            else:
                merged.append([begin, finish])
        weekly[day] = merged
    return {"known": True, "timezone": "Europe/Kyiv", "weekly": weekly}


def yes_no(value):
    if value is None or value == "":
        return None
    if value is True or str(value).strip().casefold() in {"так", "yes", "true", "1"}:
        return True
    if value is False or str(value).strip().casefold() in {"ні", "no", "false", "0"}:
        return False
    return None


def normalize_facilities(path, boundary):
    source = json.loads(path.read_text(encoding="utf-8"))
    if source.get("type") != "FeatureCollection":
        raise ValueError("Facilities input must be a GeoJSON FeatureCollection.")
    features, used_ids = [], set()
    for index, source_feature in enumerate(source["features"]):
        geom = shape(source_feature["geometry"])
        if geom.geom_type != "Point" or geom.is_empty or not (-180 <= geom.x <= 180 and -90 <= geom.y <= 90):
            raise ValueError(f"Facility {index} must have valid WGS84 Point coordinates.")
        props = dict(source_feature.get("properties") or {})
        raw_id = props.get("objectid", source_feature.get("id", props.get("id", index + 1)))
        feature_id = str(raw_id) if str(raw_id).startswith("facility-") else f"facility-{raw_id}"
        if feature_id in used_ids:
            raise ValueError(f"Duplicate facility id: {feature_id}")
        used_ids.add(feature_id)
        hours = normalize_hours(props.get("opening_hours") or props.get("working_time"))
        operational = yes_no(props.get("is_operational", props.get("actual")))
        props.update({
            "id": feature_id,
            "name": clean_text(props.get("name") or props.get("name_po") or f"Пункт {raw_id}"),
            "category": clean_text(props.get("category") or props.get("type_po") or "Не вказано"),
            "opening_hours": hours,
            "schedule": schedule_from_hours(hours),
            "amenities": {key: yes_no((props.get("amenities") or {}).get(key, props.get(key))) for key in AMENITIES},
            "is_operational": operational,
            "within_boundary": bool(boundary.covers(geom)),
        })
        features.append({"type": "Feature", "id": feature_id, "geometry": mapping(geom), "properties": props})
    return {"type": "FeatureCollection", "features": features}


def load_boundary(gpkg):
    ds = ogr.Open(str(gpkg))
    layer = ds.GetLayerByName("admin_3")
    if layer is None:
        raise ValueError("GeoPackage must include an admin_3 boundary layer.")
    source_crs = CRS.from_wkt(layer.GetSpatialRef().ExportToWkt())
    projector = Transformer.from_crs(source_crs, "EPSG:4326", always_xy=True)
    polygons = [transform(projector.transform, shapely.from_wkb(bytes(f.GetGeometryRef().ExportToWkb()))) for f in layer]
    boundary = shapely.make_valid(unary_union(polygons))
    return boundary


class RoadNetwork:
    """Undirected pedestrian graph retaining supplied vertices and grade hints."""
    def __init__(self):
        self.coordinates = []
        self.adjacency = []
        self.edges = []
        self._node_ids = {}
        self._elevated_endpoints = set()
        self.excluded = Counter()
        self.included = Counter()

    def add_line(self, coordinates, level=0):
        node_ids = []
        for index, xy in enumerate(coordinates):
            x, y = float(xy[0]), float(xy[1])
            # Preserve same-level junctions, including an elevated branch end
            # joining an elevated way's interior vertex.
            key = (round(x, 3), round(y, 3), level)
            if level != 0 and index in (0, len(coordinates) - 1):
                self._elevated_endpoints.add(key)
            node = self._node_ids.get(key)
            if node is None:
                node = len(self.coordinates)
                self._node_ids[key] = node
                self.coordinates.append((x, y))
                self.adjacency.append([])
            node_ids.append(node)
        for u, v in zip(node_ids[:-1], node_ids[1:]):
            if u == v:
                continue
            length = math.dist(self.coordinates[u], self.coordinates[v])
            edge_id = len(self.edges)
            self.edges.append((u, v, length))
            self.adjacency[u].append((v, length, edge_id))
            self.adjacency[v].append((u, length, edge_id))

    def finalize(self):
        if not self.edges:
            raise ValueError("No usable pedestrian roads in input.")
        self.grade_transition_links = 0
        for key in self._elevated_endpoints:
            elevated = self._node_ids[key]
            ground = self._node_ids.get((key[0], key[1], 0))
            if ground is not None:
                # Coincident bridge/tunnel ends meet their ground approaches.
                # These links have no geometry and are not candidates for snap.
                self.adjacency[elevated].append((ground, 0.0, None))
                self.adjacency[ground].append((elevated, 0.0, None))
                self.grade_transition_links += 1
        self.component_ids = np.full(len(self.coordinates), -1, dtype=np.int32)
        component_count = 0
        for node in range(len(self.coordinates)):
            if self.component_ids[node] >= 0:
                continue
            stack = [node]
            self.component_ids[node] = component_count
            while stack:
                current = stack.pop()
                for neighbor, _, _ in self.adjacency[current]:
                    if self.component_ids[neighbor] < 0:
                        self.component_ids[neighbor] = component_count
                        stack.append(neighbor)
            component_count += 1
        self.component_nodes = np.bincount(self.component_ids)
        self.component_lengths = np.bincount([self.component_ids[u] for u, _, _ in self.edges], weights=[length for _, _, length in self.edges], minlength=component_count)
        self.largest_component = int(self.component_nodes.argmax())
        coordinates = np.asarray(self.coordinates, dtype=np.float64)
        endpoints = np.asarray([(u, v) for u, v, _ in self.edges], dtype=np.int32)
        self.segments = shapely.linestrings(coordinates[endpoints])
        self.tree = STRtree(self.segments)
        self._node_ids.clear()
        self._elevated_endpoints.clear()

    @classmethod
    def from_gpkg(cls, path):
        network = cls()
        ds = ogr.Open(str(path))
        layer = ds.GetLayerByName("roads")
        if layer is None:
            raise ValueError("GeoPackage must include a roads layer.")
        source_crs = CRS.from_wkt(layer.GetSpatialRef().ExportToWkt())
        projector = Transformer.from_crs(source_crs, METRIC_CRS, always_xy=True)
        for feature in layer:
            highway = str(feature.GetField("highway") or "unknown")
            if highway in EXCLUDED_HIGHWAYS or highway == "unknown":
                network.excluded[highway] += 1
                continue
            geom = shapely.from_wkb(bytes(feature.GetGeometryRef().ExportToWkb()))
            try:
                level = int(feature.GetField("layer") or 0)
            except (ValueError, TypeError):
                level = 0
            if level == 0 and str(feature.GetField("bridge") or "").lower() in {"yes", "true", "1", "viaduct"}:
                level = 1
            for line in (geom.geoms if geom.geom_type == "MultiLineString" else [geom]):
                x, y = projector.transform(*np.asarray(line.coords).T[:2])
                network.add_line(np.column_stack([x, y]), level)
            network.included[highway] += 1
        network.finalize()
        return network

    def reachable(self, point, budget_m, max_snap_m=150):
        """Return reachable line pieces with distance spent on entrance access."""
        edge_id = int(self.tree.nearest(point))
        edge_geom = self.segments[edge_id]
        along = edge_geom.project(point)
        snapped = edge_geom.interpolate(along)
        snap_distance = point.distance(snapped)
        if snap_distance > max_snap_m or snap_distance >= budget_m:
            return [], {"snap_distance_m": round(snap_distance, 2), "routing_status": "snap_too_far", "reached_nodes": 0}
        u, v, length = self.edges[edge_id]
        component = int(self.component_ids[u])
        component_length = float(self.component_lengths[component])
        component_info = {"component_nodes": int(self.component_nodes[component]), "component_length_m": round(component_length, 2), "routing_warning": "small_network_component" if component_length < budget_m else ("disconnected_network_component" if component != self.largest_component else None)}
        available = budget_m - snap_distance
        distances = {}
        queue = []
        for node, cost in [(u, along), (v, length - along)]:
            if cost <= available and cost < distances.get(node, math.inf):
                distances[node] = cost
                heapq.heappush(queue, (cost, node))
        touched = {edge_id}
        while queue:
            cost, node = heapq.heappop(queue)
            if cost > distances[node]:
                continue
            for neighbor, weight, next_edge in self.adjacency[node]:
                if next_edge is not None:
                    touched.add(next_edge)
                new_cost = cost + weight
                if new_cost <= available and new_cost < distances.get(neighbor, math.inf):
                    distances[neighbor] = new_cost
                    heapq.heappush(queue, (new_cost, neighbor))
        pieces = []
        for current_edge in touched:
            a, b, edge_length = self.edges[current_edge]
            intervals = []
            left = available - distances.get(a, math.inf)
            right = available - distances.get(b, math.inf)
            if left > 0:
                intervals.append((0, min(edge_length, left)))
            if right > 0:
                intervals.append((max(0, edge_length - right), edge_length))
            if current_edge == edge_id:
                intervals.append((max(0, along - available), min(edge_length, along + available)))
            intervals.sort()
            merged = []
            for start, end in intervals:
                if merged and start <= merged[-1][1]:
                    merged[-1] = (merged[-1][0], max(merged[-1][1], end))
                else:
                    merged.append((start, end))
            ax, ay = self.coordinates[a]
            bx, by = self.coordinates[b]
            for start, end in merged:
                if end - start > 0.001:
                    pieces.append(LineString([(ax + (bx - ax) * start / edge_length, ay + (by - ay) * start / edge_length), (ax + (bx - ax) * end / edge_length, ay + (by - ay) * end / edge_length)]))
        if snap_distance > 0.001:
            pieces.append(LineString([point, snapped]))
        return pieces, {"snap_distance_m": round(snap_distance, 2), "routing_status": "ok", "reached_nodes": len(distances), **component_info}


def population_window(raster_path, boundary):
    source = gdal.Open(str(raster_path))
    crs = CRS.from_wkt(source.GetProjection())
    if crs.to_epsg() != 4326:
        raise ValueError("Population raster must be in WGS84 (EPSG:4326).")
    gt = source.GetGeoTransform()
    if gt[2] != 0 or gt[4] != 0 or gt[1] <= 0 or gt[5] >= 0:
        raise ValueError("Expected north-up population raster.")
    west, south, east, north = boundary.bounds
    xoff = max(0, math.floor((west - gt[0]) / gt[1]))
    yoff = max(0, math.floor((north - gt[3]) / gt[5]))
    xend = min(source.RasterXSize, math.ceil((east - gt[0]) / gt[1]))
    yend = min(source.RasterYSize, math.ceil((south - gt[3]) / gt[5]))
    if xend <= xoff or yend <= yoff:
        raise ValueError("Population raster does not overlap the study area.")
    band = source.GetRasterBand(1)
    values = band.ReadAsArray(xoff, yoff, xend - xoff, yend - yoff).astype(np.float64)
    nodata = band.GetNoDataValue()
    xs = gt[0] + (np.arange(xoff, xend) + 0.5) * gt[1]
    ys = gt[3] + (np.arange(yoff, yend) + 0.5) * gt[5]
    longitude, latitude = np.meshgrid(xs, ys)
    inside = shapely.contains_xy(boundary, longitude, latitude)
    valid = inside & np.isfinite(values) & (values >= 0)
    if nodata is not None:
        valid &= values != nodata
    positive = valid & (values > 0)
    grid_transform = (gt[0] + xoff * gt[1], gt[1], 0.0, gt[3] + yoff * gt[5], 0.0, gt[5])
    return values, valid, positive, longitude, latitude, grid_transform, source.GetProjection(), source.GetMetadata()


def write_population(raster_path, boundary, out_dir):
    values, valid, positive, lon, lat, gt, wkt, source_metadata = population_window(raster_path, boundary)
    counts = values[positive]
    exported_counts = np.round(counts, 4)
    # Preserve tiny positive model estimates rather than rounding them to zero.
    exported_counts[exported_counts == 0] = counts[exported_counts == 0]
    points = np.column_stack([np.round(lat[positive], 6), np.round(lon[positive], 6), exported_counts]).tolist()
    product = {
        "schema_version": 1,
        "format": "[latitude,longitude,population_count]",
        "points": points,
        "total_population": round(float(values[valid].sum()), 2),
        "positive_cells": int(positive.sum()),
        "valid_cells": int(valid.sum()),
        "units": "estimated people per native raster cell",
        "source": "WorldPop UKR 2025 R2025A v1",
        "native_resolution_degrees": [gt[1], abs(gt[5])],
        "nominal_resolution_m": 100,
        "resampled": False,
        "clip_rule": "Native cell center inside Kyiv boundary; no sub-cell redistribution.",
    }
    write_json(out_dir / "population.json", product)
    driver = gdal.GetDriverByName("GTiff")
    target = driver.Create(str(out_dir / "population-clipped.tif"), values.shape[1], values.shape[0], 1, gdal.GDT_Float32, options=["COMPRESS=DEFLATE", "TILED=YES", "PREDICTOR=3"])
    target.SetGeoTransform(gt)
    target.SetProjection(wkt)
    target.SetMetadata(source_metadata)
    target.GetRasterBand(1).SetNoDataValue(-99999)
    target.GetRasterBand(1).WriteArray(np.where(valid, values, -99999).astype(np.float32))
    target = None
    x, y = FORWARD.transform(lon[positive], lat[positive])
    return product, np.asarray(x), np.asarray(y), counts


def build(args):
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    boundary = load_boundary(args.roads)
    metric_boundary = transform(FORWARD.transform, boundary)
    write_json(out / "boundary.geojson", {"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": mapping(boundary), "properties": {"name": "Київ", "source": "aoi_roads_kyiv.gpkg:admin_3"}}]})
    facilities = normalize_facilities(args.facilities, boundary)
    log(f"Loaded {len(facilities['features'])} resilience facilities.")
    population, pop_x, pop_y, pop_count = write_population(args.population, boundary, out)
    log(f"Population: {population['positive_cells']:,} populated native cells; {population['total_population']:,.0f} modeled residents.")
    network = RoadNetwork.from_gpkg(args.roads)
    log(f"Graph: {len(network.coordinates):,} vertices, {len(network.edges):,} edges.")
    budget = args.minutes * args.speed_kmh * 1000 / 60
    isochrones, active_polygons = [], []
    statuses = Counter()
    for index, facility in enumerate(facilities["features"]):
        props = facility["properties"]
        point = transform(FORWARD.transform, shape(facility["geometry"]))
        pieces, route = network.reachable(point, budget, args.max_snap_m)
        props.update(route)
        if not pieces:
            statuses[route["routing_status"]] += 1
            continue
        # Corridors intentionally retain holes and disconnected islands. A hull
        # would incorrectly fill rivers, railways and inaccessible urban blocks.
        polygon = unary_union(shapely.buffer(pieces, args.corridor_m, quad_segs=3)).intersection(point.buffer(budget)).intersection(metric_boundary)
        polygon = shapely.make_valid(polygon.simplify(3, preserve_topology=True))
        if polygon.is_empty:
            props["routing_status"] = "outside_boundary"
            statuses["outside_boundary"] += 1
            continue
        if polygon.geom_type not in {"Polygon", "MultiPolygon"}:
            polygon = unary_union([part for part in polygon.geoms if part.geom_type in {"Polygon", "MultiPolygon"}])
        statuses[route["routing_status"]] += 1
        within = shapely.contains_xy(polygon, pop_x, pop_y)
        estimated_people = round(float(pop_count[within].sum()), 2)
        props["population_in_corridor"] = estimated_people
        if props["is_operational"] is True:
            active_polygons.append(polygon)
        output_geom = transform(INVERSE.transform, polygon)
        output_geom = shapely.set_precision(output_geom, 0.000001)
        isochrones.append({"type": "Feature", "id": props["id"], "geometry": mapping(output_geom), "properties": {
            "facility_id": props["id"], "name": props["name"], "is_operational": props["is_operational"],
            "minutes": args.minutes, "speed_kmh": args.speed_kmh, "distance_budget_m": round(budget, 2),
            "corridor_buffer_m": args.corridor_m, "snap_distance_m": route["snap_distance_m"],
            "routing_warning": route.get("routing_warning"), "component_nodes": route.get("component_nodes"), "component_length_m": route.get("component_length_m"),
            "population_in_corridor": estimated_people, "area_m2": round(polygon.area),
            "method": "buffered reachable road segments",
        }})
        if (index + 1) % 100 == 0:
            log(f"Isochrones: {index + 1}/{len(facilities['features'])}")
    write_json(out / "facilities.geojson", facilities)
    write_json(out / "isochrones.geojson", {"type": "FeatureCollection", "features": isochrones})
    log("Computing population covered by the union of operational facility corridors...")
    covered = np.zeros(len(pop_count), dtype=bool)
    # Point masks avoid a costly citywide polygon union and double counting.
    for polygon in active_polygons:
        covered |= shapely.contains_xy(polygon, pop_x, pop_y)
    coverage_population = float(pop_count[covered].sum())
    west, south, east, north = boundary.bounds
    metadata = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "timezone": "Europe/Kyiv",
        "bounds": [[south, west], [north, east]],
        "center": [50.4501, 30.5234],
        "counts": {"facilities": len(facilities["features"]), "operational": sum(f["properties"]["is_operational"] is True for f in facilities["features"]), "inactive": sum(f["properties"]["is_operational"] is False for f in facilities["features"]), "unknown_operational": sum(f["properties"]["is_operational"] is None for f in facilities["features"]), "unknown_hours": sum(not f["properties"]["schedule"]["known"] for f in facilities["features"]), "isochrones": len(isochrones), "population_cells": population["positive_cells"], "small_network_components": sum(f["properties"].get("routing_warning") == "small_network_component" for f in facilities["features"]), "disconnected_network_components": sum(bool(f["properties"].get("routing_warning")) for f in facilities["features"])},
        "routing": {"minutes": args.minutes, "speed_kmh": args.speed_kmh, "distance_budget_m": budget, "corridor_buffer_m": args.corridor_m, "max_snap_m": args.max_snap_m, "metric_crs": METRIC_CRS, "nodes": len(network.coordinates), "edges": len(network.edges), "components": len(network.component_nodes), "grade_transition_links": network.grade_transition_links, "statuses": dict(statuses), "excluded_highways": dict(network.excluded), "included_highways": dict(network.included)},
        "population": {key: value for key, value in population.items() if key != "points"},
        "coverage": {"population_in_operational_corridors": round(coverage_population, 2), "population_outside_operational_corridors": round(population["total_population"] - coverage_population, 2), "percent_in_operational_corridors": round(100 * coverage_population / population["total_population"], 2) if population["total_population"] else 0, "scope": "All actual=1 facilities regardless of current schedule; population cell-center test against union of modeled road corridors, no double counting."},
        "amenities": list(AMENITIES),
        "sources": [{"file": path.name, "sha256": sha256(path)} for path in [args.facilities, args.roads, args.population]],
        "assumptions": [
            "3 km/h is a configurable planning assumption for child walking, not a measured individual speed.",
            "Isochrones are approximate buffered reachable road corridors. They are not exact door-to-door access areas or evacuation advice.",
            "The straight-line connector to the closest supplied road is charged against the distance budget. Snaps exceeding the configured threshold produce no isochrone.",
            "Graph joins shared source vertices; geometric crossings alone do not connect. Bridge/layer interior vertices are separated, with ends joining ground approaches.",
            "Road data has no foot/access restrictions, barriers, sidewalk or crossing-safety fields. Motorway, trunk, cycleway, construction, ladder, elevator and non-route classes are excluded; remaining roads are assumed walkable in both directions.",
            "Road network is limited to supplied Kyiv data; routes crossing outside its extent can be underestimated. Facilities on small or disconnected graph components are flagged; no connections are invented to fill missing roads.",
            "Opening status is computed from published weekly hours in Europe/Kyiv. Public holidays, emergency changes and live facility availability are not known.",
            "actual=1 is a register status, not live verification. Source records are preserved including actual=0.",
            "Population is the 2025 WorldPop modeled count per native cell. Cell centers select the Kyiv clip and corridor coverage; 20m upsampling would add no demographic detail and is not performed.",
            "Population and facility snapshots may represent different dates. Coverage totals describe this modeled snapshot only.",
        ],
        "attribution": {"roads": "© OpenStreetMap contributors, ODbL; supplied GeoPackage extract", "population": "WorldPop 2025 R2025A v1, CC BY 4.0", "facilities": "User-supplied Kyiv resilience facility register, query_poi.json; publication license to be confirmed by data owner"},
    }
    write_json(out / "metadata.json", metadata)
    log(f"Wrote {len(isochrones)} isochrones to {out}; routing statuses: {dict(statuses)}")
    return metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--facilities", type=Path, default=ROOT / "query_poi.json", help="Resilience register GeoJSON; may be replaced by manually maintained points.")
    parser.add_argument("--roads", type=Path, default=ROOT / "aoi_roads_kyiv.gpkg")
    parser.add_argument("--population", type=Path, default=ROOT / "ukr_pop_2025_CN_100m_R2025A_v1.tif")
    parser.add_argument("--output", type=Path, default=ROOT / "site/data")
    parser.add_argument("--minutes", type=float, default=15)
    parser.add_argument("--speed-kmh", type=float, default=3)
    parser.add_argument("--corridor-m", type=float, default=35)
    parser.add_argument("--max-snap-m", type=float, default=150)
    args = parser.parse_args()
    if any(value <= 0 for value in [args.minutes, args.speed_kmh, args.corridor_m, args.max_snap_m]):
        parser.error("Walking time, speed, corridor width, and snap threshold must be positive.")
    build(args)


if __name__ == "__main__":
    main()
