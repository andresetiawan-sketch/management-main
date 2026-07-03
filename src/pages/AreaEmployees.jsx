import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, UserCircle, Eye, Download, FileText, Image,
  Phone, MapPin, Calendar, Briefcase, Users, ArrowLeft,
  ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react';
import { createPageUrl } from '@/utils';

const DOC_LABELS = {
  foto_ektp: 'Foto E-KTP',
  foto_skck: 'SKCK',
  foto_kk: 'Kartu Keluarga',
  foto_npwp: 'NPWP',
  foto_sim: 'SIM',
  foto_cv: 'CV',
  foto_surat_sehat: 'Surat Sehat',
  foto_setengah_badan: 'Foto Setengah Badan',
  foto_kta: 'KTA',
};

function DocButton({ label, url }) {
  if (!url) return null;
  const isImage = /\.(jpg|jpeg|png|webp|gif)/i.test(url) || url.includes('supabase');
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-xs text-gray-700 hover:text-blue-700"
    >
      {isImage ? <Image className="w-3.5 h-3.5 shrink-0" /> : <FileText className="w-3.5 h-3.5 shrink-0" />}
      <span className="truncate">{label}</span>
      <ExternalLink className="w-3 h-3 ml-auto shrink-0 opacity-60" />
    </a>
  );
}

function ApplicantDocs({ applicant }) {
  const [open, setOpen] = useState(false);
  const docs = Object.entries(DOC_LABELS).filter(([key]) => !!applicant[key]);
  if (docs.length === 0) return <p className="text-xs text-gray-400 italic">Tidak ada file lamaran tersimpan</p>;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {docs.length} File Lamaran {open ? '(sembunyikan)' : '(tampilkan)'}
      </button>
      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {docs.map(([key, label]) => (
            <DocButton key={key} label={label} url={applicant[key]} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AreaEmployees() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [filterRegu, setFilterRegu] = useState('all');

  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';
  const userArea = employee?.area_tugas || '';

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['area-employees', userArea, isMasterAdmin],
    queryFn: () => isMasterAdmin
      ? base44.entities.Employee.filter({ status_aktif: 'Aktif' }, '-created_date', 500)
      : base44.entities.Employee.filter({ area_tugas: userArea, status_aktif: 'Aktif' }, '-created_date', 500),
  });

  // Fetch applicants yang sudah Approved untuk dicocokkan
  const { data: applicants = [] } = useQuery({
    queryKey: ['approved-applicants'],
    queryFn: () => base44.entities.Applicant.filter({ status: 'Approved' }, '-created_date', 500),
  });

  const applicantMap = {};
  applicants.forEach(a => {
    if (a.nik_karyawan) applicantMap[a.nik_karyawan] = a;
    if (a.nik_ektp) applicantMap[a.nik_ektp] = a;
  });

  const getApplicant = (emp) =>
    applicantMap[emp.nik_karyawan] ||
    applicants.find(a => a.nama_lengkap?.toLowerCase() === emp.nama_lengkap?.toLowerCase());

  const reguList = [...new Set(employees.map(e => e.regu).filter(Boolean))].sort();

  const filtered = employees.filter(e => {
    const matchSearch =
      e.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
      e.nik_karyawan?.toLowerCase().includes(search.toLowerCase()) ||
      e.jabatan?.toLowerCase().includes(search.toLowerCase());
    const matchRegu = filterRegu === 'all' || e.regu === filterRegu;
    return matchSearch && matchRegu;
  });

  const selectedApplicant = selected ? getApplicant(selected) : null;

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="text-gray-500 -ml-1">
          <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
        </Button>
      </div>

      <Card className="p-5 border-0 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-red-700" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-800">Data Karyawan Area</h1>
            <p className="text-xs text-gray-500">{isMasterAdmin ? 'Semua area' : userArea} · {filtered.length} karyawan aktif</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cari nama / NIK / jabatan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setFilterRegu('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterRegu === 'all' ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Semua Regu
            </button>
            {reguList.map(r => (
              <button
                key={r}
                onClick={() => setFilterRegu(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterRegu === r ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Employee Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Belum ada data karyawan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(emp => {
              const appl = getApplicant(emp);
              const hasFiles = appl && Object.keys(DOC_LABELS).some(k => !!appl[k]);
              return (
                <div
                  key={emp.id}
                  className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-start gap-3">
                    {emp.foto
                      ? <img src={emp.foto} alt="" className="w-12 h-12 rounded-full object-cover border shrink-0" />
                      : <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                          <span className="text-red-700 font-bold text-lg">{(emp.nama_lengkap || 'A')[0]}</span>
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800 truncate">{emp.nama_lengkap}</p>
                      <p className="text-xs text-gray-400 font-mono">{emp.nik_karyawan}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <Badge className="text-[10px] bg-gray-100 text-gray-600 border-0 py-0">{emp.jabatan || '-'}</Badge>
                        {emp.regu && <Badge className="text-[10px] bg-blue-100 text-blue-700 border-0 py-0">{emp.regu}</Badge>}
                        {isMasterAdmin && emp.area_tugas && <Badge className="text-[10px] bg-purple-100 text-purple-700 border-0 py-0">{emp.area_tugas}</Badge>}
                        {hasFiles && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0 py-0">Ada Berkas</Badge>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => setSelected(emp)}
                    >
                      <Eye className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Karyawan</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              {/* Profile header */}
              <div className="flex items-center gap-4">
                {selected.foto
                  ? <img src={selected.foto} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-gray-100" />
                  : <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                      <UserCircle className="w-10 h-10 text-red-300" />
                    </div>
                }
                <div>
                  <p className="text-xl font-bold text-gray-800">{selected.nama_lengkap}</p>
                  <p className="text-sm text-red-700 font-mono">{selected.nik_karyawan}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge className="bg-gray-100 text-gray-700 border-0 text-xs">{selected.jabatan}</Badge>
                    {selected.regu && <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">{selected.regu}</Badge>}
                    <Badge className={`border-0 text-xs ${selected.status_aktif === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {selected.status_aktif || 'Aktif'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { icon: MapPin, label: 'Area Tugas', value: selected.area_tugas },
                  { icon: Briefcase, label: 'Entity PT', value: selected.entity_pt },
                  { icon: Phone, label: 'No. Telepon', value: selected.no_telepon },
                  { icon: Calendar, label: 'Tgl Bergabung', value: selected.tanggal_bergabung ? new Date(selected.tanggal_bergabung).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : null },
                  { icon: UserCircle, label: 'Jenis Kelamin', value: selected.jenis_kelamin },
                  { icon: Calendar, label: 'Tgl Lahir', value: selected.tanggal_lahir ? new Date(selected.tanggal_lahir).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : null },
                  { icon: MapPin, label: 'Alamat', value: selected.alamat },
                  { icon: Briefcase, label: 'Pendidikan', value: selected.pendidikan_terakhir },
                ].filter(f => f.value).map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2">
                    <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400">{label}</p>
                      <p className="text-sm font-medium text-gray-700">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Applicant / Berkas Lamaran */}
              <div className="border-t pt-4">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" /> Berkas Lamaran
                </p>
                {selectedApplicant ? (
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 grid grid-cols-2 gap-2">
                      {selectedApplicant.area_client && <div><span className="text-blue-400">Area Client:</span> {selectedApplicant.area_client}</div>}
                      {selectedApplicant.posisi_diinginkan && <div><span className="text-blue-400">Posisi:</span> {selectedApplicant.posisi_diinginkan}</div>}
                      {selectedApplicant.nik_ektp && <div><span className="text-blue-400">NIK E-KTP:</span> {selectedApplicant.nik_ektp}</div>}
                      {selectedApplicant.no_telepon && <div><span className="text-blue-400">No. HP:</span> {selectedApplicant.no_telepon}</div>}
                    </div>
                    <ApplicantDocs applicant={selectedApplicant} />
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <FileText className="w-8 h-8 text-gray-200 mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Data lamaran tidak ditemukan</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">Karyawan mungkin ditambahkan manual tanpa form lamaran</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}