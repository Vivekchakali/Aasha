import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Workflow, 
  Info, 
  ArrowRight, 
  Search, 
  Filter, 
  Layers, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import MappingFlowDiagram from '../components/MappingFlowDiagram';
import { getEncounters, getEncounterMappings } from '../services/api';

import { useParams, Link } from 'react-router-dom';

export default function MappingDetailsPage({ activeEncounterId, onNavigate }) {
  const { id: routeId } = useParams();
  const [encounters, setEncounters] = useState([]);
  const [selectedEncId, setSelectedEncId] = useState(routeId ? parseInt(routeId, 10) : (activeEncounterId || null));
  const [mappingData, setMappingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEncounters();
  }, []);

  useEffect(() => {
    if (selectedEncId) {
      fetchMappings(selectedEncId);
    }
  }, [selectedEncId]);

  const fetchEncounters = async () => {
    try {
      const res = await getEncounters();
      const list = res.encounters || [];
      setEncounters(list);
      if (!selectedEncId && list.length > 0) {
        setSelectedEncId(list[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMappings = async (id) => {
    setLoading(true);
    try {
      const res = await getEncounterMappings(id);
      setMappingData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = mappingData?.mapping_logs?.filter(log => 
    log.source_field.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.target_programme.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.target_field.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-sm">
            Deterministic Engine Trace
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-1">Mapping Details & Logic Inspection</h2>
          <p className="text-xs text-slate-500">
            Inspect the exact rule executions, source-to-target field associations, and unmapped inputs.
          </p>
        </div>

        {/* Encounter Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">Select Encounter:</label>
          <select
            value={selectedEncId || ''}
            onChange={e => setSelectedEncId(parseInt(e.target.value))}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:outline-none"
          >
            {encounters.map(enc => (
              <option key={enc.id} value={enc.id}>
                {enc.household_id} ({enc.visit_date}) — {enc.encounter_id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visual Flow Diagram */}
      {mappingData && (
        <MappingFlowDiagram
          mappingStats={{
            source_fields_count: mappingData.source_fields_count,
            mapped_fields_count: mappingData.mapped_fields_count,
            total_rules_triggered: 4
          }}
          flowGraph={mappingData.flow_graph}
          mappings={mappingData.mapping_logs}
        />
      )}

      {/* Detailed Mapping Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-black text-base text-slate-900">Field-Level Transformation Logs</h3>
            <p className="text-xs text-slate-500 mt-0.5">Every row represents a deterministic field mapped from the single encounter</p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search field or programme..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Rule Name</th>
                <th className="py-3 px-4">Source Field (OneCapture)</th>
                <th className="py-3 px-4">Target Programme</th>
                <th className="py-3 px-4">Target Schema Field</th>
                <th className="py-3 px-4">Transformed Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-400">
                    No mapping records matching query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-[11px] text-teal-800">
                      {log.rule_name}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {log.source_field}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded-sm text-[10px]">
                        {log.target_programme}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {log.target_field}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium truncate max-w-xs">
                      {log.value_transformed}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unmapped Fields Section as required */}
      {mappingData?.unmapped_fields && mappingData.unmapped_fields.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-slate-500" />
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Unmapped Source Fields</h4>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            These fields were captured during the encounter but were not required by any triggered downstream programme schema:
          </p>
          <div className="flex flex-wrap gap-2">
            {mappingData.unmapped_fields.map((f, idx) => (
              <span key={idx} className="bg-white border border-slate-300 text-slate-700 text-xs px-2.5 py-1 rounded-lg">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
