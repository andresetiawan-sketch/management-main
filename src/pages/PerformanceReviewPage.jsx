import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Star, User, Search, TrendingUp, Calendar, FileText, Plus, Eye, CheckCircle2, ClipboardList } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const REVIEWER_ROLES = ['Master Admin', 'Admin Pos', 'Chief Security', 'Leader Security', 'Supervisor Facility', 'Leader Facility'];

const GRADE_CONFIG = {
  A: { color: 'bg-emerald-100 text-emerald-700', label: 'A - Sangat Baik', min: 85 },
  B: { color: 'bg-blue-100 text-blue-700', label: 'B - Baik', min: 70 },
  C: { color: 'bg-amber-100 text-amber-700', label: 'C - Cukup', min: 55 },
  D: { color: 'bg-red-100 text-red-700', label: 'D - Perlu Perbaikan', min: 0 },
};

const SKOR_CRITERIA = [
  { key: 'skor_kehadiran', label: 'Kehadiran & Ketepatan Waktu' },
  { key: 'skor_disiplin', label: 'Kedisiplinan & Kepatuhan SOP' },
  { key: 'skor_kinerja', label: 'Kinerja & Penyelesaian Tugas' },
  { key: 'skor_kerjasama', label: 'Kerjasama Tim' },
  { key: 'skor_inisiatif', label: 'Inisiatif & Tanggung Jawab' },
];

function calcGrade(total) {
  if (total >= 85) return 'A';
  if (total >= 70) return 'B';
  if (total >= 55) return 'C';
  return 'D';
}

function ScoreSlider({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-xs text-gray-600">{label}</label>
        <span className={`text-sm font-bold w-10 text-right ${value >= 85 ? 'text-emerald-600' : value >= 70 ? 'text-blue-600' : value >= 55 ? 'text-amber-600' : 'text-red-500'}`}>{value}</span>
      </div>
      <input
        type="range" min={0} max={100} step={5} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-red-700"
      />
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
      </div>
    </div>
  );
}

const PERIODE_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

export default function PerformanceReviewPage() {
  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isReviewer = REVIEWER_ROLES.includes(employee?.role) || REVIEWER_ROLES.includes(employee?.jabatan) || employee?.role === 'Master Admin';
  const isMasterAdmin = employee?.role === 'Master Admin';

  const [periode, setPeriode] = useState(PERIODE_OPTIONS[1]); // bulan lalu
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    skor_kehadiran: 75, skor_disiplin: 75, skor_kinerja: 75, skor_kerjasama: 75, skor_inisiatif: 75,
    catatan_kehadiran: '', catatan_kinerja: '', rekomendasi: '', status: 'Draft'
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-review', employee?.area_tugas, isMasterAdmin],
    queryFn: () => isMasterAdmin
      ? base44.entities.Employee.filter({ status_aktif: 'Aktif' })
      : base44.entities.Employee.filter({ area_tugas: employee.area_tugas, status_aktif: 'Aktif' }),
    enabled: isReviewer
  });

  // Fetch existing reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ['performance-reviews', periode, employee?.area_tugas, isMasterAdmin],
    queryFn: () => isMasterAdmin
      ? base44.entities.PerformanceReview.filter({ periode })
      : base44.entities.PerformanceReview.filter({ periode, area_tugas: employee.area_tugas }),
  });

  // Fetch attendance data for selected employee in periode
  const [year, month] = periode.split('-');
  const startDate = `${year}-${month}-01`;
  const endDate = format(endOfMonth(new Date(Number(year), Number(month) - 1)), 'yyyy-MM-dd');

  const { data: attData = [] } = useQuery({
    queryKey: ['att-review', selectedEmployee?.nik_karyawan, periode],
    queryFn: () => base44.entities.Attendance.filter({ nik_karyawan: selectedEmployee.nik_karyawan }),
    enabled: !!selectedEmployee,
    select: (data) => data.filter(a => a.tanggal >= startDate && a.tanggal <= endDate)
  });

  const { data: laporanData = [] } = useQuery({
    queryKey: ['laporan-review', selectedEmployee?.nik_karyawan, periode],
    queryFn: () => base44.entities.LaporanHarian.filter({ nik_karyawan: selectedEmployee.nik_karyawan }),
    enabled: !!selectedEmployee,
    select: (data) => data.filter(l => l.tanggal >= startDate && l.tanggal <= endDate)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PerformanceReview.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      setShowForm(false);
      setSelectedEmployee(null);
      toast.success('Penilaian berhasil disimpan');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PerformanceReview.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      setShowDetail(null);
      toast.success('Penilaian diperbarui');
    }
  });

  const handleOpenForm = (emp) => {
    setSelectedEmployee(emp);
    setForm({ skor_kehadiran: 75, skor_disiplin: 75, skor_kinerja: 75, skor_kerjasama: 75, skor_inisiatif: 75, catatan_kehadiran: '', catatan_kinerja: '', rekomendasi: '', status: 'Draft' });
    setShowForm(true);
  };

  const handleSave = (status) => {
    const scores = [form.skor_kehadiran, form.skor_disiplin, form.skor_kinerja, form.skor_kerjasama, form.skor_inisiatif];
    const skor_total = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const grade = calcGrade(skor_total);
    const hadir = attData.filter(a => a.status === 'Hadir' || a.status === 'Backup').length;

    createMutation.mutate({
      nik_karyawan: selectedEmployee.nik_karyawan,
      nama_karyawan: selectedEmployee.nama_lengkap,
      jabatan: selectedEmployee.jabatan,
      area_tugas: selectedEmployee.area_tugas,
      periode,
      nik_reviewer: employee.nik_karyawan,
      nama_reviewer: employee.nama_lengkap,
      jabatan_reviewer: employee.jabatan || employee.role,
      ...form,
      skor_total,
      grade,
      status,
      data_kehadiran: {
        total_hadir: hadir,
        total_izin: attData.filter(a => a.status === 'Izin').length,
        total_sakit: attData.filter(a => a.status === 'Sakit').length,
        total_alfa: attData.filter(a => a.status === 'Alfa').length,
      },
      data_laporan: { total_laporan: laporanData.length }
    });
  };

  const reviewedNiks = new Set(reviews.map(r => r.nik_karyawan));
  const staffEmployees = employees.filter(e =>
    e.nik_karyawan !== employee.nik_karyawan &&
    !REVIEWER_ROLES.includes(e.jabatan) &&
    (search === '' || e.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) || e.nik_karyawan?.includes(search))
  );

  const periodeLabel = new Date(Number(year), Number(month) - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  // For staff: show their own reviews
  const myReviews = !isReviewer ? reviews.filter(r => r.nik_karyawan === employee.nik_karyawan) : [];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-700" /> Penilaian Kinerja
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Evaluasi bulanan berdasarkan data kehadiran & aktivitas</p>
        </div>
        <Select value={periode} onValueChange={setPeriode}>
          <SelectTrigger className="w-44 h-9">
            <Calendar className="w-4 h-4 mr-1 text-gray-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODE_OPTIONS.map(p => {
              const [y, m] = p.split('-');
              return <SelectItem key={p} value={p}>{new Date(Number(y), Number(m) - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats (reviewer only) */}
      {isReviewer && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(GRADE_CONFIG).map(([g, cfg]) => {
            const count = reviews.filter(r => r.grade === g).length;
            return (
              <Card key={g} className="p-3 border-0 shadow-sm text-center">
                <p className={`text-xl font-bold rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-1 ${cfg.color}`}>{g}</p>
                <p className="text-lg font-bold text-gray-800">{count}</p>
                <p className="text-[10px] text-gray-400">karyawan</p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reviewer View: Staff List */}
      {isReviewer && (
        <Card className="border-0 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / NIK..." className="pl-9 h-9 text-sm" />
              </div>
              <Badge className="bg-blue-100 text-blue-700 border-0">{periodeLabel}</Badge>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {staffEmployees.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">Tidak ada data karyawan</div>
            )}
            {staffEmployees.map(emp => {
              const reviewed = reviewedNiks.has(emp.nik_karyawan);
              const rev = reviews.find(r => r.nik_karyawan === emp.nik_karyawan);
              return (
                <div key={emp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-sm font-bold text-red-700 shrink-0">
                    {(emp.nama_lengkap || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{emp.nama_lengkap}</p>
                    <p className="text-xs text-gray-400">{emp.nik_karyawan} · {emp.jabatan}</p>
                  </div>
                  {reviewed && rev ? (
                    <div className="flex items-center gap-2">
                      <Badge className={`border-0 text-xs ${GRADE_CONFIG[rev.grade]?.color}`}>{rev.grade} · {rev.skor_total}</Badge>
                      <Badge className={`border-0 text-xs ${rev.status === 'Final' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{rev.status}</Badge>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowDetail(rev)}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Detail
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => handleOpenForm(emp)} className="h-7 text-xs bg-red-700 hover:bg-red-800 text-white">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Nilai
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Staff view: show own reviews */}
      {!isReviewer && (
        <div className="space-y-3">
          {myReviews.length === 0 ? (
            <Card className="p-8 border-0 shadow-sm text-center">
              <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Belum ada penilaian kinerja untuk periode ini</p>
            </Card>
          ) : myReviews.map(rev => (
            <Card key={rev.id} className="p-4 border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowDetail(rev)}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-700">{new Date(Number(rev.periode.split('-')[0]), Number(rev.periode.split('-')[1]) - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</p>
                  <p className="text-xs text-gray-400">Dinilai oleh: {rev.nama_reviewer}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`border-0 text-sm font-bold px-3 ${GRADE_CONFIG[rev.grade]?.color}`}>{rev.grade}</Badge>
                  <Badge className={`border-0 text-xs ${rev.status === 'Final' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{rev.status}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {SKOR_CRITERIA.map(c => (
                  <div key={c.key} className="text-center">
                    <p className="text-[10px] text-gray-400 leading-tight mb-1">{c.label.split(' ')[0]}</p>
                    <p className="text-sm font-bold text-gray-700">{rev[c.key]}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                <p className="text-xs text-gray-400">Skor total</p>
                <p className="text-base font-bold text-red-700">{rev.skor_total}/100</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setSelectedEmployee(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Nilai Kinerja — {selectedEmployee?.nama_lengkap}
            </DialogTitle>
            <p className="text-xs text-gray-400 mt-1">{periodeLabel} · {selectedEmployee?.jabatan}</p>
          </DialogHeader>

          {/* Activity Summary */}
          {selectedEmployee && (
            <div className="grid grid-cols-4 gap-2 bg-blue-50 rounded-xl p-3">
              <div className="text-center">
                <p className="text-lg font-bold text-blue-700">{attData.filter(a => ['Hadir','Backup'].includes(a.status)).length}</p>
                <p className="text-[10px] text-blue-500">Hadir</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-600">{attData.filter(a => a.status === 'Izin').length}</p>
                <p className="text-[10px] text-amber-500">Izin</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-orange-600">{attData.filter(a => a.status === 'Sakit').length}</p>
                <p className="text-[10px] text-orange-500">Sakit</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-600">{attData.filter(a => a.status === 'Alfa').length}</p>
                <p className="text-[10px] text-red-500">Alfa</p>
              </div>
              <div className="col-span-4 text-center border-t border-blue-100 pt-2 mt-1">
                <p className="text-xs text-blue-600"><FileText className="w-3 h-3 inline mr-1" />{laporanData.length} laporan harian disubmit bulan ini</p>
              </div>
            </div>
          )}

          {/* Score Sliders */}
          <div className="space-y-4">
            {SKOR_CRITERIA.map(c => (
              <ScoreSlider
                key={c.key}
                label={c.label}
                value={form[c.key]}
                onChange={v => setForm(p => ({ ...p, [c.key]: v }))}
              />
            ))}
          </div>

          {/* Total preview */}
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">Skor Total & Grade</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-gray-800">
                {Math.round([form.skor_kehadiran, form.skor_disiplin, form.skor_kinerja, form.skor_kerjasama, form.skor_inisiatif].reduce((a, b) => a + b, 0) / 5)}
              </p>
              <Badge className={`border-0 text-sm font-bold ${GRADE_CONFIG[calcGrade(Math.round([form.skor_kehadiran, form.skor_disiplin, form.skor_kinerja, form.skor_kerjasama, form.skor_inisiatif].reduce((a,b)=>a+b,0)/5))]?.color}`}>
                {calcGrade(Math.round([form.skor_kehadiran, form.skor_disiplin, form.skor_kinerja, form.skor_kerjasama, form.skor_inisiatif].reduce((a,b)=>a+b,0)/5))}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Catatan Kehadiran</Label>
              <Textarea value={form.catatan_kehadiran} onChange={e => setForm(p => ({ ...p, catatan_kehadiran: e.target.value }))} className="h-16 text-xs resize-none mt-1" placeholder="Catatan terkait kehadiran dan ketepatan waktu..." />
            </div>
            <div>
              <Label className="text-xs">Catatan Kinerja</Label>
              <Textarea value={form.catatan_kinerja} onChange={e => setForm(p => ({ ...p, catatan_kinerja: e.target.value }))} className="h-16 text-xs resize-none mt-1" placeholder="Evaluasi kinerja secara umum..." />
            </div>
            <div>
              <Label className="text-xs">Rekomendasi</Label>
              <Textarea value={form.rekomendasi} onChange={e => setForm(p => ({ ...p, rekomendasi: e.target.value }))} className="h-16 text-xs resize-none mt-1" placeholder="Rekomendasi pengembangan, promosi, atau tindak lanjut..." />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button variant="outline" onClick={() => handleSave('Draft')} disabled={createMutation.isPending} className="border-blue-300 text-blue-700">Simpan Draft</Button>
            <Button onClick={() => handleSave('Final')} disabled={createMutation.isPending} className="bg-red-700 hover:bg-red-800 text-white">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Finalisasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {showDetail && (
        <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detail Penilaian Kinerja</DialogTitle>
              <p className="text-xs text-gray-400">{showDetail.nama_karyawan} · {periodeLabel}</p>
            </DialogHeader>

            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
              <div>
                <p className="text-xs text-gray-500">Skor Total</p>
                <p className="text-3xl font-bold text-gray-800">{showDetail.skor_total}</p>
                <p className="text-xs text-gray-400">Dinilai oleh {showDetail.nama_reviewer}</p>
              </div>
              <div className={`text-4xl font-black w-16 h-16 rounded-2xl flex items-center justify-center ${GRADE_CONFIG[showDetail.grade]?.color}`}>
                {showDetail.grade}
              </div>
            </div>

            <div className="space-y-2">
              {SKOR_CRITERIA.map(c => (
                <div key={c.key} className="flex items-center gap-3">
                  <p className="text-xs text-gray-600 flex-1">{c.label}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-red-600" style={{ width: `${showDetail[c.key]}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-8 text-right">{showDetail[c.key]}</span>
                  </div>
                </div>
              ))}
            </div>

            {showDetail.data_kehadiran && (
              <div className="grid grid-cols-4 gap-2 bg-blue-50 rounded-xl p-3 text-center">
                <div><p className="text-sm font-bold text-blue-700">{showDetail.data_kehadiran.total_hadir}</p><p className="text-[10px] text-blue-500">Hadir</p></div>
                <div><p className="text-sm font-bold text-amber-600">{showDetail.data_kehadiran.total_izin}</p><p className="text-[10px] text-amber-500">Izin</p></div>
                <div><p className="text-sm font-bold text-orange-600">{showDetail.data_kehadiran.total_sakit}</p><p className="text-[10px] text-orange-500">Sakit</p></div>
                <div><p className="text-sm font-bold text-red-600">{showDetail.data_kehadiran.total_alfa}</p><p className="text-[10px] text-red-500">Alfa</p></div>
              </div>
            )}

            {showDetail.catatan_kinerja && <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Catatan Kinerja</p><p className="text-xs text-gray-700">{showDetail.catatan_kinerja}</p></div>}
            {showDetail.catatan_kehadiran && <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Catatan Kehadiran</p><p className="text-xs text-gray-700">{showDetail.catatan_kehadiran}</p></div>}
            {showDetail.rekomendasi && <div className="bg-amber-50 rounded-lg p-3 border border-amber-100"><p className="text-[10px] text-amber-500 mb-1">Rekomendasi</p><p className="text-xs text-amber-800">{showDetail.rekomendasi}</p></div>}

            {showDetail.status === 'Draft' && isReviewer && (
              <Button onClick={() => updateMutation.mutate({ id: showDetail.id, data: { status: 'Final' } })} className="w-full bg-red-700 hover:bg-red-800 text-white" disabled={updateMutation.isPending}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Finalisasi Penilaian
              </Button>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}