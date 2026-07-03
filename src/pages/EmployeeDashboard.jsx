import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/utils';
import {
  CalendarClock, Shield, ClipboardCheck, BookOpen, Package,
  Droplets, Car, Sparkles, UserCircle, MapPin, Clock, CheckCircle2, UserCog,
  Boxes, Kanban, Wrench, CreditCard, FileText, NotebookPen, ArrowLeftRight,
  MessageSquare, Activity, Users, CalendarDays, ListChecks, AlertTriangle, ChevronRight
} from 'lucide-react';
import AlertBanner from '@/components/notifications/AlertBanner';
import PatrolScheduleWidget from '@/components/patrol/PatrolScheduleWidget';
import PanicButton from '@/components/emergency/PanicButton';
import QuickAttendance from '@/components/attendance/QuickAttendance';

// Default menu per jabatan/role
const MENU_BY_ROLE = {
  'Admin Pos': ['attendance', 'shift', 'epatrol', 'guestbook', 'package', 'laporanharian', 'karyawanarea'],
  'Chief Security': ['attendance', 'shift', 'epatrol', 'efacility', 'hydrant', 'emergency', 'kr', 'taskboard', 'ticketing', 'dailychecklist', 'laporanharian', 'serahterima', 'tenantreport', 'patrolanalytic', 'karyawanarea'],
  'Leader Security': ['attendance', 'epatrol', 'hydrant', 'emergency', 'kr', 'dailychecklist', 'laporanharian', 'serahterima', 'karyawanarea'],
  'Supervisor Facility': ['attendance', 'efacility', 'hydrant', 'emergency', 'toilet', 'taskboard', 'ticketing', 'laporanharian', 'karyawanarea'],
  'Leader Facility': ['attendance', 'efacility', 'toilet', 'laporanharian', 'karyawanarea'],
  'Staff': ['attendance', 'epatrol', 'laporanharian', 'dailychecklist', 'serahterima', 'penugasan'],
  'PIC Client': ['attendance', 'epatrol', 'efacility', 'hydrant', 'emergency', 'kr', 'toilet', 'guestbook', 'package', 'laporanharian']
};

const ALL_MENU_ITEMS = {
  attendance: { label: 'E-Absensi', icon: CalendarClock, page: 'Attendance', color: 'bg-blue-500', desc: 'Rekam kehadiran harian' },
  shift: { label: 'Jadwal Shift', icon: Clock, page: 'ShiftSchedule', color: 'bg-indigo-500', desc: 'Lihat jadwal shift' },
  timesheet: { label: 'Validasi Timesheet', icon: ClipboardCheck, page: 'TimesheetValidation', color: 'bg-slate-500', desc: 'Validasi timesheet' },
  epatrol: { label: 'E-Patroli', icon: Shield, page: 'EPatrol', color: 'bg-green-500', desc: 'Input patroli & titik cek' },
  efacility: { label: 'E-Facility', icon: ClipboardCheck, page: 'EFacility', color: 'bg-purple-500', desc: 'Laporan fasilitas' },
  hydrant: { label: 'Hydrant & APAR', icon: Droplets, page: 'ChecklistHydrant', color: 'bg-red-500', desc: 'Cek hydrant & APAR' },
  emergency: { label: 'Box Emergency', icon: CheckCircle2, page: 'ChecklistEmergency', color: 'bg-orange-500', desc: 'Cek box emergency' },
  kr: { label: 'Checklist KR', icon: Car, page: 'ChecklistKR', color: 'bg-cyan-500', desc: 'Cek kendaraan' },
  toilet: { label: 'Checklist Toilet', icon: Sparkles, page: 'ChecklistToilet', color: 'bg-pink-500', desc: 'Cek kebersihan toilet' },
  guestbook: { label: 'Buku Tamu', icon: BookOpen, page: 'GuestBook', color: 'bg-amber-500', desc: 'Catat tamu masuk' },
  package: { label: 'Paket Tenant', icon: Package, page: 'TenantPackage', color: 'bg-teal-500', desc: 'Kelola paket tenant' },
  inventory: { label: 'Inventaris', icon: Boxes, page: 'Inventory', color: 'bg-lime-600', desc: 'Kelola inventaris' },
  taskboard: { label: 'Task Board', icon: Kanban, page: 'TaskBoard', color: 'bg-violet-500', desc: 'Papan tugas' },
  ticketing: { label: 'Ticketing Fasilitas', icon: Wrench, page: 'FacilityTicketing', color: 'bg-rose-500', desc: 'Tiket fasilitas' },
  payslip: { label: 'Slip Gaji', icon: CreditCard, page: 'Payslip', color: 'bg-yellow-600', desc: 'Lihat slip gaji' },
  laporan: { label: 'Laporan PDF', icon: FileText, page: 'LaporanBulanan', color: 'bg-gray-600', desc: 'Unduh laporan PDF' },
  laporanharian: { label: 'Laporan Harian', icon: NotebookPen, page: 'LaporanHarian', color: 'bg-teal-600', desc: 'Laporan kegiatan harian' },
  dailychecklist: { label: 'Daily Checklist', icon: ClipboardCheck, page: 'DailyChecklist', color: 'bg-violet-600', desc: 'Checklist harian satpam' },
  serahterima: { label: 'Serah Terima Shift', icon: ArrowLeftRight, page: 'ShiftHandoverPage', color: 'bg-blue-600', desc: 'Digital sign-off shift' },
  tenantreport: { label: 'Laporan Penyewa', icon: MessageSquare, page: 'TenantReportPage', color: 'bg-sky-600', desc: 'Laporan masalah fasilitas' },
  patrolanalytic: { label: 'Analitik Patroli', icon: Activity, page: 'EPatrolAnalytics', color: 'bg-green-600', desc: 'Grafik & analisis patroli' },
  karyawanarea: { label: 'Data Karyawan', icon: Users, page: 'AreaEmployees', color: 'bg-red-700', desc: 'Lihat & unduh berkas karyawan area' },
  cutiizin: { label: 'Cuti & Izin', icon: CalendarDays, page: 'Cuti', color: 'bg-teal-500', desc: 'Pengajuan cuti dan izin' },
  penugasan: { label: 'Penugasan', icon: ListChecks, page: 'AssignmentPage', color: 'bg-violet-600', desc: 'Tugas dari atasan' },
};

// Maps area's menu_per_jabatan module names to internal keys
const MODULE_TO_KEY = {
  'Absensi': 'attendance', 'E-Absensi': 'attendance',
  'E-Patroli': 'epatrol', 'E-Patrol': 'epatrol',
  'E-Facility': 'efacility',
  'Hydrant & APAR': 'hydrant', 'Hydrant': 'hydrant',
  'Box Emergency': 'emergency',
  'KR 2/4': 'kr', 'Checklist KR': 'kr',
  'Checklist Toilet': 'toilet', 'Toilet': 'toilet',
  'Buku Tamu': 'guestbook',
  'Paket Tenant': 'package',
  'Jadwal Shift': 'shift', 'Shift': 'shift',
  'Validasi Timesheet': 'timesheet',
  'Inventaris': 'inventory',
  'Task Board': 'taskboard',
  'Ticketing Fasilitas': 'ticketing',
  'Slip Gaji': 'payslip',
  'Laporan PDF': 'laporan',
  'Laporan Harian': 'laporanharian',
  'Daily Checklist': 'dailychecklist',
  'Serah Terima Shift': 'serahterima',
  'Laporan Penyewa': 'tenantreport',
  'Analitik Patroli': 'patrolanalytic',
  'Data Karyawan Area': 'karyawanarea',
  'Data Karyawan': 'karyawanarea',
  'Cuti & Izin': 'cutiizin',
  'Penugasan': 'penugasan',
};

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const stored = localStorage.getItem('pis_employee');
    if (stored) setEmployee(JSON.parse(stored));
  }, []);

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ['my-attendance-today', employee?.nik_karyawan],
    queryFn: () => base44.entities.Attendance.filter({ nik_karyawan: employee.nik_karyawan, tanggal: today }),
    enabled: !!employee?.nik_karyawan
  });

  // Cek apakah ada jadwal shift hari ini untuk karyawan ini
  const { data: todayShifts = [], isLoading: loadingShift } = useQuery({
    queryKey: ['my-shift-today', employee?.nik_karyawan, employee?.area_tugas, today],
    queryFn: () => base44.entities.ShiftSchedule.filter({ area_tugas: employee.area_tugas, tanggal: today }),
    enabled: !!employee?.nik_karyawan && !!employee?.area_tugas
  });

  const hasShiftToday = todayShifts.some(s => !s.regu || s.regu === employee?.regu);

  const { data: recentPatrols = [] } = useQuery({
    queryKey: ['my-patrols', employee?.nik_karyawan],
    queryFn: () => base44.entities.EPatrol.filter({ nik_karyawan: employee.nik_karyawan }, '-tanggal', 3),
    enabled: !!employee?.nik_karyawan
  });

  const { data: myAssignments = [] } = useQuery({
    queryKey: ['my-assignments', employee?.nik_karyawan],
    queryFn: () => base44.entities.Assignment.filter({ nik_petugas: employee.nik_karyawan }, '-created_date', 20),
    enabled: !!employee?.nik_karyawan
  });

  const { data: areaData } = useQuery({
    queryKey: ['area-detail', employee?.area_tugas],
    queryFn: () => base44.entities.AreaProject.filter({ nama_area: employee.area_tugas }),
    enabled: !!employee?.area_tugas,
    select: (data) => data[0]
  });

  if (!employee) return <Skeleton className="h-64 rounded-2xl" />;

  // Redirect Master Admin to main dashboard
  const isMasterAdmin = employee.role === 'Master Admin' || employee.jabatan === 'Master Admin';
  if (isMasterAdmin) {
    window.location.href = createPageUrl('Dashboard');
    return null;
  }

  const jabatan = employee.jabatan || employee.role || 'Staff';
  const defaultKeys = MENU_BY_ROLE[jabatan] || MENU_BY_ROLE['Staff'];

  // Priority: area's menu_per_jabatan for this jabatan → role-based default
  const areaMenuForJabatan = areaData?.menu_per_jabatan?.[jabatan];
  const menuKeys = areaMenuForJabatan
    ? areaMenuForJabatan.map(m => MODULE_TO_KEY[m] || m).filter(k => !!ALL_MENU_ITEMS[k])
    : defaultKeys;

  const myMenuItems = menuKeys.map((k) => ALL_MENU_ITEMS[k]).filter(Boolean);
  const myAttendance = todayAttendance[0];
  const recentPatrol = recentPatrols.slice(0, 3);

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-6">
      {/* Real-time Alert Banner for management */}
      <AlertBanner employee={employee} />

      {/* Profile Card */}
      <Card className="bg-gradient-to-br from-red-700 to-red-900 text-white p-5 rounded-2xl border-0 shadow-md">
        <div className="flex items-center gap-4">
          {employee.foto
            ? <img src={employee.foto} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/40 shrink-0" />
            : <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold shrink-0">
                {(employee.nama_lengkap || 'A')[0]}
              </div>
          }
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-lg font-bold truncate">{employee.nama_lengkap}</h2>
            <p className="text-white/70 text-sm">{employee.nik_karyawan}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge className="bg-white/20 text-white border-0 text-xs py-0.5">
                <UserCircle className="w-3 h-3 mr-1" />{jabatan}
              </Badge>
              {employee.area_tugas &&
                <Badge className="bg-white/20 text-white border-0 text-xs py-0.5">
                  <MapPin className="w-3 h-3 mr-1" />{employee.area_tugas}
                </Badge>
              }
            </div>
          </div>
        </div>
      </Card>

      {/* Attendance Status */}
      <Card className="p-4 border-0 shadow-sm rounded-2xl">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status Kehadiran Hari Ini</p>
        {loadingShift ? (
          <div className="text-center text-xs text-gray-400 py-3">Memeriksa jadwal shift...</div>
        ) : !hasShiftToday ? (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700">Tidak Ada Jadwal Shift Hari Ini</p>
              <p className="text-xs text-amber-600 mt-0.5">Tombol absensi tidak tersedia karena belum ada jadwal shift yang dibuat untuk hari ini.</p>
            </div>
          </div>
        ) : (
          <QuickAttendance
            employee={employee}
            attendance={myAttendance}
            onSuccess={() => {}}
          />
        )}
      </Card>

      {/* Quick Access Menu */}
      {myMenuItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Menu Akses Cepat</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {myMenuItems.map((item) =>
              <a
                key={item.page}
                href={createPageUrl(item.page)}
                className="group flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm active:scale-95 transition-all border border-gray-100"
              >
                <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center shadow-sm`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700 text-center leading-tight">{item.label}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Profile quick link */}
      <a href={createPageUrl('MyProfile')} className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-all">
        <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
          <UserCog className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Edit Profil Saya</p>
          <p className="text-xs text-gray-400">Ubah foto, telepon, alamat, rekening</p>
        </div>
        <span className="ml-auto text-gray-300 text-lg">›</span>
      </a>

      {/* Panic Button */}
      <PanicButton employee={employee} />

      {/* Patrol Schedule Widget */}
      <PatrolScheduleWidget employee={employee} />

      {/* Tugas Saya Widget */}
      {myAssignments.filter(a => a.status !== 'Selesai' && a.status !== 'Dibatalkan').length > 0 && (
        <Card className="p-4 border-0 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tugas Saya</p>
            <a href={createPageUrl('AssignmentPage')} className="text-xs text-[var(--maroon)] font-medium flex items-center gap-0.5">
              Lihat Semua <ChevronRight className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-2">
            {myAssignments.filter(a => a.status !== 'Selesai' && a.status !== 'Dibatalkan').slice(0, 3).map(a => {
              const isOverdue = a.deadline < today;
              return (
                <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isOverdue ? 'bg-red-100' : 'bg-violet-100'}`}>
                    {isOverdue ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <ListChecks className="w-4 h-4 text-violet-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.judul}</p>
                    <p className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                      Deadline: {a.deadline} {isOverdue && '⚠️ Overdue'}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${a.status === 'Sedang Dikerjakan' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {a.status}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recent Patrols */}
      {recentPatrol.length > 0 &&
        <Card className="p-4 border-0 shadow-sm rounded-2xl">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Patroli Terakhir</p>
          <div className="space-y-1">
            {recentPatrol.map((p) =>
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.checkpoint || '-'}</p>
                  <p className="text-xs text-gray-400">{p.tanggal} {p.waktu ? `· ${p.waktu}` : ''}</p>
                </div>
                <span className={`text-xs font-medium shrink-0 px-2 py-0.5 rounded-full ${p.kondisi === 'Taruna' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                  {p.kondisi || '-'}
                </span>
              </div>
            )}
          </div>
        </Card>
      }
    </div>
  );
}