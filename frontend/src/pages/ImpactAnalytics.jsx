import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Zap, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Info, 
  FileText, 
  Sparkles,
  Layers
} from 'lucide-react';
import { getAnalytics } from '../services/api';

export default function ImpactAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-sm">
          Prototype Impact Measurement
        </span>
        <h2 className="text-2xl font-black text-slate-900 mt-1">From Repeated Entry to OneCapture</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Quantitative prototype comparison between separate manual register entry and the automated OneCapture mapping engine.
        </p>
      </div>

      {/* Before vs After Side-by-Side Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TRADITIONAL WORKFLOW CARD */}
        <div className="bg-rose-50/40 rounded-3xl p-6 border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-rose-200/60 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">BASELINE PARADIGM</span>
              <h3 className="text-base font-black text-slate-900">Traditional Multi-Register Workflow</h3>
            </div>
            <span className="text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full">
              High Redundancy
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-2.5 bg-white rounded-xl border border-rose-100 flex items-center justify-between">
              <span>Maternal Health Register (Form 1)</span>
              <span className="font-mono font-bold text-rose-800">9 manual fields</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-rose-100 flex items-center justify-between">
              <span>Child Immunisation Register (Form 2)</span>
              <span className="font-mono font-bold text-rose-800">7 manual fields</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-rose-100 flex items-center justify-between">
              <span>Household Census Register (Form 3)</span>
              <span className="font-mono font-bold text-rose-800">8 manual fields</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-rose-100 flex items-center justify-between">
              <span>Follow-up Tracking Book (Form 4)</span>
              <span className="font-mono font-bold text-rose-800">6 manual fields</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-rose-200 text-xs">
            <p className="font-bold text-rose-900">Redundant Duplication:</p>
            <p className="text-slate-600 text-[11px] mt-0.5">
              Household ID, Village, Visit Date, and Observations are repeatedly typed across all 4 separate physical registers (12+ duplicate entries).
            </p>
          </div>
        </div>

        {/* ONECAPTURE WORKFLOW CARD */}
        <div className="bg-teal-50/40 rounded-3xl p-6 border border-teal-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-teal-200/60 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">NEW PARADIGM</span>
              <h3 className="text-base font-black text-slate-900">ASHA OneCapture Workflow</h3>
            </div>
            <span className="text-xs font-bold text-teal-800 bg-teal-100 px-2.5 py-1 rounded-full">
              Automated Structuring
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-2.5 bg-white rounded-xl border border-teal-100 flex items-center justify-between">
              <span>1 Visit Encounter Captured Once</span>
              <span className="font-mono font-bold text-teal-800">1 single form</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-teal-100 flex items-center justify-between">
              <span>Automatic Normalization (Dates, Booleans)</span>
              <span className="font-mono font-bold text-teal-800">Instant</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-teal-100 flex items-center justify-between">
              <span>Deterministic Rule-Based Mapping Engine</span>
              <span className="font-mono font-bold text-teal-800">Transparent</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-teal-100 flex items-center justify-between">
              <span>Multiple Structured Programme Outputs</span>
              <span className="font-mono font-bold text-teal-800">4 Records</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-teal-200 text-xs">
            <p className="font-bold text-teal-900">Zero Redundant Re-entry:</p>
            <p className="text-slate-600 text-[11px] mt-0.5">
              Household parameters and encounter vitals are mapped automatically to each respective output format.
            </p>
          </div>
        </div>
      </div>

      {/* Calculated Prototype Metrics */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900">Calculated Prototype Metrics</h3>
          <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-sm">
            Prototype workflow measurement
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 block">Traditional Total Actions</span>
            <span className="text-2xl font-black text-slate-900">{analytics?.total_traditional_actions || 120}</span>
          </div>
          <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200">
            <span className="text-xs text-teal-700 block">OneCapture Actions</span>
            <span className="text-2xl font-black text-teal-900">{analytics?.total_onecapture_actions || 48}</span>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
            <span className="text-xs text-emerald-700 block">Actions Avoided</span>
            <span className="text-2xl font-black text-emerald-900">{analytics?.total_actions_avoided || 72}</span>
          </div>
          <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200">
            <span className="text-xs text-purple-700 block">Measured Reduction %</span>
            <span className="text-2xl font-black text-purple-900">{analytics?.macro_reduction_percentage || 60}%</span>
          </div>
        </div>

        {/* Methodology Disclosure box */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-teal-600" />
            Measurement Methodology & Rules:
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {analytics?.methodology || "Prototype workflow measurement: compares the sum of simulated required fields across separate programme registers (Maternal: 9, Immunisation: 7, Household: 8, Follow-up: 6) with unique fields captured in OneCapture. This represents an internal prototype metric and is not an empirical field study claim."}
          </p>
        </div>
      </div>
    </div>
  );
}
