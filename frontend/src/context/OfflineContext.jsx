import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncOfflineEncounters } from '../services/api';

const OfflineContext = createContext();

export function OfflineProvider({ children }) {
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    const saved = localStorage.getItem('asha_offline_queue');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('asha_offline_queue', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  // Overall effective online state: must be browser online AND not simulated offline
  const isOnline = browserOnline && !isSimulatedOffline;

  const toggleSimulatedOffline = () => {
    setIsSimulatedOffline(prev => !prev);
  };

  const addOfflineEncounter = (encounterData, durationSeconds = 30) => {
    const offlineItem = {
      client_uuid: 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      household_id: encounterData.household_id || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      duration_seconds: durationSeconds,
      data: encounterData
    };
    setOfflineQueue(prev => [offlineItem, ...prev]);
    return offlineItem;
  };

  const removeOfflineEncounter = (client_uuid) => {
    setOfflineQueue(prev => prev.filter(item => item.client_uuid !== client_uuid));
  };

  const clearQueue = () => {
    setOfflineQueue([]);
    localStorage.removeItem('asha_offline_queue');
  };

  const triggerSync = async () => {
    if (offlineQueue.length === 0) return { synced_count: 0 };
    if (!isOnline) {
      throw new Error('Cannot sync while offline. Please toggle online mode first.');
    }

    setIsSyncing(true);
    try {
      const res = await syncOfflineEncounters(offlineQueue);
      setLastSyncResult(res);
      setOfflineQueue([]);
      localStorage.removeItem('asha_offline_queue');
      return res;
    } catch (err) {
      console.error('Sync failed:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <OfflineContext.Provider value={{
      isOnline,
      browserOnline,
      isSimulatedOffline,
      toggleSimulatedOffline,
      offlineQueue,
      addOfflineEncounter,
      removeOfflineEncounter,
      clearQueue,
      triggerSync,
      isSyncing,
      lastSyncResult
    }}>
      {children}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => useContext(OfflineContext);
