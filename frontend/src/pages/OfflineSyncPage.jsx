import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  UploadCloud, 
  Layers, 
  ArrowRight 
} from 'lucide-react';
import { useOffline } from '../context/OfflineContext';

export default function OfflineSyncPage() {
  const { 
    isOnline, 
    isSimulatedOffline, 
    toggleSimulatedOffline, 
    offlineQueue, 
    triggerSync, 
    isSyncing, 
    lastSyncResult,
    clearQueue 
  } = useOffline();

  const [syncFeedback, setSyncFeedback] = useState(null);

  const handleSyncNow = async () => {
    try {
      setSyncFeedback(null);
      const res = await triggerSync();
      setSyncFeedback({ success: true, count: res.synced_count, message: res.message });
    } catch (err) {
      setSyncFeedback({ success: false, message: err.message });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Status Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-sm">
            Prototype Offline Resilience
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-1">Offline Mode & Synchronization</h2>
          <p className="text-xs text-slate-500">
            Ensures encounters can be captured in remote non-network areas and synchronized seamlessly later.
          </p>
        </div>

        {/* Offline Simulation Toggle Button */}
        <button
          onClick={toggleSimulatedOffline}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs transition cursor-pointer border ${
            isSimulatedOffline
              ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
          }`}
        >
          {isSimulatedOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
          <span>{isSimulatedOffline ? 'Simulated Offline (Active)' : 'Simulate Offline Mode'}</span>
        </button>
      </div>

      {/* Network State Indicator Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${
        isOnline 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
          ) : (
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          )}
          <div>
            <span className="font-bold text-xs uppercase tracking-wide">
              {isOnline ? '🟢 Network Available' : '🟠 Offline Mode Active'}
            </span>
            <p className="text-[11px] mt-0.5">
              {isOnline 
                ? 'Ready to process and synchronize encounters directly with backend database.' 
                : 'Encounters will be stored in local device storage until connection is toggled online.'}
            </p>
          </div>
        </div>

        {isOnline && offlineQueue.length > 0 && (
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        )}
      </div>

      {syncFeedback && (
        <div className={`p-4 rounded-2xl text-xs font-semibold border ${
          syncFeedback.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {syncFeedback.success ? `✓ ${syncFeedback.message}` : `⚠ ${syncFeedback.message}`}
        </div>
      )}

      {/* Queued Encounters List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-sm text-slate-900">
            Encounters Awaiting Synchronization ({offlineQueue.length})
          </h3>
          {offlineQueue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
            >
              Clear Queue
            </button>
          )}
        </div>

        {offlineQueue.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No offline encounters waiting. All encounters are fully synchronized.
          </div>
        ) : (
          <div className="space-y-3">
            {offlineQueue.map((item) => (
              <div key={item.client_uuid} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-slate-900">Household {item.household_id}</span>
                  <p className="text-[11px] text-slate-500">Queued at: {new Date(item.timestamp).toLocaleTimeString()}</p>
                </div>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  Waiting for sync
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sync Disclaimer */}
      <div className="text-center text-[11px] text-slate-400 italic">
        * Prototype demonstration of offline local buffering and batch synchronization. No real government system integration.
      </div>
    </div>
  );
}
