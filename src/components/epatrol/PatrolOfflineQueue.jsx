/**
 * PatrolOfflineQueue - Sistem antrian offline untuk E-Patroli
 * Menyimpan scan ke localStorage saat offline, sync otomatis saat online kembali
 */

import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { toast } from 'sonner';
import { WifiOff, Wifi, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const QUEUE_KEY = 'patrol_offline_queue';
const SESSION_HISTORY_KEY = 'patrol_session_history';

// ── Utility ──────────────────────────────────────────
export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch { return []; }
}

export function saveOfflineQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function addToOfflineQueue(record) {
  const queue = getOfflineQueue();
  const entry = { ...record, _queueId: Date.now().toString(), _queuedAt: new Date().toISOString(), _status: 'pending' };
  queue.push(entry);
  saveOfflineQueue(queue);
  // Also add to session history
  addToSessionHistory(entry);
  return entry;
}

export function getSessionHistory() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_HISTORY_KEY) || '[]');
  } catch { return []; }
}

export function addToSessionHistory(record) {
  const history = getSessionHistory();
  history.unshift({ ...record, _historyAt: new Date().toISOString() });
  // Keep last 50 items
  sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export function clearSessionHistory() {
  sessionStorage.removeItem(SESSION_HISTORY_KEY);
}

// ── Hook ──────────────────────────────────────────────
export function usePatrolOfflineSync(onSyncComplete) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(getOfflineQueue().length);
  const [syncing, setSyncing] = useState(false);

  const syncQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;
    setSyncing(true);
    const remaining = [];
    let synced = 0;
    for (const item of queue) {
      try {
        const { _queueId, _queuedAt, _status, ...data } = item;
        await base44.entities.EPatrol.create(data);
        synced++;
      } catch (err) {
        remaining.push({ ...item, _status: 'error', _lastError: err.message });
      }
    }
    saveOfflineQueue(remaining);
    setQueueCount(remaining.length);
    if (synced > 0) {
      toast.success(`✅ ${synced} data patroli offline berhasil disinkronisasi`);
      if (onSyncComplete) onSyncComplete();
    }
    setSyncing(false);
  }, [onSyncComplete]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Koneksi kembali — menyinkronisasi data offline...');
      setTimeout(() => syncQueue(), 1500);
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Koneksi terputus — scan tetap tersimpan lokal');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue]);

  const refreshQueueCount = () => setQueueCount(getOfflineQueue().length);

  return { isOnline, queueCount, syncing, syncQueue, refreshQueueCount };
}

// ── UI Components ──────────────────────────────────────
export function OfflineStatusBadge({ isOnline, queueCount, syncing, onSyncNow }) {
  if (isOnline && queueCount === 0) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
      isOnline ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-red-50 border border-red-200 text-red-700'
    }`}>
      {isOnline ? (
        <Wifi className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <WifiOff className="w-3.5 h-3.5" />
      )}
      <span>
        {isOnline ? 'Online' : 'Offline'}
        {queueCount > 0 && ` · ${queueCount} antrian belum tersinkron`}
      </span>
      {isOnline && queueCount > 0 && (
        <button
          onClick={onSyncNow}
          disabled={syncing}
          className="flex items-center gap-1 bg-amber-100 hover:bg-amber-200 rounded-lg px-2 py-0.5 text-amber-800 transition"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sync...' : 'Sync Sekarang'}
        </button>
      )}
    </div>
  );
}

export function PatrolSessionHistory() {
  const [history, setHistory] = useState(getSessionHistory());

  const refresh = () => setHistory(getSessionHistory());

  useEffect(() => {
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  if (history.length === 0) return (
    <div className="text-center py-8 text-gray-400">
      <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-xs">Belum ada scan dalam sesi ini</p>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-600">{history.length} scan dalam sesi ini</p>
        <button onClick={() => { clearSessionHistory(); refresh(); }} className="text-xs text-red-400 hover:text-red-600">Hapus Riwayat</button>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
        {history.map((item, idx) => (
          <div key={item._queueId || idx} className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${item._status === 'pending' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{item.checkpoint || '-'}</p>
              <p className="text-[10px] text-gray-400">{item.kondisi} · {item.area_tugas}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-gray-500">{item.waktu}</p>
              {item._status === 'pending'
                ? <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px] px-1">Antrian</Badge>
                : <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[9px] px-1">Tersimpan</Badge>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}