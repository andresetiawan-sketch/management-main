import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Package } from 'lucide-react';
import FullscreenCameraCapture from '@/components/camera/FullscreenCameraCapture';
import { Skeleton } from '@/components/ui/skeleton';

export default function TenantPackage() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const empRole = employee?.role || employee?.jabatan || '';
  const isMasterAdmin = empRole === 'Master Admin';
  const employeeArea = employee?.area_tugas || '';

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['packages', employeeArea, isMasterAdmin],
    queryFn: () => isMasterAdmin && !employeeArea
      ? base44.entities.TenantPackage.list('-created_date', 200)
      : base44.entities.TenantPackage.filter({ area_tugas: employeeArea }, '-created_date', 200)
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.TenantPackage.create(d),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['packages'] });setShowForm(false);setForm({});}
  });

  const handleFile = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, foto_paket: file_url }));
  };

  const handlePickup = async (pkg) => {
    const now = new Date();
    await base44.entities.TenantPackage.update(pkg.id, { status: 'Diambil', waktu_diambil: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}` });
    queryClient.invalidateQueries({ queryKey: ['packages'] });
  };

  const filtered = packages.filter((p) =>
  p.nama_penerima?.toLowerCase().includes(search.toLowerCase()) || p.unit_tenant?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-6">
      <div className="flex flex-col gap-2">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Cari paket..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 text-sm" />
        </div>
        <Button onClick={() => { const today = new Date().toISOString().slice(0,10); setForm({ area_tugas: employeeArea, tanggal: today, nik_karyawan: employee.nik_karyawan, nama_karyawan: employee.nama_lengkap, waktu_terima: new Date().toTimeString().slice(0,5) }); setShowForm(true); }} className="w-full bg-red-800 hover:bg-orange-600 h-11 text-sm font-medium">
          <Plus className="w-4 h-4 mr-2" /> Input Paket
        </Button>
      </div>

      {/* Mobile card list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="md:hidden divide-y divide-gray-50">
          {filtered.length === 0
            ? <p className="text-center py-10 text-gray-400 text-sm">Belum ada data paket</p>
            : filtered.map((p) => (
              <div key={p.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{p.nama_penerima}</p>
                    <p className="text-xs text-gray-400">Unit: {p.unit_tenant || '-'}</p>
                  </div>
                  <Badge className={`text-xs border-0 shrink-0 ${p.status === 'Diambil' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{p.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                  <div><span className="text-gray-400">Pengirim:</span> {p.nama_pengirim || '-'}</div>
                  <div><span className="text-gray-400">Tanggal:</span> {p.tanggal}</div>
                  <div className="col-span-2"><span className="text-gray-400">Resi:</span> <span className="font-mono">{p.no_resi || '-'}</span></div>
                </div>
                {p.status === 'Diterima' && (
                  <Button size="sm" variant="outline" className="w-full h-9 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => handlePickup(p)}>
                    ✓ Tandai Sudah Diambil
                  </Button>
                )}
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
                <TableHead className="text-xs">Penerima</TableHead>
                <TableHead className="text-xs">Unit</TableHead>
                <TableHead className="text-xs">Pengirim</TableHead>
                <TableHead className="text-xs">No. Resi</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ?
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Belum ada data</TableCell></TableRow> :
              filtered.map((p) =>
              <TableRow key={p.id} className="hover:bg-gray-50/50">
                  <TableCell className="text-sm">{p.tanggal}</TableCell>
                  <TableCell className="text-sm font-medium">{p.nama_penerima}</TableCell>
                  <TableCell className="text-sm">{p.unit_tenant}</TableCell>
                  <TableCell className="text-sm">{p.nama_pengirim}</TableCell>
                  <TableCell className="text-sm font-mono">{p.no_resi}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs border-0 ${p.status === 'Diambil' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === 'Diterima' &&
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => handlePickup(p)}>Tandai Diambil</Button>
                  }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Input Paket Masuk</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Penerima</Label><Input value={form.nama_penerima || ''} onChange={(e) => setForm({ ...form, nama_penerima: e.target.value })} /></div>
            <div><Label>Unit Tenant</Label><Input value={form.unit_tenant || ''} onChange={(e) => setForm({ ...form, unit_tenant: e.target.value })} /></div>
            <div><Label>Nama Pengirim</Label><Input value={form.nama_pengirim || ''} onChange={(e) => setForm({ ...form, nama_pengirim: e.target.value })} /></div>
            <div><Label>No. Resi</Label><Input value={form.no_resi || ''} onChange={(e) => setForm({ ...form, no_resi: e.target.value })} /></div>
            <div><Label>Jenis Paket</Label><Input value={form.jenis_paket || ''} onChange={(e) => setForm({ ...form, jenis_paket: e.target.value })} /></div>
            <div><Label>Area Tugas</Label><Input value={form.area_tugas || ''} onChange={(e) => setForm({ ...form, area_tugas: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal</Label><Input type="date" value={form.tanggal || ''} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
              <div><Label>Waktu Terima</Label><Input type="time" value={form.waktu_terima || ''} onChange={(e) => setForm({ ...form, waktu_terima: e.target.value })} /></div>
            </div>
            <div>
              <Label>Foto Paket</Label>
              <FullscreenCameraCapture
                label="Ambil Foto Paket"
                onCapture={(url) => setForm(prev => ({ ...prev, foto_paket: url }))}
                previewUrl={form.foto_paket}
              />
            </div>
            <div><Label>Catatan</Label><Textarea value={form.catatan || ''} onChange={(e) => setForm({ ...form, catatan: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="bg-orange-500 hover:bg-orange-600">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}