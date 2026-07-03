import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function OvertimeClaimForm({ employee }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jam_mulai_lembur: '',
    jam_selesai_lembur: '',
    alasan: '',
    attendance_id: ''
  });
  const [submitted, setSubmitted] = useState(false);

  // Cari record absensi untuk tanggal yang dipilih (untuk auto-link)
  const { data: attendances = [] } = useQuery({
    queryKey: ['my-attendance-for-ot', form.tanggal, employee?.nik_karyawan],
    queryFn: () => base44.entities.Attendance.filter({ nik_karyawan: employee.nik_karyawan, tanggal: form.tanggal }),
    enabled: !!employee?.nik_karyawan && !!form.tanggal
  });

  const hitungDurasi = () => {
    if (!form.jam_mulai_lembur || !form.jam_selesai_lembur) return 0;
    const [h1, m1] = form.jam_mulai_lembur.split(':').map(Number);
    const [h2, m2] = form.jam_selesai_lembur.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 1440;
    return Math.round((diff / 60) * 10) / 10;
  };

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.OvertimeClaim.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-overtime'] });
      toast.success('Klaim lembur berhasil diajukan!');
      setSubmitted(true);
      setForm({ tanggal: format(new Date(), 'yyyy-MM-dd'), jam_mulai_lembur: '', jam_selesai_lembur: '', alasan: '', attendance_id: '' });
      setTimeout(() => setSubmitted(false), 3000);
    }
  });

  const handleSubmit = () => {
    const durasi = hitungDurasi();
    if (!form.tanggal || !form.jam_mulai_lembur || !form.jam_selesai_lembur || !form.alasan) {
      toast.error('Lengkapi semua field wajib');
      return;
    }
    if (durasi < 0.5) {
      toast.error('Durasi lembur minimum 30 menit');
      return;
    }
    createMutation.mutate({
      nik_karyawan: employee.nik_karyawan,
      nama_karyawan: employee.nama_lengkap,
      jabatan: employee.jabatan,
      area_tugas: employee.area_tugas,
      tanggal: form.tanggal,
      jam_mulai_lembur: form.jam_mulai_lembur,
      jam_selesai_lembur: form.jam_selesai_lembur,
      durasi_jam: durasi,
      alasan: form.alasan,
      attendance_id: attendances[0]?.id || '',
      status: 'Pending Leader'
    });
  };

  const durasi = hitungDurasi();

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-600" /> Form Klaim Lembur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {submitted && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Klaim lembur berhasil dikirim, menunggu approval Leader.</span>
          </div>
        )}

        <div>
          <Label>Tanggal Lembur *</Label>
          <Input type="date" value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} />
          {attendances.length > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              ✓ Absensi ditemukan: Hadir {attendances[0].jam_hadir || '-'} – {attendances[0].jam_pulang || 'Belum pulang'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Jam Mulai Lembur *</Label>
            <Input type="time" value={form.jam_mulai_lembur} onChange={e => setForm(p => ({ ...p, jam_mulai_lembur: e.target.value }))} />
          </div>
          <div>
            <Label>Jam Selesai Lembur *</Label>
            <Input type="time" value={form.jam_selesai_lembur} onChange={e => setForm(p => ({ ...p, jam_selesai_lembur: e.target.value }))} />
          </div>
        </div>

        {durasi > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5">
            <p className="text-sm text-orange-700 font-medium">
              Durasi Lembur: <span className="text-xl font-bold">{durasi}</span> jam
            </p>
          </div>
        )}

        <div>
          <Label>Alasan / Pekerjaan yang Dilakukan *</Label>
          <Textarea
            value={form.alasan}
            onChange={e => setForm(p => ({ ...p, alasan: e.target.value }))}
            placeholder="Jelaskan pekerjaan yang dilakukan saat lembur..."
            rows={3}
          />
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
          <strong>Alur Approval:</strong> Pengajuan → Leader (Tingkat 1) → Supervisor/Management (Tingkat 2) → Disetujui
        </div>

        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending || !form.jam_mulai_lembur || !form.jam_selesai_lembur || !form.alasan}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white h-11"
        >
          {createMutation.isPending ? 'Mengirim...' : 'Ajukan Klaim Lembur'}
        </Button>
      </CardContent>
    </Card>
  );
}