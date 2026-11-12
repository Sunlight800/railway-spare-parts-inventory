import React, { useEffect, useState } from 'react';
import { TrainTrack, ShieldCheck, AlertTriangle, Layers, ChevronRight, Train, CheckCircle2, Search, Filter } from 'lucide-react';
import { api } from '../services/api';
import { AssetItem } from '../types';

export const AssetsSystems: React.FC = () => {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [search, setSearch] = useState<string>('');
  const [selectedSystem, setSelectedSystem] = useState<string>('ALL');

  useEffect(() => {
    api.getAssets()
      .then((res) => {
        setAssets(res);
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
        <p className="text-sm font-medium">Loading Railway Rolling Stock & Infrastructure Assets...</p>
      </div>
    );
  }

  const systems = Array.from(new Set(assets.map((a) => a.system))).filter(Boolean);

  const filteredAssets = assets.filter((a) => {
    if (selectedSystem !== 'ALL' && a.system !== selectedSystem) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchId = a.asset_id.toLowerCase().includes(q);
      const matchName = a.asset_name.toLowerCase().includes(q);
      const matchLoc = a.location.toLowerCase().includes(q);
      const matchSys = a.system.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchLoc && !matchSys) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            STOCK SENTRY — Assets & Bill-of-Materials (BOM) Subsystems
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical rolling stock and fixed track infrastructure mapped to spare-part assemblies and readiness — Team TRACKBYTE.
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-200">
          Showing <strong>{filteredAssets.length}</strong> of <strong>{assets.length}</strong> Assets
        </span>
      </div>

      {/* Search & Subsystem Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search assets by ID, name, system, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedSystem}
            onChange={(e) => setSelectedSystem(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
          >
            <option value="ALL">All Subsystems</option>
            {systems.map((sys) => (
              <option key={sys} value={sys}>{sys}</option>
            ))}
          </select>
        </div>

        {(search || selectedSystem !== 'ALL') && (
          <button
            onClick={() => { setSearch(''); setSelectedSystem('ALL'); }}
            className="text-xs text-sky-600 hover:text-sky-800 font-medium underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Asset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map((a) => (
          <div
            key={a.asset_id}
            onClick={() => setSelectedAsset(a)}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-blue-400 cursor-pointer transition space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {a.asset_id}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  a.has_shortage ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {a.has_shortage ? 'BOM Shortage' : 'BOM Ready'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-1">{a.asset_name}</h3>
              <p className="text-[11px] text-slate-500">{a.asset_type} • {a.location}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
              <div className="p-2 rounded bg-slate-50">
                <span className="text-[10px] text-slate-400 block">Subsystem</span>
                <strong className="text-slate-800">{a.system}</strong>
              </div>
              <div className="p-2 rounded bg-slate-50">
                <span className="text-[10px] text-slate-400 block">Linked Spares</span>
                <strong className="text-slate-800">{a.total_linked_parts} parts ({a.vital_parts_count} Vital)</strong>
              </div>
            </div>

            <button className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-800 pt-1 flex items-center justify-center gap-1">
              Inspect Assembly Spares <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Asset BOM Parts Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
              <div>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-600 text-white font-bold">
                  {selectedAsset.asset_id}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{selectedAsset.asset_name}</h3>
                <span className="text-xs text-slate-400">{selectedAsset.location} • System: {selectedAsset.system}</span>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Bill of Materials Spare Parts Dependencies ({selectedAsset.linked_parts.length})
              </h4>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-semibold">
                    <tr>
                      <th className="py-2 px-3">Part ID & Name</th>
                      <th className="py-2 px-3 text-center">MUSIC-3D</th>
                      <th className="py-2 px-3 text-right">Required</th>
                      <th className="py-2 px-3 text-right">Stock</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedAsset.linked_parts.map((p) => (
                      <tr key={p.part_id}>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          <span className="font-mono text-blue-700 block font-bold">{p.part_id}</span>
                          <span className="text-[11px] text-slate-600">{p.part_name}</span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                          {p.music3d_code}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">{p.required_quantity}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{p.current_stock}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'SHORTAGE' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
