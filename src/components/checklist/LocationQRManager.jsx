import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QrCode, Plus, Download, MapPin } from 'lucide-react';
import QRCodeCanvas from '@/components/epatrol/QRCodeCanvas';
import { toast } from 'sonner';

// Entity to store location definitions
// Using AreaProject.e_patrol_checkpoints pattern or a simple in-app list approach
// We'll store locations in localStorage per entity type for simplicity

export default function LocationQRManager({ entityType, locationField, locationLabel, trigger }) {
  const [open, setOpen] = useState(false);
  const [newLoc, setNewLoc] = useState('');
  const storageKey = `pis_locations_${entityType}`;

  const getLocations = () => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  };
  const [locations, setLocations] = useState(getLocations);

  const addLocation = () => {
    if (!newLoc.trim()) return;
    if (locations.includes(newLoc.trim())) { toast.error('Lokasi sudah ada'); return; }
    const updated = [...locations, newLoc.trim()];
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setLocations(updated);
    setNewLoc('');
    toast.success(`Lokasi "${newLoc.trim()}" berhasil ditambahkan`);
  };

  const removeLocation = (loc) => {
    const updated = locations.filter(l => l !== loc);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setLocations(updated);
  };

  const downloadQR = (loc) => {
    const canvas = document.getElementById(`qr-loc-${loc.replace(/\s+/g,'-')}`);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `QR_${entityType}_${loc.replace(/\s+/g,'_')}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="border-violet-400 text-violet-700 hover:bg-violet-50">
        <QrCode className="w-4 h-4 mr-2" /> Kelola Lokasi & QR
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-violet-600" /> Manajemen Lokasi {locationLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={`Nama lokasi baru, misal: ${locationLabel} Lt.1`}
                value={newLoc}
                onChange={e => setNewLoc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLocation()}
              />
              <Button onClick={addLocation} className="bg-violet-600 hover:bg-violet-700 text-white shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Tambah
              </Button>
            </div>
            {locations.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Belum ada lokasi. Tambahkan lokasi di atas.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {locations.map(loc => (
                <div key={loc} className="border rounded-xl p-4 flex flex-col items-center gap-3 bg-gray-50">
                  <div className="flex items-center gap-2 w-full justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-violet-500" />
                      <span className="text-sm font-medium text-gray-800">{loc}</span>
                    </div>
                    <button onClick={() => removeLocation(loc)} className="text-xs text-red-400 hover:text-red-600">Hapus</button>
                  </div>
                  <QRCodeCanvas
                    id={`qr-loc-${loc.replace(/\s+/g,'-')}`}
                    value={`${entityType}:${loc}`}
                    size={120}
                  />
                  <Button size="sm" variant="outline" onClick={() => downloadQR(loc)} className="w-full">
                    <Download className="w-3 h-3 mr-1" /> Download QR
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}