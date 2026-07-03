import { useState } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const JABATAN_LIST = ['Master Admin','Admin Pos','Chief Security','Leader Security','Supervisor Facility','Leader Facility','Staff','PIC Client'];
const REGU_LIST = ['Regu A','Regu B','Regu C','Regu D','Non Regu'];

export default function AddEmployeeDialog({ open, onClose, onSuccess, areas = [] }) {
  const [form, setForm] = useState({
    nik_karyawan: '', nama_lengkap: '', jabatan: '', area_tugas: '', regu: '',
    entity_pt: '', branch: '', email: '', no_telepon: '', jenis_kelamin: '',
    status_aktif: 'Aktif', role: 'Staff', password: '123456'
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nik_karyawan || !form.nama_lengkap) {
      toast.error('NIK dan Nama wajib diisi');
      return;
    }
    setSaving(true);
    await base44.entities.Employee.create(form);
    toast.success('Karyawan berhasil ditambahkan');
    setSaving(false);
    onSuccess?.();
    onClose?.();
    setForm({ nik_karyawan:'',nama_lengkap:'',jabatan:'',area_tugas:'',regu:'',entity_pt:'',branch:'',email:'',no_telepon:'',jenis_kelamin:'',status_aktif:'Aktif',role:'Staff',password:'123456' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Tambah Karyawan Manual</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>NIK Karyawan *</Label>
            <Input value={form.nik_karyawan} onChange={e => set('nik_karyawan', e.target.value)} placeholder="Contoh: PU072026001" className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label>Nama Lengkap *</Label>
            <Input value={form.nama_lengkap} onChange={e => set('nama_lengkap', e.target.value)} placeholder="Nama lengkap karyawan" className="mt-1" />
          </div>
          <div>
            <Label>Jabatan</Label>
            <Select value={form.jabatan} onValueChange={v => set('jabatan', v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih..." /></SelectTrigger>
              <SelectContent>{JABATAN_LIST.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={v => set('role', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{JABATAN_LIST.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Area Tugas</Label>
            <Select value={form.area_tugas} onValueChange={v => set('area_tugas', v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih area..." /></SelectTrigger>
              <SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Regu</Label>
            <Select value={form.regu} onValueChange={v => set('regu', v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih..." /></SelectTrigger>
              <SelectContent>{REGU_LIST.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Entity PT</Label>
            <Select value={form.entity_pt} onValueChange={v => set('entity_pt', v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih PT..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PT. PUTRA INDONESIA SOLUSI">PT. PUTRA INDONESIA SOLUSI</SelectItem>
                <SelectItem value="PT. PRESTASI INDONESIA SOLUSI">PT. PRESTASI INDONESIA SOLUSI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Branch</Label>
            <Input value={form.branch} onChange={e => set('branch', e.target.value)} placeholder="Branch..." className="mt-1" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>No. Telepon</Label>
            <Input value={form.no_telepon} onChange={e => set('no_telepon', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Jenis Kelamin</Label>
            <Select value={form.jenis_kelamin} onValueChange={v => set('jenis_kelamin', v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                <SelectItem value="Perempuan">Perempuan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status Aktif</Label>
            <Select value={form.status_aktif} onValueChange={v => set('status_aktif', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Aktif">Aktif</SelectItem>
                <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Password (default: 123456)</Label>
            <Input value={form.password} onChange={e => set('password', e.target.value)} className="mt-1" />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-red-700 hover:bg-red-800 text-white">
            {saving ? 'Menyimpan...' : 'Simpan Karyawan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}