import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Camera, ArrowLeft, ChevronDown, ChevronUp, X } from 'lucide-react';
import { toast } from 'sonner';

const KONDISI_ALL = ['TKA', 'Aman', 'Kondusif', 'Taruna'];

export default function EPatrolTemplateAdmin() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nama_template: '', jumlah_foto: 2, foto_configs: [], area_tugas: '', status: 'Aktif' });
  const [newKetMap, setNewKetMap] = useState({}); // { fotoIndex: string }

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['epatrol-templates'],
    queryFn: () => base44.entities.EPatrolTemplate.list('-created_date')
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-active'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  const saveMutation = useMutation({
    mutationFn: (d) => editing
      ? base44.entities.EPatrolTemplate.update(editing.id, d)
      : base44.entities.EPatrolTemplate.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epatrol-templates'] });
      setShowForm(false);
      setEditing(null);
      toast.success(editing ? 'Template diperbarui' : 'Template berhasil dibuat');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EPatrolTemplate.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epatrol-templates'] });
      toast.success('Template dihapus');
    }
  });

  const toggleStatus = (t) => {
    base44.entities.EPatrolTemplate.update(t.id, { status: t.status === 'Aktif' ? 'Non-Aktif' : 'Aktif' })
      .then(() => qc.invalidateQueries({ queryKey: ['epatrol-templates'] }));
  };

  // Sync jumlah_foto → foto_configs
  const handleJumlahChange = (val) => {
    const n = parseInt(val) || 1;
    const configs = Array.from({ length: n }, (_, i) => ({
      label: form.foto_configs[i]?.label || `Foto ${i + 1}`,
      riwayat_keterangan: form.foto_configs[i]?.riwayat_keterangan || []
    }));
    setForm(p => ({ ...p, jumlah_foto: n, foto_configs: configs }));
  };

  const openCreate = () => {
    const n = 2;
    setEditing(null);
    setForm({
      nama_template: `E-Patroli ${n} Foto`,
      jumlah_foto: n,
      foto_configs: Array.from({ length: n }, (_, i) => ({ label: `Foto ${i + 1}`, riwayat_keterangan: [] })),
      area_tugas: '',
      status: 'Aktif'
    });
    setNewKetMap({});
    setShowForm(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      nama_template: t.nama_template,
      jumlah_foto: t.jumlah_foto,
      foto_configs: t.foto_configs || [],
      area_tugas: t.area_tugas || '',
      status: t.status || 'Aktif'
    });
    setNewKetMap({});
    setShowForm(true);
  };

  const updateFotoLabel = (i, val) => {
    setForm(p => {
      const configs = [...p.foto_configs];
      configs[i] = { ...configs[i], label: val };
      return { ...p, foto_configs: configs };
    });
  };

  const addKeterangan = (i) => {
    const val = (newKetMap[i] || '').trim();
    if (!val) return;
    setForm(p => {
      const configs = [...p.foto_configs];
      const existing = configs[i]?.riwayat_keterangan || [];
      if (existing.includes(val)) return p;
      configs[i] = { ...configs[i], riwayat_keterangan: [...existing, val] };
      return { ...p, foto_configs: configs };
    });
    setNewKetMap(p => ({ ...p, [i]: '' }));
  };

  const removeKeterangan = (fotoIdx, ketIdx) => {
    setForm(p => {
      const configs = [...p.foto_configs];
      const rw = [...(configs[fotoIdx]?.riwayat_keterangan || [])];
      rw.splice(ketIdx, 1);
      configs[fotoIdx] = { ...configs[fotoIdx], riwayat_keterangan: rw };
      return { ...p, foto_configs: configs };
    });
  };

  const handleSave = () => {
    if (!form.nama_template.trim()) { toast.error('Nama template wajib diisi'); return; }
    if (form.jumlah_foto < 1) { toast.error('Jumlah foto minimal 1'); return; }
    saveMutation.mutate(form);
  };

  return (
    <div className="max-w-2xl mx-auto pb-8 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="text-gray-500 -ml-1">
        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Template E-Patroli</h1>
          <p className="text-xs text-gray-500 mt-0.5">Buat metode input patroli dengan beberapa foto</p>
        </div>
        <Button onClick={openCreate} className="bg-red-800 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-1" /> Buat Template
        </Button>
      </div>

      {isLoading
        ? <p className="text-center text-gray-400 py-10">Memuat...</p>
        : templates.length === 0
          ? <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">
              <Camera className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Belum ada template. Buat template pertama Anda.</p>
            </div>
          : <div className="space-y-3">
              {templates.map(t => (
                <div key={t.id} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{t.nama_template}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t.jumlah_foto} foto · Area: {t.area_tugas || 'Semua Area'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge
                        className={`cursor-pointer text-xs ${t.status === 'Aktif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        onClick={() => toggleStatus(t)}
                      >
                        {t.status}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  {(t.foto_configs || []).map((fc, i) => (
                    <div key={i} className="ml-2 border-l-2 border-gray-100 pl-3">
                      <p className="text-xs font-semibold text-gray-600">Foto {i + 1}: {fc.label}</p>
                      {(fc.riwayat_keterangan || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {fc.riwayat_keterangan.map((k, j) => (
                            <span key={j} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
      }

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'Buat Template E-Patroli'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Jumlah Foto */}
            <div>
              <Label>Jumlah Foto</Label>
              <Select value={String(form.jumlah_foto)} onValueChange={(v) => {
                const n = parseInt(v);
                handleJumlahChange(n);
                setForm(p => ({ ...p, nama_template: `E-Patroli ${n} Foto` }));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} Foto</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Nama Template */}
            <div>
              <Label>Nama Template</Label>
              <Input value={form.nama_template} onChange={e => setForm(p => ({ ...p, nama_template: e.target.value }))} placeholder="E-Patroli 2 Foto" />
            </div>

            {/* Area */}
            <div>
              <Label>Area (Opsional)</Label>
              <Select value={form.area_tugas || '__all__'} onValueChange={v => setForm(p => ({ ...p, area_tugas: v === '__all__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Semua Area" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Area</SelectItem>
                  {areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Konfigurasi setiap foto */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Konfigurasi Foto</Label>
              {form.foto_configs.map((fc, i) => (
                <div key={i} className="border rounded-xl p-3 space-y-2 bg-gray-50">
                  <p className="text-xs font-bold text-gray-600">Foto {i + 1}</p>
                  <div>
                    <Label className="text-xs">Label Foto</Label>
                    <Input
                      value={fc.label}
                      onChange={e => updateFotoLabel(i, e.target.value)}
                      placeholder={`Foto ${i + 1}`}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Riwayat Keterangan (Pilihan Cepat)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={newKetMap[i] || ''}
                        onChange={e => setNewKetMap(p => ({ ...p, [i]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addKeterangan(i)}
                        placeholder="Ketik keterangan + Enter"
                        className="h-8 text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={() => addKeterangan(i)}><Plus className="w-3 h-3" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(fc.riwayat_keterangan || []).map((k, j) => (
                        <span key={j} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {k}
                          <button onClick={() => removeKeterangan(i, j)}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Status */}
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Batal</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-red-800 hover:bg-red-700">
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}