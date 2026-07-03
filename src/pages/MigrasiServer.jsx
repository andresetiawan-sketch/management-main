import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Server, Globe, ArrowRightLeft, CheckCircle2, XCircle, Clock,
  AlertTriangle, RefreshCw, Shield, Zap, BookOpen, Settings,
  ChevronRight, Info, Wifi, WifiOff
} from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'pis_server_config';

const DEFAULT_CONFIG = {
  frontend_primary: window.location.origin,
  frontend_backup: '',
  backend_primary: '',
  backend_backup: '',
  failover_enabled: true,
  failover_timeout: 300, // detik = 5 menit
  active_backend: 'primary',
  last_failover: null,
};

function loadConfig() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? { ...DEFAULT_CONFIG, ...JSON.parse(s) } : { ...DEFAULT_CONFIG };
  } catch { return { ...DEFAULT_CONFIG }; }
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

function StatusDot({ status }) {
  const map = {
    online: 'bg-emerald-500',
    offline: 'bg-red-500',
    checking: 'bg-amber-400 animate-pulse',
    unknown: 'bg-gray-300',
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${map[status] || map.unknown}`} />;
}

function ServerCard({ label, url, status, onCheck, isActive, onSetActive, badge }) {
  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${isActive ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Server className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
          <span className="text-sm font-bold text-gray-700">{label}</span>
          {badge && <Badge className="text-[10px] bg-blue-100 text-blue-700 border-0">{badge}</Badge>}
          {isActive && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">Aktif</Badge>}
        </div>
        <div className="flex items-center gap-1.5">
          <StatusDot status={status} />
          <span className="text-xs text-gray-500 capitalize">{status === 'checking' ? 'Mengecek...' : status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Belum dicek'}</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2 truncate font-mono">{url || '—'}</p>
      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onCheck} disabled={!url || status === 'checking'}>
          <RefreshCw className={`w-3 h-3 ${status === 'checking' ? 'animate-spin' : ''}`} /> Cek Status
        </Button>
        {!isActive && url && status === 'online' && (
          <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onSetActive}>
            <ArrowRightLeft className="w-3 h-3" /> Gunakan Server Ini
          </Button>
        )}
      </div>
    </div>
  );
}

export default function MigrasiServer() {
  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';

  const [cfg, setCfg] = useState(loadConfig);
  const [statuses, setStatuses] = useState({
    frontend_primary: 'unknown',
    frontend_backup: 'unknown',
    backend_primary: 'unknown',
    backend_backup: 'unknown',
  });
  const [failoverLog, setFailoverLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pis_failover_log') || '[]'); } catch { return []; }
  });
  const failoverTimer = useRef(null);
  const backendFailTime = useRef(null);

  const update = (key, val) => {
    setCfg(prev => {
      const next = { ...prev, [key]: val };
      saveConfig(next);
      return next;
    });
  };

  const checkUrl = async (url) => {
    if (!url) return 'unknown';
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, mode: 'no-cors' });
      clearTimeout(timeout);
      return 'online';
    } catch {
      return 'offline';
    }
  };

  const checkServer = async (key) => {
    const url = cfg[key];
    if (!url) return;
    setStatuses(p => ({ ...p, [key]: 'checking' }));
    const status = await checkUrl(url);
    setStatuses(p => ({ ...p, [key]: status }));
    return status;
  };

  const checkAllServers = async () => {
    const keys = ['frontend_primary', 'frontend_backup', 'backend_primary', 'backend_backup'];
    await Promise.all(keys.map(k => checkServer(k)));
    toast.success('Status semua server diperbarui');
  };

  // Failover logic: cek backend primary setiap 1 menit
  useEffect(() => {
    if (!cfg.failover_enabled || !cfg.backend_primary) return;

    const interval = setInterval(async () => {
      const status = await checkUrl(cfg.backend_primary);
      setStatuses(p => ({ ...p, backend_primary: status }));

      if (status === 'offline') {
        if (!backendFailTime.current) {
          backendFailTime.current = Date.now();
        }
        const elapsed = (Date.now() - backendFailTime.current) / 1000;
        if (elapsed >= cfg.failover_timeout && cfg.active_backend === 'primary' && cfg.backend_backup) {
          // FAILOVER
          const log = { time: new Date().toLocaleString('id-ID'), from: 'Primary', to: 'Backup', reason: `Primary tidak merespon selama ${Math.round(elapsed)}s` };
          const newLog = [log, ...failoverLog].slice(0, 20);
          setFailoverLog(newLog);
          localStorage.setItem('pis_failover_log', JSON.stringify(newLog));
          update('active_backend', 'backup');
          update('last_failover', new Date().toISOString());
          toast.warning(`⚠️ Failover! Beralih ke server backup backend.`);
          backendFailTime.current = null;
        }
      } else {
        backendFailTime.current = null;
        // Auto restore primary if it's back and we're on backup
        if (status === 'online' && cfg.active_backend === 'backup') {
          const log = { time: new Date().toLocaleString('id-ID'), from: 'Backup', to: 'Primary', reason: 'Primary online kembali, restore otomatis' };
          const newLog = [log, ...failoverLog].slice(0, 20);
          setFailoverLog(newLog);
          localStorage.setItem('pis_failover_log', JSON.stringify(newLog));
          update('active_backend', 'primary');
          toast.success('✅ Server primary kembali online. Beralih kembali ke primary.');
        }
      }
    }, 60000); // cek setiap 1 menit

    return () => clearInterval(interval);
  }, [cfg.failover_enabled, cfg.backend_primary, cfg.backend_backup, cfg.active_backend, cfg.failover_timeout]);

  const activeBackendUrl = cfg.active_backend === 'primary' ? cfg.backend_primary : cfg.backend_backup;

  if (!isMasterAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <Shield className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="text-gray-500 text-sm">Hanya Master Admin yang dapat mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Server className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-800">Migrasi & Manajemen Server</h1>
            <p className="text-xs text-gray-500">Konfigurasi server frontend/backend + failover otomatis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cfg.active_backend === 'backup' && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-300 border animate-pulse">
              <AlertTriangle className="w-3 h-3 mr-1" /> Menggunakan Backup
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={checkAllServers} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Cek Semua
          </Button>
        </div>
      </div>

      <Tabs defaultValue="status">
        <TabsList className="bg-gray-100 w-full flex flex-wrap">
          <TabsTrigger value="status"><Wifi className="w-3.5 h-3.5 mr-1" />Status Server</TabsTrigger>
          <TabsTrigger value="config"><Settings className="w-3.5 h-3.5 mr-1" />Konfigurasi</TabsTrigger>
          <TabsTrigger value="failover"><Zap className="w-3.5 h-3.5 mr-1" />Failover Otomatis</TabsTrigger>
          <TabsTrigger value="log"><Clock className="w-3.5 h-3.5 mr-1" />Log Peralihan</TabsTrigger>
          <TabsTrigger value="panduan"><BookOpen className="w-3.5 h-3.5 mr-1" />Panduan Migrasi</TabsTrigger>
        </TabsList>

        {/* STATUS */}
        <TabsContent value="status" className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">🌐 Server Frontend</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ServerCard label="Frontend Primary" url={cfg.frontend_primary} status={statuses.frontend_primary}
                onCheck={() => checkServer('frontend_primary')} isActive badge="Utama" onSetActive={() => {}} />
              <ServerCard label="Frontend Backup" url={cfg.frontend_backup} status={statuses.frontend_backup}
                onCheck={() => checkServer('frontend_backup')} isActive={false} badge="Cadangan"
                onSetActive={() => { window.open(cfg.frontend_backup, '_blank'); }} />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">⚙️ Server Backend / API</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ServerCard label="Backend Primary" url={cfg.backend_primary} status={statuses.backend_primary}
                onCheck={() => checkServer('backend_primary')} isActive={cfg.active_backend === 'primary'} badge="Utama"
                onSetActive={() => update('active_backend', 'primary')} />
              <ServerCard label="Backend Backup" url={cfg.backend_backup} status={statuses.backend_backup}
                onCheck={() => checkServer('backend_backup')} isActive={cfg.active_backend === 'backup'} badge="Cadangan"
                onSetActive={() => update('active_backend', 'backup')} />
            </div>
          </div>

          {/* Active backend info */}
          <Card className="p-4 border-0 shadow-sm bg-indigo-50">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-indigo-500 font-semibold uppercase">Backend Aktif Saat Ini</p>
                <p className="text-sm font-bold text-indigo-800">{activeBackendUrl || 'Belum dikonfigurasi'}</p>
                <p className="text-xs text-indigo-400">{cfg.active_backend === 'primary' ? 'Server Utama' : '⚠️ Server Cadangan (Failover)'}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* KONFIGURASI */}
        <TabsContent value="config" className="mt-4 space-y-5">
          <Card className="p-5 border-0 shadow-sm space-y-4">
            <p className="text-sm font-bold text-gray-700 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-500" /> Frontend</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">URL Frontend Primary</Label>
                <Input value={cfg.frontend_primary} onChange={e => update('frontend_primary', e.target.value)} className="mt-1 h-9 text-sm font-mono" placeholder="https://app.domain.com" />
              </div>
              <div>
                <Label className="text-xs">URL Frontend Backup</Label>
                <Input value={cfg.frontend_backup} onChange={e => update('frontend_backup', e.target.value)} className="mt-1 h-9 text-sm font-mono" placeholder="https://backup.domain.com" />
              </div>
            </div>
          </Card>
          <Card className="p-5 border-0 shadow-sm space-y-4">
            <p className="text-sm font-bold text-gray-700 flex items-center gap-2"><Server className="w-4 h-4 text-purple-500" /> Backend / API</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">URL Backend Primary</Label>
                <Input value={cfg.backend_primary} onChange={e => update('backend_primary', e.target.value)} className="mt-1 h-9 text-sm font-mono" placeholder="https://api.domain.com" />
              </div>
              <div>
                <Label className="text-xs">URL Backend Backup</Label>
                <Input value={cfg.backend_backup} onChange={e => update('backend_backup', e.target.value)} className="mt-1 h-9 text-sm font-mono" placeholder="https://api2.domain.com" />
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <Info className="w-3.5 h-3.5 inline mr-1" /> Setelah mengubah URL backend, simpan dan lakukan pengujian koneksi.
            </div>
          </Card>
          <Button onClick={() => { saveConfig(cfg); toast.success('Konfigurasi server disimpan'); }} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full h-10">
            Simpan Konfigurasi
          </Button>
        </TabsContent>

        {/* FAILOVER */}
        <TabsContent value="failover" className="mt-4 space-y-4">
          <Card className="p-5 border-0 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-700">Failover Otomatis Backend</p>
                <p className="text-xs text-gray-500 mt-0.5">Beralih ke server backup jika primary tidak merespon</p>
              </div>
              <button
                onClick={() => update('failover_enabled', !cfg.failover_enabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${cfg.failover_enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${cfg.failover_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div>
              <Label className="text-xs">Batas Waktu Tidak Merespon (menit)</Label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="range" min={1} max={30} step={1}
                  value={Math.round(cfg.failover_timeout / 60)}
                  onChange={e => update('failover_timeout', Number(e.target.value) * 60)}
                  className="flex-1 accent-indigo-600"
                />
                <span className="text-lg font-bold text-indigo-600 w-12 text-center">
                  {Math.round(cfg.failover_timeout / 60)} mnt
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Saat ini diset: jika server primary tidak merespon selama <strong>{Math.round(cfg.failover_timeout / 60)} menit</strong>, sistem otomatis beralih ke server backup.</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center pt-2">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-lg font-bold text-blue-700">{Math.round(cfg.failover_timeout / 60)}m</p>
                <p className="text-[10px] text-blue-500">Timeout</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-lg font-bold text-purple-700">1m</p>
                <p className="text-[10px] text-purple-500">Interval Cek</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-lg font-bold text-emerald-700">{cfg.failover_enabled ? 'Aktif' : 'Off'}</p>
                <p className="text-[10px] text-emerald-500">Status</p>
              </div>
            </div>

            {cfg.last_failover && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                Failover terakhir: {new Date(cfg.last_failover).toLocaleString('id-ID')}
              </div>
            )}
          </Card>

          <Card className="p-4 border-0 shadow-sm">
            <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Cara Kerja Failover</p>
            <div className="space-y-2">
              {[
                { step: '1', text: 'Sistem melakukan ping ke server primary backend setiap 1 menit', color: 'bg-blue-100 text-blue-700' },
                { step: '2', text: `Jika primary tidak merespon selama ${Math.round(cfg.failover_timeout / 60)} menit berturut-turut`, color: 'bg-amber-100 text-amber-700' },
                { step: '3', text: 'Sistem otomatis beralih ke URL server backup', color: 'bg-orange-100 text-orange-700' },
                { step: '4', text: 'Notifikasi failover muncul di layar admin', color: 'bg-purple-100 text-purple-700' },
                { step: '5', text: 'Saat primary kembali online, sistem restore otomatis ke primary', color: 'bg-emerald-100 text-emerald-700' },
              ].map(s => (
                <div key={s.step} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${s.color}`}>{s.step}</span>
                  <p className="text-xs text-gray-600">{s.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* LOG */}
        <TabsContent value="log" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-700">Riwayat Peralihan Server</p>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFailoverLog([]); localStorage.removeItem('pis_failover_log'); toast.success('Log dihapus'); }}>
              Hapus Log
            </Button>
          </div>
          {failoverLog.length === 0 ? (
            <Card className="p-8 border-0 shadow-sm text-center">
              <CheckCircle2 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Belum ada riwayat peralihan server</p>
            </Card>
          ) : failoverLog.map((log, i) => (
            <Card key={i} className="p-4 border-0 shadow-sm">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${log.to === 'Backup' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  <ArrowRightLeft className={`w-4 h-4 ${log.to === 'Backup' ? 'text-amber-600' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">{log.from} → {log.to}</p>
                  <p className="text-xs text-gray-400">{log.reason}</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">{log.time}</p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* PANDUAN */}
        <TabsContent value="panduan" className="mt-4 space-y-4">
          <Card className="p-5 border-0 shadow-sm">
            <p className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" /> Panduan Migrasi Server
            </p>

            {[
              {
                title: '1. Persiapan Sebelum Migrasi',
                color: 'bg-blue-50 border-blue-200',
                titleColor: 'text-blue-700',
                steps: [
                  'Backup seluruh data dari dashboard Base44 (export entity data)',
                  'Catat semua URL API dan konfigurasi environment yang aktif',
                  'Pastikan server baru sudah siap dan dapat diakses publik',
                  'Uji koneksi server baru sebelum memulai migrasi',
                  'Jadwalkan migrasi di luar jam operasional (disarankan malam hari)',
                ]
              },
              {
                title: '2. Migrasi Frontend (Hosting)',
                color: 'bg-purple-50 border-purple-200',
                titleColor: 'text-purple-700',
                steps: [
                  'Build ulang aplikasi dengan perintah: npm run build',
                  'Upload folder dist/ ke hosting baru (Vercel / Netlify / VPS)',
                  'Konfigurasi environment variables: VITE_BASE44_APP_ID, VITE_BASE44_FUNCTIONS_VERSION',
                  'Set custom domain jika diperlukan dan update DNS',
                  'Test semua halaman di URL baru sebelum switch traffic',
                  'Update URL Frontend Primary di tab Konfigurasi di halaman ini',
                ]
              },
              {
                title: '3. Migrasi Backend / API',
                color: 'bg-emerald-50 border-emerald-200',
                titleColor: 'text-emerald-700',
                steps: [
                  'Backend functions berjalan di platform Base44 — tidak perlu deploy manual',
                  'Jika menggunakan custom API server: deploy ke server baru, update URL di Konfigurasi',
                  'Pastikan CORS dikonfigurasi untuk domain frontend baru',
                  'Uji semua endpoint dengan Cek Status sebelum mengaktifkan',
                  'Aktifkan server backup sebagai failover di tab Failover Otomatis',
                ]
              },
              {
                title: '4. Konfigurasi Failover',
                color: 'bg-amber-50 border-amber-200',
                titleColor: 'text-amber-700',
                steps: [
                  'Isi URL Backend Backup di tab Konfigurasi',
                  'Aktifkan toggle Failover Otomatis di tab Failover',
                  'Set timeout sesuai kebutuhan (default: 5 menit)',
                  'Sistem akan otomatis beralih ke backup jika primary tidak merespon',
                  'Periksa Log Peralihan secara berkala untuk monitoring',
                ]
              },
              {
                title: '5. Pasca Migrasi & Verifikasi',
                color: 'bg-red-50 border-red-200',
                titleColor: 'text-red-700',
                steps: [
                  'Test login dan semua fitur utama di server baru',
                  'Verifikasi data tersinkron dengan benar',
                  'Monitor error logs selama 24 jam pertama',
                  'Informasikan seluruh pengguna tentang URL baru',
                  'Nonaktifkan server lama setelah 7 hari berjalan stabil',
                ]
              },
            ].map((section, i) => (
              <div key={i} className={`rounded-xl border p-4 mb-3 ${section.color}`}>
                <p className={`text-sm font-bold mb-2 ${section.titleColor}`}>{section.title}</p>
                <ul className="space-y-1.5">
                  {section.steps.map((s, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-gray-600">
                      <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="bg-gray-900 rounded-xl p-4 mt-2">
              <p className="text-xs font-bold text-gray-300 mb-2">📋 Checklist Cepat Migrasi</p>
              {['Backup data selesai', 'Server baru siap & terkoneksi', 'Environment variables dikonfigurasi', 'Test frontend di URL baru', 'Test backend & API endpoint', 'Failover backup dikonfigurasi', 'Semua user diinformasikan', 'Monitor 24 jam pertama'].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-400 py-0.5">
                  <span className="w-4 h-4 border border-gray-600 rounded flex items-center justify-center text-[10px]">□</span>
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}