import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wrench, Clock } from 'lucide-react';

const statusColor = { Selesai: 'bg-emerald-100 text-emerald-700', 'Dalam Proses': 'bg-blue-100 text-blue-700', 'Menunggu Sparepart': 'bg-orange-100 text-orange-700' };

export default function MaintenanceHistory({ inventoryId, itemName, open, onClose }) {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['maintenance', inventoryId],
    queryFn: () => base44.entities.AssetMaintenance.filter({ inventory_id: inventoryId }, '-tanggal'),
    enabled: !!inventoryId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-orange-600" /> Riwayat Maintenance — {itemName}
          </DialogTitle>
        </DialogHeader>
        {isLoading
          ? <div className="space-y-2">{Array(3).fill(0).map((_, i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />)}</div>
          : records.length === 0
          ? <div className="text-center py-10 text-gray-400 text-sm">Belum ada riwayat maintenance</div>
          : <div className="space-y-3">
              {records.map(r => (
                <div key={r.id} className="rounded-xl border border-gray-100 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{r.jenis_maintenance}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{r.tanggal}</p>
                    </div>
                    <Badge className={`text-xs border-0 shrink-0 ${statusColor[r.status]}`}>{r.status}</Badge>
                  </div>
                  {r.deskripsi && <p className="text-xs text-gray-600">{r.deskripsi}</p>}
                  <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                    {r.kondisi_sebelum && <span>Kondisi: <strong className="text-gray-700">{r.kondisi_sebelum} → {r.kondisi_sesudah}</strong></span>}
                    {r.teknisi && <span>Teknisi: <strong className="text-gray-700">{r.teknisi}</strong></span>}
                    {r.biaya > 0 && <span>Biaya: <strong className="text-orange-600">Rp {r.biaya.toLocaleString('id-ID')}</strong></span>}
                    {r.nama_pelapor && <span>Laporan: <strong className="text-gray-700">{r.nama_pelapor}</strong></span>}
                  </div>
                  {(r.foto_before || r.foto_after) && (
                    <div className="flex gap-2 mt-1">
                      {r.foto_before && <div className="text-center"><img src={r.foto_before} className="w-16 h-16 object-cover rounded-lg border border-gray-200" alt="before" /><p className="text-[10px] text-gray-400 mt-0.5">Before</p></div>}
                      {r.foto_after && <div className="text-center"><img src={r.foto_after} className="w-16 h-16 object-cover rounded-lg border border-gray-200" alt="after" /><p className="text-[10px] text-gray-400 mt-0.5">After</p></div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
        }
      </DialogContent>
    </Dialog>
  );
}