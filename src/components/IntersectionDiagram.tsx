import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import {
  DIRECTIONS,
  Direction,
  SignalColor,
  SignalStates,
  SimulationStep,
  TimingPlan,
  VehicleCounts,
  hasConflictingGreens,
} from '../utils/signalSenseEngine';

interface IntersectionDiagramProps {
  vehicleCounts: VehicleCounts;
  signalStates: SignalStates;
  timings: TimingPlan;
  steps: SimulationStep[];
  activeStepIndex: number | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepChange: (index: number) => void;
  onResetPlayback: () => void;
}

const SIGNAL_STYLES: Record<
  SignalColor,
  { fill: string; textClass: string; label: string }
> = {
  GREEN: {
    fill: '#059669',
    textClass: 'text-emerald-700',
    label: 'GREEN',
  },
  YELLOW: {
    fill: '#D97706',
    textClass: 'text-amber-700',
    label: 'YELLOW',
  },
  RED: {
    fill: '#DC2626',
    textClass: 'text-red-700',
    label: 'RED',
  },
};

function SignalLightBadge({
  direction,
  color,
  count,
  greenSeconds,
}: {
  direction: Direction;
  color: SignalColor;
  count: number;
  greenSeconds: number;
}) {
  const style = SIGNAL_STYLES[color];
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-200 last:border-b-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="inline-block w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: style.fill }}
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-slate-900 w-14">{direction}</span>
        <span className={`font-mono text-xs font-semibold tracking-wide ${style.textClass}`}>
          {style.label}
        </span>
      </div>
      <div className="flex items-center gap-4 font-mono text-xs tabular-nums text-slate-600 shrink-0">
        <span>Queue: {count}</span>
        <span>Green: {greenSeconds}s</span>
      </div>
    </div>
  );
}

export function IntersectionDiagram({
  vehicleCounts,
  signalStates,
  timings,
  steps,
  activeStepIndex,
  isPlaying,
  onTogglePlay,
  onStepChange,
  onResetPlayback,
}: IntersectionDiagramProps) {
  const currentStep =
    activeStepIndex !== null && steps[activeStepIndex] ? steps[activeStepIndex] : null;
  const displayCounts = currentStep ? currentStep.remainingSnapshot : vehicleCounts;
  const displaySignals = currentStep ? currentStep.signalStatesSnapshot : signalStates;
  const conflictDetected = hasConflictingGreens(displaySignals);

  const renderCarBlocks = (direction: Direction, count: number) => {
    const visibleCars = Math.min(6, Math.ceil(count / 10));
    const blocks: number[] = [];
    for (let i = 0; i < visibleCars; i += 1) {
      blocks.push(i);
    }
    if (direction === 'North') {
      return blocks.map((i) => (
        <rect key={i} x={176} y={96 - i * 15} width={16} height={10} rx={2} fill="#38BDF8" />
      ));
    }
    if (direction === 'South') {
      return blocks.map((i) => (
        <rect key={i} x={208} y={294 + i * 15} width={16} height={10} rx={2} fill="#38BDF8" />
      ));
    }
    if (direction === 'West') {
      return blocks.map((i) => (
        <rect key={i} x={96 - i * 15} y={208} width={10} height={16} rx={2} fill="#38BDF8" />
      ));
    }
    return blocks.map((i) => (
      <rect key={i} x={294 + i * 15} y={176} width={10} height={16} rx={2} fill="#38BDF8" />
    ));
  };

  return (
    <section
      aria-label="Four-way intersection visualizer"
      className="bg-white border border-slate-200 rounded-xl p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Four-Way Intersection State
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentStep
              ? `Cycle ${currentStep.cycle} · ${currentStep.direction} ${currentStep.signal} (${currentStep.durationSeconds}s) · t = ${currentStep.elapsedAtStart}s`
              : 'Live queue preview · One direction active at a time'}
          </p>
        </div>
        <span
          className={`font-mono text-xs font-semibold ${
            conflictDetected ? 'text-red-700' : 'text-emerald-700'
          }`}
        >
          {conflictDetected ? 'CONFLICT DETECTED' : 'SAFE: NO CONFLICTING GREENS'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-5">
        <div className="md:col-span-7 flex justify-center">
          <svg
            viewBox="0 0 400 400"
            className="w-full max-w-[360px] h-auto rounded-lg bg-slate-100 border border-slate-200"
            role="img"
            aria-label="Top-down four-way road intersection diagram"
          >
            {/* Grass / terrain quadrants */}
            <rect x="0" y="0" width="400" height="400" fill="#F1F5F9" />

            {/* Vertical and Horizontal Roads */}
            <rect x="150" y="0" width="100" height="400" fill="#1E293B" />
            <rect x="0" y="150" width="400" height="100" fill="#1E293B" />

            {/* Center junction box */}
            <rect x="150" y="150" width="100" height="100" fill="#0F172A" />

            {/* Center lane dashed dividers */}
            <line x1="200" y1="0" x2="200" y2="145" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="8 6" />
            <line x1="200" y1="255" x2="200" y2="400" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="8 6" />
            <line x1="0" y1="200" x2="145" y2="200" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="8 6" />
            <line x1="255" y1="200" x2="400" y2="200" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="8 6" />

            {/* Stop lines */}
            <line x1="152" y1="146" x2="198" y2="146" stroke="#F8FAFC" strokeWidth="3" />
            <line x1="202" y1="254" x2="248" y2="254" stroke="#F8FAFC" strokeWidth="3" />
            <line x1="146" y1="202" x2="146" y2="248" stroke="#F8FAFC" strokeWidth="3" />
            <line x1="254" y1="152" x2="254" y2="198" stroke="#F8FAFC" strokeWidth="3" />

            {/* Queued vehicle blocks */}
            {DIRECTIONS.map((dir) => renderCarBlocks(dir, displayCounts[dir]))}

            {/* Active flow arrow */}
            {displaySignals.North === 'GREEN' && (
              <path d="M184 162 L184 228 M177 220 L184 228 L191 220" stroke="#34D399" strokeWidth="3" fill="none" />
            )}
            {displaySignals.South === 'GREEN' && (
              <path d="M216 238 L216 172 M209 180 L216 172 L223 180" stroke="#34D399" strokeWidth="3" fill="none" />
            )}
            {displaySignals.West === 'GREEN' && (
              <path d="M162 216 L228 216 M220 209 L228 216 L220 223" stroke="#34D399" strokeWidth="3" fill="none" />
            )}
            {displaySignals.East === 'GREEN' && (
              <path d="M238 184 L172 184 M180 177 L172 184 L180 191" stroke="#34D399" strokeWidth="3" fill="none" />
            )}

            {/* Signal heads + text labels */}
            {/* North */}
            <g transform="translate(110, 108)">
              <rect width="32" height="32" rx="6" fill="#0F172A" />
              <circle cx="16" cy="16" r="8" fill={SIGNAL_STYLES[displaySignals.North].fill} />
            </g>
            <text x="100" y="128" textAnchor="end" className="fill-slate-800 text-[11px] font-semibold">
              North ({displayCounts.North})
            </text>

            {/* South */}
            <g transform="translate(258, 260)">
              <rect width="32" height="32" rx="6" fill="#0F172A" />
              <circle cx="16" cy="16" r="8" fill={SIGNAL_STYLES[displaySignals.South].fill} />
            </g>
            <text x="298" y="280" textAnchor="start" className="fill-slate-800 text-[11px] font-semibold">
              South ({displayCounts.South})
            </text>

            {/* West */}
            <g transform="translate(108, 260)">
              <rect width="32" height="32" rx="6" fill="#0F172A" />
              <circle cx="16" cy="16" r="8" fill={SIGNAL_STYLES[displaySignals.West].fill} />
            </g>
            <text x="98" y="280" textAnchor="end" className="fill-slate-800 text-[11px] font-semibold">
              West ({displayCounts.West})
            </text>

            {/* East */}
            <g transform="translate(260, 108)">
              <rect width="32" height="32" rx="6" fill="#0F172A" />
              <circle cx="16" cy="16" r="8" fill={SIGNAL_STYLES[displaySignals.East].fill} />
            </g>
            <text x="302" y="128" textAnchor="start" className="fill-slate-800 text-[11px] font-semibold">
              East ({displayCounts.East})
            </text>
          </svg>
        </div>

        <div className="md:col-span-5 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-600 pb-2">
              Approach Signal Readout
            </h3>
            <div className="border-t border-slate-200">
              {DIRECTIONS.map((dir) => (
                <SignalLightBadge
                  key={dir}
                  direction={dir}
                  color={displaySignals[dir]}
                  count={displayCounts[dir]}
                  greenSeconds={timings[dir]}
                />
              ))}
            </div>
          </div>

          {steps.length > 0 ? (
            <div className="pt-3 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-600 font-mono tabular-nums">
                <span>
                  Phase Step {(activeStepIndex ?? 0) + 1} / {steps.length}
                </span>
                {currentStep && <span>Passed: {currentStep.passed}</span>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onTogglePlay}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  type="button"
                  onClick={() => onStepChange(Math.max(0, (activeStepIndex ?? 0) - 1))}
                  disabled={(activeStepIndex ?? 0) <= 0}
                  aria-label="Previous phase step"
                  className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onStepChange(Math.min(steps.length - 1, (activeStepIndex ?? 0) + 1))
                  }
                  disabled={(activeStepIndex ?? 0) >= steps.length - 1}
                  aria-label="Next phase step"
                  className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onResetPlayback}
                  aria-label="Reset phase playback"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restart
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">
              Run a simulation from the control panel to step through GREEN and YELLOW phase transitions.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
