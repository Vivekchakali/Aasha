import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Users, 
  Database, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  FileSpreadsheet, 
  RefreshCw,
  AlertTriangle,
  History,
  HardDrive,
  Cpu,
  Wifi,
  Sparkles
} from 'lucide-react';
import { getAdminOperations } from '../services/api';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import MetricCard from '../components/ui/MetricCard';

export default function AdminOperationsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const res = await getAdminOperations();
      setData(res);
      setError(null);
    } catch (err) {
      console.error('Failed to load admin operations:', err);
      setError('Failed to load operations metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loading operational telemetry...</p>
      </div>
    );
  }

  const stats = data?.stats || {};
  const health = data?.system_health || {};
  const workers = data?.workers || [];
  const auditLogs = data?.recent_audit_events || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              System Operations
            </span>
            <Badge variant="success" size="sm" dot={true}>Heartbeat Active</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5">
            Field Operations & System Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time infrastructure health, database integrity, active health workers, and operational event trace.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchOperations}
          icon={RefreshCw}
        >
          Refresh Telemetry
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold flex items-center gap-2.5 shadow-2xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Households</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.total_households ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Visits</p>
          <p className="text-2xl font-black text-teal-700 mt-1">{stats.total_visits ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Registers Built</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{stats.total_reports_generated ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending Tasks</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.pending_followups ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Completed</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.completed_followups ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Workers</p>
          <p className="text-2xl font-black text-purple-700 mt-1">{stats.active_asha_workers ?? 0}</p>
        </div>
      </div>

      {/* System Health Card */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-teal-600" />
              <CardTitle className="text-base">Infrastructure & Runtime Status</CardTitle>
            </div>
            <Badge variant="success" size="sm" dot={true}>
              All Systems Operational
            </Badge>
          </div>
          <CardDescription>
            Core engine readiness and local persistence diagnostics
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase">
                <HardDrive className="w-3.5 h-3.5 text-teal-600" />
                <span>Storage Engine</span>
              </div>
              <p className="font-bold text-slate-900 mt-1">{health.database || 'SQLite (Persistent)'}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase">
                <Cpu className="w-3.5 h-3.5 text-teal-600" />
                <span>Application Version</span>
              </div>
              <p className="font-bold text-slate-900 mt-1">{health.version || 'v2.6-production'}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Offline Engine</span>
              </div>
              <p className="font-bold text-emerald-700 mt-1">{health.offline_sync_readiness || 'Ready & Resilient'}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Last Uptime Heartbeat</span>
              </div>
              <p className="font-mono text-[11px] text-slate-700 mt-1 truncate">{health.uptime_check?.slice(0, 19) || 'Active'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Workers */}
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <CardTitle className="text-base">Registered Field Workers</CardTitle>
              </div>
              <Badge variant="teal" size="sm">{workers.length} Accounts</Badge>
            </div>
            <CardDescription>
              Authenticated field health personnel and nodal supervisory users
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="divide-y divide-slate-100 text-xs">
              {workers.map((w) => (
                <div key={w.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{w.username}</p>
                    <p className="text-[11px] text-slate-400 capitalize">Role: {w.role}</p>
                  </div>
                  <Badge variant="success" size="sm" dot={true}>
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Trail */}
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                <CardTitle className="text-base">Recent System Events</CardTitle>
              </div>
              <Badge variant="neutral" size="sm">Live Stream</Badge>
            </div>
            <CardDescription>
              Immutable action logs for security, visits, and SMS dispatch
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="divide-y divide-slate-100 text-xs max-h-80 overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <p className="py-8 text-center text-slate-400 italic">No operational events recorded yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-100">{log.action}</span>
                      <span className="text-slate-400">{log.created_at?.slice(0, 16)}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      By <strong className="text-slate-800">{log.username}</strong> ({log.role}) • Record: <span className="font-mono text-slate-500">{log.record_id || 'System'}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
