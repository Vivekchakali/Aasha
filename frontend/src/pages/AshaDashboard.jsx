import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  PlusCircle, 
  ArrowRight, 
  Pill, 
  Baby, 
  AlertTriangle, 
  MessageSquare, 
  Send, 
  Wifi, 
  WifiOff, 
  ShieldCheck, 
  Home, 
  RefreshCw,
  Sparkles,
  HeartHandshake,
  Activity
} from 'lucide-react';

import { getDashboardSummary, getHouseholds } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import MetricCard from '../components/ui/MetricCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

export default function AshaDashboard({ onNavigate, onSelectEncounter }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline, offlineQueue } = useOffline();

  const [summary, setSummary] = useState(null);
  const [actionRequired, setActionRequired] = useState(null);
  const [recentEncounters, setRecentEncounters] = useState([]);
  const [totalHouseholds, setTotalHouseholds] = useState(5);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [dashData, hhData] = await Promise.all([
        getDashboardSummary(),
        getHouseholds().catch(() => ({ households: [] }))
      ]);

      if (dashData) {
        setSummary(dashData.summary || {});
        setActionRequired(dashData.action_required || {});
        setRecentEncounters(dashData.recent_encounters || []);
      }

      if (hhData && hhData.households) {
        setTotalHouseholds(hhData.households.length);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const providerMode = actionRequired?.provider_mode || 'mock';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Welcome Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden border border-teal-700/50">
        {/* Subtle decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-56 h-56 rounded-full bg-teal-500/10 pointer-events-none blur-2xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full border border-teal-400/20">
                Frontline Healthcare Command
              </span>
              <span className="text-[11px] font-medium text-teal-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {todayFormatted}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Namaste, {user?.full_name || 'Sunita Devi'}
            </h1>

            <p className="text-xs sm:text-sm text-teal-100 max-w-xl font-normal leading-relaxed">
              {user?.area || 'Ward 4 & 5, Shanti Nagar • Sector 2 Community Health Catchment'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="md"
              icon={RefreshCw}
              onClick={fetchDashboardData}
              loading={refreshing}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
            >
              Refresh
            </Button>

            <Button
              variant="secondary"
              size="md"
              icon={Home}
              onClick={() => onNavigate ? onNavigate('households') : navigate('/households')}
              className="bg-white text-slate-900 hover:bg-teal-50 text-xs shadow-xs"
            >
              Households
            </Button>

            <Button
              variant="success"
              size="md"
              icon={PlusCircle}
              onClick={() => onNavigate ? onNavigate('new-encounter') : navigate('/encounters/new')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-950/20"
            >
              + New Household Visit
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Key Operational Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <MetricCard
          title="Today's Visits"
          value={summary?.today_visits ?? 0}
          subtitle="Visits recorded today"
          icon={Calendar}
          variant="teal"
          onClick={() => navigate('/history')}
        />

        <MetricCard
          title="Registered Families"
          value={totalHouseholds}
          subtitle="Households in ward"
          icon={Home}
          variant="indigo"
          onClick={() => navigate('/households')}
        />

        <MetricCard
          title="Pending Follow-ups"
          value={summary?.pending_followups ?? 0}
          subtitle="Scheduled care visits"
          icon={Clock}
          variant="amber"
          onClick={() => navigate('/followups')}
        />

        <MetricCard
          title="Overdue Actions"
          value={actionRequired?.overdue_followups ?? 0}
          subtitle="Attention required"
          icon={AlertTriangle}
          variant="rose"
          badge={actionRequired?.overdue_followups > 0 ? "Action" : undefined}
          badgeVariant="danger"
          onClick={() => navigate('/retrieval?category=FOLLOW_UP&urgency=overdue')}
        />

        <MetricCard
          title="SMS Sent Today"
          value={actionRequired?.sms_sent_today ?? 0}
          subtitle={providerMode === 'twilio' ? "Carrier SMS sent" : "Simulated SMS"}
          icon={Send}
          variant="emerald"
          onClick={() => navigate('/retrieval?category=SMS&status=SENT')}
        />

        <MetricCard
          title="Offline Queue"
          value={offlineQueue.length}
          subtitle={offlineQueue.length > 0 ? "Pending device sync" : "Fully synchronized"}
          icon={isOnline ? Wifi : WifiOff}
          variant={offlineQueue.length > 0 ? "rose" : "slate"}
          badge={offlineQueue.length > 0 ? "Unsynced" : undefined}
          badgeVariant={offlineQueue.length > 0 ? "warning" : undefined}
          onClick={() => navigate('/offline-sync')}
        />
      </div>

      {/* 3. Action Required & Clinical Triage Panel */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 py-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-900">
                Action Required & Clinical Triage
              </CardTitle>
              <CardDescription>
                Prioritized maternal, immunization, and communication action items based on confirmed structured records
              </CardDescription>
            </div>
          </div>

          {/* Provider mode pill */}
          <div className="flex items-center gap-2">
            <Badge 
              variant={providerMode === 'twilio' ? 'success' : 'warning'} 
              size="sm" 
              dot
            >
              {providerMode === 'twilio' ? 'Twilio Live SMS Active' : 'Mock SMS Mode'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Overdue Follow-ups */}
            <button
              type="button"
              onClick={() => navigate('/retrieval?category=FOLLOW_UP&urgency=overdue')}
              className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 hover:border-rose-300 transition text-left cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-rose-700 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                  Overdue
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 group-hover:text-rose-700 transition">
                  {actionRequired?.overdue_followups ?? 0}
                </span>
                <p className="text-xs font-semibold text-slate-600 mt-0.5 leading-tight">
                  Overdue Follow-ups
                </p>
              </div>
            </button>

            {/* Due Today Visits */}
            <button
              type="button"
              onClick={() => navigate('/retrieval?category=FOLLOW_UP&urgency=due_today')}
              className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-300 transition text-left cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-amber-700 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                  Today
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 group-hover:text-amber-700 transition">
                  {actionRequired?.due_today_followups ?? 0}
                </span>
                <p className="text-xs font-semibold text-slate-600 mt-0.5 leading-tight">
                  Due Today Visits
                </p>
              </div>
            </button>

            {/* Pending Iron Tablets */}
            <button
              type="button"
              onClick={() => navigate('/retrieval?category=IRON_TABLETS&collected=false')}
              className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-300 transition text-left cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-purple-700 mb-2">
                <Pill className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                  IFA
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 group-hover:text-purple-700 transition">
                  {actionRequired?.pending_iron_tablets ?? 0}
                </span>
                <p className="text-xs font-semibold text-slate-600 mt-0.5 leading-tight">
                  IFA Distribution Due
                </p>
              </div>
            </button>

            {/* Vaccinations Due */}
            <button
              type="button"
              onClick={() => navigate('/retrieval?category=CHILD&vaccination_status=Pending')}
              className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 transition text-left cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-blue-700 mb-2">
                <Baby className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                  U-WIN
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 group-hover:text-blue-700 transition">
                  {actionRequired?.pending_vaccinations ?? 0}
                </span>
                <p className="text-xs font-semibold text-slate-600 mt-0.5 leading-tight">
                  Vaccinations Due
                </p>
              </div>
            </button>

            {/* SMS Pending */}
            <button
              type="button"
              onClick={() => navigate('/retrieval?category=SMS&status=PENDING')}
              className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-300 transition text-left cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-indigo-700 mb-2">
                <MessageSquare className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                  Drafts
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 group-hover:text-indigo-700 transition">
                  {actionRequired?.sms_pending ?? 0}
                </span>
                <p className="text-xs font-semibold text-slate-600 mt-0.5 leading-tight">
                  SMS Drafts Pending
                </p>
              </div>
            </button>

            {/* SMS Failed */}
            <button
              type="button"
              onClick={() => navigate('/retrieval?category=SMS&status=FAILED')}
              className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 hover:border-rose-300 transition text-left cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-rose-700 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                  Failed
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 group-hover:text-rose-700 transition">
                  {actionRequired?.sms_failed ?? 0}
                </span>
                <p className="text-xs font-semibold text-slate-600 mt-0.5 leading-tight">
                  Failed SMS (Retry)
                </p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 4. Recent Household Encounters Table */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 py-4">
          <div>
            <CardTitle className="text-base sm:text-lg text-slate-900">
              Recent Household Visits & Encounters
            </CardTitle>
            <CardDescription>
              Captures processed into downstream records across maternal, child, census, and follow-up schemas
            </CardDescription>
          </div>

          <Link
            to="/history"
            className="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 transition"
          >
            <span>View All Encounters</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Household ID</th>
                <th className="py-3 px-4">Visit Date</th>
                <th className="py-3 px-4">Processing Status</th>
                <th className="py-3 px-4">Generated Records</th>
                <th className="py-3 px-4">Device Sync</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentEncounters.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    No recent encounters. Click "+ New Household Visit" to begin.
                  </td>
                </tr>
              ) : (
                recentEncounters.map((enc) => (
                  <tr key={enc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {enc.household_id}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">
                      {enc.visit_date}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={enc.status === 'processed' ? 'success' : 'warning'}
                        size="sm"
                        dot
                      >
                        {enc.status === 'processed' ? 'Verified & Processed' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {enc.output_codes && enc.output_codes.length > 0 ? (
                          enc.output_codes.map((code, cIdx) => (
                            <span 
                              key={cIdx} 
                              className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200/60"
                            >
                              {code.replace('_', ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">4 Records</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                        enc.sync_status === 'synced' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          enc.sync_status === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                        {enc.sync_status === 'synced' ? 'Online Synced' : 'Offline Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (onSelectEncounter && onNavigate) {
                            onSelectEncounter(enc);
                            onNavigate('encounter-details');
                          } else {
                            navigate(`/encounters/${enc.id}`);
                          }
                        }}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
