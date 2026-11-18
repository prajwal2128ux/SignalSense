import { useEffect, useState } from 'react';
import { ConsoleEmulator } from './components/ConsoleEmulator';
import { IntersectionDiagram } from './components/IntersectionDiagram';
import { PythonProjectView } from './components/PythonProjectView';
import {
  ADAPTIVE_POOL_SECONDS,
  DIRECTIONS,
  Direction,
  MAX_GREEN_TIME,
  MAX_SIMULATION_CYCLES,
  MAX_VEHICLES_PER_DIRECTION,
  MIN_GREEN_TIME,
  SimulationResult,
  VehicleCounts,
  calculateAdaptiveTimings,
  calculateAverageWait,
  calculateDensitySummary,
  createEmptyCounts,
  createInitialSignalStates,
  formatWaitTime,
  getPriorityOrder,
  getSampleTrafficCounts,
  runSimulation,
  validateVehicleCountInput,
} from './utils/signalSenseEngine';

type ActiveTab = 'model' | 'console' | 'python';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('model');
  const [counts, setCounts] = useState<VehicleCounts>(getSampleTrafficCounts());
  const [inputStrings, setInputStrings] = useState<Record<Direction, string>>({
    North: '45',
    South: '15',
    East: '25',
    West: '10',
  });
  const [inputErrors, setInputErrors] = useState<Partial<Record<Direction, string>>>({});
  const [cyclesInput, setCyclesInput] = useState('2');
  const [cyclesError, setCyclesError] = useState<string | null>(null);

  const [adaptiveResult, setAdaptiveResult] = useState<SimulationResult | null>(null);
  const [fixedResult, setFixedResult] = useState<SimulationResult | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const timings = calculateAdaptiveTimings(counts);
  const priorityOrder = getPriorityOrder(counts);
  const { rows: densityRows, totalVehicles } = calculateDensitySummary(counts);

  useEffect(() => {
    if (!isPlaying || !adaptiveResult || adaptiveResult.steps.length === 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveStepIndex((prev) => {
        const next = prev === null ? 0 : prev + 1;
        if (next >= adaptiveResult.steps.length) {
          setIsPlaying(false);
          return adaptiveResult.steps.length - 1;
        }
        return next;
      });
    }, 850);
    return () => window.clearInterval(timer);
  }, [isPlaying, adaptiveResult]);

  const handleLoadSample = () => {
    const sample = getSampleTrafficCounts();
    setCounts(sample);
    setInputStrings({
      North: String(sample.North),
      South: String(sample.South),
      East: String(sample.East),
      West: String(sample.West),
    });
    setInputErrors({});
    setAdaptiveResult(null);
    setFixedResult(null);
    setActiveStepIndex(null);
    setIsPlaying(false);
  };

  const handleReset = () => {
    const empty = createEmptyCounts();
    setCounts(empty);
    setInputStrings({ North: '0', South: '0', East: '0', West: '0' });
    setInputErrors({});
    setCyclesInput('2');
    setCyclesError(null);
    setAdaptiveResult(null);
    setFixedResult(null);
    setActiveStepIndex(null);
    setIsPlaying(false);
  };

  const handleDirectionTextChange = (direction: Direction, raw: string) => {
    setInputStrings((prev) => ({ ...prev, [direction]: raw }));
    const check = validateVehicleCountInput(raw);
    if (!check.valid || check.value === undefined) {
      setInputErrors((prev) => ({ ...prev, [direction]: check.error }));
      return;
    }
    setInputErrors((prev) => {
      const next = { ...prev };
      delete next[direction];
      return next;
    });
    setCounts((prev) => ({ ...prev, [direction]: check.value! }));
    setAdaptiveResult(null);
    setFixedResult(null);
    setActiveStepIndex(null);
    setIsPlaying(false);
  };

  const handleSliderChange = (direction: Direction, value: number) => {
    setInputStrings((prev) => ({ ...prev, [direction]: String(value) }));
    setInputErrors((prev) => {
      const next = { ...prev };
      delete next[direction];
      return next;
    });
    setCounts((prev) => ({ ...prev, [direction]: value }));
    setAdaptiveResult(null);
    setFixedResult(null);
    setActiveStepIndex(null);
    setIsPlaying(false);
  };

  const handleRunSimulation = () => {
    const hasDirectionErrors = Object.keys(inputErrors).length > 0;
    if (hasDirectionErrors) return;

    const trimmedCycles = cyclesInput.trim();
    const parsedCycles = Number(trimmedCycles);
    if (
      !/^\d+$/.test(trimmedCycles) ||
      !Number.isInteger(parsedCycles) ||
      parsedCycles < 1 ||
      parsedCycles > MAX_SIMULATION_CYCLES
    ) {
      setCyclesError(`Enter a whole number between 1 and ${MAX_SIMULATION_CYCLES}.`);
      return;
    }

    setCyclesError(null);
    const adaptive = runSimulation(counts, parsedCycles, 'adaptive');
    const fixed = runSimulation(counts, parsedCycles, 'fixed');
    setAdaptiveResult(adaptive);
    setFixedResult(fixed);
    setActiveStepIndex(adaptive.steps.length > 0 ? 0 : null);
    setIsPlaying(false);
  };

  const adaptiveAvg = adaptiveResult ? calculateAverageWait(adaptiveResult) : null;
  const fixedAvg = fixedResult ? calculateAverageWait(fixedResult) : null;
  const waitReduction =
    adaptiveAvg !== null && fixedAvg !== null && fixedAvg > 0
      ? `${(((fixedAvg - adaptiveAvg) / fixedAvg) * 100).toFixed(2)}%`
      : 'N/A';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 md:gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('model');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            SignalSense
          </a>

          <nav aria-label="Primary views" className="hidden md:flex items-center gap-6">
            {[
              { id: 'model' as const, label: 'Interactive Model' },
              { id: 'console' as const, label: 'Console Menu' },
              { id: 'python' as const, label: 'Python Files' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'border-blue-600 text-slate-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handleLoadSample}
              className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              Load Sample
            </button>
          </div>
        </div>

        <nav
          aria-label="Mobile views"
          className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center justify-between gap-2"
        >
          {[
            { id: 'model' as const, label: 'Interactive Model' },
            { id: 'console' as const, label: 'Console Menu' },
            { id: 'python' as const, label: 'Python Files' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-blue-600 text-slate-900'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              Adaptive Traffic Signal Simulation Model
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              <span>CP-074</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Provisional 5-Module Design</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Python Standard-Library Console Model</span>
            </p>
          </div>
        </div>

        {activeTab === 'model' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Zone: Visual Intersection Stage + Phase Log */}
            <div className="lg:col-span-7 space-y-6">
              <IntersectionDiagram
                vehicleCounts={counts}
                signalStates={createInitialSignalStates()}
                timings={timings}
                steps={adaptiveResult?.steps ?? []}
                activeStepIndex={activeStepIndex}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying((prev) => !prev)}
                onStepChange={(idx) => {
                  setIsPlaying(false);
                  setActiveStepIndex(idx);
                }}
                onResetPlayback={() => {
                  setIsPlaying(false);
                  setActiveStepIndex(adaptiveResult && adaptiveResult.steps.length > 0 ? 0 : null);
                }}
              />

              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900">
                    Adaptive Timing & Density Breakdown
                  </h2>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    Total Queued: {totalVehicles}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-3 font-mono">
                  green = {MIN_GREEN_TIME} + round((vehicles / total) * {ADAPTIVE_POOL_SECONDS}), clamped [{MIN_GREEN_TIME}s, {MAX_GREEN_TIME}s]
                </p>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th className="py-2.5 pr-3 font-semibold">Priority</th>
                        <th className="py-2.5 pr-3 font-semibold">Direction</th>
                        <th className="py-2.5 pr-3 text-right font-semibold">Vehicles</th>
                        <th className="py-2.5 pr-3 text-right font-semibold">Share</th>
                        <th className="py-2.5 pr-3 font-semibold">Density</th>
                        <th className="py-2.5 text-right font-semibold">Green Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priorityOrder.map((dir, index) => {
                        const row = densityRows.find((r) => r.direction === dir)!;
                        return (
                          <tr key={dir} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-2.5 pr-3 font-mono text-xs text-slate-500 tabular-nums">
                              #{index + 1}
                            </td>
                            <td className="py-2.5 pr-3 font-medium text-slate-900">{dir}</td>
                            <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                              {row.count}
                            </td>
                            <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-600">
                              {row.sharePercent.toFixed(1)}%
                            </td>
                            <td className="py-2.5 pr-3 text-slate-700">{row.level}</td>
                            <td className="py-2.5 text-right font-mono font-semibold text-blue-700 tabular-nums">
                              {timings[dir]}s
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* Right Zone: Input Controls & Performance Comparison */}
            <div className="lg:col-span-5 space-y-6">
              <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900">
                    Waiting Queue Inputs
                  </h2>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-3.5">
                  {DIRECTIONS.map((dir) => {
                    const err = inputErrors[dir];
                    return (
                      <div key={dir} className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <label
                            htmlFor={`input-${dir}`}
                            className="text-sm font-medium text-slate-800"
                          >
                            {dir} Vehicles
                          </label>
                          <input
                            id={`input-${dir}`}
                            type="text"
                            inputMode="numeric"
                            value={inputStrings[dir]}
                            onChange={(e) => handleDirectionTextChange(dir, e.target.value)}
                            aria-invalid={Boolean(err)}
                            className="w-24 px-2.5 py-1 text-right font-mono text-sm border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 tabular-nums"
                          />
                        </div>
                        <input
                          aria-label={`${dir} queue slider`}
                          type="range"
                          min={0}
                          max={200}
                          value={Math.min(200, counts[dir])}
                          onChange={(e) => handleSliderChange(dir, Number(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                        {err && <p className="text-xs text-red-600">{err}</p>}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="cycles-input" className="text-sm font-medium text-slate-800">
                      Simulation Cycles (1–{MAX_SIMULATION_CYCLES})
                    </label>
                    <input
                      id="cycles-input"
                      type="text"
                      inputMode="numeric"
                      value={cyclesInput}
                      onChange={(e) => {
                        setCyclesInput(e.target.value);
                        setCyclesError(null);
                      }}
                      className="w-24 px-2.5 py-1 text-right font-mono text-sm border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 tabular-nums"
                    />
                  </div>
                  {cyclesError && <p className="text-xs text-red-600">{cyclesError}</p>}

                  <button
                    type="button"
                    onClick={handleRunSimulation}
                    disabled={Object.keys(inputErrors).length > 0}
                    className="w-full px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    Run Simulation
                  </button>
                  <p className="text-xs text-slate-500">
                    Valid integer range: 0 to {MAX_VEHICLES_PER_DIRECTION} vehicles per direction.
                  </p>
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-200">
                  Adaptive vs. Fixed-Time Comparison
                </h2>

                {adaptiveResult && fixedResult ? (
                  <div className="mt-3 space-y-4">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-500">
                          <th className="py-2 pr-2 font-semibold">Metric</th>
                          <th className="py-2 pr-2 text-right font-semibold">Adaptive</th>
                          <th className="py-2 text-right font-semibold">Fixed (30s)</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-xs tabular-nums">
                        <tr className="border-b border-slate-100">
                          <td className="py-2.5 pr-2 font-sans text-slate-700">Processed</td>
                          <td className="py-2.5 pr-2 text-right text-slate-900">
                            {adaptiveResult.totalProcessed}
                          </td>
                          <td className="py-2.5 text-right text-slate-600">
                            {fixedResult.totalProcessed}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-2.5 pr-2 font-sans text-slate-700">Remaining</td>
                          <td className="py-2.5 pr-2 text-right text-slate-900">
                            {adaptiveResult.totalRemaining}
                          </td>
                          <td className="py-2.5 text-right text-slate-600">
                            {fixedResult.totalRemaining}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-2.5 pr-2 font-sans text-slate-700">Elapsed Time</td>
                          <td className="py-2.5 pr-2 text-right text-slate-900">
                            {adaptiveResult.elapsedSeconds}s
                          </td>
                          <td className="py-2.5 text-right text-slate-600">
                            {fixedResult.elapsedSeconds}s
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 pr-2 font-sans text-slate-700">Avg Wait</td>
                          <td className="py-2.5 pr-2 text-right font-semibold text-blue-700">
                            {formatWaitTime(adaptiveAvg)}
                          </td>
                          <td className="py-2.5 text-right text-slate-600">
                            {formatWaitTime(fixedAvg)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600">Waiting Time Reduction (Adaptive vs Fixed)</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {waitReduction}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mt-3">
                    Click <strong>Run Simulation</strong> to compare adaptive timing against the 30s fixed-time baseline on these queues.
                  </p>
                )}
              </section>
            </div>
          </div>
        )}

        {activeTab === 'console' && <ConsoleEmulator />}

        {activeTab === 'python' && <PythonProjectView />}
      </main>
    </div>
  );
}
