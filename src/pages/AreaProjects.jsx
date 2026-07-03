import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MapPin, Link as LinkIcon, Pencil, Trash2, X, QrCode, Shield, ClipboardList, Download, Upload, FileSpreadsheet, GripVertical, ChevronUp, ChevronDown, Eye, EyeOff, Search } from 'lucide-react';
import { useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import * as XLSX from 'xlsx';

const DEFAULT_JABATAN = ['Master Admin', 'Admin Pos', 'Chief Security', 'Leader Security', 'Supervisor Facility', 'Leader Facility', 'Staff', 'PIC Client'];
const ALL_MODULES = [
  'E-Absensi', 'Jadwal Shift', 'Validasi Timesheet', 'E-Patroli', 'E-Facility',
  'Hydrant & APAR', 'Box Emergency', 'KR 2/4', 'Checklist Toilet', 'Buku Tamu',
  'Paket Tenant', 'Inventaris', 'Task Board', 'Ticketing Fasilitas', 'Slip Gaji',
  'Laporan PDF', 'Laporan Harian', 'Daily Checklist', 'Serah Terima Shift',
  'Laporan Penyewa', 'Analitik Patroli', 'Cuti & Izin', 'Data Karyawan Area'
];

const emptyForm = { nama_area: '', alamat: '', pic_client: '', jabatan_tersedia: [...DEFAULT_JABATAN], menu_per_jabatan: {}, e_patrol_checkpoints: [], menu_items: ALL_MODULES.map((m) => ({ nama: m, aktif: true })), menu_roles: {} };

export default function AreaProjects() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [newJabatan, setNewJabatan] = useState('');
  const [newCheckpoint, setNewCheckpoint] = useState('');
  const [importing, setImporting] = useState(false);
  const importRef = useRef(null);
  const queryClient = useQueryClient();

  const downloadAreaTemplate = () => {
    const headers = ['nama_area', 'alamat', 'pic_client', 'status'];
    const exampleRows = [
      ['Area Contoh', 'Jl. Contoh No. 123', 'John Doe', 'Aktif'],
      ['Proyek Jakarta', 'Jakarta Pusat', 'Jane Smith', 'Aktif']
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
    ws['!cols'] = headers.map(h => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_area_projects.xlsx');
  };

  const handleImportArea = async (e) => {
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
            nama_area: { type: "string" }, alamat: { type: "string" },
            pic_client: { type: "string" }, status: { type: "string" }
          }
        }
      }
    });
    if (result.status === 'success' && Array.isArray(result.output)) {
      for (const row of result.output) {
        const code = Math.random().toString(36).slice(2, 10);
        await base44.entities.AreaProject.create({
          ...row,
          status: row.status || 'Aktif',
          link_absensi: code + '-abs',
          link_pelamar: code + '-apply',
          modules: ALL_MODULES
        });
      }
      queryClient.invalidateQueries({ queryKey: ['area-projects'] });
      toast.success(`${result.output.length} area berhasil diimport`);
    } else {
      toast.error('Gagal mengimport data');
    }
    setImporting(false);
    importRef.current.value = '';
  };

  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isAdmin = ['Master Admin', 'Admin Pos'].includes(employee?.role);

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['area-projects'],
    queryFn: () => base44.entities.AreaProject.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const code = Math.random().toString(36).slice(2, 10);
      return base44.entities.AreaProject.create({
        ...data,
        status: 'Aktif',
        link_absensi: code + '-abs',
        link_pelamar: code + '-apply',
        modules: ALL_MODULES
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['area-projects'] });
      setShowForm(false);
      setForm(emptyForm);
      toast.success('Area berhasil ditambahkan');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AreaProject.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['area-projects'] });
      setEditItem(null);
      setForm(emptyForm);
      toast.success('Area berhasil diperbarui');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AreaProject.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['area-projects'] });
      setDeleteId(null);
      toast.success('Area berhasil dihapus');
    }
  });

  const openEdit = (area) => {
    setEditItem(area);
    // Bangun menu_items dari data tersimpan atau default
    const savedMenuItems = area.menu_items && area.menu_items.length > 0
      ? area.menu_items
      : ALL_MODULES.map((m) => ({ nama: m, aktif: true }));
    setForm({
      nama_area: area.nama_area || '',
      alamat: area.alamat || '',
      pic_client: area.pic_client || '',
      jabatan_tersedia: area.jabatan_tersedia || [...DEFAULT_JABATAN],
      menu_per_jabatan: area.menu_per_jabatan || {},
      e_patrol_checkpoints: area.e_patrol_checkpoints || [],
      menu_items: savedMenuItems,
      menu_roles: area.menu_roles || {}
    });
  };

  // Fungsi pengelolaan menu items
  const removeMenuItem = (nama) => {
    setForm((prev) => ({ ...prev, menu_items: (prev.menu_items || []).filter((m) => m.nama !== nama) }));
  };

  const toggleMenuItemAktif = (nama) => {
    setForm((prev) => ({ ...prev, menu_items: (prev.menu_items || []).map((m) => m.nama === nama ? { ...m, aktif: !m.aktif } : m) }));
  };

  const moveMenuItem = (idx, dir) => {
    const items = [...(form.menu_items || [])];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
    setForm((prev) => ({ ...prev, menu_items: items }));
  };

  const toggleMenuRole = (menuNama, jabatan) => {
    setForm((prev) => {
      const current = prev.menu_roles || {};
      const roles = current[menuNama] || [];
      const updated = roles.includes(jabatan) ? roles.filter((r) => r !== jabatan) : [...roles, jabatan];
      return { ...prev, menu_roles: { ...current, [menuNama]: updated } };
    });
  };

  const addJabatan = () => {
    if (!newJabatan.trim()) return;
    setForm((prev) => ({ ...prev, jabatan_tersedia: [...(prev.jabatan_tersedia || []), newJabatan.trim()] }));
    setNewJabatan('');
  };

  const removeJabatan = (j) => {
    setForm((prev) => ({ ...prev, jabatan_tersedia: (prev.jabatan_tersedia || []).filter((x) => x !== j) }));
  };

  const addCheckpoint = () => {
    if (!newCheckpoint.trim()) return;
    setForm((prev) => ({
      ...prev,
      e_patrol_checkpoints: [...(prev.e_patrol_checkpoints || []), { nama: newCheckpoint.trim(), id: Date.now().toString() }]
    }));
    setNewCheckpoint('');
  };

  const removeCheckpoint = (id) => {
    setForm((prev) => ({
      ...prev,
      e_patrol_checkpoints: (prev.e_patrol_checkpoints || []).filter((c) => c.id !== id)
    }));
  };

  const toggleMenu = (jabatan, menu) => {
    setForm((prev) => {
      const current = prev.menu_per_jabatan || {};
      const jabatanMenus = current[jabatan] || [];
      const updated = jabatanMenus.includes(menu) ?
      jabatanMenus.filter((m) => m !== menu) :
      [...jabatanMenus, menu];
      return { ...prev, menu_per_jabatan: { ...current, [jabatan]: updated } };
    });
  };

  const handleSave = () => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const copyApplyLink = (area) => {
    navigator.clipboard.writeText(`${window.location.origin}/ApplyJob?code=${area.link_pelamar}`);
    toast.success('Link Pelamar disalin');
  };

  const copyAbsensiLink = (area) => {
    navigator.clipboard.writeText(`${window.location.origin}/InputAbsensi?area=${encodeURIComponent(area.nama_area)}`);
    toast.success('Link Absensi disalin');
  };

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between flex-wrap">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Cari area/proyek..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        {isAdmin &&
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadAreaTemplate}>
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Template XLSX
            </Button>
            <Button size="sm" onClick={() => importRef.current?.click()} disabled={importing} className="bg-orange-500 hover:bg-orange-600 text-white h-9">
              <Upload className="w-4 h-4 mr-1" /> {importing ? 'Importing...' : 'Import XLSX'}
            </Button>
            <input ref={importRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportArea} />
            <Button onClick={() => {setEditItem(null);setForm(emptyForm);setShowForm(true);}} className="bg-slate-950 text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-red-800 h-9">
              <Plus className="w-4 h-4 mr-2" /> Tambah Area
            </Button>
          </div>
        }
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {areas.filter(a => a.nama_area?.toLowerCase().includes(search.toLowerCase()) || a.alamat?.toLowerCase().includes(search.toLowerCase()) || a.pic_client?.toLowerCase().includes(search.toLowerCase())).map((area) =>
        <Card key={area.id} className="p-5 hover:shadow-md transition-shadow border-0 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[var(--maroon-50)]">
                  <MapPin className="w-4 h-4 text-[var(--maroon)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{area.nama_area}</h3>
                  <p className="text-xs text-gray-400">{area.alamat}</p>
                </div>
              </div>
              <Badge className={area.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600'}>
                {area.status}
              </Badge>
            </div>
            {area.pic_client && <p className="text-xs text-gray-500 mb-3">PIC: {area.pic_client}</p>}
            <div className="flex flex-wrap gap-1 mb-3">
              {ALL_MODULES.map((m) => {
              const enabled = (area.modules || []).includes(m);
              return (
                <Badge key={m} variant="outline" className={`text-[10px] py-0 ${enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                    {m}
                  </Badge>);

            })}
            </div>
            {area.e_patrol_checkpoints?.length > 0 &&
          <p className="text-xs text-gray-400 mb-3"><QrCode className="w-3 h-3 inline mr-1" />{area.e_patrol_checkpoints.length} titik patroli</p>
          }
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => copyApplyLink(area)}>
                <LinkIcon className="w-3 h-3 mr-1" /> Link Pelamar
              </Button>
              


            </div>
            {isAdmin &&
          <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => {openEdit(area);setShowForm(true);}}>
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeleteId(area.id)}>
                  <Trash2 className="w-3 h-3 mr-1" /> Hapus
                </Button>
              </div>
          }
          </Card>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => {setShowForm(v);if (!v) {setEditItem(null);setForm(emptyForm);}}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Area' : 'Tambah Area Baru'}</DialogTitle></DialogHeader>
          <Tabs defaultValue="info">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="jabatan">Jabatan</TabsTrigger>
              <TabsTrigger value="menu">Menu</TabsTrigger>
              
              <TabsTrigger value="patroli">Titik Patroli</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div><Label>Nama Area / Proyek</Label><Input value={form.nama_area} onChange={(e) => setForm({ ...form, nama_area: e.target.value })} onBlur={(e) => setForm((p) => ({ ...p, nama_area: e.target.value.toUpperCase() }))} onKeyDown={(e) => e.key === 'Enter' && setForm((p) => ({ ...p, nama_area: e.target.value.toUpperCase() }))} placeholder="Nama area..." /></div>
              <div><Label>Alamat</Label><Input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} onBlur={(e) => setForm((p) => ({ ...p, alamat: e.target.value.toUpperCase() }))} onKeyDown={(e) => e.key === 'Enter' && setForm((p) => ({ ...p, alamat: e.target.value.toUpperCase() }))} placeholder="Alamat..." /></div>
              <div><Label>PIC Client</Label><Input value={form.pic_client} onChange={(e) => setForm({ ...form, pic_client: e.target.value })} onBlur={(e) => setForm((p) => ({ ...p, pic_client: e.target.value.toUpperCase() }))} onKeyDown={(e) => e.key === 'Enter' && setForm((p) => ({ ...p, pic_client: e.target.value.toUpperCase() }))} placeholder="Nama PIC..." /></div>
            </TabsContent>

            <TabsContent value="jabatan" className="mt-4">
              <p className="text-xs text-gray-500 mb-3">Kelola jabatan yang tersedia di area ini. Jabatan ini akan muncul di form pelamar kerja.</p>
              <div className="flex gap-2 mb-3">
                <Input value={newJabatan} onChange={(e) => setNewJabatan(e.target.value.toUpperCase())} placeholder="Nama jabatan baru..." onKeyDown={(e) => e.key === 'Enter' && addJabatan()} />
                <Button onClick={addJabatan} className="bg-slate-950 text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 hover:bg-[var(--maroon-light)]"><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(form.jabatan_tersedia || []).map((j) =>
                <Badge key={j} variant="outline" className="flex items-center gap-1 py-1 px-2">
                    {j}
                    <button onClick={() => removeJabatan(j)} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </Badge>
                )}
              </div>
            </TabsContent>

            <TabsContent value="menu" className="mt-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700">
                ✓ Kelola item menu karyawan: tambah, hapus, ubah urutan, aktifkan/nonaktifkan, dan atur jabatan yang bisa melihatnya.
              </div>

              {/* Tambah Menu Baru - dropdown dari daftar tersedia */}
              <div className="relative">
                <p className="text-xs text-gray-500 mb-2">Pilih menu untuk ditambahkan:</p>
                <div className="flex flex-wrap gap-1.5 border rounded-lg p-2 bg-white max-h-36 overflow-y-auto">
                  {ALL_MODULES.filter(m => !(form.menu_items || []).find(mi => mi.nama === m)).map(m => (
                    <button
                      key={m}
                      onClick={() => {
                        setForm(prev => ({ ...prev, menu_items: [...(prev.menu_items || []), { nama: m, aktif: true }] }));
                      }}
                      className="text-xs px-2 py-1 rounded-lg bg-gray-100 hover:bg-[var(--maroon)] hover:text-white text-gray-700 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />{m}
                    </button>
                  ))}
                  {ALL_MODULES.filter(m => !(form.menu_items || []).find(mi => mi.nama === m)).length === 0 && (
                    <p className="text-xs text-gray-400 italic p-1">Semua menu sudah ditambahkan</p>
                  )}
                </div>
              </div>

              {/* Daftar Menu Items */}
              <div className="space-y-2 max-h-72 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                {(form.menu_items || []).length === 0 && <p className="text-xs text-gray-400 text-center py-4">Belum ada item menu</p>}
                {(form.menu_items || []).map((item, idx) => (
                  <div key={item.nama} className={`bg-white border rounded-lg px-3 py-2 ${!item.aktif ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      {/* Urutan */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button onClick={() => moveMenuItem(idx, -1)} disabled={idx === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
                        <button onClick={() => moveMenuItem(idx, 1)} disabled={idx === (form.menu_items || []).length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
                      </div>
                      <GripVertical className="w-3 h-3 text-gray-300 shrink-0" />
                      <span className="text-xs font-medium flex-1 truncate">{item.nama}</span>
                      {/* Aktif/Non-Aktif */}
                      <button onClick={() => toggleMenuItemAktif(item.nama)} className={`p-1 rounded ${item.aktif ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`} title={item.aktif ? 'Nonaktifkan' : 'Aktifkan'}>
                        {item.aktif ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      {/* Hapus */}
                      <button onClick={() => removeMenuItem(item.nama)} className="p-1 rounded text-red-400 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>

                    {/* Roles per menu */}
                    {item.aktif && (
                      <div className="mt-2 pl-8">
                        <p className="text-[10px] text-gray-400 mb-1">Tampilkan untuk jabatan:</p>
                        <div className="flex flex-wrap gap-1">
                          {(form.jabatan_tersedia || []).map((jab) => {
                            const roles = form.menu_roles?.[item.nama] || [];
                            const allSelected = roles.length === 0; // kosong = semua bisa lihat
                            const isSelected = roles.includes(jab);
                            return (
                              <button
                                key={jab}
                                onClick={() => toggleMenuRole(item.nama, jab)}
                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${isSelected ? 'bg-[var(--maroon)] text-white border-[var(--maroon)]' : 'bg-gray-100 text-gray-500 border-gray-200 hover:border-gray-400'}`}
                              >
                                {jab}
                              </button>
                            );
                          })}
                          {(form.menu_roles?.[item.nama] || []).length === 0 && (
                            <span className="text-[10px] text-blue-500 italic">Semua jabatan</span>
                          )}
                        </div>
                        {(form.menu_roles?.[item.nama] || []).length > 0 && (
                          <button onClick={() => setForm((prev) => ({ ...prev, menu_roles: { ...prev.menu_roles, [item.nama]: [] } }))} className="text-[10px] text-blue-500 hover:underline mt-1">Reset ke semua jabatan</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Akses per Jabatan (legacy) */}
              <details className="border rounded-lg">
                <summary className="px-3 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-50">▸ Pengaturan Akses per Jabatan (lama)</summary>
                <div className="p-3 space-y-3 max-h-60 overflow-y-auto">
                  {(form.jabatan_tersedia || []).map((jabatan) =>
                  <div key={jabatan} className="border rounded-lg p-3">
                      <p className="font-medium text-xs mb-2 text-[var(--maroon)]">{jabatan}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(form.menu_items || ALL_MODULES.map((m) => ({ nama: m, aktif: true }))).filter((m) => m.aktif).map(({ nama }) =>
                      <label key={nama} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={(form.menu_per_jabatan?.[jabatan] || []).includes(nama)} onChange={() => toggleMenu(jabatan, nama)} className="rounded" />
                            {nama}
                          </label>
                      )}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </TabsContent>

            <TabsContent value="layout" className="mt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-xs text-amber-700">
                🖥️ Atur tampilan layout dashboard karyawan berdasarkan jabatan di area ini. Pilih widget/kartu yang tampil di halaman utama karyawan.
              </div>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {(form.jabatan_tersedia || []).map((jabatan) => {
                  const layouts = form.layout_per_jabatan || {};
                  const selected = layouts[jabatan] || [];
                  const LAYOUT_OPTIONS = [
                  'Kartu Absensi', 'Ringkasan Shift', 'Notifikasi Tugas', 'Info Karyawan',
                  'Statistik Hadir', 'Jadwal Hari Ini', 'Inventaris Quick', 'Tiket Fasilitas',
                  'Daftar Tugas', 'Log Patroli', 'Paket Tenant', 'Buku Tamu', 'Slip Gaji Terakhir'];

                  return (
                    <div key={jabatan} className="border rounded-lg p-3">
                      <p className="font-medium text-sm mb-2 text-[var(--maroon)]">{jabatan}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {LAYOUT_OPTIONS.map((opt) =>
                        <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                            type="checkbox"
                            checked={selected.includes(opt)}
                            onChange={() => {
                              const updated = selected.includes(opt) ?
                              selected.filter((x) => x !== opt) :
                              [...selected, opt];
                              setForm((prev) => ({
                                ...prev,
                                layout_per_jabatan: { ...(prev.layout_per_jabatan || {}), [jabatan]: updated }
                              }));
                            }}
                            className="rounded" />
                          
                            {opt}
                          </label>
                        )}
                      </div>
                    </div>);

                })}
              </div>
            </TabsContent>

            <TabsContent value="patroli" className="mt-4">
              <p className="text-xs text-gray-500 mb-3">Tambahkan titik-titik E-Patrol. Setiap titik akan memiliki barcode unik.</p>
              <div className="flex gap-2 mb-3">
                <Input value={newCheckpoint} onChange={(e) => setNewCheckpoint(e.target.value.toUpperCase())} placeholder="Nama titik patroli..." onKeyDown={(e) => e.key === 'Enter' && addCheckpoint()} />
                <Button onClick={addCheckpoint} className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(form.e_patrol_checkpoints || []).map((cp, idx) =>
                <div key={cp.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{cp.nama}</span>
                    </div>
                    <button onClick={() => removeCheckpoint(cp.id)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                )}
                {!(form.e_patrol_checkpoints || []).length && <p className="text-xs text-gray-400 text-center py-4">Belum ada titik patroli</p>}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="bg-slate-50 text-[hsl(var(--foreground))] flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={() => {setShowForm(false);setEditItem(null);setForm(emptyForm);}}>Batal</Button>
            <Button onClick={handleSave} disabled={!form.nama_area || createMutation.isPending || updateMutation.isPending} className="bg-slate-950 text-[hsl(var(--background))] px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 hover:bg-[var(--maroon-light)]">
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Area?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Data area ini akan dihapus permanen. Lanjutkan?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white">Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}