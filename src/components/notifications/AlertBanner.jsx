import { useState, useEffect } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { AlertTriangle, X, Shield, Droplets } from 'lucide-react';
import { createPageUrl } from '@/utils';

/**
 * Real-time alert banner for management dashboard.
 * Shows live alerts when EPatrol Taruna or Checklist Rusak events occur.
 */
export default function AlertBanner({ employee }) {
  const [alerts, setAlerts] = useState([]);

  const empRole = employee?.role || employee?.jabatan || '';
  const MGMT_ROLES = ['Master Admin','Admin Pos Security','Admin Pos','Admin Facility','Supervisor Security','Supervisor Facility','Chief Security','Leader Security','Leader Facility','Admin Security','SPV Security'];
  const isMgmt = MGMT_ROLES.includes(empRole);

  useEffect(() => {
    if (!isMgmt || !employee?.nik_karyawan) return;

    const addAlert = (a) => {
      setAlerts(prev => {
        if (prev.find(x => x.id === a.id)) return prev;
        return [a, ...prev].slice(0, 5);
      });
      // Auto-dismiss after 30s
      setTimeout(() => dismissAlert(a.id), 30000);
    };

    const unsubPatrol = base44.entities.EPatrol.subscribe((event) => {
      if ((event.type === 'create' || event.type === 'update') && event.data?.kondisi === 'Taruna') {
        const p = event.data;
        addAlert({
          id: `patrol-${event.id}`,
          type: 'taruna',
          icon: Shield,
          color: 'bg-red-50 border-red-300',
          iconColor: 'text-red-600',
          textColor: 'text-red-800',
          title: 'Temuan TARUNA di E-Patroli',
          body: `${p.nama_karyawan} menemukan kondisi bermasalah di checkpoint "${p.checkpoint || '-'}" · ${p.area_tugas}`,
          page: 'EPatrol',
          time: new Date()
        });
      }
    });

    const unsubHydrant = base44.entities.ChecklistHydrant.subscribe((event) => {
      if ((event.type === 'create' || event.type === 'update') && (event.data?.kondisi === 'Rusak' || event.data?.kondisi === 'Perlu Maintenance')) {
        const h = event.data;
        addAlert({
          id: `hydrant-${event.id}`,
          type: 'rusak',
          icon: Droplets,
          color: 'bg-orange-50 border-orange-300',
          iconColor: 'text-orange-600',
          textColor: 'text-orange-800',
          title: `${h.tipe || 'Hydrant'} Kondisi ${h.kondisi}`,
          body: `Lokasi: ${h.lokasi_hydrant || '-'} · Area: ${h.area_tugas}`,
          page: 'ChecklistHydrant',
          time: new Date()
        });
      }
    });

    const unsubEmergency = base44.entities.ChecklistEmergency.subscribe((event) => {
      if ((event.type === 'create' || event.type === 'update') && (event.data?.kondisi === 'Rusak' || event.data?.kondisi === 'Perlu Maintenance')) {
        const e = event.data;
        addAlert({
          id: `emergency-${event.id}`,
          type: 'rusak',
          icon: AlertTriangle,
          color: 'bg-orange-50 border-orange-300',
          iconColor: 'text-orange-600',
          textColor: 'text-orange-800',
          title: `Box Emergency Kondisi ${e.kondisi}`,
          body: `Lokasi: ${e.lokasi_box || '-'} · Area: ${e.area_tugas}`,
          page: 'ChecklistEmergency',
          time: new Date()
        });
      }
    });

    return () => { unsubPatrol(); unsubHydrant(); unsubEmergency(); };
  }, [employee?.nik_karyawan, isMgmt]);

  const dismissAlert = (id) => setAlerts(prev => prev.filter(a => a.id !== id));

  if (!isMgmt || alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {alerts.map(alert => {
        const Icon = alert.icon;
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-xl border ${alert.color} shadow-sm animate-pulse-once`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white/60`}>
              <Icon className={`w-4 h-4 ${alert.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${alert.textColor}`}>{alert.title}</p>
              <p className={`text-xs ${alert.textColor} opacity-80 mt-0.5`}>{alert.body}</p>
              <p className="text-[10px] text-gray-400 mt-1">
                {alert.time?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {alert.page && (
                <a
                  href={createPageUrl(alert.page)}
                  className={`text-xs font-semibold px-2 py-1 rounded-lg bg-white/70 ${alert.textColor} hover:bg-white transition`}
                >
                  Lihat →
                </a>
              )}
              <button onClick={() => dismissAlert(alert.id)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}