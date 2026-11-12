import React, { useEffect, useState } from 'react';
import { Truck, Plus, ShieldCheck, AlertTriangle, ExternalLink, Globe, Factory, Building2, Search, Filter } from 'lucide-react';
import { api } from '../services/api';
import { SupplierItem } from '../types';

export const SuppliersProcurement: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [golfFilter, setGolfFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    api.getSuppliers()
      .then((res) => {
        setSuppliers(res);
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
        <p className="text-sm font-medium">Loading Supplier Master & Procurement Sources...</p>
      </div>
    );
  }

  const filtered = suppliers.filter((s) => {
    if (golfFilter !== 'ALL' && s.golf_category !== golfFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchId = s.supplier_id.toLowerCase().includes(q);
      const matchName = s.supplier_name.toLowerCase().includes(q);
      const matchLoc = s.location.toLowerCase().includes(q);
      const matchType = s.supplier_type.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchLoc && !matchType) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              STOCK SENTRY — Suppliers & Procurement Intelligence (GOLF Analysis)
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
              Vendor Sourcing
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Procurement ecosystem evaluating single-source vulnerability, PSU contracts, and foreign import dependencies — Team TRACKBYTE.
          </p>
        </div>

        <span className="text-xs font-mono text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-200">
          Showing <strong>{filtered.length}</strong> of <strong>{suppliers.length}</strong> Vendors
        </span>
      </div>

      {/* Search and GOLF Filter Controls */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search suppliers by name, ID, location, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* GOLF Filter */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setGolfFilter('ALL')}
            className={`px-3 py-1 rounded font-medium transition ${golfFilter === 'ALL' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'}`}
          >
            All Vendors ({suppliers.length})
          </button>
          <button
            onClick={() => setGolfFilter('G')}
            className={`px-3 py-1 rounded font-medium transition ${golfFilter === 'G' ? 'bg-sky-600 text-white font-bold' : 'text-sky-700'}`}
          >
            PSU / Govt (G)
          </button>
          <button
            onClick={() => setGolfFilter('O')}
            className={`px-3 py-1 rounded font-medium transition ${golfFilter === 'O' ? 'bg-sky-600 text-white font-bold' : 'text-sky-700'}`}
          >
            Open Market (O)
          </button>
          <button
            onClick={() => setGolfFilter('L')}
            className={`px-3 py-1 rounded font-medium transition ${golfFilter === 'L' ? 'bg-sky-600 text-white font-bold' : 'text-sky-700'}`}
          >
            Local Depot (L)
          </button>
          <button
            onClick={() => setGolfFilter('F')}
            className={`px-3 py-1 rounded font-medium transition ${golfFilter === 'F' ? 'bg-purple-600 text-white font-bold' : 'text-purple-700'}`}
          >
            Foreign Import (F)
          </button>
        </div>
      </div>

      {/* Supplier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div
            key={s.supplier_id}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-blue-400 transition space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {s.supplier_id}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  s.golf_category === 'F'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : s.golf_category === 'G'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                }`}>
                  GOLF: {s.golf_category}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">{s.supplier_name}</h3>
              <p className="text-[11px] text-slate-500">{s.supplier_type} • {s.location}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
              <div className="p-2 rounded bg-slate-50">
                <span className="text-[10px] text-slate-400 block">Avg Lead Time</span>
                <strong className="text-slate-800 font-mono">{s.lead_time_avg_days} days (&plusmn;{s.lead_time_variance_days}d)</strong>
              </div>
              <div className="p-2 rounded bg-slate-50">
                <span className="text-[10px] text-slate-400 block">Reliability Score</span>
                <strong className="text-emerald-700 font-mono">{s.reliability_score}%</strong>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
              <span>Catalogued: <strong className="text-slate-800">{s.parts_count} parts</strong></span>
              <span>Vital Spares: <strong className="text-red-600">{s.vital_parts_count}</strong></span>
              <span>High Risk: <strong className="text-amber-600">{s.high_risk_parts_count}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
