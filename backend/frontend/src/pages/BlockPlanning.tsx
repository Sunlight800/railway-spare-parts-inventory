import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Train,
  Layers,
  Wrench,
  ChevronRight,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { WorkPackage } from '../types';

export const BlockPlanning: React.FC = () => {
  const [packages, setPackages] = useState<WorkPackage[]>([]);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPackage, setSelectedPackage] = useState<WorkPackage | null>(null);
  const [rescheduling, setRescheduling] = useState<boolean>(false);
  const [newDateInput, setNewDateInput] = useState<string>('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getWorkPackages(),
      api.getBlockCalendar()
    ])
      .then(([pkgs, cal]) => {
        setPackages(pkgs);
        setCalendarData(cal);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReschedule = async () => {
    if (!selectedPackage || !newDateInput) return;
    try {
      setRescheduling(true);
      await api.rescheduleWorkPackage({
        work_package_id: selectedPackage.work_package_id,
        new_date: new Date(newDateInput).toISOString()
      });
      loadData();
      setSelectedPackage(null);
      setNewDateInput('');
    } catch (err) {
      console.error(err);
      alert('Failed to reschedule package');
    } finally {
      setRescheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Evaluating BOM Bill-of-Materials Availability & Block Windows...</p>
      </div>
    );
  }

  const readyCount = packages.filter((p) => p.readiness_status === 'READY').length;
  const partialCount = packages.filter((p) => p.readiness_status === 'PARTIALLY_READY').length;
  const notReadyCount = packages.filter((p) => p.readiness_status === 'NOT_READY').length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Inventory-Led Indicative Maintenance Block Planning
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Decision Support
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Prioritizes rolling stock and track maintenance packages based on physical store material readiness and VED criticality.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold">READY: {readyCount}</span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold">PARTIAL: {partialCount}</span>
          <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-800 font-bold">NOT READY: {notReadyCount}</span>
        </div>
      </div>

      {/* Mandatory Disclaimer Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start space-x-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold block text-amber-950">
            Mandatory Operational Limitation (Academic Decision Support Only)
          </strong>
          <p className="leading-relaxed">
            The supplied dataset does not contain real-time railway timetables, live train movements, signalling interlocking states, or traction power-block approvals. Therefore, this module provides <strong>inventory-led decision support</strong> to prioritize maintenance work packages before formal operational requisition. No real-world railway block can be taken without authorized Operating Department & Power Controller possessions.
          </p>
        </div>
      </div>

      {/* Work Packages Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-blue-600" />
              Maintenance Work Packages & BOM Material Readiness
            </h2>
            <p className="text-xs text-slate-500">
              Evaluated against real-time physical store inventory on hand.
            </p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Package ID & Activity</th>
                <th className="py-2.5 px-3">Asset & Section</th>
                <th className="py-2.5 px-3 text-center">Material Status</th>
                <th className="py-2.5 px-3 text-right">Parts Ready</th>
                <th className="py-2.5 px-3 text-right">Priority Score</th>
                <th className="py-2.5 px-3 text-right">Duration</th>
                <th className="py-2.5 px-3 text-right">Scheduled Block</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {packages.map((pkg) => (
                <tr key={pkg.work_package_id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3">
                    <span className="font-mono text-blue-700 font-bold block">{pkg.work_package_id}</span>
                    <span className="text-slate-800 font-medium text-[11px] block">{pkg.title}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-slate-900 block">{pkg.asset_id}</span>
                    <span className="text-[11px] text-slate-500">{pkg.section}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      pkg.readiness_status === 'READY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : pkg.readiness_status === 'PARTIALLY_READY'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {pkg.readiness_status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">
                    {pkg.available_parts_count} / {pkg.total_required_parts} ({pkg.readiness_pct}%)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                    {pkg.priority_score} / 100
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    {pkg.estimated_duration_hours} hrs
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                    {pkg.scheduled_block_date ? new Date(pkg.scheduled_block_date).toLocaleDateString() : 'Pending'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setNewDateInput(pkg.scheduled_block_date ? pkg.scheduled_block_date.split('T')[0] : '');
                      }}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-medium transition"
                    >
                      BOM Shortages
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Indicative Block Windows Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-purple-600" />
            Indicative Divisional Block Windows Schedule
          </h2>
          <p className="text-xs text-slate-500">
            Assigned engineering maintenance windows with mapped material-ready work packages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {calendarData?.calendar_windows?.map((win: any) => (
            <div key={win.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{win.window_name}</span>
                  <span className="text-[11px] text-slate-500">{win.section}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                  {win.start_time} - {win.end_time}
                </span>
              </div>

              <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200 flex justify-between">
                <span>Date: <strong>{new Date(win.date).toLocaleDateString()}</strong></span>
                <span>Assigned: <strong>{win.assigned_packages?.length || 0} packages</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Package Detail & Shortages Drawer/Modal */}
      {selectedPackage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
              <div>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-600 text-white font-bold">
                  {selectedPackage.work_package_id}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{selectedPackage.title}</h3>
                <span className="text-xs text-slate-400">{selectedPackage.section}</span>
              </div>
              <button
                onClick={() => setSelectedPackage(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider mb-1">
                  Readiness Evaluation & Procurement Recommendation:
                </span>
                <p className="text-slate-700 leading-relaxed">{selectedPackage.recommendation}</p>
              </div>

              {/* Shortage Items */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Bill of Materials Shortages ({selectedPackage.shortage_count})
                </h4>

                {selectedPackage.shortage_items.length === 0 ? (
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    All required spare parts are in depot stock. Package is ready for block execution!
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-semibold">
                        <tr>
                          <th className="py-2 px-3">Part ID & Name</th>
                          <th className="py-2 px-3 text-right">Required</th>
                          <th className="py-2 px-3 text-right">Current Stock</th>
                          <th className="py-2 px-3 text-right">Shortfall</th>
                          <th className="py-2 px-3 text-right">Lead Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedPackage.shortage_items.map((item) => (
                          <tr key={item.part_id}>
                            <td className="py-2 px-3 font-mono font-bold text-blue-700">
                              {item.part_id} <span className="font-sans font-normal text-slate-700">({item.part_name})</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold">{item.required_quantity}</td>
                            <td className="py-2 px-3 text-right font-mono text-red-600 font-bold">{item.current_stock}</td>
                            <td className="py-2 px-3 text-right font-mono text-red-600 font-bold">-{item.shortfall}</td>
                            <td className="py-2 px-3 text-right font-mono">{item.lead_time_days} days</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Reschedule Date Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block uppercase tracking-wider">
                  Reallocate Indicative Block Window Slot
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={newDateInput}
                    onChange={(e) => setNewDateInput(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleReschedule}
                    disabled={rescheduling || !newDateInput}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
                  >
                    {rescheduling ? 'Reallocating...' : 'Update & Recheck Readiness'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedPackage(null)}
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
