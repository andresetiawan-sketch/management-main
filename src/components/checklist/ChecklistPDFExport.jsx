import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';

const SECTIONS_META = [
  { key: 'serah_terima', label: 'Serah Terima & Persiapan', items: ['seragam_lengkap','id_card','ht_berfungsi','senter_berfungsi','buku_mutasi_tersedia','absensi_terisi','serah_terima_dilakukan'] },
  { key: 'patroli_area', label: 'Patroli Area', items: ['kunci_pintu_aman','jendela_aman','lampu_area_berfungsi','apar_kondisi_baik','potensi_bahaya_ditemukan','cctv_berfungsi','area_steril'] },
  { key: 'akses_keluar_masuk', label: 'Akses Keluar Masuk', items: ['tamu_diperiksa','buku_tamu_terisi','karyawan_diverifikasi','kendaraan_diperiksa','barang_masuk_dicatat','barang_keluar_dicatat'] },
  { key: 'ketertiban_parkir', label: 'Ketertiban & Parkir', items: ['lalulintas_diatur','parkir_tertib','area_sterilisasi_aman','tidak_ada_parkir_liar','akses_darurat_bebas'] },
  { key: 'laporan_akhir', label: 'Laporan Akhir Shift', items: ['buku_mutasi_terisi','kejadian_dilaporkan','serah_terima_berikutnya'] },
];

const ITEM_LABELS = {
  seragam_lengkap: 'Seragam lengkap dan rapi',
  id_card: 'ID Card terpasang',
  ht_berfungsi: 'HT berfungsi',
  senter_berfungsi: 'Senter berfungsi',
  buku_mutasi_tersedia: 'Buku mutasi tersedia',
  absensi_terisi: 'Absensi terisi',
  serah_terima_dilakukan: 'Serah terima dilakukan',
  kunci_pintu_aman: 'Kunci pintu aman',
  jendela_aman: 'Jendela aman',
  lampu_area_berfungsi: 'Lampu berfungsi',
  apar_kondisi_baik: 'APAR kondisi baik',
  potensi_bahaya_ditemukan: 'Potensi bahaya ditemukan?',
  cctv_berfungsi: 'CCTV berfungsi',
  area_steril: 'Area steril',
  tamu_diperiksa: 'Tamu diperiksa',
  buku_tamu_terisi: 'Buku tamu terisi',
  karyawan_diverifikasi: 'Karyawan diverifikasi',
  kendaraan_diperiksa: 'Kendaraan diperiksa',
  barang_masuk_dicatat: 'Barang masuk dicatat',
  barang_keluar_dicatat: 'Barang keluar dicatat',
  lalulintas_diatur: 'Lalu lintas diatur',
  parkir_tertib: 'Parkir tertib',
  area_sterilisasi_aman: 'Area sterilisasi aman',
  tidak_ada_parkir_liar: 'Tidak ada parkir liar',
  akses_darurat_bebas: 'Akses darurat bebas',
  buku_mutasi_terisi: 'Buku mutasi terisi',
  kejadian_dilaporkan: 'Kejadian dilaporkan?',
  serah_terima_berikutnya: 'Serah terima berikutnya',
};

function generateChecklistPDF(record) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = 210; const margin = 15;
  let y = margin;

  // Header
  doc.setFillColor(123, 26, 44);
  doc.rect(0, 0, pw, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('DAILY PERFORMANCE CHECKLIST', pw / 2, 11, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('Formulir Evaluasi Harian Petugas Keamanan', pw / 2, 18, { align: 'center' });
  doc.text('PT. Putra Indonesia Solusi & PT. Prestasi Indonesia Solusi', pw / 2, 24, { align: 'center' });
  y = 34;

  // Info Box
  doc.setTextColor(0);
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(margin, y, pw - margin * 2, 28, 2, 2, 'F');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
  const infoCol1 = margin + 4;
  const infoCol2 = pw / 2 + 4;
  doc.setFont('helvetica', 'bold'); doc.text('Nama Petugas:', infoCol1, y + 7); doc.setFont('helvetica', 'normal'); doc.text(record.nama_karyawan || '-', infoCol1 + 30, y + 7);
  doc.setFont('helvetica', 'bold'); doc.text('Area Tugas:', infoCol1, y + 14); doc.setFont('helvetica', 'normal'); doc.text(record.area_tugas || '-', infoCol1 + 30, y + 14);
  doc.setFont('helvetica', 'bold'); doc.text('Jabatan:', infoCol1, y + 21); doc.setFont('helvetica', 'normal'); doc.text(record.jabatan || '-', infoCol1 + 30, y + 21);
  doc.setFont('helvetica', 'bold'); doc.text('Tanggal:', infoCol2, y + 7); doc.setFont('helvetica', 'normal'); doc.text(record.tanggal || '-', infoCol2 + 24, y + 7);
  doc.setFont('helvetica', 'bold'); doc.text('Shift:', infoCol2, y + 14); doc.setFont('helvetica', 'normal'); doc.text(record.shift || '-', infoCol2 + 24, y + 14);
  doc.setFont('helvetica', 'bold'); doc.text('NIK:', infoCol2, y + 21); doc.setFont('helvetica', 'normal'); doc.text(record.nik_karyawan || '-', infoCol2 + 24, y + 21);
  y += 34;

  // Sections
  SECTIONS_META.forEach((section) => {
    if (y > 250) { doc.addPage(); y = 15; }
    // Section header
    doc.setFillColor(50, 50, 50);
    doc.rect(margin, y, pw - margin * 2, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text(section.label.toUpperCase(), margin + 3, y + 5);
    y += 9;

    // Table header
    doc.setFillColor(230, 230, 230);
    doc.rect(margin, y, pw - margin * 2, 6, 'F');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.text('No.', margin + 2, y + 4.2);
    doc.text('Item Pemeriksaan', margin + 9, y + 4.2);
    doc.text('Ya', margin + 108, y + 4.2);
    doc.text('Tidak', margin + 121, y + 4.2);
    doc.text('Keterangan', margin + 136, y + 4.2);
    y += 6;

    const sectionData = record[section.key] || {};
    section.items.forEach((itemKey, i) => {
      if (y > 272) { doc.addPage(); y = 15; }
      const val = sectionData[itemKey] || '-';
      const rowH = 6.5;
      doc.setFillColor(i % 2 === 0 ? 255 : 252, i % 2 === 0 ? 255 : 252, i % 2 === 0 ? 255 : 252);
      doc.rect(margin, y, pw - margin * 2, rowH, 'F');
      doc.setTextColor(40, 40, 40); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.text(String(i + 1), margin + 2, y + 4.4);
      doc.text(ITEM_LABELS[itemKey] || itemKey, margin + 9, y + 4.4);
      // Ya checkbox
      doc.setDrawColor(150); doc.rect(margin + 107, y + 1.5, 4, 4);
      if (val === 'Ya') { doc.setFillColor(34, 197, 94); doc.rect(margin + 107, y + 1.5, 4, 4, 'F'); doc.setTextColor(255); doc.setFontSize(6); doc.text('✓', margin + 108.2, y + 4.8); doc.setFontSize(7.5); doc.setTextColor(40,40,40); }
      // Tidak checkbox
      doc.setDrawColor(150); doc.rect(margin + 120, y + 1.5, 4, 4);
      if (val === 'Tidak') { doc.setFillColor(239, 68, 68); doc.rect(margin + 120, y + 1.5, 4, 4, 'F'); doc.setTextColor(255); doc.setFontSize(6); doc.text('✗', margin + 121.2, y + 4.8); doc.setFontSize(7.5); doc.setTextColor(40,40,40); }
      doc.setDrawColor(0);
      // Keterangan line
      doc.setDrawColor(200); doc.line(margin + 135, y + rowH - 0.5, pw - margin, y + rowH - 0.5);
      y += rowH;
    });

    // Keterangan section
    const ket = sectionData.keterangan;
    if (ket) {
      doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(100);
      doc.text(`Keterangan: ${ket}`, margin + 3, y + 4);
      y += 6;
    }
    y += 3;
  });

  // Ringkasan Kejadian
  const ringkasan = record.laporan_akhir?.ringkasan_kejadian;
  if (ringkasan) {
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFillColor(255, 248, 230);
    doc.roundedRect(margin, y, pw - margin * 2, 20, 2, 2, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 80, 0);
    doc.text('Ringkasan Kejadian Selama Shift:', margin + 3, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(60, 60, 60);
    doc.text(doc.splitTextToSize(ringkasan, pw - margin * 2 - 6), margin + 3, y + 12);
    y += 24;
  }

  // Evaluasi Supervisor
  if (y > 240) { doc.addPage(); y = 15; }
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, pw - margin * 2, 40, 2, 2, 'F');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
  doc.text('EVALUASI SUPERVISOR', margin + 3, y + 8);

  const col1 = margin + 3; const col2 = pw / 2 + 5;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  doc.text(`Nilai: ${record.nilai_supervisor || '___'} / 100`, col1, y + 16);
  doc.text(`Status: ${record.status_evaluasi || 'Menunggu Evaluasi'}`, col1, y + 23);
  doc.text(`Catatan: ${record.catatan_supervisor || '-'}`, col1, y + 30);

  doc.setFont('helvetica', 'bold'); doc.setTextColor(50);
  doc.text('Tanda Tangan Supervisor:', col2, y + 16);
  doc.line(col2, y + 33, pw - margin, y + 33);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text(record.tanda_tangan_supervisor || record.nama_supervisor || '', col2, y + 37);
  y += 48;

  // Serah Terima Section
  if (record.penerima_serah_terima || record.ttd_penyerah || record.ttd_penerima) {
    if (y > 220) { doc.addPage(); y = 15; }
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(margin, y, pw - margin * 2, 72, 2, 2, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 80, 0);
    doc.text('SERAH TERIMA TUGAS', margin + 3, y + 8);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
    doc.text(`Penyerah : ${record.nama_karyawan || '-'}`, margin + 3, y + 17);
    doc.text(`Penerima : ${record.penerima_serah_terima || '-'}`, margin + 3, y + 25);
    const halfW = (pw - margin * 2) / 2 - 6;
    const ttdY = y + 31;
    doc.setDrawColor(180); doc.roundedRect(margin + 3, ttdY, halfW, 30, 1, 1);
    doc.setFontSize(7); doc.setTextColor(100);
    doc.text('TTD Penyerah:', margin + 5, ttdY + 6);
    if (record.ttd_penyerah) {
      try { doc.addImage(record.ttd_penyerah, 'PNG', margin + 5, ttdY + 7, halfW - 4, 18); } catch(e) {}
    }
    doc.line(margin + 5, ttdY + 27, margin + halfW, ttdY + 27);
    doc.text(record.nama_karyawan || '', margin + 5, ttdY + 30);
    const ttdX2 = margin + halfW + 9;
    doc.setDrawColor(180); doc.roundedRect(ttdX2, ttdY, halfW, 30, 1, 1);
    doc.text('TTD Penerima:', ttdX2 + 2, ttdY + 6);
    if (record.ttd_penerima) {
      try { doc.addImage(record.ttd_penerima, 'PNG', ttdX2 + 2, ttdY + 7, halfW - 4, 18); } catch(e) {}
    }
    doc.line(ttdX2 + 2, ttdY + 27, ttdX2 + halfW - 2, ttdY + 27);
    doc.text(record.penerima_serah_terima || '', ttdX2 + 2, ttdY + 30);
    y += 80;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150);
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')} · Halaman ${i}/${pageCount}`, pw / 2, 293, { align: 'center' });
    doc.setDrawColor(200); doc.line(margin, 289, pw - margin, 289);
  }

  doc.save(`Checklist_${record.nama_karyawan?.replace(/\s+/g,'_')}_${record.tanggal}_${record.shift}.pdf`);
}

export default function ChecklistPDFExport({ record, compact = false }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 100));
    generateChecklistPDF(record);
    setLoading(false);
  };

  return (
    <Button
      size={compact ? 'sm' : 'default'}
      variant="outline"
      onClick={handle}
      disabled={loading}
      className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
      {compact ? 'PDF' : 'Unduh PDF'}
    </Button>
  );
}