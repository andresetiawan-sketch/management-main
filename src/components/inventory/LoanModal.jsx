import { useState } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function LoanModal({ item, onClose, onSuccess }) {
  const [form, setForm] = useState({
    nik_peminjam: '', nama_peminjam: '', area_tugas: '',
    tanggal_pinjam: new Date().toISOString().split('T')[0],
    tanggal_kembali_rencana: '', kondisi_pinjam: item.kondisi || 'Baik', catatan: ''
  });
  const [saving, setSaving] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-aktif'],
    queryFn: () => base44.entities.Employee.filter({ status_aktif: 'Aktif' }),
  });

  const handleSelectEmployee = (nik) => {
    const emp = employees.find(e => e.nik_karyawan === nik);
    if (emp) setForm(p => ({ ...p, nik_peminjam: emp.nik_karyawan, nama_peminjam: emp.nama_lengkap, area_tugas: emp.area_tugas || '' }));
  };

  const handleSubmit = async () => {
    if (!form.nik_peminjam || !form.tanggal_pinjam) { toast.error('Pilih peminjam dan tanggal'); return; }
    setSaving(true);
    await base44.entities.LoanRecord.create({ ...form, kode_barang: item.kode_barang, nama_barang: item.nama_barang, status: 'Dipinjam' });
    await base44.entities.Inventory.update(item.id, { status: 'Dipinjam', nik_peminjam: form.nik_peminjam, nama_peminjam: form.nama_peminjam });
    toast.success('Peminjaman berhasil dicatat');
    setSaving(false);
    onSuccess();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Pinjam Barang: {item.nama_barang}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Pilih Karyawan</Label>
            <Select onValueChange={handleSelectEmployee}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Pilih karyawan..." /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.nik_karyawan}>{e.nama_lengkap} — {e.nik_karyawan}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tgl Pinjam</Label>
              <Input type="date" value={form.tanggal_pinjam} onChange={e => setForm(p => ({ ...p, tanggal_pinjam: e.target.value }))} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Rencana Kembali</Label>
              <Input type="date" value={form.tanggal_kembali_rencana} onChange={e => setForm(p => ({ ...p, tanggal_kembali_rencana: e.target.value }))} className="mt-1 h-9 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Kondisi Saat Dipinjam</Label>
            <Select value={form.kondisi_pinjam} onValueChange={v => setForm(p => ({ ...p, kondisi_pinjam: v }))}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Baik','Cukup','Rusak'].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Catatan</Label>
            <Input value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} className="mt-1 h-9 text-sm" placeholder="Opsional..." />
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
            {saving ? 'Memproses...' : 'Konfirmasi Peminjaman'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}