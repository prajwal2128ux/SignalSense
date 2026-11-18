"""
signal_control.py
Modules 2 & 3 (Provisional): Adaptive signal timing calculation and safe signal state control.

Adaptive Green-Time Formula:
    green_time = MIN_GREEN_TIME + round((direction_vehicles / total_vehicles) * ADAPTIVE_POOL_SECONDS)
    green_time = clamp(green_time, MIN_GREEN_TIME, MAX_GREEN_TIME)

Why this formula?
- MIN_GREEN_TIME (10s) prevents starvation for low-traffic directions.
- ADAPTIVE_POOL_SECONDS (80s) distributes extra green time proportionally to queue density.
- MAX_GREEN_TIME (60s) stops one heavily congested lane from blocking other roads indefinitely.
- When total_vehicles == 0, every direction receives MIN_GREEN_TIME (10s) as a safe baseline.
"""

from utils import DIRECTIONS, print_section_header, print_separator

MIN_GREEN_TIME = 10
MAX_GREEN_TIME = 60
YELLOW_TIME = 3
FIXED_GREEN_TIME = 30
ADAPTIVE_POOL_SECONDS = 80


def create_initial_signal_states():
    """Return a dictionary with all four traffic signals safely set to RED."""
    return {direction: "RED" for direction in DIRECTIONS}


def reset_all_signals(signal_states):
    """Set every direction's signal back to RED."""
    for direction in DIRECTIONS:
        signal_states[direction] = "RED"


def set_active_signal(signal_states, active_direction, color):
    """
    Set one direction to GREEN or YELLOW while forcing all other directions to RED.
    This guarantees conflicting directions never receive GREEN at the same time.
    """
    if active_direction not in DIRECTIONS:
        raise ValueError(f"Unknown direction: {active_direction}")
    if color not in ("GREEN", "YELLOW", "RED"):
        raise ValueError(f"Invalid signal color: {color}")

    for direction in DIRECTIONS:
        if direction == active_direction:
            signal_states[direction] = color
        else:
            signal_states[direction] = "RED"


def has_conflicting_greens(signal_states):
    """
    Safety check: return True if more than one direction is currently GREEN or YELLOW.
    In a safe four-way phase controller, this must always return False.
    """
    active_count = 0
    for direction in DIRECTIONS:
        if signal_states[direction] in ("GREEN", "YELLOW"):
            active_count += 1
    return active_count > 1


def calculate_adaptive_timings(vehicle_counts):
    """
    Calculate adaptive green signal duration (in seconds) for each direction.
    Every returned duration is guaranteed to stay within [MIN_GREEN_TIME, MAX_GREEN_TIME].
    """
    total_vehicles = sum(vehicle_counts.values())
    timings = {}

    if total_vehicles == 0:
        for direction in DIRECTIONS:
            timings[direction] = MIN_GREEN_TIME
        return timings

    for direction in DIRECTIONS:
        proportion = vehicle_counts[direction] / total_vehicles
        raw_green = MIN_GREEN_TIME + round(proportion * ADAPTIVE_POOL_SECONDS)
        clamped_green = max(MIN_GREEN_TIME, min(MAX_GREEN_TIME, raw_green))
        timings[direction] = clamped_green

    return timings


def calculate_fixed_timings():
    """Return fixed baseline green durations (30s per direction)."""
    return {direction: FIXED_GREEN_TIME for direction in DIRECTIONS}


def get_priority_order(vehicle_counts):
    """
    Order directions from highest vehicle count to lowest.
    Ties keep the standard North -> South -> East -> West order.
    """
    return sorted(DIRECTIONS, key=lambda direction: vehicle_counts[direction], reverse=True)


def display_adaptive_timings(vehicle_counts, timings):
    """Print the adaptive signal timing table and explain the active limits."""
    print_section_header("ADAPTIVE SIGNAL TIMING PLAN")
    total_vehicles = sum(vehicle_counts.values())
    priority_order = get_priority_order(vehicle_counts)

    print(
        f"Formula: {MIN_GREEN_TIME}s base + round((vehicles / total) * {ADAPTIVE_POOL_SECONDS}s), "
        f"capped to [{MIN_GREEN_TIME}s, {MAX_GREEN_TIME}s]"
    )
    print(f"Yellow transition time: {YELLOW_TIME}s per active phase\n")

    print(f"{'Priority':<10}{'Direction':<12}{'Vehicles':>10}{'Green Time (s)':>18}")
    print_separator("-", 50)
    for rank, direction in enumerate(priority_order, start=1):
        print(
            f"{rank:<10}"
            f"{direction:<12}"
            f"{vehicle_counts[direction]:>10}"
            f"{timings[direction]:>18}"
        )
    print_separator("-", 50)
    print(f"Total waiting vehicles: {total_vehicles}")
    print(f"Total green budget (4 phases): {sum(timings.values())}s")


def display_signal_status(signal_states, vehicle_counts, last_active_direction=None, current_timings=None):
    """Display the current signal colors (RED/YELLOW/GREEN) and waiting queues."""
    print_section_header("CURRENT SIGNAL STATUS")

    conflict = has_conflicting_greens(signal_states)
    print(f"Conflict Check: {'WARNING - CONFLICT' if conflict else 'SAFE (No conflicting greens)'}")
    if last_active_direction:
        print(f"Last Served Direction: {last_active_direction}")
    print()

    print(f"{'Direction':<12}{'Signal':<12}{'Waiting Vehicles':>18}{'Planned Green (s)':>20}")
    print_separator("-", 62)
    for direction in DIRECTIONS:
        planned = str(current_timings[direction]) if current_timings else "-"
        print(
            f"{direction:<12}"
            f"{signal_states[direction]:<12}"
            f"{vehicle_counts[direction]:>18}"
            f"{planned:>20}"
        )
    print_separator("-", 62)
