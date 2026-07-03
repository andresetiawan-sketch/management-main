import { useState, useEffect } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CheckCircle, Upload } from 'lucide-react';
import CompanyNameAnimator from '@/components/ui/CompanyNameAnimator';
import { toast } from 'sonner';

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_69a92e93919b7a92ebbfa25b/d40283b2f_image.png";

const DEFAULT_JABATAN = ['Master Admin', 'Admin Pos', 'Chief Security', 'Leader Security', 'Supervisor Facility', 'Leader Facility', 'Staff', 'PIC Client'];

export default function ApplyJob() {
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [areaData, setAreaData] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    base44.entities.AreaProject.filter({ status: 'Aktif' }).then(setAreas);
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      base44.entities.AreaProject.filter({ link_pelamar: code }).then((res) => {
        if (res.length) {
          setSelectedArea(res[0].nama_area);
          setAreaData(res[0]);
          setForm((prev) => ({ ...prev, branch: res[0].nama_area }));
        }
      });
    }
  }, []);

  const handleAreaChange = (val) => {
    setSelectedArea(val);
    const found = areas.find((a) => a.nama_area === val);
    setAreaData(found || null);
    setForm((prev) => ({ ...prev, branch: val }));
  };

  const handleFile = async (field, file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, [field]: file_url }));
  };

  const toUpper = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val.toUpperCase() }));
  };

  const handleSubmit = async () => {
    if (!form.nama_lengkap || !form.nik_ektp || !form.no_telepon) {
      toast.error('Nama, NIK E-KTP, dan No. Telepon wajib diisi');
      return;
    }
    setProcessing(true);

    // Check NIK E-KTP duplicate
    const existing = await base44.entities.Applicant.filter({ nik_ektp: form.nik_ektp });
    if (existing.length > 0) {
      toast.error(`⚠️ NIK E-KTP ${form.nik_ektp} sudah terdaftar dalam sistem. Anda tidak dapat mengirim lamaran ulang dengan NIK yang sama. Silakan cek status lamaran Anda.`, { duration: 8000 });
      setProcessing(false);
      return;
    }

    const birthDate = form.tanggal_lahir ? new Date(form.tanggal_lahir) : null;
    const usia = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / 31557600000) : null;

    await base44.entities.Applicant.create({
      ...form,
      area_client: selectedArea,
      status: 'Pending',
      usia
    });
    setProcessing(false);
    setSubmitted(true);
    // Store NIK for status tracking
    if (form.nik_ektp) {
      sessionStorage.setItem('pis_apply_nik', form.nik_ektp);
    }
  };

  const jabatanList = areaData?.jabatan_tersedia?.length ? areaData.jabatan_tersedia : DEFAULT_JABATAN;

  const FileInput = ({ label, field }) =>
  <div>
      <Label className="text-sm">{label}</Label>
      <div className="mt-1">
        <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <Upload className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{form[field] ? 'Terupload ✓' : 'Pilih file...'}</span>
          <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => e.target.files[0] && handleFile(field, e.target.files[0])} />
        </label>
      </div>
    </div>;


  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--maroon-50)] to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-xl">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Lamaran Berhasil Dikirim!</h2>
          <p className="text-sm text-gray-500">Data Anda telah diterima. Silakan tunggu proses seleksi.</p>
          <a
            href={`/ApplyJobStatus?nik=${encodeURIComponent(form.nik_ektp || '')}`}
            className="inline-block mt-3 text-sm text-blue-600 underline">
            
            Cek status lamaran Anda →
          </a>
        </Card>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--maroon-50)] to-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          
          <h1 className="text-red-800 text-2xl font-bold">E-RECRUITMENT PIS</h1>
          <CompanyNameAnimator />
          <p className="text-sm text-gray-500 mt-2">Formulir Lamaran Kerja</p>
        </div>

        <Card className="p-6 md:p-8 border-0 shadow-lg space-y-6">
          {!selectedArea &&
          <div>
              <Label>Pilih Area Tugas</Label>
              <Select value={selectedArea} onValueChange={handleAreaChange}>
                <SelectTrigger><SelectValue placeholder="Pilih area..." /></SelectTrigger>
                <SelectContent>
                  {areas.map((a) => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          }

          {selectedArea &&
          <>
              <div className="bg-[var(--maroon-50)] rounded-xl p-3 text-center">
                <p className="text-sm font-medium text-[var(--maroon)]">Area: {selectedArea}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Nama Lengkap *</Label>
                  <Input value={form.nama_lengkap || ''} onChange={(e) => toUpper('nama_lengkap', e.target.value)} placeholder="NAMA LENGKAP" />
                </div>
                <div>
                  <Label>Jenis Kelamin</Label>
                  <Select value={form.jenis_kelamin || ''} onValueChange={(v) => setForm({ ...form, jenis_kelamin: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>NIK E-KTP *</Label>
                  <Input value={form.nik_ektp || ''} onChange={(e) => setForm({ ...form, nik_ektp: e.target.value })} />
                </div>
                <FileInput label="Upload E-KTP" field="foto_ektp" />
                <FileInput label="Foto SKCK" field="foto_skck" />
                <div><Label>No. KK</Label><Input value={form.no_kk || ''} onChange={(e) => setForm({ ...form, no_kk: e.target.value })} /></div>
                <FileInput label="Foto KK" field="foto_kk" />
                <div><Label>No. NPWP</Label><Input value={form.no_npwp || ''} onChange={(e) => setForm({ ...form, no_npwp: e.target.value })} /></div>
                <FileInput label="Foto NPWP" field="foto_npwp" />
                <div>
                  <Label>SIM Type</Label>
                  <Select value={form.sim_type || ''} onValueChange={(v) => setForm({ ...form, sim_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent>
                      {["SIM A", "SIM B1", "SIM B2", "SIM C", "Tidak Ada"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <FileInput label="Foto SIM" field="foto_sim" />
                <FileInput label="Foto CV" field="foto_cv" />
                <FileInput label="Foto Surat Sehat" field="foto_surat_sehat" />
                <div>
                  <Label>Tempat Lahir</Label>
                  <Input value={form.tempat_lahir || ''} onChange={(e) => toUpper('tempat_lahir', e.target.value)} placeholder="TEMPAT LAHIR" />
                </div>
                <div><Label>Tanggal Lahir</Label><Input type="date" value={form.tanggal_lahir || ''} onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Alamat</Label><Input value={form.alamat || ''} onChange={(e) => setForm({ ...form, alamat: e.target.value })} placeholder="Alamat domisili saat ini..." /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>RT</Label><Input value={form.rt || ''} onChange={(e) => setForm({ ...form, rt: e.target.value })} /></div>
                  <div><Label>RW</Label><Input value={form.rw || ''} onChange={(e) => setForm({ ...form, rw: e.target.value })} /></div>
                </div>
                <div><Label>Kelurahan/Desa</Label><Input value={form.kelurahan || ''} onChange={(e) => setForm({ ...form, kelurahan: e.target.value })} /></div>
                <div><Label>Kecamatan</Label><Input value={form.kecamatan || ''} onChange={(e) => setForm({ ...form, kecamatan: e.target.value })} /></div>
                <div><Label>Kabupaten/Kota</Label><Input value={form.kabupaten_kota || ''} onChange={(e) => setForm({ ...form, kabupaten_kota: e.target.value })} /></div>
                <div><Label>Provinsi</Label><Input value={form.provinsi || ''} onChange={(e) => setForm({ ...form, provinsi: e.target.value })} /></div>
                <FileInput label="Foto Setengah Badan" field="foto_setengah_badan" />
                <div><Label>Email</Label><Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>No. Telepon/WA *</Label><Input value={form.no_telepon || ''} onChange={(e) => setForm({ ...form, no_telepon: e.target.value })} /></div>
                <div>
                  <Label>Posisi yang diinginkan</Label>
                  <Select value={form.posisi_diinginkan || ''} onValueChange={(v) => setForm({ ...form, posisi_diinginkan: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih posisi..." /></SelectTrigger>
                    <SelectContent>
                      {jabatanList.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Branch</Label>
                  <Input value={form.branch || selectedArea || ''} readOnly className="bg-gray-50 text-gray-500" />
                </div>
                <div><Label>Tinggi Badan (cm)</Label><Input type="number" value={form.tinggi_badan || ''} onChange={(e) => setForm({ ...form, tinggi_badan: Number(e.target.value) })} /></div>
                <div><Label>Berat Badan (kg)</Label><Input type="number" value={form.berat_badan || ''} onChange={(e) => setForm({ ...form, berat_badan: Number(e.target.value) })} /></div>
                <div><Label>Ukuran Baju</Label><Input value={form.ukuran_baju || ''} onChange={(e) => setForm({ ...form, ukuran_baju: e.target.value })} /></div>
                <div><Label>Ukuran Sepatu</Label><Input value={form.ukuran_sepatu || ''} onChange={(e) => setForm({ ...form, ukuran_sepatu: e.target.value })} /></div>
                <div><Label>Pendidikan SD</Label><Input value={form.pendidikan_sd || ''} onChange={(e) => setForm({ ...form, pendidikan_sd: e.target.value })} /></div>
                <div><Label>Pendidikan SMP</Label><Input value={form.pendidikan_smp || ''} onChange={(e) => setForm({ ...form, pendidikan_smp: e.target.value })} /></div>
                <div><Label>Pendidikan SMA/SMK/Sederajat</Label><Input value={form.pendidikan_sma || ''} onChange={(e) => setForm({ ...form, pendidikan_sma: e.target.value })} /></div>
                <div><Label>Ijazah Terakhir</Label><Input value={form.ijazah_terakhir || ''} onChange={(e) => setForm({ ...form, ijazah_terakhir: e.target.value })} /></div>
                <div><Label>Pendidikan Eksternal</Label><Input value={form.pendidikan_eksternal || ''} onChange={(e) => setForm({ ...form, pendidikan_eksternal: e.target.value })} /></div>
                <FileInput label="Sertifikat Pendidikan External" field="sertifikat_eksternal" />
                <FileInput label="Foto KTA (opsional)" field="foto_kta" />
                <div><Label>Pendidikan D3</Label><Input value={form.pendidikan_d3 || ''} onChange={(e) => setForm({ ...form, pendidikan_d3: e.target.value })} /></div>
                <div><Label>Pendidikan S1</Label><Input value={form.pendidikan_s1 || ''} onChange={(e) => setForm({ ...form, pendidikan_s1: e.target.value })} /></div>
                <div><Label>Pendidikan S2</Label><Input value={form.pendidikan_s2 || ''} onChange={(e) => setForm({ ...form, pendidikan_s2: e.target.value })} /></div>
                <div>
                  <Label>Nama Ibu Kandung</Label>
                  <Input value={form.nama_ibu_kandung || ''} onChange={(e) => toUpper('nama_ibu_kandung', e.target.value)} placeholder="NAMA IBU KANDUNG" />
                </div>
                <div><Label>No. Telp Ibu/Kerabat</Label><Input value={form.no_telp_ibu || ''} onChange={(e) => setForm({ ...form, no_telp_ibu: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Alamat Ibu/Kerabat</Label><Input value={form.alamat_ibu || ''} onChange={(e) => setForm({ ...form, alamat_ibu: e.target.value })} /></div>
              </div>

              <Button onClick={handleSubmit} disabled={processing} className="bg-slate-950 text-primary-foreground px-4 py-2 text-base font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow w-full hover:bg-[var(--maroon-light)] h-12">
                {processing ? 'Mengirim...' : 'Kirim Lamaran'}
              </Button>
            </>
          }
        </Card>
      </div>
    </div>);

}