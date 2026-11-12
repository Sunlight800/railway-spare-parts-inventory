import React, { useEffect, useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { ClassificationSummary } from '../types';

interface ClassificationAnalysisProps {
  onSelectPart?: (partId: string) => void;
}

export const ClassificationAnalysis: React.FC<ClassificationAnalysisProps> = ({ onSelectPart }) => {
  const [activeTab, setActiveTab] = useState<'abc' | 'sde' | 'ved' | 'hml' | 'sos' | 'golf' | 'fsn' | 'matrix'>('abc');
  const [summary, setSummary] = useState<ClassificationSummary | null>(null);
  const [abcPareto, setAbcPareto] = useState<any>(null);
  const [sosData, setSosData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      api.getClassificationSummary(),
      api.getAbcAnalysis(),
      api.getSosAnalysis()
    ])
      .then(([sumRes, abcRes, sosRes]) => {
        setSummary(sumRes);
        setAbcPareto(abcRes);
        setSosData(sosRes);
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
        <p className="text-sm font-medium">Computing Multi-Parameter Inventory Classifications...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'abc', label: '1. ABC Analysis', desc: 'Annual Spend Value' },
    { id: 'sde', label: '2. SDE Analysis', desc: 'Procurement Sourcing' },
    { id: 'ved', label: '3. VED Analysis', desc: 'Safety Criticality' },
    { id: 'hml', label: '4. HML Analysis', desc: 'Unit Cost Tiers' },
    { id: 'sos', label: '5. SOS Analysis', desc: 'Monthly Seasonality' },
    { id: 'golf', label: '6. GOLF Analysis', desc: 'Procurement Channel' },
    { id: 'fsn', label: '7. FSN Analysis', desc: 'Store Turnover Rate' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            STOCK SENTRY — Multi-Parameter Selective Inventory Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Individual evaluation of ABC, SDE, VED, HML, SOS, GOLF, and FSN techniques for railway rolling stock — Team TRACKBYTE.
          </p>
        </div>

        <span className="text-xs font-mono px-3 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
          Total Analyzed: <strong>{summary?.total_parts} SKUs</strong>
        </span>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-1.5 border-b border-slate-200 overflow-x-auto pb-1 text-xs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-t-lg font-medium whitespace-nowrap transition-all border-b-2 flex flex-col items-start ${
                isActive
                  ? 'border-blue-600 text-blue-700 bg-white font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] text-slate-400 font-normal">{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ABC ANALYSIS */}
      {activeTab === 'abc' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  ABC Analysis: Cumulative Expenditure Pareto Curve
                </h2>
                <p className="text-xs text-slate-500">
                  A: ~70% cumulative expenditure, B: next 20% (up to 90%), C: remaining 10%.
                </p>
              </div>
              <div className="text-xs font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                Total Spend: ₹{summary?.total_annual_spend_inr?.toLocaleString()}
              </div>
            </div>

            {/* Pareto Line Chart */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={abcPareto?.pareto_curve || []} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="item_cumulative_pct" unit="%" label={{ value: 'Cumulative % of Spare Part Items', position: 'insideBottom', offset: -10, fontSize: 11 }} tick={{ fontSize: 11 }} />
                  <YAxis unit="%" label={{ value: 'Cumulative % of Spend', angle: -90, position: 'insideLeft', fontSize: 11 }} domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="spend_cumulative_pct" name="Cumulative Expenditure % (Lorenz Curve)" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 3 Categories Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
                <span className="text-xs font-bold text-blue-900 uppercase">Class A (Tight Control)</span>
                <div className="text-2xl font-bold font-mono text-blue-900">{abcPareto?.summary?.A?.count} parts</div>
                <div className="text-xs text-blue-700">
                  {abcPareto?.summary?.A?.item_share_pct}% of SKUs account for <strong>{abcPareto?.summary?.A?.spend_share_pct}%</strong> of spend (₹{abcPareto?.summary?.A?.spend_inr?.toLocaleString()})
                </div>
                <p className="text-[11px] text-slate-500 pt-1">Strategy: Continuous monitoring, low safety buffer, frequent replenishment.</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                <span className="text-xs font-bold text-emerald-900 uppercase">Class B (Moderate Control)</span>
                <div className="text-2xl font-bold font-mono text-emerald-900">{abcPareto?.summary?.B?.count} parts</div>
                <div className="text-xs text-emerald-700">
                  {abcPareto?.summary?.B?.item_share_pct}% of SKUs account for <strong>{abcPareto?.summary?.B?.spend_share_pct}%</strong> of spend (₹{abcPareto?.summary?.B?.spend_inr?.toLocaleString()})
                </div>
                <p className="text-[11px] text-slate-500 pt-1">Strategy: Periodic review (monthly/quarterly), moderate safety stock.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-xs font-bold text-slate-800 uppercase">Class C (Loose Control)</span>
                <div className="text-2xl font-bold font-mono text-slate-900">{abcPareto?.summary?.C?.count} parts</div>
                <div className="text-xs text-slate-600">
                  {abcPareto?.summary?.C?.item_share_pct}% of SKUs account for <strong>{abcPareto?.summary?.C?.spend_share_pct}%</strong> of spend (₹{abcPareto?.summary?.C?.spend_inr?.toLocaleString()})
                </div>
                <p className="text-[11px] text-slate-500 pt-1">Strategy: Bulk annual orders, generous safety buffers, low administrative cost.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SDE ANALYSIS */}
      {activeTab === 'sde' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              SDE Analysis: Procurement Availability & Supply Difficulty
            </h2>
            <p className="text-xs text-slate-500">
              Evaluates alternate vendor ecosystems, specialized manufacturing, and lead-time constraints.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {summary?.sde.map((s) => (
              <div key={s.category} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                    s.category === 'S' ? 'bg-purple-600 text-white' : s.category === 'D' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {s.category === 'S' ? 'S - Scarce' : s.category === 'D' ? 'D - Difficult' : 'E - Easily Available'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">{s.percentage_items}%</span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">{s.count} parts</div>
                <p className="text-xs text-slate-600">
                  {s.category === 'S'
                    ? 'Single authorized source, imported dependency, or long specialized manufacturing cycles.'
                    : s.category === 'D'
                    ? 'Limited approved railway vendors or moderate delivery lead-time variability.'
                    : 'Readily available from multiple open market or zonal depot stockists.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: VED ANALYSIS */}
      {activeTab === 'ved' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              VED Analysis: Rolling Stock Operational Criticality
            </h2>
            <p className="text-xs text-slate-500">
              Assesses the consequence of stockout on train safety and passenger/freight mainline movement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {summary?.ved.map((v) => (
              <div key={v.category} className={`p-4 rounded-xl border space-y-1.5 ${
                v.category === 'V' ? 'bg-red-50/50 border-red-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                    v.category === 'V' ? 'bg-red-600 text-white' : v.category === 'E' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white'
                  }`}>
                    {v.category === 'V' ? 'V - Vital' : v.category === 'E' ? 'E - Essential' : 'D - Desirable'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">{v.percentage_items}%</span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">{v.count} parts</div>
                <p className="text-xs text-slate-600">
                  {v.category === 'V'
                    ? 'Absence directly breaches railway safety regulations or causes unscheduled mainline train stoppage.'
                    : v.category === 'E'
                    ? 'Causes operational degradation; temporary secondary buffer or scheduled substitution possible.'
                    : 'Aesthetic, interior trim, or auxiliary comfort component with negligible operational impact.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: HML ANALYSIS */}
      {activeTab === 'hml' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              HML Analysis: Unit Price Tiers
            </h2>
            <p className="text-xs text-slate-500">
              Categorizes items by purchase price (H: &ge; ₹25,000, M: ₹5,000 - ₹25,000, L: &lt; ₹5,000).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {summary?.hml.map((h) => (
              <div key={h.category} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold px-2 py-0.5 rounded font-mono bg-slate-800 text-white">
                    {h.category === 'H' ? 'H - High Cost' : h.category === 'M' ? 'M - Medium Cost' : 'L - Low Cost'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">{h.percentage_items}%</span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">{h.count} parts</div>
                <div className="text-xs text-slate-600">Held Value: ₹{h.total_spend_inr.toLocaleString()}</div>
                <p className="text-[11px] text-slate-500">
                  {h.category === 'H'
                    ? 'High capital risk. Requires stringent delegated financial authority & purchase approval.'
                    : h.category === 'M'
                    ? 'Standard rolling stock subsystem modules with standard divisional store purchase powers.'
                    : 'Low monetary risk. Low-value hardware, washers, pins, and seals.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SOS ANALYSIS */}
      {activeTab === 'sos' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                SOS Analysis: Seasonality & Operational Peak Demand
              </h2>
              <p className="text-xs text-slate-500">
                12-Month aggregate railway rolling stock store issue trends (Winter Fog, Pre-Monsoon, Summer HVAC).
              </p>
            </div>
            <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200">
              Seasonal Spares: {sosData?.counts?.S?.count || 0}
            </span>
          </div>

          {/* Month-wise consumption bar chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sosData?.monthly_aggregate || []} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month_name" tick={{ fontSize: 11 }} />
                <YAxis label={{ value: 'Total Issue Units', angle: -90, position: 'insideLeft', fontSize: 11 }} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="total_issues" name="Store Issues (Units)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total_demand" name="Operational Demand (Units)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 6: GOLF ANALYSIS */}
      {activeTab === 'golf' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              GOLF Analysis: Sourcing Origin & Procurement Channel
            </h2>
            <p className="text-xs text-slate-500">
              Government PSU vs Open Market vs Local Depot vs Foreign Import dependencies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {summary?.golf.map((g) => (
              <div key={g.category} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold px-2 py-0.5 rounded font-mono bg-slate-800 text-white">
                    {g.category === 'G' ? 'G - PSU / Govt' : g.category === 'O' ? 'O - Open Market' : g.category === 'L' ? 'L - Local Depot' : 'F - Foreign Import'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">{g.percentage_items}%</span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">{g.count} parts</div>
                <p className="text-[11px] text-slate-600">
                  {g.category === 'G'
                    ? 'Supplied by public sector undertakings like SAIL or BHEL.'
                    : g.category === 'O'
                    ? 'Competitively procured through Indian Railways IREPS e-tendering system.'
                    : g.category === 'L'
                    ? 'Fabricated or overhauled in zonal railway mechanical workshops.'
                    : 'Imported specialized OEM assemblies subject to customs and maritime freight lead times.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: FSN ANALYSIS */}
      {activeTab === 'fsn' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              FSN Analysis: Store Turnover & Dead-Stock Surveillance
            </h2>
            <p className="text-xs text-slate-500">
              Classifies parts by movement velocity (F: Fast Moving &gt;12 issues/yr, S: Slow Moving, N: Dormant &le;1 issue).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {summary?.fsn.map((f) => (
              <div key={f.category} className={`p-4 rounded-xl border space-y-1.5 ${
                f.category === 'N' ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                    f.category === 'F' ? 'bg-emerald-600 text-white' : f.category === 'S' ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
                  }`}>
                    {f.category === 'F' ? 'F - Fast Moving' : f.category === 'S' ? 'S - Slow Moving' : 'N - Non-Moving (Dormant)'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">{f.percentage_items}%</span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">{f.count} parts</div>
                <p className="text-xs text-slate-600">
                  {f.category === 'F'
                    ? 'High turnover store item. Frequent monthly issuances across maintenance sheds.'
                    : f.category === 'S'
                    ? 'Moderate scheduled overhaul parts with periodic periodic replacement intervals.'
                    : 'Candidate for technical survey committee dead-stock audit or inter-zonal reallocation.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
