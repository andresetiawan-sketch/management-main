import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';

// Simple QR generator using google charts API (no extra package)
function QRImg({ value, size = 120 }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  return <img src={url} alt="QR Code" className="rounded-lg" width={size} height={size} />;
}

export default function AssetQRLabel({ item, open, onClose }) {
  const printRef = useRef(null);

  const qrValue = JSON.stringify({
    id: item?.id,
    kode: item?.kode_barang,
    nama: item?.nama_barang,
    area: item?.area_tugas,
  });

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Label Aset - ${item?.kode_barang}</title>
      <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        .label { border: 2px solid #333; border-radius: 8px; padding: 16px; width: 280px; text-align: center; }
        .kode { font-size: 18px; font-weight: bold; color: #7B1A2C; margin: 8px 0; }
        .nama { font-size: 14px; font-weight: 600; margin: 4px 0; }
        .area { font-size: 11px; color: #666; margin: 2px 0; }
        .kondisi { font-size: 11px; margin: 4px 0; padding: 2px 8px; border-radius: 4px; display: inline-block; }
        .baik { background: #d1fae5; color: #065f46; }
        .cukup { background: #fef3c7; color: #92400e; }
        .rusak { background: #fee2e2; color: #991b1b; }
        img { margin: 8px auto; display: block; }
        .footer { font-size: 9px; color: #999; margin-top: 8px; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  };

  if (!item) return null;

  const kondisiClass = { Baik: 'baik', Cukup: 'cukup', Rusak: 'rusak' }[item.kondisi] || 'baik';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Label QR Aset</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div ref={printRef}>
            <div className="label" style={{ border: '2px solid #333', borderRadius: 8, padding: 16, width: 280, textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
              <div style={{ fontSize: 10, color: '#999', marginBottom: 4 }}>ASET OPERASIONAL</div>
              <div className="kode" style={{ fontSize: 18, fontWeight: 'bold', color: '#7B1A2C' }}>{item.kode_barang}</div>
              <QRImg value={qrValue} size={140} />
              <div className="nama" style={{ fontSize: 14, fontWeight: 600, margin: '4px 0' }}>{item.nama_barang}</div>
              <div className="area" style={{ fontSize: 11, color: '#666' }}>Area: {item.area_tugas || '-'}</div>
              <div className="area" style={{ fontSize: 11, color: '#666' }}>Kategori: {item.kategori || '-'}</div>
              <div style={{ marginTop: 6 }}>
                <span className={`kondisi ${kondisiClass}`} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, display: 'inline-block', background: kondisiClass === 'baik' ? '#d1fae5' : kondisiClass === 'cukup' ? '#fef3c7' : '#fee2e2', color: kondisiClass === 'baik' ? '#065f46' : kondisiClass === 'cukup' ? '#92400e' : '#991b1b' }}>
                  Kondisi: {item.kondisi}
                </span>
              </div>
              <div className="footer" style={{ fontSize: 9, color: '#999', marginTop: 8 }}>
                Scan QR untuk verifikasi aset saat patroli<br />
                PT. Putra Indonesia Solusi
              </div>
            </div>
          </div>
          <Button onClick={handlePrint} className="bg-[#7B1A2C] hover:bg-[#5A1220] text-white gap-2 w-full">
            <Printer className="w-4 h-4" /> Cetak Label
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}