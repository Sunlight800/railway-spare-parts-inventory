import React, { useEffect, useState } from 'react';
import { X, ExternalLink, AlertTriangle, ShieldCheck, Info, Search } from 'lucide-react';
import { api } from '../../services/api';

interface CellDetailModalProps {
  code: string | null;
  onClose: () => void;
  onSelectPart?: (partId: string) => void;
}

export const CellDetailModal: React.FC<CellDetailModalProps> = ({ code, onClose, onSelectPart }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    api.getMusic3DCellDetail(code)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [code]);

  if (!code) return null;

  const filteredParts = data?.parts?.filter((p: any) =>
    p.part_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="text-2xl font-black font-mono px-3 py-1 bg-blue-600 rounded-lg border border-blue-400">
              {code}
            </span>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                MUSIC-3D Cell Detail
                <span className="text-xs font-normal font-sans text-slate-300 px-2 py-0.5 rounded bg-slate-800">
                  {data?.description || 'Curriculum Reference Matrix'}
                </span>
              </h2>
              <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                <span>ABC: <strong className="text-slate-200">{code[0]} (Annual Value)</strong></span>
                <span>•</span>
                <span>SDE: <strong className="text-slate-200">{code[1]} (Procurement)</strong></span>
                <span>•</span>
                <span>VED: <strong className="text-slate-200">{code[2]} (Criticality)</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading cell details & inventory items...
            </div>
          ) : (
            <>
              {/* Reference Metrics Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <span className="text-[11px] font-medium text-blue-700">Target Service Level</span>
                  <div className="text-2xl font-bold text-blue-900 mt-0.5">{data?.service_level}%</div>
                  <span className="text-[10px] text-blue-600 font-mono">Z-Score: {data?.z_score}</span>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                  <span className="text-[11px] font-medium text-purple-700">Target Stockout Prob.</span>
                  <div className="text-2xl font-bold text-purple-900 mt-0.5">{data?.target_stockout_prob_pct}%</div>
                  <span className="text-[10px] text-purple-600 font-mono">(1 − Service Level)</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[11px] font-medium text-slate-700">Classified Parts</span>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">{data?.part_count}</div>
                  <span className="text-[10px] text-slate-500 font-mono">Stock: {data?.total_stock_units} units</span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <span className="text-[11px] font-medium text-emerald-700">Total Annual Spend</span>
                  <div className="text-xl font-bold text-emerald-900 mt-0.5">
                    ₹{data?.total_spend_inr?.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-mono">Actual Risk: {data?.avg_actual_stockout_risk_pct}%</span>
                </div>
              </div>

              {/* Items List Table */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Spare Parts in this Category ({data?.part_count || 0})</span>
                  </h3>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter parts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                    />
                  </div>
                </div>

                {filteredParts.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                    No spare parts currently classified under MUSIC-3D code <strong>{code}</strong>.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Part ID & Name</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3 text-right">Stock</th>
                          <th className="py-2.5 px-3 text-right">ROP</th>
                          <th className="py-2.5 px-3 text-right">Lead Time</th>
                          <th className="py-2.5 px-3 text-right">Sim. Risk</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredParts.map((p: any) => (
                          <tr key={p.part_id} className="hover:bg-slate-50/80 transition">
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              <span className="font-mono text-blue-700 block">{p.part_id}</span>
                              <span className="text-[11px] text-slate-600">{p.part_name}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{p.category}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                              {p.current_stock_units}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              {p.reorder_point}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              {p.lead_time_days}d
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                p.estimated_stockout_risk >= 30
                                  ? 'bg-red-100 text-red-700'
                                  : p.estimated_stockout_risk >= 10
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {p.estimated_stockout_risk}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                p.stock_status === 'HEALTHY'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.stock_status === 'OUT_OF_STOCK'
                                  ? 'bg-red-100 text-red-800 font-bold'
                                  : p.stock_status === 'UNDERSTOCK'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {p.stock_status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {onSelectPart && (
                                <button
                                  onClick={() => {
                                    onSelectPart(p.part_id);
                                    onClose();
                                  }}
                                  className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 text-[11px]"
                                >
                                  View <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Official LSCM Reference: 27-Combinations Model</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
