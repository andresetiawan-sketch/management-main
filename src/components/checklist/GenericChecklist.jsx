import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import BarcodeLocationPicker from './BarcodeLocationPicker';
import LocationQRManager from './LocationQRManager';
import FullscreenCameraCapture from '@/components/camera/FullscreenCameraCapture';

const kondisiColor = { 'Baik': 'bg-emerald-100 text-emerald-800', 'Rusak': 'bg-red-100 text-red-800', 'Perlu Maintenance': 'bg-amber-100 text-amber-800', 'Perlu Service': 'bg-amber-100 text-amber-800', 'Perlu Ganti': 'bg-red-100 text-red-800' };

export default function GenericChecklist({ entityName, title, fields = [], columns = [], locationField = null }) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const entity = base44.entities[entityName];

  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const empRole = employee?.role || employee?.jabatan || '';
  const isMasterAdmin = empRole === 'Master Admin';
  const employeeArea = employee?.area_tugas || '';

  // Auto detect from logged in employee
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 5);
    if (employee?.nik_karyawan) {
      setForm({
        nik_karyawan: employee.nik_karyawan || '',
        nama_karyawan: employee.nama_lengkap || '',
        area_tugas: employee.area_tugas || '',
        jabatan: employee.jabatan || '',
        tanggal: today,
        waktu: now
      });
    } else {
      setForm({ tanggal: today });
    }
  }, []);

  const { data: items = [], isLoading } = useQuery({
    queryKey: [entityName, employeeArea, isMasterAdmin],
    queryFn: () => isMasterAdmin && !employeeArea
      ? entity.list('-created_date', 200)
      : entity.filter({ area_tugas: employeeArea }, '-created_date', 200)
  });

  const createMutation = useMutation({
    mutationFn: (d) => entity.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityName] });
      setShowForm(false);
      // Reset form but keep employee data
      const stored = localStorage.getItem('pis_employee');
      if (stored) {
        const emp = JSON.parse(stored);
        setForm({
          nik_karyawan: emp.nik_karyawan || '',
          nama_karyawan: emp.nama_lengkap || '',
          area_tugas: emp.area_tugas || '',
          jabatan: emp.jabatan || '',
          tanggal: new Date().toISOString().slice(0, 10),
          waktu: new Date().toTimeString().slice(0, 5)
        });
      }
    }
  });

  const handleFile = async (field, file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, [field]: file_url }));
  };

  const handleCameraCapture = (field, url) => {
    setForm((prev) => ({ ...prev, [field]: url }));
  };

  const filtered = items.filter((i) =>
  i.nama_karyawan?.toLowerCase().includes(search.toLowerCase()) ||
  i.area_tugas?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-6">
      <div className="flex flex-col gap-2">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {locationField && (
            <LocationQRManager
              entityType={entityName}
              locationField={locationField}
              locationLabel={title}
            />
          )}
          <Button onClick={() => setShowForm(true)} className="flex-1 bg-red-800 hover:bg-orange-600 h-11 text-sm font-medium">
            <Plus className="w-4 h-4 mr-2" /> Input {title}
          </Button>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="md:hidden divide-y divide-gray-50">
          {filtered.length === 0
            ? <p className="text-center py-10 text-gray-400 text-sm">Belum ada data</p>
            : filtered.map((item) => (
              <div key={item.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{item.nama_karyawan}</p>
                    <p className="text-xs text-gray-400">{item.tanggal} · {item.area_tugas}</p>
                  </div>
                  {columns.find(c => c.badge) && (
                    <Badge className={`${kondisiColor[item[columns.find(c => c.badge).key]] || 'bg-gray-100 text-gray-600'} text-xs border-0 shrink-0`}>
                      {item[columns.find(c => c.badge).key]}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                  {columns.filter(c => !c.badge).map(c => (
                    <div key={c.key}><span className="text-gray-400">{c.label}:</span> {item[c.key] || '-'}</div>
                  ))}
                  {columns.filter(c => c.badge).map(c => (
                    <div key={c.key}><span className="text-gray-400">{c.label}:</span> {item[c.key] || '-'}</div>
                  ))}
                </div>
              </div>
            ))
          }
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="text-xs">Tanggal</TableHead>
                <TableHead className="text-xs">Nama</TableHead>
                <TableHead className="text-xs">Area</TableHead>
                {columns.map((c) => <TableHead key={c.key} className="text-xs">{c.label}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ?
              <TableRow><TableCell colSpan={3 + columns.length} className="text-center py-10 text-gray-400">Belum ada data</TableCell></TableRow> :
              filtered.map((item) =>
              <TableRow key={item.id} className="hover:bg-gray-50/50">
                  <TableCell className="text-sm">{item.tanggal}</TableCell>
                  <TableCell className="text-sm font-medium">{item.nama_karyawan}</TableCell>
                  <TableCell className="text-sm">{item.area_tugas}</TableCell>
                  {columns.map((c) =>
                <TableCell key={c.key} className="text-sm">
                      {c.badge ?
                  <Badge className={`${kondisiColor[item[c.key]] || 'bg-gray-100 text-gray-600'} text-xs border-0`}>{item[c.key]}</Badge> :
                  item[c.key]}
                    </TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Input {title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Auto-filled employee info */}
            <div className="bg-blue-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700 mb-2">Informasi Petugas (Otomatis)</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-500">NIK Karyawan</Label>
                  <Input value={form.nik_karyawan || ''} onChange={(e) => setForm({ ...form, nik_karyawan: e.target.value })} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Nama Petugas</Label>
                  <Input value={form.nama_karyawan || ''} onChange={(e) => setForm({ ...form, nama_karyawan: e.target.value })} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Area Tugas</Label>
                  <Input value={form.area_tugas || ''} onChange={(e) => setForm({ ...form, area_tugas: e.target.value })} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Jabatan</Label>
                  <Input value={form.jabatan || ''} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} className="h-8 text-sm" />
                </div>
              </div>
            </div>
            <div><Label>Tanggal</Label><Input type="date" value={form.tanggal || ''} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
            {fields.map((f) =>
            <div key={f.key}>
                <Label>{f.label}</Label>
                {f.type === 'select' ?
              <Select value={form[f.key] || ''} onValueChange={(v) => setForm({ ...form, [f.key]: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent>{f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select> :
              f.type === 'file' ?
              <FullscreenCameraCapture
                label={`Ambil Foto ${f.label}`}
                onCapture={(url) => handleCameraCapture(f.key, url)}
                previewUrl={form[f.key]}
              /> :
              f.type === 'textarea' ?
              <Textarea value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} rows={2} /> :
              (locationField && f.key === locationField) ?
              <BarcodeLocationPicker
                entityType={entityName}
                locationField={locationField}
                value={form[f.key] || ''}
                onChange={(v) => setForm({ ...form, [f.key]: v })}
                placeholder={`Ketik atau scan lokasi ${f.label}...`}
              /> :
              <Input type={f.type || 'text'} value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              }
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="bg-orange-500 hover:bg-orange-600">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}