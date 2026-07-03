import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, UserCircle, Pencil, Upload, FileSpreadsheet, UserPlus, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import AddEmployeeDialog from '@/components/employees/AddEmployeeDialog';
import BulkDeleteBar from '@/components/common/BulkDeleteBar';
import { Checkbox } from '@/components/ui/checkbox';
import * as XLSX from 'xlsx';

const DEFAULT_JABATAN = [
'Master Admin', 'Admin Pos', 'Chief Security', 'Leader Security',
'Supervisor Facility', 'Leader Facility', 'Staff', 'PIC Client'];

const REGU_LIST = ['Regu A', 'Regu B', 'Regu C', 'Regu D', 'Non Regu'];

export default function Employees() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const importRef = useRef(null);

  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';

  const downloadTemplate = () => {
    const headers = ['nik_karyawan', 'nama_lengkap', 'jabatan', 'area_tugas', 'regu', 'entity_pt', 'branch', 'email', 'no_telepon', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'alamat', 'no_rekening', 'bank', 'status_aktif', 'role'];
    const exampleRows = [
      ['NIK001', 'Budi Santoso', 'Security', 'Area Jakarta', 'Regu A', 'PT. PUTRA INDONESIA SOLUSI', 'Jakarta', 'budi@email.com', '08123456789', 'Laki-laki', 'Jakarta', '1990-01-01', 'Jl. Contoh No. 123', '1234567890', 'BCA', 'Aktif', 'Staff'],
      ['NIK002', 'Siti Aminah', 'Admin', 'Area Bandung', 'Non Regu', 'PT. PRESTASI INDONESIA SOLUSI', 'Bandung', 'siti@email.com', '08987654321', 'Perempuan', 'Bandung', '1992-05-15', 'Jl. Merdeka No. 45', '9876543210', 'Mandiri', 'Aktif', 'Staff']
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
    ws['!cols'] = headers.map(h => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_karyawan.xlsx');
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nik_karyawan: { type: "string" }, nama_lengkap: { type: "string" },
            jabatan: { type: "string" }, area_tugas: { type: "string" },
            regu: { type: "string" }, entity_pt: { type: "string" },
            branch: { type: "string" }, email: { type: "string" },
            no_telepon: { type: "string" }, status_aktif: { type: "string" },
            role: { type: "string" }, bank: { type: "string" }, no_rekening: { type: "string" }
          }
        }
      }
    });
    if (result.status === 'success' && Array.isArray(result.output)) {
      await base44.entities.Employee.bulkCreate(result.output);
      qc.invalidateQueries({ queryKey: ['employees-list'] });
      toast.success(`${result.output.length} karyawan berhasil diimport`);
    } else {
      toast.error('Gagal mengimport data');
    }
    setImporting(false);
    importRef.current.value = '';
  };

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees-list', employee?.area_tugas, isMasterAdmin],
    queryFn: () => isMasterAdmin
      ? base44.entities.Employee.list('-created_date', 500)
      : base44.entities.Employee.filter({ area_tugas: employee.area_tugas }, '-created_date', 500)
  });

  // Ambil area proyek untuk dropdown
  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  const filtered = employees.filter((e) => {
    const matchSearch = e.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
      e.nik_karyawan?.toLowerCase().includes(search.toLowerCase()) ||
      e.area_tugas?.toLowerCase().includes(search.toLowerCase());
    const matchArea = !filterArea || e.area_tugas === filterArea;
    return matchSearch && matchArea;
  });

  // Jabatan dari area yang dipilih, atau fallback ke default
  const getJabatanForArea = (areaNama) => {
    const area = areas.find((a) => a.nama_area === areaNama);
    if (area && area.jabatan_tersedia && area.jabatan_tersedia.length > 0) {
      return area.jabatan_tersedia;
    }
    return DEFAULT_JABATAN;
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    setBulkDeleting(true);
    for (const id of selectedIds) {
      await base44.entities.Employee.delete(id);
    }
    qc.invalidateQueries({ queryKey: ['employees-list'] });
    toast.success(`${selectedIds.length} karyawan berhasil dihapus`);
    setSelectedIds([]);
    setBulkDeleting(false);
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(e => e.id));

  const openEdit = (emp) => setEditing({
    id: emp.id,
    area_tugas: emp.area_tugas || '',
    jabatan: emp.jabatan || '',
    regu: emp.regu || '',
    status_aktif: emp.status_aktif || 'Aktif',
    _original_area: emp.area_tugas || ''
  });

  const handleSave = async () => {
    setSaving(true);
    const areaChanged = editing.area_tugas !== editing._original_area;
    const updateData = {
      area_tugas: editing.area_tugas,
      jabatan: editing.jabatan,
      regu: editing.regu,
      status_aktif: editing.status_aktif
    };
    if (areaChanged) {
      updateData.tanggal_mutasi = new Date().toISOString().slice(0, 10);
    }
    await base44.entities.Employee.update(editing.id, updateData);
    toast.success('Data karyawan berhasil diperbarui');
    qc.invalidateQueries({ queryKey: ['employees-list'] });
    setSaving(false);
    setEditing(null);
  };

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between flex-wrap">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Data Karyawan</h3>
        <div className="flex flex-wrap gap-2 items-center ml-auto">
          {isMasterAdmin && (
            <>
              <Button size="sm" onClick={() => setShowAdd(true)} className="bg-red-700 hover:bg-red-800 text-white h-9">
                <UserPlus className="w-4 h-4 mr-1" /> Tambah Manual
              </Button>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Template XLSX
              </Button>
              <Button size="sm" onClick={() => importRef.current?.click()} disabled={importing} className="bg-orange-500 hover:bg-orange-600 text-white h-9">
                <Upload className="w-4 h-4 mr-1" /> {importing ? 'Importing...' : 'Import XLSX'}
              </Button>
              <input ref={importRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
            </>
          )}
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="Filter Area" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Semua Area</SelectItem>
              {areas.map((a) => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Cari karyawan..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              {isMasterAdmin && <TableHead className="w-10"><Checkbox checked={selectedIds.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead>}
              <TableHead className="text-xs font-semibold">NIK Karyawan</TableHead>
              <TableHead className="text-xs font-semibold">Nama</TableHead>
              <TableHead className="text-xs font-semibold">Jabatan</TableHead>
              <TableHead className="text-xs font-semibold">Area Tugas</TableHead>
              <TableHead className="text-xs font-semibold">Regu</TableHead>
              <TableHead className="text-xs font-semibold">Tgl Mutasi</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ?
            <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Belum ada data karyawan</TableCell></TableRow> :
            filtered.map((e) =>
            <TableRow key={e.id} className={`hover:bg-gray-50/50 ${selectedIds.includes(e.id) ? 'bg-red-50' : ''}`}>
                {isMasterAdmin && <TableCell><Checkbox checked={selectedIds.includes(e.id)} onCheckedChange={() => toggleSelect(e.id)} onClick={ev => ev.stopPropagation()} /></TableCell>}
                <TableCell className="font-mono text-sm text-[var(--maroon)]">{e.nik_karyawan}</TableCell>
                <TableCell className="font-medium text-sm uppercase">{e.nama_lengkap}</TableCell>
                <TableCell className="text-sm text-gray-600 uppercase">{e.jabatan}</TableCell>
                <TableCell className="text-sm text-gray-600 uppercase">{e.area_tugas}</TableCell>
                <TableCell className="text-xs text-gray-500 uppercase">{e.regu || '-'}</TableCell>
                <TableCell className="text-xs">
                  {e.tanggal_mutasi ? (
                    <div>
                      <p className="text-orange-600 font-medium">{new Date(e.tanggal_mutasi).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  ) : <span className="text-gray-300">—</span>}
                </TableCell>
                <TableCell>
                  <Badge className={e.status_aktif === 'Aktif' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}>
                    {e.status_aktif || 'Aktif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelected(e)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="icon" className="bg-slate-950 text-white text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-8 w-8 hover:bg-orange-600" onClick={() => openEdit(e)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Karyawan</DialogTitle></DialogHeader>
          {selected &&
          <div className="space-y-4">
              <div className="flex items-center gap-4">
                {selected.foto ?
              <img src={selected.foto} alt="" className="w-16 h-16 rounded-full object-cover" /> :

              <div className="w-16 h-16 rounded-full bg-[var(--maroon-50)] flex items-center justify-center">
                    <UserCircle className="w-8 h-8 text-[var(--maroon)]" />
                  </div>
              }
                <div>
                  <p className="font-bold text-lg">{selected.nama_lengkap}</p>
                  <p className="text-sm text-[var(--maroon)] font-mono">{selected.nik_karyawan}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {Object.entries({
                'Jabatan': selected.jabatan, 'Area Tugas': selected.area_tugas,
                'Entity PT': selected.entity_pt, 'Branch': selected.branch,
                'Regu': selected.regu, 'Role': selected.role,
                'Tgl Bergabung': selected.tanggal_bergabung, 'No. Telepon': selected.no_telepon,
                'Email': selected.email, 'Jenis Kelamin': selected.jenis_kelamin,
                'Alamat': selected.alamat, 'Pendidikan': selected.pendidikan_terakhir,
                'Tgl Mutasi': selected.tanggal_mutasi ? new Date(selected.tanggal_mutasi).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : null
              }).filter(([, v]) => v).map(([k, v]) =>
              <div key={k}>
                    <p className="text-gray-400 text-xs">{k}</p>
                    <p className="font-medium">{v}</p>
                  </div>
              )}
              </div>
            </div>
          }
        </DialogContent>
      </Dialog>

      {isMasterAdmin && <BulkDeleteBar selectedCount={selectedIds.length} onDelete={handleBulkDelete} onClear={() => setSelectedIds([])} isDeleting={bulkDeleting} />}

      <AddEmployeeDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['employees-list'] })}
        areas={areas}
      />

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Data Karyawan</DialogTitle></DialogHeader>
          {editing &&
          <div className="space-y-3">
              {isMasterAdmin ? (
              <div>
                <Label className="text-xs">Area Tugas</Label>
                <Select value={editing.area_tugas} onValueChange={(v) => setEditing((p) => ({ ...p, area_tugas: v, jabatan: '' }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Pilih area..." /></SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              ) : (
              <div>
                <Label className="text-xs">Area Tugas</Label>
                <div className="mt-1 h-9 text-sm border rounded-md px-3 flex items-center bg-gray-50 text-gray-600">{editing.area_tugas}</div>
              </div>
              )}
              <div>
                <Label className="text-xs">Jabatan {editing.area_tugas && <span className="text-[var(--maroon)] font-normal">(sesuai {editing.area_tugas})</span>}</Label>
                <Select value={editing.jabatan} onValueChange={(v) => setEditing((p) => ({ ...p, jabatan: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Pilih jabatan..." /></SelectTrigger>
                  <SelectContent>
                    {getJabatanForArea(editing.area_tugas).map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Regu</Label>
                <Select value={editing.regu} onValueChange={(v) => setEditing((p) => ({ ...p, regu: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Pilih regu..." /></SelectTrigger>
                  <SelectContent>
                    {REGU_LIST.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status Aktif</Label>
                <Select value={editing.status_aktif} onValueChange={(v) => setEditing((p) => ({ ...p, status_aktif: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          }
        </DialogContent>
      </Dialog>
    </div>);

}