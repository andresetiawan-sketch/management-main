import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

export function detectConflicts(schedules, employees = []) {
  const conflicts = [];
  const reguDateMap = {};
  
  // Group schedules by regu and tanggal
  schedules.forEach(s => {
    if (!s.regu || !s.tanggal) return;
    const key = `${s.regu}||${s.tanggal}`;
    if (!reguDateMap[key]) reguDateMap[key] = [];
    reguDateMap[key].push(s);
  });
  
  // Check for conflicts
  Object.entries(reguDateMap).forEach(([key, slots]) => {
    if (slots.length <= 1) return;
    
    const [regu, tanggal] = key.split('||');
    
    // Skip Non Regu - multiple schedules on same date is normal (different employees)
    if (regu === 'Non Regu') return;
    
    // Group by area
    const byArea = {};
    slots.forEach(s => {
      const area = s.area_tugas || 'Unknown';
      if (!byArea[area]) byArea[area] = [];
      byArea[area].push(s);
    });
    
    // Check each area group for time overlaps
    Object.entries(byArea).forEach(([area, areaSlots]) => {
      if (areaSlots.length <= 1) return;
      
      // Check for time overlaps within same area
      for (let i = 0; i < areaSlots.length; i++) {
        for (let j = i + 1; j < areaSlots.length; j++) {
          const s1 = areaSlots[i];
          const s2 = areaSlots[j];
          
          // Skip if same schedule
          if (s1.id === s2.id) continue;
          
          // Check time overlap
          const start1 = timeToMinutes(s1.jam_mulai);
          const end1 = timeToMinutes(s1.jam_selesai);
          const start2 = timeToMinutes(s2.jam_mulai);
          const end2 = timeToMinutes(s2.jam_selesai);
          
          // Overlap exists if one starts before the other ends
          const hasOverlap = (start1 < end2 && end1 > start2);
          
          if (hasOverlap) {
            const times = areaSlots.map(s => `${s.jam_mulai}–${s.jam_selesai} (${s.catatan || s.tipe_shift || '-'})`);
            conflicts.push({ 
              area, 
              regu, 
              tanggal, 
              slots: areaSlots,
              message: `${regu} memiliki ${areaSlots.length} jadwal yang overlap pada ${tanggal}: ${times.join(', ')}`
            });
            break; // Only report once per area
          }
        }
      }
    });
  });
  
  return conflicts;
}

// Helper to convert time string to minutes
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export default function ConflictChecker({ schedules }) {
  const conflicts = useMemo(() => detectConflicts(schedules), [schedules]);
  const [expandedAreas, setExpandedAreas] = useState({});

  if (conflicts.length === 0) return null;

  // Group by area
  const byArea = {};
  conflicts.forEach(c => {
    if (!byArea[c.area]) byArea[c.area] = [];
    byArea[c.area].push(c);
  });

  const toggleArea = (area) => setExpandedAreas(p => ({ ...p, [area]: !p[area] }));

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-700">{conflicts.length} Konflik Shift Terdeteksi</p>
          <p className="text-xs text-red-600">Regu yang sama dijadwalkan lebih dari sekali pada tanggal yang sama</p>
        </div>
      </div>
      <div className="space-y-2">
        {Object.entries(byArea).map(([area, areaConflicts]) => (
          <div key={area} className="border border-red-200 rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => toggleArea(area)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-red-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">
                  {areaConflicts.length} konflik
                </Badge>
                <span className="text-xs font-semibold text-red-800">{area}</span>
              </div>
              {expandedAreas[area]
                ? <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                : <ChevronRight className="w-3.5 h-3.5 text-red-400" />}
            </button>
            {expandedAreas[area] && (
              <div className="px-3 pb-2 space-y-1.5 max-h-48 overflow-y-auto border-t border-red-100">
                {areaConflicts.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 pt-1.5">
                    <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px] shrink-0 mt-0.5">{c.regu}</Badge>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-red-800">{c.tanggal}</p>
                      <p className="text-xs text-red-700">{c.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}