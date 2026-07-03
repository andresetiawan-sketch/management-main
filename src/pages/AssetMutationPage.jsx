import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowRightLeft, CheckCircle2, XCircle, Scan, Smartphone, QrCode, Package, Clock, AlertTriangle, Search } from 'lucide-react';
import { toast } from 'sonner';

const MGMT = ['Master Admin','Chief Security','Supervisor Facility','Admin Pos','Leader Security','Leader Facility'];

const STATUS_COLOR = {
  'Menunggu Approval': 'bg-yellow-100 text-yellow-700',
  'Disetujui Sebagian': 'bg-blue-100 text-blue-700',
  'Disetujui': 'bg-emerald-100 text-emerald-700',
  'Ditolak': 'bg-red-100 text-red-700',
  'Selesai': 'bg-gray-100 text-gray-600',
};

function NFCScanner({ onResult, disabled }) {
  const [scanning, setScanning] = useState(false);

  const startScan = async () => {
    if (!('NDEFReader' in window)) {
      toast.error('NFC tidak didukung di perangkat/browser ini. Gunakan Chrome di Android.');
      return;
    }
    setScanning(true);
    try {
      const reader = new window.NDEFReader();
      await reader.scan();
      reader.onreading = ({ serialNumber, message }) => {
        const tagId = serialNumber || (message.records[0] ? new TextDecoder().decode(message.records[0].data) : '');
        onResult(tagId, 'NFC');
        setScanning(false);
        toast.success(`NFC terdeteksi: ${tagId}`);
      };
      reader.onerror = () => { setScanning(false); toast.error('Gagal baca NFC'); };
    } catch (e) {
      setScanning(false);
      toast.error(`NFC error: ${e.message}`);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={startScan} disabled={disabled || scanning} className="h-9 gap-2 border-blue-400 text-blue-600 hover:bg-blue-50">
      <Smartphone className={`w-4 h-4 ${scanning ? 'animate-pulse' : ''}`} />
      {scanning ? 'Scanning NFC...' : 'Scan NFC'}
    </Button>
  );
}

function MutasiForm({ onClose }) {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const qc = useQueryClient();
  const [form, setForm] = useState({ kode_barang: '', nama_barang: '', inventory_id: '', area_asal: emp.area_tugas || '', area_tujuan: '', jumlah: 1, catatan: '', scan_method: 'Manual', nfc_tag: '' });
  const [search, setSearch] = useState('');
  const [scanMethod, setScanMethod] = useState('manual');

  const { data: inventories = [] } = useQuery({
    queryKey: ['inv-mutasi', form.area_asal],
    queryFn: () => form.area_asal ? base44.entities.Inventory.filter({ area_tugas: form.area_asal }) : base44.entities.Inventory.list(),
  });

  const { data: areas = [] } = useQuery({ queryKey: ['areas-mut'], queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' }) });

  const filtered = inventories.filter(i => i.nama_barang?.toLowerCase().includes(search.toLowerCase()) || i.kode_barang?.includes(search));

  const selectItem = (item, method = 'Manual', nfc = '') => {
    setForm(p => ({ ...p, kode_barang: item.kode_barang, nama_barang: item.nama_barang, inventory_id: item.id, scan_method: method, nfc_tag: nfc }));
  };

  const handleNFC = (tagId) => {
    const found = inventories.find(i => i.nfc_tag_id === tagId);
    if (found) { selectItem(found, 'NFC', tagId); toast.success(`Aset ditemukan: ${found.nama_barang}`); }
    else toast.error(`NFC tag ${tagId} tidak cocok dengan aset di area ini`);
  };

  const mut = useMutation({
    mutationFn: (d) => base44.entities.StockMutation.create(d),
    onSuccess: () => { qc.invalidateQueries(['mutations']); onClose(); toast.success('Permintaan mutasi berhasil dibuat. Menunggu approval supervisor.'); }
  });

  const canSubmit = form.kode_barang && form.area_tujuan && form.jumlah > 0 && form.area_asal !== form.area_tujuan;

  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      {/* Area selection */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Area Asal *</Label>
          <Select value={form.area_asal} onValueChange={v => setForm(p => ({ ...p, area_asal: v, kode_barang: '', nama_barang: '' }))}>
            <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Area Tujuan *</Label>
          <Select value={form.area_tujuan} onValueChange={v => setForm(p => ({ ...p, area_tujuan: v }))}>
            <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Pilih tujuan..." /></SelectTrigger>
            <SelectContent>{areas.filter(a => a.nama_area !== form.area_asal).map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Asset selection with NFC/QR */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs">Pilih Aset *</Label>
          <div className="flex gap-2">
            <NFCScanner onResult={handleNFC} />
          </div>
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari aset di area asal..." className="pl-9 h-9 text-sm" />
        </div>
        {form.kode_barang ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-800">{form.nama_barang}</p>
              <p className="text-xs text-emerald-600">{form.kode_barang} {form.scan_method !== 'Manual' && <Badge className="ml-1 bg-blue-100 text-blue-700 border-0 text-[10px]">{form.scan_method}</Badge>}</p>
            </div>
            <button onClick={() => setForm(p => ({ ...p, kode_barang: '', nama_barang: '', inventory_id: '' }))} className="text-red-400 hover:text-red-600 text-xs">Ubah</button>
          </div>
        ) : (
          <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 rounded-xl p-2">
            {filtered.length === 0
              ? <p className="text-xs text-gray-400 text-center py-4">Tidak ada aset ditemukan</p>
              : filtered.map(item => (
                  <button key={item.id} onClick={() => selectItem(item)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between gap-2 border border-transparent hover:border-gray-200 transition-all">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.nama_barang}</p>
                      <p className="text-xs text-gray-400">{item.kode_barang} · Stok: {item.stok}</p>
                    </div>
                    <div className="flex gap-1">
                      {item.nfc_tag_id && <Badge className="bg-blue-100 text-blue-600 border-0 text-[10px]"><Smartphone className="w-2.5 h-2.5 mr-0.5 inline" />NFC</Badge>}
                      {item.qr_code_data && <Badge className="bg-green-100 text-green-600 border-0 text-[10px]"><QrCode className="w-2.5 h-2.5 mr-0.5 inline" />QR</Badge>}
                    </div>
                  </button>
                ))
            }
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Jumlah *</Label><Input type="number" min={1} value={form.jumlah} onChange={e => setForm(p => ({ ...p, jumlah: parseInt(e.target.value) || 1 }))} className="mt-1 h-9 text-sm" /></div>
        <div><Label className="text-xs">Catatan</Label><Input value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} className="mt-1 h-9 text-sm" placeholder="Alasan mutasi..." /></div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        <p className="font-bold mb-1">Alur Approval Digital:</p>
        <p>1. Supervisor area <strong>{form.area_asal || 'asal'}</strong> harus menyetujui</p>
        <p>2. Supervisor area <strong>{form.area_tujuan || 'tujuan'}</strong> harus menyetujui</p>
        <p>3. Stok diupdate otomatis setelah kedua pihak menyetujui</p>
      </div>

      <Button onClick={() => mut.mutate({ ...form, nik_petugas: emp.nik_karyawan, nama_petugas: emp.nama_lengkap, tanggal: new Date().toISOString().slice(0,10), tipe: 'Mutasi Antar Area', status_mutasi: 'Menunggu Approval', approval_asal_status: 'Menunggu', approval_tujuan_status: 'Menunggu' })}
        disabled={mut.isPending || !canSubmit} className="w-full bg-[#7B1A2C] hover:bg-[#5A1220] text-white">
        {mut.isPending ? 'Mengajukan...' : 'Ajukan Mutasi'}
      </Button>
    </div>
  );
}

function ApprovalCard({ mut: m, onApprove, onReject }) {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const empArea = emp.area_tugas || '';
  const isMgmt = MGMT.includes(emp?.role || emp?.jabatan);
  const [catatan, setCatatan] = useState('');

  const needsAsalApproval = m.area_asal === empArea && m.approval_asal_status === 'Menunggu';
  const needsTujuanApproval = m.area_tujuan === empArea && m.approval_tujuan_status === 'Menunggu';
  const canApprove = isMgmt && (needsAsalApproval || needsTujuanApproval);
  const side = needsAsalApproval ? 'asal' : 'tujuan';

  return (
    <Card className={`p-4 border-0 shadow-sm ${canApprove ? 'border-l-4 border-l-amber-400' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
          <ArrowRightLeft className="w-5 h-5 text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-gray-800 text-sm">{m.nama_barang}</p>
            <Badge className={`${STATUS_COLOR[m.status_mutasi]} border-0 text-[10px]`}>{m.status_mutasi}</Badge>
          </div>
          <p className="text-xs text-gray-500">{m.kode_barang} · {m.jumlah} unit · {m.area_asal} → {m.area_tujuan}</p>
          <p className="text-xs text-gray-400">{m.nama_petugas} · {m.tanggal}</p>
          {m.catatan && <p className="text-xs text-gray-400 italic mt-0.5">"{m.catatan}"</p>}

          {/* Approval status indicators */}
          <div className="flex gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              {m.approval_asal_status === 'Disetujui' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : m.approval_asal_status === 'Ditolak' ? <XCircle className="w-3.5 h-3.5 text-red-500" /> : <Clock className="w-3.5 h-3.5 text-yellow-500" />}
              <span className="text-[10px] text-gray-600">Spv. Asal ({m.area_asal})</span>
            </div>
            <div className="flex items-center gap-1.5">
              {m.approval_tujuan_status === 'Disetujui' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : m.approval_tujuan_status === 'Ditolak' ? <XCircle className="w-3.5 h-3.5 text-red-500" /> : <Clock className="w-3.5 h-3.5 text-yellow-500" />}
              <span className="text-[10px] text-gray-600">Spv. Tujuan ({m.area_tujuan})</span>
            </div>
          </div>

          {canApprove && (
            <div className="mt-3 space-y-2 bg-amber-50 rounded-xl p-3 border border-amber-200">
              <p className="text-xs font-bold text-amber-800">⚡ Approval diperlukan dari Anda ({side})</p>
              <Input value={catatan} onChange={e => setCatatan(e.target.value)} className="h-8 text-xs" placeholder="Catatan (opsional)..." />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onApprove(m, side, catatan)} className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"><CheckCircle2 className="w-3 h-3" />Setujui</Button>
                <Button size="sm" onClick={() => onReject(m, side, catatan)} className="flex-1 h-8 text-xs bg-red-600 hover:bg-red-700 text-white gap-1"><XCircle className="w-3 h-3" />Tolak</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function AssetMutationPage() {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMgmt = MGMT.includes(emp?.role || emp?.jabatan);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('pending');
  const qc = useQueryClient();

  const { data: mutations = [], isLoading } = useQuery({
    queryKey: ['mutations'],
    queryFn: () => base44.entities.StockMutation.list('-created_date', 200),
    refetchInterval: 15000,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StockMutation.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['mutations']); qc.invalidateQueries(['inventory']); }
  });

  const handleApprove = async (m, side, catatan) => {
    const now = new Date().toLocaleString('id-ID');
    const updates = side === 'asal'
      ? { approval_asal_status: 'Disetujui', approval_asal_nik: emp.nik_karyawan, approval_asal_nama: emp.nama_lengkap, approval_asal_waktu: now, approval_asal_catatan: catatan }
      : { approval_tujuan_status: 'Disetujui', approval_tujuan_nik: emp.nik_karyawan, approval_tujuan_nama: emp.nama_lengkap, approval_tujuan_waktu: now, approval_tujuan_catatan: catatan };

    const asalOk = side === 'asal' ? true : m.approval_asal_status === 'Disetujui';
    const tujuanOk = side === 'tujuan' ? true : m.approval_tujuan_status === 'Disetujui';
    const bothApproved = asalOk && tujuanOk;

    const finalStatus = bothApproved ? 'Disetujui' : 'Disetujui Sebagian';
    await updateMut.mutateAsync({ id: m.id, data: { ...updates, status_mutasi: finalStatus } });

    if (bothApproved && m.inventory_id) {
      // Update stock: reduce from asal, we don't auto-create dest inventory (manual receive)
      const inv = await base44.entities.Inventory.list().then(list => list.find(i => i.id === m.inventory_id));
      if (inv) {
        await base44.entities.Inventory.update(m.inventory_id, { stok: Math.max(0, (inv.stok || 0) - m.jumlah) });
        // Check if dest already has same item
        const destInv = await base44.entities.Inventory.filter({ kode_barang: m.kode_barang, area_tugas: m.area_tujuan }).then(list => list[0]);
        if (destInv) {
          await base44.entities.Inventory.update(destInv.id, { stok: (destInv.stok || 0) + m.jumlah });
        } else {
          await base44.entities.Inventory.create({ ...inv, id: undefined, area_tugas: m.area_tujuan, stok: m.jumlah });
        }
        await updateMut.mutateAsync({ id: m.id, data: { status_mutasi: 'Selesai' } });
        toast.success('Stok diupdate otomatis!');
      }
    } else {
      toast.success(side === 'asal' ? 'Disetujui dari sisi asal. Menunggu approval tujuan.' : 'Disetujui dari sisi tujuan. Menunggu approval asal.');
    }
  };

  const handleReject = async (m, side, catatan) => {
    const now = new Date().toLocaleString('id-ID');
    const updates = side === 'asal'
      ? { approval_asal_status: 'Ditolak', approval_asal_nik: emp.nik_karyawan, approval_asal_nama: emp.nama_lengkap, approval_asal_waktu: now, approval_asal_catatan: catatan }
      : { approval_tujuan_status: 'Ditolak', approval_tujuan_nik: emp.nik_karyawan, approval_tujuan_nama: emp.nama_lengkap, approval_tujuan_waktu: now, approval_tujuan_catatan: catatan };
    await updateMut.mutateAsync({ id: m.id, data: { ...updates, status_mutasi: 'Ditolak' } });
    toast.success('Mutasi ditolak');
  };

  const pending = mutations.filter(m => ['Menunggu Approval','Disetujui Sebagian'].includes(m.status_mutasi));
  const history = mutations.filter(m => ['Selesai','Ditolak','Disetujui'].includes(m.status_mutasi));
  const needMyApproval = pending.filter(m => {
    if (!isMgmt) return false;
    const needAsal = m.area_asal === (emp.area_tugas || '') && m.approval_asal_status === 'Menunggu';
    const needTujuan = m.area_tujuan === (emp.area_tugas || '') && m.approval_tujuan_status === 'Menunggu';
    return needAsal || needTujuan;
  });

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">
      <div className="flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center"><ArrowRightLeft className="w-5 h-5 text-orange-600" /></div>
          <div>
            <h1 className="text-lg font-black text-gray-800">Mutasi Aset Antar Area</h1>
            <p className="text-xs text-gray-500">Scan NFC/QR · dual approval supervisor · update stok otomatis</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-[#7B1A2C] hover:bg-[#5A1220] text-white gap-1 h-9"><Plus className="w-4 h-4" />Ajukan Mutasi</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Menunggu Approval', value: pending.length, color: 'bg-yellow-50 text-yellow-700' },
          { label: 'Perlu Tindakan Saya', value: needMyApproval.length, color: needMyApproval.length > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600' },
          { label: 'Selesai', value: history.filter(m => m.status_mutasi === 'Selesai').length, color: 'bg-emerald-50 text-emerald-700' },
        ].map(s => (
          <Card key={s.label} className={`p-4 border-0 shadow-sm text-center ${s.color}`}>
            <p className="text-3xl font-black">{s.value}</p>
            <p className="text-xs mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {needMyApproval.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">{needMyApproval.length} mutasi menunggu approval Anda</p>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="pending" className="rounded-lg text-sm">Menunggu Approval {pending.length > 0 && <Badge className="ml-1 bg-yellow-500 text-white border-0 text-[10px]">{pending.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-sm">Riwayat</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-3 mt-4">
          {isLoading ? <div className="h-32 bg-gray-100 animate-pulse rounded-2xl" /> : pending.length === 0
            ? <div className="text-center py-16 text-gray-400"><ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">Tidak ada mutasi pending</p></div>
            : pending.map(m => <ApprovalCard key={m.id} mut={m} onApprove={handleApprove} onReject={handleReject} />)
          }
        </TabsContent>
        <TabsContent value="history" className="space-y-3 mt-4">
          {history.length === 0
            ? <p className="text-center py-16 text-gray-400 text-sm">Belum ada riwayat</p>
            : history.map(m => (
                <Card key={m.id} className="p-4 border-0 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.status_mutasi === 'Selesai' ? 'bg-emerald-100' : m.status_mutasi === 'Ditolak' ? 'bg-red-100' : 'bg-gray-100'}`}>
                      {m.status_mutasi === 'Selesai' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : m.status_mutasi === 'Ditolak' ? <XCircle className="w-5 h-5 text-red-600" /> : <Package className="w-5 h-5 text-gray-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm">{m.nama_barang} <span className="text-xs text-gray-400">({m.jumlah} unit)</span></p>
                      <p className="text-xs text-gray-500">{m.area_asal} → {m.area_tujuan} · {m.tanggal}</p>
                    </div>
                    <Badge className={`${STATUS_COLOR[m.status_mutasi]} border-0 text-xs shrink-0`}>{m.status_mutasi}</Badge>
                  </div>
                </Card>
              ))
          }
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-orange-600" />Ajukan Mutasi Aset</DialogTitle></DialogHeader><MutasiForm onClose={() => setShowForm(false)} /></DialogContent>
      </Dialog>
    </div>
  );
}