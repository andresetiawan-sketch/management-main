import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Download, Upload, Search, Pencil, Trash2, AlertTriangle, DollarSign, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { differenceInCalendarDays, parseISO } from 'date-fns';

function ContractCountdown({ tanggal_selesai }) {
  if (!tanggal_selesai) return <span className="text-gray-400 text-xs">-</span>;
  const endDate = parseISO(tanggal_selesai);
  const daysLeft = differenceInCalendarDays(endDate, new Date());
  if (daysLeft < 0) return <Badge className="bg-red-100 text-red-700 text-xs border-0">Habis {Math.abs(daysLeft)}h lalu</Badge>;
  if (daysLeft <= 14) return (
    <div className="flex items-center gap-1">
      <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />
      <Badge className="bg-red-100 text-red-700 text-xs border-0 animate-pulse">{daysLeft} hari</Badge>
    </div>);

  if (daysLeft <= 30) return <Badge className="bg-amber-100 text-amber-700 text-xs border-0">{daysLeft} hari</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 text-xs border-0">{daysLeft} hari</Badge>;
}

// ─── BankTransaction entity baru di entity file ────────────────────────────
// Kita simpan transaksi Bank In/Out per area dalam AreaContract sendiri
// dengan field transactions array, tapi UI dipisahkan

const TRANS_TYPES = ['Bank In (Pemasukan)', 'Bank Out (Pengeluaran)'];

function fmtRp(v) {
  if (!v && v !== 0) return '-';
  return `Rp ${Number(v).toLocaleString('id-ID')}`;
}

export default function AreaContractPage() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [filterArea, setFilterArea] = useState('');
  const [activeTab, setActiveTab] = useState('kontrak'); // 'kontrak' | 'transaksi'
  const [showTransForm, setShowTransForm] = useState(false);
  const [editTrans, setEditTrans] = useState(null);
  const [transForm, setTransForm] = useState({ area_tugas: '', tipe: 'Bank In (Pemasukan)', bank: '', jumlah: 0, keterangan: '', tanggal: new Date().toISOString().slice(0, 10), nomor_referensi: '' });

  const [form, setForm] = useState({
    area_tugas: '', nama_kontrak: '', nilai_kontrak: 0, bank_in: '', bank_out: '',
    nomor_invoice: '', tanggal_invoice: '', tanggal_mulai_kontrak: '',
    tanggal_selesai_kontrak: '', status: 'Aktif', catatan: ''
  });
  const queryClient = useQueryClient();

  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const empRole = employee?.role || employee?.jabatan || '';
  const canManage = ['Master Admin', 'Admin Pos', 'Chief Security', 'Supervisor Facility'].includes(empRole);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['area-contracts'],
    queryFn: () => base44.entities.AreaContract.list('-created_date', 200)
  });

  const { data: transactions = [], isLoading: loadTrans } = useQuery({
    queryKey: ['bank-transactions'],
    queryFn: () => base44.entities.BankTransaction.list('-tanggal', 500)
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-contract'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  useEffect(() => {
    const nearExpiry = contracts.filter((c) => {
      if (!c.tanggal_selesai_kontrak) return false;
      const daysLeft = differenceInCalendarDays(parseISO(c.tanggal_selesai_kontrak), new Date());
      return daysLeft >= 0 && daysLeft <= 14;
    });
    if (nearExpiry.length > 0) {
      toast.warning(`⚠️ ${nearExpiry.length} kontrak area akan habis dalam 2 minggu!`, { duration: 6000 });
    }
  }, [contracts]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AreaContract.create(data),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['area-contracts'] });setShowForm(false);resetForm();toast.success('Kontrak ditambahkan');}
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AreaContract.update(id, data),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['area-contracts'] });setShowForm(false);setEditItem(null);resetForm();toast.success('Kontrak diperbarui');}
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AreaContract.delete(id),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['area-contracts'] });toast.success('Kontrak dihapus');}
  });

  const createTransMutation = useMutation({
    mutationFn: (data) => base44.entities.BankTransaction.create(data),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });setShowTransForm(false);resetTransForm();toast.success('Transaksi ditambahkan');}
  });
  const updateTransMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankTransaction.update(id, data),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });setShowTransForm(false);setEditTrans(null);resetTransForm();toast.success('Transaksi diperbarui');}
  });
  const deleteTransMutation = useMutation({
    mutationFn: (id) => base44.entities.BankTransaction.delete(id),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });toast.success('Transaksi dihapus');}
  });

  const resetForm = () => setForm({ area_tugas: '', nama_kontrak: '', nilai_kontrak: 0, bank_in: '', bank_out: '', nomor_invoice: '', tanggal_invoice: '', tanggal_mulai_kontrak: '', tanggal_selesai_kontrak: '', status: 'Aktif', catatan: '' });
  const resetTransForm = () => setTransForm({ area_tugas: filterArea || '', tipe: 'Bank In (Pemasukan)', bank: '', jumlah: 0, keterangan: '', tanggal: new Date().toISOString().slice(0, 10), nomor_referensi: '' });

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ area_tugas: item.area_tugas || '', nama_kontrak: item.nama_kontrak || '', nilai_kontrak: item.nilai_kontrak || 0, bank_in: item.bank_in || '', bank_out: item.bank_out || '', nomor_invoice: item.nomor_invoice || '', tanggal_invoice: item.tanggal_invoice || '', tanggal_mulai_kontrak: item.tanggal_mulai_kontrak || '', tanggal_selesai_kontrak: item.tanggal_selesai_kontrak || '', status: item.status || 'Aktif', catatan: item.catatan || '', dokumen_kontrak: item.dokumen_kontrak || '' });
    setShowForm(true);
  };

  const openEditTrans = (item) => {
    setEditTrans(item);
    setTransForm({ area_tugas: item.area_tugas || '', tipe: item.tipe || 'Bank In (Pemasukan)', bank: item.bank || '', jumlah: item.jumlah || 0, keterangan: item.keterangan || '', tanggal: item.tanggal || '', nomor_referensi: item.nomor_referensi || '' });
    setShowTransForm(true);
  };

  const handleUploadDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((p) => ({ ...p, dokumen_kontrak: file_url }));
    setUploadingDoc(false);
    toast.success('Dokumen kontrak terupload');
  };

  const handleSave = () => {
    if (!form.area_tugas || !form.nama_kontrak) {toast.error('Area dan nama kontrak wajib diisi');return;}
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form });else
    createMutation.mutate(form);
  };

  const handleSaveTrans = () => {
    if (!transForm.area_tugas || !transForm.jumlah) {toast.error('Area dan jumlah wajib diisi');return;}
    if (editTrans) updateTransMutation.mutate({ id: editTrans.id, data: transForm });else
    createTransMutation.mutate(transForm);
  };

  const filteredContracts = contracts.filter((c) =>
  (!filterArea || c.area_tugas === filterArea) && (
  c.area_tugas?.toLowerCase().includes(search.toLowerCase()) || c.nama_kontrak?.toLowerCase().includes(search.toLowerCase()) || c.nomor_invoice?.includes(search))
  );

  const expiringContracts = contracts.filter((c) => {
    if (!c.tanggal_selesai_kontrak) return false;
    const daysLeft = differenceInCalendarDays(parseISO(c.tanggal_selesai_kontrak), new Date());
    return daysLeft >= 0 && daysLeft <= 14;
  });

  // Per-area transaction summary
  const areaSummaries = useMemo(() => {
    const areaNames = [...new Set(transactions.map((t) => t.area_tugas).filter(Boolean))];
    return areaNames.map((area) => {
      const areaContracts = contracts.filter((c) => c.area_tugas === area);
      const nilaiInvoice = areaContracts.reduce((s, c) => s + (Number(c.nilai_kontrak) || 0), 0);
      const areaT = transactions.filter((t) => t.area_tugas === area);
      const totalIn = areaT.filter((t) => t.tipe === 'Bank In (Pemasukan)').reduce((s, t) => s + (Number(t.jumlah) || 0), 0);
      const totalOut = areaT.filter((t) => t.tipe === 'Bank Out (Pengeluaran)').reduce((s, t) => s + (Number(t.jumlah) || 0), 0);
      const selisih = totalIn - totalOut;
      return { area, nilaiInvoice, totalIn, totalOut, selisih };
    });
  }, [transactions, contracts]);

  const filteredTrans = transactions.filter((t) => !filterArea || t.area_tugas === filterArea);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="text-gray-500 hover:text-gray-800 -ml-1">
        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
      </Button>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[var(--maroon)]" />
          <h2 className="text-base font-semibold text-gray-700">Kontrak, Bank & Invoice</h2>
          <Badge variant="outline" className="text-xs">{contracts.length} kontrak</Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="Filter area..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Semua Area</SelectItem>
              {areas.map((a) => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm w-40" />
          </div>
          {canManage &&
          <Button onClick={() => {resetForm();setEditItem(null);setShowForm(true);}} className="bg-[#0a0000] text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-red-800 h-9">
              <Plus className="w-4 h-4 mr-1" /> Tambah Kontrak
            </Button>
          }
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {['kontrak', 'transaksi', 'ringkasan'].map((tab) =>
        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === tab ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'kontrak' ? 'Kontrak & Invoice' : tab === 'transaksi' ? 'Transaksi Bank' : 'Ringkasan Keuangan'}
          </button>
        )}
      </div>

      {/* Expiry warning */}
      {expiringContracts.length > 0 && activeTab === 'kontrak' &&
      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
            <span className="text-sm font-semibold text-red-700">⚠️ {expiringContracts.length} Kontrak Segera Habis!</span>
          </div>
          {expiringContracts.map((c) => {
          const daysLeft = differenceInCalendarDays(parseISO(c.tanggal_selesai_kontrak), new Date());
          return (
            <div key={c.id} className="text-xs text-red-600 ml-6">
                • <strong>{c.area_tugas}</strong> — {c.nama_kontrak} — <span className="font-bold">{daysLeft} hari lagi</span> ({c.tanggal_selesai_kontrak})
              </div>);

        })}
        </div>
      }

      {/* TAB: KONTRAK */}
      {activeTab === 'kontrak' &&
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="text-xs">Area</TableHead>
                  <TableHead className="text-xs">Nama Kontrak</TableHead>
                  <TableHead className="text-xs">Nilai Kontrak</TableHead>
                  <TableHead className="text-xs">Bank In</TableHead>
                  <TableHead className="text-xs">Bank Out</TableHead>
                  <TableHead className="text-xs">Invoice</TableHead>
                  <TableHead className="text-xs">Mulai</TableHead>
                  <TableHead className="text-xs">Selesai</TableHead>
                  <TableHead className="text-xs">Sisa</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Dok.</TableHead>
                  {canManage && <TableHead className="text-xs">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.length === 0 ?
              <TableRow><TableCell colSpan={12} className="text-center py-10 text-gray-400">Belum ada data kontrak</TableCell></TableRow> :
              filteredContracts.map((item) =>
              <TableRow key={item.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-sm font-medium">{item.area_tugas}</TableCell>
                    <TableCell className="text-sm">{item.nama_kontrak}</TableCell>
                    <TableCell className="text-xs font-mono text-emerald-700">{fmtRp(item.nilai_kontrak)}</TableCell>
                    <TableCell className="text-xs text-green-700 font-medium">{item.bank_in || '-'}</TableCell>
                    <TableCell className="text-xs text-red-600 font-medium">{item.bank_out || '-'}</TableCell>
                    <TableCell className="text-xs">
                      <div>{item.nomor_invoice || '-'}</div>
                      <div className="text-gray-400">{item.tanggal_invoice || ''}</div>
                    </TableCell>
                    <TableCell className="text-xs">{item.tanggal_mulai_kontrak || '-'}</TableCell>
                    <TableCell className="text-xs">{item.tanggal_selesai_kontrak || '-'}</TableCell>
                    <TableCell><ContractCountdown tanggal_selesai={item.tanggal_selesai_kontrak} /></TableCell>
                    <TableCell>
                      <Badge className={`text-xs border-0 ${item.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : item.status === 'Habis' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.dokumen_kontrak &&
                  <a href={item.dokumen_kontrak} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2"><Download className="w-3 h-3 mr-1" /> Dok</Button>
                        </a>
                  }
                    </TableCell>
                    {canManage &&
                <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEdit(item)}><Pencil className="w-3 h-3 text-blue-500" /></Button>
                          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => {if (confirm('Hapus kontrak ini?')) deleteMutation.mutate(item.id);}}><Trash2 className="w-3 h-3 text-red-400" /></Button>
                        </div>
                      </TableCell>
                }
                  </TableRow>
              )}
              </TableBody>
            </Table>
          </div>
        </div>
      }

      {/* TAB: TRANSAKSI BANK */}
      {activeTab === 'transaksi' &&
      <div className="space-y-3">
          {canManage &&
        <div className="flex justify-end">
              <Button onClick={() => {resetTransForm();setEditTrans(null);setShowTransForm(true);}} className="bg-slate-950 text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-red-800 h-9">
                <Plus className="w-4 h-4 mr-1" /> Tambah Transaksi
              </Button>
            </div>
        }
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs">Area</TableHead>
                    <TableHead className="text-xs">Tipe</TableHead>
                    <TableHead className="text-xs">Bank</TableHead>
                    <TableHead className="text-xs">Jumlah</TableHead>
                    <TableHead className="text-xs">No. Referensi</TableHead>
                    <TableHead className="text-xs">Keterangan</TableHead>
                    {canManage && <TableHead className="text-xs">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadTrans ?
                <TableRow><TableCell colSpan={8} className="py-8 text-center"><Skeleton className="h-8 w-40 mx-auto" /></TableCell></TableRow> :
                filteredTrans.length === 0 ?
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">Belum ada data transaksi</TableCell></TableRow> :
                filteredTrans.map((item) =>
                <TableRow key={item.id} className="hover:bg-gray-50/50">
                      <TableCell className="text-xs font-mono">{item.tanggal}</TableCell>
                      <TableCell className="text-sm font-medium">{item.area_tugas}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs border-0 ${item.tipe?.includes('Pemasukan') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {item.tipe?.includes('Pemasukan') ? '↑ In' : '↓ Out'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{item.bank || '-'}</TableCell>
                      <TableCell className={`text-sm font-mono font-semibold ${item.tipe?.includes('Pemasukan') ? 'text-emerald-700' : 'text-red-600'}`}>
                        {item.tipe?.includes('Pemasukan') ? '+' : '-'}{fmtRp(item.jumlah)}
                      </TableCell>
                      <TableCell className="text-xs">{item.nomor_referensi || '-'}</TableCell>
                      <TableCell className="text-xs text-gray-500">{item.keterangan || '-'}</TableCell>
                      {canManage &&
                  <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEditTrans(item)}><Pencil className="w-3 h-3 text-blue-500" /></Button>
                            <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => {if (confirm('Hapus transaksi?')) deleteTransMutation.mutate(item.id);}}><Trash2 className="w-3 h-3 text-red-400" /></Button>
                          </div>
                        </TableCell>
                  }
                    </TableRow>
                )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      }

      {/* TAB: RINGKASAN KEUANGAN */}
      {activeTab === 'ringkasan' &&
      <div className="space-y-3">
          {areaSummaries.length === 0 ?
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">Belum ada data transaksi. Tambahkan transaksi di tab "Transaksi Bank".</div> :
        areaSummaries.map((s) =>
        <div key={s.area} className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-3">{s.area}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-600 mb-1">Nilai Invoice</p>
                  <p className="text-sm font-bold text-blue-800">{fmtRp(s.nilaiInvoice)}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-600 mb-1 flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" /> Total Pemasukan</p>
                  <p className="text-sm font-bold text-emerald-800">{fmtRp(s.totalIn)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-red-600 mb-1 flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3" /> Total Pengeluaran</p>
                  <p className="text-sm font-bold text-red-800">{fmtRp(s.totalOut)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${s.selisih >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  <p className={`text-xs mb-1 ${s.selisih >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Selisih (In-Out)</p>
                  <p className={`text-sm font-bold ${s.selisih >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>{s.selisih >= 0 ? '+' : ''}{fmtRp(s.selisih)}</p>
                </div>
              </div>
              {s.nilaiInvoice > 0 &&
          <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Realisasi vs Invoice</span>
                    <span>{Math.round(s.totalIn / s.nilaiInvoice * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, s.totalIn / s.nilaiInvoice * 100)}%` }} />
                  </div>
                </div>
          }
            </div>
        )}
        </div>
      }

      {/* Kontrak Form Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => {setShowForm(v);if (!v) {setEditItem(null);resetForm();}}}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Kontrak' : 'Tambah Kontrak Area'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Area / Proyek *</Label>
              <Select value={form.area_tugas} onValueChange={(v) => setForm((p) => ({ ...p, area_tugas: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih area..." /></SelectTrigger>
                <SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Nama Kontrak *</Label><Input value={form.nama_kontrak} onChange={(e) => setForm((p) => ({ ...p, nama_kontrak: e.target.value }))} placeholder="Judul/nama kontrak..." /></div>
            <div><Label>Nilai Kontrak / Invoice (Rp)</Label><Input type="number" value={form.nilai_kontrak} onChange={(e) => setForm((p) => ({ ...p, nilai_kontrak: Number(e.target.value) }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bank In (Penerimaan)</Label><Input value={form.bank_in} onChange={(e) => setForm((p) => ({ ...p, bank_in: e.target.value }))} placeholder="BCA, Mandiri..." /></div>
              <div><Label>Bank Out (Pengeluaran)</Label><Input value={form.bank_out} onChange={(e) => setForm((p) => ({ ...p, bank_out: e.target.value }))} placeholder="BCA, Mandiri..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nomor Invoice</Label><Input value={form.nomor_invoice} onChange={(e) => setForm((p) => ({ ...p, nomor_invoice: e.target.value }))} /></div>
              <div><Label>Tanggal Invoice</Label><Input type="date" value={form.tanggal_invoice} onChange={(e) => setForm((p) => ({ ...p, tanggal_invoice: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal Mulai</Label><Input type="date" value={form.tanggal_mulai_kontrak} onChange={(e) => setForm((p) => ({ ...p, tanggal_mulai_kontrak: e.target.value }))} /></div>
              <div><Label>Tanggal Selesai</Label><Input type="date" value={form.tanggal_selesai_kontrak} onChange={(e) => setForm((p) => ({ ...p, tanggal_selesai_kontrak: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Aktif', 'Habis', 'Perpanjang'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="border rounded-xl p-3 bg-blue-50 space-y-2">
              <Label className="text-blue-800 font-semibold text-sm">📄 Dokumen Kontrak</Label>
              <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-blue-100 transition bg-white">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">{uploadingDoc ? 'Uploading...' : form.dokumen_kontrak ? 'Dokumen terupload ✓' : 'Upload dokumen kontrak (PDF/Word)...'}</span>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleUploadDoc} disabled={uploadingDoc} />
              </label>
              {form.dokumen_kontrak && <a href={form.dokumen_kontrak} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline flex items-center gap-1"><Download className="w-3 h-3" /> Download</a>}
            </div>
            <div><Label>Catatan</Label><Input value={form.catatan} onChange={(e) => setForm((p) => ({ ...p, catatan: e.target.value }))} placeholder="Opsional..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {setShowForm(false);setEditItem(null);resetForm();}}>Batal</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#050000] text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 hover:bg-red-800">
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaksi Form Dialog */}
      <Dialog open={showTransForm} onOpenChange={(v) => {setShowTransForm(v);if (!v) {setEditTrans(null);resetTransForm();}}}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTrans ? 'Edit Transaksi' : 'Tambah Transaksi Bank'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Area *</Label>
              <Select value={transForm.area_tugas} onValueChange={(v) => setTransForm((p) => ({ ...p, area_tugas: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih area..." /></SelectTrigger>
                <SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipe Transaksi *</Label>
              <Select value={transForm.tipe} onValueChange={(v) => setTransForm((p) => ({ ...p, tipe: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TRANS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal</Label><Input type="date" value={transForm.tanggal} onChange={(e) => setTransForm((p) => ({ ...p, tanggal: e.target.value }))} /></div>
              <div><Label>Bank</Label><Input value={transForm.bank} onChange={(e) => setTransForm((p) => ({ ...p, bank: e.target.value }))} placeholder="BCA, Mandiri..." /></div>
            </div>
            <div><Label>Jumlah (Rp) *</Label><Input type="number" value={transForm.jumlah} onChange={(e) => setTransForm((p) => ({ ...p, jumlah: Number(e.target.value) }))} /></div>
            <div><Label>Nomor Referensi / Invoice</Label><Input value={transForm.nomor_referensi} onChange={(e) => setTransForm((p) => ({ ...p, nomor_referensi: e.target.value }))} placeholder="No. invoice/transfer..." /></div>
            <div><Label>Keterangan</Label><Input value={transForm.keterangan} onChange={(e) => setTransForm((p) => ({ ...p, keterangan: e.target.value }))} placeholder="Opsional..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {setShowTransForm(false);setEditTrans(null);resetTransForm();}}>Batal</Button>
            <Button onClick={handleSaveTrans} disabled={createTransMutation.isPending || updateTransMutation.isPending} className="hover:bg-red-800 bg-[hsl(var(--popover-foreground))]">
              {createTransMutation.isPending || updateTransMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}