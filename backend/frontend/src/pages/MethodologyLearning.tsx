import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Box,
  Layers,
  Calculator,
  CheckCircle2,
  Table as TableIcon,
  Sparkles,
  Award,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/api';

export const MethodologyLearning: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getMethodology()
      .then((res) => {
        setData(res);
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
        <p className="text-sm font-medium">Loading LSCM Methodology & Theory Reference...</p>
      </div>
    );
  }

  const worked = data?.worked_example;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              LSCM Methodology & Academic Viva Guide
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Course Reference
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Theoretical framework, 27 MUSIC-3D combination mappings, mathematical derivations, and worked professor examples.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-mono">
          <Award className="w-4 h-4 text-amber-600" />
          <span>Prepared for University Evaluation</span>
        </div>
      </div>

      {/* Worked Example Box */}
      {worked && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Worked Professor Viva Example
            </div>
            <span className="px-2.5 py-0.5 rounded bg-blue-600 text-white text-xs font-mono font-bold">
              Code: {worked.music3d_code}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white">{worked.part_name}</h3>
              <div className="space-y-1 text-slate-300">
                <div>• Annual Usage: <strong>{worked.annual_usage} units</strong> (Daily demand: {worked.daily_demand})</div>
                <div>• Unit Purchase Price: <strong>₹{worked.unit_price_inr.toLocaleString()}</strong></div>
                <div>• Replenishment Lead Time: <strong>{worked.lead_time_days} days</strong> (Lead-Time Demand: {worked.lead_time_demand})</div>
                <div>• Current On-Hand Depot Stock: <strong>{worked.current_stock} units</strong></div>
              </div>

              <div className="pt-2 text-slate-300 space-y-1">
                <div>• 1st Dimension (ABC): <strong className="text-blue-300">{worked.abc}</strong></div>
                <div>• 2nd Dimension (SDE): <strong className="text-purple-300">{worked.sde}</strong></div>
                <div>• 3rd Dimension (VED): <strong className="text-red-300">{worked.ved}</strong></div>
              </div>
            </div>

            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span>Target Service Level:</span>
                <strong className="text-emerald-400 font-mono text-sm">{worked.target_service_level} (Z = {worked.z_score})</strong>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span>Target Stockout Probability:</span>
                <strong className="text-amber-400 font-mono text-sm">{worked.target_stockout_probability}</strong>
              </div>
              <div className="pt-1 border-t border-white/10 text-xs text-slate-300 space-y-1">
                <div>Safety Stock Formula: <code className="text-emerald-300 font-mono">{worked.safety_stock}</code></div>
                <div>Reorder Point Formula: <code className="text-blue-300 font-mono">{worked.reorder_point}</code></div>
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed pt-1 border-t border-white/10 italic">
                {worked.conclusion}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Core Inventory Formulas Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-600" />
          Standard LSCM Mathematical Formulations & Derivations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data?.formulas?.map((f: any, idx: number) => (
            <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
              <span className="font-semibold text-slate-900 text-xs block">{f.name}</span>
              <code className="text-[11px] font-mono text-blue-700 font-bold block">{f.formula}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Complete 27 MUSIC-3D Reference Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-blue-600" />
          Full Course 27-Combinations Service Level & Z-Score Master Reference
        </h2>

        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-semibold text-slate-700">
              <tr>
                <th className="py-2.5 px-3">MUSIC-3D Code</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Target Service Level</th>
                <th className="py-2.5 px-3 text-right">Z-Score</th>
                <th className="py-2.5 px-3 text-right">Target Stockout Prob.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(data?.all_27_combinations || {}).map(([code, item]: any) => (
                <tr key={code} className="hover:bg-slate-50 transition">
                  <td className="py-2 px-3 font-mono font-bold text-blue-700">{code}</td>
                  <td className="py-2 px-3 text-slate-700">{item.description}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{item.service_level}%</td>
                  <td className="py-2 px-3 text-right font-mono font-semibold">{item.z_score}</td>
                  <td className="py-2 px-3 text-right font-mono text-purple-700">{item.target_stockout_prob_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
