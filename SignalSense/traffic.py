"""
traffic.py
Module 1 (Provisional): Traffic density input, validation, classification, and display.
"""

from utils import (
    DIRECTIONS,
    MAX_VEHICLES_PER_DIRECTION,
    get_valid_int,
    print_section_header,
    print_separator,
)


def create_empty_counts():
    """Return a fresh dictionary with zero vehicles in every direction."""
    return {direction: 0 for direction in DIRECTIONS}


def get_sample_traffic_counts():
    """Return a sample four-way traffic scenario for quick demonstration."""
    return {
        "North": 45,
        "South": 15,
        "East": 25,
        "West": 10,
    }


def classify_density(vehicle_count):
    """
    Classify a single direction's queue size into a simple density label.
    Thresholds are educational defaults for a single-lane intersection model.
    """
    if vehicle_count == 0:
        return "Empty"
    if vehicle_count <= 15:
        return "Low"
    if vehicle_count <= 35:
        return "Medium"
    return "High"


def input_traffic_density():
    """
    Allow the user to enter vehicle counts manually or load sample traffic data.
    Returns a validated dictionary mapping each direction to an integer count.
    """
    print_section_header("ENTER TRAFFIC DENSITY")
    print("1. Enter vehicle counts manually")
    print("2. Load sample traffic data (N=45, S=15, E=25, W=10)")
    choice = get_valid_int("Select input method (1-2): ", min_value=1, max_value=2)

    if choice == 2:
        counts = get_sample_traffic_counts()
        print("\nSample traffic counts loaded successfully.")
        return counts

    counts = create_empty_counts()
    print(f"\nEnter waiting vehicles (0 to {MAX_VEHICLES_PER_DIRECTION}) for each direction:")
    for direction in DIRECTIONS:
        counts[direction] = get_valid_int(
            f"  {direction:<6}: ",
            min_value=0,
            max_value=MAX_VEHICLES_PER_DIRECTION,
        )

    print("\nTraffic density updated successfully.")
    return counts


def calculate_density_summary(vehicle_counts):
    """
    Compute per-direction percentage share and density level.
    Returns (rows, total_vehicles).
    """
    total_vehicles = sum(vehicle_counts.values())
    rows = []

    for direction in DIRECTIONS:
        count = vehicle_counts[direction]
        share_percent = (count / total_vehicles) * 100.0 if total_vehicles > 0 else 0.0
        rows.append(
            {
                "direction": direction,
                "count": count,
                "share_percent": share_percent,
                "level": classify_density(count),
            }
        )

    return rows, total_vehicles


def display_traffic_density(vehicle_counts):
    """Print a formatted table of current vehicle counts and density levels."""
    print_section_header("TRAFFIC DENSITY SUMMARY")
    rows, total_vehicles = calculate_density_summary(vehicle_counts)

    print(f"{'Direction':<12}{'Vehicles':>10}{'Share (%)':>14}{'Density Level':>16}")
    print_separator("-", 52)
    for row in rows:
        print(
            f"{row['direction']:<12}"
            f"{row['count']:>10}"
            f"{row['share_percent']:>13.1f}%"
            f"{row['level']:>16}"
        )
    print_separator("-", 52)
    print(f"{'Total':<12}{total_vehicles:>10}{100.0 if total_vehicles > 0 else 0.0:>13.1f}%")
