import React, { useEffect, useState } from 'react';
import {
  FlaskConical,
  Play,
  RotateCcw,
  Sliders,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  CalendarCheck,
  History,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';

export const SimulationStudio: React.FC = () => {
  const [prebuiltScenarios, setPrebuiltScenarios] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);

  // Form State
  const [scenarioName, setScenarioName] = useState<string>('Custom Scenario');
  const [targetFilter, setTargetFilter] = useState<string>('ALL');
  const [demandPct, setDemandPct] = useState<number>(0);
  const [leadTimePct, setLeadTimePct] = useState<number>(0);
  const [stockPct, setStockPct] = useState<number>(0);
  const [delayDays, setDelayDays] = useState<number>(0);
  const [demandCvMult, setDemandCvMult] = useState<number>(1.0);
  const [safetyStockMult, setSafetyStockMult] = useState<number>(1.0);
  const [replenishmentUnits, setReplenishmentUnits] = useState<number>(0);
  const [simulationRuns, setSimulationRuns] = useState<number>(500);

  // Simulation Results
  const [simulationResult, setSimulationResult] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.getPrebuiltScenarios(),
      api.getSimulationHistory()
    ])
      .then(([scenarios, hist]) => {
        setPrebuiltScenarios(scenarios);
        setHistory(hist);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleApplyPrebuilt = (key: string) => {
    const sc = prebuiltScenarios[key];
    if (!sc) return;
    setScenarioName(sc.name);
    setDemandPct(sc.params.demand_pct_change);
    setLeadTimePct(sc.params.lead_time_pct_change);
    setStockPct(sc.params.stock_pct_change);
    setDelayDays(sc.params.supplier_delay_days);
    setDemandCvMult(sc.params.demand_cv_multiplier);
    setSafetyStockMult(sc.params.safety_stock_multiplier);
    setReplenishmentUnits(sc.params.replenishment_units);
  };

  const handleRunSimulation = async () => {
    try {
      setRunning(true);
      const payload = {
        scenario_name: scenarioName,
        target_filter: targetFilter,
        demand_pct_change: demandPct,
        lead_time_pct_change: leadTimePct,
        stock_pct_change: stockPct,
        supplier_delay_days: delayDays,
        demand_cv_multiplier: demandCvMult,
        safety_stock_multiplier: safetyStockMult,
        replenishment_units: replenishmentUnits,
        simulation_runs: simulationRuns
      };
      const res = await api.runSimulation(payload);
      setSimulationResult(res);
      // Refresh history
      api.getSimulationHistory().then(setHistory).catch(console.error);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Simulation run failed');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Preparing Stochastic Simulation Studio...</p>
      </div>
    );
  }

  const summary = simulationResult?.summary;
  const wpImpact = simulationResult?.work_package_impact;

  const comparisonChartData = summary ? [
    {
      metric: 'Stockout Risk (%)',
      Baseline: summary.avg_baseline_stockout_risk_pct,
      Simulated: summary.avg_simulated_stockout_risk_pct,
    },
    {
      metric: 'Fill Rate (%)',
      Baseline: summary.avg_baseline_fill_rate_pct,
      Simulated: summary.avg_simulated_fill_rate_pct,
    }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              STOCK SENTRY — Simulation Studio: What-If Supply Chain Lab
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
              Monte Carlo Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Test shocks, demand surges, supplier delays, and buffer policies on rolling stock availability — Team TRACKBYTE.
          </p>
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={running}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{running ? 'Executing Simulation...' : 'Run Simulation'}</span>
        </button>
      </div>

      {/* Prebuilt Scenarios Buttons Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
          Prebuilt Railway Supply Chain Scenarios:
        </span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(prebuiltScenarios).map(([key, sc]: any) => (
            <button
              key={key}
              onClick={() => handleApplyPrebuilt(key)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium transition"
            >
              {sc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Simulation Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sliders & Parameters Form */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-blue-600" />
              Scenario Parameters
            </h2>
            <button
              onClick={() => handleApplyPrebuilt('BASELINE')}
              className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Scenario Name */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Scenario Title</label>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Target Filter */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Apply To Spares Subset</label>
              <select
                value={targetFilter}
                onChange={(e) => setTargetFilter(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All 200 Spare Parts</option>
                <option value="V">Vital (V) Items Only</option>
                <option value="S">Scarce (S) Items Only</option>
                <option value="A">Class A Items Only</option>
                <option value="ASV">Class ASV Items</option>
                <option value="Braking">Braking System</option>
                <option value="Electrical">Electrical System</option>
              </select>
            </div>

            {/* Demand Change Slider */}
            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>Demand Change:</span>
                <span className="font-mono font-bold text-blue-700">{demandPct > 0 ? `+${demandPct}` : demandPct}%</span>
              </div>
              <input
                type="range"
                min="-50"
                max="100"
                step="5"
                value={demandPct}
                onChange={(e) => setDemandPct(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Lead Time Change Slider */}
            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>Lead Time Change:</span>
                <span className="font-mono font-bold text-blue-700">{leadTimePct > 0 ? `+${leadTimePct}` : leadTimePct}%</span>
              </div>
              <input
                type="range"
                min="-50"
                max="150"
                step="5"
                value={leadTimePct}
                onChange={(e) => setLeadTimePct(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Supplier Delay Days */}
            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>Supplier Port/Depot Delay:</span>
                <span className="font-mono font-bold text-purple-700">+{delayDays} days</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={delayDays}
                onChange={(e) => setDelayDays(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>

            {/* Current Stock Change Slider */}
            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>Stock Depletion / Injection:</span>
                <span className="font-mono font-bold text-emerald-700">{stockPct > 0 ? `+${stockPct}` : stockPct}%</span>
              </div>
              <input
                type="range"
                min="-50"
                max="200"
                step="5"
                value={stockPct}
                onChange={(e) => setStockPct(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            {/* Safety Stock Multiplier */}
            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>Safety Stock Multiplier:</span>
                <span className="font-mono font-bold text-slate-900">{safetyStockMult.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={safetyStockMult}
                onChange={(e) => setSafetyStockMult(Number(e.target.value))}
                className="w-full accent-slate-800"
              />
            </div>

            {/* Simulation Runs Number */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Simulation Runs</label>
              <select
                value={simulationRuns}
                onChange={(e) => setSimulationRuns(Number(e.target.value))}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              >
                <option value="200">200 Runs (Fast)</option>
                <option value="500">500 Runs (Standard LSCM)</option>
                <option value="1000">1,000 Runs (High Precision)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Visualizations */}
        <div className="lg:col-span-2 space-y-4">
          {!simulationResult ? (
            <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 space-y-3">
              <FlaskConical className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="text-sm font-semibold text-slate-700">No Active Simulation Results</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Adjust sliders or pick a prebuilt scenario above, then click <strong>Run Simulation</strong> to compute before vs after metrics.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-400 font-medium uppercase">Avg Stockout Risk</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                    {summary.avg_simulated_stockout_risk_pct}%
                  </div>
                  <span className={`text-[11px] font-semibold ${
                    summary.stockout_risk_delta_pct > 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}>
                    {summary.stockout_risk_delta_pct > 0 ? `+${summary.stockout_risk_delta_pct}%` : `${summary.stockout_risk_delta_pct}%`} vs base
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-400 font-medium uppercase">Expected Fill Rate</span>
                  <div className="text-xl font-bold font-mono text-emerald-800 mt-0.5">
                    {summary.avg_simulated_fill_rate_pct}%
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Base: {summary.avg_baseline_fill_rate_pct}%
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-400 font-medium uppercase">Critical Risk SKUs</span>
                  <div className="text-xl font-bold font-mono text-red-700 mt-0.5">
                    {summary.simulated_critical_risk_parts}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Base: {summary.baseline_critical_risk_parts} SKUs
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-400 font-medium uppercase">Ready Work Packages</span>
                  <div className="text-xl font-bold font-mono text-blue-900 mt-0.5">
                    {wpImpact?.simulated_ready_packages} <span className="text-xs text-slate-400">/ {wpImpact?.total_work_packages}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Base: {wpImpact?.baseline_ready_packages} ready
                  </span>
                </div>
              </div>

              {/* Comparison Chart */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Baseline vs Simulated Performance Comparison
                </h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonChartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                      <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="Baseline" fill="#64748b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Simulated" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Work Package Impact Table */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Impact on Maintenance Work Packages Material Readiness
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-semibold">
                      <tr>
                        <th className="py-2 px-3">Work Package</th>
                        <th className="py-2 px-3 text-center">Baseline Status</th>
                        <th className="py-2 px-3 text-center">Simulated Status</th>
                        <th className="py-2 px-3 text-right">Shortages</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {wpImpact?.package_details?.map((pkg: any) => (
                        <tr key={pkg.work_package_id}>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            <span className="font-mono text-blue-700 block">{pkg.work_package_id}</span>
                            <span className="text-[11px] text-slate-600">{pkg.title}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pkg.baseline_status === 'READY' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {pkg.baseline_status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pkg.simulated_status === 'READY' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {pkg.simulated_status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            {pkg.shortage_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
