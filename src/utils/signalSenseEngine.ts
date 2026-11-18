export const DIRECTIONS = ['North', 'South', 'East', 'West'] as const;
export type Direction = (typeof DIRECTIONS)[number];
export type SignalColor = 'RED' | 'YELLOW' | 'GREEN';
export type DensityLevel = 'Empty' | 'Low' | 'Medium' | 'High';

export const MAX_VEHICLES_PER_DIRECTION = 10000;
export const MAX_SIMULATION_CYCLES = 100;
export const MIN_GREEN_TIME = 10;
export const MAX_GREEN_TIME = 60;
export const YELLOW_TIME = 3;
export const FIXED_GREEN_TIME = 30;
export const ADAPTIVE_POOL_SECONDS = 80;
export const VEHICLES_PER_SECOND = 1;

export type VehicleCounts = Record<Direction, number>;
export type SignalStates = Record<Direction, SignalColor>;
export type TimingPlan = Record<Direction, number>;

export interface DensityRow {
  direction: Direction;
  count: number;
  sharePercent: number;
  level: DensityLevel;
}

export interface SimulationStep {
  cycle: number;
  direction: Direction;
  signal: SignalColor;
  durationSeconds: number;
  passed: number;
  remainingAfter: number;
  waitingBefore: number;
  elapsedAtStart: number;
  remainingSnapshot: VehicleCounts;
  signalStatesSnapshot: SignalStates;
  note: string;
}

export interface SimulationResult {
  mode: 'adaptive' | 'fixed';
  cyclesRequested: number;
  initialCounts: VehicleCounts;
  remainingCounts: VehicleCounts;
  processedPerDirection: VehicleCounts;
  totalInitial: number;
  totalProcessed: number;
  totalRemaining: number;
  totalWaitTime: number;
  elapsedSeconds: number;
  signalStates: SignalStates;
  lastActiveDirection: Direction | null;
  lastTimings: TimingPlan;
  steps: SimulationStep[];
}

export function createEmptyCounts(): VehicleCounts {
  return { North: 0, South: 0, East: 0, West: 0 };
}

export function getSampleTrafficCounts(): VehicleCounts {
  return { North: 45, South: 15, East: 25, West: 10 };
}

export function createInitialSignalStates(): SignalStates {
  return { North: 'RED', South: 'RED', East: 'RED', West: 'RED' };
}

export function classifyDensity(count: number): DensityLevel {
  if (count === 0) return 'Empty';
  if (count <= 15) return 'Low';
  if (count <= 35) return 'Medium';
  return 'High';
}

export function calculateDensitySummary(counts: VehicleCounts): {
  rows: DensityRow[];
  totalVehicles: number;
} {
  const totalVehicles = DIRECTIONS.reduce((sum, dir) => sum + counts[dir], 0);
  const rows: DensityRow[] = DIRECTIONS.map((direction) => {
    const count = counts[direction];
    const sharePercent = totalVehicles > 0 ? (count / totalVehicles) * 100 : 0;
    return {
      direction,
      count,
      sharePercent,
      level: classifyDensity(count),
    };
  });
  return { rows, totalVehicles };
}

export function hasConflictingGreens(states: SignalStates): boolean {
  let active = 0;
  for (const dir of DIRECTIONS) {
    if (states[dir] === 'GREEN' || states[dir] === 'YELLOW') {
      active += 1;
    }
  }
  return active > 1;
}

export function setActiveSignal(
  states: SignalStates,
  activeDirection: Direction,
  color: SignalColor
): SignalStates {
  const next = createInitialSignalStates();
  for (const dir of DIRECTIONS) {
    next[dir] = dir === activeDirection ? color : 'RED';
  }
  return next;
}

export function calculateAdaptiveTimings(counts: VehicleCounts): TimingPlan {
  const total = DIRECTIONS.reduce((sum, dir) => sum + counts[dir], 0);
  const timings = createEmptyCounts();

  if (total === 0) {
    for (const dir of DIRECTIONS) {
      timings[dir] = MIN_GREEN_TIME;
    }
    return timings;
  }

  for (const dir of DIRECTIONS) {
    const proportion = counts[dir] / total;
    const rawGreen = MIN_GREEN_TIME + Math.round(proportion * ADAPTIVE_POOL_SECONDS);
    timings[dir] = Math.max(MIN_GREEN_TIME, Math.min(MAX_GREEN_TIME, rawGreen));
  }

  return timings;
}

export function calculateFixedTimings(): TimingPlan {
  return {
    North: FIXED_GREEN_TIME,
    South: FIXED_GREEN_TIME,
    East: FIXED_GREEN_TIME,
    West: FIXED_GREEN_TIME,
  };
}

export function getPriorityOrder(counts: VehicleCounts): Direction[] {
  return [...DIRECTIONS].sort((a, b) => {
    const diff = counts[b] - counts[a];
    if (diff !== 0) return diff;
    return DIRECTIONS.indexOf(a) - DIRECTIONS.indexOf(b);
  });
}

export function runSimulation(
  initialCounts: VehicleCounts,
  numCycles: number,
  mode: 'adaptive' | 'fixed' = 'adaptive'
): SimulationResult {
  if (!Number.isInteger(numCycles) || numCycles <= 0 || numCycles > MAX_SIMULATION_CYCLES) {
    throw new Error(`Cycles must be an integer between 1 and ${MAX_SIMULATION_CYCLES}.`);
  }

  const remainingCounts: VehicleCounts = { ...initialCounts };
  const processedPerDirection = createEmptyCounts();
  let signalStates = createInitialSignalStates();

  let totalWaitTime = 0;
  let totalProcessed = 0;
  let elapsedSeconds = 0;
  let lastActiveDirection: Direction | null = null;
  let lastTimings =
    mode === 'adaptive' ? calculateAdaptiveTimings(remainingCounts) : calculateFixedTimings();
  const steps: SimulationStep[] = [];

  for (let cycle = 1; cycle <= numCycles; cycle += 1) {
    const waitingSum = DIRECTIONS.reduce((sum, dir) => sum + remainingCounts[dir], 0);
    if (waitingSum === 0) {
      steps.push({
        cycle,
        direction: 'North',
        signal: 'RED',
        durationSeconds: 0,
        passed: 0,
        remainingAfter: 0,
        waitingBefore: 0,
        elapsedAtStart: elapsedSeconds,
        remainingSnapshot: { ...remainingCounts },
        signalStatesSnapshot: createInitialSignalStates(),
        note: `Cycle ${cycle}: All queues are empty. No vehicles waiting to pass.`,
      });
      continue;
    }

    const cycleTimings =
      mode === 'adaptive' ? calculateAdaptiveTimings(remainingCounts) : calculateFixedTimings();
    const phaseOrder = mode === 'adaptive' ? getPriorityOrder(remainingCounts) : [...DIRECTIONS];
    lastTimings = cycleTimings;

    for (const direction of phaseOrder) {
      const waiting = remainingCounts[direction];
      if (waiting === 0) {
        steps.push({
          cycle,
          direction,
          signal: 'RED',
          durationSeconds: 0,
          passed: 0,
          remainingAfter: 0,
          waitingBefore: 0,
          elapsedAtStart: elapsedSeconds,
          remainingSnapshot: { ...remainingCounts },
          signalStatesSnapshot: createInitialSignalStates(),
          note: `${direction.padEnd(6)} | RED    | 0 waiting (phase skipped)`,
        });
        continue;
      }

      const greenTime = cycleTimings[direction];
      signalStates = setActiveSignal(signalStates, direction, 'GREEN');
      if (hasConflictingGreens(signalStates)) {
        throw new Error('Safety violation: conflicting green signals detected.');
      }

      const capacity = greenTime * VEHICLES_PER_SECOND;
      const passed = Math.min(waiting, capacity);
      const phaseWait = passed * elapsedSeconds + Math.floor((passed * (passed - 1)) / 2);

      totalWaitTime += phaseWait;
      totalProcessed += passed;
      processedPerDirection[direction] += passed;
      remainingCounts[direction] -= passed;
      lastActiveDirection = direction;

      steps.push({
        cycle,
        direction,
        signal: 'GREEN',
        durationSeconds: greenTime,
        passed,
        remainingAfter: remainingCounts[direction],
        waitingBefore: waiting,
        elapsedAtStart: elapsedSeconds,
        remainingSnapshot: { ...remainingCounts },
        signalStatesSnapshot: { ...signalStates },
        note: `${direction.padEnd(6)} | GREEN  (${String(greenTime).padStart(2)}s) | Passed: ${String(passed).padEnd(4)} | Remaining: ${String(remainingCounts[direction]).padEnd(4)} | Others: RED`,
      });

      signalStates = setActiveSignal(signalStates, direction, 'YELLOW');
      steps.push({
        cycle,
        direction,
        signal: 'YELLOW',
        durationSeconds: YELLOW_TIME,
        passed: 0,
        remainingAfter: remainingCounts[direction],
        waitingBefore: remainingCounts[direction],
        elapsedAtStart: elapsedSeconds + greenTime,
        remainingSnapshot: { ...remainingCounts },
        signalStatesSnapshot: { ...signalStates },
        note: `${direction.padEnd(6)} | YELLOW (${String(YELLOW_TIME).padStart(2)}s) | Clearing intersection`,
      });

      signalStates = createInitialSignalStates();
      elapsedSeconds += greenTime + YELLOW_TIME;
    }
  }

  const totalInitial = DIRECTIONS.reduce((sum, dir) => sum + initialCounts[dir], 0);
  const totalRemaining = DIRECTIONS.reduce((sum, dir) => sum + remainingCounts[dir], 0);

  return {
    mode,
    cyclesRequested: numCycles,
    initialCounts: { ...initialCounts },
    remainingCounts,
    processedPerDirection,
    totalInitial,
    totalProcessed,
    totalRemaining,
    totalWaitTime,
    elapsedSeconds,
    signalStates,
    lastActiveDirection,
    lastTimings,
    steps,
  };
}

export function calculateAverageWait(result: SimulationResult): number | null {
  if (result.totalProcessed === 0) return null;
  return result.totalWaitTime / result.totalProcessed;
}

export function formatWaitTime(wait: number | null): string {
  if (wait === null) return 'N/A (0 processed)';
  return `${wait.toFixed(2)} s`;
}

export function validateVehicleCountInput(raw: string): {
  valid: boolean;
  value?: number;
  error?: string;
} {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { valid: false, error: 'Input cannot be empty. Enter a whole number.' };
  }
  if (!/^-?\d+$/.test(trimmed)) {
    return { valid: false, error: 'Enter digits only (no letters or decimals).' };
  }
  const num = Number(trimmed);
  if (!Number.isSafeInteger(num) || num < 0) {
    return { valid: false, error: 'Vehicle count must be 0 or greater.' };
  }
  if (num > MAX_VEHICLES_PER_DIRECTION) {
    return {
      valid: false,
      error: `Vehicle count must not exceed ${MAX_VEHICLES_PER_DIRECTION}.`,
    };
  }
  return { valid: true, value: num };
}
