import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { base44 } from '@/api/cloudflareClient';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';

export default function NotificationBell({ employee }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  // Play notification sound using Web Audio API
  const playNotifSound = useCallback((type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const isPanic = type === 'panic';
      const isUrgent = ['urgent', 'emergency', 'taruna', 'checklist_anomali'].includes(type);

      if (isPanic) {
        // Sirene keras untuk panic
        [0, 0.3, 0.6, 0.9, 1.2, 1.5].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(880, ctx.currentTime + offset);
          osc.frequency.setValueAtTime(660, ctx.currentTime + offset + 0.15);
          gain.gain.setValueAtTime(0.7, ctx.currentTime + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.28);
          osc.start(ctx.currentTime + offset);
          osc.stop(ctx.currentTime + offset + 0.3);
        });
      } else if (isUrgent) {
        // 2 beep pendek untuk urgent
        [0, 0.25].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.value = 760;
          gain.gain.setValueAtTime(0.5, ctx.currentTime + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.2);
          osc.start(ctx.currentTime + offset);
          osc.stop(ctx.currentTime + offset + 0.2);
        });
      } else {
        // Ding lembut untuk notifikasi biasa
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 520;
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {}
  }, []);

  const addNotif = useCallback((n) => {
    playNotifSound(n.type);
    setNotifications((prev) => [n, ...prev].slice(0, 20));
  }, [playNotifSound]);

  useEffect(() => {
    if (!employee?.nik_karyawan) return;

    // Subscribe to ShiftSchedule changes
    const unsubShift = base44.entities.ShiftSchedule.subscribe((event) => {
      if (
        event.type === 'create' || event.type === 'update'
      ) {
        const s = event.data;
        // Only notify if this employee is in the shift
        if (
          s.area_tugas === employee.area_tugas ||
          (s.karyawan_ids && s.karyawan_ids.includes(employee.nik_karyawan))
        ) {
          addNotif({
            id: `shift-${event.id}-${Date.now()}`,
            type: 'shift',
            title: 'Jadwal Shift Diperbarui',
            body: `Shift ${s.tipe_shift || ''} area ${s.area_tugas} pada ${s.tanggal}`,
            time: new Date()
          });
        }
      }
    });

    // Subscribe to TenantPackage
    const unsubPkg = base44.entities.TenantPackage.subscribe((event) => {
      if (event.type === 'create' && event.data?.area_tugas === employee.area_tugas) {
        const p = event.data;
        addNotif({
          id: `pkg-${event.id}-${Date.now()}`,
          type: 'package',
          title: 'Paket Tenant Masuk',
          body: `Paket untuk ${p.nama_penerima} (${p.unit_tenant || '-'})`,
          time: new Date()
        });
      }
    });

    // Subscribe to LeaveRequest - notify management
    const MGMT_ROLES = ['Master Admin','Admin Pos Security','Admin Pos','Admin Facility','Supervisor Security','Supervisor Facility','Chief Security','Leader Security','Leader Facility','Admin Security','SPV Security'];
    const empRole = employee?.role || employee?.jabatan || '';
    const isMasterAdmin = empRole === 'Master Admin' || employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';
    const isMgmt = isMasterAdmin || MGMT_ROLES.includes(empRole);
    const myArea = employee?.area_tugas || '';

    // Helper: check if event belongs to this employee's area (master admin sees all)
    const isMyArea = (data) => isMasterAdmin || !data?.area_tugas || data.area_tugas === myArea;

    let unsubLeave = () => {};
    if (isMgmt) {
      unsubLeave = base44.entities.LeaveRequest.subscribe((event) => {
        if (event.type === 'create') {
          const r = event.data;
          if (!isMyArea(r)) return;
          addNotif({
            id: `leave-${event.id}-${Date.now()}`,
            type: 'leave',
            title: '📋 Pengajuan Cuti Baru',
            body: `${r.nama_karyawan} mengajukan ${r.jenis_cuti} (${r.jumlah_hari} hari)`,
            time: new Date(),
            page: 'Cuti'
          });
        }
      });
    }

    // Subscribe to FacilityTicket - notify management
    let unsubTicket = () => {};
    if (isMgmt) {
      unsubTicket = base44.entities.FacilityTicket.subscribe((event) => {
        if (event.type === 'create') {
          const t = event.data;
          if (!isMyArea(t)) return;
          const isUrgent = t.prioritas === 'Darurat' || t.prioritas === 'Tinggi';
          addNotif({
            id: `ticket-${event.id}-${Date.now()}`,
            type: isUrgent ? 'urgent' : 'ticket',
            title: isUrgent ? `🚨 DARURAT: Tiket Fasilitas` : '🔧 Tiket Fasilitas Baru',
            body: `${t.judul} · ${t.area_tugas} · Prioritas: ${t.prioritas || '-'}`,
            time: new Date(),
            page: 'FacilityTicketing'
          });
        }
      });
    }

    // Subscribe to ChecklistEmergency - notify management on bad condition
    let unsubEmergency = () => {};
    if (isMgmt) {
      unsubEmergency = base44.entities.ChecklistEmergency.subscribe((event) => {
        if (event.type === 'create' || event.type === 'update') {
          const e = event.data;
          if (!isMyArea(e)) return;
          if (e.kondisi === 'Rusak' || e.kondisi === 'Perlu Maintenance') {
            addNotif({
              id: `emergency-${event.id}-${Date.now()}`,
              type: 'emergency',
              title: '🚨 Box Emergency Bermasalah',
              body: `${e.lokasi_box || '-'} · ${e.area_tugas} · Kondisi: ${e.kondisi}`,
              time: new Date(),
              page: 'ChecklistEmergency'
            });
          }
        }
      });
    }

    // Subscribe to EPatrol - notify on Taruna findings
    let unsubPatrol = () => {};
    if (isMgmt) {
      unsubPatrol = base44.entities.EPatrol.subscribe((event) => {
        if ((event.type === 'create' || event.type === 'update') && event.data?.kondisi === 'Taruna') {
          const p = event.data;
          if (!isMyArea(p)) return;
          addNotif({
            id: `patrol-${event.id}-${Date.now()}`,
            type: 'taruna',
            title: '🔴 Temuan TARUNA di Patroli',
            body: `${p.nama_karyawan} · ${p.checkpoint || '-'} · ${p.area_tugas}`,
            time: new Date(),
            page: 'EPatrol'
          });
        }
      });
    }

    // Subscribe to ChecklistHydrant - notify on Rusak
    let unsubHydrant = () => {};
    if (isMgmt) {
      unsubHydrant = base44.entities.ChecklistHydrant.subscribe((event) => {
        if ((event.type === 'create' || event.type === 'update') && (event.data?.kondisi === 'Rusak' || event.data?.kondisi === 'Perlu Maintenance')) {
          const h = event.data;
          if (!isMyArea(h)) return;
          addNotif({
            id: `hydrant-${event.id}-${Date.now()}`,
            type: 'rusak',
            title: `⚠ ${h.tipe || 'Hydrant'} Bermasalah`,
            body: `${h.lokasi_hydrant || '-'} · ${h.area_tugas} · ${h.kondisi}`,
            time: new Date(),
            page: 'ChecklistHydrant'
          });
        }
      });
    }

    // Subscribe to EFacility - notify on new items
    let unsubFacility = () => {};
    if (isMgmt) {
      unsubFacility = base44.entities.EFacility.subscribe((event) => {
        if (event.type === 'create') {
          const f = event.data;
          if (!isMyArea(f)) return;
          addNotif({
            id: `facility-${event.id}-${Date.now()}`,
            type: 'facility',
            title: '🏗 Laporan E-Facility Baru',
            body: `${f.lokasi || '-'} · ${f.area_tugas} · Status: ${f.status}`,
            time: new Date(),
            page: 'EFacility'
          });
        }
      });
    }

    // Subscribe to DailyChecklist - notify on anomali (potensi bahaya / kondisi Tidak banyak)
    let unsubChecklist = () => {};
    if (isMgmt) {
      unsubChecklist = base44.entities.DailyChecklist.subscribe((event) => {
        if (event.type === 'create') {
          const c = event.data;
          if (!isMyArea(c)) return;
          // Detect anomali: potensi bahaya = Ya, atau banyak item Tidak
          const patrolData = c.patroli_area || {};
          const allSections = [c.serah_terima, c.patroli_area, c.akses_keluar_masuk, c.ketertiban_parkir, c.laporan_akhir].filter(Boolean);
          const tidakCount = allSections.reduce((sum, s) => sum + Object.values(s).filter(v => v === 'Tidak').length, 0);
          const hasBahaya = patrolData.potensi_bahaya_ditemukan === 'Ya';
          if (hasBahaya || tidakCount >= 5) {
            addNotif({
              id: `checklist-${event.id}-${Date.now()}`,
              type: 'checklist_anomali',
              title: hasBahaya ? '⚠ Checklist: Potensi Bahaya Ditemukan!' : `⚠ Checklist Anomali (${tidakCount} item tidak sesuai)`,
              body: `${c.nama_karyawan} · Shift ${c.shift} · ${c.area_tugas} · ${c.tanggal}`,
              time: new Date(),
              page: 'DailyChecklist'
            });
          }
        }
      });
    }

    // Subscribe to Attendance - notify on Terlambat
    let unsubAttendance = () => {};
    if (isMgmt) {
      unsubAttendance = base44.entities.Attendance.subscribe((event) => {
        if ((event.type === 'create' || event.type === 'update') && event.data?.status === 'Terlambat') {
          const a = event.data;
          if (!isMyArea(a)) return;
          addNotif({
            id: `late-${event.id}-${Date.now()}`,
            type: 'late',
            title: '⏰ Keterlambatan Karyawan',
            body: `${a.nama_karyawan} (${a.nik_karyawan}) terlambat di ${a.area_tugas}`,
            time: new Date(),
            page: 'Attendance'
          });
        }
      });
    }

    // Subscribe to PanicAlert - semua alert muncul untuk Master Admin & Management (tanpa filter area)
    let unsubPanic = () => {};
    if (isMgmt) {
      unsubPanic = base44.entities.PanicAlert.subscribe((event) => {
        if (event.type === 'create') {
          const p = event.data;
          // Master Admin melihat semua area, management hanya area sendiri
          if (!isMasterAdmin && p.area_tugas && p.area_tugas !== myArea) return;
          addNotif({
            id: `panic-${event.id}-${Date.now()}`,
            type: 'panic',
            title: '🚨 SOS DARURAT TERKIRIM!',
            body: `${p.nama_karyawan} · ${p.area_tugas} · ${p.waktu_darurat || 'Baru saja'}`,
            time: new Date(),
            page: 'PanicAlertMonitor'
          });
        }
      });
    }

    return () => {
      unsubShift();
      unsubPkg();
      unsubLeave();
      unsubTicket();
      unsubEmergency();
      unsubPatrol();
      unsubHydrant();
      unsubFacility();
      unsubChecklist();
      unsubAttendance();
      unsubPanic();
    };
  }, [employee?.nik_karyawan, addNotif]);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((v) => !v); if (!open) markAllRead(); }}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <span className="font-semibold text-sm text-gray-700">Notifikasi</span>
            <button onClick={() => setNotifications([])} className="text-xs text-gray-400 hover:text-red-500">
              Hapus Semua
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Tidak ada notifikasi</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${n.read ? 'bg-white' : 'bg-blue-50'}`} onClick={() => n.page && (window.location.href = createPageUrl(n.page))}>
                  <div className="flex items-start gap-2">
                    <Badge className={`mt-0.5 text-[10px] border-0 shrink-0 ${
                      n.type === 'shift' ? 'bg-indigo-100 text-indigo-700' :
                      n.type === 'package' ? 'bg-teal-100 text-teal-700' :
                      n.type === 'leave' ? 'bg-orange-100 text-orange-700' :
                      n.type === 'ticket' ? 'bg-red-100 text-red-700' :
                      n.type === 'urgent' ? 'bg-red-600 text-white animate-pulse' :
                      n.type === 'emergency' ? 'bg-orange-600 text-white animate-pulse' :
                      n.type === 'taruna' ? 'bg-red-700 text-white animate-pulse' :
                      n.type === 'rusak' ? 'bg-orange-500 text-white' :
                      n.type === 'facility' ? 'bg-purple-100 text-purple-700' :
                      n.type === 'late' ? 'bg-amber-100 text-amber-800' :
                      n.type === 'checklist_anomali' ? 'bg-yellow-500 text-white animate-pulse' :
                      n.type === 'panic' ? 'bg-red-700 text-white animate-pulse' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {n.type === 'shift' ? 'Shift' : n.type === 'package' ? 'Paket' : n.type === 'leave' ? 'Cuti' : n.type === 'ticket' ? 'Fasilitas' : n.type === 'urgent' ? '🚨 DARURAT' : n.type === 'emergency' ? '🚨 Emergency' : n.type === 'taruna' ? '🔴 Taruna' : n.type === 'rusak' ? '⚠ Rusak' : n.type === 'facility' ? '🏗 Facility' : n.type === 'late' ? '⏰ Terlambat' : n.type === 'checklist_anomali' ? '⚠ Checklist' : n.type === 'panic' ? '🚨 SOS DARURAT' : 'Info'}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700">{n.title}</p>
                      <p className="text-xs text-gray-500 truncate">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {n.time instanceof Date ? n.time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}