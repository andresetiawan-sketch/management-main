import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Wrench, CheckCircle2, AlertTriangle, Clock, Pencil, AlertCircle, Camera, X } from 'lucide-react';
import FullscreenCameraCapture from '@/components/camera/FullscreenCameraCapture';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import TicketDiscussion from '@/components/facility/TicketDiscussion';

const STATUS_COLOR = {
  Baru: 'bg-red-100 text-red-700',
  Perbaikan: 'bg-blue-100 text-blue-700',
  Selesai: 'bg-emerald-100 text-emerald-700',
};
const PRIORITY_COLOR = {
  Rendah: 'bg-gray-100 text-gray-600',
  Sedang: 'bg-yellow-100 text-yellow-700',
  Tinggi: 'bg-orange-100 text-orange-700',
  Darurat: 'bg-red-100 text-red-700',
};

const emptyForm = { judul: '', deskripsi: '', area_tugas: '', lokasi_kerusakan: '', prioritas: 'Sedang', foto_kerusakan: '' };

export default function FacilityTicketing() {
  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';
  const MANAGEMENT = ['Chief Security','Supervisor Facility','Admin Pos','Leader Security','Leader Facility'];
  const canManage = isMasterAdmin || MANAGEMENT.includes(employee?.role || employee?.jabatan);

  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...emptyForm, area_tugas: employee?.area_tugas || '' });
  const [errors, setErrors] = useState({});
  const [filterStatus, setFilterStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const employeeArea = employee?.area_tugas || '';

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', filterStatus, employeeArea, isMasterAdmin],
    queryFn: () => {
      const q = {};
      if (!isMasterAdmin && employeeArea) q.area_tugas = employeeArea;
      if (filterStatus) q.status = filterStatus;
      return Object.keys(q).length ? base44.entities.FacilityTicket.filter(q, '-created_date', 500) : base44.entities.FacilityTicket.list('-created_date', 500);
    }
  });

  const { data: areas = [] } = useQuery({ queryKey: ['areas-ticket'], queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' }) });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.FacilityTicket.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tickets'] }); setShowForm(false); setForm(emptyForm); toast.success('Tiket berhasil dibuat, notifikasi terkirim ke Facility'); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FacilityTicket.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tickets'] }); setSelected(null); toast.success('Tiket diperbarui'); }
  });

  const validate = () => {
    const e = {};
    if (!form.judul?.trim()) e.judul = 'Judul wajib diisi';
    if (!form.area_tugas) e.area_tugas = 'Area wajib dipilih';
    if (!form.lokasi_kerusakan?.trim()) e.lokasi_kerusakan = 'Lokasi wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    createMutation.mutate({
      ...form,
      nik_pelapor: employee.nik_karyawan,
      nama_pelapor: employee.nama_lengkap,
      jabatan_pelapor: employee.jabatan,
      tanggal_lapor: new Date().toISOString().slice(0, 10),
      status: 'Baru'
    });
  };

  const handleFotoUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, foto_kerusakan: file_url }));
    setUploading(false);
    toast.success('Foto berhasil diupload');
  };

  const handleCameraCapture = (url) => {
    setForm(prev => ({ ...prev, foto_kerusakan: url }));
    toast.success('Foto berhasil diambil');
  };

  const handleFileInput = async (e) => {
    const file = e.target.files?.[0];
    if (file) await handleFotoUpload(file);
  };

  const handleUpdateStatus = async (ticket, newStatus, extra = {}) => {
    await updateMutation.mutateAsync({ id: ticket.id, data: { status: newStatus, ...extra } });
  };

  const totalBaru = tickets.filter(t => t.status === 'Baru').length;
  const totalPerbaikan = tickets.filter(t => t.status === 'Perbaikan').length;
  const totalSelesai = tickets.filter(t => t.status === 'Selesai').length;

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tiket Baru', count: totalBaru, icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
          { label: 'Dalam Perbaikan', count: totalPerbaikan, icon: Wrench, color: 'bg-blue-50 text-blue-700' },
          { label: 'Selesai', count: totalSelesai, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 flex items-center gap-3 ${s.color}`}>
            <s.icon className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2 justify-between flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="Semua Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Semua Status</SelectItem>
            {['Baru','Perbaikan','Selesai'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => { setForm({ ...emptyForm, area_tugas: employeeArea }); setErrors({}); setShowForm(true); }} className="bg-red-700 hover:bg-red-800 h-9">
          <Plus className="w-4 h-4 mr-1" /> Laporkan Kerusakan
        </Button>
      </div>

      {/* Ticket Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.map(ticket => (
          <Card key={ticket.id} className="p-4 border-0 shadow-sm hover:shadow-md cursor-pointer transition-shadow" onClick={() => setSelected(ticket)}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{ticket.judul}</p>
              <Badge className={`${STATUS_COLOR[ticket.status]} border-0 text-xs flex-shrink-0`}>{ticket.status}</Badge>
            </div>
            <p className="text-xs text-gray-500 mb-2">{ticket.lokasi_kerusakan} · {ticket.area_tugas}</p>
            <div className="flex items-center justify-between">
              <Badge className={`${PRIORITY_COLOR[ticket.prioritas]} border-0 text-xs`}>{ticket.prioritas}</Badge>
              <span className="text-xs text-gray-400">{ticket.tanggal_lapor}</span>
            </div>
            {ticket.foto_kerusakan && (
              <img src={ticket.foto_kerusakan} alt="Kerusakan" className="mt-2 w-full h-32 object-cover rounded-lg" />
            )}
          </Card>
        ))}
        {tickets.length === 0 && <p className="text-gray-400 col-span-full text-center py-10">Belum ada tiket kerusakan</p>}
      </div>

      {/* Create Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
          <DialogHeader><DialogTitle>Laporkan Kerusakan Fasilitas</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Judul Kerusakan *</Label>
              <Input value={form.judul} onChange={e => setForm({...form, judul: e.target.value})} placeholder="Contoh: AC Lantai 2 Rusak" />
              {errors.judul && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.judul}</p>}
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea value={form.deskripsi} onChange={e => setForm({...form, deskripsi: e.target.value})} rows={3} placeholder="Jelaskan kondisi kerusakan..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Area *</Label>
                {isMasterAdmin ? (
                  <Select value={form.area_tugas} onValueChange={v => setForm({...form, area_tugas: v})}>
                    <SelectTrigger><SelectValue placeholder="Pilih area..." /></SelectTrigger>
                    <SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={form.area_tugas || employeeArea} readOnly className="bg-gray-100 cursor-not-allowed h-9" />
                )}
                {errors.area_tugas && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.area_tugas}</p>}
              </div>
              <div>
                <Label>Prioritas</Label>
                <Select value={form.prioritas} onValueChange={v => setForm({...form, prioritas: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Rendah','Sedang','Tinggi','Darurat'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Lokasi Kerusakan *</Label>
              <Input value={form.lokasi_kerusakan} onChange={e => setForm({...form, lokasi_kerusakan: e.target.value})} placeholder="Lantai/Ruangan/Gedung..." />
              {errors.lokasi_kerusakan && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.lokasi_kerusakan}</p>}
            </div>
            <div>
              <Label>Foto Kerusakan</Label>
              <div className="mt-1 space-y-2">
                {form.foto_kerusakan ? (
                  <div className="relative">
                    <img src={form.foto_kerusakan} alt="Preview" className="w-full h-40 object-cover rounded-xl border" />
                    <button
                      onClick={() => setForm(p => ({ ...p, foto_kerusakan: '' }))}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <FullscreenCameraCapture
                      onCapture={handleCameraCapture}
                      label="Ambil Foto"
                      uploading={uploading}
                    />
                    <label className="flex items-center gap-1 px-3 py-2 border rounded-lg text-xs text-gray-600 cursor-pointer hover:bg-gray-50">
                      <input type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
                      Upload File
                    </label>
                  </div>
                )}
                {uploading && <p className="text-xs text-blue-600 animate-pulse">Uploading foto...</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending} className="bg-red-700 hover:bg-red-800">
              {createMutation.isPending ? 'Mengirim...' : 'Kirim Laporan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail/Update Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
          <DialogHeader><DialogTitle>Detail Tiket #{selected?.id?.slice(-6)}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <Badge className={`${STATUS_COLOR[selected.status]} border-0`}>{selected.status}</Badge>
                <Badge className={`${PRIORITY_COLOR[selected.prioritas]} border-0`}>{selected.prioritas}</Badge>
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-base">{selected.judul}</p>
                {selected.deskripsi && <p className="text-gray-500 mt-1">{selected.deskripsi}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-3">
                <div><p className="text-xs text-gray-400">Pelapor</p><p className="font-medium">{selected.nama_pelapor}</p></div>
                <div><p className="text-xs text-gray-400">Tanggal</p><p className="font-medium">{selected.tanggal_lapor}</p></div>
                <div><p className="text-xs text-gray-400">Area</p><p className="font-medium">{selected.area_tugas}</p></div>
                <div><p className="text-xs text-gray-400">Lokasi</p><p className="font-medium">{selected.lokasi_kerusakan}</p></div>
              </div>
              {selected.foto_kerusakan && (
                <div><p className="text-xs text-gray-400 mb-1">Foto Kerusakan</p>
                  <img src={selected.foto_kerusakan} className="rounded-lg w-full h-40 object-cover" /></div>
              )}
              {canManage && selected.status !== 'Selesai' && (
                <div className="space-y-3 border-t pt-3">
                  <p className="font-semibold text-gray-700">Update Status</p>
                  {selected.status === 'Baru' && (
                    <Button onClick={() => handleUpdateStatus(selected, 'Perbaikan', { nik_teknisi: employee.nik_karyawan, nama_teknisi: employee.nama_lengkap })} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      <Wrench className="w-4 h-4 mr-1" /> Mulai Perbaikan
                    </Button>
                  )}
                  {selected.status === 'Perbaikan' && (
                    <Button onClick={() => handleUpdateStatus(selected, 'Selesai', { tanggal_selesai: new Date().toISOString().slice(0,10) })} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Tandai Selesai
                    </Button>
                  )}
                </div>
              )}
              <TicketDiscussion ticketId={selected.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}