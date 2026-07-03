import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, CheckCircle2, CalendarClock, X, LogIn, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QuickAttendance({ employee, attendance, onSuccess }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState(null); // 'hadir' | 'pulang'
  const [stream, setStream] = useState(null);
  const [captured, setCaptured] = useState(null);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const today = new Date().toISOString().slice(0, 10);
  const sudahHadir = !!attendance?.jam_hadir;
  const sudahPulang = !!attendance?.jam_pulang;

  useEffect(() => {
    if (mode && !captured) startCamera();
    return () => stopCamera();
  }, [mode]);

  const startCamera = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    setStream(s);
    if (videoRef.current) videoRef.current.srcObject = s;
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setCaptured(canvas.toDataURL('image/jpeg', 0.7));
    stopCamera();
  };

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    let fotoUrl = null;
    if (captured) {
      const blob = await fetch(captured).then(r => r.blob());
      const file = new File([blob], 'foto.jpg', { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      fotoUrl = file_url;
    }

    if (mode === 'hadir') {
      await base44.entities.Attendance.create({
        nik_karyawan: employee.nik_karyawan,
        nama_karyawan: employee.nama_lengkap,
        area_tugas: employee.area_tugas,
        jabatan: employee.jabatan,
        regu: employee.regu,
        tanggal: today,
        jam_hadir: now,
        status: 'Hadir',
        foto_hadir: fotoUrl
      });
    } else {
      await base44.entities.Attendance.update(attendance.id, {
        jam_pulang: now,
        foto_pulang: fotoUrl
      });
    }

    setSaving(false);
    setMode(null);
    setCaptured(null);
    qc.invalidateQueries({ queryKey: ['my-attendance-today'] });
    onSuccess?.();
  };

  const cancel = () => {
    stopCamera();
    setMode(null);
    setCaptured(null);
  };

  // --- Compact status bar (no modal open) ---
  if (!mode) {
    return (
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${sudahHadir ? 'bg-emerald-100' : 'bg-orange-100'}`}>
          {sudahHadir
            ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            : <CalendarClock className="w-5 h-5 text-orange-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">
            {sudahHadir ? attendance.status : 'Belum Absen'}
          </p>
          <p className="text-xs text-gray-400">
            {sudahHadir
              ? `Hadir: ${attendance.jam_hadir}${attendance.jam_pulang ? ` · Pulang: ${attendance.jam_pulang}` : ''}`
              : 'Silakan input absensi hari ini'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!sudahHadir && (
            <button
              onClick={() => setMode('hadir')}
              className="flex items-center gap-1.5 bg-red-700 text-white px-3 py-2 text-xs font-semibold rounded-xl hover:bg-red-800 active:scale-95 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" /> Absen Masuk
            </button>
          )}
          {sudahHadir && !sudahPulang && (
            <button
              onClick={() => setMode('pulang')}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 text-xs font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Absen Pulang
            </button>
          )}
          {sudahHadir && sudahPulang && (
            <span className="text-xs text-emerald-600 font-medium px-2 py-1 bg-emerald-50 rounded-xl">Selesai ✓</span>
          )}
        </div>
      </div>
    );
  }

  // --- Full-screen camera modal ---
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <div className="flex items-center gap-2">
          {mode === 'hadir'
            ? <LogIn className="w-5 h-5 text-green-400" />
            : <LogOut className="w-5 h-5 text-blue-400" />}
          <span className="text-white font-semibold text-sm">
            {mode === 'hadir' ? 'Foto Absen Masuk' : 'Foto Absen Pulang'}
          </span>
        </div>
        <button onClick={cancel} className="text-white/70 hover:text-white p-1">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera / Preview */}
      <div className="flex-1 relative overflow-hidden">
        {!captured ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <img src={captured} alt="preview" className="w-full h-full object-cover" />
        )}

        {/* Overlay frame hint */}
        {!captured && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 rounded-full border-2 border-white/40" />
          </div>
        )}

        {/* Mode label */}
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-white text-xs font-semibold shadow ${mode === 'hadir' ? 'bg-green-600' : 'bg-blue-600'}`}>
          {mode === 'hadir' ? '📍 Absen Masuk' : '🏠 Absen Pulang'}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Bottom Controls */}
      <div className="bg-black/90 px-6 py-6 flex items-center justify-center gap-6">
        {!captured ? (
          <>
            <button onClick={cancel} className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all">
              <X className="w-6 h-6" />
            </button>
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              <Camera className="w-8 h-8 text-gray-800" />
            </button>
            <div className="w-14 h-14" />
          </>
        ) : (
          <div className="flex gap-4 w-full">
            <Button
              variant="outline"
              onClick={() => { setCaptured(null); startCamera(); }}
              className="flex-1 h-12 rounded-xl border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              Ambil Ulang
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className={`flex-1 h-12 rounded-xl font-semibold ${mode === 'hadir' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {saving ? 'Menyimpan...' : (mode === 'hadir' ? 'Simpan Masuk' : 'Simpan Pulang')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}