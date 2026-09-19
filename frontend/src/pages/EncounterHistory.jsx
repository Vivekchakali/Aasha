import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  ArrowRight, 
  Wifi, 
  WifiOff, 
  Calendar, 
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { getEncounters } from '../services/api';

export default function EncounterHistory({ onSelectEncounter, onNavigate }) {
  const navigate = useNavigate();
  const [encounters, setEncounters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEncounters();
  }, [statusFilter]);

  const fetchEncounters = async () => {
    try {
      setLoading(true);
      const res = await getEncounters(statusFilter !== 'all' ? { status: statusFilter } : {});
      setEncounters(res.encounters || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = encounters.filter(enc => 
    enc.household_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enc.encounter_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-sm">
            Encounter Archive
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-1">Encounter History & Audit Log</h2>
          <p className="text-xs text-slate-500">Review all captured visits and generated programme records.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Household ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none w-52"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            {['all', 'processed', 'draft'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-bold capitalize transition cursor-pointer ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Encounter ID</th>
                <th className="py-3 px-4">Household</th>
                <th className="py-3 px-4">Visit Date</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Generated Records</th>
                <th className="py-3 px-4">Sync Mode</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-400">
                    No encounters found.
                  </td>
                </tr>
              ) : (
                filtered.map((enc) => (
                  <tr key={enc.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-[11px] font-bold text-slate-900">
                      {enc.encounter_id}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900">{enc.household_id}</td>
                    <td className="py-3 px-4 text-slate-500">{enc.visit_date}</td>
                    <td className="py-3 px-4 font-mono">{enc.duration_seconds || 45}s</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {enc.outputs?.map((o, idx) => (
                          <span key={idx} className="bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded-sm text-[10px] font-semibold border border-teal-200">
                            {o.programme_code.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        enc.sync_status === 'synced' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {enc.sync_status === 'synced' ? 'Online Synced' : 'Offline Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          if (onSelectEncounter && onNavigate) {
                            onSelectEncounter(enc);
                            onNavigate('encounter-details');
                          } else {
                            navigate(`/encounters/${enc.id}`);
                          }
                        }}
                        className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
