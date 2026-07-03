import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, FileSpreadsheet, FileText, Calendar, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

const BULAN_NAME = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const REGU_LIST = ['Regu A','Regu B','Regu C','Regu D','Non Regu'];

const REGU_ORDER = ['Non Regu','Regu A','Regu B','Regu C','Regu D'];
const LEADER_JABATAN = ['Leader Security','Leader Facility','Chief Security','Supervisor Security','Supervisor Facility'];

function sortEmployees(empList) {
  return [...empList].sort((a, b) => {
    const reguA = REGU_ORDER.indexOf(a.regu || 'Non Regu');
    const reguB = REGU_ORDER.indexOf(b.regu || 'Non Regu');
    if (reguA !== reguB) return reguA - reguB;
    const isLeaderA = LEADER_JABATAN.some(j => (a.jabatan || '').toLowerCase().includes(j.toLowerCase()));
    const isLeaderB = LEADER_JABATAN.some(j => (b.jabatan || '').toLowerCase().includes(j.toLowerCase()));
    if (isLeaderA && !isLeaderB) return -1;
    if (!isLeaderA && isLeaderB) return 1;
    return (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '');
  });
}

function toUpper(str) { return (str || '-').toUpperCase(); }

// Sesi label berdasarkan jam shift
function getSesi(shift) {
  if (!shift) return 'L';
  const jam = shift.jam_mulai || '';
  const [h] = jam.split(':').map(Number);
  if (isNaN(h)) return 'P';
  if (h >= 23 || h < 7) return 'M';
  if (h >= 15) return 'S';
  return 'P';
}

// Warna sel berdasarkan status untuk PDF
function getStatusColor(status) {
  if (!status || status === 'L') return [255, 255, 255]; // putih
  if (status === 'Hadir') return [220, 255, 220]; // hijau muda
  if (status === 'Alfa') return [180, 0, 0]; // merah tua
  if (status === 'Sakit') return [173, 216, 230]; // biru muda
  if (status === 'Izin') return [184, 134, 11]; // kuning tua
  if (status === 'Cuti') return [255, 255, 153]; // kuning muda
  if (status === 'L') return [255, 100, 100]; // merah (libur)
  return [255, 255, 255];
}

function getStatusTextColor(status) {
  if (status === 'Alfa') return [255, 255, 255];
  if (status === 'Izin') return [255, 255, 255];
  return [30, 30, 30];
}

// Hitung periode 24 bulan lalu s/d 23 bulan ini
function getPeriodDates(bulan, tahun) {
  const b = parseInt(bulan);
  const t = parseInt(tahun);
  const prevMonth = b === 1 ? 12 : b - 1;
  const prevYear = b === 1 ? t - 1 : t;
  const startDate = `${prevYear}-${String(prevMonth).padStart(2,'0')}-24`;
  const endDate = `${t}-${String(b).padStart(2,'0')}-23`;
  return { startDate, endDate };
}

function generateDateRange(startDate, endDate) {
  const dates = [];
  const cur = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function ShiftScheduleExport({ areas, isMasterAdmin, employeeArea }) {
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth() - 1, 24);
  const defaultEnd = new Date(today.getFullYear(), today.getMonth(), 23);
  
  const formatDate = (date) => date.toISOString().slice(0, 10);
  
  const [open, setOpen] = useState(false);
  const [exportArea, setExportArea] = useState(isMasterAdmin ? '' : (employeeArea || ''));
  const [exportRegu, setExportRegu] = useState('');
  const [exportStartDate, setExportStartDate] = useState(formatDate(defaultStart));
  const [exportEndDate, setExportEndDate] = useState(formatDate(defaultEnd));
  const [ttdPembuat, setTtdPembuat] = useState('');
  const [ttdMengetahui, setTtdMengetahui] = useState('');
  const [loading, setLoading] = useState(false);

  const periodDates = generateDateRange(exportStartDate, exportEndDate);
  
  const startD = new Date(exportStartDate);
  const endD = new Date(exportEndDate);
  const periodLabel = `${startD.getDate()} ${BULAN_NAME[startD.getMonth()]} ${startD.getFullYear()} – ${endD.getDate()} ${BULAN_NAME[endD.getMonth()]} ${endD.getFullYear()}`;
  const periodeKepala = `JADWAL SHIFT PERIODE ${startD.getDate()} ${BULAN_NAME[startD.getMonth()].toUpperCase()} ${startD.getFullYear()} - ${endD.getDate()} ${BULAN_NAME[endD.getMonth()].toUpperCase()} ${endD.getFullYear()}`;

  const { data: employees = [] } = useQuery({
    queryKey: ['export-employees', exportArea],
    queryFn: () => base44.entities.Employee.filter({ area_tugas: exportArea, status_aktif: 'Aktif' }, 'nama_lengkap', 500),
    enabled: !!exportArea && open
  });

  const filteredEmployees = sortEmployees(exportRegu ? employees.filter(e => e.regu === exportRegu) : employees);

  const fetchData = async () => {
    if (!exportArea) { toast.error('Pilih area terlebih dahulu'); return null; }

    // Fetch semua halaman shift & absensi untuk periode ini
    const fetchAll = async (entity, extraFilter = {}) => {
      const results = [];
      const pageSize = 500;
      let skip = 0;
      while (true) {
        const batch = await entity.filter(
          { area_tugas: exportArea, ...extraFilter },
          'tanggal',
          pageSize,
          skip
        );
        results.push(...batch);
        if (batch.length < pageSize) break;
        skip += pageSize;
      }
      return results;
    };

    const reguFilter = exportRegu ? { regu: exportRegu } : {};
    const [allShifts, allAtt] = await Promise.all([
      fetchAll(base44.entities.ShiftSchedule, reguFilter),
      fetchAll(base44.entities.Attendance, reguFilter),
    ]);

    const periodShifts = allShifts.filter(s => s.tanggal >= exportStartDate && s.tanggal <= exportEndDate);
    const periodAtt = allAtt.filter(a => a.tanggal >= exportStartDate && a.tanggal <= exportEndDate);
    return { periodShifts, periodAtt };
  };

  const buildEmployeeData = (emp, periodShifts, periodAtt) => {
    const byDate = {};
    periodAtt.filter(a => a.nik_karyawan === emp.nik_karyawan).forEach(a => { byDate[a.tanggal] = a; });
    const shiftByDate = {};
    
    // Filter shift yang relevan untuk karyawan ini dulu
    const relevantShifts = periodShifts.filter(s => {
      const ids = Array.isArray(s.karyawan_ids) ? s.karyawan_ids : [];
      const byId = ids.includes(emp.nik_karyawan);
      // Jika ada karyawan_ids, harus match byId
      if (ids.length > 0) return byId;
      // Jika tidak ada karyawan_ids, cek berdasarkan regu
      if (s.regu) return s.regu === emp.regu;
      // Jika tidak ada regu juga, berlaku untuk semua
      return true;
    });
    
    // Masukkan ke shiftByDate
    relevantShifts.forEach(s => {
      if (!shiftByDate[s.tanggal]) {
        shiftByDate[s.tanggal] = s;
      }
    });

    let hadir = 0, izin = 0, sakit = 0, alfa = 0, cuti = 0;
    const dailyData = periodDates.map(date => {
      const att = byDate[date];
      const shift = shiftByDate[date];
      let status = '';
      let sesi = '';
      if (!shift) {
        sesi = 'L';
        status = 'L';
      } else {
        sesi = getSesi(shift);
        status = att?.status || 'Alfa';
      }
      if (status === 'Hadir' || status === 'Backup') hadir++;
      else if (status === 'Izin') izin++;
      else if (status === 'Sakit') sakit++;
      else if (status === 'Alfa') alfa++;
      else if (status === 'Cuti') cuti++;
      return { date, sesi, status, att, shift };
    });

    return { emp, dailyData, summary: { hadir, izin, sakit, alfa, cuti } };
  };

  const exportExcel = async () => {
    setLoading(true);
    try {
      const data = await fetchData();
      if (!data) { setLoading(false); return; }
      const { periodShifts, periodAtt } = data;

      const wb = XLSX.utils.book_new();
      const ws_data = [];

      // Header baris 1
      ws_data.push([periodeKepala]);
      ws_data.push([`Area Tugas: ${exportArea}${exportRegu ? ` | Regu: ${exportRegu}` : ''}`]);
      ws_data.push([`Periode: ${periodLabel}`]);
      ws_data.push([]);

      // Baris bulan di atas tanggal
      const bulanRow = ['', '', '', '', ''];
      periodDates.forEach(d => {
        const bIdx = parseInt(d.slice(5, 7)) - 1;
        bulanRow.push(BULAN_NAME[bIdx].slice(0, 3).toUpperCase());
      });
      bulanRow.push('');
      ws_data.push(bulanRow);

      // Baris angka tanggal
      const headerRow = ['NIK', 'Nama Lengkap', 'Jabatan', 'Regu', 'Branch'];
      periodDates.forEach(d => {
        const day = parseInt(d.slice(8, 10));
        headerRow.push(String(day));
      });
      headerRow.push('Ket');
      ws_data.push(headerRow);

      // Data karyawan
      filteredEmployees.forEach(emp => {
        const empData = buildEmployeeData(emp, periodShifts, periodAtt);
        const row = [
          emp.nik_karyawan,
          toUpper(emp.nama_lengkap),
          toUpper(emp.jabatan),
          toUpper(emp.regu),
          toUpper(emp.branch)
        ];
        empData.dailyData.forEach(({ sesi, status }) => {
          // Cell: sesi/status singkat
          const display = status === 'L' ? 'L' : status === 'Hadir' || status === 'Backup' ? sesi : status.slice(0, 1).toUpperCase();
          row.push(display);
        });
        row.push(empData.summary.hadir, empData.summary.izin, empData.summary.sakit, empData.summary.alfa, empData.summary.cuti, '');
        ws_data.push(row);
      });

      ws_data.push([]);
      ws_data.push([]);
      ws_data.push(['Keterangan:', '', 'P = Pagi', 'S = Siang', 'M = Malam', 'L = Libur (merah)', 'Alfa = Merah Tua', 'Sakit = Biru Muda', 'Izin = Kuning Tua', 'Cuti = Kuning Muda']);
      ws_data.push([]);
      ws_data.push(['Yang Membuat:', '', '', '', '', 'Yang Mengetahui:']);
      ws_data.push([]);
      ws_data.push([]);
      ws_data.push([ttdPembuat || '(_________________)', '', '', '', '', ttdMengetahui || '(_________________)']);

      const ws = XLSX.utils.aoa_to_sheet(ws_data);

      // Kolom lebar
      const cols = [
        { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 10 }, { wch: 12 },
        ...periodDates.map(() => ({ wch: 4 })),
        { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 20 }
      ];
      ws['!cols'] = cols;

      // Border helper
      const thinBorder = { style: 'thin', color: { rgb: 'AAAAAA' } };
      const cellBorder = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

      // Terapkan border ke semua sel data (baris header + data karyawan)
      const totalDataRows = filteredEmployees.length + 1; // +1 header
      const totalDataCols = 5 + periodDates.length + 6;
      for (let r = 4; r < 4 + totalDataRows; r++) {
        for (let c = 0; c < totalDataCols; c++) {
          const ref = XLSX.utils.encode_cell({ r, c });
          if (!ws[ref]) ws[ref] = { v: '', t: 's' };
          ws[ref].s = { ...(ws[ref].s || {}), border: cellBorder };
        }
      }

      // Warna sel status (kolom mulai dari index 5)
      const dataStartRow = 5; // 0-indexed row 5 = baris data pertama karyawan
      filteredEmployees.forEach((emp, empIdx) => {
        const empData = buildEmployeeData(emp, periodShifts, periodAtt);
        empData.dailyData.forEach(({ status }, dayIdx) => {
          const colIdx = 5 + dayIdx;
          const rowIdx = dataStartRow + empIdx;
          const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
          if (!ws[cellRef]) return;
          let fgColor = 'FFFFFF';
          let fontColor = '000000';
          if (status === 'L') { fgColor = 'FF6464'; }
          else if (status === 'Alfa') { fgColor = 'B40000'; fontColor = 'FFFFFF'; }
          else if (status === 'Sakit') { fgColor = 'ADD8E6'; }
          else if (status === 'Izin') { fgColor = 'B8860B'; fontColor = 'FFFFFF'; }
          else if (status === 'Cuti') { fgColor = 'FFFF99'; }
          else if (status === 'Hadir' || status === 'Backup') { fgColor = 'DCFFDC'; }
          ws[cellRef].s = {
            fill: { fgColor: { rgb: fgColor } },
            font: { color: { rgb: fontColor }, bold: true, sz: 9 },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        });
      });

      const fileNameDate = `${String(startD.getDate()).padStart(2,'0')}${String(startD.getMonth()+1).padStart(2,'0')}${startD.getFullYear()}-${String(endD.getDate()).padStart(2,'0')}${String(endD.getMonth()+1).padStart(2,'0')}${endD.getFullYear()}`;
      XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Shift');
      XLSX.writeFile(wb, `JadwalShift_${exportArea}_${fileNameDate}.xlsx`);
      toast.success('File Excel berhasil diunduh');
      setOpen(false);
    } catch (e) {
      toast.error('Gagal export: ' + e.message);
    }
    setLoading(false);
  };

  const exportPDF = async () => {
    setLoading(true);
    try {
      const data = await fetchData();
      if (!data) { setLoading(false); return; }
      const { periodShifts, periodAtt } = data;

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();

      const addPageHeader = () => {
        doc.setFillColor(100, 10, 20);
        doc.rect(0, 0, pw, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(periodeKepala, pw / 2, 10, { align: 'center' });
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Area: ${exportArea}${exportRegu ? ` | Regu: ${exportRegu}` : ''}  |  Periode: ${periodLabel}`, pw / 2, 17, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      };

      addPageHeader();

      // Kolom tanggal
      const fixedCols = 5; // NIK, Nama, Jabatan, Regu, Branch
      const summCols = 6;  // Hadir, Izin, Sakit, Alfa, Cuti, Ket
      const totalCols = fixedCols + periodDates.length + summCols;
      const marginL = 7;
      const marginR = 7;
      const tableWidth = pw - marginL - marginR;

      const fixedW = [16, 30, 20, 12, 14]; // lebar kolom fixed
      const summW = [9, 9, 9, 9, 9, 18];   // lebar summary
      const usedFixed = fixedW.reduce((a, b) => a + b, 0);
      const usedSumm = summW.reduce((a, b) => a + b, 0);
      const dateColW = (tableWidth - usedFixed - usedSumm) / periodDates.length;

      let yPos = 26;
      const rowH = 6;
      const headerH = 8;

      const drawTableHeader = () => {
        doc.setFillColor(130, 20, 30);
        doc.rect(marginL, yPos, tableWidth, headerH, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);

        let x = marginL + 0.5;
        const fixedLabels = ['NIK', 'Nama Lengkap', 'Jabatan', 'Regu', 'Branch'];
        fixedLabels.forEach((label, i) => {
          doc.text(label, x + 0.5, yPos + 5.2);
          x += fixedW[i];
        });

        periodDates.forEach((date) => {
          const day = parseInt(date.slice(8, 10));
          const bIdx = parseInt(date.slice(5, 7)) - 1;
          const bulanSingkat = BULAN_NAME[bIdx].slice(0, 3).toUpperCase();
          doc.setFontSize(4);
          doc.text(bulanSingkat, x + dateColW / 2, yPos + 3, { align: 'center' });
          doc.setFontSize(5.5);
          doc.text(String(day), x + dateColW / 2, yPos + 6.5, { align: 'center' });
          x += dateColW;
        });

        const summLabels = ['Hadir', 'Izin', 'Sakit', 'Alfa', 'Cuti', 'Ket'];
        summLabels.forEach((label, i) => {
          doc.text(label, x + 0.5, yPos + 5.2);
          x += summW[i];
        });

        doc.setTextColor(0, 0, 0);
        yPos += headerH;
      };

      drawTableHeader();

      for (let ei = 0; ei < filteredEmployees.length; ei++) {
        const emp = filteredEmployees[ei];
        const empData = buildEmployeeData(emp, periodShifts, periodAtt);

        if (yPos > ph - 30) {
          doc.addPage();
          addPageHeader();
          yPos = 26;
          drawTableHeader();
        }

        const bg = ei % 2 === 0 ? [250, 250, 250] : [255, 255, 255];
        doc.setFillColor(...bg);
        doc.rect(marginL, yPos, tableWidth, rowH, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(30, 30, 30);

        let x = marginL + 0.5;
        const fixedVals = [
          (emp.nik_karyawan || '-').slice(0, 14),
          toUpper(emp.nama_lengkap).slice(0, 22),
          toUpper(emp.jabatan).slice(0, 14),
          toUpper(emp.regu).slice(0, 8),
          toUpper(emp.branch).slice(0, 10)
        ];
        fixedVals.forEach((val, i) => {
          doc.text(val, x + 0.5, yPos + 4.2);
          x += fixedW[i];
        });

        empData.dailyData.forEach(({ status, sesi }) => {
          const display = status === 'L' ? 'L' : (status === 'Hadir' || status === 'Backup') ? sesi : (status || '-').slice(0, 2);
          const bg2 = getStatusColor(status);
          const fg = getStatusTextColor(status);
          doc.setFillColor(...bg2);
          doc.rect(x, yPos, dateColW, rowH, 'F');
          doc.setTextColor(...fg);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(4.5);
          doc.text(display, x + dateColW / 2, yPos + 4, { align: 'center' });
          doc.setTextColor(30, 30, 30);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5);
          x += dateColW;
        });

        const { hadir, izin, sakit, alfa, cuti } = empData.summary;
        const summVals = [String(hadir), String(izin), String(sakit), String(alfa), String(cuti), ''];
        summVals.forEach((val, i) => {
          doc.text(val, x + 0.5, yPos + 4.2);
          x += summW[i];
        });

        yPos += rowH;
      }

      // Border tabel vertikal & horizontal
      doc.setDrawColor(160, 160, 160);
      doc.setLineWidth(0.15);
      // garis horizontal antar baris
      const tableStartY = 26;
      for (let row = 0; row <= filteredEmployees.length + 1; row++) {
        const ly = tableStartY + headerH + row * rowH;
        doc.line(marginL, ly, marginL + tableWidth, ly);
      }
      // garis vertikal antar kolom
      let vx = marginL;
      fixedW.forEach(w => { vx += w; doc.line(vx, tableStartY, vx, tableStartY + headerH + filteredEmployees.length * rowH); });
      // tanggal cols
      for (let di = 0; di <= periodDates.length; di++) {
        doc.line(vx + di * dateColW, tableStartY, vx + di * dateColW, tableStartY + headerH + filteredEmployees.length * rowH);
      }
      vx += periodDates.length * dateColW;
      summW.forEach(w => { vx += w; doc.line(vx, tableStartY, vx, tableStartY + headerH + filteredEmployees.length * rowH); });

      // Keterangan
      yPos += 6;
      if (yPos > ph - 50) { doc.addPage(); addPageHeader(); yPos = 28; }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 30, 30);
      doc.text('Keterangan:', marginL, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);

      const ketItems = [
        ['P = Pagi', [220, 255, 220], [30, 30, 30]],
        ['S = Siang', [220, 255, 220], [30, 30, 30]],
        ['M = Malam', [220, 255, 220], [30, 30, 30]],
        ['L = Libur', [255, 100, 100], [30, 30, 30]],
        ['Alfa', [180, 0, 0], [255, 255, 255]],
        ['Sakit', [173, 216, 230], [30, 30, 30]],
        ['Izin', [184, 134, 11], [255, 255, 255]],
        ['Cuti', [255, 255, 153], [30, 30, 30]],
      ];
      let kx = marginL;
      ketItems.forEach(([label, bg, fg]) => {
        doc.setFillColor(...bg);
        doc.rect(kx, yPos - 3.5, 20, 5.5, 'F');
        doc.setTextColor(...fg);
        doc.setFont('helvetica', 'bold');
        doc.text(label, kx + 1, yPos + 0.8);
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'normal');
        kx += 23;
      });

      yPos += 12;

      // TTD section
      if (yPos > ph - 40) { doc.addPage(); addPageHeader(); yPos = 28; }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      const ttdY = yPos;
      const ttdX1 = marginL + 10;
      const ttdX2 = pw - marginR - 50;
      doc.text('Yang Membuat,', ttdX1, ttdY);
      doc.text('Yang Mengetahui,', ttdX2, ttdY);

      yPos += 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(ttdPembuat || '(___________________)', ttdX1, yPos);
      doc.text(ttdMengetahui || '(___________________)', ttdX2, yPos);

      const fileNameDate = `${String(startD.getDate()).padStart(2,'0')}${String(startD.getMonth()+1).padStart(2,'0')}${startD.getFullYear()}-${String(endD.getDate()).padStart(2,'0')}${String(endD.getMonth()+1).padStart(2,'0')}${endD.getFullYear()}`;
      doc.save(`JadwalShift_${exportArea}_${fileNameDate}.pdf`);
      toast.success('PDF berhasil diunduh');
      setOpen(false);
    } catch (e) {
      toast.error('Gagal export PDF: ' + e.message);
    }
    setLoading(false);
  };

  // ─── STANDAR: Export jadwal shift tanpa data absensi ──────────────────────
  const exportStandarExcel = async () => {
    setLoading(true);
    try {
      const data = await fetchData();
      if (!data) { setLoading(false); return; }
      const { periodShifts } = data;

      const wb = XLSX.utils.book_new();
      const ws_data = [];

      ws_data.push([periodeKepala]);
      ws_data.push([`Area Tugas: ${exportArea}${exportRegu ? ` | Regu: ${exportRegu}` : ''}`]);
      ws_data.push([`Periode: ${periodLabel}`]);
      ws_data.push([]);

      // Baris bulan di atas tanggal
      const bulanRowS = ['', '', '', '', ''];
      periodDates.forEach(d => {
        const bIdx = parseInt(d.slice(5, 7)) - 1;
        bulanRowS.push(BULAN_NAME[bIdx].slice(0, 3).toUpperCase());
      });
      bulanRowS.push('');
      ws_data.push(bulanRowS);

      // Header kolom
      const headerRow = ['NIK', 'Nama Lengkap', 'Jabatan', 'Regu', 'Branch'];
      periodDates.forEach(d => headerRow.push(String(parseInt(d.slice(8, 10)))));
      headerRow.push('Ket');
      ws_data.push(headerRow);

      filteredEmployees.forEach(emp => {
        const shiftByDate = {};
        // Filter shift yang relevan untuk karyawan ini
        const relevantShifts = periodShifts.filter(s => {
          const ids = Array.isArray(s.karyawan_ids) ? s.karyawan_ids : [];
          const byId = ids.includes(emp.nik_karyawan);
          // Jika ada karyawan_ids, harus match byId
          if (ids.length > 0) return byId;
          // Jika tidak ada karyawan_ids, cek berdasarkan regu
          if (s.regu) return s.regu === emp.regu;
          // Jika tidak ada regu juga, berlaku untuk semua
          return true;
        });
        
        relevantShifts.forEach(s => {
          if (!shiftByDate[s.tanggal]) {
            shiftByDate[s.tanggal] = s;
          }
        });

        const row = [emp.nik_karyawan, toUpper(emp.nama_lengkap), toUpper(emp.jabatan), toUpper(emp.regu), toUpper(emp.branch)];
        periodDates.forEach(date => {
          const shift = shiftByDate[date];
          if (!shift) { row.push('L'); return; }
          const sesi = getSesi(shift);
          row.push(sesi);
        });
        row.push('');
        ws_data.push(row);
      });

      ws_data.push([]);
      ws_data.push(['Keterangan:', 'P = Pagi']);
      ws_data.push(['', 'S = Siang']);
      ws_data.push(['', 'M = Malam']);
      ws_data.push(['', 'L = Libur/Off']);
      ws_data.push([]);
      ws_data.push([]);
      ws_data.push(['', 'Yang Membuat:', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Yang Mengetahui:']);
      ws_data.push([]);
      ws_data.push([]);
      ws_data.push(['', ttdPembuat || '(_________________)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ttdMengetahui || '(_________________)']);

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      ws['!cols'] = [
        { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 10 }, { wch: 12 },
        ...periodDates.map(() => ({ wch: 4 })),
        { wch: 20 }
      ];

      // Border semua sel (termasuk baris bulan & header)
      const thinBorderS = { style: 'thin', color: { rgb: 'AAAAAA' } };
      const cellBorderS = { top: thinBorderS, bottom: thinBorderS, left: thinBorderS, right: thinBorderS };
      const totalDataRowsS = filteredEmployees.length + 2; // +2 untuk baris bulan & header
      const totalDataColsS = 5 + periodDates.length + 1;
      for (let r = 4; r < 4 + totalDataRowsS; r++) {
        for (let c = 0; c < totalDataColsS; c++) {
          const ref = XLSX.utils.encode_cell({ r, c });
          if (!ws[ref]) ws[ref] = { v: '', t: 's' };
          ws[ref].s = { ...(ws[ref].s || {}), border: cellBorderS };
        }
      }

      // Warna sesi
      const dataStartRow = 5;
      filteredEmployees.forEach((emp, empIdx) => {
        const shiftByDate = {};
        // Filter shift yang relevan untuk karyawan ini
        const relevantShifts = periodShifts.filter(s => {
          const ids = Array.isArray(s.karyawan_ids) ? s.karyawan_ids : [];
          const byId = ids.includes(emp.nik_karyawan);
          // Jika ada karyawan_ids, harus match byId
          if (ids.length > 0) return byId;
          // Jika tidak ada karyawan_ids, cek berdasarkan regu
          if (s.regu) return s.regu === emp.regu;
          // Jika tidak ada regu juga, berlaku untuk semua
          return true;
        });
        
        relevantShifts.forEach(s => {
          if (!shiftByDate[s.tanggal]) {
            shiftByDate[s.tanggal] = s;
          }
        });
        periodDates.forEach((date, dayIdx) => {
          const shift = shiftByDate[date];
          const colIdx = 5 + dayIdx;
          const rowIdx = dataStartRow + empIdx;
          const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
          if (!ws[cellRef]) return;
          let fgColor = 'FF6464'; // merah = Libur default
          let fontColor = '000000';
          if (shift) {
            const sesi = getSesi(shift);
            if (sesi === 'P') fgColor = 'DCFFDC';
            else if (sesi === 'S') fgColor = 'FFF3CD';
            else if (sesi === 'M') fgColor = 'D0E8FF';
          }
          ws[cellRef].s = {
            fill: { fgColor: { rgb: fgColor } },
            font: { color: { rgb: fontColor }, bold: true, sz: 9 },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        });
      });

      const fileNameDateStandar = `${String(startD.getDate()).padStart(2,'0')}${String(startD.getMonth()+1).padStart(2,'0')}${startD.getFullYear()}-${String(endD.getDate()).padStart(2,'0')}${String(endD.getMonth()+1).padStart(2,'0')}${endD.getFullYear()}`;
      XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Shift Standar');
      XLSX.writeFile(wb, `JadwalStandar_${exportArea}_${fileNameDateStandar}.xlsx`);
      toast.success('Excel Standar berhasil diunduh');
      setOpen(false);
    } catch (e) {
      toast.error('Gagal export: ' + e.message);
    }
    setLoading(false);
  };

  const exportStandarPDF = async () => {
    setLoading(true);
    try {
      const data = await fetchData();
      if (!data) { setLoading(false); return; }
      const { periodShifts } = data;

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();

      const addPageHeader = () => {
        doc.setFillColor(100, 10, 20);
        doc.rect(0, 0, pw, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(periodeKepala, pw / 2, 10, { align: 'center' });
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Area: ${exportArea}${exportRegu ? ` | Regu: ${exportRegu}` : ''}  |  Periode: ${periodLabel}`, pw / 2, 17, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      };

      addPageHeader();

      const marginL = 7, marginR = 7;
      const tableWidth = pw - marginL - marginR;
      const fixedW = [16, 30, 20, 12, 14];
      const usedFixed = fixedW.reduce((a, b) => a + b, 0);
      const dateColW = (tableWidth - usedFixed - 5) / periodDates.length;

      let yPos = 26;
      const rowH = 6, headerH = 8;

      const drawTableHeader = () => {
        doc.setFillColor(130, 20, 30);
        doc.rect(marginL, yPos, tableWidth, headerH, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);

        let x = marginL + 0.5;
        ['NIK', 'Nama Lengkap', 'Jabatan', 'Regu', 'Branch'].forEach((label, i) => {
          doc.text(label, x + 0.5, yPos + 5.2);
          x += fixedW[i];
        });
        periodDates.forEach((date) => {
          const day = parseInt(date.slice(8, 10));
          const bIdx = parseInt(date.slice(5, 7)) - 1;
          const bulanSingkat = BULAN_NAME[bIdx].slice(0, 3).toUpperCase();
          doc.setFontSize(4);
          doc.text(bulanSingkat, x + dateColW / 2, yPos + 3, { align: 'center' });
          doc.setFontSize(5.5);
          doc.text(String(day), x + dateColW / 2, yPos + 6.5, { align: 'center' });
          x += dateColW;
        });
        doc.setFontSize(5.5);
        doc.text('Ket', x + 0.5, yPos + 5.2);
        doc.setTextColor(0, 0, 0);
        yPos += headerH;
      };

      drawTableHeader();

      for (let ei = 0; ei < filteredEmployees.length; ei++) {
        const emp = filteredEmployees[ei];
        const shiftByDate = {};
        // Filter shift yang relevan untuk karyawan ini
        const relevantShifts = periodShifts.filter(s => {
          const ids = Array.isArray(s.karyawan_ids) ? s.karyawan_ids : [];
          const byId = ids.includes(emp.nik_karyawan);
          // Jika ada karyawan_ids, harus match byId
          if (ids.length > 0) return byId;
          // Jika tidak ada karyawan_ids, cek berdasarkan regu
          if (s.regu) return s.regu === emp.regu;
          // Jika tidak ada regu juga, berlaku untuk semua
          return true;
        });
        
        relevantShifts.forEach(s => {
          if (!shiftByDate[s.tanggal]) {
            shiftByDate[s.tanggal] = s;
          }
        });

        if (yPos > ph - 30) {
          doc.addPage();
          addPageHeader();
          yPos = 26;
          drawTableHeader();
        }

        const bg = ei % 2 === 0 ? [250, 250, 250] : [255, 255, 255];
        doc.setFillColor(...bg);
        doc.rect(marginL, yPos, tableWidth, rowH, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(30, 30, 30);

        let x = marginL + 0.5;
        [
          (emp.nik_karyawan || '-').slice(0, 14),
          toUpper(emp.nama_lengkap).slice(0, 22),
          toUpper(emp.jabatan).slice(0, 14),
          toUpper(emp.regu).slice(0, 8),
          toUpper(emp.branch).slice(0, 10)
        ].forEach((val, i) => {
          doc.text(val, x + 0.5, yPos + 4.2);
          x += fixedW[i];
        });

        periodDates.forEach(date => {
          const shift = shiftByDate[date];
          let sesi = 'L';
          let cellBg = [255, 100, 100]; // merah = libur
          if (shift) {
            sesi = getSesi(shift);
            if (sesi === 'P') cellBg = [220, 255, 220];
            else if (sesi === 'S') cellBg = [255, 243, 205];
            else if (sesi === 'M') cellBg = [208, 232, 255];
          }
          doc.setFillColor(...cellBg);
          doc.rect(x, yPos, dateColW, rowH, 'F');
          doc.setTextColor(30, 30, 30);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(4.5);
          doc.text(sesi, x + dateColW / 2, yPos + 4, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5);
          x += dateColW;
        });

        doc.text('', x + 0.5, yPos + 4.2);
        yPos += rowH;
      }

      // Border tabel standar
      doc.setDrawColor(160, 160, 160);
      doc.setLineWidth(0.15);
      const tableStartYs = 26;
      for (let row = 0; row <= filteredEmployees.length + 1; row++) {
        const ly = tableStartYs + headerH + row * rowH;
        doc.line(marginL, ly, marginL + tableWidth, ly);
      }
      let vxs = marginL;
      fixedW.forEach(w => { vxs += w; doc.line(vxs, tableStartYs, vxs, tableStartYs + headerH + filteredEmployees.length * rowH); });
      for (let di = 0; di <= periodDates.length; di++) {
        doc.line(vxs + di * dateColW, tableStartYs, vxs + di * dateColW, tableStartYs + headerH + filteredEmployees.length * rowH);
      }

      // Keterangan
      yPos += 6;
      if (yPos > ph - 50) { doc.addPage(); addPageHeader(); yPos = 28; }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('Keterangan Sesi:', marginL, yPos);
      yPos += 5;

      const ketItems = [
        ['P = Pagi', [220, 255, 220], [30, 30, 30]],
        ['S = Siang', [255, 243, 205], [30, 30, 30]],
        ['M = Malam', [208, 232, 255], [30, 30, 30]],
        ['L = Libur/Off', [255, 100, 100], [30, 30, 30]],
      ];
      let kx = marginL;
      ketItems.forEach(([label, bg2, fg]) => {
        doc.setFillColor(...bg2);
        doc.rect(kx, yPos - 3.5, 25, 5.5, 'F');
        doc.setTextColor(...fg);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text(label, kx + 1, yPos + 0.8);
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'normal');
        kx += 28;
      });

      yPos += 12;
      if (yPos > ph - 40) { doc.addPage(); addPageHeader(); yPos = 28; }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const ttdX1 = marginL + 10;
      const ttdX2 = pw - marginR - 50;
      doc.text('Yang Membuat,', ttdX1, yPos);
      doc.text('Yang Mengetahui,', ttdX2, yPos);
      yPos += 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(ttdPembuat || '(___________________)', ttdX1, yPos);
      doc.text(ttdMengetahui || '(___________________)', ttdX2, yPos);

      const fileNameDateStandar = `${String(startD.getDate()).padStart(2,'0')}${String(startD.getMonth()+1).padStart(2,'0')}${startD.getFullYear()}-${String(endD.getDate()).padStart(2,'0')}${String(endD.getMonth()+1).padStart(2,'0')}${endD.getFullYear()}`;
      doc.save(`JadwalStandar_${exportArea}_${fileNameDateStandar}.pdf`);
      toast.success('PDF Standar berhasil diunduh');
      setOpen(false);
    } catch (e) {
      toast.error('Gagal export PDF: ' + e.message);
    }
    setLoading(false);
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-blue-500 text-blue-600 hover:bg-blue-50"
      >
        <Download className="w-4 h-4 mr-2" /> Download Jadwal
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" /> Export Jadwal Shift
            </DialogTitle>
          </DialogHeader>

          {/* Filter bersama (area, regu, bulan, tahun, TTD) */}
          <div className="space-y-3">
            {isMasterAdmin && (
              <div>
                <Label>Area Tugas *</Label>
                <Select value={exportArea} onValueChange={setExportArea}>
                  <SelectTrigger><SelectValue placeholder="Pilih area..." /></SelectTrigger>
                  <SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {!isMasterAdmin && exportArea && (
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">Area: <span className="font-semibold">{exportArea}</span></div>
            )}
            <div>
              <Label>Regu (opsional)</Label>
              <Select value={exportRegu} onValueChange={setExportRegu}>
                <SelectTrigger><SelectValue placeholder="Semua Regu" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Semua Regu</SelectItem>
                  {REGU_LIST.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal Mulai *</Label>
                <Input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label>Tanggal Akhir *</Label>
                <Input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800">
              <p className="font-semibold">Periode: {periodLabel}</p>
              <p className="mt-0.5 text-blue-600">Total hari: {periodDates.length} hari</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nama Yang Membuat</Label>
                <Input value={ttdPembuat} onChange={e => setTtdPembuat(e.target.value.toUpperCase())} placeholder="Nama (kapital otomatis)..." className="h-9 uppercase" />
              </div>
              <div>
                <Label>Nama Yang Mengetahui</Label>
                <Input value={ttdMengetahui} onChange={e => setTtdMengetahui(e.target.value.toUpperCase())} placeholder="Nama (kapital otomatis)..." className="h-9 uppercase" />
              </div>
            </div>
          </div>

          {/* Tabs: Standar vs Terintegrasi Absensi */}
          <Tabs defaultValue="standar" className="mt-2">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="standar" className="text-xs flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Standar (Jadwal Saja)
              </TabsTrigger>
              <TabsTrigger value="absensi" className="text-xs flex items-center gap-1">
                <ClipboardCheck className="w-3.5 h-3.5" /> Terintegrasi Absensi
              </TabsTrigger>
            </TabsList>

            <TabsContent value="standar" className="mt-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 mb-3">
                <p className="font-semibold">Jadwal Shift Standar (tanpa data absensi)</p>
                <p className="mt-0.5">Hanya menampilkan sesi shift per tanggal berdasarkan jadwal yang telah dibuat. Cocok untuk distribusi ke karyawan sebelum periode berjalan.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportStandarExcel} disabled={loading || !exportArea} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />{loading ? 'Memproses...' : 'Excel Standar'}
                </Button>
                <Button onClick={exportStandarPDF} disabled={loading || !exportArea} className="flex-1 bg-green-700 hover:bg-green-800 text-white">
                  <FileText className="w-4 h-4 mr-2" />{loading ? 'Memproses...' : 'PDF Standar'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="absensi" className="mt-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 mb-3">
                <p className="font-semibold">Jadwal + Realisasi Absensi (real-time)</p>
                <p className="mt-0.5">Menggabungkan jadwal shift dengan status absensi aktual. Warna: Libur=Merah, Alfa=Merah Tua, Sakit=Biru Muda, Izin=Kuning Tua, Cuti=Kuning Muda.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportExcel} disabled={loading || !exportArea} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />{loading ? 'Memproses...' : 'Excel + Absensi'}
                </Button>
                <Button onClick={exportPDF} disabled={loading || !exportArea} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white">
                  <FileText className="w-4 h-4 mr-2" />{loading ? 'Memproses...' : 'PDF + Absensi'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading} className="w-full">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}