import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * Menampilkan alert jika jumlah personel terjadwal kurang dari minimum kebutuhan
 * pada suatu tanggal+area tertentu
 */
export default function PersonelChecker({ schedules, filterArea }) {
  const { data: requirements = [] } = useQuery({
    queryKey: ['shift-requirements'],
    queryFn: () => base44.entities.ShiftRequirement.list('area_tugas', 200)
  });

  if (!filterArea || requirements.length === 0) return null;

  const areaReqs = requirements.filter(r => r.area_tugas === filterArea && r.aktif !== false);
  if (areaReqs.length === 0) return null;

  // Group schedules by tanggal+sesi
  const grouped = {};
  schedules.forEach(s => {
    const sesi = s.catatan || 'Pagi';
    const key = `${s.tanggal}__${sesi}`;
    grouped[key] = (grouped[key] || 0) + 1;
  });

  const alerts = [];
  Object.entries(grouped).forEach(([key, count]) => {
    const [tanggal, sesi] = key.split('__');
    const req = areaReqs.find(r => r.sesi === sesi);
    if (req && count < req.min_personel) {
      alerts.push({ tanggal, sesi, count, min: req.min_personel });
    }
  });

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm">
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        <span>Semua shift memenuhi kebutuhan personel minimum</span>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
        <p className="text-sm font-semibold text-orange-700">Kekurangan Personel Terdeteksi ({alerts.length} shift)</p>
      </div>
      <div className="space-y-1">
        {alerts.slice(0, 5).map((a, i) => (
          <p key={i} className="text-xs text-orange-600">
            • {a.tanggal} · Shift {a.sesi}: {a.count}/{a.min} orang
          </p>
        ))}
        {alerts.length > 5 && <p className="text-xs text-orange-400">...dan {alerts.length - 5} shift lainnya</p>}
      </div>
    </div>
  );
}