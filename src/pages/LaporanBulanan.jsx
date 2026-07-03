import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { FileText, Download, Loader2, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69ae71d19fe396b3470078b2/74c75dcf9_Logobulat.png";

const MONTHS = [
{ value: '01', label: 'Januari' }, { value: '02', label: 'Februari' },
{ value: '03', label: 'Maret' }, { value: '04', label: 'April' },
{ value: '05', label: 'Mei' }, { value: '06', label: 'Juni' },
{ value: '07', label: 'Juli' }, { value: '08', label: 'Agustus' },
{ value: '09', label: 'September' }, { value: '10', label: 'Oktober' },
{ value: '11', label: 'November' }, { value: '12', label: 'Desember' }];


const YEARS = ['2024', '2025', '2026'];

const REPORT_TYPES = [
{ key: 'attendance', label: 'Laporan Absensi', color: '#2563eb' },
{ key: 'shift', label: 'Laporan Jadwal Shift', color: '#7B1A2C' },
{ key: 'epatrol', label: 'Laporan E-Patroli', color: '#16a34a' },
{ key: 'hydrant', label: 'Laporan Hydrant & APAR', color: '#dc2626' },
{ key: 'efacility', label: 'Laporan E-Facility', color: '#9333ea' },
{ key: 'emergency', label: 'Laporan Box Emergency', color: '#ea580c' },
{ key: 'checklist', label: 'Laporan Checklist (KR & Toilet)', color: '#0891b2' },
{ key: 'facility_ticket', label: 'Laporan Tiket Fasilitas', color: '#0f766e' },
{ key: 'guestbook', label: 'Laporan Buku Tamu', color: '#0369a1' },
{ key: 'tenant_package', label: 'Laporan Paket Tenant', color: '#b45309' },
{ key: 'laporan_harian', label: 'Laporan Harian', color: '#6d28d9' },
{ key: 'inventory', label: 'Laporan Inventaris', color: '#065f46' },
{ key: 'rekap_all', label: 'Rekap Bulanan Terpadu (PDF)', color: '#64100c' }];


// Draw a simple table using jsPDF primitives
function drawTable(doc, headers, rows, startY, headerColor, altColor) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 10;
  const tableWidth = pw - margin * 2;
  const colWidth = tableWidth / headers.length;
  const rowH = 7;
  const fontSize = 7;
  let y = startY;

  const drawRow = (cells, bgColor, textColor, bold) => {
    if (y + rowH > ph - 14) {
      doc.addPage();
      y = 14;
    }
    doc.setFillColor(...bgColor);
    doc.rect(margin, y, tableWidth, rowH, 'F');
    doc.setTextColor(...textColor);
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    cells.forEach((cell, i) => {
      const txt = String(cell ?? '-').slice(0, 20);
      doc.text(txt, margin + i * colWidth + 2, y + 5);
    });
    // bottom border
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y + rowH, margin + tableWidth, y + rowH);
    y += rowH;
  };

  // Header row
  drawRow(headers, headerColor, [255, 255, 255], true);
  // Data rows
  rows.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? [255, 255, 255] : altColor;
    drawRow(row, bg, [40, 40, 40], false);
  });

  doc.setTextColor(0, 0, 0);
  return y + 4;
}

function addPDFHeader(doc, title, area, periode, pageWidth) {
  doc.setFillColor(100, 10, 20);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INTEGRATED', 14, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('PT. Putra Indonesia Solusi & PT. Prestasi Indonesia Solusi', 14, 19);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 11, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode: ${periode}  |  Area: ${area || 'Semua Area'}`, pageWidth / 2, 17, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  return 35;
}

function addPageFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}  |  Hal ${i}/${pageCount}`, pw / 2, ph - 4, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }
}

function getKeteranganKehadiran(r, shifts) {
  if (!r.jam_hadir) return 'Belum Absen';
  const shiftMatch = shifts?.find(s => s.tanggal === r.tanggal && s.regu === r.regu && s.area_tugas === r.area_tugas);
  if (!shiftMatch?.jam_mulai) return 'Tepat Waktu';
  const [sh, sm] = shiftMatch.jam_mulai.split(':').map(Number);
  const [ah, am] = r.jam_hadir.split(':').map(Number);
  const shiftMin = sh * 60 + sm;
  const hadirMin = ah * 60 + am;
  if (hadirMin > shiftMin + 15) return `Terlambat ${hadirMin - shiftMin} menit`;
  return 'Tepat Waktu';
}

async function generateAttendancePDF(data, area, periode, shiftsData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const startY = addPDFHeader(doc, 'LAPORAN ABSENSI BULANAN', area, periode, pw);
  const headers = ['No', 'Tanggal', 'NIK', 'Nama', 'Jabatan', 'Regu', 'Status', 'Jam Hadir', 'Jam Pulang', 'Shift', 'Keterangan'];
  const rows = data.map((r, i) => [i + 1, r.tanggal, r.nik_karyawan, r.nama_karyawan, r.jabatan || '-', r.regu || '-', r.status, r.jam_hadir || '-', r.jam_pulang || '-', r.tipe_shift || '-', getKeteranganKehadiran(r, shiftsData)]);

  // Table with photos
  let y = startY;
  const margin = 10;
  const tableWidth = pw - margin * 2;
  const colCount = headers.length;
  const colW = tableWidth / colCount;
  const rowH = 18; // taller rows for photos
  const fontSize = 6.5;

  // Header row
  doc.setFillColor(100, 10, 20);
  doc.rect(margin, y, tableWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(fontSize); doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => doc.text(h, margin + i * colW + 1.5, y + 5.5));
  y += 8;

  for (let idx = 0; idx < rows.length; idx++) {
    const r = data[idx];
    const row = rows[idx];
    if (y + rowH > ph - 14) { doc.addPage(); y = 14; }
    const bg = idx % 2 === 0 ? [255, 255, 255] : [250, 245, 245];
    doc.setFillColor(...bg);
    doc.rect(margin, y, tableWidth, rowH, 'F');
    doc.setTextColor(40, 40, 40); doc.setFont('helvetica', 'normal'); doc.setFontSize(fontSize);
    // Text cells (skip last 2 for foto)
    row.forEach((v, i) => {
      doc.text(String(v ?? '-').slice(0, 18), margin + i * colW + 1.5, y + 6);
    });
    // Foto hadir thumbnail
    if (r.foto_hadir) {
      try {
        doc.addImage(r.foto_hadir, 'JPEG', margin + 7 * colW + 1, y + 1, colW - 2, rowH - 2);
      } catch(_) {}
    }
    // Foto pulang thumbnail
    if (r.foto_pulang) {
      try {
        doc.addImage(r.foto_pulang, 'JPEG', margin + 8 * colW + 1, y + 1, colW - 2, rowH - 2);
      } catch(_) {}
    }
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y + rowH, margin + tableWidth, y + rowH);
    y += rowH;
  }
  if (rows.length === 0) {
    doc.setFontSize(fontSize); doc.setTextColor(150);
    doc.text('Tidak ada data', margin + 5, y + 6);
  }

  addPageFooter(doc);
  doc.save(`Laporan_Absensi_${periode.replace(' ', '_')}_${area || 'Semua'}.pdf`);
}

async function generateEPatrolPDF(data, area, periode) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const startY = addPDFHeader(doc, 'LAPORAN E-PATROLI BULANAN', area, periode, pw);
  const headers = ['No', 'Tanggal', 'Waktu', 'NIK', 'Nama', 'Area', 'Checkpoint', 'Kondisi', 'Catatan'];
  const rows = data.map((r, i) => [i + 1, r.tanggal, r.waktu || '-', r.nik_karyawan, r.nama_karyawan, r.area_tugas, r.checkpoint || '-', r.kondisi || '-', r.catatan || '-']);
  drawTable(doc, headers, rows.length > 0 ? rows : [Array(headers.length).fill('-')], startY, [22, 163, 74], [240, 253, 244]);
  addPageFooter(doc);
  doc.save(`Laporan_EPatrol_${periode.replace(' ', '_')}_${area || 'Semua'}.pdf`);
}

async function generateHydrantPDF(data, area, periode) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const startY = addPDFHeader(doc, 'LAPORAN HYDRANT & APAR BULANAN', area, periode, pw);
  const headers = ['No', 'Tanggal', 'NIK', 'Nama', 'Area', 'Tipe', 'Lokasi', 'Kondisi', 'Tekanan', 'Expired', 'Catatan'];
  const rows = data.map((r, i) => [i + 1, r.tanggal, r.nik_karyawan, r.nama_karyawan, r.area_tugas, r.tipe || '-', r.lokasi_hydrant || '-', r.kondisi || '-', r.tekanan_bar || '-', r.tanggal_expired || '-', r.catatan || '-']);
  drawTable(doc, headers, rows.length > 0 ? rows : [Array(headers.length).fill('-')], startY, [220, 38, 38], [255, 245, 245]);
  addPageFooter(doc);
  doc.save(`Laporan_Hydrant_${periode.replace(' ', '_')}_${area || 'Semua'}.pdf`);
}

async function generateEFacilityPDF(data, area, periode) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const startY = addPDFHeader(doc, 'LAPORAN E-FACILITY BULANAN', area, periode, pw);
  const headers = ['No', 'Tanggal', 'NIK', 'Nama', 'Area', 'Lokasi', 'Status', 'Catatan'];
  const rows = data.map((r, i) => [i + 1, r.tanggal, r.nik_karyawan, r.nama_karyawan, r.area_tugas, r.lokasi || '-', r.status || '-', r.catatan || '-']);
  drawTable(doc, headers, rows.length > 0 ? rows : [Array(headers.length).fill('-')], startY, [147, 51, 234], [250, 245, 255]);
  addPageFooter(doc);
  doc.save(`Laporan_EFacility_${periode.replace(' ', '_')}_${area || 'Semua'}.pdf`);
}

async function generateEmergencyPDF(data, area, periode) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const startY = addPDFHeader(doc, 'LAPORAN BOX EMERGENCY BULANAN', area, periode, pw);
  const headers = ['No', 'Tanggal', 'NIK', 'Nama', 'Area', 'Lokasi Box', 'Kondisi', 'Isi', 'Catatan'];
  const rows = data.map((r, i) => [i + 1, r.tanggal, r.nik_karyawan, r.nama_karyawan, r.area_tugas, r.lokasi_box || '-', r.kondisi || '-', r.isi_lengkap ? 'Lengkap' : 'Tidak', r.catatan || '-']);
  drawTable(doc, headers, rows.length > 0 ? rows : [Array(headers.length).fill('-')], startY, [234, 88, 12], [255, 247, 237]);
  addPageFooter(doc);
  doc.save(`Laporan_Emergency_${periode.replace(' ', '_')}_${area || 'Semua'}.pdf`);
}

async function generateFacilityTicketPDF(data, area, periode) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const startY = addPDFHeader(doc, 'LAPORAN TIKET FASILITAS BULANAN', area, periode, pw);
  const headers = ['No', 'Tanggal', 'Judul', 'Area', 'Lokasi', 'Prioritas', 'Status', 'Pelapor', 'Teknisi', 'Tgl Selesai'];
  const rows = data.map((r, i) => [i + 1, r.tanggal_lapor, r.judul, r.area_tugas, r.lokasi_kerusakan || '-', r.prioritas || '-', r.status || '-', r.nama_pelapor || '-', r.nama_teknisi || '-', r.tanggal_selesai || '-']);
  drawTable(doc, headers, rows.length > 0 ? rows : [Array(headers.length).fill('-')], startY, [15, 118, 110], [240, 253, 250]);
  addPageFooter(doc);
  doc.save(`Laporan_Tiket_Fasilitas_${periode.replace(' ', '_')}_${area || 'Semua'}.pdf`);
}

// Draw a simple horizontal bar chart
function drawBarChart(doc, title, labels, values, colors, startX, startY, chartW, chartH) {
  const maxVal = Math.max(...values, 1);
  const barH = Math.min(10, (chartH - 12) / labels.length);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
  doc.text(title, startX, startY - 2);
  labels.forEach((lbl, i) => {
    const y = startY + i * (barH + 3);
    const barW = (values[i] / maxVal) * (chartW - 30);
    doc.setFillColor(...(colors[i % colors.length]));
    doc.rect(startX + 28, y, barW, barH, 'F');
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
    doc.text(String(lbl).slice(0, 12), startX, y + barH - 1);
    doc.setTextColor(255, 255, 255);
    if (barW > 8) doc.text(String(values[i]), startX + 30, y + barH - 1);
    doc.setTextColor(60, 60, 60);
  });
  doc.setTextColor(0, 0, 0);
}

async function generateRekapTerpaduPDF(attData, patrolData, ticketData, area, periode) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // ── COVER PAGE ──
  doc.setFillColor(100, 10, 20);
  doc.rect(0, 0, pw, ph, 'F');
  // decorative stripes
  doc.setFillColor(120, 20, 35); doc.rect(0, ph - 25, pw, 8, 'F');
  doc.setFillColor(140, 30, 45); doc.rect(0, ph - 15, pw, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28); doc.setFont('helvetica', 'bold');
  doc.text('REKAP BULANAN TERPADU', pw / 2, 70, { align: 'center' });
  doc.setFontSize(15); doc.setFont('helvetica', 'normal');
  doc.text(periode, pw / 2, 85, { align: 'center' });
  if (area) { doc.setFontSize(11); doc.text(`Area: ${area}`, pw / 2, 97, { align: 'center' }); }
  doc.setFontSize(9);
  doc.text('PT. Putra Indonesia Solusi & PT. Prestasi Indonesia Solusi', pw / 2, 110, { align: 'center' });
  doc.setFontSize(7.5); doc.setTextColor(200, 200, 200);
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, pw / 2, 119, { align: 'center' });

  // Summary stat boxes
  const taruna = patrolData.filter(p => p.kondisi === 'Taruna').length;
  const boxData = [
    { label: 'Total Absensi', val: attData.length, color: [37, 99, 235] },
    { label: 'Hadir', val: attData.filter(r => r.status === 'Hadir' || r.status === 'Terlambat').length, color: [22, 163, 74] },
    { label: 'Total Patroli', val: patrolData.length, color: [8, 145, 178] },
    { label: 'Temuan (Taruna)', val: taruna, color: taruna > 0 ? [220, 38, 38] : [75, 85, 99] },
    { label: 'Tiket Fasilitas', val: ticketData.length, color: [15, 118, 110] },
    { label: 'Tiket Selesai', val: ticketData.filter(t => t.status === 'Selesai').length, color: [100, 10, 20] },
  ];
  const bw = 40; const bh = 24; const gap = 4;
  const totalW = boxData.length * (bw + gap) - gap;
  const bx0 = (pw - totalW) / 2;
  boxData.forEach((b, i) => {
    const bx = bx0 + i * (bw + gap);
    doc.setFillColor(...b.color);
    doc.roundedRect(bx, 133, bw, bh, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(String(b.val), bx + bw / 2, 144, { align: 'center' });
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    doc.text(b.label, bx + bw / 2, 152, { align: 'center' });
  });

  // ── PAGE 2: RINGKASAN & GRAFIK ──
  doc.addPage();
  let y = addPDFHeader(doc, 'RINGKASAN & GRAFIK', area, periode, pw);

  // Attendance status chart
  const statusCount = {};
  attData.forEach(r => { statusCount[r.status] = (statusCount[r.status] || 0) + 1; });
  const attLabels = Object.keys(statusCount);
  const attVals = Object.values(statusCount);
  const attColors = [[37,99,235],[22,163,74],[234,179,8],[239,68,68],[168,85,247],[14,165,233],[107,114,128]];
  if (attLabels.length > 0) {
    drawBarChart(doc, 'Status Kehadiran', attLabels, attVals, attColors, 12, y + 4, 120, attLabels.length * 14);
  }

  // Patrol kondisi chart
  const kondisiCount = {};
  patrolData.forEach(p => { kondisiCount[p.kondisi || '-'] = (kondisiCount[p.kondisi || '-'] || 0) + 1; });
  const patLabels = Object.keys(kondisiCount);
  const patVals = Object.values(kondisiCount);
  const patColors = [[22,163,74],[239,68,68],[234,179,8],[14,165,233]];
  if (patLabels.length > 0) {
    drawBarChart(doc, 'Kondisi Patroli', patLabels, patVals, patColors, 155, y + 4, 120, patLabels.length * 14);
  }
  y += Math.max(attLabels.length, patLabels.length) * 14 + 22;

  // Temuan / Taruna table (if any)
  const tarunaRows = patrolData.filter(p => p.kondisi === 'Taruna');
  if (tarunaRows.length > 0) {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(220, 38, 38);
    doc.text(`⚠ Temuan / Kondisi TARUNA (${tarunaRows.length} kejadian)`, 12, y); y += 5;
    const th = ['No', 'Tanggal', 'Waktu', 'Petugas', 'Area', 'Checkpoint', 'Catatan', 'Tindak Lanjut'];
    const tr = tarunaRows.map((r, i) => [i+1, r.tanggal, r.waktu||'-', r.nama_karyawan, r.area_tugas, r.checkpoint||'-', r.catatan||'-', r.tindak_lanjut||'Belum']);
    y = drawTable(doc, th, tr, y, [220, 38, 38], [255, 245, 245]);
  }

  // ── PAGE 3: ABSENSI ──
  doc.addPage();
  y = addPDFHeader(doc, 'REKAP ABSENSI BULANAN', area, periode, pw);
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
  let sx = 10;
  Object.entries(statusCount).forEach(([st, cnt]) => {
    doc.setFillColor(240, 240, 240); doc.roundedRect(sx, y, 28, 9, 2, 2, 'F');
    doc.text(`${st}: ${cnt}`, sx + 14, y + 6, { align: 'center' });
    sx += 31;
  });
  y += 13;
  const attHeaders = ['No', 'Tanggal', 'NIK', 'Nama', 'Jabatan', 'Regu', 'Status', 'Jam Hadir', 'Jam Pulang', 'Shift', 'Keterangan'];
  const attRows = attData.map((r, i) => [i+1, r.tanggal, r.nik_karyawan, r.nama_karyawan, r.jabatan||'-', r.regu||'-', r.status, r.jam_hadir||'-', r.jam_pulang||'-', r.tipe_shift||'-', getKeteranganKehadiran(r, [])]);
  drawTable(doc, attHeaders, attRows.length > 0 ? attRows : [Array(attHeaders.length).fill('-')], y, [37, 99, 235], [245, 248, 255]);

  // ── PAGE 4: E-PATROLI ──
  doc.addPage();
  y = addPDFHeader(doc, 'REKAP E-PATROLI BULANAN', area, periode, pw);
  const patHeaders = ['No', 'Tanggal', 'Waktu', 'NIK', 'Nama', 'Area', 'Checkpoint', 'Kondisi', 'Tindak Lanjut', 'Catatan'];
  const patRows = patrolData.map((r, i) => [i+1, r.tanggal, r.waktu||'-', r.nik_karyawan, r.nama_karyawan, r.area_tugas, r.checkpoint||'-', r.kondisi||'-', r.tindak_lanjut||'-', r.catatan||'-']);
  y = drawTable(doc, patHeaders, patRows.length > 0 ? patRows : [Array(patHeaders.length).fill('-')], y, [22, 163, 74], [240, 253, 244]);

  // Patrol photos (Taruna only — as evidence)
  const photoPats = patrolData.filter(p => p.kondisi === 'Taruna' && (p.foto || p.foto_temuan));
  if (photoPats.length > 0) {
    if (y + 12 > ph - 14) { doc.addPage(); y = 14; }
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(220, 38, 38);
    doc.text('Foto Bukti Temuan (Taruna)', 12, y + 5); y += 10;
    let px = 12; let rowMaxH = 0;
    for (const p of photoPats) {
      if (px + 38 > pw - 10) { px = 12; y += rowMaxH + 4; rowMaxH = 0; }
      if (y + 30 > ph - 14) { doc.addPage(); y = 14; px = 12; }
      try {
        if (p.foto) { doc.addImage(p.foto, 'JPEG', px, y, 34, 26); }
        doc.setFontSize(5.5); doc.setTextColor(80, 80, 80);
        doc.text(`${p.checkpoint || '-'} · ${p.tanggal}`, px, y + 28);
        px += 38; rowMaxH = Math.max(rowMaxH, 30);
      } catch(_) { px += 38; }
    }
    y += rowMaxH + 6;
  }

  // ── PAGE 5: TIKET FASILITAS ──
  doc.addPage();
  y = addPDFHeader(doc, 'REKAP TIKET FASILITAS BULANAN', area, periode, pw);
  const tickHeaders = ['No', 'Tgl Lapor', 'Judul', 'Area', 'Lokasi', 'Prioritas', 'Status', 'Pelapor', 'Teknisi', 'Tgl Selesai'];
  const tickRows = ticketData.map((r, i) => [i+1, r.tanggal_lapor, r.judul, r.area_tugas, r.lokasi_kerusakan||'-', r.prioritas||'-', r.status||'-', r.nama_pelapor||'-', r.nama_teknisi||'-', r.tanggal_selesai||'-']);
  drawTable(doc, tickHeaders, tickRows.length > 0 ? tickRows : [Array(tickHeaders.length).fill('-')], y, [100, 10, 20], [255, 245, 245]);

  addPageFooter(doc);
  doc.save(`Rekap_Bulanan_Terpadu_${periode.replace(' ', '_')}_${area || 'Semua'}.pdf`);
}

async function generateChecklistPDF(krData, toiletData, area, periode) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  let y = addPDFHeader(doc, 'LAPORAN CHECKLIST KR & TOILET BULANAN', area, periode, pw);

  doc.setFontSize(9);doc.setFont('helvetica', 'bold');doc.setTextColor(8, 145, 178);
  doc.text('A. Checklist Kendaraan (KR)', 10, y);y += 5;
  const krHeaders = ['No', 'Tanggal', 'Nama', 'Area', 'Tipe KR', 'Plat', 'Mesin', 'Ban', 'BBM', 'KM'];
  const krRows = krData.map((r, i) => [i + 1, r.tanggal, r.nama_karyawan, r.area_tugas, r.tipe_kendaraan || '-', r.no_polisi || '-', r.kondisi_mesin || '-', r.kondisi_ban || '-', r.bbm || '-', r.km_terakhir || '-']);
  y = drawTable(doc, krHeaders, krRows.length > 0 ? krRows : [Array(krHeaders.length).fill('-')], y, [8, 145, 178], [240, 249, 255]);

  y += 4;
  doc.setFontSize(9);doc.setFont('helvetica', 'bold');doc.setTextColor(8, 145, 178);
  doc.text('B. Checklist Toilet', 10, y);y += 5;
  const toiletHeaders = ['No', 'Tanggal', 'Waktu', 'Nama', 'Area', 'Lokasi', 'Kebersihan', 'Perlengkapan', 'Catatan'];
  const toiletRows = toiletData.map((r, i) => [i + 1, r.tanggal, r.waktu || '-', r.nama_karyawan, r.area_tugas, r.lokasi_toilet || '-', r.kebersihan || '-', r.perlengkapan || '-', r.catatan || '-']);
  drawTable(doc, toiletHeaders, toiletRows.length > 0 ? toiletRows : [Array(toiletHeaders.length).fill('-')], y, [8, 145, 178], [240, 249, 255]);
  addPageFooter(doc);
  doc.save(`Laporan_Checklist_${periode.replace(' ', '_')}_${area || 'Semua'}.pdf`);
}

async function generateShiftPDF(data, area, periode) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const startY = addPDFHeader(doc, 'LAPORAN JADWAL SHIFT BULANAN', area, periode, pw);
  const headers = ['No', 'Tanggal', 'Area', 'Regu', 'Tipe Shift', 'Sesi', 'Jam Mulai', 'Jam Selesai', 'Catatan'];
  const rows = data.map((r, i) => [i+1, r.tanggal, r.area_tugas, r.regu||'-', r.tipe_shift||'-', r.catatan||'-', r.jam_mulai||'-', r.jam_selesai||'-', r.catatan||'-']);
  drawTable(doc, headers, rows.length > 0 ? rows : [Array(headers.length).fill('-')], startY, [123, 26, 44], [253, 242, 244]);
  addPageFooter(doc);
  doc.save(`Laporan_Shift_${periode.replace(' ', '_')}_${area || 'Semua'}.pdf`);
}

async function generateGuestBookPDF(data, area, periode) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const startY = addPDFHeader(doc, 'LAPORAN BUKU TAMU BULANAN', area, periode, pw);
  const headers = ['No', 'Tanggal', 'Waktu Masuk', 'Waktu Keluar', 'Nama Tamu', 'Instansi', 'Tujuan', 'No Identitas', 'Petugas'];
  const rows = data.map((r, i) => [i+1, r.tanggal, r.waktu_masuk||'-', r.waktu_keluar||'-', r.nama_tamu||'-', r.instansi||'-', r.tujuan||'-', r.no_identitas||'-', r.nama_karyawan||'-']);
  drawTable(doc, headers, rows.length > 0 ? rows : [Array(headers.length).fill('-')], startY, [3, 105, 161], [240, 249, 255]);
  addPageFooter(doc);
  doc.save(`Laporan_BukuTamu_${periode.replace(' ', '_')}_${area || 'Semua'}.pdf`);
}

async function generateTenantPackagePDF(data, area, periode) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const startY = addPDFHeader(doc, 'LAPORAN PAKET TENANT BULANAN', area, periode, pw);
  const headers = ['No', 'Tanggal', 'Waktu Terima', 'Pengirim', 'Penerima', 'Unit', 'Jenis', 'No Resi', 'Status', 'Waktu Ambil'];
  const rows = data.map((r, i) => [i+1, r.tanggal, r.waktu_terima||'-', r.nama_pengirim||'-', r.nama_penerima||'-', r.unit_tenant||'-', r.jenis_paket||'-', r.no_resi||'-', r.status||'-', r.waktu_diambil||'-']);
  drawTable(doc, headers, rows.length > 0 ? rows : [Array(headers.length).fill('-')], startY, [180, 83, 9], [255, 251, 235]);
  addPageFooter(doc);
  doc.save(`Laporan_PaketTenant_${periode.replace(' ', '_')}_${area || 'Semua'}.pdf`);
}

async function generateLaporanHarianPDF(data, area, periode) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const startY = addPDFHeader(doc, 'LAPORAN HARIAN BULANAN', area, periode, pw);
  const headers = ['No', 'Tanggal', 'NIK', 'Nama', 'Area', 'Jabatan', 'Judul', 'Isi / Catatan', 'Status'];
  const rows = data.map((r, i) => [i+1, r.tanggal, r.nik_karyawan||'-', r.nama_karyawan||'-', r.area_tugas||'-', r.jabatan||'-', r.judul||'-', (r.isi||r.catatan||'-').slice(0,30), r.status||'-']);
  drawTable(doc, headers, rows.length > 0 ? rows : [Array(headers.length).fill('-')], startY, [109, 40, 217], [245, 243, 255]);
  addPageFooter(doc);
  doc.save(`Laporan_Harian_${periode.replace(' ', '_')}_${area || 'Semua'}.pdf`);
}

async function generateInventoryPDF(data, area, periode) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const startY = addPDFHeader(doc, 'LAPORAN INVENTARIS', area, periode, pw);
  const headers = ['No', 'Kode', 'Nama Barang', 'Kategori', 'Area', 'Stok', 'Satuan', 'Kondisi', 'Lokasi'];
  const rows = data.map((r, i) => [i+1, r.kode_barang||'-', r.nama_barang||'-', r.kategori||'-', r.area_tugas||'-', r.stok||0, r.satuan||'-', r.kondisi||'-', r.lokasi||'-']);
  drawTable(doc, headers, rows.length > 0 ? rows : [Array(headers.length).fill('-')], startY, [6, 95, 70], [236, 253, 245]);
  addPageFooter(doc);
  doc.save(`Laporan_Inventaris_${periode.replace(' ', '_')}_${area || 'Semua'}.pdf`);
}

// Mapping dari menu key di EmployeeDashboard ke report type key
const MENU_TO_REPORT = {
  attendance: 'attendance',
  shift: 'shift',
  epatrol: 'epatrol',
  hydrant: 'hydrant',
  efacility: 'efacility',
  emergency: 'emergency',
  kr: 'checklist',
  toilet: 'checklist',
  ticketing: 'facility_ticket',
  guestbook: 'guestbook',
  tenant_package: 'tenant_package',
  laporan_harian: 'laporan_harian',
  inventory: 'inventory',
};

const MENU_BY_ROLE_LAPORAN = {
  'Admin Pos': ['attendance', 'shift', 'epatrol', 'guestbook', 'tenant_package'],
  'Chief Security': ['attendance', 'shift', 'epatrol', 'efacility', 'hydrant', 'emergency', 'checklist', 'facility_ticket', 'guestbook', 'tenant_package', 'laporan_harian', 'rekap_all'],
  'Leader Security': ['attendance', 'shift', 'epatrol', 'hydrant', 'emergency', 'checklist', 'guestbook', 'laporan_harian'],
  'Supervisor Facility': ['attendance', 'shift', 'efacility', 'hydrant', 'emergency', 'checklist', 'facility_ticket', 'inventory', 'laporan_harian'],
  'Leader Facility': ['attendance', 'shift', 'efacility', 'checklist', 'inventory', 'laporan_harian'],
  'Staff': ['attendance', 'shift', 'epatrol', 'laporan_harian'],
  'PIC Client': ['attendance', 'shift', 'epatrol', 'efacility', 'hydrant', 'emergency', 'checklist', 'guestbook', 'tenant_package'],
};

export default function LaporanBulanan() {
  const today = new Date();
  const [month, setMonth] = useState(String(today.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(today.getFullYear()));
  const [generating, setGenerating] = useState('');
  const [generated, setGenerated] = useState([]);

  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';
  const empArea = employee?.area_tugas || '';
  const empJabatan = employee?.jabatan || employee?.role || 'Staff';

  // Area terkunci untuk non-admin
  const [area, setArea] = useState(isMasterAdmin ? '' : empArea);

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-laporan'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' }),
    enabled: isMasterAdmin
  });

  // Ambil konfigurasi area untuk filter menu sesuai jabatan
  const { data: areaData } = useQuery({
    queryKey: ['area-laporan-config', empArea],
    queryFn: () => base44.entities.AreaProject.filter({ nama_area: empArea }),
    enabled: !!empArea && !isMasterAdmin,
    select: (data) => data[0]
  });

  const periode = `${MONTHS.find((m) => m.value === month)?.label} ${year}`;
  const datePrefix = `${year}-${month}`;



  // Tentukan report types yang boleh diakses user
  const MODULE_TO_KEY = {
    'E-Patroli': 'epatrol', 'E-Patrol': 'epatrol',
    'E-Facility': 'efacility',
    'Hydrant & APAR': 'hydrant', 'Hydrant': 'hydrant',
    'Box Emergency': 'emergency',
    'KR 2/4': 'kr', 'Checklist KR': 'kr',
    'Checklist Toilet': 'toilet', 'Toilet': 'toilet',
    'Ticketing Fasilitas': 'ticketing',
    'Absensi': 'attendance', 'E-Absensi': 'attendance',
  };

  const getAllowedReportTypes = () => {
    if (isMasterAdmin) return REPORT_TYPES;
    // Cek menu dari konfigurasi area jika ada
    const areaMenuForJabatan = areaData?.menu_per_jabatan?.[empJabatan];
    let menuKeys;
    if (areaMenuForJabatan) {
      menuKeys = areaMenuForJabatan.map(m => MODULE_TO_KEY[m] || m).filter(Boolean);
    } else {
      menuKeys = Object.keys(MENU_TO_REPORT).filter(k => {
        const roleMenus = MENU_BY_ROLE_LAPORAN[empJabatan] || MENU_BY_ROLE_LAPORAN['Staff'];
        return roleMenus.includes(MENU_TO_REPORT[k]) || roleMenus.includes(k);
      });
    }
    // Konversi menu keys → report type keys
    const allowedKeys = new Set();
    menuKeys.forEach(k => {
      if (MENU_TO_REPORT[k]) allowedKeys.add(MENU_TO_REPORT[k]);
    });
    // Selalu sertakan attendance
    allowedKeys.add('attendance');
    // Tambahkan rekap_all jika ada lebih dari 2 laporan
    if (allowedKeys.size >= 3) allowedKeys.add('rekap_all');
    return REPORT_TYPES.filter(rt => allowedKeys.has(rt.key));
  };

  const allowedReportTypes = getAllowedReportTypes();

  // Helper: fetch dengan filter area+periode langsung ke server
  const fetchFiltered = (entity, sortField, limit = 500) => {
    const q = area ? { area_tugas: area } : {};
    return entity.filter(q, sortField, limit).then(list =>
      list.filter(r => (r.tanggal || r.tanggal_lapor || '').startsWith(datePrefix))
    );
  };

  const handleGenerate = async (type) => {
    setGenerating(type);
    try {
      if (type === 'attendance') {
        const [data, shiftsRaw] = await Promise.all([
          fetchFiltered(base44.entities.Attendance, '-tanggal', 500),
          area
            ? base44.entities.ShiftSchedule.filter({ area_tugas: area }, '-tanggal', 200).then(d => d.filter(s => (s.tanggal || '').startsWith(datePrefix)))
            : []
        ]);
        await generateAttendancePDF(data, area, periode, shiftsRaw);
      } else if (type === 'epatrol') {
        const data = await fetchFiltered(base44.entities.EPatrol, '-tanggal', 500);
        await generateEPatrolPDF(data, area, periode);
      } else if (type === 'hydrant') {
        const data = await fetchFiltered(base44.entities.ChecklistHydrant, '-tanggal', 300);
        await generateHydrantPDF(data, area, periode);
      } else if (type === 'efacility') {
        const data = await fetchFiltered(base44.entities.EFacility, '-tanggal', 300);
        await generateEFacilityPDF(data, area, periode);
      } else if (type === 'emergency') {
        const data = await fetchFiltered(base44.entities.ChecklistEmergency, '-tanggal', 300);
        await generateEmergencyPDF(data, area, periode);
      } else if (type === 'checklist') {
        const [krData, toiletData] = await Promise.all([
          fetchFiltered(base44.entities.ChecklistKR, '-tanggal', 200),
          fetchFiltered(base44.entities.ChecklistToilet, '-tanggal', 200),
        ]);
        await generateChecklistPDF(krData, toiletData, area, periode);
      } else if (type === 'facility_ticket') {
        const data = await fetchFiltered(base44.entities.FacilityTicket, '-tanggal_lapor', 200);
        await generateFacilityTicketPDF(data, area, periode);
      } else if (type === 'shift') {
        const q = area ? { area_tugas: area } : {};
        const data = await base44.entities.ShiftSchedule.filter(q, '-tanggal', 500).then(list => list.filter(r => (r.tanggal || '').startsWith(datePrefix)));
        await generateShiftPDF(data, area, periode);
      } else if (type === 'guestbook') {
        const data = await fetchFiltered(base44.entities.GuestBook, '-tanggal', 300);
        await generateGuestBookPDF(data, area, periode);
      } else if (type === 'tenant_package') {
        const data = await fetchFiltered(base44.entities.TenantPackage, '-tanggal', 300);
        await generateTenantPackagePDF(data, area, periode);
      } else if (type === 'laporan_harian') {
        const data = await fetchFiltered(base44.entities.LaporanHarian, '-tanggal', 300);
        await generateLaporanHarianPDF(data, area, periode);
      } else if (type === 'inventory') {
        const q = area ? { area_tugas: area } : {};
        const data = await base44.entities.Inventory.filter(q, 'nama_barang', 500);
        await generateInventoryPDF(data, area, periode);
      } else if (type === 'rekap_all') {
        const [attData, patrolData, ticketData] = await Promise.all([
          fetchFiltered(base44.entities.Attendance, '-tanggal', 500),
          fetchFiltered(base44.entities.EPatrol, '-tanggal', 300),
          fetchFiltered(base44.entities.FacilityTicket, '-tanggal_lapor', 200),
        ]);
        await generateRekapTerpaduPDF(attData, patrolData, ticketData, area, periode);
      }
      setGenerated((prev) => [...new Set([...prev, type])]);
    } finally {
      setGenerating('');
    }
  };

  const handleGenerateAll = async () => {
    for (const rt of allowedReportTypes) {
      await handleGenerate(rt.key);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <Card className="p-5 border-0 shadow-sm">
        <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--maroon)]" /> Generator Laporan Bulanan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs mb-1 block">Bulan</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Tahun</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Area</Label>
            {isMasterAdmin ? (
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger><SelectValue placeholder="Semua Area" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Semua Area</SelectItem>
                  {areas.map((a) => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={area} readOnly className="bg-gray-50 text-gray-600 h-9" />
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 bg-gray-50 rounded-lg px-4 py-2">
            <p className="text-xs text-gray-500">Periode Laporan</p>
            <p className="font-bold text-gray-800">{periode} {area && `— ${area}`}</p>
          </div>
          <Button onClick={handleGenerateAll} disabled={!!generating} className="bg-red-800 text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 hover:bg-orange-600 shrink-0">
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Unduh Semua
          </Button>
        </div>
      </Card>

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allowedReportTypes.map((rt) =>
        <Card key={rt.key} className="p-5 border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: rt.color }} />
                <h3 className="font-semibold text-gray-800 text-sm">{rt.label}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{periode} {area && `· ${area}`}</p>
              </div>
              {generated.includes(rt.key) &&
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            }
            </div>
            <Button
            onClick={() => handleGenerate(rt.key)}
            disabled={!!generating}
            className="w-full text-white text-xs h-9"
            style={{ backgroundColor: generating === rt.key ? '#9ca3af' : rt.color }}>

              {generating === rt.key ?
            <><Loader2 className="w-3 h-3 animate-spin mr-1.5" />Generating...</> :
            <><Download className="w-3 h-3 mr-1.5" />Download PDF</>
            }
            </Button>
          </Card>
        )}
      </div>

      {/* Info */}
      <Card className="p-4 border-0 shadow-sm bg-blue-50">
        <p className="text-xs text-blue-700">
          <strong>Catatan:</strong> Laporan akan otomatis terunduh sebagai file PDF setelah data diproses.
          Format laporan menggunakan kop INTEGRATED dan data sesuai periode yang dipilih.
        </p>
      </Card>
    </div>);

}