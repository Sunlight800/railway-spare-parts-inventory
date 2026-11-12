import React, { useState } from 'react';
import { RefreshCw, ShieldCheck, Database } from 'lucide-react';
import { api } from '../../services/api';
import { StockSentryLogo } from './StockSentryLogo';

interface HeaderProps {
  onRefresh?: () => void;
  datasetMode?: string;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, datasetMode = 'Synthetic Demo (200 SKUs)' }) => {
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      await api.resetDemoData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to reset demo data');
    } finally {
      setResetting(false);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="px-4 py-2 flex items-center justify-between">
        {/* Left: Stock Sentry Branding by Team TrackByte */}
        <div className="flex items-center space-x-3">
          <StockSentryLogo showText={true} size={38} />
        </div>

        {/* Right Controls & Dataset Status */}
        <div className="flex items-center space-x-3">
          {/* Dataset Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800/90 border border-slate-700 text-xs">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Dataset:</span>
            <span className="font-medium text-emerald-400">{datasetMode}</span>
          </div>

          {/* Academic Prototype Badge */}
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">TrackByte Intelligence</span>
          </div>

          {/* Reset Demo Button */}
          <button
            onClick={handleResetDemo}
            disabled={resetting}
            title="Reset database to 200 synthetic spare parts benchmark"
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition shadow-sm border border-sky-400 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{resetSuccess ? 'Reset Done!' : 'Reset Demo'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
