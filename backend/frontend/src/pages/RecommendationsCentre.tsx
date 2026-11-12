import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  CheckCircle,
  HelpCircle,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { AIRecommendation } from '../types';

interface RecommendationsCentreProps {
  onSelectPart?: (partId: string) => void;
}

export const RecommendationsCentre: React.FC<RecommendationsCentreProps> = ({ onSelectPart }) => {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  useEffect(() => {
    api.getRecommendations()
      .then((res) => {
        setRecommendations(res.recommendations || []);
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
        <p className="text-sm font-medium">Synthesizing Explainable Decision Support Rules & Recommendations...</p>
      </div>
    );
  }

  const filtered = recommendations.filter((r) => {
    if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false;
    return true;
  });

  const criticalCount = recommendations.filter((r) => r.priority === 'CRITICAL').length;
  const highCount = recommendations.filter((r) => r.priority === 'HIGH').length;
  const mediumCount = recommendations.filter((r) => r.priority === 'MEDIUM').length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              STOCK SENTRY — Explainable Decision Rules & Heuristic Intelligence
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
              Deterministic Rules Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent, 100% explainable selective control heuristics detecting stockout deficits, capital tie-up, and supply vulnerabilities across catalogued SKUs.
          </p>
        </div>

        {/* Priority Filter Buttons */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setPriorityFilter('ALL')}
            className={`px-3 py-1 rounded font-medium transition ${priorityFilter === 'ALL' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'}`}
          >
            All ({recommendations.length})
          </button>
          <button
            onClick={() => setPriorityFilter('CRITICAL')}
            className={`px-3 py-1 rounded font-medium transition ${priorityFilter === 'CRITICAL' ? 'bg-red-600 text-white font-bold' : 'text-red-700'}`}
          >
            Critical ({criticalCount})
          </button>
          <button
            onClick={() => setPriorityFilter('HIGH')}
            className={`px-3 py-1 rounded font-medium transition ${priorityFilter === 'HIGH' ? 'bg-amber-600 text-white font-bold' : 'text-amber-700'}`}
          >
            High ({highCount})
          </button>
          <button
            onClick={() => setPriorityFilter('MEDIUM')}
            className={`px-3 py-1 rounded font-medium transition ${priorityFilter === 'MEDIUM' ? 'bg-blue-600 text-white font-bold' : 'text-blue-700'}`}
          >
            Medium ({mediumCount})
          </button>
        </div>
      </div>

      {/* Heuristic Transparency Callout */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-sky-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-sky-400" />
            Heuristic Rule Architecture ({recommendations.length} Active Dynamic Alerts)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">100% Explainable • Deterministic LSCM</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Alerts are computed dynamically across all 200 catalogued items using 6 deterministic operational rules:
          <strong className="text-white"> (1) Vital Zero Stock</strong> (immediate line halt risk),
          <strong className="text-white"> (2) ASV Deficit</strong> (high-spend scarce vital parts below safety threshold),
          <strong className="text-white"> (3) Scarce Long Lead Time</strong> (procurement delay vulnerability),
          <strong className="text-white"> (4) High-Value Overstock</strong> (Class A capital tie-up),
          <strong className="text-white"> (5) Dormant Dead Stock</strong> (non-moving obsolescence risk), and
          <strong className="text-white"> (6) Seasonal Surge Buffer</strong> (monsoon/fog pre-season buffers).
        </p>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="space-y-3.5">
        {filtered.map((rec, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-xl border p-5 shadow-sm space-y-3 transition-all ${
              rec.priority === 'CRITICAL'
                ? 'border-red-300 bg-red-50/10 hover:border-red-400'
                : rec.priority === 'HIGH'
                ? 'border-amber-300 bg-amber-50/10 hover:border-amber-400'
                : 'border-slate-200 hover:border-blue-400'
            }`}
          >
            {/* Header: Priority, Part ID, Title */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center space-x-3">
                <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono uppercase tracking-wider ${
                  rec.priority === 'CRITICAL'
                    ? 'bg-red-600 text-white animate-pulse'
                    : rec.priority === 'HIGH'
                    ? 'bg-amber-500 text-white'
                    : 'bg-blue-600 text-white'
                }`}>
                  {rec.priority} PRIORITY
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">{rec.part_id}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-semibold text-slate-700">{rec.part_name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {rec.music3d_code}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">{rec.title}</h3>
                </div>
              </div>

              {onSelectPart && (
                <button
                  onClick={() => onSelectPart(rec.part_id)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-50 transition"
                >
                  View Part Profile <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Evidence & Numbers */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
              <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider">
                Evidence & Real-Time Calculation:
              </span>
              <p className="leading-relaxed font-mono text-[11px]">{rec.evidence}</p>
            </div>

            {/* Suggested Action & Rationale */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 space-y-1">
                <strong className="text-blue-900 block text-[11px] uppercase tracking-wider">
                  Recommended Action:
                </strong>
                <p className="text-blue-800 leading-relaxed font-medium">{rec.suggested_action}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-800 block text-[11px] uppercase tracking-wider">
                  Underlying LSCM Rationale:
                </strong>
                <p className="text-slate-600 leading-relaxed">{rec.rationale}</p>
              </div>
            </div>

            {/* Footer Metadata & Policy Provenance */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <div className="flex items-center gap-3">
                <span>Confidence: <strong className="text-slate-800 font-mono">{(rec.confidence * 100).toFixed(0)}%</strong></span>
                <span>•</span>
                <span>Policy Trigger: <strong className="text-slate-800">{rec.data_source_flag}</strong></span>
              </div>

              {rec.requires_approval && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                  Requires Competent Authority Signoff
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
