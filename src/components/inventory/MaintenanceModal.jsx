import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function PhotoField({ value, onChange, label }) {
  const [loading, setLoading] = useState(false);
  const handle = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange(file_url); setLoading(false);
  };
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">
        {value
          ? <div className="relative group inline-block">
              <img src={value} className="w-20 h-20 object-cover rounded-lg border border-gray-200" alt={label} />
              <button type="button" onClick={() => onChange('')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100">✕</button>
            </div>
          : <label className={`flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 cursor-pointer hover:border-red-400 w-fit ${loading ? 'opacity-50' : ''}`}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              {loading ? 'Uploading...' : 'Upload Foto'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
            </label>
        }
      </div>
    </div>
  );
}

export default function MaintenanceModal({ item, open, onClose }) {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const qc = useQueryClient();

  const [form, setForm] = useState({
    inventory_id: item?.id || '',
    kode_barang: item?.kode_barang || '',
    nama_barang: item?.nama_barang || '',
    area_tugas: item?.area_tugas || '',
    tanggal: new Date().toISOString().slice(0, 10),
    jenis_maintenance: 'Pengecekan Rutin',
    kondisi_sebelum: item?.kondisi || 'Baik',
    kondisi_sesudah: 'Baik',
    deskripsi: '',
    biaya: 0,
    foto_before: '',
    foto_after: '',
    teknisi: '',
    nik_pelapor: emp.nik_karyawan || '',
    nama_pelapor: emp.nama_lengkap || '',
    status: 'Selesai',
  });

  const mut = useMutation({
    mutationFn: async (data) => {
      await base44.entities.AssetMaintenance.create(data);
      // Update kondisi barang
      if (data.kondisi_sesudah !== item.kondisi) {
        await base44.entities.Inventory.update(item.id, { kondisi: data.kondisi_sesudah });
      }
    },
    onSuccess: () => {
      toast.success('Laporan maintenance disimpan');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['maintenance', item?.id] });
      onClose();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Laporan Maintenance — {item?.nama_barang}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tanggal</Label>
              <Input type="date" value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Jenis</Label>
              <Select value={form.jenis_maintenance} onValueChange={v => setForm(p => ({ ...p, jenis_maintenance: v }))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Pengecekan Rutin','Perbaikan','Penggantian Komponen','Kalibrasi','Pembersihan'].map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Kondisi Sebelum</Label>
              <Select value={form.kondisi_sebelum} onValueChange={v => setForm(p => ({ ...p, kondisi_sebelum: v }))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Baik','Cukup','Rusak'].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Kondisi Sesudah</Label>
              <Select value={form.kondisi_sesudah} onValueChange={v => setForm(p => ({ ...p, kondisi_sesudah: v }))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Baik','Cukup','Rusak'].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Deskripsi Pekerjaan</Label>
            <Textarea value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))} className="mt-1 text-sm h-20 resize-none" placeholder="Jelaskan pekerjaan maintenance..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nama Teknisi</Label>
              <Input value={form.teknisi} onChange={e => setForm(p => ({ ...p, teknisi: e.target.value }))} className="mt-1 h-9 text-sm" placeholder="Nama teknisi..." />
            </div>
            <div>
              <Label className="text-xs">Biaya (Rp)</Label>
              <Input type="number" value={form.biaya} onChange={e => setForm(p => ({ ...p, biaya: Number(e.target.value) }))} className="mt-1 h-9 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{['Selesai','Dalam Proses','Menunggu Sparepart'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PhotoField value={form.foto_before} onChange={v => setForm(p => ({ ...p, foto_before: v }))} label="Foto Before" />
            <PhotoField value={form.foto_after} onChange={v => setForm(p => ({ ...p, foto_after: v }))} label="Foto After" />
          </div>
          <Button onClick={() => mut.mutate(form)} disabled={mut.isPending} className="w-full bg-[#7B1A2C] hover:bg-[#5A1220] text-white">
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Laporan Maintenance'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}