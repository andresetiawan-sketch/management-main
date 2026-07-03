import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, CalendarClock, Plus, Camera, X, Clock, MapPin, AlertTriangle, CheckCircle2, LogOut, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useGeofence } from '@/components/geofence/useGeofence';
import { createPageUrl } from '@/utils';

const statusColor = {
  Hadir: 'bg-emerald-100 text-emerald-800',
  Terlambat: 'bg-yellow-100 text-yellow-800',
  Backup: 'bg-blue-100 text-blue-800',
  Sakit: 'bg-orange-100 text-orange-800',
  Izin: 'bg-amber-100 text-amber-800',
  Cuti: 'bg-purple-100 text-purple-800',
  Alfa: 'bg-red-100 text-red-800'
};

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Real-time clock hook
function useRealTimeClock() {
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date().toTimeString().slice(0, 5)), 10000);
    return () => clearInterval(iv);
  }, []);
  return time;
}

export default function Attendance() {
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [matchedShift, setMatchedShift] = useState(null);
  const [photoMode, setPhotoMode] = useState(null); // 'hadir' | 'pulang'
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [geoStatus, setGeoStatus] = useState(null); // null | 'checking' | 'allowed' | 'denied'
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const queryClient = useQueryClient();
  const { checkLocation, loading: geoLoading } = useGeofence();
  const realTime = useRealTimeClock();

  const employee = (() => {
    try { return JSON.parse(localStorage.getItem('pis_employee') || '{}'); } catch { return {}; }
  })();
  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';
  const isAdmin = ['Master Admin', 'Admin Pos', 'Chief Security', 'Leader Security'].includes(employee?.role || employee?.jabatan);

  const { data: attendances = [], isLoading } = useQuery({
    queryKey: ['attendance', filterDate, employee?.nik_karyawan],
    queryFn: async () => {
      if (isMasterAdmin || isAdmin) {
        return filterDate ?
        base44.entities.Attendance.filter({ tanggal: filterDate }, '-created_date', 500) :
        base44.entities.Attendance.list('-created_date', 500);
      } else {
        return filterDate ?
        base44.entities.Attendance.filter({ nik_karyawan: employee.nik_karyawan, tanggal: filterDate }, '-created_date', 200) :
        base44.entities.Attendance.filter({ nik_karyawan: employee.nik_karyawan }, '-tanggal', 200);
      }
    }
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-absensi'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts-absensi'],
    queryFn: () => base44.entities.ShiftSchedule.list('-tanggal', 500)
  });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 5);
    const initialForm = {
      nik_karyawan: employee.nik_karyawan || '',
      nama_karyawan: employee.nama_lengkap || '',
      area_tugas: employee.area_tugas || '',
      jabatan: employee.jabatan || '',
      regu: employee.regu || '',
      tanggal: today,
      jam_hadir: now,
      status: 'Hadir'
    };
    setForm(initialForm);

    if (employee.area_tugas && employee.regu) {
      const todayShift = shifts.find((s) =>
      s.area_tugas === employee.area_tugas &&
      s.regu === employee.regu &&
      s.tanggal === today
      );
      if (todayShift) {
        setMatchedShift(todayShift);
        setForm((prev) => ({
          ...prev,
          shift_id: todayShift.id,
          tipe_shift: todayShift.tipe_shift,
          jam_shift_mulai: todayShift.jam_mulai,
          jam_shift_selesai: todayShift.jam_selesai
        }));
      }
    }
  }, [shifts]);

  // Auto detect terlambat
  useEffect(() => {
    if (form.jam_hadir && form.jam_shift_mulai && form.status === 'Hadir') {
      const hadirMins = timeToMinutes(form.jam_hadir);
      const shiftMins = timeToMinutes(form.jam_shift_mulai);
      setForm((prev) => ({ ...prev, status: hadirMins > shiftMins + 5 ? 'Terlambat' : 'Hadir' }));
    }
  }, [form.jam_hadir, form.jam_shift_mulai]);

  // Sync real time clock into form.jam_hadir only when form is first opened
  const handleOpenForm = async () => {
    const now = new Date().toTimeString().slice(0, 5);
    setForm((prev) => ({ ...prev, jam_hadir: now }));
    setGeoStatus(null);
    setShowForm(true);

    // Geofencing check
    const currentArea = areas.find((a) => a.nama_area === employee.area_tugas);
    if (currentArea?.latitude && currentArea?.longitude) {
      setGeoStatus('checking');
      const result = await checkLocation(currentArea);
      if (result.allowed) {
        setGeoStatus('allowed');
        toast.success(`Lokasi terverifikasi (${result.distance}m dari area)`);
      } else if (result.skipped) {
        setGeoStatus('allowed');
      } else {
        setGeoStatus('denied');
        toast.error(`Anda berada ${result.distance}m dari area. Batas: ${result.radius}m`);
      }
    } else {
      setGeoStatus('allowed');
    }
  };

  const startCamera = async (mode) => {
    setPhotoMode(mode);
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      toast.error('Tidak bisa mengakses kamera');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setPhotoMode(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8));
    stopCamera();
  };

  const uploadAndSetPhoto = async () => {
    if (!capturedPhoto) return;
    setUploadingPhoto(true);
    const blob = await fetch(capturedPhoto).then((r) => r.blob());
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (photoMode === 'hadir') {
      setForm((prev) => ({ ...prev, foto_hadir: file_url }));
    } else {
      setForm((prev) => ({ ...prev, foto_pulang: file_url }));
    }
    setCapturedPhoto(null);
    setPhotoMode(null);
    setUploadingPhoto(false);
    toast.success('Foto berhasil disimpan');
  };

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.Attendance.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setShowForm(false);
      toast.success('Absensi berhasil disimpan');
    }
  });

  // Check if employee already clocked-in today
  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = attendances.find((a) =>
  a.nik_karyawan === employee.nik_karyawan && a.tanggal === today
  );
  const alreadyHadir = !!todayRecord?.jam_hadir;
  const alreadyPulang = !!todayRecord?.jam_pulang;

  // Check if shift exists for today (for non-admin employees)
  const todayShiftForEmployee = shifts.find((s) =>
  s.area_tugas === employee.area_tugas &&
  s.regu === employee.regu &&
  s.tanggal === today
  );
  const shiftBelumDibuat = !isAdmin && !isMasterAdmin && !todayShiftForEmployee;

  // Check if it's past shift end time (to show Absen Pulang button)
  const nowMinutes = (() => {
    const [h, m] = new Date().toTimeString().slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  })();
  const shiftEndMinutes = todayShiftForEmployee?.jam_selesai ?
  (() => {const [h, m] = todayShiftForEmployee.jam_selesai.split(':').map(Number);return h * 60 + m;})() :
  null;
  // Allow Pulang 30 min before shift ends or anytime after
  const canPulang = shiftEndMinutes === null || nowMinutes >= shiftEndMinutes - 30;

  // Lembur: if already pulang and wants another attendance (overtime)
  const isLemburMode = alreadyHadir && alreadyPulang && !isAdmin && !isMasterAdmin;

  // Redirect if Cuti/Sakit/Izin is selected
  const handleStatusChange = (v) => {
    if (['Cuti', 'Sakit', 'Izin'].includes(v)) {
      setShowForm(false);
      window.location.href = createPageUrl('Cuti');
      toast.info(`Anda akan diarahkan ke form ${v}`);
      return;
    }
    setForm({ ...form, status: v });
  };

  const handlePulang = async () => {
    if (!todayRecord) return;
    const now = new Date().toTimeString().slice(0, 5);
    const { file_url } = form.foto_pulang ? { file_url: form.foto_pulang } : { file_url: null };
    await base44.entities.Attendance.update(todayRecord.id, {
      jam_pulang: now,
      ...(form.foto_pulang ? { foto_pulang: form.foto_pulang } : {})
    });
    queryClient.invalidateQueries({ queryKey: ['attendance'] });
    setShowForm(false);
    toast.success('Jam pulang berhasil dicatat');
  };

  const handleSave = () => {
    // Block if geofence denied
    if (geoStatus === 'denied' && !isAdmin) {
      toast.error('Lokasi Anda tidak berada di area tugas. Absensi tidak dapat disimpan.');
      return;
    }
    // Block non-admin absen hadir jika shift belum dibuat
    if (!isAdmin && !isMasterAdmin && !alreadyHadir && !todayShiftForEmployee) {
      toast.error('Jadwal shift belum dibuat untuk regu Anda hari ini. Hubungi atasan.');
      return;
    }
    // Block duplicate non-admin absen hadir (not lembur mode)
    if (!isAdmin && !isMasterAdmin && alreadyHadir && !alreadyPulang) {
      toast.error('Anda sudah absen hadir hari ini. Gunakan tombol Absen Pulang.');
      return;
    }
    const saveData = isLemburMode ? { ...form, status: 'Hadir', catatan: 'Lembur' } : form;
    createMutation.mutate(saveData);
  };

  const filtered = attendances.filter((a) => {
    const matchSearch = a.nama_karyawan?.toLowerCase().includes(search.toLowerCase()) || a.nik_karyawan?.includes(search);
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-6">
      <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="text-gray-500 hover:text-gray-800 -ml-1">
        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
      </Button>

      {/* Action bar & filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[var(--maroon)]" />
            <h3 className="text-sm font-semibold text-gray-700">
              {isMasterAdmin || isAdmin ? 'Data Absensi' : 'Absensi Saya'}
            </h3>
          </div>
          {/* Smart attendance buttons */}
          {!isMasterAdmin && !isAdmin ? (
            shiftBelumDibuat ? (
              <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs flex items-center gap-1 px-2 py-1">
                <AlertTriangle className="w-3 h-3" /> Shift belum dibuat
              </Badge>
            ) : alreadyPulang ? (
              <div className="flex gap-2">
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs px-2 py-1">✓ Sudah Absen</Badge>
                <Button onClick={handleOpenForm} variant="outline" size="sm" className="h-9 border-orange-300 text-orange-700 hover:bg-orange-50">
                  <Plus className="w-4 h-4 mr-1" /> Lembur
                </Button>
              </div>
            ) : alreadyHadir ? (
              canPulang ? (
                <Button onClick={handleOpenForm} className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-4">
                  <LogOut className="w-4 h-4 mr-1" /> Absen Pulang
                </Button>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs px-2 py-1">
                  ✓ Hadir · Pulang {todayShiftForEmployee?.jam_selesai || '-'}
                </Badge>
              )
            ) : (
              <Button onClick={handleOpenForm} className="bg-red-700 hover:bg-red-800 h-10 px-4">
                <Plus className="w-4 h-4 mr-1" /> Absen Hadir
              </Button>
            )
          ) : (
            <Button onClick={handleOpenForm} className="bg-red-700 hover:bg-red-800 h-10 px-4">
              <Plus className="w-4 h-4 mr-1" /> Input Absensi
            </Button>
          )}
        </div>
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="flex-1 min-w-[140px] h-10 text-sm" />
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Cari nama/NIK..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 text-sm" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-28 h-10 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {Object.keys(statusColor).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data — Card list on mobile, table on desktop */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-gray-50">
          {filtered.length === 0
            ? <p className="text-center py-10 text-gray-400 text-sm">Belum ada data absensi</p>
            : filtered.map((a) => (
              <div key={a.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{a.nama_karyawan}</p>
                    <p className="text-xs text-gray-400 font-mono">{a.nik_karyawan}</p>
                  </div>
                  <Badge className={`${statusColor[a.status] || 'bg-gray-100'} text-xs border-0 shrink-0`}>{a.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div><span className="text-gray-400">Area:</span> {a.area_tugas || '-'}</div>
                  <div><span className="text-gray-400">Shift:</span> {a.tipe_shift || '-'}</div>
                  <div><span className="text-gray-400">Hadir:</span> <span className="font-medium text-emerald-600">{a.jam_hadir || '-'}</span></div>
                  <div><span className="text-gray-400">Pulang:</span> <span className="font-medium text-blue-600">{a.jam_pulang || '-'}</span></div>
                </div>
                {(a.foto_hadir || a.foto_pulang) && (
                  <div className="flex gap-2">
                    {a.foto_hadir && <a href={a.foto_hadir} target="_blank" rel="noreferrer"><img src={a.foto_hadir} alt="H" className="w-12 h-12 rounded-lg object-cover border" /></a>}
                    {a.foto_pulang && <a href={a.foto_pulang} target="_blank" rel="noreferrer"><img src={a.foto_pulang} alt="P" className="w-12 h-12 rounded-lg object-cover border" /></a>}
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
                <TableHead className="text-xs">NIK</TableHead>
                <TableHead className="text-xs">Nama</TableHead>
                <TableHead className="text-xs">Area</TableHead>
                <TableHead className="text-xs">Shift</TableHead>
                <TableHead className="text-xs">Jam Hadir</TableHead>
                <TableHead className="text-xs">Jam Pulang</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Foto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0
                ? <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">Belum ada data absensi</TableCell></TableRow>
                : filtered.map((a) => (
                  <TableRow key={a.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-sm font-mono">{a.nik_karyawan}</TableCell>
                    <TableCell className="text-sm font-medium">{a.nama_karyawan}</TableCell>
                    <TableCell className="text-sm text-gray-600">{a.area_tugas}</TableCell>
                    <TableCell className="text-xs text-gray-500">{a.tipe_shift || '-'}</TableCell>
                    <TableCell><div className="flex flex-col gap-1"><span className="text-sm">{a.jam_hadir || '-'}</span></div></TableCell>
                    <TableCell><div className="flex flex-col gap-1"><span className="text-sm">{a.jam_pulang || '-'}</span></div></TableCell>
                    <TableCell><Badge className={`${statusColor[a.status] || 'bg-gray-100'} text-xs border-0`}>{a.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {a.foto_hadir && <img src={a.foto_hadir} alt="H" className="w-7 h-7 rounded object-cover" />}
                        {a.foto_pulang && <img src={a.foto_pulang} alt="P" className="w-7 h-7 rounded object-cover" />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Input Absensi Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => {setShowForm(v);if (!v) stopCamera();}}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isLemburMode ? '⏰ Input Absensi Lembur' : 'Input E-Absensi'}</DialogTitle>
          </DialogHeader>
          {isLemburMode &&
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-sm text-orange-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Mode Lembur — absensi reguler hari ini sudah selesai
            </div>
          }
          <div className="space-y-3">

            {/* Realtime clock */}
            <div className="bg-gray-900 rounded-xl p-3 flex items-center justify-center gap-3">
              <Clock className="w-5 h-5 text-white/60" />
              <span className="text-3xl font-mono font-bold text-white tracking-widest">{realTime}</span>
            </div>

            {/* Geofence status */}
            {geoStatus && geoStatus !== 'allowed' &&
            <div className={`rounded-lg p-3 flex items-center gap-2 text-sm font-medium ${
            geoStatus === 'checking' ? 'bg-blue-50 text-blue-700' :
            geoStatus === 'denied' ? 'bg-red-50 text-red-700' : ''}`
            }>
                {geoStatus === 'checking' && <><MapPin className="w-4 h-4 animate-pulse" /> Memeriksa lokasi GPS...</>}
                {geoStatus === 'denied' && <><AlertTriangle className="w-4 h-4" /> Anda berada di luar area tugas! Absensi diblokir.</>}
              </div>
            }
            {geoStatus === 'allowed' &&
            <div className="bg-emerald-50 rounded-lg p-2 flex items-center gap-2 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Lokasi terverifikasi di area tugas
              </div>
            }

            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 mb-2">Informasi Karyawan (Otomatis)</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs text-gray-500">NIK</Label><Input value={form.nik_karyawan || ''} onChange={(e) => setForm({ ...form, nik_karyawan: e.target.value })} className="h-8 text-sm" readOnly={!isAdmin} /></div>
                <div><Label className="text-xs text-gray-500">Nama</Label><Input value={form.nama_karyawan || ''} onChange={(e) => setForm({ ...form, nama_karyawan: e.target.value })} className="h-8 text-sm" readOnly={!isAdmin} /></div>
              </div>
            </div>

            <div>
              <Label>Area / Proyek</Label>
              <Select value={form.area_tugas || ''} onValueChange={(v) => setForm({ ...form, area_tugas: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih area..." /></SelectTrigger>
                <SelectContent>
                  {areas.map((a) => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {matchedShift &&
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Jadwal Shift Terdeteksi</p>
                <div className="grid grid-cols-3 gap-2 text-xs text-emerald-800">
                  <div><span className="text-gray-500">Tipe:</span> {matchedShift.tipe_shift}</div>
                  <div><span className="text-gray-500">Mulai:</span> {matchedShift.jam_mulai}</div>
                  <div><span className="text-gray-500">Selesai:</span> {matchedShift.jam_selesai}</div>
                </div>
              </div>
            }

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Jabatan</Label><Input value={form.jabatan || ''} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} /></div>
              <div>
                <Label>Regu <span className="text-emerald-600 text-[10px]">(otomatis)</span></Label>
                <Select value={form.regu || ''} onValueChange={(v) => setForm({ ...form, regu: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                  <SelectContent>{['Regu A', 'Regu B', 'Regu C', 'Regu D', 'Non Regu'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div><Label>Tanggal</Label><Input type="date" value={form.tanggal || ''} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status || 'Hadir'} onValueChange={handleStatusChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(statusColor).map((s) =>
                  <SelectItem key={s} value={s}>
                      {s} {['Cuti', 'Sakit', 'Izin'].includes(s) ? '→ Form Cuti/Izin' : ''}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {['Cuti', 'Sakit', 'Izin'].includes(form.status) &&
              <p className="text-xs text-amber-600 mt-1">⚠ Memilih ini akan membuka form Cuti & Izin</p>
              }
            </div>

            {/* Jam Hadir + Foto */}
            <div className="border rounded-xl p-3 space-y-2 bg-emerald-50/50">
              <Label className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Jam Hadir
              </Label>
              <Input type="time" value={form.jam_hadir || ''} onChange={(e) => setForm({ ...form, jam_hadir: e.target.value })} className="h-9" />
              {form.foto_hadir ?
              <div className="flex items-center gap-2">
                    <a href={form.foto_hadir} target="_blank" rel="noreferrer">
                      <img src={form.foto_hadir} alt="Hadir" className="w-20 h-20 rounded-lg object-cover border-2 border-emerald-300" />
                    </a>
                    <Button size="sm" variant="outline" onClick={() => setForm((p) => ({ ...p, foto_hadir: null }))}>
                      <X className="w-3 h-3 mr-1" /> Hapus
                    </Button>
                  </div> :
              <Button size="sm" variant="outline" onClick={() => startCamera('hadir')} className="w-full border-emerald-300 text-emerald-700">
                    <Camera className="w-4 h-4 mr-2" /> Foto Hadir
                  </Button>
              }
            </div>

            {/* Jam Pulang + Foto */}
            <div className="border rounded-xl p-3 space-y-2 bg-blue-50/50">
              <Label className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Jam Pulang
              </Label>
              <Input type="time" value={form.jam_pulang || ''} onChange={(e) => setForm({ ...form, jam_pulang: e.target.value })} className="h-9" />
              {form.foto_pulang ?
              <div className="flex items-center gap-2">
                    <a href={form.foto_pulang} target="_blank" rel="noreferrer">
                      <img src={form.foto_pulang} alt="Pulang" className="w-20 h-20 rounded-lg object-cover border-2 border-blue-300" />
                    </a>
                    <Button size="sm" variant="outline" onClick={() => setForm((p) => ({ ...p, foto_pulang: null }))}>
                      <X className="w-3 h-3 mr-1" /> Hapus
                    </Button>
                  </div> :
              <Button size="sm" variant="outline" onClick={() => startCamera('pulang')} className="w-full border-blue-300 text-blue-700">
                    <Camera className="w-4 h-4 mr-2" /> Foto Pulang
                  </Button>
              }
            </div>

            {/* Camera view */}
            {(photoMode || capturedPhoto) &&
            <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
                <p className="text-xs font-semibold text-gray-600">
                  Kamera — Foto {photoMode === 'hadir' ? 'Hadir' : 'Pulang'}
                </p>
                {cameraStream && !capturedPhoto &&
              <>
                    <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" style={{ maxHeight: 240 }} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={capturePhoto} className="flex-1 bg-[var(--maroon)] text-white">
                        <Camera className="w-4 h-4 mr-1" /> Ambil Foto
                      </Button>
                      <Button size="sm" variant="outline" onClick={stopCamera}>Batal</Button>
                    </div>
                  </>
              }
                {capturedPhoto &&
              <>
                    <img src={capturedPhoto} alt="Captured" className="w-full rounded-lg max-h-48 object-cover" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={uploadAndSetPhoto} disabled={uploadingPhoto} className="flex-1 bg-emerald-600 text-white">
                        {uploadingPhoto ? 'Uploading...' : 'Gunakan Foto'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {setCapturedPhoto(null);startCamera(photoMode);}}>Ulang</Button>
                      <Button size="sm" variant="outline" onClick={() => setCapturedPhoto(null)}>Batal</Button>
                    </div>
                  </>
              }
                <canvas ref={canvasRef} className="hidden" />
              </div>
            }
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {setShowForm(false);stopCamera();}}>Batal</Button>
            {/* If already hadir and not admin → show Pulang button */}
            {alreadyHadir && !alreadyPulang && !isMasterAdmin && !isAdmin ?
            <Button onClick={handlePulang} className="bg-blue-600 hover:bg-blue-700 text-white">
                <LogOut className="w-4 h-4 mr-1" /> Catat Jam Pulang
              </Button> :

            <Button onClick={handleSave} disabled={createMutation.isPending || geoStatus === 'checking'} className="bg-red-700 hover:bg-red-800">
                {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            }
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}