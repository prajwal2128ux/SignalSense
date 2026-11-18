# SignalSense: Adaptive Traffic Signal Simulation Model

**College Problem Reference:** `CP-074 — SignalSense: Adaptive Traffic Signal Simulation Model` (*Public Services, Utilities and Smart City — Advanced*)

> **Verification Notice (Important):** Only the official problem ID, title, and category were available at the time of implementation—not the college's detailed five-compulsory-feature specification. Accordingly, the five modules below follow a **provisional design (pending official CP-074 verification)** and do not claim full CP-074 compliance until checked against the official problem statement.

---

## 1. Project Introduction

**SignalSense** is a beginner-friendly, menu-driven Python console application that models a four-way road intersection (`North`, `South`, `East`, `West`). It lets a user enter waiting vehicle counts, view density levels, calculate density-proportional green signal durations within safe minimum and maximum bounds, simulate vehicles clearing the junction across multiple cycles, and compare adaptive signal performance against a fixed-time baseline.

This is strictly an **educational software simulation**—it does not connect to cameras, sensors, real-world traffic controllers, databases, or web/GUI interfaces.

---

## 2. Problem Statement & Objectives

Static traffic signals give every road the same fixed green duration regardless of congestion, leaving crowded lanes backed up while empty lanes stay green. SignalSense demonstrates how density-aware signal timing works in software using fundamental Python constructs.

### Objectives
- Model waiting vehicle counts across four intersection approaches (`North`, `South`, `East`, `West`).
- Classify and display traffic density clearly in tabular terminal output.
- Compute adaptive green signal durations with anti-starvation minimum (`10s`) and maximum (`60s`) caps.
- Enforce safe signal transitions (`GREEN` -> `YELLOW` -> `RED`) with zero conflicting green signals.
- Measure processed vehicles, remaining queues, and average waiting time, and compare adaptive vs. fixed-time (`30s`) performance.

---

## 3. Provisional Feature-to-Code Mapping

| Provisional Core Module | Key Responsibilities | Python Module |
| :--- | :--- | :--- |
| **Module 1: Traffic Density Management** | Manual/sample counts for N/S/E/W, input validation, share %, density labels (`Empty`, `Low`, `Medium`, `High`) | `traffic.py` |
| **Module 2: Adaptive Signal Timing** | Proportional green-time calculation (`10s` min, `60s` max), priority sorting, anti-starvation | `signal_control.py` |
| **Module 3: Traffic Signal Management** | `RED`/`YELLOW`/`GREEN` state updates, conflict checker (`has_conflicting_greens`), safe phase reset | `signal_control.py` |
| **Module 4: Traffic Simulation** | Multi-cycle vehicle discharge (`1` vehicle/s), remaining queue updates, phase-by-phase console log | `simulation.py` |
| **Module 5: Statistics & Analysis** | Total processed/remaining, average wait time, adaptive vs. fixed-time baseline comparison, CSV export | `statistics.py` |
| **Menu & Validation Layer** | 8-option console menu, safe integer/yes-no parsing, state management | `main.py`, `utils.py` |

---

## 4. Technologies Used

- **Language:** Python (`3.11.2` verified)
- **Libraries:** Python Standard Library only (`csv`, `os`, `datetime`, `unittest`)
- **Interface:** Terminal / Command Prompt (no GUI, website, or database)

---

## 5. Project Structure

```text
SignalSense/
├── main.py                  # Menu loop (options 1–8) and application state
├── traffic.py               # Vehicle density entry, classification, and display
├── signal_control.py        # Adaptive timing formula and safe signal state control
├── simulation.py            # Multi-cycle simulation engine (adaptive & fixed modes)
├── statistics.py            # Metrics, fixed-time comparison, and CSV history export
├── utils.py                 # Shared constants, formatting helpers, and input validation
├── test_signalsense.py      # Standard-library test suite (13 tests)
├── README.md                # Documentation, test results, and viva guide
└── data/
    └── traffic_records.csv  # Optional CSV log of completed simulation runs
```

---

## 6. Adaptive Algorithm & Formulas

1. **Constants (`signal_control.py`, `simulation.py`):**
   - `MIN_GREEN_TIME = 10` seconds
   - `MAX_GREEN_TIME = 60` seconds
   - `ADAPTIVE_POOL_SECONDS = 80` seconds
   - `YELLOW_TIME = 3` seconds
   - `FIXED_GREEN_TIME = 30` seconds (baseline)
   - `VEHICLES_PER_SECOND = 1` vehicle per second of green signal

2. **Green-Time Calculation:**
   - If total waiting vehicles is `0`, every direction receives `MIN_GREEN_TIME` (`10s`).
   - Otherwise, for each direction:
     ```
     raw_green = 10 + round((direction_vehicles / total_vehicles) * 80)
     green_time = max(10, min(60, raw_green))
     ```
   - Directions are served in descending queue-size order (`North -> South -> East -> West` on ties), once per cycle, skipping empty directions (`0` waiting vehicles).

3. **Waiting Time Calculation:**
   - At phase start time `elapsed_seconds`, if `passed` vehicles depart (`passed = min(waiting, green_time * 1)`), the `k`-th vehicle (`0 <= k < passed`) waits `elapsed_seconds + k` seconds.
   - Total phase wait is computed cleanly via `passed * elapsed_seconds + passed * (passed - 1) // 2`.
   - Average waiting time = `total_wait_time / total_processed` (reported as `N/A` if `total_processed == 0`).

---

## 7. Installation and Execution

No third-party packages are required. From inside the `SignalSense` directory:

```bash
cd SignalSense
python main.py
```
*(Use `python3 main.py` if your system maps `python` to Python 2 or omits the `python` alias.)*

To run the automated test suite:

```bash
python3 test_signalsense.py
```

---

## 8. Sample Terminal Output

Executed with `python3 SignalSense/main.py` using sample traffic (`N=45, S=15, E=25, W=10`) and `2` cycles:

```text
========================================
             SIGNALSENSE
     ADAPTIVE TRAFFIC SIMULATION
========================================

1. Enter Traffic Density
2. View Traffic Density
3. Calculate Adaptive Signal Timing
4. Start Traffic Simulation
5. View Current Signal Status
6. View Traffic Statistics
7. Reset Simulation
8. Exit

========================================
Enter your choice (1-8): 3

========================================================
  ADAPTIVE SIGNAL TIMING PLAN
========================================================
Formula: 10s base + round((vehicles / total) * 80s), capped to [10s, 60s]
Yellow transition time: 3s per active phase

Priority  Direction     Vehicles    Green Time (s)
--------------------------------------------------
1         North               45                48
2         East                25                31
3         South               15                23
4         West                10                18
--------------------------------------------------
Total waiting vehicles: 95
Total green budget (4 phases): 120s
```

Simulation statistics output from the same run:

```text
Simulation Cycles Run      : 2
Total Starting Vehicles    : 95
Total Vehicles Processed   : 95
Total Vehicles Remaining   : 0
Total Elapsed Time         : 132 s
Average Waiting Time       : 53.68 s

Comparison: Adaptive vs. Fixed-Time Baseline (30s per phase, N->S->E->W)
----------------------------------------------------------------
Metric                                Adaptive        Fixed-Time
----------------------------------------------------------------
Vehicles Processed                          95                95
Vehicles Remaining                           0                 0
Total Elapsed Time (s)                     132               165
Average Waiting Time                   53.68 s           64.26 s
----------------------------------------------------------------
Waiting Time Change (Adaptive vs Fixed): +16.46%
```

---

## 9. Test Cases & Actual Executed Results

All 13 automated tests in `test_signalsense.py` were executed with `python3 SignalSense/test_signalsense.py` and passed (`Ran 13 tests in 0.013s — OK`).

| # | Scenario | Input | Expected Output | Actual Output (Observed) | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Equal traffic | `N=20, S=20, E=20, W=20`, 1 cycle | `30s` each; 80 processed, 0 remaining | `30s` each; `total_processed=80, remaining=0` | Pass |
| 2 | Heavy North | `N=100, S=10, E=10, W=10`, 1 cycle | North capped at `60s`, served first; 40 remain | `timings["North"]=60`, priority #1, 40 remain | Pass |
| 3 | Heavy South | `N=10, S=100, E=10, W=10` | South capped at `60s`, served first | `timings["South"]=60`, priority #1 | Pass |
| 4 | Heavy East | `N=10, S=10, E=100, W=10` | East capped at `60s`, served first | `timings["East"]=60`, priority #1 | Pass |
| 5 | Heavy West | `N=10, S=10, E=10, W=100` | West capped at `60s`, served first | `timings["West"]=60`, priority #1 | Pass |
| 6 | No traffic | `0, 0, 0, 0`, 2 cycles | `10s` baseline; 0 processed; avg wait `None`/`N/A` | `10s` each; `total_processed=0`, `avg_wait=None` | Pass |
| 7 | Single direction | `N=50, S=0, E=0, W=0`, 1 cycle | Only North runs (`60s + 3s = 63s`), 50 cleared | `processed["North"]=50`, `elapsed=63s` | Pass |
| 8 | Invalid & negative input | `""`, `"abc"`, `"-5"`, `"10001"`, `"25"`; `cycles=0` | Reject invalid/out-of-range inputs; accept `25`; `ValueError` on `cycles=0` | Re-prompted safely; returned `25`; raised `ValueError` | Pass |
| 9 | Multiple cycles | `N=90, S=10, E=10, W=10` (1 vs 2 cycles) | Queue remains after 1 cycle; 0 remain after 2 cycles | Cycle 1: `remaining > 0`; Cycle 2: `120` processed, `0` remain | Pass |
| 10 | Min/max timing bounds | `N=5000, S=1, E=0, W=1` | All durations in `[10, 60]`; `N=60`, `E=10` | `North=60`, `East=10`, all within `[10, 60]` | Pass |
| 11 | High/low fairness | `N=500, S=2, E=0, W=0`, 1 cycle | Both North (`60`) and South (`2`) served in cycle 1 | `processed["North"]=60`, `processed["South"]=2` | Pass |
| 12 | No conflicting greens | All `set_active_signal` transitions + forced conflict | Only 1 active non-RED; forced double-GREEN caught | `has_conflicting_greens` `False` normally, `True` on double-GREEN | Pass |
| 13 | Baseline & CSV export | `N=60, S=10, E=10, W=10`, 2 cycles + temp CSV | Adaptive avg wait < Fixed avg wait; 2 CSV lines written | Verified lower adaptive wait and valid 2-line CSV | Pass |

An interactive piped CLI session (`9`, `abc`, `1 -> 2`, `2`, `3`, `4 -> 2 -> n`, `5`, `6`, `7`, `2`, `8`) also ran cleanly with exit code `0`.

---

## 10. Limitations

1. **Static initial queues:** Vehicles are entered before running cycles; new random arrivals during a cycle are not modeled in this provisional version.
2. **Uniform discharge rate:** Assumes a constant `1` vehicle/second departure rate without acceleration delay, lane changing, or turning movements.
3. **Single intersection only:** Does not coordinate signals across multiple connected junctions.
4. **Educational scope:** Designed for Python learning and viva explanation, not real-world traffic engineering deployment.

---

## 11. Viva Preparation Guide

- **What is SignalSense?** A console-based Python simulation of a four-way traffic junction that allocates green signal durations based on vehicle density rather than fixed timers.
- **What is adaptive traffic signal control?** A signal strategy that adjusts green phase durations dynamically using current queue lengths while enforcing minimum/maximum safety limits.
- **Why did we select Python?** Python has clean syntax, built-in dictionaries and lists, straightforward exception handling (`try/except ValueError`), and standard libraries (`csv`, `unittest`) with zero setup overhead.
- **What is traffic density here?** The number of waiting vehicles per approach (`North`, `South`, `East`, `West`), along with its percentage share of total junction demand and label (`Empty`, `Low`, `Medium`, `High`).
- **How is green signal time calculated?** `10 + round((direction_vehicles / total_vehicles) * 80)`, clamped between `10s` (`MIN_GREEN_TIME`) and `60s` (`MAX_GREEN_TIME`).
- **Which data structures are used?** Python dictionaries (`{"North": 45, ...}`) for O(1) direction lookups, lists (`DIRECTIONS`) for fixed tie-breaking order, and result dictionaries returned by `run_simulation()`.
- **What is modular programming?** Splitting the program into focused files (`traffic.py`, `signal_control.py`, `simulation.py`, `statistics.py`, `utils.py`, `main.py`) so each file handles one clear responsibility.
- **How is input validation implemented?** `get_valid_int()` in `utils.py` loops until input is non-empty, converts cleanly with `int(...)` inside `try/except ValueError`, and satisfies `min_value` / `max_value`.
- **How are waiting times calculated?** Each departing vehicle waits `elapsed_seconds` prior to its green phase plus `k` seconds in the discharge queue; `average_wait = total_wait_time / total_processed` (`N/A` if `0` processed).
- **Code-level viva check:** Notice `run_simulation()` copies `initial_counts` into `remaining_counts = dict(initial_counts)` so comparing Adaptive vs. Fixed-Time uses the exact same starting traffic without mutating one another's counts.
