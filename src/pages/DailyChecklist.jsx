import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ClipboardCheck, Plus, Eye, Star, Shield, Key, Users, Car, FileText, Search, CheckCircle2 } from 'lucide-react';
import SignatureCanvas from '@/components/ui/SignatureCanvas';
import { toast } from 'sonner';
import ChecklistPDFExport from '@/components/checklist/ChecklistPDFExport';

const SHIFT_COLORS = { Pagi: 'bg-yellow-100 text-yellow-700', Siang: 'bg-blue-100 text-blue-700', Malam: 'bg-indigo-100 text-indigo-700' };
const STATUS_COLORS = { 'Menunggu Evaluasi': 'bg-orange-100 text-orange-700', 'Sudah Dievaluasi': 'bg-emerald-100 text-emerald-700' };

const ANSWER_OPTS = ['Ya', 'Tidak', '-'];
const SECTIONS = [
{
  key: 'serah_terima',
  label: 'Serah Terima & Persiapan',
  icon: Shield,
  color: 'text-blue-600',
  bg: 'bg-blue-50',
  items: [
  { key: 'seragam_lengkap', label: 'Seragam lengkap dan rapi' },
  { key: 'id_card', label: 'ID Card / Tanda Pengenal terpasang' },
  { key: 'ht_berfungsi', label: 'HT (Handy Talky) berfungsi baik' },
  { key: 'senter_berfungsi', label: 'Senter / Lampu patroli berfungsi' },
  { key: 'buku_mutasi_tersedia', label: 'Buku mutasi tersedia & siap' },
  { key: 'absensi_terisi', label: 'Absensi shift terisi' },
  { key: 'serah_terima_dilakukan', label: 'Serah terima dengan petugas sebelumnya dilakukan' }]

},
{
  key: 'patroli_area',
  label: 'Patroli Area',
  icon: Key,
  color: 'text-emerald-600',
  bg: 'bg-emerald-50',
  items: [
  { key: 'kunci_pintu_aman', label: 'Kunci semua pintu dalam kondisi aman' },
  { key: 'jendela_aman', label: 'Jendela terperiksa dan aman' },
  { key: 'lampu_area_berfungsi', label: 'Lampu area/penerangan berfungsi baik' },
  { key: 'apar_kondisi_baik', label: 'APAR (Alat Pemadam) kondisi baik & tidak expired' },
  { key: 'potensi_bahaya_ditemukan', label: 'Potensi bahaya/maling/mencurigakan ditemukan?' },
  { key: 'cctv_berfungsi', label: 'CCTV berfungsi dan rekaman baik' },
  { key: 'area_steril', label: 'Area patroli dalam kondisi steril' }]

},
{
  key: 'akses_keluar_masuk',
  label: 'Akses Keluar Masuk',
  icon: Users,
  color: 'text-purple-600',
  bg: 'bg-purple-50',
  items: [
  { key: 'tamu_diperiksa', label: 'Semua tamu diperiksa identitasnya' },
  { key: 'buku_tamu_terisi', label: 'Buku tamu/GuestBook terisi lengkap' },
  { key: 'karyawan_diverifikasi', label: 'Karyawan diverifikasi sebelum masuk' },
  { key: 'kendaraan_diperiksa', label: 'Kendaraan masuk/keluar diperiksa' },
  { key: 'barang_masuk_dicatat', label: 'Barang masuk dicatat dan diperiksa' },
  { key: 'barang_keluar_dicatat', label: 'Barang keluar dicatat dengan surat jalan' }]

},
{
  key: 'ketertiban_parkir',
  label: 'Ketertiban & Parkir',
  icon: Car,
  color: 'text-orange-600',
  bg: 'bg-orange-50',
  items: [
  { key: 'lalulintas_diatur', label: 'Lalu lintas area diatur dengan baik' },
  { key: 'parkir_tertib', label: 'Area parkir dalam kondisi tertib' },
  { key: 'area_sterilisasi_aman', label: 'Area sterilisasi/zona terlarang aman' },
  { key: 'tidak_ada_parkir_liar', label: 'Tidak ada kendaraan parkir liar' },
  { key: 'akses_darurat_bebas', label: 'Akses jalur darurat bebas/tidak terhalang' }]

},
{
  key: 'laporan_akhir',
  label: 'Laporan Akhir Shift',
  icon: FileText,
  color: 'text-red-600',
  bg: 'bg-red-50',
  items: [
  { key: 'buku_mutasi_terisi', label: 'Buku mutasi terisi lengkap di akhir shift' },
  { key: 'kejadian_dilaporkan', label: 'Kejadian selama shift dilaporkan?' },
  { key: 'serah_terima_berikutnya', label: 'Serah terima ke petugas shift berikutnya dilakukan' }]

}];


function ChecklistRow({ label, value, onChange, isKet }) {
  if (isKet) return null;
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2.5 px-3 text-sm text-gray-700 w-full">{label}</td>
      {['Ya', 'Tidak', '-'].map((opt) =>
      <td key={opt} className="py-2.5 px-2 text-center w-16">
          <button
          type="button"
          onClick={() => onChange(opt)}
          className={`w-7 h-7 rounded-full border-2 text-xs font-bold transition-all ${
          value === opt ?
          opt === 'Ya' ? 'bg-emerald-500 border-emerald-500 text-white' :
          opt === 'Tidak' ? 'bg-red-500 border-red-500 text-white' :
          'bg-gray-400 border-gray-400 text-white' :
          'border-gray-300 text-gray-400 hover:border-gray-400'}`
          }>
          
            {opt === 'Ya' ? '✓' : opt === 'Tidak' ? '✗' : '-'}
          </button>
        </td>
      )}
    </tr>);

}

function ChecklistForm({ onClose, editData }) {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const initSection = (sectionDef) => {
    const base = {};
    sectionDef.items.forEach((i) => {base[i.key] = '-';});
    base.keterangan = '';
    return base;
  };

  const [form, setForm] = useState(editData || {
    nik_karyawan: emp.nik_karyawan || '',
    nama_karyawan: emp.nama_lengkap || '',
    jabatan: emp.jabatan || '',
    area_tugas: emp.area_tugas || '',
    tanggal: today,
    shift: 'Pagi',
    penerima_serah_terima: '',
    ttd_penyerah: null,
    ttd_penerima: null,
    serah_terima: initSection(SECTIONS[0]),
    patroli_area: initSection(SECTIONS[1]),
    akses_keluar_masuk: initSection(SECTIONS[2]),
    ketertiban_parkir: initSection(SECTIONS[3]),
    laporan_akhir: { ...initSection(SECTIONS[4]), kejadian_dilaporkan: 'Tidak Ada Kejadian', ringkasan_kejadian: '' }
  });

  // Fetch employees in the same area for receiver selection
  const { data: areaEmployees = [] } = useQuery({
    queryKey: ['employees-area', emp.area_tugas],
    queryFn: () => base44.entities.Employee.filter({ area_tugas: emp.area_tugas, status_aktif: 'Aktif' }, 'nama_lengkap', 100),
    enabled: !!emp.area_tugas
  });

  const setField = (section, key, val) => {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], [key]: val } }));
  };

  const mut = useMutation({
    mutationFn: (data) => editData ?
    base44.entities.DailyChecklist.update(editData.id, data) :
    base44.entities.DailyChecklist.create(data),
    onSuccess: () => {qc.invalidateQueries(['daily-checklist']);toast.success('Checklist berhasil disimpan');onClose();}
  });

  const handleSubmit = (e) => {e.preventDefault();mut.mutate(form);};

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
      {/* Header info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nama Petugas</Label>
          <Input value={form.nama_karyawan} readOnly className="h-9 mt-1 bg-gray-100 cursor-not-allowed" />
        </div>
        <div>
          <Label className="text-xs">Tanggal</Label>
          <Input type="date" value={form.tanggal} onChange={(e) => setForm((p) => ({ ...p, tanggal: e.target.value }))} className="h-9 mt-1" />
        </div>
        <div>
          <Label className="text-xs">Area Tugas</Label>
          <Input value={form.area_tugas} readOnly className="h-9 mt-1 bg-gray-100 cursor-not-allowed" />
        </div>
        <div>
          <Label className="text-xs">Shift</Label>
          <Select value={form.shift} onValueChange={(v) => setForm((p) => ({ ...p, shift: v }))}>
            <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Pagi', 'Siang', 'Malam'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Checklist Sections */}
      {SECTIONS.map((section) => {
        const Icon = section.icon;
        const sectionData = form[section.key] || {};
        return (
          <div key={section.key} className={`rounded-xl border overflow-hidden`}>
            <div className={`flex items-center gap-2 px-4 py-2.5 ${section.bg}`}>
              <Icon className={`w-4 h-4 ${section.color}`} />
              <span className={`text-sm font-bold ${section.color}`}>{section.label}</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="py-2 px-3 text-left font-medium">Item Pemeriksaan</th>
                  <th className="py-2 px-2 text-center w-16 font-medium text-emerald-600">Ya</th>
                  <th className="py-2 px-2 text-center w-16 font-medium text-red-500">Tidak</th>
                  <th className="py-2 px-2 text-center w-16 font-medium text-gray-400">-</th>
                </tr>
              </thead>
              <tbody>
                {section.items.map((item) =>
                <ChecklistRow
                  key={item.key}
                  label={item.label}
                  value={sectionData[item.key] || '-'}
                  onChange={(val) => setField(section.key, item.key, val)} />

                )}
              </tbody>
            </table>
            {/* Special: kejadian summary untuk laporan_akhir */}
            {section.key === 'laporan_akhir' &&
            <div className="px-3 pb-3">
                <Label className="text-xs text-gray-600">Ringkasan Kejadian Selama Shift</Label>
                <Textarea
                value={sectionData.ringkasan_kejadian || ''}
                onChange={(e) => setField(section.key, 'ringkasan_kejadian', e.target.value)}
                placeholder="Tulis ringkasan kejadian, laporan khusus, atau catatan penting selama shift..."
                className="mt-1 text-sm h-20" />
              
              </div>
            }
            {/* Keterangan per section */}
            <div className="px-3 pb-3">
              <Label className="text-xs text-gray-500">Keterangan / Catatan</Label>
              <Input
                value={sectionData.keterangan || ''}
                onChange={(e) => setField(section.key, 'keterangan', e.target.value)}
                placeholder="Keterangan tambahan..."
                className="h-8 mt-1 text-sm" />
              
            </div>
          </div>);

      })}

      {/* Serah Terima Section */}
      <div className="rounded-xl border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50">
          <Users className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-bold text-amber-700">Serah Terima Tugas</span>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <Label className="text-xs">Nama Penerima Serah Terima *</Label>
            <Select value={form.penerima_serah_terima || ''} onValueChange={(v) => setForm(p => ({ ...p, penerima_serah_terima: v }))}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Pilih karyawan penerima..." /></SelectTrigger>
              <SelectContent>
                {areaEmployees.filter(e => e.nik_karyawan !== emp.nik_karyawan).map(e => (
                  <SelectItem key={e.nik_karyawan} value={e.nama_lengkap}>{e.nama_lengkap} — {e.jabatan}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <SignatureCanvas
                label={`Tanda Tangan Penyerah (${form.nama_karyawan || 'Saya'})`}
                value={form.ttd_penyerah}
                onChange={(v) => setForm(p => ({ ...p, ttd_penyerah: v }))}
              />
            </div>
            <div>
              <SignatureCanvas
                label={`Tanda Tangan Penerima (${form.penerima_serah_terima || '-'})`}
                value={form.ttd_penerima}
                onChange={(v) => setForm(p => ({ ...p, ttd_penerima: v }))}
              />
            </div>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full h-11 bg-[var(--maroon)] hover:bg-[var(--maroon-dark)] text-white" disabled={mut.isPending}>
        {mut.isPending ? 'Menyimpan...' : 'Simpan Checklist'}
      </Button>
    </form>);

}

function EvalDialog({ record, onClose }) {
  const qc = useQueryClient();
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const [nilai, setNilai] = useState(record.nilai_supervisor || 85);
  const [catatan, setCatatan] = useState(record.catatan_supervisor || '');
  const [ttd, setTtd] = useState(record.tanda_tangan_supervisor || emp.nama_lengkap || '');

  const mut = useMutation({
    mutationFn: () => base44.entities.DailyChecklist.update(record.id, {
      nilai_supervisor: nilai,
      catatan_supervisor: catatan,
      tanda_tangan_supervisor: ttd,
      nik_supervisor: emp.nik_karyawan,
      nama_supervisor: emp.nama_lengkap,
      status_evaluasi: 'Sudah Dievaluasi'
    }),
    onSuccess: () => {qc.invalidateQueries(['daily-checklist']);toast.success('Evaluasi disimpan');onClose();}
  });

  const scoreColor = nilai >= 80 ? 'text-emerald-600' : nilai >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
        <p><span className="text-gray-500">Petugas:</span> <strong>{record.nama_karyawan}</strong></p>
        <p><span className="text-gray-500">Tanggal:</span> {record.tanggal} · Shift <strong>{record.shift}</strong></p>
        <p><span className="text-gray-500">Area:</span> {record.area_tugas}</p>
      </div>
      <div>
        <Label className="text-xs">Nilai Evaluasi (1-100)</Label>
        <div className="flex items-center gap-4 mt-2">
          <input
            type="range" min={1} max={100} value={nilai}
            onChange={(e) => setNilai(Number(e.target.value))}
            className="flex-1 accent-[var(--maroon)]" />
          
          <span className={`text-2xl font-black w-12 text-center ${scoreColor}`}>{nilai}</span>
        </div>
        <p className={`text-xs mt-1 ${scoreColor}`}>
          {nilai >= 90 ? '⭐ Sangat Baik' : nilai >= 80 ? '✅ Baik' : nilai >= 60 ? '⚠ Cukup' : '❌ Perlu Perbaikan'}
        </p>
      </div>
      <div>
        <Label className="text-xs">Catatan Supervisor</Label>
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan evaluasi harian..." className="mt-1 h-24 text-sm" />
      </div>
      <div>
        <Label className="text-xs">Tanda Tangan / Nama Terang Supervisor</Label>
        <Input value={ttd} onChange={(e) => setTtd(e.target.value)} placeholder="Nama terang supervisor..." className="h-9 mt-1" />
      </div>
      <Button onClick={() => mut.mutate()} className="w-full h-10 bg-[var(--maroon)] text-white" disabled={mut.isPending}>
        {mut.isPending ? 'Menyimpan...' : 'Simpan Evaluasi'}
      </Button>
    </div>);

}

function ViewDialog({ record }) {
  const calcScore = (section) => {
    const sectionDef = SECTIONS.find((s) => s.key === section);
    if (!sectionDef || !record[section]) return { ya: 0, total: 0 };
    const items = sectionDef.items.filter((i) => i.key !== 'keterangan');
    const ya = items.filter((i) => record[section][i.key] === 'Ya').length;
    return { ya, total: items.length };
  };

  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-3 gap-3 text-center">
        {SECTIONS.map((s) => {
          const { ya, total } = calcScore(s.key);
          const pct = total ? Math.round(ya / total * 100) : 0;
          const Icon = s.icon;
          return (
            <div key={s.key} className={`rounded-xl p-3 ${s.bg}`}>
              <Icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className={`text-lg font-black ${s.color}`}>{pct}%</p>
              <p className="text-[10px] text-gray-500 leading-tight">{s.label}</p>
              <p className="text-[10px] text-gray-400">{ya}/{total} Ya</p>
            </div>);

        })}
      </div>

      {SECTIONS.map((section) => {
        const sectionData = record[section.key] || {};
        const Icon = section.icon;
        return (
          <div key={section.key} className="rounded-xl border overflow-hidden">
            <div className={`flex items-center gap-2 px-4 py-2 ${section.bg}`}>
              <Icon className={`w-4 h-4 ${section.color}`} />
              <span className={`text-sm font-semibold ${section.color}`}>{section.label}</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {section.items.map((item) =>
                <tr key={item.key} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 px-3 text-gray-600">{item.label}</td>
                    <td className="py-2 px-3 text-right">
                      <Badge className={
                    sectionData[item.key] === 'Ya' ? 'bg-emerald-100 text-emerald-700 border-0' :
                    sectionData[item.key] === 'Tidak' ? 'bg-red-100 text-red-700 border-0' :
                    'bg-gray-100 text-gray-500 border-0'
                    }>
                        {sectionData[item.key] || '-'}
                      </Badge>
                    </td>
                  </tr>
                )}
                {sectionData.keterangan &&
                <tr><td colSpan={2} className="py-2 px-3 text-xs text-gray-400 italic">{sectionData.keterangan}</td></tr>
                }
              </tbody>
            </table>
          </div>);

      })}

      {record.laporan_akhir?.ringkasan_kejadian &&
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <p className="text-xs font-semibold text-amber-700 mb-1">Ringkasan Kejadian:</p>
          <p className="text-sm text-gray-700">{record.laporan_akhir.ringkasan_kejadian}</p>
        </div>
      }

      {record.status_evaluasi === 'Sudah Dievaluasi' &&
      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 space-y-1">
          <p className="text-xs font-semibold text-emerald-700">Evaluasi Supervisor</p>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-2xl font-black text-emerald-700">{record.nilai_supervisor}</span>
            <span className="text-xs text-gray-500">/ 100</span>
          </div>
          {record.catatan_supervisor && <p className="text-sm text-gray-600">{record.catatan_supervisor}</p>}
          <p className="text-xs text-gray-400">— {record.tanda_tangan_supervisor || record.nama_supervisor}</p>
        </div>
      }

      {/* Serah Terima */}
      {(record.penerima_serah_terima || record.ttd_penyerah || record.ttd_penerima) &&
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-3">
          <p className="text-xs font-semibold text-amber-700">Serah Terima Tugas</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-400">Penyerah</p><p className="font-medium">{record.nama_karyawan}</p></div>
            <div><p className="text-xs text-gray-400">Penerima</p><p className="font-medium">{record.penerima_serah_terima || '-'}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {record.ttd_penyerah && <div>
              <p className="text-xs text-gray-400 mb-1">TTD Penyerah</p>
              <img src={record.ttd_penyerah} alt="TTD Penyerah" className="w-full h-20 object-contain border rounded-lg bg-white" />
            </div>}
            {record.ttd_penerima && <div>
              <p className="text-xs text-gray-400 mb-1">TTD Penerima</p>
              <img src={record.ttd_penerima} alt="TTD Penerima" className="w-full h-20 object-contain border rounded-lg bg-white" />
            </div>}
          </div>
        </div>
      }
    </div>);

}

export default function DailyChecklist() {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const empRole = emp?.role || emp?.jabatan || '';
  const MGMT_ROLES = ['Master Admin', 'Admin Pos', 'Chief Security', 'Leader Security', 'Supervisor Facility', 'Leader Facility', 'Admin Security', 'SPV Security'];
  const isMgmt = MGMT_ROLES.includes(empRole);

  const [showForm, setShowForm] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [evalRecord, setEvalRecord] = useState(null);
  const [search, setSearch] = useState('');
  const [filterShift, setFilterShift] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const today = new Date().toISOString().slice(0, 10);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['daily-checklist', emp.area_tugas, isMgmt],
    queryFn: () => isMgmt
      ? base44.entities.DailyChecklist.list('-tanggal', 200)
      : base44.entities.DailyChecklist.filter({ area_tugas: emp.area_tugas }, '-tanggal', 200)
  });

  const filtered = records.filter((r) => {
    const matchSearch = !search || r.nama_karyawan?.toLowerCase().includes(search.toLowerCase()) || r.area_tugas?.toLowerCase().includes(search.toLowerCase());
    const matchShift = filterShift === 'all' || r.shift === filterShift;
    const matchStatus = filterStatus === 'all' || r.status_evaluasi === filterStatus;
    return matchSearch && matchShift && matchStatus;
  });

  const todayCount = records.filter((r) => r.tanggal === today).length;
  const pendingEval = records.filter((r) => r.status_evaluasi === 'Menunggu Evaluasi').length;

  const calcTotal = (record) => {
    let ya = 0,total = 0;
    SECTIONS.forEach((s) => {
      const sData = record[s.key] || {};
      s.items.forEach((i) => {total++;if (sData[i.key] === 'Ya') ya++;});
    });
    return total ? Math.round(ya / total * 100) : 0;
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--maroon)] flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-800">Daily Performance Checklist</h1>
            <p className="text-xs text-gray-500">Formulir evaluasi harian petugas keamanan</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-slate-950 text-white px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-10 hover:bg-[var(--maroon-dark)] gap-2">
          <Plus className="w-4 h-4" /> Isi Checklist
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 border-0 shadow-sm text-center">
          <p className="text-2xl font-black text-[var(--maroon)]">{todayCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Checklist Hari Ini</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm text-center">
          <p className="text-2xl font-black text-orange-500">{pendingEval}</p>
          <p className="text-xs text-gray-500 mt-0.5">Menunggu Evaluasi</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm text-center">
          <p className="text-2xl font-black text-emerald-600">{records.filter((r) => r.status_evaluasi === 'Sudah Dievaluasi').length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Sudah Dievaluasi</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari petugas / area..." className="pl-9 h-9" />
        </div>
        <Select value={filterShift} onValueChange={setFilterShift}>
          <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Shift" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Shift</SelectItem>
            <SelectItem value="Pagi">Pagi</SelectItem>
            <SelectItem value="Siang">Siang</SelectItem>
            <SelectItem value="Malam">Malam</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="Menunggu Evaluasi">Menunggu Evaluasi</SelectItem>
            <SelectItem value="Sudah Dievaluasi">Sudah Dievaluasi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Records */}
      <div className="space-y-3">
        {isLoading ?
        Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />) :
        filtered.length === 0 ?
        <div className="text-center py-16 text-gray-400">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Belum ada checklist</p>
          </div> :
        filtered.map((record) => {
          const score = calcTotal(record);
          const scoreColor = score >= 80 ? 'text-emerald-600 bg-emerald-50' : score >= 60 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50';
          return (
            <Card key={record.id} className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                {/* Score badge */}
                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${scoreColor}`}>
                  <span className="text-xl font-black">{score}</span>
                  <span className="text-[9px] font-semibold opacity-70">%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="font-bold text-gray-800 text-sm">{record.nama_karyawan}</span>
                    <Badge className={`${SHIFT_COLORS[record.shift] || 'bg-gray-100 text-gray-600'} border-0 text-[10px]`}>{record.shift}</Badge>
                    <Badge className={`${STATUS_COLORS[record.status_evaluasi] || 'bg-gray-100 text-gray-600'} border-0 text-[10px]`}>
                      {record.status_evaluasi === 'Sudah Dievaluasi' ? <><CheckCircle2 className="w-3 h-3 inline mr-0.5" />Dievaluasi</> : 'Menunggu'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">{record.area_tugas} · {record.tanggal}</p>
                  {record.status_evaluasi === 'Sudah Dievaluasi' && record.nilai_supervisor &&
                  <p className="text-xs text-emerald-600 mt-0.5">
                      <Star className="w-3 h-3 inline mr-0.5 fill-yellow-400 text-yellow-400" />
                      Nilai: {record.nilai_supervisor}/100 · {record.nama_supervisor}
                    </p>
                  }
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setViewRecord(record)}>
                    <Eye className="w-3.5 h-3.5" /> Detail
                  </Button>
                  <ChecklistPDFExport record={record} compact />
                  {isMgmt &&
                  <Button size="sm" className="h-8 text-xs gap-1 bg-[var(--maroon)] text-white" onClick={() => setEvalRecord(record)}>
                      <Star className="w-3.5 h-3.5" /> Evaluasi
                    </Button>
                  }
                </div>
              </div>
            </Card>);

        })}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[var(--maroon)]" />
              Daily Performance Checklist Satpam
            </DialogTitle>
          </DialogHeader>
          <ChecklistForm onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewRecord} onOpenChange={() => setViewRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Checklist — {viewRecord?.nama_karyawan}</DialogTitle>
          </DialogHeader>
          {viewRecord && <ViewDialog record={viewRecord} />}
        </DialogContent>
      </Dialog>

      {/* Eval Dialog */}
      <Dialog open={!!evalRecord} onOpenChange={() => setEvalRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" /> Evaluasi Supervisor
            </DialogTitle>
          </DialogHeader>
          {evalRecord && <EvalDialog record={evalRecord} onClose={() => setEvalRecord(null)} />}
        </DialogContent>
      </Dialog>
    </div>);

}