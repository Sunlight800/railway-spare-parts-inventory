import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  Clock,
  ArrowRight,
  ExternalLink,
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
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { api } from '../services/api';

interface StockHealthRiskProps {
  onSelectPart?: (partId: string) => void;
}

export const StockHealthRisk: React.FC<StockHealthRiskProps> = ({ onSelectPart }) => {
  const [riskData, setRiskData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getStockoutRiskDetails()
      .then((res) => {
        setRiskData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Executing Monte Carlo Stockout Surveillance Analysis...</p>
      </div>
    );
  }

  const topVulnerable = riskData?.top_vulnerable_parts || [];

  // Chart data for actual vs target risk
  const comparisonChartData = topVulnerable.slice(0, 15).map((p: any) => ({
    partId: p.part_id,
    targetRisk: p.target_stockout_prob_pct,
    actualRisk: p.actual_estimated_risk_pct,
    riskGap: p.risk_gap_pct,
    code: p.music3d_code
  }));

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            STOCK SENTRY — Depot Stock Health & Monte Carlo Surveillance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillance of inventory buffers, reorder points, and simulated stockout probability vs MUSIC-3D targets — Team TRACKBYTE.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
          <Activity className="w-3.5 h-3.5" />
          <span>Monte Carlo Model (500 Iterations / Part)</span>
        </div>
      </div>

      {/* Target Risk vs Actual Risk Explanation Callout */}
      <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600" />
            Distinction Between Target Risk & Actual Estimated Risk
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
            <strong>Target Stockout Probability</strong> is the authorized policy benchmark defined by the professor's MUSIC-3D curriculum mapping (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-blue-700">1 − Service Level</code>, e.g. 1% for ASV). <strong>Actual Estimated Stockout Risk</strong> is dynamically calculated by Monte Carlo simulation using the physical stock currently on the depot floor against stochastic lead-time demand.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs flex-shrink-0">
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-center">
            <span className="text-[10px] text-blue-600 block">Target Risk</span>
            <span className="font-bold text-blue-900">Policy Benchmark</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-center">
            <span className="text-[10px] text-red-600 block">Actual Risk</span>
            <span className="font-bold text-red-900">Simulated Reality</span>
          </div>
        </div>
      </div>

      {/* Top 15 Comparison Chart: Actual Risk vs Target Risk */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Top 15 Most Vulnerable Spare Parts: Actual Simulated Risk vs Target Risk
            </h2>
            <p className="text-xs text-slate-500">
              Where Actual Risk significantly exceeds Target Risk, a dangerous supply vulnerability exists.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">Red: Actual Risk • Blue: Target Limit</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonChartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="partId" tick={{ fontSize: 11 }} />
              <YAxis unit="%" label={{ value: 'Stockout Probability %', angle: -90, position: 'insideLeft', fontSize: 11 }} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="actualRisk" name="Actual Simulated Stockout Risk (%)" fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Bar dataKey="targetRisk" name="MUSIC-3D Target Stockout Risk (%)" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Vulnerable Parts Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Top Vulnerable Spare Parts Priority Table
            </h2>
            <p className="text-xs text-slate-500">
              Ranked by Monte Carlo stockout risk during replenishment lead-time horizon.
            </p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Part ID & Name</th>
                <th className="py-2.5 px-3">Subsystem</th>
                <th className="py-2.5 px-3 text-center">MUSIC-3D</th>
                <th className="py-2.5 px-3 text-right">Current Stock</th>
                <th className="py-2.5 px-3 text-right">Reorder Point</th>
                <th className="py-2.5 px-3 text-right">Lead Time</th>
                <th className="py-2.5 px-3 text-right">Target SL</th>
                <th className="py-2.5 px-3 text-right">Target Risk</th>
                <th className="py-2.5 px-3 text-right">Actual Risk</th>
                <th className="py-2.5 px-3 text-right">Risk Gap</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topVulnerable.map((p: any) => (
                <tr key={p.part_id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    <span className="font-mono text-blue-700 block font-bold">{p.part_id}</span>
                    <span className="text-[11px] text-slate-600">{p.part_name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{p.category}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      p.ved_class === 'V' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'
                    }`}>
                      {p.music3d_code}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {p.current_stock_units}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                    {p.reorder_point}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                    {p.lead_time_days}d
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                    {p.target_service_level}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-purple-700">
                    {p.target_stockout_prob_pct}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    <span className={`px-1.5 py-0.5 rounded font-bold ${
                      p.actual_estimated_risk_pct >= 30
                        ? 'bg-red-100 text-red-700'
                        : p.actual_estimated_risk_pct >= 10
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {p.actual_estimated_risk_pct}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">
                    +{p.risk_gap_pct > 0 ? p.risk_gap_pct.toFixed(1) : 0}%
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      p.stock_status === 'HEALTHY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : p.stock_status === 'OUT_OF_STOCK'
                        ? 'bg-red-100 text-red-800 font-bold'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {p.stock_status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {onSelectPart && (
                      <button
                        onClick={() => onSelectPart(p.part_id)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] inline-flex items-center gap-1"
                      >
                        Inspect <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
