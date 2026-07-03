import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, CalendarClock } from 'lucide-react';

const SKILL_COLORS = {
  'Chief Security': 'bg-red-100 text-red-700',
  'Leader Security': 'bg-orange-100 text-orange-700',
  'Supervisor Facility': 'bg-purple-100 text-purple-700',
  'Leader Facility': 'bg-indigo-100 text-indigo-700',
  'Admin Pos': 'bg-blue-100 text-blue-700',
  'Staff': 'bg-gray-100 text-gray-600',
};

export default function EmployeeAvailability({ open, onClose, onAssign }) {
  const today = new Date().toISOString().slice(0, 10);
  const [checkDate, setCheckDate] = useState(today);
  const [filterArea, setFilterArea] = useState('');
  const [filterJabatan, setFilterJabatan] = useState('');
  const [search, setSearch] = useState('');

  const { data: employees = [] } = useQuery({
    queryKey: ['emp-avail'],
    queryFn: () => base44.entities.Employee.filter({ status_aktif: 'Aktif' }, 'nama_lengkap', 300),
    enabled: open,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['shift-avail', checkDate],
    queryFn: () => base44.entities.ShiftSchedule.filter({ tanggal: checkDate }),
    enabled: open && !!checkDate,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-avail'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' }),
    enabled: open,
  });

  const busyRegu = new Set(schedules.map(s => s.regu).filter(Boolean));

  const filtered = employees
    .filter(e => !filterArea || e.area_tugas === filterArea)
    .filter(e => !filterJabatan || e.jabatan === filterJabatan || e.role === filterJabatan)
    .filter(e => !search || e.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) || e.nik_karyawan?.includes(search));

  const jabatanList = [...new Set(employees.map(e => e.jabatan || e.role).filter(Boolean))];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /> Ketersediaan Karyawan</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div><label className="text-xs text-gray-500">Cek Tanggal</label>
              <Input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)} className="h-9 mt-1 text-sm" />
            </div>
            <div><label className="text-xs text-gray-500">Filter Area</label>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent><SelectItem value={null}>Semua</SelectItem>{areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-gray-500">Filter Jabatan</label>
              <Select value={filterJabatan} onValueChange={setFilterJabatan}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent><SelectItem value={null}>Semua</SelectItem>{jabatanList.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / NIK..." className="pl-9 h-9 text-sm" />
          </div>
          <p className="text-xs text-gray-500">{filtered.length} karyawan aktif · <span className="text-orange-600 font-medium">{busyRegu.size} regu sudah dijadwalkan {checkDate}</span></p>
          <div className="space-y-2">
            {filtered.map(e => {
              const busy = e.regu && busyRegu.has(e.regu);
              return (
                <div key={e.id} className={`flex items-center gap-3 p-3 rounded-xl border ${busy ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}>
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-sm font-bold text-gray-600">
                    {e.nama_lengkap?.[0] || 'K'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{e.nama_lengkap}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      <span className="text-xs text-gray-400">{e.nik_karyawan}</span>
                      {e.area_tugas && <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px]">{e.area_tugas}</Badge>}
                      {e.regu && <Badge className="bg-blue-50 text-blue-700 border-0 text-[10px]">{e.regu}</Badge>}
                      <Badge className={`border-0 text-[10px] ${SKILL_COLORS[e.jabatan || e.role] || 'bg-gray-100 text-gray-600'}`}>{e.jabatan || e.role}</Badge>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {busy
                      ? <Badge className="bg-orange-100 text-orange-700 border-0 text-xs flex items-center gap-1"><CalendarClock className="w-3 h-3" />Sudah Dijadwalkan</Badge>
                      : <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Tersedia</Badge>
                    }
                  </div>
                  {onAssign && !busy && (
                    <button onClick={() => { onAssign(e); onClose(); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-50 transition-colors">
                      Assign
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}