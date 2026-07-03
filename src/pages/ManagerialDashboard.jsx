import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createPageUrl } from '@/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, LineChart, Line, Legend
} from 'recharts';
import { TrendingUp, MapPin, Shield, CalendarClock, Wrench, ClipboardCheck, Download, RefreshCw, AlertTriangle, CheckCircle2, Star, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MGMT = ['Master Admin','Chief Security','Supervisor Facility','Admin Pos'];

// eslint-disable-next-line no-unused-vars
function KPICard({ label, value, sub, icon: Icon, color, trend }) {
  return (
    <Card className={`p-4 border-0 shadow-sm ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-black">{value}</p>
          <p className="text-xs mt-0.5">{label}</p>
          {sub && <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>}
        </div>
        <Icon className="w-6 h-6 opacity-60" />
      </div>
      {trend !== undefined && (
        <div className={`text-[10px] mt-2 font-medium ${trend >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs minggu lalu
        </div>
      )}
    </Card>
  );
}

export default function ManagerialDashboard() {
  const emp = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMgmt = MGMT.includes(emp?.role || emp?.jabatan);
  const [filterArea, setFilterArea] = useState('all');
  const [sending, setSending] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7 + weekOffset * 7);
  const weekAgo2 = new Date(today); weekAgo2.setDate(today.getDate() - 14 + weekOffset * 7);
  const fmtDate = (d) => d.toISOString().slice(0, 10);
  const weekStart = fmtDate(weekAgo);
  const weekEnd = fmtDate(new Date(weekAgo.getTime() + 6 * 86400000));
  const prevStart = fmtDate(weekAgo2);
  const prevEnd = fmtDate(weekAgo);

  const { data: areas = [] } = useQuery({ queryKey: ['mgr-areas'], queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' }) });
  const { data: attendances = [], isLoading: loadAtt } = useQuery({ queryKey: ['mgr-att'], queryFn: () => base44.entities.Attendance.list('-tanggal', 3000) });
  const { data: patrols = [], isLoading: loadPat } = useQuery({ queryKey: ['mgr-pat'], queryFn: () => base44.entities.EPatrol.list('-tanggal', 2000) });
  const { data: tickets = [] } = useQuery({ queryKey: ['mgr-tickets'], queryFn: () => base44.entities.FacilityTicket?.list('-created_date', 500) || Promise.resolve([]) });
  const { data: sopAudits = [] } = useQuery({ queryKey: ['mgr-sop'], queryFn: () => base44.entities.SOPAudit?.list('-tanggal', 500) || Promise.resolve([]) });
  const { data: employees = [] } = useQuery({ queryKey: ['mgr-emp'], queryFn: () => base44.entities.Employee.filter({ status_aktif: 'Aktif' }) });

  const isLoading = loadAtt || loadPat;

  const af = (d) => filterArea === 'all' || d.area_tugas === filterArea;

  // This week data
  const thisWeekAtt = useMemo(() => attendances.filter(a => a.tanggal >= weekStart && a.tanggal <= weekEnd && af(a)), [attendances, weekStart, weekEnd, filterArea]);
  const thisWeekPat = useMemo(() => patrols.filter(p => p.tanggal >= weekStart && p.tanggal <= weekEnd && af(p)), [patrols, weekStart, weekEnd, filterArea]);
  const thisWeekTickets = useMemo(() => tickets.filter(t => (t.tanggal_lapor || '') >= weekStart && (t.tanggal_lapor || '') <= weekEnd && af(t)), [tickets, weekStart, weekEnd, filterArea]);
  const thisWeekSOP = useMemo(() => sopAudits.filter(a => a.tanggal >= weekStart && a.tanggal <= weekEnd && af(a)), [sopAudits, weekStart, weekEnd, filterArea]);

  // Prev week
  const prevWeekAtt = useMemo(() => attendances.filter(a => a.tanggal >= prevStart && a.tanggal <= prevEnd && af(a)), [attendances, prevStart, prevEnd, filterArea]);
  const prevWeekPat = useMemo(() => patrols.filter(p => p.tanggal >= prevStart && p.tanggal <= prevEnd && af(p)), [patrols, prevStart, prevEnd, filterArea]);

  const hadirCount = thisWeekAtt.filter(a => a.status === 'Hadir' || a.status === 'Backup').length;
  const hadirPrev = prevWeekAtt.filter(a => a.status === 'Hadir' || a.status === 'Backup').length;
  const hadirTrend = hadirPrev > 0 ? Math.round(((hadirCount - hadirPrev) / hadirPrev) * 100) : 0;
  const patrolTrend = prevWeekPat.length > 0 ? Math.round(((thisWeekPat.length - prevWeekPat.length) / prevWeekPat.length) * 100) : 0;

  const avgSOP = thisWeekSOP.length > 0 ? Math.round(thisWeekSOP.reduce((s, a) => s + (a.skor || 0), 0) / thisWeekSOP.length) : null;
  const taruna = thisWeekPat.filter(p => p.kondisi === 'Taruna').length;

  // Area performance score
  const areaScores = useMemo(() => {
    const areaList = filterArea === 'all' ? areas.map(a => a.nama_area) : [filterArea];
    return areaList.map(area => {
      const att = thisWeekAtt.filter(a => a.area_tugas === area);
      const pat = thisWeekPat.filter(p => p.area_tugas === area);
      const tkt = thisWeekTickets.filter(t => t.area_tugas === area);
      const sop = thisWeekSOP.filter(a => a.area_tugas === area);
      const hadirRate = att.length > 0 ? Math.round((att.filter(a => a.status === 'Hadir').length / att.length) * 100) : 0;
      const ticketRate = tkt.length > 0 ? Math.round((tkt.filter(t => t.status === 'Selesai').length / tkt.length) * 100) : 100;
      const sopAvg = sop.length > 0 ? Math.round(sop.reduce((s, a) => s + (a.skor || 0), 0) / sop.length) : 0;
      const tarunaScore = Math.max(0, 100 - pat.filter(p => p.kondisi === 'Taruna').length * 10);
      const patrolScore = Math.min(100, pat.length * 2);
      const overall = Math.round((hadirRate * 0.30) + (patrolScore * 0.25) + (ticketRate * 0.20) + (tarunaScore * 0.15) + (sopAvg * 0.10));
      return { area, hadirRate, ticketRate, sopAvg, tarunaScore, patrolScore, overall, patCount: pat.length, tarunaCount: pat.filter(p => p.kondisi === 'Taruna').length };
    }).sort((a, b) => b.overall - a.overall);
  }, [areas, thisWeekAtt, thisWeekPat, thisWeekTickets, thisWeekSOP, filterArea]);

  // Daily trend this week
  const dailyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekAgo); d.setDate(weekAgo.getDate() + i);
      const ds = fmtDate(d);
      const dayNames = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
      return {
        hari: dayNames[d.getDay()],
        Hadir: attendances.filter(a => a.tanggal === ds && (a.status === 'Hadir') && af(a)).length,
        Patroli: patrols.filter(p => p.tanggal === ds && af(p)).length,
        Tiket: tickets.filter(t => (t.tanggal_lapor || '') === ds && af(t)).length,
      };
    });
  }, [attendances, patrols, tickets, weekStart, filterArea, weekAgo]);

  // Radar for selected area
  const radarData = useMemo(() => {
    if (!areaScores[0]) return [];
    const a = areaScores[0];
    return [
      { subject: 'Kehadiran', value: a.hadirRate },
      { subject: 'Patroli', value: a.patrolScore },
      { subject: 'Taruna-Free', value: a.tarunaScore },
      { subject: 'Tiket Selesai', value: a.ticketRate },
      { subject: 'Kepatuhan SOP', value: a.sopAvg },
    ];
  }, [areaScores]);

  const handleSendReport = async () => {
    setSending(true);
    try {
      const res = await base44.functions.invoke('weeklyAreaReport', {});
      toast.success(res.data?.message || 'Laporan berhasil dikirim!');
    } catch (e) {
      toast.error('Gagal mengirim laporan: ' + e.message);
    }
    setSending(false);
  };

  if (!isMgmt) {
    window.location.href = createPageUrl('EmployeeDashboard');
    return null;
  }

  if (isLoading) return (
    <div className="space-y-4">
      {Array(6).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-8">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7B1A2C]/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-[#7B1A2C]" /></div>
            <div>
              <h1 className="text-lg font-black text-gray-800">Dashboard Manajerial</h1>
              <p className="text-xs text-gray-500">Evaluasi otomatis kinerja area mingguan · laporan PDF via email</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              {[-2,-1,0].map(w => (
                <button key={w} onClick={() => setWeekOffset(w)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${weekOffset === w ? 'bg-[#7B1A2C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {w === 0 ? 'Ini' : w === -1 ? 'Lalu' : '2M Lalu'}
                </button>
              ))}
            </div>
            <Select value={filterArea} onValueChange={setFilterArea}>
              <SelectTrigger className="w-44 h-9 text-sm"><MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" /><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Semua Area</SelectItem>{areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handleSendReport} disabled={sending} className="bg-[#7B1A2C] hover:bg-[#5A1220] text-white h-9 gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Mengirim...' : 'Kirim Laporan PDF'}
            </Button>
          </div>
        </div>
        <div className="mt-3 text-center">
          <Badge className="bg-[#7B1A2C]/10 text-[#7B1A2C] border-0 px-4 py-1">{weekStart} s/d {weekEnd}</Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Kehadiran" value={hadirCount} sub={`${thisWeekAtt.length > 0 ? Math.round((hadirCount/thisWeekAtt.length)*100) : 0}% rate`} icon={CalendarClock} color="bg-emerald-50 text-emerald-700" trend={hadirTrend} />
        <KPICard label="Patroli" value={thisWeekPat.length} sub={`${taruna} taruna`} icon={Shield} color="bg-blue-50 text-blue-700" trend={patrolTrend} />
        <KPICard label="Tiket Fasilitas" value={thisWeekTickets.length} sub={`${thisWeekTickets.filter(t => t.status === 'Selesai').length} selesai`} icon={Wrench} color="bg-orange-50 text-orange-700" />
        <KPICard label="Avg Skor SOP" value={avgSOP !== null ? avgSOP : '-'} sub={`${thisWeekSOP.length} audit`} icon={ClipboardCheck} color={avgSOP !== null ? (avgSOP >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700') : 'bg-gray-50 text-gray-600'} />
      </div>

      {/* Alerts */}
      {taruna > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700"><strong>{taruna} kejadian Taruna</strong> terdeteksi minggu ini. Segera tindak lanjuti.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily trend */}
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-sm font-bold text-gray-700 mb-3">Tren Harian Minggu Ini</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hari" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Hadir" fill="#16a34a" radius={[3,3,0,0]} />
              <Bar dataKey="Patroli" fill="#2563eb" radius={[3,3,0,0]} />
              <Bar dataKey="Tiket" fill="#d97706" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Radar best area */}
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-sm font-bold text-gray-700 mb-1">Profil Kinerja {filterArea !== 'all' ? filterArea : areaScores[0]?.area || 'Area Terbaik'}</p>
          {radarData.length > 0
            ? <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <Radar dataKey="value" stroke="#7b1a2c" fill="#7b1a2c" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip formatter={v => `${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            : <p className="text-sm text-gray-400 text-center py-16">Pilih area atau tunggu data</p>
          }
        </Card>
      </div>

      {/* Area Ranking */}
      <Card className="p-4 border-0 shadow-sm">
        <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" />Ranking Evaluasi Area Mingguan</p>
        <p className="text-xs text-gray-400 mb-3">Skor = Kehadiran(30%) + Patroli(25%) + Tiket Selesai(20%) + Zero Taruna(15%) + SOP(10%)</p>
        {areaScores.length === 0
          ? <p className="text-sm text-gray-400 text-center py-8">Belum ada data</p>
          : <div className="space-y-3">
              {areaScores.map((a, idx) => (
                <div key={a.area} className="flex items-center gap-4">
                  <span className="text-xl shrink-0 w-8">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{a.area}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-500">H:{a.hadirRate}% P:{a.patCount}</span>
                        {a.tarunaCount > 0 && <span className="text-xs text-red-500">T:{a.tarunaCount}</span>}
                        <Badge className={`border-0 text-xs font-black ${a.overall >= 80 ? 'bg-emerald-100 text-emerald-700' : a.overall >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{a.overall}</Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${a.overall}%`, background: a.overall >= 80 ? '#16a34a' : a.overall >= 60 ? '#d97706' : '#dc2626' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
        }
      </Card>

      {/* Bottom 3 alert */}
      {areaScores.filter(a => a.overall < 60).length > 0 && (
        <Card className="p-4 border-0 shadow-sm border-l-4 border-l-red-500">
          <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Area Kritis (Skor &lt; 60) — Perlu Intervensi Segera</p>
          <div className="space-y-2">
            {areaScores.filter(a => a.overall < 60).map(a => (
              <div key={a.area} className="bg-red-50 rounded-xl p-3 text-sm">
                <p className="font-medium text-gray-800">{a.area} — Skor: <span className="text-red-600 font-black">{a.overall}</span></p>
                <p className="text-xs text-gray-500 mt-0.5">Hadir: {a.hadirRate}% · Patroli: {a.patCount} · Taruna: {a.tarunaCount} · Tiket selesai: {a.ticketRate}%</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-500 flex items-start gap-2">
        <RefreshCw className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <p>Laporan PDF mingguan dikirim otomatis setiap <strong>Senin pukul 08:00 WIB</strong> ke seluruh supervisor dan manager aktif. Klik tombol "Kirim Laporan PDF" untuk mengirim sekarang.</p>
      </div>
    </div>
  );
}