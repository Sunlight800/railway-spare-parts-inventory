import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Package,
  Boxes,
  Truck,
  Activity,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle,
  ExternalLink,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  ShieldAlert,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { api } from '../services/api';
import { ClassificationSummary } from '../types';

interface ClassificationAnalysisProps {
  onSelectPart?: (partId: string) => void;
}

type ClassificationMethod = 'abc' | 'sde' | 'ved' | 'hml' | 'sos' | 'golf' | 'fsn';

interface TabConfig {
  id: ClassificationMethod;
  label: string;
  shortName: string;
  desc: string;
  badge: string;
}

const TABS: TabConfig[] = [
  { id: 'abc', label: '1. ABC Analysis', shortName: 'ABC', desc: 'Annual Spend Value', badge: 'Spend Pareto' },
  { id: 'sde', label: '2. SDE Analysis', shortName: 'SDE', desc: 'Procurement Sourcing', badge: 'Lead Time' },
  { id: 'ved', label: '3. VED Analysis', shortName: 'VED', desc: 'Safety Criticality', badge: 'Train Safety' },
  { id: 'hml', label: '4. HML Analysis', shortName: 'HML', desc: 'Unit Cost Tiers', badge: 'Price Tiers' },
  { id: 'sos', label: '5. SOS Analysis', shortName: 'SOS', desc: 'Monthly Seasonality', badge: '12-Mo Trend' },
  { id: 'golf', label: '6. GOLF Analysis', shortName: 'GOLF', desc: 'Procurement Channel', badge: 'Vendor Source' },
  { id: 'fsn', label: '7. FSN Analysis', shortName: 'FSN', desc: 'Store Turnover Rate', badge: 'Movement' },
];

export const ClassificationAnalysis: React.FC<ClassificationAnalysisProps> = ({ onSelectPart }) => {
  const [activeTab, setActiveTab] = useState<ClassificationMethod>('abc');
  const [summary, setSummary] = useState<ClassificationSummary | null>(null);
  
  // Data cache for tabs
  const [methodData, setMethodData] = useState<Record<string, any>>({});
  const [loadingMethod, setLoadingMethod] = useState<boolean>(true);
  const [globalLoading, setGlobalLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Table Controls
  const [tableSearch, setTableSearch] = useState<string>('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('ALL');
  const [sortField, setSortField] = useState<string>('annual_consumption_value_inr');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Initial Load: Fetch summary and the active tab (ABC)
  const loadSummaryAndInitialTab = async () => {
    try {
      setGlobalLoading(true);
      setErrorMsg(null);
      
      const [sumRes, abcRes] = await Promise.all([
        api.getClassificationSummary().catch((err) => {
          console.error('Summary load error:', err);
          return null;
        }),
        api.getClassificationMethodDetails('abc').catch((err) => {
          console.error('ABC load error:', err);
          return null;
        })
      ]);

      if (sumRes) setSummary(sumRes);
      if (abcRes) {
        setMethodData((prev) => ({ ...prev, abc: abcRes }));
      }
    } catch (err: any) {
      console.error('Failed to initialize classification data:', err);
      setErrorMsg(err.message || 'Failed to load classification data.');
    } finally {
      setGlobalLoading(false);
      setLoadingMethod(false);
    }
  };

  useEffect(() => {
    loadSummaryAndInitialTab();
  }, []);

  // Fetch method data when tab changes if not already cached
  useEffect(() => {
    if (!methodData[activeTab]) {
      setLoadingMethod(true);
      api.getClassificationMethodDetails(activeTab)
        .then((res) => {
          setMethodData((prev) => ({ ...prev, [activeTab]: res }));
          setLoadingMethod(false);
        })
        .catch((err) => {
          console.error(`Error loading details for ${activeTab}:`, err);
          setLoadingMethod(false);
        });
    }
    // Reset filters and page when switching tabs
    setTableSearch('');
    setSelectedFilterCategory('ALL');
    setCurrentPage(1);
  }, [activeTab]);

  const currentDetails = methodData[activeTab];

  // Filtered and Sorted Table Data
  const filteredItems = useMemo(() => {
    if (!currentDetails?.items) return [];
    let items = [...currentDetails.items];

    // Category filter
    if (selectedFilterCategory !== 'ALL') {
      items = items.filter((item) => item.class_code === selectedFilterCategory);
    }

    // Search query
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.part_id.toLowerCase().includes(q) ||
          item.part_name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      );
    }

    // Sort
    items.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return items;
  }, [currentDetails, selectedFilterCategory, tableSearch, sortField, sortAsc]);

  // Paginated items
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending
    }
  };

  if (globalLoading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Computing Stock Sentry Multi-Parameter Inventory Classifications...</p>
        <span className="text-xs text-slate-400">Evaluating 7 Selective Control Frameworks</span>
      </div>
    );
  }

  const totalPartsCount = currentDetails?.total_parts || summary?.total_parts || 0;
  const totalSpendInr = currentDetails?.total_annual_spend_inr || summary?.total_annual_spend_inr || 0;

  return (
    <div className="space-y-6">
      {/* Page Title & Top Metric Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              STOCK SENTRY — Multi-Parameter Selective Inventory Control
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
              7 Control Techniques
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Individual evaluation of ABC, SDE, VED, HML, SOS, GOLF, and FSN techniques for railway rolling stock — Team TRACKBYTE.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-xs font-mono px-3 py-1.5 bg-white text-slate-700 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
            <Boxes className="w-3.5 h-3.5 text-sky-600" />
            <span>Total Analyzed: <strong className="text-slate-900 font-bold">{totalPartsCount} SKUs</strong></span>
          </div>
          <div className="text-xs font-mono px-3 py-1.5 bg-white text-slate-700 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total Spend: <strong className="text-slate-900 font-bold">₹{totalSpendInr.toLocaleString()}</strong></span>
          </div>
        </div>
      </div>

      {/* Global Error Alert (if any) */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadSummaryAndInitialTab}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs transition"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-1.5 border-b border-slate-200 overflow-x-auto pb-1 text-xs">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2.5 rounded-t-lg font-medium whitespace-nowrap transition-all border-b-2 flex flex-col items-start ${
                isActive
                  ? 'border-sky-600 text-sky-700 bg-white font-bold shadow-sm'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${isActive ? 'bg-sky-100 text-sky-800 font-bold' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.badge}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal mt-0.5">{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {loadingMethod ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading {activeTab.toUpperCase()} classification details...</p>
        </div>
      ) : !currentDetails ? (
        <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200 p-8">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="font-semibold text-slate-700 text-sm">No classification data available for {activeTab.toUpperCase()}.</p>
          <button
            onClick={() => setActiveTab(activeTab)}
            className="mt-3 px-4 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold"
          >
            Reload Tab Data
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Method Context Banner */}
          <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-sm flex flex-wrap justify-between items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  {currentDetails.title}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  {currentDetails.distribution?.length || 0} Tiers
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-4xl">
                {activeTab === 'abc' && 'Analyzes annual consumption expenditure (Annual Usage × Unit Price). Identifies Class A high-spend items requiring continuous strict inventory surveillance.'}
                {activeTab === 'sde' && 'Evaluates procurement availability and supplier scarcity. Identifies single-source, imported, or high lead-time components requiring strategic buffers.'}
                {activeTab === 'ved' && 'Measures train operating criticality and safety hazard consequences. Vital parts cause immediate rolling stock or traction shutdown if unstocked.'}
                {activeTab === 'hml' && 'Classifies inventory based on individual unit purchase cost into High (>= ₹25,000), Medium (₹5,000 - ₹25,000), and Low (< ₹5,000) capital exposure tiers.'}
                {activeTab === 'sos' && 'Examines monthly operational store issue variance across the 12-month calendar. Tracks weather-induced surges (monsoon, fog, summer air conditioning).'}
                {activeTab === 'golf' && 'Delineates vendor procurement origin: Government/PSU undertakings, open-market competitive tenders (IREPS), local zonal depots, and foreign OEM imports.'}
                {activeTab === 'fsn' && 'Classifies items by store turnover frequency: Fast-moving (>12 issues/yr), Slow-moving (2-12 issues/yr), and Non-moving/dormant dead-stock (0-1 issue/yr).'}
              </p>
            </div>
            <div className="text-right text-xs">
              <span className="text-slate-400 block text-[10px] uppercase">Classified SKUs</span>
              <span className="font-mono text-lg font-bold text-white">{currentDetails.total_parts}</span>
            </div>
          </div>

          {/* KPI CARDS: Category Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {currentDetails.distribution?.map((cat: any) => (
              <div
                key={cat.category}
                onClick={() => setSelectedFilterCategory(selectedFilterCategory === cat.category ? 'ALL' : cat.category)}
                className={`p-4 rounded-xl border transition-all cursor-pointer shadow-sm flex flex-col justify-between ${
                  selectedFilterCategory === cat.category
                    ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-400/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-bold font-mono text-white"
                      style={{ backgroundColor: cat.color || '#2563eb' }}
                    >
                      {cat.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {cat.percentage_items}% of SKUs
                    </span>
                  </div>

                  <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                    {cat.count} <span className="text-xs font-normal text-slate-500">parts</span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2" title={cat.description}>
                    {cat.description}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Spend: ₹{cat.total_spend_inr?.toLocaleString()}</span>
                  <span className="font-bold text-sky-700">({cat.spend_share_pct}%)</span>
                </div>
              </div>
            ))}
          </div>

          {/* --- CHARTS SECTION --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* SPECIALIZED CHART FOR ABC: PARETO COMPOSED CHART */}
            {activeTab === 'abc' ? (
              <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-sky-600" />
                      ABC Pareto Cumulative Expenditure Curve (Lorenz Curve)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Ranked SKUs vs Cumulative Expenditure % with 70% (Class A) & 90% (Class B) thresholds.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-bold">
                      Class A: ~70%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                      Class B: Next ~20%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Class C: Remainder
                    </span>
                  </div>
                </div>

                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={currentDetails.pareto_curve || []}
                      margin={{ top: 15, right: 30, left: 10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="rank"
                        label={{ value: 'SKU Expenditure Rank (Top to Bottom)', position: 'insideBottom', offset: -15, fontSize: 11 }}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        yAxisId="left"
                        label={{ value: 'Annual Spend (₹ Thousands)', angle: -90, position: 'insideLeft', offset: 0, fontSize: 11 }}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        unit="%"
                        domain={[0, 100]}
                        label={{ value: 'Cumulative Spend %', angle: 90, position: 'insideRight', offset: 10, fontSize: 11 }}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1">
                                <span className="font-mono text-sky-400 font-bold block">
                                  Rank #{data.rank}: {data.part_id}
                                </span>
                                <span className="font-medium text-slate-200 block">{data.part_name}</span>
                                <div className="text-slate-300 pt-1 border-t border-slate-800 space-y-0.5 font-mono text-[11px]">
                                  <div>Annual Spend: <strong>₹{data.annual_spend?.toLocaleString()}</strong></div>
                                  <div>Cumulative Spend: <strong>{data.spend_cumulative_pct}%</strong></div>
                                  <div>Class: <strong className="text-sky-300">Class {data.abc_class}</strong></div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                      <ReferenceLine yAxisId="right" y={70} stroke="#dc2626" strokeDasharray="4 4" label={{ value: '70% A Cutoff', fill: '#dc2626', fontSize: 10, position: 'left' }} />
                      <ReferenceLine yAxisId="right" y={90} stroke="#d97706" strokeDasharray="4 4" label={{ value: '90% B Cutoff', fill: '#d97706', fontSize: 10, position: 'left' }} />
                      
                      <Bar yAxisId="left" dataKey="spend_in_thousands" name="Annual Spend (₹k)" fill="#94a3b8" radius={[3, 3, 0, 0]} opacity={0.7} />
                      <Line yAxisId="right" type="monotone" dataKey="spend_cumulative_pct" name="Cumulative Spend %" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : activeTab === 'sos' ? (
              /* SPECIALIZED CHART FOR SOS: 12-MONTH CONSUMPTION TREND */
              <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      12-Month Rolling Stock Demand & Issue Seasonality
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Store issue variance showing operational peaks in Pre-Monsoon (May/Jun) and Winter Fog (Dec).
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-purple-700 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
                    <span>Peak Months: May, Jun, Dec</span>
                  </div>
                </div>

                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={currentDetails.monthly_aggregate || []}
                      margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month_name" tick={{ fontSize: 11 }} />
                      <YAxis label={{ value: 'Units Issued / Demanded', angle: -90, position: 'insideLeft', fontSize: 11 }} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="total_issues" name="Store Issues (Units)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="total_demand" name="Operational Demand (Units)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              /* STANDARD CATEGORY DISTRIBUTION BAR CHART FOR SDE, VED, HML, GOLF, FSN */
              <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-sky-600" />
                      {currentDetails.title} — Category Breakdown
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Comparison of part counts and financial volume across classification categories.
                    </p>
                  </div>
                </div>

                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={currentDetails.distribution || []}
                      margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" label={{ value: 'SKU Count', angle: -90, position: 'insideLeft', fontSize: 11 }} tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" unit="%" label={{ value: 'Share of SKUs %', angle: 90, position: 'insideRight', fontSize: 11 }} tick={{ fontSize: 10 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1">
                                <span className="font-bold text-sky-400">{data.name}</span>
                                <div className="text-slate-300 font-mono text-[11px]">
                                  <div>Count: <strong>{data.count} parts ({data.percentage_items}%)</strong></div>
                                  <div>Total Spend: <strong>₹{data.total_spend_inr?.toLocaleString()} ({data.spend_share_pct}%)</strong></div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">{data.description}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                      <Bar yAxisId="left" dataKey="count" name="Part Count">
                        {currentDetails.distribution?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#2563eb'} />
                        ))}
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="percentage_items" name="Item Share %" stroke="#0f172a" strokeWidth={2} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* RIGHT SIDE: SPEND & PORTFOLIO COMPOSITION PIE / HORIZONTAL BARS */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  Portfolio Capital Allocation
                </h3>
                <p className="text-[11px] text-slate-500">
                  Annual expenditure share across classification tiers.
                </p>
              </div>

              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={currentDetails.distribution || []}
                      dataKey="total_spend_inr"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {currentDetails.distribution?.map((entry: any, index: number) => (
                        <Cell key={`pie-cell-${index}`} fill={entry.color || '#2563eb'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any, item: any) => [
                        `₹${Number(value).toLocaleString()} (${item.payload.spend_share_pct}%)`,
                        item.payload.name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                {currentDetails.distribution?.map((cat: any) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-slate-700 truncate">{cat.name}</span>
                    </div>
                    <span className="font-mono text-slate-900 font-bold flex-shrink-0">
                      {cat.spend_share_pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* --- DATA TABLE: ALL ACTUAL SKUs WITH SEARCH, FILTER, SORT & PAGINATION --- */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-600" />
                  Classified Inventory Records ({filteredItems.length} SKUs)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Actual spare-part records evaluated according to {activeTab.toUpperCase()} selective control criteria.
                </p>
              </div>

              {/* Search and Category Filter */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by Part ID, Name..."
                    value={tableSearch}
                    onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Filter Buttons */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    onClick={() => { setSelectedFilterCategory('ALL'); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded font-medium transition ${
                      selectedFilterCategory === 'ALL' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
                    }`}
                  >
                    All ({currentDetails.items?.length || 0})
                  </button>
                  {currentDetails.distribution?.map((d: any) => (
                    <button
                      key={d.category}
                      onClick={() => { setSelectedFilterCategory(d.category); setCurrentPage(1); }}
                      className={`px-2.5 py-1 rounded font-medium transition ${
                        selectedFilterCategory === d.category ? 'bg-white shadow text-sky-700 font-bold' : 'text-slate-600'
                      }`}
                    >
                      {d.category} ({d.count})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('rank')}>
                      <div className="flex items-center gap-1">
                        Rank
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('part_id')}>
                      <div className="flex items-center gap-1">
                        Part ID & Name
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3">Subsystem</th>
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('annual_usage_units')}>
                      <div className="flex items-center justify-end gap-1">
                        Annual Usage
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('unit_price_inr')}>
                      <div className="flex items-center justify-end gap-1">
                        Unit Price (₹)
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('annual_consumption_value_inr')}>
                      <div className="flex items-center justify-end gap-1">
                        Annual Spend (₹)
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    {activeTab === 'abc' && (
                      <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('cumulative_expenditure_pct')}>
                        <div className="flex items-center justify-end gap-1">
                          Cum. Spend %
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                    )}
                    <th className="py-2.5 px-3 text-center">Class Tier</th>
                    <th className="py-2.5 px-3">Provenance / Rationale</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400">
                        No spare parts match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item: any) => (
                      <tr
                        key={item.part_id}
                        onClick={() => onSelectPart && onSelectPart(item.part_id)}
                        className="hover:bg-sky-50/60 cursor-pointer transition"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-500">
                          #{item.rank || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-sky-700 font-bold block">{item.part_id}</span>
                          <span className="text-[11px] text-slate-800 font-medium">{item.part_name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{item.category}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{item.annual_usage_units}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{item.unit_price_inr?.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{item.annual_consumption_value_inr?.toLocaleString()}
                        </td>
                        {activeTab === 'abc' && (
                          <td className="py-2.5 px-3 text-right font-mono text-sky-700 font-bold">
                            {item.cumulative_expenditure_pct}%
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className="px-2.5 py-0.5 rounded text-xs font-mono font-bold text-white shadow-xs"
                            style={{
                              backgroundColor:
                                item.class_code === 'A' || item.class_code === 'V'
                                  ? '#dc2626'
                                  : item.class_code === 'B' || item.class_code === 'S' || item.class_code === 'H'
                                  ? '#2563eb'
                                  : item.class_code === 'E' || item.class_code === 'F'
                                  ? '#16a34a'
                                  : item.class_code === 'G'
                                  ? '#1d4ed8'
                                  : item.class_code === 'OS'
                                  ? '#0284c7'
                                  : '#64748b'
                            }}
                          >
                            {item.class_label || item.class_code}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600 max-w-xs truncate" title={item.reason}>
                          {item.reason}
                        </td>
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectPart && onSelectPart(item.part_id)}
                            title="Inspect in Inventory Explorer"
                            className="p-1 rounded text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-600">
              <div>
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length} spare parts
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-mono font-medium">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
