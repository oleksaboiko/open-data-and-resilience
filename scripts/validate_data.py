#!/usr/bin/env python3
"""Validate relationships, geometry, travel bounds, and counts in built data."""
import json
from pathlib import Path
import sys

import numpy as np
from shapely.geometry import shape
from shapely.ops import transform

if __package__:
    from .build_data import FORWARD
else:
    from build_data import FORWARD


def validate(directory):
    def read(name):
        return json.loads((directory / name).read_text(encoding="utf-8"))

    facilities = read("facilities.geojson")["features"]
    polygons = read("isochrones.geojson")["features"]
    population = read("population.json")
    metadata = read("metadata.json")
    by_id = {feature["properties"]["id"]: feature for feature in facilities}
    assert len(by_id) == len(facilities), "Facility IDs must be unique"
    assert len(facilities) == metadata["counts"]["facilities"]
    assert sum(f["properties"]["is_operational"] is True for f in facilities) == metadata["counts"]["operational"]
    assert sum(not f["properties"]["schedule"]["known"] for f in facilities) == metadata["counts"]["unknown_hours"]
    assert sum(bool(f["properties"].get("routing_warning")) for f in facilities) == metadata["counts"]["disconnected_network_components"]
    assert sum(f["properties"].get("routing_warning") == "small_network_component" for f in facilities) == metadata["counts"]["small_network_components"]
    assert len(polygons) == metadata["counts"]["isochrones"]
    assert len(population["points"]) == metadata["counts"]["population_cells"]
    assert len({feature["properties"]["facility_id"] for feature in polygons}) == len(polygons)
    for feature in polygons:
        props = feature["properties"]
        facility = by_id[props["facility_id"]]
        geom = shape(feature["geometry"])
        assert geom.geom_type in {"Polygon", "MultiPolygon"} and geom.is_valid and not geom.is_empty, props["facility_id"]
        projected = transform(FORWARD.transform, geom)
        origin = transform(FORWARD.transform, shape(facility["geometry"]))
        # A polygon cannot exceed its travel budget even in straight-line terms.
        # 1 m allowance covers export quantization and simplification.
        assert origin.buffer(props["distance_budget_m"] + 1).covers(projected), props["facility_id"]
        assert props["snap_distance_m"] <= metadata["routing"]["max_snap_m"]
        assert props["population_in_corridor"] >= 0
        assert props["routing_warning"] == facility["properties"]["routing_warning"]
        assert props["component_nodes"] >= 2
        assert props["component_length_m"] > 0
        if props["routing_warning"] == "small_network_component":
            assert props["component_length_m"] < props["distance_budget_m"]
    points = np.asarray(population["points"], dtype=float)
    if len(points):
        assert np.isfinite(points).all()
        assert (points[:, 2] > 0).all()
        assert abs(points[:, 2].sum() - population["total_population"]) <= len(points) * 0.000051 + 0.01, "Exported cell counts must conserve population"
    covered = metadata["coverage"]["population_in_operational_corridors"]
    uncovered = metadata["coverage"]["population_outside_operational_corridors"]
    assert covered >= 0 and uncovered >= 0
    assert abs(covered + uncovered - population["total_population"]) <= 0.02
    assert (directory / "population-clipped.tif").is_file()
    print(f"Validated {len(facilities):,} facilities, {len(polygons):,} polygons, and {len(points):,} population cells.")


if __name__ == "__main__":
    validate(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "site/data")
