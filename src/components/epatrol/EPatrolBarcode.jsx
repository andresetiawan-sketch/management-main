import { useState, useRef } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { QrCode, Download, Upload } from 'lucide-react';
import QRCodeCanvas from './QRCodeCanvas';

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69ae71d19fe396b3470078b2/74c75dcf9_Logobulat.png";

function CheckpointCard({ checkpoint, areaName }) {
  const cardRef = useRef(null);
  // QR value encodes areaName + checkpoint nama for scanning
  const qrValue = `PATROL|${areaName}|${checkpoint.nama}`;

  const handleDownload = async () => {
    const canvas = cardRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `QR_${areaName}_${checkpoint.nama}.png`.replace(/\s+/g, '_');
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Card ref={cardRef} className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-center mb-2">
        <p className="font-semibold text-sm text-gray-800 truncate">{checkpoint.nama}</p>
        <p className="text-xs text-gray-400">{areaName}</p>
      </div>
      <div className="bg-white border rounded-lg p-3 mb-3 flex justify-center">
        <QRCodeCanvas text={qrValue} size={160} showLogo={true} />
      </div>
      <p className="text-[9px] text-gray-400 text-center mb-3 truncate" title={qrValue}>{qrValue}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleDownload}>
          <Download className="w-3 h-3 mr-1" /> Unduh QR
        </Button>
      </div>
    </Card>
  );
}

export default function EPatrolBarcode({ areas = [] }) {
  const [selectedArea, setSelectedArea] = useState('');

  const displayAreas = selectedArea ? areas.filter(a => a.nama_area === selectedArea) : areas;
  const allCheckpoints = displayAreas.flatMap(a => (a.e_patrol_checkpoints || []).map(cp => ({ ...cp, areaName: a.nama_area })));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <Label className="text-xs text-gray-500">Filter Area</Label>
            <select
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              className="block mt-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
            >
              <option value="">Semua Area</option>
              {areas.map(a => <option key={a.id} value={a.nama_area}>{a.nama_area}</option>)}
            </select>
          </div>
          <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 mt-4">
            <QrCode className="w-4 h-4 inline mr-1" />
            Format QR: <code className="font-mono">PATROL|Area|NamaCheckpoint</code>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-700">{allCheckpoints.length} Titik Patroli</p>
          <p className="text-xs text-gray-400">{displayAreas.length} area</p>
        </div>
      </div>

      {allCheckpoints.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada titik patroli</p>
          <p className="text-xs mt-1">Tambahkan titik patroli di halaman Area/Proyek</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allCheckpoints.map((cp, idx) => (
            <CheckpointCard key={`${cp.areaName}-${cp.id || idx}`} checkpoint={cp} areaName={cp.areaName} />
          ))}
        </div>
      )}
    </div>
  );
}