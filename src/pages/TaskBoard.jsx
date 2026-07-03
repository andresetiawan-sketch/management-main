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
import { Plus, Star, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const COLUMNS = ['To Do', 'In Progress', 'Done'];
const COL_COLORS = {
  'To Do': 'bg-gray-100 border-gray-200',
  'In Progress': 'bg-blue-50 border-blue-200',
  'Done': 'bg-emerald-50 border-emerald-200',
};
const PRIORITY_COLOR = { Rendah: 'bg-green-100 text-green-700', Sedang: 'bg-yellow-100 text-yellow-700', Tinggi: 'bg-red-100 text-red-700' };

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-5 h-5 cursor-pointer transition-colors ${s <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          onClick={() => onChange(s)}
        />
      ))}
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onMove, canManage }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 space-y-2 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800 leading-tight">{task.judul}</p>
        <Badge className={`${PRIORITY_COLOR[task.prioritas]} text-[10px] border-0 flex-shrink-0`}>{task.prioritas}</Badge>
      </div>
      {task.deskripsi && <p className="text-xs text-gray-500 line-clamp-2">{task.deskripsi}</p>}
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <span className="font-medium text-gray-600">{task.nama_assignee || '-'}</span>
        {task.regu && <span>· {task.regu}</span>}
      </div>
      {task.tanggal_deadline && (
        <p className="text-xs text-orange-600 font-medium">⏰ Deadline: {task.tanggal_deadline}</p>
      )}
      {task.status === 'Done' && task.rating > 0 && (
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={`w-3 h-3 ${s <= task.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
          ))}
        </div>
      )}
      {canManage && (
        <div className="flex gap-1 pt-1 border-t border-gray-50">
          {COLUMNS.filter(c => c !== task.status).map(col => (
            <Button key={col} size="sm" variant="ghost" className="text-xs h-6 px-2 text-blue-600 hover:bg-blue-50"
              onClick={() => onMove(task, col)}>→ {col}</Button>
          ))}
          <div className="ml-auto flex gap-1">
            <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => onEdit(task)}><Pencil className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="w-6 h-6 text-red-400 hover:text-red-600" onClick={() => onDelete(task.id)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

const emptyForm = { judul: '', deskripsi: '', area_tugas: '', regu: '', nik_assignee: '', nama_assignee: '', tanggal_deadline: '', prioritas: 'Sedang', status: 'To Do', rating: 0, catatan_penyelesaian: '' };

export default function TaskBoard() {
  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';
  const MANAGEMENT = ['Chief Security','Supervisor Facility','Admin Pos','Leader Security','Leader Facility'];
  const canManage = isMasterAdmin || MANAGEMENT.includes(employee?.role || employee?.jabatan);

  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [filterRegu, setFilterRegu] = useState('');
  const [filterArea, setFilterArea] = useState(employee?.area_tugas || '');
  const queryClient = useQueryClient();

  const employeeArea = employee?.area_tugas || '';
  const effectiveArea = isMasterAdmin ? filterArea : (filterArea || employeeArea);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['taskboard', effectiveArea, filterRegu],
    queryFn: () => {
      const q = {};
      if (effectiveArea) q.area_tugas = effectiveArea;
      if (filterRegu) q.regu = filterRegu;
      return Object.keys(q).length ? base44.entities.TaskBoard.filter(q, '-created_date', 500) : base44.entities.TaskBoard.list('-created_date', 500);
    }
  });

  const { data: areas = [] } = useQuery({ queryKey: ['areas-task'], queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' }) });
  const { data: employees = [] } = useQuery({ queryKey: ['emp-task'], queryFn: () => base44.entities.Employee.filter({ status_aktif: 'Aktif' }) });

  const createMutation = useMutation({
    mutationFn: (d) => editTask ? base44.entities.TaskBoard.update(editTask.id, d) : base44.entities.TaskBoard.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['taskboard'] }); setShowForm(false); setEditTask(null); setForm(emptyForm); toast.success('Tugas berhasil disimpan'); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TaskBoard.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['taskboard'] }); toast.success('Tugas dihapus'); }
  });

  const validate = () => {
    const e = {};
    if (!form.judul.trim()) e.judul = 'Judul wajib diisi';
    if (!form.area_tugas) e.area_tugas = 'Area wajib dipilih';
    if (!form.regu) e.regu = 'Regu wajib dipilih';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    createMutation.mutate({ ...form, nik_pemberi: employee.nik_karyawan, nama_pemberi: employee.nama_lengkap });
  };

  const handleEdit = (task) => {
    setEditTask(task);
    setForm({ ...emptyForm, ...task });
    setErrors({});
    setShowForm(true);
  };

  const handleMove = async (task, newStatus) => {
    await base44.entities.TaskBoard.update(task.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['taskboard'] });
    toast.success(`Dipindah ke ${newStatus}`);
  };

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Semua Area" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Semua Area</SelectItem>
              {areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterRegu} onValueChange={setFilterRegu}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Semua Regu" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Semua Regu</SelectItem>
              {['Regu A','Regu B','Regu C','Regu D','Non Regu'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {canManage && (
          <Button onClick={() => { setEditTask(null); setForm({...emptyForm, area_tugas: filterArea}); setErrors({}); setShowForm(true); }} className="bg-red-700 hover:bg-red-800 h-9">
            <Plus className="w-4 h-4 mr-1" /> Buat Tugas
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col);
          return (
            <div key={col} className={`rounded-2xl border-2 ${COL_COLORS[col]} p-3 min-h-[300px]`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-700">{col}</p>
                <Badge variant="outline" className="text-xs">{colTasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {colTasks.map(task => (
                  <TaskCard key={task.id} task={task} onEdit={handleEdit} onDelete={(id) => deleteMutation.mutate(id)} onMove={handleMove} canManage={canManage} />
                ))}
                {colTasks.length === 0 && <p className="text-xs text-gray-300 text-center py-8">Belum ada tugas</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
          <DialogHeader><DialogTitle>{editTask ? 'Edit Tugas' : 'Buat Tugas Baru'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Judul Tugas *</Label>
              <Input value={form.judul} onChange={e => setForm({...form, judul: e.target.value})} placeholder="Judul tugas..." />
              {errors.judul && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.judul}</p>}
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea value={form.deskripsi} onChange={e => setForm({...form, deskripsi: e.target.value})} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Area Tugas *</Label>
                <Select value={form.area_tugas} onValueChange={v => setForm({...form, area_tugas: v})}>
                  <SelectTrigger><SelectValue placeholder="Pilih area..." /></SelectTrigger>
                  <SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
                </Select>
                {errors.area_tugas && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.area_tugas}</p>}
              </div>
              <div>
                <Label>Regu *</Label>
                <Select value={form.regu} onValueChange={v => setForm({...form, regu: v})}>
                  <SelectTrigger><SelectValue placeholder="Pilih regu..." /></SelectTrigger>
                  <SelectContent>{['Regu A','Regu B','Regu C','Regu D','Non Regu'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                {errors.regu && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.regu}</p>}
              </div>
            </div>
            <div>
              <Label>Ditugaskan ke</Label>
              <Select value={form.nik_assignee} onValueChange={v => {
                const emp = employees.find(e => e.nik_karyawan === v);
                setForm({...form, nik_assignee: v, nama_assignee: emp?.nama_lengkap || ''});
              }}>
                <SelectTrigger><SelectValue placeholder="Pilih karyawan..." /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.nik_karyawan}>{e.nama_lengkap} ({e.nik_karyawan})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prioritas</Label>
                <Select value={form.prioritas} onValueChange={v => setForm({...form, prioritas: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Rendah','Sedang','Tinggi'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COLUMNS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Deadline</Label>
              <Input type="date" value={form.tanggal_deadline} onChange={e => setForm({...form, tanggal_deadline: e.target.value})} />
            </div>
            {form.status === 'Done' && (
              <>
                <div>
                  <Label>Rating Penyelesaian</Label>
                  <StarRating value={form.rating} onChange={v => setForm({...form, rating: v})} />
                </div>
                <div>
                  <Label>Catatan Penyelesaian</Label>
                  <Textarea value={form.catatan_penyelesaian} onChange={e => setForm({...form, catatan_penyelesaian: e.target.value})} rows={2} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending} className="bg-red-700 hover:bg-red-800">
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}