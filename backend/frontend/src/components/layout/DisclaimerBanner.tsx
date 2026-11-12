import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0" />
        <span>
          <strong>STOCK SENTRY Academic Decision-Support System:</strong> Indicative block plans and heuristic stock recommendations provide engineering decision support. They do not constitute official railway operational traffic possessions. Real-world block execution mandates formal Operating Department and Power Controller sign-offs.
        </span>
      </div>
      <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-200 text-amber-950">
        Team TRACKBYTE
      </span>
    </div>
  );
};
