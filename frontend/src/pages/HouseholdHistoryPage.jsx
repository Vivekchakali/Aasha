import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Home, 
  Calendar, 
  User, 
  Clock, 
  FileText, 
  PlusCircle, 
  AlertCircle,
  Eye,
  CheckCircle2,
  MessageSquare,
  Phone
} from 'lucide-react';
import { getHouseholdHistory, getHousehold, getSMSHistory } from '../services/api';


export default function HouseholdHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [household, setHousehold] = useState(null);
  const [history, setHistory] = useState([]);
  const [smsHistory, setSmsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [hhRes, histRes, smsRes] = await Promise.all([
          getHousehold(id),
          getHouseholdHistory(id),
          getSMSHistory({ household_id: id }).catch(() => ({ messages: [] }))
        ]);
        setHousehold(hhRes.household || null);
        setHistory(histRes.history || []);
        setSmsHistory(smsRes.messages || []);
      } catch (err) {
        console.error('Failed to load household history:', err);
        setError('Failed to load household visit history.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);


  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500 font-semibold">Loading household visit history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link
            to={`/households/${id}`}
            className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 font-bold mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Household Profile</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900">
              Visit History: {household?.head_name || id}
            </h1>
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
              {id}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Village: {household?.village || 'N/A'} • Members: {household?.members_count || 0} • Total Visits Recorded: {history.length}
          </p>
        </div>

        <Link
          to={`/households/${id}/visit`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Conduct New Visit</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* History Timeline Cards */}
      {history.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
          <Home className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-800">No visits recorded for this household yet.</p>
          <Link
            to={`/households/${id}/visit`}
            className="inline-block text-xs text-teal-700 font-bold hover:underline"
          >
            Conduct the first visit now →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item, idx) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-teal-300 transition space-y-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                    #{history.length - idx}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Visit on {item.visit_date}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Beneficiary: <strong className="text-slate-700">{item.beneficiary_name}</strong> • Recorded by: {item.worker_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                    <Clock className="w-3 h-3 text-teal-600" />
                    <span>{item.duration_seconds || 45}s capture</span>
                  </span>
                  <Link
                    to={`/encounters/${item.id}/reports`}
                    state={{ householdId: id, encounterId: item.id, outputs: item.reports }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Generated Reports ({item.reports?.length || 0})</span>
                  </Link>
                </div>
              </div>

              {/* Reports generated in this visit */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-2">
                  Programme Reports Produced:
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.reports && item.reports.length > 0 ? (
                    item.reports.map((rep, rIdx) => (
                      <span
                        key={rIdx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{rep.programme_name}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No programme reports generated</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SMS Reminder & Communication Timeline */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-black text-lg text-slate-900">SMS Reminders & Communication Timeline</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {smsHistory.length} Recorded
          </span>
        </div>

        {smsHistory.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">
            No automated SMS reminders have been logged for this household yet.
          </p>
        ) : (
          <div className="space-y-3">
            {smsHistory.map((sms) => (
              <div key={sms.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span>{sms.recipient_name}</span>
                    <span className="font-mono text-slate-500 font-normal">({sms.recipient_phone})</span>
                    <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {sms.template_type}
                    </span>
                    <span className="text-[10px] uppercase font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                      {sms.language}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ {sms.status} {sms.simulated_flag && '(Simulated)'}
                    </span>
                    <span className="text-slate-400">
                      {sms.created_at ? new Date(sms.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-100 text-slate-700 font-normal leading-relaxed">
                  {sms.message_body}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

