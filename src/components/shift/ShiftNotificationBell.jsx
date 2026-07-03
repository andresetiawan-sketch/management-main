import { useState, useEffect } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { Bell, BellRing, Calendar, Check } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function ShiftNotificationBell({ nik_karyawan }) {
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!nik_karyawan) return;
    loadNotifs();
    const unsub = base44.entities.ShiftNotification.subscribe((event) => {
      if (event.data?.nik_karyawan === nik_karyawan) {
        loadNotifs();
      }
    });
    return unsub;
  }, [nik_karyawan]);

  const loadNotifs = async () => {
    const data = await base44.entities.ShiftNotification.filter(
      { nik_karyawan },
      '-created_date',
      20
    );
    setNotifs(data);
  };

  const markRead = async (id) => {
    await base44.entities.ShiftNotification.update(id, { dibaca: true });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, dibaca: true } : n));
  };

  const markAllRead = async () => {
    const unread = notifs.filter(n => !n.dibaca);
    await Promise.all(unread.map(n => base44.entities.ShiftNotification.update(n.id, { dibaca: true })));
    setNotifs(prev => prev.map(n => ({ ...n, dibaca: true })));
  };

  const unreadCount = notifs.filter(n => !n.dibaca).length;

  const TIPE_ICON = {
    'Jadwal Baru': '📅',
    'Jadwal Berubah': '🔄',
    'Jadwal Dibatalkan': '❌',
    'Lembur Disetujui': '✅',
    'Lembur Ditolak': '🚫',
    'Cuti Disetujui': '🌴',
    'Cuti Ditolak': '🚫',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-orange-600" />
        ) : (
          <Bell className="w-5 h-5 text-gray-500" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <p className="text-sm font-semibold text-gray-800">Notifikasi Jadwal</p>
                {unreadCount > 0 && (
                  <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">{unreadCount}</Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <Check className="w-3 h-3" /> Tandai semua dibaca
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Tidak ada notifikasi</div>
              ) : notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.dibaca && markRead(n.id)}
                  className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.dibaca ? 'bg-blue-50/60' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base flex-shrink-0 mt-0.5">{TIPE_ICON[n.tipe] || '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.dibaca ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {n.judul}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.pesan}</p>
                      {n.tanggal_jadwal && (
                        <p className="text-xs text-gray-400 mt-1">Tanggal: {n.tanggal_jadwal}</p>
                      )}
                    </div>
                    {!n.dibaca && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}