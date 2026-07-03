import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock, AlertTriangle, CheckCircle2, Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

// Default patrol schedule: every 2 hours
const DEFAULT_INTERVAL_HOURS = 2;

function buildPatrolSchedule(checkpoints, startHour = 6, endHour = 22) {
  const schedule = [];
  let hour = startHour;
  let cpIndex = 0;
  while (hour <= endHour) {
    const hh = String(hour).padStart(2, '0');
    schedule.push({
      time: `${hh}:00`,
      checkpoint: checkpoints[cpIndex % checkpoints.length]?.nama || `Checkpoint ${cpIndex + 1}`,
      hour,
    });
    cpIndex++;
    hour += DEFAULT_INTERVAL_HOURS;
  }
  return schedule;
}

export default function PatrolScheduleWidget({ employee }) {
  const [expanded, setExpanded] = useState(false);
  const [missedAlerts, setMissedAlerts] = useState([]);
  const alertedRef = useRef(new Set());

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const currentHour = now.getHours();

  const { data: areas = [] } = useQuery({
    queryKey: ['patrol-sched-areas'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' }),
  });

  const { data: todayPatrols = [] } = useQuery({
    queryKey: ['patrol-today', today, employee?.area_tugas],
    queryFn: () => employee?.area_tugas
      ? base44.entities.EPatrol.filter({ tanggal: today, area_tugas: employee.area_tugas })
      : base44.entities.EPatrol.filter({ tanggal: today }),
    refetchInterval: 60000, // refresh every minute
  });

  const area = areas.find(a => a.nama_area === employee?.area_tugas);
  const checkpoints = area?.e_patrol_checkpoints || [];
  const schedule = checkpoints.length > 0 ? buildPatrolSchedule(checkpoints) : [];

  // Check which schedule slots have been covered
  const getSlotStatus = (slot) => {
    const slotStart = slot.hour;
    const slotEnd = slot.hour + DEFAULT_INTERVAL_HOURS;
    const covered = todayPatrols.some(p => {
      const [h] = (p.waktu || '00:00').split(':').map(Number);
      return h >= slotStart && h < slotEnd && p.checkpoint === slot.checkpoint;
    });
    const isPast = currentHour >= slotEnd;
    const isCurrent = currentHour >= slotStart && currentHour < slotEnd;
    return { covered, isPast, isCurrent };
  };

  // Alert for missed patrols
  useEffect(() => {
    if (schedule.length === 0) return;
    const missed = schedule.filter(slot => {
      const { covered, isPast } = getSlotStatus(slot);
      return isPast && !covered;
    });
    setMissedAlerts(missed);

    // Show toast for newly missed slots
    missed.forEach(slot => {
      const key = `${slot.time}-${slot.checkpoint}`;
      if (!alertedRef.current.has(key)) {
        alertedRef.current.add(key);
        toast.warning(`⚠ Area "${slot.checkpoint}" belum dipatroli sejak ${slot.time}!`, {
          duration: 8000,
          id: key,
        });
      }
    });
  }, [todayPatrols, schedule.length, currentHour]);

  const coveredCount = schedule.filter(s => getSlotStatus(s).covered).length;
  const progressPct = schedule.length > 0 ? Math.round((coveredCount / schedule.length) * 100) : 0;

  if (schedule.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-700 text-white"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-sm font-bold">Jadwal Rute Patroli Hari Ini</span>
          {missedAlerts.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
              {missedAlerts.length} belum patroli
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-300">{coveredCount}/{schedule.length} selesai</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200">
        <div
          className="h-1.5 transition-all duration-500"
          style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#16a34a' : progressPct > 50 ? '#d97706' : '#dc2626' }}
        />
      </div>

      {/* Missed alert banner */}
      {missedAlerts.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">
            {missedAlerts.length} area belum dipatroli: {missedAlerts.map(m => m.checkpoint).join(', ')}
          </p>
        </div>
      )}

      {/* Schedule list */}
      {expanded && (
        <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
          {schedule.map((slot, idx) => {
            const { covered, isPast, isCurrent } = getSlotStatus(slot);
            return (
              <div key={idx} className={`flex items-center gap-3 px-4 py-2.5 ${isCurrent ? 'bg-blue-50' : covered ? 'bg-emerald-50/40' : isPast ? 'bg-red-50/40' : 'bg-white'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${covered ? 'bg-emerald-100' : isPast ? 'bg-red-100' : isCurrent ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  {covered
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    : isPast
                    ? <AlertTriangle className="w-4 h-4 text-red-500" />
                    : isCurrent
                    ? <Bell className="w-4 h-4 text-blue-500 animate-pulse" />
                    : <Clock className="w-4 h-4 text-gray-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{slot.checkpoint}</p>
                  <p className="text-xs text-gray-400">{slot.time} — {String(slot.hour + DEFAULT_INTERVAL_HOURS).padStart(2,'0')}:00</p>
                </div>
                <Badge className={`text-[10px] border-0 shrink-0 ${
                  covered ? 'bg-emerald-100 text-emerald-700' :
                  isPast ? 'bg-red-100 text-red-700' :
                  isCurrent ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {covered ? '✓ Selesai' : isPast ? '⚠ Terlewat' : isCurrent ? '▶ Sekarang' : 'Terjadwal'}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}