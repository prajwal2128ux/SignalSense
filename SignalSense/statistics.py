"""
statistics.py
Module 5 (Provisional): Performance metrics, fixed-vs-adaptive comparison, and CSV history export.
"""

import csv
import os
from datetime import datetime

from simulation import run_simulation
from utils import DIRECTIONS, print_section_header, print_separator

DEFAULT_CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "traffic_records.csv")


def calculate_average_wait(sim_result):
    """
    Return average waiting time (seconds) across all processed vehicles.
    Returns None when zero vehicles were processed to avoid division by zero.
    """
    if sim_result["total_processed"] == 0:
        return None
    return sim_result["total_wait_time"] / sim_result["total_processed"]


def compare_adaptive_vs_fixed(initial_counts, num_cycles):
    """Run a fixed-time baseline simulation on the same starting queues for comparison."""
    return run_simulation(initial_counts, num_cycles, mode="fixed", verbose=False)


def format_wait(avg_wait):
    """Format average waiting time cleanly, handling the zero-processed case."""
    if avg_wait is None:
        return "N/A (0 processed)"
    return f"{avg_wait:.2f} s"


def display_statistics(adaptive_result, fixed_result=None):
    """Display comprehensive performance statistics and optional fixed-time comparison."""
    print_section_header("TRAFFIC STATISTICS & PERFORMANCE REPORT")

    if adaptive_result is None:
        print("No simulation has been run yet.")
        print("Use option 1 to enter traffic counts, then option 4 to start a simulation.")
        return

    avg_wait = calculate_average_wait(adaptive_result)

    print(f"Simulation Cycles Run      : {adaptive_result['cycles_requested']}")
    print(f"Total Starting Vehicles    : {adaptive_result['total_initial']}")
    print(f"Total Vehicles Processed   : {adaptive_result['total_processed']}")
    print(f"Total Vehicles Remaining   : {adaptive_result['total_remaining']}")
    print(f"Total Elapsed Time         : {adaptive_result['elapsed_seconds']} s")
    print(f"Average Waiting Time       : {format_wait(avg_wait)}")
    print()

    print(f"{'Direction':<12}{'Initial':>10}{'Processed':>12}{'Remaining':>12}{'Clearance %':>14}")
    print_separator("-", 60)
    for direction in DIRECTIONS:
        initial = adaptive_result["initial_counts"][direction]
        processed = adaptive_result["processed_per_direction"][direction]
        remaining = adaptive_result["remaining_counts"][direction]
        clearance = (processed / initial) * 100.0 if initial > 0 else 0.0
        print(
            f"{direction:<12}"
            f"{initial:>10}"
            f"{processed:>12}"
            f"{remaining:>12}"
            f"{clearance:>13.1f}%"
        )
    print_separator("-", 60)

    if fixed_result is not None:
        fixed_avg_wait = calculate_average_wait(fixed_result)
        print("\nComparison: Adaptive vs. Fixed-Time Baseline (30s per phase, N->S->E->W)")
        print_separator("-", 64)
        print(f"{'Metric':<30}{'Adaptive':>16}{'Fixed-Time':>18}")
        print_separator("-", 64)
        print(
            f"{'Vehicles Processed':<30}"
            f"{adaptive_result['total_processed']:>16}"
            f"{fixed_result['total_processed']:>18}"
        )
        print(
            f"{'Vehicles Remaining':<30}"
            f"{adaptive_result['total_remaining']:>16}"
            f"{fixed_result['total_remaining']:>18}"
        )
        print(
            f"{'Total Elapsed Time (s)':<30}"
            f"{adaptive_result['elapsed_seconds']:>16}"
            f"{fixed_result['elapsed_seconds']:>18}"
        )
        print(
            f"{'Average Waiting Time':<30}"
            f"{format_wait(avg_wait):>16}"
            f"{format_wait(fixed_avg_wait):>18}"
        )
        print_separator("-", 64)

        if avg_wait is not None and fixed_avg_wait is not None and fixed_avg_wait > 0:
            reduction = ((fixed_avg_wait - avg_wait) / fixed_avg_wait) * 100.0
            print(f"Waiting Time Change (Adaptive vs Fixed): {reduction:+.2f}%")
        else:
            print("Waiting Time Change (Adaptive vs Fixed): N/A")


def save_simulation_to_csv(adaptive_result, fixed_result=None, filepath=DEFAULT_CSV_PATH):
    """Append a summary row of the simulation run to data/traffic_records.csv."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    file_exists = os.path.exists(filepath) and os.path.getsize(filepath) > 0

    adaptive_wait = calculate_average_wait(adaptive_result)
    fixed_wait = calculate_average_wait(fixed_result) if fixed_result else None

    headers = [
        "timestamp",
        "cycles",
        "initial_total",
        "processed_total",
        "remaining_total",
        "adaptive_avg_wait_s",
        "fixed_avg_wait_s",
    ]

    row = [
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        adaptive_result["cycles_requested"],
        adaptive_result["total_initial"],
        adaptive_result["total_processed"],
        adaptive_result["total_remaining"],
        f"{adaptive_wait:.2f}" if adaptive_wait is not None else "N/A",
        f"{fixed_wait:.2f}" if fixed_wait is not None else "N/A",
    ]

    with open(filepath, mode="a", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        if not file_exists:
            writer.writerow(headers)
        writer.writerow(row)
