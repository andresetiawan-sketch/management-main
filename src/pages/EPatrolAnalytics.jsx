import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Shield, TrendingUp, MapPin, AlertTriangle, Clock, Activity } from 'lucide-react';

const COLORS = ['#16a34a','#2563eb','#d97706','#dc2626','#7c3aed','#0891b2','#be185d','#6b7280'];
const DAYS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <Card className="p-4 border-0 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-black text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
          {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function EPatrolAnalytics() {
  const today = new Date();
  const thisWeekStart = new Date(today); thisWeekStart.setDate(today.getDate() - today.getDay());
  const [filterArea, setFilterArea] = useState('all');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, -1 = last week

  const { data: patrols = [], isLoading } = useQuery({
    queryKey: ['patrol-analytics'],
    queryFn: () => base44.entities.EPatrol.list('-tanggal', 3000),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-analytics'],
    queryFn: () => base44.entities.AreaProject.list(),
  });

  // Week range
  const weekStart = new Date(thisWeekStart);
  weekStart.setDate(thisWeekStart.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const fmtDate = (d) => d.toISOString().slice(0, 10);
  const weekStartStr = fmtDate(weekStart);
  const weekEndStr = fmtDate(weekEnd);

  const areaFilter = (p) => filterArea === 'all' || p.area_tugas === filterArea;

  const weeklyPatrols = useMemo(() =>
    patrols.filter(p => p.tanggal >= weekStartStr && p.tanggal <= weekEndStr && areaFilter(p)),
    [patrols, weekStartStr, weekEndStr, filterArea]
  );

  // 1. Daily chart (7 days of selected week)
  const dailyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      const ds = fmtDate(d);
      const dayPatrols = weeklyPatrols.filter(p => p.tanggal === ds);
      return {
        hari: DAYS[d.getDay()],
        tanggal: ds,
        Total: dayPatrols.length,
        Taruna: dayPatrols.filter(p => p.kondisi === 'Taruna').length,
        Normal: dayPatrols.filter(p => p.kondisi === 'Normal' || p.kondisi === 'Aman').length,
      };
    });
  }, [weeklyPatrols, weekStart]);

  // 2. Checkpoint traffic (top checkpoints)
  const checkpointTraffic = useMemo(() => {
    const map = {};
    weeklyPatrols.forEach(p => {
      const cp = p.checkpoint || 'Tidak Dicatat';
      if (!map[cp]) map[cp] = { checkpoint: cp, count: 0, taruna: 0 };
      map[cp].count++;
      if (p.kondisi === 'Taruna') map[cp].taruna++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [weeklyPatrols]);

  // 3. Missed check-in trend (days with 0 patrols → compared to avg)
  const avgDailyPatrols = useMemo(() => {
    if (weeklyPatrols.length === 0) return 0;
    return Math.round(weeklyPatrols.length / 7);
  }, [weeklyPatrols]);

  const missedDays = dailyData.filter(d => d.Total === 0).length;

  // 4. Avg response time between checkpoints (consecutive patrols same day same employee)
  const avgResponseMinutes = useMemo(() => {
    const byEmpDate = {};
    weeklyPatrols.forEach(p => {
      if (!p.nik_karyawan || !p.tanggal || !p.waktu) return;
      const key = `${p.nik_karyawan}||${p.tanggal}`;
      if (!byEmpDate[key]) byEmpDate[key] = [];
      byEmpDate[key].push(p.waktu);
    });
    const diffs = [];
    Object.values(byEmpDate).forEach(times => {
      const sorted = [...times].sort();
      for (let i = 1; i < sorted.length; i++) {
        const [h1, m1] = sorted[i-1].split(':').map(Number);
        const [h2, m2] = sorted[i].split(':').map(Number);
        const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff > 0 && diff < 240) diffs.push(diff); // ignore >4h gaps
      }
    });
    if (!diffs.length) return 0;
    return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
  }, [weeklyPatrols]);

  // 5. Kondisi pie
  const kondisiPie = useMemo(() => {
    const map = {};
    weeklyPatrols.forEach(p => {
      const k = p.kondisi || 'Tidak Dicatat';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [weeklyPatrols]);

  // 6. Hour distribution (when are patrols done)
  const hourDist = useMemo(() => {
    const map = {};
    for (let h = 0; h < 24; h++) map[h] = 0;
    weeklyPatrols.forEach(p => {
      if (!p.waktu) return;
      const h = parseInt(p.waktu.split(':')[0]);
      map[h] = (map[h] || 0) + 1;
    });
    return Array.from({ length: 24 }, (_, h) => ({ jam: `${String(h).padStart(2,'0')}:00`, Patroli: map[h] || 0 }));
  }, [weeklyPatrols]);

  // 7. Checkpoint taruna (anomaly)
  const tarunaHotspots = checkpointTraffic.filter(c => c.taruna > 0).sort((a, b) => b.taruna - a.taruna);

  const weekLabel = weekOffset === 0 ? 'Minggu Ini' : weekOffset === -1 ? 'Minggu Lalu' : `${weekStartStr} – ${weekEndStr}`;

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-800">Analitik E-Patroli</h1>
            <p className="text-xs text-gray-500">Ringkasan mingguan · tren · titik cek · waktu respons</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {[-2,-1,0].map(w => (
              <button key={w} onClick={() => setWeekOffset(w)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${weekOffset === w ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {w === 0 ? 'Ini' : w === -1 ? 'Lalu' : '2M Lalu'}
              </button>
            ))}
          </div>
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Area</SelectItem>
              {areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Week label */}
      <div className="text-center">
        <Badge className="bg-green-100 text-green-700 border-0 text-sm px-4 py-1.5">{weekLabel} · {weekStartStr} s/d {weekEndStr}</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Patroli" value={weeklyPatrols.length} sub={`~${avgDailyPatrols}/hari`} icon={Shield} color="bg-green-100 text-green-600" />
        <StatCard label="Titik Aktif" value={checkpointTraffic.length} sub="checkpoint terdeteksi" icon={MapPin} color="bg-blue-100 text-blue-600" />
        <StatCard label="Hari Tanpa Patroli" value={missedDays} sub="hari 0 check-in" icon={AlertTriangle} color={missedDays > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"} />
        <StatCard label="Avg Respons" value={avgResponseMinutes > 0 ? `${avgResponseMinutes}m` : '-'} sub="antar titik patroli" icon={Clock} color="bg-amber-100 text-amber-600" />
      </div>

      {/* Daily Bar + Kondisi Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 border-0 shadow-sm lg:col-span-2">
          <p className="text-sm font-semibold text-gray-700 mb-3">Patroli Harian Mingguan</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hari" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Normal" stackId="a" fill="#16a34a" radius={[0,0,0,0]} />
              <Bar dataKey="Taruna" stackId="a" fill="#dc2626" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">Sebaran Kondisi</p>
          {kondisiPie.length > 0
            ? <div className="flex flex-col items-center gap-3">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={kondisiPie} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60}>
                      {kondisiPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 w-full">
                  {kondisiPie.map((k, i) => (
                    <div key={k.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-gray-600 flex-1 truncate">{k.name}</span>
                      <span className="text-xs font-bold text-gray-700">{k.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            : <p className="text-sm text-gray-400 text-center py-10">Belum ada data</p>
          }
        </Card>
      </div>

      {/* Checkpoint Traffic */}
      <Card className="p-4 border-0 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-3">Titik Pemeriksaan dengan Lalu Lintas Tertinggi</p>
        {checkpointTraffic.length === 0
          ? <p className="text-sm text-gray-400 text-center py-8">Belum ada data checkpoint minggu ini</p>
          : <ResponsiveContainer width="100%" height={200}>
              <BarChart data={checkpointTraffic} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="checkpoint" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" name="Total Scan" fill="#2563eb" radius={[0,4,4,0]} />
                <Bar dataKey="taruna" name="Taruna" fill="#dc2626" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
        }
      </Card>

      {/* Hour Distribution */}
      <Card className="p-4 border-0 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-3">Distribusi Patroli per Jam (minggu ini)</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={hourDist}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="jam" tick={{ fontSize: 9 }} interval={1} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="Patroli" fill="#7c3aed" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Taruna Hotspots */}
      {tarunaHotspots.length > 0 && (
        <Card className="p-4 border-0 shadow-sm border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm font-semibold text-red-700">Hotspot Taruna — Perlu Perhatian</p>
          </div>
          <div className="space-y-2">
            {tarunaHotspots.map(cp => (
              <div key={cp.checkpoint} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{cp.checkpoint}</p>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${Math.min(100, (cp.taruna / cp.count) * 100)}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-red-600">{cp.taruna} taruna</p>
                  <p className="text-[10px] text-gray-400">dari {cp.count} scan</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Missed Check-in Detail */}
      {missedDays > 0 && (
        <Card className="p-4 border-0 shadow-sm border-l-4 border-l-orange-400">
          <p className="text-sm font-semibold text-orange-700 mb-2">Tren Check-in Terlewat</p>
          <div className="flex gap-2 flex-wrap">
            {dailyData.filter(d => d.Total === 0).map(d => (
              <Badge key={d.tanggal} className="bg-orange-100 text-orange-700 border-0">{d.hari} ({d.tanggal})</Badge>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {missedDays} dari 7 hari tidak ada aktivitas patroli tercatat di area yang dipilih.
          </p>
        </Card>
      )}

      {isLoading && <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-2xl" />)}</div>}
    </div>
  );
}