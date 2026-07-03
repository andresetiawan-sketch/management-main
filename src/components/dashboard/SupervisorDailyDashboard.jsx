import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Users, AlertTriangle, CheckCircle2, Clock, Wrench, ClipboardList, MapPin } from 'lucide-react';

const today = new Date().toISOString().slice(0, 10);

export default function SupervisorDailyDashboard() {
  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const empArea = employee?.area_tugas || '';

  const { data: attendances = [] } = useQuery({
    queryKey: ['spv-attend-today', empArea],
    queryFn: () => empArea
      ? base44.entities.Attendance.filter({ tanggal: today, area_tugas: empArea }, '-created_date', 200)
      : base44.entities.Attendance.filter({ tanggal: today }, '-created_date', 500),
    refetchInterval: 60000
  });

  const { data: facilityTickets = [] } = useQuery({
    queryKey: ['spv-facility-tickets'],
    queryFn: () => empArea
      ? base44.entities.FacilityTicket.filter({ area_tugas: empArea, status: 'Baru' }, '-created_date', 50)
      : base44.entities.FacilityTicket.filter({ status: 'Baru' }, '-created_date', 100),
    refetchInterval: 60000
  });

  const { data: emergencyItems = [] } = useQuery({
    queryKey: ['spv-emergency'],
    queryFn: () => empArea
      ? base44.entities.ChecklistEmergency.filter({ area_tugas: empArea }, '-created_date', 50)
      : base44.entities.ChecklistEmergency.list('-created_date', 100),
    refetchInterval: 60000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['spv-tasks', empArea],
    queryFn: () => empArea
      ? base44.entities.TaskBoard.filter({ area_tugas: empArea }, '-created_date', 100)
      : base44.entities.TaskBoard.list('-created_date', 200),
    refetchInterval: 60000
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['spv-areas'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  // Stats
  const hadirCount = attendances.filter(a => ['Hadir', 'Terlambat', 'Backup'].includes(a.status)).length;
  const terlambatCount = attendances.filter(a => a.status === 'Terlambat').length;
  const alfaCount = attendances.filter(a => a.status === 'Alfa').length;
  const izinSakitCount = attendances.filter(a => ['Izin', 'Sakit', 'Cuti'].includes(a.status)).length;

  const urgentTickets = facilityTickets.filter(t => t.prioritas === 'Darurat' || t.prioritas === 'Tinggi');
  const emergencyIssues = emergencyItems.filter(e => e.kondisi === 'Rusak' || e.kondisi === 'Perlu Maintenance');

  const tasksDone = tasks.filter(t => t.status === 'Done').length;
  const tasksInProgress = tasks.filter(t => t.status === 'In Progress').length;
  const tasksTodo = tasks.filter(t => t.status === 'To Do').length;

  // Group attendance by area
  const areaAttendance = areas.reduce((acc, area) => {
    const areaAtt = attendances.filter(a => a.area_tugas === area.nama_area);
    acc[area.nama_area] = {
      hadir: areaAtt.filter(a => ['Hadir', 'Backup'].includes(a.status)).length,
      terlambat: areaAtt.filter(a => a.status === 'Terlambat').length,
      alfa: areaAtt.filter(a => a.status === 'Alfa').length,
    };
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardList className="w-4 h-4 text-[var(--maroon)]" />
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Ringkasan Harian Operasional — {today}</h3>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-0 shadow-sm bg-emerald-50">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-emerald-600 font-semibold">Hadir</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{hadirCount}</p>
          <p className="text-xs text-emerald-500 mt-1">Personel hadir hari ini</p>
        </Card>

        <Card className="p-4 border-0 shadow-sm bg-amber-50">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-amber-600 font-semibold">Terlambat</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{terlambatCount}</p>
          <p className="text-xs text-amber-500 mt-1">Personel terlambat</p>
        </Card>

        <Card className="p-4 border-0 shadow-sm bg-red-50">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-xs text-red-600 font-semibold">Masalah Aktif</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{urgentTickets.length + emergencyIssues.length}</p>
          <p className="text-xs text-red-500 mt-1">{urgentTickets.length} tiket + {emergencyIssues.length} emergency</p>
        </Card>

        <Card className="p-4 border-0 shadow-sm bg-blue-50">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-600 font-semibold">Tugas Selesai</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{tasksDone}</p>
          <p className="text-xs text-blue-500 mt-1">{tasksInProgress} proses, {tasksTodo} pending</p>
        </Card>
      </div>

      {/* Issues list */}
      {(urgentTickets.length > 0 || emergencyIssues.length > 0 || terlambatCount > 0 || alfaCount > 0) && (
        <Card className="p-4 border-0 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Issues & Peringatan Hari Ini
          </h4>
          <div className="space-y-2">
            {terlambatCount > 0 && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div className="flex-1 text-xs">
                  <span className="font-semibold text-amber-700">{terlambatCount} karyawan terlambat</span>
                  <div className="text-gray-500 mt-0.5">
                    {attendances.filter(a => a.status === 'Terlambat').map(a => a.nama_karyawan).join(', ')}
                  </div>
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Terlambat</Badge>
              </div>
            )}
            {alfaCount > 0 && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                <Users className="w-4 h-4 text-red-600 flex-shrink-0" />
                <div className="flex-1 text-xs">
                  <span className="font-semibold text-red-700">{alfaCount} karyawan tidak hadir (Alfa)</span>
                </div>
                <Badge className="bg-red-100 text-red-700 border-0 text-xs">Alfa</Badge>
              </div>
            )}
            {urgentTickets.map(t => (
              <div key={t.id} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                <Wrench className="w-4 h-4 text-red-600 flex-shrink-0" />
                <div className="flex-1 text-xs">
                  <span className="font-semibold text-red-700">[Tiket Fasilitas] {t.judul}</span>
                  <div className="text-gray-500">{t.area_tugas} • {t.deskripsi?.slice(0, 60)}</div>
                </div>
                <Badge className="bg-red-100 text-red-700 border-0 text-xs">{t.prioritas}</Badge>
              </div>
            ))}
            {emergencyIssues.map(e => (
              <div key={e.id} className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <div className="flex-1 text-xs">
                  <span className="font-semibold text-orange-700">[Box Emergency] {e.lokasi_box}</span>
                  <div className="text-gray-500">{e.area_tugas} • Kondisi: {e.kondisi}</div>
                </div>
                <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">{e.kondisi}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Task status per area */}
      {areas.length > 0 && (
        <Card className="p-4 border-0 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--maroon)]" /> Status Kehadiran Per Area
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {areas.map(area => {
              const att = areaAttendance[area.nama_area] || { hadir: 0, terlambat: 0, alfa: 0 };
              const areaTasks = tasks.filter(t => t.area_tugas === area.nama_area);
              const doneT = areaTasks.filter(t => t.status === 'Done').length;
              const totalT = areaTasks.length;
              return (
                <div key={area.id} className="border rounded-lg p-3 bg-gray-50/50">
                  <p className="text-xs font-semibold text-gray-700 mb-2">{area.nama_area}</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">{att.hadir} hadir</Badge>
                    {att.terlambat > 0 && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">{att.terlambat} terlambat</Badge>}
                    {att.alfa > 0 && <Badge className="bg-red-100 text-red-700 border-0 text-xs">{att.alfa} alfa</Badge>}
                    {totalT > 0 && <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">{doneT}/{totalT} tugas</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}