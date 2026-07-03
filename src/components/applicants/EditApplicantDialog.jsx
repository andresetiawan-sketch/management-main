import { useState, useEffect } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function EditApplicantDialog({ open, applicant, onClose, onSuccess }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (applicant) {
      setForm({
        nama_lengkap: applicant.nama_lengkap || '',
        nik_ektp: applicant.nik_ektp || '',
        jenis_kelamin: applicant.jenis_kelamin || '',
        tempat_lahir: applicant.tempat_lahir || '',
        tanggal_lahir: applicant.tanggal_lahir || '',
        email: applicant.email || '',
        no_telepon: applicant.no_telepon || '',
        alamat: applicant.alamat || '',
        posisi_diinginkan: applicant.posisi_diinginkan || '',
        area_client: applicant.area_client || '',
        branch: applicant.branch || '',
        tinggi_badan: applicant.tinggi_badan || '',
        berat_badan: applicant.berat_badan || '',
        ukuran_baju: applicant.ukuran_baju || '',
        ukuran_sepatu: applicant.ukuran_sepatu || '',
        sim_type: applicant.sim_type || '',
        no_kk: applicant.no_kk || '',
        no_npwp: applicant.no_npwp || '',
        nama_ibu_kandung: applicant.nama_ibu_kandung || '',
        no_telp_ibu: applicant.no_telp_ibu || '',
        usia: applicant.usia || '',
      });
    }
  }, [applicant]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Applicant.update(applicant.id, form);
    toast.success('Data pelamar berhasil diperbarui');
    setSaving(false);
    onSuccess?.();
    onClose?.();
  };

  if (!applicant) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Data Pelamar — {applicant.nama_lengkap}</DialogTitle></DialogHeader>
        <Tabs defaultValue="personal">
          <TabsList className="w-full">
            <TabsTrigger value="personal" className="flex-1">Data Pribadi</TabsTrigger>
            <TabsTrigger value="kontak" className="flex-1">Kontak & Posisi</TabsTrigger>
            <TabsTrigger value="fisik" className="flex-1">Fisik & Lainnya</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nama Lengkap</Label>
                <Input value={form.nama_lengkap} onChange={e => set('nama_lengkap', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>NIK E-KTP</Label>
                <Input value={form.nik_ektp} onChange={e => set('nik_ektp', e.target.value)} className="mt-1" />
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
                <Label>Tempat Lahir</Label>
                <Input value={form.tempat_lahir} onChange={e => set('tempat_lahir', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Tanggal Lahir</Label>
                <Input type="date" value={form.tanggal_lahir} onChange={e => set('tanggal_lahir', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Usia</Label>
                <Input type="number" value={form.usia} onChange={e => set('usia', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>No. KK</Label>
                <Input value={form.no_kk} onChange={e => set('no_kk', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>No. NPWP</Label>
                <Input value={form.no_npwp} onChange={e => set('no_npwp', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Nama Ibu Kandung</Label>
                <Input value={form.nama_ibu_kandung} onChange={e => set('nama_ibu_kandung', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>No. Telp Ibu</Label>
                <Input value={form.no_telp_ibu} onChange={e => set('no_telp_ibu', e.target.value)} className="mt-1" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="kontak" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>No. Telepon</Label>
                <Input value={form.no_telepon} onChange={e => set('no_telepon', e.target.value)} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Alamat Tinggal</Label>
                <Input value={form.alamat} onChange={e => set('alamat', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Area Client</Label>
                <Input value={form.area_client} onChange={e => set('area_client', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Branch</Label>
                <Input value={form.branch} onChange={e => set('branch', e.target.value)} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Posisi Diinginkan</Label>
                <Input value={form.posisi_diinginkan} onChange={e => set('posisi_diinginkan', e.target.value)} className="mt-1" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fisik" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tinggi Badan (cm)</Label>
                <Input type="number" value={form.tinggi_badan} onChange={e => set('tinggi_badan', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Berat Badan (kg)</Label>
                <Input type="number" value={form.berat_badan} onChange={e => set('berat_badan', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Ukuran Baju</Label>
                <Input value={form.ukuran_baju} onChange={e => set('ukuran_baju', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Ukuran Sepatu</Label>
                <Input value={form.ukuran_sepatu} onChange={e => set('ukuran_sepatu', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Tipe SIM</Label>
                <Select value={form.sim_type} onValueChange={v => set('sim_type', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                  <SelectContent>
                    {['SIM A','SIM B1','SIM B2','SIM C','Tidak Ada'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-red-700 hover:bg-red-800 text-white">
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}