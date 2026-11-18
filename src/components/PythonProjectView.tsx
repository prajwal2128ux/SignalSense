const PYTHON_MODULES = [
  {
    file: 'SignalSense/main.py',
    moduleName: 'Menu & Application Controller',
    summary: 'Runs the 8-option console loop, coordinates state, and connects all modules.',
  },
  {
    file: 'SignalSense/traffic.py',
    moduleName: 'Module 1 (Provisional): Traffic Density',
    summary: 'Manual or sample vehicle entry (N/S/E/W), density share %, and density classification.',
  },
  {
    file: 'SignalSense/signal_control.py',
    moduleName: 'Modules 2 & 3 (Provisional): Signal Timing & Safety',
    summary: 'Proportional green-time formula (10s–60s), priority sorting, and conflict checking.',
  },
  {
    file: 'SignalSense/simulation.py',
    moduleName: 'Module 4 (Provisional): Multi-Cycle Simulation',
    summary: 'Processes vehicles across cycles (1/s), logs GREEN/YELLOW/RED phases, and tracks waits.',
  },
  {
    file: 'SignalSense/statistics.py',
    moduleName: 'Module 5 (Provisional): Statistics & CSV',
    summary: 'Computes average waiting time, fixed-time baseline comparison, and CSV export.',
  },
  {
    file: 'SignalSense/utils.py',
    moduleName: 'Validation & Formatting Helpers',
    summary: 'Safe integer parsing (try/except ValueError), range enforcement, and table dividers.',
  },
  {
    file: 'SignalSense/test_signalsense.py',
    moduleName: 'Standard-Library Test Suite',
    summary: '13 unittest scenarios covering equal, heavy, zero, invalid inputs, bounds, and safety.',
  },
];

const EXECUTED_TESTS = [
  { id: '1', scenario: 'Equal traffic (20, 20, 20, 20)', outcome: '30s each · 80 processed · 0 remaining (Pass)' },
  { id: '2–5', scenario: 'Heavy North, South, East, or West (100, 10, 10, 10)', outcome: 'Busy lane capped at 60s and served first (Pass)' },
  { id: '6', scenario: 'Zero traffic (0, 0, 0, 0)', outcome: '10s baseline · 0 processed · N/A avg wait (Pass)' },
  { id: '7', scenario: 'Single active direction (50, 0, 0, 0)', outcome: 'Only North runs (60s + 3s = 63s) · 50 cleared (Pass)' },
  { id: '8', scenario: 'Invalid, empty, negative, out-of-range inputs', outcome: 'Safely re-prompted; ValueError on 0 cycles (Pass)' },
  { id: '9', scenario: 'Multiple cycles (90, 10, 10, 10)', outcome: 'Partial queue after Cycle 1; 0 remaining after Cycle 2 (Pass)' },
  { id: '10–11', scenario: 'Timing limits [10, 60] and high/low fairness', outcome: 'All durations bounded; low-count direction still served (Pass)' },
  { id: '12–13', scenario: 'No conflicting greens, baseline comparison, CSV export', outcome: 'Conflict check verified; temp CSV written cleanly (Pass)' },
];

export function PythonProjectView() {
  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          CP-074 Python Console Submission Files
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Your college submission lives inside the <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">SignalSense/</code> folder as a pure Python standard-library console application (no GUI, website, or database dependencies inside the Python files). Because only the CP-074 title and category were provided, the five core modules remain marked as <strong>Provisional — Pending Official CP-74 Verification</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-slate-600">
              Run Console Application
            </h3>
            <pre className="mt-2 font-mono text-xs text-slate-900 leading-relaxed">
{`cd SignalSense
python main.py`}
            </pre>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-slate-600">
              Run Python Test Suite (13 Tests)
            </h3>
            <pre className="mt-2 font-mono text-xs text-slate-900 leading-relaxed">
{`cd SignalSense
python3 test_signalsense.py`}
            </pre>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 pb-4 border-b border-slate-200">
          Python Module Architecture
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-3 pr-4 font-semibold">File</th>
                <th className="py-3 pr-4 font-semibold">Role</th>
                <th className="py-3 font-semibold">Responsibility</th>
              </tr>
            </thead>
            <tbody>
              {PYTHON_MODULES.map((item) => (
                <tr key={item.file} className="border-b border-slate-100 last:border-b-0">
                  <td className="py-3 pr-4 font-mono text-xs text-blue-700 whitespace-nowrap">
                    {item.file}
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-900 whitespace-nowrap">
                    {item.moduleName}
                  </td>
                  <td className="py-3 text-slate-600">{item.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 pb-4 border-b border-slate-200">
          Verified Python Test Scenarios (13 / 13 Passing)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-3 pr-4 font-semibold">Tests</th>
                <th className="py-3 pr-4 font-semibold">Scenario</th>
                <th className="py-3 font-semibold">Observed Result</th>
              </tr>
            </thead>
            <tbody>
              {EXECUTED_TESTS.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="py-2.5 pr-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                    {row.id}
                  </td>
                  <td className="py-2.5 pr-4 font-medium text-slate-900">{row.scenario}</td>
                  <td className="py-2.5 text-slate-600">{row.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
