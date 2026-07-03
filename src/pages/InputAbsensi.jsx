import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, CalendarClock, Camera, X, LogOut, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a933d92aa04632a6b6bb01/648c10808_images1.jpeg";

const statusColor = {
  Hadir: 'bg-emerald-100 text-emerald-800',
  Backup: 'bg-blue-100 text-blue-800',
  Sakit: 'bg-orange-100 text-orange-800',
  Izin: 'bg-amber-100 text-amber-800',
  Cuti: 'bg-purple-100 text-purple-800',
  Alfa: 'bg-red-100 text-red-800',
};

function CameraCapture({ label, onCapture, preview, onClear }) {
  const videoRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [uploading, setUploading] = useState(false);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    videoRef.current.srcObject = stream;
    videoRef.current.play();
    setStreaming(true);
  };

  const capture = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      setUploading(true);
      const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      stopCamera();
      onCapture(file_url);
      setUploading(false);
    }, 'image/jpeg', 0.8);
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
  };

  return (
    <div>
      <Label>{label}</Label>
      {preview ? (
        <div className="relative mt-1">
          <img src={preview} alt="foto" className="w-full h-40 object-cover rounded-lg border" />
          <button onClick={() => { onClear(); stopCamera(); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : streaming ? (
        <div className="mt-1 space-y-2">
          <video ref={videoRef} className="w-full rounded-lg border" autoPlay playsInline />
          <div className="flex gap-2">
            <Button onClick={capture} disabled={uploading} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              {uploading ? 'Upload...' : 'Ambil Foto'}
            </Button>
            <Button variant="outline" onClick={stopCamera}>Batal</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={startCamera} className="w-full mt-1">
          <Camera className="w-4 h-4 mr-2" /> Buka Kamera
        </Button>
      )}
    </div>
  );
}

export default function InputAbsensi() {
  const [areaName, setAreaName] = useState('');
  const [areaData, setAreaData] = useState(null);
  const [form, setForm] = useState({});
  const [matchedShift, setMatchedShift] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedMode, setSubmittedMode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [nikLoading, setNikLoading] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState(null); // record hadir hari ini
  const [mode, setMode] = useState('hadir'); // 'hadir' | 'pulang'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const area = params.get('area');
    if (area) {
      setAreaName(area);
      base44.entities.AreaProject.filter({ nama_area: area }).then(res => {
        if (res.length) setAreaData(res[0]);
      });
    }
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 5);
    setForm(prev => ({ ...prev, tanggal: today, jam_hadir: now, status: 'Hadir', area_tugas: area || '' }));
  }, []);

  const lookupNIK = async () => {
    if (!form.nik_karyawan || form.nik_karyawan.length < 5) return;
    setNikLoading(true);
    const employees = await base44.entities.Employee.filter({ nik_karyawan: form.nik_karyawan });
    if (employees.length > 0) {
      const emp = employees[0];
      const today = new Date().toISOString().slice(0, 10);
      setForm(prev => ({
        ...prev,
        nama_karyawan: emp.nama_lengkap || '',
        jabatan: emp.jabatan || '',
        regu: emp.regu || '',
        area_tugas: areaName || emp.area_tugas || '',
      }));
      toast.success(`Karyawan ditemukan: ${emp.nama_lengkap}`);

      // Cek apakah sudah absen hadir hari ini
      const existing = await base44.entities.Attendance.filter({ nik_karyawan: form.nik_karyawan, tanggal: today });
      if (existing.length > 0) {
        setExistingAttendance(existing[0]);
        // Jika sudah hadir tapi belum pulang → mode pulang
        if (existing[0].jam_hadir && !existing[0].jam_pulang) {
          setMode('pulang');
        } else if (existing[0].jam_pulang) {
          setMode('done');
        }
      } else {
        setExistingAttendance(null);
        setMode('hadir');
      }

      // Find matching shift — WAJIB untuk bisa absen hadir
      const targetArea = areaName || emp.area_tugas || '';
      if (emp.regu && targetArea) {
        const shifts = await base44.entities.ShiftSchedule.filter({ area_tugas: targetArea, regu: emp.regu, tanggal: today });
        if (shifts.length > 0) {
          setMatchedShift(shifts[0]);
          setForm(prev => ({
            ...prev,
            shift_id: shifts[0].id,
            tipe_shift: shifts[0].tipe_shift,
            jam_shift_mulai: shifts[0].jam_mulai,
            jam_shift_selesai: shifts[0].jam_selesai,
          }));
        } else {
          setMatchedShift(null);
        }
      } else {
        setMatchedShift(null);
      }
    } else {
      toast.error('NIK tidak ditemukan');
    }
    setNikLoading(false);
  };

  const handleHadir = async () => {
    if (!form.nik_karyawan || !form.nama_karyawan) {
      toast.error('NIK dan Nama wajib diisi');
      return;
    }
    // Blokir absen hadir jika belum ada jadwal shift
    if (!matchedShift) {
      toast.error('Jadwal shift belum dibuat untuk regu Anda hari ini. Hubungi atasan.');
      return;
    }
    setProcessing(true);
    await base44.entities.Attendance.create({
      ...form,
      jam_hadir: new Date().toTimeString().slice(0, 5),
      area_tugas: areaName || form.area_tugas,
      jam_pulang: ''
    });
    setProcessing(false);
    setSubmittedMode('hadir');
    setSubmitted(true);
  };

  const handlePulang = async () => {
    if (!existingAttendance) return;
    setProcessing(true);
    const jamPulang = new Date().toTimeString().slice(0, 5);
    await base44.entities.Attendance.update(existingAttendance.id, {
      jam_pulang: jamPulang,
      foto_pulang: form.foto_pulang || ''
    });
    setProcessing(false);
    setSubmittedMode('pulang');
    setSubmitted(true);
  };

  const resetForm = () => {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 5);
    setSubmitted(false);
    setSubmittedMode('');
    setExistingAttendance(null);
    setMatchedShift(null);
    setMode('hadir');
    setForm({ tanggal: today, jam_hadir: now, status: 'Hadir', area_tugas: areaName, nik_karyawan: '', nama_karyawan: '' });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--maroon-50)] to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-xl">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {submittedMode === 'pulang' ? 'Absen Pulang Berhasil!' : 'Absensi Berhasil!'}
          </h2>
          <p className="text-sm text-gray-500">Data absensi Anda telah tercatat.</p>
          <p className="text-sm font-medium text-gray-700 mt-2">{form.nama_karyawan} - {form.tanggal}</p>
          <Button onClick={resetForm} className="mt-4 bg-[var(--maroon)] hover:bg-[var(--maroon-light)] text-white">
            Input Lagi
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--maroon-50)] to-white p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="PIS" className="w-14 h-14 mx-auto mb-3 object-contain" />
          <h1 className="text-2xl font-bold text-[var(--maroon)]">E-Absensi</h1>
          {areaName && <div className="inline-block bg-[var(--maroon-50)] text-[var(--maroon)] px-4 py-1 rounded-full text-sm font-medium mt-2">{areaName}</div>}
        </div>

        <Card className="p-6 border-0 shadow-lg">
          <div className="space-y-4">
            {/* NIK */}
            <div>
              <Label>NIK ID Karyawan *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={form.nik_karyawan || ''}
                  onChange={e => setForm({ ...form, nik_karyawan: e.target.value })}
                  placeholder="Masukkan NIK..."
                  onBlur={lookupNIK}
                  onKeyDown={e => e.key === 'Enter' && lookupNIK()}
                />
                <Button variant="outline" onClick={lookupNIK} disabled={nikLoading} className="shrink-0">
                  {nikLoading ? '...' : 'Cari'}
                </Button>
              </div>
            </div>

            {form.nama_karyawan && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500 text-xs">Nama:</span><p className="font-medium">{form.nama_karyawan}</p></div>
                  <div><span className="text-gray-500 text-xs">Jabatan:</span><p className="font-medium">{form.jabatan || '-'}</p></div>
                  <div><span className="text-gray-500 text-xs">Regu:</span><p className="font-medium">{form.regu || '-'}</p></div>
                  <div><span className="text-gray-500 text-xs">Area:</span><p className="font-medium">{areaName || form.area_tugas || '-'}</p></div>
                </div>
              </div>
            )}

            {form.nama_karyawan && matchedShift && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">✅ Jadwal Shift Hari Ini</p>
                <div className="grid grid-cols-3 gap-2 text-xs text-blue-800">
                  <div><span className="text-gray-500">Tipe:</span> {matchedShift.tipe_shift}</div>
                  <div><span className="text-gray-500">Mulai:</span> {matchedShift.jam_mulai}</div>
                  <div><span className="text-gray-500">Selesai:</span> {matchedShift.jam_selesai}</div>
                </div>
              </div>
            )}

            {form.nama_karyawan && !matchedShift && mode === 'hadir' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-red-700">Jadwal Shift Belum Dibuat</p>
                <p className="text-xs text-red-500 mt-1">
                  Belum ada jadwal shift untuk regu <strong>{form.regu || '-'}</strong> di area <strong>{areaName || form.area_tugas || '-'}</strong> hari ini.
                </p>
                <p className="text-xs text-red-400 mt-1">Hubungi atasan / admin untuk membuat jadwal shift.</p>
              </div>
            )}

            {/* Mode done: sudah hadir DAN sudah pulang */}
            {mode === 'done' && (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-gray-700">Absensi hari ini sudah lengkap</p>
                <p className="text-xs text-gray-500 mt-1">
                  Hadir: {existingAttendance?.jam_hadir} · Pulang: {existingAttendance?.jam_pulang}
                </p>
              </div>
            )}

            {/* Mode hadir */}
            {mode === 'hadir' && form.nama_karyawan && matchedShift && (
              <>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status || 'Hadir'} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.keys(statusColor).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Tanggal</Label><Input type="date" value={form.tanggal || ''} onChange={e => setForm({ ...form, tanggal: e.target.value })} /></div>
                <CameraCapture
                  label="Foto Hadir *"
                  preview={form.foto_hadir}
                  onCapture={url => setForm(p => ({ ...p, foto_hadir: url }))}
                  onClear={() => setForm(p => ({ ...p, foto_hadir: '' }))}
                />
                <Button
                  onClick={handleHadir}
                  disabled={processing || !form.nik_karyawan}
                  className="w-full h-12 bg-[var(--maroon)] hover:bg-[var(--maroon-light)] text-white text-base"
                >
                  <CalendarClock className="w-5 h-5 mr-2" />
                  {processing ? 'Menyimpan...' : 'Absen Hadir'}
                </Button>
              </>
            )}

            {/* Mode pulang */}
            {mode === 'pulang' && form.nama_karyawan && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <p className="font-semibold">Sudah Absen Hadir ✓</p>
                  <p className="text-xs mt-0.5">Jam hadir: {existingAttendance?.jam_hadir} · Silakan absen pulang</p>
                </div>
                <CameraCapture
                  label="Foto Pulang *"
                  preview={form.foto_pulang}
                  onCapture={url => setForm(p => ({ ...p, foto_pulang: url }))}
                  onClear={() => setForm(p => ({ ...p, foto_pulang: '' }))}
                />
                <Button
                  onClick={handlePulang}
                  disabled={processing}
                  className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-white text-base"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  {processing ? 'Menyimpan...' : 'Absen Pulang'}
                </Button>
              </>
            )}

            {!form.nama_karyawan && mode !== 'done' && (
              <p className="text-sm text-gray-400 text-center py-4">Masukkan NIK lalu tekan Enter atau klik Cari</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}