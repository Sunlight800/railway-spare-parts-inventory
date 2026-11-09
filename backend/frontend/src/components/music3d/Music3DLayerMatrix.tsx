import React from 'react';
import { Music3DCell } from '../../types';

interface Music3DLayerMatrixProps {
  cells: Music3DCell[];
  selectedCode?: string | null;
  onSelectCell: (code: string) => void;
}

export const Music3DLayerMatrix: React.FC<Music3DLayerMatrixProps> = ({
  cells,
  selectedCode,
  onSelectCell,
}) => {
  const cellMap = new Map<string, Music3DCell>();
  cells.forEach((c) => cellMap.set(c.code, c));

  const layers = [
    {
      ved: 'V',
      name: 'Vital (V) Layer - Extreme Criticality / Safety Halt Consequence',
      subtitle: 'Target Service Level: 80% to 99% (Z = 0.84 to 2.32)',
      badgeColor: 'bg-red-100 text-red-800 border-red-300',
    },
    {
      ved: 'E',
      name: 'Essential (E) Layer - Moderate Operational Disruption',
      subtitle: 'Target Service Level: 75% to 95% (Z = 0.67 to 1.64)',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      ved: 'D',
      name: 'Desirable (D) Layer - Auxiliary / Comfort / Non-Critical',
      subtitle: 'Target Service Level: 60% to 95% (Z = 0.25 to 1.64)',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    },
  ];

  const columns = [
    { label: 'A-S', abc: 'A', sde: 'S', title: 'High Spend • Scarce' },
    { label: 'A-D', abc: 'A', sde: 'D', title: 'High Spend • Difficult' },
    { label: 'A-E', abc: 'A', sde: 'E', title: 'High Spend • Easy' },
    { label: 'B-S', abc: 'B', sde: 'S', title: 'Medium Spend • Scarce' },
    { label: 'B-D', abc: 'B', sde: 'D', title: 'Medium Spend • Difficult' },
    { label: 'B-E', abc: 'B', sde: 'E', title: 'Medium Spend • Easy' },
    { label: 'C-S', abc: 'C', sde: 'S', title: 'Low Spend • Scarce' },
    { label: 'C-D', abc: 'C', sde: 'D', title: 'Low Spend • Difficult' },
    { label: 'C-E', abc: 'C', sde: 'E', title: 'Low Spend • Easy' },
  ];

  return (
    <div className="space-y-6">
      {layers.map((layer) => (
        <div key={layer.ved} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Layer Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${layer.badgeColor}`}>
                  VED: {layer.ved}
                </span>
                <h3 className="text-sm font-bold text-slate-800">{layer.name}</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{layer.subtitle}</p>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-200/60 px-2 py-1 rounded">
              9 Cells Matrix (ABC × SDE)
            </span>
          </div>

          {/* 9 Cells Grid */}
          <div className="p-3 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
            {columns.map((col) => {
              const code = `${col.abc}${col.sde}${layer.ved}`;
              const cell = cellMap.get(code);
              const isSelected = selectedCode === code;
              const count = cell ? cell.part_count : 0;
              const spend = cell ? cell.total_spend_inr : 0;
              const sl = cell ? cell.service_level : 90;
              const z = cell ? cell.z_score : 1.28;
              const targetRisk = cell ? cell.target_stockout_prob_pct : 10;
              const actualRisk = cell ? cell.avg_actual_stockout_risk_pct : 0;

              return (
                <div
                  key={code}
                  onClick={() => onSelectCell(code)}
                  className={`cursor-pointer rounded-lg border p-2.5 transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/30 shadow-md'
                      : count > 0
                      ? 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm'
                      : 'border-dashed border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-xs font-extrabold font-mono px-1.5 py-0.5 rounded ${
                        code === 'ASV' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'
                      }`}>
                        {code}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {col.label}
                      </div>
                    </div>

                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      count > 0 ? 'bg-blue-100 text-blue-800 font-mono' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {count} {count === 1 ? 'part' : 'parts'}
                    </span>
                  </div>

                  {/* Middle Parameters */}
                  <div className="my-2 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span className="text-[10px] text-slate-400">Target SL:</span>
                      <span className="font-semibold text-emerald-700">{sl}% (Z={z})</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-[10px] text-slate-400">Target Risk:</span>
                      <span className="font-medium text-slate-700">{targetRisk}%</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-[10px] text-slate-400">Actual Risk:</span>
                      <span className={`font-semibold ${actualRisk > targetRisk ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                        {actualRisk.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Footer Spend */}
                  <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between items-center">
                    <span>Spend:</span>
                    <span className="font-mono font-medium text-slate-800">
                      ₹{spend > 100000 ? `${(spend / 100000).toFixed(1)}L` : `${(spend / 1000).toFixed(0)}k`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
