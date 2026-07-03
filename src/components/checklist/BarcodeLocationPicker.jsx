import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Camera, X, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function BarcodeLocationPicker({ entityType, locationField, value, onChange, placeholder }) {
  const [showScanner, setShowScanner] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Load suggestions from localStorage
  useEffect(() => {
    const storageKey = `pis_locations_${entityType}`;
    try {
      setSuggestions(JSON.parse(localStorage.getItem(storageKey) || '[]'));
    } catch { setSuggestions([]); }
  }, [entityType]);

  const startScanner = async () => {
    setShowScanner(true);
    setTimeout(async () => {
      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.play();
        // Simple QR decode using canvas + polling
        scanFrame();
      }
    }, 300);
  };

  const scanFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    const v = videoRef.current;
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(v, 0, 0);
    // Use BarcodeDetector if available
    if ('BarcodeDetector' in window) {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      detector.detect(canvas).then(barcodes => {
        if (barcodes.length > 0) {
          const raw = barcodes[0].rawValue;
          // Format: entityType:locName
          const parts = raw.split(':');
          const loc = parts.length > 1 ? parts.slice(1).join(':') : raw;
          onChange(loc);
          stopScanner();
          toast.success(`Lokasi terdeteksi: ${loc}`);
        } else {
          if (showScannerRef.current) setTimeout(scanFrame, 500);
        }
      }).catch(() => {
        if (showScannerRef.current) setTimeout(scanFrame, 500);
      });
    } else {
      // Fallback: just show camera and let user close
    }
  };

  const showScannerRef = useRef(showScanner);
  useEffect(() => { showScannerRef.current = showScanner; }, [showScanner]);

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowScanner(false);
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder || 'Ketik atau scan lokasi...'}
            className="pl-9"
            list={`loc-list-${entityType}`}
          />
          <datalist id={`loc-list-${entityType}`}>
            {suggestions.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
        <Button type="button" variant="outline" onClick={startScanner} className="border-violet-400 text-violet-700 hover:bg-violet-50 shrink-0">
          <QrCode className="w-4 h-4" />
        </Button>
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${value === s ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <Dialog open={showScanner} onOpenChange={v => { if (!v) stopScanner(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-violet-600" /> Scan QR Lokasi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <video ref={videoRef} className="w-full rounded-lg border" autoPlay playsInline />
            <p className="text-xs text-center text-gray-500">Arahkan kamera ke QR Code lokasi</p>
            {'BarcodeDetector' in window ? null : (
              <p className="text-xs text-amber-600 text-center bg-amber-50 p-2 rounded">Browser ini tidak mendukung scan otomatis. Pilih lokasi secara manual.</p>
            )}
          </div>
          <Button variant="outline" onClick={stopScanner} className="w-full"><X className="w-4 h-4 mr-1" /> Tutup</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}