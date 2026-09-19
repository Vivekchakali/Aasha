import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Calendar, 
  Eye, 
  CheckCircle2, 
  Clock, 
  Download,
  AlertCircle,
  Building,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { getAdminHistory } from '../services/api';

export default function AdminHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.q = search;
      if (programmeFilter) params.programme = programmeFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await getAdminHistory(params);
      setHistory(res.history || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load admin history:', err);
      setError('Unable to load history. Verify administrative privileges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [programmeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-white/10 px-2.5 py-0.5 rounded-full">
              Administrative Supervision
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-white/10 px-2.5 py-0.5 rounded-full">
              All Sectors
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-2">All Household Visits & Programme Reports</h1>
          <p className="text-xs text-slate-300 mt-1">
            Supervisory view of all frontline health encounters and resulting verified programme data.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <form onSubmit={handleSearchSubmit} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Beneficiary, Household ID, Village..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-teal-500 focus:outline-none"
          />
        </div>

        <select
          value={programmeFilter}
          onChange={(e) => setProgrammeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
        >
          <option value="">All Programmes</option>
          <option value="Maternal">Maternal Health Register</option>
          <option value="Immunisation">Child Immunisation</option>
          <option value="Household">Household Register</option>
          <option value="Follow-up">Follow-up Task</option>
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
            title="Date from"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
            title="Date to"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition"
        >
          Filter
        </button>
      </form>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Visits Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-500 font-semibold">Loading supervisory records...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No visits match the current filters.</p>
            <p className="text-xs text-slate-400">Clear your search parameters or check date filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Visit Date</th>
                  <th className="py-3 px-4">Household / Area</th>
                  <th className="py-3 px-4">Beneficiary Seen</th>
                  <th className="py-3 px-4">ASHA Worker</th>
                  <th className="py-3 px-4">Generated Programme Reports</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {row.visit_date}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{row.household_id}</div>
                      <div className="text-[11px] text-slate-400">{row.village || 'N/A'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {row.beneficiary_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {row.worker_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {row.programmes_generated?.map((prog, pIdx) => (
                          <span
                            key={pIdx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200"
                          >
                            {prog}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedReport(row)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Reports</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: View Generated Reports for Encounter */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Programme Reports: {selectedReport.beneficiary_name} ({selectedReport.household_id})
                </h3>
                <p className="text-xs text-slate-500">
                  Visit Date: {selectedReport.visit_date} • Worker: {selectedReport.worker_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {selectedReport.reports?.map((rep, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-teal-900">{rep.programme_name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{rep.programme_code}</span>
                  </div>
                  <pre className="p-3 bg-slate-900 text-teal-300 rounded-xl text-[11px] font-mono overflow-auto max-h-48">
                    {JSON.stringify(rep.payload_json || rep.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
