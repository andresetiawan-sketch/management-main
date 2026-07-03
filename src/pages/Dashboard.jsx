import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { useEmployee } from '@/hooks/useEmployee';
import { createPageUrl } from '@/utils';
import StatCard from '@/components/dashboard/StatCard';
import ApplicantChart from '@/components/dashboard/ApplicantChart';
import ApplicantTable from '@/components/dashboard/ApplicantTable';
import OpsRealtimeDashboard from '@/components/dashboard/OpsRealtimeDashboard';
import DashboardWidgetConfig, { useDashboardConfig, ALL_WIDGETS } from '@/components/dashboard/DashboardWidgetConfig';
import ExportExcelButton from '@/components/export/ExportExcelButton';
import PKWTExpiryAlert from '@/components/pkwt/PKWTExpiryAlert';
import AlertBanner from '@/components/notifications/AlertBanner';
import { Users, UserCheck, MapPin, CalendarClock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69ae71d19fe396b3470078b2/74c75dcf9_Logobulat.png";

const EMPLOYEE_EXPORT_COLS = [
  { key: 'nik_karyawan', label: 'NIK' },
  { key: 'nama_lengkap', label: 'Nama Lengkap' },
  { key: 'jabatan', label: 'Jabatan' },
  { key: 'area_tugas', label: 'Area' },
  { key: 'entity_pt', label: 'Entity PT' },
  { key: 'status_aktif', label: 'Status' },
  { key: 'no_telepon', label: 'No. Telepon' },
  { key: 'tanggal_bergabung', label: 'Tgl Bergabung' },
];

const APPLICANT_EXPORT_COLS = [
  { key: 'nama_lengkap', label: 'Nama Lengkap' },
  { key: 'nik_ektp', label: 'NIK E-KTP' },
  { key: 'no_telepon', label: 'No. Telepon' },
  { key: 'area_client', label: 'Area Client' },
  { key: 'posisi_diinginkan', label: 'Posisi' },
  { key: 'status', label: 'Status' },
  { key: 'created_date', label: 'Tgl Daftar' },
];

export default function Dashboard() {
  const { employee: emp } = useEmployee();
  const isMasterAdmin = emp?.role === 'Master Admin' || emp?.jabatan === 'Master Admin';

  const { data: applicants = [], isLoading: loadApplicants, refetch: refetchApplicants } = useQuery({
    queryKey: ['applicants'],
    queryFn: () => base44.entities.Applicant.list('-created_date', 200)
  });

  const { data: employees = [], isLoading: loadEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date', 200)
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => base44.entities.AreaProject.list()
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ['attendances-today'],
    queryFn: () => base44.entities.Attendance.filter({ tanggal: new Date().toISOString().slice(0, 10) })
  });

  const { data: dashConfig } = useDashboardConfig(emp?.nik_karyawan);
  const enabledWidgets = dashConfig?.widgets || ALL_WIDGETS.map(w => ({ id: w.id, enabled: w.defaultEnabled }));
  const isEnabled = (id) => {
    const found = enabledWidgets.find(w => w.id === id);
    return found ? found.enabled : true;
  };

  const pending = applicants.filter((a) => a.status === 'Pending').length;
  const activeEmployees = employees.filter((e) => e.status_aktif === 'Aktif').length;
  const activeAreas = areas.filter((a) => a.status === 'Aktif').length;

  if (emp && !isMasterAdmin) {
    window.location.href = createPageUrl('EmployeeDashboard');
    return null;
  }

  if (loadApplicants || loadEmployees) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Dashboard */}
      <div className="flex items-center justify-between gap-4 bg-white rounded-2xl shadow-sm p-5 flex-wrap">
        <div className="flex items-center gap-4">
          <img src={LOGO_URL} alt="PIS" className="w-16 h-16 object-contain rounded-full" />
          <div>
            <h1 className="text-2xl font-black text-[var(--maroon)] tracking-widest">INTEGRATED</h1>
            <p className="text-gray-500 text-sm font-bold">PT. PUTRA INDONESIA SOLUSI & PT. PRESTASI INDONESIA SOLUSI</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DashboardWidgetConfig employeeNik={emp?.nik_karyawan} areatugas={emp?.area_tugas} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isEnabled('stat_pelamar') && <StatCard title="Total Pelamar" value={applicants.length} icon={Users} color="maroon" trend={`${pending} pending`} />}
        {isEnabled('stat_karyawan') && <StatCard title="Karyawan Aktif" value={activeEmployees} icon={UserCheck} color="green" />}
        {isEnabled('stat_area') && <StatCard title="Area Aktif" value={activeAreas} icon={MapPin} color="blue" />}
        {isEnabled('stat_hadir') && <StatCard title="Hadir Hari Ini" value={attendances.filter((a) => a.status === 'Hadir').length} icon={CalendarClock} color="orange" />}
      </div>

      {/* Real-time Alert Banner */}
      <AlertBanner employee={emp} />

      {/* PKWT Expiry Alert */}
      <PKWTExpiryAlert compact />

      {isEnabled('ops_realtime') && <OpsRealtimeDashboard />}
      {isEnabled('chart_pelamar') && <ApplicantChart applicants={applicants} />}
      {isEnabled('tabel_pelamar') && <ApplicantTable applicants={applicants} onRefresh={refetchApplicants} />}
    </div>
  );
}