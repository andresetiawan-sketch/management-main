import { useState, useRef } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Camera, Save, Lock, UserCircle, Phone, Mail, MapPin, CreditCard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Fields that are LOCKED and cannot be edited by the user
const LOCKED_FIELDS = ['jabatan', 'area_tugas', 'regu', 'nik_karyawan', 'entity_pt', 'branch'];

export default function MyProfile() {
  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const fileRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const qc = useQueryClient();

  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';

  const { data: empData, isLoading } = useQuery({
    queryKey: ['my-profile', employee?.nik_karyawan],
    queryFn: async () => {
      const results = await base44.entities.Employee.filter({ nik_karyawan: employee.nik_karyawan });
      return results[0] || null;
    },
    enabled: !!employee?.nik_karyawan,
    onSuccess: (data) => {
      if (data && !form) {
        setForm({
          no_telepon: data.no_telepon || '',
          email: data.email || '',
          alamat: data.alamat || '',
          no_rekening: data.no_rekening || '',
          bank: data.bank || ''
        });
      }
    }
  });

  // initialize form from query data
  const currentForm = form || {
    no_telepon: empData?.no_telepon || '',
    email: empData?.email || '',
    alamat: empData?.alamat || '',
    no_rekening: empData?.no_rekening || '',
    bank: empData?.bank || ''
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Employee.update(empData.id, { foto: file_url });
    // Update localStorage
    const stored = JSON.parse(localStorage.getItem('pis_employee') || '{}');
    localStorage.setItem('pis_employee', JSON.stringify({ ...stored, foto: file_url }));
    qc.invalidateQueries({ queryKey: ['my-profile'] });
    toast.success('Foto profil berhasil diperbarui');
    setUploadingPhoto(false);
  };

  const handleSave = async () => {
    if (!empData) return;
    setSaving(true);
    const updates = {
      no_telepon: currentForm.no_telepon,
      email: currentForm.email,
      alamat: currentForm.alamat,
      no_rekening: currentForm.no_rekening,
      bank: currentForm.bank
    };
    await base44.entities.Employee.update(empData.id, updates);
    // Sync localStorage agar sesi sinkron
    const stored = JSON.parse(localStorage.getItem('pis_employee') || '{}');
    localStorage.setItem('pis_employee', JSON.stringify({ ...stored, ...updates }));
    qc.invalidateQueries({ queryKey: ['my-profile'] });
    toast.success('Profil berhasil disimpan');
    setSaving(false);
  };

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;
  if (!empData) return <div className="text-center text-gray-400 py-20">Data karyawan tidak ditemukan</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Photo & Identity Card */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="bg-transparent h-20" />
        <CardContent className="pt-0 pb-5 px-5 relative">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="relative">
              {empData.foto ?
              <img src={empData.foto} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow" /> :
              <div className="w-20 h-20 rounded-full bg-gray-200 border-4 border-white shadow flex items-center justify-center">
                    <UserCircle className="w-10 h-10 text-gray-400" />
                  </div>
              }
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 bg-red-700 text-white rounded-full p-1.5 shadow hover:bg-red-800 transition">

                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div className="pb-1">
              <h2 className="text-lg font-bold text-gray-800">{empData.nama_lengkap}</h2>
              <p className="text-sm font-mono text-red-700">{empData.nik_karyawan}</p>
              <Badge className="bg-red-100 text-red-700 border-0 text-xs mt-1">{empData.jabatan || 'Staff'}</Badge>
            </div>
          </div>

          {/* Locked Info Fields */}
          <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4 mb-2">
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Jabatan</p>
              <p className="text-sm font-semibold text-gray-700">{empData.jabatan || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Area Tugas</p>
              <p className="text-sm font-semibold text-gray-700">{empData.area_tugas || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Regu</p>
              <p className="text-sm font-semibold text-gray-700">{empData.regu || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Entity PT</p>
              <p className="text-sm font-semibold text-gray-700">{empData.entity_pt || '-'}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
            <Lock className="w-3 h-3" /> Field di atas hanya dapat diubah oleh Admin
          </p>
        </CardContent>
      </Card>

      {/* Editable Fields */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-700">Informasi Dapat Diedit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> No. Telepon</Label>
            <Input
              value={currentForm.no_telepon}
              onChange={(e) => setForm({ ...currentForm, no_telepon: e.target.value })}
              placeholder="Masukkan no. telepon..."
              className="mt-1" />

          </div>
          <div>
            <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> Email</Label>
            <Input
              type="email"
              value={currentForm.email}
              onChange={(e) => setForm({ ...currentForm, email: e.target.value })}
              placeholder="Masukkan email..."
              className="mt-1" />

          </div>
          <div>
            <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /> Alamat Tinggal</Label>
            <Input
              value={currentForm.alamat}
              onChange={(e) => setForm({ ...currentForm, alamat: e.target.value })}
              placeholder="Masukkan alamat..."
              className="mt-1" />

          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-gray-400" /> Bank</Label>
              <Input
                value={currentForm.bank}
                onChange={(e) => setForm({ ...currentForm, bank: e.target.value })}
                placeholder="Nama bank..."
                className="mt-1" />

            </div>
            <div>
              <Label>No. Rekening</Label>
              <Input
                value={currentForm.no_rekening}
                onChange={(e) => setForm({ ...currentForm, no_rekening: e.target.value })}
                placeholder="No. rekening..."
                className="mt-1" />

            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-red-700 hover:bg-red-800 text-white">
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </CardContent>
      </Card>
    </div>);

}