import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, ArrowLeftRight, Undo2, AlertTriangle, QrCode, Wrench, History } from 'lucide-react';
import { toast } from 'sonner';
import LoanModal from './LoanModal';
import ReturnModal from './ReturnModal';
import AssetQRLabel from './AssetQRLabel';
import MaintenanceModal from './MaintenanceModal';
import MaintenanceHistory from './MaintenanceHistory';

const statusColor = { Tersedia: 'bg-emerald-100 text-emerald-800', Dipinjam: 'bg-orange-100 text-orange-800', Maintenance: 'bg-gray-100 text-gray-600' };
const kondisiColor = { Baik: 'bg-blue-100 text-blue-700', Cukup: 'bg-yellow-100 text-yellow-700', Rusak: 'bg-red-100 text-red-700' };
const INIT = { kode_barang: '', nama_barang: '', kategori: '', deskripsi: '', kondisi: 'Baik', status: 'Tersedia', lokasi_penyimpanan: '', area_tugas: '', stok: 1, stok_minimum: 1 };

export default function InventoryList() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);
  const [loanItem, setLoanItem] = useState(null);
  const [returnItem, setReturnItem] = useState(null);
  const [qrItem, setQrItem] = useState(null);
  const [maintItem, setMaintItem] = useState(null);
  const [histItem, setHistItem] = useState(null);

  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const empRole = employee?.role || employee?.jabatan || '';
  const isMasterAdmin = empRole === 'Master Admin';
  const employeeArea = employee?.area_tugas || '';

  const { data: items = [] } = useQuery({
    queryKey: ['inventory', employeeArea, isMasterAdmin],
    queryFn: () => isMasterAdmin && !employeeArea
      ? base44.entities.Inventory.list('-created_date', 500)
      : base44.entities.Inventory.filter({ area_tugas: employeeArea }, '-created_date', 500)
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-inv'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  const criticalItems = items.filter(i => i.stok !== undefined && i.stok !== null && i.stok <= (i.stok_minimum || 1));

  const filtered = items.filter((i) =>
  i.nama_barang?.toLowerCase().includes(search.toLowerCase()) ||
  i.kode_barang?.toLowerCase().includes(search.toLowerCase()) ||
  i.kategori?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.kode_barang || !form.nama_barang) {toast.error('Kode dan nama barang wajib diisi');return;}
    setSaving(true);
    await base44.entities.Inventory.create(form);
    toast.success('Barang berhasil ditambahkan');
    qc.invalidateQueries({ queryKey: ['inventory'] });
    setShowAdd(false);
    setForm(INIT);
    setSaving(false);
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['inventory'] });
    qc.invalidateQueries({ queryKey: ['loans'] });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {criticalItems.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-medium">
            <strong>{criticalItems.length} barang</strong> stok kritis: {criticalItems.map(i => i.nama_barang).join(', ')}
          </p>
        </div>
      )}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Cari barang..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-red-800 hover:bg-orange-600 text-white h-9 gap-2">
          <Plus className="w-4 h-4" /> Tambah Barang
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="text-xs font-semibold">Kode</TableHead>
              <TableHead className="text-xs font-semibold">Nama Barang</TableHead>
              <TableHead className="text-xs font-semibold">Area</TableHead>
              <TableHead className="text-xs font-semibold">Kategori</TableHead>
              <TableHead className="text-xs font-semibold">Stok</TableHead>
              <TableHead className="text-xs font-semibold">Kondisi</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold">Peminjam</TableHead>
              <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ?
            <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Belum ada data barang</TableCell></TableRow> :
            filtered.map((item) =>
            <TableRow key={item.id} className="hover:bg-gray-50/50">
                <TableCell className="font-mono text-xs text-orange-600">{item.kode_barang}</TableCell>
                <TableCell className="font-medium text-sm">{item.nama_barang}</TableCell>
                <TableCell className="text-xs text-gray-500">{item.area_tugas || '-'}</TableCell>
                <TableCell className="text-xs text-gray-500">{item.kategori}</TableCell>
                <TableCell>
                  <span className={`text-sm font-bold ${item.stok !== undefined && item.stok <= (item.stok_minimum || 1) ? 'text-red-600' : 'text-gray-700'}`}>
                    {item.stok ?? '-'}
                    {item.stok !== undefined && item.stok <= (item.stok_minimum || 1) && <AlertTriangle className="w-3 h-3 inline ml-1 text-red-500" />}
                  </span>
                </TableCell>
                <TableCell><Badge className={`text-xs ${kondisiColor[item.kondisi]}`}>{item.kondisi}</Badge></TableCell>
                <TableCell><Badge className={`text-xs ${statusColor[item.status]}`}>{item.status}</Badge></TableCell>
                <TableCell className="text-xs text-gray-600">{item.nama_peminjam || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 flex-wrap">
                    {item.status === 'Tersedia' &&
                  <Button size="sm" onClick={() => setLoanItem(item)} className="bg-orange-500 hover:bg-orange-600 text-white h-7 text-xs gap-1">
                        <ArrowLeftRight className="w-3 h-3" /> Pinjam
                      </Button>
                  }
                    {item.status === 'Dipinjam' &&
                  <Button size="sm" onClick={() => setReturnItem(item)} className="bg-orange-500 hover:bg-orange-600 text-white h-7 text-xs gap-1">
                        <Undo2 className="w-3 h-3" /> Kembalikan
                      </Button>
                  }
                    <Button size="sm" variant="outline" onClick={() => setQrItem(item)} className="h-7 text-xs gap-1 border-blue-200 text-blue-700">
                      <QrCode className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setMaintItem(item)} className="h-7 text-xs gap-1 border-amber-200 text-amber-700">
                      <Wrench className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setHistItem(item)} className="h-7 text-xs gap-1 border-gray-200 text-gray-600">
                      <History className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tambah Barang</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[['Kode Barang', 'kode_barang'], ['Nama Barang', 'nama_barang'], ['Lokasi Penyimpanan', 'lokasi_penyimpanan'], ['Deskripsi', 'deskripsi']].map(([label, key]) =>
            <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="mt-1 h-9 text-sm" />
              </div>
            )}
            <div>
              <Label className="text-xs">Area Tugas</Label>
              <Select value={form.area_tugas} onValueChange={v => setForm(p => ({ ...p, area_tugas: v }))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Pilih area..." /></SelectTrigger>
                <SelectContent>
                  {areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Stok Awal</Label>
                <Input type="number" min={0} value={form.stok} onChange={e => setForm(p => ({ ...p, stok: parseInt(e.target.value) || 0 }))} className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Stok Minimum (alert kritis)</Label>
                <Input type="number" min={0} value={form.stok_minimum} onChange={e => setForm(p => ({ ...p, stok_minimum: parseInt(e.target.value) || 1 }))} className="mt-1 h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Kategori</Label>
                <Select value={form.kategori} onValueChange={(v) => setForm((p) => ({ ...p, kategori: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                  <SelectContent>
                    {['Elektronik', 'Kendaraan', 'Peralatan', 'Seragam', 'Komunikasi', 'Lainnya'].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Kondisi</Label>
                <Select value={form.kondisi} onValueChange={(v) => setForm((p) => ({ ...p, kondisi: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Baik', 'Cukup', 'Rusak'].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              {saving ? 'Menyimpan...' : 'Simpan Barang'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loanItem && <LoanModal item={loanItem} onClose={() => setLoanItem(null)} onSuccess={refresh} />}
      {returnItem && <ReturnModal item={returnItem} onClose={() => setReturnItem(null)} onSuccess={refresh} />}
      {qrItem && <AssetQRLabel item={qrItem} open={!!qrItem} onClose={() => setQrItem(null)} />}
      {maintItem && <MaintenanceModal item={maintItem} open={!!maintItem} onClose={() => setMaintItem(null)} />}
      {histItem && <MaintenanceHistory inventoryId={histItem.id} itemName={histItem.nama_barang} open={!!histItem} onClose={() => setHistItem(null)} />}
    </div>);

}