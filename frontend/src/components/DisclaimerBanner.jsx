import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="bg-slate-900 text-slate-300 text-[11px] px-4 py-1.5 border-b border-slate-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="font-bold text-teal-300 uppercase tracking-wider text-[10px]">
            Operational Field Environment:
          </span>
          <span className="text-slate-300">
            PS-H02 Unified Community Health Architecture • Single-visit capture with automated downstream normalization
          </span>
        </div>
        <div className="text-[10px] text-slate-400 hidden md:block">
          Synthetic Data Mode • Zero Duplicate Entry Architecture
        </div>
      </div>
    </div>
  );
}
