import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_GREEN_TIME,
  MIN_GREEN_TIME,
  calculateAdaptiveTimings,
  calculateAverageWait,
  createInitialSignalStates,
  getPriorityOrder,
  getSampleTrafficCounts,
  hasConflictingGreens,
  runSimulation,
  setActiveSignal,
  validateVehicleCountInput,
} from './signalSenseEngine';

test('equal traffic yields 30s per direction and clears in 1 cycle', () => {
  const counts = { North: 20, South: 20, East: 20, West: 20 };
  const timings = calculateAdaptiveTimings(counts);
  assert.deepEqual(timings, { North: 30, South: 30, East: 30, West: 30 });
  const result = runSimulation(counts, 1, 'adaptive');
  assert.equal(result.totalProcessed, 80);
  assert.equal(result.totalRemaining, 0);
});

test('sample traffic produces expected adaptive timing and beats fixed baseline', () => {
  const sample = getSampleTrafficCounts();
  const timings = calculateAdaptiveTimings(sample);
  assert.deepEqual(timings, { North: 48, South: 23, East: 31, West: 18 });

  const adaptive = runSimulation(sample, 2, 'adaptive');
  const fixed = runSimulation(sample, 2, 'fixed');
  assert.equal(adaptive.totalProcessed, 95);
  assert.equal(adaptive.elapsedSeconds, 132);
  assert.equal(fixed.elapsedSeconds, 165);
  assert.equal(Number(calculateAverageWait(adaptive)?.toFixed(2)), 53.68);
  assert.equal(Number(calculateAverageWait(fixed)?.toFixed(2)), 64.26);
});

test('zero traffic enforces minimum green and returns null average wait', () => {
  const zero = { North: 0, South: 0, East: 0, West: 0 };
  const timings = calculateAdaptiveTimings(zero);
  assert.deepEqual(timings, {
    North: MIN_GREEN_TIME,
    South: MIN_GREEN_TIME,
    East: MIN_GREEN_TIME,
    West: MIN_GREEN_TIME,
  });
  const result = runSimulation(zero, 2, 'adaptive');
  assert.equal(result.totalProcessed, 0);
  assert.equal(calculateAverageWait(result), null);
});

test('extreme ratios clamp to [10, 60] and preserve priority ties', () => {
  const counts = { North: 5000, South: 1, East: 0, West: 1 };
  const timings = calculateAdaptiveTimings(counts);
  assert.equal(timings.North, MAX_GREEN_TIME);
  assert.equal(timings.East, MIN_GREEN_TIME);
  assert.deepEqual(getPriorityOrder(counts), ['North', 'South', 'West', 'East']);
});

test('no conflicting green signals occur and validator rejects invalid input', () => {
  let states = createInitialSignalStates();
  assert.equal(hasConflictingGreens(states), false);
  states = setActiveSignal(states, 'East', 'GREEN');
  assert.equal(hasConflictingGreens(states), false);
  assert.equal(hasConflictingGreens({ North: 'GREEN', South: 'RED', East: 'GREEN', West: 'RED' }), true);

  assert.equal(validateVehicleCountInput('').valid, false);
  assert.equal(validateVehicleCountInput('-4').valid, false);
  assert.equal(validateVehicleCountInput('abc').valid, false);
  assert.equal(validateVehicleCountInput('10001').valid, false);
  assert.deepEqual(validateVehicleCountInput('25'), { valid: true, value: 25 });
});
