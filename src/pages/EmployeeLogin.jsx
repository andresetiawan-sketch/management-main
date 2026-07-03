import { useState } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, KeyRound, Briefcase, Eye, EyeOff } from 'lucide-react';
import CompanyNameAnimator from '@/components/ui/CompanyNameAnimator';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a933d92aa04632a6b6bb01/f018aadd1_images1.jpeg";

export default function EmployeeLogin() {
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState('login');
  const [newPassword, setNewPassword] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleLogin = async () => {
    if (!nik || !password) {toast.error('Masukkan NIK dan Password');return;}
    setProcessing(true);
    const response = await base44.functions.invoke('employeeLogin', { nik, password });
    const result = response.data;
    if (!result.success) {
      toast.error(result.error || 'Login gagal');setProcessing(false);return;
    }
    const emp = result.employee;
    // Simpan sesi karyawan di localStorage
    localStorage.setItem('pis_employee', JSON.stringify(emp));
    toast.success(`Selamat datang, ${emp.nama_lengkap}`);
    setProcessing(false);
    window.location.href = createPageUrl('Dashboard');
  };

  const handleResetPassword = async () => {
    if (!nik || !newPassword) {toast.error('Lengkapi data');return;}
    setProcessing(true);
    const response = await base44.functions.invoke('employeeResetPassword', { nik, newPassword });
    const result = response.data;
    if (!result.success) {
      toast.error(result.error || 'Gagal mengganti password');setProcessing(false);return;
    }
    toast.success('Password berhasil diubah, silakan login kembali');
    setMode('login');
    setProcessing(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--maroon)] flex-col items-center justify-center p-12 relative overflow-hidden select-none">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white" />
          <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-white" />
        </div>
        <img src={LOGO_URL} alt="PIS" className="w-32 h-32 object-contain mb-6 relative z-10" />
        <h1 className="text-slate-900 mb-2 text-3xl font-bold text-center relative z-10">INTEGRATED</h1>
        <div className="relative z-10"><CompanyNameAnimator light /></div>
        <p className="text-white/70 text-sm mt-4 text-center relative z-10">
          Sistem Manajemen Karyawan<br />Integrated Facility & Security Services
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-5 bg-gray-50 min-h-screen">
        <Card className="w-full max-w-sm p-7 border-0 shadow-xl bg-white rounded-2xl">
          <div className="text-center mb-6 lg:hidden">
            <img src={LOGO_URL} alt="PIS" className="w-14 h-14 mx-auto mb-3 object-contain" />
            <h1 className="text-xl font-bold text-[var(--maroon)]">INTEGRATED</h1>
            <CompanyNameAnimator />
          </div>

          {mode === 'login' ?
          <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">Masuk</h2>
                <p className="text-sm text-gray-400 mt-1">Login dengan NIK ID Karyawan Anda</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">NIK ID Karyawan</Label>
                  <Input
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  placeholder="Contoh: PU072026001"
                  className="mt-1 h-11 border-gray-200 focus:border-[var(--maroon)] focus:ring-[var(--maroon)]"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />

                </div>
                <div>
                  <Label className="text-sm font-medium">Password</Label>
                  <div className="relative mt-1">
                    <Input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (default: 123456)"
                    className="h-11 border-gray-200 pr-10 focus:border-[var(--maroon)] focus:ring-[var(--maroon)]"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />

                    <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">

                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                onClick={handleLogin}
                disabled={processing}
                className="w-full h-12 bg-red-700 hover:bg-red-800 text-white font-medium mt-2 text-base rounded-xl active:scale-95 transition-all">

                  <LogIn className="w-4 h-4 mr-2" />
                  {processing ? 'Memproses...' : 'Masuk'}
                </Button>
                <button
                onClick={() => setMode('reset')}
                className="text-xs text-[var(--maroon)] hover:underline w-full text-center block">

                  <KeyRound className="w-3 h-3 inline mr-1" /> Lupa Password?
                </button>
              </div>
            </> :

          <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">Ganti Password</h2>
                <p className="text-sm text-gray-400 mt-1">Masukkan NIK dan password baru Anda</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">NIK ID Karyawan</Label>
                  <Input value={nik} onChange={(e) => setNik(e.target.value)} placeholder="Masukkan NIK ID..." className="mt-1 h-11" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Password Baru</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password baru..." className="mt-1 h-11" />
                </div>
                <Button onClick={handleResetPassword} disabled={processing} className="w-full h-12 bg-red-700 hover:bg-red-800 text-white rounded-xl active:scale-95 transition-all">
                  {processing ? 'Memproses...' : 'Ganti Password'}
                </Button>
                <button onClick={() => setMode('login')} className="text-xs text-gray-500 hover:underline w-full text-center block">
                  ← Kembali ke Login
                </button>
              </div>
            </>
          }

          <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
            <a href={createPageUrl('ApplyJob')} className="flex items-center justify-center gap-2 text-sm text-[var(--maroon)] hover:underline font-medium">
              <Briefcase className="w-4 h-4" /> Melamar Kerja
            </a>
            <a href={createPageUrl('ApplyJobStatus')} className="flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-[var(--maroon)] hover:underline">
              🔍 Cek Status Lamaran Kerja
            </a>
          </div>
        </Card>
      </div>
    </div>);

}