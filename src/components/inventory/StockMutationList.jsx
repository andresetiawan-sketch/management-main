import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

const TIPE_COLOR = {
  'Mutasi Antar Area': 'bg-blue-100 text-blue-700',
  'Pengeluaran': 'bg-orange-100 text-orange-700',
  'Penerimaan': 'bg-emerald-100 text-emerald-700'
};

const INIT = { kode_barang: '', nama_barang: '', area_asal: '', area_tujuan: '', jumlah: 1, tipe: 'Mutasi Antar Area', catatan: '', tanggal: new Date().toISOString().slice(0, 10) };

export default function StockMutationList() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);

  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');

  const { data: mutations = [] } = useQuery({
    queryKey: ['stock-mutations'],
    queryFn: () => base44.entities.StockMutation.list('-created_date', 300)
  });

  const { data: items = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.Inventory.list('-created_date', 500)
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-inv'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  const handleSelectBarang = (kode) => {
    const item = items.find(i => i.kode_barang === kode);
    if (item) setForm(p => ({ ...p, kode_barang: item.kode_barang, nama_barang: item.nama_barang }));
  };

  const handleSave = async () => {
    if (!form.kode_barang || !form.jumlah) { toast.error('Kode barang dan jumlah wajib diisi'); return; }
    setSaving(true);
    await base44.entities.StockMutation.create({
      ...form,
      nik_petugas: employee.nik_karyawan || '',
      nama_petugas: employee.nama_lengkap || ''
    });
    toast.success('Mutasi stok berhasil dicatat');
    qc.invalidateQueries({ queryKey: ['stock-mutations'] });
    setShowAdd(false);
    setForm(INIT);
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <p className="text-sm font-semibold text-gray-700">{mutations.length} riwayat mutasi</p>
        <Button onClick={() => setShowAdd(true)} className="bg-red-800 hover:bg-orange-600 text-white h-9 gap-2">
          <Plus className="w-4 h-4" /> Catat Mutasi
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="text-xs">Tanggal</TableHead>
              <TableHead className="text-xs">Kode</TableHead>
              <TableHead className="text-xs">Nama Barang</TableHead>
              <TableHead className="text-xs">Tipe</TableHead>
              <TableHead className="text-xs">Dari Area</TableHead>
              <TableHead className="text-xs">Ke Area</TableHead>
              <TableHead className="text-xs">Jumlah</TableHead>
              <TableHead className="text-xs">Petugas</TableHead>
              <TableHead className="text-xs">Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mutations.length === 0
              ? <TableRow><TableCell colSpan={9} className="text-center py-10 text-gray-400">Belum ada data mutasi</TableCell></TableRow>
              : mutations.map(m => (
                <TableRow key={m.id} className="hover:bg-gray-50/50">
                  <TableCell className="text-xs">{m.tanggal}</TableCell>
                  <TableCell className="font-mono text-xs text-orange-600">{m.kode_barang}</TableCell>
                  <TableCell className="text-sm font-medium">{m.nama_barang}</TableCell>
                  <TableCell><Badge className={`text-xs ${TIPE_COLOR[m.tipe] || 'bg-gray-100'}`}>{m.tipe}</Badge></TableCell>
                  <TableCell className="text-xs text-gray-500">{m.area_asal || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-500">{m.area_tujuan || '-'}</TableCell>
                  <TableCell className="text-sm font-semibold">{m.jumlah}</TableCell>
                  <TableCell className="text-xs text-gray-600">{m.nama_petugas || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-400">{m.catatan || '-'}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-blue-600" /> Catat Mutasi Stok</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tipe Mutasi</Label>
              <Select value={form.tipe} onValueChange={v => setForm(p => ({ ...p, tipe: v }))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mutasi Antar Area">Mutasi Antar Area</SelectItem>
                  <SelectItem value="Pengeluaran">Pengeluaran / Pemakaian</SelectItem>
                  <SelectItem value="Penerimaan">Penerimaan Barang</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Pilih Barang</Label>
              <Select value={form.kode_barang} onValueChange={handleSelectBarang}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Pilih barang..." /></SelectTrigger>
                <SelectContent>
                  {items.map(i => <SelectItem key={i.id} value={i.kode_barang}>{i.kode_barang} — {i.nama_barang}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Area Asal</Label>
                <Select value={form.area_asal} onValueChange={v => setForm(p => ({ ...p, area_asal: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                  <SelectContent>
                    {areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Area Tujuan</Label>
                <Select value={form.area_tujuan} onValueChange={v => setForm(p => ({ ...p, area_tujuan: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                  <SelectContent>
                    {areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Jumlah</Label>
                <Input type="number" min={1} value={form.jumlah} onChange={e => setForm(p => ({ ...p, jumlah: parseInt(e.target.value) || 1 }))} className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Tanggal</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} className="mt-1 h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Catatan</Label>
              <Input value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} placeholder="Opsional..." className="mt-1 h-9 text-sm" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Menyimpan...' : 'Simpan Mutasi'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}