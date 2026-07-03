import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, MapPin, Camera, Loader2, X, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';

export default function PanicButton({ employee }) {
  const [phase, setPhase] = useState('idle'); // idle | confirm | capturing | sent
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [locError, setLocError] = useState('');
  const [photo, setPhoto] = useState('');
  const [uploading, setUploading] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const countRef = useRef(null);
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: (data) => base44.entities.PanicAlert.create(data),
    onSuccess: () => {
      toast.error('🚨 SINYAL DARURAT TERKIRIM! Tim supervisor sedang dihubungi.', { duration: 8000 });
      qc.invalidateQueries({ queryKey: ['panic-alerts'] });
      setPhase('sent');
    }
  });

  const startPanic = () => {
    setPhase('confirm');
    setCountdown(5);
    // Get location immediately
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocError('Lokasi tidak tersedia'),
      { timeout: 8000 }
    );
    // Countdown
    let n = 5;
    countRef.current = setInterval(() => {
      n--;
      setCountdown(n);
      if (n <= 0) { clearInterval(countRef.current); }
    }, 1000);
  };

  const cancel = () => {
    clearInterval(countRef.current);
    setPhase('idle');
    setDescription('');
    setPhoto('');
    setLocation(null);
    setLocError('');
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhoto(file_url);
    } catch { toast.error('Gagal upload foto'); }
    setUploading(false);
  };

  const sendAlert = () => {
    clearInterval(countRef.current);
    const now = new Date();
    mut.mutate({
      nik_karyawan: employee?.nik_karyawan || '',
      nama_karyawan: employee?.nama_lengkap || '',
      jabatan: employee?.jabatan || employee?.role || '',
      area_tugas: employee?.area_tugas || '',
      latitude: location?.lat || null,
      longitude: location?.lng || null,
      alamat_lokasi: location ? `${location.lat?.toFixed(6)}, ${location.lng?.toFixed(6)}` : 'Tidak diketahui',
      waktu_darurat: now.toLocaleString('id-ID'),
      deskripsi: description,
      foto_kejadian: photo,
      status: 'Aktif',
    });
  };

  if (phase === 'sent') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <PhoneCall className="w-6 h-6 text-red-600" />
        </div>
        <p className="font-bold text-red-700">Sinyal Darurat Terkirim!</p>
        <p className="text-xs text-red-500">Tim supervisor sedang menuju ke lokasi Anda.</p>
        <Button size="sm" variant="outline" className="border-red-200 text-red-600" onClick={() => { setPhase('idle'); setDescription(''); setPhoto(''); }}>
          Tutup
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Panic Button */}
      <button
        onClick={startPanic}
        className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-red-600 to-red-800 rounded-2xl shadow-lg active:scale-95 transition-all text-white animate-pulse-slow"
      >
        <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center shrink-0 shadow-inner">
          <AlertTriangle className="w-7 h-7 text-white" />
        </div>
        <div className="text-left">
          <p className="font-black text-base tracking-wide">TOMBOL DARURAT</p>
          <p className="text-white/80 text-xs">Kirim sinyal SOS + GPS ke semua Supervisor</p>
        </div>
      </button>

      {/* Confirm Dialog */}
      <Dialog open={phase === 'confirm' || phase === 'capturing'} onOpenChange={() => cancel()}>
        <DialogContent className="max-w-sm">
          <div className="space-y-4">
            {/* Header */}
            <div className="text-center space-y-2 pt-2">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-lg font-black text-red-700">KONFIRMASI DARURAT</h2>
              <p className="text-xs text-gray-500">Sinyal akan dikirim ke semua Supervisor & Chief Security</p>
            </div>

            {/* Location status */}
            <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs ${location ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-600'}`}>
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {location ? `GPS: ${location.lat?.toFixed(5)}, ${location.lng?.toFixed(5)}` : locError || 'Mendapatkan lokasi GPS...'}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-gray-600 font-medium">Deskripsi Singkat (opsional)</label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Apa yang terjadi? Ceritakan singkat..."
                className="mt-1 h-20 text-sm resize-none"
              />
            </div>

            {/* Photo */}
            <div>
              <label className="text-xs text-gray-600 font-medium">Foto Bukti (opsional)</label>
              <div className="mt-1">
                {photo
                  ? <div className="relative inline-block"><img src={photo} className="w-20 h-20 object-cover rounded-lg border" alt="bukti" /><button onClick={() => setPhoto('')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">✕</button></div>
                  : <label className={`flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 cursor-pointer w-fit ${uploading ? 'opacity-50' : ''}`}>
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      Ambil / Upload Foto
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
                    </label>
                }
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pb-1">
              <Button variant="outline" onClick={cancel} className="flex-1 gap-1"><X className="w-4 h-4" /> Batal</Button>
              <Button
                onClick={sendAlert}
                disabled={mut.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold gap-1"
              >
                {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><AlertTriangle className="w-4 h-4" /> KIRIM SOS</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}