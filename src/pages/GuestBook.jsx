import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search } from 'lucide-react';
import FullscreenCameraCapture from '@/components/camera/FullscreenCameraCapture';
import { Skeleton } from '@/components/ui/skeleton';

export default function GuestBook() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();
  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const empRole = employee?.role || employee?.jabatan || '';
  const isMasterAdmin = empRole === 'Master Admin';
  const employeeArea = employee?.area_tugas || '';

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests', employeeArea, isMasterAdmin],
    queryFn: () => isMasterAdmin && !employeeArea
      ? base44.entities.GuestBook.list('-created_date', 200)
      : base44.entities.GuestBook.filter({ area_tugas: employeeArea }, '-created_date', 200)
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.GuestBook.create(d),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['guests'] });setShowForm(false);setForm({});}
  });

  const handleFile = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, foto_tamu: file_url }));
  };

  const filtered = guests.filter((g) =>
  g.nama_tamu?.toLowerCase().includes(search.toLowerCase()) || g.instansi?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-6">
      <div className="flex flex-col gap-2">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Cari tamu..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 text-sm" />
        </div>
        <Button onClick={() => { const today = new Date().toISOString().slice(0,10); setForm({ area_tugas: employeeArea, tanggal: today, nik_karyawan: employee.nik_karyawan, nama_karyawan: employee.nama_lengkap, waktu_masuk: new Date().toTimeString().slice(0,5) }); setShowForm(true); }} className="w-full bg-red-800 hover:bg-orange-600 h-11 text-sm font-medium">
          <Plus className="w-4 h-4 mr-2" /> Input Tamu
        </Button>
      </div>

      {/* Mobile card list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="md:hidden divide-y divide-gray-50">
          {filtered.length === 0
            ? <p className="text-center py-10 text-gray-400 text-sm">Belum ada data tamu</p>
            : filtered.map((g) => (
              <div key={g.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{g.nama_tamu}</p>
                    <p className="text-xs text-gray-400">{g.instansi || '-'}</p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{g.tanggal}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                  <div><span className="text-gray-400">Tujuan:</span> {g.tujuan || '-'}</div>
                  <div><span className="text-gray-400">Area:</span> {g.area_tugas || '-'}</div>
                  <div><span className="text-gray-400">Masuk:</span> <span className="text-emerald-600 font-medium">{g.waktu_masuk || '-'}</span></div>
                  <div><span className="text-gray-400">Keluar:</span> <span className="text-blue-600 font-medium">{g.waktu_keluar || '-'}</span></div>
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
                <TableHead className="text-xs">Nama Tamu</TableHead>
                <TableHead className="text-xs">Instansi</TableHead>
                <TableHead className="text-xs">Tujuan</TableHead>
                <TableHead className="text-xs">Masuk</TableHead>
                <TableHead className="text-xs">Keluar</TableHead>
                <TableHead className="text-xs">Area</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ?
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Belum ada data</TableCell></TableRow> :
              filtered.map((g) =>
              <TableRow key={g.id} className="hover:bg-gray-50/50">
                  <TableCell className="text-sm">{g.tanggal}</TableCell>
                  <TableCell className="text-sm font-medium">{g.nama_tamu}</TableCell>
                  <TableCell className="text-sm">{g.instansi}</TableCell>
                  <TableCell className="text-sm">{g.tujuan}</TableCell>
                  <TableCell className="text-sm">{g.waktu_masuk}</TableCell>
                  <TableCell className="text-sm">{g.waktu_keluar || '-'}</TableCell>
                  <TableCell className="text-sm">{g.area_tugas}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Input Buku Tamu</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Tamu</Label><Input value={form.nama_tamu || ''} onChange={(e) => setForm({ ...form, nama_tamu: e.target.value })} /></div>
            <div><Label>Instansi</Label><Input value={form.instansi || ''} onChange={(e) => setForm({ ...form, instansi: e.target.value })} /></div>
            <div><Label>No. Identitas</Label><Input value={form.no_identitas || ''} onChange={(e) => setForm({ ...form, no_identitas: e.target.value })} /></div>
            <div><Label>Tujuan</Label><Input value={form.tujuan || ''} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} /></div>
            <div><Label>Area Tugas</Label><Input value={form.area_tugas || ''} readOnly className="bg-gray-100 cursor-not-allowed" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal</Label><Input type="date" value={form.tanggal || ''} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
              <div><Label>Waktu Masuk</Label><Input type="time" value={form.waktu_masuk || ''} onChange={(e) => setForm({ ...form, waktu_masuk: e.target.value })} /></div>
            </div>
            <div>
              <Label>Foto Tamu</Label>
              <FullscreenCameraCapture
                label="Ambil Foto Tamu"
                onCapture={(url) => setForm(prev => ({ ...prev, foto_tamu: url }))}
                previewUrl={form.foto_tamu}
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