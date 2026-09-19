import React, { useState } from 'react';
import { Layers, ArrowRight, CheckCircle, Info, Sparkles } from 'lucide-react';

export default function MappingFlowDiagram({ mappingStats, flowGraph, mappings = [] }) {
  const [selectedField, setSelectedField] = useState(null);

  const programmes = [
    { code: 'MATERNAL_HEALTH', name: 'Maternal Health Record', color: 'from-pink-500 to-rose-500', bg: 'bg-rose-50', border: 'border-rose-200' },
    { code: 'IMMUNISATION', name: 'Child Immunisation Record', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', border: 'border-blue-200' },
    { code: 'HOUSEHOLD_REGISTER', name: 'Household Register', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { code: 'FOLLOW_UP', name: 'Follow-up Tracking', color: 'from-purple-500 to-indigo-500', bg: 'bg-purple-50', border: 'border-purple-200' }
  ];

  const sourceFieldNodes = flowGraph?.nodes?.filter(n => n.type === 'source_field') || [
    { id: 'src_household_id', label: 'Household Id' },
    { id: 'src_visit_date', label: 'Visit Date' },
    { id: 'src_pregnant', label: 'Pregnant' },
    { id: 'src_gestational_age', label: 'Gestational Age' },
    { id: 'src_maternal_age', label: 'Maternal Age' },
    { id: 'src_children', label: 'Children' },
    { id: 'src_vaccination_summary', label: 'Vaccination' },
    { id: 'src_follow_up_date', label: 'Follow Up Date' }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
      {/* Top Banner with prominent formula */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-sm">
            Interactive Mapping Pipeline
          </span>
          <h3 className="text-xl font-black text-slate-900 mt-1">
            1 Encounter → Multiple Programme Records
          </h3>
          <p className="text-xs text-slate-500">
            Real-time visual trace showing how single-visit fields populate downstream registers.
          </p>
        </div>

        {/* Dynamic Metric Badges */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-center">
            <span className="text-xs text-slate-500 block">Source Fields</span>
            <span className="text-lg font-black text-slate-800">{mappingStats?.source_fields_count || 17}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-3.5 py-2 text-center">
            <span className="text-xs text-teal-700 block">Fields Mapped</span>
            <span className="text-lg font-black text-teal-800">{mappingStats?.mapped_fields_count || 12}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-center">
            <span className="text-xs text-emerald-700 block">Outputs Created</span>
            <span className="text-lg font-black text-emerald-800">{mappingStats?.total_rules_triggered || 4}</span>
          </div>
        </div>
      </div>

      {/* Visual Pipeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start relative">
        {/* Column 1: OneCapture Source Fields */}
        <div className="space-y-3">
          <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              <span className="text-xs font-bold tracking-wide">ONE CAPTURE</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-sm font-mono">Single Entry</span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {sourceFieldNodes.map((node) => {
              const isSelected = selectedField === node.id;
              const relatedMappings = mappings.filter(m => `src_${m.source_field}` === node.id);

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedField(isSelected ? null : node.id)}
                  className={`p-2.5 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-teal-100 border-teal-500 font-bold text-teal-900 shadow-xs ring-2 ring-teal-300'
                      : 'bg-slate-50 border-slate-200 hover:border-teal-300 text-slate-700'
                  }`}
                >
                  <span>{node.label}</span>
                  <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded-sm font-semibold text-slate-500">
                    → {relatedMappings.length} {relatedMappings.length === 1 ? 'target' : 'targets'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Transparent Rule Engine */}
        <div className="space-y-3 flex flex-col justify-center">
          <div className="bg-teal-800 text-white p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold tracking-wide">MAPPING ENGINE</span>
            <span className="text-[10px] bg-teal-900 px-2 py-0.5 rounded-sm">Rule Engine</span>
          </div>

          <div className="bg-teal-50/50 border border-teal-200 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-teal-900 font-bold">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>Deterministic Rules</span>
            </div>
            <ul className="space-y-2 text-[11px] text-slate-700">
              <li className="p-2 rounded-lg bg-white border border-teal-100">
                <span className="font-bold text-rose-700 block">R1: Maternal Health Rule</span>
                IF pregnant == true OR gestation &gt; 0 → Generate Maternal Record
              </li>
              <li className="p-2 rounded-lg bg-white border border-teal-100">
                <span className="font-bold text-blue-700 block">R2: Child Immunisation Rule</span>
                IF children.length &gt; 0 → Generate Immunisation Record
              </li>
              <li className="p-2 rounded-lg bg-white border border-teal-100">
                <span className="font-bold text-emerald-700 block">R3: Household Census Rule</span>
                IF household_id exists → Generate Household Register
              </li>
              <li className="p-2 rounded-lg bg-white border border-teal-100">
                <span className="font-bold text-purple-700 block">R4: Follow-up Rule</span>
                IF follow_up_required == true → Generate Follow-up Task
              </li>
            </ul>
          </div>
        </div>

        {/* Column 3: Generated Programme Output Schemas */}
        <div className="space-y-3">
          <div className="bg-emerald-800 text-white p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold tracking-wide">STRUCTURED OUTPUTS</span>
            <span className="text-[10px] bg-emerald-900 px-2 py-0.5 rounded-sm font-bold">Multiple Records</span>
          </div>

          <div className="space-y-2.5">
            {programmes.map((prog) => (
              <div 
                key={prog.code}
                className={`p-3 rounded-xl border ${prog.border} ${prog.bg} transition`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{prog.name}</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-[11px] text-slate-600 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Mapped Fields:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {mappings
                      .filter(m => m.target_programme === prog.code)
                      .slice(0, 5)
                      .map((m, idx) => (
                        <span key={idx} className="bg-white/80 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded-sm text-[10px]">
                          {m.target_field}
                        </span>
                      ))}
                    {mappings.filter(m => m.target_programme === prog.code).length > 5 && (
                      <span className="text-[10px] font-bold text-slate-500">
                        +{mappings.filter(m => m.target_programme === prog.code).length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
