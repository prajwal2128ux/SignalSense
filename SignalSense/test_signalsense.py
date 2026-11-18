"""
test_signalsense.py
Standard-library unit and scenario tests for SignalSense (provisional design).
Run with: python3 test_signalsense.py
"""

import io
import os
import tempfile
import unittest
from unittest.mock import patch

from signal_control import (
    MAX_GREEN_TIME,
    MIN_GREEN_TIME,
    calculate_adaptive_timings,
    create_initial_signal_states,
    get_priority_order,
    has_conflicting_greens,
    set_active_signal,
)
from simulation import run_simulation
from statistics import calculate_average_wait, compare_adaptive_vs_fixed, save_simulation_to_csv
from utils import DIRECTIONS, get_valid_int


class TestSignalSense(unittest.TestCase):
    def test_01_equal_traffic_all_directions(self):
        counts = {"North": 20, "South": 20, "East": 20, "West": 20}
        timings = calculate_adaptive_timings(counts)
        self.assertEqual(timings, {"North": 30, "South": 30, "East": 30, "West": 30})
        result = run_simulation(counts, num_cycles=1, mode="adaptive", verbose=False)
        self.assertEqual(result["total_processed"], 80)
        self.assertEqual(result["total_remaining"], 0)

    def test_02_heavy_traffic_north(self):
        counts = {"North": 100, "South": 10, "East": 10, "West": 10}
        timings = calculate_adaptive_timings(counts)
        self.assertEqual(timings["North"], MAX_GREEN_TIME)
        self.assertEqual(get_priority_order(counts)[0], "North")
        result = run_simulation(counts, num_cycles=1, mode="adaptive", verbose=False)
        self.assertEqual(result["processed_per_direction"]["North"], 60)
        self.assertEqual(result["remaining_counts"]["North"], 40)

    def test_03_heavy_traffic_south(self):
        counts = {"North": 10, "South": 100, "East": 10, "West": 10}
        timings = calculate_adaptive_timings(counts)
        self.assertEqual(timings["South"], MAX_GREEN_TIME)
        self.assertEqual(get_priority_order(counts)[0], "South")

    def test_04_heavy_traffic_east(self):
        counts = {"North": 10, "South": 10, "East": 100, "West": 10}
        timings = calculate_adaptive_timings(counts)
        self.assertEqual(timings["East"], MAX_GREEN_TIME)
        self.assertEqual(get_priority_order(counts)[0], "East")

    def test_05_heavy_traffic_west(self):
        counts = {"North": 10, "South": 10, "East": 10, "West": 100}
        timings = calculate_adaptive_timings(counts)
        self.assertEqual(timings["West"], MAX_GREEN_TIME)
        self.assertEqual(get_priority_order(counts)[0], "West")

    def test_06_no_traffic_all_directions(self):
        counts = {"North": 0, "South": 0, "East": 0, "West": 0}
        timings = calculate_adaptive_timings(counts)
        for d in DIRECTIONS:
            self.assertEqual(timings[d], MIN_GREEN_TIME)
        result = run_simulation(counts, num_cycles=2, mode="adaptive", verbose=False)
        self.assertEqual(result["total_processed"], 0)
        self.assertEqual(result["total_remaining"], 0)
        self.assertIsNone(calculate_average_wait(result))

    def test_07_traffic_only_one_direction(self):
        counts = {"North": 50, "South": 0, "East": 0, "West": 0}
        result = run_simulation(counts, num_cycles=1, mode="adaptive", verbose=False)
        self.assertEqual(result["processed_per_direction"]["North"], 50)
        self.assertEqual(result["total_remaining"], 0)
        # Only North runs; elapsed = 60s green + 3s yellow = 63s
        self.assertEqual(result["elapsed_seconds"], 63)

    def test_08_invalid_and_negative_input(self):
        simulated_entries = ["", "abc", "-5", "10001", "25"]
        with patch("builtins.input", side_effect=simulated_entries), patch(
            "sys.stdout", new_callable=io.StringIO
        ):
            value = get_valid_int("Count: ", min_value=0, max_value=10000)
        self.assertEqual(value, 25)

        with self.assertRaises(ValueError):
            run_simulation({"North": 10, "South": 0, "East": 0, "West": 0}, num_cycles=0)

    def test_09_multiple_simulation_cycles(self):
        counts = {"North": 90, "South": 10, "East": 10, "West": 10}
        result_1 = run_simulation(counts, num_cycles=1, mode="adaptive", verbose=False)
        result_2 = run_simulation(counts, num_cycles=2, mode="adaptive", verbose=False)
        self.assertGreater(result_1["total_remaining"], 0)
        self.assertEqual(result_2["total_remaining"], 0)
        self.assertEqual(result_2["total_processed"], 120)

    def test_10_timing_min_and_max_limits(self):
        extreme = {"North": 5000, "South": 1, "East": 0, "West": 1}
        timings = calculate_adaptive_timings(extreme)
        for d in DIRECTIONS:
            self.assertGreaterEqual(timings[d], MIN_GREEN_TIME)
            self.assertLessEqual(timings[d], MAX_GREEN_TIME)
        self.assertEqual(timings["North"], MAX_GREEN_TIME)
        self.assertEqual(timings["East"], MIN_GREEN_TIME)

    def test_11_fairness_high_and_low_density(self):
        counts = {"North": 500, "South": 2, "East": 0, "West": 0}
        result = run_simulation(counts, num_cycles=1, mode="adaptive", verbose=False)
        # North gets priority, but South is still served in the very same cycle (no starvation).
        self.assertEqual(result["processed_per_direction"]["South"], 2)
        self.assertEqual(result["processed_per_direction"]["North"], 60)

    def test_12_no_conflicting_green_signals(self):
        states = create_initial_signal_states()
        self.assertFalse(has_conflicting_greens(states))
        for d in DIRECTIONS:
            set_active_signal(states, d, "GREEN")
            self.assertFalse(has_conflicting_greens(states))
            set_active_signal(states, d, "YELLOW")
            self.assertFalse(has_conflicting_greens(states))
        # Explicitly verify detector catches unsafe conflicting states
        states["North"] = "GREEN"
        states["East"] = "GREEN"
        self.assertTrue(has_conflicting_greens(states))

    def test_comparison_and_csv_export(self):
        counts = {"North": 60, "South": 10, "East": 10, "West": 10}
        adaptive = run_simulation(counts, num_cycles=2, mode="adaptive", verbose=False)
        fixed = compare_adaptive_vs_fixed(counts, num_cycles=2)
        self.assertLess(calculate_average_wait(adaptive), calculate_average_wait(fixed))

        with tempfile.TemporaryDirectory() as tmpdir:
            csv_path = os.path.join(tmpdir, "records.csv")
            save_simulation_to_csv(adaptive, fixed, filepath=csv_path)
            with open(csv_path, encoding="utf-8") as f:
                lines = f.read().strip().splitlines()
            self.assertEqual(len(lines), 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
