import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Download, Upload, Search, Pencil, Trash2, FileCheck, ArrowLeft, Wand2, CheckCircle2, XCircle, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import PKWTExpiryAlert from '@/components/pkwt/PKWTExpiryAlert';
import PKWTApprovalBadge from '@/components/pkwt/PKWTApprovalBadge';
import { generatePKWTPDF } from '@/components/pkwt/PKWTGenerator';
import Pasal9Editor from '@/components/pkwt/Pasal9Editor';
import PKWTFormFields from '@/components/pkwt/PKWTFormFields';

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const DURASI_MAP = { 3: 'tiga', 6: 'enam', 12: 'dua belas', 18: 'delapan belas', 24: 'dua puluh empat', 36: 'tiga puluh enam' };

function generateNomorPKWT(nomorUrut, nikKaryawan) {
  const now = new Date();
  const bulanRoman = ROMAN_MONTHS[now.getMonth()];
  const tahun = now.getFullYear();
  const urut = String(nomorUrut).padStart(3, '0');
  return `${urut}/${nikKaryawan}/HRD/PIS/PKWT/${bulanRoman}/${tahun}`;
}

const statusColor = {
  Draft: 'bg-gray-100 text-gray-700',
  'Menunggu Approval': 'bg-yellow-100 text-yellow-700',
  Aktif: 'bg-emerald-100 text-emerald-700',
  Selesai: 'bg-blue-100 text-blue-700',
  Dibatalkan: 'bg-red-100 text-red-700'
};

export default function PKWTPage() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState({
    nik_karyawan: '', nama_karyawan: '', jabatan: '', area_tugas: '', entity_pt: '',
    tanggal_mulai: '', tanggal_selesai: '', durasi_bulan: 12, status: 'Draft', catatan: '',
    pasal_9_ayat: [],
    // Data tambahan
    hari_tanda_tangan: '', tanggal_tanda_tangan: '', kota_tanda_tangan: '',
    alamat_perusahaan: '', nama_direktur: '', jabatan_direktur: 'Direktur',
    nik_ektp: '', tempat_lahir: '', tanggal_lahir: '', alamat_karyawan: '',
    wilayah_penugasan: '', durasi_terbilang: '', gaji_pokok: '',
    gaji_pokok_terbilang: '', tanggal_gajian: '25', bank_karyawan: '',
    no_rekening: '', kota_pengadilan: ''
  });
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const queryClient = useQueryClient();

  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const empRole = employee?.role || employee?.jabatan || '';
  const canManage = ['Master Admin', 'Admin Pos', 'Chief Security', 'Supervisor Facility'].includes(empRole);
  const canApprove = ['Master Admin', 'Chief Security', 'Supervisor Facility'].includes(empRole);
  const isMasterAdmin = empRole === 'Master Admin';

  const { data: pkwtList = [], isLoading } = useQuery({
    queryKey: ['pkwt-list'],
    queryFn: () => base44.entities.PKWTContract.list('-created_date', 200)
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-pkwt'],
    queryFn: () => base44.entities.Employee.filter({ status_aktif: 'Aktif' }, 'nama_lengkap', 300),
    enabled: showForm
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const nomorUrut = pkwtList.length + 1;
      const nomor = generateNomorPKWT(nomorUrut, data.nik_karyawan);
      return base44.entities.PKWTContract.create({ ...data, nomor_pkwt: nomor });
    },
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['pkwt-list'] });setShowForm(false);resetForm();toast.success('PKWT berhasil dibuat');}
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PKWTContract.update(id, data),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['pkwt-list'] });setShowForm(false);setEditItem(null);resetForm();toast.success('PKWT diperbarui');}
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PKWTContract.delete(id),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['pkwt-list'] });toast.success('PKWT dihapus');}
  });

  const resetForm = () => {
    setForm({
      nik_karyawan: '', nama_karyawan: '', jabatan: '', area_tugas: '', entity_pt: '',
      tanggal_mulai: '', tanggal_selesai: '', durasi_bulan: 12, status: 'Draft', catatan: '',
      pasal_9_ayat: [],
      hari_tanda_tangan: '', tanggal_tanda_tangan: '', kota_tanda_tangan: '',
      alamat_perusahaan: '', nama_direktur: '', jabatan_direktur: 'Direktur',
      nik_ektp: '', tempat_lahir: '', tanggal_lahir: '', alamat_karyawan: '',
      wilayah_penugasan: '', durasi_terbilang: '', gaji_pokok: '',
      gaji_pokok_terbilang: '', tanggal_gajian: '25', bank_karyawan: '',
      no_rekening: '', kota_pengadilan: ''
    });
    setShowAdvanced(false);
  };

  const handleSelectEmployee = (nik) => {
    const emp = employees.find((e) => e.nik_karyawan === nik);
    if (emp) {
      setForm((p) => ({
        ...p,
        nik_karyawan: emp.nik_karyawan,
        nama_karyawan: emp.nama_lengkap,
        jabatan: emp.jabatan || '',
        area_tugas: emp.area_tugas || '',
        entity_pt: emp.entity_pt || '',
        nik_ektp: emp.nik_ektp || p.nik_ektp || '',
        tempat_lahir: emp.tempat_lahir || p.tempat_lahir || '',
        tanggal_lahir: emp.tanggal_lahir || p.tanggal_lahir || '',
        alamat_karyawan: emp.alamat || p.alamat_karyawan || '',
        bank_karyawan: emp.bank || p.bank_karyawan || '',
        no_rekening: emp.no_rekening || p.no_rekening || '',
      }));
    }
  };

  const handleUploadDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((p) => ({ ...p, dokumen_pkwt: file_url }));
    setUploadingDoc(false);
    toast.success('Dokumen PKWT terupload');
  };

  const handleSave = () => {
    if (!form.nik_karyawan || !form.nama_karyawan) {toast.error('Pilih karyawan terlebih dahulu');return;}
    const dataToSave = {
      ...form,
      pasal_9_ayat: form.pasal_9_ayat || [],
      durasi_terbilang: form.durasi_terbilang || DURASI_MAP[form.durasi_bulan] || ''
    };
    if (!isMasterAdmin && dataToSave.status === 'Aktif') {
      toast.error('Status Aktif hanya bisa diset setelah disetujui atasan. Gunakan "Ajukan Approval".');
      return;
    }
    if (editItem) updateMutation.mutate({ id: editItem.id, data: dataToSave });
    else createMutation.mutate(dataToSave);
  };

  const handleAjukanApproval = (item) => {
    updateMutation.mutate({
      id: item.id,
      data: { status: 'Menunggu Approval', approval_status: 'Menunggu Approval' }
    }, {
      onSuccess: () => toast.success('PKWT berhasil diajukan untuk approval'),
    });
  };

  const handleApprove = (item) => {
    updateMutation.mutate({
      id: item.id,
      data: {
        status: 'Aktif',
        approval_status: 'Disetujui',
        approved_by: `${employee.nik_karyawan} - ${employee.nama_lengkap}`,
        approved_at: new Date().toISOString().slice(0, 10),
      }
    }, {
      onSuccess: () => toast.success('PKWT disetujui dan diaktifkan'),
    });
  };

  const handleReject = (item) => {
    const catatan = window.prompt('Masukkan alasan penolakan:');
    if (catatan === null) return;
    updateMutation.mutate({
      id: item.id,
      data: {
        status: 'Draft',
        approval_status: 'Ditolak',
        catatan_approval: catatan,
        approved_by: `${employee.nik_karyawan} - ${employee.nama_lengkap}`,
        approved_at: new Date().toISOString().slice(0, 10),
      }
    }, {
      onSuccess: () => toast.success('PKWT ditolak, dikembalikan ke Draft'),
    });
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      nik_karyawan: item.nik_karyawan || '', nama_karyawan: item.nama_karyawan || '',
      jabatan: item.jabatan || '', area_tugas: item.area_tugas || '', entity_pt: item.entity_pt || '',
      tanggal_mulai: item.tanggal_mulai || '', tanggal_selesai: item.tanggal_selesai || '',
      durasi_bulan: item.durasi_bulan || 12, status: item.status || 'Draft', catatan: item.catatan || '',
      dokumen_pkwt: item.dokumen_pkwt || '', draft_template: item.draft_template || '',
      pasal_9_ayat: item.pasal_9_ayat || [],
      hari_tanda_tangan: item.hari_tanda_tangan || '', tanggal_tanda_tangan: item.tanggal_tanda_tangan || '',
      kota_tanda_tangan: item.kota_tanda_tangan || '', alamat_perusahaan: item.alamat_perusahaan || '',
      nama_direktur: item.nama_direktur || '', jabatan_direktur: item.jabatan_direktur || 'Direktur',
      nik_ektp: item.nik_ektp || '', tempat_lahir: item.tempat_lahir || '',
      tanggal_lahir: item.tanggal_lahir || '', alamat_karyawan: item.alamat_karyawan || '',
      wilayah_penugasan: item.wilayah_penugasan || '', durasi_terbilang: item.durasi_terbilang || DURASI_MAP[item.durasi_bulan] || '',
      gaji_pokok: item.gaji_pokok || '', gaji_pokok_terbilang: item.gaji_pokok_terbilang || '',
      tanggal_gajian: item.tanggal_gajian || '25', bank_karyawan: item.bank_karyawan || '',
      no_rekening: item.no_rekening || '', kota_pengadilan: item.kota_pengadilan || ''
    });
    setShowForm(true);
  };

  const filteredList = pkwtList.filter((p) =>
  p.nama_karyawan?.toLowerCase().includes(search.toLowerCase()) ||
  p.nik_karyawan?.includes(search) ||
  p.nomor_pkwt?.includes(search)
  );

  const filteredEmployees = employees.filter((e) =>
  e.nama_lengkap?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
  e.nik_karyawan?.includes(employeeSearch)
  );

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="text-gray-500 hover:text-gray-800 -ml-1">
        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
      </Button>

      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-[var(--maroon)]" />
          <h2 className="text-base font-semibold text-gray-700">Data PKWT Karyawan</h2>
          <Badge variant="outline" className="text-xs">{pkwtList.length} kontrak</Badge>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Cari nama, NIK, nomor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm w-56" />
          </div>
          {canManage &&
          <Button onClick={() => {resetForm();setEditItem(null);setShowForm(true);}} className="bg-[#0f0101] text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-red-800 h-9">
              <Plus className="w-4 h-4 mr-2" /> Buat PKWT
            </Button>
          }
        </div>
      </div>

      {/* PKWT Expiry Alert */}
      <PKWTExpiryAlert />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
        <p><strong>📄 Format PKWT Standar 9 Pasal:</strong> Pasal 1 (Jangka Waktu) · Pasal 2 (Penempatan) · Pasal 3 (Jam Kerja) · Pasal 4 (Upah) · Pasal 5 (Hak & Kewajiban) · Pasal 6 (Tata Tertib) · Pasal 7 (PHK) · Pasal 8 (Perselisihan) · <strong>Pasal 9 (Lain-lain – Editable)</strong></p>
        <p><strong>Format Nomor:</strong> <span className="font-mono">001/NIK/HRD/PIS/PKWT/III/2026</span></p>
        <p className="text-amber-600">💡 Isi data detail di form (gaji, rekening, tanggal TTD, dll) lalu klik <strong>Generate PDF</strong> untuk mencetak. Pasal 9 bisa diedit/ditambah ayat sesuai kebutuhan.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="text-xs">Nomor PKWT</TableHead>
                <TableHead className="text-xs">Nama Karyawan</TableHead>
                <TableHead className="text-xs">NIK</TableHead>
                <TableHead className="text-xs">Jabatan</TableHead>
                <TableHead className="text-xs">Area</TableHead>
                <TableHead className="text-xs">Mulai</TableHead>
                <TableHead className="text-xs">Selesai</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Approval</TableHead>
                <TableHead className="text-xs">Dokumen</TableHead>
                {canManage && <TableHead className="text-xs">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.length === 0 ?
              <TableRow><TableCell colSpan={canManage ? 10 : 9} className="text-center py-10 text-gray-400">Belum ada data PKWT</TableCell></TableRow> :
              filteredList.map((item) =>
              <TableRow key={item.id} className="hover:bg-gray-50/50">
                  <TableCell className="text-xs font-mono text-[var(--maroon)]">{item.nomor_pkwt || '-'}</TableCell>
                  <TableCell className="text-sm font-medium">{item.nama_karyawan}</TableCell>
                  <TableCell className="text-xs">{item.nik_karyawan}</TableCell>
                  <TableCell className="text-xs text-gray-600">{item.jabatan || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-600">{item.area_tugas || '-'}</TableCell>
                  <TableCell className="text-xs">{item.tanggal_mulai || '-'}</TableCell>
                  <TableCell className="text-xs">{item.tanggal_selesai || '-'}</TableCell>
                  <TableCell><Badge className={`${statusColor[item.status] || 'bg-gray-100'} text-xs border-0`}>{item.status}</Badge></TableCell>
                  <TableCell>
                   <div className="space-y-1">
                     <PKWTApprovalBadge status={item.approval_status} />
                     {item.approved_by && <p className="text-xs text-gray-400">{item.approved_by}</p>}
                     {item.catatan_approval && <p className="text-xs text-red-500 italic">{item.catatan_approval}</p>}
                   </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {/* Generate PDF PKWT */}
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-green-300 text-green-700 hover:bg-green-50" onClick={async () => {
                        const freshList = queryClient.getQueryData(['pkwt-list']) || pkwtList;
                        const freshItem = freshList.find(p => p.id === item.id) || item;
                        generatePKWTPDF(freshItem, async (url) => {
                          await updateMutation.mutateAsync({ id: item.id, data: { draft_template: url } });
                          toast.success('Draft PKWT disimpan ke sistem');
                        });
                      }}>
                        <Wand2 className="w-3 h-3 mr-1" /> Generate PDF
                      </Button>
                      {item.dokumen_pkwt &&
                    <a href={item.dokumen_pkwt} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2"><Download className="w-3 h-3 mr-1" /> Final</Button>
                        </a>
                    }
                      {item.draft_template &&
                    <a href={item.draft_template} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-amber-300 text-amber-700"><FileText className="w-3 h-3 mr-1" /> Draft PKWT</Button>
                        </a>
                    }
                    </div>
                  </TableCell>
                  {canManage &&
                  <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEdit(item)}><Pencil className="w-3 h-3 text-blue-500" /></Button>
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => {if (confirm('Hapus PKWT ini?')) deleteMutation.mutate(item.id);}}><Trash2 className="w-3 h-3 text-red-400" /></Button>
                        {/* Ajukan Approval - hanya jika Draft dan bukan Master Admin */}
                        {item.status === 'Draft' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => handleAjukanApproval(item)}>
                            <Send className="w-3 h-3 mr-1" /> Ajukan
                          </Button>
                        )}
                        {/* Approve / Reject - hanya untuk yang bisa approve dan status Menunggu */}
                        {canApprove && item.status === 'Menunggu Approval' && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => handleApprove(item)}>
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Setujui
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleReject(item)}>
                              <XCircle className="w-3 h-3 mr-1" /> Tolak
                            </Button>
                          </>
                        )}
                      </div>
                     </TableCell>
                  }
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => {setShowForm(v);if (!v) {setEditItem(null);resetForm();}}}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[var(--maroon)]" />
              {editItem ? 'Edit PKWT' : 'Buat PKWT Baru'}
              <span className="text-xs text-gray-400 font-normal ml-1">— Format 9 Pasal Standar</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Pilih Karyawan */}
            <div className="border rounded-xl p-3 bg-gray-50 space-y-2">
              <Label className="text-gray-700 font-semibold text-sm">👤 Pilih Karyawan *</Label>
              <Input placeholder="Ketik nama atau NIK..." value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} className="h-9 text-sm" />
              {employeeSearch &&
                <div className="max-h-40 overflow-y-auto border rounded-lg divide-y bg-white">
                  {filteredEmployees.slice(0, 10).map((e) =>
                    <button key={e.nik_karyawan} onClick={() => {handleSelectEmployee(e.nik_karyawan);setEmployeeSearch('');}} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between">
                      <span className="font-medium">{e.nama_lengkap}</span>
                      <span className="text-gray-400 text-xs">{e.nik_karyawan} • {e.jabatan}</span>
                    </button>
                  )}
                  {filteredEmployees.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Tidak ditemukan</p>}
                </div>
              }
              {form.nik_karyawan &&
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800 grid grid-cols-2 gap-1.5">
                  <div><span className="text-gray-500">Nama:</span> <span className="font-medium">{form.nama_karyawan}</span></div>
                  <div><span className="text-gray-500">NIK:</span> {form.nik_karyawan}</div>
                  <div><span className="text-gray-500">Jabatan:</span> {form.jabatan}</div>
                  <div><span className="text-gray-500">Area:</span> {form.area_tugas}</div>
                  <div><span className="text-gray-500">PT:</span> {form.entity_pt}</div>
                </div>
              }
            </div>

            {/* Entity PT */}
            <div>
              <Label className="text-xs">Entity PT</Label>
              <Select value={form.entity_pt} onValueChange={(v) => setForm((p) => ({ ...p, entity_pt: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih PT..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PT. PUTRA INDONESIA SOLUSI">PT. PUTRA INDONESIA SOLUSI</SelectItem>
                  <SelectItem value="PT. PRESTASI INDONESIA SOLUSI">PT. PRESTASI INDONESIA SOLUSI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tanggal & Durasi */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Tanggal Mulai</Label>
                <Input type="date" value={form.tanggal_mulai} onChange={(e) => setForm((p) => ({ ...p, tanggal_mulai: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Tanggal Selesai</Label>
                <Input type="date" value={form.tanggal_selesai} onChange={(e) => setForm((p) => ({ ...p, tanggal_selesai: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Durasi (Bulan)</Label>
                <Input type="number" value={form.durasi_bulan} onChange={(e) => {
                  const val = Number(e.target.value);
                  setForm((p) => ({ ...p, durasi_bulan: val, durasi_terbilang: DURASI_MAP[val] || p.durasi_terbilang }));
                }} className="h-9 text-sm" />
              </div>
            </div>

            {/* Status */}
            <div>
              <Label className="text-xs">Status PKWT</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Draft', 'Selesai', 'Dibatalkan'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  {isMasterAdmin && <SelectItem value="Aktif">Aktif (Master Admin)</SelectItem>}
                </SelectContent>
              </Select>
              {!isMasterAdmin && <p className="text-xs text-gray-400 mt-1">Untuk mengaktifkan, gunakan tombol <strong>Ajukan</strong> → Approval atasan.</p>}
            </div>

            {/* === DATA DETAIL PKWT (Collapsible) === */}
            <div className="border rounded-xl overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <span className="text-sm font-semibold text-indigo-800">
                  📋 Data Detail PKWT (Penandatanganan, Gaji, Rekening, dll.)
                </span>
                {showAdvanced ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
              </button>
              {showAdvanced && (
                <div className="p-4 bg-white border-t space-y-4">
                  <p className="text-xs text-indigo-600 mb-2">Field yang diberi tanda <span className="font-bold text-indigo-700">[...]</span> di dokumen akan terisi otomatis dari data di bawah ini.</p>
                  <PKWTFormFields form={form} setForm={setForm} />
                </div>
              )}
            </div>

            {/* === PASAL 9 EDITOR === */}
            <Pasal9Editor
              ayat={form.pasal_9_ayat}
              onChange={(updated) => setForm(p => ({ ...p, pasal_9_ayat: updated }))}
            />

            {/* Upload Dokumen Final */}
            <div className="border rounded-xl p-3 bg-emerald-50 space-y-2">
              <Label className="text-emerald-800 font-semibold text-sm">📋 Upload Dokumen PKWT Final (Sudah TTD)</Label>
              <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-emerald-100 transition bg-white">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">{uploadingDoc ? 'Uploading...' : form.dokumen_pkwt ? 'Dokumen terupload ✓' : 'Pilih file PKWT final (PDF/Word)...'}</span>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleUploadDoc} disabled={uploadingDoc} />
              </label>
              {form.dokumen_pkwt && <a href={form.dokumen_pkwt} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline flex items-center gap-1"><Download className="w-3 h-3" /> Download Dokumen</a>}
            </div>

            <div>
              <Label className="text-xs">Catatan Tambahan</Label>
              <Input value={form.catatan} onChange={(e) => setForm((p) => ({ ...p, catatan: e.target.value }))} placeholder="Opsional..." className="h-9 text-sm" />
            </div>
          </div>

          <DialogFooter className="flex gap-2 flex-wrap mt-2">
            <Button variant="outline" onClick={() => {setShowForm(false);setEditItem(null);resetForm();}}>Batal</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#8e0606] hover:bg-red-800 text-white h-9 px-6">
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : editItem ? '💾 Simpan Perubahan' : '✅ Buat PKWT'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}