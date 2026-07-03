import { useState, useEffect } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, LogIn, Search } from 'lucide-react';
import { createPageUrl } from '@/utils';
import CompanyNameAnimator from '@/components/ui/CompanyNameAnimator';

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69ae71d19fe396b3470078b2/74c75dcf9_Logobulat.png";

export default function ApplyJobStatus() {
  const [searchNIK, setSearchNIK] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Try to auto-load from URL or query
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nik = params.get('nik');
    const phone = params.get('phone');
    if (nik) setSearchNIK(nik);
    if (phone) setSearchPhone(phone);
    if (nik || phone) handleSearch(nik, phone);
  }, []);

  const handleSearch = async (nik, phone) => {
    const nikVal = nik || searchNIK;
    const phoneVal = phone || searchPhone;
    if (!nikVal && !phoneVal) return;
    setLoading(true);
    setSearched(false);
    let results = [];
    if (nikVal) {
      results = await base44.entities.Applicant.filter({ nik_ektp: nikVal });
    } else if (phoneVal) {
      results = await base44.entities.Applicant.filter({ no_telepon: phoneVal });
    }
    setApplicant(results[0] || null);
    setSearched(true);
    setLoading(false);
  };

  const StatusDisplay = ({ app }) => {
    if (app.status === 'Approved') {
      return (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-emerald-700 mb-2">🎉 Selamat!</h2>
            <p className="text-gray-600 mb-4">
              Halo <strong>{app.nama_lengkap}</strong>, lamaran Anda telah <strong>disetujui</strong>!
              Anda resmi bergabung sebagai karyawan PIS Integrated.
            </p>
          </div>

          {app.nik_karyawan && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
              <p className="text-sm font-semibold text-emerald-800">Informasi Akun Anda:</p>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">NIK Karyawan:</span>
                  <span className="font-bold text-emerald-700 text-lg">{app.nik_karyawan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Area Tugas:</span>
                  <span className="font-medium">{app.area_client || '-'}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-emerald-100 text-xs text-gray-600 space-y-1">
                <p className="font-semibold text-gray-700">Panduan Login:</p>
                <p>1. Buka halaman login karyawan</p>
                <p>2. Masukkan NIK Karyawan: <strong>{app.nik_karyawan}</strong></p>
                <p>3. Password default: <strong>123456</strong></p>
                <p>4. Segera ganti password setelah login pertama</p>
              </div>
            </div>
          )}

          <Button
            onClick={() => window.location.href = createPageUrl('EmployeeLogin')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base"
          >
            <LogIn className="w-5 h-5 mr-2" /> Login ke Dashboard Karyawan
          </Button>
        </div>
      );
    }

    if (app.status === 'Rejected') {
      return (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Mohon Maaf</h2>
            <p className="text-gray-600">
              Halo <strong>{app.nama_lengkap}</strong>, kami menyampaikan bahwa lamaran Anda
              <strong> tidak dapat kami proses</strong> saat ini.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Terima kasih atas minat Anda bergabung bersama kami. Semoga sukses di kesempatan berikutnya.
            </p>
          </div>
          <Badge className="bg-red-100 text-red-700 border-red-200 text-sm px-4 py-1">Lamaran Ditolak</Badge>
        </div>
      );
    }

    // Pending
    return (
      <div className="text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-amber-600 mb-2">Sedang Diproses</h2>
          <p className="text-gray-600">
            Halo <strong>{app.nama_lengkap}</strong>, lamaran Anda sedang dalam proses review.
            Silakan cek kembali secara berkala.
          </p>
        </div>
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-sm px-4 py-1">Menunggu Review</Badge>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="PIS" className="w-16 h-16 mx-auto mb-3 object-contain" />
          <h1 className="text-red-800 text-2xl font-bold">PIS Integrated</h1>
          <CompanyNameAnimator />
          <p className="text-sm text-gray-500 mt-2">Status Lamaran Kerja</p>
        </div>

        <Card className="p-6 border-0 shadow-lg">
          {!searched || !applicant ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Cek Status Lamaran</h3>
              <p className="text-sm text-gray-500">Masukkan NIK E-KTP atau Nomor Telepon yang didaftarkan.</p>
              <div>
                <Label>NIK E-KTP</Label>
                <Input
                  value={searchNIK}
                  onChange={(e) => setSearchNIK(e.target.value)}
                  placeholder="16 digit NIK E-KTP"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="text-center text-xs text-gray-400">— atau —</div>
              <div>
                <Label>No. Telepon/WA</Label>
                <Input
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  placeholder="Nomor yang didaftarkan"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button
                onClick={() => handleSearch()}
                disabled={loading || (!searchNIK && !searchPhone)}
                className="w-full bg-red-800 hover:bg-red-900 text-white h-11"
              >
                <Search className="w-4 h-4 mr-2" />
                {loading ? 'Mencari...' : 'Cek Status'}
              </Button>

              {searched && !applicant && (
                <p className="text-center text-sm text-red-500">
                  Data lamaran tidak ditemukan. Pastikan NIK atau nomor telepon yang dimasukkan benar.
                </p>
              )}
            </div>
          ) : (
            <div>
              <StatusDisplay app={applicant} />
              <Button
                variant="outline"
                className="w-full mt-4 text-sm"
                onClick={() => { setApplicant(null); setSearched(false); setSearchNIK(''); setSearchPhone(''); }}
              >
                Cek Lamaran Lain
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}