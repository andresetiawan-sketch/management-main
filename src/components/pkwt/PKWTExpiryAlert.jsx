import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CalendarX, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { differenceInDays, parseISO, isValid } from 'date-fns';

const THRESHOLDS = [
  { days: 30, label: '≤ 30 Hari', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', rowBg: 'bg-red-50' },
  { days: 60, label: '31–60 Hari', color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400', rowBg: 'bg-orange-50' },
  { days: 90, label: '61–90 Hari', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400', rowBg: 'bg-yellow-50' },
];

function getDaysLeft(tanggal_selesai) {
  if (!tanggal_selesai) return null;
  const end = parseISO(tanggal_selesai);
  if (!isValid(end)) return null;
  return differenceInDays(end, new Date());
}

function getThreshold(daysLeft) {
  if (daysLeft === null || daysLeft < 0) return null;
  if (daysLeft <= 30) return THRESHOLDS[0];
  if (daysLeft <= 60) return THRESHOLDS[1];
  if (daysLeft <= 90) return THRESHOLDS[2];
  return null;
}

export default function PKWTExpiryAlert({ compact = false }) {
  const [expanded, setExpanded] = useState(!compact);
  const [filter, setFilter] = useState('all'); // 'all' | '30' | '60' | '90'

  const { data: pkwtList = [], isLoading } = useQuery({
    queryKey: ['pkwt-expiry-check'],
    queryFn: () => base44.entities.PKWTContract.filter({ status: 'Aktif' }, 'tanggal_selesai', 500),
    staleTime: 5 * 60 * 1000,
  });

  const expiringContracts = useMemo(() => {
    return pkwtList
      .map(item => {
        const daysLeft = getDaysLeft(item.tanggal_selesai);
        const threshold = getThreshold(daysLeft);
        return { ...item, daysLeft, threshold };
      })
      .filter(item => item.threshold !== null)
      .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
  }, [pkwtList]);

  const filtered = filter === 'all'
    ? expiringContracts
    : expiringContracts.filter(item => {
        if (filter === '30') return item.daysLeft <= 30;
        if (filter === '60') return item.daysLeft > 30 && item.daysLeft <= 60;
        if (filter === '90') return item.daysLeft > 60 && item.daysLeft <= 90;
        return true;
      });

  const count30 = expiringContracts.filter(i => i.daysLeft <= 30).length;
  const count60 = expiringContracts.filter(i => i.daysLeft > 30 && i.daysLeft <= 60).length;
  const count90 = expiringContracts.filter(i => i.daysLeft > 60 && i.daysLeft <= 90).length;

  if (isLoading) return null;
  if (expiringContracts.length === 0) return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700">
      <Clock className="w-4 h-4" />
      Tidak ada kontrak PKWT yang akan berakhir dalam 90 hari ke depan.
    </div>
  );

  return (
    <div className="bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <div className="text-left">
            <p className="text-sm font-semibold text-amber-800">Peringatan Kontrak PKWT Akan Berakhir</p>
            <p className="text-xs text-amber-600">{expiringContracts.length} kontrak perlu tindak lanjut perpanjangan</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {count30 > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{count30}</span>}
          {count60 > 0 && <span className="bg-orange-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">{count60}</span>}
          {count90 > 0 && <span className="bg-yellow-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">{count90}</span>}
          {expanded ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: `Semua (${expiringContracts.length})`, cls: 'bg-gray-100 text-gray-700' },
              { key: '30', label: `≤ 30 Hari (${count30})`, cls: 'bg-red-100 text-red-700' },
              { key: '60', label: `31–60 Hari (${count60})`, cls: 'bg-orange-100 text-orange-700' },
              { key: '90', label: `61–90 Hari (${count90})`, cls: 'bg-yellow-100 text-yellow-700' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition ${filter === tab.key ? tab.cls + ' border-current font-semibold' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="px-3 py-2 text-left font-medium">Nama Karyawan</th>
                  <th className="px-3 py-2 text-left font-medium">NIK</th>
                  <th className="px-3 py-2 text-left font-medium">Jabatan</th>
                  <th className="px-3 py-2 text-left font-medium">Area</th>
                  <th className="px-3 py-2 text-left font-medium">Tgl Selesai</th>
                  <th className="px-3 py-2 text-left font-medium">Sisa Hari</th>
                  <th className="px-3 py-2 text-left font-medium">Urgensi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className={`${item.threshold?.rowBg} border-t border-gray-100`}>
                    <td className="px-3 py-2 font-medium text-gray-800">{item.nama_karyawan}</td>
                    <td className="px-3 py-2 font-mono text-gray-600">{item.nik_karyawan}</td>
                    <td className="px-3 py-2 text-gray-600">{item.jabatan || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{item.area_tugas || '-'}</td>
                    <td className="px-3 py-2 text-gray-700">{item.tanggal_selesai}</td>
                    <td className="px-3 py-2 font-bold text-gray-800">{item.daysLeft} hari</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${item.threshold?.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.threshold?.dot}`} />
                        {item.threshold?.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Data diperbarui otomatis. Hanya kontrak berstatus <strong>Aktif</strong> yang ditampilkan.
          </p>
        </div>
      )}
    </div>
  );
}