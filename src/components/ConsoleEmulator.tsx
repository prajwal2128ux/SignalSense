import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  DIRECTIONS,
  MAX_SIMULATION_CYCLES,
  MAX_VEHICLES_PER_DIRECTION,
  MIN_GREEN_TIME,
  MAX_GREEN_TIME,
  ADAPTIVE_POOL_SECONDS,
  YELLOW_TIME,
  SignalStates,
  SimulationResult,
  TimingPlan,
  VehicleCounts,
  calculateAdaptiveTimings,
  calculateAverageWait,
  calculateDensitySummary,
  createEmptyCounts,
  createInitialSignalStates,
  formatWaitTime,
  getPriorityOrder,
  getSampleTrafficCounts,
  hasConflictingGreens,
  runSimulation,
  validateVehicleCountInput,
} from '../utils/signalSenseEngine';

type PromptStage =
  | 'MENU'
  | 'INPUT_METHOD'
  | 'ENTER_NORTH'
  | 'ENTER_SOUTH'
  | 'ENTER_EAST'
  | 'ENTER_WEST'
  | 'SIM_CYCLES';

const MENU_TEXT = [
  '========================================',
  '             SIGNALSENSE',
  '     ADAPTIVE TRAFFIC SIMULATION',
  '========================================',
  '1. Enter Traffic Density',
  '2. View Traffic Density',
  '3. Calculate Adaptive Signal Timing',
  '4. Start Traffic Simulation',
  '5. View Current Signal Status',
  '6. View Traffic Statistics',
  '7. Reset Simulation',
  '8. Exit',
  '========================================',
].join('\n');

export function ConsoleEmulator() {
  const [counts, setCounts] = useState<VehicleCounts>(getSampleTrafficCounts());
  const [draftCounts, setDraftCounts] = useState<VehicleCounts>(createEmptyCounts());
  const [signalStates, setSignalStates] = useState<SignalStates>(createInitialSignalStates());
  const [timings, setTimings] = useState<TimingPlan | null>(null);
  const [lastActive, setLastActive] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SimulationResult | null>(null);
  const [lastFixed, setLastFixed] = useState<SimulationResult | null>(null);
  const [stage, setStage] = useState<PromptStage>('MENU');
  const [commandInput, setCommandInput] = useState('');
  const [log, setLog] = useState<string[]>([
    MENU_TEXT,
    'Sample traffic preloaded (N=45, S=15, E=25, W=10). Enter 1-8 or click a menu action.',
  ]);
  const outputRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [log]);

  const appendLog = (...lines: string[]) => {
    setLog((prev) => [...prev, ...lines]);
  };

  const executeMenuOption = (choice: number) => {
    if (choice === 1) {
      setStage('INPUT_METHOD');
      appendLog(
        '> 1',
        '--- ENTER TRAFFIC DENSITY ---',
        '1. Enter vehicle counts manually',
        '2. Load sample traffic data (N=45, S=15, E=25, W=10)',
        'Select input method (1-2):'
      );
      return;
    }

    if (choice === 2) {
      const { rows, totalVehicles } = calculateDensitySummary(counts);
      const table = [
        '--- TRAFFIC DENSITY SUMMARY ---',
        'Direction     Vehicles     Share (%)   Density Level',
        '----------------------------------------------------',
        ...rows.map(
          (r) =>
            `${r.direction.padEnd(12)}  ${String(r.count).padStart(8)}  ${r.sharePercent
              .toFixed(1)
              .padStart(12)}%  ${r.level.padStart(14)}`
        ),
        '----------------------------------------------------',
        `Total         ${String(totalVehicles).padStart(8)}  ${(totalVehicles > 0 ? 100 : 0)
          .toFixed(1)
          .padStart(12)}%`,
      ];
      appendLog('> 2', ...table);
      return;
    }

    if (choice === 3) {
      const computed = calculateAdaptiveTimings(counts);
      setTimings(computed);
      const order = getPriorityOrder(counts);
      const total = DIRECTIONS.reduce((s, d) => s + counts[d], 0);
      const budget = DIRECTIONS.reduce((s, d) => s + computed[d], 0);
      appendLog(
        '> 3',
        '--- ADAPTIVE SIGNAL TIMING PLAN ---',
        `Formula: ${MIN_GREEN_TIME}s base + round((vehicles / total) * ${ADAPTIVE_POOL_SECONDS}s), capped [${MIN_GREEN_TIME}s, ${MAX_GREEN_TIME}s], yellow ${YELLOW_TIME}s`,
        'Priority  Direction     Vehicles    Green Time (s)',
        '--------------------------------------------------',
        ...order.map(
          (d, idx) =>
            `${String(idx + 1).padEnd(10)}${d.padEnd(12)}${String(counts[d]).padStart(10)}${String(
              computed[d]
            ).padStart(18)}`
        ),
        '--------------------------------------------------',
        `Total waiting vehicles: ${total} | Total green budget: ${budget}s`
      );
      return;
    }

    if (choice === 4) {
      setStage('SIM_CYCLES');
      appendLog(
        '> 4',
        `Enter number of simulation cycles (1-${MAX_SIMULATION_CYCLES}):`
      );
      return;
    }

    if (choice === 5) {
      const conflict = hasConflictingGreens(signalStates);
      appendLog(
        '> 5',
        '--- CURRENT SIGNAL STATUS ---',
        `Conflict Check: ${conflict ? 'WARNING - CONFLICT' : 'SAFE (No conflicting greens)'}`,
        lastActive ? `Last Served Direction: ${lastActive}` : 'Last Served Direction: None yet',
        'Direction   Signal      Waiting   Planned Green (s)',
        '---------------------------------------------------',
        ...DIRECTIONS.map(
          (d) =>
            `${d.padEnd(12)}${signalStates[d].padEnd(12)}${String(counts[d]).padStart(7)}   ${
              timings ? String(timings[d]).padStart(17) : '-'.padStart(17)
            }`
        )
      );
      return;
    }

    if (choice === 6) {
      if (!lastResult || !lastFixed) {
        appendLog(
          '> 6',
          'No simulation has been run yet. Run option 4 first.'
        );
        return;
      }
      const adaptiveAvg = calculateAverageWait(lastResult);
      const fixedAvg = calculateAverageWait(lastFixed);
      const pct =
        adaptiveAvg !== null && fixedAvg !== null && fixedAvg > 0
          ? `${(((fixedAvg - adaptiveAvg) / fixedAvg) * 100).toFixed(2)}%`
          : 'N/A';

      appendLog(
        '> 6',
        '--- TRAFFIC STATISTICS & PERFORMANCE REPORT ---',
        `Cycles: ${lastResult.cyclesRequested} | Initial: ${lastResult.totalInitial} | Processed: ${lastResult.totalProcessed} | Remaining: ${lastResult.totalRemaining}`,
        `Elapsed Time: ${lastResult.elapsedSeconds}s | Adaptive Avg Wait: ${formatWaitTime(adaptiveAvg)}`,
        `Fixed Baseline (30s): Elapsed ${lastFixed.elapsedSeconds}s | Fixed Avg Wait: ${formatWaitTime(fixedAvg)} | Wait Change: ${pct}`
      );
      return;
    }

    if (choice === 7) {
      setCounts(createEmptyCounts());
      setSignalStates(createInitialSignalStates());
      setTimings(null);
      setLastActive(null);
      setLastResult(null);
      setLastFixed(null);
      setStage('MENU');
      appendLog('> 7', 'Simulation reset. All counts, timings, and statistics cleared.');
      return;
    }

    if (choice === 8) {
      appendLog('> 8', 'Exiting SignalSense console session. Select any option 1-7 to restart.');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const raw = commandInput.trim();
    setCommandInput('');

    if (stage === 'MENU') {
      const parsed = Number(raw);
      if (!/^\d+$/.test(raw) || parsed < 1 || parsed > 8) {
        appendLog(`> ${raw || '(empty)'}`, '  [Invalid Input] Enter a menu choice from 1 to 8.');
        return;
      }
      executeMenuOption(parsed);
      return;
    }

    if (stage === 'INPUT_METHOD') {
      if (raw === '2') {
        const sample = getSampleTrafficCounts();
        setCounts(sample);
        setTimings(null);
        setLastResult(null);
        setLastFixed(null);
        setStage('MENU');
        appendLog('> 2', 'Sample traffic counts loaded (N=45, S=15, E=25, W=10).');
        return;
      }
      if (raw === '1') {
        setDraftCounts(createEmptyCounts());
        setStage('ENTER_NORTH');
        appendLog('> 1', `Enter North waiting vehicles (0-${MAX_VEHICLES_PER_DIRECTION}):`);
        return;
      }
      appendLog(`> ${raw}`, '  [Invalid Input] Enter 1 for manual entry or 2 for sample data.');
      return;
    }

    if (
      stage === 'ENTER_NORTH' ||
      stage === 'ENTER_SOUTH' ||
      stage === 'ENTER_EAST' ||
      stage === 'ENTER_WEST'
    ) {
      const check = validateVehicleCountInput(raw);
      if (!check.valid || check.value === undefined) {
        appendLog(`> ${raw || '(empty)'}`, `  [Invalid Input] ${check.error}`);
        return;
      }

      if (stage === 'ENTER_NORTH') {
        setDraftCounts((prev) => ({ ...prev, North: check.value! }));
        setStage('ENTER_SOUTH');
        appendLog(`> ${check.value}`, `Enter South waiting vehicles (0-${MAX_VEHICLES_PER_DIRECTION}):`);
      } else if (stage === 'ENTER_SOUTH') {
        setDraftCounts((prev) => ({ ...prev, South: check.value! }));
        setStage('ENTER_EAST');
        appendLog(`> ${check.value}`, `Enter East waiting vehicles (0-${MAX_VEHICLES_PER_DIRECTION}):`);
      } else if (stage === 'ENTER_EAST') {
        setDraftCounts((prev) => ({ ...prev, East: check.value! }));
        setStage('ENTER_WEST');
        appendLog(`> ${check.value}`, `Enter West waiting vehicles (0-${MAX_VEHICLES_PER_DIRECTION}):`);
      } else {
        const finalCounts = { ...draftCounts, West: check.value };
        setCounts(finalCounts);
        setTimings(null);
        setLastResult(null);
        setLastFixed(null);
        setStage('MENU');
        appendLog(
          `> ${check.value}`,
          `Updated counts: North=${finalCounts.North}, South=${finalCounts.South}, East=${finalCounts.East}, West=${finalCounts.West}.`
        );
      }
      return;
    }

    if (stage === 'SIM_CYCLES') {
      const cycles = Number(raw);
      if (!/^\d+$/.test(raw) || cycles < 1 || cycles > MAX_SIMULATION_CYCLES) {
        appendLog(
          `> ${raw || '(empty)'}`,
          `  [Out of Range] Enter an integer between 1 and ${MAX_SIMULATION_CYCLES}.`
        );
        return;
      }

      const adaptive = runSimulation(counts, cycles, 'adaptive');
      const fixed = runSimulation(counts, cycles, 'fixed');
      setCounts(adaptive.remainingCounts);
      setSignalStates(adaptive.signalStates);
      setLastActive(adaptive.lastActiveDirection);
      setTimings(adaptive.lastTimings);
      setLastResult(adaptive);
      setLastFixed(fixed);
      setStage('MENU');

      appendLog(
        `> ${cycles}`,
        `--- RUNNING ADAPTIVE SIMULATION (${cycles} CYCLE(S)) ---`,
        ...adaptive.steps.map((s) => `  [C${s.cycle}] ${s.note}`),
        `Simulation complete: ${adaptive.totalProcessed} processed, ${adaptive.totalRemaining} remaining, elapsed ${adaptive.elapsedSeconds}s.`,
        `Adaptive Avg Wait: ${formatWaitTime(calculateAverageWait(adaptive))} | Fixed-Time Avg Wait: ${formatWaitTime(calculateAverageWait(fixed))}`
      );
    }
  };

  const promptLabel =
    stage === 'MENU'
      ? 'Enter menu choice (1-8)'
      : stage === 'INPUT_METHOD'
        ? 'Select input method (1-2)'
        : stage === 'SIM_CYCLES'
          ? `Enter cycles (1-${MAX_SIMULATION_CYCLES})`
          : `Enter ${stage.replace('ENTER_', '')} count`;

  return (
    <section className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Console Menu Emulator (Mirrors SignalSense/main.py)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Type commands below or click a menu option button to inspect the exact terminal behavior.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStage('MENU');
              setLog([MENU_TEXT]);
            }}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Clear Output
          </button>
        </div>

        <div className="flex flex-wrap gap-2 py-3 border-b border-slate-200">
          {[
            { id: 1, label: '1. Enter Density' },
            { id: 2, label: '2. View Density' },
            { id: 3, label: '3. Adaptive Timing' },
            { id: 4, label: '4. Start Simulation' },
            { id: 5, label: '5. Signal Status' },
            { id: 6, label: '6. Statistics' },
            { id: 7, label: '7. Reset' },
            { id: 8, label: '8. Exit' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => {
                setStage('MENU');
                executeMenuOption(btn.id);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-800 rounded-md hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              {btn.label}
            </button>
          ))}
        </div>

        <pre
          ref={outputRef}
          className="mt-4 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed p-4 rounded-lg h-[360px] overflow-y-auto whitespace-pre-wrap"
        >
          {log.join('\n')}
        </pre>

        <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap gap-2">
          <label htmlFor="console-input" className="sr-only">
            {promptLabel}
          </label>
          <input
            id="console-input"
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder={promptLabel}
            className="flex-1 min-w-[200px] px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap shrink-0"
          >
            Send Input
          </button>
        </form>
      </div>
    </section>
  );
}
