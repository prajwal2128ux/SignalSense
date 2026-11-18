"""
simulation.py
Module 4 (Provisional): Simulates vehicles passing through the intersection across cycles.
"""

from signal_control import (
    YELLOW_TIME,
    calculate_adaptive_timings,
    calculate_fixed_timings,
    create_initial_signal_states,
    get_priority_order,
    has_conflicting_greens,
    reset_all_signals,
    set_active_signal,
)
from utils import DIRECTIONS, print_section_header, print_separator

# Educational discharge rate: 1 vehicle crosses per second of green signal.
VEHICLES_PER_SECOND = 1


def run_simulation(initial_counts, num_cycles, mode="adaptive", verbose=True):
    """
    Simulate traffic clearing over `num_cycles` full rounds without mutating `initial_counts`.

    Args:
        initial_counts (dict): Starting vehicle counts per direction.
        num_cycles (int): Positive number of simulation rounds to execute.
        mode (str): "adaptive" or "fixed".
        verbose (bool): If True, print step-by-step cycle logs to the console.

    Returns:
        dict: Complete simulation results including processed counts, remaining counts,
              total wait time, and elapsed simulation seconds.
    """
    if num_cycles <= 0:
        raise ValueError("Number of simulation cycles must be positive.")
    if mode not in ("adaptive", "fixed"):
        raise ValueError("Simulation mode must be 'adaptive' or 'fixed'.")

    remaining_counts = dict(initial_counts)
    processed_per_direction = {direction: 0 for direction in DIRECTIONS}
    signal_states = create_initial_signal_states()

    total_wait_time = 0
    total_processed = 0
    elapsed_seconds = 0
    last_active_direction = None
    last_timings = (
        calculate_adaptive_timings(remaining_counts)
        if mode == "adaptive"
        else calculate_fixed_timings()
    )

    if verbose:
        print_section_header(f"RUNNING {mode.upper()} TRAFFIC SIMULATION ({num_cycles} CYCLE(S))")

    for cycle in range(1, num_cycles + 1):
        if verbose:
            print(f"\n--- Cycle {cycle} of {num_cycles} ---")

        if sum(remaining_counts.values()) == 0:
            if verbose:
                print("  All queues are empty. No vehicles waiting to pass.")
            continue

        if mode == "adaptive":
            cycle_timings = calculate_adaptive_timings(remaining_counts)
            phase_order = get_priority_order(remaining_counts)
        else:
            cycle_timings = calculate_fixed_timings()
            phase_order = list(DIRECTIONS)

        last_timings = cycle_timings

        for direction in phase_order:
            waiting = remaining_counts[direction]
            if waiting == 0:
                if verbose:
                    print(f"  {direction:<6} | RED    | 0 waiting (phase skipped)")
                continue

            green_time = cycle_timings[direction]
            set_active_signal(signal_states, direction, "GREEN")

            # Safety guard: ensure no two directions are GREEN or YELLOW simultaneously.
            if has_conflicting_greens(signal_states):
                raise RuntimeError("Safety violation: conflicting green signals detected.")

            capacity = green_time * VEHICLES_PER_SECOND
            passed = min(waiting, capacity)

            # Vehicles departing during this phase have waited `elapsed_seconds` before green
            # plus 0, 1, ..., (passed - 1) seconds while discharging one by one.
            phase_wait = (passed * elapsed_seconds) + (passed * (passed - 1)) // 2

            total_wait_time += phase_wait
            total_processed += passed
            processed_per_direction[direction] += passed
            remaining_counts[direction] -= passed
            last_active_direction = direction

            if verbose:
                print(
                    f"  {direction:<6} | GREEN  ({green_time:>2}s) | "
                    f"Passed: {passed:<4} | Remaining: {remaining_counts[direction]:<4} | "
                    f"Others: RED"
                )

            # Safe yellow transition before switching the active direction back to RED.
            set_active_signal(signal_states, direction, "YELLOW")
            if verbose:
                print(f"  {direction:<6} | YELLOW ({YELLOW_TIME:>2}s) | Clearing intersection")

            reset_all_signals(signal_states)
            elapsed_seconds += green_time + YELLOW_TIME

    if verbose:
        print()
        print_separator("=")
        print(
            f"Simulation complete: {total_processed} vehicle(s) processed, "
            f"{sum(remaining_counts.values())} remaining, "
            f"elapsed time {elapsed_seconds}s."
        )

    return {
        "mode": mode,
        "cycles_requested": num_cycles,
        "initial_counts": dict(initial_counts),
        "remaining_counts": remaining_counts,
        "processed_per_direction": processed_per_direction,
        "total_initial": sum(initial_counts.values()),
        "total_processed": total_processed,
        "total_remaining": sum(remaining_counts.values()),
        "total_wait_time": total_wait_time,
        "elapsed_seconds": elapsed_seconds,
        "signal_states": signal_states,
        "last_active_direction": last_active_direction,
        "last_timings": last_timings,
    }
