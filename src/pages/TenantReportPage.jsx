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
import { Plus, MessageCircle, Clock, CheckCircle2, AlertTriangle, Camera, Send, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLOR = {
  'Terbuka': 'bg-red-100 text-red-700 border-red-200',
  'Sedang Diproses': 'bg-blue-100 text-blue-700 border-blue-200',
  'Terselesaikan': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};
const PRIORITY_COLOR = {
  Rendah: 'bg-gray-100 text-gray-600',
  Sedang: 'bg-yellow-100 text-yellow-700',
  Tinggi: 'bg-orange-100 text-orange-700',
  Darurat: 'bg-red-100 text-red-700',
};
const CATEGORIES = ['Kebocoran','Listrik','AC/Ventilasi','Lift/Eskalator','Kebersihan','Keamanan','Parkir','Lainnya'];
const MGMT_ROLES = ['Master Admin','Chief Security','Supervisor Facility','Admin Pos','Leader Security','Leader Facility'];

function getAge(dateStr, timeStr) {
  if (!dateStr) return '';
  const created = new Date(`${dateStr}T${timeStr || '00:00'}:00`);
  const diffH = (Date.now() - created.getTime()) / 3600000;
  if (diffH < 1) return `${Math.round(diffH * 60)}m lalu`;
  if (diffH < 24) return `${Math.round(diffH)}j lalu`;
  return `${Math.floor(diffH / 24)}h lalu`;
}

function PhotoUpload({ onAdd }) {
  const [loading, setLoading] = useState(false);
  const handle = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onAdd(file_url); setLoading(false);
  };
  return (
    <label className={`flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 cursor-pointer hover:border-blue-400 w-fit ${loading ? 'opacity-50' : ''}`}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
      {loading ? 'Uploading...' : 'Lampiran'}
      <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={handle} />
    </label>
  );
}

function ChatThread({ report, onClose }) {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const qc = useQueryClient();
  const isMgmt = MGMT_ROLES.includes(emp?.role || emp?.jabatan);
  const [msg, setMsg] = useState('');
  const [msgPhoto, setMsgPhoto] = useState('');
  const [sending, setSending] = useState(false);

  const sendMsg = async () => {
    if (!msg.trim() && !msgPhoto) return;
    setSending(true);
    const newMsg = {
      dari: emp.nama_lengkap || 'Petugas',
      role: emp.role || emp.jabatan || 'Petugas',
      pesan: msg,
      waktu: new Date().toLocaleString('id-ID'),
      lampiran: msgPhoto,
    };
    const existPesan = report.pesan || [];
    await base44.entities.TenantReport.update(report.id, { pesan: [...existPesan, newMsg] });
    qc.invalidateQueries(['tenant-reports']);
    setMsg(''); setMsgPhoto('');
    setSending(false);
  };

  const updateStatus = async (status) => {
    await base44.entities.TenantReport.update(report.id, {
      status,
      petugas_nik: emp.nik_karyawan,
      petugas_nama: emp.nama_lengkap,
      ...(status === 'Terselesaikan' ? { tanggal_selesai: new Date().toISOString().slice(0, 10) } : {})
    });
    qc.invalidateQueries(['tenant-reports']);
    toast.success(`Status diubah ke ${status}`);
    onClose();
  };

  return (
    <div className="flex flex-col h-[70vh]">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 rounded-t-xl space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-gray-800 text-sm">{report.judul}</p>
          <Badge className={`text-xs border shrink-0 ${STATUS_COLOR[report.status]}`}>{report.status}</Badge>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span>{report.nama_pelapor}</span>
          {report.unit_tenant && <span>· Unit {report.unit_tenant}</span>}
          <span>· {report.area_tugas}</span>
          <Badge className={`${PRIORITY_COLOR[report.prioritas]} border-0 text-[10px]`}>{report.prioritas}</Badge>
        </div>
        {report.deskripsi && <p className="text-xs text-gray-500 italic">{report.deskripsi}</p>}
        {report.lampiran?.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1">
            {report.lampiran.map((url, i) => <img key={i} src={url} alt="" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />)}
          </div>
        )}
        {isMgmt && report.status !== 'Terselesaikan' && (
          <div className="flex gap-2 pt-1">
            {report.status === 'Terbuka' && (
              <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => updateStatus('Sedang Diproses')}>Proses</Button>
            )}
            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateStatus('Terselesaikan')}>
              <CheckCircle2 className="w-3 h-3 mr-1" /> Selesaikan
            </Button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {(report.pesan || []).length === 0
          ? <p className="text-xs text-gray-400 text-center pt-6">Belum ada pesan. Mulai percakapan...</p>
          : (report.pesan || []).map((m, i) => {
              const isMe = m.dari === (emp.nama_lengkap || 'Petugas');
              return (
                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 space-y-1 ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    {!isMe && <p className="text-[10px] font-bold opacity-70">{m.dari} ({m.role})</p>}
                    {m.pesan && <p className="text-sm">{m.pesan}</p>}
                    {m.lampiran && <img src={m.lampiran} alt="" className="w-32 h-24 object-cover rounded-lg mt-1" />}
                    <p className={`text-[10px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>{m.waktu}</p>
                  </div>
                </div>
              );
            })
        }
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white space-y-2">
        {msgPhoto && (
          <div className="relative inline-block">
            <img src={msgPhoto} className="w-14 h-14 object-cover rounded-lg border" alt="lampiran" />
            <button onClick={() => setMsgPhoto('')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">✕</button>
          </div>
        )}
        <div className="flex gap-2">
          <Input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} placeholder="Tulis pesan..." className="flex-1 h-9 text-sm" />
          <PhotoUpload onAdd={url => setMsgPhoto(url)} />
          <Button size="sm" onClick={sendMsg} disabled={sending || (!msg.trim() && !msgPhoto)} className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TenantReportPage() {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMgmt = MGMT_ROLES.includes(emp?.role || emp?.jabatan);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    nama_pelapor: '', unit_tenant: '', no_telepon: '',
    area_tugas: emp.area_tugas || '', judul: '', kategori: 'Lainnya',
    deskripsi: '', prioritas: 'Sedang', lampiran: [],
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['tenant-reports', statusFilter],
    queryFn: () => base44.entities.TenantReport.list('-created_date', 200),
    refetchInterval: 30000,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-tr'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.TenantReport.create(data),
    onSuccess: () => { qc.invalidateQueries(['tenant-reports']); setShowForm(false); toast.success('Laporan berhasil dikirim!'); }
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, lampiran: [...(p.lampiran || []), file_url] }));
    setUploading(false);
  };

  const filtered = reports
    .filter(r => !statusFilter || r.status === statusFilter)
    .filter(r => !search || r.judul?.toLowerCase().includes(search.toLowerCase()) || r.nama_pelapor?.toLowerCase().includes(search.toLowerCase()))
    .filter(r => !isMgmt ? true : true);

  const counts = {
    Terbuka: reports.filter(r => r.status === 'Terbuka').length,
    'Sedang Diproses': reports.filter(r => r.status === 'Sedang Diproses').length,
    Terselesaikan: reports.filter(r => r.status === 'Terselesaikan').length,
  };

  // Check 24h overdue
  const overdue = reports.filter(r => {
    if (r.status === 'Terselesaikan') return false;
    const created = new Date(`${r.tanggal_lapor}T${r.waktu_lapor || '00:00'}:00`);
    return (Date.now() - created.getTime()) > 86400000;
  });

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-6">
      <div className="flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-800">Laporan Penyewa</h1>
            <p className="text-xs text-gray-500">Laporan masalah fasilitas dari tenant + messaging langsung</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-[#7B1A2C] hover:bg-[#5A1220] text-white gap-2 h-10">
          <Plus className="w-4 h-4" /> Buat Laporan
        </Button>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700"><strong>{overdue.length} laporan</strong> melebihi 24 jam tanpa penyelesaian: {overdue.slice(0, 2).map(r => r.judul).join(', ')}{overdue.length > 2 ? '...' : ''}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Terbuka', count: counts['Terbuka'], color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Diproses', count: counts['Sedang Diproses'], color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Selesai', count: counts['Terselesaikan'], color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(s => (
          <Card key={s.label} className={`p-4 border-0 shadow-sm text-center cursor-pointer ${statusFilter === s.label || (statusFilter === 'Sedang Diproses' && s.label === 'Diproses') ? 'ring-2 ring-blue-400' : ''}`}
            onClick={() => setStatusFilter(statusFilter === s.label || (s.label === 'Diproses' && statusFilter === 'Sedang Diproses') ? '' : (s.label === 'Diproses' ? 'Sedang Diproses' : s.label))}>
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari laporan..." className="pl-9 h-9" />
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {isLoading ? Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />)
          : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Belum ada laporan</p>
            </div>
          ) : filtered.map(r => {
            const isOverdue = r.status !== 'Terselesaikan' && (Date.now() - new Date(`${r.tanggal_lapor}T${r.waktu_lapor || '00:00'}:00`).getTime()) > 86400000;
            return (
              <Card key={r.id} className={`p-4 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`} onClick={() => setSelected(r)}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${r.status === 'Terselesaikan' ? 'bg-emerald-100' : r.status === 'Sedang Diproses' ? 'bg-blue-100' : 'bg-red-100'}`}>
                    {r.status === 'Terselesaikan' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <MessageCircle className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-gray-800 text-sm truncate">{r.judul}</span>
                      {isOverdue && <Badge className="bg-red-100 text-red-700 border-0 text-[10px] shrink-0 animate-pulse">⚠️ &gt;24j</Badge>}
                    </div>
                    <p className="text-xs text-gray-500">{r.nama_pelapor} {r.unit_tenant ? `· Unit ${r.unit_tenant}` : ''} · {r.area_tugas}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-[10px] border ${STATUS_COLOR[r.status]}`}>{r.status}</Badge>
                      <Badge className={`${PRIORITY_COLOR[r.prioritas]} border-0 text-[10px]`}>{r.prioritas}</Badge>
                      <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px]">{r.kategori}</Badge>
                      {(r.pesan || []).length > 0 && <span className="text-[10px] text-blue-600 font-medium">{r.pesan.length} pesan</span>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{getAge(r.tanggal_lapor, r.waktu_lapor)}</span>
                </div>
              </Card>
            );
          })}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Buat Laporan Masalah Fasilitas</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nama Pelapor *</Label><Input value={form.nama_pelapor} onChange={e => setForm(p => ({ ...p, nama_pelapor: e.target.value }))} className="mt-1 h-9 text-sm" /></div>
              <div><Label className="text-xs">Unit/Lantai</Label><Input value={form.unit_tenant} onChange={e => setForm(p => ({ ...p, unit_tenant: e.target.value }))} className="mt-1 h-9 text-sm" placeholder="B2-12..." /></div>
            </div>
            <div><Label className="text-xs">No. Telepon</Label><Input value={form.no_telepon} onChange={e => setForm(p => ({ ...p, no_telepon: e.target.value }))} className="mt-1 h-9 text-sm" /></div>
            <div><Label className="text-xs">Area</Label>
              <Select value={form.area_tugas} onValueChange={v => setForm(p => ({ ...p, area_tugas: v }))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Judul Masalah *</Label><Input value={form.judul} onChange={e => setForm(p => ({ ...p, judul: e.target.value }))} className="mt-1 h-9 text-sm" placeholder="AC bocor, lampu mati..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Kategori</Label>
                <Select value={form.kategori} onValueChange={v => setForm(p => ({ ...p, kategori: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Prioritas</Label>
                <Select value={form.prioritas} onValueChange={v => setForm(p => ({ ...p, prioritas: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{['Rendah','Sedang','Tinggi','Darurat'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Deskripsi</Label><Textarea value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))} className="mt-1 text-sm h-20 resize-none" /></div>
            <div>
              <Label className="text-xs">Lampiran Foto/Video</Label>
              <div className="mt-1 flex flex-wrap gap-2 items-center">
                {(form.lampiran || []).map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} className="w-14 h-14 object-cover rounded-lg border" alt="" />
                    <button onClick={() => setForm(p => ({ ...p, lampiran: p.lampiran.filter((_, j) => j !== i) }))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100">✕</button>
                  </div>
                ))}
                <label className={`flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  Tambah
                  <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={handleUpload} />
                </label>
              </div>
            </div>
            <Button onClick={() => createMut.mutate({ ...form, tanggal_lapor: new Date().toISOString().slice(0, 10), waktu_lapor: new Date().toTimeString().slice(0, 5), status: 'Terbuka' })}
              disabled={createMut.isPending || !form.nama_pelapor || !form.judul} className="w-full h-11 bg-[#7B1A2C] hover:bg-[#5A1220] text-white">
              {createMut.isPending ? 'Mengirim...' : 'Kirim Laporan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="sr-only"><DialogTitle>Chat Laporan</DialogTitle></DialogHeader>
          {selected && <ChatThread report={selected} onClose={() => setSelected(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}