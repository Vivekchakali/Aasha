import React, { useState } from 'react';
import { Globe, Wifi, Mic, Bell, RefreshCw, CheckCircle2, ShieldAlert, Database } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useOffline } from '../context/OfflineContext';
import { resetDemoData } from '../services/api';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

export default function SettingsPage() {
  const { lang, changeLanguage, t } = useLanguage();
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline, offlineQueue } = useOffline();
  const [voiceModel, setVoiceModel] = useState('en-IN');
  const [autoSync, setAutoSync] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [resetMessage, setResetMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetData = async () => {
    if (!window.confirm('Reset synthetic database to baseline demo households? All added custom records will be restored.')) {
      return;
    }
    setIsResetting(true);
    setResetMessage('');
    try {
      await resetDemoData();
      setResetMessage('Database successfully re-seeded with standard synthetic households.');
    } catch (err) {
      setResetMessage('Reset failed: ' + (err.message || 'Error'));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Workstation Settings & Preferences
          </h1>
          <Badge variant="teal" size="sm">Field Config</Badge>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Configure multilingual interfaces, offline synchronization behavior, and speech-to-text acoustic parameters
        </p>
      </div>

      <div className="space-y-4">
        {/* Language Selection */}
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-600" />
              <CardTitle className="text-sm">User Interface Language</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Select the active language for navigation, field labels, and button titles
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2.5">
              {[
                { code: 'en', label: 'English (India)' },
                { code: 'te', label: 'తెలుగు (Telugu)' },
                { code: 'hi', label: 'हिंदी (Hindi)' }
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => changeLanguage(item.code)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    lang === item.code 
                      ? 'bg-teal-700 text-white border-teal-700 shadow-xs' 
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Offline & Connectivity Settings */}
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-teal-600" />
                <CardTitle className="text-sm">Offline-First Synchronization</CardTitle>
              </div>
              <Badge 
                variant={isOnline ? 'success' : 'warning'} 
                size="sm"
                dot={true}
              >
                {isOnline ? 'Network Connected' : 'Working Offline'}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Visits recorded while disconnected from the cellular network are saved to local persistent storage
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <label className="flex items-center justify-between cursor-pointer text-xs p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <span className="font-bold text-slate-800 block">Auto-sync when connectivity is restored</span>
                <span className="text-[11px] text-slate-500">Automatically sync pending offline encounters upon reconnecting</span>
              </div>
              <input 
                type="checkbox" 
                checked={autoSync} 
                onChange={(e) => setAutoSync(e.target.checked)} 
                className="w-4 h-4 accent-teal-600 rounded cursor-pointer" 
              />
            </label>

            <div className="flex items-center justify-between text-xs p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <span className="font-bold text-slate-800 block">Simulate offline field conditions</span>
                <span className="text-[11px] text-slate-500">Test queueing and conflict resolution offline without disabling WiFi</span>
              </div>
              <Button
                size="xs"
                variant={isSimulatedOffline ? 'danger' : 'outline'}
                onClick={toggleSimulatedOffline}
              >
                {isSimulatedOffline ? 'Simulating Offline' : 'Simulate Offline'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Voice Input Model Preference */}
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-teal-600" />
              <CardTitle className="text-sm">Voice Recognition Input Engine</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Acoustic model applied by default during speech-to-text clinical capture
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <select
              value={voiceModel}
              onChange={(e) => setVoiceModel(e.target.value)}
              className="w-full sm:w-80 text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600/20 text-slate-800 cursor-pointer"
            >
              <option value="en-IN">English (India) — en-IN</option>
              <option value="te-IN">తెలుగు (Telugu) — te-IN</option>
              <option value="hi-IN">हिंदी (Hindi) — hi-IN</option>
            </select>
          </CardContent>
        </Card>

        {/* Operational Maintenance */}
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-600" />
              <CardTitle className="text-sm">Operational Database Maintenance</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Reset synthetic test data back to initial seed households (H1024–H1028)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {resetMessage && (
              <p className="text-xs font-bold text-teal-800 bg-teal-50 p-3 rounded-xl border border-teal-200">
                {resetMessage}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetData}
              disabled={isResetting}
              icon={RefreshCw}
              className={isResetting ? '[&_svg]:animate-spin' : ''}
            >
              {isResetting ? 'Resetting Database...' : 'Restore Baseline Synthetic Households'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
