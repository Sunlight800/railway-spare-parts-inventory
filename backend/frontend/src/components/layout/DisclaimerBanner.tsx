import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
        <span>
          <strong>Academic Decision-Support Prototype:</strong> Indicative maintenance block plans and AI inventory suggestions do not constitute official Indian Railways traffic-safe block permissions. Real operational possession mandates formal Operating Department & Power Controller approvals.
        </span>
      </div>
      <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-200 text-amber-900">
        LSCM Viva Model
      </span>
    </div>
  );
};
