import React from 'react';
import {
  LayoutDashboard,
  Box,
  Layers,
  BarChart3,
  Activity,
  Sparkles,
  CalendarDays,
  FlaskConical,
  TrainTrack,
  Truck,
  Database,
  BookOpen,
  ChevronRight
} from 'lucide-react';

export type NavTab = 
  | 'dashboard'
  | 'music3d'
  | 'inventory'
  | 'classifications'
  | 'stock-health'
  | 'recommendations'
  | 'block-planning'
  | 'simulation'
  | 'assets'
  | 'suppliers'
  | 'data-management'
  | 'methodology';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  recommendationsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, recommendationsCount = 0 }) => {
  const navItems = [
    { id: 'dashboard', label: 'Executive Overview', icon: LayoutDashboard, tag: 'KPI' },
    { id: 'music3d', label: 'MUSIC-3D Model (27)', icon: Box, tag: 'Core', highlight: true },
    { id: 'inventory', label: 'Spare-Part Inventory', icon: Layers, tag: '200 SKUs' },
    { id: 'classifications', label: 'Multi-Classification', icon: BarChart3, tag: '7 Methods' },
    { id: 'stock-health', label: 'Stock Health & Risk', icon: Activity, tag: 'Monte Carlo' },
    { id: 'recommendations', label: 'AI Recommendations', icon: Sparkles, badge: recommendationsCount },
    { id: 'block-planning', label: 'Indicative Block Plan', icon: CalendarDays, tag: 'Maintenance' },
    { id: 'simulation', label: 'Simulation Studio', icon: FlaskConical, tag: 'Lab' },
    { id: 'assets', label: 'Assets & Systems BOM', icon: TrainTrack },
    { id: 'suppliers', label: 'Suppliers (GOLF)', icon: Truck },
    { id: 'data-management', label: 'Data Management', icon: Database, tag: 'Excel/CSV' },
    { id: 'methodology', label: 'Methodology & Viva', icon: BookOpen, tag: 'LSCM Guide' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col flex-shrink-0 min-h-screen">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-400 tracking-wider uppercase">
        <span>Navigation Menu</span>
        <span className="text-[10px] text-blue-400 font-mono">v1.0-IR</span>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as NavTab)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400 group-hover:text-blue-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center space-x-1.5 flex-shrink-0">
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive ? 'bg-white text-blue-700' : 'bg-red-500 text-white animate-pulse'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {item.tag && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    isActive 
                      ? 'bg-blue-700 text-blue-100' 
                      : item.highlight
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      : 'bg-slate-800 text-slate-400 group-hover:text-slate-300'
                  }`}>
                    {item.tag}
                  </span>
                )}
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? 'text-white translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'}`} />
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 space-y-1">
        <div className="font-semibold text-slate-300 flex items-center justify-between">
          <span>LSCM Course Project</span>
          <span className="text-emerald-400 font-mono">● Active</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          MUSIC-3D Model (ABC × SDE × VED) with 27 Service Level & Z-Score Mappings.
        </p>
      </div>
    </aside>
  );
};
