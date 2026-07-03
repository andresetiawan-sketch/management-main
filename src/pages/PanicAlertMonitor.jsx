import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, MapPin, Clock, User, CheckCircle2, PhoneCall, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRef } from 'react';

const statusColor = {
  'Aktif': 'bg-red-100 text-red-700 border-red-300',
  'Direspons': 'bg-orange-100 text-orange-700 border-orange-300',
  'Selesai': 'bg-emerald-100 text-emerald-700 border-emerald-300',
};

// Generate alarm sound using Web Audio API
function playAlarm(audioCtxRef) {
  try {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    // Play 3 rapid beeps
    [0, 0.35, 0.70, 1.05, 1.40, 1.75].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime + offset);
      osc.frequency.setValueAtTime(660, ctx.currentTime + offset + 0.15);
      gain.gain.setValueAtTime(0.8, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.3);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.3);
    });
  } catch (e) {}
}

export default function PanicAlertMonitor() {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMasterAdmin = emp?.role === 'Master Admin' || emp?.jabatan === 'Master Admin';
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [catatan, setCatatan] = useState('');
  const [alarmAlert, setAlarmAlert] = useState(null); // popup alarm layar penuh
  const [alarmDismissed, setAlarmDismissed] = useState(new Set());
  const audioCtxRef = useRef(null);
  const alarmIntervalRef = useRef(null);
  const prevIdsRef = useRef(new Set());

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['panic-alerts'],
    queryFn: () => base44.entities.PanicAlert.list('-created_date', 100),
    refetchInterval: 10000,
  });

  const respondMut = useMutation({
    mutationFn: ({ id, status }) => base44.entities.PanicAlert.update(id, {
      status,
      responder_nama: emp.nama_lengkap,
      responder_nik: emp.nik_karyawan,
      catatan_responder: catatan,
      waktu_respons: new Date().toLocaleString('id-ID'),
    }),
    onSuccess: () => { toast.success('Respons berhasil disimpan'); qc.invalidateQueries(['panic-alerts']); setSelected(null); setCatatan(''); }
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.PanicAlert.delete(id),
    onSuccess: () => { toast.success('Alert dihapus'); qc.invalidateQueries(['panic-alerts']); setSelected(null); }
  });

  const deleteAllMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await base44.entities.PanicAlert.delete(id);
      }
    },
    onSuccess: () => { toast.success('Semua alert dihapus'); qc.invalidateQueries(['panic-alerts']); }
  });

  const handleDeleteSingle = (id) => {
    if (confirm('Hapus alert ini?')) {
      deleteMut.mutate(id);
    }
  };

  const handleDeleteAll = () => {
    if (confirm('Hapus SEMUA alert darurat? Tindakan ini tidak dapat dibatalkan.')) {
      deleteAllMutation.mutate(alerts.map(a => a.id));
    }
  };

  // Detect new PanicAlert & trigger alarm
  useEffect(() => {
    const aktif = alerts.filter(a => a.status === 'Aktif');
    // Find truly new alerts not seen before
    const newAlerts = aktif.filter(a => !prevIdsRef.current.has(a.id) && !alarmDismissed.has(a.id));
    if (newAlerts.length > 0 && isMasterAdmin) {
      setAlarmAlert(newAlerts[0]);
      // Play alarm immediately and repeat
      playAlarm(audioCtxRef);
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = setInterval(() => playAlarm(audioCtxRef), 3000);
    }
    // Update seen IDs
    aktif.forEach(a => prevIdsRef.current.add(a.id));

    if (aktif.length > 0) {
      document.title = `🚨 ${aktif.length} DARURAT! - Monitor`;
    } else {
      document.title = 'Monitor Darurat';
      // Stop alarm if no active alerts
      if (alarmIntervalRef.current) { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; }
      setAlarmAlert(null);
    }
  }, [alerts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current); };
  }, []);

  const dismissAlarm = () => {
    if (alarmAlert) setAlarmDismissed(prev => new Set([...prev, alarmAlert.id]));
    setAlarmAlert(null);
    if (alarmIntervalRef.current) { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; }
  };

  const aktifAlerts = alerts.filter(a => a.status === 'Aktif');
  const resolvedAlerts = alerts.filter(a => a.status !== 'Aktif');

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-6">
      {/* ALARM LAYAR PENUH */}
      {alarmAlert && isMasterAdmin && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-red-700 animate-pulse">
          <div className="text-center px-6">
            <div className="text-8xl mb-4">🚨</div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-widest">SOS DARURAT!</h1>
            <p className="text-2xl font-bold text-white mb-1">{alarmAlert.nama_karyawan}</p>
            <p className="text-lg text-red-200 mb-1">{alarmAlert.jabatan}</p>
            <p className="text-xl text-white font-semibold mb-1 flex items-center justify-center gap-2">
              <MapPin className="w-5 h-5" /> {alarmAlert.area_tugas}
            </p>
            <p className="text-red-200 mb-2">{alarmAlert.waktu_darurat}</p>
            {alarmAlert.deskripsi && (
              <p className="bg-red-800/60 rounded-xl px-4 py-2 text-white text-sm mb-4">{alarmAlert.deskripsi}</p>
            )}
            {alarmAlert.latitude && (
              <a href={`https://maps.google.com/?q=${alarmAlert.latitude},${alarmAlert.longitude}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-yellow-300 underline text-sm mb-4">
                <MapPin className="w-4 h-4" /> Buka di Google Maps
              </a>
            )}
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={dismissAlarm}
                className="bg-white text-red-700 font-black px-8 py-3 rounded-2xl text-lg shadow-lg hover:bg-red-50 transition flex items-center gap-2"
              >
                <X className="w-5 h-5" /> Tutup Alarm
              </button>
              <button
                onClick={() => { dismissAlarm(); setSelected(alarmAlert); }}
                className="bg-yellow-400 text-red-900 font-black px-8 py-3 rounded-2xl text-lg shadow-lg hover:bg-yellow-300 transition flex items-center gap-2"
              >
                <PhoneCall className="w-5 h-5" /> Respons Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className={`rounded-2xl p-5 ${aktifAlerts.length > 0 ? 'bg-red-700 text-white' : 'bg-white shadow-sm'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${aktifAlerts.length > 0 ? 'bg-white/20' : 'bg-red-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${aktifAlerts.length > 0 ? 'text-white animate-pulse' : 'text-red-600'}`} />
          </div>
          <div>
            <h1 className={`text-lg font-black ${aktifAlerts.length > 0 ? 'text-white' : 'text-gray-800'}`}>Monitor Sinyal Darurat</h1>
            <p className={`text-xs ${aktifAlerts.length > 0 ? 'text-white/80' : 'text-gray-500'}`}>
              {aktifAlerts.length > 0 ? `${aktifAlerts.length} sinyal darurat AKTIF!` : 'Semua kondisi normal'}
            </p>
          </div>
          {aktifAlerts.length > 0 && (
            <Badge className="ml-auto bg-white text-red-700 font-black text-sm animate-pulse border-0">
              {aktifAlerts.length} SOS AKTIF
            </Badge>
          )}
        </div>
        {alerts.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleDeleteAll} className="ml-auto text-red-600 border-red-300 hover:bg-red-50">
            <X className="w-4 h-4 mr-1" /> Hapus Semua ({alerts.length})
          </Button>
        )}
      </div>

      {/* Active Alerts */}
      {aktifAlerts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wide">🚨 Sinyal Aktif — Perlu Respons Segera</p>
          {aktifAlerts.map(alert => (
            <Card key={alert.id} className="border-red-300 border-2 bg-red-50 shadow-md p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-red-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-700 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-red-800">{alert.nama_karyawan}</span>
                    <Badge className="bg-red-600 text-white border-0 text-[10px] animate-pulse">SOS AKTIF</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-red-700">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{alert.jabatan}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{alert.area_tugas}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{alert.waktu_darurat}</span>
                  </div>
                  {alert.latitude && (
                    <a href={`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 underline mt-1">
                      <MapPin className="w-3 h-3" /> Buka di Google Maps
                    </a>
                  )}
                  {alert.deskripsi && <p className="text-xs text-red-800 mt-1 bg-red-100 rounded p-1.5">{alert.deskripsi}</p>}
                  {alert.foto_kejadian && <img src={alert.foto_kejadian} alt="Foto Bukti" className="mt-2 w-24 h-20 object-cover rounded-lg border border-red-300" />}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white gap-1" onClick={() => { setSelected(alert); setCatatan(''); respondMut.mutate({ id: alert.id, status: 'Direspons' }); }}>
                  <PhoneCall className="w-3.5 h-3.5" /> Saya Respons
                </Button>
                <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => setSelected(alert)}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selesaikan
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleDeleteSingle(alert.id)}>
                  <X className="w-3.5 h-3.5" /> Hapus
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isLoading && <div className="space-y-2">{Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />)}</div>}

      {/* Resolved History */}
      {resolvedAlerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Riwayat Kejadian</p>
          {resolvedAlerts.map(alert => (
            <Card key={alert.id} className="p-4 border-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${alert.status === 'Selesai' ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                  <AlertTriangle className={`w-4 h-4 ${alert.status === 'Selesai' ? 'text-emerald-600' : 'text-orange-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{alert.nama_karyawan} — {alert.area_tugas}</p>
                  <p className="text-xs text-gray-400">{alert.waktu_darurat} {alert.responder_nama ? `· Direspons: ${alert.responder_nama}` : ''}</p>
                </div>
                <Badge className={`text-xs border shrink-0 ${statusColor[alert.status]}`}>{alert.status}</Badge>
                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => setSelected(alert)}>Detail</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && alerts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Tidak ada kejadian darurat</p>
        </div>
      )}

      {/* Detail / Resolve Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detail Sinyal Darurat</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                <p><span className="text-gray-500">Petugas:</span> <strong>{selected.nama_karyawan}</strong> ({selected.jabatan})</p>
                <p><span className="text-gray-500">Area:</span> {selected.area_tugas}</p>
                <p><span className="text-gray-500">Waktu:</span> {selected.waktu_darurat}</p>
                {selected.latitude && <p><span className="text-gray-500">GPS:</span> <a href={`https://maps.google.com/?q=${selected.latitude},${selected.longitude}`} target="_blank" rel="noreferrer" className="text-blue-600 underline">{selected.latitude?.toFixed(5)}, {selected.longitude?.toFixed(5)}</a></p>}
                {selected.deskripsi && <p><span className="text-gray-500">Deskripsi:</span> {selected.deskripsi}</p>}
              </div>
              {selected.foto_kejadian && <img src={selected.foto_kejadian} alt="Bukti" className="w-full max-h-48 object-cover rounded-xl" />}
              {selected.status !== 'Selesai' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">Catatan Responder</label>
                  <Textarea value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Catatan penanganan..." className="text-sm h-20 resize-none" />
                  <Button onClick={() => respondMut.mutate({ id: selected.id, status: 'Selesai' })} disabled={respondMut.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                    {respondMut.isPending ? 'Menyimpan...' : 'Tandai Selesai'}
                  </Button>
                </div>
              )}
              {selected.catatan_responder && (
                <div className="bg-emerald-50 rounded-xl p-3 text-xs">
                  <p className="font-medium text-emerald-700">Catatan: {selected.catatan_responder}</p>
                  <p className="text-emerald-600">Oleh: {selected.responder_nama} · {selected.waktu_respons}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}