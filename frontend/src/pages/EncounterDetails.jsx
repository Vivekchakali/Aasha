import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Layers, 
  CheckCircle2, 
  FileText, 
  Workflow, 
  Clock, 
  BarChart3,
  AlertCircle 
} from 'lucide-react';
import { getEncounter } from '../services/api';

export default function EncounterDetails({ encounter: propEncounter, onBack, onNavigate }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [encounter, setEncounter] = useState(propEncounter || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('outputs'); // 'outputs', 'normalized', 'impact', 'raw'

  useEffect(() => {
    if (!encounter && id) {
      setLoading(true);
      getEncounter(id)
        .then(res => {
          setEncounter(res.encounter || null);
        })
        .catch(err => {
          console.error("Failed to fetch encounter:", err);
          setError(err.message || 'Failed to fetch encounter details');
        })
        .finally(() => setLoading(false));
    }
  }, [id, encounter]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/history');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-semibold">Loading encounter data...</p>
      </div>
    );
  }

  if (error || !encounter) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">{error || 'No encounter selected.'}</h2>
        <button onClick={handleBack} className="mt-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold cursor-pointer">
          Go Back to History
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to List</span>
        </button>

        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-3 py-1 rounded-lg">
          {encounter.encounter_id}
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-sm">
            Encounter Details
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-1">Household {encounter.household_id}</h2>
          <p className="text-xs text-slate-500">Visited on {encounter.visit_date} • Duration: {encounter.duration_seconds || 45}s</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
          {[
            { id: 'outputs', label: 'Generated Records' },
            { id: 'normalized', label: 'Normalized Data' },
            { id: 'impact', label: 'Impact' },
            { id: 'raw', label: 'Raw Capture' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Generated Outputs */}
      {activeTab === 'outputs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {encounter.outputs?.map((out, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-xs text-slate-900">{out.programme_name}</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm">
                  ✓ Generated
                </span>
              </div>
              <pre className="bg-slate-950 text-emerald-400 p-3 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-56">
                {JSON.stringify(out.payload, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Normalized Data */}
      {activeTab === 'normalized' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Normalized Intermediate Structure
          </h4>
          <pre className="bg-slate-950 text-teal-300 p-4 rounded-2xl text-xs font-mono overflow-x-auto">
            {JSON.stringify(encounter.normalized_data || {}, null, 2)}
          </pre>
        </div>
      )}

      {/* Tab 3: Impact */}
      {activeTab === 'impact' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-slate-900">Prototype Workflow Measurement</h4>
          <p className="text-xs text-slate-500">
            Compares traditional separate register documentation against the OneCapture workflow.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Traditional Actions</span>
              <span className="text-xl font-black text-slate-900">{encounter.impact?.traditional_actions || 30}</span>
            </div>
            <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
              <span className="text-xs text-teal-700 block">OneCapture Actions</span>
              <span className="text-xl font-black text-teal-900">{encounter.impact?.onecapture_actions || 12}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs text-emerald-700 block">Actions Avoided</span>
              <span className="text-xl font-black text-emerald-900">{encounter.impact?.actions_avoided || 18}</span>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
              <span className="text-xs text-purple-700 block">Reduction %</span>
              <span className="text-xl font-black text-purple-900">{encounter.impact?.reduction_percentage || 60}%</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 italic">
            * Prototype measurement based on simulated legacy multi-register input counting.
          </div>
        </div>
      )}

      {/* Tab 4: Raw Capture */}
      {activeTab === 'raw' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Raw Encounter Payload</h4>
          <pre className="bg-slate-950 text-amber-300 p-4 rounded-2xl text-xs font-mono overflow-x-auto">
            {JSON.stringify(encounter.raw_data || {}, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
