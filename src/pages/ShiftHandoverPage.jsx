import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeftRight, Plus, Eye, CheckCircle2, ClipboardList, Loader2, PenLine, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import InventarisHandoverForm from '@/components/handover/InventarisHandoverForm';
import KendalaLapanganForm from '@/components/handover/KendalaLapanganForm';

const SHIFTS = ['Pagi', 'Siang', 'Malam'];
const statusColor = { 'Menunggu Tanda Tangan': 'bg-orange-100 text-orange-700', 'Selesai': 'bg-emerald-100 text-emerald-700' };
const kondisiColor = { 'Normal': 'bg-emerald-100 text-emerald-700', 'Ada Kejadian': 'bg-red-100 text-red-700', 'Perlu Perhatian': 'bg-orange-100 text-orange-700' };

function HandoverForm({ onClose }) {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    area_tugas: emp.area_tugas || '',
    tanggal: today,
    shift_selesai: 'Pagi',
    shift_berikutnya: 'Siang',
    nik_lepas: emp.nik_karyawan || '',
    nama_lepas: emp.nama_lengkap || '',
    jabatan_lepas: emp.jabatan || emp.role || '',
    nik_terima: '',
    nama_terima: '',
    jabatan_terima: '',
    kondisi_pos: 'Normal',
    ringkasan_kejadian: '',
    catatan_checklist: '',
    catatan_kegiatan: '',
    kendala_lapangan: [],
    inventaris_serahterima: [],
    perlengkapan_lengkap: true,
    catatan_perlengkapan: '',
    hal_perlu_diperhatikan: '',
    ttd_lepas: emp.nama_lengkap || '',
    ttd_terima: '',
    waktu_serah_terima: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    status: 'Menunggu Tanda Tangan',
  });

  // Auto-pull checklist summary
  const { data: checklistToday = [] } = useQuery({
    queryKey: ['checklist-today', today, form.area_tugas],
    queryFn: async () => {
      const data = await base44.entities.DailyChecklist.filter({ tanggal: today, area_tugas: form.area_tugas });
      if (data.length > 0) {
        const cl = data[0];
        let summary = [];
        if (cl.patroli_area?.potensi_bahaya_ditemukan === 'Ya') summary.push('⚠️ Potensi bahaya ditemukan saat patroli');
        if (cl.laporan_akhir?.kejadian_dilaporkan === 'Ya') summary.push('📋 Ada kejadian yang dilaporkan');
        if (cl.laporan_akhir?.ringkasan_kejadian) summary.push(cl.laporan_akhir.ringkasan_kejadian);
        if (summary.length > 0) setForm(p => p.catatan_checklist ? p : { ...p, catatan_checklist: summary.join('\n'), kondisi_pos: 'Ada Kejadian' });
        else setForm(p => p.catatan_checklist ? p : { ...p, catatan_checklist: `Checklist ${cl.shift} selesai. Semua area dalam kondisi normal.` });
      }
      return data;
    },
    enabled: !!form.area_tugas,
  });

  // Auto-pull laporan harian
  const { data: laporanToday = [] } = useQuery({
    queryKey: ['laporan-today', today, form.area_tugas],
    queryFn: async () => {
      const data = await base44.entities.LaporanHarian.filter({ tanggal: today, area_tugas: form.area_tugas });
      if (data.length > 0) {
        const kegiatan = data.flatMap(l => (l.kegiatan || []).filter(k => k.deskripsi).map(k => `• ${k.deskripsi}`));
        const kendala = data.filter(l => l.kendala).map(l => l.kendala);
        let summary = [];
        if (kegiatan.length > 0) summary.push('Kegiatan:\n' + kegiatan.join('\n'));
        if (kendala.length > 0) summary.push('Kendala: ' + kendala.join(', '));
        if (summary.length > 0) setForm(p => p.catatan_kegiatan ? p : { ...p, catatan_kegiatan: summary.join('\n\n') });
      }
      return data;
    },
    enabled: !!form.area_tugas,
  });

  const mut = useMutation({
    mutationFn: (data) => base44.entities.ShiftHandover.create(data),
    onSuccess: () => { qc.invalidateQueries(['shift-handover']); toast.success('Serah terima shift dibuat'); onClose(); }
  });

  return (
    <form onSubmit={e => { e.preventDefault(); mut.mutate(form); }} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
      {/* Info Shift */}
      <div className="bg-blue-50 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Informasi Shift</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Tanggal</Label>
            <Input type="date" value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} className="h-9 mt-1 text-sm" />
          </div>
          <div><Label className="text-xs">Area Tugas</Label>
            <Input value={form.area_tugas} onChange={e => setForm(p => ({ ...p, area_tugas: e.target.value }))} className="h-9 mt-1 text-sm" />
          </div>
          <div><Label className="text-xs">Shift Selesai</Label>
            <Select value={form.shift_selesai} onValueChange={v => setForm(p => ({ ...p, shift_selesai: v }))}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Shift Berikutnya</Label>
            <Select value={form.shift_berikutnya} onValueChange={v => setForm(p => ({ ...p, shift_berikutnya: v }))}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Petugas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-3 space-y-2 bg-orange-50 border-orange-200">
          <p className="text-xs font-bold text-orange-700">Petugas Lepas Tugas</p>
          <div><Label className="text-xs">Nama</Label><Input value={form.nama_lepas} readOnly className="h-8 mt-1 text-sm bg-orange-50/80 cursor-not-allowed" /></div>
          <div><Label className="text-xs">NIK</Label><Input value={form.nik_lepas} readOnly className="h-8 mt-1 text-sm bg-orange-50/80 cursor-not-allowed" /></div>
          <div><Label className="text-xs">Jabatan</Label><Input value={form.jabatan_lepas} readOnly className="h-8 mt-1 text-sm bg-orange-50/80 cursor-not-allowed" /></div>
        </div>
        <div className="rounded-xl border p-3 space-y-2 bg-emerald-50 border-emerald-200">
          <p className="text-xs font-bold text-emerald-700">Petugas Menerima</p>
          <div><Label className="text-xs">Nama</Label><Input value={form.nama_terima} onChange={e => setForm(p => ({ ...p, nama_terima: e.target.value }))} className="h-8 mt-1 text-sm" placeholder="Nama penerima..." /></div>
          <div><Label className="text-xs">NIK</Label><Input value={form.nik_terima} onChange={e => setForm(p => ({ ...p, nik_terima: e.target.value }))} className="h-8 mt-1 text-sm" placeholder="NIK penerima..." /></div>
          <div><Label className="text-xs">Jabatan</Label><Input value={form.jabatan_terima} onChange={e => setForm(p => ({ ...p, jabatan_terima: e.target.value }))} className="h-8 mt-1 text-sm" placeholder="Jabatan penerima..." /></div>
        </div>
      </div>

      {/* Kondisi */}
      <div className="rounded-xl border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-600">Kondisi Pos & Kejadian</p>
          <Select value={form.kondisi_pos} onValueChange={v => setForm(p => ({ ...p, kondisi_pos: v }))}>
            <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Normal','Ada Kejadian','Perlu Perhatian'].map(k => <SelectItem key={k} value={k} className="text-xs">{k}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs flex items-center gap-1"><ClipboardList className="w-3 h-3 text-blue-500" /> Ringkasan dari Checklist Harian {checklistToday.length > 0 && <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">Otomatis</Badge>}</Label>
          <Textarea value={form.catatan_checklist} onChange={e => setForm(p => ({ ...p, catatan_checklist: e.target.value }))} className="mt-1 h-20 text-sm resize-none" placeholder="Ringkasan kejadian dari checklist harian..." />
        </div>
        <div>
          <Label className="text-xs flex items-center gap-1"><ClipboardList className="w-3 h-3 text-emerald-500" /> Ringkasan dari Laporan Kegiatan {laporanToday.length > 0 && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Otomatis</Badge>}</Label>
          <Textarea value={form.catatan_kegiatan} onChange={e => setForm(p => ({ ...p, catatan_kegiatan: e.target.value }))} className="mt-1 h-20 text-sm resize-none" placeholder="Kegiatan & laporan hari ini..." />
        </div>
        <div>
          <Label className="text-xs">Hal Penting yang Perlu Diperhatikan Shift Berikutnya</Label>
          <Textarea value={form.hal_perlu_diperhatikan} onChange={e => setForm(p => ({ ...p, hal_perlu_diperhatikan: e.target.value }))} className="mt-1 h-16 text-sm resize-none" placeholder="Instruksi / catatan khusus..." />
        </div>
      </div>

      {/* Inventaris Serah Terima */}
      <div className="rounded-xl border p-3 space-y-2">
        <InventarisHandoverForm
          value={form.inventaris_serahterima}
          onChange={(v) => setForm(p => ({ ...p, inventaris_serahterima: v }))}
        />
      </div>

      {/* Kendala Lapangan */}
      <div className="rounded-xl border p-3 space-y-2">
        <KendalaLapanganForm
          value={form.kendala_lapangan}
          onChange={(v) => {
            const hasCritical = v.some(k => k.tingkat === 'Kritis' || k.tingkat === 'Tinggi');
            setForm(p => ({
              ...p,
              kendala_lapangan: v,
              kondisi_pos: v.length === 0 ? p.kondisi_pos : (hasCritical ? 'Ada Kejadian' : 'Perlu Perhatian')
            }));
          }}
        />
      </div>

      {/* Perlengkapan */}
      <div className="rounded-xl border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-600">Perlengkapan</p>
          <div className="flex gap-2">
            {[true, false].map(v => (
              <button key={String(v)} type="button" onClick={() => setForm(p => ({ ...p, perlengkapan_lengkap: v }))}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${form.perlengkapan_lengkap === v ? (v ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-red-500 text-white border-red-500') : 'bg-white text-gray-400 border-gray-200'}`}>
                {v ? 'Lengkap' : 'Tidak Lengkap'}
              </button>
            ))}
          </div>
        </div>
        {!form.perlengkapan_lengkap && (
          <div>
            <Label className="text-xs">Keterangan</Label>
            <Input value={form.catatan_perlengkapan} onChange={e => setForm(p => ({ ...p, catatan_perlengkapan: e.target.value }))} className="h-8 mt-1 text-sm" placeholder="Apa yang kurang?" />
          </div>
        )}
      </div>

      {/* TTD */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
          <Label className="text-xs text-orange-700">TTD Petugas Lepas</Label>
          <Input value={form.ttd_lepas} onChange={e => setForm(p => ({ ...p, ttd_lepas: e.target.value }))} className="mt-1 h-9 text-sm font-medium" placeholder="Nama terang..." />
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <Label className="text-xs text-emerald-700">TTD Petugas Terima</Label>
          <Input value={form.ttd_terima} onChange={e => setForm(p => ({ ...p, ttd_terima: e.target.value }))} className="mt-1 h-9 text-sm font-medium" placeholder="Nama terang penerima..." />
        </div>
      </div>

      <Button type="submit" disabled={mut.isPending} className="w-full h-11 bg-[#7B1A2C] hover:bg-[#5A1220] text-white font-bold">
        {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buat Dokumen Serah Terima'}
      </Button>
    </form>
  );
}

function SignOffDialog({ record, onClose }) {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const qc = useQueryClient();
  const [ttd, setTtd] = useState('');
  const isLepas = record.nik_lepas === emp.nik_karyawan && !record.ttd_lepas;
  const isTerima = record.nik_terima === emp.nik_karyawan && !record.ttd_terima;

  const mut = useMutation({
    mutationFn: (data) => base44.entities.ShiftHandover.update(record.id, data),
    onSuccess: () => { qc.invalidateQueries(['shift-handover']); toast.success('Tanda tangan berhasil'); onClose(); }
  });

  const doSign = () => {
    const updates = {};
    if (isLepas) updates.ttd_lepas = ttd || emp.nama_lengkap;
    if (isTerima) { updates.ttd_terima = ttd || emp.nama_lengkap; }
    // Check if both signed → Selesai
    const newLepas = updates.ttd_lepas || record.ttd_lepas;
    const newTerima = updates.ttd_terima || record.ttd_terima;
    if (newLepas && newTerima) updates.status = 'Selesai';
    mut.mutate(updates);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Detail Serah Terima Shift</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="bg-gray-50 rounded-xl p-3 space-y-1">
            <p><span className="text-gray-500">Area:</span> <strong>{record.area_tugas}</strong></p>
            <p><span className="text-gray-500">Tanggal:</span> {record.tanggal}</p>
            <p><span className="text-gray-500">Shift:</span> {record.shift_selesai} → {record.shift_berikutnya}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-orange-50 rounded-xl p-2.5">
              <p className="text-xs font-bold text-orange-700 mb-1">Petugas Lepas</p>
              <p className="text-xs">{record.nama_lepas}</p>
              <p className="text-xs text-gray-500">{record.jabatan_lepas}</p>
              {record.ttd_lepas ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] mt-1">✓ TTD: {record.ttd_lepas}</Badge> : <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px] mt-1">Belum TTD</Badge>}
            </div>
            <div className="bg-emerald-50 rounded-xl p-2.5">
              <p className="text-xs font-bold text-emerald-700 mb-1">Petugas Terima</p>
              <p className="text-xs">{record.nama_terima || '-'}</p>
              <p className="text-xs text-gray-500">{record.jabatan_terima || '-'}</p>
              {record.ttd_terima ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] mt-1">✓ TTD: {record.ttd_terima}</Badge> : <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px] mt-1">Belum TTD</Badge>}
            </div>
          </div>
          {record.catatan_checklist && <div className="rounded-xl bg-blue-50 p-3"><p className="text-xs font-bold text-blue-700 mb-1">Ringkasan Checklist</p><p className="text-xs text-blue-800 whitespace-pre-line">{record.catatan_checklist}</p></div>}
          {record.catatan_kegiatan && <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-700 mb-1">Laporan Kegiatan</p><p className="text-xs text-emerald-800 whitespace-pre-line">{record.catatan_kegiatan}</p></div>}

          {/* Inventaris */}
          {record.inventaris_serahterima?.length > 0 && (
            <div className="rounded-xl bg-indigo-50 p-3">
              <p className="text-xs font-bold text-indigo-700 mb-2 flex items-center gap-1">
                <Package className="w-3.5 h-3.5" /> Inventaris Serah Terima ({record.inventaris_serahterima.length} item)
              </p>
              <div className="space-y-1">
                {record.inventaris_serahterima.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-white rounded-lg px-2 py-1">
                    <span className="text-xs text-gray-700">{item.nama_item} <span className="text-gray-400">×{item.jumlah}</span></span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      item.kondisi === 'Baik' ? 'bg-emerald-100 text-emerald-700' :
                      item.kondisi === 'Cukup' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>{item.kondisi}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kendala Lapangan */}
          {record.kendala_lapangan?.length > 0 && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
              <p className="text-xs font-bold text-orange-700 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Kendala Lapangan ({record.kendala_lapangan.length})
              </p>
              <div className="space-y-1.5">
                {record.kendala_lapangan.map((k, i) => (
                  <div key={i} className={`rounded-lg p-2 text-xs ${k.sudah_selesai ? 'bg-gray-100' : 'bg-white'}`}>
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${k.sudah_selesai ? 'text-emerald-500' : 'text-gray-300'}`} />
                      <div>
                        <p className={`font-medium ${k.sudah_selesai ? 'line-through text-gray-400' : 'text-gray-800'}`}>{k.deskripsi}</p>
                        <div className="flex gap-1 mt-0.5">
                          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{k.kategori}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            k.tingkat === 'Kritis' ? 'bg-red-100 text-red-700' :
                            k.tingkat === 'Tinggi' ? 'bg-orange-100 text-orange-700' :
                            k.tingkat === 'Sedang' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{k.tingkat}</span>
                        </div>
                        {k.tindakan && <p className="text-[10px] text-gray-500 mt-0.5">Tindakan: {k.tindakan}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.hal_perlu_diperhatikan && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3"><p className="text-xs font-bold text-amber-700 mb-1">⚠️ Perlu Diperhatikan</p><p className="text-xs text-amber-800">{record.hal_perlu_diperhatikan}</p></div>}
          <div className="flex gap-2 text-xs">
            <span className="text-gray-500">Perlengkapan:</span>
            <Badge className={`border-0 text-[10px] ${record.perlengkapan_lengkap ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{record.perlengkapan_lengkap ? 'Lengkap' : 'Tidak Lengkap'}</Badge>
            {!record.perlengkapan_lengkap && record.catatan_perlengkapan && <span className="text-red-600">{record.catatan_perlengkapan}</span>}
          </div>

          {(isLepas || isTerima) && record.status !== 'Selesai' && (
            <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-3 space-y-2">
              <p className="text-xs font-bold text-blue-700 flex items-center gap-1"><PenLine className="w-3.5 h-3.5" /> Tanda Tangan Digital Anda</p>
              <Input value={ttd} onChange={e => setTtd(e.target.value)} placeholder={emp.nama_lengkap} className="h-9 text-sm font-medium" />
              <Button onClick={doSign} disabled={mut.isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tanda Tangani Sekarang'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ShiftHandoverPage() {
  const [showForm, setShowForm] = useState(false);
  const [signRecord, setSignRecord] = useState(null);

  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const empRole = emp?.role || emp?.jabatan || '';
  const MGMT_ROLES = ['Master Admin', 'Admin Pos', 'Chief Security', 'Leader Security', 'Supervisor Facility', 'Leader Facility'];
  const isMgmt = MGMT_ROLES.includes(empRole);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['shift-handover', emp.area_tugas, isMgmt],
    queryFn: () => isMgmt
      ? base44.entities.ShiftHandover.list('-tanggal', 100)
      : base44.entities.ShiftHandover.filter({ area_tugas: emp.area_tugas }, '-tanggal', 100),
  });

  const pending = records.filter(r => r.status === 'Menunggu Tanda Tangan');
  const done = records.filter(r => r.status === 'Selesai');

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-6">
      <div className="flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-800">Serah Terima Shift</h1>
            <p className="text-xs text-gray-500">Digital sign-off + ringkasan otomatis dari checklist & laporan</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-[#7B1A2C] hover:bg-[#5A1220] text-white gap-2 h-10">
          <Plus className="w-4 h-4" /> Buat Serah Terima
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 border-0 shadow-sm text-center">
          <p className="text-2xl font-black text-orange-500">{pending.length}</p>
          <p className="text-xs text-gray-500">Menunggu TTD</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm text-center">
          <p className="text-2xl font-black text-emerald-600">{done.length}</p>
          <p className="text-xs text-gray-500">Selesai</p>
        </Card>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">Menunggu Tanda Tangan</p>
          {pending.map(r => (
            <Card key={r.id} className="p-4 border-orange-200 border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm">{r.area_tugas} — Shift {r.shift_selesai} → {r.shift_berikutnya}</p>
                  <p className="text-xs text-gray-500">{r.tanggal} · {r.nama_lepas} → {r.nama_terima || 'Belum ditentukan'}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge className={`border-0 text-[10px] ${r.ttd_lepas ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-600'}`}>{r.ttd_lepas ? '✓ Lepas TTD' : '○ Lepas TTD'}</Badge>
                    <Badge className={`border-0 text-[10px] ${r.ttd_terima ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-600'}`}>{r.ttd_terima ? '✓ Terima TTD' : '○ Terima TTD'}</Badge>
                    {r.kendala_lapangan?.length > 0 && <Badge className="border-0 text-[10px] bg-orange-100 text-orange-700">⚠ {r.kendala_lapangan.length} kendala</Badge>}
                    {r.inventaris_serahterima?.length > 0 && <Badge className="border-0 text-[10px] bg-indigo-100 text-indigo-700">📦 {r.inventaris_serahterima.length} item</Badge>}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-blue-200 text-blue-700" onClick={() => setSignRecord(r)}>
                  <PenLine className="w-3.5 h-3.5" /> TTD
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Riwayat Selesai</p>
          {done.map(r => (
            <Card key={r.id} className="p-3 border-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{r.area_tugas} · Shift {r.shift_selesai} → {r.shift_berikutnya}</p>
                  <p className="text-xs text-gray-400">{r.tanggal} · {r.nama_lepas} → {r.nama_terima}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={() => setSignRecord(r)}>
                  <Eye className="w-3 h-3" /> Detail
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isLoading && <div className="space-y-2">{Array(3).fill(0).map((_, i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-2xl" />)}</div>}
      {!isLoading && records.length === 0 && (
        <div className="text-center py-16 text-gray-400"><ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">Belum ada dokumen serah terima</p></div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-blue-600" /> Buat Serah Terima Shift</DialogTitle></DialogHeader>
          <HandoverForm onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {signRecord && <SignOffDialog record={signRecord} onClose={() => setSignRecord(null)} />}
    </div>
  );
}