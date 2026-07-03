import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Shield, QrCode, ScanLine, Camera, MapPin, AlertTriangle, CheckCircle2, X, AlertCircle, ArrowLeft, Clock, History } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import EPatrolBarcodeManager from '@/components/epatrol/EPatrolBarcodeManager.jsx';
import QRCameraScanner from '@/components/epatrol/QRCameraScanner.jsx';
import FullscreenCamera from '@/components/camera/FullscreenCamera.jsx';
import { useGeofence } from '@/components/geofence/useGeofence';
import { toast } from 'sonner';
import {
  usePatrolOfflineSync,
  OfflineStatusBadge,
  PatrolSessionHistory,
  addToOfflineQueue,
  addToSessionHistory
} from '@/components/epatrol/PatrolOfflineQueue.jsx';

// Tindak Lanjut button for findings
function TindakLanjutBtn({ patrol, onSave }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState('');
  if (!open) return (
    <button onClick={() => setOpen(true)} className="text-xs text-orange-600 underline hover:text-orange-800">Tindak Lanjut</button>
  );
  return (
    <div className="flex gap-1 items-center">
      <input value={val} onChange={e => setVal(e.target.value)} className="border border-orange-300 rounded px-1 py-0.5 text-xs w-28" placeholder="Tindakan..." autoFocus />
      <button onClick={() => { if(val) { onSave(val); setOpen(false); } }} className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded">✓</button>
      <button onClick={() => setOpen(false)} className="text-xs text-gray-400">✗</button>
    </div>
  );
}

// Kondisi pilihan
const KONDISI_AMAN = ['TKA', 'Aman', 'Kondusif'];
const KONDISI_ALL = [...KONDISI_AMAN, 'Taruna'];

export default function EPatrol() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('data');
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraScanning, setCameraScanning] = useState(false);
  const [geoStatus, setGeoStatus] = useState(null);
  // Camera for kondisi photos
  const [photoMode, setPhotoMode] = useState(null); // 'foto1' | 'foto2'
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const scanRef = useRef(null);
  const queryClient = useQueryClient();
  const { checkLocation } = useGeofence();

  const { isOnline, queueCount, syncing, syncQueue, refreshQueueCount } = usePatrolOfflineSync(() => {
    queryClient.invalidateQueries({ queryKey: ['patrols'] });
    refreshQueueCount();
  });

  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isTaruna = form.kondisi === 'Taruna';
  const TINDAK_LANJUT_ROLES = ['Master Admin','Admin Pos Security','Admin Pos','Supervisor Security','Chief Security','Leader Security'];
  const empRole = employee?.role || employee?.jabatan || '';
  const canTindakLanjut = TINDAK_LANJUT_ROLES.includes(empRole);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 5);
    setForm({
      nik_karyawan: employee.nik_karyawan || '',
      nama_karyawan: employee.nama_lengkap || '',
      area_tugas: employee.area_tugas || '',
      jabatan: employee.jabatan || '',
      tanggal: today,
      waktu: now
    });
  }, []);

  const isMasterAdmin = ['Master Admin','Admin Pos','Chief Security','Supervisor Security','Admin Pos Security'].includes(empRole);
  const employeeArea = employee?.area_tugas || '';

  const { data: patrols = [], isLoading } = useQuery({
    queryKey: ['patrols', employeeArea],
    queryFn: () => employeeArea
      ? base44.entities.EPatrol.filter({ area_tugas: employeeArea }, '-created_date', 200)
      : base44.entities.EPatrol.list('-created_date', 200)
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-patrol'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  // Fetch active patrol templates for employee's area
  const { data: patrolTemplates = [] } = useQuery({
    queryKey: ['patrol-templates-area', employeeArea],
    queryFn: () => base44.entities.EPatrolTemplate.filter({ status: 'Aktif' }),
    select: (data) => data.filter(t => !t.area_tugas || t.area_tugas === employeeArea)
  });

  const createMutation = useMutation({
    mutationFn: async (d) => {
      if (!navigator.onLine) {
        // Simpan ke antrian offline
        addToOfflineQueue(d);
        return { _offline: true };
      }
      const result = await base44.entities.EPatrol.create(d);
      // Tambah ke riwayat sesi
      addToSessionHistory({ ...d, _status: 'saved' });
      return result;
    },
    onSuccess: (res) => {
      if (res?._offline) {
        toast.warning('📶 Offline — data disimpan ke antrian lokal');
      } else {
        queryClient.invalidateQueries({ queryKey: ['patrols'] });
      }
      refreshQueueCount();
      setShowForm(false);
      const today = new Date().toISOString().slice(0, 10);
      setForm({
        nik_karyawan: employee.nik_karyawan || '',
        nama_karyawan: employee.nama_lengkap || '',
        area_tugas: employee.area_tugas || '',
        jabatan: employee.jabatan || '',
        tanggal: today,
        waktu: new Date().toTimeString().slice(0, 5)
      });
      setErrors({});
    }
  });

  const handleCapture = async (dataUrl, mode) => {
    setPhotoMode(null);
    setShowForm(true);
    setUploadingPhoto(true);
    const blob = await fetch(dataUrl).then(r => r.blob());
    const file = new File([blob], 'patrol.jpg', { type: 'image/jpeg' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const field = mode === 'foto2' ? 'foto_temuan' : 'foto';
    setForm(prev => ({ ...prev, [field]: file_url }));
    setUploadingPhoto(false);
    toast.success('Foto tersimpan');
  };

  const stopCamera = () => setPhotoMode(null);

  const handleScanQR = async (value) => {
    const parts = value.trim().split('|');
    if (parts.length === 3 && parts[0] === 'PATROL') {
      const [, areaFromQR, checkpointName] = parts;
      setForm(prev => ({ ...prev, area_tugas: areaFromQR, checkpoint: checkpointName, waktu: new Date().toTimeString().slice(0, 5), tanggal: new Date().toISOString().slice(0, 10) }));
      toast.success(`✅ Checkpoint: ${checkpointName}`);
      setScanning(false); setCameraScanning(false); setScanInput('');
      const currentArea = areas.find(a => a.nama_area === areaFromQR);
      setGeoStatus('checking');
      const result = await checkLocation(currentArea);
      setGeoStatus(result.allowed || result.skipped ? 'allowed' : 'denied');
      if (!result.allowed && !result.skipped) toast.error(`Anda berada ${result.distance}m dari area.`);
      setShowForm(true);
    } else {
      toast.error('QR tidak valid. Format: PATROL|Area|Checkpoint');
    }
  };

  const validate = () => {
    const e = {};
    if (!form.checkpoint) e.checkpoint = 'Checkpoint wajib diisi';
    if (!form.kondisi) e.kondisi = 'Kondisi wajib dipilih';
    if (form.kondisi === 'Taruna' && !form.foto) e.foto = 'Foto Area Patroli wajib diambil';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const filtered = patrols.filter(p =>
    p.nama_karyawan?.toLowerCase().includes(search.toLowerCase()) || p.checkpoint?.toLowerCase().includes(search.toLowerCase())
  );
  const areasWithCheckpoints = areas.filter(a => (a.e_patrol_checkpoints || []).length > 0);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="text-gray-500 hover:text-gray-800 -ml-1">
          <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
        </Button>
        <OfflineStatusBadge isOnline={isOnline} queueCount={queueCount} syncing={syncing} onSyncNow={syncQueue} />
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="data" className="flex-1"><Shield className="w-4 h-4 mr-1" />Data Patroli</TabsTrigger>
          <TabsTrigger value="barcode" className="flex-1"><QrCode className="w-4 h-4 mr-1" />Titik & Barcode</TabsTrigger>
          <TabsTrigger value="history" className="flex-1"><Clock className="w-4 h-4 mr-1" />Riwayat Sesi</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-4 space-y-3">
          {/* Template E-Patroli integration banner */}
          {patrolTemplates.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Template Patroli Tersedia untuk Area Anda
              </p>
              <div className="flex flex-col gap-2">
                {patrolTemplates.map(t => (
                  <a
                    key={t.id}
                    href={`/EPatrolCustomPage?templateId=${t.id}`}
                    className="flex items-center justify-between bg-white border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-blue-800">{t.nama_template}</span>
                    <span className="text-xs text-blue-500">{t.jumlah_foto} foto →</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons - large tap targets for mobile */}
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={() => { setShowForm(true); setErrors({}); }} className="bg-red-800 hover:bg-red-700 h-12 text-base w-full">
              <Plus className="w-5 h-5 mr-2" /> Input Patroli (Standar)
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { setCameraScanning(true); setScanning(false); }} className="h-10 border-green-300 text-green-700 hover:bg-green-50">
                <Camera className="w-4 h-4 mr-2" /> Scan Barcode
              </Button>
              <Button variant="outline" onClick={() => { setScanning(!scanning); setTimeout(() => scanRef.current?.focus(), 100); }} className="h-10">
                <ScanLine className="w-4 h-4 mr-2" /> Scan Manual
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Cari nama / checkpoint..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 text-sm" />
          </div>

          {cameraScanning && (
            <div>
              <QRCameraScanner onResult={val => handleScanQR(val)} onClose={() => setCameraScanning(false)} />
            </div>
          )}

          {scanning && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2"><ScanLine className="w-4 h-4" /> Mode Scan QR Aktif</p>
              <Input ref={scanRef} value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScanQR(scanInput)} placeholder="Scan QR atau ketik: PATROL|Area|Checkpoint" className="border-green-300 h-10" autoFocus />
            </div>
          )}

          {/* Mobile card list */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="md:hidden divide-y divide-gray-50">
              {filtered.length === 0
                ? <p className="text-center py-10 text-gray-400 text-sm">Belum ada data patroli</p>
                : filtered.map(p => (
                  <div key={p.id} className={`p-4 space-y-2 ${p.kondisi === 'Taruna' ? 'bg-orange-50/40' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{p.nama_karyawan}</p>
                        <p className="text-xs text-gray-400">{p.tanggal} · {p.waktu}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${p.kondisi === 'Taruna' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                        {p.kondisi}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                      <div><span className="text-gray-400">Area:</span> {p.area_tugas}</div>
                      <div><span className="text-gray-400">Checkpoint:</span> {p.checkpoint}</div>
                    </div>
                    {(p.foto || p.foto_temuan) && (
                      <div className="flex gap-2">
                        {p.foto && <img src={p.foto} alt="Area" className="w-12 h-12 rounded-lg object-cover" />}
                        {p.foto_temuan && <img src={p.foto_temuan} alt="Temuan" className="w-12 h-12 rounded-lg object-cover border-2 border-orange-400" />}
                      </div>
                    )}
                    {canTindakLanjut && p.kondisi === 'Taruna' && (
                      <div>
                        {p.tindak_lanjut
                          ? <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded">✓ {p.tindak_lanjut}</span>
                          : <TindakLanjutBtn patrol={p} onSave={async (tl) => {
                              await base44.entities.EPatrol.update(p.id, { tindak_lanjut: tl });
                              queryClient.invalidateQueries({ queryKey: ['patrols'] });
                            }} />
                        }
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs">Waktu</TableHead>
                    <TableHead className="text-xs">Nama</TableHead>
                    <TableHead className="text-xs">Area</TableHead>
                    <TableHead className="text-xs">Checkpoint</TableHead>
                    <TableHead className="text-xs">Kondisi</TableHead>
                    <TableHead className="text-xs">Foto</TableHead>
                    {canTindakLanjut && <TableHead className="text-xs">Tindak Lanjut</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Belum ada data</TableCell></TableRow>
                    : filtered.map(p => (
                      <TableRow key={p.id} className={`hover:bg-gray-50/50 ${p.kondisi === 'Taruna' ? 'bg-orange-50/50' : ''}`}>
                        <TableCell className="text-sm">{p.tanggal}</TableCell>
                        <TableCell className="text-sm">{p.waktu}</TableCell>
                        <TableCell className="text-sm font-medium">{p.nama_karyawan}</TableCell>
                        <TableCell className="text-sm">{p.area_tugas}</TableCell>
                        <TableCell className="text-sm">{p.checkpoint}</TableCell>
                        <TableCell className="text-sm">
                          <span className={p.kondisi === 'Taruna' ? 'text-orange-600 font-semibold' : ''}>{p.kondisi}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {p.foto && <img src={p.foto} alt="Area" className="w-8 h-8 rounded object-cover" />}
                            {p.foto_temuan && <img src={p.foto_temuan} alt="Temuan" className="w-8 h-8 rounded object-cover border-2 border-orange-400" />}
                          </div>
                        </TableCell>
                        {canTindakLanjut && (
                          <TableCell>
                            {p.kondisi === 'Taruna' && (
                              p.tindak_lanjut
                                ? <span className="text-xs text-emerald-600 font-medium">✓ {p.tindak_lanjut}</span>
                                : <TindakLanjutBtn patrol={p} onSave={async (tl) => {
                                    await base44.entities.EPatrol.update(p.id, { tindak_lanjut: tl });
                                    queryClient.invalidateQueries({ queryKey: ['patrols'] });
                                  }} />
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="barcode" className="mt-4">
          <EPatrolBarcodeManager
            areas={areas}
            isMasterAdmin={isMasterAdmin}
            employeeArea={employeeArea}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Riwayat Scan Sesi Ini</h3>
            </div>
            <PatrolSessionHistory />
          </div>
        </TabsContent>
      </Tabs>

      {/* Fullscreen Camera */}
      {photoMode && (
        <FullscreenCamera
          title={photoMode === 'foto2' ? 'Foto Temuan' : 'Foto Area Patroli'}
          onCapture={(dataUrl) => handleCapture(dataUrl, photoMode)}
          onClose={() => { setPhotoMode(null); setShowForm(true); }}
        />
      )}

      {/* Input Form */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) stopCamera(); setShowForm(v); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Input E-Patroli</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {geoStatus === 'checking' && <div className="bg-blue-50 rounded-lg p-2 flex items-center gap-2 text-sm text-blue-700"><MapPin className="w-4 h-4 animate-pulse" /> Memeriksa lokasi GPS...</div>}
            {geoStatus === 'denied' && <div className="bg-red-50 rounded-lg p-2 flex items-center gap-2 text-sm text-red-700 font-medium"><AlertTriangle className="w-4 h-4" /> Anda berada di luar area tugas!</div>}
            {geoStatus === 'allowed' && <div className="bg-emerald-50 rounded-lg p-2 flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Lokasi terverifikasi</div>}

            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 mb-2">Informasi Petugas (Otomatis)</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs text-gray-500">NIK</Label><Input value={form.nik_karyawan || ''} readOnly className="h-8 text-sm bg-gray-100 cursor-not-allowed" /></div>
                <div><Label className="text-xs text-gray-500">Nama</Label><Input value={form.nama_karyawan || ''} readOnly className="h-8 text-sm bg-gray-100 cursor-not-allowed" /></div>
                <div><Label className="text-xs text-gray-500">Area Tugas</Label><Input value={form.area_tugas || ''} readOnly className="h-8 text-sm bg-gray-100 cursor-not-allowed" /></div>
                <div><Label className="text-xs text-gray-500">Jabatan</Label><Input value={form.jabatan || ''} readOnly className="h-8 text-sm bg-gray-100 cursor-not-allowed" /></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal</Label><Input type="date" value={form.tanggal || ''} onChange={e => setForm({...form, tanggal: e.target.value})} /></div>
              <div><Label>Waktu</Label><Input type="time" value={form.waktu || ''} onChange={e => setForm({...form, waktu: e.target.value})} /></div>
            </div>

            {/* Checkpoint → auto scan/select */}
            <div>
              <Label>Checkpoint *</Label>
              <div className="flex gap-2">
                <Select value={form.checkpoint || ''} onValueChange={v => setForm({...form, checkpoint: v})} className="flex-1">
                  <SelectTrigger><SelectValue placeholder="Pilih atau scan checkpoint..." /></SelectTrigger>
                  <SelectContent>
                    {areas.filter(a => a.nama_area === form.area_tugas).flatMap(a => a.e_patrol_checkpoints || []).map(cp => (
                      <SelectItem key={cp.id} value={cp.nama}>{cp.nama}</SelectItem>
                    ))}
                    <SelectItem value="__manual__">Input Manual</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="border-green-300 text-green-700" onClick={() => { setCameraScanning(true); setShowForm(false); }}>
                  <QrCode className="w-4 h-4" />
                </Button>
              </div>
              {form.checkpoint === '__manual__' && (
                <Input className="mt-2" placeholder="Nama checkpoint..." value={form._checkpointManual || ''} onChange={e => setForm({...form, _checkpointManual: e.target.value, checkpoint: e.target.value})} />
              )}
              {errors.checkpoint && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.checkpoint}</p>}
            </div>

            {/* Kondisi */}
            <div>
              <Label>Kondisi *</Label>
              <Select value={form.kondisi || ''} onValueChange={v => setForm({...form, kondisi: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih kondisi..." /></SelectTrigger>
                <SelectContent>
                  {KONDISI_ALL.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.kondisi && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.kondisi}</p>}
            </div>

            {/* Foto - logic berdasarkan kondisi */}
            {form.kondisi && KONDISI_AMAN.includes(form.kondisi) && (
              <div className="border rounded-xl p-3 bg-emerald-50/50 space-y-2">
                <Label className="text-sm font-semibold text-emerald-700">Foto Area Patroli</Label>
                {form.foto
                  ? <div className="flex items-center gap-2">
                      <img src={form.foto} className="w-20 h-20 rounded-lg object-cover border-2 border-emerald-300" />
                      <Button size="sm" variant="outline" onClick={() => setForm(p => ({...p, foto: null}))}><X className="w-3 h-3 mr-1" />Hapus</Button>
                    </div>
                  : <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setPhotoMode('foto1'); }} className="w-full border-emerald-300 text-emerald-700">
                     <Camera className="w-4 h-4 mr-2" /> Ambil Foto
                   </Button>
                  }
                  </div>
                  )}

                  {form.kondisi === 'Taruna' && (
                  <>
                  <div className="border rounded-xl p-3 bg-amber-50/50 space-y-2">
                  <Label className="text-sm font-semibold text-amber-700">Foto 1 — Area Patroli *</Label>
                  {form.foto
                   ? <div className="flex items-center gap-2">
                       <img src={form.foto} className="w-20 h-20 rounded-lg object-cover border-2 border-amber-300" />
                       <Button size="sm" variant="outline" onClick={() => setForm(p => ({...p, foto: null}))}><X className="w-3 h-3 mr-1" />Hapus</Button>
                     </div>
                   : <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setPhotoMode('foto1'); }} className="w-full border-amber-300 text-amber-700">
                       <Camera className="w-4 h-4 mr-2" /> Ambil Foto Area Patroli
                     </Button>
                  }
                  {errors.foto && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.foto}</p>}
                  </div>
                  <div className="border rounded-xl p-3 bg-orange-50/50 space-y-2">
                  <Label className="text-sm font-semibold text-orange-700">Foto 2 — Foto Temuan</Label>
                  {form.foto_temuan
                   ? <div className="flex items-center gap-2">
                       <img src={form.foto_temuan} className="w-20 h-20 rounded-lg object-cover border-2 border-orange-300" />
                       <Button size="sm" variant="outline" onClick={() => setForm(p => ({...p, foto_temuan: null}))}><X className="w-3 h-3 mr-1" />Hapus</Button>
                     </div>
                   : <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setPhotoMode('foto2'); }} className="w-full border-orange-300 text-orange-700">
                       <Camera className="w-4 h-4 mr-2" /> Ambil Foto Temuan
                     </Button>
                  }
                  </div>
                  <div>
                  <Label>Catatan Temuan</Label>
                  <Textarea value={form.catatan || ''} onChange={e => setForm({...form, catatan: e.target.value})} rows={3} placeholder="Jelaskan kondisi temuan..." />
                  </div>
                  </>
                  )}

                  {uploadingPhoto && (
                  <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-700">
                  <Camera className="w-4 h-4 animate-pulse" /> Mengupload foto...
                  </div>
                  )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); stopCamera(); }}>Batal</Button>
            <Button
              onClick={() => {
                if (!validate()) return;
                if (geoStatus === 'denied') { toast.error('Lokasi tidak sesuai area.'); return; }
                createMutation.mutate(form);
              }}
              disabled={createMutation.isPending || geoStatus === 'checking'}
              className="bg-orange-500 hover:bg-orange-600"
            >Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}