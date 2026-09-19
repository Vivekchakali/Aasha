import React from 'react';
import { 
  HeartHandshake, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  Clock, 
  FileText,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage({ onStartDemo, onNavigate }) {
  const { user, switchRole } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-white to-slate-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-teal-100/80 text-teal-800 text-xs font-bold px-3.5 py-1.5 rounded-full mb-6 border border-teal-200">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>KALACHAKRA 2K26 — PS-H02 ONE WORKER, FIVE SYSTEMS</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
          One Visit. One Entry. <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Multiple Records.
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          ASHA OneCapture captures a household encounter once and automatically structures the information into multiple programme-specific prototype outputs.
        </p>

        {/* Demo Disclaimer */}
        <div className="mt-4 inline-block bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold px-4 py-1.5 rounded-lg">
          Synthetic data only • Hackathon prototype
        </div>

        {/* CTAs */}
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={onStartDemo}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm shadow-lg shadow-teal-600/25 transition cursor-pointer transform hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Try Demo (Guided)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('new-encounter')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs transition cursor-pointer"
          >
            <span>+ New Household Visit</span>
          </button>
        </div>

        {/* Quick Demo Role Login */}
        <div className="mt-8 pt-6 border-t border-slate-200/60 max-w-md mx-auto">
          <span className="text-xs font-semibold text-slate-400 block mb-2">QUICK DEMO ACCESS:</span>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { switchRole('asha'); onNavigate('dashboard'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-bold hover:bg-teal-100 transition cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Login as ASHA (Sunita Devi)</span>
            </button>
            <button
              onClick={() => { switchRole('admin'); onNavigate('admin'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Login as Admin (Dr. Rajesh)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Pipeline Section as requested */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl relative overflow-hidden">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-sm">
              Core Architecture
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">
              From Repeated Entry to Automated Structuring
            </h2>
          </div>

          {/* Graphic Diagram */}
          <div className="flex flex-col items-center space-y-4">
            {/* Step 1 */}
            <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
              <span>ONE HOUSEHOLD VISIT</span>
            </div>
            
            <div className="w-0.5 h-6 bg-slate-300"></div>

            {/* Step 2 */}
            <div className="bg-teal-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-md flex items-center gap-2">
              <Cpu className="w-4 h-4 text-teal-200" />
              <span>ONECAPTURE NORMALIZATION</span>
            </div>

            <div className="w-0.5 h-6 bg-slate-300"></div>

            {/* Step 3 */}
            <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-md flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-200" />
              <span>RULE-BASED MAPPING ENGINE</span>
            </div>

            <div className="w-0.5 h-6 bg-slate-300"></div>

            {/* Step 4: Branching Outputs */}
            <div className="w-full max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                  <span className="text-xs font-black text-rose-800 block">MATERNAL HEALTH</span>
                  <span className="text-[10px] text-rose-600">Pregnancy & ANC Record</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <span className="text-xs font-black text-blue-800 block">IMMUNISATION</span>
                  <span className="text-[10px] text-blue-600">Child Vaccines & Doses</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <span className="text-xs font-black text-emerald-800 block">HOUSEHOLD REGISTER</span>
                  <span className="text-[10px] text-emerald-600">Census & Baseline Vitals</span>
                </div>
              </div>
            </div>

            <div className="w-0.5 h-6 bg-slate-300"></div>

            {/* Step 5 */}
            <div className="bg-purple-600 text-white px-6 py-2.5 rounded-2xl font-black text-xs shadow-md">
              FOLLOW-UP & ACTION PROTOCOL
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
