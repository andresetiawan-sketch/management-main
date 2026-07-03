import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Eye, FileText, Camera, Trash2, Upload, Search } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const AREA_OPTIONS = ['Ya', 'Tidak', 'NA'];

function PhotoUpload({ value, onChange, label }) {
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch {
      toast.error('Gagal upload foto');
    }
    setUploading(false);
  };
  return (
    <div className="flex items-center gap-2">
      {value ?
      <div className="relative group">
            <img src={value} alt={label} className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
            <button type="button" onClick={() => onChange('')} className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
          </div> :
      <label className={`flex items-center gap-1 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 cursor-pointer hover:border-red-400 hover:text-red-600 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <Camera className="w-3.5 h-3.5" />
            {uploading ? 'Uploading...' : 'Foto'}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          </label>
      }
    </div>);

}

function AreaBadge({ val }) {
  const c = val === 'Ya' ? 'bg-emerald-100 text-emerald-700' : val === 'Tidak' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500';
  return <Badge className={`${c} border-0 text-xs`}>{val}</Badge>;
}

function generatePDF(record) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = 210;const m = 15;let y = m;

  // Header
  doc.setFillColor(123, 26, 44);
  doc.rect(0, 0, pw, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN KEGIATAN HARIAN', pw / 2, 11, { align: 'center' });
  doc.setFontSize(9);doc.setFont('helvetica', 'normal');
  doc.text('PT. Putra Indonesia Solusi & PT. Prestasi Indonesia Solusi', pw / 2, 21, { align: 'center' });
  y = 34;

  // Data Umum
  doc.setTextColor(0);doc.setFillColor(248, 248, 248);
  doc.roundedRect(m, y, pw - m * 2, 24, 2, 2, 'F');
  doc.setFontSize(9);doc.setFont('helvetica', 'bold');doc.setTextColor(50);
  doc.text('1. DATA UMUM', m + 3, y + 6);
  doc.setFont('helvetica', 'normal');doc.setFontSize(8.5);
  doc.text(`Nama Staf: ${record.nama_staf || '-'}`, m + 3, y + 13);
  doc.text(`Area/Lokasi: ${record.area_tugas || '-'}`, m + 3, y + 19);
  doc.text(`Tanggal: ${record.tanggal || '-'}`, pw / 2 + 5, y + 13);
  y += 30;

  // Checklist Area
  const sectionHeader = (title) => {
    if (y > 252) {doc.addPage();y = 15;}
    doc.setFillColor(50, 50, 50);doc.rect(m, y, pw - m * 2, 7, 'F');
    doc.setTextColor(255);doc.setFontSize(8);doc.setFont('helvetica', 'bold');
    doc.text(title, m + 3, y + 5);y += 10;doc.setTextColor(0);
  };

  sectionHeader('2. DAILY CHECKLIST AREA');
  const checkItems = [
  { label: 'Area Masuk/Lobby', val: record.area_masuk_lobby },
  { label: 'Area Kerja/Unit', val: record.area_kerja_unit },
  { label: 'Area Umum/Fasilitas', val: record.area_umum_fasilitas }];

  checkItems.forEach((ci, i) => {
    doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250);
    doc.rect(m, y, pw - m * 2, 7, 'F');doc.setFontSize(8);doc.setFont('helvetica', 'normal');doc.setTextColor(40);
    doc.text(ci.label, m + 3, y + 5);
    const col = ci.val === 'Ya' ? [34, 197, 94] : ci.val === 'Tidak' ? [239, 68, 68] : [150, 150, 150];
    doc.setFillColor(...col);doc.roundedRect(pw - m - 20, y + 1.5, 18, 4, 1, 1, 'F');
    doc.setTextColor(255);doc.setFontSize(7);doc.text(ci.val || 'NA', pw - m - 11, y + 4.5, { align: 'center' });
    doc.setTextColor(40);y += 7;
  });
  if (record.keterangan_checklist) {
    doc.setFontSize(7.5);doc.setFont('helvetica', 'italic');doc.setTextColor(100);
    doc.text(`Keterangan: ${record.keterangan_checklist}`, m + 3, y + 4);y += 8;
  }
  y += 4;

  // Kegiatan
  const kegiatan = record.kegiatan || [];
  if (kegiatan.length > 0) {
    sectionHeader('3. LAPORAN KEGIATAN');
    kegiatan.forEach((k, i) => {
      if (!k.deskripsi) return;
      if (y > 252) {doc.addPage();y = 15;}
      doc.setFontSize(8);doc.setFont('helvetica', 'bold');doc.setTextColor(50);
      doc.text(`Kegiatan ${i + 1}:`, m + 3, y + 5);
      doc.setFont('helvetica', 'normal');doc.setTextColor(60);
      const lines = doc.splitTextToSize(k.deskripsi, pw - m * 2 - 30);
      doc.text(lines, m + 28, y + 5);
      y += lines.length * 5 + 4;
    });
  }

  // Biaya
  const biaya = record.biaya || [];
  if (biaya.some((b) => b.nama_barang)) {
    sectionHeader('4. LAPORAN BIAYA OPERASIONAL');
    doc.setFillColor(220, 220, 220);doc.rect(m, y, pw - m * 2, 6, 'F');
    doc.setFontSize(7.5);doc.setFont('helvetica', 'bold');doc.setTextColor(50);
    doc.text('No.', m + 2, y + 4.2);doc.text('Nama Barang', m + 10, y + 4.2);doc.text('Nominal (Rp)', pw - m - 28, y + 4.2);
    y += 6;
    let total = 0;
    biaya.forEach((b, i) => {
      if (!b.nama_barang) return;
      if (y > 272) {doc.addPage();y = 15;}
      doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250);
      doc.rect(m, y, pw - m * 2, 6, 'F');
      doc.setFont('helvetica', 'normal');doc.setFontSize(7.5);doc.setTextColor(40);
      doc.text(String(i + 1), m + 2, y + 4.2);
      doc.text(b.nama_barang, m + 10, y + 4.2);
      doc.text(Number(b.nominal || 0).toLocaleString('id-ID'), pw - m - 5, y + 4.2, { align: 'right' });
      total += Number(b.nominal || 0);y += 6;
    });
    doc.setFillColor(240, 240, 240);doc.rect(m, y, pw - m * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');doc.setFontSize(8);doc.setTextColor(50);
    doc.text('TOTAL PENGELUARAN', m + 3, y + 5);
    doc.text(`Rp ${total.toLocaleString('id-ID')}`, pw - m - 5, y + 5, { align: 'right' });
    y += 12;
  }

  // Kendala
  if (y > 252) {doc.addPage();y = 15;}
  sectionHeader('5. KENDALA & TINDAK LANJUT');
  doc.setFontSize(8);doc.setFont('helvetica', 'normal');doc.setTextColor(60);
  doc.text(`Kendala: ${record.kendala || 'Tidak ada'}`, m + 3, y + 5);y += 8;
  if (record.tindak_lanjut) {doc.text(`Tindak Lanjut: ${record.tindak_lanjut}`, m + 3, y + 5);y += 8;}

  // TTD
  y += 6;
  doc.setFontSize(8);doc.setFont('helvetica', 'normal');doc.setTextColor(80);
  doc.text(`Dibuat oleh: ${record.nama_staf || ''}`, pw - m - 60, y);
  doc.line(pw - m - 60, y + 16, pw - m, y + 16);
  doc.setFontSize(7.5);doc.text('(Tanda Tangan)', pw - m - 30, y + 20, { align: 'center' });

  const pc = doc.getNumberOfPages();
  for (let i = 1; i <= pc; i++) {
    doc.setPage(i);doc.setFontSize(7);doc.setTextColor(150);
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')} · Hal ${i}/${pc}`, pw / 2, 293, { align: 'center' });
  }
  doc.save(`LaporanHarian_${record.nama_staf?.replace(/\s+/g, '_')}_${record.tanggal}.pdf`);
}

function LaporanForm({ onClose, editData }) {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState(editData || {
    nama_staf: emp.nama_lengkap || '',
    nik_karyawan: emp.nik_karyawan || '',
    area_tugas: emp.area_tugas || '',
    tanggal: today,
    area_masuk_lobby: 'Ya',
    area_kerja_unit: 'Ya',
    area_umum_fasilitas: 'Ya',
    keterangan_checklist: '',
    kegiatan: [{ deskripsi: '', foto: '' }, { deskripsi: '', foto: '' }, { deskripsi: '', foto: '' }],
    biaya: [{ nama_barang: '', nominal: 0, foto_struk: '' }, { nama_barang: '', nominal: 0, foto_struk: '' }],
    kendala: '',
    tindak_lanjut: '',
    status: 'Draft'
  });

  const setKeg = (i, field, val) => {
    const k = [...(form.kegiatan || [])];k[i] = { ...k[i], [field]: val };setForm((p) => ({ ...p, kegiatan: k }));
  };
  const setBiaya = (i, field, val) => {
    const b = [...(form.biaya || [])];b[i] = { ...b[i], [field]: val };setForm((p) => ({ ...p, biaya: b }));
  };
  const addBiaya = () => setForm((p) => ({ ...p, biaya: [...(p.biaya || []), { nama_barang: '', nominal: 0, foto_struk: '' }] }));
  const removeBiaya = (i) => {const b = [...(form.biaya || [])];b.splice(i, 1);setForm((p) => ({ ...p, biaya: b }));};
  const totalBiaya = (form.biaya || []).reduce((s, b) => s + Number(b.nominal || 0), 0);

  const mut = useMutation({
    mutationFn: (data) => editData ?
    base44.entities.LaporanHarian.update(editData.id, data) :
    base44.entities.LaporanHarian.create(data),
    onSuccess: () => {qc.invalidateQueries(['laporan-harian']);toast.success('Laporan disimpan');onClose();}
  });

  return (
    <form onSubmit={(e) => {e.preventDefault();mut.mutate(form);}} className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
      {/* 1. Data Umum */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">1. Data Umum</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Nama Staf</Label>
            <Input value={form.nama_staf} readOnly className="h-9 mt-1 bg-gray-100 cursor-not-allowed" />
          </div>
          <div><Label className="text-xs">Tanggal</Label>
            <Input type="date" value={form.tanggal} onChange={(e) => setForm((p) => ({ ...p, tanggal: e.target.value }))} className="h-9 mt-1" />
          </div>
          <div className="col-span-2"><Label className="text-xs">Area / Lokasi</Label>
            <Input value={form.area_tugas} readOnly className="h-9 mt-1 bg-gray-100 cursor-not-allowed" />
          </div>
        </div>
      </div>

      {/* 2. Checklist Area */}
      <div className="rounded-xl border overflow-hidden">
        <div className="bg-blue-50 px-4 py-2.5 border-b"><p className="text-xs font-bold text-blue-700 uppercase tracking-wide">2. Daily Checklist Area</p></div>
        <div className="p-3 space-y-2">
          {[
          { label: 'Area Masuk/Lobby', key: 'area_masuk_lobby' },
          { label: 'Area Kerja/Unit', key: 'area_kerja_unit' },
          { label: 'Area Umum/Fasilitas', key: 'area_umum_fasilitas' }].
          map((item) =>
          <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{item.label}</span>
              <div className="flex gap-1.5">
                {AREA_OPTIONS.map((opt) =>
              <button type="button" key={opt} onClick={() => setForm((p) => ({ ...p, [item.key]: opt }))}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${form[item.key] === opt ?
              opt === 'Ya' ? 'bg-emerald-500 text-white border-emerald-500' : opt === 'Tidak' ? 'bg-red-500 text-white border-red-500' : 'bg-gray-400 text-white border-gray-400' :
              'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}>
                    {opt}
                  </button>
              )}
              </div>
            </div>
          )}
          <div className="pt-1">
            <Label className="text-xs">Keterangan Tambahan</Label>
            <Input value={form.keterangan_checklist} onChange={(e) => setForm((p) => ({ ...p, keterangan_checklist: e.target.value }))} placeholder="Catatan jika ada yang tidak sesuai..." className="h-8 mt-1 text-sm" />
          </div>
        </div>
      </div>

      {/* 3. Kegiatan */}
      <div className="rounded-xl border overflow-hidden">
        <div className="bg-emerald-50 px-4 py-2.5 border-b"><p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">3. Laporan Kegiatan & Foto (maks 3)</p></div>
        <div className="p-3 space-y-3">
          {(form.kegiatan || []).slice(0, 3).map((k, i) =>
          <div key={i} className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0 mt-2">{i + 1}</div>
              <Textarea
              value={k.deskripsi} onChange={(e) => setKeg(i, 'deskripsi', e.target.value)}
              placeholder={`Deskripsi kegiatan ${i + 1}...`} className="flex-1 text-sm h-16 resize-none" />
            
              <PhotoUpload value={k.foto} onChange={(v) => setKeg(i, 'foto', v)} label={`Foto kegiatan ${i + 1}`} />
            </div>
          )}
        </div>
      </div>

      {/* 4. Biaya */}
      <div className="rounded-xl border overflow-hidden">
        <div className="bg-orange-50 px-4 py-2.5 border-b flex items-center justify-between">
          <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">4. Biaya Operasional</p>
          <button type="button" onClick={addBiaya} className="text-xs text-orange-600 hover:text-orange-800 font-medium flex items-center gap-1"><Plus className="w-3 h-3" />Tambah</button>
        </div>
        <div className="p-3 space-y-2">
          {(form.biaya || []).map((b, i) =>
          <div key={i} className="flex gap-2 items-center">
              <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}</span>
              <Input value={b.nama_barang} onChange={(e) => setBiaya(i, 'nama_barang', e.target.value)} placeholder="Nama barang..." className="flex-1 h-8 text-sm" />
              <div className="relative w-28 shrink-0">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                <Input type="number" value={b.nominal || ''} onChange={(e) => setBiaya(i, 'nominal', e.target.value)} placeholder="0" className="h-8 text-sm pl-7" />
              </div>
              <PhotoUpload value={b.foto_struk} onChange={(v) => setBiaya(i, 'foto_struk', v)} label="Struk" />
              <button type="button" onClick={() => removeBiaya(i)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
          {totalBiaya > 0 &&
          <div className="flex justify-end pt-1 border-t border-gray-100">
              <span className="text-sm font-bold text-orange-700">Total: Rp {totalBiaya.toLocaleString('id-ID')}</span>
            </div>
          }
        </div>
      </div>

      {/* 5. Kendala */}
      <div className="rounded-xl border overflow-hidden">
        <div className="bg-red-50 px-4 py-2.5 border-b"><p className="text-xs font-bold text-red-700 uppercase tracking-wide">5. Kendala & Tindak Lanjut</p></div>
        <div className="p-3 space-y-3">
          <div>
            <Label className="text-xs">Kendala Hari Ini</Label>
            <Textarea value={form.kendala} onChange={(e) => setForm((p) => ({ ...p, kendala: e.target.value }))} placeholder="Tidak ada / Jelaskan jika ada..." className="mt-1 text-sm h-16 resize-none" />
          </div>
          <div>
            <Label className="text-xs">Tindakan yang Diambil</Label>
            <Textarea value={form.tindak_lanjut} onChange={(e) => setForm((p) => ({ ...p, tindak_lanjut: e.target.value }))} placeholder="Jelaskan jika ada kendala..." className="mt-1 text-sm h-16 resize-none" />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1 h-11 bg-[var(--maroon)] hover:bg-[var(--maroon-dark)] text-white" disabled={mut.isPending} onClick={() => setForm((p) => ({ ...p, status: 'Submitted' }))}>
          {mut.isPending ? 'Menyimpan...' : 'Submit Laporan'}
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => {mut.mutate({ ...form, status: 'Draft' });}}>
          Simpan Draft
        </Button>
      </div>
    </form>);

}

function ViewDialog({ record }) {
  const totalBiaya = (record.biaya || []).reduce((s, b) => s + Number(b.nominal || 0), 0);
  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      {/* Data Umum */}
      <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
        <p><span className="text-gray-500">Nama Staf:</span> <strong>{record.nama_staf}</strong></p>
        <p><span className="text-gray-500">Area:</span> {record.area_tugas}</p>
        <p><span className="text-gray-500">Tanggal:</span> {record.tanggal}</p>
      </div>
      {/* Checklist */}
      <div className="rounded-xl border overflow-hidden">
        <div className="bg-blue-50 px-4 py-2 border-b"><p className="text-xs font-bold text-blue-700">Daily Checklist Area</p></div>
        <div className="p-3 space-y-2 text-sm">
          {[['Area Masuk/Lobby', record.area_masuk_lobby], ['Area Kerja/Unit', record.area_kerja_unit], ['Area Umum/Fasilitas', record.area_umum_fasilitas]].map(([label, val]) =>
          <div key={label} className="flex items-center justify-between">
              <span className="text-gray-600">{label}</span>
              <AreaBadge val={val} />
            </div>
          )}
          {record.keterangan_checklist && <p className="text-xs text-gray-400 italic pt-1">{record.keterangan_checklist}</p>}
        </div>
      </div>
      {/* Kegiatan */}
      {(record.kegiatan || []).filter((k) => k.deskripsi).length > 0 &&
      <div className="rounded-xl border overflow-hidden">
          <div className="bg-emerald-50 px-4 py-2 border-b"><p className="text-xs font-bold text-emerald-700">Laporan Kegiatan</p></div>
          <div className="p-3 space-y-3">
            {(record.kegiatan || []).filter((k) => k.deskripsi).map((k, i) =>
          <div key={i} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0 mt-0.5">{i + 1}</div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{k.deskripsi}</p>
                  {k.foto && <img src={k.foto} alt="" className="mt-2 w-32 h-24 object-cover rounded-lg border border-gray-200" />}
                </div>
              </div>
          )}
          </div>
        </div>
      }
      {/* Biaya */}
      {(record.biaya || []).some((b) => b.nama_barang) &&
      <div className="rounded-xl border overflow-hidden">
          <div className="bg-orange-50 px-4 py-2 border-b"><p className="text-xs font-bold text-orange-700">Biaya Operasional</p></div>
          <div className="p-3 space-y-2">
            {(record.biaya || []).filter((b) => b.nama_barang).map((b, i) =>
          <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                <span className="flex-1 text-sm text-gray-700">{b.nama_barang}</span>
                <span className="text-sm font-medium text-gray-800">Rp {Number(b.nominal || 0).toLocaleString('id-ID')}</span>
                {b.foto_struk && <img src={b.foto_struk} alt="struk" className="w-10 h-10 object-cover rounded border border-gray-200" />}
              </div>
          )}
            <div className="flex justify-end pt-1 border-t border-gray-100">
              <span className="text-sm font-bold text-orange-700">Total: Rp {totalBiaya.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      }
      {/* Kendala */}
      <div className="rounded-xl border overflow-hidden">
        <div className="bg-red-50 px-4 py-2 border-b"><p className="text-xs font-bold text-red-700">Kendala & Tindak Lanjut</p></div>
        <div className="p-3 text-sm space-y-2">
          <p><span className="text-gray-500">Kendala:</span> {record.kendala || 'Tidak ada'}</p>
          {record.tindak_lanjut && <p><span className="text-gray-500">Tindak Lanjut:</span> {record.tindak_lanjut}</p>}
        </div>
      </div>
    </div>);

}

export default function LaporanHarian() {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const empRole = emp?.role || emp?.jabatan || '';
  const MGMT_ROLES = ['Master Admin', 'Admin Pos', 'Chief Security', 'Leader Security', 'Supervisor Facility', 'Leader Facility', 'Admin Security', 'SPV Security'];
  const isMgmt = MGMT_ROLES.includes(empRole) || emp?.role === 'Master Admin';

  const [showForm, setShowForm] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [search, setSearch] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['laporan-harian', emp.area_tugas, isMgmt],
    queryFn: () => isMgmt
      ? base44.entities.LaporanHarian.list('-tanggal', 200)
      : base44.entities.LaporanHarian.filter({ area_tugas: emp.area_tugas }, '-tanggal', 200)
  });

  const filtered = records.filter((r) => {
    const matchSearch = !search || r.nama_staf?.toLowerCase().includes(search.toLowerCase()) || r.area_tugas?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const todayCount = records.filter((r) => r.tanggal === today).length;
  const submittedCount = records.filter((r) => r.status === 'Submitted').length;

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--maroon)] flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-800">Laporan Kegiatan Harian</h1>
            <p className="text-xs text-gray-500">Checklist area, kegiatan, biaya operasional & kendala</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="h-10 hover:bg-[var(--maroon-dark)] text-white gap-2 bg-slate-950">
          <Plus className="w-4 h-4" /> Buat Laporan
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 border-0 shadow-sm text-center">
          <p className="text-2xl font-black text-[var(--maroon)]">{todayCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Laporan Hari Ini</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm text-center">
          <p className="text-2xl font-black text-emerald-600">{submittedCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Submitted</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm text-center">
          <p className="text-2xl font-black text-orange-500">{records.filter((r) => r.status === 'Draft').length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Draft</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari staf / area..." className="pl-9 h-9" />
      </div>

      {/* Records */}
      <div className="space-y-3">
        {isLoading ?
        Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />) :
        filtered.length === 0 ?
        <div className="text-center py-16 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Belum ada laporan harian</p>
          </div> :
        filtered.map((record) =>
        <Card key={record.id} className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--maroon)]/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-[var(--maroon)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-gray-800 text-sm">{record.nama_staf}</span>
                  <Badge className={`border-0 text-[10px] ${record.status === 'Submitted' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-600'}`}>{record.status}</Badge>
                </div>
                <p className="text-xs text-gray-500">{record.area_tugas} · {record.tanggal}</p>
                <div className="flex gap-1 mt-1">
                  {[['Lobby', record.area_masuk_lobby], ['Kerja', record.area_kerja_unit], ['Fasilitas', record.area_umum_fasilitas]].map(([label, val]) =>
                <span key={label} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${val === 'Ya' ? 'bg-emerald-50 text-emerald-600' : val === 'Tidak' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400'}`}>{label}: {val}</span>
                )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setViewRecord(record)}>
                  <Eye className="w-3.5 h-3.5" /> Detail
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50" onClick={() => generatePDF(record)}>
                  <FileText className="w-3.5 h-3.5" /> PDF
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--maroon)]" /> Laporan Kegiatan Harian
            </DialogTitle>
          </DialogHeader>
          <LaporanForm onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewRecord} onOpenChange={() => setViewRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Laporan — {viewRecord?.nama_staf}</DialogTitle>
          </DialogHeader>
          {viewRecord && <ViewDialog record={viewRecord} />}
        </DialogContent>
      </Dialog>
    </div>);

}