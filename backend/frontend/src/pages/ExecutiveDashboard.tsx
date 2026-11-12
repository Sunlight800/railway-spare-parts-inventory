import React, { useEffect, useState } from 'react';
import {
  Package,
  Boxes,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  CalendarCheck,
  Percent,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import { api } from '../services/api';
import { InventoryHealthKPIs, ClassificationSummary } from '../types';

interface ExecutiveDashboardProps {
  onNavigateTab: (tab: any, filterParams?: any) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onNavigateTab }) => {
  const [healthData, setHealthData] = useState<InventoryHealthKPIs | null>(null);
  const [classSummary, setClassSummary] = useState<ClassificationSummary | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      api.getInventoryHealth(),
      api.getClassificationSummary(),
      api.getRecommendations()
    ])
      .then(([health, summary, recs]) => {
        setHealthData(health);
        setClassSummary(summary);
        setRecommendations(recs.recommendations || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Aggregating Stock Sentry Inventory Intelligence...</p>
      </div>
    );
  }

  const kpis = healthData?.kpis;
  const riskDist = healthData?.risk_distribution;
  const criticalAlerts = recommendations.filter((r) => r.priority === 'CRITICAL' || r.priority === 'HIGH').slice(0, 5);

  // Chart data formatting
  const abcData = classSummary?.abc.map((c) => ({
    name: `Class ${c.category}`,
    value: c.count,
    spend: c.total_spend_inr,
    color: c.category === 'A' ? '#2563eb' : c.category === 'B' ? '#0d9488' : '#64748b'
  })) || [];

  const vedData = classSummary?.ved.map((c) => ({
    name: c.category === 'V' ? 'Vital (V)' : c.category === 'E' ? 'Essential (E)' : 'Desirable (D)',
    value: c.count,
    color: c.category === 'V' ? '#dc2626' : c.category === 'E' ? '#d97706' : '#64748b'
  })) || [];

  const sdeData = classSummary?.sde.map((c) => ({
    name: c.category === 'S' ? 'Scarce (S)' : c.category === 'D' ? 'Difficult (D)' : 'Easy (E)',
    value: c.count,
    color: c.category === 'S' ? '#9333ea' : c.category === 'D' ? '#2563eb' : '#16a34a'
  })) || [];

  const categoryBarData = healthData?.category_breakdown.map((cat) => ({
    category: cat.category,
    inventoryValue: Math.round(cat.inventory_value_inr / 1000), // in Thousands INR
    annualConsumption: Math.round(cat.annual_consumption_inr / 1000)
  })) || [];

  return (
    <div className="space-y-6">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            STOCK SENTRY — Inventory & Availability Executive Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time selective control analytics, MUSIC-3D availability intelligence, and stockout risk surveillance — Team TRACKBYTE.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigateTab('music3d')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <span>Open MUSIC-3D Matrix</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 10 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1 */}
        <div 
          onClick={() => onNavigateTab('inventory')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total SKUs</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{kpis?.total_spare_parts}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Catalogued Rolling Stock Spares</div>
        </div>

        {/* KPI 2 */}
        <div 
          onClick={() => onNavigateTab('inventory')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Held Quantity</span>
            <Boxes className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            {kpis?.total_inventory_quantity.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Physical Units Across Depots</div>
        </div>

        {/* KPI 3 */}
        <div 
          onClick={() => onNavigateTab('inventory')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Inventory Value</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            ₹{((kpis?.total_inventory_value_inr || 0) / 100000).toFixed(2)}L
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Working Capital Held in Stores</div>
        </div>

        {/* KPI 4 */}
        <div 
          onClick={() => onNavigateTab('classifications')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Annual Spend</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            ₹{((kpis?.total_annual_spend_inr || 0) / 100000).toFixed(2)}L
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Annual Usage Expenditure</div>
        </div>

        {/* KPI 5 */}
        <div 
          onClick={() => onNavigateTab('inventory', { ved_class: 'V' })}
          className="bg-white p-3.5 rounded-xl border border-red-200 bg-red-50/20 shadow-sm hover:border-red-400 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-red-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Vital Parts</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-bold text-red-900 font-mono">{kpis?.total_vital_parts}</div>
          <div className="text-[10px] text-red-600 mt-0.5">Safety & Traction Critical</div>
        </div>

        {/* KPI 6 */}
        <div 
          onClick={() => onNavigateTab('inventory', { stock_status: 'UNDERSTOCK' })}
          className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm hover:border-amber-400 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Below ROP</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-900 font-mono">{kpis?.parts_below_reorder_point}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Reorder Point Breached</div>
        </div>

        {/* KPI 7 */}
        <div 
          onClick={() => onNavigateTab('stock-health')}
          className="bg-white p-3.5 rounded-xl border border-red-200 bg-red-50/20 shadow-sm hover:border-red-400 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-red-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">High Risk Parts</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-bold text-red-900 font-mono">{kpis?.parts_high_stockout_risk}</div>
          <div className="text-[10px] text-red-600 mt-0.5">Simulated Risk &ge; 30%</div>
        </div>

        {/* KPI 8 */}
        <div 
          onClick={() => onNavigateTab('block-planning')}
          className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm hover:border-emerald-400 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Zero-Stock Vitals</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-bold text-red-900 font-mono">{kpis?.vital_parts_zero_stock}</div>
          <div className="text-[10px] text-red-600 mt-0.5">Highest Alert Deficit</div>
        </div>

        {/* KPI 9 */}
        <div 
          onClick={() => onNavigateTab('classifications')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Classifications</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            {classSummary?.approved_count} <span className="text-xs font-normal text-slate-400">/ {classSummary?.total_parts}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Approved vs AI Suggested</div>
        </div>

        {/* KPI 10 */}
        <div 
          onClick={() => onNavigateTab('stock-health')}
          className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm hover:border-emerald-400 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Availability Index</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-800 font-mono">
            {kpis?.overall_availability_index_pct}%
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Items in Healthy Buffer</div>
        </div>
      </div>

      {/* Critical Alerts Section */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h2 className="text-xs font-bold text-red-950 uppercase tracking-wider">
                Critical Railway Operational & Stockout Alerts
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('recommendations')}
              className="text-xs text-red-700 hover:text-red-900 font-semibold flex items-center gap-1"
            >
              View All Recommendations ({recommendations.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {criticalAlerts.map((alt, idx) => (
              <div
                key={idx}
                onClick={() => onNavigateTab('inventory', { search: alt.part_id })}
                className="bg-white p-3 rounded-lg border border-red-200 hover:border-red-400 cursor-pointer transition text-xs space-y-1 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-red-700">{alt.part_id}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                    {alt.music3d_code}
                  </span>
                </div>
                <div className="font-medium text-slate-800 line-clamp-1">{alt.part_name}</div>
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {alt.evidence}
                </p>
                <div className="pt-1 text-[10px] text-blue-600 font-medium flex items-center justify-between">
                  <span>Action: {alt.suggested_action.slice(0, 35)}...</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Core MUSIC-3D Dimensions Breakdown Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ABC Distribution */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1st Dimension: ABC Analysis
              </h3>
              <p className="text-[11px] text-slate-400">Annual Consumption Value Pareto</p>
            </div>
            <button 
              onClick={() => onNavigateTab('classifications')}
              className="text-[11px] text-blue-600 hover:underline"
            >
              Pareto Curve
            </button>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={abcData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {abcData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 text-center text-[11px]">
            {classSummary?.abc.map((c) => (
              <div key={c.category} className="p-1 rounded bg-slate-50">
                <div className="font-bold text-slate-800">Class {c.category}</div>
                <div className="text-slate-500">{c.count} items</div>
                <div className="text-[10px] text-blue-600 font-semibold">{c.spend_share_pct}% spend</div>
              </div>
            ))}
          </div>
        </div>

        {/* SDE Distribution */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2nd Dimension: SDE Analysis
              </h3>
              <p className="text-[11px] text-slate-400">Procurement Availability & Sources</p>
            </div>
            <button 
              onClick={() => onNavigateTab('suppliers')}
              className="text-[11px] text-blue-600 hover:underline"
            >
              Suppliers
            </button>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sdeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sdeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 text-center text-[11px]">
            {classSummary?.sde.map((c) => (
              <div key={c.category} className="p-1 rounded bg-slate-50">
                <div className="font-bold text-slate-800">{c.category === 'S' ? 'Scarce' : c.category === 'D' ? 'Difficult' : 'Easy'}</div>
                <div className="text-slate-500">{c.count} items</div>
                <div className="text-[10px] text-purple-600 font-semibold">{c.percentage_items}% SKUs</div>
              </div>
            ))}
          </div>
        </div>

        {/* VED Distribution */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                3rd Dimension: VED Analysis
              </h3>
              <p className="text-[11px] text-slate-400">Operational & Safety Criticality</p>
            </div>
            <button 
              onClick={() => onNavigateTab('inventory', { ved_class: 'V' })}
              className="text-[11px] text-red-600 hover:underline"
            >
              Vital Spares
            </button>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {vedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 text-center text-[11px]">
            {classSummary?.ved.map((c) => (
              <div key={c.category} className="p-1 rounded bg-slate-50">
                <div className="font-bold text-slate-800">{c.category === 'V' ? 'Vital (V)' : c.category === 'E' ? 'Essential (E)' : 'Desirable'}</div>
                <div className="text-slate-500">{c.count} items</div>
                <div className="text-[10px] text-red-600 font-semibold">{c.percentage_items}% SKUs</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Breakdown & Value Distribution Bar Chart */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Rolling Stock & Fixed Asset Category Valuation
            </h3>
            <p className="text-[11px] text-slate-500">
              Held Inventory Value vs Annual Consumption Expenditure (in ₹ Thousands INR)
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">9 Core Subsystems</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryBarData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <XAxis dataKey="category" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="inventoryValue" name="Held Stock Value (₹k)" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="annualConsumption" name="Annual Consumption (₹k)" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
