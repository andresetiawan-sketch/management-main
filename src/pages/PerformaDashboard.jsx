import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { Shield, CalendarClock, ClipboardCheck, TrendingUp, Users, MapPin, Star, Clock, Award, AlertTriangle } from 'lucide-react';
import SupervisorDailyDashboard from '@/components/dashboard/SupervisorDailyDashboard';

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#d97706'];
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function StatMini({ label, value, icon: Icon, color }) {
  return (
    <Card className="p-4 border-0 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-black text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}

export default function PerformaDashboard() {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const empRole = emp?.role || emp?.jabatan || '';
  const PRIVILEGED = ['Master Admin','Admin Pos Security','Admin Pos','Admin Facility','Supervisor Security','Supervisor Facility','Chief Security','Leader Security','Leader Facility','Admin Security','SPV Security'];
  const canAccess = PRIVILEGED.includes(empRole) || empRole === 'Master Admin';

  const [filterArea, setFilterArea] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const thisYear = today.slice(0, 4);

  const { data: areas = [] } = useQuery({ queryKey: ['perf-areas'], queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' }) });
  const { data: attendances = [], isLoading: loadAtt } = useQuery({ queryKey: ['perf-attendance'], queryFn: () => base44.entities.Attendance.list('-tanggal', 2000) });
  const { data: patrols = [], isLoading: loadPatrol } = useQuery({ queryKey: ['perf-patrols'], queryFn: () => base44.entities.EPatrol.list('-tanggal', 2000) });
  const { data: tickets = [] } = useQuery({ queryKey: ['perf-tickets'], queryFn: () => base44.entities.FacilityTicket?.list('-tanggal_lapor', 500) || Promise.resolve([]) });
  const { data: employees = [] } = useQuery({ queryKey: ['perf-employees'], queryFn: () => base44.entities.Employee.filter({ status_aktif: 'Aktif' }) });
  const { data: checklists = [] } = useQuery({ queryKey: ['perf-checklists'], queryFn: () => base44.entities.DailyChecklist?.list('-tanggal', 500) || Promise.resolve([]) });
  const { data: hydrants = [] } = useQuery({ queryKey: ['perf-hydrants'], queryFn: () => base44.entities.ChecklistHydrant.list('-tanggal', 500) });

  const isLoading = loadAtt || loadPatrol;

  // ─── Computed Data ───────────────────────────────────────────────────────────
  const areaFilter = d => filterArea === 'all' || d.area_tugas === filterArea;

  // Monthly attendance trend (12 months)
  const monthlyAttTrend = useMemo(() => {
    return MONTHS.map((m, idx) => {
      const monthKey = `${thisYear}-${String(idx + 1).padStart(2, '0')}`;
      const monthData = attendances.filter(a => a.tanggal?.startsWith(monthKey) && areaFilter(a));
      const hadir = monthData.filter(a => a.status === 'Hadir' || a.status === 'Backup').length;
      const alfa = monthData.filter(a => a.status === 'Alfa').length;
      const izin = monthData.filter(a => ['Izin','Cuti','Sakit'].includes(a.status)).length;
      return { bulan: m, Hadir: hadir, Alfa: alfa, Izin: izin, Total: monthData.length };
    });
  }, [attendances, filterArea, thisYear]);

  // Average jam hadir per month
  const avgJamHadir = useMemo(() => {
    return MONTHS.map((m, idx) => {
      const monthKey = `${thisYear}-${String(idx + 1).padStart(2, '0')}`;
      const monthData = attendances.filter(a =>
        a.tanggal?.startsWith(monthKey) && areaFilter(a) && a.jam_hadir && a.jam_pulang
      );
      if (monthData.length === 0) return { bulan: m, 'Avg Jam': 0 };
      const totalMinutes = monthData.reduce((sum, a) => {
        const [hh, mm] = a.jam_hadir.split(':').map(Number);
        const [ph, pm] = a.jam_pulang.split(':').map(Number);
        let mins = (ph * 60 + pm) - (hh * 60 + mm);
        if (mins < 0) mins += 24 * 60;
        return sum + mins;
      }, 0);
      return { bulan: m, 'Avg Jam': +(totalMinutes / monthData.length / 60).toFixed(1) };
    });
  }, [attendances, filterArea, thisYear]);

  // Area effectiveness ranking
  const areaRanking = useMemo(() => {
    const areaNames = filterArea === 'all' ? areas.map(a => a.nama_area) : [filterArea];
    return areaNames.map(area => {
      const attCount = attendances.filter(a => a.area_tugas === area && a.tanggal?.startsWith(thisMonth)).length;
      const hadirCount = attendances.filter(a => a.area_tugas === area && a.tanggal?.startsWith(thisMonth) && (a.status === 'Hadir' || a.status === 'Backup')).length;
      const patrolCount = patrols.filter(p => p.area_tugas === area && p.tanggal?.startsWith(thisMonth)).length;
      const tarunaCount = patrols.filter(p => p.area_tugas === area && p.kondisi === 'Taruna').length;
      const ticketDone = tickets.filter(t => t.area_tugas === area && t.status === 'Selesai').length;
      const ticketTotal = tickets.filter(t => t.area_tugas === area).length;
      const hadirRate = attCount > 0 ? Math.round((hadirCount / attCount) * 100) : 0;
      const ticketRate = ticketTotal > 0 ? Math.round((ticketDone / ticketTotal) * 100) : 100;
      const patrolScore = Math.min(100, patrolCount * 2);
      const tarunaScore = Math.max(0, 100 - tarunaCount * 10);
      const score = Math.round((hadirRate * 0.35) + (patrolScore * 0.30) + (ticketRate * 0.20) + (tarunaScore * 0.15));
      return { area, hadirRate, patrolCount, tarunaCount, ticketDone, ticketTotal, score };
    }).sort((a, b) => b.score - a.score);
  }, [areas, attendances, patrols, tickets, filterArea, thisMonth]);

  // Top performing employees (by patrol + attendance)
  const topEmployees = useMemo(() => {
    const empMap = {};
    patrols.filter(p => p.tanggal?.startsWith(thisMonth) && areaFilter(p)).forEach(p => {
      if (!empMap[p.nik_karyawan]) empMap[p.nik_karyawan] = { nik: p.nik_karyawan, nama: p.nama_karyawan, patroli: 0, hadir: 0, taruna: 0 };
      empMap[p.nik_karyawan].patroli++;
      if (p.kondisi === 'Taruna') empMap[p.nik_karyawan].taruna++;
    });
    attendances.filter(a => a.tanggal?.startsWith(thisMonth) && areaFilter(a) && (a.status === 'Hadir' || a.status === 'Backup')).forEach(a => {
      if (!empMap[a.nik_karyawan]) empMap[a.nik_karyawan] = { nik: a.nik_karyawan, nama: a.nama_karyawan, patroli: 0, hadir: 0, taruna: 0 };
      empMap[a.nik_karyawan].hadir++;
    });
    return Object.values(empMap)
      .map(e => ({ ...e, score: e.hadir * 2 + e.patroli * 3 - e.taruna * 5 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [patrols, attendances, filterArea, thisMonth]);

  // Patrol kondisi pie
  const patrolKondisi = useMemo(() => {
    const map = {};
    patrols.filter(p => p.tanggal?.startsWith(thisMonth) && areaFilter(p)).forEach(p => {
      const k = p.kondisi || 'Tidak Dicatat';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [patrols, filterArea, thisMonth]);

  // Daily checklist avg score
  const checklistAvg = useMemo(() => {
    const thisMonthCL = checklists.filter(c => c.tanggal?.startsWith(thisMonth) && c.status_evaluasi === 'Sudah Dievaluasi');
    if (!thisMonthCL.length) return null;
    return Math.round(thisMonthCL.reduce((s, c) => s + (c.nilai_supervisor || 0), 0) / thisMonthCL.length);
  }, [checklists, thisMonth]);

  // Radar chart per area (bulan ini)
  const radarData = useMemo(() => {
    if (filterArea === 'all' || !filterArea) return [];
    const att = attendances.filter(a => a.area_tugas === filterArea && a.tanggal?.startsWith(thisMonth));
    const pat = patrols.filter(p => p.area_tugas === filterArea && p.tanggal?.startsWith(thisMonth));
    const hydrantOk = hydrants.filter(h => h.area_tugas === filterArea && h.kondisi === 'Baik').length;
    const hydrantTotal = hydrants.filter(h => h.area_tugas === filterArea).length;
    const hadirRate = att.length ? Math.round((att.filter(a => a.status === 'Hadir').length / att.length) * 100) : 0;
    const patrolScore = Math.min(100, pat.length * 3);
    const tarunaScore = Math.max(0, 100 - patrols.filter(p => p.area_tugas === filterArea && p.kondisi === 'Taruna').length * 10);
    const hydrantScore = hydrantTotal ? Math.round((hydrantOk / hydrantTotal) * 100) : 100;
    const checkArea = checklists.filter(c => c.area_tugas === filterArea && c.status_evaluasi === 'Sudah Dievaluasi');
    const clScore = checkArea.length ? Math.round(checkArea.reduce((s, c) => s + (c.nilai_supervisor || 0), 0) / checkArea.length) : 0;
    return [
      { subject: 'Kehadiran', value: hadirRate },
      { subject: 'Patroli', value: patrolScore },
      { subject: 'Zero Taruna', value: tarunaScore },
      { subject: 'Fasilitas', value: hydrantScore },
      { subject: 'Checklist', value: clScore },
    ];
  }, [filterArea, attendances, patrols, hydrants, checklists, thisMonth]);

  const todayHadir = attendances.filter(a => a.tanggal === today && (a.status === 'Hadir') && areaFilter(a)).length;
  const todayAlfa = attendances.filter(a => a.tanggal === today && a.status === 'Alfa' && areaFilter(a)).length;
  const todayPatrol = patrols.filter(p => p.tanggal === today && areaFilter(p)).length;
  const monthTaruna = patrols.filter(p => p.tanggal?.startsWith(thisMonth) && p.kondisi === 'Taruna' && areaFilter(p)).length;

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'tren', label: 'Tren Bulanan' },
    { id: 'ranking', label: 'Ranking Area' },
    { id: 'karyawan', label: 'Top Karyawan' },
  ];

  if (!canAccess) {
    window.location.href = createPageUrl('EmployeeDashboard');
    return null;
  }

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;

  return (
    <div className="space-y-5">
      <SupervisorDailyDashboard />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[var(--maroon)]" />
          <h2 className="text-lg font-bold text-gray-800">Dashboard Analitik Produktivitas</h2>
        </div>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-52 h-9 text-sm">
            <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
            <SelectValue placeholder="Semua Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Area</SelectItem>
            {areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatMini label="Hadir Hari Ini" value={todayHadir} icon={CalendarClock} color="bg-emerald-100 text-emerald-600" />
        <StatMini label="Alfa Hari Ini" value={todayAlfa} icon={Users} color="bg-red-100 text-red-600" />
        <StatMini label="Patroli Hari Ini" value={todayPatrol} icon={Shield} color="bg-blue-100 text-blue-600" />
        <StatMini label="Taruna Bulan Ini" value={monthTaruna} icon={AlertTriangle} color={monthTaruna > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-white shadow text-[var(--maroon)]' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Radar (only for specific area) */}
          {filterArea !== 'all' && radarData.length > 0 && (
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-2">Profil Kinerja Area: {filterArea}</p>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <Radar name="Skor" dataKey="value" stroke="#7b1a2c" fill="#7b1a2c" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip formatter={v => `${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Kondisi Patroli Pie */}
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-3">Kondisi Patroli Bulan Ini</p>
              {patrolKondisi.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={patrolKondisi} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                        {patrolKondisi.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 flex-1">
                    {patrolKondisi.map((k, i) => (
                      <div key={k.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-sm text-gray-600 flex-1">{k.name}</span>
                        <span className="text-sm font-bold text-gray-800">{k.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-gray-400 text-center py-8">Belum ada data patroli bulan ini</p>}
            </Card>

            {/* Daily Checklist Score */}
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-3">Rata-rata Nilai Checklist Harian</p>
              <div className="flex flex-col items-center justify-center h-36 gap-2">
                {checklistAvg !== null ? (
                  <>
                    <div className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center ${checklistAvg >= 80 ? 'border-emerald-400 text-emerald-600' : checklistAvg >= 60 ? 'border-yellow-400 text-yellow-600' : 'border-red-400 text-red-600'}`}>
                      <span className="text-3xl font-black">{checklistAvg}</span>
                      <span className="text-xs">/ 100</span>
                    </div>
                    <p className="text-xs text-gray-500">Berdasarkan {checklists.filter(c => c.status_evaluasi === 'Sudah Dievaluasi' && c.tanggal?.startsWith(thisMonth)).length} evaluasi bulan ini</p>
                  </>
                ) : (
                  <div className="text-center text-gray-400">
                    <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada evaluasi checklist bulan ini</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── TREN BULANAN TAB ── */}
      {activeTab === 'tren' && (
        <div className="space-y-4">
          <Card className="p-4 border-0 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-4">Tren Kehadiran Per Bulan ({thisYear})</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyAttTrend} margin={{ bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Hadir" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Izin" stackId="a" fill="#d97706" />
                <Bar dataKey="Alfa" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4 border-0 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-4">Rata-rata Durasi Jam Hadir per Bulan (jam)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={avgJamHadir}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 12]} />
                <Tooltip formatter={v => `${v} jam`} />
                <Line type="monotone" dataKey="Avg Jam" stroke="#7b1a2c" strokeWidth={2.5} dot={{ fill: '#7b1a2c', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4 border-0 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-4">Tren Patroli per Bulan ({thisYear})</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MONTHS.map((m, idx) => {
                const mk = `${thisYear}-${String(idx + 1).padStart(2, '0')}`;
                return {
                  bulan: m,
                  Patroli: patrols.filter(p => p.tanggal?.startsWith(mk) && areaFilter(p)).length,
                  Taruna: patrols.filter(p => p.tanggal?.startsWith(mk) && p.kondisi === 'Taruna' && areaFilter(p)).length,
                };
              })}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Patroli" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Taruna" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ── RANKING AREA TAB ── */}
      {activeTab === 'ranking' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Skor efektivitas berdasarkan kehadiran (35%), patroli (30%), tiket selesai (20%), zero taruna (15%)</p>
          {areaRanking.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Pilih area atau tambah data</p>
          ) : areaRanking.map((a, idx) => (
            <Card key={a.area} className="p-4 border-0 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shrink-0 ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : idx === 1 ? 'bg-gray-100 text-gray-500' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{a.area}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs text-gray-500">Hadir: <strong className="text-gray-700">{a.hadirRate}%</strong></span>
                    <span className="text-xs text-gray-500">Patroli: <strong className="text-gray-700">{a.patrolCount}</strong></span>
                    {a.tarunaCount > 0 && <span className="text-xs text-red-500">Taruna: <strong>{a.tarunaCount}</strong></span>}
                    <span className="text-xs text-gray-500">Tiket: <strong className="text-gray-700">{a.ticketDone}/{a.ticketTotal}</strong></span>
                  </div>
                  {/* Score bar */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${a.score}%`, background: a.score >= 80 ? '#16a34a' : a.score >= 60 ? '#d97706' : '#dc2626' }} />
                    </div>
                    <span className={`text-sm font-black w-10 text-right ${a.score >= 80 ? 'text-emerald-600' : a.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{a.score}</span>
                  </div>
                </div>
                <Badge className={`shrink-0 border-0 ${a.score >= 80 ? 'bg-emerald-100 text-emerald-700' : a.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {a.score >= 80 ? 'Sangat Baik' : a.score >= 60 ? 'Cukup' : 'Perlu Perhatian'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── TOP KARYAWAN TAB ── */}
      {activeTab === 'karyawan' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Peringkat berdasarkan kehadiran + patroli bulan ini (skor = hadir×2 + patroli×3 - taruna×5)</p>
          {topEmployees.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Belum ada data bulan ini</p>
          ) : topEmployees.map((e, idx) => (
            <Card key={e.nik} className="p-4 border-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 font-black ${idx === 0 ? 'bg-yellow-100' : idx === 1 ? 'bg-gray-100' : idx === 2 ? 'bg-orange-100' : 'bg-slate-50'}`}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{e.nama}</p>
                  <p className="text-xs text-gray-400">{e.nik}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs"><CalendarClock className="w-3 h-3 inline text-emerald-500 mr-0.5" />{e.hadir} hadir</span>
                    <span className="text-xs"><Shield className="w-3 h-3 inline text-blue-500 mr-0.5" />{e.patroli} patroli</span>
                    {e.taruna > 0 && <span className="text-xs text-red-500"><AlertTriangle className="w-3 h-3 inline mr-0.5" />{e.taruna} taruna</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-black text-[var(--maroon)]">{e.score}</p>
                  <p className="text-xs text-gray-400">skor</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}