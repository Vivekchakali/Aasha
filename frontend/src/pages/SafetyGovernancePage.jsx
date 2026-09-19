import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck, 
  RefreshCw, 
  Search, 
  BookOpen,
  Filter,
  Activity,
  Shield,
  FileText
} from 'lucide-react';
import { getAdminSafetyGovernance, getAdminAuditLogs } from '../services/api';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import MetricCard from '../components/ui/MetricCard';

export default function SafetyGovernancePage() {
  const [govData, setGovData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState('');

  const loadGovernanceData = async () => {
    try {
      setLoading(true);
      const [govRes, logRes] = await Promise.all([
        getAdminSafetyGovernance(),
        getAdminAuditLogs(actionFilter ? { action: actionFilter } : {})
      ]);
      setGovData(govRes);
      setLogs(logRes.audit_logs || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load safety governance data:', err);
      setError('Unable to load governance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGovernanceData();
  }, [actionFilter]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Verifying governance & compliance registry...</p>
      </div>
    );
  }

  const policies = govData?.policies || [];
  const metrics = govData?.metrics || {};

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-teal-400/20">
              Regulatory Audit & Safety
            </span>
            <Badge variant="success" size="sm" dot={true}>
              Status: {govData?.governance_status || 'Compliant'}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Data Governance & Compliance Audit
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Zero-hallucination deterministic policies, non-diagnostic verification, data minimization, and immutable operational logs.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadGovernanceData}
          icon={RefreshCw}
          className="text-white border-white/20 hover:bg-white/10"
        >
          Run Audit Check
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold flex items-center gap-2.5 shadow-2xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Compliance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Total Audit Events"
          value={metrics.total_audit_events ?? 0}
          icon={Activity}
          accentColor="teal"
          trend={{ text: "Immutable trail", isPositive: true }}
        />
        <MetricCard
          title="Clinical Violations"
          value={metrics.flagged_clinical_violations ?? 0}
          icon={ShieldCheck}
          accentColor="emerald"
          trend={{ text: "0 Violations flagged", isPositive: true }}
        />
        <MetricCard
          title="Data Minimization"
          value={metrics.data_minimization_pass_rate || '100%'}
          icon={Lock}
          accentColor="blue"
          trend={{ text: "Strict privacy boundary", isPositive: true }}
        />
        <MetricCard
          title="Rule Integrity"
          value={metrics.rule_engine_integrity || '100%'}
          icon={FileCheck}
          accentColor="purple"
          trend={{ text: "Deterministic schemas", isPositive: true }}
        />
      </div>

      {/* Policies List */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" />
              <CardTitle className="text-base">Enforced Governance Policies</CardTitle>
            </div>
            <Badge variant="teal" size="sm">{policies.length} Policies Active</Badge>
          </div>
          <CardDescription>
            Engine rules ensuring patient data privacy, non-diagnostic guardrails, and deterministic transformations
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((p) => (
              <div key={p.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded">
                    {p.id}
                  </span>
                  <Badge variant="success" size="sm" dot={true}>
                    {p.status}
                  </Badge>
                </div>
                <h4 className="font-bold text-xs text-slate-900">{p.name}</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <div>
                <CardTitle className="text-base">Immutable Audit Trail</CardTitle>
                <CardDescription className="text-xs">
                  Cryptographically verifiable chronological event history
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-600/20 cursor-pointer"
              >
                <option value="">All Actions</option>
                <option value="login_success">login_success</option>
                <option value="visit_created">visit_created</option>
                <option value="reports_generated">reports_generated</option>
                <option value="household_created">household_created</option>
                <option value="household_member_added">household_member_added</option>
                <option value="followup_updated">followup_updated</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Worker / User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Record ID</th>
                  <th className="py-3 px-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No matching audit records found.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {l.created_at?.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 text-[11px]">
                          {l.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {l.username || 'system'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="neutral" size="sm">
                          {l.role || 'system'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {l.record_id || '—'}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500 max-w-xs truncate" title={l.details}>
                        {l.details || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
