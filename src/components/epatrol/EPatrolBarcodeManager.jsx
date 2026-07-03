import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Download, Plus, Trash2, FileText, MapPin, Save, X } from 'lucide-react';
import QRCodeCanvas from './QRCodeCanvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69ae71d19fe396b3470078b2/74c75dcf9_Logobulat.png";

function CheckpointQRCard({ checkpoint, areaName }) {
  const cardRef = useRef(null);
  const qrValue = `PATROL|${areaName}|${checkpoint.nama}`;

  const handleDownload = () => {
    const canvas = cardRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `QR_${areaName}_${checkpoint.nama}.png`.replace(/\s+/g, '_');
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Card ref={cardRef} className="p-3 border shadow-sm hover:shadow-md transition-shadow">
      <div className="text-center mb-2">
        <p className="font-semibold text-sm text-gray-800 truncate">{checkpoint.nama}</p>
        <p className="text-xs text-gray-400">{areaName}</p>
      </div>
      <div className="bg-white border rounded-lg p-2 mb-2 flex justify-center">
        <QRCodeCanvas text={qrValue} size={120} showLogo={true} />
      </div>
      <p className="text-[8px] text-gray-300 text-center mb-2 truncate" title={qrValue}>{qrValue}</p>
      <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleDownload}>
        <Download className="w-3 h-3 mr-1" /> Unduh QR
      </Button>
    </Card>
  );
}

export default function EPatrolBarcodeManager({ areas = [], isMasterAdmin, employeeArea }) {
  const queryClient = useQueryClient();
  const [selectedArea, setSelectedArea] = useState(isMasterAdmin ? '' : (employeeArea || ''));
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCheckpoint, setNewCheckpoint] = useState({ nama: '', deskripsi: '' });
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const displayAreas = selectedArea ? areas.filter(a => a.nama_area === selectedArea) : areas;
  const allCheckpoints = displayAreas.flatMap(a =>
    (a.e_patrol_checkpoints || []).map(cp => ({ ...cp, areaName: a.nama_area, areaId: a.id }))
  );

  const currentArea = areas.find(a => a.nama_area === selectedArea);

  const handleAddCheckpoint = async () => {
    if (!newCheckpoint.nama.trim()) { toast.error('Nama titik wajib diisi'); return; }
    if (!selectedArea) { toast.error('Pilih area terlebih dahulu'); return; }
    const area = areas.find(a => a.nama_area === selectedArea);
    if (!area) return;
    setSaving(true);
    const existing = area.e_patrol_checkpoints || [];
    const newPoint = {
      id: Date.now().toString(),
      nama: newCheckpoint.nama.trim(),
      deskripsi: newCheckpoint.deskripsi.trim()
    };
    await base44.entities.AreaProject.update(area.id, {
      e_patrol_checkpoints: [...existing, newPoint]
    });
    queryClient.invalidateQueries({ queryKey: ['areas-patrol'] });
    queryClient.invalidateQueries({ queryKey: ['areas-ticket'] });
    setNewCheckpoint({ nama: '', deskripsi: '' });
    setShowAddDialog(false);
    setSaving(false);
    toast.success(`Titik "${newPoint.nama}" berhasil ditambahkan`);
  };

  const handleDeleteCheckpoint = async (cp) => {
    if (!confirm(`Hapus titik "${cp.nama}"?`)) return;
    const area = areas.find(a => a.nama_area === cp.areaName);
    if (!area) return;
    const updated = (area.e_patrol_checkpoints || []).filter(p => p.id !== cp.id);
    await base44.entities.AreaProject.update(area.id, { e_patrol_checkpoints: updated });
    queryClient.invalidateQueries({ queryKey: ['areas-patrol'] });
    toast.success('Titik dihapus');
  };

  const handleDownloadAllPDF = async () => {
    if (allCheckpoints.length === 0) { toast.error('Tidak ada titik untuk didownload'); return; }
    setDownloadingPdf(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const margin = 15;
      const cols = 3;
      const rows = 4;
      const perPage = cols * rows;
      const cardW = (pw - margin * 2 - (cols - 1) * 6) / cols;
      const cardH = (ph - margin * 2 - 25 - (rows - 1) * 6) / rows;

      const drawPageHeader = (pageNum, totalPages) => {
        doc.setFillColor(123, 26, 44);
        doc.rect(0, 0, pw, 18, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('TITIK PATROLI — BARCODE / QR CODE', pw / 2, 9, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`Area: ${selectedArea || 'Semua Area'} | ${allCheckpoints.length} Titik Patroli | Hal ${pageNum}/${totalPages}`, pw / 2, 15, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      };

      const totalPages = Math.ceil(allCheckpoints.length / perPage);

      for (let i = 0; i < allCheckpoints.length; i++) {
        const pageIdx = Math.floor(i / perPage);
        const posInPage = i % perPage;

        if (posInPage === 0) {
          if (pageIdx > 0) doc.addPage();
          drawPageHeader(pageIdx + 1, totalPages);
        }

        const colIdx = posInPage % cols;
        const rowIdx = Math.floor(posInPage / cols);
        const x = margin + colIdx * (cardW + 6);
        const y = 22 + rowIdx * (cardH + 6);
        const cp = allCheckpoints[i];
        const qrValue = `PATROL|${cp.areaName}|${cp.nama}`;

        // Kartu border
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(252, 252, 252);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

        // Nama titik
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(30, 30, 30);
        const namaTruncated = cp.nama.length > 22 ? cp.nama.slice(0, 22) + '...' : cp.nama;
        doc.text(namaTruncated, x + cardW / 2, y + 7, { align: 'center' });

        // Area
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(120, 120, 120);
        const areaTruncated = cp.areaName.length > 25 ? cp.areaName.slice(0, 25) + '...' : cp.areaName;
        doc.text(areaTruncated, x + cardW / 2, y + 11.5, { align: 'center' });

        // Cari canvas QR yang ter-render di DOM
        const canvases = document.querySelectorAll('canvas[data-qr]');
        let qrImgData = null;
        canvases.forEach(c => {
          if (c.getAttribute('data-qr') === qrValue) qrImgData = c.toDataURL('image/png');
        });

        // Gambar QR area placeholder jika tidak ada canvas
        const qrSize = Math.min(cardW - 10, cardH - 30);
        const qrX = x + (cardW - qrSize) / 2;
        const qrY = y + 14;
        if (qrImgData) {
          doc.addImage(qrImgData, 'PNG', qrX, qrY, qrSize, qrSize);
        } else {
          doc.setFillColor(240, 240, 240);
          doc.rect(qrX, qrY, qrSize, qrSize, 'F');
          doc.setFontSize(5);
          doc.setTextColor(160, 160, 160);
          doc.text('QR', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' });
        }

        // QR value kecil
        doc.setFontSize(4);
        doc.setTextColor(180, 180, 180);
        const valTrunc = qrValue.length > 32 ? qrValue.slice(0, 32) + '..' : qrValue;
        doc.text(valTrunc, x + cardW / 2, y + cardH - 2, { align: 'center' });
      }

      doc.save(`TitikPatroli_${selectedArea || 'SemuaArea'}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF berhasil didownload');
    } catch (err) {
      toast.error('Gagal: ' + err.message);
    }
    setDownloadingPdf(false);
  };

  // Render semua QRCode canvas tersembunyi untuk diambil datanya saat export PDF
  return (
    <div className="space-y-4">
      {/* Hidden QR canvases for PDF export */}
      <div className="hidden">
        {allCheckpoints.map((cp, idx) => {
          const qrValue = `PATROL|${cp.areaName}|${cp.nama}`;
          return (
            <div key={idx}>
              <QRCodeCanvas text={qrValue} size={200} showLogo={false} dataAttr={qrValue} />
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {isMasterAdmin ? (
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
          ) : (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-400 text-xs">Area: </span>
              <span className="font-semibold">{selectedArea}</span>
            </div>
          )}
          <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 mt-4">
            <QrCode className="w-4 h-4 inline mr-1" />
            Format: <code className="font-mono text-[10px]">PATROL|Area|Checkpoint</code>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedArea && (
            <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
              <Plus className="w-4 h-4 mr-1" /> Tambah Titik
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleDownloadAllPDF}
            disabled={downloadingPdf || allCheckpoints.length === 0}
            className="bg-[#7B1A2C] hover:bg-[#5A1220] text-white h-9"
          >
            <FileText className="w-4 h-4 mr-1" />
            {downloadingPdf ? 'Memproses...' : `Download PDF (${allCheckpoints.length})`}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-gray-600">
          <span className="font-bold text-gray-800">{allCheckpoints.length}</span> titik patroli
          {selectedArea && <span className="text-gray-400"> di {selectedArea}</span>}
        </p>
        <p className="text-xs text-gray-400">{displayAreas.length} area</p>
      </div>

      {/* Grid QR Cards */}
      {allCheckpoints.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada titik patroli</p>
          {selectedArea
            ? <p className="text-xs mt-1">Klik "Tambah Titik" untuk menambahkan titik patrol baru</p>
            : <p className="text-xs mt-1">Pilih area atau tambahkan titik di halaman Area/Proyek</p>
          }
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {allCheckpoints.map((cp, idx) => (
            <div key={`${cp.areaName}-${cp.id || idx}`} className="relative group">
              <CheckpointQRCard checkpoint={cp} areaName={cp.areaName} />
              {(isMasterAdmin || cp.areaName === employeeArea) && (
                <button
                  onClick={() => handleDeleteCheckpoint(cp)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-100 hover:bg-red-200 text-red-500 rounded-full p-1 transition-all"
                  title="Hapus titik ini"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Checkpoint Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" /> Tambah Titik Patrol
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
              Area: <strong>{selectedArea}</strong>
            </div>
            <div>
              <Label className="text-xs">Nama Titik Patrol *</Label>
              <Input
                value={newCheckpoint.nama}
                onChange={e => setNewCheckpoint(p => ({ ...p, nama: e.target.value }))}
                placeholder="Contoh: Pintu Utama, Pos Satpam, Parkir B..."
                className="h-9 mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Deskripsi (opsional)</Label>
              <Input
                value={newCheckpoint.deskripsi}
                onChange={e => setNewCheckpoint(p => ({ ...p, deskripsi: e.target.value }))}
                placeholder="Keterangan lokasi..."
                className="h-9 mt-1"
              />
            </div>
            {newCheckpoint.nama && (
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-2">Preview QR Code:</p>
                <div className="flex justify-center">
                  <QRCodeCanvas text={`PATROL|${selectedArea}|${newCheckpoint.nama}`} size={100} showLogo={false} />
                </div>
                <p className="text-[9px] text-gray-400 mt-1">PATROL|{selectedArea}|{newCheckpoint.nama}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
            <Button onClick={handleAddCheckpoint} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Menyimpan...' : 'Simpan Titik'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}