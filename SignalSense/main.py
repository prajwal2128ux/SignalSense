"""
main.py
Entry point and menu controller for SignalSense: Adaptive Traffic Signal Simulation.
Note: Provisional 5-module design pending official CP-74 five-feature verification.
"""

from signal_control import (
    calculate_adaptive_timings,
    create_initial_signal_states,
    display_adaptive_timings,
    display_signal_status,
)
from simulation import run_simulation
from statistics import (
    compare_adaptive_vs_fixed,
    display_statistics,
    save_simulation_to_csv,
)
from traffic import create_empty_counts, display_traffic_density, input_traffic_density
from utils import MAX_SIMULATION_CYCLES, get_valid_int, get_yes_no, print_banner


def display_menu():
    """Print the SignalSense console menu."""
    print()
    print_banner()
    print()
    print("1. Enter Traffic Density")
    print("2. View Traffic Density")
    print("3. Calculate Adaptive Signal Timing")
    print("4. Start Traffic Simulation")
    print("5. View Current Signal Status")
    print("6. View Traffic Statistics")
    print("7. Reset Simulation")
    print("8. Exit")
    print()
    print("=" * 40)


def create_app_state():
    """Return a clean initial application state dictionary."""
    return {
        "vehicle_counts": create_empty_counts(),
        "signal_states": create_initial_signal_states(),
        "current_timings": None,
        "last_active_direction": None,
        "last_result": None,
        "last_fixed_result": None,
    }


def main():
    """Run the menu-driven SignalSense console loop."""
    state = create_app_state()

    while True:
        display_menu()
        choice = get_valid_int("Enter your choice (1-8): ", min_value=1, max_value=8)

        if choice == 1:
            state["vehicle_counts"] = input_traffic_density()
            state["current_timings"] = None
            state["signal_states"] = create_initial_signal_states()
            state["last_active_direction"] = None
            state["last_result"] = None
            state["last_fixed_result"] = None

        elif choice == 2:
            display_traffic_density(state["vehicle_counts"])

        elif choice == 3:
            timings = calculate_adaptive_timings(state["vehicle_counts"])
            state["current_timings"] = timings
            display_adaptive_timings(state["vehicle_counts"], timings)

        elif choice == 4:
            if sum(state["vehicle_counts"].values()) == 0:
                print("\n[Notice] All directions currently have 0 vehicles.")
                print("Use Option 1 to enter traffic counts, or running now will process 0 vehicles.")

            num_cycles = get_valid_int(
                f"Enter number of simulation cycles (1-{MAX_SIMULATION_CYCLES}): ",
                min_value=1,
                max_value=MAX_SIMULATION_CYCLES,
            )

            starting_counts = dict(state["vehicle_counts"])
            adaptive_result = run_simulation(
                starting_counts,
                num_cycles,
                mode="adaptive",
                verbose=True,
            )
            fixed_result = compare_adaptive_vs_fixed(starting_counts, num_cycles)

            # Update active waiting queues and signal metadata after simulation.
            state["vehicle_counts"] = dict(adaptive_result["remaining_counts"])
            state["signal_states"] = dict(adaptive_result["signal_states"])
            state["last_active_direction"] = adaptive_result["last_active_direction"]
            state["current_timings"] = adaptive_result["last_timings"]
            state["last_result"] = adaptive_result
            state["last_fixed_result"] = fixed_result

            if get_yes_no("\nSave simulation summary to data/traffic_records.csv? (y/n): "):
                save_simulation_to_csv(adaptive_result, fixed_result)
                print("Simulation summary saved to data/traffic_records.csv.")

        elif choice == 5:
            display_signal_status(
                state["signal_states"],
                state["vehicle_counts"],
                state["last_active_direction"],
                state["current_timings"],
            )

        elif choice == 6:
            display_statistics(state["last_result"], state["last_fixed_result"])

        elif choice == 7:
            state = create_app_state()
            print("\nSimulation reset. All vehicle counts, timings, signals, and statistics cleared.")

        elif choice == 8:
            print("\nExiting SignalSense. Goodbye!")
            break


if __name__ == "__main__":
    main()
