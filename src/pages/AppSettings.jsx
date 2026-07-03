import { useState, useEffect } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, User, Lock, Pencil, Save, X, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function AppSettings() {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [pwMode, setPwMode] = useState(false);
  const [form, setForm] = useState({});
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('pis_employee');
    if (stored) {
      const emp = JSON.parse(stored);
      setEmployee(emp);
      // Load full employee data
      base44.entities.Employee.filter({ nik_karyawan: emp.nik_karyawan }).then((res) => {
        if (res.length) {
          setEmployee(res[0]);
          setForm({
            nama_lengkap: res[0].nama_lengkap || '',
            email: res[0].email || '',
            no_telepon: res[0].no_telepon || '',
            jabatan: res[0].jabatan || '',
            area_tugas: res[0].area_tugas || '',
            alamat: res[0].alamat || ''
          });
        }
      });
    }
    setLoading(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Employee.update(employee.id, form);
    // Update localStorage
    const updated = { ...employee, ...form };
    localStorage.setItem('pis_employee', JSON.stringify(updated));
    setEmployee(updated);
    toast.success('Informasi akun berhasil diperbarui');
    setEditMode(false);
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
      toast.error('Semua field password wajib diisi');
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      toast.error('Password baru tidak cocok');
      return;
    }
    if ((employee.password || '123456') !== pwForm.current) {
      toast.error('Password saat ini salah');
      return;
    }
    setSaving(true);
    await base44.entities.Employee.update(employee.id, { password: pwForm.newPw });
    toast.success('Password berhasil diubah');
    setPwMode(false);
    setPwForm({ current: '', newPw: '', confirm: '' });
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Memuat...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Informasi Akun */}
      <Card className="p-6 border-0 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--maroon-50)]">
              <User className="w-5 h-5 text-[var(--maroon)]" />
            </div>
            <div>
              <h3 className="font-semibold">Informasi Akun</h3>
              <p className="text-xs text-gray-400">Data profil Anda</p>
            </div>
          </div>
          {!editMode ?
          <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
              <Pencil className="w-4 h-4 mr-1" /> Edit
            </Button> :

          <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                <X className="w-4 h-4 mr-1" /> Batal
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="bg-slate-950 text-white px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-8 hover:bg-[var(--maroon-light)]">
                <Save className="w-4 h-4 mr-1" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          }
        </div>

        {!editMode ?
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
          { label: 'NIK Karyawan', value: employee?.nik_karyawan },
          { label: 'Nama Lengkap', value: employee?.nama_lengkap },
          { label: 'Jabatan', value: employee?.jabatan },
          { label: 'Area Tugas', value: employee?.area_tugas },
          { label: 'Email', value: employee?.email },
          { label: 'No. Telepon', value: employee?.no_telepon },
          { label: 'Role', value: employee?.role },
          { label: 'Alamat', value: employee?.alamat }].
          map(({ label, value }) =>
          <div key={label}>
                <Label className="text-xs text-gray-500">{label}</Label>
                <p className="font-medium text-sm">{value || '-'}</p>
              </div>
          )}
          </div> :

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs">Nama Lengkap</Label><Input value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">No. Telepon</Label><Input value={form.no_telepon} onChange={(e) => setForm({ ...form, no_telepon: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Jabatan</Label><Input value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Area Tugas</Label><Input value={form.area_tugas} onChange={(e) => setForm({ ...form, area_tugas: e.target.value })} className="mt-1" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Alamat</Label><Input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="mt-1" /></div>
          </div>
        }
      </Card>

      {/* Ganti Password */}
      <Card className="p-6 border-0 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--maroon-50)]">
              <Lock className="w-5 h-5 text-[var(--maroon)]" />
            </div>
            <div>
              <h3 className="font-semibold">Keamanan</h3>
              <p className="text-xs text-gray-400">Ubah password akun Anda</p>
            </div>
          </div>
          {!pwMode &&
          <Button size="sm" variant="outline" onClick={() => setPwMode(true)}>
              <KeyRound className="w-4 h-4 mr-1" /> Ganti Password
            </Button>
          }
        </div>
        {pwMode &&
        <div className="space-y-3">
            <div><Label className="text-xs">Password Saat Ini</Label><Input type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Password Baru</Label><Input type="password" value={pwForm.newPw} onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Konfirmasi Password</Label><Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} className="mt-1" /></div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {setPwMode(false);setPwForm({ current: '', newPw: '', confirm: '' });}}>Batal</Button>
              <Button onClick={handleChangePassword} disabled={saving} className="bg-[var(--maroon)] hover:bg-[var(--maroon-light)] text-white">
                {saving ? 'Menyimpan...' : 'Simpan Password'}
              </Button>
            </div>
          </div>
        }
      </Card>

      {/* Info Aplikasi */}
      <Card className="p-6 border-0 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-[var(--maroon-50)]">
            <Settings className="w-5 h-5 text-[var(--maroon)]" />
          </div>
          <div>
            <h3 className="font-semibold">Tentang Aplikasi</h3>
            <p className="text-xs text-gray-400">Konfigurasi sistem PIS Integrated</p>
          </div>
        </div>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span>Versi Aplikasi</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">v2.0.0</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span>Head Office</span>
            <span className="text-xs text-right max-w-xs">Jl. Raya Bukit Jl. Nusa Indah No.061, Serua, Kec. Ciputat</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span>Telepon</span>
            <span>(021) 27846500</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span>Website</span>
            <a href="https://www.pissintegrated.com" target="_blank" rel="noopener noreferrer" className="text-[var(--maroon)] hover:underline">www.pissintegrated.com</a>
          </div>
        </div>
      </Card>
    </div>);

}