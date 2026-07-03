import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Camera, QrCode, ScanLine, Plus, X, ArrowLeft, AlertCircle, CheckCircle2, MapPin, AlertTriangle, Search } from 'lucide-react';
import FullscreenCamera from '@/components/camera/FullscreenCamera';
import QRCameraScanner from '@/components/epatrol/QRCameraScanner';
import { useGeofence } from '@/components/geofence/useGeofence';
import { toast } from 'sonner';

const KONDISI_ALL = ['TKA', 'Aman', 'Kondusif', 'Taruna'];

export default function EPatrolCustomPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const templateId = urlParams.get('templateId');

  const qc = useQueryClient();
  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const { checkLocation } = useGeofence();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [fotoEntries, setFotoEntries] = useState([]); // [{label, foto_url, keterangan}]
  const [currentFotoIdx, setCurrentFotoIdx] = useState(null); // index foto yang sedang difoto
  const [photoMode, setPhotoMode] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [scanning, setScanning] = useState(null); // index foto yang sedang manual scan
  const [cameraScanning, setCameraScanning] = useState(false);
  const [geoStatus, setGeoStatus] = useState(null);
  const [scanInput, setScanInput] = useState('');
  const [search, setSearch] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const scanRef = useRef(null);

  const DRAFT_KEY = `epatrol_draft_${templateId}`;

  // — Tiap foto punya checkpoint sendiri —
  // fotoEntries[i] = { label, foto_url, keterangan, checkpoint_scanned: bool }
  // Foto ke-i hanya bisa diambil setelah checkpoint di-scan untuk foto ke-i

  const { data: template, isLoading: loadingTemplate } = useQuery({
    queryKey: ['epatrol-template', templateId],
    queryFn: () => base44.entities.EPatrolTemplate.filter({ id: templateId }).then(r => r[0]),
    enabled: !!templateId
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-patrol-custom'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['epatrol-custom', templateId, employee.area_tugas],
    queryFn: () => base44.entities.EPatrolCustom.filter({ template_id: templateId, area_tugas: employee.area_tugas }, '-created_date', 100),
    enabled: !!templateId
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.EPatrolCustom.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epatrol-custom'] });
      setShowForm(false);
      clearDraft();
      resetForm();
      toast.success('Data patroli tersimpan');
    }
  });

  const resetForm = () => {
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      nik_karyawan: employee.nik_karyawan || '',
      nama_karyawan: employee.nama_lengkap || '',
      area_tugas: employee.area_tugas || '',
      jabatan: employee.jabatan || '',
      tanggal: today,
      waktu: new Date().toTimeString().slice(0, 5),
      kondisi: '',
      catatan: ''
    });
    if (template) {
      setFotoEntries((template.foto_configs || []).map(fc => ({
        label: fc.label,
        foto_url: '',
        keterangan: '',
        checkpoint_scanned: false,
        checkpoint_nama: '',
        riwayat: fc.riwayat_keterangan || []
      })));
    }
    setGeoStatus(null);
    setScanInput('');
    setCurrentFotoIdx(null);
  };

  // Auto-save draft ke localStorage setiap form/fotoEntries berubah
  useEffect(() => {
    if (!showForm || !templateId) return;
    const draft = { form, fotoEntries };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [form, fotoEntries, showForm]);

  // Cek apakah ada draft tersimpan saat template dimuat
  useEffect(() => {
    if (template) {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        setHasDraft(true);
      } else {
        resetForm();
      }
    }
  }, [template]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  const restoreDraft = () => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      const { form: savedForm, fotoEntries: savedEntries } = JSON.parse(saved);
      setForm(savedForm);
      setFotoEntries(savedEntries);
      setHasDraft(false);
      setShowForm(true);
    }
  };

  const openForm = () => {
    resetForm();
    clearDraft();
    setShowForm(true);
  };

  // Handle QR scan (kamera) untuk foto ke-idx — format: PATROL|Area|Checkpoint
  const handleScanForFoto = async (value, fotoIdx) => {
    const parts = value.trim().split('|');
    if (parts.length === 3 && parts[0] === 'PATROL') {
      const [, areaFromQR, checkpointName] = parts;
      setFotoEntries(prev => {
        const updated = [...prev];
        updated[fotoIdx] = { ...updated[fotoIdx], checkpoint_scanned: true, checkpoint_nama: checkpointName };
        return updated;
      });
      setForm(prev => ({ ...prev, area_tugas: areaFromQR, waktu: new Date().toTimeString().slice(0, 5), tanggal: new Date().toISOString().slice(0, 10) }));
      toast.success(`✅ Checkpoint Foto ${fotoIdx + 1}: ${checkpointName}`);
      setScanning(null);
      setCameraScanning(false);
      setScanInput('');
      setShowForm(true);

      const currentArea = areas.find(a => a.nama_area === areaFromQR);
      setGeoStatus('checking');
      const result = await checkLocation(currentArea);
      setGeoStatus(result.allowed || result.skipped ? 'allowed' : 'denied');
      if (!result.allowed && !result.skipped) toast.error(`Anda berada ${result.distance}m dari area.`);
    } else {
      toast.error('QR tidak valid. Format: PATROL|Area|Checkpoint');
      setShowForm(true);
    }
  };

  // Handle manual input checkpoint — petugas cukup ketik nama checkpoint
  const handleManualCheckpoint = (checkpointName, fotoIdx) => {
    const name = checkpointName.trim();
    if (!name) { toast.error('Nama checkpoint tidak boleh kosong'); return; }
    setFotoEntries(prev => {
      const updated = [...prev];
      updated[fotoIdx] = { ...updated[fotoIdx], checkpoint_scanned: true, checkpoint_nama: name };
      return updated;
    });
    setForm(prev => ({ ...prev, waktu: new Date().toTimeString().slice(0, 5), tanggal: new Date().toISOString().slice(0, 10) }));
    toast.success(`✅ Checkpoint Foto ${fotoIdx + 1}: ${name}`);
    setScanning(null);
    setScanInput('');
    // Langsung buka kamera foto
    setCurrentFotoIdx(fotoIdx);
    setShowForm(false);
    setPhotoMode(true);
  };

  const handleCapture = async (dataUrl, fotoIdx) => {
    setPhotoMode(false);
    setShowForm(true);
    setUploadingIdx(fotoIdx);
    const blob = await fetch(dataUrl).then(r => r.blob());
    const file = new File([blob], `patrol_${fotoIdx}.jpg`, { type: 'image/jpeg' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFotoEntries(prev => {
      const updated = [...prev];
      updated[fotoIdx] = { ...updated[fotoIdx], foto_url: file_url };
      return updated;
    });
    setUploadingIdx(null);
    toast.success(`Foto ${fotoIdx + 1} tersimpan`);
  };

  const validate = () => {
    if (!form.kondisi) { toast.error('Kondisi wajib dipilih'); return false; }
    for (let i = 0; i < fotoEntries.length; i++) {
      if (!fotoEntries[i].checkpoint_scanned) { toast.error(`Scan barcode untuk Foto ${i + 1} terlebih dahulu`); return false; }
      if (!fotoEntries[i].foto_url) { toast.error(`Foto ${i + 1} wajib diambil`); return false; }
    }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (geoStatus === 'denied') { toast.error('Lokasi tidak sesuai area.'); return; }
    createMutation.mutate({
      ...form,
      template_id: templateId,
      template_nama: template?.nama_template || '',
      foto_entries: fotoEntries.map(fe => ({
        label: fe.label,
        foto_url: fe.foto_url,
        keterangan: fe.keterangan,
        checkpoint: fe.checkpoint_nama
      })),
      checkpoint: fotoEntries.map(fe => fe.checkpoint_nama).join(', ')
    });
  };

  const filtered = records.filter(r =>
    r.nama_karyawan?.toLowerCase().includes(search.toLowerCase()) ||
    r.checkpoint?.toLowerCase().includes(search.toLowerCase())
  );

  if (loadingTemplate) return <Skeleton className="h-64 rounded-2xl" />;
  if (!template) return <div className="text-center text-gray-400 py-20">Template tidak ditemukan.</div>;

  return (
    <div className="max-w-2xl mx-auto pb-8 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="text-gray-500 -ml-1">
        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{template.nama_template}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{template.jumlah_foto} foto per checkpoint</p>
        </div>
        <Button onClick={openForm} className="bg-red-800 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-1" /> Input Patroli
        </Button>
      </div>

      {/* Draft recovery banner */}
      {hasDraft && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Ada data yang belum tersimpan</p>
            <p className="text-xs text-amber-600 mt-0.5">Sesi sebelumnya ditemukan. Lanjutkan atau mulai ulang?</p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={restoreDraft} className="bg-amber-500 hover:bg-amber-600 text-white h-7 text-xs">
                Lanjutkan Input
              </Button>
              <Button size="sm" variant="outline" onClick={() => { clearDraft(); resetForm(); }} className="h-7 text-xs border-amber-300 text-amber-700">
                Mulai Baru
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Cari nama / checkpoint..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 text-sm" />
      </div>

      {/* Records list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loadingRecords
          ? <Skeleton className="h-32 m-4" />
          : filtered.length === 0
            ? <p className="text-center py-10 text-gray-400 text-sm">Belum ada data patroli</p>
            : <div className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <div key={r.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{r.nama_karyawan}</p>
                        <p className="text-xs text-gray-400">{r.tanggal} · {r.waktu}</p>
                        <p className="text-xs text-gray-500">Checkpoint: {r.checkpoint}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${r.kondisi === 'Taruna' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                        {r.kondisi}
                      </span>
                    </div>
                    {(r.foto_entries || []).length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {r.foto_entries.map((fe, i) => fe.foto_url && (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <img src={fe.foto_url} className="w-14 h-14 rounded-lg object-cover border border-gray-200" alt={fe.label} />
                            <span className="text-xs text-gray-500">{fe.label}</span>
                            {fe.keterangan && <span className="text-xs text-blue-600 text-center max-w-16 truncate">{fe.keterangan}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
        }
      </div>

      {/* Fullscreen Camera */}
      {photoMode && currentFotoIdx !== null && (
        <FullscreenCamera
          title={`Foto ${currentFotoIdx + 1}: ${fotoEntries[currentFotoIdx]?.label || ''}`}
          onCapture={(dataUrl) => handleCapture(dataUrl, currentFotoIdx)}
          onClose={() => { setPhotoMode(false); setShowForm(true); }}
        />
      )}

      {/* QR Camera Scanner untuk foto tertentu */}
      {cameraScanning && currentFotoIdx !== null && !showForm && (
        <div className="fixed inset-0 z-50">
          <QRCameraScanner
            onResult={val => handleScanForFoto(val, currentFotoIdx)}
            onClose={() => { setCameraScanning(false); setShowForm(true); }}
          />
        </div>
      )}

      {/* Input Form */}
      <Dialog open={showForm} onOpenChange={v => setShowForm(v)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Input {template.nama_template}</DialogTitle></DialogHeader>

          <div className="space-y-3">
            {/* Geo status */}
            {geoStatus === 'checking' && <div className="bg-blue-50 rounded-lg p-2 flex items-center gap-2 text-sm text-blue-700"><MapPin className="w-4 h-4 animate-pulse" /> Memeriksa lokasi GPS...</div>}
            {geoStatus === 'denied' && <div className="bg-red-50 rounded-lg p-2 flex items-center gap-2 text-sm text-red-700 font-medium"><AlertTriangle className="w-4 h-4" /> Anda berada di luar area tugas!</div>}
            {geoStatus === 'allowed' && <div className="bg-emerald-50 rounded-lg p-2 flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Lokasi terverifikasi</div>}

            {/* Info petugas */}
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 mb-2">Informasi Petugas (Otomatis)</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs text-gray-500">NIK</Label><Input value={form.nik_karyawan || ''} readOnly className="h-8 text-sm bg-gray-100" /></div>
                <div><Label className="text-xs text-gray-500">Nama</Label><Input value={form.nama_karyawan || ''} readOnly className="h-8 text-sm bg-gray-100" /></div>
                <div><Label className="text-xs text-gray-500">Area</Label><Input value={form.area_tugas || ''} readOnly className="h-8 text-sm bg-gray-100" /></div>
                <div><Label className="text-xs text-gray-500">Jabatan</Label><Input value={form.jabatan || ''} readOnly className="h-8 text-sm bg-gray-100" /></div>
              </div>
            </div>

            {/* Tanggal & Waktu */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal</Label><Input type="date" value={form.tanggal || ''} onChange={e => setForm(p => ({...p, tanggal: e.target.value}))} /></div>
              <div><Label>Waktu</Label><Input type="time" value={form.waktu || ''} onChange={e => setForm(p => ({...p, waktu: e.target.value}))} /></div>
            </div>

            {/* Kondisi */}
            <div>
              <Label>Kondisi *</Label>
              <Select value={form.kondisi || ''} onValueChange={v => setForm(p => ({...p, kondisi: v}))}>
                <SelectTrigger><SelectValue placeholder="Pilih kondisi..." /></SelectTrigger>
                <SelectContent>
                  {KONDISI_ALL.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Foto entries — masing-masing perlu scan barcode dulu */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Foto Patroli ({template.jumlah_foto} Foto)</Label>
              {fotoEntries.map((fe, i) => (
                <div key={i} className={`border rounded-xl p-3 space-y-2 ${fe.checkpoint_scanned ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-gray-50/50'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Foto {i + 1}: {fe.label}</p>
                    {fe.checkpoint_scanned
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{fe.checkpoint_nama}</span>
                      : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Belum scan</span>
                    }
                  </div>

                  {/* Scan barcode untuk foto ini */}
                  {!fe.checkpoint_scanned && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">Scan barcode checkpoint untuk mengaktifkan foto ini</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-green-300 text-green-700" onClick={() => {
                          setCurrentFotoIdx(i);
                          setShowForm(false);
                          setCameraScanning(true);
                        }}>
                          <QrCode className="w-4 h-4 mr-1" /> Scan Barcode
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setCurrentFotoIdx(i);
                          setScanning(s => s === i ? null : i);
                        }}>
                          <ScanLine className="w-4 h-4 mr-1" /> Manual
                        </Button>
                      </div>
                      {scanning === i && (
                        <div className="flex gap-2">
                          <Input
                            ref={scanRef}
                            value={scanInput}
                            onChange={e => setScanInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleManualCheckpoint(scanInput, i);
                            }}
                            placeholder="Ketik nama checkpoint, lalu Enter"
                            className="border-green-300 h-9 text-sm flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                            onClick={() => handleManualCheckpoint(scanInput, i)}
                          >
                            OK
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Foto & Keterangan — hanya aktif setelah scan */}
                  {fe.checkpoint_scanned && (
                    <div className="space-y-2">
                      {/* Foto */}
                      {fe.foto_url
                        ? <div className="flex items-center gap-2">
                            <img src={fe.foto_url} className="w-20 h-20 rounded-lg object-cover border-2 border-green-300" alt={fe.label} />
                            <Button size="sm" variant="outline" onClick={() => setFotoEntries(prev => { const u = [...prev]; u[i] = {...u[i], foto_url: ''}; return u; })}>
                              <X className="w-3 h-3 mr-1" /> Hapus
                            </Button>
                          </div>
                        : <div>
                            {uploadingIdx === i
                              ? <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg p-2"><Camera className="w-4 h-4 animate-pulse" /> Mengupload foto...</div>
                              : <Button size="sm" variant="outline" className="w-full border-blue-300 text-blue-700" onClick={() => {
                                  setCurrentFotoIdx(i);
                                  setShowForm(false);
                                  setPhotoMode(true);
                                }}>
                                  <Camera className="w-4 h-4 mr-2" /> Ambil Foto {i + 1}
                                </Button>
                            }
                          </div>
                      }

                      {/* Keterangan dengan riwayat sebagai pilihan */}
                      <div>
                        <Label className="text-xs">Keterangan</Label>
                        {(fe.riwayat || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {fe.riwayat.map((k, j) => (
                              <button
                                key={j}
                                type="button"
                                onClick={() => setFotoEntries(prev => { const u = [...prev]; u[i] = {...u[i], keterangan: k}; return u; })}
                                className={`text-xs px-2 py-0.5 rounded-full border transition-all ${fe.keterangan === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                              >
                                {k}
                              </button>
                            ))}
                          </div>
                        )}
                        <Input
                          value={fe.keterangan}
                          onChange={e => setFotoEntries(prev => { const u = [...prev]; u[i] = {...u[i], keterangan: e.target.value}; return u; })}
                          placeholder="Tulis atau pilih keterangan di atas..."
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Catatan tambahan */}
            <div>
              <Label>Catatan Tambahan</Label>
              <Input value={form.catatan || ''} onChange={e => setForm(p => ({...p, catatan: e.target.value}))} placeholder="Opsional..." className="text-sm" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || geoStatus === 'checking'}
              className="bg-red-800 hover:bg-red-700"
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}