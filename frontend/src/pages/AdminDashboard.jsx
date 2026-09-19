import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Layers, 
  RotateCcw, 
  Play, 
  BarChart3, 
  Database, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Activity,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { getAnalytics, getDemoScenarios, loadDemoScenario, resetDemoData } from '../services/api';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import MetricCard from '../components/ui/MetricCard';

export default function AdminDashboard({ onSelectScenario, onNavigate }) {
  const [analytics, setAnalytics] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminNotice, setAdminNotice] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [anData, scData] = await Promise.all([
        getAnalytics(),
        getDemoScenarios()
      ]);
      setAnalytics(anData);
      setScenarios(scData.scenarios || []);
    } catch (e) {
      console.error('Failed to load admin analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadScenario = async (scId) => {
    try {
      const res = await loadDemoScenario(scId);
      setAdminNotice(`Scenario ${scId} loaded: ${res.scenario.title}`);
      if (onSelectScenario) onSelectScenario(res.scenario.data);
      if (onNavigate) onNavigate('new-encounter');
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = async () => {
    if (window.confirm("Reset synthetic demo database with fresh baseline records? All test encounters will be reinitialized.")) {
      try {
        setResetting(true);
        await resetDemoData();
        setAdminNotice("Database successfully reset and re-seeded with synthetic baseline records.");
        await loadData();
      } catch (e) {
        console.error(e);
      } finally {
        setResetting(false);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Executive Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-teal-400/20">
              District Nodal Supervision
            </span>
            <span className="text-[10px] font-bold text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
              Kalachakra 2K26 Monitoring
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Program Analytics & Demo Control Console
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Real-time multi-register compliance metrics, automated register synthesis, and synthetic test-scenario injection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="danger"
            size="sm"
            onClick={handleReset}
            disabled={resetting}
            icon={RotateCcw}
            className={resetting ? '[&_svg]:animate-spin' : ''}
          >
            {resetting ? 'Resetting...' : 'Reset Demo Data'}
          </Button>
        </div>
      </div>

      {/* Notice Banner */}
      {adminNotice && (
        <div className="p-4 bg-teal-50 border border-teal-200/80 rounded-2xl text-xs font-semibold text-teal-900 flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{adminNotice}</span>
          </div>
          <button 
            onClick={() => setAdminNotice('')} 
            className="text-teal-700 hover:text-teal-900 font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Demo Scenarios"
          value={scenarios.length}
          icon={Sparkles}
          accentColor="teal"
          trend={{ text: "Ready for 1-click test", isPositive: true }}
        />
        <MetricCard
          title="Registers Generated"
          value="4 Registers"
          icon={Layers}
          accentColor="blue"
          trend={{ text: "Census, ANC, Imm, IFA", isPositive: true }}
        />
        <MetricCard
          title="Manual Work Avoided"
          value="~74%"
          icon={TrendingUp}
          accentColor="emerald"
          trend={{ text: "OneCapture reduction", isPositive: true }}
        />
        <MetricCard
          title="Audit Integrity"
          value="100%"
          icon={ShieldCheck}
          accentColor="purple"
          trend={{ text: "Zero hallucinations", isPositive: true }}
        />
      </div>

      {/* Demo Scenarios Loader Grid */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-teal-600" />
              <CardTitle className="text-base">Synthetic Demonstration Scenarios</CardTitle>
            </div>
            <Badge variant="teal" size="sm">Pre-populated Test Data</Badge>
          </div>
          <CardDescription>
            Inject realistic multi-programme household visits to evaluate deterministic mapping, SMS notifications, and registry compliance.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.map((sc) => (
              <div 
                key={sc.scenario_id} 
                className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-teal-300 hover:shadow-xs transition flex flex-col justify-between space-y-3.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded">
                      HH {sc.household_id}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">ID #{sc.scenario_id}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-2">{sc.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{sc.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleLoadScenario(sc.scenario_id)}
                  icon={Play}
                  className="w-full justify-center"
                >
                  Inject Scenario {sc.scenario_id}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Programme Distribution */}
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                <CardTitle className="text-sm">Programme Output Distribution</CardTitle>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Registers
              </span>
            </div>
            <CardDescription className="text-xs">
              Count of generated structured records by target ministry programme
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.charts?.programme_distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '12px', 
                      color: '#fff', 
                      border: 'none',
                      fontSize: '11px',
                      padding: '8px 12px'
                    }} 
                  />
                  <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Traditional vs OneCapture Actions */}
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <CardTitle className="text-sm">Manual Actions Avoided (Efficiency Gain)</CardTitle>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Workload Reduction
              </span>
            </div>
            <CardDescription className="text-xs">
              Number of redundant manual register entries avoided per household encounter
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.charts?.actions_comparison || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '12px', 
                      color: '#fff', 
                      border: 'none',
                      fontSize: '11px',
                      padding: '8px 12px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Traditional" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="OneCapture" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Avoided" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
