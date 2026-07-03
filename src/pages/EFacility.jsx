import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Pencil, ArrowRight, AlertCircle } from 'lucide-react';
import FullscreenCameraCapture from '@/components/camera/FullscreenCameraCapture';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const STATUS_FLOW = ['Before', 'Progress', 'After', 'Completed'];
const STATUS_NEXT = { Before: 'Progress', Progress: 'After', After: 'Completed' };
const statusColor = {
  Before: 'bg-amber-100 text-amber-800',
  Progress: 'bg-blue-100 text-blue-800',
  After: 'bg-emerald-100 text-emerald-800',
  Completed: 'bg-green-100 text-green-800'
};

function buildDefaultForm(emp) {
  return {
    nik_karyawan: emp?.nik_karyawan || '',
    nama_karyawan: emp?.nama_lengkap || '',
    area_tugas: emp?.area_tugas || '',
    jabatan: emp?.jabatan || '',
    tanggal: new Date().toISOString().slice(0, 10),
    status: 'Before'
  };
}

export default function EFacility() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null); // item being edited
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState({});
  const queryClient = useQueryClient();

  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';
  const MANAGEMENT = ['Chief Security','Supervisor Facility','Admin Pos','Leader Security','Leader Facility'];
  const canEdit = isMasterAdmin || MANAGEMENT.includes(employee?.role || employee?.jabatan);

  useEffect(() => {
    setForm(buildDefaultForm(employee));
  }, []);

  const employeeArea = employee?.area_tugas || '';

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['facilities', employeeArea, isMasterAdmin],
    queryFn: () => isMasterAdmin && !employeeArea
      ? base44.entities.EFacility.list('-created_date', 200)
      : base44.entities.EFacility.filter({ area_tugas: employeeArea }, '-created_date', 200)
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.EFacility.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['facilities'] }); setShowForm(false); setEditItem(null); setForm(buildDefaultForm(employee)); toast.success('Data berhasil disimpan'); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EFacility.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['facilities'] }); setEditItem(null); setShowForm(false); setSelected(null); toast.success('Data berhasil diupdate'); }
  });

  const handleFile = async (field, file) => {
    setUploading(prev => ({ ...prev, [field]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, [field]: file_url }));
    setUploading(prev => ({ ...prev, [field]: false }));
    toast.success('Foto berhasil diupload');
  };

  const validate = () => {
    const e = {};
    if (!form.lokasi?.trim()) e.lokasi = 'Lokasi wajib diisi';
    if (!form.status) e.status = 'Status wajib dipilih';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  // Progress to next stage — open form pre-filled with existing data, next status
  const handleNextStage = (item) => {
    const nextStatus = STATUS_NEXT[item.status];
    if (!nextStatus) return;
    setEditItem(item);
    setForm({ ...item, status: nextStatus, tanggal: new Date().toISOString().slice(0, 10) });
    setErrors({});
    setShowForm(true);
    setSelected(null);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setForm({ ...item });
    setErrors({});
    setShowForm(true);
    setSelected(null);
  };

  const getPhotoFieldForStatus = (status) => {
    if (status === 'Before') return 'foto_before';
    if (status === 'Progress') return 'foto_progress';
    if (status === 'After') return 'foto_after';
    return null;
  };

  const filtered = items.filter(i =>
    i.nama_karyawan?.toLowerCase().includes(search.toLowerCase()) || i.lokasi?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Button onClick={() => { setEditItem(null); setForm(buildDefaultForm(employee)); setErrors({}); setShowForm(true); }} className="bg-red-800 hover:bg-orange-600 h-9">
          <Plus className="w-4 h-4 mr-2" /> Input E-Facility
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => (
          <Card key={item.id} className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.lokasi || item.area_tugas}</p>
                <p className="text-xs text-gray-500">{item.tanggal} - {item.nama_karyawan}</p>
              </div>
              <Badge className={`${statusColor[item.status]} text-xs border-0 flex-shrink-0 ml-2`}>{item.status}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-2">
              {item.foto_before && <div className="relative"><img src={item.foto_before} alt="Before" className="w-full h-16 object-cover rounded" /><span className="absolute bottom-0 left-0 text-[9px] bg-black/50 text-white px-1 rounded-br">Before</span></div>}
              {item.foto_progress && <div className="relative"><img src={item.foto_progress} alt="Progress" className="w-full h-16 object-cover rounded" /><span className="absolute bottom-0 left-0 text-[9px] bg-black/50 text-white px-1 rounded-br">Progress</span></div>}
              {item.foto_after && <div className="relative"><img src={item.foto_after} alt="After" className="w-full h-16 object-cover rounded" /><span className="absolute bottom-0 left-0 text-[9px] bg-black/50 text-white px-1 rounded-br">After</span></div>}
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => setSelected(item)}>Detail</Button>
              {canEdit && item.status !== 'Completed' && (
                <Button size="sm" className="flex-1 text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleNextStage(item)}>
                  <ArrowRight className="w-3 h-3 mr-1" /> {STATUS_NEXT[item.status]}
                </Button>
              )}
              {canEdit && (
                <Button size="sm" variant="ghost" className="w-7 h-7 p-0 text-gray-400 hover:text-gray-700" onClick={() => handleEdit(item)}>
                  <Pencil className="w-3 h-3" />
                </Button>
              )}
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-gray-400 col-span-full text-center py-10">Belum ada data</p>}
      </div>

      {/* Create/Edit Form */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditItem(null); }}}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? `Update E-Facility — ${form.status}` : 'Input E-Facility (Before)'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 mb-2">Informasi Petugas</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs text-gray-500">NIK</Label><Input value={form.nik_karyawan || ''} onChange={e => setForm({...form, nik_karyawan: e.target.value})} className="h-8 text-sm" /></div>
                <div><Label className="text-xs text-gray-500">Nama</Label><Input value={form.nama_karyawan || ''} onChange={e => setForm({...form, nama_karyawan: e.target.value})} className="h-8 text-sm" /></div>
                <div><Label className="text-xs text-gray-500">Area Tugas</Label><Input value={form.area_tugas || ''} onChange={e => setForm({...form, area_tugas: e.target.value})} className="h-8 text-sm" /></div>
                <div><Label className="text-xs text-gray-500">Jabatan</Label><Input value={form.jabatan || ''} onChange={e => setForm({...form, jabatan: e.target.value})} className="h-8 text-sm" /></div>
              </div>
            </div>
            <div><Label>Tanggal</Label><Input type="date" value={form.tanggal || ''} onChange={e => setForm({...form, tanggal: e.target.value})} /></div>
            <div>
              <Label>Lokasi *</Label>
              <Input value={form.lokasi || ''} onChange={e => setForm({...form, lokasi: e.target.value})} placeholder="Lantai/Ruangan/Area..." />
              {errors.lokasi && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.lokasi}</p>}
            </div>
            <div>
              <Label>Status *</Label>
              <Select value={form.status || ''} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>{STATUS_FLOW.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              {errors.status && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.status}</p>}
            </div>

            {/* Show only relevant photo field based on status */}
            {form.status === 'Before' && (
              <div>
                <Label>Foto Before</Label>
                <FullscreenCameraCapture
                  label="Ambil Foto Before"
                  onCapture={(url) => setForm(prev => ({ ...prev, foto_before: url }))}
                  previewUrl={form.foto_before}
                />
              </div>
            )}
            {form.status === 'Progress' && (
              <div>
                <Label>Foto Progress</Label>
                <FullscreenCameraCapture
                  label="Ambil Foto Progress"
                  onCapture={(url) => setForm(prev => ({ ...prev, foto_progress: url }))}
                  previewUrl={form.foto_progress}
                />
              </div>
            )}
            {(form.status === 'After' || form.status === 'Completed') && (
              <div>
                <Label>Foto After</Label>
                <FullscreenCameraCapture
                  label="Ambil Foto After"
                  onCapture={(url) => setForm(prev => ({ ...prev, foto_after: url }))}
                  previewUrl={form.foto_after}
                />
              </div>
            )}

            <div><Label>Catatan</Label><Textarea value={form.catatan || ''} onChange={e => setForm({...form, catatan: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditItem(null); }}>Batal</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detail E-Facility</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <Badge className={`${statusColor[selected.status]} border-0`}>{selected.status}</Badge>
                {canEdit && selected.status !== 'Completed' && (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleNextStage(selected)}>
                    <ArrowRight className="w-3 h-3 mr-1" /> Lanjut ke {STATUS_NEXT[selected.status]}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-gray-400 text-xs">Nama</p><p className="font-medium">{selected.nama_karyawan}</p></div>
                <div><p className="text-gray-400 text-xs">Area</p><p className="font-medium">{selected.area_tugas}</p></div>
                <div><p className="text-gray-400 text-xs">Lokasi</p><p className="font-medium">{selected.lokasi}</p></div>
                <div><p className="text-gray-400 text-xs">Tanggal</p><p className="font-medium">{selected.tanggal}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {selected.foto_before && <div><p className="text-xs text-gray-400 mb-1">Before</p><img src={selected.foto_before} className="rounded-lg w-full h-32 object-cover" /></div>}
                {selected.foto_progress && <div><p className="text-xs text-gray-400 mb-1">Progress</p><img src={selected.foto_progress} className="rounded-lg w-full h-32 object-cover" /></div>}
                {selected.foto_after && <div><p className="text-xs text-gray-400 mb-1">After</p><img src={selected.foto_after} className="rounded-lg w-full h-32 object-cover" /></div>}
              </div>
              {selected.catatan && <p className="text-gray-600">{selected.catatan}</p>}
              {canEdit && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleEdit(selected)}>
                  <Pencil className="w-3 h-3 mr-1" /> Edit Data
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}