import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HeartHandshake, Lock, User, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

export default function LoginPage() {
  const [username, setUsername] = useState('asha');
  const [password, setPassword] = useState('asha123');
  const [localError, setLocalError] = useState('');
  const { login, isLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!username.trim() || !password.trim()) {
      setLocalError('Please enter both username and password.');
      return;
    }

    try {
      await login(username.trim(), password.trim());
      navigate(from, { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Invalid username or password. Please verify credentials.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-teal-50/20 to-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-teal-700 text-white shadow-xl shadow-teal-700/20 mb-4 border border-teal-600/30">
          <HeartHandshake className="w-8 h-8" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            ASHA OneCapture
          </h1>
          <Badge variant="teal" size="sm">Govt. Pilot Edition</Badge>
        </div>
        <p className="text-xs sm:text-sm font-bold text-teal-800">
          Unified Community Health Operating System
        </p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
          "One Household Visit. One Complete Capture. Multiple Structured Registers."
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-slate-200/90">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Error Banner */}
            {localError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-fade-in font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{localError}</span>
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Worker ID / Username
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter worker username"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-slate-50/50 transition font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Access Password
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-slate-50/50 transition font-medium"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full justify-center text-sm font-bold shadow-md shadow-teal-700/20"
                disabled={isLoading}
                loading={isLoading}
                icon={ArrowRight}
              >
                Sign In to Workstation
              </Button>
            </div>
          </form>

          {/* Quick Account Switch for Testing */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Quick Test Credentials:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setUsername('asha');
                  setPassword('asha123');
                }}
                className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 text-teal-900 font-medium text-left transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-xs text-slate-900">ASHA Worker</span>
                  <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                </div>
                <span className="text-[10px] text-teal-700 font-mono">asha / asha123</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('admin123');
                }}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium text-left transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-xs text-slate-900">Nodal Officer</span>
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">admin / admin123</span>
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Encrypted Session • Role-Based Protected Data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
