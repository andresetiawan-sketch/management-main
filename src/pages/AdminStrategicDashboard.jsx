import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { Shield, DollarSign, Users, TrendingUp, MapPin, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function StatCard({ icon: Icon, label, value, sub, color = 'bg-blue-500' }) {
  return (
    <Card className="p-4 border-0 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xl font-black text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function AdminStrategicDashboard() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const { data: patrols = [] } = useQuery({
    queryKey: ['admin-patrols-week'],
    queryFn: () => base44.entities.EPatrol.list('-tanggal', 500)
  });

  const { data: laporan = [] } = useQuery({
    queryKey: ['admin-laporan-week'],
    queryFn: () => base44.entities.LaporanHarian.list('-tanggal', 500)
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['admin-attendance-week'],
    queryFn: () => base44.entities.Attendance.list('-tanggal', 1000)
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['admin-areas'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  // Grafik Patroli Mingguan per hari
  const patrolWeekData = useMemo(() => {
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return weekDates.map((date, i) => {
      const dayPatrols = patrols.filter(p => p.tanggal === date);
      const temuan = dayPatrols.filter(p => p.kondisi === 'Taruna').length;
      return {
        hari: dayNames[i],
        patroli: dayPatrols.length,
        temuan
      };
    });
  }, [patrols, weekDates]);

  // Total biaya operasional per area
  const biayaPerArea = useMemo(() => {
    const map = {};
    laporan.forEach(l => {
      if (!l.area_tugas) return;
      const total = (l.biaya || []).reduce((s, b) => s + Number(b.nominal || 0), 0);
      map[l.area_tugas] = (map[l.area_tugas] || 0) + total;
    });
    return Object.entries(map)
      .map(([area, total]) => ({ area: area.length > 12 ? area.slice(0, 12) + '…' : area, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [laporan]);

  // Perbandingan kehadiran antar shift (dari attendance minggu ini)
  const weekAttendance = attendance.filter(a => weekDates.includes(a.tanggal));
  const shiftData = useMemo(() => {
    const shifts = ['Pagi', 'Siang', 'Malam'];
    return shifts.map(shift => {
      const rows = weekAttendance.filter(a => {
        const jam = a.jam_hadir || '';
        if (shift === 'Pagi') return jam >= '05:00' && jam < '13:00';
        if (shift === 'Siang') return jam >= '13:00' && jam < '21:00';
        return jam >= '21:00' || jam < '05:00';
      });
      const hadir = rows.filter(a => a.status === 'Hadir' || a.status === 'Backup').length;
      const izin = rows.filter(a => a.status === 'Izin' || a.status === 'Sakit').length;
      const alfa = rows.filter(a => a.status === 'Alfa').length;
      return { shift, hadir, izin, alfa };
    });
  }, [weekAttendance]);

  // Summary stats
  const totalPatrolWeek = patrols.filter(p => weekDates.includes(p.tanggal)).length;
  const totalTemuan = patrols.filter(p => weekDates.includes(p.tanggal) && p.kondisi === 'Taruna').length;
  const totalBiaya = laporan.reduce((s, l) => s + (l.biaya || []).reduce((ss, b) => ss + Number(b.nominal || 0), 0), 0);
  const hadirRate = weekAttendance.length > 0
    ? Math.round(weekAttendance.filter(a => a.status === 'Hadir' || a.status === 'Backup').length / weekAttendance.length * 100)
    : 0;

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-800 to-red-600 rounded-2xl p-6 text-white">
        <h1 className="text-xl font-black">Dashboard Strategis Admin</h1>
        <p className="text-white/70 text-sm mt-1">Analitik performa operasional & pengambilan keputusan</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Shield} label="Patroli Minggu Ini" value={totalPatrolWeek} sub={`${totalTemuan} temuan`} color="bg-green-500" />
        <StatCard icon={AlertTriangle} label="Temuan / Taruna" value={totalTemuan} sub="minggu ini" color="bg-orange-500" />
        <StatCard icon={DollarSign} label="Total Biaya Ops" value={`Rp ${(totalBiaya / 1000).toFixed(0)}K`} sub="semua laporan" color="bg-amber-500" />
        <StatCard icon={Users} label="Tingkat Kehadiran" value={`${hadirRate}%`} sub="minggu ini" color="bg-blue-500" />
      </div>

      {/* Patroli Mingguan */}
      <Card className="p-5 border-0 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-green-600" />
          <h2 className="text-sm font-bold text-gray-700">Grafik Patroli Mingguan</h2>
          <Badge className="bg-green-100 text-green-700 border-0 text-[10px] ml-auto">7 Hari Terakhir</Badge>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={patrolWeekData} barGap={2}>
            <XAxis dataKey="hari" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={(val, name) => [val, name === 'patroli' ? 'Total Patroli' : 'Temuan']} />
            <Legend formatter={val => val === 'patroli' ? 'Total Patroli' : 'Temuan'} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="patroli" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="temuan" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Biaya Per Area & Kehadiran Per Shift (side by side on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Biaya Per Area */}
        <Card className="p-5 border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-gray-700">Biaya Operasional per Area</h2>
          </div>
          {biayaPerArea.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Belum ada data biaya</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={biayaPerArea} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="area" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={v => [`Rp ${Number(v).toLocaleString('id-ID')}`, 'Total Biaya']} />
                <Bar dataKey="total" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Kehadiran Per Shift */}
        <Card className="p-5 border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-gray-700">Perbandingan Kehadiran per Shift</h2>
            <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] ml-auto">Minggu Ini</Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={shiftData} barGap={3}>
              <XAxis dataKey="shift" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="hadir" name="Hadir" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="izin" name="Izin/Sakit" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="alfa" name="Alfa" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Area Summary */}
      <Card className="p-5 border-0 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-red-600" />
          <h2 className="text-sm font-bold text-gray-700">Ringkasan per Area Aktif</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {areas.map(area => {
            const areaPatrols = patrols.filter(p => p.area_tugas === area.nama_area && weekDates.includes(p.tanggal));
            const areaTemuan = areaPatrols.filter(p => p.kondisi === 'Taruna').length;
            const areaAttendance = weekAttendance.filter(a => a.area_tugas === area.nama_area);
            const areaHadir = areaAttendance.filter(a => a.status === 'Hadir' || a.status === 'Backup').length;
            return (
              <div key={area.id} className="rounded-xl border border-gray-100 p-3 hover:border-red-200 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-800 truncate flex-1 mr-2">{area.nama_area}</p>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">Aktif</Badge>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="bg-green-50 rounded-lg py-1.5">
                    <p className="text-sm font-black text-green-700">{areaPatrols.length}</p>
                    <p className="text-[9px] text-gray-500">Patroli</p>
                  </div>
                  <div className={`rounded-lg py-1.5 ${areaTemuan > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                    <p className={`text-sm font-black ${areaTemuan > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{areaTemuan}</p>
                    <p className="text-[9px] text-gray-500">Temuan</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg py-1.5">
                    <p className="text-sm font-black text-blue-700">{areaHadir}</p>
                    <p className="text-[9px] text-gray-500">Hadir</p>
                  </div>
                </div>
              </div>
            );
          })}
          {areas.length === 0 && <p className="text-gray-400 text-sm text-center col-span-3 py-4">Belum ada area aktif</p>}
        </div>
      </Card>
    </div>
  );
}