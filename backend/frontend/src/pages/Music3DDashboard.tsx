import React, { useEffect, useState } from 'react';
import {
  Box,
  Layers,
  Table as TableIcon,
  HelpCircle,
  Filter,
  CheckCircle,
  ExternalLink,
  Search,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { Music3DMatrixResponse, Music3DCell } from '../types';
import { Music3DIsometricCube } from '../components/music3d/Music3DIsometricCube';
import { Music3DLayerMatrix } from '../components/music3d/Music3DLayerMatrix';
import { CellDetailModal } from '../components/music3d/CellDetailModal';

interface Music3DDashboardProps {
  onSelectPart?: (partId: string) => void;
}

export const Music3DDashboard: React.FC<Music3DDashboardProps> = ({ onSelectPart }) => {
  const [matrixData, setMatrixData] = useState<Music3DMatrixResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCellCode, setSelectedCellCode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'both' | 'cube' | 'layers'>('both');
  
  // Table filters
  const [tableSearch, setTableSearch] = useState<string>('');
  const [filterAbc, setFilterAbc] = useState<string>('ALL');
  const [filterSde, setFilterSde] = useState<string>('ALL');
  const [filterVed, setFilterVed] = useState<string>('ALL');

  useEffect(() => {
    api.getMusic3DMatrix()
      .then((res) => {
        setMatrixData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load MUSIC-3D matrix:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Constructing 27-Cell MUSIC-3D Matrix Space...</p>
      </div>
    );
  }

  const cells = matrixData?.cells || [];

  // Filter 27 rows table
  const filteredCells = cells.filter((c) => {
    if (filterAbc !== 'ALL' && c.abc !== filterAbc) return false;
    if (filterSde !== 'ALL' && c.sde !== filterSde) return false;
    if (filterVed !== 'ALL' && c.ved !== filterVed) return false;
    if (tableSearch && !c.code.toLowerCase().includes(tableSearch.toLowerCase()) && !c.description.toLowerCase().includes(tableSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Complete MUSIC-3D Inventory Classification Model
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              27 Combinations (ABC × SDE × VED)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Academic LSCM framework combining Annual Usage Spend, Sourcing Availability, and Rolling Stock Operational Criticality.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1 rounded font-medium transition ${viewMode === 'both' ? 'bg-white shadow text-blue-700' : 'text-slate-600'}`}
          >
            Combined 3D + Layers
          </button>
          <button
            onClick={() => setViewMode('cube')}
            className={`px-3 py-1 rounded font-medium transition ${viewMode === 'cube' ? 'bg-white shadow text-blue-700' : 'text-slate-600'}`}
          >
            3D Isometric Cube
          </button>
          <button
            onClick={() => setViewMode('layers')}
            className={`px-3 py-1 rounded font-medium transition ${viewMode === 'layers' ? 'bg-white shadow text-blue-700' : 'text-slate-600'}`}
          >
            Stacked 3×3 Layers
          </button>
        </div>
      </div>

      {/* Theory Explanation Callout */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md border border-slate-800">
        <div className="flex items-start justify-between">
          <div className="space-y-2 max-w-4xl">
            <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400" />
              How the MUSIC-3D Model Works in Indian Railways
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              Standard 1-dimensional ABC analysis focuses solely on monetary expenditure, which creates catastrophic blindspots in railway operations where an inexpensive ₹400 relay or pneumatic seal can halt a Rajdhani express or coal freight rake. <strong>MUSIC-3D synthesizes 3 critical dimensions</strong>:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-white/10 rounded-lg p-2.5 backdrop-blur-sm border border-white/10">
                <strong className="text-blue-300 block mb-0.5">1. ABC (Usage Value)</strong>
                <span className="text-slate-300 text-[11px]">A: ~70% spend, B: next 20%, C: remaining 10%. Manages store capital.</span>
              </div>
              <div className="bg-white/10 rounded-lg p-2.5 backdrop-blur-sm border border-white/10">
                <strong className="text-emerald-300 block mb-0.5">2. SDE (Procurement)</strong>
                <span className="text-slate-300 text-[11px]">S: Scarce/Imported, D: Difficult/Limited, E: Easily available. Manages lead-time risk.</span>
              </div>
              <div className="bg-white/10 rounded-lg p-2.5 backdrop-blur-sm border border-white/10">
                <strong className="text-red-300 block mb-0.5">3. VED (Criticality)</strong>
                <span className="text-slate-300 text-[11px]">V: Vital safety halt, E: Essential disruption, D: Desirable. Enforces train safety.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Visualizations */}
      {(viewMode === 'both' || viewMode === 'cube') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Box className="w-4 h-4 text-blue-600" />
              Interactive 3D Matrix Space (Rotate & Inspect 27 Cells)
            </h2>
            <span className="text-[11px] text-slate-500">Drag to rotate cube • Click any block to view parts</span>
          </div>
          <Music3DIsometricCube
            cells={cells}
            selectedCode={selectedCellCode}
            onSelectCell={(code) => setSelectedCellCode(code)}
          />
        </div>
      )}

      {(viewMode === 'both' || viewMode === 'layers') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              Full 27-Cell Matrix by VED Criticality Layers
            </h2>
            <span className="text-[11px] text-slate-500">All 27 combinations mapped with Course Service Levels & Z-Scores</span>
          </div>
          <Music3DLayerMatrix
            cells={cells}
            selectedCode={selectedCellCode}
            onSelectCell={(code) => setSelectedCellCode(code)}
          />
        </div>
      )}

      {/* Complete 27-Row Table with Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TableIcon className="w-4 h-4 text-blue-600" />
              Complete 27-Combination Master Lookup & Policy Table
            </h2>
            <p className="text-[11px] text-slate-500">
              Exact academic service level and Z-score mapping (LSCM Course Curriculum Benchmark)
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search code..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
              />
            </div>

            <select
              value={filterAbc}
              onChange={(e) => setFilterAbc(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">ABC: All</option>
              <option value="A">Class A</option>
              <option value="B">Class B</option>
              <option value="C">Class C</option>
            </select>

            <select
              value={filterSde}
              onChange={(e) => setFilterSde(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">SDE: All</option>
              <option value="S">Scarce (S)</option>
              <option value="D">Difficult (D)</option>
              <option value="E">Easy (E)</option>
            </select>

            <select
              value={filterVed}
              onChange={(e) => setFilterVed(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">VED: All</option>
              <option value="V">Vital (V)</option>
              <option value="E">Essential (E)</option>
              <option value="D">Desirable (D)</option>
            </select>
          </div>
        </div>

        {/* 27 Combinations Table */}
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">MUSIC-3D Code</th>
                <th className="py-2.5 px-3">Dimensions Breakdown</th>
                <th className="py-2.5 px-3 text-right">Target Service Level</th>
                <th className="py-2.5 px-3 text-right">Z-Score</th>
                <th className="py-2.5 px-3 text-right">Target Stockout Prob.</th>
                <th className="py-2.5 px-3 text-right">Catalogued Parts</th>
                <th className="py-2.5 px-3 text-right">Total Annual Spend</th>
                <th className="py-2.5 px-3 text-right">Avg. Actual Risk</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCells.map((row) => (
                <tr
                  key={row.code}
                  className={`hover:bg-blue-50/60 transition ${
                    selectedCellCode === row.code ? 'bg-blue-50 font-medium' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-mono font-bold">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      row.code === 'ASV'
                        ? 'bg-red-600 text-white'
                        : row.ved === 'V'
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-800 text-white'
                    }`}>
                      {row.code}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    <span className="font-semibold">{row.abc}</span> (Spend) +{' '}
                    <span className="font-semibold">{row.sde}</span> (Supply) +{' '}
                    <span className="font-semibold">{row.ved}</span> (Criticality)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                    {row.service_level}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    {row.z_score}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-purple-700 font-semibold">
                    {row.target_stockout_prob_pct}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                    {row.part_count}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                    ₹{row.total_spend_inr.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    <span className={`font-semibold ${
                      row.avg_actual_stockout_risk_pct > row.target_stockout_prob_pct
                        ? 'text-red-600'
                        : 'text-slate-600'
                    }`}>
                      {row.avg_actual_stockout_risk_pct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => setSelectedCellCode(row.code)}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] inline-flex items-center gap-1"
                    >
                      Inspect <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Cell Modal */}
      {selectedCellCode && (
        <CellDetailModal
          code={selectedCellCode}
          onClose={() => setSelectedCellCode(null)}
          onSelectPart={onSelectPart}
        />
      )}
    </div>
  );
};
