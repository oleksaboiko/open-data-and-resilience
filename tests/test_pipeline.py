"""Invariant checks for the GIS models; uses small synthetic inputs."""
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
from osgeo import gdal, osr
from shapely.geometry import Point, Polygon, box

from scripts.build_data import RoadNetwork, normalize_facilities, normalize_hours, population_window, schedule_from_hours, write_population


class RoutingTests(unittest.TestCase):
    def test_partial_edge_and_entrance_distance_are_charged(self):
        network = RoadNetwork()
        network.add_line([(0, 0), (1000, 0)])
        network.finalize()
        pieces, info = network.reachable(Point(500, 20), 120)
        road_pieces = [piece for piece in pieces if all(y == 0 for _, y in piece.coords)]
        self.assertEqual(info["snap_distance_m"], 20)
        self.assertEqual(len(road_pieces), 1)
        self.assertEqual(road_pieces[0].bounds, (400, 0, 600, 0))

    def test_geometric_crossing_without_shared_vertex_is_not_a_junction(self):
        network = RoadNetwork()
        network.add_line([(-100, 0), (100, 0)])
        network.add_line([(0, -100), (0, 100)])
        network.finalize()
        pieces, _ = network.reachable(Point(-50, 0), 100)
        self.assertTrue(all(piece.bounds[1] == piece.bounds[3] == 0 for piece in pieces))

    def test_shared_ground_vertex_allows_turns(self):
        network = RoadNetwork()
        network.add_line([(-100, 0), (0, 0), (100, 0)])
        network.add_line([(0, -100), (0, 0), (0, 100)])
        network.finalize()
        pieces, _ = network.reachable(Point(-50, 0), 100)
        self.assertEqual(max(piece.bounds[3] for piece in pieces), 50)
        self.assertEqual(min(piece.bounds[1] for piece in pieces), -50)

    def test_grade_separated_interior_vertices_do_not_allow_turns(self):
        network = RoadNetwork()
        network.add_line([(-100, 0), (0, 0), (100, 0)], level=1)
        network.add_line([(0, -100), (0, 0), (0, 100)], level=0)
        network.finalize()
        pieces, _ = network.reachable(Point(-50, 0), 100)
        self.assertTrue(all(piece.bounds[1] == piece.bounds[3] == 0 for piece in pieces))

    def test_bridge_endpoint_meets_ground_approach(self):
        network = RoadNetwork()
        network.add_line([(-100, 0), (-50, 0), (0, 0)], level=1)
        network.add_line([(0, 0), (0, 100)], level=0)
        network.finalize()
        pieces, _ = network.reachable(Point(-25, 0), 75)
        self.assertEqual(max(piece.bounds[3] for piece in pieces), 50)

    def test_same_level_elevated_branch_connects_to_interior_junction(self):
        network = RoadNetwork()
        network.add_line([(-100, 0), (0, 0), (100, 0)], level=1)
        network.add_line([(0, 0), (0, 100)], level=1)
        network.finalize()
        pieces, _ = network.reachable(Point(-50, 0), 100)
        self.assertEqual(max(piece.bounds[3] for piece in pieces), 50)

    def test_component_warning_uses_whole_component_not_bounded_search(self):
        network = RoadNetwork()
        network.add_line([(0, 0), (1000, 0)])
        network.add_line([(0, 10), (4, 10)])
        network.finalize()
        _, tiny = network.reachable(Point(2, 10), 750)
        self.assertEqual(tiny["routing_warning"], "small_network_component")
        self.assertEqual(tiny["component_nodes"], 2)
        self.assertEqual(tiny["component_length_m"], 4)
        _, long_edge = network.reachable(Point(500, 0), 100)
        self.assertIsNone(long_edge["routing_warning"])
        self.assertEqual(long_edge["reached_nodes"], 0)

    def test_far_facility_is_flagged_instead_of_getting_a_fake_circle(self):
        network = RoadNetwork()
        network.add_line([(0, 0), (1000, 0)])
        network.finalize()
        pieces, info = network.reachable(Point(500, 151), 750, max_snap_m=150)
        self.assertEqual(pieces, [])
        self.assertEqual(info["routing_status"], "snap_too_far")


class ScheduleTests(unittest.TestCase):
    def test_ukrainian_multi_rule_schedule(self):
        value = normalize_hours("ПН — ПТ: 08:00–20:00<br> СБ — НД: 09:00–15:00")
        self.assertEqual(value, "Mo-Fr 08:00-20:00; Sa-Su 09:00-15:00")
        schedule = schedule_from_hours(value)
        self.assertEqual(schedule["weekly"][0], [[480, 1200]])
        self.assertEqual(schedule["weekly"][6], [[540, 900]])

    def test_overnight_schedule_carries_to_next_day(self):
        schedule = schedule_from_hours("Fr 22:00-02:00")
        self.assertEqual(schedule["weekly"][4], [[1320, 1440]])
        self.assertEqual(schedule["weekly"][5], [[0, 120]])
        self.assertEqual(schedule["weekly"][3], [])

    def test_unknown_hours_are_never_assumed_open(self):
        self.assertIsNone(normalize_hours("За графіком"))
        self.assertIsNone(normalize_hours("Щодня"))
        self.assertFalse(schedule_from_hours(None)["known"])
        self.assertIsNone(normalize_hours("Щодня з 29:00 до 31:00"))

    def test_later_rule_replaces_earlier_hours_for_selected_day(self):
        schedule = schedule_from_hours("Mo-Fr 09:00-18:00; Mo 10:00-14:00")
        self.assertEqual(schedule["weekly"][0], [[600, 840]])
        self.assertEqual(schedule["weekly"][1], [[540, 1080]])

    def test_explicit_off_overrides_24_hours_and_previous_overnight(self):
        schedule = schedule_from_hours(normalize_hours("24/7; Su off"))
        self.assertTrue(schedule["known"])
        self.assertEqual(schedule["weekly"][0], [[0, 1440]])
        self.assertEqual(schedule["weekly"][6], [])
        schedule = schedule_from_hours("Mo 22:00-02:00; Tu off")
        self.assertEqual(schedule["weekly"][1], [])

    def test_overnight_carry_preserves_next_days_existing_hours(self):
        schedule = schedule_from_hours("Mo-Fr 09:00-18:00; Mo 22:00-02:00")
        self.assertEqual(schedule["weekly"][0], [[1320, 1440]])
        self.assertEqual(schedule["weekly"][1], [[0, 120], [540, 1080]])

    def test_omitted_days_and_closed_alias(self):
        schedule = schedule_from_hours("09:00-18:00; Su closed")
        self.assertEqual(schedule["weekly"][0], [[540, 1080]])
        self.assertEqual(schedule["weekly"][6], [])
        self.assertEqual(schedule_from_hours("closed")["weekly"], [[] for _ in range(7)])

    def test_split_hours_and_unsupported_holiday_syntax(self):
        schedule = schedule_from_hours("Mo,We 09:00-12:00,13:00-18:00")
        self.assertEqual(schedule["weekly"][0], [[540, 720], [780, 1080]])
        self.assertEqual(schedule["weekly"][2], [[540, 720], [780, 1080]])
        self.assertFalse(schedule_from_hours("Mo-Fr 09:00-18:00; PH off")["known"])

    def test_midnight_and_24_hour_close(self):
        midnight = schedule_from_hours(normalize_hours("Щодня з 05:00 до 00:00"))
        explicit = schedule_from_hours(normalize_hours("Щодня з 05:00 до 24:00"))
        self.assertEqual(midnight, explicit)


class PopulationTests(unittest.TestCase):
    def test_native_counts_are_masked_without_redistribution(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "population.tif"
            raster = gdal.GetDriverByName("GTiff").Create(str(path), 3, 2, 1, gdal.GDT_Float32)
            raster.SetGeoTransform((30, 0.1, 0, 51, 0, -0.1))
            srs = osr.SpatialReference()
            srs.ImportFromEPSG(4326)
            raster.SetProjection(srs.ExportToWkt())
            raster.GetRasterBand(1).SetNoDataValue(-99999)
            raster.GetRasterBand(1).WriteArray(np.array([[12, -99999, 7], [3, 0, 99]], dtype=np.float32))
            raster = None
            # Covers first two columns; source count 99 in third is excluded.
            values, valid, positive, longitude, latitude, *_ = population_window(path, box(30, 50.8, 30.2, 51))
            self.assertEqual(float(values[valid].sum()), 15)
            self.assertEqual(int(positive.sum()), 2)
            self.assertTrue(np.all(values[valid] >= 0))
            self.assertEqual(longitude.shape, latitude.shape)

    def test_browser_export_preserves_tiny_positive_estimates(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            path = directory / "source.tif"
            raster = gdal.GetDriverByName("GTiff").Create(str(path), 2, 1, 1, gdal.GDT_Float32)
            raster.SetGeoTransform((30, 0.1, 0, 51, 0, -0.1))
            srs = osr.SpatialReference()
            srs.ImportFromEPSG(4326)
            raster.SetProjection(srs.ExportToWkt())
            raster.GetRasterBand(1).WriteArray(np.array([[0.000001, 42]], dtype=np.float32))
            raster = None
            product, *_ = write_population(path, box(30, 50.9, 30.2, 51), directory)
            self.assertEqual(len(product["points"]), 2)
            self.assertGreater(product["points"][0][2], 0)
            self.assertEqual(product["points"][1][2], 42)

    def test_boundary_hole_excludes_cell_center(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "population.tif"
            raster = gdal.GetDriverByName("GTiff").Create(str(path), 3, 3, 1, gdal.GDT_Float32)
            raster.SetGeoTransform((30, 0.1, 0, 51, 0, -0.1))
            srs = osr.SpatialReference()
            srs.ImportFromEPSG(4326)
            raster.SetProjection(srs.ExportToWkt())
            raster.GetRasterBand(1).WriteArray(np.full((3, 3), 10, dtype=np.float32))
            raster = None
            polygon = Polygon(box(30, 50.7, 30.3, 51).exterior.coords, [box(30.1, 50.8, 30.2, 50.9).exterior.coords])
            values, valid, *_ = population_window(path, polygon)
            self.assertEqual(float(values[valid].sum()), 80)


class FacilityTests(unittest.TestCase):
    def test_inactive_and_unknown_amenities_are_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "facilities.geojson"
            path.write_text(json.dumps({"type": "FeatureCollection", "features": [{"type": "Feature", "id": 42, "geometry": {"type": "Point", "coordinates": [30.5, 50.5]}, "properties": {"name_po": "Пункт", "actual": 0, "generator": "Так", "water": "Ні", "working_time": "За графіком"}}]}))
            output = normalize_facilities(path, box(30, 50, 31, 51))
            props = output["features"][0]["properties"]
            self.assertEqual(props["id"], "facility-42")
            self.assertIs(props["is_operational"], False)
            self.assertIs(props["amenities"]["generator"], True)
            self.assertIs(props["amenities"]["water"], False)
            self.assertIsNone(props["amenities"]["first_aid"])
            self.assertFalse(props["schedule"]["known"])


if __name__ == "__main__":
    unittest.main()
