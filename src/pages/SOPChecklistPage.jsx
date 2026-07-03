import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// eslint-disable-next-line no-unused-vars
import { Plus, ClipboardCheck, Settings, Trash2, GripVertical, Camera, CheckCircle2, XCircle, MinusCircle, TrendingUp, Star, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MGMT = ['Master Admin','Chief Security','Supervisor Facility','Admin Pos','Leader Security','Leader Facility'];
const KATEGORI_COLOR = {
  Keamanan: 'bg-red-100 text-red-700', Fasilitas: 'bg-blue-100 text-blue-700',
  Kebersihan: 'bg-green-100 text-green-700', K3: 'bg-orange-100 text-orange-700',
  Operasional: 'bg-purple-100 text-purple-700', Lainnya: 'bg-gray-100 text-gray-600'
};

function ScoreBadge({ score }) {
  const color = score >= 90 ? 'bg-emerald-100 text-emerald-700' : score >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  return <Badge className={`${color} border-0 font-black text-base px-3`}>{score}</Badge>;
}

// ── SOP Builder ──────────────────────────────────────────────────────────────
function SOPBuilder({ onClose }) {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const qc = useQueryClient();
  const { data: areas = [] } = useQuery({ queryKey: ['areas-sop'], queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' }) });
  const [form, setForm] = useState({ nama_sop: '', area_tugas: emp.area_tugas || '', kategori: 'Operasional', deskripsi: '', frekuensi: 'Harian', langkah: [] });

  const addLangkah = () => setForm(p => ({
    ...p,
    langkah: [...p.langkah, { id: Date.now().toString(), urutan: p.langkah.length + 1, instruksi: '', foto_wajib: true, catatan_panduan: '' }]
  }));

  const removeLangkah = (id) => setForm(p => ({ ...p, langkah: p.langkah.filter(l => l.id !== id) }));
  const updateLangkah = (id, field, val) => setForm(p => ({ ...p, langkah: p.langkah.map(l => l.id === id ? { ...l, [field]: val } : l) }));

  const mut = useMutation({
    mutationFn: (d) => base44.entities.SOPChecklist.create(d),
    onSuccess: () => { qc.invalidateQueries(['sop-list']); onClose(); toast.success('SOP berhasil dibuat'); }
  });

  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label className="text-xs">Nama SOP *</Label><Input value={form.nama_sop} onChange={e => setForm(p => ({ ...p, nama_sop: e.target.value }))} className="mt-1 h-9" placeholder="Prosedur Patroli Malam..." /></div>
        <div>
          <Label className="text-xs">Area</Label>
          <Select value={form.area_tugas} onValueChange={v => setForm(p => ({ ...p, area_tugas: v }))}>
            <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Kategori</Label>
          <Select value={form.kategori} onValueChange={v => setForm(p => ({ ...p, kategori: v }))}>
            <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{['Keamanan','Fasilitas','Kebersihan','K3','Operasional','Lainnya'].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Frekuensi</Label>
          <Select value={form.frekuensi} onValueChange={v => setForm(p => ({ ...p, frekuensi: v }))}>
            <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{['Harian','Per Shift','Mingguan','Bulanan'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Deskripsi</Label><Textarea value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))} className="mt-1 h-16 text-sm resize-none" /></div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-bold">Langkah-Langkah SOP ({form.langkah.length})</Label>
          <Button size="sm" variant="outline" onClick={addLangkah} className="h-7 text-xs gap-1"><Plus className="w-3 h-3" />Tambah Langkah</Button>
        </div>
        <div className="space-y-2">
          {form.langkah.map((l, idx) => (
            <div key={l.id} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
              <div className="flex items-center gap-2 mb-2">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-600 bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center">{idx+1}</span>
                <div className="flex-1">
                  <Input value={l.instruksi} onChange={e => updateLangkah(l.id, 'instruksi', e.target.value)} className="h-8 text-sm" placeholder="Instruksi langkah ini..." />
                </div>
                <label className="flex items-center gap-1 text-xs text-blue-700 cursor-pointer shrink-0">
                  <input type="checkbox" checked={l.foto_wajib} onChange={e => updateLangkah(l.id, 'foto_wajib', e.target.checked)} className="w-3.5 h-3.5" />
                  <Camera className="w-3 h-3" /> Foto Wajib
                </label>
                <button onClick={() => removeLangkah(l.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <Input value={l.catatan_panduan} onChange={e => updateLangkah(l.id, 'catatan_panduan', e.target.value)} className="h-7 text-xs" placeholder="Catatan panduan (opsional)..." />
            </div>
          ))}
          {form.langkah.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Belum ada langkah. Klik "Tambah Langkah".</p>}
        </div>
      </div>

      <Button onClick={() => mut.mutate({ ...form, dibuat_oleh: emp.nik_karyawan, status: 'Aktif' })}
        disabled={mut.isPending || !form.nama_sop || form.langkah.length === 0}
        className="w-full bg-[#7B1A2C] hover:bg-[#5A1220] text-white">
        {mut.isPending ? 'Menyimpan...' : 'Simpan SOP'}
      </Button>
    </div>
  );
}

// ── Audit Executor ────────────────────────────────────────────────────────────
function AuditExecutor({ sop, onClose }) {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const qc = useQueryClient();
  const [hasil, setHasil] = useState(() =>
    (sop.langkah || []).map(l => ({ langkah_id: l.id, instruksi: l.instruksi, status: '', foto: '', catatan: '', foto_wajib: l.foto_wajib }))
  );
  const [uploading, setUploading] = useState({});

  const setStep = (idx, field, val) => setHasil(p => p.map((h, i) => i === idx ? { ...h, [field]: val } : h));

  const uploadFoto = async (idx, file) => {
    setUploading(p => ({ ...p, [idx]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setStep(idx, 'foto', file_url);
    setUploading(p => ({ ...p, [idx]: false }));
  };

  const mut = useMutation({
    mutationFn: (data) => base44.entities.SOPAudit.create(data),
    onSuccess: () => { qc.invalidateQueries(['sop-audits']); onClose(); toast.success('Audit SOP berhasil disimpan'); }
  });

  const handleSubmit = () => {
    const sesuai = hasil.filter(h => h.status === 'Sesuai').length;
    const total = hasil.filter(h => h.status !== 'N/A').length || 1;
    const skor = Math.round((sesuai / total) * 100);
    mut.mutate({
      sop_id: sop.id, nama_sop: sop.nama_sop, area_tugas: sop.area_tugas,
      nik_petugas: emp.nik_karyawan, nama_petugas: emp.nama_lengkap, jabatan: emp.jabatan || emp.role,
      tanggal: new Date().toISOString().slice(0, 10),
      waktu_mulai: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      langkah_hasil: hasil, skor, total_langkah: hasil.length, langkah_sesuai: sesuai, status: 'Selesai'
    });
  };

  const canSubmit = hasil.every(h => {
    if (!h.status) return false;
    if (h.foto_wajib && h.status === 'Sesuai' && !h.foto) return false;
    return true;
  });

  const sesuai = hasil.filter(h => h.status === 'Sesuai').length;
  const total = hasil.filter(h => h.status !== 'N/A').length || 1;
  const preview = Math.round((sesuai / total) * 100);

  return (
    <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
        <div>
          <p className="font-bold text-gray-800 text-sm">{sop.nama_sop}</p>
          <p className="text-xs text-gray-500">{sop.area_tugas} · {sop.kategori}</p>
        </div>
        <div className="text-center">
          <p className={`text-3xl font-black ${preview >= 90 ? 'text-emerald-600' : preview >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{preview}</p>
          <p className="text-[10px] text-gray-400">skor sementara</p>
        </div>
      </div>

      {hasil.map((h, idx) => (
        <div key={h.langkah_id} className="border border-gray-200 rounded-xl p-3 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-bold text-gray-500 bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">{idx+1}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{h.instruksi}</p>
              {h.foto_wajib && <p className="text-[10px] text-blue-600 flex items-center gap-1 mt-0.5"><Camera className="w-3 h-3" /> Foto wajib jika "Sesuai"</p>}
            </div>
          </div>
          <div className="flex gap-2">
            {['Sesuai','Tidak Sesuai','N/A'].map(s => (
              <button key={s} onClick={() => setStep(idx, 'status', s)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  h.status === s
                    ? s === 'Sesuai' ? 'bg-emerald-500 text-white border-emerald-500' : s === 'Tidak Sesuai' ? 'bg-red-500 text-white border-red-500' : 'bg-gray-400 text-white border-gray-400'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}>
                {s === 'Sesuai' ? <CheckCircle2 className="w-3 h-3 inline mr-1" /> : s === 'Tidak Sesuai' ? <XCircle className="w-3 h-3 inline mr-1" /> : <MinusCircle className="w-3 h-3 inline mr-1" />}
                {s}
              </button>
            ))}
          </div>
          {h.status && h.status !== 'N/A' && (
            <div className="space-y-1.5">
              {(h.foto_wajib && h.status === 'Sesuai') || h.status === 'Tidak Sesuai' ? (
                <div>
                  {h.foto
                    ? <div className="relative inline-block"><img src={h.foto} className="w-20 h-16 object-cover rounded-lg border" alt="bukti" /><button onClick={() => setStep(idx, 'foto', '')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">✕</button></div>
                    : <label className={`flex items-center gap-1.5 px-3 py-2 border border-dashed rounded-lg text-xs cursor-pointer w-fit ${uploading[idx] ? 'opacity-50 border-gray-300 text-gray-400' : 'border-blue-300 text-blue-600 hover:border-blue-400'}`}>
                        {uploading[idx] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                        {uploading[idx] ? 'Upload...' : 'Upload Foto Bukti'}
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadFoto(idx, e.target.files[0]); }} />
                      </label>
                  }
                </div>
              ) : null}
              <Input value={h.catatan} onChange={e => setStep(idx, 'catatan', e.target.value)} className="h-7 text-xs" placeholder="Catatan (opsional)..." />
            </div>
          )}
        </div>
      ))}

      <Button onClick={handleSubmit} disabled={mut.isPending || !canSubmit} className="w-full bg-[#7B1A2C] hover:bg-[#5A1220] text-white">
        {mut.isPending ? 'Menyimpan...' : `Selesaikan Audit (Skor: ${preview})`}
      </Button>
      {!canSubmit && <p className="text-xs text-gray-400 text-center">Lengkapi semua langkah + foto wajib untuk melanjutkan</p>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SOPChecklistPage() {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMgmt = MGMT.includes(emp?.role || emp?.jabatan);
  const [tab, setTab] = useState('dashboard');
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedSOP, setSelectedSOP] = useState(null);
  const [filterArea, setFilterArea] = useState(emp.area_tugas || 'all');

  const { data: sops = [] } = useQuery({ queryKey: ['sop-list'], queryFn: () => base44.entities.SOPChecklist.filter({ status: 'Aktif' }, 'nama_sop', 200) });
  const { data: audits = [], isLoading } = useQuery({ queryKey: ['sop-audits'], queryFn: () => base44.entities.SOPAudit.list('-tanggal', 500) });
  const { data: areas = [] } = useQuery({ queryKey: ['areas-sop'], queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' }) });

  const qc = useQueryClient();
  const deleteSOP = useMutation({
    mutationFn: (id) => base44.entities.SOPChecklist.delete(id),
    onSuccess: () => { qc.invalidateQueries(['sop-list']); toast.success('SOP dihapus'); }
  });

  const thisMonth = new Date().toISOString().slice(0, 7);

  // Per-officer compliance stats
  const officerStats = (() => {
    const map = {};
    audits.filter(a => a.tanggal?.startsWith(thisMonth) && (filterArea === 'all' || a.area_tugas === filterArea)).forEach(a => {
      if (!map[a.nik_petugas]) map[a.nik_petugas] = { nik: a.nik_petugas, nama: a.nama_petugas, jabatan: a.jabatan, total: 0, sumSkor: 0, audits: [] };
      map[a.nik_petugas].total++;
      map[a.nik_petugas].sumSkor += (a.skor || 0);
      map[a.nik_petugas].audits.push(a);
    });
    return Object.values(map).map(o => ({ ...o, avg: Math.round(o.sumSkor / o.total) })).sort((a, b) => b.avg - a.avg);
  })();

  // Area compliance
  const areaStats = (() => {
    const map = {};
    audits.filter(a => a.tanggal?.startsWith(thisMonth)).forEach(a => {
      if (!map[a.area_tugas]) map[a.area_tugas] = { area: a.area_tugas, total: 0, sumSkor: 0 };
      map[a.area_tugas].total++;
      map[a.area_tugas].sumSkor += (a.skor || 0);
    });
    return Object.values(map).map(a => ({ ...a, avg: Math.round(a.sumSkor / a.total) })).sort((a, b) => b.avg - a.avg);
  })();

  const totalAuditsBulanIni = audits.filter(a => a.tanggal?.startsWith(thisMonth)).length;
  const avgSkorAll = totalAuditsBulanIni > 0 ? Math.round(audits.filter(a => a.tanggal?.startsWith(thisMonth)).reduce((s, a) => s + (a.skor || 0), 0) / totalAuditsBulanIni) : 0;
  const lowCompliance = officerStats.filter(o => o.avg < 70).length;

  const filteredSops = filterArea === 'all' ? sops : sops.filter(s => s.area_tugas === filterArea);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-8">
      <div className="flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><ClipboardCheck className="w-5 h-5 text-purple-600" /></div>
          <div>
            <h1 className="text-lg font-black text-gray-800">Checklist Kepatuhan SOP</h1>
            <p className="text-xs text-gray-500">Audit berbasis langkah · foto bukti wajib · skor otomatis</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Semua Area</SelectItem>{areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
          </Select>
          {isMgmt && <Button onClick={() => setShowBuilder(true)} className="bg-[#7B1A2C] hover:bg-[#5A1220] text-white gap-1 h-9"><Plus className="w-4 h-4" />Buat SOP</Button>}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="dashboard" className="rounded-lg text-sm">Dashboard Kepatuhan</TabsTrigger>
          <TabsTrigger value="sop" className="rounded-lg text-sm">Daftar SOP</TabsTrigger>
          <TabsTrigger value="riwayat" className="rounded-lg text-sm">Riwayat Audit</TabsTrigger>
        </TabsList>

        {/* ── DASHBOARD ── */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Audit Bulan Ini', value: totalAuditsBulanIni, color: 'bg-blue-50 text-blue-700' },
              { label: 'Rata-rata Skor', value: avgSkorAll || '-', color: avgSkorAll >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700' },
              { label: 'Perlu Perhatian', value: lowCompliance, color: lowCompliance > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600' },
            ].map(s => (
              <Card key={s.label} className={`p-4 border-0 shadow-sm text-center ${s.color}`}>
                <p className="text-3xl font-black">{s.value}</p>
                <p className="text-xs mt-1">{s.label}</p>
              </Card>
            ))}
          </div>

          {lowCompliance > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{lowCompliance} petugas memiliki skor kepatuhan di bawah 70% bulan ini</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Per-Officer */}
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" />Skor Kepatuhan per Petugas</p>
              {officerStats.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">Belum ada data bulan ini</p>
                : <div className="space-y-3">
                    {officerStats.map((o, i) => (
                      <div key={o.nik} className="flex items-center gap-3">
                        <span className="text-lg shrink-0">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{o.nama}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div className="h-1.5 rounded-full transition-all" style={{ width: `${o.avg}%`, background: o.avg >= 90 ? '#16a34a' : o.avg >= 70 ? '#d97706' : '#dc2626' }} />
                            </div>
                            <span className="text-xs text-gray-400">{o.total}×</span>
                          </div>
                        </div>
                        <ScoreBadge score={o.avg} />
                      </div>
                    ))}
                  </div>
              }
            </Card>

            {/* Per-Area */}
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" />Kepatuhan per Area</p>
              {areaStats.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">Belum ada data</p>
                : <div className="space-y-3">
                    {areaStats.map(a => (
                      <div key={a.area} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{a.area}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div className="h-1.5 rounded-full" style={{ width: `${a.avg}%`, background: a.avg >= 90 ? '#16a34a' : a.avg >= 70 ? '#d97706' : '#dc2626' }} />
                            </div>
                            <span className="text-xs text-gray-400">{a.total} audit</span>
                          </div>
                        </div>
                        <ScoreBadge score={a.avg} />
                      </div>
                    ))}
                  </div>
              }
            </Card>
          </div>
        </TabsContent>

        {/* ── SOP LIST ── */}
        <TabsContent value="sop" className="space-y-3 mt-4">
          {filteredSops.length === 0
            ? <div className="text-center py-16 text-gray-400"><ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">Belum ada SOP. {isMgmt ? 'Klik "Buat SOP" untuk memulai.' : 'Hubungi supervisor.'}</p></div>
            : filteredSops.map(s => (
                <Card key={s.id} className="p-4 border-0 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-800 text-sm">{s.nama_sop}</p>
                        <Badge className={`${KATEGORI_COLOR[s.kategori]} border-0 text-[10px]`}>{s.kategori}</Badge>
                        <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px]">{s.frekuensi}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">{s.area_tugas} · {s.langkah?.length || 0} langkah</p>
                      {s.deskripsi && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{s.deskripsi}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => setSelectedSOP(s)} className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1">
                        <ClipboardCheck className="w-3 h-3" />Mulai Audit
                      </Button>
                      {isMgmt && <Button size="sm" variant="ghost" onClick={() => { if (confirm('Hapus SOP ini?')) deleteSOP.mutate(s.id); }} className="h-8 w-8 p-0 text-red-400"><Trash2 className="w-3.5 h-3.5" /></Button>}
                    </div>
                  </div>
                </Card>
              ))
          }
        </TabsContent>

        {/* ── RIWAYAT ── */}
        <TabsContent value="riwayat" className="space-y-3 mt-4">
          {isLoading
            ? Array(3).fill(0).map((_, i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-2xl" />)
            : audits.filter(a => filterArea === 'all' || a.area_tugas === filterArea).slice(0, 50).map(a => (
                <Card key={a.id} className="p-4 border-0 shadow-sm">
                  <div className="flex items-center gap-3">
                    <ScoreBadge score={a.skor || 0} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{a.nama_sop}</p>
                      <p className="text-xs text-gray-500">{a.nama_petugas} · {a.area_tugas} · {a.tanggal}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">{a.langkah_sesuai}/{a.total_langkah} sesuai</p>
                      <Badge className={`border-0 text-[10px] ${a.skor >= 90 ? 'bg-emerald-100 text-emerald-700' : a.skor >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {a.skor >= 90 ? 'Sangat Baik' : a.skor >= 70 ? 'Cukup' : 'Perlu Perbaikan'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))
          }
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Buat SOP Baru</DialogTitle></DialogHeader><SOPBuilder onClose={() => setShowBuilder(false)} /></DialogContent>
      </Dialog>
      <Dialog open={!!selectedSOP} onOpenChange={() => setSelectedSOP(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Eksekusi Audit SOP</DialogTitle></DialogHeader>{selectedSOP && <AuditExecutor sop={selectedSOP} onClose={() => setSelectedSOP(null)} />}</DialogContent>
      </Dialog>
    </div>
  );
}