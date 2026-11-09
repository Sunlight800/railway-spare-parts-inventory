import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  Truck,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { SparePartItem } from '../types';

interface InventoryExplorerProps {
  initialSearch?: string;
  initialFilters?: Record<string, string>;
  selectedPartId?: string | null;
  onClearSelectedPart?: () => void;
}

export const InventoryExplorer: React.FC<InventoryExplorerProps> = ({
  initialSearch = '',
  initialFilters = {},
  selectedPartId,
  onClearSelectedPart,
}) => {
  const [parts, setParts] = useState<SparePartItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>(initialSearch);
  const [category, setCategory] = useState<string>(initialFilters.category || 'ALL');
  const [abcClass, setAbcClass] = useState<string>(initialFilters.abc_class || 'ALL');
  const [sdeClass, setSdeClass] = useState<string>(initialFilters.sde_class || 'ALL');
  const [vedClass, setVedClass] = useState<string>(initialFilters.ved_class || 'ALL');
  const [music3dCode, setMusic3dCode] = useState<string>(initialFilters.music3d_code || 'ALL');
  const [hmlClass, setHmlClass] = useState<string>('ALL');
  const [sosClass, setSosClass] = useState<string>('ALL');
  const [golfClass, setGolfClass] = useState<string>('ALL');
  const [fsnClass, setFsnClass] = useState<string>('ALL');
  const [stockStatus, setStockStatus] = useState<string>(initialFilters.stock_status || 'ALL');

  // Detail Drawer state
  const [activePartId, setActivePartId] = useState<string | null>(selectedPartId || null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Fetch list
  const fetchParts = () => {
    setLoading(true);
    const params: Record<string, any> = {
      page,
      page_size: 25,
      search: search.trim() || undefined,
      category: category !== 'ALL' ? category : undefined,
      abc_class: abcClass !== 'ALL' ? abcClass : undefined,
      sde_class: sdeClass !== 'ALL' ? sdeClass : undefined,
      ved_class: vedClass !== 'ALL' ? vedClass : undefined,
      music3d_code: music3dCode !== 'ALL' ? music3dCode : undefined,
      hml_class: hmlClass !== 'ALL' ? hmlClass : undefined,
      sos_class: sosClass !== 'ALL' ? sosClass : undefined,
      golf_class: golfClass !== 'ALL' ? golfClass : undefined,
      fsn_class: fsnClass !== 'ALL' ? fsnClass : undefined,
      stock_status: stockStatus !== 'ALL' ? stockStatus : undefined,
    };

    api.getSpareParts(params)
      .then((res) => {
        setParts(res.items);
        setTotalCount(res.total);
        setTotalPages(res.total_pages);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchParts();
  }, [page, category, abcClass, sdeClass, vedClass, music3dCode, hmlClass, sosClass, golfClass, fsnClass, stockStatus]);

  // Handle active part details
  useEffect(() => {
    if (!activePartId) {
      setDetailData(null);
      return;
    }
    setDetailLoading(true);
    api.getSparePartDetail(activePartId)
      .then((res) => {
        setDetailData(res);
        setDetailLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setDetailLoading(false);
      });
  }, [activePartId]);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Indian Railways Spare-Part Inventory Explorer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Individual inspection of all 200 catalogued spare parts with 7 selective control dimensions.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          <span>Total Records: <strong className="text-slate-900">{totalCount}</strong></span>
          <span>•</span>
          <span>Page {page} of {totalPages}</span>
        </div>
      </div>

      {/* Search & Comprehensive Multi-Dimension Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Part ID, Name, Category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchParts()}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Subsystems</option>
            <option value="Braking">Braking System</option>
            <option value="Pneumatic">Pneumatic System</option>
            <option value="Bogie">Bogie Assembly</option>
            <option value="Electrical">Electrical System</option>
            <option value="Control">Control & Interlocking</option>
            <option value="Door system">Door System</option>
            <option value="Coupling">Coupling & CBC</option>
            <option value="Mechanical">Mechanical Track Machine</option>
            <option value="General">General Depot Spares</option>
          </select>

          {/* Stock Status Dropdown */}
          <select
            value={stockStatus}
            onChange={(e) => { setStockStatus(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="HEALTHY">Healthy Stock</option>
            <option value="UNDERSTOCK">Understock (&lt; ROP)</option>
            <option value="OUT_OF_STOCK">Zero Stock (Out of Stock)</option>
            <option value="OVERSTOCK">Overstocked Capital</option>
          </select>

          {/* VED Dropdown */}
          <select
            value={vedClass}
            onChange={(e) => { setVedClass(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
          >
            <option value="ALL">VED: All Criticality</option>
            <option value="V">Vital (V) - Safety Halt</option>
            <option value="E">Essential (E) - Disruption</option>
            <option value="D">Desirable (D) - Auxiliary</option>
          </select>
        </div>

        {/* Secondary Classification Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">Selective Control:</span>

          <select
            value={abcClass}
            onChange={(e) => { setAbcClass(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded px-2 py-0.5 bg-slate-50"
          >
            <option value="ALL">ABC: All</option>
            <option value="A">Class A (70% Spend)</option>
            <option value="B">Class B (20% Spend)</option>
            <option value="C">Class C (10% Spend)</option>
          </select>

          <select
            value={sdeClass}
            onChange={(e) => { setSdeClass(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded px-2 py-0.5 bg-slate-50"
          >
            <option value="ALL">SDE: All</option>
            <option value="S">Scarce (S)</option>
            <option value="D">Difficult (D)</option>
            <option value="E">Easily Available (E)</option>
          </select>

          <select
            value={hmlClass}
            onChange={(e) => { setHmlClass(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded px-2 py-0.5 bg-slate-50"
          >
            <option value="ALL">HML: All</option>
            <option value="H">High Price (H)</option>
            <option value="M">Medium Price (M)</option>
            <option value="L">Low Price (L)</option>
          </select>

          <select
            value={golfClass}
            onChange={(e) => { setGolfClass(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded px-2 py-0.5 bg-slate-50"
          >
            <option value="ALL">GOLF: All</option>
            <option value="G">Government / PSU (G)</option>
            <option value="O">Open Market (O)</option>
            <option value="L">Local Workshop (L)</option>
            <option value="F">Foreign / Imported (F)</option>
          </select>

          <select
            value={fsnClass}
            onChange={(e) => { setFsnClass(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded px-2 py-0.5 bg-slate-50"
          >
            <option value="ALL">FSN: All</option>
            <option value="F">Fast Moving (F)</option>
            <option value="S">Slow Moving (S)</option>
            <option value="N">Non-Moving (N)</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setCategory('ALL');
              setAbcClass('ALL');
              setSdeClass('ALL');
              setVedClass('ALL');
              setMusic3dCode('ALL');
              setHmlClass('ALL');
              setSosClass('ALL');
              setGolfClass('ALL');
              setFsnClass('ALL');
              setStockStatus('ALL');
              setPage(1);
            }}
            className="text-[11px] text-blue-600 hover:text-blue-800 underline ml-auto"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading spare-part inventory records...
          </div>
        ) : parts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No spare parts match the selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Part ID & Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Price (₹)</th>
                  <th className="py-2.5 px-3 text-right">Stock</th>
                  <th className="py-2.5 px-3 text-right">ROP</th>
                  <th className="py-2.5 px-3 text-center">MUSIC-3D</th>
                  <th className="py-2.5 px-3 text-center">Multi-Class</th>
                  <th className="py-2.5 px-3 text-right">Target SL</th>
                  <th className="py-2.5 px-3 text-right">Sim. Risk</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parts.map((p) => (
                  <tr
                    key={p.part_id}
                    onClick={() => setActivePartId(p.part_id)}
                    className={`hover:bg-blue-50/60 cursor-pointer transition ${
                      activePartId === p.part_id ? 'bg-blue-50 font-medium' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      <span className="font-mono text-blue-700 block font-bold">{p.part_id}</span>
                      <span className="text-[11px] text-slate-700">{p.part_name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{p.category}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      ₹{p.unit_price_inr.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {p.current_stock_units}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {p.reorder_point}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        p.music3d_code === 'ASV'
                          ? 'bg-red-600 text-white'
                          : p.ved_class === 'V'
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-800 text-white'
                      }`}>
                        {p.music3d_code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[10px] space-x-1">
                      <span title={`HML: ${p.hml_class}`} className="px-1 py-0.5 rounded bg-slate-100 font-semibold">{p.hml_class}</span>
                      <span title={`SOS: ${p.sos_class}`} className="px-1 py-0.5 rounded bg-slate-100">{p.sos_class}</span>
                      <span title={`GOLF: ${p.golf_class}`} className="px-1 py-0.5 rounded bg-slate-100">{p.golf_class}</span>
                      <span title={`FSN: ${p.fsn_class}`} className="px-1 py-0.5 rounded bg-slate-100">{p.fsn_class}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                      {p.service_level}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
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
                    <td className="py-2.5 px-3 text-center">
                      <button className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] p-1 rounded hover:bg-blue-50">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing {((page - 1) * 25) + 1} to {Math.min(page * 25, totalCount)} of {totalCount} spare parts
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-2 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-mono font-medium">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-2 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Part Detail Side Drawer / Modal */}
      {activePartId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl overflow-y-auto flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm px-2.5 py-0.5 rounded bg-blue-600 text-white font-bold">
                    {detailData?.part_id || activePartId}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-amber-400 border border-amber-400/30">
                    MUSIC-3D: {detailData?.classification?.music3d_code}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white leading-tight">
                  {detailData?.part_name}
                </h2>
                <div className="text-xs text-slate-400">
                  Subsystem: <span className="text-slate-200">{detailData?.category}</span> • Supplier ID: <span className="text-slate-200">{detailData?.supplier_id}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setActivePartId(null);
                  if (onClearSelectedPart) onClearSelectedPart();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 p-6 space-y-6">
              {detailLoading ? (
                <div className="py-20 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Loading part profile...
                </div>
              ) : (
                <>
                  {/* Stock & Reorder KPI Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Current Stock</span>
                      <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                        {detailData?.current_stock_units} <span className="text-xs font-normal text-slate-400">units</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Cover: {detailData?.metrics?.stock_cover_days} days</span>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <span className="text-[10px] font-medium text-blue-700 uppercase tracking-wider">Reorder Point (ROP)</span>
                      <div className="text-xl font-bold font-mono text-blue-900 mt-0.5">
                        {detailData?.metrics?.reorder_point} <span className="text-xs font-normal text-blue-600">units</span>
                      </div>
                      <span className="text-[10px] text-blue-600 font-mono">Safety Stock: {detailData?.metrics?.safety_stock}</span>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                      <span className="text-[10px] font-medium text-purple-700 uppercase tracking-wider">Lead Time Demand</span>
                      <div className="text-xl font-bold font-mono text-purple-900 mt-0.5">
                        {detailData?.metrics?.lead_time_demand} <span className="text-xs font-normal text-purple-600">units</span>
                      </div>
                      <span className="text-[10px] text-purple-600 font-mono">{detailData?.lead_time_days} days LT</span>
                    </div>

                    <div className={`rounded-xl p-3 border ${
                      detailData?.metrics?.estimated_stockout_risk >= 30
                        ? 'bg-red-50 border-red-200'
                        : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">Actual Stockout Risk</span>
                      <div className={`text-xl font-bold font-mono mt-0.5 ${
                        detailData?.metrics?.estimated_stockout_risk >= 30 ? 'text-red-700' : 'text-emerald-800'
                      }`}>
                        {detailData?.metrics?.estimated_stockout_risk}%
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Target: {detailData?.classification?.target_stockout_prob_pct}%</span>
                    </div>
                  </div>

                  {/* Complete 7 Classifications Breakdown Grid */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Multi-Parameter Classification Profile (7 Techniques)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">ABC (Usage Spend)</span>
                        <strong className="text-sm font-mono text-blue-700">Class {detailData?.classification?.abc_class}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">SDE (Availability)</span>
                        <strong className="text-sm font-mono text-purple-700">{detailData?.classification?.sde_class}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">VED (Criticality)</span>
                        <strong className={`text-sm font-mono ${detailData?.classification?.ved_class === 'V' ? 'text-red-600 font-bold' : 'text-amber-700'}`}>
                          {detailData?.classification?.ved_class} ({detailData?.classification?.ved_class === 'V' ? 'Vital' : detailData?.classification?.ved_class === 'E' ? 'Essential' : 'Desirable'})
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">HML (Unit Price)</span>
                        <strong className="text-sm font-mono text-slate-800">Class {detailData?.classification?.hml_class}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">SOS (Seasonality)</span>
                        <strong className="text-sm font-mono text-slate-800">{detailData?.classification?.sos_class} ({detailData?.classification?.sos_class === 'S' ? 'Seasonal' : 'Off-Seasonal'})</strong>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">GOLF (Source)</span>
                        <strong className="text-sm font-mono text-slate-800">Class {detailData?.classification?.golf_class}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">FSN (Turnover)</span>
                        <strong className="text-sm font-mono text-slate-800">Class {detailData?.classification?.fsn_class}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">Approval Status</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-block mt-0.5">
                          {detailData?.classification?.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Provenance & Safety Consequence Notes */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Classification Rationale & Provenance
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      {detailData?.classification?.reason}
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Safety Impact:</span>
                        <span className="font-medium text-slate-800">{detailData?.classification?.safety_impact}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Operational Impact:</span>
                        <span className="font-medium text-slate-800">{detailData?.classification?.operational_impact}</span>
                      </div>
                    </div>
                  </div>

                  {/* Supplier Info */}
                  {detailData?.supplier && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-slate-600" />
                        Supplier & Procurement Ecosystem
                      </div>
                      <div className="font-medium text-slate-900">{detailData.supplier.name}</div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span>Type: <strong>{detailData.supplier.type}</strong></span>
                        <span>Origin: <strong>{detailData.supplier.location}</strong></span>
                        <span>Reliability: <strong className="text-emerald-700">{detailData.supplier.reliability_score}%</strong></span>
                        <span>Imported: <strong>{detailData.supplier.import_dependency ? 'Yes' : 'No'}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* BOM Linked Rolling Stock Assets */}
                  {detailData?.linked_assets?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Linked Rolling Stock Assemblies (BOM)
                      </h3>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-[10px] uppercase">
                            <tr>
                              <th className="py-2 px-3">Asset ID & Name</th>
                              <th className="py-2 px-3">System</th>
                              <th className="py-2 px-3 text-right">Qty / Asset</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {detailData.linked_assets.map((a: any) => (
                              <tr key={a.asset_id}>
                                <td className="py-2 px-3 font-mono text-blue-700">
                                  {a.asset_id} <span className="text-[11px] text-slate-600 font-sans">({a.asset_name})</span>
                                </td>
                                <td className="py-2 px-3 text-slate-600">{a.system}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">{a.required_quantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <span className="font-mono text-[11px]">Provenance: {detailData?.data_source}</span>
              <button
                onClick={() => {
                  setActivePartId(null);
                  if (onClearSelectedPart) onClearSelectedPart();
                }}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
