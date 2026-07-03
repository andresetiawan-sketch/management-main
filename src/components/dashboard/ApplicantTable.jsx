import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, CheckCircle, XCircle, Search, Pencil } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/cloudflareClient';
import { format } from 'date-fns';
import EditApplicantDialog from '@/components/applicants/EditApplicantDialog';

const statusColor = {
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Rejected: "bg-red-100 text-red-800 border-red-200"
};

export default function ApplicantTable({ applicants = [], onRefresh, renderStatusCell, selectedIds = [], onToggleSelect, onToggleAll, isMasterAdmin = false }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [editApplicant, setEditApplicant] = useState(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveApplicant, setApproveApplicant] = useState(null);
  const [selectedPT, setSelectedPT] = useState('');
  const [processing, setProcessing] = useState(false);

  const filtered = applicants.filter((a) => {
    const matchSearch = a.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
    a.nik_ektp?.includes(search) || a.area_client?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleApprove = async () => {
    if (!selectedPT || !approveApplicant) return;
    setProcessing(true);
    const prefix = selectedPT === 'PT. PUTRA INDONESIA SOLUSI' ? 'PU0720' : 'PR0720';
    const year = new Date().getFullYear();
    const yy = String(year).slice(-2);

    let counters = await base44.entities.NikCounter.filter({ tahun: year, prefix });
    let counter;
    if (counters.length === 0) {
      counter = await base44.entities.NikCounter.create({ tahun: year, prefix, last_number: 0 });
    } else {
      counter = counters[0];
    }
    const nextNum = (counter.last_number || 0) + 1;
    const nik = `${prefix}${yy}${String(nextNum).padStart(3, '0')}`;

    await base44.entities.NikCounter.update(counter.id, { last_number: nextNum });
    await base44.entities.Applicant.update(approveApplicant.id, {
      status: 'Approved',
      nik_karyawan: nik,
      entity_pt: selectedPT
    });

    await base44.entities.Employee.create({
      nik_karyawan: nik,
      nama_lengkap: approveApplicant.nama_lengkap,
      jabatan: approveApplicant.posisi_diinginkan || 'Staff',
      foto: approveApplicant.foto_setengah_badan,
      area_tugas: approveApplicant.area_client,
      tanggal_bergabung: format(new Date(), 'yyyy-MM-dd'),
      entity_pt: selectedPT,
      branch: approveApplicant.branch,
      password: '123456',
      email: approveApplicant.email,
      no_telepon: approveApplicant.no_telepon,
      jenis_kelamin: approveApplicant.jenis_kelamin,
      tempat_lahir: approveApplicant.tempat_lahir,
      tanggal_lahir: approveApplicant.tanggal_lahir,
      alamat: approveApplicant.alamat_ektp,
      tinggi_badan: approveApplicant.tinggi_badan,
      berat_badan: approveApplicant.berat_badan,
      ukuran_baju: approveApplicant.ukuran_baju,
      ukuran_sepatu: approveApplicant.ukuran_sepatu,
      pendidikan_terakhir: approveApplicant.ijazah_terakhir,
      role: 'Staff',
      status_aktif: 'Aktif',
      applicant_id: String(approveApplicant.id)
    });

    setProcessing(false);
    setShowApproveDialog(false);
    setApproveApplicant(null);
    setSelectedPT('');
    onRefresh?.();
  };

  const handleReject = async (applicant) => {
    await base44.entities.Applicant.update(applicant.id, { status: 'Rejected' });
    onRefresh?.();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border-0 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Data Pelamar</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Cari nama, NIK, area..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              {isMasterAdmin && <TableHead className="w-10"><Checkbox checked={selectedIds.length === filtered.length && filtered.length > 0} onCheckedChange={() => onToggleAll?.(filtered.map(a => a.id))} /></TableHead>}
              <TableHead className="text-xs font-semibold">Nama</TableHead>
              <TableHead className="text-xs font-semibold">NIK E-KTP</TableHead>
              <TableHead className="text-xs font-semibold">Area</TableHead>
              <TableHead className="text-xs font-semibold">Posisi</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold">NIK Karyawan</TableHead>
              <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ?
            <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Belum ada data pelamar</TableCell></TableRow> :
            filtered.map((a) =>
            <TableRow key={a.id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.includes(a.id) ? 'bg-red-50' : ''}`}>
                {isMasterAdmin && <TableCell><Checkbox checked={selectedIds.includes(a.id)} onCheckedChange={() => onToggleSelect?.(a.id)} onClick={ev => ev.stopPropagation()} /></TableCell>}
                <TableCell className="font-medium text-sm">{a.nama_lengkap}</TableCell>
                <TableCell className="text-sm text-gray-600">{a.nik_ektp}</TableCell>
                <TableCell className="text-sm text-gray-600">{a.area_client}</TableCell>
                <TableCell className="text-sm text-gray-600">{a.posisi_diinginkan}</TableCell>
                <TableCell>
                  {renderStatusCell ? renderStatusCell(a) :
                <Badge className={`${statusColor[a.status || 'Pending']} border text-xs`}>
                      {a.status || 'Pending'}
                    </Badge>
                }
                </TableCell>
                <TableCell className="text-sm font-mono text-[var(--maroon)]">{a.nik_karyawan || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedApplicant(a)}>
                       <Eye className="w-4 h-4" />
                     </Button>
                     <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:text-blue-700" onClick={() => setEditApplicant(a)}>
                       <Pencil className="w-4 h-4" />
                     </Button>
                     {a.status === 'Pending' &&
                  <>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:text-emerald-700" onClick={() => {setApproveApplicant(a);setShowApproveDialog(true);}}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleReject(a)}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                  }
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedApplicant} onOpenChange={() => setSelectedApplicant(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Pelamar</DialogTitle>
          </DialogHeader>
          {selectedApplicant &&
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {selectedApplicant.foto_setengah_badan &&
            <div className="col-span-full flex justify-center">
                  <img src={selectedApplicant.foto_setengah_badan} alt="Foto" className="w-32 h-40 object-cover rounded-xl" />
                </div>
            }
              {Object.entries({
              'Nama Lengkap': selectedApplicant.nama_lengkap,
              'NIK E-KTP': selectedApplicant.nik_ektp,
              'Jenis Kelamin': selectedApplicant.jenis_kelamin,
              'Tempat/Tgl Lahir': `${selectedApplicant.tempat_lahir || ''}, ${selectedApplicant.tanggal_lahir || ''}`,
              'Usia': selectedApplicant.usia,
              'Email': selectedApplicant.email,
              'No. Telepon': selectedApplicant.no_telepon,
              'Alamat E-KTP': selectedApplicant.alamat_ektp,
              'Area Client': selectedApplicant.area_client,
              'Posisi': selectedApplicant.posisi_diinginkan,
              'Branch': selectedApplicant.branch,
              'Pendidikan Terakhir': selectedApplicant.ijazah_terakhir,
              'Tinggi/Berat': `${selectedApplicant.tinggi_badan || '-'} cm / ${selectedApplicant.berat_badan || '-'} kg`,
              'Ukuran Baju/Sepatu': `${selectedApplicant.ukuran_baju || '-'} / ${selectedApplicant.ukuran_sepatu || '-'}`,
              'Nama Ibu': selectedApplicant.nama_ibu_kandung,
              'No. Telp Ibu': selectedApplicant.no_telp_ibu,
              'No. KK': selectedApplicant.no_kk,
              'No. NPWP': selectedApplicant.no_npwp,
              'SIM': selectedApplicant.sim_type,
              'NIK Karyawan': selectedApplicant.nik_karyawan,
              'Entity PT': selectedApplicant.entity_pt
            }).filter(([, v]) => v).map(([k, v]) =>
            <div key={k}>
                  <p className="text-gray-500 text-xs">{k}</p>
                  <p className="font-medium">{v}</p>
                </div>
            )}
              <div className="col-span-full grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                {[
              { label: 'E-KTP', url: selectedApplicant.foto_ektp },
              { label: 'KK', url: selectedApplicant.foto_kk },
              { label: 'NPWP', url: selectedApplicant.foto_npwp },
              { label: 'SKCK', url: selectedApplicant.foto_skck },
              { label: 'SIM', url: selectedApplicant.foto_sim },
              { label: 'CV', url: selectedApplicant.foto_cv },
              { label: 'Surat Sehat', url: selectedApplicant.foto_surat_sehat },
              { label: 'KTA', url: selectedApplicant.foto_kta }].
              filter((d) => d.url).map((d) =>
              <a key={d.label} href={d.url} target="_blank" rel="noopener noreferrer" className="text-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <p className="text-xs text-[var(--maroon)] font-medium">{d.label}</p>
                  </a>
              )}
              </div>
            </div>
          }
        </DialogContent>
      </Dialog>

      <EditApplicantDialog
        open={!!editApplicant}
        applicant={editApplicant}
        onClose={() => setEditApplicant(null)}
        onSuccess={() => onRefresh?.()} />
      

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={(v) => {if (!v) {setShowApproveDialog(false);setApproveApplicant(null);}}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Pelamar</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-4">
            Pilih PT untuk <span className="font-semibold">{approveApplicant?.nama_lengkap}</span>:
          </p>
          <Select value={selectedPT} onValueChange={setSelectedPT}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih PT..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PT. PUTRA INDONESIA SOLUSI">PT. PUTRA INDONESIA SOLUSI</SelectItem>
              <SelectItem value="PT. PRESTASI INDONESIA SOLUSI">PT. PRESTASI INDONESIA SOLUSI</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Batal</Button>
            <Button onClick={handleApprove} disabled={!selectedPT || processing} className="bg-[#180202] text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 hover:bg-[var(--maroon-light)]">
              {processing ? 'Memproses...' : 'Approve & Generate NIK'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}