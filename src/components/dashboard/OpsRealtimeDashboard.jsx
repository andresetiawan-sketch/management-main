import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, CalendarClock, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function OpsRealtimeDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = today.slice(0, 7);

  const { data: areas = [] } = useQuery({
    queryKey: ['ops-areas'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  const { data: todayAttendances = [], dataUpdatedAt } = useQuery({
    queryKey: ['ops-att-today'],
    queryFn: () => base44.entities.Attendance.filter({ tanggal: today }),
    refetchInterval: 60000
  });

  const { data: todayShifts = [] } = useQuery({
    queryKey: ['ops-shifts-today'],
    queryFn: () => base44.entities.ShiftSchedule.filter({ tanggal: today }),
    refetchInterval: 60000
  });

  const { data: todayPatrols = [] } = useQuery({
    queryKey: ['ops-patrols-today'],
    queryFn: () => base44.entities.EPatrol.filter({ tanggal: today }),
    refetchInterval: 60000
  });

  const [lastUpdate, setLastUpdate] = useState(new Date());
  useEffect(() => { setLastUpdate(new Date()); }, [dataUpdatedAt]);

  // Compute per-area stats
  const areaStats = areas.map(a => {
    const nama = a.nama_area;
    const shifts = todayShifts.filter(s => s.area_tugas === nama).length;
    const hadir = todayAttendances.filter(s => s.area_tugas === nama && s.status === 'Hadir').length;
    const patrols = todayPatrols.filter(p => p.area_tugas === nama).length;
    const temuan = todayPatrols.filter(p => p.area_tugas === nama && p.kondisi === 'Taruna').length;
    const ratio = shifts > 0 ? Math.round((hadir / shifts) * 100) : 0;
    return { nama, shifts, hadir, patrols, temuan, ratio };
  }).filter(a => a.shifts > 0 || a.hadir > 0 || a.patrols > 0);

  const totalShifts = todayShifts.length;
  const totalHadir = todayAttendances.filter(a => a.status === 'Hadir').length;
  const totalPatrols = todayPatrols.length;
  const totalTemuan = todayPatrols.filter(p => p.kondisi === 'Taruna').length;
  const overallRatio = totalShifts > 0 ? Math.round((totalHadir / totalShifts) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[var(--maroon)]" /> Operasional Real-time Hari Ini
        </h2>
        <span className="text-[10px] text-gray-400">Update: {lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-0 shadow-sm bg-blue-50">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xl font-bold text-blue-700">{totalShifts}</p>
              <p className="text-xs text-blue-500">Total Shift Hari Ini</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-0 shadow-sm bg-emerald-50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xl font-bold text-emerald-700">{totalHadir} <span className="text-sm font-normal">/ {totalShifts}</span></p>
              <p className="text-xs text-emerald-500">Hadir ({overallRatio}%)</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-0 shadow-sm bg-purple-50">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-xl font-bold text-purple-700">{totalPatrols}</p>
              <p className="text-xs text-purple-500">Patroli Hari Ini</p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 border-0 shadow-sm ${totalTemuan > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2">
            {totalTemuan > 0 ? <AlertTriangle className="w-5 h-5 text-orange-600" /> : <CheckCircle2 className="w-5 h-5 text-gray-400" />}
            <div>
              <p className={`text-xl font-bold ${totalTemuan > 0 ? 'text-orange-700' : 'text-gray-500'}`}>{totalTemuan}</p>
              <p className={`text-xs ${totalTemuan > 0 ? 'text-orange-500' : 'text-gray-400'}`}>Temuan (Taruna)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Per-Area Chart */}
      {areaStats.length > 0 && (
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-xs font-semibold text-gray-600 mb-3">Rasio Kehadiran vs Shift per Area</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={areaStats} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="nama" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
              <Tooltip formatter={(v, n) => [n === 'ratio' ? `${v}%` : v, n === 'ratio' ? 'Rasio Hadir' : n === 'hadir' ? 'Hadir' : 'Shift']} />
              <Bar dataKey="ratio" name="Rasio Hadir" radius={[4,4,0,0]}>
                {areaStats.map((a, i) => (
                  <Cell key={i} fill={a.ratio >= 80 ? '#10b981' : a.ratio >= 50 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Per-area patrol status table */}
      {areaStats.length > 0 && (
        <Card className="p-4 border-0 shadow-sm overflow-x-auto">
          <p className="text-xs font-semibold text-gray-600 mb-3">Status Patroli per Area</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="text-left px-2 py-1.5 font-medium">Area</th>
                <th className="text-center px-2 py-1.5 font-medium">Shift</th>
                <th className="text-center px-2 py-1.5 font-medium">Hadir</th>
                <th className="text-center px-2 py-1.5 font-medium">Rasio</th>
                <th className="text-center px-2 py-1.5 font-medium">Patroli</th>
                <th className="text-center px-2 py-1.5 font-medium">Temuan</th>
              </tr>
            </thead>
            <tbody>
              {areaStats.map((a, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-2 py-1.5 font-medium text-gray-800">{a.nama}</td>
                  <td className="px-2 py-1.5 text-center">{a.shifts}</td>
                  <td className="px-2 py-1.5 text-center">{a.hadir}</td>
                  <td className="px-2 py-1.5 text-center">
                    <Badge className={`text-[10px] border-0 ${a.ratio >= 80 ? 'bg-emerald-100 text-emerald-700' : a.ratio >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {a.ratio}%
                    </Badge>
                  </td>
                  <td className="px-2 py-1.5 text-center">{a.patrols}</td>
                  <td className="px-2 py-1.5 text-center">
                    {a.temuan > 0 ? <Badge className="bg-orange-100 text-orange-700 text-[10px] border-0">{a.temuan}</Badge> : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}