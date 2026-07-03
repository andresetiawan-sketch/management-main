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
import { Plus, ClipboardList, Search, CheckCircle2, Clock, AlertTriangle, User, Calendar, Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const PRIORITAS_COLOR = {
  'Rendah': 'bg-gray-100 text-gray-600',
  'Sedang': 'bg-blue-100 text-blue-700',
  'Tinggi': 'bg-orange-100 text-orange-700',
  'Mendesak': 'bg-red-100 text-red-700'
};
const STATUS_COLOR = {
  'Belum Dimulai': 'bg-gray-100 text-gray-600',
  'Sedang Dikerjakan': 'bg-blue-100 text-blue-700',
  'Selesai': 'bg-emerald-100 text-emerald-700',
  'Dibatalkan': 'bg-red-100 text-red-600'
};
const MGMT_ROLES = ['Master Admin', 'Chief Security', 'Supervisor Facility', 'Admin Pos', 'Leader Security', 'Leader Facility', 'Admin Security', 'SPV Security'];

function AssignmentForm({ onClose, employees }) {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const qc = useQueryClient();
  const [form, setForm] = useState({
    judul: '',
    deskripsi: '',
    nik_petugas: '',
    nama_petugas: '',
    area_tugas: '',
    nik_pemberi: emp.nik_karyawan || '',
    nama_pemberi: emp.nama_lengkap || '',
    jabatan_pemberi: emp.jabatan || emp.role || '',
    deadline: '',
    prioritas: 'Sedang',
    status: 'Belum Dimulai'
  });

  const mut = useMutation({
    mutationFn: (data) => base44.entities.Assignment.create(data),
    onSuccess: () => {qc.invalidateQueries(['assignments']);toast.success('Tugas berhasil dibuat');onClose();}
  });

  const handleSelectPetugas = (nik) => {
    const found = employees.find((e) => e.nik_karyawan === nik);
    if (found) setForm((p) => ({ ...p, nik_petugas: found.nik_karyawan, nama_petugas: found.nama_lengkap, area_tugas: found.area_tugas || '' }));
  };

  return (
    <form onSubmit={(e) => {e.preventDefault();mut.mutate(form);}} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <div>
        <Label className="text-xs">Judul Tugas *</Label>
        <Input value={form.judul} onChange={(e) => setForm((p) => ({ ...p, judul: e.target.value }))} placeholder="Contoh: Cek APAR Lantai 2" className="mt-1 h-9" required />
      </div>
      <div>
        <Label className="text-xs">Deskripsi Tugas</Label>
        <Textarea value={form.deskripsi} onChange={(e) => setForm((p) => ({ ...p, deskripsi: e.target.value }))} placeholder="Detail instruksi tugas..." className="mt-1 h-20 text-sm resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Petugas *</Label>
          <Select value={form.nik_petugas} onValueChange={handleSelectPetugas}>
            <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Pilih petugas..." /></SelectTrigger>
            <SelectContent>
              {employees.map((e) =>
              <SelectItem key={e.nik_karyawan} value={e.nik_karyawan}>{e.nama_lengkap} — {e.jabatan}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Deadline *</Label>
          <Input type="date" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} className="mt-1 h-9" required />
        </div>
        <div>
          <Label className="text-xs">Prioritas</Label>
          <Select value={form.prioritas} onValueChange={(v) => setForm((p) => ({ ...p, prioritas: v }))}>
            <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Rendah', 'Sedang', 'Tinggi', 'Mendesak'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Area Tugas</Label>
          <Input value={form.area_tugas} onChange={(e) => setForm((p) => ({ ...p, area_tugas: e.target.value }))} placeholder="Area..." className="mt-1 h-9 text-sm" />
        </div>
      </div>
      <Button type="submit" disabled={mut.isPending} className="w-full h-10 bg-[var(--maroon)] hover:bg-[var(--maroon-dark)] text-white">
        {mut.isPending ? 'Menyimpan...' : 'Buat Penugasan'}
      </Button>
    </form>);

}

function CompleteDialog({ assignment, onClose }) {
  const qc = useQueryClient();
  const [catatan, setCatatan] = useState('');
  const [foto, setFoto] = useState('');
  const [uploading, setUploading] = useState(false);

  const mut = useMutation({
    mutationFn: () => base44.entities.Assignment.update(assignment.id, {
      status: 'Selesai',
      catatan_penyelesaian: catatan,
      foto_bukti: foto,
      waktu_selesai: new Date().toLocaleString('id-ID')
    }),
    onSuccess: () => {qc.invalidateQueries(['assignments']);toast.success('Tugas ditandai selesai');onClose();}
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFoto(file_url);
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-3 text-sm">
        <p className="font-bold text-gray-800">{assignment.judul}</p>
        <p className="text-gray-500 text-xs mt-0.5">{assignment.deskripsi}</p>
      </div>
      <div>
        <Label className="text-xs">Catatan Penyelesaian</Label>
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Jelaskan apa yang sudah dikerjakan..." className="mt-1 h-20 text-sm resize-none" />
      </div>
      <div>
        <Label className="text-xs">Foto Bukti (opsional)</Label>
        {foto ?
        <div className="flex items-center gap-2 mt-1">
              <img src={foto} alt="" className="w-16 h-16 rounded-lg object-cover border" />
              <Button size="sm" variant="outline" onClick={() => setFoto('')}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div> :
        <label className={`mt-1 flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg text-xs text-gray-500 cursor-pointer hover:border-red-400 hover:text-red-600 transition-colors w-fit ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <Camera className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload Foto'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />
            </label>
        }
      </div>
      <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10">
        {mut.isPending ? 'Menyimpan...' : 'Tandai Selesai'}
      </Button>
    </div>);

}

export default function AssignmentPage() {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const empRole = emp?.role || emp?.jabatan || '';
  const isMgmt = MGMT_ROLES.includes(empRole);
  const [showForm, setShowForm] = useState(false);
  const [completeItem, setCompleteItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const qc = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.Assignment.list('-created_date', 200)
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-assign'],
    queryFn: () => base44.entities.Employee.filter({ status_aktif: 'Aktif' }),
    enabled: isMgmt
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Assignment.delete(id),
    onSuccess: () => {qc.invalidateQueries(['assignments']);toast.success('Tugas dihapus');}
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Assignment.update(id, { status }),
    onSuccess: () => qc.invalidateQueries(['assignments'])
  });

  const myItems = isMgmt ?
  assignments :
  assignments.filter((a) => a.nik_petugas === emp.nik_karyawan);

  const filtered = myItems.filter((a) => {
    const matchSearch = !search || a.judul?.toLowerCase().includes(search.toLowerCase()) || a.nama_petugas?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const today = new Date().toISOString().slice(0, 10);
  const overdue = filtered.filter((a) => a.deadline < today && a.status !== 'Selesai' && a.status !== 'Dibatalkan').length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--maroon)] flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-800">Penugasan</h1>
            <p className="text-xs text-gray-500">{isMgmt ? 'Kelola & pantau tugas petugas' : 'Tugas yang diberikan kepada Anda'}</p>
          </div>
        </div>
        {isMgmt &&
        <Button onClick={() => setShowForm(true)} className="h-10 hover:bg-[var(--maroon-dark)] text-white gap-2 bg-slate-950">
            <Plus className="w-4 h-4" /> Buat Tugas
          </Button>
        }
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
        { label: 'Total', val: myItems.length, color: 'text-gray-700' },
        { label: 'Berjalan', val: myItems.filter((a) => a.status === 'Sedang Dikerjakan').length, color: 'text-blue-600' },
        { label: 'Selesai', val: myItems.filter((a) => a.status === 'Selesai').length, color: 'text-emerald-600' },
        { label: 'Overdue', val: overdue, color: 'text-red-600' }].
        map((s) =>
        <Card key={s.label} className="p-3 border-0 shadow-sm text-center">
            <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-[10px] text-gray-500">{s.label}</p>
          </Card>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari tugas / petugas..." className="pl-9 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {['Belum Dimulai', 'Sedang Dikerjakan', 'Selesai', 'Dibatalkan'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />) :
        filtered.length === 0 ?
        <div className="text-center py-16 text-gray-400">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Belum ada penugasan</p>
            </div> :
        filtered.map((a) => {
          const isOverdue = a.deadline < today && a.status !== 'Selesai' && a.status !== 'Dibatalkan';
          return (
            <Card key={a.id} className={`p-4 border-0 shadow-sm hover:shadow-md transition-shadow ${isOverdue ? 'border-l-4 border-l-red-400' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${a.status === 'Selesai' ? 'bg-emerald-100' : isOverdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                    {a.status === 'Selesai' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : isOverdue ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <ClipboardList className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className="font-bold text-gray-800 text-sm">{a.judul}</span>
                      <Badge className={`border-0 text-[10px] ${PRIORITAS_COLOR[a.prioritas]}`}>{a.prioritas}</Badge>
                      <Badge className={`border-0 text-[10px] ${STATUS_COLOR[a.status]}`}>{a.status}</Badge>
                      {isOverdue && <Badge className="border-0 text-[10px] bg-red-100 text-red-600">Overdue</Badge>}
                    </div>
                    {a.deskripsi && <p className="text-xs text-gray-500 truncate">{a.deskripsi}</p>}
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{a.nama_petugas || '-'}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Deadline: <strong className={isOverdue ? 'text-red-500' : ''}>{a.deadline}</strong></span>
                      {a.area_tugas && <span className="flex items-center gap-1">📍 {a.area_tugas}</span>}
                    </div>
                    {a.status === 'Selesai' && a.catatan_penyelesaian &&
                  <p className="text-xs text-emerald-600 mt-1 bg-emerald-50 px-2 py-1 rounded-lg">✓ {a.catatan_penyelesaian}</p>
                  }
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {/* Petugas: bisa update status */}
                    {!isMgmt && a.nik_petugas === emp.nik_karyawan && a.status === 'Belum Dimulai' &&
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: a.id, status: 'Sedang Dikerjakan' })}>
                        <Clock className="w-3 h-3 mr-1" /> Mulai
                      </Button>
                  }
                    {!isMgmt && a.nik_petugas === emp.nik_karyawan && a.status === 'Sedang Dikerjakan' &&
                  <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setCompleteItem(a)}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Selesai
                      </Button>
                  }
                    {isMgmt && a.status !== 'Selesai' && a.status !== 'Dibatalkan' &&
                  <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={() => deleteMut.mutate(a.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                  }
                  </div>
                </div>
              </Card>);

        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-[var(--maroon)]" /> Buat Penugasan Baru</DialogTitle></DialogHeader>
          <AssignmentForm onClose={() => setShowForm(false)} employees={employees} />
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={!!completeItem} onOpenChange={() => setCompleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Selesaikan Tugas</DialogTitle></DialogHeader>
          {completeItem && <CompleteDialog assignment={completeItem} onClose={() => setCompleteItem(null)} />}
        </DialogContent>
      </Dialog>
    </div>);

}