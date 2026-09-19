import React from 'react';
import { User, ShieldCheck, MapPin, Calendar, LogOut, CheckCircle2, Award, Phone, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Community Health Worker Profile
            </h1>
            <Badge variant="teal" size="sm">Verified Worker</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Verified identity, designated operational catchment, and credential authorization
          </p>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={handleLogout}
          icon={LogOut}
        >
          Sign Out
        </Button>
      </div>

      {/* Main Profile Card */}
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-teal-700 to-emerald-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg shadow-teal-700/20 shrink-0 border-2 border-white">
            {user?.full_name ? user.full_name.charAt(0) : 'A'}
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900">{user?.full_name || 'Sunita Devi (ASHA)'}</h2>
              <Badge variant={user?.role === 'admin' ? 'teal' : 'success'} size="sm">
                {user?.role === 'admin' ? 'District Nodal Officer' : 'Active ASHA Worker'}
              </Badge>
            </div>
            <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>{user?.area || 'Ward 4 & 5, Shanti Nagar Community Catchment'}</span>
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
              <span>Worker ID: <strong className="font-mono text-slate-800">{user?.username || 'asha'}</strong></span>
              <span>•</span>
              <span>Badge #{user?.id || '101'}</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Active Shift
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responsibilities & Catchment Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-teal-600" />
              <CardTitle className="text-sm">Designated Field Responsibilities</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Mandated public-health protocol duties for this catchment area
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-2.5 text-xs text-slate-700">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">Household Census & Vulnerability Registration</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">Antenatal Care (ANC) & Maternal Vitals Monitoring</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">Child Immunisation Tracking & Milestone Assessment</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">Protocol Follow-up & High-Risk Escalation</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <CardTitle className="text-sm">Security & Access Control</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Cryptographic tokens and zero-trust session governance
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Authentication Mode</span>
                <span className="font-bold text-slate-800">Argon2 / SHA-256</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Session Mode</span>
                <span className="font-bold text-slate-800">Token-based Persistent</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Local Cache Security</span>
                <span className="font-bold text-emerald-700">Encrypted IndexedDB</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Data Minimization</span>
                <span className="font-bold text-slate-800">Strict Rule Enforced</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
