"""
utils.py
Reusable helper functions and safe console input validation for SignalSense.
"""

# Standard four-way intersection directions in fixed tie-breaking order.
DIRECTIONS = ["North", "South", "East", "West"]

# Reasonable upper bounds to reject unrealistic inputs in a single-junction model.
MAX_VEHICLES_PER_DIRECTION = 10000
MAX_SIMULATION_CYCLES = 100


def print_separator(char="-", width=56):
    """Print a horizontal divider line."""
    print(char * width)


def print_banner():
    """Print the main application banner matching the console layout."""
    print("=" * 40)
    print("             SIGNALSENSE")
    print("     ADAPTIVE TRAFFIC SIMULATION")
    print("=" * 40)


def print_section_header(title):
    """Print a clean section heading."""
    print()
    print_separator("=")
    print(f"  {title}")
    print_separator("=")


def get_valid_int(prompt, min_value=None, max_value=None):
    """
    Prompt the user until they enter a valid integer within optional bounds.
    Handles empty input, non-numeric text, and out-of-range values without crashing.
    """
    while True:
        try:
            raw_input = input(prompt).strip()
        except EOFError:
            print("\nInput stream ended. Returning default fallback.")
            return min_value if min_value is not None else 0

        if raw_input == "":
            print("  [Invalid Input] Input cannot be empty. Please enter a whole number.")
            continue

        try:
            value = int(raw_input)
        except ValueError:
            print("  [Invalid Input] Please enter digits only (no letters or decimals).")
            continue

        if min_value is not None and value < min_value:
            print(f"  [Out of Range] Value must be at least {min_value}.")
            continue

        if max_value is not None and value > max_value:
            print(f"  [Out of Range] Value must not exceed {max_value}.")
            continue

        return value


def get_yes_no(prompt):
    """Prompt the user for a yes/no response and return True for yes, False for no."""
    while True:
        try:
            answer = input(prompt).strip().lower()
        except EOFError:
            return False

        if answer in ("y", "yes"):
            return True
        if answer in ("n", "no"):
            return False
        print("  [Invalid Input] Please enter 'y' (yes) or 'n' (no).")
